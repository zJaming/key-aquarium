import { describe, expect, it } from "vitest";
import { getAchievementIconSrc } from "../src/game/achievementAssets";
import { ACHIEVEMENT_DEFINITIONS } from "../src/game/constants";

describe("成就图标资源映射", () => {
  it("每个成就都有可打包的图标资源", () => {
    ACHIEVEMENT_DEFINITIONS.forEach((achievement) => {
      expect(getAchievementIconSrc(achievement.id), achievement.id).toMatch(/\.png(?:\?|$)/);
    });
  });

  it("隐藏成就使用独立图标，避免解锁后仍与其他成就混淆", () => {
    expect(getAchievementIconSrc("deep_curse")).not.toBe(getAchievementIconSrc("deep_lights"));
    expect(getAchievementIconSrc("undersea_zoo")).not.toBe(getAchievementIconSrc("soft_party"));
  });
});
