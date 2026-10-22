import type { FishGalleryItem, FishId, FishRarity } from "../game/types";

export interface GallerySpecimenPlacement {
  fishId: FishId;
  x: number;
  y: number;
  ring: number;
  rarity: FishRarity;
  scale: number;
}

export interface GalleryViewportState {
  x: number;
  y: number;
  scale: number;
}

interface RarityRingPlacement {
  ring: number;
  x: number;
  y: number;
}

interface AxialHexCoordinate {
  q: number;
  r: number;
  ring: number;
}

const RARITY_LAYOUT_ORDER: FishRarity[] = ["legendary", "curio", "rare", "common"];
const RARITY_SORT_RANK: Record<FishRarity, number> = {
  legendary: 4,
  curio: 3,
  rare: 2,
  common: 1,
};
const RARITY_SCALE: Record<FishRarity, number> = {
  legendary: 1,
  curio: 1,
  rare: 1,
  common: 1,
};
const HEX_STEP_X = 80;
const HEX_STEP_Y = 68;

/** 筛选并排序已发现物种，保证图鉴陈列位置在同一存档下稳定。 */
export function sortDiscoveredGalleryFish(fishGallery: FishGalleryItem[]): FishGalleryItem[] {
  return fishGallery.filter((fish) => fish.collected).sort(compareGalleryFish);
}

/** 计算品质分层的六边形徽章墙布局，高品质靠近中心，同品质按首次获取先后排列。 */
export function computeGallerySpecimenPlacements(discoveredFish: FishGalleryItem[]): GallerySpecimenPlacement[] {
  const placements: GallerySpecimenPlacement[] = [];
  const hexSlots = createHexWallSlots(discoveredFish.length);
  let nextSlotIndex = 0;

  RARITY_LAYOUT_ORDER.forEach((rarity) => {
    const rarityFish = discoveredFish.filter((fish) => fish.rarity === rarity).sort(compareFishByFirstOpenedAt);

    rarityFish.forEach((fish) => {
      const slot = hexSlots[nextSlotIndex];
      nextSlotIndex += 1;

      placements.push({
        fishId: fish.id,
        x: slot.x,
        y: slot.y,
        ring: slot.ring,
        rarity,
        scale: RARITY_SCALE[rarity],
      });
    });
  });

  return placements;
}

/** 比较图鉴物种展示顺序，让高品质和更早获得的物种更靠前。 */
export function compareGalleryFish(left: FishGalleryItem, right: FishGalleryItem): number {
  const rarityDiff = RARITY_SORT_RANK[right.rarity] - RARITY_SORT_RANK[left.rarity];

  if (rarityDiff !== 0) {
    return rarityDiff;
  }

  return compareFishByFirstOpenedAt(left, right);
}

/** 比较同品质物种的首次获取顺序，缺少时间时退回 ID 保持稳定。 */
function compareFishByFirstOpenedAt(left: FishGalleryItem, right: FishGalleryItem): number {
  const firstOpenedDiff = (left.firstOpenedAt ?? Number.MAX_SAFE_INTEGER) - (right.firstOpenedAt ?? Number.MAX_SAFE_INTEGER);

  if (firstOpenedDiff !== 0) {
    return firstOpenedDiff;
  }

  return left.id.localeCompare(right.id);
}

/** 生成从中心向外扩散的轴坐标六边形网格，保证徽章墙行列对齐。 */
function createHexWallSlots(count: number): RarityRingPlacement[] {
  if (count <= 0) {
    return [];
  }

  return createAxialHexCoordinates(count).map((coordinate) => ({
    x: Math.round(HEX_STEP_X * (coordinate.q + coordinate.r / 2)),
    y: Math.round(HEX_STEP_Y * coordinate.r),
    ring: coordinate.ring,
  }));
}

/** 生成紧凑轴坐标环，按完整环由内向外铺开，避免距离排序造成局部错位。 */
function createAxialHexCoordinates(count: number): AxialHexCoordinate[] {
  const coordinates: AxialHexCoordinate[] = [{ q: 0, r: 0, ring: 0 }];
  let ring = 1;

  while (coordinates.length < count) {
    const ringCoordinates = createAxialHexRing(ring);
    const remainingCount = count - coordinates.length;
    coordinates.push(...centerPartialRing(ringCoordinates, remainingCount));
    ring += 1;
  }

  return coordinates.slice(0, count);
}

/** 生成指定半径的一整圈轴坐标，顺序从上方开始顺时针。 */
function createAxialHexRing(ring: number): AxialHexCoordinate[] {
  const coordinates: AxialHexCoordinate[] = [];
  const directions = [
    [1, 0],
    [1, -1],
    [0, -1],
    [-1, 0],
    [-1, 1],
    [0, 1],
  ] as const;
  let q = -ring;
  let r = ring;

  directions.forEach(([dq, dr]) => {
    for (let step = 0; step < ring; step += 1) {
      coordinates.push({ q, r, ring });
      q += dq;
      r += dr;
    }
  });

  return coordinates.sort(compareAxialCoordinatesByAngle);
}

/** 截取不完整外环时尽量围绕中心展开，避免单边缺口太明显。 */
function centerPartialRing(ringCoordinates: AxialHexCoordinate[], remainingCount: number): AxialHexCoordinate[] {
  if (remainingCount >= ringCoordinates.length) {
    return ringCoordinates;
  }

  const startIndex = Math.max(Math.floor((ringCoordinates.length - remainingCount) / 2), 0);
  return ringCoordinates.slice(startIndex, startIndex + remainingCount);
}

/** 按屏幕角度排序轴坐标，让同一环的视觉顺序稳定。 */
function compareAxialCoordinatesByAngle(left: AxialHexCoordinate, right: AxialHexCoordinate): number {
  const leftX = HEX_STEP_X * (left.q + left.r / 2);
  const leftY = HEX_STEP_Y * left.r;
  const rightX = HEX_STEP_X * (right.q + right.r / 2);
  const rightY = HEX_STEP_Y * right.r;
  const angleDiff = Math.atan2(leftY, leftX) - Math.atan2(rightY, rightX);

  return angleDiff || left.q - right.q || left.r - right.r;
}
