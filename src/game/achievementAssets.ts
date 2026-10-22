import benthicTeamIcon from "../assets/achievement-icons/benthic-team.png";
import bubbleMakerIcon from "../assets/achievement-icons/bubble-maker.png";
import crazyClickerIcon from "../assets/achievement-icons/crazy-clicker.png";
import curioCollectorIcon from "../assets/achievement-icons/curio-collector.png";
import curioFirstIcon from "../assets/achievement-icons/curio-first.png";
import dailyCheckin30Icon from "../assets/achievement-icons/daily-checkin-30.png";
import dailyCheckin3Icon from "../assets/achievement-icons/daily-checkin-3.png";
import dailyCheckin7Icon from "../assets/achievement-icons/daily-checkin-7.png";
import dailyFish30Icon from "../assets/achievement-icons/daily-fish-30.png";
import dailyFish9Icon from "../assets/achievement-icons/daily-fish-9.png";
import deepEchoIcon from "../assets/achievement-icons/deep-echo.png";
import deepCurseIcon from "../assets/achievement-icons/deep-curse.png";
import deepLightsIcon from "../assets/achievement-icons/deep-lights.png";
import deepSeaExplorerIcon from "../assets/achievement-icons/deep-sea-explorer.png";
import firstGuestIcon from "../assets/achievement-icons/first-guest.png";
import fishingBeginnerIcon from "../assets/achievement-icons/fishing-beginner.png";
import fishingGodIcon from "../assets/achievement-icons/fishing-god.png";
import fishingHeroIcon from "../assets/achievement-icons/fishing-hero.png";
import fishingSaintIcon from "../assets/achievement-icons/fishing-saint.png";
import fishingTyrantIcon from "../assets/achievement-icons/fishing-tyrant.png";
import goldenGlimmerIcon from "../assets/achievement-icons/golden-glimmer.png";
import goldenHaulIcon from "../assets/achievement-icons/golden-haul.png";
import keyFlowIcon from "../assets/achievement-icons/key-flow.png";
import largeFirstIcon from "../assets/achievement-icons/large-first.png";
import largeShadowPackIcon from "../assets/achievement-icons/large-shadow-pack.png";
import legendaryHallIcon from "../assets/achievement-icons/legendary-hall.png";
import lightsOutObserverIcon from "../assets/achievement-icons/lights-out-observer.png";
import millionSlashIcon from "../assets/achievement-icons/million-slash.png";
import softPartyIcon from "../assets/achievement-icons/soft-party.png";
import speciesScale108Icon from "../assets/achievement-icons/species-scale-108.png";
import speciesScale144Icon from "../assets/achievement-icons/species-scale-144.png";
import speciesScale169Icon from "../assets/achievement-icons/species-scale-169.png";
import speciesScale18Icon from "../assets/achievement-icons/species-scale-18.png";
import speciesScale36Icon from "../assets/achievement-icons/species-scale-36.png";
import speciesScale72Icon from "../assets/achievement-icons/species-scale-72.png";
import speciesScale9Icon from "../assets/achievement-icons/species-scale-9.png";
import tapChampionIcon from "../assets/achievement-icons/tap-champion.png";
import tapRoutineBreakerIcon from "../assets/achievement-icons/tap-routine-breaker.png";
import tapStarterIcon from "../assets/achievement-icons/tap-starter.png";
import tenThousandKeysDayIcon from "../assets/achievement-icons/ten-thousand-keys-day.png";
import underseaZooIcon from "../assets/achievement-icons/undersea-zoo.png";
import waveMakerIcon from "../assets/achievement-icons/wave-maker.png";
import type { AchievementId } from "./types";

const ACHIEVEMENT_ICON_BY_ID: Record<AchievementId, string> = {
  first_guest: firstGuestIcon,
  fishing_beginner: fishingBeginnerIcon,
  fishing_tyrant: fishingTyrantIcon,
  fishing_hero: fishingHeroIcon,
  fishing_saint: fishingSaintIcon,
  fishing_god: fishingGodIcon,
  tap_starter: tapStarterIcon,
  tap_routine_breaker: tapRoutineBreakerIcon,
  crazy_clicker: crazyClickerIcon,
  tap_champion: tapChampionIcon,
  ten_thousand_keys_day: tenThousandKeysDayIcon,
  key_flow: keyFlowIcon,
  million_slash: millionSlashIcon,
  curio_first: curioFirstIcon,
  golden_glimmer: goldenGlimmerIcon,
  golden_haul: goldenHaulIcon,
  curio_collector: curioCollectorIcon,
  deep_sea_explorer: deepSeaExplorerIcon,
  deep_echo: deepEchoIcon,
  legendary_hall: legendaryHallIcon,
  daily_checkin_3: dailyCheckin3Icon,
  daily_checkin_7: dailyCheckin7Icon,
  daily_checkin_30: dailyCheckin30Icon,
  daily_fish_9: dailyFish9Icon,
  daily_fish_30: dailyFish30Icon,
  benthic_team: benthicTeamIcon,
  deep_lights: deepLightsIcon,
  soft_party: softPartyIcon,
  large_first: largeFirstIcon,
  large_shadow_pack: largeShadowPackIcon,
  large_shadow_group: largeShadowPackIcon,
  large_shadow_party: largeShadowPackIcon,
  storm_wave: largeShadowPackIcon,
  bubble_maker: bubbleMakerIcon,
  lights_out_observer: lightsOutObserverIcon,
  wave_maker: waveMakerIcon,
  species_scale_9: speciesScale9Icon,
  species_scale_18: speciesScale18Icon,
  species_scale_36: speciesScale36Icon,
  species_scale_72: speciesScale72Icon,
  species_scale_108: speciesScale108Icon,
  species_scale_144: speciesScale144Icon,
  species_scale_169: speciesScale169Icon,
  deep_curse: deepCurseIcon,
  undersea_zoo: underseaZooIcon,
};

/** 按成就 ID 读取对应的像素图标资源。 */
export function getAchievementIconSrc(achievementId: AchievementId): string {
  return ACHIEVEMENT_ICON_BY_ID[achievementId];
}
