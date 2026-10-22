import { describe, expect, it } from "vitest";
import { KEYBOARD_LAYOUT } from "../src/game/keyboardLayout";
import { KEY_BASE_DEPTH, getKeyDepth } from "../src/render/keyAppearance";
import { getIsoKeyGeometry, getVisibleIsoKeySidePoints, projectIso } from "../src/render/keyGeometry";
import { getDefaultKeyboardBounds } from "../src/render/keyboardDefaultBounds";
import { computeStageFit, type StageFitBounds } from "../src/render/stageFit";

describe("键盘默认适配边界", () => {
  it("使用默认键帽高度作为适配基准，不跟随等级高度变化", () => {
    const defaultBounds = getDefaultKeyboardBounds();
    const maxLevelBounds = computeKeyboardBoundsForDepth(getKeyDepth(9));
    const defaultFit = computeStageFit({
      bounds: defaultBounds,
      hostWidth: 900,
      hostHeight: 360,
      padding: 24,
    });
    const maxLevelFit = computeStageFit({
      bounds: maxLevelBounds,
      hostWidth: 900,
      hostHeight: 360,
      padding: 24,
    });

    expect(defaultBounds).toEqual(computeKeyboardBoundsForDepth(KEY_BASE_DEPTH));
    expect(maxLevelBounds.height).toBeGreaterThan(defaultBounds.height);
    expect(defaultFit.scale).toBeGreaterThan(maxLevelFit.scale);
  });
});

/** 按指定键帽高度计算整张键盘的渲染边界，用于验证默认适配基准。 */
function computeKeyboardBoundsForDepth(depth: number): StageFitBounds {
  const points = KEYBOARD_LAYOUT.flatMap((definition) => {
    const position = projectIso(definition.col, definition.row);
    const geometry = getIsoKeyGeometry({
      col: definition.col,
      row: definition.row,
      width: definition.width,
      depth,
    });
    const visibleSides = getVisibleIsoKeySidePoints(geometry);

    return [geometry.topPoints, visibleSides.screenLeft, visibleSides.screenRight].flatMap((polygon) =>
      polygonToPoints(polygon).map((point) => ({
        x: point.x + position.x,
        y: point.y + position.y,
      })),
    );
  });
  const xValues = points.map((point) => point.x);
  const yValues = points.map((point) => point.y);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/** 把 PixiJS 多边形扁平数组还原成点数组。 */
function polygonToPoints(polygon: number[]): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];

  for (let index = 0; index < polygon.length; index += 2) {
    points.push({
      x: polygon[index] ?? 0,
      y: polygon[index + 1] ?? 0,
    });
  }

  return points;
}
