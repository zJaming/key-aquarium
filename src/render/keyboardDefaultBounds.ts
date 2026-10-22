import { KEYBOARD_LAYOUT } from "../game/keyboardLayout";
import { KEY_BASE_DEPTH } from "./keyAppearance";
import { getIsoKeyGeometry, getVisibleIsoKeySidePoints, projectIso } from "./keyGeometry";
import type { StageFitBounds } from "./stageFit";

const DEFAULT_KEYBOARD_BOUNDS = computeDefaultKeyboardBounds();

/** 返回键盘默认状态下的适配边界，避免等级高度变化影响整体缩放。 */
export function getDefaultKeyboardBounds(): StageFitBounds {
  return {
    ...DEFAULT_KEYBOARD_BOUNDS,
  };
}

/** 按 0 级键帽高度计算整张键盘的默认渲染边界。 */
function computeDefaultKeyboardBounds(): StageFitBounds {
  const points = KEYBOARD_LAYOUT.flatMap((definition) => {
    const position = projectIso(definition.col, definition.row);
    const geometry = getIsoKeyGeometry({
      col: definition.col,
      row: definition.row,
      width: definition.width,
      depth: KEY_BASE_DEPTH,
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
