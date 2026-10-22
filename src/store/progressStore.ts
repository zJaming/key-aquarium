import { Store } from "@tauri-apps/plugin-store";
import { reactive, readonly } from "vue";
import {
  applyAnonymousKeyPress,
  applyAquariumManualProgress,
  applyBubbleButtonPress,
  applyKeyPress,
  applyLightTogglePress,
  applyShakeButtonPress,
  collectAutoReadyCrops,
  collectCrop,
  createInitialProgress,
  getAchievementStatus,
  getAquariumStatus,
  getFarmStatus,
  getKeyStatus,
  getTopKeys,
  grantAchievementTestUnlocks as grantAchievementTestUnlocksProgress,
  grantAquariumTestSpecies as grantAquariumTestSpeciesProgress,
  grantBenthicTestSpecies as grantBenthicTestSpeciesProgress,
  resetProgressKeepingPreferences,
  setActiveScene,
  updateAppSettings,
} from "../game/progression";
import type { AchievementStatus, AppSettings, AquariumStatus, FarmStatus, KeyboardFarmProgress, KeyId, KeyPressStat, KeyProgress, SceneId } from "../game/types";
import { applyWindowBounds, isTauriRuntime, loadExternalProgressCandidates, readCurrentWindowBounds, setWindowAlwaysOnTop } from "../platform/tauri";

const STORE_PATH = "key-aquarium.json";
const LEGACY_STORE_PATH = "keyboard-farm.json";
const STORE_KEY = "progress";

interface ProgressState {
  progress: KeyboardFarmProgress;
  loaded: boolean;
  permissionTrusted: boolean;
}

interface ProgressCandidate {
  source: string;
  progress: KeyboardFarmProgress;
}

const state = reactive<ProgressState>({
  progress: createInitialProgress(),
  loaded: false,
  permissionTrusted: true,
});

let storePromise: Promise<Store | null> | null = null;
let legacyStorePromise: Promise<Store | null> | null = null;
let saveTimer: number | null = null;

/** 使用点点水族箱进度状态和操作方法。 */
export function useProgressStore() {
  return {
    state: readonly(state),
    loadProgress,
    recordKeyPress,
    recordAnonymousKeyPress,
    recordAquariumBubbleButtonPress,
    recordAquariumLightTogglePress,
    recordAquariumShakeButtonPress,
    collectKeyCrop,
    collectFirstReadyCrop,
    collectExpiredCrops,
    recordAquariumManualProgress,
    grantAchievementTestUnlocks,
    grantAquariumTestSpecies,
    grantBenthicTestSpecies,
    updateSettings,
    exportProgress,
    flushProgress,
    importProgress,
    clearProgressKeepingSettings,
    switchScene,
    setPermissionTrusted,
    toggleAlwaysOnTop,
    restoreWindowBounds,
    captureWindowBounds,
    getKey: (keyId: KeyId) => getKeyStatus(state.progress, keyId),
    getFarm: () => getFarmStatus(state.progress),
    getAquarium: () => getAquariumStatus(state.progress),
    getAchievements: (): AchievementStatus => getAchievementStatus(state.progress),
    getTopKeys: (): KeyPressStat[] => getTopKeys(state.progress),
  };
}

/** 更新用户设置并调度保存。 */
function updateSettings(settings: Partial<AppSettings>, now = Date.now()): void {
  state.progress = updateAppSettings(state.progress, settings, now);
  scheduleSave();
}

/** 导出当前规范化后的完整进度快照。 */
function exportProgress(): KeyboardFarmProgress {
  return updateAppSettings(state.progress, {}, state.progress.updatedAt);
}

/** 导入外部进度文件，校验通过后覆盖当前存档。 */
async function importProgress(payload: unknown, now = Date.now()): Promise<void> {
  const progress = extractImportProgress(payload);

  if (!progress) {
    throw new Error("无法识别数据文件");
  }

  state.progress = prepareLoadedProgress({
    ...progress,
    updatedAt: now,
  });
  await saveProgress();
}

/** 清空养成数据，但保留设置、窗口位置和置顶偏好。 */
async function clearProgressKeepingSettings(now = Date.now()): Promise<void> {
  state.progress = resetProgressKeepingPreferences(state.progress, now);
  await setWindowAlwaysOnTop(state.progress.alwaysOnTop);
  await saveProgress();
}

/** 从本地持久化中加载进度。 */
async function loadProgress(): Promise<void> {
  const store = await getStore();
  const savedProgress = await store?.get<KeyboardFarmProgress>(STORE_KEY);
  const bestCandidate = await selectBestLoadCandidate(savedProgress);

  if (bestCandidate) {
    state.progress = prepareLoadedProgress(bestCandidate.progress);

    if (bestCandidate.source !== "current") {
      await saveProgressToStore(store, state.progress);
    }
  }

  state.loaded = true;
  await setWindowAlwaysOnTop(state.progress.alwaysOnTop);
}

/** 恢复窗口后记录实际位置，避免下一次启动再次使用屏幕外的旧坐标。 */
async function restoreWindowBounds(): Promise<void> {
  await applyWindowBounds(state.progress.windowBounds);
  await captureWindowBounds();
}

/** 记录一次键盘按压并调度保存。 */
function recordKeyPress(keyId: KeyId, now = Date.now()): void {
  const playableProgress = isActiveScene("farm") ? collectAutoReadyCrops(state.progress, now) : state.progress;

  state.progress = applyKeyPress(playableProgress, keyId, now);
  scheduleSave();
}

/** 记录一次无法识别具体键位的键盘活动，不写入按键排行榜。 */
function recordAnonymousKeyPress(now = Date.now()): void {
  state.progress = applyAnonymousKeyPress(state.progress, now);
  scheduleSave();
}

/** 手动收取指定键位上的满级作物。 */
function collectKeyCrop(keyId: KeyId, now = Date.now()): void {
  if (!isActiveScene("farm")) {
    return;
  }

  state.progress = collectCrop(state.progress, keyId, now);
  scheduleSave();
}

/** 收取某种作物下第一个可收取的键位。 */
function collectFirstReadyCrop(cropId: string, now = Date.now()): void {
  if (!isActiveScene("farm")) {
    return;
  }

  const readyKey = Object.values(state.progress.keys).find((key) => key.cropId === cropId && key.cropReadyAt);

  if (!readyKey) {
    return;
  }

  collectKeyCrop(readyKey.keyId, now);
}

/** 收取所有到达自动收取时间的作物。 */
function collectExpiredCrops(now = Date.now()): void {
  if (!isActiveScene("farm")) {
    return;
  }

  state.progress = collectAutoReadyCrops(state.progress, now);
  scheduleSave();
}

/** 记录一次水族箱手动按钮进度并调度保存。 */
function recordAquariumManualProgress(now = Date.now()): void {
  if (!isActiveScene("aquarium")) {
    return;
  }

  state.progress = applyAquariumManualProgress(state.progress, now);
  scheduleSave();
}

/** 记录一次水族箱气泡按钮点击并调度保存。 */
function recordAquariumBubbleButtonPress(now = Date.now()): void {
  if (!isActiveScene("aquarium")) {
    return;
  }

  state.progress = applyBubbleButtonPress(state.progress, now);
  scheduleSave();
}

/** 记录一次水族箱开关灯按钮点击并调度保存。 */
function recordAquariumLightTogglePress(now = Date.now()): void {
  if (!isActiveScene("aquarium")) {
    return;
  }

  state.progress = applyLightTogglePress(state.progress, now);
  scheduleSave();
}

/** 记录一次水族箱震动按钮点击并调度保存。 */
function recordAquariumShakeButtonPress(now = Date.now()): void {
  if (!isActiveScene("aquarium")) {
    return;
  }

  state.progress = applyShakeButtonPress(state.progress, now);
  scheduleSave();
}

/** 在开发环境批量发放测试物种，正式构建中保持无效果。 */
function grantAquariumTestSpecies(now = Date.now()): void {
  if (!import.meta.env.DEV) {
    return;
  }

  state.progress = grantAquariumTestSpeciesProgress(state.progress, now);
  scheduleSave();
}

/** 在开发环境批量发放底栖测试物种，正式构建中保持无效果。 */
function grantBenthicTestSpecies(now = Date.now()): void {
  if (!import.meta.env.DEV) {
    return;
  }

  state.progress = grantBenthicTestSpeciesProgress(state.progress, now);
  scheduleSave();
}

/** 在开发环境批量解锁测试成就，正式构建中保持无效果。 */
function grantAchievementTestUnlocks(now = Date.now()): void {
  if (!import.meta.env.DEV) {
    return;
  }

  state.progress = grantAchievementTestUnlocksProgress(state.progress, now);
  scheduleSave();
}

/** 切换当前玩法场景并保存。 */
function switchScene(sceneId: SceneId, now = Date.now()): void {
  state.progress = setActiveScene(state.progress, sceneId, now);
  scheduleSave();
}

/** 更新键盘监听权限状态。 */
function setPermissionTrusted(trusted: boolean): void {
  state.permissionTrusted = trusted;
}

/** 切换窗口置顶状态并保存设置。 */
async function toggleAlwaysOnTop(): Promise<void> {
  const enabled = !state.progress.alwaysOnTop;
  state.progress = {
    ...state.progress,
    alwaysOnTop: enabled,
    updatedAt: Date.now(),
  };
  await setWindowAlwaysOnTop(enabled);
  scheduleSave();
}

/** 读取当前窗口位置尺寸并写入存档偏好。 */
async function captureWindowBounds(now = Date.now()): Promise<void> {
  const windowBounds = await readCurrentWindowBounds();

  if (!windowBounds || isSameWindowBounds(state.progress.windowBounds, windowBounds)) {
    return;
  }

  state.progress = {
    ...state.progress,
    windowBounds,
    updatedAt: now,
  };
  scheduleSave();
}

/** 判断窗口位置尺寸是否未变化，避免重复写盘。 */
function isSameWindowBounds(left: KeyboardFarmProgress["windowBounds"], right: NonNullable<KeyboardFarmProgress["windowBounds"]>): boolean {
  return Boolean(left && left.x === right.x && left.y === right.y && left.width === right.width && left.height === right.height);
}

/** 延迟保存进度，避免高频按键导致频繁写磁盘。 */
function scheduleSave(): void {
  if (saveTimer !== null) {
    window.clearTimeout(saveTimer);
  }

  saveTimer = window.setTimeout(() => {
    void saveProgress();
  }, 250);
}

/** 把当前进度写入本地持久化。 */
async function saveProgress(): Promise<void> {
  const store = await getStore();

  await saveProgressToStore(store, state.progress);
}

/** 更新重启前立即保存最新进度，避免丢失尚在防抖等待中的按键。 */
async function flushProgress(): Promise<void> {
  if (saveTimer !== null) {
    window.clearTimeout(saveTimer);
    saveTimer = null;
  }
  await saveProgress();
}

/** 将指定进度保存到给定 store，供正常保存和旧存档迁移复用。 */
async function saveProgressToStore(store: Store | null | undefined, progress: KeyboardFarmProgress): Promise<void> {
  if (!store) {
    return;
  }

  await store.set(STORE_KEY, progress);
  await store.save();
}

/** 获取 Tauri Store；浏览器调试时返回空存储。 */
async function getStore(): Promise<Store | null> {
  if (!isTauriRuntime()) {
    return null;
  }

  storePromise ??= Store.load(STORE_PATH, { defaults: {}, autoSave: false });
  return storePromise;
}

/** 读取旧版键盘农场存档，用于首次升级到点点水族箱时迁移历史数据。 */
async function loadLegacyProgress(): Promise<KeyboardFarmProgress | undefined> {
  const legacyStore = await getLegacyStore();

  return legacyStore?.get<KeyboardFarmProgress>(STORE_KEY);
}

/** 获取旧版 Tauri Store；只在新存档不存在时读取，不继续写入旧路径。 */
async function getLegacyStore(): Promise<Store | null> {
  if (!isTauriRuntime()) {
    return null;
  }

  legacyStorePromise ??= Store.load(LEGACY_STORE_PATH, { defaults: {}, autoSave: false });
  return legacyStorePromise;
}

/** 从当前和已知历史位置中选择进度最完整的一份存档。 */
async function selectBestLoadCandidate(savedProgress: KeyboardFarmProgress | undefined): Promise<ProgressCandidate | null> {
  const candidates: ProgressCandidate[] = [];

  addProgressCandidate(candidates, "current", savedProgress);
  addProgressCandidate(candidates, "legacy-file", await loadLegacyProgress());

  const externalCandidates = await loadExternalProgressCandidates<KeyboardFarmProgress>();

  externalCandidates.forEach((candidate) => {
    addProgressCandidate(candidates, candidate.source, candidate.progress);
  });

  return candidates.sort(compareProgressCandidates)[0] ?? null;
}

/** 校验并加入一个可参与迁移选择的存档候选。 */
function addProgressCandidate(candidates: ProgressCandidate[], source: string, progress: KeyboardFarmProgress | undefined): void {
  if (progress?.version !== 1) {
    return;
  }

  candidates.push({ source, progress });
}

/** 从导入文件中提取 version 1 进度对象。 */
function extractImportProgress(payload: unknown): KeyboardFarmProgress | null {
  if (!isRecord(payload)) {
    return null;
  }

  const progress = payload.version === 1
    ? payload
    : isRecord(payload.progress) && payload.progress.version === 1
      ? payload.progress
      : null;

  return progress as KeyboardFarmProgress | null;
}

/** 判断值是否是可读取字段的普通对象。 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** 按鱼类收藏、按键进度和更新时间排序，避免空新存档覆盖旧记录。 */
function compareProgressCandidates(left: ProgressCandidate, right: ProgressCandidate): number {
  const leftScore = getProgressCandidateScore(left.progress);
  const rightScore = getProgressCandidateScore(right.progress);

  for (let index = 0; index < leftScore.length; index += 1) {
    const scoreDiff = rightScore[index] - leftScore[index];

    if (scoreDiff !== 0) {
      return scoreDiff;
    }
  }

  return 0;
}

/** 生成迁移候选的排序分数，优先保留水族箱收集成果。 */
function getProgressCandidateScore(progress: KeyboardFarmProgress): number[] {
  const fishCollections = Object.values(progress.aquariumProgress?.fishCollections ?? {});
  const fishCopies = fishCollections.reduce((sum, collection) => sum + (collection?.count ?? 0), 0);
  const collectedSpecies = fishCollections.filter((collection) => (collection?.count ?? 0) > 0).length;

  return [
    fishCopies,
    progress.aquariumProgress?.totalOpenings ?? 0,
    collectedSpecies,
    progress.totalPresses ?? 0,
    progress.aquariumProgress?.currentCycle?.currentPresses ?? 0,
    progress.fullCropCollections ?? 0,
    progress.updatedAt ?? 0,
  ];
}

/** 加载存档时固定进入水族箱，本期隐藏场景切换且不顺手结算农场数据。 */
function prepareLoadedProgress(progress: KeyboardFarmProgress): KeyboardFarmProgress {
  return setActiveScene(progress, "aquarium");
}

/** 判断当前是否处在指定玩法场景，用于隔离各场景入口副作用。 */
function isActiveScene(sceneId: SceneId): boolean {
  return state.progress.activeSceneId === sceneId;
}

/** 读取当前农场状态，供场景注册表使用。 */
export function getCurrentFarmStatus(): FarmStatus {
  return getFarmStatus(state.progress);
}

/** 读取当前水族箱状态，供场景注册表使用。 */
export function getCurrentAquariumStatus(): AquariumStatus {
  return getAquariumStatus(state.progress);
}

/** 读取当前键位状态，供 PixiJS 场景渲染使用。 */
export function getCurrentKeyStatus(keyId: KeyId): KeyProgress {
  return getKeyStatus(state.progress, keyId);
}
