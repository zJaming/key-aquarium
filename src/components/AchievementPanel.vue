<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import type { CSSProperties } from "vue";
import lockedAchievementIcon from "../assets/achievement-icons/locked-mystery.png";
import { getAchievementIconSrc } from "../game/achievementAssets";
import {
  ACHIEVEMENT_CONNECTED_IDS,
  ACHIEVEMENT_MAP_CONNECTIONS,
  ACHIEVEMENT_MAP_HEIGHT,
  ACHIEVEMENT_MAP_WIDTH,
  ACHIEVEMENT_NODE_SIZE,
  getAchievementChainRootId,
  getAchievementMapNode,
  type AchievementMapNode,
} from "../game/achievementMap";
import { ACHIEVEMENT_DEFINITIONS } from "../game/constants";
import type { AchievementId, AchievementStatusItem } from "../game/types";

type AchievementViewport = {
  x: number;
  y: number;
  scale: number;
};

type AchievementDetailView = {
  id: AchievementId;
  name: string;
  description: string;
  unlocked: boolean;
  hidden: boolean;
  unlockedAt: number | null;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  moved: boolean;
  achievementId: AchievementId | null;
} | null;

const props = defineProps<{
  achievements: AchievementStatusItem[];
}>();

const emit = defineEmits<{
  close: [];
}>();

const ACHIEVEMENT_MIN_SCALE = 0.2;
const ACHIEVEMENT_MAX_SCALE = 1.85;
const ACHIEVEMENT_DRAG_THRESHOLD = 5;
const ACHIEVEMENT_FIT_PADDING_SCALE = 0.8;
const ACHIEVEMENT_WHEEL_ZOOM_STEP = 0.0018;

const ACHIEVEMENT_DEFINITION_BY_ID = new Map(ACHIEVEMENT_DEFINITIONS.map((definition) => [definition.id, definition]));

const selectedAchievementId = ref<AchievementId | null>(null);
const mapViewportRef = ref<HTMLElement | null>(null);
const viewport = ref<AchievementViewport>({ x: 0, y: 0, scale: 1 });
const dragState = ref<DragState>(null);
const suppressNextNodeClick = ref(false);

let resizeObserver: ResizeObserver | null = null;

/** 按成就定义顺序读取已解锁徽章，保持陈列位置稳定。 */
const unlockedAchievements = computed(() => props.achievements);

/** 生成已解锁成就集合，供节点和连线快速判断状态。 */
const unlockedAchievementIds = computed(() => new Set(unlockedAchievements.value.map((achievement) => achievement.id)));

/** 创建完整成就星图节点数据，按定义顺序校验每个成就都有固定位置。 */
const achievementNodes = computed(() => ACHIEVEMENT_DEFINITIONS.map((definition) => {
  const node = getAchievementMapNode(definition.id);

  return {
    ...node,
    hidden: isAchievementHiddenBeforeUnlock(definition.id),
    unlocked: unlockedAchievementIds.value.has(definition.id),
  };
}));

/** 为连线补齐直线路径和解锁状态，避免模板中重复查找。 */
const achievementConnections = computed(() => ACHIEVEMENT_MAP_CONNECTIONS.map((connection) => {
  const fromNode = getAchievementMapNode(connection.from);
  const toNode = getAchievementMapNode(connection.to);

  return {
    ...connection,
    path: createAchievementConnectionPath(fromNode, toNode),
    unlocked: unlockedAchievementIds.value.has(connection.from) && unlockedAchievementIds.value.has(connection.to),
  };
}));

/** 读取当前选中的成就详情，隐藏成就未解锁时不暴露真实内容。 */
const selectedAchievement = computed<AchievementDetailView | null>(() => {
  if (!selectedAchievementId.value) {
    return null;
  }

  const unlockedAchievement = unlockedAchievements.value.find((achievement) => achievement.id === selectedAchievementId.value);
  const definition = ACHIEVEMENT_DEFINITION_BY_ID.get(selectedAchievementId.value);

  if (!definition) {
    return null;
  }

  const unlocked = Boolean(unlockedAchievement);
  const hidden = isAchievementHiddenBeforeUnlock(definition.id) && !unlocked;

  return {
    id: definition.id,
    name: hidden ? "???" : definition.name,
    description: hidden ? "???" : definition.description,
    unlocked,
    hidden,
    unlockedAt: unlockedAchievement?.unlockedAt ?? null,
  };
});

/** 生成成就星图的视口变换样式。 */
const mapTransform = computed(() => `translate3d(${viewport.value.x}px, ${viewport.value.y}px, 0) scale(${viewport.value.scale})`);

/** 读取成就节点的绝对定位样式。 */
function getAchievementNodeStyle(node: AchievementMapNode): CSSProperties {
  return {
    left: `${node.x - ACHIEVEMENT_NODE_SIZE / 2}px`,
    top: `${node.y - ACHIEVEMENT_NODE_SIZE / 2}px`,
  };
}

/** 打开成就详情弹窗。 */
function openAchievementDetail(achievementId: AchievementId): void {
  selectedAchievementId.value = achievementId;
}

/** 处理按钮自身 click 事件，补足键盘激活并避免拖拽结束后的误触。 */
function handleNodeClick(achievementId: AchievementId): void {
  if (suppressNextNodeClick.value) {
    suppressNextNodeClick.value = false;
    return;
  }

  openAchievementDetail(achievementId);
}

/** 关闭成就详情弹窗。 */
function closeAchievementDetail(): void {
  selectedAchievementId.value = null;
}

/** 读取成就对应的 8bit 图标。 */
function getAchievementIcon(achievementId: AchievementId): string {
  return getAchievementIconSrc(achievementId);
}

/** 根据解锁状态读取节点图标，未解锁统一不暴露真实图标。 */
function getAchievementCardIcon(achievementId: AchievementId, unlocked: boolean): string {
  return unlocked ? getAchievementIcon(achievementId) : lockedAchievementIcon;
}

/** 判断成就在解锁前是否需要隐藏名称和描述。 */
function isAchievementHiddenBeforeUnlock(achievementId: AchievementId): boolean {
  const definition = ACHIEVEMENT_DEFINITION_BY_ID.get(achievementId);

  if (definition?.hidden) {
    return true;
  }

  if (!ACHIEVEMENT_CONNECTED_IDS.has(achievementId)) {
    return true;
  }

  const chainRootId = getAchievementChainRootId(achievementId);
  return Boolean(ACHIEVEMENT_DEFINITION_BY_ID.get(chainRootId)?.hidden);
}

/** 格式化成就达成日期，保持弹窗信息短而明确。 */
function formatUnlockedAt(unlockedAt: number): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(unlockedAt));
}

/** 根据两端节点生成直线路径，规整链路下直线更清晰且更少交叉感。 */
function createAchievementConnectionPath(fromNode: AchievementMapNode, toNode: AchievementMapNode): string {
  return `M ${fromNode.x} ${fromNode.y} L ${toNode.x} ${toNode.y}`;
}

/** 将数值限制在允许范围内，统一处理缩放边界。 */
function clampValue(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** 根据容器尺寸重置星图视口，让成就图谱首次出现时完整可见。 */
function fitAchievementMapToViewport(): void {
  const container = mapViewportRef.value;

  if (!container) {
    return;
  }

  const bounds = container.getBoundingClientRect();
  const scale = clampValue(
    Math.min(bounds.width / ACHIEVEMENT_MAP_WIDTH, bounds.height / ACHIEVEMENT_MAP_HEIGHT) * ACHIEVEMENT_FIT_PADDING_SCALE,
    ACHIEVEMENT_MIN_SCALE,
    1,
  );

  viewport.value = {
    scale,
    x: (bounds.width - ACHIEVEMENT_MAP_WIDTH * scale) / 2,
    y: (bounds.height - ACHIEVEMENT_MAP_HEIGHT * scale) / 2,
  };
}

/** 记录拖拽起点，后续移动直接更新视口位移。 */
function startMapDrag(event: PointerEvent, achievementId: AchievementId | null = null): void {
  if (event.button !== 0) {
    return;
  }

  dragState.value = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    originX: viewport.value.x,
    originY: viewport.value.y,
    moved: false,
    achievementId,
  };

  mapViewportRef.value?.setPointerCapture(event.pointerId);
}

/** 从空白区域开始拖拽星图。 */
function handleMapPointerDown(event: PointerEvent): void {
  startMapDrag(event);
}

/** 从成就节点开始拖拽星图，同时保留点击打开详情的能力。 */
function handleNodePointerDown(event: PointerEvent, achievementId: AchievementId): void {
  startMapDrag(event, achievementId);
}

/** 拖拽时平移成就星图，并标记本次交互不是点击。 */
function handleMapPointerMove(event: PointerEvent): void {
  const currentDrag = dragState.value;

  if (!currentDrag || currentDrag.pointerId !== event.pointerId) {
    return;
  }

  const deltaX = event.clientX - currentDrag.startX;
  const deltaY = event.clientY - currentDrag.startY;

  if (!currentDrag.moved && Math.hypot(deltaX, deltaY) > ACHIEVEMENT_DRAG_THRESHOLD) {
    currentDrag.moved = true;
  }

  viewport.value = {
    ...viewport.value,
    x: currentDrag.originX + deltaX,
    y: currentDrag.originY + deltaY,
  };
}

/** 结束拖拽后释放指针捕获，并在下一轮点击前清理拖拽标记。 */
function handleMapPointerUp(event: PointerEvent): void {
  const currentDrag = dragState.value;

  if (!currentDrag || currentDrag.pointerId !== event.pointerId) {
    return;
  }

  if (mapViewportRef.value?.hasPointerCapture(event.pointerId)) {
    mapViewportRef.value.releasePointerCapture(event.pointerId);
  }
  dragState.value = null;

  if (currentDrag.moved) {
    suppressNextNodeClick.value = Boolean(currentDrag.achievementId);
    return;
  }

  if (currentDrag.achievementId) {
    openAchievementDetail(currentDrag.achievementId);
  }
}

/** 以鼠标位置为中心缩放星图，保证缩放时目标区域不飘走。 */
function handleMapWheel(event: WheelEvent): void {
  const container = mapViewportRef.value;

  if (!container) {
    return;
  }

  event.preventDefault();

  const bounds = container.getBoundingClientRect();
  const pointerX = event.clientX - bounds.left;
  const pointerY = event.clientY - bounds.top;
  const nextScale = clampValue(
    viewport.value.scale * (1 - event.deltaY * ACHIEVEMENT_WHEEL_ZOOM_STEP),
    ACHIEVEMENT_MIN_SCALE,
    ACHIEVEMENT_MAX_SCALE,
  );

  if (nextScale === viewport.value.scale) {
    return;
  }

  const worldX = (pointerX - viewport.value.x) / viewport.value.scale;
  const worldY = (pointerY - viewport.value.y) / viewport.value.scale;

  viewport.value = {
    scale: nextScale,
    x: pointerX - worldX * nextScale,
    y: pointerY - worldY * nextScale,
  };
}

/** 双击空白处时回到完整星图视图，降低小窗口里迷路的成本。 */
function handleMapDoubleClick(event: MouseEvent): void {
  if (event.target !== mapViewportRef.value) {
    return;
  }

  fitAchievementMapToViewport();
}

onMounted(() => {
  nextTick(() => {
    fitAchievementMapToViewport();

    if (mapViewportRef.value) {
      resizeObserver = new ResizeObserver(fitAchievementMapToViewport);
      resizeObserver.observe(mapViewportRef.value);
    }
  });
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});
</script>

<template>
  <aside class="achievement-panel absolute inset-0 z-20 overflow-hidden rounded-lg text-[#f8f0d8] backdrop-blur">
    <div class="achievement-panel__scanline" aria-hidden="true"></div>
    <div class="achievement-panel__bubbles" aria-hidden="true"></div>

    <button
      type="button"
      class="absolute right-3 top-3 z-40 grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-[#12313a]/90 text-[#d8fbff] shadow-[inset_0_0_0_1px_rgba(122,223,236,0.35),0_0_14px_rgba(55,186,207,0.18)] transition hover:bg-[#174653]"
      aria-label="关闭成就"
      @click="emit('close')"
    >
      ×
    </button>

    <section
      ref="mapViewportRef"
      class="achievement-map-viewport relative z-10 h-full w-full overflow-hidden"
      aria-label="成就星图"
      @pointerdown="handleMapPointerDown"
      @pointermove="handleMapPointerMove"
      @pointerup="handleMapPointerUp"
      @pointercancel="handleMapPointerUp"
      @wheel="handleMapWheel"
      @dblclick="handleMapDoubleClick"
    >
      <div
        class="achievement-map-world absolute left-0 top-0"
        :style="{ width: `${ACHIEVEMENT_MAP_WIDTH}px`, height: `${ACHIEVEMENT_MAP_HEIGHT}px`, transform: mapTransform }"
      >
        <svg
          class="achievement-map-links absolute inset-0"
          :width="ACHIEVEMENT_MAP_WIDTH"
          :height="ACHIEVEMENT_MAP_HEIGHT"
          :viewBox="`0 0 ${ACHIEVEMENT_MAP_WIDTH} ${ACHIEVEMENT_MAP_HEIGHT}`"
          aria-hidden="true"
        >
          <path
            v-for="connection in achievementConnections"
            :key="`${connection.from}-${connection.to}`"
            class="achievement-map-link"
            :class="{ 'achievement-map-link--unlocked': connection.unlocked }"
            :d="connection.path"
            fill="none"
          />
        </svg>

        <button
          v-for="node in achievementNodes"
          :key="node.id"
          type="button"
          class="achievement-node absolute cursor-pointer"
          :class="[
            `achievement-node--${node.group}`,
            { 'achievement-node--locked': !node.unlocked },
          ]"
          :style="getAchievementNodeStyle(node)"
          :aria-label="node.unlocked ? '查看已获得成就详情' : '查看未获得成就详情'"
          @pointerdown.stop="handleNodePointerDown($event, node.id)"
          @click.stop="handleNodeClick(node.id)"
        >
          <span class="achievement-node__halo" aria-hidden="true"></span>
          <span class="achievement-node__ring" aria-hidden="true"></span>
          <span class="achievement-node__icon-frame" aria-hidden="true">
            <img
              :src="getAchievementCardIcon(node.id, node.unlocked)"
              alt=""
              class="achievement-node__icon"
              aria-hidden="true"
            />
          </span>
        </button>
      </div>
    </section>

    <div class="achievement-map-hint absolute bottom-3 left-3 z-30" aria-hidden="true">
      拖动、缩放查看
    </div>

    <div
      v-if="selectedAchievement"
      class="absolute inset-0 z-50 bg-[#02070b]/58"
      @click.self="closeAchievementDetail"
    >
      <section class="achievement-detail-card absolute flex w-[288px] flex-col rounded-lg bg-[#07141a]/95 px-5 py-6 text-center shadow-[0_18px_50px_rgba(0,0,0,0.48)]">
        <div v-if="selectedAchievement.unlocked" class="achievement-detail-icon-frame mx-auto">
          <img
            :src="getAchievementIcon(selectedAchievement.id)"
            alt=""
            class="achievement-detail-icon"
            aria-hidden="true"
          />
        </div>
        <h2 :class="[selectedAchievement.unlocked ? 'mt-4 text-[#ffdc6e]' : 'mt-2 text-[#7c9ca2]', 'text-lg font-bold']">{{ selectedAchievement.name }}</h2>
        <p class="mt-2 text-xs leading-5 text-[#9dcbd3]">{{ selectedAchievement.description }}</p>
        <p class="mt-4 text-[11px] font-bold text-[#6ea5ad]">
          {{ selectedAchievement.unlocked && selectedAchievement.unlockedAt ? formatUnlockedAt(selectedAchievement.unlockedAt) : "未达成" }}
        </p>

        <button
          type="button"
          class="achievement-detail-close absolute bottom-0 left-1/2 grid h-9 w-9 -translate-x-1/2 translate-y-1/2 cursor-pointer place-items-center rounded-full bg-[#10252d] text-xl font-bold leading-none text-[#d8fbff] shadow-[0_8px_18px_rgba(0,0,0,0.34)] transition hover:bg-[#17343f]"
          aria-label="关闭成就详情"
          @click="closeAchievementDetail"
        >
          ×
        </button>
      </section>
    </div>
  </aside>
</template>

<style scoped>
.achievement-panel {
  border: 1px solid rgb(91 169 184 / 0.7);
  background:
    linear-gradient(180deg, rgb(24 69 78 / 0.24), rgb(3 13 18 / 0.18) 28%, rgb(5 18 23 / 0.4)),
    repeating-linear-gradient(0deg, rgb(97 209 225 / 0.06) 0 1px, transparent 1px 9px),
    repeating-linear-gradient(90deg, rgb(97 209 225 / 0.045) 0 1px, transparent 1px 9px),
    #061217;
  box-shadow:
    inset 0 0 0 2px rgb(4 17 21 / 0.75),
    inset 0 0 34px rgb(85 219 239 / 0.12),
    0 18px 60px rgb(2 10 14 / 0.5);
}

.achievement-panel__scanline {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, transparent 0, rgb(126 239 255 / 0.08) 48%, transparent 54%);
  animation: achievement-scan 3.8s linear infinite;
  opacity: 0.7;
}

.achievement-panel__bubbles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 18% 76%, rgb(133 232 244 / 0.24) 0 2px, transparent 3px),
    radial-gradient(circle at 84% 22%, rgb(133 232 244 / 0.18) 0 1px, transparent 2px),
    radial-gradient(circle at 72% 68%, rgb(133 232 244 / 0.2) 0 2px, transparent 3px);
  opacity: 0.75;
}

.achievement-map-viewport {
  cursor: grab;
  touch-action: none;
}

.achievement-map-viewport:active {
  cursor: grabbing;
}

.achievement-map-world {
  transform-origin: 0 0;
  will-change: transform;
}

.achievement-map-link {
  stroke: rgb(120 102 76 / 0.42);
  stroke-width: 4;
  stroke-dasharray: 5 8;
  stroke-linecap: round;
  filter: drop-shadow(0 1px 0 rgb(0 0 0 / 0.55));
}

.achievement-map-link--unlocked {
  stroke: rgb(255 220 110 / 0.84);
  stroke-dasharray: 0;
  filter:
    drop-shadow(0 0 5px rgb(255 220 110 / 0.26))
    drop-shadow(0 1px 0 rgb(0 0 0 / 0.48));
}

.achievement-node {
  width: 72px;
  height: 72px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  filter: drop-shadow(0 9px 8px rgb(0 0 0 / 0.38));
  transition:
    filter 160ms ease,
    transform 160ms ease;
}

.achievement-node:hover {
  filter:
    brightness(1.08)
    drop-shadow(0 10px 10px rgb(0 0 0 / 0.4));
  transform: scale(1.08);
}

.achievement-node:active {
  transform: scale(0.98);
}

.achievement-node--locked {
  cursor: grab;
  filter:
    saturate(0.45)
    brightness(0.58)
    drop-shadow(0 8px 7px rgb(0 0 0 / 0.42));
}

.achievement-node--locked:hover {
  filter:
    saturate(0.5)
    brightness(0.66)
    drop-shadow(0 8px 7px rgb(0 0 0 / 0.42));
  transform: none;
}

.achievement-node__halo,
.achievement-node__ring,
.achievement-node__icon-frame {
  position: absolute;
  border-radius: 999px;
  pointer-events: none;
}

.achievement-node__halo {
  inset: -10px;
  background: radial-gradient(circle, rgb(255 220 110 / 0.22), transparent 66%);
  opacity: 0.72;
}

.achievement-node--core .achievement-node__halo,
.achievement-node--species .achievement-node__halo {
  background: radial-gradient(circle, rgb(255 220 110 / 0.22), transparent 66%);
}

.achievement-node--tap .achievement-node__halo,
.achievement-node--keyboard .achievement-node__halo {
  background: radial-gradient(circle, rgb(117 230 242 / 0.2), transparent 66%);
}

.achievement-node--rarity .achievement-node__halo {
  background: radial-gradient(circle, rgb(255 126 98 / 0.25), transparent 66%);
}

.achievement-node--special .achievement-node__halo,
.achievement-node--interaction .achievement-node__halo {
  background: radial-gradient(circle, rgb(110 255 168 / 0.2), transparent 66%);
}

.achievement-node--locked .achievement-node__halo {
  background: radial-gradient(circle, rgb(76 117 124 / 0.22), transparent 68%);
  opacity: 0.56;
}

.achievement-node__ring {
  inset: 0;
  background:
    linear-gradient(135deg, rgb(255 239 176), rgb(171 111 53) 45%, rgb(255 220 110) 100%);
  box-shadow:
    inset 0 0 0 2px rgb(53 29 14 / 0.82),
    inset 0 0 0 6px rgb(8 23 29 / 0.82),
    0 0 16px rgb(255 220 110 / 0.24);
}

.achievement-node--locked .achievement-node__ring {
  background: linear-gradient(135deg, rgb(88 111 116), rgb(32 51 58) 52%, rgb(93 120 124));
  box-shadow:
    inset 0 0 0 2px rgb(8 23 29 / 0.92),
    inset 0 0 0 6px rgb(5 16 22 / 0.88);
}

.achievement-node__icon-frame {
  inset: 8px;
  display: grid;
  place-items: center;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 44%, rgb(216 251 255 / 0.16), transparent 54%),
    linear-gradient(180deg, rgb(8 34 43 / 0.94), rgb(3 14 22 / 0.94));
  clip-path: circle(50% at 50% 50%);
  box-shadow:
    inset 0 0 0 2px rgb(216 251 255 / 0.12),
    inset 0 6px 0 rgb(255 255 255 / 0.05);
  mask: radial-gradient(circle, #000 0 100%);
  -webkit-mask: radial-gradient(circle, #000 0 100%);
  transform: translateZ(0);
}

.achievement-node__icon {
  width: 100%;
  height: 100%;
  object-fit: cover;
  image-rendering: pixelated;
}

.achievement-node--locked .achievement-node__icon {
  filter:
    saturate(0.78)
    brightness(0.78);
}

.achievement-map-hint {
  border-radius: 999px;
  padding: 0.32rem 0.58rem;
  color: rgb(183 226 230 / 0.76);
  background: rgb(3 12 18 / 0.46);
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0;
  box-shadow: inset 0 0 0 1px rgb(117 230 242 / 0.12);
  pointer-events: none;
}

.achievement-detail-icon-frame {
  display: grid;
  width: 108px;
  height: 108px;
  place-items: center;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 48%, rgb(117 230 242 / 0.18), transparent 58%),
    linear-gradient(180deg, rgb(12 48 58 / 0.9), rgb(4 17 24 / 0.82));
  border: 2px solid rgb(49 112 123 / 0.86);
  border-radius: 999px;
  clip-path: circle(50% at 50% 50%);
  box-shadow:
    inset 0 0 0 2px rgb(2 12 17 / 0.62),
    inset 0 8px 0 rgb(255 255 255 / 0.05),
    0 7px 0 rgb(4 17 22 / 0.82),
    0 14px 24px rgb(0 0 0 / 0.3);
  mask: radial-gradient(circle, #000 0 100%);
  -webkit-mask: radial-gradient(circle, #000 0 100%);
  transform: translateZ(0);
}

.achievement-detail-icon {
  width: 100%;
  height: 100%;
  object-fit: cover;
  image-rendering: pixelated;
}

.achievement-detail-card {
  --achievement-detail-scale: 1;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) scale(var(--achievement-detail-scale));
  transform-origin: center;
}

@media (prefers-reduced-motion: reduce) {
  .achievement-node {
    transition: none;
  }

  .achievement-panel__scanline {
    animation: none;
  }
}

@keyframes achievement-scan {
  from {
    transform: translateY(-100%);
  }

  to {
    transform: translateY(100%);
  }
}

@media (max-height: 360px), (max-width: 360px) {
  .achievement-detail-card {
    --achievement-detail-scale: 0.82;
  }
}

@media (max-height: 290px), (max-width: 290px) {
  .achievement-detail-card {
    --achievement-detail-scale: 0.68;
  }
}

@media (max-height: 230px), (max-width: 230px) {
  .achievement-detail-card {
    --achievement-detail-scale: 0.52;
  }
}

@media (max-height: 170px), (max-width: 170px) {
  .achievement-detail-card {
    --achievement-detail-scale: 0.38;
  }
}

@media (max-height: 120px), (max-width: 120px) {
  .achievement-detail-card {
    --achievement-detail-scale: 0.3;
  }
}
</style>
