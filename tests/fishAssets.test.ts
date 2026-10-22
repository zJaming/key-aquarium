import { describe, expect, it } from "vitest";
import { getAllFishAssetUrls, getFishAssetUrl, hasFishAsset } from "../src/game/fishAssets";

describe("鱼类图片素材映射", () => {
  it("首版未接入正式鱼类图片素材时返回空映射", () => {
    expect(getAllFishAssetUrls()).toEqual([]);
    expect(hasFishAsset("fish_001")).toBe(false);
    expect(getFishAssetUrl("fish_001")).toBeNull();
  });

  it("读取空鱼 ID 时返回 null", () => {
    expect(getFishAssetUrl(null)).toBeNull();
    expect(hasFishAsset(null)).toBe(false);
  });
});
