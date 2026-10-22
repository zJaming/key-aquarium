<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import AchievementPanel from "./components/AchievementPanel.vue";
import AquariumGalleryPanel from "./components/AquariumGalleryPanel.vue";
import AquariumCanvas from "./components/AquariumCanvas.vue";
import KeyboardPermissionNotice from "./components/KeyboardPermissionNotice.vue";
import SettingsPanel from "./components/SettingsPanel.vue";
import StatusPanel from "./components/StatusPanel.vue";
import TopActionButtons from "./components/TopActionButtons.vue";
import WindowDragHandle from "./components/WindowDragHandle.vue";
import packageInfo from "../package.json";
import {
  listenAlwaysOnTopToggle,
  listenKeyboardPermissionChange,
  listenNativeKeyPress,
  listenWindowBoundsChange,
  listenStatusPanelRequest,
  listenWindowFocusChange,
  isTauriRuntime,
  openKeyboardPermissionSettings,
  queryKeyboardPermission,
  readJsonTextFromDialog,
  saveJsonTextToDialog,
  startWindowDrag,
  startWindowResizeDrag,
} from "./platform/tauri";
import { useProgressStore } from "./store/progressStore";
import type { AppSettings } from "./game/types";
import type { PermissionStatusPayload, ResizeDirection } from "./platform/tauri";

const progressStore = useProgressStore();
const statusOpen = ref(false);
const galleryOpen = ref(false);
const achievementsOpen = ref(false);
const settingsOpen = ref(false);
const hovered = ref(false);
const permissionChecked = ref(false);
const lastPressedSignal = ref<{ keyId: string; sequence: number } | null>(null);
const settingsBusy = ref(false);
const settingsMessage = ref("");
const isDevMode = import.meta.env.DEV;
const devGrantButtonLabel = isDevMode ? "测试物种" : "";
const devBenthicButtonLabel = isDevMode ? "测试底栖" : "";
const devAchievementButtonLabel = isDevMode ? "测试成就" : "";
const unlisteners: Array<() => void> = [];
const browserPressedKeyIds = new Set<string>();
let autoCollectTimer: number | null = null;
let permissionPollTimer: number | null = null;
let permissionRefreshTimer: number | null = null;
let windowBoundsSaveTimer: number | null = null;

const aquariumStatus = computed(() => progressStore.getAquarium());
const achievementStatus = computed(() => progressStore.getAchievements());
const topKeys = computed(() => progressStore.getTopKeys());
const topActionButtonsVisible = computed(() => hovered.value && !statusOpen.value && !galleryOpen.value && !achievementsOpen.value && !settingsOpen.value);
const keyboardPermissionNoticeVisible = computed(() => permissionChecked.value && !progressStore.state.permissionTrusted);

/** 处理键盘按压并刷新最后动画键位，所有原生事件都写入具体键位排行榜。 */
function handleKeyPress(keyId: string): void {
  progressStore.recordKeyPress(keyId);

  lastPressedSignal.value = {
    keyId,
    sequence: (lastPressedSignal.value?.sequence ?? 0) + 1,
  };

  schedulePermissionStatusSync();
}

/** 处理水族箱底座真实手动点击带来的进度累计。 */
function handleAquariumManualProgress(): void {
  progressStore.recordAquariumManualProgress();
}

/** 记录一次水族箱气泡按钮点击，用于互动类成就。 */
function handleAquariumBubbleButtonPress(): void {
  progressStore.recordAquariumBubbleButtonPress();
}

/** 记录一次水族箱开关灯按钮点击，用于互动类成就。 */
function handleAquariumLightTogglePress(): void {
  progressStore.recordAquariumLightTogglePress();
}

/** 记录一次水族箱震动按钮点击，用于互动类成就。 */
function handleAquariumShakeButtonPress(): void {
  progressStore.recordAquariumShakeButtonPress();
}

/** 处理开发环境测试物种发放，方便快速检查各品质展示效果。 */
function handleGrantTestSpecies(): void {
  if (!isDevMode) {
    return;
  }

  progressStore.grantAquariumTestSpecies();
}

/** 处理开发环境底栖物种发放，方便快速检查底部活动层表现。 */
function handleGrantBenthicTestSpecies(): void {
  if (!isDevMode) {
    return;
  }

  progressStore.grantBenthicTestSpecies();
}

/** 处理开发环境测试成就解锁，并直接打开成就页方便验收。 */
function handleGrantTestAchievements(): void {
  if (!isDevMode) {
    return;
  }

  progressStore.grantAchievementTestUnlocks();
  handleOpenAchievements();
}

/** 初始化原生事件监听和本地调试键盘监听。 */
async function setupInputListeners(): Promise<void> {
  unlisteners.push(await listenNativeKeyPress(handleKeyPress));
  unlisteners.push(await listenKeyboardPermissionChange((status) => {
    applyKeyboardPermissionStatus(status);
  }));
  unlisteners.push(await listenStatusPanelRequest(() => {
    statusOpen.value = true;
    galleryOpen.value = false;
    achievementsOpen.value = false;
    settingsOpen.value = false;
  }));
  unlisteners.push(await listenAlwaysOnTopToggle(() => {
    void progressStore.toggleAlwaysOnTop();
  }));
  unlisteners.push(await listenWindowFocusChange((focused) => {
    if (focused) {
      void runOptionalStartupTask(syncPermissionStatus);
    } else {
      hovered.value = false;
    }
  }));

  if (!isTauriRuntime()) {
    window.addEventListener("keydown", handleBrowserKeydown);
    window.addEventListener("keyup", handleBrowserKeyup);
    window.addEventListener("blur", handleBrowserWindowBlur);
  }
}

/** 处理浏览器调试环境下的按下事件，长按重复 keydown 不再重复推进进度。 */
function handleBrowserKeydown(event: KeyboardEvent): void {
  if (event.repeat || browserPressedKeyIds.has(event.code)) {
    return;
  }

  browserPressedKeyIds.add(event.code);
  handleKeyPress(event.code);
}

/** 处理浏览器调试环境下的松开事件，允许同一按键下次重新计数。 */
function handleBrowserKeyup(event: KeyboardEvent): void {
  browserPressedKeyIds.delete(event.code);
}

/** 处理浏览器调试环境下的窗口失焦，避免 hover 浮层残留和按住状态卡死。 */
function handleBrowserWindowBlur(): void {
  browserPressedKeyIds.clear();
  hovered.value = false;
}

/** 处理鼠标进入窗口，刷新 hover 状态并主动复查系统权限。 */
function handleWindowMouseEnter(): void {
  hovered.value = true;
  void runOptionalStartupTask(syncPermissionStatus);
}

/** 查询并同步键盘监听权限状态。 */
async function syncPermissionStatus(): Promise<void> {
  const permission = await queryKeyboardPermission();
  applyKeyboardPermissionStatus(permission);
}

/** 应用原生权限状态，使用系统授权状态决定是否展示提示。 */
function applyKeyboardPermissionStatus(permission: PermissionStatusPayload): void {
  permissionChecked.value = true;
  progressStore.setPermissionTrusted(permission.trusted);
  updatePermissionPolling(permission.trusted);
}

/** 收到键盘事件后稍作合并再复查权限，避免长按时频繁 invoke 原生命令。 */
function schedulePermissionStatusSync(): void {
  if (permissionRefreshTimer !== null) {
    window.clearTimeout(permissionRefreshTimer);
  }

  permissionRefreshTimer = window.setTimeout(() => {
    permissionRefreshTimer = null;
    void runOptionalStartupTask(syncPermissionStatus);
  }, 150);
}

/** 打开键盘监听权限设置页并延迟复查权限状态。 */
async function handleOpenPermissionSettings(): Promise<void> {
  await runOptionalStartupTask(openKeyboardPermissionSettings);
  window.setTimeout(() => {
    void runOptionalStartupTask(syncPermissionStatus);
  }, 1_000);
}

/** 未授权时定时刷新权限状态，授权后立即停止轮询。 */
function updatePermissionPolling(trusted: boolean): void {
  if (trusted) {
    if (permissionPollTimer !== null) {
      window.clearInterval(permissionPollTimer);
      permissionPollTimer = null;
    }
    return;
  }

  if (permissionPollTimer !== null || !isTauriRuntime()) {
    return;
  }

  permissionPollTimer = window.setInterval(() => {
    void syncPermissionStatus();
  }, 2_000);
}

/** 恢复窗口位置尺寸，即使恢复失败也继续注册变更保存。 */
async function setupWindowBoundsPersistence(): Promise<void> {
  await runOptionalStartupTask(progressStore.restoreWindowBounds);
  unlisteners.push(await listenWindowBoundsChange(scheduleWindowBoundsCapture));
}

/** 执行启动期辅助任务，避免非核心能力失败时阻断键盘监听注册。 */
async function runOptionalStartupTask(task: () => Promise<void>): Promise<void> {
  try {
    await task();
  } catch (error) {
    console.warn("Key Aquarium 启动辅助任务失败", error);
  }
}

/** 节流保存窗口位置尺寸，避免拖动或缩放过程中频繁写盘。 */
function scheduleWindowBoundsCapture(): void {
  if (windowBoundsSaveTimer !== null) {
    window.clearTimeout(windowBoundsSaveTimer);
  }

  windowBoundsSaveTimer = window.setTimeout(() => {
    void progressStore.captureWindowBounds();
  }, 350);
}

/** 请求拖动透明无标题窗口。 */
function handleDragStart(event: MouseEvent): void {
  if (event.button !== 0 || statusOpen.value || galleryOpen.value || achievementsOpen.value || settingsOpen.value) {
    return;
  }

  event.preventDefault();
  void startWindowDrag();
}

/** 请求通过右下角点阵把手拖动窗口，把手在面板打开时也保持可用。 */
function handleDragHandleStart(): void {
  void startWindowDrag();
}

/** 打开图鉴面板并关闭状态面板，保证同一时刻只展示一个面板。 */
function handleOpenGallery(): void {
  galleryOpen.value = true;
  statusOpen.value = false;
  achievementsOpen.value = false;
  settingsOpen.value = false;
}

/** 打开状态面板并关闭图鉴面板，保证同一时刻只展示一个面板。 */
function handleOpenStatus(): void {
  statusOpen.value = true;
  galleryOpen.value = false;
  achievementsOpen.value = false;
  settingsOpen.value = false;
}

/** 打开成就面板并关闭其他面板，避免多个控制层互相遮挡。 */
function handleOpenAchievements(): void {
  achievementsOpen.value = true;
  galleryOpen.value = false;
  statusOpen.value = false;
  settingsOpen.value = false;
}

/** 打开设置面板并关闭其他面板，避免控制层重叠。 */
function handleOpenSettings(): void {
  settingsOpen.value = true;
  achievementsOpen.value = false;
  galleryOpen.value = false;
  statusOpen.value = false;
  settingsMessage.value = "";
}

/** 写入设置项变更，面板只负责展示和发出意图。 */
function handleUpdateSettings(settings: Partial<AppSettings>): void {
  progressStore.updateSettings(settings);
}

/** 导出当前完整存档到用户选择的 JSON 文件。 */
async function handleExportData(): Promise<void> {
  await runSettingsDataTask(async () => {
    const exportedAt = Date.now();
    const progress = progressStore.exportProgress();
    const saved = await saveJsonTextToDialog({
      defaultPath: `Key-Aquarium-${formatExportDay(exportedAt)}.json`,
      contents: JSON.stringify({
        app: "key-aquarium",
        exportedAt,
        progress,
      }, null, 2),
    });

    settingsMessage.value = saved ? "已导出" : "已取消";
  });
}

/** 从用户选择的 JSON 文件导入存档。 */
async function handleImportData(): Promise<void> {
  await runSettingsDataTask(async () => {
    const text = await readJsonTextFromDialog();

    if (!text) {
      settingsMessage.value = "已取消";
      return;
    }

    await progressStore.importProgress(JSON.parse(text));
    settingsMessage.value = "已导入";
  });
}

/** 执行清空养成数据，保留用户设置和窗口偏好。 */
async function handleClearData(): Promise<void> {
  await runSettingsDataTask(async () => {
    await progressStore.clearProgressKeepingSettings();
    settingsMessage.value = "已清空";
  });
}

/** 包装设置页数据管理任务，统一 busy 状态和错误文案。 */
async function runSettingsDataTask(task: () => Promise<void>): Promise<void> {
  if (settingsBusy.value) {
    return;
  }

  settingsBusy.value = true;
  settingsMessage.value = "";

  try {
    await task();
  } catch (error) {
    console.warn("设置数据操作失败", error);
    settingsMessage.value = "操作失败";
  } finally {
    settingsBusy.value = false;
  }
}

/** 格式化导出文件名日期，避免文件名中出现不稳定字符。 */
function formatExportDay(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

/** 请求从指定边缘缩放透明无标题窗口。 */
function handleResizeStart(event: MouseEvent, direction: ResizeDirection): void {
  if (event.button !== 0) {
    return;
  }

  event.preventDefault();
  void startWindowResizeDrag(direction);
}

/** 初始化存档、窗口偏好和输入监听。 */
async function initializeApp(): Promise<void> {
  await progressStore.loadProgress();
  await setupInputListeners();
  await runOptionalStartupTask(setupWindowBoundsPersistence);
  await runOptionalStartupTask(syncPermissionStatus);
}

onMounted(() => {
  void initializeApp();
  autoCollectTimer = window.setInterval(() => {
    progressStore.collectExpiredCrops();
  }, 60_000);
});

onBeforeUnmount(() => {
  for (const unlisten of unlisteners) {
    unlisten();
  }

  window.removeEventListener("keydown", handleBrowserKeydown);
  window.removeEventListener("keyup", handleBrowserKeyup);
  window.removeEventListener("blur", handleBrowserWindowBlur);

  if (autoCollectTimer !== null) {
    window.clearInterval(autoCollectTimer);
  }

  if (permissionPollTimer !== null) {
    window.clearInterval(permissionPollTimer);
  }

  if (permissionRefreshTimer !== null) {
    window.clearTimeout(permissionRefreshTimer);
  }

  if (windowBoundsSaveTimer !== null) {
    window.clearTimeout(windowBoundsSaveTimer);
  }
});
</script>

<template>
  <main
    class="relative h-screen w-screen bg-transparent text-[#f7e7c6]"
    @mouseenter="handleWindowMouseEnter"
    @mouseleave="hovered = false"
  >
    <section
      class="relative h-full w-full overflow-hidden rounded-lg transition"
      :class="hovered ? 'border border-[#9ecf85]/70 shadow-[0_0_0_1px_rgba(16,24,16,0.8),0_18px_48px_rgba(0,0,0,0.25)]' : 'border border-transparent'"
      @mousedown.self="handleDragStart"
    >
      <AquariumCanvas
        :status="aquariumStatus"
        :settings="progressStore.state.progress.settings"
        :last-pressed-signal="lastPressedSignal"
        @bubble-button-press="handleAquariumBubbleButtonPress"
        @light-toggle-press="handleAquariumLightTogglePress"
        @manual-progress="handleAquariumManualProgress"
        @shake-button-press="handleAquariumShakeButtonPress"
        @empty-drag-start="handleDragStart"
      />

      <KeyboardPermissionNotice
        v-if="keyboardPermissionNoticeVisible"
        @open-settings="handleOpenPermissionSettings"
      />

      <TopActionButtons
        :visible="topActionButtonsVisible"
        :is-dev-mode="isDevMode"
        :dev-grant-button-label="devGrantButtonLabel"
        :dev-benthic-button-label="devBenthicButtonLabel"
        :dev-achievement-button-label="devAchievementButtonLabel"
        :achievement-visible="achievementStatus.hasUnlockedAchievements"
        @grant-benthic-test-species="handleGrantBenthicTestSpecies"
        @grant-test-achievements="handleGrantTestAchievements"
        @grant-test-species="handleGrantTestSpecies"
        @open-achievements="handleOpenAchievements"
        @open-gallery="handleOpenGallery"
        @open-settings="handleOpenSettings"
        @open-status="handleOpenStatus"
      />

      <StatusPanel
        v-if="statusOpen"
        :total-presses="progressStore.state.progress.totalPresses"
        :today-presses="progressStore.state.progress.todayPresses"
        :top-keys="topKeys"
        @close="statusOpen = false"
      />

      <AquariumGalleryPanel
        v-if="galleryOpen"
        :aquarium-status="aquariumStatus"
        @close="galleryOpen = false"
      />

      <AchievementPanel
        v-if="achievementsOpen"
        :achievements="achievementStatus.unlockedAchievements"
        @close="achievementsOpen = false"
      />

      <SettingsPanel
        v-if="settingsOpen"
        :settings="progressStore.state.progress.settings"
        :busy="settingsBusy"
        :message="settingsMessage"
        :app-version="packageInfo.version"
        @clear-data="handleClearData"
        @close="settingsOpen = false"
        @export-data="handleExportData"
        @import-data="handleImportData"
        @update-settings="handleUpdateSettings"
      />
    </section>

    <div
      v-show="hovered || statusOpen || galleryOpen || achievementsOpen || settingsOpen"
      class="absolute left-3 right-3 top-0 z-40 h-2 cursor-n-resize"
      aria-hidden="true"
      @mousedown.stop.prevent="handleResizeStart($event, 'North')"
    />
    <div
      v-show="hovered || statusOpen || galleryOpen || achievementsOpen || settingsOpen"
      class="absolute bottom-0 left-3 right-3 z-40 h-2 cursor-s-resize"
      aria-hidden="true"
      @mousedown.stop.prevent="handleResizeStart($event, 'South')"
    />
    <div
      v-show="hovered || statusOpen || galleryOpen || achievementsOpen || settingsOpen"
      class="absolute bottom-3 left-0 top-3 z-40 w-2 cursor-w-resize"
      aria-hidden="true"
      @mousedown.stop.prevent="handleResizeStart($event, 'West')"
    />
    <div
      v-show="hovered || statusOpen || galleryOpen || achievementsOpen || settingsOpen"
      class="absolute bottom-3 right-0 top-3 z-40 w-2 cursor-e-resize"
      aria-hidden="true"
      @mousedown.stop.prevent="handleResizeStart($event, 'East')"
    />
    <div
      v-show="hovered || statusOpen || galleryOpen || achievementsOpen || settingsOpen"
      class="absolute left-0 top-0 z-40 h-3 w-3 cursor-nw-resize"
      aria-hidden="true"
      @mousedown.stop.prevent="handleResizeStart($event, 'NorthWest')"
    />
    <div
      v-show="hovered || statusOpen || galleryOpen || achievementsOpen || settingsOpen"
      class="absolute right-0 top-0 z-40 h-3 w-3 cursor-ne-resize"
      aria-hidden="true"
      @mousedown.stop.prevent="handleResizeStart($event, 'NorthEast')"
    />
    <div
      v-show="hovered || statusOpen || galleryOpen || achievementsOpen || settingsOpen"
      class="absolute bottom-0 left-0 z-40 h-3 w-3 cursor-sw-resize"
      aria-hidden="true"
      @mousedown.stop.prevent="handleResizeStart($event, 'SouthWest')"
    />
    <div
      v-show="hovered || statusOpen || galleryOpen || achievementsOpen || settingsOpen"
      class="absolute bottom-0 right-0 z-40 h-3 w-3 cursor-se-resize"
      aria-hidden="true"
      @mousedown.stop.prevent="handleResizeStart($event, 'SouthEast')"
    />

    <WindowDragHandle :visible="hovered" @drag-start="handleDragHandleStart" />
  </main>
</template>
