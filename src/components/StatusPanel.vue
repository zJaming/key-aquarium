<script setup lang="ts">
import { computed } from "vue";
import type { KeyPressStat } from "../game/types";
import { getKeyDisplayLabel } from "../game/keyboardLayout";

const props = defineProps<{
  totalPresses: number;
  todayPresses: number;
  topKeys: KeyPressStat[];
}>();

const emit = defineEmits<{
  close: [];
}>();

const visibleTopKeys = computed(() => props.topKeys);
const topKeyMaxCount = computed(() => Math.max(1, ...visibleTopKeys.value.map((key) => key.pressCount)));

/** 格式化按键次数，避免大数字挤压面板。 */
function formatCount(value: number): string {
  return new Intl.NumberFormat("zh-CN").format(value);
}

/** 格式化键帽上的紧凑次数，避免 k、m 级别数字挤压布局。 */
function formatCompactCount(value: number): string {
  if (value >= 1_000_000) {
    return `${formatCompactDecimal(value / 1_000_000)}m`;
  }

  if (value >= 1_000) {
    return `${formatCompactDecimal(value / 1_000)}k`;
  }

  return String(value);
}

/** 格式化紧凑单位的小数部分，整数时不显示无意义的 .0。 */
function formatCompactDecimal(value: number): string {
  return value >= 10 || Number.isInteger(value) ? String(Math.floor(value)) : value.toFixed(1);
}

/** 计算键帽能量条高度，让排行榜像控制台仪表而不是表格。 */
function getKeyMeterHeight(key: KeyPressStat): string {
  const ratio = Math.max(0.16, key.pressCount / topKeyMaxCount.value);

  return `${Math.round(ratio * 100)}%`;
}

/** 计算键帽排名样式，突出第一名并保持后续键位层级。 */
function getKeyRankClass(index: number): string {
  if (index === 0) {
    return "status-keycap--first";
  }

  if (index < 3) {
    return "status-keycap--top";
  }

  return "";
}
</script>

<template>
  <aside
    class="status-console absolute inset-0 z-20 overflow-hidden rounded-lg text-[#d8fbff]"
    aria-label="状态控制台"
  >
    <div class="status-console__scanline" aria-hidden="true"></div>
    <div class="status-console__bubbles" aria-hidden="true"></div>

    <header class="absolute right-3 top-3 z-20">
      <button
        type="button"
        class="grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-[#12313a]/90 text-[#d8fbff] shadow-[inset_0_0_0_1px_rgba(122,223,236,0.35),0_0_14px_rgba(55,186,207,0.18)] transition hover:bg-[#174653]"
        aria-label="关闭状态面板"
        @click="emit('close')"
      >
        ×
      </button>
    </header>

    <div class="status-console__content relative z-10 grid h-full grid-rows-[minmax(4.75rem,auto)_auto_minmax(5.75rem,1fr)] gap-2 px-3 pb-3 pt-3">
      <section class="status-counter mx-auto grid h-[clamp(7.5rem,36vh,12.25rem)] w-full max-w-[20rem] place-items-center px-4 py-3 text-center">
        <p class="text-[10px] font-bold tracking-[0.22em] text-[#70cad6]">TODAY SIGNAL</p>
        <strong class="status-counter__number block max-w-full text-[clamp(1.75rem,12vw,3.25rem)] leading-none text-[#e9ffff]">
          {{ formatCount(todayPresses) }}
        </strong>
        <span class="text-[10px] text-[#6daeba]">今日按键</span>
      </section>

      <section class="status-nameplate mx-auto grid w-full max-w-[18rem] grid-cols-[1fr_auto] gap-3 px-3 text-[11px] text-[#9ad6de]">
        <span class="grid place-items-center justify-self-start">累计</span>
        <strong class="grid place-items-center justify-self-end font-bold text-[#d8fbff]">{{ formatCount(totalPresses) }}</strong>
      </section>

      <section class="status-key-section min-h-0">
        <div class="mb-1 flex items-center justify-center gap-2 text-[10px] font-bold tracking-[0.2em] text-[#70cad6]">
          <span class="h-px w-7 bg-[#2d727e]"></span>
          <span>KEY RADAR</span>
          <span class="h-px w-7 bg-[#2d727e]"></span>
        </div>

        <div v-if="visibleTopKeys.length > 0" class="status-key-radar">
          <div class="status-key-grid" role="list">
            <div
              v-for="(key, index) in visibleTopKeys"
              :key="key.keyId"
              class="status-keycap"
              :class="getKeyRankClass(index)"
              role="listitem"
              :aria-label="`${getKeyDisplayLabel(key.keyId)}，第 ${index + 1} 名，${formatCount(key.pressCount)} 次`"
            >
              <span class="status-keycap__meter" :style="{ height: getKeyMeterHeight(key) }"></span>
              <span class="status-keycap__rank">#{{ index + 1 }}</span>
              <span class="status-keycap__count">{{ formatCompactCount(key.pressCount) }}</span>
              <span class="status-keycap__label">{{ getKeyDisplayLabel(key.keyId) }}</span>
            </div>
          </div>
        </div>

        <p v-else class="status-empty mx-auto grid h-full min-h-[5rem] max-w-[18rem] place-items-center px-4 text-center text-xs text-[#70a7b0]">
          等待按键信号
        </p>
      </section>
    </div>
  </aside>
</template>

<style scoped>
.status-console {
  border: 1px solid rgba(91, 169, 184, 0.7);
  background:
    linear-gradient(180deg, rgba(24, 69, 78, 0.24), rgba(3, 13, 18, 0.18) 28%, rgba(5, 18, 23, 0.4)),
    repeating-linear-gradient(0deg, rgba(97, 209, 225, 0.06) 0 1px, transparent 1px 9px),
    repeating-linear-gradient(90deg, rgba(97, 209, 225, 0.045) 0 1px, transparent 1px 9px),
    #061217;
  box-shadow:
    inset 0 0 0 2px rgba(4, 17, 21, 0.75),
    inset 0 0 34px rgba(85, 219, 239, 0.12),
    0 18px 60px rgba(2, 10, 14, 0.5);
}

.status-console__content {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
}

.status-console__content::-webkit-scrollbar {
  display: none;
}

.status-console__scanline {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, transparent 0, rgba(126, 239, 255, 0.08) 48%, transparent 54%);
  animation: status-scan 3.8s linear infinite;
  opacity: 0.7;
}

.status-console__bubbles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 18% 76%, rgba(133, 232, 244, 0.24) 0 2px, transparent 3px),
    radial-gradient(circle at 84% 22%, rgba(133, 232, 244, 0.18) 0 1px, transparent 2px),
    radial-gradient(circle at 72% 68%, rgba(133, 232, 244, 0.2) 0 2px, transparent 3px);
  opacity: 0.75;
}

.status-counter {
  position: relative;
  min-width: 0;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(15, 47, 56, 0.9), rgba(4, 16, 21, 0.84)),
    repeating-linear-gradient(90deg, rgba(116, 230, 246, 0.08) 0 2px, transparent 2px 8px);
  clip-path: polygon(0.75rem 0, calc(100% - 0.75rem) 0, 100% 0.75rem, 100% calc(100% - 0.75rem), calc(100% - 0.75rem) 100%, 0.75rem 100%, 0 calc(100% - 0.75rem), 0 0.75rem);
  box-shadow:
    inset 0 0 0 1px rgba(115, 222, 235, 0.55),
    inset 0 -0.35rem 0 rgba(11, 36, 45, 0.72),
    0 0 22px rgba(70, 203, 226, 0.13);
}

.status-counter::after {
  position: absolute;
  inset: 0.35rem;
  pointer-events: none;
  content: "";
  border: 1px solid rgba(105, 210, 224, 0.14);
  clip-path: inherit;
}

.status-counter__number {
  font-variant-numeric: tabular-nums;
  text-shadow:
    0 0 8px rgba(130, 241, 255, 0.58),
    0 2px 0 #07313a;
}

.status-nameplate {
  height: 1.75rem;
  line-height: 1;
  background: linear-gradient(90deg, transparent, rgba(21, 70, 81, 0.78) 10%, rgba(21, 70, 81, 0.78) 90%, transparent);
  box-shadow:
    inset 0 1px 0 rgba(129, 232, 245, 0.24),
    inset 0 -1px 0 rgba(129, 232, 245, 0.16);
}

.status-key-section {
  display: flex;
  min-height: 0;
  flex-direction: column;
}

.status-key-radar {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  scrollbar-width: none;
}

.status-key-radar::-webkit-scrollbar {
  display: none;
}

.status-key-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(4rem, 1fr));
  grid-auto-rows: 3rem;
  gap: 0.35rem;
  align-content: start;
  padding: 0.05rem;
}

.status-keycap {
  position: relative;
  display: grid;
  min-width: 0;
  place-items: center;
  overflow: hidden;
  padding: 0.95rem 0.22rem 0.28rem;
  color: #d8fbff;
  background:
    linear-gradient(180deg, rgba(21, 58, 68, 0.92), rgba(7, 24, 31, 0.92)),
    #081820;
  border-radius: 0.25rem;
  box-shadow:
    inset 0 0 0 1px rgba(97, 177, 190, 0.58),
    inset 0 -0.25rem 0 rgba(3, 12, 17, 0.58);
}

.status-keycap--top {
  box-shadow:
    inset 0 0 0 1px rgba(109, 219, 150, 0.68),
    inset 0 -0.25rem 0 rgba(3, 12, 17, 0.58),
    0 0 11px rgba(74, 210, 128, 0.15);
}

.status-keycap--first {
  color: #fff5bd;
  background:
    linear-gradient(180deg, rgba(91, 72, 25, 0.95), rgba(19, 28, 25, 0.94)),
    #111610;
  box-shadow:
    inset 0 0 0 1px rgba(244, 202, 88, 0.84),
    inset 0 -0.25rem 0 rgba(40, 28, 4, 0.7),
    0 0 16px rgba(234, 186, 69, 0.24);
}

.status-keycap__meter {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(90, 221, 238, 0.07), rgba(90, 221, 238, 0.24));
}

.status-keycap--first .status-keycap__meter {
  background: linear-gradient(180deg, rgba(255, 215, 94, 0.08), rgba(255, 215, 94, 0.28));
}

.status-keycap__rank,
.status-keycap__count {
  position: absolute;
  top: 0.28rem;
  z-index: 1;
  font-size: 0.55rem;
  line-height: 1;
  color: rgba(184, 230, 236, 0.72);
}

.status-keycap__rank {
  left: 0.28rem;
  max-width: 42%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-keycap__count {
  right: 0.28rem;
  max-width: 48%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-keycap__label {
  position: relative;
  z-index: 1;
  max-width: 100%;
  overflow: hidden;
  font-size: clamp(0.68rem, 4vw, 0.88rem);
  font-weight: 800;
  line-height: 1.05;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-shadow: 0 1px 0 #031014;
}

.status-keycap__count {
  max-width: 100%;
  overflow: hidden;
  font-variant-numeric: tabular-nums;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-empty {
  background: rgba(5, 20, 26, 0.52);
  clip-path: polygon(0.6rem 0, calc(100% - 0.6rem) 0, 100% 0.6rem, 100% calc(100% - 0.6rem), calc(100% - 0.6rem) 100%, 0.6rem 100%, 0 calc(100% - 0.6rem), 0 0.6rem);
  box-shadow: inset 0 0 0 1px rgba(64, 130, 141, 0.35);
}

@keyframes status-scan {
  from {
    transform: translateY(-100%);
  }

  to {
    transform: translateY(100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .status-console__scanline {
    animation: none;
  }
}

@media (max-height: 300px) {
  .status-console__content {
    grid-template-rows: auto auto auto;
    align-content: start;
    gap: 0.35rem;
    padding: 0.3rem 0.55rem 0.55rem;
  }

  .status-counter {
    height: clamp(4.2rem, 30vh, 5.6rem);
    min-height: 0;
    max-width: 16rem;
    padding-top: 0.45rem;
    padding-bottom: 0.45rem;
  }

  .status-counter__number {
    font-size: clamp(1.35rem, 10vh, 2.05rem);
  }

  .status-counter span,
  .status-counter p {
    display: none;
  }

  .status-nameplate {
    height: 1.45rem;
    max-width: 16rem;
    padding-inline: 0.65rem;
    font-size: 10px;
  }

  .status-key-section {
    min-height: 0;
  }

  .status-key-radar {
    flex: none;
    overflow: visible;
  }

  .status-key-grid {
    grid-template-columns: repeat(auto-fill, minmax(3.65rem, 1fr));
    grid-auto-rows: 2.65rem;
  }
}

@media (max-width: 220px), (max-height: 230px) {
  .status-nameplate {
    display: grid;
    height: 1.3rem;
    max-width: none;
    gap: 0.45rem;
    padding-inline: 0.5rem;
    font-size: 9px;
  }

  .status-console__content {
    grid-template-rows: auto auto auto;
  }

  .status-counter {
    height: 3.6rem;
    max-width: none;
    padding-block: 0.3rem;
    padding-inline: 0.65rem;
  }

  .status-counter__number {
    font-size: clamp(1.15rem, 9vh, 1.55rem);
  }

  .status-key-grid {
    grid-template-columns: repeat(auto-fill, minmax(3.35rem, 1fr));
    grid-auto-rows: 2.55rem;
    gap: 0.25rem;
  }

  .status-keycap__label {
    font-size: 0.62rem;
  }
}
</style>
