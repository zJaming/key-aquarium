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
  grantAchievementTestUnlocks,
  grantAquariumTestSpecies,
  grantBenthicTestSpecies,
  setActiveScene,
} from "../src/game/progression";
import { ACHIEVEMENT_DEFINITIONS, AQUARIUM_TANK_DISPLAY_LIMIT, AUTO_COLLECT_DELAY_MS, FISH_DEFINITIONS } from "../src/game/constants";
import type { AquariumProgress, FishAchievementTag, FishCollectionProgress, FishId, FishRarity, FishSilhouette } from "../src/game/types";

/** 连续按压同一个键位，方便表达农场作物周期测试。 */
function pressKeyTimes(times: number, keyId = "KeyA") {
  let progress = setActiveScene(createInitialProgress(), "farm");

  for (let index = 0; index < times; index += 1) {
    progress = applyKeyPress(progress, keyId, 1_800_000_000_000 + index);
  }

  return progress;
}

/** 创建一轮接近完成的水族箱周期，方便测试开鱼结果。 */
function createNearlyReadyAquariumProgress(progress: ReturnType<typeof createInitialProgress>, remainingPresses: number): AquariumProgress {
  const targetPresses = 500;

  return {
    ...progress.aquariumProgress,
    currentCycle: {
      ...progress.aquariumProgress.currentCycle,
      rarity: "common",
      targetPresses,
      currentPresses: targetPresses - remainingPresses,
      salt: 12,
    },
  };
}

/** 计算水族箱收藏数量总和。 */
function getTotalFishCount(aquariumProgress: AquariumProgress): number {
  return Object.values(aquariumProgress.fishCollections).reduce((sum, fish) => sum + (fish?.count ?? 0), 0);
}

/** 创建测试用鱼类收藏记录，避免手写对象丢失模板字符串 ID 类型。 */
function createFishCollection(id: FishId, count: number, firstOpenedAt: number, lastOpenedAt: number): FishCollectionProgress {
  return {
    id,
    count,
    firstOpenedAt,
    lastOpenedAt,
  };
}

/** 按品质统计已收集物种数量，便于校验测试发放入口。 */
function countCollectedSpeciesByRarity(progress: ReturnType<typeof createInitialProgress>): Record<FishRarity, number> {
  return getAquariumStatus(progress).fishGallery.reduce<Record<FishRarity, number>>(
    (counts, fish) => {
      if (fish.collected) {
        counts[fish.rarity] += 1;
      }

      return counts;
    },
    {
      common: 0,
      rare: 0,
      curio: 0,
      legendary: 0,
    },
  );
}

/** 判断测试发放出的物种是否属于底栖生态位。 */
function isBenthicTestFish(silhouette: FishSilhouette | undefined, achievementTags: FishAchievementTag[] | undefined): boolean {
  return Boolean(
    achievementTags?.includes("benthic")
    || silhouette === "crab"
    || silhouette === "hermitCrab"
    || silhouette === "kingCrab"
    || silhouette === "lobster"
    || silhouette === "shrimp"
    || silhouette === "seaCucumber"
    || silhouette === "seaUrchin"
    || silhouette === "shellfish"
    || silhouette === "flounder"
    || silhouette === "horseshoeCrab",
  );
}

/** 按品质统计物种定义数量，避免扩展物种时破坏倒金字塔分布。 */
function countFishDefinitionsByRarity(): Record<FishRarity, number> {
  return FISH_DEFINITIONS.reduce<Record<FishRarity, number>>(
    (counts, fish) => {
      counts[fish.rarity] += 1;

      return counts;
    },
    {
      common: 0,
      rare: 0,
      curio: 0,
      legendary: 0,
    },
  );
}

describe("键盘农场成长逻辑", () => {
  it("初始保留农场原有的前三种作物解锁", () => {
    const progress = createInitialProgress();
    const farmStatus = getFarmStatus(progress);

    expect(progress.activeSceneId).toBe("aquarium");
    expect(getAquariumStatus(progress).totalSpecies).toBe(FISH_DEFINITIONS.length);
    expect(farmStatus.unlockedCropIds).toEqual(["crop_001", "crop_002", "crop_003"]);
    expect(farmStatus.crops.find((crop) => crop.id === "crop_004")?.unlocked).toBe(false);
  });

  it("新增海洋物种会带有可区分剪影并覆盖各稀有度", () => {
    const expectedNames = ["玳瑁海龟", "蓝环章鱼", "深海灯笼鱼", "银刃带鱼", "巨月翻车鱼", "星灯琵琶鱼", "礁石海胆", "古甲马蹄蟹", "深渊巨鳌蟹"];
    const expectedSilhouettes: FishSilhouette[] = ["turtle", "octopus", "anglerfish", "puffer", "ribbonfish", "shrimp", "sunfish", "seaUrchin", "flounder", "seaSlug", "eel", "horseshoeCrab"];
    const rarities: FishRarity[] = ["common", "rare", "curio", "legendary"];

    expect(FISH_DEFINITIONS.map((fish) => fish.name)).toEqual(expect.arrayContaining(expectedNames));
    expect(FISH_DEFINITIONS.map((fish) => fish.silhouette).filter(Boolean)).toEqual(expect.arrayContaining(expectedSilhouettes));
    expect(rarities.every((rarity) => FISH_DEFINITIONS.some((fish) => fish.rarity === rarity && fish.silhouette))).toBe(true);
  });

  it("水族箱物种库扩展到 169 个并保持完整图鉴外圈", () => {
    const rarityCounts = countFishDefinitionsByRarity();

    expect(FISH_DEFINITIONS).toHaveLength(169);
    expect(new Set(FISH_DEFINITIONS.map((fish) => fish.id)).size).toBe(169);
    expect(rarityCounts).toEqual({
      common: 89,
      rare: 44,
      curio: 24,
      legendary: 12,
    });
    expect(rarityCounts.common).toBeGreaterThan(rarityCounts.rare);
    expect(rarityCounts.rare).toBeGreaterThan(rarityCounts.curio);
    expect(rarityCounts.curio).toBeGreaterThan(rarityCounts.legendary);
  });

  it("旧存档缺少水族箱字段时会自动补齐", () => {
    const legacyProgress = {
      version: 1,
      totalPresses: 0,
      todayPresses: 0,
      todayKey: "2026-05-11",
      keys: {},
      fullCropCollections: 0,
      farmLevel: 1,
      alwaysOnTop: false,
      updatedAt: 1_800_000_000_000,
    } as ReturnType<typeof createInitialProgress>;
    const status = getAquariumStatus(legacyProgress);

    expect(status.totalSpecies).toBe(FISH_DEFINITIONS.length);
    expect(status.totalOpenings).toBe(0);
    expect(status.cycleProgressRatio).toBe(0);
  });

  it("旧存档缺少设置字段时会自动补齐默认设置", () => {
    const legacyProgress = {
      ...createInitialProgress(1_800_000_000_000),
      settings: undefined,
    } as unknown as ReturnType<typeof createInitialProgress>;
    const nextProgress = applyKeyPress(legacyProgress, "KeyA", 1_800_000_000_100);

    expect(nextProgress.settings).toEqual({
      keyFeedbackEnabled: true,
      fishDisplayMode: "default",
    });
  });

  it("旧存档缺少成就字段时会补齐并追溯已满足的长期成就", () => {
    const baseProgress = createInitialProgress(1_800_000_000_000);
    const legacyProgress = {
      ...baseProgress,
      totalPresses: 1_000_000,
      todayPresses: 10_000,
      achievementProgress: undefined,
      aquariumProgress: {
        ...baseProgress.aquariumProgress,
        fishCollections: {
          fish_001: {
            id: "fish_001",
            count: 99,
            firstOpenedAt: 1_800_000_000_001,
            lastOpenedAt: 1_800_000_000_099,
          },
          fish_026: createFishCollection("fish_026", 99, 1_800_000_000_101, 1_800_000_000_199),
          fish_031: createFishCollection("fish_031", 1, 1_800_000_000_200, 1_800_000_000_200),
        },
      },
      updatedAt: 1_800_000_000_100,
    } as unknown as ReturnType<typeof createInitialProgress>;
    const achievementStatus = getAchievementStatus(legacyProgress);

    expect(achievementStatus.hasUnlockedAchievements).toBe(true);
    expect(achievementStatus.unlockedAchievements.map((achievement) => achievement.id)).toEqual([
      "first_guest",
      "fishing_beginner",
      "fishing_tyrant",
      "ten_thousand_keys_day",
      "key_flow",
      "million_slash",
      "curio_first",
      "golden_glimmer",
      "golden_haul",
      "deep_sea_explorer",
      "large_first",
    ]);
  });

  it("旧存档存在部分成就字段时会补齐新增统计字段", () => {
    const baseProgress = createInitialProgress(1_800_000_000_000);
    const legacyProgress = {
      ...baseProgress,
      achievementProgress: {
        unlockedAchievements: {},
        manualButtonPresses: 0,
        recentEvents: [],
      },
    } as unknown as ReturnType<typeof createInitialProgress>;
    const nextProgress = applyBubbleButtonPress(legacyProgress, 1_800_000_000_100);

    expect(nextProgress.achievementProgress.bubbleButtonPresses).toBe(1);
    expect(nextProgress.achievementProgress.lightTogglePresses).toBe(0);
    expect(nextProgress.achievementProgress.shakeButtonPresses).toBe(0);
    expect(nextProgress.achievementProgress.activeDayStreak).toBe(0);
    expect(nextProgress.achievementProgress.dailyFishOpenings).toBe(0);
  });

  it("连续记录键盘按键会累计连续活跃天数成就", () => {
    let progress = createInitialProgress(Date.UTC(2026, 4, 20));

    progress = applyKeyPress(progress, "KeyA", Date.UTC(2026, 4, 20, 1));
    progress = applyKeyPress(progress, "KeyA", Date.UTC(2026, 4, 21, 1));
    progress = applyKeyPress(progress, "KeyA", Date.UTC(2026, 4, 22, 1));

    const achievementIds = getAchievementStatus(progress).unlockedAchievements.map((achievement) => achievement.id);

    expect(progress.achievementProgress.activeDayStreak).toBe(3);
    expect(achievementIds).toContain("daily_checkin_3");
  });

  it("单日获得物种数量和互动按钮次数会解锁对应成就", () => {
    let progress = {
      ...setActiveScene(createInitialProgress(1_800_000_000_000), "aquarium", 1_800_000_000_001),
      achievementProgress: {
        ...createInitialProgress(1_800_000_000_000).achievementProgress,
        bubbleButtonPresses: 99,
        lightTogglePresses: 99,
        shakeButtonPresses: 99,
      },
    };

    progress = applyBubbleButtonPress(progress, 1_800_000_000_010);
    progress = applyLightTogglePress(progress, 1_800_000_000_020);
    progress = applyShakeButtonPress(progress, 1_800_000_000_030);

    for (let index = 0; index < 9; index += 1) {
      progress = {
        ...progress,
        aquariumProgress: createNearlyReadyAquariumProgress(progress, 1),
      };
      progress = applyAquariumManualProgress(progress, 1_800_000_000_100 + index);
    }

    const achievementIds = getAchievementStatus(progress).unlockedAchievements.map((achievement) => achievement.id);

    expect(achievementIds).toContain("daily_fish_9");
    expect(achievementIds).toContain("bubble_maker");
    expect(achievementIds).toContain("lights_out_observer");
    expect(achievementIds).toContain("wave_maker");
  });

  it("特殊物种类别和已发现种类达到阈值时会解锁分类成就", () => {
    const progress = {
      ...createInitialProgress(1_800_000_000_000),
      aquariumProgress: {
        ...createInitialProgress(1_800_000_000_000).aquariumProgress,
        fishCollections: {
          fish_035: createFishCollection("fish_035", 1, 1, 1),
          fish_040: createFishCollection("fish_040", 1, 2, 2),
          fish_045: createFishCollection("fish_045", 1, 3, 3),
          fish_053: createFishCollection("fish_053", 1, 4, 4),
          fish_073: createFishCollection("fish_073", 1, 5, 5),
          fish_075: createFishCollection("fish_075", 1, 6, 6),
          fish_036: createFishCollection("fish_036", 1, 7, 7),
          fish_039: createFishCollection("fish_039", 1, 8, 8),
          fish_047: createFishCollection("fish_047", 1, 9, 9),
          fish_076: createFishCollection("fish_076", 1, 10, 10),
          fish_051: createFishCollection("fish_051", 1, 11, 11),
          fish_052: createFishCollection("fish_052", 1, 12, 12),
          fish_064: createFishCollection("fish_064", 1, 13, 13),
          fish_066: createFishCollection("fish_066", 1, 14, 14),
          fish_072: createFishCollection("fish_072", 1, 15, 15),
          fish_031: createFishCollection("fish_031", 1, 16, 16),
          fish_043: createFishCollection("fish_043", 1, 17, 17),
          fish_044: createFishCollection("fish_044", 1, 18, 18),
          fish_116: createFishCollection("fish_116", 1, 19, 19),
          fish_121: createFishCollection("fish_121", 1, 20, 20),
          fish_028: createFishCollection("fish_028", 1, 21, 21),
          fish_034: createFishCollection("fish_034", 1, 22, 22),
          fish_046: createFishCollection("fish_046", 1, 23, 23),
          fish_090: createFishCollection("fish_090", 1, 24, 24),
        },
      },
    };
    const achievementIds = getAchievementStatus(progress).unlockedAchievements.map((achievement) => achievement.id);

    expect(achievementIds).toContain("benthic_team");
    expect(achievementIds).toContain("deep_lights");
    expect(achievementIds).toContain("soft_party");
    expect(achievementIds).toContain("large_first");
    expect(achievementIds).toContain("large_shadow_pack");
    expect(achievementIds).toContain("deep_curse");
    expect(achievementIds).toContain("undersea_zoo");
    expect(achievementIds).toContain("species_scale_9");
    expect(achievementIds).toContain("species_scale_18");
  });

  it("物种种类达到后期阈值时会解锁精英、大师、王牌和巅峰成就", () => {
    const fishCollections = FISH_DEFINITIONS.slice(0, 169).reduce<NonNullable<AquariumProgress["fishCollections"]>>((collections, fish, index) => {
      collections[fish.id] = createFishCollection(fish.id, 1, 1_800_000_000_000 + index, 1_800_000_000_000 + index);

      return collections;
    }, {});
    const progress = {
      ...createInitialProgress(1_800_000_000_000),
      aquariumProgress: {
        ...createInitialProgress(1_800_000_000_000).aquariumProgress,
        fishCollections,
      },
    };
    const achievementIds = getAchievementStatus(progress).unlockedAchievements.map((achievement) => achievement.id);

    expect(achievementIds).toContain("species_scale_72");
    expect(achievementIds).toContain("species_scale_108");
    expect(achievementIds).toContain("species_scale_144");
    expect(achievementIds).toContain("species_scale_169");
  });

  it("大型物种累计获得次数会解锁巨影分叉数量成就", () => {
    const progress = {
      ...createInitialProgress(1_800_000_000_000),
      aquariumProgress: {
        ...createInitialProgress(1_800_000_000_000).aquariumProgress,
        fishCollections: {
          fish_031: createFishCollection("fish_031", 40, 1, 1),
          fish_043: createFishCollection("fish_043", 30, 2, 2),
          fish_044: createFishCollection("fish_044", 29, 3, 3),
        },
      },
    };
    const achievementIds = getAchievementStatus(progress).unlockedAchievements.map((achievement) => achievement.id);

    expect(achievementIds).toContain("large_shadow_group");
    expect(achievementIds).toContain("large_shadow_party");
    expect(achievementIds).toContain("storm_wave");
  });

  it("旧存档缺少作物图鉴字段时按旧版农场等级保留解锁作物", () => {
    const legacyProgress = {
      version: 1,
      totalPresses: 720,
      todayPresses: 12,
      todayKey: "2026-05-11",
      keys: {},
      fullCropCollections: 6,
      farmLevel: 4,
      alwaysOnTop: false,
      updatedAt: 1_800_000_000_000,
    } as ReturnType<typeof createInitialProgress>;
    const farmStatus = getFarmStatus(legacyProgress);

    expect(farmStatus.level).toBe(4);
    expect(farmStatus.unlockedCropIds).toEqual(["crop_001", "crop_002", "crop_003", "crop_004", "crop_005", "crop_006", "crop_007"]);
    expect(farmStatus.crops.find((crop) => crop.id === "crop_007")?.unlocked).toBe(true);
    expect(farmStatus.crops.find((crop) => crop.id === "crop_008")?.unlocked).toBe(false);
  });

  it("按键累计会提升键位等级并在产作物阶段绑定已解锁作物", () => {
    let progress = setActiveScene(createInitialProgress(), "farm");

    for (let index = 0; index < 361; index += 1) {
      progress = applyKeyPress(progress, "KeyA", 1_800_000_000_000);
    }

    const keyStatus = getKeyStatus(progress, "KeyA");

    expect(keyStatus.pressCount).toBe(361);
    expect(keyStatus.level).toBe(5);
    expect(keyStatus.cropId).toMatch(/^crop_00[1-3]$/);
    expect(keyStatus.cropLevel).toBe(1);
  });

  it("水族箱新增后不会把农场压缩成 72 次按键满级", () => {
    const progress = pressKeyTimes(72);
    const keyStatus = getKeyStatus(progress, "KeyA");

    expect(keyStatus.pressCount).toBe(72);
    expect(keyStatus.level).toBe(2);
    expect(keyStatus.cropId).toBeNull();
    expect(keyStatus.cropCyclePresses).toBe(0);
    expect(keyStatus.cropLevel).toBe(0);
    expect(keyStatus.cropReadyAt).toBeNull();
  });

  it("作物满级可收取时冻结周期成长，但历史计数继续累加", () => {
    let progress = pressKeyTimes(1_000);
    const readyKey = getKeyStatus(progress, "KeyA");

    expect(readyKey.pressCount).toBe(1_000);
    expect(readyKey.level).toBe(6);
    expect(readyKey.cropLevel).toBe(9);
    expect(readyKey.cropReadyAt).not.toBeNull();
    expect(getFarmStatus(progress).unlockedCropIds).toEqual(["crop_001", "crop_002", "crop_003"]);

    progress = applyKeyPress(progress, "KeyA", 1_800_000_001_100);

    const frozenKey = getKeyStatus(progress, "KeyA");

    expect(frozenKey.pressCount).toBe(1_001);
    expect(frozenKey.level).toBe(6);
    expect(frozenKey.cropLevel).toBe(9);
    expect(frozenKey.cropReadyAt).toBe(readyKey.cropReadyAt);
  });

  it("收取满级作物后保留历史计数、重置周期并解锁下一种作物", () => {
    let progress = pressKeyTimes(1_000);
    const readyCropId = getKeyStatus(progress, "KeyA").cropId;

    progress = collectCrop(progress, "KeyA", 1_800_000_010_000);

    const collectedKey = getKeyStatus(progress, "KeyA");
    const farmStatus = getFarmStatus(progress);

    expect(collectedKey.pressCount).toBe(1_000);
    expect(collectedKey.level).toBe(6);
    expect(["crop_001", "crop_002", "crop_003", "crop_004"]).toContain(collectedKey.cropId);
    expect(collectedKey.cropReadyAt).toBeNull();
    expect(collectedKey.cropLevel).toBe(1);
    expect(collectedKey.cropCyclePresses).toBe(0);
    expect(farmStatus.level).toBe(2);
    expect(farmStatus.fullCropCollections).toBe(1);
    expect(farmStatus.unlockedCropIds).toEqual(["crop_001", "crop_002", "crop_003", "crop_004"]);
    expect(farmStatus.crops.find((crop) => crop.id === readyCropId)?.highestLevel).toBe(9);
  });

  it("满级作物六小时后会自动收取", () => {
    const readyProgress = pressKeyTimes(1_000);
    const readyAt = getKeyStatus(readyProgress, "KeyA").cropReadyAt ?? 0;
    const beforeAuto = collectAutoReadyCrops(readyProgress, readyAt + AUTO_COLLECT_DELAY_MS - 1);
    const afterAuto = collectAutoReadyCrops(readyProgress, readyAt + AUTO_COLLECT_DELAY_MS);

    expect(getKeyStatus(beforeAuto, "KeyA").cropReadyAt).toBe(readyAt);
    expect(getKeyStatus(afterAuto, "KeyA").cropReadyAt).toBeNull();
    expect(getKeyStatus(afterAuto, "KeyA").pressCount).toBe(1_000);
  });

  it("切到水族箱后按键只推进开鱼进度，不写入农场键位进度", () => {
    let progress = createInitialProgress(1_800_000_000_000);

    progress = setActiveScene(progress, "aquarium", 1_800_000_000_010);
    progress = {
      ...progress,
      aquariumProgress: createNearlyReadyAquariumProgress(progress, 3),
    };
    progress = applyKeyPress(progress, "KeyA", 1_800_000_000_011);

    const keyStatus = getKeyStatus(progress, "KeyA");

    expect(progress.activeSceneId).toBe("aquarium");
    expect(progress.totalPresses).toBe(1);
    expect(progress.todayPresses).toBe(1);
    expect(keyStatus.pressCount).toBe(0);
    expect(keyStatus.cropId).toBeNull();
    expect(keyStatus.cropCyclePresses).toBe(0);
    expect(progress.aquariumProgress.currentCycle.currentPresses).toBe(498);
    expect(getTopKeys(progress).map((key) => [key.keyId, key.pressCount])).toEqual([["KeyA", 1]]);
  });

  it("水族箱按键积累后切回农场不会让农场键位跳级", () => {
    let progress = setActiveScene(createInitialProgress(1_800_000_000_000), "aquarium", 1_800_000_000_001);

    for (let index = 0; index < 360; index += 1) {
      progress = applyKeyPress(progress, "KeyA", 1_800_000_000_002 + index);
    }

    expect(progress.totalPresses).toBe(360);
    expect(getKeyStatus(progress, "KeyA").pressCount).toBe(0);
    expect(getTopKeys(progress).map((key) => [key.keyId, key.pressCount])).toEqual([["KeyA", 360]]);

    progress = setActiveScene(progress, "farm", 1_800_000_000_500);
    progress = applyKeyPress(progress, "KeyA", 1_800_000_000_501);

    const farmKeyStatus = getKeyStatus(progress, "KeyA");

    expect(progress.totalPresses).toBe(361);
    expect(farmKeyStatus.pressCount).toBe(1);
    expect(farmKeyStatus.level).toBe(0);
    expect(farmKeyStatus.cropId).toBeNull();
    expect(getTopKeys(progress).map((key) => [key.keyId, key.pressCount])).toEqual([["KeyA", 361]]);
  });

  it("水族箱隐藏进度满后会开出一条鱼并开始新周期", () => {
    let progress = setActiveScene(createInitialProgress(1_800_000_000_000), "aquarium", 1_800_000_000_001);

    progress = {
      ...progress,
      aquariumProgress: createNearlyReadyAquariumProgress(progress, 2),
    };
    progress = applyKeyPress(progress, "KeyA", 1_800_000_000_002);
    progress = applyKeyPress(progress, "KeyA", 1_800_000_000_003);

    const status = getAquariumStatus(progress);

    expect(progress.aquariumProgress.totalOpenings).toBe(1);
    expect(getTotalFishCount(progress.aquariumProgress)).toBe(1);
    expect(progress.aquariumProgress.lastOpenedFishId).not.toBeNull();
    expect(progress.aquariumProgress.currentCycle.currentPresses).toBe(0);
    expect(status.collectedSpecies).toBe(1);
    expect(status.collectedFishCount).toBe(1);
    expect(status.lastOpenedFish?.collected).toBe(true);
    expect(getAchievementStatus(progress).unlockedAchievements.map((achievement) => achievement.id)).toContain("first_guest");
    expect(status.recentAchievement?.id).toBe("first_guest");
    expect(status.marqueeEvents.map((event) => event.type)).toEqual(["achievement", "fish"]);
    expect(status.marqueeEvents[0]?.message).toBe("达成 第一位访客");
    expect(status.marqueeEvents[1]?.message.startsWith("获得 ")).toBe(true);
  });

  it("水族箱手动按钮只推进开鱼进度，不计入键盘统计", () => {
    let progress = setActiveScene(createInitialProgress(1_800_000_000_000), "aquarium", 1_800_000_000_001);

    progress = {
      ...progress,
      aquariumProgress: createNearlyReadyAquariumProgress(progress, 2),
    };
    progress = applyAquariumManualProgress(progress, 1_800_000_000_002);

    expect(progress.totalPresses).toBe(0);
    expect(progress.todayPresses).toBe(0);
    expect(progress.achievementProgress.manualButtonPresses).toBe(1);
    expect(progress.aquariumProgress.currentCycle.currentPresses).toBe(499);
    expect(getTopKeys(progress)).toEqual([]);

    progress = applyAquariumManualProgress(progress, 1_800_000_000_003);

    expect(progress.aquariumProgress.totalOpenings).toBe(1);
    expect(getTotalFishCount(progress.aquariumProgress)).toBe(1);
  });

  it("手动按钮累计到阈值后会解锁疯狂点击且不写入键盘统计", () => {
    const progress = {
      ...setActiveScene(createInitialProgress(1_800_000_000_000), "aquarium", 1_800_000_000_001),
      achievementProgress: {
        unlockedAchievements: {},
        manualButtonPresses: 9_999,
        bubbleButtonPresses: 0,
        lightTogglePresses: 0,
        shakeButtonPresses: 0,
        activeDayStreak: 0,
        lastActiveDayKey: null,
        dailyFishOpenings: 0,
        dailyFishOpeningsDayKey: null,
        recentEvents: [],
      },
    };
    const nextProgress = applyAquariumManualProgress(progress, 1_800_000_000_002);
    const achievementStatus = getAchievementStatus(nextProgress);

    expect(nextProgress.achievementProgress.manualButtonPresses).toBe(10_000);
    expect(nextProgress.totalPresses).toBe(0);
    expect(getTopKeys(nextProgress)).toEqual([]);
    expect(achievementStatus.unlockedAchievements.map((achievement) => achievement.id)).toContain("crazy_clicker");
  });

  it("获得红色品质和金色品质数量时会解锁品质收集成就", () => {
    const progress = {
      ...createInitialProgress(1_800_000_000_000),
      aquariumProgress: {
        ...createInitialProgress(1_800_000_000_000).aquariumProgress,
        fishCollections: {
          fish_026: createFishCollection("fish_026", 9, 1_800_000_000_010, 1_800_000_000_090),
          fish_031: createFishCollection("fish_031", 1, 1_800_000_000_100, 1_800_000_000_100),
        },
      },
    };
    const achievementIds = getAchievementStatus(progress).unlockedAchievements.map((achievement) => achievement.id);

    expect(achievementIds).toContain("deep_sea_explorer");
    expect(achievementIds).toContain("golden_glimmer");
    expect(achievementIds).not.toContain("golden_haul");
  });

  it("金色品质累计达到 99 次后会解锁长期金色收集成就", () => {
    const progress = {
      ...createInitialProgress(1_800_000_000_000),
      aquariumProgress: {
        ...createInitialProgress(1_800_000_000_000).aquariumProgress,
        fishCollections: {
          fish_026: createFishCollection("fish_026", 99, 1_800_000_000_010, 1_800_000_000_990),
        },
      },
    };
    const achievementIds = getAchievementStatus(progress).unlockedAchievements.map((achievement) => achievement.id);

    expect(achievementIds).toContain("golden_glimmer");
    expect(achievementIds).toContain("golden_haul");
  });

  it("今日和累计按键达到阈值后会解锁对应成就且不会重复覆盖时间", () => {
    let progress = {
      ...createInitialProgress(1_800_000_000_000),
      totalPresses: 999_999,
      todayPresses: 9_999,
    };

    progress = applyKeyPress(progress, "KeyA", 1_800_000_000_100);

    const firstUnlockStatus = getAchievementStatus(progress);
    const tenThousandKeys = firstUnlockStatus.unlockedAchievements.find((achievement) => achievement.id === "ten_thousand_keys_day");
    const millionSlash = firstUnlockStatus.unlockedAchievements.find((achievement) => achievement.id === "million_slash");

    expect(tenThousandKeys?.unlockedAt).toBe(1_800_000_000_100);
    expect(millionSlash?.unlockedAt).toBe(1_800_000_000_100);

    progress = applyKeyPress(progress, "KeyA", 1_800_000_000_200);

    const secondUnlockStatus = getAchievementStatus(progress);

    expect(secondUnlockStatus.unlockedAchievements.find((achievement) => achievement.id === "ten_thousand_keys_day")?.unlockedAt).toBe(1_800_000_000_100);
    expect(secondUnlockStatus.unlockedAchievements.find((achievement) => achievement.id === "million_slash")?.unlockedAt).toBe(1_800_000_000_100);
  });

  it("同次触发多个成就和物种获得时跑马灯会保留整批事件", () => {
    const baseProgress = createInitialProgress(1_800_000_000_000);
    let progress = {
      ...baseProgress,
      totalPresses: 999_999,
      todayPresses: 9_999,
      aquariumProgress: createNearlyReadyAquariumProgress(baseProgress, 1),
    };

    progress = applyKeyPress(progress, "KeyA", 1_800_000_000_100);

    const marqueeEvents = getAquariumStatus(progress).marqueeEvents;

    expect(marqueeEvents.map((event) => event.type)).toEqual(["achievement", "achievement", "achievement", "fish"]);
    expect(marqueeEvents.map((event) => event.message)).toEqual(expect.arrayContaining([
      "达成 第一位访客",
      "达成 日理万键",
      "达成 百万斩",
    ]));
    expect(marqueeEvents.at(-1)?.message.startsWith("获得 ")).toBe(true);
  });

  it("开发测试物种发放会覆盖各品质且不污染按键和开箱进度", () => {
    const progress = createInitialProgress(1_800_000_000_000);
    const cycleBeforeGrant = progress.aquariumProgress.currentCycle;
    const nextProgress = grantAquariumTestSpecies(progress, 1_800_000_000_100);

    expect(nextProgress.totalPresses).toBe(0);
    expect(nextProgress.todayPresses).toBe(0);
    expect(nextProgress.keyStats).toEqual({});
    expect(nextProgress.aquariumProgress.totalOpenings).toBe(0);
    expect(nextProgress.aquariumProgress.currentCycle).toEqual(cycleBeforeGrant);
    expect(countCollectedSpeciesByRarity(nextProgress)).toEqual({
      common: 8,
      rare: 5,
      curio: 3,
      legendary: 2,
    });

    const repeatedProgress = grantAquariumTestSpecies(nextProgress, 1_800_000_001_000);

    expect(countCollectedSpeciesByRarity(repeatedProgress)).toEqual({
      common: 16,
      rare: 10,
      curio: 6,
      legendary: 4,
    });
  });

  it("开发测试底栖物种发放只覆盖底部生态位且不污染玩法进度", () => {
    const progress = createInitialProgress(1_800_000_000_000);
    const cycleBeforeGrant = progress.aquariumProgress.currentCycle;
    const nextProgress = grantBenthicTestSpecies(progress, 1_800_000_000_100);
    const collectedFishIds = Object.keys(nextProgress.aquariumProgress.fishCollections) as FishId[];

    expect(nextProgress.totalPresses).toBe(0);
    expect(nextProgress.todayPresses).toBe(0);
    expect(nextProgress.keyStats).toEqual({});
    expect(nextProgress.aquariumProgress.totalOpenings).toBe(0);
    expect(nextProgress.aquariumProgress.currentCycle).toEqual(cycleBeforeGrant);
    expect(collectedFishIds.length).toBeGreaterThan(0);
    expect(collectedFishIds.every((fishId) => {
      const fish = FISH_DEFINITIONS.find((item) => item.id === fishId);

      return Boolean(fish && isBenthicTestFish(fish.silhouette, fish.achievementTags));
    })).toBe(true);
  });

  it("开发测试成就发放会解锁全部成就且不污染玩法进度", () => {
    const progress = createInitialProgress(1_800_000_000_000);
    const nextProgress = grantAchievementTestUnlocks(progress, 1_800_000_000_100);

    expect(getAchievementStatus(nextProgress).unlockedAchievements.map((achievement) => achievement.id)).toEqual(
      ACHIEVEMENT_DEFINITIONS.map((definition) => definition.id),
    );
    expect(nextProgress.totalPresses).toBe(0);
    expect(nextProgress.todayPresses).toBe(0);
    expect(nextProgress.keyStats).toEqual({});
    expect(nextProgress.aquariumProgress).toEqual(progress.aquariumProgress);
  });

  it("非水族箱场景会忽略手动按钮进度", () => {
    const progress = setActiveScene(createInitialProgress(1_800_000_000_000), "farm", 1_800_000_000_001);
    const nextProgress = applyAquariumManualProgress(progress, 1_800_000_000_001);

    expect(nextProgress.aquariumProgress.currentCycle.currentPresses).toBe(0);
    expect(nextProgress.updatedAt).toBe(progress.updatedAt);
  });

  it("重复开出同一种鱼时只累加数量", () => {
    let progress = setActiveScene(createInitialProgress(1_800_000_000_000), "aquarium", 1_800_000_000_001);
    const commonFishCollections = FISH_DEFINITIONS.filter((fish) => fish.rarity === "common").reduce<Partial<Record<FishId, { id: FishId; count: number; firstOpenedAt: number; lastOpenedAt: number }>>>(
      (collections, fish, index) => ({
        ...collections,
        [fish.id]: {
          id: fish.id,
          count: 1,
          firstOpenedAt: 1_800_000_000_000 + index,
          lastOpenedAt: 1_800_000_000_000 + index,
        },
      }),
      {},
    );

    progress = {
      ...progress,
      aquariumProgress: {
        ...createNearlyReadyAquariumProgress(progress, 1),
        fishCollections: commonFishCollections,
      },
    };
    progress = applyKeyPress(progress, "KeyA", 1_800_000_000_002);

    const openedFishId = progress.aquariumProgress.lastOpenedFishId as FishId;

    expect(progress.aquariumProgress.lastOpenedFishId).toBe(openedFishId);
    expect(progress.aquariumProgress.fishCollections[openedFishId]?.count).toBe(2);
    expect(getAquariumStatus(progress).collectedSpecies).toBe(Object.keys(commonFishCollections).length);
  });

  it("水族箱主画面候选池会去重且不提前裁掉可轮换物种", () => {
    const fishCollections = FISH_DEFINITIONS.reduce<Partial<Record<FishId, { id: FishId; count: number; firstOpenedAt: number; lastOpenedAt: number }>>>(
      (collections, fish, index) => ({
        ...collections,
        [fish.id]: {
          id: fish.id,
          count: index + 1,
          firstOpenedAt: 1_800_000_000_000 + index,
          lastOpenedAt: 1_800_000_000_000 + index,
        },
      }),
      {},
    );
    const progress = {
      ...createInitialProgress(1_800_000_000_000),
      aquariumProgress: {
        ...createInitialProgress(1_800_000_000_000).aquariumProgress,
        fishCollections,
        totalOpenings: FISH_DEFINITIONS.length,
        lastOpenedFishId: FISH_DEFINITIONS[0].id,
        lastOpenedAt: 1_800_000_000_999,
      },
    };
    const status = getAquariumStatus(progress);

    expect(status.fishGallery).toHaveLength(FISH_DEFINITIONS.length);
    expect(AQUARIUM_TANK_DISPLAY_LIMIT).toBe(40);
    expect(status.fishInTank).toHaveLength(FISH_DEFINITIONS.length);
    expect(new Set(status.fishInTank.map((fish) => fish.id)).size).toBe(status.fishInTank.length);
  });

  it("排行榜默认返回所有有计数的键位并排除零计数键位", () => {
    const progress = {
      ...createInitialProgress(),
      keys: {
        KeyA: { ...getKeyStatus(createInitialProgress(), "KeyA"), pressCount: 4 },
        KeyB: { ...getKeyStatus(createInitialProgress(), "KeyB"), pressCount: 1 },
        KeyC: { ...getKeyStatus(createInitialProgress(), "KeyC"), pressCount: 0 },
        KeyD: { ...getKeyStatus(createInitialProgress(), "KeyD"), pressCount: 3 },
        KeyE: { ...getKeyStatus(createInitialProgress(), "KeyE"), pressCount: 2 },
        KeyF: { ...getKeyStatus(createInitialProgress(), "KeyF"), pressCount: 5 },
        KeyG: { ...getKeyStatus(createInitialProgress(), "KeyG"), pressCount: 6 },
      },
    };

    expect(getTopKeys(progress).map((key) => key.keyId)).toEqual(["KeyG", "KeyF", "KeyA", "KeyD", "KeyE", "KeyB"]);
  });

  it("旧存档没有全局按键统计时不会把未归属按键显示到排行榜", () => {
    const progress = {
      ...createInitialProgress(),
      totalPresses: 10,
      keyStats: {},
      keys: {
        KeyA: { ...getKeyStatus(createInitialProgress(), "KeyA"), pressCount: 4, lastPressedAt: 1_800_000_000_001 },
        KeyB: { ...getKeyStatus(createInitialProgress(), "KeyB"), pressCount: 1, lastPressedAt: 1_800_000_000_002 },
      },
    };

    expect(getTopKeys(progress).map((key) => [key.keyId, key.pressCount])).toEqual([
      ["KeyA", 4],
      ["KeyB", 1],
    ]);
  });

  it("匿名键盘活动会推进水族箱进度但不会写入按键排行榜", () => {
    let progress = setActiveScene(createInitialProgress(1_800_000_000_000), "aquarium", 1_800_000_000_001);

    progress = applyAnonymousKeyPress(progress, 1_800_000_000_002);

    expect(progress.totalPresses).toBe(1);
    expect(progress.todayPresses).toBe(1);
    expect(progress.aquariumProgress.currentCycle.currentPresses).toBe(1);
    expect(getTopKeys(progress)).toEqual([]);
  });
});
