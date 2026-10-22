import { describe, expect, it } from "vitest";
import { KEYBOARD_LAYOUT, getKeyDisplayLabel } from "../src/game/keyboardLayout";

describe("键盘布局", () => {
  it("Esc 会占用数字 1 左侧的位置，反引号键不再显示", () => {
    const escapeKey = KEYBOARD_LAYOUT.find((key) => key.id === "Escape");

    expect(escapeKey).toMatchObject({ row: 0, col: 0 });
    expect(KEYBOARD_LAYOUT.some((key) => key.id === "Backquote")).toBe(false);
  });

  it("F 功能键不再作为农场键帽显示", () => {
    expect(KEYBOARD_LAYOUT.some((key) => /^F\d+$/.test(key.id))).toBe(false);
  });

  it("方向上键右边缘和 Enter 右边缘对齐", () => {
    const enterKey = KEYBOARD_LAYOUT.find((key) => key.id === "Enter");
    const arrowUpKey = KEYBOARD_LAYOUT.find((key) => key.id === "ArrowUp");

    expect(enterKey).toBeDefined();
    expect(arrowUpKey).toBeDefined();
    expect((arrowUpKey?.col ?? 0) + (arrowUpKey?.width ?? 0)).toBeCloseTo((enterKey?.col ?? 0) + (enterKey?.width ?? 0));
  });

  it("方向键保持右上抬起的原始结构并对齐右边缘", () => {
    const enterKey = KEYBOARD_LAYOUT.find((key) => key.id === "Enter");
    const arrowUpKey = KEYBOARD_LAYOUT.find((key) => key.id === "ArrowUp");
    const arrowLeftKey = KEYBOARD_LAYOUT.find((key) => key.id === "ArrowLeft");
    const arrowDownKey = KEYBOARD_LAYOUT.find((key) => key.id === "ArrowDown");
    const arrowRightKey = KEYBOARD_LAYOUT.find((key) => key.id === "ArrowRight");

    expect(enterKey).toBeDefined();
    expect(arrowUpKey).toBeDefined();
    expect(arrowLeftKey).toBeDefined();
    expect(arrowDownKey).toBeDefined();
    expect(arrowRightKey).toBeDefined();
    expect(arrowDownKey?.row).toBe(arrowLeftKey?.row);
    expect(arrowRightKey?.row).toBe(arrowDownKey?.row);
    expect(arrowDownKey?.col).toBeCloseTo((arrowLeftKey?.col ?? 0) + 1);
    expect(arrowRightKey?.col).toBeCloseTo((arrowDownKey?.col ?? 0) + 1);
    expect(arrowUpKey?.col).toBeCloseTo(arrowRightKey?.col ?? 0);
    expect(arrowUpKey?.col).not.toBeCloseTo(arrowDownKey?.col ?? 0);
    expect((arrowRightKey?.col ?? 0) + (arrowRightKey?.width ?? 0)).toBeCloseTo((enterKey?.col ?? 0) + (enterKey?.width ?? 0));
  });

  it("所有键盘行的右边缘保持一致", () => {
    const rowRightEdges = [0, 1, 2, 3, 4].map((row) => getRowRightEdge(row));

    for (const rightEdge of rowRightEdges) {
      expect(rightEdge).toBeCloseTo(rowRightEdges[0] ?? 0);
    }
  });

  it("排行榜键位显示名不使用 Key 前缀", () => {
    expect(getKeyDisplayLabel("KeyA")).toBe("A");
    expect(getKeyDisplayLabel("KeyZ")).toBe("Z");
    expect(getKeyDisplayLabel("Digit1")).toBe("1");
    expect(getKeyDisplayLabel("Space")).toBe("space");
    expect(getKeyDisplayLabel("KeyUnknown")).toBe("Unknown");
  });
});

/** 计算指定行最右侧键帽的网格右边缘。 */
function getRowRightEdge(row: number): number {
  return Math.max(...KEYBOARD_LAYOUT.filter((key) => key.row === row).map((key) => key.col + key.width));
}
