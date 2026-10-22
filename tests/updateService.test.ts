import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DownloadEvent } from "@tauri-apps/plugin-updater";
import config from "../src-tauri/tauri.conf.json";
import capability from "../src-tauri/capabilities/default.json";

const mocks = vi.hoisted(() => ({
  native: vi.fn(() => true),
  check: vi.fn(),
  relaunch: vi.fn(),
  flush: vi.fn(),
}));
vi.mock("../src/platform/tauri", () => ({ isTauriRuntime: mocks.native }));
vi.mock("@tauri-apps/plugin-updater", () => ({ check: mocks.check }));
vi.mock("@tauri-apps/plugin-process", () => ({ relaunch: mocks.relaunch }));
vi.mock("../src/store/progressStore", () => ({ useProgressStore: () => ({ flushProgress: mocks.flush }) }));

/** 创建可控制传输、安装和资源释放的原生更新替身。 */
function makeUpdate() {
  return { version: "0.2.0", close: vi.fn().mockResolvedValue(undefined), downloadAndInstall: vi.fn().mockResolvedValue(undefined) };
}

/** 每个场景使用全新更新状态，避免模块缓存掩盖状态污染。 */
beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  mocks.native.mockReturnValue(true);
  mocks.check.mockResolvedValue(null);
  mocks.flush.mockResolvedValue(undefined);
  mocks.relaunch.mockResolvedValue(undefined);
});

describe("应用更新", () => {
  /** 浏览器不能冒充原生最新版本，开发启动也不应请求发布源。 */
  it("浏览器提示不支持且不调用原生检查", async () => {
    mocks.native.mockReturnValue(false);
    const service = await import("../src/platform/updateService");
    await service.initializeAppUpdates();
    await service.checkAppUpdate();
    expect(mocks.check).not.toHaveBeenCalled();
    expect(service.appUpdateState.message).toContain("浏览器预览不支持");
  });

  /** 检查失败后允许重试，成功结果与失败提示不能混淆。 */
  it("检查失败后可重新检查并确认当前版本", async () => {
    const service = await import("../src/platform/updateService");
    mocks.check.mockRejectedValueOnce(new Error("网络不可用"));
    await service.checkAppUpdate();
    expect(service.appUpdateState.phase).toBe("error");
    await service.checkAppUpdate();
    expect(service.appUpdateState.phase).toBe("current");
    expect(mocks.check).toHaveBeenLastCalledWith({ timeout: 15_000 });
  });

  /** 静默检查失败不弹出错误，也不宣称已经是最新版。 */
  it("启动检查失败保持可手动检查状态", async () => {
    mocks.check.mockRejectedValue(new Error("离线"));
    const service = await import("../src/platform/updateService");
    await service.checkAppUpdate(true);
    expect(service.appUpdateState.phase).toBe("idle");
    expect(service.appUpdateState.message).not.toContain("最新");
  });

  /** 并发点击只能触发一次检查；重复检查需要释放旧原生资源。 */
  it("阻止重复检查并释放过期更新对象", async () => {
    const update = makeUpdate();
    let finish!: (value: typeof update) => void;
    mocks.check.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const service = await import("../src/platform/updateService");
    const checking = service.checkAppUpdate();
    await service.checkAppUpdate();
    expect(mocks.check).toHaveBeenCalledTimes(1);
    finish(update);
    await checking;
    expect(service.appUpdateState.version).toBe("0.2.0");
    await service.checkAppUpdate();
    expect(update.close).toHaveBeenCalledOnce();
  });

  /** 传输结束不能提前开放重启，必须等原生签名验证和安装成功。 */
  it("传输完成后仍等待安装，安装完成才允许保存和重启", async () => {
    const update = makeUpdate();
    let finishInstall!: () => void;
    update.downloadAndInstall.mockImplementation((onEvent: (event: DownloadEvent) => void) => {
      onEvent({ event: "Started", data: { contentLength: 100 } });
      onEvent({ event: "Progress", data: { chunkLength: 40 } });
      onEvent({ event: "Finished" });
      return new Promise<void>(resolve => { finishInstall = resolve; });
    });
    mocks.check.mockResolvedValue(update);
    const service = await import("../src/platform/updateService");
    await service.checkAppUpdate();
    const installation = service.installAppUpdate();
    await service.installAppUpdate();
    await service.checkAppUpdate();
    await service.restartForAppUpdate();
    expect(update.downloadAndInstall).toHaveBeenCalledOnce();
    expect(mocks.check).toHaveBeenCalledOnce();
    expect(mocks.relaunch).not.toHaveBeenCalled();
    expect(service.appUpdateState).toMatchObject({ phase: "downloading", downloadedBytes: 40, totalBytes: 100 });
    finishInstall();
    await installation;
    expect(service.appUpdateState.phase).toBe("ready");
    await service.restartForAppUpdate();
    expect(mocks.flush).toHaveBeenCalledOnce();
    expect(mocks.flush.mock.invocationCallOrder[0]).toBeLessThan(mocks.relaunch.mock.invocationCallOrder[0]);
  });

  /** 签名或安装失败只能重试检查，不能重启进入未验证的新包。 */
  it("安装失败不进入可重启状态", async () => {
    const update = makeUpdate();
    update.downloadAndInstall.mockRejectedValue(new Error("签名错误"));
    mocks.check.mockResolvedValue(update);
    const service = await import("../src/platform/updateService");
    await service.checkAppUpdate();
    await service.installAppUpdate();
    await service.restartForAppUpdate();
    expect(service.appUpdateState.phase).toBe("error");
    expect(mocks.relaunch).not.toHaveBeenCalled();
    await service.checkAppUpdate();
    expect(service.appUpdateState.phase).toBe("available");
  });

  /** 保存失败或重启失败都保留重试入口，并且保存失败禁止重启。 */
  it("重启前保存失败时不退出，重启失败后可重试", async () => {
    mocks.check.mockResolvedValue(makeUpdate());
    const service = await import("../src/platform/updateService");
    await service.checkAppUpdate();
    await service.installAppUpdate();
    mocks.flush.mockRejectedValueOnce(new Error("保存失败"));
    await service.restartForAppUpdate();
    expect(mocks.relaunch).not.toHaveBeenCalled();
    expect(service.appUpdateState.phase).toBe("ready");
    expect(service.appUpdateState.message).toContain("保存进度失败");
    mocks.relaunch.mockRejectedValueOnce(new Error("重启失败"));
    await service.restartForAppUpdate();
    expect(service.appUpdateState.phase).toBe("ready");
    await service.restartForAppUpdate();
    expect(mocks.relaunch).toHaveBeenCalledTimes(2);
  });

  /** 更新包必须由本项目签名，并从新仓库的 HTTPS 发布索引获取。 */
  it("配置专用发布源、公钥、更新产物和原生权限", () => {
    expect(config.plugins.updater.endpoints).toEqual(["https://github.com/zJaming/key-aquarium/releases/latest/download/latest.json"]);
    expect(atob(config.plugins.updater.pubkey)).toContain("untrusted comment:");
    expect(config.bundle.createUpdaterArtifacts).toBe(true);
    expect(capability.permissions).toEqual(expect.arrayContaining(["updater:default", "process:allow-restart"]));
  });
});
