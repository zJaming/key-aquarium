import { ACHIEVEMENT_DEFINITIONS } from "./constants";
import type { AchievementId } from "./types";

export type AchievementMapGroup = "core" | "tap" | "keyboard" | "rarity" | "streak" | "daily" | "species" | "special" | "interaction";

export interface AchievementMapNode {
  id: AchievementId;
  x: number;
  y: number;
  group: AchievementMapGroup;
}

export interface AchievementMapConnection {
  from: AchievementId;
  to: AchievementId;
}

export const ACHIEVEMENT_MAP_WIDTH = 1525;
export const ACHIEVEMENT_MAP_HEIGHT = 920;
export const ACHIEVEMENT_NODE_SIZE = 72;

export const ACHIEVEMENT_MAP_NODES: AchievementMapNode[] = [
  { id: "curio_collector", x: 120, y: 105, group: "rarity" },
  { id: "legendary_hall", x: 255, y: 105, group: "rarity" },
  { id: "benthic_team", x: 390, y: 105, group: "special" },
  { id: "deep_lights", x: 525, y: 105, group: "special" },
  { id: "soft_party", x: 660, y: 105, group: "special" },
  { id: "deep_curse", x: 795, y: 105, group: "special" },
  { id: "undersea_zoo", x: 930, y: 105, group: "special" },
  { id: "bubble_maker", x: 1065, y: 105, group: "interaction" },
  { id: "lights_out_observer", x: 1200, y: 105, group: "interaction" },
  { id: "wave_maker", x: 1335, y: 105, group: "interaction" },

  { id: "first_guest", x: 120, y: 245, group: "core" },
  { id: "fishing_beginner", x: 120, y: 360, group: "core" },
  { id: "fishing_tyrant", x: 120, y: 475, group: "core" },
  { id: "fishing_hero", x: 120, y: 590, group: "core" },
  { id: "fishing_saint", x: 120, y: 705, group: "core" },
  { id: "fishing_god", x: 120, y: 820, group: "core" },

  { id: "tap_starter", x: 255, y: 245, group: "tap" },
  { id: "tap_routine_breaker", x: 255, y: 360, group: "tap" },
  { id: "crazy_clicker", x: 255, y: 475, group: "tap" },
  { id: "tap_champion", x: 255, y: 590, group: "tap" },

  { id: "ten_thousand_keys_day", x: 390, y: 245, group: "keyboard" },
  { id: "key_flow", x: 390, y: 360, group: "keyboard" },
  { id: "million_slash", x: 390, y: 475, group: "keyboard" },

  { id: "curio_first", x: 525, y: 245, group: "rarity" },
  { id: "golden_glimmer", x: 525, y: 360, group: "rarity" },
  { id: "golden_haul", x: 525, y: 475, group: "rarity" },
  { id: "deep_sea_explorer", x: 660, y: 245, group: "rarity" },
  { id: "deep_echo", x: 660, y: 360, group: "rarity" },

  { id: "daily_checkin_3", x: 795, y: 245, group: "streak" },
  { id: "daily_checkin_7", x: 795, y: 360, group: "streak" },
  { id: "daily_checkin_30", x: 795, y: 475, group: "streak" },

  { id: "daily_fish_9", x: 930, y: 245, group: "daily" },
  { id: "daily_fish_30", x: 930, y: 360, group: "daily" },

  { id: "large_first", x: 1065, y: 245, group: "special" },
  { id: "large_shadow_pack", x: 1200, y: 245, group: "special" },
  { id: "large_shadow_group", x: 1065, y: 360, group: "special" },
  { id: "large_shadow_party", x: 1200, y: 360, group: "special" },
  { id: "storm_wave", x: 1200, y: 475, group: "special" },

  { id: "species_scale_9", x: 1335, y: 245, group: "species" },
  { id: "species_scale_18", x: 1335, y: 337, group: "species" },
  { id: "species_scale_36", x: 1335, y: 429, group: "species" },
  { id: "species_scale_72", x: 1335, y: 521, group: "species" },
  { id: "species_scale_108", x: 1335, y: 613, group: "species" },
  { id: "species_scale_144", x: 1335, y: 705, group: "species" },
  { id: "species_scale_169", x: 1335, y: 797, group: "species" },
];

export const ACHIEVEMENT_MAP_CONNECTIONS: AchievementMapConnection[] = [
  { from: "first_guest", to: "fishing_beginner" },
  { from: "fishing_beginner", to: "fishing_tyrant" },
  { from: "fishing_tyrant", to: "fishing_hero" },
  { from: "fishing_hero", to: "fishing_saint" },
  { from: "fishing_saint", to: "fishing_god" },
  { from: "tap_starter", to: "tap_routine_breaker" },
  { from: "tap_routine_breaker", to: "crazy_clicker" },
  { from: "crazy_clicker", to: "tap_champion" },
  { from: "ten_thousand_keys_day", to: "key_flow" },
  { from: "key_flow", to: "million_slash" },
  { from: "curio_first", to: "golden_glimmer" },
  { from: "golden_glimmer", to: "golden_haul" },
  { from: "deep_sea_explorer", to: "deep_echo" },
  { from: "daily_checkin_3", to: "daily_checkin_7" },
  { from: "daily_checkin_7", to: "daily_checkin_30" },
  { from: "daily_fish_9", to: "daily_fish_30" },
  { from: "large_first", to: "large_shadow_pack" },
  { from: "large_first", to: "large_shadow_group" },
  { from: "large_shadow_group", to: "large_shadow_party" },
  { from: "large_shadow_party", to: "storm_wave" },
  { from: "species_scale_9", to: "species_scale_18" },
  { from: "species_scale_18", to: "species_scale_36" },
  { from: "species_scale_36", to: "species_scale_72" },
  { from: "species_scale_72", to: "species_scale_108" },
  { from: "species_scale_108", to: "species_scale_144" },
  { from: "species_scale_144", to: "species_scale_169" },
];

export const ACHIEVEMENT_MAP_NODE_BY_ID = new Map(ACHIEVEMENT_MAP_NODES.map((node) => [node.id, node]));
export const ACHIEVEMENT_CHAIN_PARENT_BY_ID = new Map(ACHIEVEMENT_MAP_CONNECTIONS.map((connection) => [connection.to, connection.from]));
export const ACHIEVEMENT_CONNECTED_IDS = new Set(ACHIEVEMENT_MAP_CONNECTIONS.flatMap((connection) => [connection.from, connection.to]));

/** 根据成就 ID 读取固定星图节点，连线配置错误时尽早暴露。 */
export function getAchievementMapNode(achievementId: AchievementId): AchievementMapNode {
  const node = ACHIEVEMENT_MAP_NODE_BY_ID.get(achievementId);

  if (!node) {
    throw new Error(`缺少成就星图节点：${achievementId}`);
  }

  return node;
}

/** 沿成就链向前查找根节点，用于继承整条链的隐藏状态。 */
export function getAchievementChainRootId(achievementId: AchievementId): AchievementId {
  let currentId = achievementId;
  const visitedIds = new Set<AchievementId>();

  while (ACHIEVEMENT_CHAIN_PARENT_BY_ID.has(currentId) && !visitedIds.has(currentId)) {
    visitedIds.add(currentId);
    currentId = ACHIEVEMENT_CHAIN_PARENT_BY_ID.get(currentId) ?? currentId;
  }

  return currentId;
}

/** 判断全部成就是否都有星图节点，供测试和运行前配置审查使用。 */
export function getAchievementIdsMissingMapNode(): AchievementId[] {
  return ACHIEVEMENT_DEFINITIONS
    .map((definition) => definition.id)
    .filter((achievementId) => !ACHIEVEMENT_MAP_NODE_BY_ID.has(achievementId));
}
