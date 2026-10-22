import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { applyWindowBounds } from "../src/platform/tauri";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/window", async (original) => ({
  ...await original<typeof import("@tauri-apps/api/window")>(),
  getCurrentWindow: vi.fn(),
}));

describe("窗口位置恢复", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("桌面恢复旧坐标后必须按当前屏幕布局修正可见区域", async () => {
    vi.stubGlobal("__TAURI_INTERNALS__", {});
    const calls: string[] = [];
    vi.mocked(getCurrentWindow).mockReturnValue({
      setSize: vi.fn(async () => { calls.push("size"); }),
      setPosition: vi.fn(async () => { calls.push("position"); }),
    } as unknown as ReturnType<typeof getCurrentWindow>);
    vi.mocked(invoke).mockImplementation(async (command) => { calls.push(command); });

    await applyWindowBounds({ x: -658, y: 1214, width: 658, height: 466 });

    expect(calls).toEqual(["size", "position", "ensure_main_window_visible"]);
  });

  it("浏览器预览与没有历史位置时不调用原生命令", async () => {
    await applyWindowBounds({ x: -658, y: 1214, width: 658, height: 466 });
    vi.stubGlobal("__TAURI_INTERNALS__", {});
    await applyWindowBounds(null);
    expect(invoke).not.toHaveBeenCalled();
    expect(getCurrentWindow).not.toHaveBeenCalled();
  });
});
