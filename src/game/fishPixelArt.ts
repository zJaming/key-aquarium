import type { FishGalleryItem } from "./types";

export interface FishPixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
  color: number;
  alpha?: number;
}

export const FISH_PIXEL_VIEW_BOX = "-10 -7 21 14";

/** 根据物种轮廓生成共享像素矩形，供水族箱和图鉴使用同一套图形。 */
export function getFishPixelRects(fish: FishGalleryItem, facingRight = true): FishPixelRect[] {
  switch (fish.silhouette ?? "fish") {
    case "angelfish":
      return createAngelfishRects(fish, facingRight);
    case "anglerfish":
      return createAnglerfishRects(fish, facingRight);
    case "aoFish":
      return createAoFishRects(fish, facingRight);
    case "barracuda":
      return createBarracudaRects(fish, facingRight);
    case "billfish":
      return createBillfishRects(fish, facingRight);
    case "clownfish":
      return createClownfishRects(fish, facingRight);
    case "crab":
      return createCrabRects(fish, false);
    case "dolphin":
      return createDolphinRects(fish, facingRight);
    case "eel":
      return createEelRects(fish, facingRight);
    case "hammerhead":
      return createSharkRects(fish, facingRight, true);
    case "flounder":
      return createFlounderRects(fish, facingRight);
    case "flyingFish":
      return createFlyingFishRects(fish, facingRight);
    case "ghostFish":
      return createGhostFishRects(fish, facingRight);
    case "hermitCrab":
      return createHermitCrabRects(fish, facingRight);
    case "horseshoeCrab":
      return createHorseshoeCrabRects(fish, facingRight);
    case "jellyfish":
      return createJellyfishRects(fish);
    case "kingCrab":
      return createCrabRects(fish, true);
    case "lobster":
      return createLobsterRects(fish, facingRight);
    case "mantaRay":
      return createMantaRayRects(fish, facingRight);
    case "mantisShrimp":
      return createMantisShrimpRects(fish, facingRight);
    case "nautilus":
      return createNautilusRects(fish, facingRight);
    case "octopus":
      return createOctopusRects(fish);
    case "parrotfish":
      return createParrotfishRects(fish, facingRight);
    case "puffer":
      return createPufferRects(fish, facingRight);
    case "ray":
      return createRayRects(fish, facingRight);
    case "ribbonfish":
      return createRibbonfishRects(fish, facingRight);
    case "salamander":
      return createSalamanderRects(fish, facingRight);
    case "seaCucumber":
      return createSeaCucumberRects(fish, facingRight);
    case "seaDragon":
      return createSeaDragonRects(fish, facingRight);
    case "seaSlug":
      return createSeaSlugRects(fish, facingRight);
    case "seaUrchin":
      return createSeaUrchinRects(fish);
    case "seahorse":
      return createSeahorseRects(fish, facingRight);
    case "seaLion":
      return createSeaLionRects(fish, facingRight);
    case "seal":
      return createSealRects(fish, facingRight);
    case "shellfish":
      return createShellfishRects(fish, facingRight);
    case "shark":
      return createSharkRects(fish, facingRight, false);
    case "chimaera":
      return createChimaeraRects(fish, facingRight);
    case "coelacanth":
      return createCoelacanthRects(fish, facingRight);
    case "shrimp":
      return createShrimpRects(fish, facingRight);
    case "skeletonFish":
      return createSkeletonFishRects(fish, facingRight);
    case "squid":
      return createSquidRects(fish, facingRight);
    case "starfish":
      return createStarfishRects(fish);
    case "stingray":
      return createStingrayRects(fish, facingRight);
    case "sunfish":
      return createSunfishRects(fish, facingRight);
    case "tuna":
      return createTunaRects(fish, facingRight);
    case "turtle":
      return createTurtleRects(fish, facingRight);
    case "wenyaoFish":
      return createWenyaoFishRects(fish, facingRight);
    case "whale":
      return createWhaleRects(fish, facingRight);
    case "fish":
    default:
      return createFishRects(fish, facingRight);
  }
}

/** 生成灯笼鱼轮廓的矩形块，突出头部小灯和深海剪影。 */
function createAnglerfishRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  if (fish.id === "fish_072") {
    return createStarLureAnglerfishRects(fish, facingRight);
  }

  const orientedRect = createOrientedRect(facingRight);

  return [
    orientedRect(-5, -2, 8, 5, fish.bodyColor),
    orientedRect(-4, -3, 6, 1, lightenColor(fish.bodyColor, 1.16)),
    orientedRect(3, -2, 3, 4, fish.bodyColor),
    orientedRect(-7, -2, 3, 2, fish.accentColor),
    orientedRect(-7, 1, 3, 2, fish.accentColor),
    orientedRect(3, -5, 1, 3, fish.accentColor),
    orientedRect(4, -6, 2, 2, fish.accentColor),
    orientedRect(3, -1, 1, 1, 0x061014),
  ];
}

/** 生成星灯琵琶鱼的专属轮廓，用更宽的头身、前探灯笼和短尾区别深海灯笼鱼。 */
function createStarLureAnglerfishRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);
  const shadowColor = darkenColor(fish.bodyColor, 0.7);

  return [
    orientedRect(-6, -3, 8, 6, fish.bodyColor),
    orientedRect(-5, -4, 6, 1, lightenColor(fish.bodyColor, 1.14)),
    orientedRect(2, -2, 4, 4, fish.bodyColor),
    orientedRect(-7, -1, 2, 3, fish.accentColor),
    orientedRect(-5, 3, 8, 1, shadowColor),
    orientedRect(-4, -5, 1, 2, fish.accentColor),
    orientedRect(-1, -5, 1, 2, fish.accentColor),
    orientedRect(4, -4, 1, 2, fish.accentColor),
    orientedRect(5, -5, 1, 2, fish.accentColor),
    orientedRect(6, -6, 2, 2, fish.accentColor),
    orientedRect(7, -4, 1, 1, lightenColor(fish.accentColor, 1.18)),
    orientedRect(3, -1, 1, 1, 0x061014),
  ];
}

/** 生成普通鱼轮廓的矩形块。 */
function createFishRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  if (fish.id === "fish_131" || fish.id === "fish_132" || fish.id === "fish_133") {
    return createGobyRects(fish, facingRight);
  }

  const orientedRect = createOrientedRect(facingRight);
  const rects = [
    orientedRect(-4, -2, 8, 4, fish.bodyColor),
    orientedRect(-3, -3, 6, 1, lightenColor(fish.bodyColor, 1.2)),
    orientedRect(-3, 2, 6, 1, darkenColor(fish.bodyColor, 0.72)),
    orientedRect(-6, -3, 2, 2, fish.accentColor),
    orientedRect(-6, 1, 2, 2, fish.accentColor),
    orientedRect(-1, -4, 2, 1, fish.accentColor),
    orientedRect(-1, 3, 2, 1, fish.accentColor),
    orientedRect(4, -1, 1, 1, 0x061014),
  ];

  if (fish.rarity === "legendary" || fish.rarity === "curio") {
    rects.push(orientedRect(-2, -1, 4, 1, fish.accentColor));
  }

  return rects;
}

/** 生成虾虎鱼低趴底栖轮廓，并按物种名称增加不同纹路。 */
function createGobyRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);
  const shadowColor = darkenColor(fish.bodyColor, 0.7);
  const highlightColor = lightenColor(fish.bodyColor, 1.16);
  const rects: FishPixelRect[] = [
    orientedRect(-6, -1, 10, 4, fish.bodyColor),
    orientedRect(-4, -2, 7, 1, highlightColor),
    orientedRect(-5, 3, 8, 1, shadowColor),
    orientedRect(3, 0, 3, 2, fish.bodyColor),
    orientedRect(-8, -1, 2, 2, fish.accentColor),
    orientedRect(-8, 1, 2, 2, fish.accentColor),
    orientedRect(-3, 3, 3, 1, fish.accentColor),
    orientedRect(4, 0, 1, 1, 0x061014),
  ];

  if (fish.id === "fish_131") {
    rects.push(
      orientedRect(-3, 0, 2, 1, fish.accentColor),
      orientedRect(1, -1, 2, 1, fish.accentColor),
      orientedRect(-1, 1, 1, 1, lightenColor(fish.accentColor, 1.12)),
    );
  }

  if (fish.id === "fish_132") {
    rects.push(
      orientedRect(-5, -2, 2, 1, fish.accentColor),
      orientedRect(-1, -2, 2, 1, fish.accentColor),
      orientedRect(2, -1, 2, 1, fish.accentColor),
      orientedRect(-4, 1, 1, 1, lightenColor(fish.accentColor, 1.12)),
    );
  }

  if (fish.id === "fish_133") {
    rects.push(
      orientedRect(-5, 0, 8, 1, fish.accentColor),
      orientedRect(-2, -1, 2, 1, lightenColor(fish.accentColor, 1.08)),
      orientedRect(1, 1, 1, 1, shadowColor),
    );
  }

  return rects;
}

/** 生成小丑鱼轮廓的矩形块，强化白色竖带和深色描边以提升识别度。 */
function createClownfishRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);
  const stripeShadow = darkenColor(fish.bodyColor, 0.5);

  return [
    orientedRect(-5, -2, 9, 5, fish.bodyColor),
    orientedRect(-4, -3, 7, 1, lightenColor(fish.bodyColor, 1.18)),
    orientedRect(-3, 3, 6, 1, darkenColor(fish.bodyColor, 0.72)),
    orientedRect(-7, -3, 2, 2, fish.accentColor),
    orientedRect(-7, 1, 2, 2, fish.accentColor),
    orientedRect(-3, -2, 1, 5, stripeShadow),
    orientedRect(-2, -2, 1, 5, 0xffffff),
    orientedRect(1, -2, 1, 5, stripeShadow),
    orientedRect(2, -2, 1, 5, 0xffffff),
    orientedRect(4, -1, 1, 1, 0x061014),
  ];
}

/** 生成神仙鱼轮廓的矩形块，使用竖高身体和上下长鳍区别普通鱼。 */
function createAngelfishRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);

  return [
    orientedRect(-3, -4, 6, 8, fish.bodyColor),
    orientedRect(-5, -2, 10, 4, fish.bodyColor),
    orientedRect(-2, -6, 4, 2, fish.accentColor),
    orientedRect(-2, 4, 4, 2, fish.accentColor),
    orientedRect(-6, -2, 2, 4, fish.accentColor),
    orientedRect(3, -1, 3, 2, fish.bodyColor),
    orientedRect(-1, -3, 1, 7, darkenColor(fish.bodyColor, 0.7)),
    orientedRect(4, -1, 1, 1, 0x061014),
  ];
}

/** 生成飞鱼轮廓的矩形块，用上下展开的胸鳍区别普通小鱼。 */
function createFlyingFishRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);
  const wingShadow = darkenColor(fish.accentColor, 0.78);

  return [
    orientedRect(-6, -2, 10, 4, fish.bodyColor),
    orientedRect(-4, -3, 7, 1, lightenColor(fish.bodyColor, 1.16)),
    orientedRect(-4, 2, 7, 1, darkenColor(fish.bodyColor, 0.72)),
    orientedRect(-8, -3, 2, 2, fish.accentColor),
    orientedRect(-8, 1, 2, 2, fish.accentColor),
    orientedRect(-2, -4, 6, 3, fish.accentColor),
    orientedRect(-1, 1, 5, 3, wingShadow),
    orientedRect(4, -1, 2, 2, fish.bodyColor),
    orientedRect(5, -1, 1, 1, 0x061014),
  ];
}

/** 生成鹦嘴鱼轮廓的矩形块，用厚唇、弧背和亮色侧带建立热带鱼识别点。 */
function createParrotfishRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);

  return [
    orientedRect(-5, -3, 9, 6, fish.bodyColor),
    orientedRect(-3, -4, 6, 1, lightenColor(fish.bodyColor, 1.14)),
    orientedRect(-4, 3, 7, 1, darkenColor(fish.bodyColor, 0.72)),
    orientedRect(-8, -3, 3, 2, fish.accentColor),
    orientedRect(-8, 1, 3, 2, fish.accentColor),
    orientedRect(4, -1, 3, 2, fish.bodyColor),
    orientedRect(6, -1, 1, 2, fish.accentColor),
    orientedRect(-2, -1, 5, 1, fish.accentColor),
    orientedRect(5, -1, 1, 1, 0x061014),
  ];
}

/** 生成梭子鱼轮廓的矩形块，突出细长身体、尖头和掠食感。 */
function createBarracudaRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  if (fish.id === "fish_100") {
    return createNeedlefishRects(fish, facingRight);
  }

  if (fish.id === "fish_101") {
    return createYoungBarracudaRects(fish, facingRight);
  }

  if (fish.id === "fish_115") {
    return createSwiftBarracudaRects(fish, facingRight);
  }

  const orientedRect = createOrientedRect(facingRight);

  return [
    orientedRect(-8, -1, 13, 3, fish.bodyColor),
    orientedRect(-7, -2, 11, 1, lightenColor(fish.bodyColor, 1.16)),
    orientedRect(-7, 2, 10, 1, darkenColor(fish.bodyColor, 0.72)),
    orientedRect(5, 0, 3, 1, fish.bodyColor),
    orientedRect(-10, -2, 2, 2, fish.accentColor),
    orientedRect(-10, 1, 2, 2, fish.accentColor),
    orientedRect(-2, -3, 3, 1, fish.accentColor),
    orientedRect(6, -1, 1, 1, 0x061014),
    orientedRect(8, 0, 1, 1, 0xffffff),
  ];
}

/** 生成细尾针鱼的专属轮廓，用细身、长吻和细尾区别梭子鱼。 */
function createNeedlefishRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);

  return [
    orientedRect(-7, -1, 12, 2, fish.bodyColor),
    orientedRect(-6, -2, 10, 1, lightenColor(fish.bodyColor, 1.14)),
    orientedRect(-6, 1, 9, 1, darkenColor(fish.bodyColor, 0.74)),
    orientedRect(5, -1, 5, 1, fish.accentColor),
    orientedRect(-9, -2, 2, 2, fish.accentColor),
    orientedRect(-9, 1, 2, 2, fish.accentColor),
    orientedRect(-7, 1, 1, 1, fish.accentColor),
    orientedRect(-2, -2, 2, 1, fish.accentColor),
    orientedRect(7, -1, 1, 1, 0x061014),
  ];
}

/** 生成小梭子鱼的专属轮廓，用较短厚身和尾斑表现幼鱼感。 */
function createYoungBarracudaRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);

  return [
    orientedRect(-7, -2, 12, 4, fish.bodyColor),
    orientedRect(-6, -3, 10, 1, lightenColor(fish.bodyColor, 1.14)),
    orientedRect(-6, 2, 9, 1, darkenColor(fish.bodyColor, 0.72)),
    orientedRect(5, -1, 3, 2, fish.bodyColor),
    orientedRect(-9, -3, 2, 3, fish.accentColor),
    orientedRect(-9, 1, 2, 3, fish.accentColor),
    orientedRect(-2, -3, 3, 1, fish.accentColor),
    orientedRect(-1, 1, 2, 1, fish.accentColor),
    orientedRect(6, -1, 1, 1, 0x061014),
  ];
}

/** 生成迅影梭子鱼的专属轮廓，用长身、尖头和背鳍增强掠食感。 */
function createSwiftBarracudaRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);

  return [
    orientedRect(-8, -2, 14, 4, fish.bodyColor),
    orientedRect(-7, -3, 12, 1, lightenColor(fish.bodyColor, 1.12)),
    orientedRect(-7, 2, 11, 1, darkenColor(fish.bodyColor, 0.7)),
    orientedRect(6, -1, 4, 1, fish.accentColor),
    orientedRect(-10, -3, 2, 3, fish.accentColor),
    orientedRect(-10, 1, 2, 3, fish.accentColor),
    orientedRect(-3, -4, 4, 1, fish.accentColor),
    orientedRect(1, -3, 3, 1, fish.accentColor),
    orientedRect(7, -1, 1, 1, 0x061014),
    orientedRect(9, 0, 1, 1, 0xffffff),
  ];
}

/** 生成金枪鱼轮廓的矩形块，用厚实梭形身体和高尾鳍区别普通鱼。 */
function createTunaRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);

  return [
    orientedRect(-6, -3, 11, 6, fish.bodyColor),
    orientedRect(-4, -4, 7, 1, lightenColor(fish.bodyColor, 1.14)),
    orientedRect(-4, 3, 7, 1, darkenColor(fish.bodyColor, 0.7)),
    orientedRect(-9, -4, 3, 3, fish.accentColor),
    orientedRect(-9, 1, 3, 3, fish.accentColor),
    orientedRect(-1, -5, 3, 2, fish.accentColor),
    orientedRect(5, -1, 2, 2, fish.bodyColor),
    orientedRect(5, -1, 1, 1, 0x061014),
  ];
}

/** 生成箭鱼和旗鱼轮廓的矩形块，使用长吻和可选大背帆建立剪影。 */
function createBillfishRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);
  const sailHeight = fish.name.includes("旗") ? 4 : 2;

  return [
    orientedRect(-6, -2, 10, 4, fish.bodyColor),
    orientedRect(-4, -3, 7, 1, lightenColor(fish.bodyColor, 1.14)),
    orientedRect(-4, 2, 7, 1, darkenColor(fish.bodyColor, 0.72)),
    orientedRect(4, -1, 6, 1, fish.accentColor),
    orientedRect(-8, -3, 2, 2, fish.accentColor),
    orientedRect(-8, 1, 2, 2, fish.accentColor),
    orientedRect(-2, -3 - sailHeight, 4, sailHeight, fish.accentColor),
    orientedRect(5, -1, 1, 1, 0x061014),
  ];
}

/** 生成鲀类圆鼓轮廓的矩形块，用短刺和圆身区别普通鱼。 */
function createPufferRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  if (fish.id === "fish_058") {
    return createRoundBellyPufferRects(fish, facingRight);
  }

  if (fish.id === "fish_059") {
    return createYellowDotPufferRects(fish, facingRight);
  }

  if (fish.id === "fish_105") {
    return createRoundSpotPufferRects(fish, facingRight);
  }

  if (fish.id === "fish_154") {
    return createCoralBoxPufferRects(fish, facingRight);
  }

  const orientedRect = createOrientedRect(facingRight);

  return [
    orientedRect(-4, -4, 8, 8, fish.bodyColor),
    orientedRect(-5, -2, 10, 4, fish.bodyColor),
    orientedRect(-3, -5, 6, 1, lightenColor(fish.bodyColor, 1.12)),
    orientedRect(-3, 4, 6, 1, darkenColor(fish.bodyColor, 0.72)),
    orientedRect(-6, -1, 1, 2, fish.accentColor),
    orientedRect(5, -1, 1, 2, fish.accentColor),
    orientedRect(-1, -6, 2, 1, fish.accentColor),
    orientedRect(-1, 5, 2, 1, fish.accentColor),
    orientedRect(-6, -2, 2, 2, fish.accentColor),
    orientedRect(4, -1, 1, 1, 0x061014),
  ];
}

/** 生成圆肚小鲀的专属轮廓，强化更胖的圆腹和短小尾鳍。 */
function createRoundBellyPufferRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);

  return [
    orientedRect(-4, -4, 8, 8, fish.bodyColor),
    orientedRect(-5, -3, 10, 6, fish.bodyColor),
    orientedRect(-3, -5, 6, 1, lightenColor(fish.bodyColor, 1.1)),
    orientedRect(-3, 4, 6, 1, darkenColor(fish.bodyColor, 0.74)),
    orientedRect(-6, -2, 2, 2, fish.accentColor),
    orientedRect(-6, 1, 2, 2, fish.accentColor),
    orientedRect(5, -1, 1, 2, fish.accentColor),
    orientedRect(-1, 1, 3, 2, lightenColor(fish.bodyColor, 1.08)),
    orientedRect(4, -1, 1, 1, 0x061014),
  ];
}

/** 生成黄点小鲀的专属轮廓，用高对比散点和小刺区别圆肚小鲀。 */
function createYellowDotPufferRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);
  const dotColor = lightenColor(fish.bodyColor, 1.18);

  return [
    orientedRect(-4, -4, 8, 8, fish.bodyColor),
    orientedRect(-5, -2, 10, 4, fish.bodyColor),
    orientedRect(-3, -5, 6, 1, dotColor),
    orientedRect(-3, 4, 6, 1, darkenColor(fish.bodyColor, 0.7)),
    orientedRect(-6, -1, 1, 2, fish.accentColor),
    orientedRect(5, -1, 1, 2, fish.accentColor),
    orientedRect(-1, -6, 2, 1, fish.accentColor),
    orientedRect(-1, 5, 2, 1, fish.accentColor),
    orientedRect(-6, -2, 2, 2, fish.accentColor),
    orientedRect(-2, -2, 1, 1, dotColor),
    orientedRect(1, -3, 1, 1, dotColor),
    orientedRect(2, 0, 1, 1, dotColor),
    orientedRect(-3, 1, 1, 1, dotColor),
    orientedRect(4, -1, 1, 1, 0x061014),
  ];
}

/** 生成圆斑鲀的专属轮廓，保留圆鼓身体并用斑点强化识别。 */
function createRoundSpotPufferRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);
  const spotColor = darkenColor(fish.accentColor, 0.78);

  return [
    orientedRect(-4, -4, 8, 8, fish.bodyColor),
    orientedRect(-5, -2, 10, 4, fish.bodyColor),
    orientedRect(-3, -5, 6, 1, lightenColor(fish.bodyColor, 1.12)),
    orientedRect(-3, 4, 6, 1, darkenColor(fish.bodyColor, 0.72)),
    orientedRect(-6, -1, 1, 2, fish.accentColor),
    orientedRect(5, -1, 1, 2, fish.accentColor),
    orientedRect(-1, -6, 2, 1, fish.accentColor),
    orientedRect(-1, 5, 2, 1, fish.accentColor),
    orientedRect(-6, -2, 2, 2, fish.accentColor),
    orientedRect(-3, -2, 2, 2, spotColor),
    orientedRect(1, -3, 2, 2, spotColor),
    orientedRect(-1, 1, 2, 2, spotColor),
    orientedRect(3, 1, 1, 1, spotColor),
    orientedRect(4, -1, 1, 1, 0x061014),
  ];
}

/** 生成珊瑚箱鲀的专属轮廓，用方盒身体和短尾区别圆斑鲀。 */
function createCoralBoxPufferRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);
  const shadowColor = darkenColor(fish.bodyColor, 0.72);
  const spotColor = lightenColor(fish.accentColor, 1.16);

  return [
    orientedRect(-5, -3, 9, 6, fish.bodyColor),
    orientedRect(-4, -4, 7, 1, lightenColor(fish.bodyColor, 1.12)),
    orientedRect(-4, 3, 7, 1, shadowColor),
    orientedRect(3, -2, 3, 4, fish.bodyColor),
    orientedRect(-7, -3, 2, 3, fish.accentColor),
    orientedRect(-7, 1, 2, 3, fish.accentColor),
    orientedRect(-2, -5, 2, 1, fish.accentColor),
    orientedRect(-2, 4, 2, 1, fish.accentColor),
    orientedRect(-4, -1, 2, 2, spotColor),
    orientedRect(0, -2, 2, 2, spotColor),
    orientedRect(1, 1, 2, 1, spotColor),
    orientedRect(5, -1, 1, 1, 0x061014),
  ];
}

/** 生成细长带鱼轮廓的矩形块，让长条物种与短身小鱼区分开。 */
function createRibbonfishRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  if (fish.id === "fish_061") {
    return createSilverLineRibbonfishRects(fish, facingRight);
  }

  if (fish.id === "fish_062") {
    return createBlueLineRibbonfishRects(fish, facingRight);
  }

  if (fish.id === "fish_065") {
    return createNeedleRibbonfishRects(fish, facingRight);
  }

  if (fish.id === "fish_067") {
    return createSilverBladeRibbonfishRects(fish, facingRight);
  }

  if (fish.id === "fish_167") {
    return createSunsetOarfishRects(fish, facingRight);
  }

  const orientedRect = createOrientedRect(facingRight);

  return [
    orientedRect(-8, -1, 14, 2, fish.bodyColor),
    orientedRect(-7, -2, 12, 1, lightenColor(fish.bodyColor, 1.14)),
    orientedRect(-7, 1, 12, 1, darkenColor(fish.bodyColor, 0.72)),
    orientedRect(6, -2, 2, 4, fish.bodyColor),
    orientedRect(-9, -2, 2, 4, fish.accentColor),
    orientedRect(-2, -3, 3, 1, fish.accentColor),
    orientedRect(7, -1, 1, 1, 0x061014),
  ];
}

/** 生成银线带鱼苗的专属轮廓，用更短身体和细银线表现幼苗感。 */
function createSilverLineRibbonfishRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);

  return [
    orientedRect(-7, -1, 12, 2, fish.bodyColor),
    orientedRect(-6, -2, 10, 1, lightenColor(fish.bodyColor, 1.12)),
    orientedRect(-6, 1, 10, 1, darkenColor(fish.bodyColor, 0.74)),
    orientedRect(5, -1, 2, 3, fish.bodyColor),
    orientedRect(-8, -2, 2, 3, fish.accentColor),
    orientedRect(-1, -3, 3, 1, fish.accentColor),
    orientedRect(6, -1, 1, 1, 0x061014),
  ];
}

/** 生成蓝线带鱼苗的专属轮廓，用贯穿蓝线与更深尾色区分银线幼苗。 */
function createBlueLineRibbonfishRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);

  return [
    orientedRect(-8, -1, 13, 2, fish.bodyColor),
    orientedRect(-7, -2, 11, 1, lightenColor(fish.bodyColor, 1.12)),
    orientedRect(-7, 1, 11, 1, darkenColor(fish.bodyColor, 0.72)),
    orientedRect(-5, 0, 8, 1, fish.accentColor),
    orientedRect(5, -2, 2, 4, fish.accentColor),
    orientedRect(-9, -2, 2, 4, fish.accentColor),
    orientedRect(6, -1, 1, 1, 0x061014),
  ];
}

/** 生成浅滩针带的专属轮廓，用针状长吻和浅色细身拉开差异。 */
function createNeedleRibbonfishRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);

  return [
    orientedRect(-8, 0, 13, 2, fish.bodyColor),
    orientedRect(-7, -1, 11, 1, lightenColor(fish.bodyColor, 1.14)),
    orientedRect(-7, 2, 10, 1, darkenColor(fish.bodyColor, 0.72)),
    orientedRect(5, 0, 5, 1, fish.accentColor),
    orientedRect(-10, -1, 2, 3, fish.accentColor),
    orientedRect(-2, -2, 4, 1, fish.accentColor),
    orientedRect(7, 0, 1, 1, 0x061014),
  ];
}

/** 生成银刃带鱼的专属轮廓，用更锋利的背鳍和亮色刃线表现稀有感。 */
function createSilverBladeRibbonfishRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);
  const bladeColor = lightenColor(fish.bodyColor, 1.1);

  return [
    orientedRect(-8, -1, 14, 2, fish.bodyColor),
    orientedRect(-7, -2, 12, 1, bladeColor),
    orientedRect(-7, 1, 12, 1, darkenColor(fish.bodyColor, 0.72)),
    orientedRect(6, -2, 2, 4, fish.bodyColor),
    orientedRect(-9, -2, 2, 4, fish.accentColor),
    orientedRect(-3, -3, 5, 1, fish.accentColor),
    orientedRect(1, -4, 3, 1, fish.accentColor),
    orientedRect(7, -1, 1, 1, 0x061014),
  ];
}

/** 生成霞带皇带鱼的专属轮廓，用超长身、红霞背鳍和冠状头部表现珍奇层级。 */
function createSunsetOarfishRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);
  const shadowColor = darkenColor(fish.bodyColor, 0.74);

  return [
    orientedRect(-9, -1, 15, 2, fish.bodyColor),
    orientedRect(-8, -2, 13, 1, lightenColor(fish.bodyColor, 1.12)),
    orientedRect(-8, 1, 13, 1, shadowColor),
    orientedRect(6, -2, 2, 4, fish.bodyColor),
    orientedRect(-10, -2, 2, 4, fish.accentColor),
    orientedRect(-7, -3, 4, 1, fish.accentColor),
    orientedRect(-3, -3, 5, 1, fish.accentColor),
    orientedRect(2, -3, 4, 1, fish.accentColor),
    orientedRect(-9, -4, 2, 3, fish.accentColor),
    orientedRect(-8, -2, 1, 1, fish.accentColor),
    orientedRect(7, -1, 1, 1, 0x061014),
  ];
}

/** 生成海鳗轮廓的矩形块，用弯曲分段区别笔直带鱼。 */
function createEelRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);

  return [
    orientedRect(-8, -2, 6, 2, fish.bodyColor),
    orientedRect(-5, -1, 6, 2, fish.bodyColor),
    orientedRect(-1, 0, 6, 2, fish.bodyColor),
    orientedRect(4, -1, 3, 3, fish.bodyColor),
    orientedRect(-7, -3, 4, 1, lightenColor(fish.bodyColor, 1.14)),
    orientedRect(-2, -1, 5, 1, lightenColor(fish.bodyColor, 1.1)),
    orientedRect(-8, 0, 4, 1, darkenColor(fish.bodyColor, 0.72)),
    orientedRect(0, 2, 4, 1, darkenColor(fish.bodyColor, 0.72)),
    orientedRect(-10, -2, 2, 3, fish.accentColor),
    orientedRect(6, 0, 1, 1, 0x061014),
  ];
}

/** 生成虾类轮廓的矩形块，使用弯尾、长须和腹节建立识别点。 */
function createShrimpRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);

  return [
    orientedRect(-4, -1, 7, 3, fish.bodyColor),
    orientedRect(-3, -2, 5, 1, lightenColor(fish.bodyColor, 1.14)),
    orientedRect(3, -2, 3, 3, fish.bodyColor),
    orientedRect(-6, -3, 3, 2, fish.accentColor),
    orientedRect(-7, 0, 3, 2, fish.accentColor),
    orientedRect(-2, 2, 1, 2, darkenColor(fish.bodyColor, 0.72)),
    orientedRect(0, 2, 1, 2, darkenColor(fish.bodyColor, 0.72)),
    orientedRect(2, 2, 1, 2, darkenColor(fish.bodyColor, 0.72)),
    orientedRect(3, -3, 3, 1, fish.accentColor),
    orientedRect(6, -4, 1, 2, fish.accentColor),
    orientedRect(7, -4, 1, 1, fish.accentColor),
    orientedRect(5, -1, 1, 1, 0x061014),
  ];
}

/** 生成皮皮虾轮廓的矩形块，用分节长身和前方拳螯区别普通虾。 */
function createMantisShrimpRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);
  const shellShadow = darkenColor(fish.bodyColor, 0.7);

  return [
    orientedRect(-6, -2, 10, 4, fish.bodyColor),
    orientedRect(-5, -3, 8, 1, lightenColor(fish.bodyColor, 1.14)),
    orientedRect(-7, 2, 9, 1, shellShadow),
    orientedRect(-6, -3, 1, 6, shellShadow),
    orientedRect(3, -2, 3, 3, fish.bodyColor),
    orientedRect(5, -4, 3, 2, fish.accentColor),
    orientedRect(5, -2, 1, 2, fish.accentColor),
    orientedRect(5, 0, 1, 2, fish.accentColor),
    orientedRect(6, 1, 3, 2, fish.accentColor),
    orientedRect(-9, -3, 3, 2, fish.accentColor),
    orientedRect(-9, 1, 3, 2, fish.accentColor),
    orientedRect(-3, -2, 1, 5, shellShadow),
    orientedRect(0, -2, 1, 5, shellShadow),
    orientedRect(4, -1, 1, 1, 0x061014),
  ];
}

/** 生成龙虾轮廓的矩形块，用长身、尾扇和前螯区别虾与螃蟹。 */
function createLobsterRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);
  const shellShadow = darkenColor(fish.bodyColor, 0.7);
  const clawShadow = darkenColor(fish.accentColor, 0.72);

  return [
    orientedRect(-7, -2, 10, 4, fish.bodyColor),
    orientedRect(-6, -3, 8, 1, lightenColor(fish.bodyColor, 1.14)),
    orientedRect(-7, 2, 9, 1, shellShadow),
    orientedRect(3, -2, 3, 3, fish.bodyColor),
    orientedRect(5, -4, 3, 3, fish.accentColor),
    orientedRect(7, -3, 2, 2, clawShadow),
    orientedRect(5, 1, 3, 3, fish.accentColor),
    orientedRect(7, 2, 2, 2, clawShadow),
    orientedRect(-10, -3, 3, 2, fish.accentColor),
    orientedRect(-10, 1, 3, 2, fish.accentColor),
    orientedRect(-4, -2, 1, 5, shellShadow),
    orientedRect(-1, -2, 1, 5, shellShadow),
    orientedRect(4, -1, 1, 1, 0x061014),
  ];
}

/** 生成比目鱼轮廓的矩形块，使用扁平宽身和同侧双眼表现底栖特征。 */
function createFlounderRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  if (fish.id === "fish_107") {
    return createYoungFlounderRects(fish, facingRight);
  }

  const orientedRect = createOrientedRect(facingRight);

  return [
    orientedRect(-6, -2, 11, 5, fish.bodyColor),
    orientedRect(-4, -3, 8, 1, lightenColor(fish.bodyColor, 1.12)),
    orientedRect(-4, 3, 8, 1, darkenColor(fish.bodyColor, 0.72)),
    orientedRect(-8, -1, 2, 3, fish.accentColor),
    orientedRect(5, -1, 2, 2, fish.bodyColor),
    orientedRect(-3, -1, 2, 2, fish.accentColor),
    orientedRect(1, 1, 2, 2, fish.accentColor),
    orientedRect(0, -2, 1, 1, darkenColor(fish.accentColor, 0.78)),
    orientedRect(3, -1, 1, 1, 0x061014),
    orientedRect(3, 1, 1, 1, 0x061014),
  ];
}

/** 生成幼体比目鱼轮廓，使用更窄体型和碎斑区别成体月斑比目鱼。 */
function createYoungFlounderRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);
  const shadowColor = darkenColor(fish.bodyColor, 0.74);
  const spotColor = darkenColor(fish.accentColor, 0.84);

  return [
    orientedRect(-5, -2, 9, 4, fish.bodyColor),
    orientedRect(-3, -3, 6, 1, lightenColor(fish.bodyColor, 1.12)),
    orientedRect(-3, 2, 6, 1, shadowColor),
    orientedRect(-7, -1, 2, 2, fish.accentColor),
    orientedRect(4, -1, 2, 2, fish.bodyColor),
    orientedRect(-2, -1, 1, 1, spotColor),
    orientedRect(0, 1, 1, 1, spotColor),
    orientedRect(2, -1, 1, 1, fish.accentColor),
    orientedRect(2, 0, 1, 1, 0x061014),
    orientedRect(3, 1, 1, 1, 0x061014),
  ];
}

/** 生成鲵轮廓的矩形块，使用大头、短脚和外鳃表现贴底两栖感。 */
function createSalamanderRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);
  const bellyColor = lightenColor(fish.bodyColor, 1.12);

  return [
    orientedRect(-5, -2, 9, 4, fish.bodyColor),
    orientedRect(3, -3, 4, 5, fish.bodyColor),
    orientedRect(-8, -1, 3, 2, fish.accentColor),
    orientedRect(-5, 2, 2, 2, bellyColor),
    orientedRect(0, 2, 2, 2, bellyColor),
    orientedRect(4, -5, 1, 2, fish.accentColor),
    orientedRect(6, -5, 1, 2, fish.accentColor),
    orientedRect(4, 2, 1, 2, fish.accentColor),
    orientedRect(6, 2, 1, 2, fish.accentColor),
    orientedRect(5, -1, 1, 1, 0x061014),
  ];
}

/** 生成翻车鱼轮廓的矩形块，使用高圆盘身体和短尾表现笨重体态。 */
function createSunfishRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);

  return [
    orientedRect(-4, -5, 7, 10, fish.bodyColor),
    orientedRect(-3, -6, 5, 1, lightenColor(fish.bodyColor, 1.12)),
    orientedRect(-3, 5, 5, 1, darkenColor(fish.bodyColor, 0.72)),
    orientedRect(-1, -7, 2, 2, fish.accentColor),
    orientedRect(-1, 5, 2, 2, fish.accentColor),
    orientedRect(-6, -2, 2, 4, fish.accentColor),
    orientedRect(3, -1, 2, 2, fish.bodyColor),
    orientedRect(4, -1, 1, 1, 0x061014),
  ];
}

/** 生成海参轮廓的矩形块，使用贴底长圆身体和短刺表现缓慢底栖感。 */
function createSeaCucumberRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  if (fish.id === "fish_143") {
    return createRedArmSeaCucumberRects(fish, facingRight);
  }

  if (fish.id === "fish_144") {
    return createSandPatternSeaCucumberRects(fish, facingRight);
  }

  const orientedRect = createOrientedRect(facingRight);
  const ridgeColor = darkenColor(fish.bodyColor, 0.74);

  return [
    orientedRect(-7, -2, 13, 4, fish.bodyColor),
    orientedRect(-6, -3, 11, 1, lightenColor(fish.bodyColor, 1.12)),
    orientedRect(-6, 2, 11, 1, ridgeColor),
    orientedRect(-5, -4, 2, 1, fish.accentColor),
    orientedRect(-1, -4, 2, 1, fish.accentColor),
    orientedRect(3, -4, 2, 1, fish.accentColor),
    orientedRect(-3, 0, 1, 1, fish.accentColor),
    orientedRect(1, 0, 1, 1, fish.accentColor),
    orientedRect(5, -1, 1, 1, 0x061014),
  ];
}

/** 生成红腕海参的专属轮廓，用粗短身体和腕状突起加强识别。 */
function createRedArmSeaCucumberRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);
  const ridgeColor = darkenColor(fish.bodyColor, 0.72);

  return [
    orientedRect(-6, -2, 12, 5, fish.bodyColor),
    orientedRect(-5, -3, 10, 1, lightenColor(fish.bodyColor, 1.12)),
    orientedRect(-5, 3, 10, 1, ridgeColor),
    orientedRect(-5, -4, 2, 2, fish.accentColor),
    orientedRect(-1, -4, 2, 2, fish.accentColor),
    orientedRect(3, -4, 2, 2, fish.accentColor),
    orientedRect(-4, 0, 1, 1, fish.accentColor),
    orientedRect(0, 1, 1, 1, fish.accentColor),
    orientedRect(4, 0, 1, 1, fish.accentColor),
    orientedRect(5, -1, 1, 1, 0x061014),
  ];
}

/** 生成砂纹海参的专属轮廓，用修长扁身和沙纹颗粒区别红腕海参。 */
function createSandPatternSeaCucumberRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);
  const ridgeColor = darkenColor(fish.bodyColor, 0.76);
  const grainColor = lightenColor(fish.accentColor, 1.08);

  return [
    orientedRect(-8, -1, 15, 3, fish.bodyColor),
    orientedRect(-7, -2, 13, 1, lightenColor(fish.bodyColor, 1.1)),
    orientedRect(-7, 2, 13, 1, ridgeColor),
    orientedRect(-5, 0, 2, 1, fish.accentColor),
    orientedRect(-1, -1, 2, 1, fish.accentColor),
    orientedRect(3, 0, 2, 1, fish.accentColor),
    orientedRect(-6, 1, 1, 1, grainColor),
    orientedRect(1, 1, 1, 1, grainColor),
    orientedRect(6, 0, 1, 1, 0x061014),
  ];
}

/** 生成海龙轮廓的矩形块，用细长躯干、叶片状鳍和弯尾区别海马。 */
function createSeaDragonRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);
  const shadowColor = darkenColor(fish.bodyColor, 0.72);

  return [
    orientedRect(-7, -1, 10, 3, fish.bodyColor),
    orientedRect(-6, -2, 8, 1, lightenColor(fish.bodyColor, 1.14)),
    orientedRect(3, -2, 4, 3, fish.bodyColor),
    orientedRect(-9, -2, 3, 1, fish.accentColor),
    orientedRect(-9, 1, 3, 1, fish.accentColor),
    orientedRect(-4, -5, 2, 3, fish.accentColor),
    orientedRect(-1, 2, 2, 3, fish.accentColor),
    orientedRect(2, -4, 2, 2, fish.accentColor),
    orientedRect(-7, 2, 3, 1, shadowColor),
    orientedRect(5, -1, 1, 1, 0x061014),
  ];
}

/** 生成海兔轮廓的矩形块，使用软体低身和头部触角建立识别点。 */
function createSeaSlugRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  if (fish.id === "fish_076") {
    return createGrassSeaSlugRects(fish, facingRight);
  }

  if (fish.id === "fish_145") {
    return createBlueDotSeaSlugRects(fish, facingRight);
  }

  if (fish.id === "fish_146") {
    return createJadeBandSeaSlugRects(fish, facingRight);
  }

  const orientedRect = createOrientedRect(facingRight);

  return [
    orientedRect(-5, -1, 10, 4, fish.bodyColor),
    orientedRect(-4, -2, 7, 1, lightenColor(fish.bodyColor, 1.14)),
    orientedRect(-4, 3, 8, 1, darkenColor(fish.bodyColor, 0.72)),
    orientedRect(4, -3, 1, 2, fish.accentColor),
    orientedRect(2, -3, 1, 2, fish.accentColor),
    orientedRect(-6, 0, 2, 2, fish.accentColor),
    orientedRect(-1, 0, 2, 1, fish.accentColor),
    orientedRect(4, 0, 1, 1, 0x061014),
  ];
}

/** 生成海草海兔的专属轮廓，用背部草状突起突出海草感。 */
function createGrassSeaSlugRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);

  return [
    orientedRect(-5, -1, 10, 4, fish.bodyColor),
    orientedRect(-4, -2, 7, 1, lightenColor(fish.bodyColor, 1.14)),
    orientedRect(-4, 3, 8, 1, darkenColor(fish.bodyColor, 0.72)),
    orientedRect(4, -3, 1, 2, fish.accentColor),
    orientedRect(2, -3, 1, 2, fish.accentColor),
    orientedRect(-6, 0, 2, 2, fish.accentColor),
    orientedRect(-2, -3, 1, 2, fish.accentColor),
    orientedRect(0, -4, 1, 3, fish.accentColor),
    orientedRect(-1, 0, 2, 1, fish.accentColor),
    orientedRect(4, 0, 1, 1, 0x061014),
  ];
}

/** 生成蓝点海兔的专属轮廓，用背部圆点和短触角强化蓝点特征。 */
function createBlueDotSeaSlugRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);
  const dotColor = lightenColor(fish.accentColor, 1.08);

  return [
    orientedRect(-5, -1, 10, 4, fish.bodyColor),
    orientedRect(-4, -2, 7, 1, lightenColor(fish.bodyColor, 1.14)),
    orientedRect(-4, 3, 8, 1, darkenColor(fish.bodyColor, 0.72)),
    orientedRect(4, -3, 1, 2, fish.accentColor),
    orientedRect(2, -2, 1, 1, fish.accentColor),
    orientedRect(-6, 0, 2, 2, fish.accentColor),
    orientedRect(-3, 0, 1, 1, dotColor),
    orientedRect(0, -1, 1, 1, dotColor),
    orientedRect(2, 1, 1, 1, dotColor),
    orientedRect(4, 0, 1, 1, 0x061014),
  ];
}

/** 生成玉带海兔的专属轮廓，用修长身体和横向玉带纹区分其他海兔。 */
function createJadeBandSeaSlugRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);

  return [
    orientedRect(-6, -1, 11, 4, fish.bodyColor),
    orientedRect(-5, -2, 8, 1, lightenColor(fish.bodyColor, 1.12)),
    orientedRect(-5, 3, 9, 1, darkenColor(fish.bodyColor, 0.72)),
    orientedRect(4, -3, 1, 2, fish.accentColor),
    orientedRect(2, -3, 1, 2, fish.accentColor),
    orientedRect(-7, 0, 2, 2, fish.accentColor),
    orientedRect(-3, 0, 7, 1, fish.accentColor),
    orientedRect(-1, 1, 4, 1, lightenColor(fish.accentColor, 1.08)),
    orientedRect(4, 0, 1, 1, 0x061014),
  ];
}

/** 生成海胆轮廓的矩形块，使用中心圆核和短刺形成圆刺剪影。 */
function createSeaUrchinRects(fish: FishGalleryItem): FishPixelRect[] {
  return [
    rect(-3, -3, 6, 6, fish.bodyColor),
    rect(-4, -2, 8, 4, fish.bodyColor),
    rect(-2, -4, 4, 8, fish.bodyColor),
    rect(-1, -6, 2, 2, fish.accentColor),
    rect(-1, 4, 2, 2, fish.accentColor),
    rect(-6, -1, 2, 2, fish.accentColor),
    rect(4, -1, 2, 2, fish.accentColor),
    rect(-5, -4, 2, 2, fish.accentColor),
    rect(3, -4, 2, 2, fish.accentColor),
    rect(-5, 2, 2, 2, fish.accentColor),
    rect(3, 2, 2, 2, fish.accentColor),
    rect(0, -1, 1, 1, darkenColor(fish.bodyColor, 0.58)),
  ];
}

/** 生成海龟轮廓的矩形块。 */
function createTurtleRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  if (fish.id === "fish_088") {
    return createCopperbackTurtleRects(fish, facingRight);
  }

  const orientedRect = createOrientedRect(facingRight);

  return [
    orientedRect(-4, -2, 8, 4, fish.bodyColor),
    orientedRect(-3, -3, 6, 1, lightenColor(fish.bodyColor, 1.16)),
    orientedRect(-3, 2, 6, 1, darkenColor(fish.bodyColor, 0.72)),
    orientedRect(-2, -1, 4, 2, fish.accentColor),
    orientedRect(4, -1, 2, 2, fish.bodyColor),
    orientedRect(-5, -1, 1, 2, fish.accentColor),
    orientedRect(-5, -3, 2, 1, fish.accentColor),
    orientedRect(3, -3, 2, 1, fish.accentColor),
    orientedRect(-5, 2, 2, 1, fish.accentColor),
    orientedRect(3, 2, 2, 1, fish.accentColor),
    orientedRect(5, -1, 1, 1, 0x061014),
  ];
}

/** 生成铜背海龟的专属轮廓，用更厚的龟甲和后掠鳍区别玳瑁海龟。 */
function createCopperbackTurtleRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);
  const shellShadow = darkenColor(fish.accentColor, 0.72);

  return [
    orientedRect(-5, -3, 9, 6, fish.bodyColor),
    orientedRect(-4, -4, 7, 1, lightenColor(fish.bodyColor, 1.12)),
    orientedRect(-3, -2, 6, 4, fish.accentColor),
    orientedRect(-2, -1, 4, 2, shellShadow),
    orientedRect(4, -1, 2, 2, fish.bodyColor),
    orientedRect(-7, -2, 2, 2, fish.accentColor),
    orientedRect(-6, 2, 2, 2, fish.accentColor),
    orientedRect(1, -5, 2, 2, fish.accentColor),
    orientedRect(-2, 3, 2, 2, fish.accentColor),
    orientedRect(5, -1, 1, 1, 0x061014),
  ];
}

/** 生成章鱼轮廓的矩形块。 */
function createOctopusRects(fish: FishGalleryItem): FishPixelRect[] {
  if (fish.id === "fish_039") {
    return createBlueRingOctopusRects(fish);
  }

  if (fish.id === "fish_052") {
    return createGiantOctopusRects(fish);
  }

  if (fish.id === "fish_086") {
    return createSpottedArmOctopusRects(fish);
  }

  if (fish.id === "fish_160") {
    return createMimicOctopusRects(fish);
  }

  return [
    rect(-3, -4, 6, 5, fish.bodyColor),
    rect(-2, -5, 4, 1, lightenColor(fish.bodyColor, 1.16)),
    rect(-4, -2, 8, 3, fish.bodyColor),
    rect(-4, 1, 8, 2, darkenColor(fish.bodyColor, 0.82)),
    rect(-6, 0, 2, 2, fish.accentColor),
    rect(4, 0, 2, 2, fish.accentColor),
    rect(-5, 2, 2, 2, fish.accentColor),
    rect(3, 2, 2, 2, fish.accentColor),
    rect(-3, 3, 1, 3, fish.accentColor),
    rect(-1, 3, 1, 4, fish.accentColor),
    rect(1, 3, 1, 4, fish.accentColor),
    rect(3, 3, 1, 3, fish.accentColor),
    rect(-1, 2, 1, 2, darkenColor(fish.bodyColor, 0.68)),
    rect(1, 2, 1, 2, darkenColor(fish.bodyColor, 0.68)),
    rect(-2, -2, 1, 1, 0x061014),
    rect(2, -2, 1, 1, 0x061014),
  ];
}

/** 生成蓝环章鱼的专属轮廓，用蓝色环纹强化识别。 */
function createBlueRingOctopusRects(fish: FishGalleryItem): FishPixelRect[] {
  return [
    ...createBaseOctopusRects(fish),
    rect(-3, -3, 1, 1, fish.accentColor),
    rect(2, -3, 1, 1, fish.accentColor),
    rect(-4, 0, 1, 1, fish.accentColor),
    rect(3, 0, 1, 1, fish.accentColor),
  ];
}

/** 生成深海巨章的专属轮廓，用更宽头部和粗触手表现大型感。 */
function createGiantOctopusRects(fish: FishGalleryItem): FishPixelRect[] {
  return [
    rect(-4, -5, 8, 6, fish.bodyColor),
    rect(-3, -6, 6, 1, lightenColor(fish.bodyColor, 1.14)),
    rect(-5, -2, 10, 4, fish.bodyColor),
    rect(-5, 2, 10, 2, darkenColor(fish.bodyColor, 0.8)),
    rect(-7, 0, 3, 2, fish.accentColor),
    rect(4, 0, 3, 2, fish.accentColor),
    rect(-6, 3, 2, 2, fish.accentColor),
    rect(4, 3, 2, 2, fish.accentColor),
    rect(-4, 4, 1, 3, fish.accentColor),
    rect(-2, 4, 1, 3, fish.accentColor),
    rect(1, 4, 1, 3, fish.accentColor),
    rect(3, 4, 1, 3, fish.accentColor),
    rect(-2, 2, 1, 2, darkenColor(fish.bodyColor, 0.66)),
    rect(1, 2, 1, 2, darkenColor(fish.bodyColor, 0.66)),
    rect(-2, -2, 1, 1, 0x061014),
    rect(2, -2, 1, 1, 0x061014),
  ];
}

/** 生成花腕章鱼的专属轮廓，用腕部花斑和略短触手区别蓝环章鱼。 */
function createSpottedArmOctopusRects(fish: FishGalleryItem): FishPixelRect[] {
  return [
    ...createBaseOctopusRects(fish),
    rect(-5, 2, 1, 1, lightenColor(fish.accentColor, 1.12)),
    rect(4, 2, 1, 1, lightenColor(fish.accentColor, 1.12)),
    rect(-3, 4, 1, 1, lightenColor(fish.accentColor, 1.12)),
    rect(2, 4, 1, 1, lightenColor(fish.accentColor, 1.12)),
  ];
}

/** 生成拟态章鱼的专属轮廓，用偏斜长腕表现拟态伸展姿态。 */
function createMimicOctopusRects(fish: FishGalleryItem): FishPixelRect[] {
  return [
    rect(-3, -4, 6, 5, fish.bodyColor),
    rect(-2, -5, 4, 1, lightenColor(fish.bodyColor, 1.16)),
    rect(-4, -2, 8, 3, fish.bodyColor),
    rect(-4, 1, 8, 2, darkenColor(fish.bodyColor, 0.82)),
    rect(-6, 0, 2, 2, fish.accentColor),
    rect(4, 0, 2, 2, fish.accentColor),
    rect(-6, 2, 3, 1, fish.accentColor),
    rect(3, 2, 3, 1, fish.accentColor),
    rect(-5, 3, 1, 3, fish.accentColor),
    rect(-2, 3, 1, 4, fish.accentColor),
    rect(1, 3, 1, 4, fish.accentColor),
    rect(4, 3, 1, 3, fish.accentColor),
    rect(-1, 2, 1, 2, darkenColor(fish.bodyColor, 0.68)),
    rect(1, 2, 1, 2, darkenColor(fish.bodyColor, 0.68)),
    rect(-2, -2, 1, 1, 0x061014),
    rect(2, -2, 1, 1, 0x061014),
  ];
}

/** 生成章鱼基础轮廓，供同族物种叠加专属纹路。 */
function createBaseOctopusRects(fish: FishGalleryItem): FishPixelRect[] {
  return [
    rect(-3, -4, 6, 5, fish.bodyColor),
    rect(-2, -5, 4, 1, lightenColor(fish.bodyColor, 1.16)),
    rect(-4, -2, 8, 3, fish.bodyColor),
    rect(-4, 1, 8, 2, darkenColor(fish.bodyColor, 0.82)),
    rect(-6, 0, 2, 2, fish.accentColor),
    rect(4, 0, 2, 2, fish.accentColor),
    rect(-5, 2, 2, 2, fish.accentColor),
    rect(3, 2, 2, 2, fish.accentColor),
    rect(-3, 3, 1, 3, fish.accentColor),
    rect(-1, 3, 1, 4, fish.accentColor),
    rect(1, 3, 1, 4, fish.accentColor),
    rect(3, 3, 1, 3, fish.accentColor),
    rect(-1, 2, 1, 2, darkenColor(fish.bodyColor, 0.68)),
    rect(1, 2, 1, 2, darkenColor(fish.bodyColor, 0.68)),
    rect(-2, -2, 1, 1, 0x061014),
    rect(2, -2, 1, 1, 0x061014),
  ];
}

/** 生成螃蟹或帝王蟹轮廓的矩形块。 */
function createCrabRects(fish: FishGalleryItem, king: boolean): FishPixelRect[] {
  if (fish.id === "fish_091") {
    return createAbyssKingCrabRects(fish);
  }

  const clawSize = king ? 3 : 2;
  const rects = [
    rect(-4, -2, 8, 4, fish.bodyColor),
    rect(-3, -3, 6, 1, lightenColor(fish.bodyColor, 1.16)),
    rect(-4 - clawSize, -3, clawSize, clawSize, fish.accentColor),
    rect(4, -3, clawSize, clawSize, fish.accentColor),
    rect(-3, 2, 1, 2, darkenColor(fish.bodyColor, 0.72)),
    rect(-1, 2, 1, 2, darkenColor(fish.bodyColor, 0.72)),
    rect(1, 2, 1, 2, darkenColor(fish.bodyColor, 0.72)),
    rect(3, 2, 1, 2, darkenColor(fish.bodyColor, 0.72)),
    rect(-1, -1, 1, 1, 0x061014),
    rect(1, -1, 1, 1, 0x061014),
  ];

  if (king) {
    rects.push(
      rect(-2, -5, 1, 2, fish.accentColor),
      rect(0, -5, 1, 2, fish.accentColor),
      rect(2, -5, 1, 2, fish.accentColor),
    );
  }

  return rects;
}

/** 生成寄居蟹专属轮廓，以螃蟹底盘叠加不同背壳，避免看起来像虾。 */
function createHermitCrabRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);
  const shellColor = fish.accentColor;
  const shellShadow = darkenColor(shellColor, 0.72);
  const bodyShadow = darkenColor(fish.bodyColor, 0.72);
  const clawShadow = darkenColor(fish.accentColor, 0.68);
  const shellHighlight = lightenColor(shellColor, 1.12);

  const rects = [
    orientedRect(-4, -1, 8, 4, fish.bodyColor),
    orientedRect(-3, -2, 6, 1, lightenColor(fish.bodyColor, 1.14)),
    orientedRect(-7, -2, 3, 3, fish.accentColor),
    orientedRect(4, -2, 3, 3, fish.accentColor),
    orientedRect(-7, -1, 1, 1, clawShadow),
    orientedRect(6, -1, 1, 1, clawShadow),
    orientedRect(-4, 3, 1, 2, bodyShadow),
    orientedRect(-2, 3, 1, 2, bodyShadow),
    orientedRect(1, 3, 1, 2, bodyShadow),
    orientedRect(3, 3, 1, 2, bodyShadow),
    orientedRect(-1, 0, 1, 1, 0x061014),
    orientedRect(1, 0, 1, 1, 0x061014),
  ];

  if (fish.id === "fish_094") {
    rects.push(
      orientedRect(-4, -5, 7, 4, shellColor),
      orientedRect(-3, -6, 5, 1, shellShadow),
      orientedRect(-5, -4, 2, 3, shellShadow),
      orientedRect(1, -4, 3, 3, shellShadow),
      orientedRect(-2, -5, 2, 1, shellHighlight),
      orientedRect(0, -3, 2, 1, darkenColor(shellColor, 0.58)),
    );

    return rects;
  }

  if (fish.id === "fish_095") {
    rects.push(
      orientedRect(-4, -5, 7, 4, shellColor),
      orientedRect(-3, -6, 5, 1, shellHighlight),
      orientedRect(-4, -7, 1, 2, shellColor),
      orientedRect(-1, -7, 1, 2, shellColor),
      orientedRect(2, -7, 1, 2, shellColor),
      orientedRect(-5, -3, 2, 2, shellShadow),
      orientedRect(2, -3, 2, 2, shellShadow),
      orientedRect(-1, -4, 2, 1, darkenColor(shellColor, 0.58)),
    );

    return rects;
  }

  rects.push(
    orientedRect(-4, -5, 6, 4, shellColor),
    orientedRect(-3, -6, 4, 1, shellHighlight),
    orientedRect(-5, -4, 2, 3, shellColor),
    orientedRect(-4, -2, 5, 1, shellShadow),
    orientedRect(-3, -4, 3, 1, shellShadow),
    orientedRect(-2, -3, 1, 1, darkenColor(shellColor, 0.58)),
  );

  return rects;
}

/** 生成深渊巨鳌蟹的专属轮廓，用巨螯、尖刺和宽甲区别普通帝王蟹。 */
function createAbyssKingCrabRects(fish: FishGalleryItem): FishPixelRect[] {
  const shellShadow = darkenColor(fish.bodyColor, 0.68);
  const clawShadow = darkenColor(fish.accentColor, 0.72);

  return [
    rect(-5, -3, 10, 5, fish.bodyColor),
    rect(-4, -4, 8, 1, lightenColor(fish.bodyColor, 1.14)),
    rect(-6, -1, 12, 3, fish.bodyColor),
    rect(-5, 2, 10, 1, shellShadow),
    rect(-3, -2, 6, 1, shellShadow),
    rect(-9, -4, 4, 4, fish.accentColor),
    rect(-10, -3, 2, 2, clawShadow),
    rect(5, -3, 4, 3, fish.accentColor),
    rect(8, -2, 2, 2, clawShadow),
    rect(-5, 3, 1, 3, shellShadow),
    rect(-3, 3, 1, 3, shellShadow),
    rect(-1, 3, 1, 3, shellShadow),
    rect(1, 3, 1, 3, shellShadow),
    rect(3, 3, 1, 3, shellShadow),
    rect(4, 3, 1, 2, shellShadow),
    rect(-4, -6, 1, 2, fish.accentColor),
    rect(-1, -6, 1, 2, fish.accentColor),
    rect(2, -6, 1, 2, fish.accentColor),
    rect(4, -5, 1, 2, fish.accentColor),
    rect(-2, -1, 1, 1, 0x061014),
    rect(2, -1, 1, 1, 0x061014),
  ];
}

/** 生成马蹄蟹轮廓的矩形块，使用拱形甲壳和长尾刺区别普通螃蟹。 */
function createHorseshoeCrabRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);

  return [
    orientedRect(-4, -4, 9, 7, fish.bodyColor),
    orientedRect(-3, -5, 7, 1, lightenColor(fish.bodyColor, 1.12)),
    orientedRect(-5, -2, 11, 3, fish.bodyColor),
    orientedRect(-4, 3, 8, 1, darkenColor(fish.bodyColor, 0.72)),
    orientedRect(-7, -1, 2, 2, fish.accentColor),
    orientedRect(4, -1, 2, 2, fish.accentColor),
    orientedRect(-3, 4, 1, 2, darkenColor(fish.bodyColor, 0.72)),
    orientedRect(-1, 4, 1, 2, darkenColor(fish.bodyColor, 0.72)),
    orientedRect(1, 4, 1, 2, darkenColor(fish.bodyColor, 0.72)),
    orientedRect(-8, 3, 5, 1, fish.accentColor),
    orientedRect(-10, 2, 3, 1, fish.accentColor),
    orientedRect(2, -2, 1, 1, 0x061014),
  ];
}

/** 生成海豚轮廓的矩形块。 */
function createDolphinRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);

  return [
    orientedRect(-4, -2, 8, 4, fish.bodyColor),
    orientedRect(4, -1, 3, 2, fish.bodyColor),
    orientedRect(-6, -3, 2, 2, fish.accentColor),
    orientedRect(-6, 1, 2, 2, fish.accentColor),
    orientedRect(-1, -5, 2, 3, fish.accentColor),
    orientedRect(5, -1, 1, 1, 0x061014),
  ];
}

/** 生成海狮轮廓的矩形块，用圆头、胸鳍和厚身体区别鱼类。 */
function createSeaLionRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);
  const bellyColor = lightenColor(fish.bodyColor, 1.16);

  return [
    orientedRect(-6, -3, 10, 6, fish.bodyColor),
    orientedRect(3, -4, 4, 5, fish.bodyColor),
    orientedRect(-8, -3, 3, 2, fish.accentColor),
    orientedRect(-8, 1, 3, 2, fish.accentColor),
    orientedRect(-2, 2, 5, 2, bellyColor),
    orientedRect(-2, -5, 3, 2, fish.accentColor),
    orientedRect(5, -1, 1, 1, 0x061014),
  ];
}

/** 生成海豹轮廓的矩形块，用斑点胖身和短鳍区别海狮。 */
function createSealRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);
  const bellyColor = lightenColor(fish.bodyColor, 1.12);
  const shadowColor = darkenColor(fish.bodyColor, 0.72);

  return [
    orientedRect(-7, -3, 11, 6, fish.bodyColor),
    orientedRect(-5, -4, 8, 1, lightenColor(fish.bodyColor, 1.1)),
    orientedRect(-5, 3, 8, 1, shadowColor),
    orientedRect(3, -2, 4, 4, fish.bodyColor),
    orientedRect(5, -1, 2, 2, bellyColor),
    orientedRect(-9, -3, 3, 2, fish.accentColor),
    orientedRect(-9, 1, 3, 2, fish.accentColor),
    orientedRect(-3, 2, 5, 2, bellyColor),
    orientedRect(0, 3, 3, 2, bellyColor),
    orientedRect(-4, -2, 1, 1, fish.accentColor),
    orientedRect(-1, -3, 1, 1, fish.accentColor),
    orientedRect(1, -1, 1, 1, fish.accentColor),
    orientedRect(-2, 0, 1, 1, fish.accentColor),
    orientedRect(5, -1, 1, 1, 0x061014),
    orientedRect(6, 0, 1, 1, 0x061014),
  ];
}

/** 生成鲨鱼或锤头鲨轮廓的矩形块。 */
function createSharkRects(fish: FishGalleryItem, facingRight: boolean, hammerhead: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);
  const headWidth = hammerhead ? 4 : 2;
  const rects = [
    orientedRect(-5, -2, 10, 4, fish.bodyColor),
    orientedRect(-3, -4, 3, 2, fish.accentColor),
    orientedRect(-7, -3, 3, 2, fish.accentColor),
    orientedRect(-7, 1, 3, 2, fish.accentColor),
    orientedRect(5, -1, headWidth, 2, fish.bodyColor),
    orientedRect(6, -1, 1, 1, 0x061014),
  ];

  if (hammerhead) {
    rects.push(orientedRect(6, -3, 2, 6, fish.bodyColor));
  }

  return rects;
}

/** 生成银鲛轮廓的矩形块，用长吻、三角背鳍和鞭尾区别鲨鱼。 */
function createChimaeraRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);

  return [
    orientedRect(-6, -2, 10, 4, fish.bodyColor),
    orientedRect(-4, -3, 7, 1, lightenColor(fish.bodyColor, 1.14)),
    orientedRect(-3, 2, 7, 1, darkenColor(fish.bodyColor, 0.72)),
    orientedRect(4, -1, 4, 1, fish.accentColor),
    orientedRect(-10, -2, 4, 2, fish.accentColor),
    orientedRect(-10, 1, 4, 1, fish.accentColor),
    orientedRect(-1, -5, 3, 3, fish.accentColor),
    orientedRect(6, -1, 1, 1, 0x061014),
  ];
}

/** 生成腔棘鱼轮廓的矩形块，用厚重古鱼身体和多枚肉鳍表现古老感。 */
function createCoelacanthRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);
  const scaleColor = darkenColor(fish.bodyColor, 0.74);

  return [
    orientedRect(-6, -3, 11, 6, fish.bodyColor),
    orientedRect(-4, -4, 7, 1, lightenColor(fish.bodyColor, 1.12)),
    orientedRect(-5, 3, 8, 1, scaleColor),
    orientedRect(-9, -4, 3, 3, fish.accentColor),
    orientedRect(-9, 1, 3, 3, fish.accentColor),
    orientedRect(-2, -5, 2, 2, fish.accentColor),
    orientedRect(-2, 3, 2, 2, fish.accentColor),
    orientedRect(2, -4, 2, 2, fish.accentColor),
    orientedRect(2, 2, 2, 2, fish.accentColor),
    orientedRect(5, -1, 2, 2, fish.bodyColor),
    orientedRect(5, -1, 1, 1, 0x061014),
  ];
}

/** 生成骨架鱼轮廓的矩形块，用亮骨线和肋骨色块表现特殊剪影。 */
function createSkeletonFishRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);
  const boneColor = fish.accentColor;

  return [
    orientedRect(-6, -2, 9, 4, fish.bodyColor),
    orientedRect(-8, -3, 2, 2, boneColor),
    orientedRect(-8, 1, 2, 2, boneColor),
    orientedRect(-5, 0, 8, 1, boneColor),
    orientedRect(-3, -2, 1, 5, boneColor),
    orientedRect(-1, -2, 1, 5, boneColor),
    orientedRect(1, -2, 1, 5, boneColor),
    orientedRect(3, -1, 2, 2, fish.bodyColor),
    orientedRect(4, -1, 1, 1, 0x061014),
  ];
}

/** 生成幽灵鱼轮廓的矩形块，用飘带尾和冷色边光表现幽灵感但不使用透明主体。 */
function createGhostFishRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);
  const innerColor = lightenColor(fish.bodyColor, 1.14);

  return [
    orientedRect(-4, -3, 8, 6, fish.bodyColor),
    orientedRect(-3, -4, 6, 1, fish.accentColor),
    orientedRect(-3, 3, 6, 1, fish.accentColor),
    orientedRect(-7, -3, 3, 2, fish.accentColor),
    orientedRect(-8, 0, 4, 1, fish.accentColor),
    orientedRect(-7, 2, 3, 2, fish.accentColor),
    orientedRect(-1, -2, 3, 4, innerColor),
    orientedRect(4, -1, 2, 2, fish.bodyColor),
    orientedRect(4, -1, 1, 1, 0x061014),
  ];
}

/** 生成水母轮廓的矩形块。 */
function createJellyfishRects(fish: FishGalleryItem): FishPixelRect[] {
  const softBodyColor = lightenColor(fish.bodyColor, 1.12);
  const skirtColor = darkenColor(fish.bodyColor, 0.78);

  return [
    rect(-2, -3, 4, 1, lightenColor(fish.bodyColor, 1.18)),
    rect(-3, -2, 6, 2, softBodyColor),
    rect(-2, 0, 4, 1, fish.bodyColor),
    rect(-3, 1, 6, 1, skirtColor),
    rect(-2, 2, 1, 2, fish.accentColor),
    rect(0, 2, 1, 2, fish.accentColor),
    rect(2, 2, 1, 2, fish.accentColor),
    rect(-1, -1, 1, 1, 0xffffff),
  ];
}

/** 生成海星轮廓的矩形块。 */
function createStarfishRects(fish: FishGalleryItem): FishPixelRect[] {
  return [
    rect(-1, -1, 2, 2, fish.bodyColor),
    rect(-1, -5, 2, 4, fish.accentColor),
    rect(-1, 1, 2, 4, fish.accentColor),
    rect(-5, -1, 4, 2, fish.accentColor),
    rect(1, -1, 4, 2, fish.accentColor),
    rect(-3, -3, 2, 2, fish.bodyColor),
    rect(1, 1, 2, 2, fish.bodyColor),
  ];
}

/** 生成贝类轮廓的矩形块，用扇形壳纹和贴底体态区别鱼类。 */
function createShellfishRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  if (fish.id === "fish_140") {
    return createClamRects(fish, facingRight);
  }

  if (fish.id === "fish_141") {
    return createScallopRects(fish, facingRight);
  }

  if (fish.id === "fish_142") {
    return createRazorClamRects(fish, facingRight);
  }

  return createClamRects(fish, facingRight);
}

/** 生成蛤蜊的专属轮廓，用低矮双壳和闭合线表现静卧感。 */
function createClamRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);
  const shellShadow = darkenColor(fish.bodyColor, 0.72);

  return [
    orientedRect(-6, -2, 12, 4, fish.bodyColor),
    orientedRect(-5, -3, 10, 1, lightenColor(fish.bodyColor, 1.12)),
    orientedRect(-6, 1, 12, 2, shellShadow),
    orientedRect(-5, 0, 10, 1, fish.accentColor),
    orientedRect(-4, -1, 1, 2, fish.accentColor),
    orientedRect(-1, -2, 1, 3, fish.accentColor),
    orientedRect(2, -1, 1, 2, fish.accentColor),
    orientedRect(5, -1, 1, 1, 0x061014),
  ];
}

/** 生成扇贝的专属轮廓，用高扇形壳和放射纹区别蛤蜊。 */
function createScallopRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);
  const shellShadow = darkenColor(fish.bodyColor, 0.72);
  const shellHighlight = lightenColor(fish.bodyColor, 1.14);

  return [
    orientedRect(-5, -4, 10, 7, fish.bodyColor),
    orientedRect(-4, -5, 8, 1, shellHighlight),
    orientedRect(-3, -6, 6, 1, shellHighlight),
    orientedRect(-6, 0, 12, 3, shellShadow),
    orientedRect(-5, -1, 1, 4, fish.accentColor),
    orientedRect(-2, -3, 1, 6, fish.accentColor),
    orientedRect(1, -3, 1, 6, fish.accentColor),
    orientedRect(4, -1, 1, 4, fish.accentColor),
    orientedRect(0, -4, 1, 7, lightenColor(fish.accentColor, 1.06)),
    orientedRect(5, -1, 1, 1, 0x061014),
  ];
}

/** 生成蛏子的专属轮廓，用细长直壳和竖向壳纹表现埋沙贝类。 */
function createRazorClamRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);
  const shellShadow = darkenColor(fish.bodyColor, 0.74);

  return [
    orientedRect(-8, -2, 15, 4, fish.bodyColor),
    orientedRect(-7, -3, 13, 1, lightenColor(fish.bodyColor, 1.12)),
    orientedRect(-7, 2, 13, 1, shellShadow),
    orientedRect(-6, -1, 1, 3, fish.accentColor),
    orientedRect(-2, -1, 1, 3, fish.accentColor),
    orientedRect(2, -1, 1, 3, fish.accentColor),
    orientedRect(6, -1, 1, 2, fish.accentColor),
    orientedRect(6, -1, 1, 1, 0x061014),
  ];
}

/** 生成鳐鱼轮廓的矩形块，长尾始终在移动方向后方。 */
function createRayRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);

  return [
    orientedRect(-5, -2, 10, 4, fish.bodyColor),
    orientedRect(-3, -4, 6, 2, lightenColor(fish.bodyColor, 1.14)),
    orientedRect(-2, 2, 4, 2, darkenColor(fish.bodyColor, 0.72)),
    orientedRect(-10, 0, 5, 1, fish.accentColor),
    orientedRect(1, -1, 1, 1, 0x061014),
    orientedRect(3, -1, 1, 1, 0x061014),
  ];
}

/** 生成魟鱼轮廓的矩形块，圆盘身体和长鞭尾区别菱形鳐鱼。 */
function createStingrayRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);

  return [
    orientedRect(-5, -4, 9, 8, fish.bodyColor),
    orientedRect(-7, -2, 13, 4, fish.bodyColor),
    orientedRect(-3, -5, 5, 1, lightenColor(fish.bodyColor, 1.14)),
    orientedRect(-3, 4, 5, 1, darkenColor(fish.bodyColor, 0.72)),
    orientedRect(-10, 0, 6, 1, fish.accentColor),
    orientedRect(-2, -1, 1, 1, 0x061014),
    orientedRect(1, -1, 1, 1, 0x061014),
  ];
}

/** 生成蝠鲼轮廓的矩形块，用宽大三角翼和头角区别鳐、魟。 */
function createMantaRayRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);
  const wingShadow = darkenColor(fish.bodyColor, 0.72);

  return [
    orientedRect(-8, -2, 16, 4, fish.bodyColor),
    orientedRect(-6, -4, 12, 2, fish.bodyColor),
    orientedRect(-4, 2, 8, 2, wingShadow),
    orientedRect(5, -3, 2, 2, fish.accentColor),
    orientedRect(5, 1, 2, 2, fish.accentColor),
    orientedRect(-9, 0, 3, 1, fish.accentColor),
    orientedRect(1, -1, 1, 1, 0x061014),
    orientedRect(3, -1, 1, 1, 0x061014),
  ];
}

/** 生成海马轮廓的矩形块。 */
function createSeahorseRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);

  return [
    orientedRect(-2, -5, 4, 4, fish.bodyColor),
    orientedRect(2, -4, 3, 1, fish.bodyColor),
    orientedRect(-1, -1, 3, 6, fish.bodyColor),
    orientedRect(-4, 3, 4, 2, fish.accentColor),
    orientedRect(-4, 1, 1, 3, fish.accentColor),
    orientedRect(3, -4, 1, 1, 0x061014),
  ];
}

/** 生成鹦鹉螺轮廓的矩形块。 */
function createNautilusRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);

  return [
    orientedRect(-4, -3, 7, 6, fish.bodyColor),
    orientedRect(-2, -1, 3, 2, fish.accentColor),
    orientedRect(3, -2, 3, 4, fish.accentColor),
    orientedRect(5, -2, 3, 1, fish.accentColor),
    orientedRect(5, 0, 3, 1, fish.accentColor),
    orientedRect(5, 2, 3, 1, fish.accentColor),
    orientedRect(4, -1, 1, 1, 0x061014),
  ];
}

/** 生成乌贼轮廓的矩形块。 */
function createSquidRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);

  return [
    orientedRect(-3, -3, 7, 6, fish.bodyColor),
    orientedRect(-5, -2, 3, 4, fish.accentColor),
    orientedRect(3, -3, 3, 1, fish.accentColor),
    orientedRect(3, 0, 4, 1, fish.accentColor),
    orientedRect(3, 3, 3, 1, fish.accentColor),
    orientedRect(3, -1, 1, 1, 0x061014),
  ];
}

/** 生成鲸类轮廓的矩形块。 */
function createWhaleRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);

  return [
    orientedRect(-5, -3, 10, 6, fish.bodyColor),
    orientedRect(-4, 2, 8, 2, fish.accentColor),
    orientedRect(-7, -3, 3, 2, fish.accentColor),
    orientedRect(-7, 1, 3, 2, fish.accentColor),
    orientedRect(-1, -5, 2, 2, fish.accentColor),
    orientedRect(5, -1, 1, 1, 0x061014),
  ];
}

/** 生成龙首鳌鱼轮廓的矩形块，用龙角、须和鱼身表现传说神兽质感。 */
function createAoFishRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);
  const scaleColor = darkenColor(fish.bodyColor, 0.68);
  const bellyColor = lightenColor(fish.bodyColor, 1.16);
  const jadeColor = 0x72e2c8;

  return [
    orientedRect(-7, -2, 11, 5, fish.bodyColor),
    orientedRect(-6, -3, 8, 1, lightenColor(fish.bodyColor, 1.12)),
    orientedRect(-5, 3, 8, 1, scaleColor),
    orientedRect(3, -4, 4, 6, fish.bodyColor),
    orientedRect(6, -3, 2, 4, fish.bodyColor),
    orientedRect(7, -1, 2, 2, fish.bodyColor),
    orientedRect(-10, -5, 3, 3, fish.accentColor),
    orientedRect(-10, 1, 3, 3, fish.accentColor),
    orientedRect(-8, -3, 2, 6, fish.accentColor),
    orientedRect(4, -7, 1, 3, fish.accentColor),
    orientedRect(6, -7, 1, 3, fish.accentColor),
    orientedRect(3, -5, 1, 2, jadeColor),
    orientedRect(7, -4, 1, 2, jadeColor),
    orientedRect(8, -3, 1, 1, jadeColor),
    orientedRect(7, 1, 2, 1, jadeColor),
    orientedRect(0, -3, 1, 6, fish.accentColor),
    orientedRect(-4, -1, 2, 1, fish.accentColor),
    orientedRect(-1, 1, 2, 1, fish.accentColor),
    orientedRect(1, 2, 3, 1, bellyColor),
    orientedRect(5, -1, 1, 1, 0x061014),
  ];
}

/** 生成夜海文鳐轮廓的矩形块，贴近临时预览中的长身、白头、青尾和上下翼鳍。 */
function createWenyaoFishRects(fish: FishGalleryItem, facingRight: boolean): FishPixelRect[] {
  const orientedRect = createOrientedRect(facingRight);
  const bodyHighlight = 0x2b62b2;
  const bodyShadow = 0x0b2252;
  const headColor = 0xf7f3d8;
  const headShadow = 0xcfd7e6;
  const tailGlow = 0x40d7e8;
  const tailShadow = 0x208aa4;
  const mouthColor = 0xd94a3e;
  const mouthShadow = 0xa92d2b;

  return [
    orientedRect(-6, -2, 8, 4, fish.bodyColor),
    orientedRect(-5, -3, 6, 1, bodyHighlight),
    orientedRect(-6, 2, 7, 1, bodyShadow),
    orientedRect(1, -2, 4, 4, headColor),
    orientedRect(2, 2, 2, 1, headShadow),
    orientedRect(5, -1, 2, 1, mouthColor),
    orientedRect(5, 0, 1, 1, mouthShadow),
    orientedRect(-9, -2, 3, 2, tailGlow),
    orientedRect(-9, 1, 3, 2, tailShadow),
    orientedRect(-10, -3, 2, 1, fish.accentColor),
    orientedRect(-10, 3, 2, 1, fish.accentColor),
    orientedRect(-4, -6, 2, 4, fish.accentColor),
    orientedRect(-2, -7, 2, 5, headColor),
    orientedRect(0, -6, 2, 4, headShadow),
    orientedRect(2, -5, 2, 3, fish.accentColor),
    orientedRect(-2, -4, 6, 2, bodyHighlight),
    orientedRect(-1, -3, 5, 1, bodyShadow),
    orientedRect(-4, 2, 2, 4, fish.accentColor),
    orientedRect(-2, 2, 2, 5, headColor),
    orientedRect(0, 2, 2, 4, headShadow),
    orientedRect(2, 2, 2, 3, fish.accentColor),
    orientedRect(-2, 4, 6, 2, bodyHighlight),
    orientedRect(-1, 5, 5, 1, bodyShadow),
    orientedRect(-4, -1, 1, 1, tailGlow),
    orientedRect(-2, 0, 1, 1, tailGlow),
    orientedRect(0, -1, 1, 1, tailGlow),
    orientedRect(-3, 1, 1, 1, tailShadow),
    orientedRect(-1, 1, 1, 1, tailShadow),
    orientedRect(3, -1, 1, 1, 0x061014),
  ];
}

/** 基于朝右坐标创建可镜像矩形，避免朝左物种的尾巴、鳍和触须偏离主体。 */
function createOrientedRect(facingRight: boolean): typeof rect {
  return (x, y, width, height, color, alpha) => rect(facingRight ? x : -x - width, y, width, height, color, alpha);
}

/** 标准化矩形，允许用负宽度表达朝向后再转换为实际坐标。 */
function rect(x: number, y: number, width: number, height: number, color: number, alpha?: number): FishPixelRect {
  return {
    x: width < 0 ? x + width : x,
    y,
    width: Math.abs(width),
    height,
    color,
    alpha,
  };
}

/** 按比例调亮颜色，保留像素占位鱼的硬边色块。 */
function lightenColor(color: number, ratio: number): number {
  return scaleColor(color, ratio, true);
}

/** 按比例压暗颜色，保留像素占位鱼的硬边色块。 */
function darkenColor(color: number, ratio: number): number {
  return scaleColor(color, ratio, false);
}

/** 对十六进制颜色做简单缩放。 */
function scaleColor(color: number, ratio: number, lighten: boolean): number {
  const red = scaleChannel((color >> 16) & 255, ratio, lighten);
  const green = scaleChannel((color >> 8) & 255, ratio, lighten);
  const blue = scaleChannel(color & 255, ratio, lighten);

  return (red << 16) + (green << 8) + blue;
}

/** 对单个颜色通道做明暗缩放。 */
function scaleChannel(channel: number, ratio: number, lighten: boolean): number {
  if (lighten) {
    return Math.min(Math.round(channel * ratio), 255);
  }

  return Math.max(Math.round(channel * ratio), 0);
}
