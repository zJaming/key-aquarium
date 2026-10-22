import { describe, expect, it } from "vitest";
import { computeStageFit } from "../src/render/stageFit";

describe("场景自适应缩放", () => {
  it("小窗口中允许缩小到 1 以下，保证场景完整展示", () => {
    const fit = computeStageFit({
      bounds: { x: -120, y: -40, width: 900, height: 360 },
      hostWidth: 420,
      hostHeight: 240,
      padding: 24,
    });

    expect(fit.scale).toBeLessThan(1);
    expect(fit.scale * 900).toBeLessThanOrEqual(420 - 48);
    expect(fit.scale * 360).toBeLessThanOrEqual(240 - 48);
  });

  it("缩放后会把场景居中放进可用区域", () => {
    const fit = computeStageFit({
      bounds: { x: -100, y: -20, width: 600, height: 300 },
      hostWidth: 900,
      hostHeight: 600,
      padding: 24,
    });

    const left = -100 * fit.scale + fit.x;
    const right = left + 600 * fit.scale;
    const top = -20 * fit.scale + fit.y;
    const bottom = top + 300 * fit.scale;

    expect(left).toBeGreaterThanOrEqual(24);
    expect(top).toBeGreaterThanOrEqual(24);
    expect(right).toBeLessThanOrEqual(876);
    expect(bottom).toBeLessThanOrEqual(576);
  });
});
