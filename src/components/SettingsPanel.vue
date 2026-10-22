<script setup lang="ts">
import { isLocale, useI18n } from "../i18n";
import { ref } from "vue";
import AppUpdatePanel from "./AppUpdatePanel.vue";
import type { AppSettings, FishDisplayMode } from "../game/types";

const { t, locale, setLocale } = useI18n();

const props = defineProps<{
  settings: AppSettings;
  busy: boolean;
  message: string;
  appVersion: string;
}>();

const clearConfirmOpen = ref(false);

/** 仅在用户操作选择器时保存语种偏好，自动匹配系统时不写入手动设置。 */
function handleLanguageChange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value;
  if (isLocale(value)) {
    setLocale(value);
  }
}

const emit = defineEmits<{
  close: [];
  updateSettings: [settings: Partial<AppSettings>];
  importData: [];
  exportData: [];
  clearData: [];
}>();

/** 切换按键反馈显示，关闭后不影响进度累计。 */
function toggleKeyFeedback(): void {
  emit("updateSettings", {
    keyFeedbackEnabled: !props.settings.keyFeedbackEnabled,
  });
}

/** 切换水族箱同屏物种数量模式。 */
function toggleFishDisplayMode(): void {
  const fishDisplayMode: FishDisplayMode = props.settings.fishDisplayMode === "default" ? "compact" : "default";

  emit("updateSettings", { fishDisplayMode });
}

/** 打开应用内清空确认弹窗，避免使用系统 confirm 破坏视觉一致性。 */
function openClearConfirm(): void {
  if (props.busy) {
    return;
  }

  clearConfirmOpen.value = true;
}

/** 关闭清空确认弹窗，不影响当前设置页状态。 */
function closeClearConfirm(): void {
  clearConfirmOpen.value = false;
}

/** 确认清空养成数据，并把实际清空动作交给外层存档逻辑执行。 */
function confirmClearData(): void {
  clearConfirmOpen.value = false;
  emit("clearData");
}
</script>

<template>
  <aside class="settings-panel absolute inset-0 z-20 overflow-hidden rounded-lg text-[#d8fbff] backdrop-blur">
    <div class="settings-panel__scanline" aria-hidden="true"></div>
    <div class="settings-panel__bubbles" aria-hidden="true"></div>

    <button
      type="button"
      class="settings-close absolute right-3 top-3 z-30 grid h-9 w-9 cursor-pointer place-items-center rounded-full text-xl font-bold leading-none text-[#d8fbff] transition hover:bg-[#17343f]/72"
      :aria-label="t('关闭设置')"
      @click="emit('close')"
    >
      ×
    </button>

    <header class="settings-heading absolute left-4 top-4 z-30 sm:left-6">
      <h2 class="settings-heading__title text-sm font-black text-[#f3ffff]">{{ t('设置') }}</h2>
      <p v-if="locale === 'zh-CN'" class="settings-heading__kicker text-[10px] font-bold text-[#76c8d2]">Settings</p>
    </header>

    <div class="settings-content relative z-10 mx-auto grid h-full w-full max-w-[32rem] grid-rows-[minmax(0,1fr)] px-4 pb-4 pt-14 sm:px-6 sm:pb-6 sm:pt-16">
      <section class="settings-scroll min-h-0">
        <article class="settings-tile">
          <label for="settings-language" class="settings-tile__title">{{ t('语种') }}</label>
          <select
            id="settings-language"
            :value="locale"
            class="max-w-full cursor-pointer rounded-md border border-[#89e2eb]/30 bg-[#081c25] px-3 py-2 text-xs font-bold text-[#efffff] focus:outline-2 focus:outline-[#76c8d2]"
            @change="handleLanguageChange"
          >
            <option value="zh-CN" lang="zh-CN">简体中文</option>
            <option value="en" lang="en">English</option>
          </select>
        </article>

        <article class="settings-tile">
          <div>
            <h3 class="settings-tile__title">{{ t('按键反馈') }}</h3>
            <p class="settings-tile__desc">{{ t('控制进度加号和随机气泡') }}</p>
          </div>
          <button
            type="button"
            class="settings-toggle"
            :class="{ 'settings-toggle--on': settings.keyFeedbackEnabled }"
            :aria-pressed="settings.keyFeedbackEnabled"
            @click="toggleKeyFeedback"
          >
            <span class="settings-toggle__knob"></span>
          </button>
        </article>

        <article class="settings-tile settings-tile--stacked">
          <div class="settings-tile__row">
            <div>
              <h3 class="settings-tile__title">{{ t('显示少量物种') }}</h3>
              <p class="settings-tile__desc">{{ t('调整水族箱同屏密度') }}</p>
            </div>
            <button
              type="button"
              class="settings-toggle"
              :class="{ 'settings-toggle--on': settings.fishDisplayMode === 'compact' }"
              :aria-pressed="settings.fishDisplayMode === 'compact'"
              :aria-label="t('切换显示少量物种')"
              @click="toggleFishDisplayMode"
            >
              <span class="settings-toggle__knob"></span>
            </button>
          </div>
        </article>

        <footer class="settings-data">
          <div class="settings-data__header">
            <span>{{ t('数据管理') }}</span>
            <span v-if="message" class="settings-data__message">{{ message }}</span>
          </div>
          <div class="settings-data__actions">
            <button type="button" class="settings-data-button" :disabled="busy" @click="emit('importData')">{{ t('导入数据') }}</button>
            <button type="button" class="settings-data-button" :disabled="busy" @click="emit('exportData')">{{ t('导出数据') }}</button>
            <button type="button" class="settings-data-button settings-data-button--danger" :disabled="busy" @click="openClearConfirm">{{ t('清空数据') }}</button>
          </div>
        </footer>

        <AppUpdatePanel :app-version="appVersion" />
        <p class="settings-credit">Key Aquarium</p>
      </section>
    </div>

    <div
      v-if="clearConfirmOpen"
      class="settings-confirm-layer absolute inset-0 z-40 grid place-items-center px-5"
      @click.self="closeClearConfirm"
    >
      <section class="settings-confirm-card">
        <p class="settings-confirm-card__kicker">CLEAR DATA</p>
        <h3 class="settings-confirm-card__title">{{ t('清空数据？') }}</h3>
        <p class="settings-confirm-card__desc">{{ t('物种、按键进度和成就会重置。') }}</p>
        <div class="settings-confirm-card__actions">
          <button type="button" class="settings-confirm-button" @click="closeClearConfirm">{{ t('取消') }}</button>
          <button type="button" class="settings-confirm-button settings-confirm-button--danger" @click="confirmClearData">{{ t('确认清空') }}</button>
        </div>
      </section>
    </div>
  </aside>
</template>

<style scoped>
.settings-panel {
  --settings-switch-width: 3.65rem;
  --settings-switch-height: 1.62rem;
  --settings-switch-knob-size: 1.06rem;
  --settings-switch-knob-offset: 0.22rem;
  --settings-switch-knob-travel: calc(var(--settings-switch-width) - var(--settings-switch-knob-size) - var(--settings-switch-knob-offset) * 2);
  background:
    linear-gradient(180deg, rgb(9 30 40 / 0.92), rgb(5 16 23 / 0.96)),
    radial-gradient(circle at 24% 16%, rgb(72 173 192 / 0.18), transparent 28%),
    radial-gradient(circle at 82% 82%, rgb(95 201 173 / 0.12), transparent 30%);
  box-shadow: inset 0 0 0 1px rgb(148 225 231 / 0.18), inset 0 -18px 36px rgb(0 0 0 / 0.26);
}

.settings-panel__scanline {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, transparent 0 52%, rgb(142 238 255 / 0.12) 53%, transparent 56%);
  background-size: 100% 0.72rem;
  mix-blend-mode: screen;
  opacity: 0.34;
  animation: settings-scan 3.8s linear infinite;
}

.settings-panel__bubbles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 16% 82%, rgb(141 236 255 / 0.2) 0 0.12rem, transparent 0.16rem),
    radial-gradient(circle at 78% 28%, rgb(141 236 255 / 0.18) 0 0.1rem, transparent 0.15rem),
    radial-gradient(circle at 62% 74%, rgb(166 255 222 / 0.14) 0 0.14rem, transparent 0.18rem);
  opacity: 0.8;
}

.settings-close {
  background: transparent;
  filter: drop-shadow(0 0.18rem 0 rgb(0 0 0 / 0.38));
}

.settings-heading__title {
  line-height: 1;
}

.settings-heading__kicker {
  margin-top: 0.08rem;
  line-height: 1;
  letter-spacing: 0.08em;
}

.settings-scroll {
  display: grid;
  align-content: start;
  gap: 0.75rem;
  overflow-y: auto;
  padding: 0.15rem 0.15rem 0.35rem;
  overscroll-behavior: contain;
  scrollbar-width: none;
}

.settings-scroll::-webkit-scrollbar {
  display: none;
}

.settings-tile {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: center;
  padding: 1rem;
  background:
    linear-gradient(180deg, rgb(19 52 63 / 0.74), rgb(8 28 37 / 0.84)),
    radial-gradient(circle at 18% 20%, rgb(126 227 236 / 0.12), transparent 34%);
  border: 1px solid rgb(137 226 235 / 0.24);
  border-radius: 0.5rem;
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.04), 0 0.6rem 1.4rem rgb(0 0 0 / 0.22);
}

.settings-tile--stacked {
  grid-template-columns: 1fr;
}

.settings-tile__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: center;
}

.settings-tile__title {
  font-size: 0.9rem;
  font-weight: 900;
  color: #efffff;
}

.settings-tile__desc {
  margin-top: 0.2rem;
  font-size: 0.72rem;
  font-weight: 700;
  color: #78b7c0;
}

.settings-toggle {
  position: relative;
  width: var(--settings-switch-width);
  height: var(--settings-switch-height);
  cursor: pointer;
  background: linear-gradient(180deg, #102a33, #071a22);
  border: 1px solid rgb(119 190 199 / 0.42);
  border-radius: 999px;
  box-shadow: inset 0 0.18rem 0.36rem rgb(0 0 0 / 0.34);
}

.settings-toggle__knob {
  position: absolute;
  top: 0.21rem;
  left: var(--settings-switch-knob-offset);
  width: var(--settings-switch-knob-size);
  height: var(--settings-switch-knob-size);
  background: #8fb4ba;
  border-radius: 999px;
  box-shadow: 0 0.16rem 0 rgb(0 0 0 / 0.36);
  transition:
    transform 160ms ease,
    background 160ms ease;
}

.settings-toggle--on {
  background: linear-gradient(180deg, #1c7c83, #0b4e61);
  border-color: rgb(146 247 232 / 0.7);
}

.settings-toggle--on .settings-toggle__knob {
  background: #d9fff1;
  transform: translateX(var(--settings-switch-knob-travel));
}

.settings-data-button {
  cursor: pointer;
}

.settings-data {
  padding: 0.75rem;
  background: rgb(4 15 22 / 0.72);
  border: 1px solid rgb(114 180 192 / 0.24);
  border-radius: 0.5rem;
}

.settings-data__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.55rem;
  font-size: 0.72rem;
  font-weight: 900;
  color: #82c6cf;
}

.settings-data__message {
  overflow: hidden;
  max-width: 62%;
  color: #d7fff3;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-data__actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
}

.settings-data-button {
  min-height: 2.15rem;
  padding: 0 0.45rem;
  font-size: 0.72rem;
  font-weight: 900;
  color: #d8fbff;
  background: linear-gradient(180deg, rgb(21 63 73 / 0.92), rgb(9 35 45 / 0.92));
  border: 1px solid rgb(122 207 216 / 0.34);
  border-radius: 0.38rem;
  box-shadow: inset 0 0.12rem 0 rgb(255 255 255 / 0.08), 0 0.28rem 0 rgb(0 0 0 / 0.22);
}

.settings-data-button:disabled {
  cursor: not-allowed;
  opacity: 0.52;
}

.settings-data-button--danger {
  color: #ffe1d8;
  background: linear-gradient(180deg, rgb(96 42 42 / 0.9), rgb(52 17 22 / 0.92));
  border-color: rgb(255 151 132 / 0.36);
}

.settings-credit {
  padding: 0.1rem 0 0.2rem;
  font-size: 0.64rem;
  font-weight: 900;
  color: rgb(130 198 207 / 0.62);
  text-align: center;
  letter-spacing: 0.08em;
  text-shadow: 0 0.12rem 0 rgb(0 0 0 / 0.3);
}

.settings-confirm-layer {
  background:
    radial-gradient(circle at 50% 44%, rgb(84 204 214 / 0.14), transparent 34%),
    rgb(1 8 12 / 0.66);
}

.settings-confirm-card {
  width: min(18.5rem, 100%);
  padding: 1.05rem;
  color: #d8fbff;
  background:
    linear-gradient(180deg, rgb(16 53 64 / 0.96), rgb(5 19 27 / 0.98)),
    radial-gradient(circle at 18% 16%, rgb(131 236 245 / 0.16), transparent 34%);
  border: 1px solid rgb(141 233 242 / 0.32);
  border-radius: 0.55rem;
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / 0.05),
    0 1.1rem 2.6rem rgb(0 0 0 / 0.46),
    0 0 1.5rem rgb(71 200 214 / 0.1);
}

.settings-confirm-card__kicker {
  font-size: 0.56rem;
  font-weight: 900;
  color: #76c8d2;
  letter-spacing: 0.22em;
}

.settings-confirm-card__title {
  margin-top: 0.35rem;
  font-size: 1rem;
  font-weight: 900;
  color: #f3ffff;
}

.settings-confirm-card__desc {
  margin-top: 0.5rem;
  font-size: 0.74rem;
  font-weight: 700;
  line-height: 1.65;
  color: #91c8d0;
}

.settings-confirm-card__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
  margin-top: 0.9rem;
}

.settings-confirm-button {
  min-height: 2.1rem;
  cursor: pointer;
  font-size: 0.74rem;
  font-weight: 900;
  color: #d8fbff;
  background: linear-gradient(180deg, rgb(21 63 73 / 0.96), rgb(9 35 45 / 0.96));
  border: 1px solid rgb(122 207 216 / 0.34);
  border-radius: 0.38rem;
  box-shadow: inset 0 0.12rem 0 rgb(255 255 255 / 0.08), 0 0.28rem 0 rgb(0 0 0 / 0.24);
}

.settings-confirm-button--danger {
  color: #ffe1d8;
  background: linear-gradient(180deg, rgb(112 46 45 / 0.96), rgb(58 18 22 / 0.98));
  border-color: rgb(255 151 132 / 0.42);
}

@keyframes settings-scan {
  from {
    background-position-y: 0;
  }

  to {
    background-position-y: 1.44rem;
  }
}

@media (max-width: 360px) {
  .settings-content {
    gap: 0.65rem;
    padding: 3.5rem 0.75rem 0.75rem;
  }

  .settings-tile {
    padding: 0.72rem;
  }

  .settings-tile__row {
    gap: 0.65rem;
  }

  .settings-data__actions {
    grid-template-columns: 1fr;
  }
}
</style>
