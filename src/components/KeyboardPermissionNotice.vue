<script setup lang="ts">
const emit = defineEmits<{
  openSettings: [];
}>();
</script>

<template>
  <div
    class="absolute left-3 top-11 z-30 max-w-[260px] rounded-lg border border-[#d7a25a]/70 bg-[#21180e]/95 px-3 py-2 text-left shadow-[0_14px_36px_rgba(0,0,0,0.35)]"
    @mousedown.stop
  >
    <div class="text-xs font-bold text-[#ffe3a6]">后台记录未启用</div>
    <p class="mt-1 text-[11px] leading-4 text-[#f4d59b]">
      请在 系统设置 &gt; 隐私与安全性 &gt; 辅助功能 中允许 Key Aquarium。
    </p>
    <p class="mt-1 text-[11px] leading-4 text-[#d9b36f]">
      如果已经开启仍提示，请关闭后重新开启；仍无效时用列表下方 “-” 移除旧项，再重新添加 Key Aquarium。
    </p>
    <button
      type="button"
      class="mt-2 cursor-pointer rounded-md border border-[#f0c66c]/80 bg-[#3a2810] px-2.5 py-1 text-[11px] font-bold text-[#fff2bc] transition hover:bg-[#4a3517]"
      @click="emit('openSettings')"
    >
      授权并前往设置
    </button>
  </div>
</template>
