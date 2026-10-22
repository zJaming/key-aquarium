import { describe, expect, it } from "vitest";
import { FISH_DEFINITIONS } from "../src/game/constants";
import { FISH_PIXEL_VIEW_BOX, getFishPixelRects } from "../src/game/fishPixelArt";
import type { FishDefinition, FishGalleryItem } from "../src/game/types";

/** 把物种定义包装成图鉴项，便于测试共享像素图形。 */
function createGalleryItem(fish: FishDefinition): FishGalleryItem {
  return {
    ...fish,
    collected: true,
    count: 1,
    firstOpenedAt: 1,
    lastOpenedAt: 1,
  };
}

/** 解析 SVG viewBox 字符串，测试矩形是否会被图鉴裁切。 */
function parseViewBox(viewBox: string): { minX: number; minY: number; maxX: number; maxY: number } {
  const [minX, minY, width, height] = viewBox.split(" ").map(Number);

  return {
    minX,
    minY,
    maxX: minX + width,
    maxY: minY + height,
  };
}

describe("fishPixelArt", () => {
  it("为所有物种生成可用于水族箱和图鉴的像素矩形", () => {
    const viewBox = parseViewBox(FISH_PIXEL_VIEW_BOX);

    FISH_DEFINITIONS.forEach((definition) => {
      const fish = createGalleryItem(definition);

      [true, false].forEach((facingRight) => {
        const rects = getFishPixelRects(fish, facingRight);

        expect(rects.length, definition.id).toBeGreaterThan(0);

        rects.forEach((rect) => {
          expect(rect.width, definition.id).toBeGreaterThan(0);
          expect(rect.height, definition.id).toBeGreaterThan(0);
          expect(Number.isFinite(rect.color), definition.id).toBe(true);
          expect(rect.x, definition.id).toBeGreaterThanOrEqual(viewBox.minX);
          expect(rect.y, definition.id).toBeGreaterThanOrEqual(viewBox.minY);
          expect(rect.x + rect.width, definition.id).toBeLessThanOrEqual(viewBox.maxX);
          expect(rect.y + rect.height, definition.id).toBeLessThanOrEqual(viewBox.maxY);
        });
      });
    });
  });

  it("所有物种主体像素保持连通，避免水族箱放大后部位散开", () => {
    FISH_DEFINITIONS.forEach((definition) => {
      const fish = createGalleryItem(definition);

      [true, false].forEach((facingRight) => {
        const components = getVisiblePixelComponents(getFishPixelRects(fish, facingRight));

        expect(components, `${definition.id}:${facingRight ? "right" : "left"}`).toHaveLength(1);
      });
    });
  });

  it("所有物种黑色细节贴合主体，避免眼睛在水族箱中脱离身体", () => {
    FISH_DEFINITIONS.forEach((definition) => {
      const fish = createGalleryItem(definition);

      [true, false].forEach((facingRight) => {
        const detachedDetails = getDetachedDarkDetailPixels(getFishPixelRects(fish, facingRight));

        expect(detachedDetails, `${definition.id}:${facingRight ? "right" : "left"}`).toEqual([]);
      });
    });
  });

  it("带长尾的底栖或扁平物种移动时尾巴保持在后方", () => {
    ["fish_026", "fish_090"].forEach((fishId) => {
      const definition = FISH_DEFINITIONS.find((fish) => fish.id === fishId);

      expect(definition, fishId).toBeDefined();

      const fish = createGalleryItem(definition!);
      const rightFacingRects = getFishPixelRects(fish, true);
      const leftFacingRects = getFishPixelRects(fish, false);

      expect(getColorBounds(rightFacingRects, fish.accentColor).minX, `${fishId}:right`).toBeLessThan(getColorBounds(rightFacingRects, fish.bodyColor).minX);
      expect(getColorBounds(leftFacingRects, fish.accentColor).maxX, `${fishId}:left`).toBeGreaterThan(getColorBounds(leftFacingRects, fish.bodyColor).maxX);
    });
  });
});

/** 把非眼睛像素展开为连通分量，用来发现被放大后明显断开的身体部位。 */
function getVisiblePixelComponents(rects: ReturnType<typeof getFishPixelRects>): number[] {
  const pixels = new Set<string>();

  rects.forEach((rect) => {
    if (rect.color === 0x061014 || rect.color === 0x000000) {
      return;
    }

    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      for (let y = rect.y; y < rect.y + rect.height; y += 1) {
        pixels.add(getPixelKey(x, y));
      }
    }
  });

  return collectConnectedPixelComponents(pixels);
}

/** 从像素集合中收集四向连通分量，只要出现多个分量就说明存在明显断开的部件。 */
function collectConnectedPixelComponents(pixels: Set<string>): number[] {
  const components: number[] = [];

  while (pixels.size > 0) {
    const firstPixel = pixels.values().next().value ?? "";
    const stack = [firstPixel];
    let size = 0;

    pixels.delete(firstPixel);

    while (stack.length > 0) {
      const pixel = stack.pop();

      if (!pixel) {
        continue;
      }

      size += 1;

      getNeighborPixelKeys(pixel).forEach((neighbor) => {
        if (pixels.delete(neighbor)) {
          stack.push(neighbor);
        }
      });
    }

    components.push(size);
  }

  return components.sort((left, right) => right - left);
}

/** 读取某个像素的四向邻居 key，避免把斜角接触误判为真正连接。 */
function getNeighborPixelKeys(pixel: string): string[] {
  const [x, y] = pixel.split(":").map(Number);

  return [
    getPixelKey(x + 1, y),
    getPixelKey(x - 1, y),
    getPixelKey(x, y + 1),
    getPixelKey(x, y - 1),
  ];
}

/** 生成稳定的像素坐标 key。 */
function getPixelKey(x: number, y: number): string {
  return `${x}:${y}`;
}

/** 找出没有贴住主体的黑色细节像素，通常代表眼睛或表情点脱离了物种轮廓。 */
function getDetachedDarkDetailPixels(rects: ReturnType<typeof getFishPixelRects>): string[] {
  const bodyPixels = new Set<string>();
  const detailPixels = new Set<string>();

  rects.forEach((rect) => {
    const targetPixels = rect.color === 0x061014 || rect.color === 0x000000 ? detailPixels : bodyPixels;

    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      for (let y = rect.y; y < rect.y + rect.height; y += 1) {
        targetPixels.add(getPixelKey(x, y));
      }
    }
  });

  return [...detailPixels].filter((pixel) => !isDetailPixelAttachedToBody(pixel, bodyPixels));
}

/** 计算指定颜色色块的外接边界，用于断言尾巴相对主体的位置。 */
function getColorBounds(rects: ReturnType<typeof getFishPixelRects>, color: number): { minX: number; maxX: number } {
  const matchedRects = rects.filter((rect) => rect.color === color);

  return matchedRects.reduce(
    (bounds, rect) => ({
      minX: Math.min(bounds.minX, rect.x),
      maxX: Math.max(bounds.maxX, rect.x + rect.width),
    }),
    { minX: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY },
  );
}

/** 判断黑色细节是否与主体重叠或四向相邻，重叠表示黑点画在身体色块上。 */
function isDetailPixelAttachedToBody(pixel: string, bodyPixels: Set<string>): boolean {
  if (bodyPixels.has(pixel)) {
    return true;
  }

  return getNeighborPixelKeys(pixel).some((neighbor) => bodyPixels.has(neighbor));
}
