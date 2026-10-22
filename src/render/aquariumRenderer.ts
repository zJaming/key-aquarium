import { t } from "../i18n";
import { Application, Container, FederatedPointerEvent, Graphics, Rectangle, Text, TextStyle } from "pixi.js";
import { AQUARIUM_TANK_DISPLAY_LIMIT } from "../game/constants";
import { getFishVisualPixelBounds, getFishVisualPixelRects } from "../game/fishVisualAssets";
import type { AppSettings, AquariumStatus, FishGalleryItem, FishId } from "../game/types";
import { computeStageFit } from "./stageFit";

interface AquariumRendererOptions {
  host: HTMLElement;
  status: AquariumStatus;
  onBubbleButtonPress: () => void;
  onLightTogglePress: () => void;
  onShakeButtonPress: () => void;
  onManualProgress: () => void;
  settings: AppSettings;
}

interface ManualPointerState {
  pointerId: number;
  x: number;
  y: number;
}

interface BubbleParticle {
  x: number;
  y: number;
  size: number;
  speed: number;
  drift: number;
  seed: number;
  startedAt: number;
  duration: number;
}

interface BubbleBurstSource {
  x: number;
  y: number;
}

interface ProgressPopup {
  x: number;
  y: number;
  seed: number;
  startedAt: number;
  duration: number;
}

interface MarqueeDisplayItem {
  message: string;
  color: number;
}

interface TankFishPlacement {
  fish: FishGalleryItem;
  x: number;
  y: number;
  scale: number;
  facingRight: boolean;
}

interface TankFishDrawItem {
  fish: FishGalleryItem;
  x: number;
  y: number;
  scale: number;
  facingRight: boolean;
  darkness: number;
  visualDarkness: number;
  sortY: number;
  depthBand: number;
  slotIndex: number;
}

interface VisibleTankFishState {
  id: FishId;
  fish: FishGalleryItem;
  slotIndex: number;
  phase: "entering" | "visible" | "exiting";
  transitionStartedAt: number;
  transitionDirection: number;
}

const AQUARIUM_BOUNDS = { x: 0, y: 0, width: 960, height: 540 };
// 水族箱在逻辑画布内的设计边距，配合窗口缩放 padding 共同决定可见空隙。
const TANK_X = 28;
const TANK_Y = 22;
const TANK_WIDTH = 904;
const TANK_HEIGHT = 384;
const TANK_CORNER_CUT = 18;
const TANK_FRAME_THICKNESS = 10;
const TANK_CONTENT_MIN_X = TANK_X + 16;
const TANK_CONTENT_MAX_X = TANK_X + TANK_WIDTH - 16;
const TANK_CONTENT_MIN_Y = TANK_Y + 16;
const TANK_CONTENT_MAX_Y = TANK_Y + TANK_HEIGHT - 18;
const BASE_Y = 406;
const BASE_HEIGHT = 96;
const AQUARIUM_CONTENT_BOUNDS = {
  x: TANK_X,
  y: TANK_Y,
  width: TANK_WIDTH,
  height: BASE_Y + BASE_HEIGHT + 12 - TANK_Y,
};
const COMPACT_TANK_FISH_LIMIT = 18;
const TANK_FISH_DEPTH_BAND_HEIGHT = 12;
const WATER_BANDS = [0x0b5b78, 0x0a4e70, 0x093d61, 0x0a314f];
const GLASS_COLOR = 0xb7f0ff;
const BASE_COLOR = 0x172932;
const BASE_DARK_COLOR = 0x0a1519;
const MANUAL_BUTTON_SIZE = 42;
const MANUAL_BUTTON_X = TANK_X + 28;
const MANUAL_BUTTON_Y = BASE_Y + 34;
const BASE_INFO_WIDTH = 264;
const MARQUEE_X = MANUAL_BUTTON_X + MANUAL_BUTTON_SIZE + 18;
const MARQUEE_Y = BASE_Y + 24;
const MARQUEE_WIDTH = BASE_INFO_WIDTH;
const MARQUEE_HEIGHT = 30;
const BASE_PROGRESS_X = MARQUEE_X;
const BASE_PROGRESS_Y = MARQUEE_Y + MARQUEE_HEIGHT + 3;
const BASE_PROGRESS_WIDTH = BASE_INFO_WIDTH;
const BASE_PROGRESS_HEIGHT = 18;
const PROGRESS_POPUP_WIDTH = 12;
const PROGRESS_POPUP_DURATION_MS = 740;
const PROGRESS_POPUP_RISE = 22;
const PROGRESS_POPUP_MAX_COUNT = 24;
const PULSE_DURATION_MS = 260;
const MARQUEE_SCROLL_MS = 9200;
const MARQUEE_PLACEHOLDER_SCROLL_MS = 7200;
const MARQUEE_PLACEHOLDER_TEXT = "等待来客";
const MARQUEE_PLACEHOLDER_COLOR = 0x45646c;
const MARQUEE_REPEAT_COPIES = 2;
const MARQUEE_FONT_SIZE = 16;
const STAGE_FIT_PADDING = 8;
const MANUAL_CLICK_MAX_MOVE = 10;
const BUBBLE_BUTTON_SIZE = 42;
const SHAKE_BUTTON_SIZE = 42;
const BUBBLE_BUTTON_X = TANK_X + TANK_WIDTH - BUBBLE_BUTTON_SIZE - 28;
const BUBBLE_BUTTON_Y = MANUAL_BUTTON_Y;
const LIGHT_BUTTON_SIZE = 42;
const LIGHT_BUTTON_GAP = 12;
const LIGHT_BUTTON_X = BUBBLE_BUTTON_X - LIGHT_BUTTON_SIZE - LIGHT_BUTTON_GAP;
const LIGHT_BUTTON_Y = MANUAL_BUTTON_Y;
const SHAKE_BUTTON_X = LIGHT_BUTTON_X - SHAKE_BUTTON_SIZE - LIGHT_BUTTON_GAP;
const SHAKE_BUTTON_Y = MANUAL_BUTTON_Y;
const UTILITY_BUTTON_UNLOCK_FISH_COUNT = 10;
const LIGHT_BUTTON_UNLOCK_FISH_COUNT = 20;
const SHAKE_BUTTON_UNLOCK_FISH_COUNT = 40;
const SHAKE_DURATION_MS = 980;
const SHAKE_FISH_SPEED_DURATION_MS = 1800;
const SHAKE_FISH_SPEED_MULTIPLIER = 3.2;
const SHAKE_PIXEL_AMPLITUDE = 3;
const BUBBLE_BURST_COUNT = 18;
const BUBBLE_BURST_MAX_COUNT = 90;
const BUBBLE_TOP_LIMIT_Y = TANK_Y + 10;
const PROGRESS_BUBBLE_MIN_COUNT = 1;
const PROGRESS_BUBBLE_MAX_COUNT = 2;
const PROGRESS_BUBBLE_MARGIN_X = 58;
const PROGRESS_BUBBLE_BASE_Y = TANK_Y + TANK_HEIGHT - 48;
const BUBBLE_BURST_SOURCE_MIN = 3;
const BUBBLE_BURST_SOURCE_MAX = 5;
const BUBBLE_BURST_MARGIN_X = 74;
const BUBBLE_BURST_MIN_Y = TANK_Y + 118;
const BUBBLE_BURST_MAX_Y = TANK_Y + TANK_HEIGHT - 46;
const AMBIENT_BUBBLE_COUNT = 12;
const BIOLUMINESCENT_NAME_MARKERS = ["灯", "霓虹", "青焰", "极光", "银河", "蓝环", "月冕"] as const;
const LIGHTS_OUT_SPECIES_DARKNESS = 0.58;
const LIGHTS_OUT_BIOLUMINESCENT_DARKNESS = 0.32;
const TANK_FISH_TRANSITION_MS = 1_600;
const TANK_FISH_ROTATION_INTERVAL_MS = 7_500;
const TANK_FISH_REENTRY_COOLDOWN_MS = 26_000;
const RARITY_HIDE_WEIGHTS: Record<FishGalleryItem["rarity"], number> = {
  common: 8,
  rare: 4,
  curio: 2,
  legendary: 1,
};
const DEFAULT_MARQUEE_COLOR = 0xd8fbff;

/** 管理像素风水族箱场景的 PixiJS 绘制、刷新和销毁。 */
export class AquariumRenderer {
  private readonly host: HTMLElement;
  private readonly onBubbleButtonPress: () => void;
  private readonly onLightTogglePress: () => void;
  private readonly onShakeButtonPress: () => void;
  private readonly onManualProgress: () => void;
  private status: AquariumStatus;
  private settings: AppSettings;
  private app: Application | null = null;
  private stageRoot: Container | null = null;
  private backgroundLayer: Graphics | null = null;
  private fishLayer: Graphics | null = null;
  private bubbleLayer: Graphics | null = null;
  private uiLayer: Graphics | null = null;
  private marqueeMask: Graphics | null = null;
  private marqueeTexts: Text[] = [];
  private manualButton: Container | null = null;
  private bubbleButton: Container | null = null;
  private lightButton: Container | null = null;
  private shakeButton: Container | null = null;
  private manualPointerState: ManualPointerState | null = null;
  private bubblePointerState: ManualPointerState | null = null;
  private lightPointerState: ManualPointerState | null = null;
  private shakePointerState: ManualPointerState | null = null;
  private visibleTankFish = new Map<FishId, VisibleTankFishState>();
  private recentlyHiddenFish = new Map<FishId, number>();
  private burstBubbles: BubbleParticle[] = [];
  private progressPopups: ProgressPopup[] = [];
  private progressPopupSequence = 0;
  private progressBubbleSequence = 0;
  private resizeObserver: ResizeObserver | null = null;
  private lastTankFishRotationAt = 0;
  private lightsOn = true;
  private pulseStartedAt = 0;
  private shakeStartedAt = -SHAKE_DURATION_MS;
  private fishMotionOffsetMs = 0;
  private readonly renderFrame = () => {
    this.drawScene();
  };

  constructor(options: AquariumRendererOptions) {
    this.host = options.host;
    this.status = options.status;
    this.onBubbleButtonPress = options.onBubbleButtonPress;
    this.onLightTogglePress = options.onLightTogglePress;
    this.onShakeButtonPress = options.onShakeButtonPress;
    this.onManualProgress = options.onManualProgress;
    this.settings = options.settings;
  }

  /** 初始化 PixiJS 应用和水族箱静态对象。 */
  async init(): Promise<void> {
    this.app = new Application();
    await this.app.init({
      backgroundAlpha: 0,
      antialias: false,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      resizeTo: this.host,
    });

    this.app.canvas.className = "h-full w-full";
    this.app.canvas.style.imageRendering = "pixelated";
    this.host.appendChild(this.app.canvas);

    this.stageRoot = new Container();
    this.backgroundLayer = new Graphics();
    this.fishLayer = new Graphics();
    this.bubbleLayer = new Graphics();
    this.uiLayer = new Graphics();
    this.marqueeMask = new Graphics();
    this.marqueeTexts = Array.from({ length: MARQUEE_REPEAT_COPIES }, createMarqueeText);
    this.manualButton = new Container();
    this.manualButton.x = MANUAL_BUTTON_X;
    this.manualButton.y = MANUAL_BUTTON_Y;
    this.manualButton.hitArea = new Rectangle(0, 0, MANUAL_BUTTON_SIZE, MANUAL_BUTTON_SIZE);
    this.manualButton.eventMode = "static";
    this.manualButton.cursor = "pointer";
    this.manualButton.on("pointerdown", (event) => {
      this.handleManualPointerDown(event);
    });
    this.manualButton.on("pointerup", (event) => {
      this.handleManualPointerUp(event);
    });
    this.manualButton.on("pointerupoutside", () => {
      this.manualPointerState = null;
    });
    this.bubbleButton = new Container();
    this.bubbleButton.x = BUBBLE_BUTTON_X;
    this.bubbleButton.y = BUBBLE_BUTTON_Y;
    this.bubbleButton.hitArea = new Rectangle(0, 0, BUBBLE_BUTTON_SIZE, BUBBLE_BUTTON_SIZE);
    this.bubbleButton.visible = false;
    this.bubbleButton.eventMode = "none";
    this.bubbleButton.cursor = "default";
    this.bubbleButton.on("pointerdown", (event) => {
      this.handleBubblePointerDown(event);
    });
    this.bubbleButton.on("pointerup", (event) => {
      this.handleBubblePointerUp(event);
    });
    this.bubbleButton.on("pointerupoutside", () => {
      this.bubblePointerState = null;
    });
    this.lightButton = new Container();
    this.lightButton.x = LIGHT_BUTTON_X;
    this.lightButton.y = LIGHT_BUTTON_Y;
    this.lightButton.hitArea = new Rectangle(0, 0, LIGHT_BUTTON_SIZE, LIGHT_BUTTON_SIZE);
    this.lightButton.visible = false;
    this.lightButton.eventMode = "none";
    this.lightButton.cursor = "default";
    this.lightButton.on("pointerdown", (event) => {
      this.handleLightPointerDown(event);
    });
    this.lightButton.on("pointerup", (event) => {
      this.handleLightPointerUp(event);
    });
    this.lightButton.on("pointerupoutside", () => {
      this.lightPointerState = null;
    });
    this.shakeButton = new Container();
    this.shakeButton.x = SHAKE_BUTTON_X;
    this.shakeButton.y = SHAKE_BUTTON_Y;
    this.shakeButton.hitArea = new Rectangle(0, 0, SHAKE_BUTTON_SIZE, SHAKE_BUTTON_SIZE);
    this.shakeButton.visible = false;
    this.shakeButton.eventMode = "none";
    this.shakeButton.cursor = "default";
    this.shakeButton.on("pointerdown", (event) => {
      this.handleShakePointerDown(event);
    });
    this.shakeButton.on("pointerup", (event) => {
      this.handleShakePointerUp(event);
    });
    this.shakeButton.on("pointerupoutside", () => {
      this.shakePointerState = null;
    });

    this.marqueeTexts.forEach((marqueeText) => {
      marqueeText.mask = this.marqueeMask;
    });

    this.stageRoot.addChild(this.backgroundLayer, this.fishLayer, this.bubbleLayer, this.uiLayer, this.marqueeMask, ...this.marqueeTexts, this.manualButton, this.lightButton, this.bubbleButton, this.shakeButton);
    this.app.stage.addChild(this.stageRoot);
    this.app.ticker.add(this.renderFrame);

    this.resizeObserver = new ResizeObserver(() => {
      this.fitToHost();
    });
    this.resizeObserver.observe(this.host);
    this.drawScene();
  }

  /** 接收最新水族箱状态，下一帧绘制会使用新数据。 */
  setStatus(status: AquariumStatus): void {
    this.status = status;
  }

  /** 接收最新设置，并在上限收紧时清理超量展示物种。 */
  setSettings(settings: AppSettings): void {
    this.settings = settings;
    this.trimVisibleTankFishToLimit();
  }

  /** 播放一次轻量按键反馈，让玻璃和进度条短暂发亮。 */
  pulse(): void {
    this.pulseStartedAt = Date.now();
  }

  /** 在进度条区域生成一次加号上浮反馈。 */
  showProgressIncrementFeedback(): void {
    if (!this.settings.keyFeedbackEnabled) {
      return;
    }

    const now = Date.now();

    this.addProgressPopup(now);
    this.addProgressBubbles(now);
  }

  /** 判断屏幕坐标是否落在实际水族箱和底座区域内。 */
  containsAquariumContentPoint(clientX: number, clientY: number): boolean {
    const hostBounds = this.host.getBoundingClientRect();
    const fit = computeStageFit({
      bounds: AQUARIUM_BOUNDS,
      hostWidth: this.host.clientWidth,
      hostHeight: this.host.clientHeight,
      padding: STAGE_FIT_PADDING,
    });
    const stageX = (clientX - hostBounds.left - fit.x) / fit.scale;
    const stageY = (clientY - hostBounds.top - fit.y) / fit.scale;

    return (
      stageX >= AQUARIUM_CONTENT_BOUNDS.x
      && stageX <= AQUARIUM_CONTENT_BOUNDS.x + AQUARIUM_CONTENT_BOUNDS.width
      && stageY >= AQUARIUM_CONTENT_BOUNDS.y
      && stageY <= AQUARIUM_CONTENT_BOUNDS.y + AQUARIUM_CONTENT_BOUNDS.height
    );
  }

  /** 销毁 PixiJS 应用和监听器。 */
  destroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.app?.ticker.remove(this.renderFrame);
    this.app?.destroy({ removeView: true }, { children: true });
    this.app = null;
    this.stageRoot = null;
    this.backgroundLayer = null;
    this.fishLayer = null;
    this.bubbleLayer = null;
    this.uiLayer = null;
    this.marqueeMask = null;
    this.marqueeTexts = [];
    this.manualButton = null;
    this.lightButton = null;
    this.bubbleButton = null;
    this.shakeButton = null;
    this.visibleTankFish.clear();
    this.recentlyHiddenFish.clear();
    this.burstBubbles = [];
    this.progressPopups = [];
    this.progressBubbleSequence = 0;
  }

  /** 绘制当前水族箱完整帧。 */
  private drawScene(): void {
    if (!this.backgroundLayer || !this.fishLayer || !this.bubbleLayer || !this.uiLayer || !this.marqueeMask || this.marqueeTexts.length === 0) {
      return;
    }

    const now = Date.now();
    const pulseAlpha = getPulseAlpha(this.pulseStartedAt, now);
    const bubbleButtonUnlocked = isAquariumBubbleButtonUnlocked(this.status);
    const lightButtonUnlocked = isAquariumLightButtonUnlocked(this.status);
    const shakeButtonUnlocked = isAquariumShakeButtonUnlocked(this.status);
    const shakeProgress = getShakeProgress(this.shakeStartedAt, now);
    const fishMotionNow = now + this.getFishMotionOffset(now);
    const visibleFish = this.syncVisibleTankFish(now);

    if (!lightButtonUnlocked) {
      this.lightsOn = true;
    }

    this.backgroundLayer.clear();
    this.fishLayer.clear();
    this.bubbleLayer.clear();
    this.uiLayer.clear();
    this.marqueeMask.clear();
    drawTankFrame(this.backgroundLayer, pulseAlpha, this.lightsOn);
    drawLightsOutOverlay(this.backgroundLayer, this.lightsOn);
    drawTankFish(this.fishLayer, visibleFish, now, fishMotionNow, this.lightsOn);
    drawAmbientBubbles(this.bubbleLayer, now);
    drawBurstBubbles(this.bubbleLayer, this.burstBubbles, now);
    this.pruneBurstBubbles(now);
    drawBaseUi(this.uiLayer, this.status, pulseAlpha, bubbleButtonUnlocked, lightButtonUnlocked, shakeButtonUnlocked, this.lightsOn, shakeProgress);
    drawProgressPopups(this.uiLayer, this.progressPopups, now);
    this.pruneProgressPopups(now);
    updateMarqueeText(this.marqueeTexts, this.marqueeMask, this.status, now);
    this.updateLightButtonState(lightButtonUnlocked);
    this.updateBubbleButtonState(bubbleButtonUnlocked);
    this.updateShakeButtonState(shakeButtonUnlocked);
    this.fitToHost();
    this.applyStageShake(now, shakeProgress);
  }

  /** 同步水族箱物种展示池，保证同时绘制的物种状态不超过上限。 */
  private syncVisibleTankFish(now: number): VisibleTankFishState[] {
    const candidates = this.status.fishInTank;
    const candidateById = new Map(candidates.map((fish) => [fish.id, fish]));
    const displayLimit = this.getTankFishDisplayLimit();

    this.updateExistingTankFishStates(candidateById, now);
    this.pruneFinishedTankFishTransitions(now);
    this.trimVisibleTankFishToLimit();

    if (candidates.length <= displayLimit) {
      candidates.forEach((fish) => {
        this.addTankFishIfPossible(fish, now);
      });
    } else {
      this.fillVisibleTankFish(candidates, now);
      this.rotateVisibleTankFish(candidates, now);
    }

    return [...this.visibleTankFish.values()].sort((left, right) => left.slotIndex - right.slotIndex);
  }

  /** 刷新已有展示项的数据，并让已离开候选池的物种开始退出动画。 */
  private updateExistingTankFishStates(candidateById: Map<FishId, FishGalleryItem>, now: number): void {
    for (const state of this.visibleTankFish.values()) {
      const updatedFish = candidateById.get(state.id);

      if (!updatedFish) {
        this.startTankFishExit(state, now);
        continue;
      }

      state.fish = updatedFish;

      if (state.phase === "entering" && now - state.transitionStartedAt >= TANK_FISH_TRANSITION_MS) {
        state.phase = "visible";
      }
    }
  }

  /** 清理已经完成退出动画的物种，并记录短期冷却避免马上重新进入。 */
  private pruneFinishedTankFishTransitions(now: number): void {
    for (const [fishId, state] of this.visibleTankFish.entries()) {
      if (state.phase !== "exiting" || now - state.transitionStartedAt < TANK_FISH_TRANSITION_MS) {
        continue;
      }

      this.visibleTankFish.delete(fishId);
      this.recentlyHiddenFish.set(fishId, now);
    }

    for (const [fishId, hiddenAt] of this.recentlyHiddenFish.entries()) {
      if (now - hiddenAt > TANK_FISH_REENTRY_COOLDOWN_MS * 2) {
        this.recentlyHiddenFish.delete(fishId);
      }
    }
  }

  /** 从候选池补足可见物种，首屏会一次补满，轮换时只补空出来的位置。 */
  private fillVisibleTankFish(candidates: FishGalleryItem[], now: number): void {
    const displayLimit = this.getTankFishDisplayLimit();

    while (this.visibleTankFish.size < displayLimit) {
      const incomingFish = this.chooseIncomingTankFish(candidates, now);

      if (!incomingFish || !this.addTankFishIfPossible(incomingFish, now)) {
        break;
      }
    }

    if (this.lastTankFishRotationAt === 0 && this.visibleTankFish.size >= displayLimit) {
      this.lastTankFishRotationAt = now;
    }
  }

  /** 到达轮换时间后选择一个低品质优先的物种退出，让隐藏候选后续进入。 */
  private rotateVisibleTankFish(candidates: FishGalleryItem[], now: number): void {
    if (
      this.visibleTankFish.size < this.getTankFishDisplayLimit()
      || hasActiveTankFishTransition(this.visibleTankFish)
      || now - this.lastTankFishRotationAt < TANK_FISH_ROTATION_INTERVAL_MS
      || !this.chooseIncomingTankFish(candidates, now)
    ) {
      return;
    }

    const outgoingState = this.chooseOutgoingTankFish(candidates, now);

    if (!outgoingState) {
      return;
    }

    this.startTankFishExit(outgoingState, now);
    this.lastTankFishRotationAt = now;
  }

  /** 选择下一个要进入的隐藏物种，优先选择候选排序靠前且不在冷却中的项。 */
  private chooseIncomingTankFish(candidates: FishGalleryItem[], now: number): FishGalleryItem | null {
    const hiddenCandidates = candidates.filter((fish) => !this.visibleTankFish.has(fish.id));

    return hiddenCandidates.find((fish) => now - (this.recentlyHiddenFish.get(fish.id) ?? 0) >= TANK_FISH_REENTRY_COOLDOWN_MS)
      ?? hiddenCandidates[0]
      ?? null;
  }

  /** 按稀有度权重选择要隐藏的当前物种，普通物种权重最高。 */
  private chooseOutgoingTankFish(candidates: FishGalleryItem[], now: number): VisibleTankFishState | null {
    const protectedFishId = candidates[0]?.id;
    const states = [...this.visibleTankFish.values()].filter((state) => state.phase === "visible" && state.id !== protectedFishId);
    const totalWeight = states.reduce((total, state) => total + getTankFishHideWeight(state.fish, now), 0);

    if (totalWeight <= 0) {
      return states[0] ?? null;
    }

    let cursor = getHashInt(`tank-rotation:${Math.floor(now / TANK_FISH_ROTATION_INTERVAL_MS)}`) % totalWeight;

    for (const state of states) {
      cursor -= getTankFishHideWeight(state.fish, now);

      if (cursor < 0) {
        return state;
      }
    }

    return states[states.length - 1] ?? null;
  }

  /** 在还有容量时加入一个展示物种，并分配稳定槽位和入场方向。 */
  private addTankFishIfPossible(fish: FishGalleryItem, now: number): boolean {
    const currentState = this.visibleTankFish.get(fish.id);

    if (currentState) {
      currentState.fish = fish;
      return false;
    }

    if (this.visibleTankFish.size >= this.getTankFishDisplayLimit()) {
      return false;
    }

    this.visibleTankFish.set(fish.id, {
      id: fish.id,
      fish,
      slotIndex: this.getNextTankFishSlotIndex(),
      phase: "entering",
      transitionStartedAt: now,
      transitionDirection: getTankFishTransitionDirection(fish.id),
    });

    return true;
  }

  /** 标记物种进入退出动画，动画完成后再真正移出绘制池。 */
  private startTankFishExit(state: VisibleTankFishState, now: number): void {
    if (state.phase === "exiting") {
      return;
    }

    state.phase = "exiting";
    state.transitionStartedAt = now;
  }

  /** 查找当前未被占用的展示槽位，确保轮换过程位置稳定。 */
  private getNextTankFishSlotIndex(): number {
    const usedSlots = new Set([...this.visibleTankFish.values()].map((state) => state.slotIndex));

    const displayLimit = this.getTankFishDisplayLimit();

    for (let index = 0; index < displayLimit; index += 1) {
      if (!usedSlots.has(index)) {
        return index;
      }
    }

    return Math.max(displayLimit - 1, 0);
  }

  /** 根据用户设置返回当前水族箱同屏物种上限。 */
  private getTankFishDisplayLimit(): number {
    return this.settings.fishDisplayMode === "compact" ? COMPACT_TANK_FISH_LIMIT : AQUARIUM_TANK_DISPLAY_LIMIT;
  }

  /** 设置切换到少量时，立即移除超出上限的展示项。 */
  private trimVisibleTankFishToLimit(): void {
    const displayLimit = this.getTankFishDisplayLimit();

    if (this.visibleTankFish.size <= displayLimit) {
      return;
    }

    [...this.visibleTankFish.values()]
      .sort((left, right) => right.slotIndex - left.slotIndex)
      .slice(0, this.visibleTankFish.size - displayLimit)
      .forEach((state) => {
        this.visibleTankFish.delete(state.id);
      });
  }

  /** 记录可信手动指针按下事件，后续抬起时再确认同一次真实点击。 */
  private handleManualPointerDown(event: FederatedPointerEvent): void {
    if (!isTrustedPrimaryPointer(event)) {
      this.manualPointerState = null;
      return;
    }

    this.manualPointerState = {
      pointerId: event.pointerId,
      x: event.global.x,
      y: event.global.y,
    };
  }

  /** 校验可信手动点击并推进一次水族箱进度。 */
  private handleManualPointerUp(event: FederatedPointerEvent): void {
    const pointerState = this.manualPointerState;
    this.manualPointerState = null;

    if (!pointerState || !isTrustedPrimaryPointer(event) || pointerState.pointerId !== event.pointerId) {
      return;
    }

    const movedDistance = Math.hypot(event.global.x - pointerState.x, event.global.y - pointerState.y);
    const now = Date.now();

    if (movedDistance > MANUAL_CLICK_MAX_MOVE) {
      return;
    }

    this.onManualProgress();

    if (this.settings.keyFeedbackEnabled) {
      this.addProgressPopup(now);
      this.addProgressBubbles(now);
      this.pulse();
    }
  }

  /** 记录可信气泡按钮按下事件，抬起时用于确认同一次点击。 */
  private handleBubblePointerDown(event: FederatedPointerEvent): void {
    if (!isAquariumBubbleButtonUnlocked(this.status) || !isTrustedPrimaryPointer(event)) {
      this.bubblePointerState = null;
      return;
    }

    this.bubblePointerState = {
      pointerId: event.pointerId,
      x: event.global.x,
      y: event.global.y,
    };
  }

  /** 气泡按钮点击后在水族箱内生成几簇随机上浮气泡。 */
  private handleBubblePointerUp(event: FederatedPointerEvent): void {
    const pointerState = this.bubblePointerState;
    this.bubblePointerState = null;

    if (!pointerState || !isAquariumBubbleButtonUnlocked(this.status) || !isTrustedPrimaryPointer(event) || pointerState.pointerId !== event.pointerId) {
      return;
    }

    const movedDistance = Math.hypot(event.global.x - pointerState.x, event.global.y - pointerState.y);

    if (movedDistance > MANUAL_CLICK_MAX_MOVE) {
      return;
    }

    this.addBubbleBurst(Date.now());
    this.onBubbleButtonPress();
  }

  /** 记录可信灯光按钮按下事件，抬起时用于确认同一次点击。 */
  private handleLightPointerDown(event: FederatedPointerEvent): void {
    if (!isAquariumLightButtonUnlocked(this.status) || !isTrustedPrimaryPointer(event)) {
      this.lightPointerState = null;
      return;
    }

    this.lightPointerState = {
      pointerId: event.pointerId,
      x: event.global.x,
      y: event.global.y,
    };
  }

  /** 灯光按钮点击后切换水族箱水体明暗，不影响养成数据。 */
  private handleLightPointerUp(event: FederatedPointerEvent): void {
    const pointerState = this.lightPointerState;
    this.lightPointerState = null;

    if (!pointerState || !isAquariumLightButtonUnlocked(this.status) || !isTrustedPrimaryPointer(event) || pointerState.pointerId !== event.pointerId) {
      return;
    }

    const movedDistance = Math.hypot(event.global.x - pointerState.x, event.global.y - pointerState.y);

    if (movedDistance > MANUAL_CLICK_MAX_MOVE) {
      return;
    }

    this.lightsOn = !this.lightsOn;
    this.onLightTogglePress();
    this.pulse();
  }

  /** 记录可信震动按钮按下事件，抬起时用于确认同一次点击。 */
  private handleShakePointerDown(event: FederatedPointerEvent): void {
    if (!isAquariumShakeButtonUnlocked(this.status) || !isTrustedPrimaryPointer(event)) {
      this.shakePointerState = null;
      return;
    }

    this.shakePointerState = {
      pointerId: event.pointerId,
      x: event.global.x,
      y: event.global.y,
    };
  }

  /** 震动按钮点击后触发一次短促晃动和物种临时加速，不叠加持续时间。 */
  private handleShakePointerUp(event: FederatedPointerEvent): void {
    const pointerState = this.shakePointerState;
    this.shakePointerState = null;

    if (!pointerState || !isAquariumShakeButtonUnlocked(this.status) || !isTrustedPrimaryPointer(event) || pointerState.pointerId !== event.pointerId) {
      return;
    }

    const movedDistance = Math.hypot(event.global.x - pointerState.x, event.global.y - pointerState.y);

    if (movedDistance > MANUAL_CLICK_MAX_MOVE) {
      return;
    }

    const now = Date.now();

    if (this.isShakeEffectActive(now)) {
      return;
    }

    this.fishMotionOffsetMs = this.getFishMotionOffset(now);
    this.shakeStartedAt = now;
    this.onShakeButtonPress();
    this.pulse();
  }

  /** 根据解锁状态切换气泡按钮的显示、交互能力和鼠标样式。 */
  private updateBubbleButtonState(unlocked: boolean): void {
    if (!this.bubbleButton) {
      return;
    }

    this.bubbleButton.visible = unlocked;
    this.bubbleButton.eventMode = unlocked ? "static" : "none";
    this.bubbleButton.cursor = unlocked ? "pointer" : "default";
  }

  /** 根据解锁状态切换灯光按钮的显示、交互能力和鼠标样式。 */
  private updateLightButtonState(unlocked: boolean): void {
    if (!this.lightButton) {
      return;
    }

    if (!unlocked) {
      this.lightsOn = true;
    }

    this.lightButton.visible = unlocked;
    this.lightButton.eventMode = unlocked ? "static" : "none";
    this.lightButton.cursor = unlocked ? "pointer" : "default";
  }

  /** 根据解锁状态切换震动按钮的显示、交互能力和鼠标样式。 */
  private updateShakeButtonState(unlocked: boolean): void {
    if (!this.shakeButton) {
      return;
    }

    this.shakeButton.visible = unlocked;
    this.shakeButton.eventMode = unlocked ? "static" : "none";
    this.shakeButton.cursor = unlocked ? "pointer" : "default";
  }

  /** 创建一组气泡按钮触发的粒子，并限制同时存在的数量。 */
  private addBubbleBurst(now: number): void {
    const sources = createBubbleBurstSources(now);
    const particles = Array.from({ length: BUBBLE_BURST_COUNT }, (_, index) => createBubbleParticle(now, index, sources));

    this.burstBubbles = [...this.burstBubbles, ...particles].slice(-BUBBLE_BURST_MAX_COUNT);
    this.pulse();
  }

  /** 清理已经完成上浮动画或已经到达水族箱上沿的气泡粒子。 */
  private pruneBurstBubbles(now: number): void {
    this.burstBubbles = this.burstBubbles.filter((bubble) => {
      const elapsed = now - bubble.startedAt;

      if (elapsed > bubble.duration) {
        return false;
      }

      return elapsed < 0 || isBubbleInsideTankTop(getBurstBubblePosition(bubble, now).y);
    });
  }

  /** 创建一条进度加号反馈粒子，并限制同时存在的数量。 */
  private addProgressPopup(now: number): void {
    this.progressPopupSequence += 1;
    this.progressPopups = [...this.progressPopups, createProgressPopup(now, this.progressPopupSequence)].slice(-PROGRESS_POPUP_MAX_COUNT);
  }

  /** 创建少量进度反馈气泡，作为键盘和按钮累计时的水族箱内响应。 */
  private addProgressBubbles(now: number): void {
    this.progressBubbleSequence += 1;

    const seed = getHashInt(`progress-bubbles:${now}:${this.progressBubbleSequence}`);
    const count = PROGRESS_BUBBLE_MIN_COUNT + (seed % (PROGRESS_BUBBLE_MAX_COUNT - PROGRESS_BUBBLE_MIN_COUNT + 1));
    const particles = Array.from({ length: count }, (_, index) => createProgressBubbleParticle(now, index, this.progressBubbleSequence));

    this.burstBubbles = [...this.burstBubbles, ...particles].slice(-BUBBLE_BURST_MAX_COUNT);
  }

  /** 清理已经淡出的进度加号反馈粒子。 */
  private pruneProgressPopups(now: number): void {
    this.progressPopups = this.progressPopups.filter((popup) => now - popup.startedAt <= popup.duration);
  }

  /** 读取鱼类运动时间偏移，让震动结束后物种停在加速后的自然位置。 */
  private getFishMotionOffset(now: number): number {
    const elapsed = now - this.shakeStartedAt;

    if (elapsed <= 0) {
      return this.fishMotionOffsetMs;
    }

    const activeElapsed = Math.min(elapsed, SHAKE_FISH_SPEED_DURATION_MS);

    return this.fishMotionOffsetMs + activeElapsed * (SHAKE_FISH_SPEED_MULTIPLIER - 1);
  }

  /** 判断震动或加速效果是否仍在生效，避免重复点击延长效果时间。 */
  private isShakeEffectActive(now: number): boolean {
    const elapsed = now - this.shakeStartedAt;

    return elapsed >= 0 && elapsed <= SHAKE_FISH_SPEED_DURATION_MS;
  }

  /** 根据当前震动进度给整个水族箱舞台叠加轻微偏移。 */
  private applyStageShake(now: number, shakeProgress: number): void {
    if (!this.stageRoot || shakeProgress <= 0) {
      return;
    }

    const elapsed = now - this.shakeStartedAt;
    const horizontalWave = Math.sin(elapsed / 28);
    const verticalWave = Math.sin(elapsed / 39);

    this.stageRoot.x += Math.round(horizontalWave * SHAKE_PIXEL_AMPLITUDE * shakeProgress);
    this.stageRoot.y += Math.round(verticalWave * Math.max(SHAKE_PIXEL_AMPLITUDE - 1, 1) * shakeProgress);
  }

  /** 按容器尺寸等比缩放和居中场景。 */
  private fitToHost(): void {
    if (!this.stageRoot) {
      return;
    }

    const fit = computeStageFit({
      bounds: AQUARIUM_BOUNDS,
      hostWidth: this.host.clientWidth,
      hostHeight: this.host.clientHeight,
      padding: STAGE_FIT_PADDING,
    });

    this.stageRoot.scale.set(fit.scale);
    this.stageRoot.x = Math.round(fit.x);
    this.stageRoot.y = Math.round(fit.y);
  }
}

/** 绘制水体、玻璃框、沙石和底座主体，并在关灯时同步压暗外框。 */
function drawTankFrame(graphics: Graphics, pulseAlpha: number, lightsOn: boolean): void {
  const waterBottom = TANK_Y + TANK_HEIGHT - 12;
  const frameDarkness = lightsOn ? 0 : 0.42;
  const baseDarkness = lightsOn ? 0 : 0.32;

  WATER_BANDS.forEach((color, index) => {
    const bandHeight = Math.ceil(TANK_HEIGHT / WATER_BANDS.length);

    graphics.rect(TANK_X + TANK_FRAME_THICKNESS, TANK_Y + TANK_FRAME_THICKNESS + bandHeight * index, TANK_WIDTH - TANK_FRAME_THICKNESS * 2, bandHeight).fill({ color });
  });

  graphics.rect(TANK_X + 24, TANK_Y + 24, 112, 12).fill({ color: mixColor(0xffffff, 0x061014, frameDarkness), alpha: lightsOn ? 0.11 + pulseAlpha * 0.035 : 0.035 });
  graphics.rect(TANK_X + TANK_WIDTH - 160, TANK_Y + 58, 82, 10).fill({ color: mixColor(0xffffff, 0x061014, frameDarkness), alpha: lightsOn ? 0.12 : 0.04 });
  graphics.rect(TANK_X + 22, waterBottom - 30, TANK_WIDTH - 44, 26).fill({ color: 0x12382d });
  graphics.rect(TANK_X + 22, waterBottom - 10, TANK_WIDTH - 44, 10).fill({ color: 0x1c4a32 });

  drawPixelRocks(graphics);
  drawGlassBorder(graphics, pulseAlpha, lightsOn);

  graphics.rect(TANK_X, BASE_Y, TANK_WIDTH, BASE_HEIGHT).fill({ color: mixColor(BASE_COLOR, 0x061014, baseDarkness) });
  graphics.rect(TANK_X, BASE_Y, TANK_WIDTH, 8).fill({ color: mixColor(0x6b8790, 0x061014, frameDarkness) });
  graphics.rect(TANK_X + 8, BASE_Y + BASE_HEIGHT - 14, TANK_WIDTH - 16, 8).fill({ color: mixColor(BASE_DARK_COLOR, 0x061014, baseDarkness) });
  graphics.rect(TANK_X, BASE_Y + BASE_HEIGHT, TANK_WIDTH, 12).fill({ color: 0x071014 });
}

/** 绘制玻璃外框和硬边像素高光。 */
function drawGlassBorder(graphics: Graphics, pulseAlpha: number, lightsOn: boolean): void {
  const frameDarkness = lightsOn ? 0 : 0.5;
  const frameAlpha = lightsOn ? 0.82 + pulseAlpha * 0.055 : 0.46;
  const innerHighlightAlpha = lightsOn ? 0.16 + pulseAlpha * 0.045 : 0.045;
  const glassColor = mixColor(GLASS_COLOR, 0x061014, frameDarkness);
  const highlightColor = mixColor(0xffffff, 0x061014, frameDarkness);
  const leftX = TANK_X;
  const rightX = TANK_X + TANK_WIDTH;
  const topY = TANK_Y;
  const lowerTopY = TANK_Y + TANK_CORNER_CUT;
  const bottomY = TANK_Y + TANK_HEIGHT;
  const thickness = TANK_FRAME_THICKNESS;

  graphics.rect(leftX + TANK_CORNER_CUT, topY, TANK_WIDTH - TANK_CORNER_CUT * 2, thickness).fill({ color: glassColor, alpha: frameAlpha });
  graphics.poly([
    leftX + TANK_CORNER_CUT, topY,
    leftX + TANK_CORNER_CUT, topY + thickness,
    leftX + thickness, lowerTopY,
    leftX, lowerTopY,
  ]).fill({ color: glassColor, alpha: frameAlpha });
  graphics.poly([
    rightX - TANK_CORNER_CUT, topY,
    rightX, lowerTopY,
    rightX - thickness, lowerTopY,
    rightX - TANK_CORNER_CUT, topY + thickness,
  ]).fill({ color: glassColor, alpha: frameAlpha });
  graphics.rect(leftX, lowerTopY, thickness, TANK_HEIGHT - TANK_CORNER_CUT).fill({ color: glassColor, alpha: frameAlpha });
  graphics.rect(rightX - thickness, lowerTopY, thickness, TANK_HEIGHT - TANK_CORNER_CUT).fill({ color: glassColor, alpha: frameAlpha });
  graphics.rect(leftX, bottomY - 12, TANK_WIDTH, 12).fill({ color: glassColor, alpha: frameAlpha });
  graphics.rect(leftX + TANK_CORNER_CUT + 8, topY + 12, TANK_WIDTH - TANK_CORNER_CUT * 2 - 16, 3).fill({ color: highlightColor, alpha: innerHighlightAlpha });
}

/** 绘制底砂上的像素石块。 */
function drawPixelRocks(graphics: Graphics): void {
  const rocks = [
    [96, 344, 30, 14, 0x315c50],
    [138, 352, 18, 10, 0x223d36],
    [740, 346, 42, 16, 0x315c50],
    [792, 356, 24, 10, 0x223d36],
    [470, 350, 34, 12, 0x315c50],
  ] as const;

  rocks.forEach(([x, y, width, height, color]) => {
    graphics.rect(x, y, width, height).fill({ color });
    graphics.rect(x + 4, y - 4, Math.max(width - 8, 4), 4).fill({ color: 0x4c7769 });
  });
}

/** 绘制关灯状态下位于物种下方的水体暗层，避免半透明层覆盖物种本体。 */
function drawLightsOutOverlay(graphics: Graphics, lightsOn: boolean): void {
  if (lightsOn) {
    return;
  }

  graphics.rect(TANK_X + 10, TANK_Y + 10, TANK_WIDTH - 20, TANK_HEIGHT - 22).fill({ color: 0x02070b, alpha: 0.58 });

  for (let y = TANK_Y + 18; y < TANK_Y + TANK_HEIGHT - 20; y += 18) {
    graphics.rect(TANK_X + 12, y, TANK_WIDTH - 24, 4).fill({ color: 0x000000, alpha: 0.08 });
  }

  graphics.rect(TANK_X + 26, TANK_Y + 24, 108, 8).fill({ color: 0xb7f0ff, alpha: 0.08 });
}

/** 绘制水族箱底座上的进度条和按钮占位。 */
function drawBaseUi(
  graphics: Graphics,
  status: AquariumStatus,
  pulseAlpha: number,
  bubbleButtonUnlocked: boolean,
  lightButtonUnlocked: boolean,
  shakeButtonUnlocked: boolean,
  lightsOn: boolean,
  shakeProgress: number,
): void {
  const fillWidth = Math.floor((BASE_PROGRESS_WIDTH - 8) * status.cycleProgressRatio);

  drawMarqueeSlot(graphics);
  graphics.rect(BASE_PROGRESS_X, BASE_PROGRESS_Y, BASE_PROGRESS_WIDTH, BASE_PROGRESS_HEIGHT).fill({ color: 0x061014 });
  graphics.rect(BASE_PROGRESS_X, BASE_PROGRESS_Y, BASE_PROGRESS_WIDTH, 3).fill({ color: 0x4b6670 });
  graphics.rect(BASE_PROGRESS_X + 4, BASE_PROGRESS_Y + 4, fillWidth, BASE_PROGRESS_HEIGHT - 8).fill({ color: 0x59d6ff });
  graphics.rect(BASE_PROGRESS_X + 4, BASE_PROGRESS_Y + 4, Math.max(fillWidth - 10, 0), 3).fill({ color: 0xffe66d, alpha: 0.66 + pulseAlpha * 0.06 });
  drawManualProgressButton(graphics, pulseAlpha);

  if (lightButtonUnlocked) {
    drawLightButton(graphics, pulseAlpha, lightsOn);
  }

  if (bubbleButtonUnlocked) {
    drawBubbleButton(graphics, pulseAlpha);
  }

  if (shakeButtonUnlocked) {
    drawShakeButton(graphics, pulseAlpha, shakeProgress);
  }
}

/** 绘制跑马灯文字位的像素风槽位。 */
function drawMarqueeSlot(graphics: Graphics): void {
  graphics.rect(MARQUEE_X, MARQUEE_Y, MARQUEE_WIDTH, MARQUEE_HEIGHT).fill({ color: 0x071014 });
  graphics.rect(MARQUEE_X, MARQUEE_Y, MARQUEE_WIDTH, 3).fill({ color: 0x45646c });
  graphics.rect(MARQUEE_X, MARQUEE_Y + MARQUEE_HEIGHT - 3, MARQUEE_WIDTH, 3).fill({ color: 0x0d2229 });
  graphics.rect(MARQUEE_X, MARQUEE_Y, 3, MARQUEE_HEIGHT).fill({ color: 0x45646c });
  graphics.rect(MARQUEE_X + MARQUEE_WIDTH - 3, MARQUEE_Y, 3, MARQUEE_HEIGHT).fill({ color: 0x0d2229 });
}

/** 绘制底座上的手动累计按钮。 */
function drawManualProgressButton(graphics: Graphics, pulseAlpha: number): void {
  graphics.rect(MANUAL_BUTTON_X, MANUAL_BUTTON_Y, MANUAL_BUTTON_SIZE, MANUAL_BUTTON_SIZE).fill({ color: 0x233f49 });
  graphics.rect(MANUAL_BUTTON_X, MANUAL_BUTTON_Y, MANUAL_BUTTON_SIZE, 5).fill({ color: 0x6b8790, alpha: 0.84 + pulseAlpha * 0.04 });
  graphics.rect(MANUAL_BUTTON_X + 5, MANUAL_BUTTON_Y + 5, MANUAL_BUTTON_SIZE - 10, MANUAL_BUTTON_SIZE - 10).fill({ color: 0x172932 });
  graphics.rect(MANUAL_BUTTON_X + 18, MANUAL_BUTTON_Y + 11, 6, 20).fill({ color: 0x59d6ff });
  graphics.rect(MANUAL_BUTTON_X + 11, MANUAL_BUTTON_Y + 18, 20, 6).fill({ color: 0xffe66d });
}

/** 绘制底座右侧已解锁的气泡按钮。 */
function drawBubbleButton(graphics: Graphics, pulseAlpha: number): void {
  const iconAlpha = 0.9 + pulseAlpha * 0.035;

  graphics.rect(BUBBLE_BUTTON_X, BUBBLE_BUTTON_Y, BUBBLE_BUTTON_SIZE, BUBBLE_BUTTON_SIZE).fill({ color: 0x233f49 });
  graphics.rect(BUBBLE_BUTTON_X, BUBBLE_BUTTON_Y, BUBBLE_BUTTON_SIZE, 5).fill({ color: 0x6b8790, alpha: 0.75 });
  graphics.rect(BUBBLE_BUTTON_X + 5, BUBBLE_BUTTON_Y + 5, BUBBLE_BUTTON_SIZE - 10, BUBBLE_BUTTON_SIZE - 10).fill({ color: 0x10252d });
  drawPixelBubble(graphics, BUBBLE_BUTTON_X + 14, BUBBLE_BUTTON_Y + 22, 9, iconAlpha);
  drawPixelBubble(graphics, BUBBLE_BUTTON_X + 25, BUBBLE_BUTTON_Y + 13, 7, iconAlpha * 0.9);
  drawPixelBubble(graphics, BUBBLE_BUTTON_X + 23, BUBBLE_BUTTON_Y + 29, 5, iconAlpha * 0.78);
}

/** 绘制底座右侧已解锁的开关灯按钮。 */
function drawLightButton(graphics: Graphics, pulseAlpha: number, lightsOn: boolean): void {
  const shellColor = lightsOn ? 0x2a4650 : 0x172932;
  const bulbColor = lightsOn ? 0xffe66d : 0x6b8790;
  const glowAlpha = lightsOn ? 0.32 + pulseAlpha * 0.045 : 0.08;

  graphics.rect(LIGHT_BUTTON_X, LIGHT_BUTTON_Y, LIGHT_BUTTON_SIZE, LIGHT_BUTTON_SIZE).fill({ color: 0x233f49 });
  graphics.rect(LIGHT_BUTTON_X, LIGHT_BUTTON_Y, LIGHT_BUTTON_SIZE, 5).fill({ color: 0x6b8790, alpha: 0.75 });
  graphics.rect(LIGHT_BUTTON_X + 5, LIGHT_BUTTON_Y + 5, LIGHT_BUTTON_SIZE - 10, LIGHT_BUTTON_SIZE - 10).fill({ color: shellColor });
  graphics.rect(LIGHT_BUTTON_X + 16, LIGHT_BUTTON_Y + 11, 10, 10).fill({ color: bulbColor, alpha: 0.92 });
  graphics.rect(LIGHT_BUTTON_X + 13, LIGHT_BUTTON_Y + 15, 16, 6).fill({ color: bulbColor, alpha: glowAlpha });
  graphics.rect(LIGHT_BUTTON_X + 18, LIGHT_BUTTON_Y + 22, 6, 8).fill({ color: 0xd8fbff, alpha: lightsOn ? 0.72 : 0.28 });
  graphics.rect(LIGHT_BUTTON_X + 15, LIGHT_BUTTON_Y + 30, 12, 3).fill({ color: 0x0a1519, alpha: 0.9 });
}

/** 绘制底座右侧已解锁的震动按钮。 */
function drawShakeButton(graphics: Graphics, pulseAlpha: number, shakeProgress: number): void {
  const activeAlpha = shakeProgress > 0 ? 0.18 + shakeProgress * 0.28 : 0;
  const iconColor = shakeProgress > 0 ? 0xffe66d : 0x59d6ff;
  const innerColor = shakeProgress > 0 ? 0x2e4650 : 0x10252d;

  graphics.rect(SHAKE_BUTTON_X, SHAKE_BUTTON_Y, SHAKE_BUTTON_SIZE, SHAKE_BUTTON_SIZE).fill({ color: 0x233f49 });
  graphics.rect(SHAKE_BUTTON_X, SHAKE_BUTTON_Y, SHAKE_BUTTON_SIZE, 5).fill({ color: 0x6b8790, alpha: 0.75 + pulseAlpha * 0.035 });
  graphics.rect(SHAKE_BUTTON_X + 5, SHAKE_BUTTON_Y + 5, SHAKE_BUTTON_SIZE - 10, SHAKE_BUTTON_SIZE - 10).fill({ color: innerColor });
  graphics.rect(SHAKE_BUTTON_X + 16, SHAKE_BUTTON_Y + 13, 16, 13).fill({ color: iconColor, alpha: 0.9 });
  graphics.rect(SHAKE_BUTTON_X + 14, SHAKE_BUTTON_Y + 16, 3, 13).fill({ color: iconColor, alpha: 0.9 });
  graphics.rect(SHAKE_BUTTON_X + 31, SHAKE_BUTTON_Y + 10, 3, 13).fill({ color: iconColor, alpha: 0.9 });
  graphics.rect(SHAKE_BUTTON_X + 18, SHAKE_BUTTON_Y + 16, 12, 7).fill({ color: 0x10252d, alpha: 0.58 });
  graphics.rect(SHAKE_BUTTON_X + 18, SHAKE_BUTTON_Y + 27, 10, 3).fill({ color: 0xd8fbff, alpha: 0.66 + activeAlpha });
  graphics.rect(SHAKE_BUTTON_X + 8, SHAKE_BUTTON_Y + 12, 3, 4).fill({ color: 0xd8fbff, alpha: 0.58 + activeAlpha });
  graphics.rect(SHAKE_BUTTON_X + 5, SHAKE_BUTTON_Y + 19, 3, 5).fill({ color: 0xd8fbff, alpha: 0.72 + activeAlpha });
  graphics.rect(SHAKE_BUTTON_X + 8, SHAKE_BUTTON_Y + 28, 3, 4).fill({ color: 0xd8fbff, alpha: 0.58 + activeAlpha });
  graphics.rect(SHAKE_BUTTON_X + 36, SHAKE_BUTTON_Y + 12, 3, 4).fill({ color: 0xd8fbff, alpha: 0.58 + activeAlpha });
  graphics.rect(SHAKE_BUTTON_X + 39, SHAKE_BUTTON_Y + 19, 3, 5).fill({ color: 0xd8fbff, alpha: 0.72 + activeAlpha });
  graphics.rect(SHAKE_BUTTON_X + 36, SHAKE_BUTTON_Y + 28, 3, 4).fill({ color: 0xd8fbff, alpha: 0.58 + activeAlpha });
}

/** 绘制当前鱼缸内的去重物种，先画背后弱光再画不透明本体。 */
function drawTankFish(graphics: Graphics, visibleFish: VisibleTankFishState[], now: number, fishMotionNow: number, lightsOn: boolean): void {
  const drawItems = createTankFishDrawItems(visibleFish, now, fishMotionNow, lightsOn);

  drawBioluminescentFishGlow(graphics, drawItems, now, lightsOn);
  drawItems.forEach((item) => {
    drawPixelSpecies(
      graphics,
      item.fish,
      item.x,
      item.y,
      item.scale,
      item.facingRight,
      item.darkness,
    );
  });
}

/** 生成本帧物种绘制项，并按垂直位置排序减少重叠时的前后关系混乱。 */
function createTankFishDrawItems(visibleFish: VisibleTankFishState[], now: number, fishMotionNow: number, lightsOn: boolean): TankFishDrawItem[] {
  return visibleFish
    .map((state) => {
      const visual = getTankFishTransitionVisual(state, now);
      const placement = getTankFishPlacement(state.fish, state.slotIndex, fishMotionNow);
      const scale = placement.scale * visual.scale;
      const x = placement.x + visual.xOffset;
      const y = placement.y + visual.yOffset;

      return {
        fish: placement.fish,
        x,
        y,
        scale,
        facingRight: placement.facingRight,
        darkness: getTankFishDarkness(placement.fish, visual.darkness, lightsOn),
        visualDarkness: visual.darkness,
        sortY: getTankFishSortY(placement.fish, y, scale, placement.facingRight),
        depthBand: getTankFishDepthBand(placement.fish, y, scale, placement.facingRight),
        slotIndex: state.slotIndex,
      };
    })
    .sort(compareTankFishDrawItems);
}

/** 计算物种绘制排序用的底部位置，让更靠下的物种压在更靠上的物种前面。 */
function getTankFishSortY(fish: FishGalleryItem, y: number, scale: number, facingRight: boolean): number {
  const unit = getPixelUnit(scale);
  const bounds = getFishVisualPixelBounds(fish, facingRight);

  return y + bounds.maxY * unit;
}

/** 计算稳定深度带，避免相近物种因游动中的细微底边变化反复交换层级。 */
function getTankFishDepthBand(fish: FishGalleryItem, y: number, scale: number, facingRight: boolean): number {
  return Math.floor(getTankFishSortY(fish, y, scale, facingRight) / TANK_FISH_DEPTH_BAND_HEIGHT);
}

/** 按深度带和固定槽位排序，保证重叠物种的前后关系在移动中稳定。 */
function compareTankFishDrawItems(left: TankFishDrawItem, right: TankFishDrawItem): number {
  if (left.depthBand !== right.depthBand) {
    return left.depthBand - right.depthBand;
  }

  if (left.slotIndex !== right.slotIndex) {
    return left.slotIndex - right.slotIndex;
  }

  return left.fish.id.localeCompare(right.fish.id);
}

/** 合成物种过渡和关灯暗化强度，保持物种绘制本身不依赖透明度。 */
function getTankFishDarkness(fish: FishGalleryItem, transitionDarkness: number, lightsOn: boolean): number {
  if (lightsOn) {
    return transitionDarkness;
  }

  const lightsOutDarkness = isBioluminescentFish(fish)
    ? LIGHTS_OUT_BIOLUMINESCENT_DARKNESS
    : LIGHTS_OUT_SPECIES_DARKNESS;

  return Math.max(transitionDarkness, lightsOutDarkness);
}

/** 计算物种在水族箱中的位置、朝向和体型，底栖物种会在底部活动带内分散。 */
function getTankFishPlacement(fish: FishGalleryItem, index: number, now: number): TankFishPlacement {
  const seed = getHashInt(fish.id);
  const scale = getFishScale(fish);
  const bottomDweller = isBottomDwellingFish(fish);
  const lane = index % 6;
  const row = Math.floor(index / 6);
  const movement = getFishMovementProfile(fish, seed);
  const swim = getPingPongSwim(now * movement.speed + seed, movement.distance);
  const rawX = Math.round(TANK_X + movement.left + swim.travel);
  const rawY = bottomDweller
    ? getBottomDwellerY(fish, scale, seed, now)
    : getOpenWaterFishY(fish, lane, row, seed, now);
  const boundedPosition = clampFishPlacementToTank(fish, rawX, rawY, scale, swim.facingRight);

  return {
    fish,
    x: boundedPosition.x,
    y: boundedPosition.y,
    scale,
    facingRight: fish.silhouette === "shellfish" ? seed % 2 === 0 : swim.facingRight,
  };
}

/** 读取物种在水族箱中的横向活动方式，让贝类近似静止、海参缓慢爬行。 */
function getFishMovementProfile(fish: FishGalleryItem, seed: number): { speed: number; distance: number; left: number } {
  if (fish.silhouette === "shellfish") {
    return {
      speed: 0.0014 + (seed % 3) * 0.0002,
      distance: 18 + (seed % 14),
      left: 96 + (seed % 52),
    };
  }

  if (fish.silhouette === "seaCucumber") {
    return {
      speed: 0.0035 + (seed % 4) * 0.0004,
      distance: 86 + (seed % 36),
      left: 92 + (seed % 28),
    };
  }

  if (isBottomDwellingFish(fish)) {
    return {
      speed: 0.009 + (seed % 5) * 0.0015,
      distance: TANK_WIDTH - 190,
      left: 84,
    };
  }

  return {
    speed: 0.018 + (seed % 8) * 0.002,
    distance: TANK_WIDTH - 170,
    left: 76,
  };
}

/** 计算非底栖物种的纵向活动层，给底部生态位预留空间。 */
function getOpenWaterFishY(fish: FishGalleryItem, lane: number, row: number, seed: number, now: number): number {
  const layer = getOpenWaterLayer(fish);
  const shiftedLane = (lane + (seed % 3)) % 6;
  const crossLayerOffset = (Math.floor(seed / 17) % layer.crossRange) - Math.floor(layer.crossRange / 2);
  const baseY = TANK_Y + layer.top + shiftedLane * layer.spacing + row * layer.rowOffset + crossLayerOffset;
  const bob = Math.sin(now / layer.bobDuration + seed) * layer.bobRange;

  return Math.round(clampNumber(baseY + bob, TANK_Y + layer.top, TANK_Y + layer.bottom));
}

/** 按轮廓读取开放水域活动层，活动范围越大的物种越少进入底部区域。 */
function getOpenWaterLayer(fish: FishGalleryItem): { top: number; bottom: number; spacing: number; rowOffset: number; bobRange: number; bobDuration: number; crossRange: number } {
  if (isUpperCruisingFish(fish)) {
    return { top: 50, bottom: 272, spacing: 32, rowOffset: 13, bobRange: 9, bobDuration: 720, crossRange: 64 };
  }

  if (isMidLowCruisingFish(fish)) {
    return { top: 70, bottom: 336, spacing: 36, rowOffset: 14, bobRange: 9, bobDuration: 680, crossRange: 76 };
  }

  return { top: 56, bottom: 330, spacing: 38, rowOffset: 14, bobRange: 10, bobDuration: 620, crossRange: 84 };
}

/** 判断是否属于上中层巡游物种，避免大型或宽翼物种压到底部。 */
function isUpperCruisingFish(fish: FishGalleryItem): boolean {
  return (
    fish.rarity === "legendary"
    || fish.silhouette === "aoFish"
    || fish.silhouette === "billfish"
    || fish.silhouette === "dolphin"
    || fish.silhouette === "flyingFish"
    || fish.silhouette === "hammerhead"
    || fish.silhouette === "mantaRay"
    || fish.silhouette === "seal"
    || fish.silhouette === "seaLion"
    || fish.silhouette === "shark"
    || fish.silhouette === "tuna"
    || fish.silhouette === "wenyaoFish"
    || fish.silhouette === "whale"
  );
}

/** 判断是否属于中下层巡游物种，允许靠近底部但不进入底栖保留带。 */
function isMidLowCruisingFish(fish: FishGalleryItem): boolean {
  return (
    fish.silhouette === "anglerfish"
    || fish.silhouette === "chimaera"
    || fish.silhouette === "coelacanth"
    || fish.silhouette === "eel"
    || fish.silhouette === "ghostFish"
    || fish.silhouette === "ray"
    || fish.silhouette === "ribbonfish"
    || fish.silhouette === "stingray"
  );
}

/** 把物种坐标限制在水族箱水体内，避免移动时边缘越出玻璃框。 */
function clampFishPlacementToTank(fish: FishGalleryItem, x: number, y: number, scale: number, facingRight: boolean): { x: number; y: number } {
  const unit = getPixelUnit(scale);
  const bounds = getFishVisualPixelBounds(fish, facingRight);

  return {
    x: clampNumber(x, TANK_CONTENT_MIN_X - bounds.minX * unit, TANK_CONTENT_MAX_X - bounds.maxX * unit),
    y: clampNumber(y, TANK_CONTENT_MIN_Y - bounds.minY * unit, TANK_CONTENT_MAX_Y - bounds.maxY * unit),
  };
}

/** 判断物种是否应靠近水族箱底部活动。 */
function isBottomDwellingFish(fish: FishGalleryItem): boolean {
  return (
    fish.silhouette === "crab"
    || fish.silhouette === "flounder"
    || fish.silhouette === "horseshoeCrab"
    || fish.silhouette === "kingCrab"
    || fish.silhouette === "lobster"
    || fish.silhouette === "mantisShrimp"
    || fish.silhouette === "salamander"
    || fish.silhouette === "seaCucumber"
    || fish.silhouette === "seaSlug"
    || fish.silhouette === "seaUrchin"
    || fish.silhouette === "shellfish"
    || fish.silhouette === "shrimp"
    || fish.silhouette === "starfish"
  );
}

/** 计算底栖物种的纵向位置，让它们分散在底部活动带而不是挤在同一条底线。 */
function getBottomDwellerY(fish: FishGalleryItem, scale: number, seed: number, now: number): number {
  const unit = getPixelUnit(scale);
  const bottomOffsetUnits = getBottomDwellerOffsetUnits(fish);
  const bandHeight = getBottomDwellerBandHeight(fish);
  const bandOffset = seed % bandHeight;
  const bottomTarget = TANK_Y + TANK_HEIGHT - 48 - bandOffset;
  const idleBob = Math.sin(now / 900 + seed) * 2;

  return Math.round(bottomTarget - unit * bottomOffsetUnits + idleBob);
}

/** 读取底栖物种可活动的底部纵向带宽，虾蟹分散更明显，海星仍更贴近底砂。 */
function getBottomDwellerBandHeight(fish: FishGalleryItem): number {
  if (fish.silhouette === "seaUrchin" || fish.silhouette === "shellfish" || fish.silhouette === "starfish") {
    return 8;
  }

  if (fish.silhouette === "flounder" || fish.silhouette === "horseshoeCrab" || fish.silhouette === "seaCucumber" || fish.silhouette === "seaSlug" || fish.silhouette === "kingCrab") {
    return 14;
  }

  if (fish.silhouette === "lobster" || fish.silhouette === "mantisShrimp" || fish.silhouette === "salamander" || fish.silhouette === "shrimp") {
    return 34;
  }

  return 24;
}

/** 读取底栖物种的贴底偏移，按像素轮廓底部高度微调。 */
function getBottomDwellerOffsetUnits(fish: FishGalleryItem): number {
  if (fish.silhouette === "seaUrchin" || fish.silhouette === "shellfish" || fish.silhouette === "starfish") {
    return 5;
  }

  if (fish.silhouette === "lobster" || fish.silhouette === "mantisShrimp" || fish.silhouette === "salamander" || fish.silhouette === "seaCucumber" || fish.silhouette === "seaSlug" || fish.silhouette === "shrimp") {
    return 3;
  }

  if (fish.silhouette === "flounder" || fish.silhouette === "horseshoeCrab") {
    return 4;
  }

  return 4;
}

/** 关灯后在鱼本体下方补一层弱像素光，避免半透明光斑盖到其他鱼身上。 */
function drawBioluminescentFishGlow(graphics: Graphics, drawItems: TankFishDrawItem[], now: number, lightsOn: boolean): void {
  if (lightsOn) {
    return;
  }

  drawItems.forEach((item) => {
    const fish = item.fish;

    if (!isBioluminescentFish(fish)) {
      return;
    }

    const seed = getHashInt(`glow:${fish.id}`);
    const pulse = 0.84 + Math.sin(now / 560 + seed) * 0.2;
    const glowAlpha = pulse * (1 - item.visualDarkness * 0.7);

    drawFragmentedBioluminescentGlow(graphics, fish, item.x, item.y, item.scale, item.facingRight, glowAlpha, seed);
  });
}

/** 按物种自身像素轮廓绘制克制的背后光斑，鱼本体会随后以不透明像素覆盖它。 */
function drawFragmentedBioluminescentGlow(graphics: Graphics, fish: FishGalleryItem, x: number, y: number, scale: number, facingRight: boolean, alpha: number, seed: number): void {
  const unit = getPixelUnit(scale);
  const glowRects = getFishVisualPixelRects(fish, facingRight).filter((pixelRect) => isGlowSourcePixel(pixelRect.color));

  glowRects.forEach((pixelRect, index) => {
    const outerAlpha = (index + seed) % 3 === 0 ? 0.078 : 0.052;

    graphics
      .rect(x + (pixelRect.x - 1) * unit, y + (pixelRect.y - 1) * unit, (pixelRect.width + 2) * unit, (pixelRect.height + 2) * unit)
      .fill({ color: fish.accentColor, alpha: outerAlpha * alpha });
  });
}

/** 判断某个像素色块是否适合作为发光源，排除眼睛等深色细节。 */
function isGlowSourcePixel(color: number): boolean {
  return color !== 0x061014 && color !== 0x000000;
}

/** 判断物种在关灯时是否应该保留发光表现。 */
function isBioluminescentFish(fish: FishGalleryItem): boolean {
  return (
    fish.silhouette === "anglerfish"
    || fish.silhouette === "aoFish"
    || fish.silhouette === "ghostFish"
    || fish.silhouette === "jellyfish"
    || fish.silhouette === "skeletonFish"
    || fish.silhouette === "squid"
    || fish.silhouette === "wenyaoFish"
    || BIOLUMINESCENT_NAME_MARKERS.some((marker) => fish.name.includes(marker))
  );
}

/** 判断展示池内是否还有正在进出场的物种，避免同时超过上限。 */
function hasActiveTankFishTransition(states: Map<FishId, VisibleTankFishState>): boolean {
  return [...states.values()].some((state) => state.phase !== "visible");
}

/** 读取物种被轮换隐藏的权重，普通更容易退出，近期获得的物种降低权重。 */
function getTankFishHideWeight(fish: FishGalleryItem, now: number): number {
  const baseWeight = RARITY_HIDE_WEIGHTS[fish.rarity] ?? RARITY_HIDE_WEIGHTS.common;
  const recentlyOpened = Boolean(fish.lastOpenedAt && now - fish.lastOpenedAt < 60_000);

  return recentlyOpened ? Math.max(Math.floor(baseWeight / 3), 1) : baseWeight;
}

/** 根据物种 ID 固定进出场方向，避免每次轮换左右飘动不一致。 */
function getTankFishTransitionDirection(fishId: FishId): number {
  return getHashInt(`transition:${fishId}`) % 2 === 0 ? 1 : -1;
}

/** 计算物种进出场时的缩放、位移和不透明暗化强度。 */
function getTankFishTransitionVisual(state: VisibleTankFishState, now: number): { darkness: number; scale: number; xOffset: number; yOffset: number } {
  if (state.phase === "visible") {
    return {
      darkness: 0,
      scale: 1,
      xOffset: 0,
      yOffset: 0,
    };
  }

  const progress = Math.min(Math.max((now - state.transitionStartedAt) / TANK_FISH_TRANSITION_MS, 0), 1);

  if (state.phase === "entering") {
    const eased = easeOutQuad(progress);

    return {
      darkness: (1 - eased) * 0.42,
      scale: 0.68 + eased * 0.32,
      xOffset: Math.round((1 - eased) * state.transitionDirection * 20),
      yOffset: Math.round((1 - eased) * 7),
    };
  }

  const eased = easeInQuad(progress);

  return {
    darkness: eased * 0.58,
    scale: 1 - eased * 0.32,
    xOffset: Math.round(eased * state.transitionDirection * 20),
    yOffset: Math.round(eased * 7),
  };
}

/** 绘制水族箱中持续存在的轻量环境气泡。 */
function drawAmbientBubbles(graphics: Graphics, now: number): void {
  for (let index = 0; index < AMBIENT_BUBBLE_COUNT; index += 1) {
    const seed = getHashInt(`ambient:${index}`);
    const speed = 0.018 + (seed % 7) * 0.002;
    const travel = (now * speed + seed) % (TANK_HEIGHT - 66);
    const wobble = Math.sin(now / (760 + (seed % 300)) + seed) * (4 + (seed % 5));
    const x = TANK_X + 42 + (seed % (TANK_WIDTH - 84)) + wobble;
    const y = TANK_Y + TANK_HEIGHT - 44 - travel;
    const size = 4 + (seed % 4) * 2;
    const alpha = 0.14 + (seed % 5) * 0.018;

    drawPixelBubble(graphics, x, y, size, alpha);
  }
}

/** 绘制用户点击气泡按钮后产生的一次性气泡粒子。 */
function drawBurstBubbles(graphics: Graphics, bubbles: BubbleParticle[], now: number): void {
  bubbles.forEach((bubble) => {
    const elapsed = now - bubble.startedAt;
    const progress = Math.min(Math.max(elapsed / bubble.duration, 0), 1);
    const alpha = (1 - progress) * 0.72;
    const { x, y } = getBurstBubblePosition(bubble, now);

    if (!isBubbleInsideTankTop(y)) {
      return;
    }

    drawPixelBubble(graphics, x, y, bubble.size, alpha);
  });
}

/** 计算一次性气泡粒子当前坐标，让绘制和清理使用同一套轨迹。 */
function getBurstBubblePosition(bubble: BubbleParticle, now: number): { x: number; y: number } {
  const elapsed = now - bubble.startedAt;
  const progress = Math.min(Math.max(elapsed / bubble.duration, 0), 1);

  return {
    x: bubble.x + Math.sin(progress * 8 + bubble.seed) * 9 + bubble.drift * elapsed,
    y: bubble.y - progress * bubble.speed * bubble.duration,
  };
}

/** 判断气泡顶部是否仍在水族箱内部，避免越过玻璃上沿后才消失。 */
function isBubbleInsideTankTop(y: number): boolean {
  return y >= BUBBLE_TOP_LIMIT_Y;
}

/** 绘制进度条内触发的加号上浮反馈。 */
function drawProgressPopups(graphics: Graphics, popups: ProgressPopup[], now: number): void {
  popups.forEach((popup) => {
    const elapsed = now - popup.startedAt;
    const progress = Math.min(Math.max(elapsed / popup.duration, 0), 1);
    const rise = easeOutCubic(progress) * PROGRESS_POPUP_RISE;
    const wobble = Math.sin(progress * 4 + popup.seed) * 2;
    const alpha = Math.max(1 - progress, 0);

    drawPixelPlus(graphics, popup.x + wobble, popup.y - rise, alpha);
  });
}

/** 创建进度条加号粒子，横向位置在进度条槽位内随机分布。 */
function createProgressPopup(now: number, sequence: number): ProgressPopup {
  const seed = getHashInt(`progress-popup:${now}:${sequence}`);
  const xRange = Math.max(BASE_PROGRESS_WIDTH - PROGRESS_POPUP_WIDTH - 12, 1);

  return {
    x: BASE_PROGRESS_X + 6 + (seed % xRange),
    y: BASE_PROGRESS_Y + 3,
    seed,
    startedAt: now,
    duration: PROGRESS_POPUP_DURATION_MS,
  };
}

/** 绘制像素风加号，使用硬边色块避免抗锯齿。 */
function drawPixelPlus(graphics: Graphics, x: number, y: number, alpha: number): void {
  const left = Math.round(x);
  const top = Math.round(y);

  drawPixelPlusGlyph(graphics, left + 1, top + 1, 0x061014, alpha * 0.45);
  drawPixelPlusGlyph(graphics, left, top, 0xfff0a0, alpha);
  graphics.rect(left, top, 4, 2).fill({ color: 0xffffff, alpha: alpha * 0.42 });
}

/** 绘制加号的基础像素字形。 */
function drawPixelPlusGlyph(graphics: Graphics, x: number, y: number, color: number, alpha: number): void {
  graphics.rect(x + 4, y, 3, 11).fill({ color, alpha });
  graphics.rect(x, y + 4, 11, 3).fill({ color, alpha });
}

/** 每次点击时在水体内挑选几个临时出泡点，让气泡不固定在同一角落。 */
function createBubbleBurstSources(now: number): BubbleBurstSource[] {
  const seed = getHashInt(`burst-sources:${now}`);
  const sourceCount = BUBBLE_BURST_SOURCE_MIN + (seed % (BUBBLE_BURST_SOURCE_MAX - BUBBLE_BURST_SOURCE_MIN + 1));

  return Array.from({ length: sourceCount }, (_, index) => {
    const sourceSeed = getHashInt(`burst-source:${now}:${index}`);
    const xRange = TANK_WIDTH - BUBBLE_BURST_MARGIN_X * 2;
    const yRange = BUBBLE_BURST_MAX_Y - BUBBLE_BURST_MIN_Y;

    return {
      x: TANK_X + BUBBLE_BURST_MARGIN_X + (sourceSeed % xRange),
      y: BUBBLE_BURST_MIN_Y + (Math.floor(sourceSeed / 97) % yRange),
    };
  });
}

/** 创建一颗用户气泡粒子，位置和速度使用时间种子保持自然差异。 */
function createBubbleParticle(now: number, index: number, sources: BubbleBurstSource[]): BubbleParticle {
  const seed = getHashInt(`burst:${now}:${index}`);
  const source = sources[index % sources.length] ?? { x: TANK_X + TANK_WIDTH / 2, y: BUBBLE_BURST_MAX_Y };
  const horizontalOffset = (seed % 37) - 18;
  const verticalOffset = (Math.floor(seed / 11) % 19) - 9;

  return {
    x: source.x + horizontalOffset,
    y: source.y + verticalOffset,
    size: 5 + (seed % 5) * 2,
    speed: 0.052 + (seed % 9) * 0.004,
    drift: ((Math.floor(seed / 17) % 21) - 10) / 1000,
    seed,
    startedAt: now + index * 12,
    duration: 2400 + (seed % 900),
  };
}

/** 创建一次键盘或累计按钮触发的小气泡，横向位置覆盖鱼缸内部但数量保持克制。 */
function createProgressBubbleParticle(now: number, index: number, sequence: number): BubbleParticle {
  const seed = getHashInt(`progress-bubble:${now}:${sequence}:${index}`);
  const xRange = Math.max(TANK_WIDTH - PROGRESS_BUBBLE_MARGIN_X * 2, 1);
  const x = TANK_X + PROGRESS_BUBBLE_MARGIN_X + (seed % xRange);
  const yOffset = Math.floor(seed / 23) % 18;

  return {
    x,
    y: PROGRESS_BUBBLE_BASE_Y - yOffset,
    size: 4 + (seed % 3) * 2,
    speed: 0.038 + (seed % 5) * 0.003,
    drift: ((Math.floor(seed / 31) % 17) - 8) / 1400,
    seed,
    startedAt: now + index * 28,
    duration: 1800 + (seed % 520),
  };
}

/** 绘制硬边像素气泡，避免柔边和抗锯齿质感。 */
function drawPixelBubble(graphics: Graphics, x: number, y: number, size: number, alpha: number): void {
  const pixelSize = Math.max(Math.round(size), 3);
  const left = Math.round(x);
  const top = Math.round(y);

  graphics.rect(left, top, pixelSize, pixelSize).fill({ color: 0xd8fbff, alpha: alpha * 0.1 });
  graphics.rect(left, top, pixelSize, 2).fill({ color: 0xd8fbff, alpha });
  graphics.rect(left, top, 2, pixelSize).fill({ color: 0xd8fbff, alpha: alpha * 0.86 });
  graphics.rect(left + pixelSize - 2, top, 2, pixelSize).fill({ color: 0x8eeeff, alpha: alpha * 0.64 });
  graphics.rect(left, top + pixelSize - 2, pixelSize, 2).fill({ color: 0x8eeeff, alpha: alpha * 0.54 });
  graphics.rect(left + 2, top + 2, 2, 2).fill({ color: 0xffffff, alpha: Math.min(alpha * 1.1, 0.9) });
}

/** 计算鱼在水平方向的折返游动位置和朝向。 */
function getPingPongSwim(rawPhase: number, distance: number): { travel: number; facingRight: boolean } {
  const fullDistance = Math.max(distance, 1);
  const phase = rawPhase % (fullDistance * 2);

  if (phase <= fullDistance) {
    return {
      travel: phase,
      facingRight: true,
    };
  }

  return {
    travel: fullDistance * 2 - phase,
    facingRight: false,
  };
}

/** 把数值限制在闭区间内，用于水族箱内部坐标约束。 */
function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** 根据稀有度、物种轮廓和单独倍率给水族箱物种区分体型。 */
function getFishScale(fish: FishGalleryItem): number {
  const rarityScale = getRarityFishScale(fish.rarity);
  const silhouetteScale = getSilhouetteFishScale(fish);

  return rarityScale * silhouetteScale * (fish.scaleMultiplier ?? 1);
}

/** 根据稀有度读取基础体型倍率。 */
function getRarityFishScale(rarity: FishGalleryItem["rarity"]): number {
  if (rarity === "legendary") {
    return 1.22;
  }

  if (rarity === "curio") {
    return 1.12;
  }

  if (rarity === "rare") {
    return 1.04;
  }

  return 0.98;
}

/** 根据物种剪影读取体型微调倍率，让大型或细长物种更符合直觉。 */
function getSilhouetteFishScale(fish: FishGalleryItem): number {
  if (fish.silhouette === "whale") {
    return 1.06;
  }

  if (fish.silhouette === "aoFish" || fish.silhouette === "mantaRay" || fish.silhouette === "seal" || fish.silhouette === "seaLion" || fish.silhouette === "sunfish" || fish.silhouette === "kingCrab" || fish.silhouette === "wenyaoFish") {
    return 1.05;
  }

  if (fish.silhouette === "billfish" || fish.silhouette === "chimaera" || fish.silhouette === "coelacanth" || fish.silhouette === "hammerhead" || fish.silhouette === "shark" || fish.silhouette === "tuna" || fish.silhouette === "turtle") {
    return 1.03;
  }

  if (fish.silhouette === "flounder" || fish.silhouette === "horseshoeCrab" || fish.silhouette === "stingray") {
    return 1.02;
  }

  if (fish.silhouette === "barracuda" || fish.silhouette === "eel" || fish.silhouette === "lobster" || fish.silhouette === "mantisShrimp" || fish.silhouette === "salamander" || fish.silhouette === "seaCucumber" || fish.silhouette === "seaDragon" || fish.silhouette === "seaSlug" || fish.silhouette === "seaUrchin" || fish.silhouette === "shellfish" || fish.silhouette === "shrimp" || fish.silhouette === "ribbonfish") {
    return 0.97;
  }

  return 1;
}

/** 使用共享像素矩形绘制不透明物种，保证水族箱和图鉴图样一致。 */
function drawPixelSpecies(graphics: Graphics, fish: FishGalleryItem, x: number, y: number, scale: number, facingRight: boolean, darkness = 0): void {
  const unit = getPixelUnit(scale);
  const darknessRatio = clampNumber(darkness, 0, 0.86);

  getFishVisualPixelRects(fish, facingRight).forEach((pixelRect) => {
    graphics
      .rect(x + pixelRect.x * unit, y + pixelRect.y * unit, pixelRect.width * unit, pixelRect.height * unit)
      .fill({ color: mixColor(pixelRect.color, 0x061014, darknessRatio) });
  });
}

/** 按比例混合两个颜色，用于不改变透明度的变暗动画。 */
function mixColor(color: number, targetColor: number, ratio: number): number {
  const clampedRatio = clampNumber(ratio, 0, 1);
  const inverseRatio = 1 - clampedRatio;
  const red = Math.round(((color >> 16) & 0xff) * inverseRatio + ((targetColor >> 16) & 0xff) * clampedRatio);
  const green = Math.round(((color >> 8) & 0xff) * inverseRatio + ((targetColor >> 8) & 0xff) * clampedRatio);
  const blue = Math.round((color & 0xff) * inverseRatio + (targetColor & 0xff) * clampedRatio);

  return (red << 16) | (green << 8) | blue;
}

/** 计算共享像素图形在当前体型下的单位尺寸。 */
function getPixelUnit(scale: number): number {
  return Math.max(Math.round(4 * scale), 3);
}

/** 计算一次按键反馈在当前帧的透明度，保持轻微响应而不让水族箱整缸闪烁。 */
function getPulseAlpha(pulseStartedAt: number, now: number): number {
  if (!pulseStartedAt) {
    return 0;
  }

  const elapsed = now - pulseStartedAt;

  if (elapsed <= 0 || elapsed > PULSE_DURATION_MS) {
    return 0;
  }

  return 1 - elapsed / PULSE_DURATION_MS;
}

/** 计算当前震动强度，水族箱晃动时间短于物种加速时间。 */
function getShakeProgress(startedAt: number, now: number): number {
  const elapsed = now - startedAt;

  if (elapsed < 0 || elapsed > SHAKE_DURATION_MS) {
    return 0;
  }

  return 1 - elapsed / SHAKE_DURATION_MS;
}

/** 使用缓出曲线让加号上浮前快后慢。 */
function easeOutCubic(value: number): number {
  return 1 - (1 - value) ** 3;
}

/** 使用较柔和的缓出曲线，让物种进入时不会突然贴近主体。 */
function easeOutQuad(value: number): number {
  return 1 - (1 - value) ** 2;
}

/** 使用较柔和的缓入曲线，让物种隐藏时收束速度更慢。 */
function easeInQuad(value: number): number {
  return value ** 2;
}

/** 创建跑马灯文字副本，多个副本首尾衔接实现无完整空窗的循环。 */
function createMarqueeText(): Text {
  return new Text({
    text: "",
    style: new TextStyle({
      fill: DEFAULT_MARQUEE_COLOR,
      fontFamily: "PingFang SC, Microsoft YaHei, monospace",
      fontSize: MARQUEE_FONT_SIZE,
      fontWeight: "700",
      letterSpacing: 0,
    }),
  });
}

/** 更新获得结果跑马灯内容，最后获得项和占位文案都保持持续滚动。 */
function updateMarqueeText(texts: Text[], mask: Graphics, status: AquariumStatus, now: number): void {
  mask.rect(MARQUEE_X + 4, MARQUEE_Y + 4, MARQUEE_WIDTH - 8, MARQUEE_HEIGHT - 8).fill({ color: 0xffffff });

  if (status.marqueeEvents.length > 0) {
    showQueuedMarqueeText(texts, createMarqueeItems(status.marqueeEvents), now, status.marqueeEvents[0].createdAt, MARQUEE_SCROLL_MS);
    return;
  }

  showQueuedMarqueeText(texts, [{ message: t(MARQUEE_PLACEHOLDER_TEXT), color: MARQUEE_PLACEHOLDER_COLOR }], now, 0, MARQUEE_PLACEHOLDER_SCROLL_MS);
}

/** 把跑马灯事件转换成渲染项，只保留显示需要的文案和颜色。 */
function createMarqueeItems(events: AquariumStatus["marqueeEvents"]): MarqueeDisplayItem[] {
  return events.map((event) => ({
    message: event.type === "achievement"
      ? t("达成 {name}", { name: t(event.message.slice(3)) })
      : t("获得 {name}", { name: t(event.message.slice(3)) }),
    color: event.color,
  }));
}

/** 在跑马灯槽位内按队列接力滚动，切换内容时下一条从右侧自然进入。 */
function showQueuedMarqueeText(texts: Text[], items: MarqueeDisplayItem[], now: number, cycleStart: number, duration: number): void {
  const normalizedDuration = Math.max(1, duration);
  const elapsedTotal = Math.max(now - cycleStart, 0);
  const baseItemIndex = Math.floor(elapsedTotal / normalizedDuration);
  const elapsed = elapsedTotal % normalizedDuration;
  const textY = MARQUEE_Y + Math.max(4, Math.floor((MARQUEE_HEIGHT - MARQUEE_FONT_SIZE) / 2) - 1);
  const maskX = MARQUEE_X + 4;
  const maskWidth = MARQUEE_WIDTH - 8;
  const enterX = maskX + maskWidth;
  const safeItems = items.length > 0 ? items : [{ message: t(MARQUEE_PLACEHOLDER_TEXT), color: MARQUEE_PLACEHOLDER_COLOR }];
  const itemStride = maskWidth;
  const offset = (elapsed / normalizedDuration) * itemStride;

  texts.forEach((text) => {
    text.visible = true;
    text.y = textY;
  });

  texts.forEach((text, index) => {
    const itemIndex = ((baseItemIndex + index - 1) % safeItems.length + safeItems.length) % safeItems.length;
    const item = safeItems[itemIndex];

    // 两份文案按可视宽度错开：上一条继续左移退出，当前条从右侧自然进入。
    text.text = item.message;
    text.style.fill = item.color;
    text.x = enterX + (index - 1) * itemStride - offset;
  });
}

/** 判断气泡按钮是否已经解锁，保留收集到一定数量后的互动奖励。 */
function isAquariumBubbleButtonUnlocked(status: AquariumStatus): boolean {
  return getCollectedFishCount(status) >= UTILITY_BUTTON_UNLOCK_FISH_COUNT;
}

/** 判断灯光按钮是否已经解锁，晚于气泡按钮作为进阶观赏控制开放。 */
function isAquariumLightButtonUnlocked(status: AquariumStatus): boolean {
  return getCollectedFishCount(status) >= LIGHT_BUTTON_UNLOCK_FISH_COUNT;
}

/** 判断震动按钮是否已经解锁，作为后期水族箱互动奖励开放。 */
function isAquariumShakeButtonUnlocked(status: AquariumStatus): boolean {
  return getCollectedFishCount(status) >= SHAKE_BUTTON_UNLOCK_FISH_COUNT;
}

/** 统计水族箱已获得鱼的总数量，重复获得的鱼也计入解锁条件。 */
function getCollectedFishCount(status: AquariumStatus): number {
  return status.collectedFishCount;
}

/** 判断 Pixi 指针事件是否来自真实用户的主按钮操作。 */
function isTrustedPrimaryPointer(event: FederatedPointerEvent): boolean {
  const nativeEvent = event.nativeEvent;

  return Boolean(nativeEvent instanceof Event && nativeEvent.isTrusted && event.button === 0 && event.isPrimary);
}

/** 将文本稳定映射为非负整数，用于鱼游动轨道。 */
function getHashInt(value: string): number {
  let hash = 2166136261;

  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}
