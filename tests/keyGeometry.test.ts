import { describe, expect, it } from "vitest";
import { getIsoKeyGeometry, getVisibleIsoKeySidePoints } from "../src/render/keyGeometry";

describe("等距宽键几何", () => {
  it("长键的标签中心会按实际键宽居中", () => {
    const geometry = getIsoKeyGeometry({ col: 3.9, row: 5.4, width: 5.4, depth: 12 });

    expect(geometry.center.x).toBeCloseTo(50.6, 1);
    expect(geometry.center.y).toBeCloseTo(14.4, 1);
  });

  it("长键顶面由键盘网格矩形生成，而不是把单个菱形横向拉伸", () => {
    const geometry = getIsoKeyGeometry({ col: 0, row: 4.4, width: 2.2, depth: 12 });
    const xs = geometry.topPoints.filter((_, index) => index % 2 === 0);

    expect(Math.min(...xs)).toBeCloseTo(-23, 1);
    expect(Math.max(...xs)).toBeCloseTo(50.6, 1);
  });

  it("屏幕可见的左右侧面分别对应前侧面和右侧面", () => {
    const geometry = getIsoKeyGeometry({ col: 0, row: 0, width: 1, depth: 8 });
    const visibleSides = getVisibleIsoKeySidePoints(geometry);

    expect(visibleSides.screenLeft).toBe(geometry.frontPoints);
    expect(visibleSides.screenRight).toBe(geometry.rightPoints);
    expect(visibleSides.screenLeft).not.toBe(geometry.leftPoints);
  });
});
