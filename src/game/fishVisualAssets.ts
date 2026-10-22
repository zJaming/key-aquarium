import { FISH_PIXEL_VIEW_BOX, getFishPixelRects } from "./fishPixelArt";
import type { FishPixelRect } from "./fishPixelArt";
import type { FishGalleryItem, FishVisualAssetDefinition } from "./types";

export interface FishPixelRectsVisualAsset {
  renderMode: "pixelRects";
  viewBox: string;
  rects: FishPixelRect[];
}

export interface FishSpriteVisualAsset {
  renderMode: "sprite";
  spriteKey: string;
  assetPath: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
}

export type FishResolvedVisualAsset = FishPixelRectsVisualAsset | FishSpriteVisualAsset;

export interface FishPixelBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const DEFAULT_SPRITE_FRAME_WIDTH = 96;
const DEFAULT_SPRITE_FRAME_HEIGHT = 64;
const DEFAULT_SPRITE_FRAME_COUNT = 1;

/** 解析物种视觉资产，当前默认使用代码像素矩形，后续可切换为图片帧图。 */
export function resolveFishVisualAsset(fish: FishGalleryItem, facingRight = true): FishResolvedVisualAsset {
  const spriteAsset = resolveFishSpriteAsset(fish.visualAsset);

  if (spriteAsset) {
    return spriteAsset;
  }

  return resolveFishPixelRectsAsset(fish, facingRight);
}

/** 解析当前代码绘制所需的像素矩形资产。 */
export function resolveFishPixelRectsAsset(fish: FishGalleryItem, facingRight = true): FishPixelRectsVisualAsset {
  return {
    renderMode: "pixelRects",
    viewBox: FISH_PIXEL_VIEW_BOX,
    rects: getFishPixelRects(fish, facingRight),
  };
}

/** 读取像素矩形资产，渲染层在图片绘制接入前用它保持稳定回退。 */
export function getFishVisualPixelRects(fish: FishGalleryItem, facingRight = true): FishPixelRect[] {
  const visualAsset = resolveFishVisualAsset(fish, facingRight);

  if (visualAsset.renderMode === "pixelRects") {
    return visualAsset.rects;
  }

  return resolveFishPixelRectsAsset(fish, facingRight).rects;
}

/** 读取图鉴 SVG 使用的 viewBox，图片资产接入前仍以代码像素规格兜底。 */
export function getFishVisualViewBox(fish: FishGalleryItem): string {
  const visualAsset = resolveFishVisualAsset(fish);

  if (visualAsset.renderMode === "pixelRects") {
    return visualAsset.viewBox;
  }

  return FISH_PIXEL_VIEW_BOX;
}

/** 计算物种像素矩形包围盒，供水族箱边界约束和测试复用。 */
export function getFishVisualPixelBounds(fish: FishGalleryItem, facingRight = true): FishPixelBounds {
  const rects = getFishVisualPixelRects(fish, facingRight);

  return rects.reduce<FishPixelBounds>(
    (bounds, pixelRect) => ({
      minX: Math.min(bounds.minX, pixelRect.x),
      minY: Math.min(bounds.minY, pixelRect.y),
      maxX: Math.max(bounds.maxX, pixelRect.x + pixelRect.width),
      maxY: Math.max(bounds.maxY, pixelRect.y + pixelRect.height),
    }),
    createInitialPixelBounds(rects),
  );
}

/** 从物种定义中解析可用图片资产，缺少路径时不启用图片模式。 */
function resolveFishSpriteAsset(asset: FishVisualAssetDefinition | undefined): FishSpriteVisualAsset | null {
  if (!asset || asset.renderMode !== "sprite" || !asset.assetPath) {
    return null;
  }

  return {
    renderMode: "sprite",
    spriteKey: asset.spriteKey ?? asset.assetPath,
    assetPath: asset.assetPath,
    frameWidth: asset.frameWidth ?? DEFAULT_SPRITE_FRAME_WIDTH,
    frameHeight: asset.frameHeight ?? DEFAULT_SPRITE_FRAME_HEIGHT,
    frameCount: asset.frameCount ?? DEFAULT_SPRITE_FRAME_COUNT,
  };
}

/** 创建包围盒初始值，空矩形时退回 0 避免产生无限坐标。 */
function createInitialPixelBounds(rects: FishPixelRect[]): FishPixelBounds {
  const firstRect = rects[0];

  if (!firstRect) {
    return {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
    };
  }

  return {
    minX: firstRect.x,
    minY: firstRect.y,
    maxX: firstRect.x + firstRect.width,
    maxY: firstRect.y + firstRect.height,
  };
}
