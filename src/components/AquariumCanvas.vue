<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { AppSettings, AquariumStatus } from "../game/types";
import { AquariumRenderer } from "../render/aquariumRenderer";

const props = defineProps<{
  status: AquariumStatus;
  settings: AppSettings;
  lastPressedSignal: { keyId: string; sequence: number } | null;
}>();

const emit = defineEmits<{
  bubbleButtonPress: [];
  manualProgress: [];
  lightTogglePress: [];
  shakeButtonPress: [];
  emptyDragStart: [event: MouseEvent];
}>();

const hostRef = ref<HTMLElement | null>(null);
let renderer: AquariumRenderer | null = null;

/** 初始化水族箱 Canvas 渲染器。 */
async function mountRenderer(): Promise<void> {
  if (!hostRef.value) {
    return;
  }

  renderer = new AquariumRenderer({
    host: hostRef.value,
    status: props.status,
    settings: props.settings,
    onBubbleButtonPress: () => emit("bubbleButtonPress"),
    onLightTogglePress: () => emit("lightTogglePress"),
    onShakeButtonPress: () => emit("shakeButtonPress"),
    onManualProgress: () => emit("manualProgress"),
  });
  await renderer.init();
}

/** 销毁水族箱 Canvas 渲染器。 */
function destroyRenderer(): void {
  renderer?.destroy();
  renderer = null;
}

/** 在透明空白区域按下鼠标时，把窗口拖动意图交给外层处理。 */
function handleHostMouseDown(event: MouseEvent): void {
  if (event.button !== 0 || renderer?.containsAquariumContentPoint(event.clientX, event.clientY)) {
    return;
  }

  emit("emptyDragStart", event);
}

onMounted(() => {
  void mountRenderer();
});

onBeforeUnmount(() => {
  destroyRenderer();
});

watch(
  () => props.status,
  (status) => {
    renderer?.setStatus(status);
  },
);

watch(
  () => props.settings,
  (settings) => {
    renderer?.setSettings(settings);
  },
);

watch(
  () => props.lastPressedSignal,
  (signal) => {
    if (signal && props.settings.keyFeedbackEnabled) {
      renderer?.pulse();
      renderer?.showProgressIncrementFeedback();
    }
  },
);
</script>

<template>
  <div ref="hostRef" class="h-full w-full" @mousedown.capture="handleHostMouseDown" />
</template>
