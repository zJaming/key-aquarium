export interface IsoKeyGeometryInput {
  col: number;
  row: number;
  width: number;
  depth: number;
}

export interface IsoPoint {
  x: number;
  y: number;
}

export interface IsoKeyGeometry {
  topPoints: number[];
  leftPoints: number[];
  rightPoints: number[];
  frontPoints: number[];
  center: IsoPoint;
  sortY: number;
}

export interface VisibleIsoKeySidePoints {
  screenLeft: number[];
  screenRight: number[];
}

const GRID_TILE_WIDTH = 46;
const GRID_TILE_HEIGHT = 24;

/** 根据键盘网格矩形生成等距键帽几何，宽键不会被拉成菱形。 */
export function getIsoKeyGeometry(input: IsoKeyGeometryInput): IsoKeyGeometry {
  const topOffset = input.depth + GRID_TILE_HEIGHT / 2;
  const bottomOffset = GRID_TILE_HEIGHT / 2;
  const leftBack = projectIso(0, 0, topOffset);
  const rightBack = projectIso(input.width, 0, topOffset);
  const rightFront = projectIso(input.width, 1, topOffset);
  const leftFront = projectIso(0, 1, topOffset);
  const bottomLeftBack = projectIso(0, 0, bottomOffset);
  const bottomRightBack = projectIso(input.width, 0, bottomOffset);
  const bottomRightFront = projectIso(input.width, 1, bottomOffset);
  const bottomLeftFront = projectIso(0, 1, bottomOffset);

  return {
    topPoints: flattenPoints([leftBack, rightBack, rightFront, leftFront]),
    leftPoints: flattenPoints([leftBack, leftFront, bottomLeftFront, bottomLeftBack]),
    rightPoints: flattenPoints([rightBack, bottomRightBack, bottomRightFront, rightFront]),
    frontPoints: flattenPoints([leftFront, rightFront, bottomRightFront, bottomLeftFront]),
    center: averagePoints([leftBack, rightBack, rightFront, leftFront]),
    sortY: Math.max(bottomLeftFront.y, bottomRightFront.y),
  };
}

/** 将键盘网格点投影到等距坐标。 */
export function projectIso(col: number, row: number, depth = 0): IsoPoint {
  return {
    x: (col - row) * (GRID_TILE_WIDTH / 2),
    y: (col + row) * (GRID_TILE_HEIGHT / 2) - depth,
  };
}

/** 返回屏幕上实际可见的左右侧面点集，避免和几何边名混淆。 */
export function getVisibleIsoKeySidePoints(geometry: IsoKeyGeometry): VisibleIsoKeySidePoints {
  return {
    screenLeft: geometry.frontPoints,
    screenRight: geometry.rightPoints,
  };
}

/** 把点数组转换成 PixiJS Graphics.poly 需要的扁平数字数组。 */
function flattenPoints(points: IsoPoint[]): number[] {
  return points.flatMap((point) => [point.x, point.y]);
}

/** 计算一组点的几何中心。 */
function averagePoints(points: IsoPoint[]): IsoPoint {
  const total = points.reduce(
    (sum, point) => ({
      x: sum.x + point.x,
      y: sum.y + point.y,
    }),
    { x: 0, y: 0 },
  );

  return {
    x: total.x / points.length,
    y: total.y / points.length,
  };
}
