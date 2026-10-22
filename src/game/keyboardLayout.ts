import type { KeyId } from "./types";

export interface KeyboardKeyDefinition {
  id: KeyId;
  label: string;
  row: number;
  col: number;
  width: number;
}

export const KEYBOARD_LAYOUT: KeyboardKeyDefinition[] = [
  { id: "Escape", label: "esc", row: 0, col: 0, width: 1 },
  { id: "Digit1", label: "1", row: 0, col: 1, width: 1 },
  { id: "Digit2", label: "2", row: 0, col: 2, width: 1 },
  { id: "Digit3", label: "3", row: 0, col: 3, width: 1 },
  { id: "Digit4", label: "4", row: 0, col: 4, width: 1 },
  { id: "Digit5", label: "5", row: 0, col: 5, width: 1 },
  { id: "Digit6", label: "6", row: 0, col: 6, width: 1 },
  { id: "Digit7", label: "7", row: 0, col: 7, width: 1 },
  { id: "Digit8", label: "8", row: 0, col: 8, width: 1 },
  { id: "Digit9", label: "9", row: 0, col: 9, width: 1 },
  { id: "Digit0", label: "0", row: 0, col: 10, width: 1 },
  { id: "Minus", label: "-", row: 0, col: 11, width: 1 },
  { id: "Equal", label: "=", row: 0, col: 12, width: 1 },
  { id: "Backspace", label: "del", row: 0, col: 13, width: 1.9 },
  { id: "Tab", label: "tab", row: 1, col: 0, width: 1.4 },
  { id: "KeyQ", label: "Q", row: 1, col: 1.4, width: 1 },
  { id: "KeyW", label: "W", row: 1, col: 2.4, width: 1 },
  { id: "KeyE", label: "E", row: 1, col: 3.4, width: 1 },
  { id: "KeyR", label: "R", row: 1, col: 4.4, width: 1 },
  { id: "KeyT", label: "T", row: 1, col: 5.4, width: 1 },
  { id: "KeyY", label: "Y", row: 1, col: 6.4, width: 1 },
  { id: "KeyU", label: "U", row: 1, col: 7.4, width: 1 },
  { id: "KeyI", label: "I", row: 1, col: 8.4, width: 1 },
  { id: "KeyO", label: "O", row: 1, col: 9.4, width: 1 },
  { id: "KeyP", label: "P", row: 1, col: 10.4, width: 1 },
  { id: "BracketLeft", label: "[", row: 1, col: 11.4, width: 1 },
  { id: "BracketRight", label: "]", row: 1, col: 12.4, width: 1 },
  { id: "Backslash", label: "\\", row: 1, col: 13.4, width: 1.5 },
  { id: "CapsLock", label: "caps", row: 2, col: 0, width: 1.7 },
  { id: "KeyA", label: "A", row: 2, col: 1.7, width: 1 },
  { id: "KeyS", label: "S", row: 2, col: 2.7, width: 1 },
  { id: "KeyD", label: "D", row: 2, col: 3.7, width: 1 },
  { id: "KeyF", label: "F", row: 2, col: 4.7, width: 1 },
  { id: "KeyG", label: "G", row: 2, col: 5.7, width: 1 },
  { id: "KeyH", label: "H", row: 2, col: 6.7, width: 1 },
  { id: "KeyJ", label: "J", row: 2, col: 7.7, width: 1 },
  { id: "KeyK", label: "K", row: 2, col: 8.7, width: 1 },
  { id: "KeyL", label: "L", row: 2, col: 9.7, width: 1 },
  { id: "Semicolon", label: ";", row: 2, col: 10.7, width: 1 },
  { id: "Quote", label: "'", row: 2, col: 11.7, width: 1 },
  { id: "Enter", label: "enter", row: 2, col: 12.7, width: 2.2 },
  { id: "ShiftLeft", label: "shift", row: 3, col: 0, width: 2.2 },
  { id: "KeyZ", label: "Z", row: 3, col: 2.2, width: 1 },
  { id: "KeyX", label: "X", row: 3, col: 3.2, width: 1 },
  { id: "KeyC", label: "C", row: 3, col: 4.2, width: 1 },
  { id: "KeyV", label: "V", row: 3, col: 5.2, width: 1 },
  { id: "KeyB", label: "B", row: 3, col: 6.2, width: 1 },
  { id: "KeyN", label: "N", row: 3, col: 7.2, width: 1 },
  { id: "KeyM", label: "M", row: 3, col: 8.2, width: 1 },
  { id: "Comma", label: ",", row: 3, col: 9.2, width: 1 },
  { id: "Period", label: ".", row: 3, col: 10.2, width: 1 },
  { id: "Slash", label: "/", row: 3, col: 11.2, width: 1 },
  { id: "ShiftRight", label: "shift", row: 3, col: 12.2, width: 1.7 },
  { id: "ArrowUp", label: "↑", row: 3, col: 13.9, width: 1 },
  { id: "ControlLeft", label: "ctrl", row: 4, col: 0, width: 1.3 },
  { id: "MetaLeft", label: "cmd", row: 4, col: 1.3, width: 1.3 },
  { id: "AltLeft", label: "opt", row: 4, col: 2.6, width: 1.3 },
  { id: "Space", label: "space", row: 4, col: 3.9, width: 5.4 },
  { id: "AltRight", label: "opt", row: 4, col: 9.3, width: 1.3 },
  { id: "MetaRight", label: "cmd", row: 4, col: 10.6, width: 1.3 },
  { id: "ArrowLeft", label: "←", row: 4, col: 11.9, width: 1 },
  { id: "ArrowDown", label: "↓", row: 4, col: 12.9, width: 1 },
  { id: "ArrowRight", label: "→", row: 4, col: 13.9, width: 1 },
];

/** 根据物理键位 ID 读取键盘布局定义。 */
export function getKeyDefinition(keyId: KeyId): KeyboardKeyDefinition | undefined {
  return KEYBOARD_LAYOUT.find((key) => key.id === keyId);
}

/** 读取适合界面展示的键位名称，避免排行榜暴露物理键位前缀。 */
export function getKeyDisplayLabel(keyId: KeyId): string {
  if (keyId === "KeyboardActivity") {
    return "按键";
  }

  const definition = getKeyDefinition(keyId);

  if (definition) {
    return definition.label;
  }

  return keyId.replace(/^Key/, "");
}
