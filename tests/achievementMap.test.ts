import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENT_CONNECTED_IDS,
  ACHIEVEMENT_MAP_CONNECTIONS,
  ACHIEVEMENT_MAP_HEIGHT,
  ACHIEVEMENT_MAP_NODES,
  ACHIEVEMENT_MAP_WIDTH,
  ACHIEVEMENT_NODE_SIZE,
  getAchievementChainRootId,
  getAchievementIdsMissingMapNode,
  getAchievementMapNode,
} from "../src/game/achievementMap";
import { ACHIEVEMENT_DEFINITIONS } from "../src/game/constants";

type AchievementMapConnection = (typeof ACHIEVEMENT_MAP_CONNECTIONS)[number];

describe("成就星图配置", () => {
  it("每个成就都有唯一固定节点", () => {
    const nodeIds = ACHIEVEMENT_MAP_NODES.map((node) => node.id);

    expect(getAchievementIdsMissingMapNode()).toEqual([]);
    expect(new Set(nodeIds).size).toBe(nodeIds.length);
    expect(new Set(nodeIds)).toEqual(new Set(ACHIEVEMENT_DEFINITIONS.map((definition) => definition.id)));
  });

  it("所有节点都完整落在星图可见范围内", () => {
    const halfSize = ACHIEVEMENT_NODE_SIZE / 2;

    ACHIEVEMENT_MAP_NODES.forEach((node) => {
      expect(node.x, `${node.id} x`).toBeGreaterThanOrEqual(halfSize);
      expect(node.y, `${node.id} y`).toBeGreaterThanOrEqual(halfSize);
      expect(node.x, `${node.id} x`).toBeLessThanOrEqual(ACHIEVEMENT_MAP_WIDTH - halfSize);
      expect(node.y, `${node.id} y`).toBeLessThanOrEqual(ACHIEVEMENT_MAP_HEIGHT - halfSize);
    });
  });

  it("连线两端都指向已有节点且不会重复声明同一条边", () => {
    const nodeIds = new Set(ACHIEVEMENT_MAP_NODES.map((node) => node.id));
    const edgeKeys = ACHIEVEMENT_MAP_CONNECTIONS.map((connection) => `${connection.from}->${connection.to}`);

    ACHIEVEMENT_MAP_CONNECTIONS.forEach((connection) => {
      expect(nodeIds.has(connection.from), connection.from).toBe(true);
      expect(nodeIds.has(connection.to), connection.to).toBe(true);
    });
    expect(new Set(edgeKeys).size).toBe(edgeKeys.length);
  });

  it("星图节点和主链连线不会互相穿插", () => {
    const nodePairs = createUniquePairs(ACHIEVEMENT_MAP_NODES);
    const connectionPairs = createUniquePairs(ACHIEVEMENT_MAP_CONNECTIONS);

    nodePairs.forEach(([left, right]) => {
      expect(getNodeDistance(left, right), `${left.id}-${right.id}`).toBeGreaterThanOrEqual(ACHIEVEMENT_NODE_SIZE);
    });

    connectionPairs.forEach(([left, right]) => {
      expect(doConnectionsIntersect(left, right), `${left.from}->${left.to} / ${right.from}->${right.to}`).toBe(false);
    });
  });

  it("巨影分叉保持种类和次数两条链路，不把不同指标串成一条线", () => {
    expect(ACHIEVEMENT_MAP_CONNECTIONS).toContainEqual({ from: "large_first", to: "large_shadow_pack" });
    expect(ACHIEVEMENT_MAP_CONNECTIONS).toContainEqual({ from: "large_first", to: "large_shadow_group" });
    expect(ACHIEVEMENT_MAP_CONNECTIONS).not.toContainEqual({ from: "large_shadow_pack", to: "large_shadow_group" });
  });

  it("独立成就和隐藏根链按隐藏规则可区分", () => {
    expect(ACHIEVEMENT_CONNECTED_IDS.has("bubble_maker")).toBe(false);
    expect(getAchievementChainRootId("large_shadow_pack")).toBe("large_first");
    expect(getAchievementChainRootId("storm_wave")).toBe("large_first");
    expect(getAchievementChainRootId("million_slash")).toBe("ten_thousand_keys_day");
  });
});

/** 生成数组中不重复的两两组合，便于检查节点和连线之间的几何关系。 */
function createUniquePairs<T>(items: T[]): Array<[T, T]> {
  const pairs: Array<[T, T]> = [];

  for (let leftIndex = 0; leftIndex < items.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < items.length; rightIndex += 1) {
      pairs.push([items[leftIndex], items[rightIndex]]);
    }
  }

  return pairs;
}

/** 计算两个成就节点中心点距离，用来避免圆形容器互相压住。 */
function getNodeDistance(left: { x: number; y: number }, right: { x: number; y: number }): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

/** 判断两条成就连线是否交叉，共享端点属于正常链路不算穿插。 */
function doConnectionsIntersect(
  left: AchievementMapConnection,
  right: AchievementMapConnection,
): boolean {
  if ([left.from, left.to].some((achievementId) => achievementId === right.from || achievementId === right.to)) {
    return false;
  }

  const leftFrom = getAchievementMapNode(left.from);
  const leftTo = getAchievementMapNode(left.to);
  const rightFrom = getAchievementMapNode(right.from);
  const rightTo = getAchievementMapNode(right.to);

  return getPointOrientation(leftFrom, leftTo, rightFrom) !== getPointOrientation(leftFrom, leftTo, rightTo)
    && getPointOrientation(rightFrom, rightTo, leftFrom) !== getPointOrientation(rightFrom, rightTo, leftTo);
}

/** 读取三点方向，用于判断两条线段是否相交。 */
function getPointOrientation(
  first: { x: number; y: number },
  second: { x: number; y: number },
  third: { x: number; y: number },
): number {
  const value = (second.y - first.y) * (third.x - second.x) - (second.x - first.x) * (third.y - second.y);

  if (Math.abs(value) < Number.EPSILON) {
    return 0;
  }

  return value > 0 ? 1 : 2;
}
