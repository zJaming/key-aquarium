import type { FishId } from "./types";

const FISH_ASSET_URLS: Partial<Record<FishId, string>> = {};

/** 读取当前已经接入项目的全部鱼类素材地址，用于未来预加载。 */
export function getAllFishAssetUrls(): string[] {
  return Object.values(FISH_ASSET_URLS).filter((assetUrl): assetUrl is string => Boolean(assetUrl));
}

/** 读取指定鱼类的图片素材地址，未接入素材时返回 null。 */
export function getFishAssetUrl(fishId: FishId | null): string | null {
  if (!fishId) {
    return null;
  }

  return FISH_ASSET_URLS[fishId] ?? null;
}

/** 判断鱼类是否已有图片素材，方便渲染层决定是否使用像素占位。 */
export function hasFishAsset(fishId: FishId | null): boolean {
  return Boolean(fishId && FISH_ASSET_URLS[fishId]);
}
