import { gsap } from "gsap";
import { Application, Container, Graphics, Rectangle, Sprite, Texture } from "pixi.js";
import { getFishVisualPixelRects } from "../game/fishVisualAssets";
import type { FishGalleryItem, FishId, FishRarity } from "../game/types";
import { computeGallerySpecimenPlacements, type GallerySpecimenPlacement } from "./aquariumGalleryLayout";

interface AquariumGalleryRendererOptions {
  host: HTMLElement;
  fish: FishGalleryItem[];
  onSelectFish: (fishId: FishId) => void;
}

interface PointerDragState {
  pointerId: number;
  x: number;
  y: number;
  moved: boolean;
}

const SPECIMEN_TEXTURE_SIZE = 92;
const SPECIMEN_HIT_SIZE = 70;
const MIN_ZOOM = 0.45;
const MAX_ZOOM = 2.4;
const FIT_PADDING = 120;
const WHEEL_ZOOM_STEP = 0.0018;
const PIXEL_UNIT = 3;
const SPECIMEN_TEXTURE_RESOLUTION = 2;
const RARITY_EDGE_COLORS: Record<FishRarity, number> = {
  common: 0x5a8b91,
  rare: 0x6effa8,
  curio: 0xffdc6e,
  legendary: 0xff7a7a,
};
const RARITY_GLOW_ALPHA: Record<FishRarity, number> = {
  common: 0.2,
  rare: 0.34,
  curio: 0.46,
  legendary: 0.58,
};
const RARITY_HEX_BASE_COLORS: Record<FishRarity, number> = {
  common: 0x15333b,
  rare: 0x12412d,
  curio: 0x3e3320,
  legendary: 0x3d2027,
};

/** 管理图鉴收藏陈列 Pixi 画布、预渲染纹理、拖拽缩放和物种点击。 */
export class AquariumGalleryRenderer {
  private readonly host: HTMLElement;
  private readonly onSelectFish: (fishId: FishId) => void;
  private app: Application | null = null;
  private stageRoot: Container | null = null;
  private backgroundLayer: Graphics | null = null;
  private viewport: Container | null = null;
  private specimenLayer: Container | null = null;
  private fish: FishGalleryItem[];
  private placements: GallerySpecimenPlacement[] = [];
  private textureCache = new Map<string, Texture>();
  private resizeObserver: ResizeObserver | null = null;
  private dragState: PointerDragState | null = null;
  private reducedMotion = false;
  private minZoom = MIN_ZOOM;

  constructor(options: AquariumGalleryRendererOptions) {
    this.host = options.host;
    this.fish = options.fish;
    this.onSelectFish = options.onSelectFish;
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /** 初始化图鉴 Pixi 画布并绘制当前物种。 */
  async init(): Promise<void> {
    this.app = new Application();
    await this.app.init({
      backgroundAlpha: 0,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      resizeTo: this.host,
    });

    this.app.canvas.className = "h-full w-full";
    this.app.canvas.style.imageRendering = "auto";
    this.app.canvas.style.touchAction = "none";
    this.host.appendChild(this.app.canvas);

    this.stageRoot = new Container();
    this.backgroundLayer = new Graphics();
    this.viewport = new Container();
    this.specimenLayer = new Container();
    this.viewport.addChild(this.specimenLayer);
    this.stageRoot.addChild(this.backgroundLayer, this.viewport);
    this.app.stage.addChild(this.stageRoot);

    this.app.stage.eventMode = "static";
    this.bindDomInteractions();
    this.resizeObserver = new ResizeObserver(() => {
      this.drawBackground();
      this.fitViewportToSpecimens(false);
    });
    this.resizeObserver.observe(this.host);
    this.setFish(this.fish);
  }

  /** 更新已发现物种并重建陈列 Sprite，纹理按物种视觉缓存复用。 */
  setFish(fish: FishGalleryItem[]): void {
    this.fish = fish;
    this.placements = computeGallerySpecimenPlacements(fish);
    this.drawBackground();
    this.rebuildSpecimens();
    this.fitViewportToSpecimens(true);
  }

  /** 销毁 Pixi 画布、监听器和缓存纹理。 */
  destroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.unbindDomInteractions();
    this.app?.stop();

    if (this.specimenLayer) {
      gsap.killTweensOf(this.specimenLayer.children);
      for (const child of this.specimenLayer.removeChildren()) {
        child.destroy({ children: true });
      }
    }

    if (this.viewport) {
      gsap.killTweensOf(this.viewport.position);
      gsap.killTweensOf(this.viewport.scale);
    }

    for (const texture of this.textureCache.values()) {
      texture.destroy(true);
    }

    this.textureCache.clear();
    this.app?.destroy({ removeView: true }, { children: true });
    this.app = null;
    this.stageRoot = null;
    this.backgroundLayer = null;
    this.viewport = null;
    this.specimenLayer = null;
  }

  /** 绑定 DOM 层手势，避免 Pixi 坐标转换和窗口拖拽逻辑互相干扰。 */
  private bindDomInteractions(): void {
    this.app?.canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.app?.canvas.addEventListener("wheel", this.handleWheel, { passive: false });
  }

  /** 移除 DOM 层手势监听。 */
  private unbindDomInteractions(): void {
    this.app?.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    this.app?.canvas.removeEventListener("wheel", this.handleWheel);
    window.removeEventListener("pointermove", this.handlePointerMove);
    window.removeEventListener("pointerup", this.handlePointerUp);
  }

  /** 处理画布指针按下，准备进入平移拖拽。 */
  private readonly handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    this.dragState = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: false,
    };
    window.addEventListener("pointermove", this.handlePointerMove);
    window.addEventListener("pointerup", this.handlePointerUp);
  };

  /** 处理拖拽移动，直接更新 viewport 位置保持跟手。 */
  private readonly handlePointerMove = (event: PointerEvent) => {
    if (!this.dragState || event.pointerId !== this.dragState.pointerId || !this.viewport) {
      return;
    }

    const dx = event.clientX - this.dragState.x;
    const dy = event.clientY - this.dragState.y;

    if (Math.abs(dx) + Math.abs(dy) > 3) {
      this.dragState.moved = true;
    }

    this.viewport.x += dx;
    this.viewport.y += dy;
    this.dragState.x = event.clientX;
    this.dragState.y = event.clientY;
  };

  /** 处理拖拽结束并清理窗口级监听。 */
  private readonly handlePointerUp = (event: PointerEvent) => {
    if (this.dragState && event.pointerId === this.dragState.pointerId) {
      window.removeEventListener("pointermove", this.handlePointerMove);
      window.removeEventListener("pointerup", this.handlePointerUp);
      window.setTimeout(() => {
        this.dragState = null;
      }, 0);
    }
  };

  /** 处理滚轮缩放，以鼠标位置为缩放中心。 */
  private readonly handleWheel = (event: WheelEvent) => {
    if (!this.viewport || !this.app) {
      return;
    }

    event.preventDefault();
    const bounds = this.app.canvas.getBoundingClientRect();
    const pointerX = event.clientX - bounds.left;
    const pointerY = event.clientY - bounds.top;
    const oldScale = this.viewport.scale.x;
    const nextScale = clampNumber(oldScale * (1 - event.deltaY * WHEEL_ZOOM_STEP), this.minZoom, MAX_ZOOM);
    const ratio = nextScale / oldScale;
    const targetX = pointerX - (pointerX - this.viewport.x) * ratio;
    const targetY = pointerY - (pointerY - this.viewport.y) * ratio;

    this.animateViewport(targetX, targetY, nextScale, 0.18);
  };

  /** 清空 Pixi 背景层，图鉴背景统一交给面板 DOM 样式绘制。 */
  private drawBackground(): void {
    this.backgroundLayer?.clear();
  }

  /** 重建所有物种 Sprite，并给 Sprite 绑定点击选择行为。 */
  private rebuildSpecimens(): void {
    if (!this.specimenLayer) {
      return;
    }

    gsap.killTweensOf(this.specimenLayer.children);
    for (const child of this.specimenLayer.removeChildren()) {
      child.destroy({ children: true });
    }
    const fishById = new Map(this.fish.map((fish) => [fish.id, fish]));

    for (const placement of this.placements) {
      const fish = fishById.get(placement.fishId);

      if (!fish) {
        continue;
      }

      const container = new Container();
      const containerSprite = new Sprite(this.getSpecimenTexture(fish));
      const fishLayer = this.createSpecimenFishGraphics(fish, SPECIMEN_TEXTURE_SIZE / 2, SPECIMEN_TEXTURE_SIZE / 2 + 2);
      containerSprite.anchor.set(0.5);
      fishLayer.x = -SPECIMEN_TEXTURE_SIZE / 2;
      fishLayer.y = -SPECIMEN_TEXTURE_SIZE / 2;
      container.x = placement.x;
      container.y = placement.y;
      container.scale.set(placement.scale);
      container.eventMode = "static";
      container.cursor = "pointer";
      container.hitArea = new Rectangle(-SPECIMEN_HIT_SIZE / 2, -SPECIMEN_HIT_SIZE / 2, SPECIMEN_HIT_SIZE, SPECIMEN_HIT_SIZE);
      container.on("pointertap", () => {
        if (!this.dragState?.moved) {
          this.onSelectFish(fish.id);
        }
      });
      container.addChild(containerSprite, fishLayer);
      this.specimenLayer.addChild(container);
    }
  }

  /** 获取静态玻璃容器纹理，列表品质表现只依赖预渲染容器。 */
  private getSpecimenTexture(fish: FishGalleryItem): Texture {
    const cacheKey = `hex-container:v2:${fish.rarity}`;
    const cachedTexture = this.textureCache.get(cacheKey);

    if (cachedTexture) {
      return cachedTexture;
    }

    const container = this.createSpecimenTextureContainer(fish);
    const texture = this.app?.renderer.generateTexture({
      target: container,
      frame: new Rectangle(0, 0, SPECIMEN_TEXTURE_SIZE, SPECIMEN_TEXTURE_SIZE),
      resolution: SPECIMEN_TEXTURE_RESOLUTION,
      antialias: true,
    }) ?? Texture.EMPTY;
    texture.source.scaleMode = "linear";
    container.destroy({ children: true });
    this.textureCache.set(cacheKey, texture);
    return texture;
  }

  /** 创建单个物种的玻璃容器纹理源。 */
  private createSpecimenTextureContainer(fish: FishGalleryItem): Container {
    const container = new Container();
    const graphics = new Graphics();
    const edgeColor = RARITY_EDGE_COLORS[fish.rarity];
    const glowAlpha = RARITY_GLOW_ALPHA[fish.rarity];
    const outerHex = createHexagonPoints(46, 46, 34, 39);
    const middleHex = createHexagonPoints(46, 46, 30, 35);
    const innerHex = createHexagonPoints(46, 46, 25, 29);

    if (fish.rarity !== "common") {
      graphics.poly(createHexagonPoints(46, 46, 37, 43)).fill({ color: edgeColor, alpha: glowAlpha * 0.1 });
    }

    graphics.poly(outerHex).fill({ color: edgeColor, alpha: 0.42 + glowAlpha * 0.28 });
    graphics.poly(middleHex).fill({ color: 0x06141b, alpha: 0.96 });
    graphics.poly(innerHex).fill({ color: RARITY_HEX_BASE_COLORS[fish.rarity], alpha: 0.74 });
    graphics.poly(createHexagonPoints(46, 44, 22, 25)).fill({ color: 0x0d5870, alpha: 0.08 });
    graphics.poly(createHexagonPoints(46, 47, 24, 28)).stroke({ color: edgeColor, width: fish.rarity === "legendary" ? 3 : 2, alpha: 0.22 + glowAlpha * 0.28 });
    graphics.poly(createHexagonPoints(46, 45, 29, 34)).stroke({ color: 0xffffff, width: 1, alpha: 0.08 + glowAlpha * 0.08 });
    graphics.rect(35, 17, 22, 2).fill({ color: 0xffffff, alpha: 0.08 + glowAlpha * 0.06 });
    graphics.rect(24, 31, 2, 24).fill({ color: edgeColor, alpha: 0.08 + glowAlpha * 0.16 });
    graphics.rect(66, 32, 2, 23).fill({ color: edgeColor, alpha: 0.06 + glowAlpha * 0.12 });

    if (fish.rarity === "curio" || fish.rarity === "legendary") {
      drawHexCornerMarks(graphics, edgeColor, glowAlpha);
    }

    if (fish.rarity === "legendary") {
      graphics.poly(createHexagonPoints(46, 46, 36, 41)).stroke({ color: 0xfff0a3, width: 2, alpha: 0.52 });
      graphics.rect(39, 15, 14, 2).fill({ color: 0xfff0a3, alpha: 0.56 });
      graphics.rect(43, 75, 6, 2).fill({ color: 0xff7a7a, alpha: 0.42 });
    }

    container.addChild(graphics);
    return container;
  }

  /** 创建不透明物种像素块图层，确保物种始终位于容器和背景装饰之上。 */
  private createSpecimenFishGraphics(fish: FishGalleryItem, x: number, y: number): Graphics {
    const graphics = new Graphics();

    for (const pixelRect of getFishVisualPixelRects(fish, true)) {
      graphics
        .rect(
          Math.round(x + pixelRect.x * PIXEL_UNIT),
          Math.round(y + pixelRect.y * PIXEL_UNIT),
          Math.max(1, Math.round(pixelRect.width * PIXEL_UNIT)),
          Math.max(1, Math.round(pixelRect.height * PIXEL_UNIT)),
        )
        .fill({ color: pixelRect.color });
    }

    return graphics;
  }

  /** 根据陈列边界自动缩放到合适初始视口。 */
  private fitViewportToSpecimens(animated: boolean): void {
    if (!this.viewport || !this.app) {
      return;
    }

    const bounds = this.getPlacementBounds();
    const width = this.app.renderer.width;
    const height = this.app.renderer.height;
    const contentWidth = Math.max(bounds.maxX - bounds.minX + FIT_PADDING, 1);
    const contentHeight = Math.max(bounds.maxY - bounds.minY + FIT_PADDING, 1);
    const fitScale = Math.min(width / contentWidth, height / contentHeight, 1.08);
    const scale = clampNumber(fitScale, 0.16, MAX_ZOOM);
    this.minZoom = Math.min(MIN_ZOOM, scale);
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const targetX = width / 2 - centerX * scale;
    const targetY = height / 2 - centerY * scale;

    this.animateViewport(targetX, targetY, scale, animated ? 0.42 : 0);
  }

  /** 计算当前布局包围盒，空图鉴时退回中心点。 */
  private getPlacementBounds(): { minX: number; minY: number; maxX: number; maxY: number } {
    if (this.placements.length === 0) {
      return {
        minX: -SPECIMEN_TEXTURE_SIZE / 2,
        minY: -SPECIMEN_TEXTURE_SIZE / 2,
        maxX: SPECIMEN_TEXTURE_SIZE / 2,
        maxY: SPECIMEN_TEXTURE_SIZE / 2,
      };
    }

    return this.placements.reduce(
      (bounds, placement) => {
        const halfSize = (SPECIMEN_TEXTURE_SIZE * placement.scale) / 2;

        return {
          minX: Math.min(bounds.minX, placement.x - halfSize),
          minY: Math.min(bounds.minY, placement.y - halfSize),
          maxX: Math.max(bounds.maxX, placement.x + halfSize),
          maxY: Math.max(bounds.maxY, placement.y + halfSize),
        };
      },
      {
        minX: Number.POSITIVE_INFINITY,
        minY: Number.POSITIVE_INFINITY,
        maxX: Number.NEGATIVE_INFINITY,
        maxY: Number.NEGATIVE_INFINITY,
      },
    );
  }

  /** 用 GSAP 平滑更新视口位置和缩放，降低滚轮缩放突兀感。 */
  private animateViewport(x: number, y: number, scale: number, duration: number): void {
    if (!this.viewport) {
      return;
    }

    gsap.killTweensOf(this.viewport.position);
    gsap.killTweensOf(this.viewport.scale);

    if (this.reducedMotion || duration <= 0) {
      this.viewport.position.set(x, y);
      this.viewport.scale.set(scale);
      return;
    }

    gsap.to(this.viewport.position, { x, y, duration, ease: "power3.out", overwrite: true });
    gsap.to(this.viewport.scale, { x: scale, y: scale, duration, ease: "power3.out", overwrite: true });
  }
}

/** 将数字限制在指定范围内。 */
function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** 创建上下尖的六边形点列，供 Pixi 容器纹理复用。 */
function createHexagonPoints(centerX: number, centerY: number, radiusX: number, radiusY: number): number[] {
  return [
    centerX,
    centerY - radiusY,
    centerX + radiusX,
    centerY - radiusY * 0.5,
    centerX + radiusX,
    centerY + radiusY * 0.5,
    centerX,
    centerY + radiusY,
    centerX - radiusX,
    centerY + radiusY * 0.5,
    centerX - radiusX,
    centerY - radiusY * 0.5,
  ];
}

/** 绘制珍奇以上六边形容器的静态角标，强化品质但不引入动画。 */
function drawHexCornerMarks(graphics: Graphics, color: number, glowAlpha: number): void {
  graphics.rect(27, 23, 8, 2).fill({ color, alpha: 0.42 + glowAlpha * 0.24 });
  graphics.rect(27, 23, 2, 8).fill({ color, alpha: 0.42 + glowAlpha * 0.24 });
  graphics.rect(57, 23, 8, 2).fill({ color, alpha: 0.38 + glowAlpha * 0.22 });
  graphics.rect(63, 23, 2, 8).fill({ color, alpha: 0.38 + glowAlpha * 0.22 });
  graphics.rect(27, 67, 8, 2).fill({ color, alpha: 0.32 + glowAlpha * 0.18 });
  graphics.rect(27, 61, 2, 8).fill({ color, alpha: 0.32 + glowAlpha * 0.18 });
  graphics.rect(57, 67, 8, 2).fill({ color, alpha: 0.32 + glowAlpha * 0.18 });
  graphics.rect(63, 61, 2, 8).fill({ color, alpha: 0.32 + glowAlpha * 0.18 });
}
