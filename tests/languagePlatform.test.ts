import { invoke } from "@tauri-apps/api/core";
import { setAppLanguage } from "../src/platform/tauri";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

describe("原生托盘语种同步", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("浏览器预览不调用原生托盘命令", async () => {
    await setAppLanguage("en");
    expect(invoke).not.toHaveBeenCalled();
  });

  it.each(["en", "zh-CN"] as const)("桌面环境把 %s 同步到托盘", async (language) => {
    vi.stubGlobal("__TAURI_INTERNALS__", {});
    await setAppLanguage(language);
    expect(invoke).toHaveBeenCalledWith("set_app_language", { language });
  });
});
