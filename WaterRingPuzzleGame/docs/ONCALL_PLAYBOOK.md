# On-Call Rotation Playbook — Water Ring Puzzle Game
**Task 20.3.3 | Version 1.0**

---

## 1. On-Call Overview

The on-call engineer is the first responder for all production incidents affecting Water Ring. The rotation is weekly (Monday 09:00 → next Monday 09:00 in the primary engineer's timezone).

**Escalation path:**
```
PagerDuty alert → On-call engineer (15 min response SLA)
    → Engineering Lead (if unresolved after 30 min)
        → CEO/Founder (if P0 with data loss or complete outage)
```

---

## 2. On-Call Schedule

| Week | Primary On-Call | Secondary (Backup) | Timezone |
|------|-----------------|--------------------|---------|
| Current | (fill in) | (fill in) | |
| Next | | | |

**Tools required:**
- PagerDuty app installed on personal phone with notifications enabled
- Firebase Console access (project: `waterringgame-prod`)
- Google Play Console access
- App Store Connect access
- Slack access (#incidents, #oncall-log channels)
- VPN access to internal tools (if applicable)

---

## 3. Incident Severity Definitions

| Severity | Definition | Response SLA | Resolution SLA |
|----------|-----------|-------------|----------------|
| **P0 — Critical** | App crashes on launch for all users; data loss; all purchases failing; complete Firebase outage | 15 minutes | 2 hours |
| **P1 — High** | Core gameplay broken for > 10% of users; leaderboard down; coin balance incorrect | 30 minutes | 4 hours |
| **P2 — Medium** | Feature partially degraded; analytics not firing; daily challenge not loading | 2 hours | 24 hours |
| **P3 — Low** | Minor visual bug; non-critical analytics event missing; locale text wrong | Next business day | Next sprint |

---

## 4. Incident Response Procedure

### Step 1: Acknowledge (within SLA)
1. Acknowledge the PagerDuty alert
2. Post in #incidents: `🚨 ACK: [brief description] — investigating — @{your_handle}`
3. Open Firebase Console, Crashlytics, and Google Play Console simultaneously

### Step 2: Assess Scope
Run through this checklist within 5 minutes of acknowledgement:

```
□ Is this iOS, Android, or both?
□ Is it affecting all users or a subset (% rollout)?
□ Which version(s) are affected (check Crashlytics version filter)?
□ Is it a Firebase/infrastructure issue or an app issue?
□ Is it a new regression or a known bug resurfacing?
□ Is coin balance or purchase data affected?
```

### Step 3: Contain
- If P0 or P1 with active rollout: **pause the rollout immediately** (see ANDROID_ROLLOUT_PLAN.md §4)
- If IAP is broken: notify App Store / Play Store do NOT process new purchases (can't pause, but document)
- If data corruption suspected: enable Firestore maintenance mode via Admin SDK (last resort)

### Step 4: Communicate
- Every 30 minutes, post a status update in #incidents
- For P0/P1: update the status page at https://status.waterringgame.com

### Step 5: Resolve
- Fix forward (deploy hotfix) OR roll back (redeploy previous build)
- See §5 (Hotfix Procedure) and §6 (Rollback Procedure)

### Step 6: Post-Incident
- File a post-mortem within 48 hours (see §8)
- Update #oncall-log with summary and resolution

---

## 5. Hotfix Procedure

Use for P0/P1 bugs that require a code fix (not solvable by rollback):

```bash
# 1. Create hotfix branch from the release tag
git checkout tags/v{VERSION} -b hotfix/v{VERSION}.{PATCH}

# 2. Apply the fix
# ... edit files ...

# 3. Run tests
yarn test

# 4. Bump version code/name
# iOS: Info.plist CFBundleShortVersionString and CFBundleVersion
# Android: android/app/build.gradle versionCode and versionName

# 5. Build and submit
# iOS: xcodebuild archive → Organizer → upload OR fastlane
fastlane ios release

# Android: AAB → Play Console → staged rollout (bypass to 100% for P0)
fastlane android deploy_staged rollout:1.0

# 6. Tag the hotfix
git tag v{VERSION}.{PATCH}
git push origin v{VERSION}.{PATCH}
```

**Minimum review for hotfix:** 1 engineer review (not self-review). Engineering Lead sign-off for P0.

---

## 6. Rollback Procedure

### iOS Rollback
iOS does not support instant rollback. Options:
1. **Expedited review request:** Submit a new build to Apple requesting expedited review (24h typical). Reference: https://developer.apple.com/contact/app-store/?topic=expedite
2. **Remote Config kill-switch:** Use Firebase Remote Config to disable the broken feature without a new build (requires the feature to be Remote Config gated)
3. **Force update prompt:** Deploy a new build that detects the bad version and shows a mandatory update prompt

### Android Rollback
```
Google Play Console → Release → Production → click "Halt rollout"
→ Create new release using previous AAB
→ Set rollout to 100%
```
Full steps: ANDROID_ROLLOUT_PLAN.md §4.

---

## 7. Runbooks by Incident Type

### 7.1 App Crashes on Launch (Crashlytics: crash-free users drops sharply)

1. Check Crashlytics: filter by latest version, sort by count
2. Identify the top crash signature
3. Check if crash is in native code (stack trace) or JS (RN bridge)
4. **If RN bridge crash:** likely a native module init issue — check Firebase, MMKV init logs
5. **If JS crash:** check recent code changes; look for null-dereference or missing mock in prod
6. Decision: hotfix or rollback? If fix is > 2 hours, rollback.

### 7.2 Purchases Failing (IAP Success Rate < 95%)

1. Check App Store Connect → Sales and Trends for purchase anomalies
2. Check Google Play Console → Android Vitals → Billing issues
3. Check Firebase Functions logs for `creditCoins` errors
4. Check RevenueCat dashboard (if integrated) for error codes
5. **Common causes:** expired App Store credentials, RevenueCat webhook misconfigured, `creditCoins` Cloud Function quota exceeded
6. If Cloud Function is failing: check Secret Manager (`revenue_cat_webhook_secret` valid?), check function logs for rate limit errors

### 7.3 Leaderboard Not Loading

1. Check Firebase Console → Firestore → Monitoring for read latency spike
2. Check `getLeaderboard` Cloud Function logs for errors
3. Check Firestore indexes — is the composite index (challengeNumber + score) still active?
4. Check quota: Firestore free tier limit exceeded? Check billing.
5. **Quick mitigation:** enable server-side caching in `getLeaderboard` (TTL 60s) via Remote Config if not already on

### 7.4 Coin Balance Incorrect / Property 14 Violation

This is a P0 incident. Coin balance going negative violates a core design invariant.

1. Identify the affected user(s) from Crashlytics or support report
2. Check Firestore for their `coinBalance` field
3. Check Cloud Function logs for `creditCoins` and `debitCoins` calls
4. Check CoinLedger HMAC for any validation failures (indicates tampering attempt OR a bug)
5. **Do NOT auto-correct balances** without Engineering Lead approval
6. If this affects > 1% of users: P0, wake Engineering Lead immediately

### 7.5 Firebase Services Outage

1. Check Firebase Status page: https://status.firebase.google.com
2. If Firebase is down: the game continues to work offline (challenge generation is local, MMKV stores progress locally)
3. Communicate on status page: "Leaderboards and sync temporarily unavailable; local gameplay unaffected"
4. When Firebase recovers: confirm SyncManager flushes queued operations (check `syncIdempotency.property.test.ts` invariants hold)

### 7.6 Anti-Cheat False Positives Spike

1. Check `validateAntiCheat` Cloud Function logs for rejection rate
2. Check if a new challenge range was released with unexpectedly short solve times (could trigger `min_solve_time_seconds` gate)
3. Check Remote Config: was `anti_cheat_min_solve_time_seconds` changed recently?
4. **Quick fix:** increase `anti_cheat_min_solve_time_seconds` via Remote Config (no deploy needed)
5. If legitimate cheating detected: do NOT lower the threshold; investigate instead

---

## 8. Post-Incident Report Template

File within 48 hours of incident resolution:

```markdown
## Incident Post-Mortem: [Brief Title]

**Date:** YYYY-MM-DD
**Severity:** P{0-3}
**Duration:** {N} hours {M} minutes
**On-call:** {name}

### Timeline
- HH:MM UTC — PagerDuty alert fired
- HH:MM UTC — On-call acknowledged
- HH:MM UTC — Root cause identified: [description]
- HH:MM UTC — Mitigation applied: [hotfix/rollback/config change]
- HH:MM UTC — Incident resolved

### Root Cause
[1–3 sentence explanation of what went wrong and why]

### Impact
- Users affected: ~{N} (estimated from analytics)
- Purchases affected: {N} (from Play/App Store console)
- Coin balance affected: {N} users (from Firestore query)

### Contributing Factors
- [Factor 1]
- [Factor 2]

### What Went Well
- [Thing 1]

### What Could Be Improved
- [Improvement 1]

### Action Items
| Action | Owner | Due Date |
|--------|-------|----------|
| | | |
```

---

## 9. Key Links and Contacts

| Resource | URL / Contact |
|----------|--------------|
| Firebase Console | https://console.firebase.google.com/project/waterringgame-prod |
| App Store Connect | https://appstoreconnect.apple.com |
| Google Play Console | https://play.google.com/console |
| PagerDuty | https://waterringgame.pagerduty.com |
| Status Page | https://status.waterringgame.com |
| Slack #incidents | #incidents |
| Slack #oncall-log | #oncall-log |
| Engineering Lead | oncall-lead@waterringgame.com |
| Firebase Support | https://firebase.google.com/support |
| Apple Developer Support | https://developer.apple.com/contact/ |
| RevenueCat Support | support@revenuecat.com |

---

## 10. On-Call Handoff Template

Post in #oncall-log at the start of every shift:

```
🔄 ON-CALL HANDOFF
Taking over from: @{prev_oncall}
Week of: YYYY-MM-DD

Open incidents: {none / list P0-P1}
Active rollout: Android v{X.Y.Z} at {N}% — monitoring until YYYY-MM-DD
Recent deploys: [iOS v{X} released YYYY-MM-DD] [Android v{X} released YYYY-MM-DD]
Known issues to watch: {list or "none"}
Reminders: {e.g. "check Firestore billing alert on Tue"}

Reachable via: phone/Slack until [time]; secondary @{backup_oncall} if unreachable
```
