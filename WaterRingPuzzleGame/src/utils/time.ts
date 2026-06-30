/**
 * Time formatting and conversion utilities.
 * Used across the game for display of timers, durations, and performance metrics.
 */

/**
 * Format a duration in seconds as a "M:SS" clock string.
 * Examples: 0 → "0:00", 83 → "1:23", 3600 → "60:00"
 */
export function formatSeconds(seconds: number): string {
  const totalSeconds = Math.floor(Math.abs(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const paddedSecs = secs < 10 ? `0${secs}` : `${secs}`;
  return `${minutes}:${paddedSecs}`;
}

/**
 * Format a duration in milliseconds as a locale-formatted string with "ms" suffix.
 * Examples: 0 → "0ms", 1234 → "1,234ms", 500 → "500ms"
 */
export function formatMs(ms: number): string {
  const rounded = Math.round(Math.abs(ms));
  return `${rounded.toLocaleString('en-US')}ms`;
}

/**
 * Convert milliseconds to seconds.
 * Example: 1500 → 1.5
 */
export function msToSeconds(ms: number): number {
  return ms / 1000;
}

/**
 * Convert seconds to milliseconds.
 * Example: 1.5 → 1500
 */
export function secondsToMs(seconds: number): number {
  return seconds * 1000;
}
