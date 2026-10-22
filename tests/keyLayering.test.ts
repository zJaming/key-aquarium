import { describe, expect, it } from "vitest";
import { KEYBOARD_LAYOUT } from "../src/game/keyboardLayout";
import { getKeyLayerIndex } from "../src/render/keyLayering";

describe("键帽层级", () => {
  it("Del 所在数字行不会盖住下一行按键", () => {
    const delKey = getLayoutKey("Backspace");
    const tabKey = getLayoutKey("Tab");
    const slashKey = getLayoutKey("Backslash");

    expect(getKeyLayerIndex(delKey)).toBeLessThan(getKeyLayerIndex(tabKey));
    expect(getKeyLayerIndex(delKey)).toBeLessThan(getKeyLayerIndex(slashKey));
  });

  it("Space 所在底行会盖住 VBNM 所在行", () => {
    const spaceKey = getLayoutKey("Space");

    for (const keyId of ["KeyV", "KeyB", "KeyN", "KeyM"]) {
      expect(getKeyLayerIndex(spaceKey)).toBeGreaterThan(getKeyLayerIndex(getLayoutKey(keyId)));
    }
  });
});

/** 从键盘布局中读取测试所需键位。 */
function getLayoutKey(keyId: string) {
  const key = KEYBOARD_LAYOUT.find((item) => item.id === keyId);

  if (!key) {
    throw new Error(`缺少测试键位：${keyId}`);
  }

  return key;
}

