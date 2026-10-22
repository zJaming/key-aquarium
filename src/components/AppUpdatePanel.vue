<script setup lang="ts">
import { computed } from "vue";
import { appUpdateState as update, checkAppUpdate, installAppUpdate, restartForAppUpdate } from "../platform/updateService";

defineProps<{ appVersion: string }>();

/** 检查、下载和重启期间禁用操作按钮。 */
const busy = computed(() => ["checking", "downloading", "restarting"].includes(update.phase));
/** 按当前阶段显示下一步可执行操作。 */
const actionLabel = computed(() => {
  if (update.phase === "available") return "下载并安装";
  if (update.phase === "ready") return "重启应用";
  if (busy.value) return "请稍候…";
  return "检查更新";
});
/** 展示当前更新阶段的状态提示。 */
const statusMessage = computed(() => update.message);
/** 仅在服务器提供文件大小时显示下载百分比。 */
const percent = computed(() => update.totalBytes
  ? Math.min(100, Math.floor(update.downloadedBytes / update.totalBytes * 100))
  : null);

/** 根据更新状态执行检查、安装或重启，禁止重复操作。 */
function handleUpdateAction(): void {
  if (busy.value) return;
  if (update.phase === "available") void installAppUpdate();
  else if (update.phase === "ready") void restartForAppUpdate();
  else void checkAppUpdate();
}
</script>

<template>
  <section aria-label="应用更新" class="mt-4 rounded-2xl border border-[#94e1e7]/20 bg-[#06171f]/70 p-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h3 class="text-sm font-bold tracking-wider">应用更新</h3>
      <span class="text-xs font-bold tabular-nums text-[#b8d9df]">v{{ appVersion }}</span>
    </div>
    <p v-if="statusMessage" class="mt-2 text-xs leading-relaxed text-[#b8d9df]" role="status">{{ statusMessage }}</p>
    <p v-if="update.phase === 'downloading'" class="mt-1 text-xs tabular-nums text-[#b8d9df]">
      {{ (update.downloadedBytes / 1024 / 1024).toFixed(1) }} MB<span v-if="percent !== null"> · {{ percent }}%</span>
    </p>
    <button
      type="button"
      class="mt-3 w-full cursor-pointer rounded-lg border border-[#94e1e7]/30 bg-[#17343f] px-3 py-2 text-xs font-bold hover:bg-[#215060] disabled:cursor-wait disabled:opacity-60"
      :disabled="busy"
      @click="handleUpdateAction"
    >{{ actionLabel }}</button>
  </section>
</template>
