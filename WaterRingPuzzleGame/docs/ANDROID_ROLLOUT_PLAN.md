# Android Staged Rollout Plan
**Task 20.3.2 | Version 1.0**

---

## Overview

All Android releases use Google Play's staged rollout feature to progressively expose new builds to a growing percentage of users. This document defines the rollout schedule, monitoring requirements, and pause criteria for each stage.

---

## 1. Pre-Rollout Requirements

Complete before uploading the AAB to Google Play:

- [ ] Internal testing track passes all P0 QA tests (see QA_TEST_PLAN.md)
- [ ] `aab` built with `./gradlew bundleRelease` — no debug flags
- [ ] Play App Signing enrolled (upload key configured in `keystore.properties`)
- [ ] `google-services.json` is for PRODUCTION Firebase project
- [ ] `versionCode` incremented from previous release
- [ ] `versionName` updated (e.g. `1.2.0`)
- [ ] All IAP product IDs match those configured in Google Play Console
- [ ] Crashlytics NDK symbols uploaded: `./gradlew uploadCrashlyticsMappingFileRelease`
- [ ] Store listing metadata updated (name, description, screenshots for all locales)
- [ ] Content rating questionnaire completed (ESRB: Everyone)
- [ ] Target API level is current requirement (Android 14 / API 34 minimum)
- [ ] Android Vitals baseline captured from previous version

---

## 2. Rollout Stages

### Stage 0: Internal Testing (0% public)
**Duration:** 2 days minimum
**Audience:** Internal team (~20 testers)
**Track:** Internal testing

| Check | Status |
|-------|--------|
| Install and cold start on Android 13 (Pixel 7a) | ☐ |
| Install and cold start on Android 14 (Galaxy S24) | ☐ |
| Core gameplay: win, lose, continue flow | ☐ |
| IAP sandbox purchase completes correctly | ☐ |
| Leaderboard loads | ☐ |
| No crash in first 5 minutes of play | ☐ |
| Firebase DebugView shows events (see ANALYTICS_VALIDATION_CHECKLIST.md) | ☐ |

**Gate to Stage 1:** All internal checks pass, Crashlytics shows 0 crashes.

---

### Stage 1: Closed Testing / 5% Rollout
**Duration:** 24 hours
**Audience:** Closed alpha testers + 5% of production users
**Track:** Production, 5%

**Monitoring metrics (baseline from previous version):**

| Metric | Baseline | Pause Threshold | Current |
|--------|----------|----------------|---------|
| Crash-free users | ≥ 99.0% | < 97.5% | |
| ANR rate | ≤ 0.5% | > 1.0% | |
| 1-day retention | ≥ 35% | < 28% | |
| IAP conversion | baseline ± 20% | < baseline - 30% | |
| P95 challenge load time (ms) | ≤ 800 | > 1500 | |

**Actions if pause threshold hit:** See Section 4 — Pause and Rollback.

**Gate to Stage 2:** All metrics within threshold for 24h, no S1 bugs open.

---

### Stage 2: 20% Rollout
**Duration:** 48 hours
**Track:** Production, 20%

| Metric | Pause Threshold |
|--------|----------------|
| Crash-free users | < 98.0% |
| ANR rate | > 0.8% |
| 1-day retention | < 30% |
| Coin ledger errors (HMAC mismatch) | any occurrence |
| Anti-cheat rejections spike | > 200% of baseline per hour |

**Gate to Stage 3:** All metrics within threshold for 48h.

---

### Stage 3: 50% Rollout
**Duration:** 48 hours
**Track:** Production, 50%

| Metric | Pause Threshold |
|--------|----------------|
| Crash-free users | < 98.5% |
| ANR rate | > 0.5% |
| Revenue per user | < baseline - 20% |
| Leaderboard p95 latency | > 3000ms |
| Sync queue growing unbounded | > 500 pending ops per user |

**Gate to Stage 4:** All metrics within threshold for 48h.

---

### Stage 4: 100% Rollout
**Track:** Production, 100%

After promoting to 100%, monitor for 72 hours before considering the release stable.

**Stable release criteria (must hold for 72h):**
- Crash-free users ≥ 99.0%
- ANR rate ≤ 0.3%
- No S1 bugs open
- Android Vitals "good" rating maintained

---

## 3. Rollout Commands (Google Play Console)

All rollout adjustments are made via Google Play Console → Release → Production → Edit rollout percentage.

For automated rollout via Fastlane:
```bash
# Deploy to 5%
bundle exec fastlane android deploy_staged rollout:0.05

# Increase to 20%
bundle exec fastlane android promote_rollout rollout:0.20

# Promote to full rollout
bundle exec fastlane android promote_rollout rollout:1.0
```

---

## 4. Pause and Rollback Procedure

### When to Pause
Immediately pause the rollout if **any** of the following occur:
- Crash-free users drops below pause threshold for the current stage
- Any S1 bug is filed (crash on launch, purchase failure, data loss)
- Coin balance goes negative for any user (Property 14 violation)
- HMAC validation failures reported (CoinLedger integrity breach)
- Suspicious anti-cheat spike (> 3× baseline rejection rate)

### Pause Steps
1. In Google Play Console: navigate to Release → Production → click "Halt rollout"
2. Post in #incidents Slack channel: `@oncall PAUSED Android rollout v{VERSION} — reason: {REASON}`
3. Assign S1 bug to on-call engineer immediately
4. Do not resume rollout until root cause is confirmed resolved

### Rollback Steps (if pause is insufficient)
1. Identify last stable build version in Play Console
2. Create a new release using the last stable AAB (do NOT upload a new build)
3. Set rollout to 100% for the rollback build immediately (emergency bypass stages)
4. Confirm crash rate recovers within 1 hour
5. File retrospective issue for root cause analysis

---

## 5. Post-Rollout Monitoring (72h window)

After reaching 100%, the on-call engineer monitors:

| Time | Action |
|------|--------|
| T+1h | Check Crashlytics for any new crash signatures |
| T+4h | Review Android Vitals in Play Console |
| T+24h | Review retention metrics in Firebase Analytics |
| T+48h | Review revenue metrics vs previous version |
| T+72h | Declare release stable, update on-call handoff notes |

---

## 6. Rollout Log

| Stage | Date | % | Engineer | Status | Notes |
|-------|------|---|----------|--------|-------|
| Internal | | — | | | |
| 5% | | 5% | | | |
| 20% | | 20% | | | |
| 50% | | 50% | | | |
| 100% | | 100% | | | |

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Release Engineer | | | |
| QA Lead | | | |
| Engineering Lead | | | |
