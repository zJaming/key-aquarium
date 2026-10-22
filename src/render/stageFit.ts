export interface StageFitBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StageFitInput {
  bounds: StageFitBounds;
  hostWidth: number;
  hostHeight: number;
  padding?: number;
}

export interface StageFitResult {
  scale: number;
  x: number;
  y: number;
}

/** 根据窗口尺寸计算场景缩放和位置，保证场景完整放进可用区域。 */
export function computeStageFit(input: StageFitInput): StageFitResult {
  const padding = Math.max(input.padding ?? 24, 0);
  const availableWidth = Math.max(input.hostWidth - padding * 2, 1);
  const availableHeight = Math.max(input.hostHeight - padding * 2, 1);
  const boundsWidth = Math.max(input.bounds.width, 1);
  const boundsHeight = Math.max(input.bounds.height, 1);
  const scale = Math.min(availableWidth / boundsWidth, availableHeight / boundsHeight);
  const scaledWidth = input.bounds.width * scale;
  const scaledHeight = input.bounds.height * scale;

  return {
    scale,
    x: padding + (availableWidth - scaledWidth) / 2 - input.bounds.x * scale,
    y: padding + (availableHeight - scaledHeight) / 2 - input.bounds.y * scale,
  };
}
