import type { KeyboardKeyDefinition } from "../game/keyboardLayout";

const ROW_LAYER_WEIGHT = 10_000;
const COLUMN_TIE_BREAKER_WEIGHT = 10;

/** 计算键帽绘制层级，优先保证下方行稳定盖住上方行。 */
export function getKeyLayerIndex(definition: KeyboardKeyDefinition): number {
  return Math.round(definition.row * ROW_LAYER_WEIGHT + definition.col * COLUMN_TIE_BREAKER_WEIGHT);
}

