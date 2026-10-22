<script setup lang="ts">
import { useI18n } from "../i18n";

const { t } = useI18n();

defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  dragStart: [];
}>();

/** 处理点阵拖拽把手按下事件，仅响应鼠标主键并交给父级启动窗口拖动。 */
function handlePointerDown(event: MouseEvent): void {
  if (event.button !== 0) {
    return;
  }

  event.preventDefault();
  emit("dragStart");
}
</script>

<template>
  <button
    type="button"
    class="absolute bottom-1.5 right-1.5 z-50 grid h-7 w-7 cursor-grab place-items-center transition active:cursor-grabbing active:scale-95"
    :class="visible ? 'pointer-events-auto opacity-75 hover:opacity-100' : 'pointer-events-none opacity-0'"
    :aria-label="t('拖动窗口')"
    @mousedown.stop="handlePointerDown"
  >
    <span class="grid justify-items-end gap-0.5" aria-hidden="true">
      <span class="flex justify-end gap-0.5">
        <span class="h-1 w-1 rounded-sm bg-[#d9f2a0] shadow-[1px_1px_0_rgba(4,12,15,0.85)]" />
      </span>
      <span class="flex justify-end gap-0.5">
        <span class="h-1 w-1 rounded-sm bg-[#d9f2a0]/90 shadow-[1px_1px_0_rgba(4,12,15,0.85)]" />
        <span class="h-1 w-1 rounded-sm bg-[#d9f2a0]/90 shadow-[1px_1px_0_rgba(4,12,15,0.85)]" />
      </span>
      <span class="flex justify-end gap-0.5">
        <span class="h-1 w-1 rounded-sm bg-[#d9f2a0]/80 shadow-[1px_1px_0_rgba(4,12,15,0.85)]" />
        <span class="h-1 w-1 rounded-sm bg-[#d9f2a0] shadow-[1px_1px_0_rgba(4,12,15,0.85)]" />
        <span class="h-1 w-1 rounded-sm bg-[#d9f2a0] shadow-[1px_1px_0_rgba(4,12,15,0.85)]" />
      </span>
    </span>
  </button>
</template>
