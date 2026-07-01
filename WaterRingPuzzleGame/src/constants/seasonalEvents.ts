/**
 * @file seasonalEvents.ts
 * @description Complete seasonal events system for the Water Ring Puzzle Game.
 *
 * Defines 8 recurring seasonal events, each with theme overrides that merge
 * into the active GameTheme, exclusive cosmetic rewards, timed missions, and
 * limited-time store offers. Event dates are calendar-fixed (except the
 * Anniversary event which is dynamically positioned).
 */

import type { GameTheme } from '../constants/themes';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EventMission {
  /** Mission mechanic type (e.g. 'complete_challenges', 'earn_stars'). */
  type: string;
  /** Numeric target the player must reach. */
  target: number;
  /** Coin reward for completing this mission. */
  rewardCoins: number;
  /** XP reward for completing this mission. */
  rewardXP: number;
  /** Player-facing description of the mission. */
  description: string;
}

export interface EventOffer {
  /** In-app purchase product identifier. */
  productId: string;
  /** Display label for the offer. */
  label: string;
  /** Original price in cents (USD). */
  originalPrice: number;
  /** Discounted sale price in cents (USD). */
  salePrice: number;
  /** List of item IDs / descriptions included in the bundle. */
  contents: string[];
  /** Badge shown on the offer card. */
  badge: 'LIMITED' | 'EXCLUSIVE' | 'BEST VALUE';
}

export interface SeasonalEvent {
  /** Unique event identifier. */
  id: string;
  /** Human-readable event name. */
  name: string;
  /** Short marketing description. */
  description: string;
  /** Start month (1-12). */
  startMonth: number;
  /** Start day of month. */
  startDay: number;
  /** Duration in calendar days. */
  durationDays: number;
  /** Partial theme merged on top of the player's active theme during the event. */
  themeOverride: Partial<GameTheme>;
  /** Cosmetic IDs available only during this event window. */
  exclusiveRewards: string[];
  /** Missions players can complete for bonus rewards. */
  missionTemplates: EventMission[];
  /** Limited-time store bundles. */
  storeOffers: EventOffer[];
  /** Three-stop gradient for the event banner. */
  bannerGradient: [string, string, string];
  /** Emoji used as the event icon in UI. */
  iconEmoji: string;
  /** Primary accent color for event-themed UI elements. */
  accentColor: string;
}

// ---------------------------------------------------------------------------
// 1. Summer Splash (Jul 1 - Jul 14)
// ---------------------------------------------------------------------------

const summerSplash: SeasonalEvent = {
  id: 'summer_splash',
  name: 'Summer Splash',
  description: 'Dive into summer with tropical water effects, beach-themed cosmetics, and sun-soaked rewards!',
  startMonth: 7,
  startDay: 1,
  durationDays: 14,
  themeOverride: {
    water: {
      deep: '#006994',
      mid: '#0099CC',
      surface: '#33CCFF',
      foam: '#99EEFF',
      tint: [0.2, 0.8, 1.0],
      opacity: 0.82,
      waveAmplitude: 1.4,
      waveSpeed: 1.3,
    },
    particles: {
      bubble: ['#33CCFF', '#66DDFF', '#99EEFF', '#CCFFFF'],
      splash: ['#FF6B35', '#FF9F1C', '#FFBF69', '#FFE0A0'],
      sparkle: ['#FFFFFF', '#FFF3CD', '#FFDD57', '#FFB400'],
      trail: ['#0099CC', '#00BBEE', '#33CCFF', '#66DDFF'],
    },
    background: {
      gradient: ['#003049', '#005F73', '#0A9396'],
      pattern: 'waves',
      patternOpacity: 0.12,
      ambientParticles: 'bubbles',
      ambientSpeed: 1.3,
      ambientCount: 30,
    },
  },
  exclusiveRewards: [
    'ring_skin_tropical',
    'tank_skin_sandcastle',
    'particle_effect_waves',
    'badge_frame_coconut',
    'avatar_sunglasses',
  ],
  missionTemplates: [
    { type: 'complete_challenges', target: 15, rewardCoins: 500, rewardXP: 200, description: 'Complete 15 challenges during Summer Splash' },
    { type: 'earn_stars', target: 30, rewardCoins: 350, rewardXP: 150, description: 'Earn 30 stars with tropical flair' },
    { type: 'win_streak', target: 5, rewardCoins: 400, rewardXP: 180, description: 'Ride a 5-win wave streak' },
    { type: 'speed_win', target: 3, rewardCoins: 300, rewardXP: 120, description: 'Splash through 3 speed wins' },
    { type: 'no_continue_win', target: 5, rewardCoins: 450, rewardXP: 200, description: 'Complete 5 challenges without using continues' },
  ],
  storeOffers: [
    {
      productId: 'summer_splash_starter',
      label: 'Summer Starter Pack',
      originalPrice: 499,
      salePrice: 299,
      contents: ['1500 coins', 'ring_skin_tropical', 'particle_effect_waves'],
      badge: 'LIMITED',
    },
    {
      productId: 'summer_splash_premium',
      label: 'Beach Bundle',
      originalPrice: 999,
      salePrice: 699,
      contents: ['5000 coins', 'tank_skin_sandcastle', 'badge_frame_coconut', 'avatar_sunglasses', '3x XP Boost (24h)'],
      badge: 'BEST VALUE',
    },
    {
      productId: 'summer_splash_exclusive',
      label: 'Tropical Exclusive',
      originalPrice: 1499,
      salePrice: 999,
      contents: ['10000 coins', 'All Summer Splash cosmetics', '7-day Premium Pass', 'Exclusive Summer Title'],
      badge: 'EXCLUSIVE',
    },
  ],
  bannerGradient: ['#003049', '#0A9396', '#FFB400'],
  iconEmoji: '🏖️',
  accentColor: '#0A9396',
};

// ---------------------------------------------------------------------------
// 2. Back to School (Aug 25 - Sep 7)
// ---------------------------------------------------------------------------

const backToSchool: SeasonalEvent = {
  id: 'back_to_school',
  name: 'Back to School',
  description: 'Sharpen your skills with brain-teasing missions, chalkboard visuals, and scholarly rewards!',
  startMonth: 8,
  startDay: 25,
  durationDays: 14,
  themeOverride: {
    water: {
      deep: '#1B4332',
      mid: '#2D6A4F',
      surface: '#40916C',
      foam: '#74C69D',
      tint: [0.18, 0.42, 0.3],
      opacity: 0.8,
      waveAmplitude: 0.9,
      waveSpeed: 0.8,
    },
    particles: {
      bubble: ['#95D5B2', '#74C69D', '#52B788', '#40916C'],
      splash: ['#FFE8D6', '#DDBEA9', '#CB997E', '#B07D62'],
      sparkle: ['#FFFFFF', '#FFE8D6', '#FFDAB9', '#FFD39B'],
      trail: ['#40916C', '#2D6A4F', '#1B4332', '#081C15'],
    },
    background: {
      gradient: ['#1A1A2E', '#2D3436', '#3D3D3D'],
      pattern: 'grid',
      patternOpacity: 0.15,
      ambientParticles: 'sparkles',
      ambientSpeed: 0.7,
      ambientCount: 12,
    },
  },
  exclusiveRewards: [
    'ring_skin_pencil',
    'tank_skin_chalkboard',
    'particle_effect_eraser_dust',
    'badge_frame_notebook',
  ],
  missionTemplates: [
    { type: 'complete_challenges', target: 20, rewardCoins: 600, rewardXP: 250, description: 'Ace 20 challenges like a star student' },
    { type: 'earn_stars', target: 40, rewardCoins: 400, rewardXP: 180, description: 'Earn 40 gold stars' },
    { type: 'speed_win', target: 5, rewardCoins: 450, rewardXP: 200, description: 'Speed through 5 pop quizzes' },
    { type: 'daily_challenge', target: 7, rewardCoins: 500, rewardXP: 220, description: 'Complete 7 daily homework assignments' },
    { type: 'no_continue_win', target: 8, rewardCoins: 550, rewardXP: 240, description: 'Pass 8 challenges without extra credit' },
  ],
  storeOffers: [
    {
      productId: 'bts_starter',
      label: 'Student Pack',
      originalPrice: 499,
      salePrice: 299,
      contents: ['1500 coins', 'ring_skin_pencil', 'particle_effect_eraser_dust'],
      badge: 'LIMITED',
    },
    {
      productId: 'bts_premium',
      label: 'Honor Roll Bundle',
      originalPrice: 999,
      salePrice: 649,
      contents: ['5000 coins', 'tank_skin_chalkboard', 'badge_frame_notebook', '3x XP Boost (24h)'],
      badge: 'BEST VALUE',
    },
  ],
  bannerGradient: ['#1A1A2E', '#2D6A4F', '#CB997E'],
  iconEmoji: '📚',
  accentColor: '#2D6A4F',
};

// ---------------------------------------------------------------------------
// 3. Halloween Haunt (Oct 20 - Nov 2)
// ---------------------------------------------------------------------------

const halloweenHaunt: SeasonalEvent = {
  id: 'halloween_haunt',
  name: 'Halloween Haunt',
  description: 'Brave spooky water effects, ghostly particles, and eerie challenges for haunted rewards!',
  startMonth: 10,
  startDay: 20,
  durationDays: 14,
  themeOverride: {
    water: {
      deep: '#1A0A2E',
      mid: '#2D1B4E',
      surface: '#6B21A8',
      foam: '#A855F7',
      tint: [0.42, 0.13, 0.66],
      opacity: 0.88,
      waveAmplitude: 1.1,
      waveSpeed: 0.9,
    },
    particles: {
      bubble: ['#A855F7', '#9333EA', '#7C3AED', '#6D28D9'],
      splash: ['#FF6600', '#FF8C00', '#FFB347', '#FFD700'],
      sparkle: ['#FFFFFF', '#C084FC', '#A855F7', '#22C55E'],
      trail: ['#9333EA', '#7C3AED', '#6D28D9', '#5B21B6'],
    },
    background: {
      gradient: ['#0A0012', '#1A0A2E', '#2D1050'],
      pattern: 'stars',
      patternOpacity: 0.1,
      ambientParticles: 'sparkles',
      ambientSpeed: 0.8,
      ambientCount: 20,
    },
  },
  exclusiveRewards: [
    'ring_skin_ghost',
    'tank_skin_cauldron',
    'particle_effect_bats',
    'badge_frame_pumpkin',
    'avatar_witch_hat',
  ],
  missionTemplates: [
    { type: 'complete_challenges', target: 20, rewardCoins: 666, rewardXP: 260, description: 'Survive 20 haunted challenges' },
    { type: 'earn_stars', target: 35, rewardCoins: 400, rewardXP: 170, description: 'Collect 35 ghostly stars' },
    { type: 'win_streak', target: 7, rewardCoins: 500, rewardXP: 220, description: 'Maintain a 7-win spooky streak' },
    { type: 'speed_win', target: 4, rewardCoins: 350, rewardXP: 150, description: 'Outrun the ghouls with 4 speed wins' },
    { type: 'complete_challenges', target: 50, rewardCoins: 1000, rewardXP: 500, description: 'Master 50 challenges to banish all spirits' },
  ],
  storeOffers: [
    {
      productId: 'halloween_starter',
      label: 'Trick or Treat Pack',
      originalPrice: 499,
      salePrice: 299,
      contents: ['1500 coins', 'ring_skin_ghost', 'particle_effect_bats'],
      badge: 'LIMITED',
    },
    {
      productId: 'halloween_premium',
      label: 'Haunted Bundle',
      originalPrice: 1299,
      salePrice: 799,
      contents: ['7000 coins', 'tank_skin_cauldron', 'badge_frame_pumpkin', 'avatar_witch_hat', '5x XP Boost (24h)'],
      badge: 'BEST VALUE',
    },
    {
      productId: 'halloween_exclusive',
      label: 'Witch\'s Brew',
      originalPrice: 1999,
      salePrice: 1299,
      contents: ['15000 coins', 'All Halloween cosmetics', '14-day Premium Pass', 'Exclusive Haunted Title'],
      badge: 'EXCLUSIVE',
    },
  ],
  bannerGradient: ['#0A0012', '#6B21A8', '#FF6600'],
  iconEmoji: '🎃',
  accentColor: '#A855F7',
};

// ---------------------------------------------------------------------------
// 4. Holiday Frost (Dec 15 - Jan 1)
// ---------------------------------------------------------------------------

const holidayFrost: SeasonalEvent = {
  id: 'holiday_frost',
  name: 'Holiday Frost',
  description: 'Celebrate the season with shimmering ice water, snowfall particles, and festive holiday rewards!',
  startMonth: 12,
  startDay: 15,
  durationDays: 18,
  themeOverride: {
    water: {
      deep: '#0C4A6E',
      mid: '#0369A1',
      surface: '#38BDF8',
      foam: '#BAE6FD',
      tint: [0.22, 0.74, 0.97],
      opacity: 0.78,
      waveAmplitude: 0.7,
      waveSpeed: 0.5,
    },
    particles: {
      bubble: ['#E0F2FE', '#BAE6FD', '#7DD3FC', '#38BDF8'],
      splash: ['#FFFFFF', '#F0F9FF', '#E0F2FE', '#BAE6FD'],
      sparkle: ['#FFFFFF', '#F0F9FF', '#E0F2FE', '#FEF3C7'],
      trail: ['#38BDF8', '#0EA5E9', '#0284C7', '#0369A1'],
    },
    background: {
      gradient: ['#0C1B33', '#1E3A5F', '#2E5984'],
      pattern: 'dots',
      patternOpacity: 0.08,
      ambientParticles: 'snow',
      ambientSpeed: 0.6,
      ambientCount: 40,
    },
  },
  exclusiveRewards: [
    'ring_skin_snowflake',
    'tank_skin_ice_crystal',
    'particle_effect_snowfall',
    'badge_frame_wreath',
    'avatar_santa_hat',
  ],
  missionTemplates: [
    { type: 'complete_challenges', target: 25, rewardCoins: 700, rewardXP: 300, description: 'Unwrap 25 holiday challenges' },
    { type: 'earn_stars', target: 50, rewardCoins: 500, rewardXP: 220, description: 'Collect 50 stars to light the tree' },
    { type: 'daily_challenge', target: 10, rewardCoins: 600, rewardXP: 250, description: 'Open 10 daily advent challenges' },
    { type: 'win_streak', target: 8, rewardCoins: 550, rewardXP: 230, description: 'Keep an 8-win holiday streak alive' },
    { type: 'no_continue_win', target: 10, rewardCoins: 650, rewardXP: 280, description: 'Perfect 10 challenges with no continues' },
  ],
  storeOffers: [
    {
      productId: 'holiday_starter',
      label: 'Stocking Stuffer',
      originalPrice: 499,
      salePrice: 199,
      contents: ['2000 coins', 'ring_skin_snowflake', 'particle_effect_snowfall'],
      badge: 'LIMITED',
    },
    {
      productId: 'holiday_premium',
      label: 'Holiday Deluxe',
      originalPrice: 1499,
      salePrice: 899,
      contents: ['8000 coins', 'tank_skin_ice_crystal', 'badge_frame_wreath', 'avatar_santa_hat', '5x XP Boost (48h)'],
      badge: 'BEST VALUE',
    },
    {
      productId: 'holiday_mega',
      label: 'Winter Wonderland',
      originalPrice: 2499,
      salePrice: 1499,
      contents: ['20000 coins', 'All Holiday cosmetics', '30-day Premium Pass', 'Exclusive Frost Title', 'Exclusive Winter Theme'],
      badge: 'EXCLUSIVE',
    },
  ],
  bannerGradient: ['#0C1B33', '#38BDF8', '#FFFFFF'],
  iconEmoji: '❄️',
  accentColor: '#38BDF8',
};

// ---------------------------------------------------------------------------
// 5. Lunar New Year (Jan 22 - Feb 5)
// ---------------------------------------------------------------------------

const lunarNewYear: SeasonalEvent = {
  id: 'lunar_new_year',
  name: 'Lunar New Year',
  description: 'Ring in the Lunar New Year with golden water, lantern particles, and fortune-filled rewards!',
  startMonth: 1,
  startDay: 22,
  durationDays: 15,
  themeOverride: {
    water: {
      deep: '#7F1D1D',
      mid: '#B91C1C',
      surface: '#EF4444',
      foam: '#FCA5A5',
      tint: [0.94, 0.27, 0.27],
      opacity: 0.84,
      waveAmplitude: 1.0,
      waveSpeed: 1.0,
    },
    particles: {
      bubble: ['#FCD34D', '#FBBF24', '#F59E0B', '#D97706'],
      splash: ['#FEE2E2', '#FECACA', '#FCA5A5', '#F87171'],
      sparkle: ['#FFFFFF', '#FEF3C7', '#FDE68A', '#FCD34D'],
      trail: ['#EF4444', '#DC2626', '#B91C1C', '#991B1B'],
    },
    background: {
      gradient: ['#1A0505', '#3B0A0A', '#5C1010'],
      pattern: 'dots',
      patternOpacity: 0.1,
      ambientParticles: 'sparkles',
      ambientSpeed: 1.0,
      ambientCount: 25,
    },
  },
  exclusiveRewards: [
    'ring_skin_dragon',
    'tank_skin_lantern',
    'particle_effect_fireworks',
    'badge_frame_red_envelope',
  ],
  missionTemplates: [
    { type: 'complete_challenges', target: 18, rewardCoins: 888, rewardXP: 280, description: 'Complete 18 challenges for prosperity' },
    { type: 'earn_stars', target: 38, rewardCoins: 488, rewardXP: 188, description: 'Earn 38 lucky stars' },
    { type: 'win_streak', target: 8, rewardCoins: 588, rewardXP: 238, description: 'Achieve an auspicious 8-win streak' },
    { type: 'speed_win', target: 4, rewardCoins: 388, rewardXP: 158, description: 'Win 4 challenges with dragon speed' },
    { type: 'daily_challenge', target: 8, rewardCoins: 688, rewardXP: 268, description: 'Complete 8 daily fortune challenges' },
  ],
  storeOffers: [
    {
      productId: 'lunar_starter',
      label: 'Red Envelope Pack',
      originalPrice: 499,
      salePrice: 288,
      contents: ['1888 coins', 'ring_skin_dragon', 'particle_effect_fireworks'],
      badge: 'LIMITED',
    },
    {
      productId: 'lunar_premium',
      label: 'Golden Dragon Bundle',
      originalPrice: 1299,
      salePrice: 888,
      contents: ['8888 coins', 'tank_skin_lantern', 'badge_frame_red_envelope', '5x XP Boost (24h)', 'Exclusive Lunar Title'],
      badge: 'BEST VALUE',
    },
  ],
  bannerGradient: ['#3B0A0A', '#EF4444', '#FCD34D'],
  iconEmoji: '🧧',
  accentColor: '#EF4444',
};

// ---------------------------------------------------------------------------
// 6. Valentine's Drop (Feb 7 - Feb 21)
// ---------------------------------------------------------------------------

const valentinesDrop: SeasonalEvent = {
  id: 'valentines_drop',
  name: 'Valentine\'s Drop',
  description: 'Fall in love with rose-tinted water, heart particles, and sweet romantic cosmetics!',
  startMonth: 2,
  startDay: 7,
  durationDays: 15,
  themeOverride: {
    water: {
      deep: '#831843',
      mid: '#BE185D',
      surface: '#EC4899',
      foam: '#F9A8D4',
      tint: [0.93, 0.29, 0.6],
      opacity: 0.82,
      waveAmplitude: 1.0,
      waveSpeed: 0.9,
    },
    particles: {
      bubble: ['#FBCFE8', '#F9A8D4', '#F472B6', '#EC4899'],
      splash: ['#FDF2F8', '#FCE7F3', '#FBCFE8', '#F9A8D4'],
      sparkle: ['#FFFFFF', '#FDF2F8', '#FCE7F3', '#FEE2E2'],
      trail: ['#EC4899', '#DB2777', '#BE185D', '#9D174D'],
    },
    background: {
      gradient: ['#1A0515', '#2D0A25', '#450A35'],
      pattern: 'bubbles',
      patternOpacity: 0.1,
      ambientParticles: 'sparkles',
      ambientSpeed: 0.8,
      ambientCount: 22,
    },
  },
  exclusiveRewards: [
    'ring_skin_heart',
    'tank_skin_rose_garden',
    'particle_effect_hearts',
    'badge_frame_cupid',
    'avatar_love_crown',
  ],
  missionTemplates: [
    { type: 'complete_challenges', target: 14, rewardCoins: 500, rewardXP: 200, description: 'Complete 14 challenges, one for each day of love' },
    { type: 'earn_stars', target: 28, rewardCoins: 350, rewardXP: 140, description: 'Collect 28 sweetheart stars' },
    { type: 'win_streak', target: 5, rewardCoins: 400, rewardXP: 170, description: 'Win 5 in a row for a love combo' },
    { type: 'no_continue_win', target: 7, rewardCoins: 450, rewardXP: 190, description: 'Show your devotion with 7 flawless wins' },
    { type: 'speed_win', target: 3, rewardCoins: 350, rewardXP: 150, description: 'Speed through 3 love letters' },
  ],
  storeOffers: [
    {
      productId: 'valentine_starter',
      label: 'Love Letter Pack',
      originalPrice: 499,
      salePrice: 299,
      contents: ['1500 coins', 'ring_skin_heart', 'particle_effect_hearts'],
      badge: 'LIMITED',
    },
    {
      productId: 'valentine_premium',
      label: 'Cupid\'s Bundle',
      originalPrice: 1299,
      salePrice: 799,
      contents: ['6000 coins', 'tank_skin_rose_garden', 'badge_frame_cupid', 'avatar_love_crown', '3x XP Boost (24h)'],
      badge: 'BEST VALUE',
    },
    {
      productId: 'valentine_exclusive',
      label: 'True Love Collection',
      originalPrice: 1999,
      salePrice: 1299,
      contents: ['12000 coins', 'All Valentine cosmetics', '14-day Premium Pass', 'Exclusive Valentine Title'],
      badge: 'EXCLUSIVE',
    },
  ],
  bannerGradient: ['#2D0A25', '#EC4899', '#F9A8D4'],
  iconEmoji: '💝',
  accentColor: '#EC4899',
};

// ---------------------------------------------------------------------------
// 7. Spring Bloom (Mar 15 - Mar 29)
// ---------------------------------------------------------------------------

const springBloom: SeasonalEvent = {
  id: 'spring_bloom',
  name: 'Spring Bloom',
  description: 'Watch the garden bloom with fresh green water, petal particles, and nature-inspired cosmetics!',
  startMonth: 3,
  startDay: 15,
  durationDays: 15,
  themeOverride: {
    water: {
      deep: '#065F46',
      mid: '#059669',
      surface: '#34D399',
      foam: '#A7F3D0',
      tint: [0.2, 0.83, 0.6],
      opacity: 0.8,
      waveAmplitude: 1.1,
      waveSpeed: 1.0,
    },
    particles: {
      bubble: ['#D1FAE5', '#A7F3D0', '#6EE7B7', '#34D399'],
      splash: ['#FECDD3', '#FDA4AF', '#FB7185', '#F43F5E'],
      sparkle: ['#FFFFFF', '#FDF2F8', '#D1FAE5', '#FEF9C3'],
      trail: ['#34D399', '#10B981', '#059669', '#047857'],
    },
    background: {
      gradient: ['#052E16', '#064E3B', '#065F46'],
      pattern: 'dots',
      patternOpacity: 0.08,
      ambientParticles: 'leaves',
      ambientSpeed: 0.9,
      ambientCount: 20,
    },
  },
  exclusiveRewards: [
    'ring_skin_flower',
    'tank_skin_garden',
    'particle_effect_petals',
    'badge_frame_butterfly',
  ],
  missionTemplates: [
    { type: 'complete_challenges', target: 15, rewardCoins: 500, rewardXP: 200, description: 'Bloom through 15 spring challenges' },
    { type: 'earn_stars', target: 30, rewardCoins: 350, rewardXP: 150, description: 'Gather 30 blossoming stars' },
    { type: 'daily_challenge', target: 8, rewardCoins: 450, rewardXP: 190, description: 'Tend to 8 daily garden challenges' },
    { type: 'win_streak', target: 6, rewardCoins: 400, rewardXP: 170, description: 'Grow a 6-win blooming streak' },
    { type: 'speed_win', target: 4, rewardCoins: 380, rewardXP: 160, description: 'Spring forward with 4 speed wins' },
  ],
  storeOffers: [
    {
      productId: 'spring_starter',
      label: 'Seedling Pack',
      originalPrice: 499,
      salePrice: 299,
      contents: ['1500 coins', 'ring_skin_flower', 'particle_effect_petals'],
      badge: 'LIMITED',
    },
    {
      productId: 'spring_premium',
      label: 'Garden Bundle',
      originalPrice: 999,
      salePrice: 649,
      contents: ['5000 coins', 'tank_skin_garden', 'badge_frame_butterfly', '3x XP Boost (24h)'],
      badge: 'BEST VALUE',
    },
  ],
  bannerGradient: ['#052E16', '#34D399', '#FB7185'],
  iconEmoji: '🌸',
  accentColor: '#10B981',
};

// ---------------------------------------------------------------------------
// 8. Anniversary (Dynamic - uses app launch anniversary)
// ---------------------------------------------------------------------------

const anniversary: SeasonalEvent = {
  id: 'anniversary',
  name: 'Anniversary Celebration',
  description: 'Celebrate our birthday with golden confetti, premium rewards, and the biggest event of the year!',
  startMonth: 6,
  startDay: 15,
  durationDays: 14,
  themeOverride: {
    water: {
      deep: '#312E81',
      mid: '#4338CA',
      surface: '#6366F1',
      foam: '#A5B4FC',
      tint: [0.39, 0.4, 0.95],
      opacity: 0.85,
      waveAmplitude: 1.2,
      waveSpeed: 1.1,
    },
    particles: {
      bubble: ['#FCD34D', '#FBBF24', '#C084FC', '#818CF8'],
      splash: ['#EDE9FE', '#DDD6FE', '#C4B5FD', '#A78BFA'],
      sparkle: ['#FFFFFF', '#FEF3C7', '#FDE68A', '#FCD34D'],
      trail: ['#6366F1', '#4F46E5', '#4338CA', '#3730A3'],
    },
    background: {
      gradient: ['#0F0A2E', '#1E1B4B', '#312E81'],
      pattern: 'stars',
      patternOpacity: 0.12,
      ambientParticles: 'sparkles',
      ambientSpeed: 1.2,
      ambientCount: 30,
    },
  },
  exclusiveRewards: [
    'ring_skin_anniversary_gold',
    'tank_skin_celebration',
    'particle_effect_confetti',
    'badge_frame_anniversary',
    'avatar_party_crown',
  ],
  missionTemplates: [
    { type: 'complete_challenges', target: 30, rewardCoins: 1000, rewardXP: 400, description: 'Complete 30 birthday celebration challenges' },
    { type: 'earn_stars', target: 60, rewardCoins: 750, rewardXP: 300, description: 'Earn 60 anniversary stars' },
    { type: 'win_streak', target: 10, rewardCoins: 800, rewardXP: 350, description: 'Hit a legendary 10-win birthday streak' },
    { type: 'daily_challenge', target: 10, rewardCoins: 700, rewardXP: 300, description: 'Complete 10 daily anniversary specials' },
    { type: 'no_continue_win', target: 12, rewardCoins: 900, rewardXP: 380, description: 'Perfect 12 challenges for the grand finale' },
  ],
  storeOffers: [
    {
      productId: 'anniversary_starter',
      label: 'Birthday Box',
      originalPrice: 499,
      salePrice: 199,
      contents: ['2500 coins', 'ring_skin_anniversary_gold', 'particle_effect_confetti'],
      badge: 'LIMITED',
    },
    {
      productId: 'anniversary_premium',
      label: 'Celebration Bundle',
      originalPrice: 1499,
      salePrice: 899,
      contents: ['10000 coins', 'tank_skin_celebration', 'badge_frame_anniversary', 'avatar_party_crown', '7x XP Boost (48h)'],
      badge: 'BEST VALUE',
    },
    {
      productId: 'anniversary_mega',
      label: 'Founder\'s Collection',
      originalPrice: 2999,
      salePrice: 1799,
      contents: ['25000 coins', 'All Anniversary cosmetics', '30-day Premium Pass', 'Exclusive Founder Title', 'Exclusive Anniversary Theme'],
      badge: 'EXCLUSIVE',
    },
  ],
  bannerGradient: ['#1E1B4B', '#6366F1', '#FCD34D'],
  iconEmoji: '🎂',
  accentColor: '#6366F1',
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/** All seasonal events in chronological order. */
export const SEASONAL_EVENTS: SeasonalEvent[] = [
  lunarNewYear,
  valentinesDrop,
  springBloom,
  anniversary,
  summerSplash,
  backToSchool,
  halloweenHaunt,
  holidayFrost,
];

/** Map of event ID to its definition. */
export const SEASONAL_EVENTS_MAP: Record<string, SeasonalEvent> = Object.fromEntries(
  SEASONAL_EVENTS.map((e) => [e.id, e]),
);

/**
 * Determine which seasonal event (if any) is active on a given date.
 * Handles year-boundary events (e.g. Holiday Frost spanning Dec-Jan).
 *
 * @param date - The date to check (defaults to now).
 * @returns The active SeasonalEvent, or null if no event is running.
 */
export function getActiveEvent(date: Date = new Date()): SeasonalEvent | null {
  const month = date.getMonth() + 1; // 1-12
  const day = date.getDate();

  for (const event of SEASONAL_EVENTS) {
    const startMonth = event.startMonth;
    const startDay = event.startDay;

    // Build a start date in the current year
    let startDate = new Date(date.getFullYear(), startMonth - 1, startDay);

    // If the event would have started in a previous month context for
    // year-wrapping events, also check starting from the previous year
    const endDate = new Date(startDate.getTime() + event.durationDays * 86_400_000);

    if (date >= startDate && date < endDate) {
      return event;
    }

    // Handle year boundary: e.g. Holiday Frost Dec 15 -> Jan 1
    // Check if the event started in December of the previous year
    if (startMonth > month) {
      const prevYearStart = new Date(date.getFullYear() - 1, startMonth - 1, startDay);
      const prevYearEnd = new Date(prevYearStart.getTime() + event.durationDays * 86_400_000);
      if (date >= prevYearStart && date < prevYearEnd) {
        return event;
      }
    }
  }

  return null;
}

/**
 * Get all events that will occur within the next N days.
 *
 * @param days - Look-ahead window in days (default 30).
 * @param from - Start date (defaults to now).
 * @returns Array of upcoming events sorted by start date.
 */
export function getUpcomingEvents(days: number = 30, from: Date = new Date()): SeasonalEvent[] {
  const cutoff = new Date(from.getTime() + days * 86_400_000);
  const results: SeasonalEvent[] = [];

  for (const event of SEASONAL_EVENTS) {
    // Check current year
    const startDate = new Date(from.getFullYear(), event.startMonth - 1, event.startDay);
    if (startDate >= from && startDate <= cutoff) {
      results.push(event);
      continue;
    }
    // Check next year for events in early months when we're late in the year
    const nextYearStart = new Date(from.getFullYear() + 1, event.startMonth - 1, event.startDay);
    if (nextYearStart >= from && nextYearStart <= cutoff) {
      results.push(event);
    }
  }

  return results;
}
