import { describe, expect, it } from "vitest";
import { queryKeyboardPermission } from "../src/platform/tauri";
import rustSourceText from "../src-tauri/src/lib.rs?raw";
import tauriPlatformSourceText from "../src/platform/tauri.ts?raw";
import keyboardPermissionNoticeSourceText from "../src/components/KeyboardPermissionNotice.vue?raw";
import defaultCapability from "../src-tauri/capabilities/default.json";

describe("Tauri 平台适配", () => {
  /** 防止恢复接口已实现却缺少原生授权，导致重启后无法恢复窗口。 */
  it("主窗口允许恢复存档中的尺寸和位置", () => {
    expect(defaultCapability.windows).toContain("main");
    expect(defaultCapability.permissions).toEqual(expect.arrayContaining([
      "core:window:allow-set-size",
      "core:window:allow-set-position",
    ]));
  });

  it("浏览器调试环境下键盘权限类型与 macOS 打包提示保持一致", async () => {
    await expect(queryKeyboardPermission()).resolves.toEqual({
      trusted: true,
      canRecordGlobalKeys: true,
      requiredPermission: "accessibility",
    });
  });

  it("macOS 键盘监听权限入口使用辅助功能授权", () => {
    const sourceText = [
      rustSourceText,
      tauriPlatformSourceText,
      keyboardPermissionNoticeSourceText,
    ].join("\n");

    expect(sourceText).toContain("Privacy_Accessibility");
    expect(sourceText).toContain("辅助功能");
    expect(sourceText).not.toMatch(/Privacy_ListenEvent|inputMonitoring|输入监控/);
  });

  it("权限提示使用系统辅助功能授权状态，而不是启动瞬间的键盘事件可用性", () => {
    expect(rustSourceText).toContain("AXIsProcessTrusted");
    expect(rustSourceText).toContain("trusted,");
    expect(tauriPlatformSourceText).toContain("canRecordGlobalKeys");
  });
});
