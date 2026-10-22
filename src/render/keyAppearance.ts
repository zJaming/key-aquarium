export const KEY_BASE_DEPTH = 8;
export const KEY_DEPTH_STEP = 2;
export const KEY_LABEL_FONT_SIZE = 8;
export const KEY_LABEL_ROTATION = Math.atan2(16, 23);
export const KEY_LABEL_SCALE_X = 0.92;
export const KEY_LABEL_SCALE_Y = 0.66;
export const KEY_LABEL_DARKEN_RATIO = 0.58;
export const KEY_LABEL_ALPHA = 0.32;
export const KEY_LABEL_CROP_ALPHA = 0.18;
export const KEY_PRESS_HIGHLIGHT_COLOR = 0xffffff;
export const KEY_PRESS_HIGHLIGHT_ALPHA = 0.34;
export const KEY_SIDE_STROKE_COLOR = 0x233027;
export const KEY_SIDE_STROKE_ALPHA = 0.64;

export const KEY_LEVEL_COLORS = [
  0x8f6a34,
  0x20b3cc,
  0x2c8ee6,
  0x7a52d9,
  0xd85445,
  0xe8932e,
  0xd6c33a,
  0x9fcf3b,
  0x57bf5b,
  0x25b77b,
];

export const KEY_VISIBLE_FACE_NAMES = ["screenLeft", "screenRight"] as const;

export type KeyFaceName = (typeof KEY_VISIBLE_FACE_NAMES)[number];

const KEY_FACE_SHADE_RATIOS: Record<KeyFaceName, number> = {
  screenLeft: 0.9,
  screenRight: 0.78,
};

/** 根据键位等级读取对应的键帽主色，并把越界等级限制在首尾颜色内。 */
export function getKeyColor(level: number): number {
  const index = getClampedLevelIndex(level);

  return KEY_LEVEL_COLORS[index] ?? KEY_LEVEL_COLORS[0];
}

/** 根据键位等级计算等距键帽高度。 */
export function getKeyDepth(level: number): number {
  return KEY_BASE_DEPTH + getClampedLevelIndex(level) * KEY_DEPTH_STEP;
}

/** 根据键帽主色生成指定侧面的明暗色。 */
export function getKeyFaceColor(color: number, faceName: KeyFaceName): number {
  return shadeColor(color, KEY_FACE_SHADE_RATIOS[faceName]);
}

/** 根据键帽主色生成略微加深的标签文字颜色。 */
export function getKeyLabelColor(color: number): number {
  return shadeColor(color, KEY_LABEL_DARKEN_RATIO);
}

/** 把等级限制在当前颜色和高度支持的有效范围内。 */
function getClampedLevelIndex(level: number): number {
  return Math.min(Math.max(Math.trunc(level), 0), KEY_LEVEL_COLORS.length - 1);
}

/** 对十六进制颜色做简单明暗缩放。 */
function shadeColor(color: number, ratio: number): number {
  const red = Math.round(((color >> 16) & 255) * ratio);
  const green = Math.round(((color >> 8) & 255) * ratio);
  const blue = Math.round((color & 255) * ratio);

  return (red << 16) + (green << 8) + blue;
}
