# Analytics Validation Checklist — Firebase DebugView
**Task 20.2.3 | Version 1.0**

---

## Overview

This checklist validates that all analytics events fire correctly before production launch. Use Firebase Analytics DebugView (or `adb shell setprop debug.firebase.analytics.app`) to observe events in real time.

### DebugView Setup

**iOS:**
```bash
# In Xcode scheme arguments:
-FIRAnalyticsDebugEnabled
# OR via terminal:
xcrun simctl spawn booted defaults write com.waterringgame.app FirebaseAnalyticsDebugEnabled -bool YES
```

**Android:**
```bash
adb shell setprop debug.firebase.analytics.app com.waterringgame.app
# To disable:
adb shell setprop debug.firebase.analytics.app .none.
```

Open Firebase Console → Analytics → DebugView to see events arrive in real time.

---

## Event Validation Matrix

### Group 1: Session and App Lifecycle

| # | Event Name | Trigger | Required Parameters | DebugView Seen? | Notes |
|---|-----------|---------|---------------------|----------------|-------|
| 1.1 | `app_open` | App foreground (automatic) | `(none — Firebase auto)` | ☐ | Firebase auto-event |
| 1.2 | `session_start` | New session (automatic) | `(none — Firebase auto)` | ☐ | Firebase auto-event |
| 1.3 | `first_open` | First launch after install | `(none — Firebase auto)` | ☐ | Firebase auto-event |
| 1.4 | `onboarding_complete` | User completes challenge 1 | `user_id` | ☐ | Custom event |
| 1.5 | `screen_view` | Every screen navigation | `screen_name`, `screen_class` | ☐ | Firebase auto or manual |

---

### Group 2: Challenge Events

| # | Event Name | Trigger | Required Parameters | DebugView Seen? | Notes |
|---|-----------|---------|---------------------|----------------|-------|
| 2.1 | `challenge_started` | `loadChallenge()` called | `challenge_number`, `difficulty_score` | ☐ | |
| 2.2 | `challenge_won` | `recordWin()` called | `challenge_number`, `time_taken_seconds`, `continues_used`, `stars` | ☐ | |
| 2.3 | `challenge_lost` | `recordLoss()` called | `challenge_number`, `time_taken_seconds` | ☐ | |
| 2.4 | `challenge_quit` | User quits from pause menu | `challenge_number`, `time_taken_seconds` | ☐ | |
| 2.5 | `continue_used` | `useContinue()` called | `challenge_number`, `continue_number`, `coins_spent` | ☐ | |
| 2.6 | `daily_challenge_started` | Daily challenge begins | `date`, `challenge_number` | ☐ | |
| 2.7 | `daily_challenge_completed` | Daily challenge won | `date`, `challenge_number`, `rank` | ☐ | |

---

### Group 3: Economy Events

| # | Event Name | Trigger | Required Parameters | DebugView Seen? | Notes |
|---|-----------|---------|---------------------|----------------|-------|
| 3.1 | `purchase` (Firebase standard) | IAP completed | `currency`, `value`, `items` array | ☐ | Use Firebase standard event |
| 3.2 | `coins_earned` | Any coin credit | `amount`, `source` (win/ad/iap/achievement) | ☐ | |
| 3.3 | `coins_spent` | Any coin debit | `amount`, `reason` (continue/cosmetic) | ☐ | |
| 3.4 | `store_opened` | Store screen appears | `(none)` | ☐ | |
| 3.5 | `product_tapped` | User taps IAP product | `product_id`, `price` | ☐ | |
| 3.6 | `purchase_cancelled` | User cancels IAP flow | `product_id` | ☐ | |
| 3.7 | `ad_watched` | Rewarded ad completes | `ad_type`, `reward_amount` | ☐ | |
| 3.8 | `ad_skipped` | User skips rewarded ad | `ad_type` | ☐ | |
| 3.9 | `free_continue_used` | Daily free continue granted | `challenge_number` | ☐ | |

---

### Group 4: Progression Events

| # | Event Name | Trigger | Required Parameters | DebugView Seen? | Notes |
|---|-----------|---------|---------------------|----------------|-------|
| 4.1 | `level_up` | Player levels up | `new_level`, `xp_total` | ☐ | |
| 4.2 | `xp_earned` | XP credited | `amount`, `challenge_number`, `stars` | ☐ | |
| 4.3 | `achievement_unlocked` | Achievement engine fires | `achievement_id`, `achievement_name` | ☐ | |
| 4.4 | `prestige_activated` | User prestiges | `prestige_level`, `previous_level` | ☐ | |
| 4.5 | `cosmetic_equipped` | User equips cosmetic | `cosmetic_id`, `category` | ☐ | |
| 4.6 | `collection_item_unlocked` | New collection item | `item_id`, `item_type` | ☐ | |

---

### Group 5: Social and Leaderboard Events

| # | Event Name | Trigger | Required Parameters | DebugView Seen? | Notes |
|---|-----------|---------|---------------------|----------------|-------|
| 5.1 | `leaderboard_viewed` | Leaderboard screen opens | `board_type` (global/friends/challenge) | ☐ | |
| 5.2 | `score_shared` | User shares challenge result | `challenge_number`, `score`, `platform` | ☐ | |
| 5.3 | `deep_link_received` | App opened via challenge link | `challenge_number` | ☐ | |
| 5.4 | `friend_challenge_accepted` | Deep link to friend challenge | `challenge_number`, `friend_id` | ☐ | |

---

### Group 6: Settings and Engagement Events

| # | Event Name | Trigger | Required Parameters | DebugView Seen? | Notes |
|---|-----------|---------|---------------------|----------------|-------|
| 6.1 | `settings_changed` | Any setting toggled | `setting_key`, `new_value` | ☐ | |
| 6.2 | `push_permission_granted` | User grants push notifications | `(none)` | ☐ | |
| 6.3 | `push_permission_denied` | User denies push notifications | `(none)` | ☐ | |
| 6.4 | `replay_viewed` | User watches a replay | `challenge_number`, `replay_id` | ☐ | |
| 6.5 | `haptic_toggled` | Haptic setting changed | `enabled: true/false` | ☐ | |

---

### Group 7: Error and Anti-Cheat Events

| # | Event Name | Trigger | Required Parameters | DebugView Seen? | Notes |
|---|-----------|---------|---------------------|----------------|-------|
| 7.1 | `anti_cheat_rejected` | Server rejects score | `challenge_number`, `rejection_reason` | ☐ | |
| 7.2 | `sync_failed` | SyncManager hits MAX_RETRY | `operation_type`, `error_code` | ☐ | |
| 7.3 | `offline_queue_flushed` | Queued ops sent on reconnect | `queue_length` | ☐ | |

---

## Crashlytics Validation

| # | Check | Status | Notes |
|---|-------|--------|-------|
| C-01 | Crashlytics initializes on app start (no crash in logs) | ☐ | |
| C-02 | Test crash button in Debug settings triggers a crash visible in Crashlytics | ☐ | Must be removed/gated before release |
| C-03 | Non-fatal errors (caught exceptions) appear in Crashlytics "Non-fatals" tab | ☐ | |
| C-04 | User ID is set in Crashlytics after login | ☐ | |
| C-05 | Custom keys (challenge_number, level) appear in crash reports | ☐ | |
| C-06 | Crashlytics opt-out respects `analytics_enabled: false` setting | ☐ | |

---

## User Properties Validation

Verify these user properties are set in Firebase Analytics:

| Property | Set When | Expected Values |
|----------|----------|----------------|
| `player_level` | Level up | 1–100 |
| `prestige_level` | Prestige | 0–10 |
| `total_challenges_completed` | Win | 0–N |
| `highest_challenge_reached` | Win | 1–10000 |
| `iap_spender` | First IAP | `true` / `false` |

---

## Sign-off

| Role | Name | Date |
|------|------|------|
| Analytics Engineer | | |
| Product Manager | | |
