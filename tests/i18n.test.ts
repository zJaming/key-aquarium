import { ACHIEVEMENT_DEFINITIONS, FISH_DEFINITIONS } from "../src/game/constants";
import { englishMessages } from "../src/i18n/messages";

/** 重新加载语种模块，模拟应用刷新后从系统和本地偏好恢复。 */
async function reloadLanguage() {
  vi.resetModules();
  return import("../src/i18n");
}

describe("界面语种优先级与持久化", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["zh-CN"]);
    vi.spyOn(navigator, "language", "get").mockReturnValue("zh-CN");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it.each(["zh-CN", "zh-TW", "zh-Hant-HK", "ZH-hans"])("无手动偏好时将系统 %s 匹配为简体中文", async (language) => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue([language]);
    const { useI18n } = await reloadLanguage();
    expect(useI18n().locale.value).toBe("zh-CN");
    expect(localStorage.getItem("key-aquarium.language")).toBeNull();
  });

  it.each(["en-US", "en-GB", "ja-JP", "fr-FR", ""])("系统 %s 不匹配中文时使用英文", async (language) => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue([language]);
    vi.spyOn(navigator, "language", "get").mockReturnValue(language);
    const { useI18n } = await reloadLanguage();
    expect(useI18n().locale.value).toBe("en");
  });

  it("系统语言列表为空时读取单个系统语种", async () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue([]);
    const { useI18n } = await reloadLanguage();
    expect(useI18n().locale.value).toBe("zh-CN");
  });

  it("系统语种读取失败时回退英文", async () => {
    vi.spyOn(navigator, "languages", "get").mockImplementation(() => { throw new Error("unavailable"); });
    const { useI18n } = await reloadLanguage();
    expect(useI18n().locale.value).toBe("en");
  });

  it("手动英文选择立即生效，并在重载后覆盖中文系统语种", async () => {
    const { setLocale, t, useI18n } = await reloadLanguage();
    setLocale("en");
    expect(useI18n().locale.value).toBe("en");
    expect(t("设置")).toBe("Settings");
    expect(document.documentElement.lang).toBe("en");
    const reloaded = await reloadLanguage();
    expect(reloaded.useI18n().locale.value).toBe("en");
  });

  it("用户主动选择与系统相同的语种后，重载时系统变化也不覆盖该选择", async () => {
    const { setLocale } = await reloadLanguage();
    setLocale("zh-CN");
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["en-US"]);
    const reloaded = await reloadLanguage();
    expect(reloaded.useI18n().locale.value).toBe("zh-CN");
  });

  it("损坏的手动偏好不会覆盖系统语种", async () => {
    localStorage.setItem("key-aquarium.language", "invalid");
    const { useI18n } = await reloadLanguage();
    expect(useI18n().locale.value).toBe("zh-CN");
  });

  it("无法访问本地存储时仍能启动并切换当前会话语种", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("unavailable"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("unavailable"); });
    const { useI18n, setLocale } = await reloadLanguage();
    expect(useI18n().locale.value).toBe("zh-CN");
    expect(() => setLocale("en")).not.toThrow();
    expect(useI18n().locale.value).toBe("en");
  });

  it("全部可见物种和成就都有英文文案，且切回中文不残留英文", async () => {
    const { setLocale, t } = await reloadLanguage();
    const messages = [
      ...FISH_DEFINITIONS.map((fish) => fish.name),
      ...ACHIEVEMENT_DEFINITIONS.flatMap((achievement) => [achievement.name, achievement.description]),
    ];
    setLocale("en");
    for (const message of messages) {
      expect(englishMessages[message], message).toBeTruthy();
      expect(t(message)).not.toMatch(/[\p{Script=Han}]/u);
    }
    expect(t("获得 {name}", { name: t("晨光孔雀") })).toBe("Collected: Dawn Guppy");
    setLocale("zh-CN");
    expect(t("获得 {name}", { name: t("晨光孔雀") })).toBe("获得 晨光孔雀");
  });
});
