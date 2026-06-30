# QA Test Plan — Water Ring Puzzle Game
**Task 19.4.1 | Version 1.0 | Status: DRAFT**

---

## 1. Overview

This document defines the manual QA test plan for the Water Ring Puzzle Game across 5 physical devices. All tests must pass before any release candidate is promoted to production.

**Sign-off required from:** QA Lead + Engineering Lead

---

## 2. Test Devices

| # | Device | OS | Form Factor | Priority |
|---|--------|----|-------------|----------|
| D1 | iPhone 15 Pro | iOS 17.x | 6.1" OLED | P0 — Primary iOS |
| D2 | iPhone SE (3rd gen) | iOS 16.x | 4.7" LCD | P0 — Small screen regression |
| D3 | Samsung Galaxy S24 | Android 14 | 6.2" AMOLED | P0 — Primary Android |
| D4 | Google Pixel 7a | Android 13 | 6.1" OLED | P1 — Stock Android |
| D5 | iPad Air (5th gen) | iPadOS 17.x | 10.9" LCD | P1 — Tablet layout |

---

## 3. Test Suites

### Suite A: Core Gameplay

| ID | Test Case | Steps | Expected | Devices |
|----|-----------|-------|----------|---------|
| A-01 | Cold start to first challenge | Launch app → tap Start | Splash → Home → Challenge loads within 3s | D1–D5 |
| A-02 | Challenge 1 completable | Load challenge 1, win by placing all rings | Victory modal appears, coins awarded | D1–D5 |
| A-03 | Timer counts down | Begin challenge, observe timer | Timer decreases each second, no skips | D1–D5 |
| A-04 | Timer expiry → loss | Start challenge, wait for timer to hit 0 | Defeat modal appears automatically | D1–D5 |
| A-05 | Left button tap fires force | Tap left button rapidly | Ring moves left/upward, force visible | D1, D3 |
| A-06 | Right button tap fires force | Tap right button rapidly | Ring moves right/upward | D1, D3 |
| A-07 | Simultaneous press turbulence | Hold both buttons simultaneously | Turbulence wave visible in water | D1, D3 |
| A-08 | Ring lands on correct peg | Guide ring over target peg | Ring settles, peg highlights, win check | D1–D5 |
| A-09 | Ring bounce off obstacle | Challenge with obstacles present (N>50) | Ring rebounds physically from obstacle | D1, D3 |
| A-10 | Multiple rings no overlap | Generate high-difficulty challenge | Rings spawn with no visual overlap | D1–D5 |

### Suite B: Continue and Economy

| ID | Test Case | Steps | Expected | Devices |
|----|-----------|-------|----------|---------|
| B-01 | Continue prompt appears | Lose a challenge with coins available | Defeat modal shows Continue button + cost | D1, D3 |
| B-02 | Continue deducts coins | Tap Continue, confirm | Coin balance decreases by correct amount | D1, D3 |
| B-03 | Continue restores timer | After continue, observe timer | Timer resets to bonus time (30–60s) | D1, D3 |
| B-04 | Continue cost escalates | Use 2 continues in same challenge | 2nd continue costs more than 1st | D1 |
| B-05 | No coins — continue disabled | Drain coin balance, lose challenge | Continue button disabled / coins CTA shown | D1, D3 |
| B-06 | Daily free continue | First loss of the day | "Free Continue" option shown | D1 |
| B-07 | Ad continue | Tap "Watch Ad for Continue" | Ad plays, continue granted after completion | D1, D3 |
| B-08 | IAP coin purchase | Store → select bundle → Apple/Google Pay | Purchase completes, coins credited | D1, D3 |
| B-09 | Coin balance persists across restart | Earn coins, force quit, relaunch | Coin balance matches pre-quit value | D1–D5 |

### Suite C: Progression

| ID | Test Case | Steps | Expected | Devices |
|----|-----------|-------|----------|---------|
| C-01 | XP awarded on win | Win a challenge | XP bar animates, correct amount shown | D1, D3 |
| C-02 | Level up notification | Reach XP threshold for level up | Level-up animation plays, new level shown | D1 |
| C-03 | Achievement unlock | Complete required condition | Achievement banner slides in from top | D1, D3 |
| C-04 | Prestige available at max level | Reach level cap | Prestige button unlocked in Profile | D1 |
| C-05 | Collection item unlocked | Earn unlock at milestone | New item visible in Collection screen | D1, D3 |
| C-06 | Mastery star rating | Win with 3 stars | 3-star display on challenge card | D1 |
| C-07 | Challenge progress saves mid-run | Begin challenge, background app, resume | State fully restored, timer continued | D1–D5 |

### Suite D: Navigation and UI

| ID | Test Case | Steps | Expected | Devices |
|----|-----------|-------|----------|---------|
| D-01 | Bottom nav: all 4 tabs | Tap each tab | Correct screen loads, no crash | D1–D5 |
| D-02 | Pause overlay | Tap pause during challenge | Frosted overlay appears, game pauses | D1–D5 |
| D-03 | Resume from pause | Tap Resume in pause overlay | Game resumes, timer continues | D1–D5 |
| D-04 | Quit from pause | Tap Quit in pause overlay | Returns to Home, challenge discarded | D1–D5 |
| D-05 | Leaderboard loads | Navigate to Leaderboard tab | Entries load within 5s, sorted by score | D1, D3 |
| D-06 | Settings screen | Open Settings from Profile | All toggles functional, changes persist | D1–D5 |
| D-07 | Deep link to challenge | Open `waterring://challenge/42` | Challenge 42 loads directly | D1, D3 |
| D-08 | Share challenge | Tap Share in Victory modal | Share sheet opens with correct URL | D1, D3 |
| D-09 | Inventory / cosmetic equip | Equip a ring skin | Skin applied in next challenge | D1 |
| D-10 | Tablet layout (iPad) | All screens on D5 | Layout fills screen, no overflow | D5 |

### Suite E: Network and Offline

| ID | Test Case | Steps | Expected | Devices |
|----|-----------|-------|----------|---------|
| E-01 | Offline challenge generation | Disable network, start challenge | Challenge generates normally | D1–D5 |
| E-02 | Score submission queued offline | Win challenge offline | Score queued; submits when reconnected | D1, D3 |
| E-03 | Sync on reconnect | Re-enable network after offline win | Queued score posts to leaderboard | D1, D3 |
| E-04 | Firestore rules block unauthorized read | Attempt cross-user data read (dev) | Request rejected with permission-denied | N/A — backend |
| E-05 | Remote config fallback | Kill Remote Config, launch app | App uses hardcoded defaults, no crash | D1 |

### Suite F: Regression

| ID | Test Case | Regression For | Devices |
|----|-----------|---------------|---------|
| F-01 | No ANR on challenge load | Physics init blocking main thread | D3, D4 |
| F-02 | Memory under 350 MB during gameplay | Texture atlas leak | D2 |
| F-03 | Audio resumes after call interruption | AudioSession iOS handling | D1 |
| F-04 | No duplicate coin credit on double-tap | EconomyService idempotency | D1, D3 |
| F-05 | Replay playback matches original | ReplayCompressor round-trip | D1 |

---

## 4. Pass/Fail Criteria

- **P0 tests** (A-01 to A-10, B-01 to B-05): 100% pass required before RC.
- **P1 tests** (Suites C, D, E): 95% pass required; known issues documented.
- **Regression suite F**: 100% pass required.

---

## 5. Bug Severity Definitions

| Severity | Definition | SLA |
|----------|-----------|-----|
| S1 — Blocker | App crash, data loss, purchase failure | Fix within 24h, block release |
| S2 — Critical | Core gameplay broken, wrong coin balance | Fix within 48h |
| S3 — Major | Feature not working as documented | Fix before next RC |
| S4 — Minor | Visual glitch, text truncation | Fix in next sprint |

---

## 6. Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Lead | | | |
| Engineering Lead | | | |
| Product Manager | | | |
