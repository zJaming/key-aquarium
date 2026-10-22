<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { FishGalleryItem, FishId } from "../game/types";
import { AquariumGalleryRenderer } from "../render/aquariumGalleryRenderer";

const props = defineProps<{
  fish: FishGalleryItem[];
}>();

const emit = defineEmits<{
  selectFish: [fishId: FishId];
}>();

const hostRef = ref<HTMLElement | null>(null);
let renderer: AquariumGalleryRenderer | null = null;
let renderedFishSignature = "";
let rendererMountVersion = 0;

/** 初始化图鉴陈列 Pixi 画布。 */
async function mountRenderer(): Promise<void> {
  const host = hostRef.value;

  if (!host) {
    return;
  }

  const mountVersion = rendererMountVersion;
  const initialFishSignature = getGalleryFishRenderSignature(props.fish);
  const nextRenderer = new AquariumGalleryRenderer({
    host,
    fish: props.fish,
    onSelectFish: (fishId) => emit("selectFish", fishId),
  });
  await nextRenderer.init();

  if (mountVersion !== rendererMountVersion || !host.isConnected) {
    nextRenderer.destroy();
    return;
  }

  renderer = nextRenderer;
  renderedFishSignature = initialFishSignature;

  const currentFishSignature = getGalleryFishRenderSignature(props.fish);

  if (currentFishSignature !== initialFishSignature) {
    renderedFishSignature = currentFishSignature;
    nextRenderer.setFish(props.fish);
  }

}

/** 销毁图鉴陈列 Pixi 画布，释放预渲染纹理。 */
function destroyRenderer(): void {
  rendererMountVersion += 1;
  renderer?.destroy();
  renderer = null;
}

onMounted(() => {
  void mountRenderer();
});

onBeforeUnmount(() => {
  destroyRenderer();
});

watch(
  () => props.fish,
  (fish) => {
    const nextSignature = getGalleryFishRenderSignature(fish);

    if (nextSignature === renderedFishSignature) {
      return;
    }

    renderedFishSignature = nextSignature;
    renderer?.setFish(fish);
  },
);

/** 生成影响 Pixi 陈列布局和纹理的稳定签名，避免数量变化时重置用户视口。 */
function getGalleryFishRenderSignature(fish: FishGalleryItem[]): string {
  return fish
    .map((item) => `${item.id}:${item.rarity}:${item.silhouette ?? "fish"}:${item.visualAsset?.assetPath ?? "pixel"}:${item.firstOpenedAt ?? 0}`)
    .join("|");
}
</script>

<template>
  <div ref="hostRef" class="h-full w-full" />
</template>
