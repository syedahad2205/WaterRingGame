/**
 * GameIcons.tsx
 *
 * Production SVG icon system using react-native-svg.
 * All icons are 24x24 viewBox, 2px stroke, round linecap/linejoin.
 * Fully tintable via the `color` prop.
 */

import React, { memo } from 'react';
import { View, type ViewStyle } from 'react-native';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';

// ---------------------------------------------------------------------------
// Icon name type
// ---------------------------------------------------------------------------

export type IconName =
  // Navigation
  | 'home' | 'trophy' | 'store' | 'profile' | 'settings' | 'back' | 'close'
  // Game
  | 'play' | 'pause' | 'restart' | 'skip' | 'hint' | 'water-drop' | 'ring' | 'peg' | 'target'
  // Currency
  | 'coin' | 'gem' | 'star' | 'star-filled' | 'star-half' | 'star-empty'
  // Status
  | 'check' | 'warning' | 'error' | 'info' | 'lock' | 'unlock' | 'crown'
  // Actions
  | 'share' | 'replay' | 'timer' | 'sound-on' | 'sound-off' | 'music-on' | 'music-off'
  | 'haptic-on' | 'haptic-off' | 'eye' | 'eye-off'
  // Social
  | 'leaderboard' | 'friends' | 'challenge' | 'gift' | 'streak'
  // Misc
  | 'sparkle' | 'fire' | 'bolt' | 'shield' | 'palette' | 'moon' | 'sun'
  | 'chevron-right' | 'chevron-down' | 'chevron-up' | 'plus' | 'minus'
  | 'menu' | 'grid' | 'list' | 'filter' | 'search' | 'heart'
  // Cosmetic system additions
  | 'flame' | 'lightning' | 'diamond' | 'paint-bucket' | 'magic-wand'
  | 'ribbon' | 'clock' | 'compass' | 'layers' | 'award'
  | 'package' | 'tag' | 'zap' | 'droplet' | 'snowflake'
  | 'leaf' | 'music' | 'camera' | 'refresh' | 'trending-up';

// ---------------------------------------------------------------------------
// SVG path data
// ---------------------------------------------------------------------------

interface IconDef {
  paths: string[];
  /** Extra elements like circles or rects rendered before paths */
  extras?: React.FC<{ color: string; strokeWidth: number }>;
  /** If true, paths are filled instead of stroked */
  filled?: boolean;
}

const ICON_PATHS: Record<IconName, IconDef> = {
  // ── Navigation ──────────────────────────────────────────────────────────
  home: {
    paths: [
      'M3 12L12 3l9 9',
      'M5 12v7a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-7',
    ],
  },
  trophy: {
    paths: [
      'M6 9a6 6 0 006 6 6 6 0 006-6V3H6v6z',
      'M6 5H3a1 1 0 00-1 1v1a4 4 0 004 4',
      'M18 5h3a1 1 0 011 1v1a4 4 0 01-4 4',
      'M9 21h6',
      'M12 15v6',
    ],
  },
  store: {
    paths: [
      'M3 3h18l-2 7H5L3 3z',
      'M5 10v10a1 1 0 001 1h12a1 1 0 001-1V10',
      'M9 21v-6h6v6',
    ],
  },
  profile: {
    paths: [
      'M12 11a4 4 0 100-8 4 4 0 000 8z',
      'M4 21v-1a6 6 0 0112 0v1',
    ],
  },
  settings: {
    paths: [
      'M12 15a3 3 0 100-6 3 3 0 000 6z',
      'M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H10a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001.08 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V10c.26.6.77 1.02 1.51 1.08H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1.08z',
    ],
  },
  back: {
    paths: ['M15 18l-6-6 6-6'],
  },
  close: {
    paths: ['M18 6L6 18', 'M6 6l12 12'],
  },

  // ── Game ─────────────────────────────────────────────────────────────────
  play: {
    paths: ['M6 4l14 8-14 8V4z'],
  },
  pause: {
    paths: ['M6 4h4v16H6V4z', 'M14 4h4v16h-4V4z'],
  },
  restart: {
    paths: [
      'M1 4v6h6',
      'M3.51 15a9 9 0 102.13-9.36L1 10',
    ],
  },
  skip: {
    paths: ['M5 4l10 8-10 8V4z', 'M19 5v14'],
  },
  hint: {
    paths: [
      'M9 18h6',
      'M10 22h4',
      'M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z',
    ],
  },
  'water-drop': {
    paths: ['M12 2C8 8 4 12.5 4 16a8 8 0 0016 0c0-3.5-4-8-8-14z'],
  },
  ring: {
    paths: ['M12 19a7 7 0 100-14 7 7 0 000 14z'],
  },
  peg: {
    paths: [
      'M12 2v8',
      'M12 14a2 2 0 100-4 2 2 0 000 4z',
      'M12 14v8',
    ],
  },
  target: {
    paths: [
      'M12 20a8 8 0 100-16 8 8 0 000 16z',
      'M12 16a4 4 0 100-8 4 4 0 000 8z',
      'M12 13a1 1 0 100-2 1 1 0 000 2z',
    ],
  },

  // ── Currency ─────────────────────────────────────────────────────────────
  coin: {
    paths: [
      'M12 21a9 9 0 100-18 9 9 0 000 18z',
      'M12 7v10',
      'M9 9.5a3 3 0 013-2.5h1a3 3 0 010 6h-2a3 3 0 000 6h1a3 3 0 003-2.5',
    ],
  },
  gem: {
    paths: [
      'M6 3h12l4 7-10 11L2 10l4-7z',
      'M2 10h20',
      'M12 21L8 10l4-7 4 7-4 11z',
    ],
  },
  star: {
    paths: ['M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z'],
  },
  'star-filled': {
    paths: ['M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z'],
    filled: true,
  },
  'star-half': {
    paths: [
      'M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z',
      'M12 2v15.27L5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z',
    ],
  },
  'star-empty': {
    paths: ['M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z'],
  },

  // ── Status ───────────────────────────────────────────────────────────────
  check: {
    paths: ['M20 6L9 17l-5-5'],
  },
  warning: {
    paths: [
      'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
      'M12 9v4',
      'M12 17h.01',
    ],
  },
  error: {
    paths: [
      'M12 22a10 10 0 100-20 10 10 0 000 20z',
      'M15 9l-6 6',
      'M9 9l6 6',
    ],
  },
  info: {
    paths: [
      'M12 22a10 10 0 100-20 10 10 0 000 20z',
      'M12 16v-4',
      'M12 8h.01',
    ],
  },
  lock: {
    paths: [
      'M5 11h14a1 1 0 011 1v8a1 1 0 01-1 1H5a1 1 0 01-1-1v-8a1 1 0 011-1z',
      'M7 11V7a5 5 0 0110 0v4',
    ],
  },
  unlock: {
    paths: [
      'M5 11h14a1 1 0 011 1v8a1 1 0 01-1 1H5a1 1 0 01-1-1v-8a1 1 0 011-1z',
      'M7 11V7a5 5 0 0110 0',
    ],
  },
  crown: {
    paths: ['M2 18l3-12 5 6 2-8 2 8 5-6 3 12H2z', 'M2 18h20v2H2v-2z'],
  },

  // ── Actions ──────────────────────────────────────────────────────────────
  share: {
    paths: [
      'M18 8a3 3 0 100-6 3 3 0 000 6z',
      'M6 15a3 3 0 100-6 3 3 0 000 6z',
      'M18 22a3 3 0 100-6 3 3 0 000 6z',
      'M8.59 13.51l6.83 3.98',
      'M15.41 6.51l-6.82 3.98',
    ],
  },
  replay: {
    paths: [
      'M23 4v6h-6',
      'M20.49 15a9 9 0 11-2.12-9.36L23 10',
    ],
  },
  timer: {
    paths: [
      'M12 21a8 8 0 100-16 8 8 0 000 16z',
      'M12 9v4l2 2',
      'M10 2h4',
    ],
  },
  'sound-on': {
    paths: [
      'M11 5L6 9H2v6h4l5 4V5z',
      'M19.07 4.93a10 10 0 010 14.14',
      'M15.54 8.46a5 5 0 010 7.07',
    ],
  },
  'sound-off': {
    paths: [
      'M11 5L6 9H2v6h4l5 4V5z',
      'M23 9l-6 6',
      'M17 9l6 6',
    ],
  },
  'music-on': {
    paths: [
      'M9 18V5l12-2v13',
      'M9 18a3 3 0 11-6 0 3 3 0 016 0z',
      'M21 16a3 3 0 11-6 0 3 3 0 016 0z',
    ],
  },
  'music-off': {
    paths: [
      'M9 18V5l12-2v13',
      'M9 18a3 3 0 11-6 0 3 3 0 016 0z',
      'M21 16a3 3 0 11-6 0 3 3 0 016 0z',
      'M2 2l20 20',
    ],
  },
  'haptic-on': {
    paths: [
      'M6 3h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2z',
      'M2 8h2',
      'M2 12h2',
      'M2 16h2',
      'M20 8h2',
      'M20 12h2',
      'M20 16h2',
    ],
  },
  'haptic-off': {
    paths: [
      'M6 3h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2z',
      'M2 2l20 20',
    ],
  },
  eye: {
    paths: [
      'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z',
      'M12 15a3 3 0 100-6 3 3 0 000 6z',
    ],
  },
  'eye-off': {
    paths: [
      'M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94',
      'M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19',
      'M14.12 14.12a3 3 0 11-4.24-4.24',
      'M1 1l22 22',
    ],
  },

  // ── Social ───────────────────────────────────────────────────────────────
  leaderboard: {
    paths: [
      'M8 21V11H2v10h6z',
      'M15 21V7H9v14h6z',
      'M22 21V3h-6v18h6z',
    ],
  },
  friends: {
    paths: [
      'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2',
      'M9 11a4 4 0 100-8 4 4 0 000 8z',
      'M23 21v-2a4 4 0 00-3-3.87',
      'M16 3.13a4 4 0 010 7.75',
    ],
  },
  challenge: {
    paths: [
      'M14.5 3l-5 5',
      'M9.5 3l5 5',
      'M6 9l-4 12h20L18 9',
      'M12 9v12',
    ],
  },
  gift: {
    paths: [
      'M20 12v10H4V12',
      'M2 7h20v5H2V7z',
      'M12 22V7',
      'M12 7a4 4 0 00-4-4c-1.5 0-4 1.5-4 4',
      'M12 7a4 4 0 014-4c1.5 0 4 1.5 4 4',
    ],
  },
  streak: {
    paths: ['M13 2L3 14h9l-1 8 10-12h-9l1-8z'],
  },

  // ── Misc ─────────────────────────────────────────────────────────────────
  sparkle: {
    paths: [
      'M12 2l2 7 7 2-7 2-2 7-2-7-7-2 7-2 2-7z',
      'M5 5l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z',
    ],
  },
  fire: {
    paths: ['M12 23c4.97 0 9-3.58 9-8 0-2.52-1.61-5.45-3-7.5C16.14 4.88 13 2 12 1c-1 1-4.14 3.88-6 6.5C4.61 9.55 3 12.48 3 15c0 4.42 4.03 8 9 8z', 'M12 23c-2.21 0-4-1.79-4-4 0-1.26.81-2.72 1.5-3.75.94-1.4 2.5-3.25 2.5-3.25s1.56 1.85 2.5 3.25c.69 1.03 1.5 2.49 1.5 3.75 0 2.21-1.79 4-4 4z'],
  },
  bolt: {
    paths: ['M13 2L3 14h9l-1 8 10-12h-9l1-8z'],
  },
  shield: {
    paths: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'],
  },
  palette: {
    paths: [
      'M12 2a10 10 0 00-1 19.95c.56.05 1.05-.33 1.05-.89 0-.29-.11-.5-.29-.71-.17-.2-.29-.5-.29-.89a1.5 1.5 0 011.5-1.5H15a6 6 0 006-6c0-5.52-4.03-10-9-10z',
      'M7 13a1 1 0 100-2 1 1 0 000 2z',
      'M10 8a1 1 0 100-2 1 1 0 000 2z',
      'M15 8a1 1 0 100-2 1 1 0 000 2z',
      'M18 13a1 1 0 100-2 1 1 0 000 2z',
    ],
  },
  moon: {
    paths: ['M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z'],
  },
  sun: {
    paths: [
      'M12 17a5 5 0 100-10 5 5 0 000 10z',
      'M12 1v2',
      'M12 21v2',
      'M4.22 4.22l1.42 1.42',
      'M18.36 18.36l1.42 1.42',
      'M1 12h2',
      'M21 12h2',
      'M4.22 19.78l1.42-1.42',
      'M18.36 5.64l1.42-1.42',
    ],
  },
  'chevron-right': {
    paths: ['M9 18l6-6-6-6'],
  },
  'chevron-down': {
    paths: ['M6 9l6 6 6-6'],
  },
  'chevron-up': {
    paths: ['M18 15l-6-6-6 6'],
  },
  plus: {
    paths: ['M12 5v14', 'M5 12h14'],
  },
  minus: {
    paths: ['M5 12h14'],
  },
  menu: {
    paths: ['M3 6h18', 'M3 12h18', 'M3 18h18'],
  },
  grid: {
    paths: [
      'M3 3h7v7H3V3z',
      'M14 3h7v7h-7V3z',
      'M3 14h7v7H3v-7z',
      'M14 14h7v7h-7v-7z',
    ],
  },
  list: {
    paths: [
      'M8 6h13',
      'M8 12h13',
      'M8 18h13',
      'M3 6h.01',
      'M3 12h.01',
      'M3 18h.01',
    ],
  },
  filter: {
    paths: ['M22 3H2l8 9.46V19l4 2v-8.54L22 3z'],
  },
  search: {
    paths: [
      'M11 19a8 8 0 100-16 8 8 0 000 16z',
      'M21 21l-4.35-4.35',
    ],
  },
  heart: {
    paths: ['M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z'],
  },

  // ── Cosmetic system additions ────────────────────────────────────────────
  flame: {
    paths: [
      'M12 1C9 6 4 10 4 15a8 8 0 0016 0c0-5-5-9-8-14z',
      'M10 15c0-2 2-4 2-6 0 2 2 4 2 6a2 2 0 01-4 0z',
    ],
  },
  lightning: {
    paths: ['M6 2l-4 10h8L6 22l14-14h-8L16 2H6z'],
  },
  diamond: {
    paths: ['M12 2L2 12l10 10 10-10L12 2z', 'M12 2l4 10-4 10-4-10 4-10z'],
  },
  'paint-bucket': {
    paths: [
      'M2.5 18.5l9-9 5 5-9 9a1.41 1.41 0 01-2 0l-3-3a1.41 1.41 0 010-2z',
      'M7.5 13.5L1 7l4-4',
      'M17 12l3.5 3.5c.83.83.83 2.17 0 3s-2.17.83-3 0L14 15',
      'M1 7h8',
    ],
  },
  'magic-wand': {
    paths: [
      'M15 4l5 5L7 22l-5-5L15 4z',
      'M18 2l2 2',
      'M22 6h-2',
      'M20 10l-2-2',
      'M12 2v2',
      'M8 4l2 2',
    ],
  },
  ribbon: {
    paths: [
      'M12 15a6 6 0 100-12 6 6 0 000 12z',
      'M8.21 13.89L7 23l5-3 5 3-1.21-9.12',
    ],
  },
  clock: {
    paths: [
      'M12 22a10 10 0 100-20 10 10 0 000 20z',
      'M12 6v6l4 2',
    ],
  },
  compass: {
    paths: [
      'M12 22a10 10 0 100-20 10 10 0 000 20z',
      'M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z',
    ],
  },
  layers: {
    paths: [
      'M12 2L2 7l10 5 10-5-10-5z',
      'M2 17l10 5 10-5',
      'M2 12l10 5 10-5',
    ],
  },
  award: {
    paths: [
      'M12 15a7 7 0 100-14 7 7 0 000 14z',
      'M8.21 13.89L7 23l5-3 5 3-1.21-9.11',
    ],
  },
  package: {
    paths: [
      'M16.5 9.4l-9-5.19',
      'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z',
      'M3.27 6.96L12 12.01l8.73-5.05',
      'M12 22.08V12',
    ],
  },
  tag: {
    paths: [
      'M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z',
      'M7 7h.01',
    ],
  },
  zap: {
    paths: ['M13 2L3 14h9l-1 8 10-12h-9l1-8z'],
  },
  droplet: {
    paths: ['M12 2C8 8 4 12.5 4 16a8 8 0 0016 0c0-3.5-4-8-8-14z'],
    filled: true,
  },
  snowflake: {
    paths: [
      'M12 2v20',
      'M17 4l-5 4-5-4',
      'M17 20l-5-4-5 4',
      'M2 12h20',
      'M4 7l4 5-4 5',
      'M20 7l-4 5 4 5',
    ],
  },
  leaf: {
    paths: [
      'M11 20A7 7 0 019.8 6.9C15.5 4.9 20 4 20 4s-1 4.5-3 10.1A7 7 0 0111 20z',
      'M5 21l5-5',
    ],
  },
  music: {
    paths: [
      'M9 18V5l12-2v13',
      'M9 18a3 3 0 11-6 0 3 3 0 016 0z',
      'M21 16a3 3 0 11-6 0 3 3 0 016 0z',
    ],
  },
  camera: {
    paths: [
      'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11z',
      'M12 17a4 4 0 100-8 4 4 0 000 8z',
    ],
  },
  refresh: {
    paths: [
      'M23 4v6h-6',
      'M1 20v-6h6',
      'M3.51 9a9 9 0 0114.85-3.36L23 10',
      'M20.49 15a9 9 0 01-14.85 3.36L1 14',
    ],
  },
  'trending-up': {
    paths: [
      'M23 6l-9.5 9.5-5-5L1 18',
      'M17 6h6v6',
    ],
  },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface IconProps {
  /** Icon name from the IconName union. */
  name: IconName;
  /** Logical size in dp. */
  size?: number;
  /** Tint color applied to all SVG strokes/fills. */
  color?: string;
  /** Additional style applied to the outer container View. */
  style?: ViewStyle;
  /** Accessibility label override (defaults to icon name). */
  accessibilityLabel?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Universal SVG icon component.
 *
 * Renders crisp, tintable SVG paths inside a 24x24 viewBox.
 * All icons respond to the `color` prop.
 */
const IconComponent: React.FC<IconProps> = ({
  name,
  size = 24,
  color = '#FFFFFF',
  style,
  accessibilityLabel,
}) => {
  const iconDef = ICON_PATHS[name];

  if (!iconDef) {
    // Fallback: render an empty square
    return (
      <View
        style={[{ width: size, height: size }, style]}
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel ?? name.replace(/-/g, ' ')}
      />
    );
  }

  const containerStyle: ViewStyle = {
    width: size,
    height: size,
  };

  return (
    <View
      style={[containerStyle, style]}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? name.replace(/-/g, ' ')}
    >
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
      >
        {iconDef.paths.map((d, i) => (
          <Path
            key={i}
            d={d}
            stroke={iconDef.filled ? 'none' : color}
            strokeWidth={iconDef.filled ? 0 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={iconDef.filled ? color : 'none'}
          />
        ))}
      </Svg>
    </View>
  );
};

export const Icon = memo(IconComponent);

// ---------------------------------------------------------------------------
// Utility: legacy character lookup (returns placeholder for SVG-based icons)
// ---------------------------------------------------------------------------

/**
 * Returns a placeholder string for the given icon name.
 *
 * @deprecated SVG icons cannot be represented as characters. This function
 * is retained for backward compatibility but returns a generic placeholder.
 * Use the `<Icon>` component directly instead.
 */
export function getIconCharacter(name: IconName): string {
  const fallbackMap: Partial<Record<IconName, string>> = {
    'star-filled': '★',
    'star-empty': '☆',
    check: '✓',
    close: '✕',
    'chevron-right': '›',
    'chevron-down': '⌄',
    'chevron-up': '⌃',
    plus: '+',
    minus: '−',
    heart: '♥',
  };
  return fallbackMap[name] ?? '○';
}

export default Icon;
