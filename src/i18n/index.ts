import { readonly, ref } from "vue";
import { englishMessages } from "./messages";

export type Locale = "zh-CN" | "en";
const LANGUAGE_STORAGE_KEY = "key-aquarium.language";
const locale = ref<Locale>(readInitialLocale());

/** 识别支持的手动语种，避免损坏的本地偏好覆盖系统设置。 */
export function isLocale(value: unknown): value is Locale {
  return value === "zh-CN" || value === "en";
}

/** 根据系统首选语种匹配界面语言，未知或无法读取时统一使用英文。 */
export function readSystemLocale(): Locale {
  try {
    const language = (navigator.languages?.[0] || navigator.language || "").toLowerCase();
    return /^zh(?:-|$)/.test(language) ? "zh-CN" : "en";
  } catch {
    return "en";
  }
}

/** 启动时优先恢复用户手动偏好，未保存偏好时才读取系统语种。 */
function readInitialLocale(): Locale {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isLocale(saved)) {
      return saved;
    }
  } catch {
    // 存储不可用时仍允许按系统语种启动和在当前会话切换。
  }
  return readSystemLocale();
}

/** 切换界面语种并立即保存手动偏好，独立于养成存档以免导入或清空覆盖。 */
export function setLocale(value: Locale): void {
  locale.value = value;
  document.documentElement.lang = value;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, value);
  } catch {
    // 无法写入时保留当前会话的手动选择。
  }
}

/** 翻译显示文案和动态参数，不改变游戏状态中的物种及成就定义。 */
export function t(message: string, params: Record<string, string | number> = {}): string {
  const translated = locale.value === "en" ? englishMessages[message] ?? message : message;
  return translated.replace(/\{(\w+)\}/g, (token, key: string) => String(params[key] ?? token));
}

/** 共享响应式语种和翻译入口，使 Vue 面板与 Pixi 文案同步切换。 */
export function useI18n() {
  return { locale: readonly(locale), t, setLocale };
}
