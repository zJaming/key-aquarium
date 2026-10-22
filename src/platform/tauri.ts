import { t, type Locale } from "../i18n";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow, PhysicalPosition, PhysicalSize } from "@tauri-apps/api/window";
import type { WindowBounds } from "../game/types";

export type ResizeDirection = "East" | "North" | "NorthEast" | "NorthWest" | "South" | "SouthEast" | "SouthWest" | "West";

export interface KeyPressPayload {
  key_id: string;
  precise: true;
}

export interface PermissionStatusPayload {
  trusted: boolean;
  canRecordGlobalKeys: boolean;
  requiredPermission: "accessibility";
}

export interface TrayActionPayload {
  action: string;
}

export interface ExternalProgressCandidate<TProgress = unknown> {
  source: string;
  progress: TProgress;
}

export interface SaveTextFileOptions {
  defaultPath: string;
  contents: string;
}

/** 判断当前是否运行在 Tauri 环境内。 */
export function isTauriRuntime(): boolean {
  return "__TAURI_INTERNALS__" in window;
}

/** 把当前界面语种同步到原生托盘，浏览器预览无需执行原生命令。 */
export async function setAppLanguage(language: Locale): Promise<void> {
  if (isTauriRuntime()) {
    await invoke("set_app_language", { language });
  }
}

/** 监听原生侧发送的全局键盘按压事件。 */
export async function listenNativeKeyPress(handler: (keyId: string) => void): Promise<UnlistenFn> {
  if (!isTauriRuntime()) {
    return () => {};
  }

  return listen<KeyPressPayload>("keyboard-press", (event) => {
    handler(event.payload.key_id);
  });
}

/** 监听原生侧发送的键盘监听权限变化。 */
export async function listenKeyboardPermissionChange(
  handler: (status: PermissionStatusPayload) => void,
): Promise<UnlistenFn> {
  if (!isTauriRuntime()) {
    return () => {};
  }

  return listen<PermissionStatusPayload>("keyboard-permission-changed", (event) => {
    handler(event.payload);
  });
}

/** 监听托盘请求打开状态面板的事件。 */
export async function listenStatusPanelRequest(handler: () => void): Promise<UnlistenFn> {
  if (!isTauriRuntime()) {
    return () => {};
  }

  return listen<TrayActionPayload>("status-panel-requested", () => {
    handler();
  });
}

/** 监听托盘置顶切换请求。 */
export async function listenAlwaysOnTopToggle(handler: () => void): Promise<UnlistenFn> {
  if (!isTauriRuntime()) {
    return () => {};
  }

  return listen<TrayActionPayload>("tray-toggle-always-on-top", () => {
    handler();
  });
}

/** 监听当前窗口焦点变化，用于在窗口失焦时复位 hover 态。 */
export async function listenWindowFocusChange(handler: (focused: boolean) => void): Promise<UnlistenFn> {
  if (!isTauriRuntime()) {
    return () => {};
  }

  return getCurrentWindow().onFocusChanged((event) => {
    handler(event.payload);
  });
}

/** 监听窗口移动和缩放事件，用于节流保存窗口位置尺寸。 */
export async function listenWindowBoundsChange(handler: () => void): Promise<UnlistenFn> {
  if (!isTauriRuntime()) {
    return () => {};
  }

  const window = getCurrentWindow();
  const unlistenMoved = await window.onMoved(() => handler());
  const unlistenResized = await window.onResized(() => handler());

  return () => {
    unlistenMoved();
    unlistenResized();
  };
}

/** 查询键盘监听权限状态。 */
export async function queryKeyboardPermission(): Promise<PermissionStatusPayload> {
  if (!isTauriRuntime()) {
    return {
      trusted: true,
      canRecordGlobalKeys: true,
      requiredPermission: "accessibility",
    };
  }

  return invoke<PermissionStatusPayload>("keyboard_permission_status");
}

/** 打开系统辅助功能权限设置页。 */
export async function openKeyboardPermissionSettings(): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  await invoke("open_keyboard_permission_settings");
}

/** 读取这次改名期间产生的外部存档候选，避免中间包数据目录丢失。 */
export async function loadExternalProgressCandidates<TProgress = unknown>(): Promise<ExternalProgressCandidate<TProgress>[]> {
  if (!isTauriRuntime()) {
    return [];
  }

  return invoke<ExternalProgressCandidate<TProgress>[]>("load_external_progress_candidates");
}

/** 通过系统对话框选择 JSON 文件并读取文本内容。 */
export async function readJsonTextFromDialog(): Promise<string | null> {
  if (!isTauriRuntime()) {
    return readJsonTextFromBrowserFileInput();
  }

  const selectedPath = await open({
    multiple: false,
    filters: [{
      name: t("Key Aquarium 数据"),
      extensions: ["json"],
    }],
  });

  if (typeof selectedPath !== "string") {
    return null;
  }

  return readTextFile(selectedPath);
}

/** 通过系统保存对话框写出 JSON 文本，浏览器调试时降级为下载文件。 */
export async function saveJsonTextToDialog(options: SaveTextFileOptions): Promise<boolean> {
  if (!isTauriRuntime()) {
    downloadTextFile(options.defaultPath, options.contents);
    return true;
  }

  const selectedPath = await save({
    defaultPath: options.defaultPath,
    filters: [{
      name: t("Key Aquarium 数据"),
      extensions: ["json"],
    }],
  });

  if (!selectedPath) {
    return false;
  }

  await writeTextFile(selectedPath, options.contents);
  return true;
}

/** 浏览器调试环境下读取一个本地 JSON 文件。 */
function readJsonTextFromBrowserFileInput(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.style.display = "none";

    input.addEventListener("change", () => {
      const file = input.files?.[0];
      input.remove();

      if (!file) {
        resolve(null);
        return;
      }

      file.text().then(resolve, reject);
    }, { once: true });

    input.addEventListener("cancel", () => {
      input.remove();
      resolve(null);
    }, { once: true });

    document.body.appendChild(input);
    input.click();
  });
}

/** 浏览器调试环境下下载一份文本文件。 */
function downloadTextFile(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** 设置当前主窗口是否保持最前。 */
export async function setWindowAlwaysOnTop(enabled: boolean): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  await invoke("set_main_window_always_on_top", { enabled });
}

/** 读取当前窗口的外部位置和尺寸，使用物理像素保存以避免缩放比例误差。 */
export async function readCurrentWindowBounds(): Promise<WindowBounds | null> {
  if (!isTauriRuntime()) {
    return null;
  }

  const window = getCurrentWindow();
  const [position, size] = await Promise.all([window.outerPosition(), window.outerSize()]);

  return {
    x: position.x,
    y: position.y,
    width: size.width,
    height: size.height,
  };
}

/** 按已保存的外部位置和尺寸恢复主窗口。 */
export async function applyWindowBounds(bounds: WindowBounds | null): Promise<void> {
  if (!isTauriRuntime() || !bounds) {
    return;
  }

  const window = getCurrentWindow();

  await window.setSize(new PhysicalSize(bounds.width, bounds.height));
  await window.setPosition(new PhysicalPosition(bounds.x, bounds.y));
}

/** 请求原生侧显示主窗口。 */
export async function showMainWindow(): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  await invoke("show_main_window");
}

/** 请求原生侧隐藏主窗口。 */
export async function hideMainWindow(): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  await invoke("hide_main_window");
}

/** 启动系统窗口拖拽。 */
export async function startWindowDrag(): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  await WebviewWindow.getCurrent().startDragging();
}

/** 启动系统窗口边缘缩放拖拽。 */
export async function startWindowResizeDrag(direction: ResizeDirection): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  await WebviewWindow.getCurrent().startResizeDragging(direction);
}
