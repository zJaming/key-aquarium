import { describe, expect, it } from "vitest";
import { FISH_DEFINITIONS } from "../src/game/constants";
import { computeGallerySpecimenPlacements, sortDiscoveredGalleryFish } from "../src/render/aquariumGalleryLayout";
import type { FishDefinition, FishGalleryItem, FishRarity } from "../src/game/types";

/** 把物种定义包装成图鉴项，便于测试图鉴布局。 */
function createGalleryItem(fish: FishDefinition, collected = true, firstOpenedAt = 1, lastOpenedAt = firstOpenedAt): FishGalleryItem {
  return {
    ...fish,
    collected,
    count: collected ? 1 : 0,
    firstOpenedAt: collected ? firstOpenedAt : null,
    lastOpenedAt: collected ? lastOpenedAt : null,
  };
}

/** 生成大量测试物种，验证未来扩容时布局仍然不会明显堆叠。 */
function createManyGalleryItems(rarityCounts: Record<FishRarity, number>): FishGalleryItem[] {
  return Object.entries(rarityCounts).flatMap(([rarity, count]) => Array.from({ length: count }, (_, index) => ({
    id: `fish_${rarity}_${index}` as const,
    name: `${rarity}-${index}`,
    rarity: rarity as FishRarity,
    bodyColor: 0x59d6ff,
    accentColor: 0xffe66d,
    collected: true,
    count: 1,
    firstOpenedAt: 1_800_000_000_000 + index,
    lastOpenedAt: 1_800_000_000_000 + index,
  })));
}

/** 计算任意两种陈列物种之间的最小距离。 */
function getMinimumPlacementDistance(placements: ReturnType<typeof computeGallerySpecimenPlacements>): number {
  let minDistance = Number.POSITIVE_INFINITY;

  placements.forEach((left, leftIndex) => {
    placements.slice(leftIndex + 1).forEach((right) => {
      minDistance = Math.min(minDistance, Math.hypot(left.x - right.x, left.y - right.y));
    });
  });

  return minDistance;
}

describe("aquariumGalleryLayout", () => {
  it("只把已发现物种纳入图鉴陈列排序", () => {
    const fishGallery = [
      createGalleryItem(FISH_DEFINITIONS[0], true, 10),
      createGalleryItem(FISH_DEFINITIONS[1], false, 0),
      createGalleryItem(FISH_DEFINITIONS[2], true, 20),
    ];

    expect(sortDiscoveredGalleryFish(fishGallery).map((fish) => fish.id)).toEqual([
      FISH_DEFINITIONS[0].id,
      FISH_DEFINITIONS[2].id,
    ]);
  });

  it("六边形徽章墙布局稳定且高品质靠近中心", () => {
    const discoveredFish = FISH_DEFINITIONS.map((fish, index) => createGalleryItem(fish, true, 10_000 - index));
    const firstLayout = computeGallerySpecimenPlacements(sortDiscoveredGalleryFish(discoveredFish));
    const secondLayout = computeGallerySpecimenPlacements(sortDiscoveredGalleryFish([...discoveredFish].reverse()));
    const legendaryPlacement = firstLayout.find((placement) => placement.rarity === "legendary");
    const commonPlacement = firstLayout.find((placement) => placement.rarity === "common");

    expect(firstLayout).toEqual(secondLayout);
    expect(legendaryPlacement).toBeDefined();
    expect(commonPlacement).toBeDefined();
    expect(Math.hypot(legendaryPlacement?.x ?? 0, legendaryPlacement?.y ?? 0)).toBeLessThan(
      Math.hypot(commonPlacement?.x ?? 0, commonPlacement?.y ?? 0),
    );
  });

  it("同品质物种按首次获取先后填充六边形槽位", () => {
    const fishGallery = [
      createGalleryItem(FISH_DEFINITIONS[0], true, 30, 90),
      createGalleryItem(FISH_DEFINITIONS[1], true, 10, 80),
      createGalleryItem(FISH_DEFINITIONS[2], true, 20, 70),
    ];
    const placements = computeGallerySpecimenPlacements(sortDiscoveredGalleryFish(fishGallery));

    expect(placements.map((placement) => placement.fishId)).toEqual([
      FISH_DEFINITIONS[1].id,
      FISH_DEFINITIONS[2].id,
      FISH_DEFINITIONS[0].id,
    ]);
  });

  it("大量已发现物种不会产生明显堆叠遮挡", () => {
    const discoveredFish = FISH_DEFINITIONS.map((fish, index) => createGalleryItem(fish, true, 10_000 - index));
    const placements = computeGallerySpecimenPlacements(sortDiscoveredGalleryFish(discoveredFish));

    expect(getMinimumPlacementDistance(placements)).toBeGreaterThan(76);
  });

  it("全收集图鉴会形成完整的最外圈六边形", () => {
    const discoveredFish = FISH_DEFINITIONS.map((fish, index) => createGalleryItem(fish, true, 10_000 - index));
    const placements = computeGallerySpecimenPlacements(sortDiscoveredGalleryFish(discoveredFish));
    const outerRing = Math.max(...placements.map((placement) => placement.ring));
    const outerRingCount = placements.filter((placement) => placement.ring === outerRing).length;

    expect(placements).toHaveLength(169);
    expect(outerRing).toBe(7);
    expect(outerRingCount).toBe(outerRing * 6);
  });

  it("扩展到 999 个物种时不同品质六边形分区也不会互相堆叠", () => {
    const discoveredFish = createManyGalleryItems({
      common: 574,
      rare: 260,
      curio: 120,
      legendary: 45,
    });
    const placements = computeGallerySpecimenPlacements(sortDiscoveredGalleryFish(discoveredFish));

    expect(placements).toHaveLength(999);
    expect(getMinimumPlacementDistance(placements)).toBeGreaterThan(76);
  });
});
