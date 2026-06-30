/**
 * AnalyticsService — stub
 *
 * Passive Firebase Analytics wrapper. Subscribes to game events and
 * forwards them to the Firebase Analytics SDK.
 * Full implementation: see Requirement 3.4 and design.md §Analytics.
 *
 * This stub exports a class with the full public interface so that the
 * DI context in Providers.tsx can be properly typed.
 */

export class AnalyticsService {
  logEvent(_name: string, _params?: Record<string, unknown>): void { /* stub */ }
  setUserId(_userId: string): void { /* stub */ }
  setUserProperty(_name: string, _value: string): void { /* stub */ }
}
