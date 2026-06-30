# Firebase Production Deployment Checklist
**Task 20.2.1 | Version 1.0**

---

## Overview

This document covers the complete production deployment procedure for all Firebase Cloud Functions, Firestore Security Rules, Storage Rules, and supporting infrastructure. Complete every checkbox before marking a release as production-ready.

---

## 1. Pre-Deployment Prerequisites

- [ ] All Cloud Function unit tests pass (`yarn test:functions`)
- [ ] All Firebase emulator integration tests pass (`yarn test:integration:emulator`)
- [ ] Firestore security rules reviewed by 2 engineers (see SECURITY_REVIEW_CHECKLIST.md)
- [ ] Storage rules reviewed by 2 engineers
- [ ] Firebase project is set to **Blaze (pay-as-you-go)** plan
- [ ] Billing alerts configured: $50, $200, $500 thresholds → email + PagerDuty
- [ ] Secret Manager secrets populated (see §2)
- [ ] Production Firebase project ID confirmed: run `firebase use --list`
- [ ] Local environment points to PROD: `firebase use production`

---

## 2. Secret Manager Verification

Verify all secrets exist in Google Secret Manager for the production project:

```bash
gcloud secrets list --project=<PROD_PROJECT_ID>
```

Required secrets:

| Secret Name | Purpose | Rotation Schedule |
|-------------|---------|------------------|
| `hmac_secret` | CoinLedger HMAC signing key | 90 days |
| `anti_cheat_salt` | Server-side anti-cheat hashing | 180 days |
| `salt_global` | Challenge seed derivation | Never (game-breaking if changed) |
| `salt_daily` | Daily challenge seed derivation | Never (game-breaking if changed) |
| `leaderboard_signing_key` | Score submission HMAC | 90 days |
| `revenue_cat_webhook_secret` | RevenueCat webhook verification | Per RevenueCat rotation |

- [ ] All 6 secrets exist and have at least one active version
- [ ] Secret access is restricted to Cloud Functions service account only
- [ ] No secrets hardcoded in functions source code (`grep -r "SECRET\|PRIVATE_KEY\|PASSWORD" functions/src/`)

---

## 3. Cloud Functions Deployment

### 3.1 Build and Lint

```bash
cd functions
yarn lint          # must exit 0
yarn build         # must exit 0
yarn test          # must exit 0
```

- [ ] Lint passes with 0 errors
- [ ] TypeScript build passes
- [ ] All function unit tests pass

### 3.2 Deploy Functions

```bash
firebase deploy --only functions --project production
```

Expected output: `✔  Deploy complete!`

- [ ] `submitScore` deployed successfully
- [ ] `creditCoins` deployed successfully
- [ ] `getDailyChallenge` deployed successfully
- [ ] `validateAntiCheat` deployed successfully
- [ ] `getLeaderboard` deployed successfully
- [ ] `uploadReplayMeta` deployed successfully
- [ ] `challengeIntelligence` deployed successfully
- [ ] `onUserCreate` trigger deployed successfully

### 3.3 Post-Deploy Function Smoke Tests

For each function, call the Firebase emulator or curl the HTTPS endpoint with a valid test payload:

```bash
# Example: submitScore smoke test
curl -X POST https://us-central1-<PROD_PROJECT>.cloudfunctions.net/submitScore \
  -H "Authorization: Bearer $(firebase auth:token)" \
  -H "Content-Type: application/json" \
  -d '{"challengeNumber":1,"score":1000,"timeTaken":45,"hmac":"<valid_hmac>"}'
```

Expected: HTTP 200 with `{"success": true}`

| Function | Smoke Test Status | Tested By | Date |
|----------|------------------|-----------|------|
| submitScore | | | |
| creditCoins | | | |
| getDailyChallenge | | | |
| validateAntiCheat | | | |
| getLeaderboard | | | |
| uploadReplayMeta | | | |

---

## 4. Firestore Rules Deployment

```bash
firebase deploy --only firestore:rules --project production
```

- [ ] Rules deployed without errors
- [ ] Smoke test: authenticated user CAN read own `/users/{uid}` document
- [ ] Smoke test: authenticated user CANNOT read another user's `/users/{uid}` document
- [ ] Smoke test: unauthenticated request to `/users/{uid}` returns `permission-denied`
- [ ] Smoke test: leaderboard `/leaderboards/global/scores` readable by any authenticated user
- [ ] Smoke test: score document cannot be written directly by client (must go through Cloud Function)

---

## 5. Storage Rules Deployment

```bash
firebase deploy --only storage --project production
```

- [ ] Rules deployed without errors
- [ ] Smoke test: authenticated user CAN upload to `replays/{uid}/` path
- [ ] Smoke test: authenticated user CANNOT upload to `replays/{otherUid}/` path
- [ ] Smoke test: file size limit enforced (reject files > 1 MB for replays)

---

## 6. Firestore Indexes Deployment

```bash
firebase deploy --only firestore:indexes --project production
```

- [ ] All indexes deployed (check Firebase console → Firestore → Indexes)
- [ ] No indexes in "Building" state after 10 minutes
- [ ] Leaderboard composite index (challengeNumber + score DESC) is active
- [ ] Daily challenge index (date + challengeNumber) is active

---

## 7. Remote Config Deployment

- [ ] Set `salt_global` Remote Config parameter to production value (matches Secret Manager)
- [ ] Set `salt_daily` Remote Config parameter to production value
- [ ] Set `base_continue_cost` to 50
- [ ] Set `max_leaderboard_entries` to 100
- [ ] Set `anti_cheat_min_solve_time_seconds` to 5
- [ ] Publish Remote Config with 100% rollout

---

## 8. Post-Deployment Monitoring Setup

- [ ] Firebase Crashlytics dashboard open in a browser tab during and after deploy
- [ ] Firebase Performance dashboard checked: no function cold-start p95 > 2s
- [ ] Cloud Monitoring alert policies enabled for:
  - Function error rate > 1% over 5 minutes
  - Function p95 latency > 3000ms
  - Firestore read rate > 100,000 reads/minute (unexpected spike)
- [ ] PagerDuty integration verified: trigger a test alert and confirm receipt

---

## 9. Rollback Procedure

If any smoke test fails or error rate spikes post-deploy:

```bash
# Roll back functions to previous version
firebase functions:rollback --project production

# Roll back Firestore rules by redeploying previous rules file
git checkout HEAD~1 -- firestore.rules
firebase deploy --only firestore:rules --project production
```

- [ ] Previous function version tags are stored in git (tag format: `functions/v{N}`)
- [ ] Previous rules file is accessible in git history
- [ ] Rollback can complete within 15 minutes of decision

---

## 10. Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Engineer (deployer) | | | |
| Engineer (reviewer) | | | |
| Engineering Lead | | | |
