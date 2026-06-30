# iOS App Store Submission Checklist
**Task 20.3.1 | Version 1.0**

---

## Overview

Complete every section before submitting a build to App Store Connect. Items marked P0 are blockers — the submission must not proceed until they are resolved.

---

## 1. Build Prerequisites

| # | Check | Priority | Status | Notes |
|---|-------|----------|--------|-------|
| 1.1 | Xcode version matches `ios/.xcode-version` file | P0 | ☐ | |
| 1.2 | `yarn install` and `pod install` complete with no errors | P0 | ☐ | |
| 1.3 | Production build succeeds: `xcodebuild -scheme WaterRingPuzzleGame -configuration Release archive` | P0 | ☐ | |
| 1.4 | Archive passes all code signing checks | P0 | ☐ | |
| 1.5 | Bundle ID is `com.waterringgame.app` (matches App Store Connect) | P0 | ☐ | |
| 1.6 | Version number (`CFBundleShortVersionString`) incremented from previous release | P0 | ☐ | |
| 1.7 | Build number (`CFBundleVersion`) incremented from previous build | P0 | ☐ | |
| 1.8 | No debug flags enabled (`__DEV__` build guard, no test crash button) | P0 | ☐ | |
| 1.9 | `ENABLE_BITCODE = NO` (required for React Native) | P1 | ☐ | |

---

## 2. Privacy and Legal

| # | Check | Priority | Status | Notes |
|---|-------|----------|--------|-------|
| 2.1 | Privacy Policy URL is live: https://waterringgame.com/privacy | P0 | ☐ | |
| 2.2 | Privacy Policy covers all data types collected (analytics, purchase, device) | P0 | ☐ | |
| 2.3 | App Store Connect — Privacy Nutrition Label is filled in accurately | P0 | ☐ | |
| 2.4 | "Data Linked to You" section includes: Purchases, Identifiers, Usage Data | P0 | ☐ | |
| 2.5 | "Data Not Linked to You" section (analytics if applicable) | P1 | ☐ | |
| 2.6 | No private API usage (pass static analysis) | P0 | ☐ | |
| 2.7 | IDFA usage declared if used (we do not use IDFA — confirm) | P0 | ☐ | |
| 2.8 | ATT prompt added if tracking is performed (confirm: we do not track across apps) | P0 | ☐ | |
| 2.9 | Age rating set to 4+ in App Store Connect | P0 | ☐ | |
| 2.10 | Age rating questionnaire completed (no violence, no adult content) | P0 | ☐ | |

---

## 3. App Store Connect Metadata

| # | Check | Priority | Status |
|---|-------|----------|--------|
| 3.1 | App name: "Water Ring" (matches `metadata/en-US/name.txt`) | P0 | ☐ |
| 3.2 | Subtitle: "Drop the Ring. Beat the Puzzle." | P0 | ☐ |
| 3.3 | Description filled in (see `metadata/en-US/description.txt`) | P0 | ☐ |
| 3.4 | Keywords filled in (10 comma-separated, `metadata/en-US/keywords.txt`) | P0 | ☐ |
| 3.5 | Promotional text filled in | P1 | ☐ |
| 3.6 | Support URL: https://waterringgame.com/support | P0 | ☐ |
| 3.7 | Primary category: Games → Puzzle | P0 | ☐ |
| 3.8 | Secondary category: Games → Casual | P1 | ☐ |
| 3.9 | All 7 locales have name and description filled in | P1 | ☐ |
| 3.10 | "What's New" text written for this version | P1 | ☐ |

---

## 4. Screenshots and Preview

| # | Check | Device | Status |
|---|-------|--------|--------|
| 4.1 | 6.7" screenshots (iPhone 15 Pro Max) — minimum 3, max 10 | Required | ☐ |
| 4.2 | 6.5" screenshots (iPhone 14 Plus) | Required | ☐ |
| 4.3 | 5.5" screenshots (iPhone 8 Plus) | Required | ☐ |
| 4.4 | 12.9" iPad screenshots | Required for iPad support | ☐ |
| 4.5 | App preview video (30s max, 6.7") | Strongly recommended | ☐ |
| 4.6 | Screenshots show gameplay (not just loading screen) | Required | ☐ |
| 4.7 | No device frames in screenshots (per Apple guidelines) | P0 | ☐ |
| 4.8 | No promotional pricing or sale callouts in screenshots | P0 | ☐ |

---

## 5. In-App Purchases

| # | Check | Priority | Status |
|---|-------|----------|--------|
| 5.1 | All IAP products created in App Store Connect | P0 | ☐ |
| 5.2 | IAP products reviewed and approved before submission | P0 | ☐ |
| 5.3 | Subscription terms clearly displayed if using subscriptions | P0 | N/A |
| 5.4 | Restore purchases button present and functional | P0 | ☐ |
| 5.5 | IAP sandbox tested on physical device with sandbox account | P0 | ☐ |
| 5.6 | IAP receipt validation works server-side | P0 | ☐ |
| 5.7 | Coins are credited correctly after sandbox purchase | P0 | ☐ |

---

## 6. Technical Validation

| # | Check | Priority | Status |
|---|-------|----------|--------|
| 6.1 | All P0 manual QA tests pass (see QA_TEST_PLAN.md) | P0 | ☐ |
| 6.2 | Instruments: no memory leaks in 10-minute gameplay session | P1 | ☐ |
| 6.3 | App does not crash on iPhone SE (smallest supported device) | P0 | ☐ |
| 6.4 | App does not exceed 150 MB app size limit for cellular download | P1 | ☐ |
| 6.5 | Push notification entitlement configured | P0 | ☐ |
| 6.6 | Deep links (universal links) tested with `apple-app-site-association` at waterringgame.com | P0 | ☐ |
| 6.7 | Associated domains entitlement set: `applinks:waterringgame.com` | P0 | ☐ |
| 6.8 | Firebase GoogleService-Info.plist is for PRODUCTION project (not dev/staging) | P0 | ☐ |
| 6.9 | No `.env` or secret files bundled in the app | P0 | ☐ |
| 6.10 | Fastlane Match certificates up to date | P0 | ☐ |

---

## 7. App Review Notes

Prepare the following for the App Review submission form:

```
Demo account (if applicable):
  Email: review@waterringgame.com
  Password: [generated per-submission, stored in 1Password]

Notes for reviewer:
  - Challenge generation is fully offline; no network required to play.
  - In-app purchases are consumable coins only. No subscriptions.
  - "Water" buttons control physical water simulation, not real water.
  - The app uses Firebase for leaderboards and progress sync.
  - VoiceOver: all interactive elements have accessibility labels.
```

---

## 8. Final Submission

- [ ] Build uploaded via Xcode Organizer or `fastlane deliver`
- [ ] "Submit for Review" clicked in App Store Connect
- [ ] Submission confirmation email received
- [ ] ETA logged: typical Apple review time 24–48h

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Engineer | | | |
| QA Lead | | | |
| Product Manager | | | |
