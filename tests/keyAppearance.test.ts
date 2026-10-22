import { describe, expect, it } from "vitest";
import {
  KEY_BASE_DEPTH,
  KEY_LABEL_ALPHA,
  KEY_LABEL_DARKEN_RATIO,
  KEY_LABEL_CROP_ALPHA,
  KEY_LABEL_FONT_SIZE,
  KEY_LABEL_ROTATION,
  KEY_LABEL_SCALE_X,
  KEY_LABEL_SCALE_Y,
  KEY_LEVEL_COLORS,
  KEY_PRESS_HIGHLIGHT_ALPHA,
  KEY_PRESS_HIGHLIGHT_COLOR,
  KEY_SIDE_STROKE_ALPHA,
  KEY_SIDE_STROKE_COLOR,
  KEY_VISIBLE_FACE_NAMES,
  getKeyColor,
  getKeyDepth,
  getKeyFaceColor,
  getKeyLabelColor,
} from "../src/render/keyAppearance";

describe("键位等级外观", () => {
  it("每个高度等级都有独立颜色", () => {
    expect(KEY_LEVEL_COLORS).toHaveLength(10);
    expect(new Set(KEY_LEVEL_COLORS).size).toBe(KEY_LEVEL_COLORS.length);
  });

  it("默认土黄色，其余等级沿青蓝紫红橙黄绿方向变化", () => {
    expect(KEY_LEVEL_COLORS).toEqual([
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
    ]);
  });

  it("读取颜色时会把越界等级限制在可用范围内", () => {
    expect(getKeyColor(-1)).toBe(KEY_LEVEL_COLORS[0]);
    expect(getKeyColor(99)).toBe(KEY_LEVEL_COLORS[KEY_LEVEL_COLORS.length - 1]);
  });

  it("默认等级使用更薄的土黄色键帽", () => {
    expect(KEY_BASE_DEPTH).toBe(8);
    expect(getKeyDepth(0)).toBe(8);
    expect(getKeyColor(0)).toBe(0x8f6a34);
  });

  it("侧面颜色保留轻微明暗差异", () => {
    const color = 0x496dd8;
    const topBrightness = getBrightness(color);
    const left = getKeyFaceColor(color, "screenLeft");
    const right = getKeyFaceColor(color, "screenRight");
    const leftBrightness = getBrightness(left);
    const rightBrightness = getBrightness(right);

    expect(KEY_VISIBLE_FACE_NAMES).toEqual(["screenLeft", "screenRight"]);
    expect(left).not.toBe(right);
    expect(rightBrightness).toBeLessThan(leftBrightness);
    expect(leftBrightness / topBrightness).toBeGreaterThan(0.86);
    expect(rightBrightness / topBrightness).toBeGreaterThan(0.74);
  });

  it("侧面使用深色描边分隔相邻键帽", () => {
    expect(KEY_SIDE_STROKE_COLOR).toBe(0x233027);
    expect(KEY_SIDE_STROKE_ALPHA).toBeGreaterThanOrEqual(0.58);
    expect(KEY_SIDE_STROKE_ALPHA).toBeLessThanOrEqual(0.72);
  });

  it("标签更小、更淡、跟随键帽颜色并略微加深", () => {
    const keyColor = 0x496dd8;
    const labelColor = getKeyLabelColor(keyColor);

    expect(KEY_LABEL_FONT_SIZE).toBe(8);
    expect(KEY_LABEL_ROTATION).toBeCloseTo(Math.atan2(16, 23));
    expect(KEY_LABEL_SCALE_X).toBe(0.92);
    expect(KEY_LABEL_SCALE_Y).toBe(0.66);
    expect(KEY_LABEL_DARKEN_RATIO).toBeGreaterThan(0.5);
    expect(KEY_LABEL_DARKEN_RATIO).toBeLessThan(0.8);
    expect(getBrightness(labelColor)).toBeLessThan(getBrightness(keyColor));
    expect(labelColor).not.toBe(getKeyLabelColor(0x8f6a34));
    expect(KEY_LABEL_ALPHA).toBe(0.32);
    expect(KEY_LABEL_CROP_ALPHA).toBe(0.18);
  });

  it("按键按下时会使用轻量白色高光反馈", () => {
    expect(KEY_PRESS_HIGHLIGHT_COLOR).toBe(0xffffff);
    expect(KEY_PRESS_HIGHLIGHT_ALPHA).toBeGreaterThan(0.2);
    expect(KEY_PRESS_HIGHLIGHT_ALPHA).toBeLessThan(0.5);
  });
});

/** 使用简单亮度估算检查侧面是否不会被压得太暗。 */
function getBrightness(color: number): number {
  const red = (color >> 16) & 255;
  const green = (color >> 8) & 255;
  const blue = color & 255;

  return red * 0.299 + green * 0.587 + blue * 0.114;
}
