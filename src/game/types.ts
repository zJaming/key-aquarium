export type CropId = `crop_${string}`;

export type FishId = `fish_${string}`;

export type FishRarity = "common" | "rare" | "curio" | "legendary";

export type AchievementId =
  | "first_guest"
  | "fishing_beginner"
  | "fishing_tyrant"
  | "fishing_hero"
  | "fishing_saint"
  | "fishing_god"
  | "tap_starter"
  | "tap_routine_breaker"
  | "crazy_clicker"
  | "tap_champion"
  | "ten_thousand_keys_day"
  | "key_flow"
  | "million_slash"
  | "curio_first"
  | "golden_glimmer"
  | "golden_haul"
  | "curio_collector"
  | "deep_sea_explorer"
  | "deep_echo"
  | "legendary_hall"
  | "daily_checkin_3"
  | "daily_checkin_7"
  | "daily_checkin_30"
  | "daily_fish_9"
  | "daily_fish_30"
  | "benthic_team"
  | "deep_lights"
  | "soft_party"
  | "large_first"
  | "large_shadow_pack"
  | "large_shadow_group"
  | "large_shadow_party"
  | "storm_wave"
  | "bubble_maker"
  | "lights_out_observer"
  | "wave_maker"
  | "species_scale_9"
  | "species_scale_18"
  | "species_scale_36"
  | "species_scale_72"
  | "species_scale_108"
  | "species_scale_144"
  | "species_scale_169"
  | "deep_curse"
  | "undersea_zoo";

export type AchievementMetric =
  | "fishTotal"
  | "collectedSpeciesTotal"
  | "curioFishTotal"
  | "curioSpeciesTotal"
  | "legendaryFishTotal"
  | "legendarySpeciesTotal"
  | "manualButtonPresses"
  | "todayPresses"
  | "totalPresses"
  | "activeDayStreak"
  | "dailyFishOpenings"
  | "benthicSpeciesTotal"
  | "anglerSpeciesTotal"
  | "softBodySpeciesTotal"
  | "largeFishTotal"
  | "largeSpeciesTotal"
  | "skeletonSpeciesTotal"
  | "specialZooSpeciesTotal"
  | "bubbleButtonPresses"
  | "lightTogglePresses"
  | "shakeButtonPresses";

export type FishAchievementTag = "benthic" | "angler" | "softBody" | "large" | "skeleton" | "specialZoo";

export type FishVisualRenderMode = "pixelRects" | "sprite";

export type FishSilhouette =
  | "angelfish"
  | "anglerfish"
  | "aoFish"
  | "barracuda"
  | "billfish"
  | "clownfish"
  | "crab"
  | "dolphin"
  | "eel"
  | "fish"
  | "flounder"
  | "flyingFish"
  | "ghostFish"
  | "hammerhead"
  | "hermitCrab"
  | "horseshoeCrab"
  | "jellyfish"
  | "kingCrab"
  | "lobster"
  | "mantaRay"
  | "mantisShrimp"
  | "nautilus"
  | "octopus"
  | "parrotfish"
  | "puffer"
  | "ray"
  | "ribbonfish"
  | "salamander"
  | "seaCucumber"
  | "seaDragon"
  | "seaSlug"
  | "seaUrchin"
  | "seahorse"
  | "seal"
  | "seaLion"
  | "shellfish"
  | "shark"
  | "chimaera"
  | "coelacanth"
  | "shrimp"
  | "skeletonFish"
  | "squid"
  | "starfish"
  | "stingray"
  | "sunfish"
  | "tuna"
  | "turtle"
  | "wenyaoFish"
  | "whale";

export type KeyId = string;

export type SceneId = "farm" | "aquarium";

export interface CropDefinition {
  id: CropId;
  name: string;
}

export interface FishDefinition {
  id: FishId;
  name: string;
  rarity: FishRarity;
  bodyColor: number;
  accentColor: number;
  silhouette?: FishSilhouette;
  scaleMultiplier?: number;
  achievementTags?: FishAchievementTag[];
  visualAsset?: FishVisualAssetDefinition;
}

export interface FishVisualAssetDefinition {
  renderMode: FishVisualRenderMode;
  spriteKey?: string;
  assetPath?: string;
  frameWidth?: number;
  frameHeight?: number;
  frameCount?: number;
}

export interface FishRarityDefinition {
  id: FishRarity;
  name: string;
  weight: number;
  minPresses: number;
  maxPresses: number;
}

export interface AchievementDefinition {
  id: AchievementId;
  name: string;
  description: string;
  metric: AchievementMetric;
  threshold: number;
  hidden?: boolean;
}

export interface CropProgress {
  id: CropId;
  unlocked: boolean;
  highestLevel: number;
  fullCollections: number;
}

export interface KeyProgress {
  keyId: KeyId;
  pressCount: number;
  level: number;
  cropId: CropId | null;
  cropLevel: number;
  cropCyclePresses: number;
  cropReadyAt: number | null;
  lastPressedAt: number | null;
}

export interface KeyPressStat {
  keyId: KeyId;
  pressCount: number;
  lastPressedAt: number | null;
}

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type FishDisplayMode = "default" | "compact";

export interface AppSettings {
  keyFeedbackEnabled: boolean;
  fishDisplayMode: FishDisplayMode;
}

export interface AquariumCycle {
  rarity: FishRarity;
  targetPresses: number;
  currentPresses: number;
  startedAt: number;
  salt: number;
}

export interface FishCollectionProgress {
  id: FishId;
  count: number;
  firstOpenedAt: number;
  lastOpenedAt: number;
}

export interface AquariumProgress {
  currentCycle: AquariumCycle;
  fishCollections: Partial<Record<FishId, FishCollectionProgress>>;
  totalOpenings: number;
  lastOpenedFishId: FishId | null;
  lastOpenedAt: number | null;
}

export interface AchievementUnlockRecord {
  id: AchievementId;
  unlockedAt: number;
}

export interface AchievementRecentEvent {
  type: "achievement";
  achievementId: AchievementId;
  createdAt: number;
}

export interface AchievementProgress {
  unlockedAchievements: Partial<Record<AchievementId, AchievementUnlockRecord>>;
  manualButtonPresses: number;
  bubbleButtonPresses: number;
  lightTogglePresses: number;
  shakeButtonPresses: number;
  activeDayStreak: number;
  lastActiveDayKey: string | null;
  dailyFishOpenings: number;
  dailyFishOpeningsDayKey: string | null;
  recentEvents: AchievementRecentEvent[];
}

export interface AquariumMarqueeEvent {
  type: "achievement" | "fish";
  message: string;
  color: number;
  createdAt: number;
}

export interface KeyboardFarmProgress {
  version: number;
  activeSceneId: SceneId;
  totalPresses: number;
  todayPresses: number;
  todayKey: string;
  keyStats: Record<KeyId, KeyPressStat>;
  keys: Record<KeyId, KeyProgress>;
  cropProgress: Record<CropId, CropProgress>;
  aquariumProgress: AquariumProgress;
  achievementProgress: AchievementProgress;
  fullCropCollections: number;
  farmLevel: number;
  alwaysOnTop: boolean;
  windowBounds: WindowBounds | null;
  settings: AppSettings;
  updatedAt: number;
}

export interface FarmStatus {
  level: number;
  fullCropCollections: number;
  unlockedCropIds: CropId[];
  crops: Array<{
    id: CropId;
    name: string;
    unlocked: boolean;
    highestLevel: number;
    readyCount: number;
    fullCollections: number;
  }>;
}

export interface FishGalleryItem extends FishDefinition {
  collected: boolean;
  count: number;
  firstOpenedAt: number | null;
  lastOpenedAt: number | null;
}

export interface AquariumStatus {
  totalOpenings: number;
  collectedSpecies: number;
  collectedFishCount: number;
  totalSpecies: number;
  cycleProgressRatio: number;
  lastOpenedFish: FishGalleryItem | null;
  fishInTank: FishGalleryItem[];
  fishGallery: FishGalleryItem[];
  recentAchievement: AchievementStatusItem | null;
  marqueeEvents: AquariumMarqueeEvent[];
}

export interface AchievementStatusItem extends AchievementDefinition {
  unlockedAt: number;
}

export interface AchievementStatus {
  unlockedAchievements: AchievementStatusItem[];
  hasUnlockedAchievements: boolean;
}
