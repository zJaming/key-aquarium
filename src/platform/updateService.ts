import { reactive, readonly } from "vue";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { isTauriRuntime } from "./tauri";
import { useProgressStore } from "../store/progressStore";

type UpdatePhase = "idle" | "checking" | "available" | "current" | "downloading" | "ready" | "restarting" | "error";

const state = reactive({
  phase: "idle" as UpdatePhase,
  version: "",
  message: "",
  downloadedBytes: 0,
  totalBytes: null as number | null,
});
let pendingUpdate: Update | null = null;

export const appUpdateState = readonly(state);

/** 阻止检查、安装和重启互相覆盖，已安装的更新必须先重启。 */
function isUpdateBusy(): boolean {
  return ["checking", "downloading", "ready", "restarting"].includes(state.phase);
}

/** 检查新仓库的更新源；启动检查失败时保持安静，手动检查显示结果。 */
export async function checkAppUpdate(silent = false): Promise<void> {
  if (isUpdateBusy()) return;
  if (!isTauriRuntime()) {
    if (!silent) state.message = "浏览器预览不支持应用更新，请在 macOS 应用中检查";
    return;
  }

  state.phase = "checking";
  state.message = "正在检查更新…";
  state.version = "";
  state.downloadedBytes = 0;
  state.totalBytes = null;
  try {
    // 先移除旧引用，释放资源失败后仍允许重新检查。
    const previous = pendingUpdate;
    pendingUpdate = null;
    await previous?.close();
    pendingUpdate = await check({ timeout: 15_000 });
    if (pendingUpdate) {
      state.version = pendingUpdate.version;
      state.phase = "available";
      state.message = `发现新版本 v${pendingUpdate.version}`;
    } else {
      state.phase = "current";
      state.message = "当前已是最新版本";
    }
  } catch {
    state.phase = silent ? "idle" : "error";
    state.message = silent ? "" : "检查失败，请检查网络后重试";
  }
}

/** 下载并校验签名后安装，等待原生安装完成才允许用户重启。 */
export async function installAppUpdate(): Promise<void> {
  if (state.phase !== "available" || !pendingUpdate) return;
  state.phase = "downloading";
  state.message = "正在下载更新…";
  state.downloadedBytes = 0;
  state.totalBytes = null;
  try {
    await pendingUpdate.downloadAndInstall((event) => {
      if (event.event === "Started") {
        state.totalBytes = event.data.contentLength ?? null;
      } else if (event.event === "Progress") {
        state.downloadedBytes += event.data.chunkLength;
      } else {
        // Finished 只表示传输结束，签名校验或安装仍可能失败。
        state.message = "下载完成，正在校验并安装…";
      }
    }, { timeout: 120_000 });
    state.phase = "ready";
    state.message = "更新已安装，重启应用后生效";
  } catch {
    state.phase = "error";
    state.message = "更新未完成，请重新检查后重试；也可从 GitHub Releases 下载安装包";
  }
}

/** 仅在安装成功后响应重启，重启失败保留已安装状态以便重试。 */
export async function restartForAppUpdate(): Promise<void> {
  if (state.phase !== "ready" || !isTauriRuntime()) return;
  state.phase = "restarting";
  state.message = "正在重启…";
  try {
    await useProgressStore().flushProgress();
  } catch {
    state.phase = "ready";
    state.message = "保存进度失败，暂未重启，请重试";
    return;
  }
  try {
    await relaunch();
  } catch {
    state.phase = "ready";
    state.message = "自动重启失败，请重试或退出后重新打开应用";
  }
}

/** 正式桌面包启动时静默检查，开发及浏览器预览不发出更新请求。 */
export async function initializeAppUpdates(): Promise<void> {
  if (isTauriRuntime() && !import.meta.env.DEV) await checkAppUpdate(true);
}
