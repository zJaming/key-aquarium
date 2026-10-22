<script setup lang="ts">
import achievementIcon from "../assets/action-icons/achievement.png";
import galleryIcon from "../assets/action-icons/gallery.png";
import settingsIcon from "../assets/action-icons/settings.png";
import statusIcon from "../assets/action-icons/status.png";

defineProps<{
  visible: boolean;
  isDevMode: boolean;
  devGrantButtonLabel: string;
  devBenthicButtonLabel: string;
  devAchievementButtonLabel: string;
  achievementVisible: boolean;
}>();

const emit = defineEmits<{
  grantBenthicTestSpecies: [];
  grantTestAchievements: [];
  grantTestSpecies: [];
  openAchievements: [];
  openGallery: [];
  openSettings: [];
  openStatus: [];
}>();
</script>

<template>
  <template v-if="visible">
    <div
      v-if="isDevMode"
      class="absolute left-1.5 top-1.5 z-10 flex max-w-[calc(100%-0.75rem)] items-start gap-0.5 sm:left-4 sm:top-3 sm:max-w-[calc(100%-2rem)] sm:gap-1.5"
    >
      <button
        type="button"
        class="h-7 min-w-7 cursor-pointer rounded-md bg-transparent px-1.5 text-[9px] font-bold text-[#ffdfa0] drop-shadow-[0_5px_2px_rgba(0,0,0,0.42)] transition hover:-translate-y-0.5 hover:drop-shadow-[0_8px_3px_rgba(0,0,0,0.48)] active:translate-y-0 sm:h-8 sm:min-w-0 sm:px-3 sm:text-xs lg:h-9 lg:px-4"
        :aria-label="devGrantButtonLabel"
        @click="emit('grantTestSpecies')"
      >
        <span class="sm:hidden">测</span>
        <span class="hidden sm:inline">{{ devGrantButtonLabel }}</span>
      </button>

      <button
        type="button"
        class="h-7 min-w-7 cursor-pointer rounded-md bg-transparent px-1.5 text-[9px] font-bold text-[#ffdfa0] drop-shadow-[0_5px_2px_rgba(0,0,0,0.42)] transition hover:-translate-y-0.5 hover:drop-shadow-[0_8px_3px_rgba(0,0,0,0.48)] active:translate-y-0 sm:h-8 sm:min-w-0 sm:px-3 sm:text-xs lg:h-9 lg:px-4"
        :aria-label="devBenthicButtonLabel"
        @click="emit('grantBenthicTestSpecies')"
      >
        <span class="sm:hidden">底</span>
        <span class="hidden sm:inline">{{ devBenthicButtonLabel }}</span>
      </button>

      <button
        type="button"
        class="h-7 min-w-7 cursor-pointer rounded-md bg-transparent px-1.5 text-[9px] font-bold text-[#ffdfa0] drop-shadow-[0_5px_2px_rgba(0,0,0,0.42)] transition hover:-translate-y-0.5 hover:drop-shadow-[0_8px_3px_rgba(0,0,0,0.48)] active:translate-y-0 sm:h-8 sm:min-w-0 sm:px-3 sm:text-xs lg:h-9 lg:px-4"
        :aria-label="devAchievementButtonLabel"
        @click="emit('grantTestAchievements')"
      >
        <span class="sm:hidden">成</span>
        <span class="hidden sm:inline">{{ devAchievementButtonLabel }}</span>
      </button>
    </div>

    <div
      class="absolute right-1.5 top-1.5 z-10 flex max-w-[calc(100%-0.75rem)] items-start gap-0.5 sm:right-4 sm:top-3 sm:max-w-[calc(100%-2rem)] sm:gap-1.5"
    >
      <button
        v-if="achievementVisible"
        type="button"
        class="hud-action-icon"
        aria-label="打开成就"
        @click="emit('openAchievements')"
      >
        <img
          :src="achievementIcon"
          alt=""
          class="hud-action-icon__image"
          aria-hidden="true"
        />
      </button>

      <button
        type="button"
        class="hud-action-icon"
        aria-label="打开图鉴"
        @click="emit('openGallery')"
      >
        <img
          :src="galleryIcon"
          alt=""
          class="hud-action-icon__image"
          aria-hidden="true"
        />
      </button>

      <button
        type="button"
        class="hud-action-icon"
        aria-label="打开状态面板"
        @click="emit('openStatus')"
      >
        <img
          :src="statusIcon"
          alt=""
          class="hud-action-icon__image"
          aria-hidden="true"
        />
      </button>

      <button
        type="button"
        class="hud-action-icon"
        aria-label="打开设置"
        @click="emit('openSettings')"
      >
        <img
          :src="settingsIcon"
          alt=""
          class="hud-action-icon__image"
          aria-hidden="true"
        />
      </button>
    </div>
  </template>
</template>

<style scoped>
.hud-action-icon {
  position: relative;
  display: grid;
  width: 2.25rem;
  height: 2.25rem;
  cursor: pointer;
  place-items: center;
  background: transparent;
  transform: translateY(0);
  transition:
    transform 160ms ease,
    filter 160ms ease;
}

.hud-action-icon::after {
  position: absolute;
  right: 0.3rem;
  bottom: 0.15rem;
  left: 0.3rem;
  height: 0.35rem;
  pointer-events: none;
  content: "";
  background: radial-gradient(ellipse at center, rgb(0 0 0 / 0.48) 0 28%, rgb(0 0 0 / 0.24) 52%, transparent 78%);
  border-radius: 999px;
  transform: scaleX(0.82);
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}

.hud-action-icon:hover {
  filter: brightness(1.08);
  transform: translateY(-0.15rem) scale(1.04);
}

.hud-action-icon:hover::after {
  opacity: 0.82;
  transform: translateY(0.18rem) scaleX(1.05);
}

.hud-action-icon:active {
  transform: translateY(0) scale(0.98);
}

.hud-action-icon__image {
  position: relative;
  z-index: 1;
  width: 2rem;
  height: 2rem;
  object-fit: contain;
  image-rendering: pixelated;
  filter: drop-shadow(0 0.16rem 0 rgb(0 0 0 / 0.42));
}

@media (min-width: 640px) {
  .hud-action-icon {
    width: 2.5rem;
    height: 2.5rem;
  }

  .hud-action-icon__image {
    width: 2.2rem;
    height: 2.2rem;
  }
}
</style>
