<script setup lang="ts">
import { animate } from "animejs";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import AquariumGalleryCanvas from "./AquariumGalleryCanvas.vue";
import type { FishPixelRect } from "../game/fishPixelArt";
import {
  getFishVisualPixelRects,
  getFishVisualViewBox,
} from "../game/fishVisualAssets";
import type { AquariumStatus, FishId, FishRarity } from "../game/types";
import { sortDiscoveredGalleryFish } from "../render/aquariumGalleryLayout";

const props = defineProps<{
  aquariumStatus: AquariumStatus;
}>();

const emit = defineEmits<{
  close: [];
}>();

const selectedFishId = ref<FishId | null>(null);
const statsExpanded = ref(false);
const panelRef = ref<HTMLElement | null>(null);
let titleAnimation: ReturnType<typeof animate> | null = null;

/** 筛选图鉴中已经发现的物种，并按品质、最近获得时间和 ID 稳定排序。 */
const discoveredFish = computed(() =>
  sortDiscoveredGalleryFish(props.aquariumStatus.fishGallery),
);

/** 读取当前被点击查看详情的物种。 */
const selectedFish = computed(
  () =>
    discoveredFish.value.find((fish) => fish.id === selectedFishId.value) ??
    null,
);

/** 打开已发现物种的详情弹窗。 */
function openFishDetail(fishId: FishId): void {
  selectedFishId.value = fishId;
}

/** 关闭当前物种详情弹窗。 */
function closeFishDetail(): void {
  selectedFishId.value = null;
}

/** 切换图鉴左下角统计面板的展开状态。 */
function toggleGalleryStats(): void {
  statsExpanded.value = !statsExpanded.value;
}

/** 读取稀有度对应的名称颜色类。 */
function getFishNameClass(rarity: FishRarity): string {
  return {
    common: "text-[#d8fbff]",
    rare: "text-[#6effa8]",
    curio: "text-[#ffdc6e]",
    legendary: "text-[#ff7a7a]",
  }[rarity];
}

/** 生成图鉴 SVG 像素块的稳定 key。 */
function getFishPixelRectKey(rect: FishPixelRect, index: number): string {
  return `${index}:${rect.x}:${rect.y}:${rect.width}:${rect.height}:${rect.color}`;
}

/** 把十六进制数字颜色转换为 CSS 颜色。 */
function toCssColor(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

/** 播放左下角已发现数量的轻量 animejs 入场动效。 */
function playPanelAtmosphere(): void {
  const panel = panelRef.value;

  if (!panel || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const headingTargets = panel.querySelectorAll(".gallery-heading-motion");
  titleAnimation = animate(headingTargets, {
    opacity: [0, 1],
    y: [-5, 0],
    duration: 560,
    delay: (_target: unknown, index: number) => index * 80,
    ease: "outCubic",
  });
}

/** 停止 animejs 氛围动效，避免面板销毁后动画继续运行。 */
function stopPanelAtmosphere(): void {
  titleAnimation?.revert();
  titleAnimation = null;
}

onMounted(() => {
  playPanelAtmosphere();
});

onBeforeUnmount(() => {
  stopPanelAtmosphere();
});

watch(
  () => discoveredFish.value,
  (fish) => {
    if (
      selectedFishId.value &&
      !fish.some((item) => item.id === selectedFishId.value)
    ) {
      selectedFishId.value = null;
    }
  },
);
</script>

<template>
  <aside
    ref="panelRef"
    class="gallery-panel absolute inset-0 z-20 overflow-hidden rounded-lg text-[#d8fbff] backdrop-blur"
  >
    <div class="gallery-panel__scanline" aria-hidden="true"></div>
    <div class="gallery-panel__bubbles" aria-hidden="true"></div>

    <button
      type="button"
      class="absolute right-3 top-3 z-40 grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-[#12313a]/90 text-[#d8fbff] shadow-[inset_0_0_0_1px_rgba(122,223,236,0.35),0_0_14px_rgba(55,186,207,0.18)] transition hover:bg-[#174653]"
      aria-label="关闭图鉴"
      @click="emit('close')"
    >
      ×
    </button>

    <div class="absolute inset-0 z-10">
      <AquariumGalleryCanvas
        v-if="discoveredFish.length > 0"
        :fish="discoveredFish"
        @select-fish="openFishDetail"
      />
      <p
        v-else
        class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-[#4e7882]"
      >
        还没有发现物种
      </p>
    </div>

    <button
      type="button"
      class="gallery-heading-motion gallery-stats-toggle absolute bottom-3 left-4 z-30 cursor-pointer text-left text-xs font-bold text-[#72b4c0]"
      :aria-expanded="statsExpanded"
      aria-label="查看图鉴统计"
      @click="toggleGalleryStats"
    >
      <span>已发现 {{ discoveredFish.length }}</span>
    </button>

    <section
      v-if="statsExpanded"
      class="gallery-stats-popover absolute bottom-9 left-4 z-30 min-w-[8.5rem] rounded-md px-3 py-2 text-xs font-bold text-[#d8fbff]"
      aria-label="图鉴统计"
    >
      <p class="flex items-center justify-between gap-4">
        <span class="text-[#72b4c0]">已发现种类</span>
        <strong>{{ discoveredFish.length }}</strong>
      </p>
      <p class="mt-1 flex items-center justify-between gap-4">
        <span class="text-[#72b4c0]">已获得总数</span>
        <strong>{{ aquariumStatus.collectedFishCount }}</strong>
      </p>
    </section>

    <div
      v-if="selectedFish"
      class="absolute inset-0 z-50 overflow-hidden bg-[#02070b]/58"
      @click.self="closeFishDetail"
    >
      <section
        class="fish-detail-card absolute flex w-[326px] flex-col overflow-visible rounded-lg bg-[#07141a]/94 p-6 pb-8 text-center shadow-[0_18px_50px_rgba(0,0,0,0.48)]"
      >
        <div class="flex min-h-0 justify-center">
          <span
            class="detail-specimen-icon"
            :class="`detail-rarity-${selectedFish.rarity}`"
          >
            <svg
              class="detail-fish-svg"
              :viewBox="getFishVisualViewBox(selectedFish)"
              aria-hidden="true"
              focusable="false"
            >
              <rect
                v-for="(rect, index) in getFishVisualPixelRects(selectedFish)"
                :key="getFishPixelRectKey(rect, index)"
                :x="rect.x"
                :y="rect.y"
                :width="rect.width"
                :height="rect.height"
                :fill="toCssColor(rect.color)"
              />
            </svg>
          </span>
        </div>

        <div
          class="fish-detail-meta mt-5 flex items-center justify-between gap-4 text-base font-bold"
        >
          <span
            class="truncate text-left"
            :class="getFishNameClass(selectedFish.rarity)"
            >{{ selectedFish.name }}</span
          >
          <span class="shrink-0 text-right text-[#72b4c0]"
            >×{{ selectedFish.count }}</span
          >
        </div>

        <button
          type="button"
          class="fish-detail-close absolute bottom-0 left-1/2 z-10 h-9 w-9 -translate-x-1/2 translate-y-1/2 cursor-pointer rounded-full bg-[#10252d] text-[#d8fbff] shadow-[0_8px_18px_rgba(0,0,0,0.34)] transition hover:bg-[#17343f]"
          aria-label="关闭物种详情"
          @click="closeFishDetail"
        >
          <span
            class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[52%] text-xl font-bold leading-none"
            aria-hidden="true"
            >×</span
          >
        </button>
      </section>
    </div>
  </aside>
</template>

<style scoped>
.gallery-panel {
  border: 1px solid rgb(91 169 184 / 0.7);
  background:
    linear-gradient(
      180deg,
      rgb(24 69 78 / 0.24),
      rgb(3 13 18 / 0.18) 28%,
      rgb(5 18 23 / 0.4)
    ),
    repeating-linear-gradient(
      0deg,
      rgb(97 209 225 / 0.06) 0 1px,
      transparent 1px 9px
    ),
    repeating-linear-gradient(
      90deg,
      rgb(97 209 225 / 0.045) 0 1px,
      transparent 1px 9px
    ),
    #061217;
  box-shadow:
    inset 0 0 0 2px rgb(4 17 21 / 0.75),
    inset 0 0 34px rgb(85 219 239 / 0.12),
    0 18px 60px rgb(2 10 14 / 0.5);
}

.gallery-panel__scanline {
  pointer-events: none;
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 0, rgb(126 239 255 / 0.08) 48%, transparent 54%);
  animation: gallery-scan 3.8s linear infinite;
  opacity: 0.7;
}

.gallery-panel__bubbles {
  pointer-events: none;
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 18% 76%, rgb(133 232 244 / 0.24) 0 2px, transparent 3px),
    radial-gradient(circle at 84% 22%, rgb(133 232 244 / 0.18) 0 1px, transparent 2px),
    radial-gradient(circle at 72% 68%, rgb(133 232 244 / 0.2) 0 2px, transparent 3px);
  opacity: 0.75;
}

.gallery-heading-motion {
  opacity: 0;
}

.gallery-stats-toggle {
  padding: 0.1rem 0;
  text-shadow: 0 1px 0 rgb(0 0 0 / 0.5);
  transition:
    color 160ms ease,
    filter 160ms ease;
}

.gallery-stats-toggle:hover {
  color: #9ee8f2;
  filter: brightness(1.08);
}

.gallery-stats-popover {
  background:
    linear-gradient(180deg, rgb(18 49 58 / 0.9), rgb(7 21 27 / 0.94)),
    radial-gradient(circle at 18% 0, rgb(114 180 192 / 0.22), transparent 60%);
  box-shadow:
    inset 0 0 0 1px rgb(122 223 236 / 0.2),
    0 10px 24px rgb(0 0 0 / 0.3);
}

.fish-detail-card {
  --detail-card-scale: 1;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) scale(var(--detail-card-scale));
  transform-origin: center;
}

.detail-specimen-icon {
  --detail-edge: 90 139 145;
  --detail-glow: 0.2;
  --detail-base: 21 51 59;
  position: relative;
  overflow: visible;
  display: grid;
  width: 168px;
  height: 168px;
  place-items: center;
  border-radius: 50%;
  background: radial-gradient(
    circle at 50% 50%,
    rgb(var(--detail-edge) / calc(0.07 + var(--detail-glow) * 0.1)) 0 16%,
    rgb(var(--detail-edge) / calc(0.035 + var(--detail-glow) * 0.07)) 17% 34%,
    transparent 58%
  );
  isolation: isolate;
}

.detail-specimen-icon::before,
.detail-specimen-icon::after {
  pointer-events: none;
  position: absolute;
  content: "";
}

.detail-specimen-icon::before {
  inset: -8%;
  z-index: 0;
  background: repeating-conic-gradient(
    from 0deg at 50% 50%,
    rgb(var(--detail-edge) / calc(0.066 + var(--detail-glow) * 0.048)) 0deg,
    rgb(var(--detail-edge) / calc(0.066 + var(--detail-glow) * 0.048)) 15deg,
    transparent 15deg,
    transparent 30deg
  );
  border-radius: 50%;
  -webkit-mask-image: radial-gradient(
    circle at 50% 50%,
    rgb(255 255 255 / 1) 0 48%,
    rgb(255 255 255 / 0.58) 64%,
    rgb(255 255 255 / 0.18) 80%,
    transparent 100%
  );
  mask-image: radial-gradient(
    circle at 50% 50%,
    rgb(255 255 255 / 1) 0 48%,
    rgb(255 255 255 / 0.58) 64%,
    rgb(255 255 255 / 0.18) 80%,
    transparent 100%
  );
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  animation: detail-rays-spin 22s linear infinite;
}

.detail-specimen-icon::after {
  inset: -4%;
  z-index: 2;
  background: radial-gradient(
    circle at 50% 50%,
    rgb(var(--detail-edge) / calc(0.05 + var(--detail-glow) * 0.04)) 0 16%,
    rgb(var(--detail-edge) / calc(0.014 + var(--detail-glow) * 0.022)) 34%,
    transparent 68%
  );
  border-radius: 50%;
  -webkit-mask-image: radial-gradient(
    circle at 50% 50%,
    rgb(255 255 255 / 1) 0 46%,
    rgb(255 255 255 / 0.5) 64%,
    rgb(255 255 255 / 0.12) 80%,
    transparent 100%
  );
  mask-image: radial-gradient(
    circle at 50% 50%,
    rgb(255 255 255 / 1) 0 46%,
    rgb(255 255 255 / 0.5) 64%,
    rgb(255 255 255 / 0.12) 80%,
    transparent 100%
  );
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
}

.detail-rarity-common {
  --detail-edge: 90 139 145;
  --detail-glow: 0.18;
  --detail-base: 21 51 59;
}

.detail-rarity-rare {
  --detail-edge: 110 255 168;
  --detail-glow: 0.3;
  --detail-base: 18 65 45;
}

.detail-rarity-curio {
  --detail-edge: 255 220 110;
  --detail-glow: 0.4;
  --detail-base: 62 51 32;
}

.detail-rarity-legendary {
  --detail-edge: 255 122 122;
  --detail-glow: 0.52;
  --detail-base: 61 32 39;
}

.detail-fish-svg {
  position: relative;
  z-index: 5;
  width: 118px;
  height: 88px;
  overflow: visible;
  shape-rendering: crispEdges;
}

@keyframes detail-rays-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@keyframes gallery-scan {
  from {
    transform: translateY(-100%);
  }

  to {
    transform: translateY(100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .gallery-heading-motion {
    opacity: 1;
  }

  .gallery-panel__scanline {
    animation: none;
  }

  .detail-specimen-icon::before {
    animation: none;
  }
}

@media (max-height: 320px), (max-width: 320px) {
  .fish-detail-card {
    --detail-card-scale: 0.86;
  }
}

@media (max-height: 260px), (max-width: 260px) {
  .fish-detail-card {
    --detail-card-scale: 0.68;
  }
}

@media (max-height: 210px), (max-width: 210px) {
  .fish-detail-card {
    --detail-card-scale: 0.56;
  }
}

@media (max-height: 170px), (max-width: 170px) {
  .fish-detail-card {
    --detail-card-scale: 0.48;
  }
}

@media (max-height: 130px), (max-width: 130px) {
  .fish-detail-card {
    --detail-card-scale: 0.36;
  }
}

@media (max-height: 108px), (max-width: 108px) {
  .fish-detail-card {
    --detail-card-scale: 0.32;
  }
}
</style>
