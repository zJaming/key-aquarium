import {
  ACHIEVEMENT_DEFINITIONS,
  ALL_CROP_IDS,
  ALL_FISH_IDS,
  AUTO_COLLECT_DELAY_MS,
  CROP_DEFINITIONS,
  CROP_LEVEL_THRESHOLDS,
  DEFAULT_UNLOCKED_CROP_IDS,
  FISH_DEFINITIONS,
  FISH_RARITY_DEFINITIONS,
  FARM_LEVEL_COLLECTION_THRESHOLDS,
  FARM_LEVEL_UNLOCK_COUNTS,
  KEY_LEVEL_THRESHOLDS,
} from "./constants";
import type {
  AchievementMetric,
  AchievementProgress,
  AchievementRecentEvent,
  AchievementStatus,
  AchievementStatusItem,
  AppSettings,
  AquariumCycle,
  AquariumMarqueeEvent,
  AquariumProgress,
  AquariumStatus,
  CropId,
  CropProgress,
  FarmStatus,
  FishCollectionProgress,
  FishGalleryItem,
  FishAchievementTag,
  FishId,
  FishRarity,
  FishDefinition,
  KeyboardFarmProgress,
  KeyId,
  KeyPressStat,
  KeyProgress,
  SceneId,
  WindowBounds,
} from "./types";

const GLOBAL_KEYBOARD_ACTIVITY_ID = "KeyboardActivity";
const ACHIEVEMENT_RECENT_EVENT_LIMIT = 4;
const AQUARIUM_TEST_GRANT_COUNTS: Record<FishRarity, number> = {
  common: 8,
  rare: 5,
  curio: 3,
  legendary: 2,
};
const BENTHIC_TEST_GRANT_COUNT = 18;
export const DEFAULT_APP_SETTINGS: AppSettings = {
  keyFeedbackEnabled: true,
  fishDisplayMode: "default",
};

/** 创建一份全新的键盘农场进度，本期默认进入水族箱场景。 */
export function createInitialProgress(now = Date.now()): KeyboardFarmProgress {
  return {
    version: 1,
    activeSceneId: "aquarium",
    totalPresses: 0,
    todayPresses: 0,
    todayKey: getDayKey(now),
    keyStats: {},
    keys: {},
    cropProgress: createInitialCropProgress(),
    aquariumProgress: createInitialAquariumProgress(now),
    achievementProgress: createInitialAchievementProgress(),
    fullCropCollections: 0,
    farmLevel: 1,
    alwaysOnTop: false,
    windowBounds: null,
    settings: DEFAULT_APP_SETTINGS,
    updatedAt: now,
  };
}

/** 更新应用设置，并保留已有养成进度。 */
export function updateAppSettings(progress: KeyboardFarmProgress, settings: Partial<AppSettings>, now = Date.now()): KeyboardFarmProgress {
  const normalizedProgress = normalizeProgress(progress);

  return {
    ...normalizedProgress,
    settings: normalizeAppSettings({
      ...normalizedProgress.settings,
      ...settings,
    }),
    updatedAt: now,
  };
}

/** 清空养成数据，同时保留用户偏好、窗口位置和置顶状态。 */
export function resetProgressKeepingPreferences(progress: KeyboardFarmProgress, now = Date.now()): KeyboardFarmProgress {
  const normalizedProgress = normalizeProgress(progress);

  return {
    ...createInitialProgress(now),
    alwaysOnTop: normalizedProgress.alwaysOnTop,
    windowBounds: normalizedProgress.windowBounds,
    settings: normalizedProgress.settings,
  };
}

/** 应用一次真实键盘按压，并按当前场景推进对应玩法。 */
export function applyKeyPress(progress: KeyboardFarmProgress, keyId: KeyId, now = Date.now()): KeyboardFarmProgress {
  const normalizedProgress = recordKeyboardActiveDay(normalizeProgress(resetDailyCountIfNeeded(progress, now)), now);

  if (normalizedProgress.activeSceneId === "aquarium") {
    return applyAquariumKeyPress(normalizedProgress, keyId, now);
  }

  return applyFarmKeyPress(normalizedProgress, keyId, now);
}

/** 应用一次无法识别具体键位的键盘活动，只推进全局计数和当前水族箱进度。 */
export function applyAnonymousKeyPress(progress: KeyboardFarmProgress, now = Date.now()): KeyboardFarmProgress {
  const normalizedProgress = recordKeyboardActiveDay(normalizeProgress(resetDailyCountIfNeeded(progress, now)), now);
  const nextTotalPresses = normalizedProgress.totalPresses + 1;
  const nextAquariumProgress = normalizedProgress.activeSceneId === "aquarium"
    ? advanceAquariumCycle(normalizedProgress.aquariumProgress, nextTotalPresses, now)
    : normalizedProgress.aquariumProgress;

  return evaluateAchievements({
    ...normalizedProgress,
    totalPresses: nextTotalPresses,
    todayPresses: normalizedProgress.todayPresses + 1,
    aquariumProgress: nextAquariumProgress,
    achievementProgress: recordDailyFishOpeningIfNeeded(
      normalizedProgress.achievementProgress,
      normalizedProgress.aquariumProgress,
      nextAquariumProgress,
      now,
    ),
    updatedAt: now,
  }, now);
}

/** 把当前场景切换到指定场景，并保留已有玩法进度。 */
export function setActiveScene(progress: KeyboardFarmProgress, sceneId: SceneId, now = Date.now()): KeyboardFarmProgress {
  const normalizedProgress = normalizeProgress(progress);

  if (normalizedProgress.activeSceneId === sceneId) {
    return normalizedProgress;
  }

  return {
    ...normalizedProgress,
    activeSceneId: sceneId,
    updatedAt: now,
  };
}

/** 应用一次水族箱手动按钮进度，按钮不计入键盘按键统计。 */
export function applyAquariumManualProgress(progress: KeyboardFarmProgress, now = Date.now()): KeyboardFarmProgress {
  const normalizedProgress = normalizeProgress(progress);

  if (normalizedProgress.activeSceneId !== "aquarium") {
    return normalizedProgress;
  }

  const nextAquariumProgress = advanceAquariumCycle(normalizedProgress.aquariumProgress, now, now);
  const nextAchievementProgress = recordDailyFishOpeningIfNeeded(
    {
      ...normalizedProgress.achievementProgress,
      manualButtonPresses: normalizedProgress.achievementProgress.manualButtonPresses + 1,
    },
    normalizedProgress.aquariumProgress,
    nextAquariumProgress,
    now,
  );

  return evaluateAchievements({
    ...normalizedProgress,
    achievementProgress: nextAchievementProgress,
    aquariumProgress: nextAquariumProgress,
    updatedAt: now,
  }, now);
}

/** 记录一次气泡按钮点击，用于水族箱互动类成就。 */
export function applyBubbleButtonPress(progress: KeyboardFarmProgress, now = Date.now()): KeyboardFarmProgress {
  const normalizedProgress = normalizeProgress(progress);

  return evaluateAchievements({
    ...normalizedProgress,
    achievementProgress: {
      ...normalizedProgress.achievementProgress,
      bubbleButtonPresses: normalizedProgress.achievementProgress.bubbleButtonPresses + 1,
    },
    updatedAt: now,
  }, now);
}

/** 记录一次开关灯按钮点击，用于水族箱互动类成就。 */
export function applyLightTogglePress(progress: KeyboardFarmProgress, now = Date.now()): KeyboardFarmProgress {
  const normalizedProgress = normalizeProgress(progress);

  return evaluateAchievements({
    ...normalizedProgress,
    achievementProgress: {
      ...normalizedProgress.achievementProgress,
      lightTogglePresses: normalizedProgress.achievementProgress.lightTogglePresses + 1,
    },
    updatedAt: now,
  }, now);
}

/** 记录一次震动按钮点击，用于水族箱互动类成就。 */
export function applyShakeButtonPress(progress: KeyboardFarmProgress, now = Date.now()): KeyboardFarmProgress {
  const normalizedProgress = normalizeProgress(progress);

  return evaluateAchievements({
    ...normalizedProgress,
    achievementProgress: {
      ...normalizedProgress.achievementProgress,
      shakeButtonPresses: normalizedProgress.achievementProgress.shakeButtonPresses + 1,
    },
    updatedAt: now,
  }, now);
}

/** 批量发放开发测试用水族箱物种，不改变按键统计、开箱次数和当前进度条。 */
export function grantAquariumTestSpecies(progress: KeyboardFarmProgress, now = Date.now()): KeyboardFarmProgress {
  const normalizedProgress = normalizeProgress(progress);
  const grantedFishIds = FISH_RARITY_DEFINITIONS.flatMap((rarity) => selectAquariumTestGrantFishIds(normalizedProgress.aquariumProgress, rarity.id, AQUARIUM_TEST_GRANT_COUNTS[rarity.id]));

  return grantTestFishIds(normalizedProgress, grantedFishIds, now);
}

/** 批量发放开发测试用底栖物种，方便检查底部生态位和静止贝类表现。 */
export function grantBenthicTestSpecies(progress: KeyboardFarmProgress, now = Date.now()): KeyboardFarmProgress {
  const normalizedProgress = normalizeProgress(progress);
  const grantedFishIds = selectBenthicTestGrantFishIds(normalizedProgress.aquariumProgress, BENTHIC_TEST_GRANT_COUNT);

  return grantTestFishIds(normalizedProgress, grantedFishIds, now);
}

/** 将一组测试物种写入收藏，不改变按键统计、开箱次数和当前进度条。 */
function grantTestFishIds(progress: KeyboardFarmProgress, grantedFishIds: FishId[], now: number): KeyboardFarmProgress {
  if (grantedFishIds.length === 0) {
    return progress;
  }

  const nextFishCollections = grantedFishIds.reduce(
    (collections, fishId, index) => recordFishOpening(collections, fishId, now + index),
    progress.aquariumProgress.fishCollections,
  );
  const lastOpenedFishId = grantedFishIds[grantedFishIds.length - 1];
  const lastOpenedAt = now + grantedFishIds.length - 1;

  return evaluateAchievements({
    ...progress,
    aquariumProgress: {
      ...progress.aquariumProgress,
      fishCollections: nextFishCollections,
      lastOpenedFishId,
      lastOpenedAt,
    },
    updatedAt: lastOpenedAt,
  }, lastOpenedAt);
}

/** 批量解锁开发测试用成就，方便快速检查成就陈列和详情样式。 */
export function grantAchievementTestUnlocks(progress: KeyboardFarmProgress, now = Date.now()): KeyboardFarmProgress {
  const normalizedProgress = normalizeProgress(progress);
  const unlockedAchievements = ACHIEVEMENT_DEFINITIONS.reduce<AchievementProgress["unlockedAchievements"]>((records, definition, index) => ({
    ...records,
    [definition.id]: normalizedProgress.achievementProgress.unlockedAchievements[definition.id] ?? {
      id: definition.id,
      unlockedAt: now + index,
    },
  }), {});
  const recentEvents = ACHIEVEMENT_DEFINITIONS.map<AchievementRecentEvent>((definition, index) => ({
    type: "achievement",
    achievementId: definition.id,
    createdAt: now + index,
  }));

  return {
    ...normalizedProgress,
    achievementProgress: {
      ...normalizedProgress.achievementProgress,
      unlockedAchievements,
      recentEvents: normalizeAchievementRecentEvents([
        ...normalizedProgress.achievementProgress.recentEvents,
        ...recentEvents,
      ]),
    },
    updatedAt: now,
  };
}

/** 在农场场景中应用按键，保持原有作物成长规则。 */
function applyFarmKeyPress(progress: KeyboardFarmProgress, keyId: KeyId, now: number): KeyboardFarmProgress {
  const normalizedProgress = normalizeProgress(progress);
  const existingKey = normalizedProgress.keys[keyId] ?? createEmptyKeyProgress(keyId);
  const nextKeyStats = recordGlobalKeyPress(normalizedProgress.keyStats, keyId, now);
  const nextPressCount = existingKey.pressCount + 1;
  const nextLevel = getLevelFromThresholds(nextPressCount, KEY_LEVEL_THRESHOLDS);
  const preparedKey = ensureCropForKey(existingKey, normalizedProgress, nextLevel);
  const nextKey = growKeyCrop(
    {
      ...preparedKey,
      pressCount: nextPressCount,
      level: nextLevel,
      lastPressedAt: now,
    },
    now,
  );
  const nextCropProgress = recordCropLevel(normalizedProgress.cropProgress, nextKey.cropId, nextKey.cropLevel);

  return evaluateAchievements({
    ...normalizedProgress,
    cropProgress: nextCropProgress,
    totalPresses: normalizedProgress.totalPresses + 1,
    todayPresses: normalizedProgress.todayPresses + 1,
    keyStats: nextKeyStats,
    farmLevel: getFarmLevelFromCollections(normalizedProgress.fullCropCollections),
    keys: {
      ...normalizedProgress.keys,
      [keyId]: nextKey,
    },
    updatedAt: now,
  }, now);
}

/** 在水族箱场景中应用按键，只推进水族箱进度和全局统计，不写入农场键位。 */
function applyAquariumKeyPress(progress: KeyboardFarmProgress, keyId: KeyId, now: number): KeyboardFarmProgress {
  const normalizedProgress = normalizeProgress(progress);
  const nextTotalPresses = normalizedProgress.totalPresses + 1;
  const nextKeyStats = recordGlobalKeyPress(normalizedProgress.keyStats, keyId, now);
  const nextAquariumProgress = advanceAquariumCycle(normalizedProgress.aquariumProgress, nextTotalPresses, now);

  return evaluateAchievements({
    ...normalizedProgress,
    totalPresses: nextTotalPresses,
    todayPresses: normalizedProgress.todayPresses + 1,
    keyStats: nextKeyStats,
    aquariumProgress: nextAquariumProgress,
    achievementProgress: recordDailyFishOpeningIfNeeded(
      normalizedProgress.achievementProgress,
      normalizedProgress.aquariumProgress,
      nextAquariumProgress,
      now,
    ),
    updatedAt: now,
  }, now);
}

/** 收取一个已满级的作物，并把收取次数计入农场经验。 */
export function collectCrop(progress: KeyboardFarmProgress, keyId: KeyId, now = Date.now()): KeyboardFarmProgress {
  const normalizedProgress = normalizeProgress(progress);
  const keyProgress = normalizedProgress.keys[keyId];

  if (!keyProgress?.cropReadyAt || !keyProgress.cropId) {
    return normalizedProgress;
  }

  const nextCropProgress = recordCropCollection(normalizedProgress.cropProgress, keyProgress.cropId, keyProgress.cropLevel);
  const nextCollections = normalizedProgress.fullCropCollections + 1;
  const nextFarmLevel = getFarmLevelFromCollections(nextCollections);
  const nextKey = startNextCropCycle(keyProgress, {
    ...normalizedProgress,
    cropProgress: nextCropProgress,
    fullCropCollections: nextCollections,
    farmLevel: nextFarmLevel,
  });

  return {
    ...normalizedProgress,
    cropProgress: nextCropProgress,
    fullCropCollections: nextCollections,
    farmLevel: nextFarmLevel,
    keys: {
      ...normalizedProgress.keys,
      [keyId]: nextKey,
    },
    updatedAt: now,
  };
}

/** 自动收取超过等待时间的满级作物。 */
export function collectAutoReadyCrops(progress: KeyboardFarmProgress, now = Date.now()): KeyboardFarmProgress {
  const normalizedProgress = normalizeProgress(progress);

  return Object.values(normalizedProgress.keys).reduce((nextProgress, keyProgress) => {
    if (!keyProgress.cropReadyAt || now - keyProgress.cropReadyAt < AUTO_COLLECT_DELAY_MS) {
      return nextProgress;
    }

    return collectCrop(nextProgress, keyProgress.keyId, now);
  }, normalizedProgress);
}

/** 读取某个键位的进度，未出现过的键位返回默认状态。 */
export function getKeyStatus(progress: KeyboardFarmProgress, keyId: KeyId): KeyProgress {
  return normalizeProgress(progress).keys[keyId] ?? createEmptyKeyProgress(keyId);
}

/** 汇总农场等级、作物解锁和各作物最高等级。 */
export function getFarmStatus(progress: KeyboardFarmProgress): FarmStatus {
  const normalizedProgress = normalizeProgress(progress);
  const farmLevel = getFarmLevelFromCollections(normalizedProgress.fullCropCollections);
  const unlockedCropIds = getUnlockedCropIds(normalizedProgress.cropProgress);

  return {
    level: farmLevel,
    fullCropCollections: normalizedProgress.fullCropCollections,
    unlockedCropIds,
    crops: CROP_DEFINITIONS.map((crop) => {
      const cropKeys = Object.values(normalizedProgress.keys).filter((keyProgress) => keyProgress.cropId === crop.id);
      const cropProgress = normalizedProgress.cropProgress[crop.id];

      return {
        id: crop.id,
        name: crop.name,
        unlocked: Boolean(cropProgress?.unlocked),
        highestLevel: Math.max(cropProgress?.highestLevel ?? 0, cropKeys.reduce((highest, keyProgress) => Math.max(highest, keyProgress.cropLevel), 0)),
        readyCount: cropKeys.filter((keyProgress) => Boolean(keyProgress.cropReadyAt)).length,
        fullCollections: cropProgress?.fullCollections ?? 0,
      };
    }),
  };
}

/** 汇总水族箱开鱼进度、鱼缸展示鱼和完整图鉴。 */
export function getAquariumStatus(progress: KeyboardFarmProgress): AquariumStatus {
  const normalizedProgress = normalizeProgress(progress);
  const aquariumProgress = normalizedProgress.aquariumProgress;
  const fishGallery = FISH_DEFINITIONS.map((fish) => createFishGalleryItem(fish.id, aquariumProgress));
  const collectedFish = fishGallery.filter((fish) => fish.collected);
  const collectedFishCount = getCollectedFishCount(aquariumProgress);

  return {
    totalOpenings: aquariumProgress.totalOpenings,
    collectedSpecies: collectedFish.length,
    collectedFishCount,
    totalSpecies: FISH_DEFINITIONS.length,
    cycleProgressRatio: getCycleProgressRatio(aquariumProgress.currentCycle),
    lastOpenedFish: aquariumProgress.lastOpenedFishId ? createFishGalleryItem(aquariumProgress.lastOpenedFishId, aquariumProgress) : null,
    fishInTank: selectTankFish(collectedFish, aquariumProgress.lastOpenedFishId),
    fishGallery,
    recentAchievement: getRecentAchievementStatusItem(normalizedProgress.achievementProgress),
    marqueeEvents: createAquariumMarqueeEvents(normalizedProgress.achievementProgress, aquariumProgress),
  };
}

/** 汇总已解锁成就列表，入口是否显示由这里统一决定。 */
export function getAchievementStatus(progress: KeyboardFarmProgress): AchievementStatus {
  const normalizedProgress = normalizeProgress(progress);
  const unlockedAchievements = ACHIEVEMENT_DEFINITIONS.reduce<AchievementStatusItem[]>((items, definition) => {
    const unlockRecord = normalizedProgress.achievementProgress.unlockedAchievements[definition.id];

    if (!unlockRecord) {
      return items;
    }

    items.push({
      ...definition,
      unlockedAt: unlockRecord.unlockedAt,
    });

    return items;
  }, []);

  return {
    unlockedAchievements,
    hasUnlockedAchievements: unlockedAchievements.length > 0,
  };
}

/** 返回全局按键次数最多的键位列表，不读取农场玩法键位进度。 */
export function getTopKeys(progress: KeyboardFarmProgress, limit = Number.POSITIVE_INFINITY): KeyPressStat[] {
  return [...Object.values(normalizeProgress(progress).keyStats)]
    .filter((keyStat) => keyStat.keyId !== GLOBAL_KEYBOARD_ACTIVITY_ID && keyStat.pressCount > 0)
    .sort((left, right) => right.pressCount - left.pressCount)
    .slice(0, limit);
}

/** 补齐旧存档缺失字段，保持版本 1 存档可继续使用。 */
function normalizeProgress(progress: KeyboardFarmProgress): KeyboardFarmProgress {
  const legacyProgress = progress as KeyboardFarmProgress & {
    activeSceneId?: SceneId;
    achievementProgress?: AchievementProgress;
    aquariumProgress?: AquariumProgress;
    cropProgress?: Record<CropId, CropProgress>;
    fullCropCollections?: number;
    keyStats?: Record<KeyId, KeyPressStat>;
    settings?: Partial<AppSettings>;
    windowBounds?: WindowBounds | null;
    updatedAt?: number;
  };
  const fullCropCollections = progress.fullCropCollections ?? 0;
  const farmLevel = getFarmLevelFromCollections(fullCropCollections);
  const cropProgress = hasPersistedCropProgress(legacyProgress.cropProgress)
    ? normalizeCropProgress(legacyProgress.cropProgress, farmLevel)
    : createLegacyCropProgress(legacyProgress, fullCropCollections);

  const normalizedProgress: KeyboardFarmProgress = {
    ...progress,
    activeSceneId: legacyProgress.activeSceneId === "farm" ? "farm" : "aquarium",
    keyStats: normalizeKeyStats(legacyProgress.keyStats, legacyProgress.keys ?? {}, legacyProgress.totalPresses ?? 0),
    cropProgress,
    aquariumProgress: normalizeAquariumProgress(legacyProgress.aquariumProgress, legacyProgress.updatedAt ?? Date.now()),
    achievementProgress: normalizeAchievementProgress(legacyProgress.achievementProgress),
    fullCropCollections,
    farmLevel,
    windowBounds: normalizeWindowBounds(legacyProgress.windowBounds),
    settings: normalizeAppSettings(legacyProgress.settings),
  };

  return evaluateAchievements(normalizedProgress, legacyProgress.updatedAt ?? Date.now(), false);
}

/** 规范化应用设置，旧存档和异常值回退到默认配置。 */
function normalizeAppSettings(settings: Partial<AppSettings> | undefined): AppSettings {
  return {
    keyFeedbackEnabled: typeof settings?.keyFeedbackEnabled === "boolean"
      ? settings.keyFeedbackEnabled
      : DEFAULT_APP_SETTINGS.keyFeedbackEnabled,
    fishDisplayMode: settings?.fishDisplayMode === "compact" ? "compact" : DEFAULT_APP_SETTINGS.fishDisplayMode,
  };
}

/** 校验并规范化窗口位置尺寸，旧存档或异常值直接回退为空。 */
function normalizeWindowBounds(windowBounds: WindowBounds | null | undefined): WindowBounds | null {
  if (
    !windowBounds
    || !Number.isFinite(windowBounds.x)
    || !Number.isFinite(windowBounds.y)
    || !Number.isFinite(windowBounds.width)
    || !Number.isFinite(windowBounds.height)
    || windowBounds.width < 100
    || windowBounds.height < 100
  ) {
    return null;
  }

  return {
    x: Math.round(windowBounds.x),
    y: Math.round(windowBounds.y),
    width: Math.round(windowBounds.width),
    height: Math.round(windowBounds.height),
  };
}

/** 记录一条全局按键统计，独立于农场键位成长数据。 */
function recordGlobalKeyPress(keyStats: Record<KeyId, KeyPressStat>, keyId: KeyId, now: number): Record<KeyId, KeyPressStat> {
  const currentStat = keyStats[keyId];

  return {
    ...keyStats,
    [keyId]: {
      keyId,
      pressCount: (currentStat?.pressCount ?? 0) + 1,
      lastPressedAt: now,
    },
  };
}

/** 补齐全局按键统计；旧存档没有该字段时从农场历史键位中迁移一次。 */
function normalizeKeyStats(keyStats: Record<KeyId, KeyPressStat> | undefined, farmKeys: Record<KeyId, KeyProgress>, totalPresses: number): Record<KeyId, KeyPressStat> {
  if (keyStats && Object.keys(keyStats).length > 0) {
    return Object.values(keyStats).reduce<Record<KeyId, KeyPressStat>>((normalizedStats, keyStat) => {
      if (!keyStat || keyStat.pressCount <= 0) {
        return normalizedStats;
      }

      normalizedStats[keyStat.keyId] = {
        keyId: keyStat.keyId,
        pressCount: normalizeNonNegativeInteger(keyStat.pressCount),
        lastPressedAt: keyStat.lastPressedAt ?? null,
      };

      return normalizedStats;
    }, {});
  }

  const migratedStats = Object.values(farmKeys).reduce<Record<KeyId, KeyPressStat>>((normalizedStats, keyProgress) => {
    if (keyProgress.pressCount <= 0) {
      return normalizedStats;
    }

    normalizedStats[keyProgress.keyId] = {
      keyId: keyProgress.keyId,
      pressCount: normalizeNonNegativeInteger(keyProgress.pressCount),
      lastPressedAt: keyProgress.lastPressedAt,
    };

    return normalizedStats;
  }, {});
  const migratedPresses = Object.values(migratedStats).reduce((sum, keyStat) => sum + keyStat.pressCount, 0);
  const unassignedPresses = Math.max(normalizeNonNegativeInteger(totalPresses) - migratedPresses, 0);

  if (unassignedPresses > 0) {
    migratedStats[GLOBAL_KEYBOARD_ACTIVITY_ID] = {
      keyId: GLOBAL_KEYBOARD_ACTIVITY_ID,
      pressCount: unassignedPresses,
      lastPressedAt: null,
    };
  }

  return migratedStats;
}

/** 判断存档中是否已经有新版作物图鉴字段，空对象按旧存档迁移处理。 */
function hasPersistedCropProgress(cropProgress: Record<CropId, CropProgress> | undefined): cropProgress is Record<CropId, CropProgress> {
  return Boolean(cropProgress && Object.keys(cropProgress).length > 0);
}

/** 按日期切换时重置今日计数，保留永久累计。 */
function resetDailyCountIfNeeded(progress: KeyboardFarmProgress, now: number): KeyboardFarmProgress {
  const nextDayKey = getDayKey(now);

  if (progress.todayKey === nextDayKey) {
    return progress;
  }

  return {
    ...progress,
    todayKey: nextDayKey,
    todayPresses: 0,
  };
}

/** 记录键盘活跃连续天数，同一天多次按键不会重复累加。 */
function recordKeyboardActiveDay(progress: KeyboardFarmProgress, now: number): KeyboardFarmProgress {
  const dayKey = getDayKey(now);
  const lastActiveDayKey = progress.achievementProgress.lastActiveDayKey;

  if (lastActiveDayKey === dayKey) {
    return progress;
  }

  const activeDayStreak = lastActiveDayKey && getDayDistance(lastActiveDayKey, dayKey) === 1
    ? progress.achievementProgress.activeDayStreak + 1
    : 1;

  return {
    ...progress,
    achievementProgress: {
      ...progress.achievementProgress,
      activeDayStreak,
      lastActiveDayKey: dayKey,
    },
  };
}

/** 如果本次水族箱进度产生了开箱结果，则累计当天获得物种数量。 */
function recordDailyFishOpeningIfNeeded(achievementProgress: AchievementProgress, previousAquariumProgress: AquariumProgress, nextAquariumProgress: AquariumProgress, now: number): AchievementProgress {
  if (nextAquariumProgress.totalOpenings <= previousAquariumProgress.totalOpenings) {
    return achievementProgress;
  }

  const dayKey = getDayKey(now);
  const dailyFishOpenings = achievementProgress.dailyFishOpeningsDayKey === dayKey
    ? achievementProgress.dailyFishOpenings + 1
    : 1;

  return {
    ...achievementProgress,
    dailyFishOpenings,
    dailyFishOpeningsDayKey: dayKey,
  };
}

/** 计算两个日期键之间的自然日距离，用于连续活跃判断。 */
function getDayDistance(previousDayKey: string, nextDayKey: string): number {
  const previousTime = Date.parse(`${previousDayKey}T00:00:00.000Z`);
  const nextTime = Date.parse(`${nextDayKey}T00:00:00.000Z`);

  if (!Number.isFinite(previousTime) || !Number.isFinite(nextTime)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.round((nextTime - previousTime) / 86_400_000);
}

/** 创建键位的空进度记录。 */
function createEmptyKeyProgress(keyId: KeyId): KeyProgress {
  return {
    keyId,
    pressCount: 0,
    level: 0,
    cropId: null,
    cropLevel: 0,
    cropCyclePresses: 0,
    cropReadyAt: null,
    lastPressedAt: null,
  };
}

/** 创建初始图鉴进度，默认沿用农场原有初始解锁作物。 */
function createInitialCropProgress(): Record<CropId, CropProgress> {
  return CROP_DEFINITIONS.reduce(
    (progress, crop) => ({
      ...progress,
      [crop.id]: {
        id: crop.id,
        unlocked: DEFAULT_UNLOCKED_CROP_IDS.includes(crop.id),
        highestLevel: 0,
        fullCollections: 0,
      },
    }),
    {} as Record<CropId, CropProgress>,
  );
}

/** 按旧版农场等级规则补齐作物图鉴，避免升级后已解锁作物回锁。 */
function createLegacyCropProgress(progress: KeyboardFarmProgress, fullCropCollections: number): Record<CropId, CropProgress> {
  const legacyFarmLevel = getFarmLevelFromCollections(fullCropCollections);
  const legacyUnlockCount = getFarmLevelUnlockCount(legacyFarmLevel);
  const keyCropIds = new Set(Object.values(progress.keys ?? {}).map((keyProgress) => keyProgress.cropId).filter((cropId): cropId is CropId => Boolean(cropId)));

  return CROP_DEFINITIONS.reduce(
    (cropProgress, crop, index) => ({
      ...cropProgress,
      [crop.id]: {
        id: crop.id,
        unlocked: index < legacyUnlockCount || keyCropIds.has(crop.id),
        highestLevel: getLegacyHighestCropLevel(progress, crop.id),
        fullCollections: 0,
      },
    }),
    {} as Record<CropId, CropProgress>,
  );
}

/** 从旧版键位记录中恢复当前仍可观察到的作物最高等级。 */
function getLegacyHighestCropLevel(progress: KeyboardFarmProgress, cropId: CropId): number {
  return Object.values(progress.keys ?? {})
    .filter((keyProgress) => keyProgress.cropId === cropId)
    .reduce((highestLevel, keyProgress) => Math.max(highestLevel, keyProgress.cropLevel), 0);
}

/** 创建水族箱初始进度，并立即准备第一轮隐藏开鱼周期。 */
function createInitialAquariumProgress(now: number): AquariumProgress {
  return {
    currentCycle: createAquariumCycle(`initial:${now}`, now),
    fishCollections: {},
    totalOpenings: 0,
    lastOpenedFishId: null,
    lastOpenedAt: null,
  };
}

/** 补齐水族箱进度缺失字段，兼容旧存档和测试手写对象。 */
function normalizeAquariumProgress(aquariumProgress: AquariumProgress | undefined, now: number): AquariumProgress {
  if (!aquariumProgress) {
    return createInitialAquariumProgress(now);
  }

  return {
    currentCycle: normalizeAquariumCycle(aquariumProgress.currentCycle, now),
    fishCollections: normalizeFishCollections(aquariumProgress.fishCollections ?? {}),
    totalOpenings: aquariumProgress.totalOpenings ?? 0,
    lastOpenedFishId: getKnownFishId(aquariumProgress.lastOpenedFishId),
    lastOpenedAt: aquariumProgress.lastOpenedAt ?? null,
  };
}

/** 补齐当前开鱼周期，异常历史值会回退为一轮普通鱼周期。 */
function normalizeAquariumCycle(cycle: AquariumCycle | undefined, now: number): AquariumCycle {
  if (!cycle) {
    return createAquariumCycle(`cycle:${now}`, now);
  }

  const rarity = getKnownRarity(cycle.rarity);
  const rarityDefinition = getRarityDefinition(rarity);
  const targetPresses = Math.min(Math.max(normalizePositiveInteger(cycle.targetPresses || rarityDefinition.minPresses), rarityDefinition.minPresses), rarityDefinition.maxPresses);

  return {
    rarity,
    targetPresses,
    currentPresses: Math.min(normalizeNonNegativeInteger(cycle.currentPresses ?? 0), targetPresses),
    startedAt: cycle.startedAt || now,
    salt: Math.trunc(cycle.salt || 0),
  };
}

/** 清理鱼类收藏记录，只保留当前鱼库里存在的鱼。 */
function normalizeFishCollections(collections: Partial<Record<FishId, FishCollectionProgress>>): Partial<Record<FishId, FishCollectionProgress>> {
  return Object.values(collections).reduce<Partial<Record<FishId, FishCollectionProgress>>>((normalizedCollections, collection) => {
    if (!collection) {
      return normalizedCollections;
    }

    const fishId = getKnownFishId(collection.id);

    if (!fishId) {
      return normalizedCollections;
    }

    normalizedCollections[fishId] = {
      id: fishId,
      count: normalizePositiveInteger(collection.count),
      firstOpenedAt: collection.firstOpenedAt || collection.lastOpenedAt || 0,
      lastOpenedAt: collection.lastOpenedAt || collection.firstOpenedAt || 0,
    };

    return normalizedCollections;
  }, {});
}

/** 创建初始成就进度，成就入口默认不显示。 */
function createInitialAchievementProgress(): AchievementProgress {
  return {
    unlockedAchievements: {},
    manualButtonPresses: 0,
    bubbleButtonPresses: 0,
    lightTogglePresses: 0,
    shakeButtonPresses: 0,
    activeDayStreak: 0,
    lastActiveDayKey: null,
    dailyFishOpenings: 0,
    dailyFishOpeningsDayKey: null,
    recentEvents: [],
  };
}

/** 补齐并清理成就进度，避免旧存档或未来废弃成就污染 UI。 */
function normalizeAchievementProgress(achievementProgress: AchievementProgress | undefined): AchievementProgress {
  if (!achievementProgress) {
    return createInitialAchievementProgress();
  }

  return {
    unlockedAchievements: normalizeUnlockedAchievements(achievementProgress.unlockedAchievements ?? {}),
    manualButtonPresses: normalizeNonNegativeInteger(achievementProgress.manualButtonPresses ?? 0),
    bubbleButtonPresses: normalizeNonNegativeInteger(achievementProgress.bubbleButtonPresses ?? 0),
    lightTogglePresses: normalizeNonNegativeInteger(achievementProgress.lightTogglePresses ?? 0),
    shakeButtonPresses: normalizeNonNegativeInteger(achievementProgress.shakeButtonPresses ?? 0),
    activeDayStreak: normalizeNonNegativeInteger(achievementProgress.activeDayStreak ?? 0),
    lastActiveDayKey: achievementProgress.lastActiveDayKey ?? null,
    dailyFishOpenings: normalizeNonNegativeInteger(achievementProgress.dailyFishOpenings ?? 0),
    dailyFishOpeningsDayKey: achievementProgress.dailyFishOpeningsDayKey ?? null,
    recentEvents: normalizeAchievementRecentEvents(achievementProgress.recentEvents ?? []),
  };
}

/** 只保留当前成就定义中仍然存在的解锁记录。 */
function normalizeUnlockedAchievements(unlockedAchievements: AchievementProgress["unlockedAchievements"]): AchievementProgress["unlockedAchievements"] {
  return ACHIEVEMENT_DEFINITIONS.reduce<AchievementProgress["unlockedAchievements"]>((normalizedRecords, definition) => {
    const record = unlockedAchievements[definition.id];

    if (record) {
      normalizedRecords[definition.id] = {
        id: definition.id,
        unlockedAt: normalizeNonNegativeInteger(record.unlockedAt),
      };
    }

    return normalizedRecords;
  }, {});
}

/** 清理最近成就事件队列，只保留当前定义中存在的少量事件。 */
function normalizeAchievementRecentEvents(events: AchievementRecentEvent[]): AchievementRecentEvent[] {
  return events
    .filter((event) => event.type === "achievement" && ACHIEVEMENT_DEFINITIONS.some((definition) => definition.id === event.achievementId))
    .map<AchievementRecentEvent>((event) => ({
      type: "achievement",
      achievementId: event.achievementId,
      createdAt: normalizeNonNegativeInteger(event.createdAt),
    }))
    .sort((left, right) => left.createdAt - right.createdAt)
    .slice(-ACHIEVEMENT_RECENT_EVENT_LIMIT);
}

/** 按当前进度评估成就，返回带有新增解锁事件的进度对象。 */
function evaluateAchievements(progress: KeyboardFarmProgress, now: number, recordRecentEvents = true): KeyboardFarmProgress {
  const achievementProgress = normalizeAchievementProgress(progress.achievementProgress);
  const metrics = createAchievementMetricSnapshot(progress);
  const unlockedAchievements = { ...achievementProgress.unlockedAchievements };
  const newEvents: AchievementRecentEvent[] = [];

  for (const definition of ACHIEVEMENT_DEFINITIONS) {
    if (unlockedAchievements[definition.id] || metrics[definition.metric] < definition.threshold) {
      continue;
    }

    unlockedAchievements[definition.id] = {
      id: definition.id,
      unlockedAt: now,
    };

    if (recordRecentEvents) {
      newEvents.push({
        type: "achievement",
        achievementId: definition.id,
        createdAt: now,
      });
    }
  }

  return {
    ...progress,
    achievementProgress: {
      ...achievementProgress,
      unlockedAchievements,
      recentEvents: recordRecentEvents
        ? normalizeAchievementRecentEvents([...achievementProgress.recentEvents, ...newEvents])
        : achievementProgress.recentEvents,
    },
  };
}

/** 生成成就判断需要的数值快照，确保所有条件从同一份进度中读取。 */
function createAchievementMetricSnapshot(progress: KeyboardFarmProgress): Record<AchievementMetric, number> {
  return {
    fishTotal: getCollectedFishCount(progress.aquariumProgress),
    collectedSpeciesTotal: getCollectedSpeciesCount(progress.aquariumProgress),
    curioFishTotal: getCollectedFishCountByRarity(progress.aquariumProgress, "curio"),
    curioSpeciesTotal: getCollectedSpeciesCountByRarity(progress.aquariumProgress, "curio"),
    legendaryFishTotal: getCollectedFishCountByRarity(progress.aquariumProgress, "legendary"),
    legendarySpeciesTotal: getCollectedSpeciesCountByRarity(progress.aquariumProgress, "legendary"),
    manualButtonPresses: progress.achievementProgress.manualButtonPresses,
    todayPresses: progress.todayPresses,
    totalPresses: progress.totalPresses,
    activeDayStreak: progress.achievementProgress.activeDayStreak,
    dailyFishOpenings: progress.achievementProgress.dailyFishOpenings,
    benthicSpeciesTotal: getCollectedSpeciesCountByTag(progress.aquariumProgress, "benthic"),
    anglerSpeciesTotal: getCollectedSpeciesCountByTag(progress.aquariumProgress, "angler"),
    softBodySpeciesTotal: getCollectedSpeciesCountByTag(progress.aquariumProgress, "softBody"),
    largeFishTotal: getCollectedFishCountByTag(progress.aquariumProgress, "large"),
    largeSpeciesTotal: getCollectedSpeciesCountByTag(progress.aquariumProgress, "large"),
    skeletonSpeciesTotal: getCollectedSpeciesCountByTag(progress.aquariumProgress, "skeleton"),
    specialZooSpeciesTotal: getCollectedSpeciesCountByTag(progress.aquariumProgress, "specialZoo"),
    bubbleButtonPresses: progress.achievementProgress.bubbleButtonPresses,
    lightTogglePresses: progress.achievementProgress.lightTogglePresses,
    shakeButtonPresses: progress.achievementProgress.shakeButtonPresses,
  };
}

/** 根据阈值数组计算等级，阈值越过一个就提升一级。 */
function getLevelFromThresholds(value: number, thresholds: readonly number[]): number {
  return thresholds.filter((threshold) => value >= threshold).length;
}

/** 推进当前水族箱周期，进度满时立即开出鱼并开始下一轮。 */
function advanceAquariumCycle(aquariumProgress: AquariumProgress, seed: number, now: number): AquariumProgress {
  const currentCycle = aquariumProgress.currentCycle;
  const nextPresses = currentCycle.currentPresses + 1;

  if (nextPresses < currentCycle.targetPresses) {
    return {
      ...aquariumProgress,
      currentCycle: {
        ...currentCycle,
        currentPresses: nextPresses,
      },
    };
  }

  const openedFishId = pickFishForCycle(currentCycle, aquariumProgress.totalOpenings, seed);
  const nextTotalOpenings = aquariumProgress.totalOpenings + 1;

  return {
    ...aquariumProgress,
    currentCycle: createAquariumCycle(`${seed}:${nextTotalOpenings}:${now}`, now),
    fishCollections: recordFishOpening(aquariumProgress.fishCollections, openedFishId, now),
    totalOpenings: nextTotalOpenings,
    lastOpenedFishId: openedFishId,
    lastOpenedAt: now,
  };
}

/** 为新一轮开鱼创建隐藏稀有度和目标按键数。 */
function createAquariumCycle(seed: string, now: number): AquariumCycle {
  const rarity = pickRarity(seed);
  const rarityDefinition = getRarityDefinition(rarity);
  const targetRoll = getHashFraction(`${seed}:target`);
  const targetRange = rarityDefinition.maxPresses - rarityDefinition.minPresses + 1;

  return {
    rarity,
    targetPresses: rarityDefinition.minPresses + Math.floor(targetRoll * targetRange),
    currentPresses: 0,
    startedAt: now,
    salt: getHashInt(`${seed}:salt`),
  };
}

/** 根据当前周期稀有度和盐值稳定挑选一条鱼。 */
function pickFishForCycle(cycle: AquariumCycle, totalOpenings: number, seed: number): FishId {
  const fishIds = FISH_DEFINITIONS.filter((fish) => fish.rarity === cycle.rarity).map((fish) => fish.id);
  const hash = getHashInt(`${cycle.rarity}:${cycle.salt}:${totalOpenings}:${seed}`);

  return fishIds[hash % fishIds.length] ?? ALL_FISH_IDS[0];
}

/** 在收藏记录中累加开出的鱼，重复鱼只增加数量。 */
function recordFishOpening(collections: Partial<Record<FishId, FishCollectionProgress>>, fishId: FishId, now: number): Partial<Record<FishId, FishCollectionProgress>> {
  const currentCollection = collections[fishId];

  return {
    ...collections,
    [fishId]: {
      id: fishId,
      count: (currentCollection?.count ?? 0) + 1,
      firstOpenedAt: currentCollection?.firstOpenedAt ?? now,
      lastOpenedAt: now,
    },
  };
}

/** 挑选一批开发测试物种，优先补齐未发现物种，再平均增加已有物种数量。 */
function selectAquariumTestGrantFishIds(aquariumProgress: AquariumProgress, rarity: FishRarity, count: number): FishId[] {
  const fishByRarity = FISH_DEFINITIONS.filter((fish) => fish.rarity === rarity);
  const uncollectedFish = fishByRarity.filter((fish) => !aquariumProgress.fishCollections[fish.id]);
  const collectedFish = fishByRarity
    .filter((fish) => aquariumProgress.fishCollections[fish.id])
    .sort((left, right) => {
      const leftCollection = aquariumProgress.fishCollections[left.id];
      const rightCollection = aquariumProgress.fishCollections[right.id];
      const countDiff = (leftCollection?.count ?? 0) - (rightCollection?.count ?? 0);

      if (countDiff !== 0) {
        return countDiff;
      }

      const openedAtDiff = (leftCollection?.lastOpenedAt ?? 0) - (rightCollection?.lastOpenedAt ?? 0);

      if (openedAtDiff !== 0) {
        return openedAtDiff;
      }

      return left.id.localeCompare(right.id);
    });

  return [...uncollectedFish, ...collectedFish].slice(0, count).map((fish) => fish.id);
}

/** 挑选一批底栖测试物种，优先补齐未发现的底栖类别。 */
function selectBenthicTestGrantFishIds(aquariumProgress: AquariumProgress, count: number): FishId[] {
  const benthicFish = FISH_DEFINITIONS.filter((fish) => hasFishAchievementTag(fish, "benthic"));
  const uncollectedFish = benthicFish.filter((fish) => !aquariumProgress.fishCollections[fish.id]);
  const collectedFish = benthicFish
    .filter((fish) => aquariumProgress.fishCollections[fish.id])
    .sort((left, right) => {
      const leftCollection = aquariumProgress.fishCollections[left.id];
      const rightCollection = aquariumProgress.fishCollections[right.id];
      const countDiff = (leftCollection?.count ?? 0) - (rightCollection?.count ?? 0);

      if (countDiff !== 0) {
        return countDiff;
      }

      const openedAtDiff = (leftCollection?.lastOpenedAt ?? 0) - (rightCollection?.lastOpenedAt ?? 0);

      if (openedAtDiff !== 0) {
        return openedAtDiff;
      }

      return left.id.localeCompare(right.id);
    });

  return [...uncollectedFish, ...collectedFish].slice(0, count).map((fish) => fish.id);
}

/** 根据权重稳定挑选本轮稀有度。 */
function pickRarity(seed: string): FishRarity {
  const totalWeight = FISH_RARITY_DEFINITIONS.reduce((sum, rarity) => sum + rarity.weight, 0);
  const roll = getHashFraction(`${seed}:rarity`) * totalWeight;
  let cursor = 0;

  for (const rarity of FISH_RARITY_DEFINITIONS) {
    cursor += rarity.weight;

    if (roll < cursor) {
      return rarity.id;
    }
  }

  return FISH_RARITY_DEFINITIONS[0]?.id ?? "common";
}

/** 读取稀有度配置，异常历史值回退为普通配置。 */
function getRarityDefinition(rarity: FishRarity) {
  return FISH_RARITY_DEFINITIONS.find((definition) => definition.id === rarity) ?? FISH_RARITY_DEFINITIONS[0];
}

/** 将任意文本转换为稳定的非负整数哈希。 */
function getHashInt(value: string): number {
  let hash = 2166136261;

  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

/** 将任意文本转换为 0 到 1 之间的稳定小数。 */
function getHashFraction(value: string): number {
  return getHashInt(value) / 0x100000000;
}

/** 把外部存档数字规整为至少 1 的整数。 */
function normalizePositiveInteger(value: number): number {
  const normalizedValue = Math.trunc(value);

  if (!Number.isFinite(normalizedValue) || normalizedValue < 1) {
    return 1;
  }

  return normalizedValue;
}

/** 把外部存档数字规整为非负整数。 */
function normalizeNonNegativeInteger(value: number): number {
  const normalizedValue = Math.trunc(value);

  if (!Number.isFinite(normalizedValue) || normalizedValue < 0) {
    return 0;
  }

  return normalizedValue;
}

/** 进入产作物阶段后为键位绑定一个已解锁作物。 */
function ensureCropForKey(keyProgress: KeyProgress, progress: KeyboardFarmProgress, nextLevel: number): KeyProgress {
  if (keyProgress.cropId || nextLevel < 5) {
    return keyProgress;
  }

  return startNextCropCycle(keyProgress, progress);
}

/** 根据键位和盐值做确定性选择，保证测试稳定且体验接近随机分配。 */
function pickCropForKey(keyId: KeyId, cropIds: CropId[], salt: number): CropId {
  const hash = [...keyId].reduce((sum, char) => sum + char.charCodeAt(0), salt);
  return cropIds[hash % cropIds.length] ?? ALL_CROP_IDS[0];
}

/** 增长键位上绑定的作物；满级后停止增长并进入待收取状态。 */
function growKeyCrop(keyProgress: KeyProgress, now: number): KeyProgress {
  if (!keyProgress.cropId || keyProgress.cropReadyAt) {
    return keyProgress;
  }

  const nextCyclePresses = keyProgress.cropCyclePresses + 1;
  const nextCropLevel = getLevelFromThresholds(nextCyclePresses, CROP_LEVEL_THRESHOLDS);
  const normalizedCropLevel = Math.max(1, nextCropLevel);

  return {
    ...keyProgress,
    cropCyclePresses: nextCyclePresses,
    cropLevel: normalizedCropLevel,
    cropReadyAt: normalizedCropLevel >= 9 ? now : null,
  };
}

/** 收取后重置按键的临时周期，并立即绑定一个已解锁作物。 */
function startNextCropCycle(keyProgress: KeyProgress, progress: KeyboardFarmProgress): KeyProgress {
  const unlockedCropIds = getUnlockedCropIds(normalizeCropProgress(progress.cropProgress, progress.farmLevel));
  const nextCropId = pickCropForKey(keyProgress.keyId, unlockedCropIds, progress.totalPresses + progress.fullCropCollections);

  return {
    ...keyProgress,
    cropId: nextCropId,
    cropLevel: 1,
    cropCyclePresses: 0,
    cropReadyAt: null,
  };
}

/** 记录作物当前最高等级，不改变农场等级驱动的解锁规则。 */
function recordCropLevel(cropProgress: Record<CropId, CropProgress>, cropId: CropId | null, cropLevel: number): Record<CropId, CropProgress> {
  if (!cropId) {
    return cropProgress;
  }

  const normalizedCropProgress = normalizeCropProgress(cropProgress);
  const currentCrop = normalizedCropProgress[cropId];
  const nextCropProgress = {
    ...normalizedCropProgress,
    [cropId]: {
      ...currentCrop,
      highestLevel: Math.max(currentCrop?.highestLevel ?? 0, cropLevel),
      unlocked: true,
    },
  };

  return nextCropProgress;
}

/** 记录作物满级收取结果。 */
function recordCropCollection(cropProgress: Record<CropId, CropProgress>, cropId: CropId, cropLevel: number): Record<CropId, CropProgress> {
  const normalizedCropProgress = recordCropLevel(cropProgress, cropId, cropLevel);
  const currentCrop = normalizedCropProgress[cropId];

  return {
    ...normalizedCropProgress,
    [cropId]: {
      ...currentCrop,
      fullCollections: (currentCrop?.fullCollections ?? 0) + 1,
    },
  };
}

/** 根据满级作物收取次数计算农场等级。 */
function getFarmLevelFromCollections(collections: number): number {
  return 1 + getLevelFromThresholds(collections, FARM_LEVEL_COLLECTION_THRESHOLDS);
}

/** 根据图鉴进度返回已解锁作物 ID。 */
function getUnlockedCropIds(cropProgress: Record<CropId, CropProgress>): CropId[] {
  return ALL_CROP_IDS.filter((cropId) => cropProgress[cropId]?.unlocked);
}

/** 根据农场等级读取作物解锁数量，保持农场系统和其他场景进度独立。 */
function getFarmLevelUnlockCount(farmLevel: number): number {
  const levelIndex = Math.min(Math.max(Math.trunc(farmLevel), 1), FARM_LEVEL_UNLOCK_COUNTS.length) - 1;

  return FARM_LEVEL_UNLOCK_COUNTS[levelIndex] ?? FARM_LEVEL_UNLOCK_COUNTS[0];
}

/** 根据鱼 ID 和收藏记录创建图鉴展示项。 */
function createFishGalleryItem(fishId: FishId, aquariumProgress: AquariumProgress): FishGalleryItem {
  const fish = FISH_DEFINITIONS.find((definition) => definition.id === fishId) ?? FISH_DEFINITIONS[0];
  const collection = aquariumProgress.fishCollections[fish.id];

  return {
    ...fish,
    collected: Boolean(collection),
    count: collection?.count ?? 0,
    firstOpenedAt: collection?.firstOpenedAt ?? null,
    lastOpenedAt: collection?.lastOpenedAt ?? null,
  };
}

/** 统计水族箱已获得鱼的总数量，重复获得也计入。 */
function getCollectedFishCount(aquariumProgress: AquariumProgress): number {
  return Object.values(aquariumProgress.fishCollections).reduce((count, collection) => count + (collection?.count ?? 0), 0);
}

/** 统计已发现的物种种类数量，重复获得不计入。 */
function getCollectedSpeciesCount(aquariumProgress: AquariumProgress): number {
  return Object.values(aquariumProgress.fishCollections).filter((collection) => (collection?.count ?? 0) > 0).length;
}

/** 按品质统计已获得鱼的总数量，供高品质收集成就使用。 */
function getCollectedFishCountByRarity(aquariumProgress: AquariumProgress, rarity: FishRarity): number {
  return Object.values(aquariumProgress.fishCollections).reduce((count, collection) => {
    if (!collection) {
      return count;
    }

    const fish = FISH_DEFINITIONS.find((definition) => definition.id === collection.id);

    return fish?.rarity === rarity ? count + collection.count : count;
  }, 0);
}

/** 按品质统计已发现的物种种类数量。 */
function getCollectedSpeciesCountByRarity(aquariumProgress: AquariumProgress, rarity: FishRarity): number {
  return Object.values(aquariumProgress.fishCollections).reduce((count, collection) => {
    if (!collection || collection.count <= 0) {
      return count;
    }

    const fish = FISH_DEFINITIONS.find((definition) => definition.id === collection.id);

    return fish?.rarity === rarity ? count + 1 : count;
  }, 0);
}

/** 按成就标签统计已获得物种总数量，重复获得计入。 */
function getCollectedFishCountByTag(aquariumProgress: AquariumProgress, tag: FishAchievementTag): number {
  return Object.values(aquariumProgress.fishCollections).reduce((count, collection) => {
    if (!collection) {
      return count;
    }

    const fish = FISH_DEFINITIONS.find((definition) => definition.id === collection.id);

    return fish && hasFishAchievementTag(fish, tag) ? count + collection.count : count;
  }, 0);
}

/** 按成就标签统计已发现物种种类数量。 */
function getCollectedSpeciesCountByTag(aquariumProgress: AquariumProgress, tag: FishAchievementTag): number {
  return Object.values(aquariumProgress.fishCollections).reduce((count, collection) => {
    if (!collection || collection.count <= 0) {
      return count;
    }

    const fish = FISH_DEFINITIONS.find((definition) => definition.id === collection.id);

    return fish && hasFishAchievementTag(fish, tag) ? count + 1 : count;
  }, 0);
}

/** 判断物种是否属于指定成就分类，优先读取显式标签，其次按现有轮廓规则推导。 */
function hasFishAchievementTag(fish: FishDefinition, tag: FishAchievementTag): boolean {
  if (fish.achievementTags?.includes(tag)) {
    return true;
  }

  if (tag === "benthic") {
    return ["crab", "hermitCrab", "kingCrab", "lobster", "shrimp", "seaCucumber", "seaUrchin", "shellfish", "flounder", "horseshoeCrab"].includes(fish.silhouette ?? "");
  }

  if (tag === "angler") {
    return fish.silhouette === "anglerfish";
  }

  if (tag === "softBody") {
    return ["jellyfish", "octopus", "seaDragon", "squid", "seaSlug"].includes(fish.silhouette ?? "");
  }

  if (tag === "large") {
    return Boolean(fish.scaleMultiplier && fish.scaleMultiplier >= 1.02)
      || ["whale", "dolphin", "seal", "seaLion", "shark", "hammerhead", "kingCrab", "wenyaoFish"].includes(fish.silhouette ?? "");
  }

  if (tag === "skeleton") {
    return fish.silhouette === "skeletonFish";
  }

  return ["seaSlug", "seahorse", "nautilus", "starfish", "seaUrchin", "horseshoeCrab", "seaDragon", "shellfish"].includes(fish.silhouette ?? "");
}

/** 读取最近一条成就事件，供水族箱跑马灯优先展示。 */
function getRecentAchievementStatusItem(achievementProgress: AchievementProgress): AchievementStatusItem | null {
  const latestEvent = [...achievementProgress.recentEvents].sort((left, right) => right.createdAt - left.createdAt)[0];

  if (!latestEvent) {
    return null;
  }

  const definition = ACHIEVEMENT_DEFINITIONS.find((item) => item.id === latestEvent.achievementId);
  const unlockRecord = achievementProgress.unlockedAchievements[latestEvent.achievementId];

  if (!definition || !unlockRecord) {
    return null;
  }

  return {
    ...definition,
    unlockedAt: latestEvent.createdAt,
  };
}

/** 生成水族箱跑马灯事件队列，成就事件优先于同一时间点的物种获得。 */
function createAquariumMarqueeEvents(achievementProgress: AchievementProgress, aquariumProgress: AquariumProgress): AquariumMarqueeEvent[] {
  const achievementEvents = achievementProgress.recentEvents.flatMap((event) => {
    const definition = ACHIEVEMENT_DEFINITIONS.find((item) => item.id === event.achievementId);

    if (!definition) {
      return [];
    }

    return [{
      type: "achievement" as const,
      message: `达成 ${definition.name}`,
      color: 0xffdc6e,
      createdAt: event.createdAt,
    }];
  });
  const lastOpenedFish = aquariumProgress.lastOpenedFishId
    ? createFishGalleryItem(aquariumProgress.lastOpenedFishId, aquariumProgress)
    : null;
  const fishEvents: AquariumMarqueeEvent[] = lastOpenedFish?.lastOpenedAt
    ? [{
        type: "fish",
        message: `获得 ${lastOpenedFish.name}`,
        color: getFishMarqueeColor(lastOpenedFish.rarity),
        createdAt: lastOpenedFish.lastOpenedAt,
      }]
    : [];

  const sortedEvents = [...achievementEvents, ...fishEvents]
    .sort((left, right) => {
      const timeDiff = right.createdAt - left.createdAt;

      if (timeDiff !== 0) {
        return timeDiff;
      }

      return left.type === "achievement" && right.type === "fish" ? -1 : 1;
    });
  const newestCreatedAt = sortedEvents[0]?.createdAt;

  if (newestCreatedAt === undefined) {
    return [];
  }

  return sortedEvents.filter((event) => event.createdAt === newestCreatedAt);
}

/** 读取物种品质对应的跑马灯颜色，避免渲染层重复判断。 */
function getFishMarqueeColor(rarity: FishRarity): number {
  return {
    common: 0xd8fbff,
    rare: 0x6effa8,
    curio: 0xffdc6e,
    legendary: 0xff7a7a,
  }[rarity];
}

/** 从已收集鱼中挑选水族箱主画面候选项，实际同屏数量由渲染层轮换控制。 */
function selectTankFish(collectedFish: FishGalleryItem[], lastOpenedFishId: FishId | null): FishGalleryItem[] {
  return [...collectedFish]
    .sort((left, right) => {
      if (left.id === lastOpenedFishId) {
        return -1;
      }

      if (right.id === lastOpenedFishId) {
        return 1;
      }

      const rarityDiff = getRarityRank(right.rarity) - getRarityRank(left.rarity);

      if (rarityDiff !== 0) {
        return rarityDiff;
      }

      const lastOpenedDiff = (right.lastOpenedAt ?? 0) - (left.lastOpenedAt ?? 0);

      if (lastOpenedDiff !== 0) {
        return lastOpenedDiff;
      }

      return left.id.localeCompare(right.id);
    });
}

/** 读取稀有度排序权重，用于水族箱主画面优先展示高稀有度鱼。 */
function getRarityRank(rarity: FishRarity): number {
  return FISH_RARITY_DEFINITIONS.findIndex((definition) => definition.id === rarity);
}

/** 计算当前隐藏周期的展示进度，只暴露比例不暴露目标数值。 */
function getCycleProgressRatio(cycle: AquariumCycle): number {
  return Math.min(Math.max(cycle.currentPresses / Math.max(cycle.targetPresses, 1), 0), 1);
}

/** 校验鱼 ID 是否仍存在于当前鱼库。 */
function getKnownFishId(fishId: FishId | null | undefined): FishId | null {
  return fishId && ALL_FISH_IDS.includes(fishId) ? fishId : null;
}

/** 校验稀有度是否仍存在于当前稀有度配置。 */
function getKnownRarity(rarity: FishRarity | undefined): FishRarity {
  if (rarity && FISH_RARITY_DEFINITIONS.some((definition) => definition.id === rarity)) {
    return rarity;
  }

  return "common";
}

/** 补齐图鉴进度中的缺失作物，兼容旧存档和测试手写对象。 */
function normalizeCropProgress(cropProgress: Record<CropId, CropProgress>, farmLevel = 1): Record<CropId, CropProgress> {
  const farmUnlockedCount = getFarmLevelUnlockCount(farmLevel);
  const mergedCropProgress = {
    ...createInitialCropProgress(),
    ...cropProgress,
  };

  return CROP_DEFINITIONS.reduce(
    (normalizedProgress, crop, index) => ({
      ...normalizedProgress,
      [crop.id]: {
        ...mergedCropProgress[crop.id],
        id: crop.id,
        unlocked: Boolean(mergedCropProgress[crop.id]?.unlocked || index < farmUnlockedCount),
      },
    }),
    {} as Record<CropId, CropProgress>,
  );
}

/** 把时间戳转换成每日统计用的日期键。 */
function getDayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}
