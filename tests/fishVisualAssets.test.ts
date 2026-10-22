import { describe, expect, it } from "vitest";
import { FISH_DEFINITIONS } from "../src/game/constants";
import { FISH_PIXEL_VIEW_BOX } from "../src/game/fishPixelArt";
import { getFishVisualPixelBounds, getFishVisualPixelRects, getFishVisualViewBox, resolveFishVisualAsset } from "../src/game/fishVisualAssets";
import type { FishDefinition, FishGalleryItem } from "../src/game/types";

/** 把物种定义包装成图鉴项，便于测试视觉资产解析。 */
function createGalleryItem(fish: FishDefinition): FishGalleryItem {
  return {
    ...fish,
    collected: true,
    count: 1,
    firstOpenedAt: 1,
    lastOpenedAt: 1,
  };
}

describe("fishVisualAssets", () => {
  it("未配置图片资产时回退到代码像素矩形", () => {
    const fish = createGalleryItem(FISH_DEFINITIONS[0]);
    const visualAsset = resolveFishVisualAsset(fish);

    expect(visualAsset.renderMode).toBe("pixelRects");
    expect(getFishVisualViewBox(fish)).toBe(FISH_PIXEL_VIEW_BOX);
    expect(getFishVisualPixelRects(fish).length).toBeGreaterThan(0);
  });

  it("配置图片资产路径时解析为 sprite 模式并补齐默认帧信息", () => {
    const fish = createGalleryItem({
      ...FISH_DEFINITIONS[0],
      visualAsset: {
        renderMode: "sprite",
        assetPath: "/assets/aquarium/fish/test.png",
      },
    });
    const visualAsset = resolveFishVisualAsset(fish);

    expect(visualAsset).toEqual({
      renderMode: "sprite",
      spriteKey: "/assets/aquarium/fish/test.png",
      assetPath: "/assets/aquarium/fish/test.png",
      frameWidth: 96,
      frameHeight: 64,
      frameCount: 1,
    });
    expect(getFishVisualPixelRects(fish).length).toBeGreaterThan(0);
  });

  it("图片模式缺少路径时继续回退到代码像素矩形", () => {
    const fish = createGalleryItem({
      ...FISH_DEFINITIONS[0],
      visualAsset: {
        renderMode: "sprite",
        spriteKey: "missing-path",
      },
    });

    expect(resolveFishVisualAsset(fish).renderMode).toBe("pixelRects");
    expect(getFishVisualViewBox(fish)).toBe(FISH_PIXEL_VIEW_BOX);
  });

  it("所有物种都有可用于水族箱边界约束的有效像素包围盒", () => {
    FISH_DEFINITIONS.forEach((definition) => {
      const fish = createGalleryItem(definition);

      [true, false].forEach((facingRight) => {
        const bounds = getFishVisualPixelBounds(fish, facingRight);

        expect(bounds.maxX, definition.id).toBeGreaterThan(bounds.minX);
        expect(bounds.maxY, definition.id).toBeGreaterThan(bounds.minY);
      });
    });
  });
});
