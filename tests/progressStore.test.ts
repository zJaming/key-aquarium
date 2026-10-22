import { AUTO_COLLECT_DELAY_MS } from "../src/game/constants";
import { applyKeyPress, createInitialProgress, getKeyStatus, setActiveScene } from "../src/game/progression";
import type { KeyboardFarmProgress } from "../src/game/types";

const BASE_NOW = 1_800_000_000_000;

/** 创建独立的进度 store 模块实例，避免单例状态在用例之间串扰。 */
async function createFreshProgressStore() {
  vi.resetModules();
  const { useProgressStore } = await import("../src/store/progressStore");

  return useProgressStore();
}

/** 把指定键位推进到作物满级待收取状态，避免测试内高频调度保存定时器。 */
async function growReadyCrop(store: Awaited<ReturnType<typeof createFreshProgressStore>>, keyId = "KeyA"): Promise<number> {
  const readyProgress = createReadyFarmProgress();
  const readyAt = getKeyStatus(readyProgress, keyId).cropReadyAt;

  if (!readyAt) {
    throw new Error("测试前置条件失败：作物未进入待收取状态");
  }

  await store.importProgress(readyProgress, BASE_NOW + 1_001);
  return readyAt;
}

/** 创建一个已处于农场且有满级作物待收取的存档。 */
function createReadyFarmProgress(): KeyboardFarmProgress {
  let progress = setActiveScene(createInitialProgress(BASE_NOW), "farm", BASE_NOW - 1);

  for (let index = 0; index < 1_000; index += 1) {
    progress = applyKeyPress(progress, "KeyA", BASE_NOW + index);
  }

  return progress;
}

/** 创建带有水族箱收藏记录的存档，用于验证跨包名迁移。 */
function createAquariumProgressWithFish(): KeyboardFarmProgress {
  const progress = createInitialProgress(BASE_NOW);

  return {
    ...progress,
    totalPresses: 2_400,
    todayPresses: 120,
    updatedAt: BASE_NOW + 1_000,
    aquariumProgress: {
      ...progress.aquariumProgress,
      fishCollections: {
        fish_001: {
          id: "fish_001",
          count: 3,
          firstOpenedAt: BASE_NOW + 100,
          lastOpenedAt: BASE_NOW + 900,
        },
      },
      totalOpenings: 3,
      lastOpenedFishId: "fish_001",
      lastOpenedAt: BASE_NOW + 900,
    },
  };
}

describe("进度 store 场景隔离", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.doUnmock("../src/platform/tauri");
    vi.doUnmock("@tauri-apps/plugin-store");
    vi.useRealTimers();
  });

  /** 更新重启时立即持久化仍在防抖队列里的最新按键，并取消旧定时器。 */
  it("重启前主动保存最新进度，不等待防抖定时器", async () => {
    const set = vi.fn();
    const save = vi.fn();
    vi.doMock("../src/platform/tauri", () => ({ isTauriRuntime: () => true }));
    vi.doMock("@tauri-apps/plugin-store", () => ({ Store: { load: vi.fn(async () => ({ set, save })) } }));
    const store = await createFreshProgressStore();
    store.recordKeyPress("KeyA", BASE_NOW);
    expect(save).not.toHaveBeenCalled();
    await store.flushProgress();
    expect(set).toHaveBeenCalledWith("progress", expect.objectContaining({ totalPresses: 1 }));
    expect(save).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(300);
    expect(save).toHaveBeenCalledOnce();
  });

  it("水族箱场景的按键和定时器不会触发农场自动收取", async () => {
    const store = await createFreshProgressStore();

    store.switchScene("farm", BASE_NOW - 1);

    const readyAt = await growReadyCrop(store);
    const expiredAt = readyAt + AUTO_COLLECT_DELAY_MS;
    const collectionsBeforeAquarium = store.state.progress.fullCropCollections;

    store.switchScene("aquarium", expiredAt);
    store.recordKeyPress("KeyA", expiredAt + 1);
    store.collectExpiredCrops(expiredAt + 2);
    store.collectKeyCrop("KeyA", expiredAt + 3);
    store.collectFirstReadyCrop(store.getKey("KeyA").cropId ?? "", expiredAt + 4);

    expect(store.state.progress.activeSceneId).toBe("aquarium");
    expect(store.state.progress.fullCropCollections).toBe(collectionsBeforeAquarium);
    expect(store.getKey("KeyA").cropReadyAt).toBe(readyAt);
    expect(store.getKey("KeyA").pressCount).toBe(1_000);

    store.switchScene("farm", expiredAt + 5);
    store.collectExpiredCrops(expiredAt + 6);

    expect(store.state.progress.fullCropCollections).toBe(collectionsBeforeAquarium + 1);
    expect(store.getKey("KeyA").cropReadyAt).toBeNull();
  });

  it("加载旧农场存档时会固定进入水族箱且不结算农场作物", async () => {
    vi.resetModules();

    const savedProgress = createReadyFarmProgress();
    const readyAt = getKeyStatus(savedProgress, "KeyA").cropReadyAt;
    const storeGet = vi.fn(async () => savedProgress);
    const storeSet = vi.fn();
    const storeSave = vi.fn();

    vi.doMock("../src/platform/tauri", () => ({
      applyWindowBounds: vi.fn(),
      isTauriRuntime: () => true,
      loadExternalProgressCandidates: vi.fn(async () => []),
      readCurrentWindowBounds: vi.fn(async () => null),
      setWindowAlwaysOnTop: vi.fn(),
    }));
    vi.doMock("@tauri-apps/plugin-store", () => ({
      Store: {
        load: vi.fn(async () => ({
          get: storeGet,
          set: storeSet,
          save: storeSave,
        })),
      },
    }));

    const { useProgressStore } = await import("../src/store/progressStore");
    const store = useProgressStore();

    await store.loadProgress();

    expect(store.state.progress.activeSceneId).toBe("aquarium");
    expect(store.state.progress.fullCropCollections).toBe(savedProgress.fullCropCollections);
    expect(store.getKey("KeyA").cropReadyAt).toBe(readyAt);
    expect(storeSet).not.toHaveBeenCalled();
    expect(storeSave).not.toHaveBeenCalled();
  });

  it("新存档为空时会从旧存档迁移进度并写入新存档", async () => {
    vi.resetModules();

    const savedProgress = createReadyFarmProgress();
    const readyAt = getKeyStatus(savedProgress, "KeyA").cropReadyAt;
    const newStoreGet = vi.fn(async () => undefined);
    const newStoreSet = vi.fn();
    const newStoreSave = vi.fn();
    const legacyStoreGet = vi.fn(async () => savedProgress);
    const legacyStoreSet = vi.fn();
    const legacyStoreSave = vi.fn();
    const storeLoad = vi.fn(async (path: string) => {
      if (path === "keyboard-farm.json") {
        return {
          get: legacyStoreGet,
          set: legacyStoreSet,
          save: legacyStoreSave,
        };
      }

      return {
        get: newStoreGet,
        set: newStoreSet,
        save: newStoreSave,
      };
    });

    vi.doMock("../src/platform/tauri", () => ({
      applyWindowBounds: vi.fn(),
      isTauriRuntime: () => true,
      loadExternalProgressCandidates: vi.fn(async () => []),
      readCurrentWindowBounds: vi.fn(async () => null),
      setWindowAlwaysOnTop: vi.fn(),
    }));
    vi.doMock("@tauri-apps/plugin-store", () => ({
      Store: {
        load: storeLoad,
      },
    }));

    const { useProgressStore } = await import("../src/store/progressStore");
    const store = useProgressStore();

    await store.loadProgress();

    expect(storeLoad).toHaveBeenCalledWith("key-aquarium.json", { defaults: {}, autoSave: false });
    expect(storeLoad).toHaveBeenCalledWith("keyboard-farm.json", { defaults: {}, autoSave: false });
    expect(store.state.progress.activeSceneId).toBe("aquarium");
    expect(store.state.progress.fullCropCollections).toBe(savedProgress.fullCropCollections);
    expect(store.getKey("KeyA").cropReadyAt).toBe(readyAt);
    expect(newStoreSet).toHaveBeenCalledWith("progress", expect.objectContaining({ activeSceneId: "aquarium" }));
    expect(newStoreSave).toHaveBeenCalledOnce();
    expect(legacyStoreSet).not.toHaveBeenCalled();
    expect(legacyStoreSave).not.toHaveBeenCalled();
  });

  it("当前新存档较空时会恢复中间包名目录里的水族箱记录", async () => {
    vi.resetModules();

    const emptyCurrentProgress = createInitialProgress(BASE_NOW + 2_000);
    const externalProgress = createAquariumProgressWithFish();
    const newStoreGet = vi.fn(async () => emptyCurrentProgress);
    const newStoreSet = vi.fn();
    const newStoreSave = vi.fn();
    const legacyStoreGet = vi.fn(async () => undefined);
    const storeLoad = vi.fn(async (path: string) => ({
      get: path === "keyboard-farm.json" ? legacyStoreGet : newStoreGet,
      set: newStoreSet,
      save: newStoreSave,
    }));

    vi.doMock("../src/platform/tauri", () => ({
      applyWindowBounds: vi.fn(),
      isTauriRuntime: () => true,
      loadExternalProgressCandidates: vi.fn(async () => [
        {
          source: "com.keyaquarium.desktop/key-aquarium.json",
          progress: externalProgress,
        },
      ]),
      readCurrentWindowBounds: vi.fn(async () => null),
      setWindowAlwaysOnTop: vi.fn(),
    }));
    vi.doMock("@tauri-apps/plugin-store", () => ({
      Store: {
        load: storeLoad,
      },
    }));

    const { useProgressStore } = await import("../src/store/progressStore");
    const store = useProgressStore();

    await store.loadProgress();

    expect(store.state.progress.totalPresses).toBe(externalProgress.totalPresses);
    expect(store.getAquarium().lastOpenedFish?.id).toBe("fish_001");
    expect(store.getAquarium().lastOpenedFish?.count).toBe(3);
    expect(newStoreSet).toHaveBeenCalledWith("progress", expect.objectContaining({ totalPresses: externalProgress.totalPresses }));
    expect(newStoreSave).toHaveBeenCalledOnce();
  });

  it("会把存档中的窗口位置尺寸交给平台恢复", async () => {
    vi.resetModules();

    const savedProgress = {
      ...createInitialProgress(BASE_NOW),
      windowBounds: {
        x: 120,
        y: 180,
        width: 760,
        height: 420,
      },
    };
    const applyWindowBounds = vi.fn();

    vi.doMock("../src/platform/tauri", () => ({
      applyWindowBounds,
      isTauriRuntime: () => true,
      loadExternalProgressCandidates: vi.fn(async () => []),
      readCurrentWindowBounds: vi.fn(async () => null),
      setWindowAlwaysOnTop: vi.fn(),
    }));
    vi.doMock("@tauri-apps/plugin-store", () => ({
      Store: {
        load: vi.fn(async () => ({
          get: vi.fn(async () => savedProgress),
          set: vi.fn(),
          save: vi.fn(),
        })),
      },
    }));

    const { useProgressStore } = await import("../src/store/progressStore");
    const store = useProgressStore();

    await store.loadProgress();
    await store.restoreWindowBounds();

    expect(applyWindowBounds).toHaveBeenCalledWith(savedProgress.windowBounds);
  });

  it("恢复时会把修正后的可见位置保存，避免重启再次回到屏幕外", async () => {
    const correctedBounds = { x: 300, y: 200, width: 658, height: 466 };
    const storeSet = vi.fn();
    const savedProgress = {
      ...createInitialProgress(BASE_NOW),
      windowBounds: { x: -658, y: 1214, width: 658, height: 466 },
    };
    vi.doMock("../src/platform/tauri", () => ({
      applyWindowBounds: vi.fn(),
      isTauriRuntime: () => true,
      loadExternalProgressCandidates: vi.fn(async () => []),
      readCurrentWindowBounds: vi.fn(async () => correctedBounds),
      setWindowAlwaysOnTop: vi.fn(),
    }));
    vi.doMock("@tauri-apps/plugin-store", () => ({
      Store: {
        load: vi.fn(async () => ({ get: vi.fn(async () => savedProgress), set: storeSet, save: vi.fn() })),
      },
    }));
    const store = await createFreshProgressStore();
    await store.loadProgress();
    await store.restoreWindowBounds();
    await store.flushProgress();
    expect(store.state.progress.windowBounds).toEqual(correctedBounds);
    expect(storeSet).toHaveBeenCalledWith("progress", expect.objectContaining({ windowBounds: correctedBounds }));
  });

  it("窗口移动或缩放后会记录新的窗口位置尺寸", async () => {
    vi.resetModules();

    const windowBounds = {
      x: 260,
      y: 140,
      width: 680,
      height: 360,
    };

    vi.doMock("../src/platform/tauri", () => ({
      applyWindowBounds: vi.fn(),
      isTauriRuntime: () => true,
      loadExternalProgressCandidates: vi.fn(async () => []),
      readCurrentWindowBounds: vi.fn(async () => windowBounds),
      setWindowAlwaysOnTop: vi.fn(),
    }));
    vi.doMock("@tauri-apps/plugin-store", () => ({
      Store: {
        load: vi.fn(async () => ({
          get: vi.fn(async () => undefined),
          set: vi.fn(),
          save: vi.fn(),
        })),
      },
    }));

    const { useProgressStore } = await import("../src/store/progressStore");
    const store = useProgressStore();

    await store.captureWindowBounds(BASE_NOW + 1);

    expect(store.state.progress.windowBounds).toEqual(windowBounds);
    expect(store.state.progress.updatedAt).toBe(BASE_NOW + 1);
  });

  it("会保存设置并在清空数据时保留设置和窗口偏好", async () => {
    vi.resetModules();

    const storeSet = vi.fn();
    const storeSave = vi.fn();
    const setWindowAlwaysOnTop = vi.fn();

    vi.doMock("../src/platform/tauri", () => ({
      applyWindowBounds: vi.fn(),
      isTauriRuntime: () => true,
      loadExternalProgressCandidates: vi.fn(async () => []),
      readCurrentWindowBounds: vi.fn(async () => null),
      setWindowAlwaysOnTop,
    }));
    vi.doMock("@tauri-apps/plugin-store", () => ({
      Store: {
        load: vi.fn(async () => ({
          get: vi.fn(async () => undefined),
          set: storeSet,
          save: storeSave,
        })),
      },
    }));

    const { useProgressStore } = await import("../src/store/progressStore");
    const store = useProgressStore();

    store.updateSettings({ keyFeedbackEnabled: false, fishDisplayMode: "compact" }, BASE_NOW + 1);
    await store.captureWindowBounds(BASE_NOW + 2);
    await store.clearProgressKeepingSettings(BASE_NOW + 3);

    expect(store.state.progress.totalPresses).toBe(0);
    expect(store.state.progress.settings).toEqual({
      keyFeedbackEnabled: false,
      fishDisplayMode: "compact",
    });
    expect(store.state.progress.alwaysOnTop).toBe(false);
    expect(setWindowAlwaysOnTop).toHaveBeenCalledWith(false);
    expect(storeSet).toHaveBeenCalledWith("progress", expect.objectContaining({
      settings: {
        keyFeedbackEnabled: false,
        fishDisplayMode: "compact",
      },
    }));
  });

  it("会导入 envelope 格式存档并拒绝非法版本", async () => {
    vi.resetModules();

    const storeSet = vi.fn();
    const storeSave = vi.fn();

    vi.doMock("../src/platform/tauri", () => ({
      applyWindowBounds: vi.fn(),
      isTauriRuntime: () => true,
      loadExternalProgressCandidates: vi.fn(async () => []),
      readCurrentWindowBounds: vi.fn(async () => null),
      setWindowAlwaysOnTop: vi.fn(),
    }));
    vi.doMock("@tauri-apps/plugin-store", () => ({
      Store: {
        load: vi.fn(async () => ({
          get: vi.fn(async () => undefined),
          set: storeSet,
          save: storeSave,
        })),
      },
    }));

    const { useProgressStore } = await import("../src/store/progressStore");
    const store = useProgressStore();
    const importedProgress = {
      ...createInitialProgress(BASE_NOW),
      totalPresses: 9,
      settings: {
        keyFeedbackEnabled: false,
        fishDisplayMode: "compact" as const,
      },
    };

    await store.importProgress({ app: "key-aquarium", progress: importedProgress }, BASE_NOW + 9);

    expect(store.state.progress.totalPresses).toBe(9);
    expect(store.state.progress.settings.fishDisplayMode).toBe("compact");
    expect(storeSet).toHaveBeenCalledWith("progress", expect.objectContaining({ totalPresses: 9 }));

    await expect(store.importProgress({ version: 2 })).rejects.toThrow("无法识别数据文件");
    expect(store.state.progress.totalPresses).toBe(9);
  });
});
