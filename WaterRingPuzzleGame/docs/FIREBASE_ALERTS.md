# Firebase Alerts Setup and On-Call Escalation

## Alert Thresholds

| Alert ID | Condition | Severity | Escalation |
|----------|-----------|----------|------------|
| ALERT-1 | Crash rate > 0.5% (rolling 1h) | P1 — Immediate | Page on-call engineer; consider rollback |
| ALERT-2 | ANR rate > 0.2% (rolling 1h) | P1 — Immediate | Page on-call engineer; investigate hang |
| ALERT-3 | API error rate > 2% (rolling 15m) | P2 — Urgent | Notify on-call within 15 minutes |
| ALERT-4 | D1 retention drop > 5 percentage points | P2 — Urgent | Notify product + engineering lead within 1 hour |
| ALERT-5 | Economy sink:earn ratio < 0.15 (24h window) | P3 — Monitor | Slack notification; review next business day |
| ALERT-6 | Leaderboard submission rejection rate > 10% | P2 — Urgent | Investigate anti-cheat rules + Cloud Function errors |
| ALERT-7 | Daily challenge generation failure | P1 — Immediate | Page on-call; manually trigger generation via Cloud Function |

## Firebase Console Setup

1. Navigate to **Firebase Console → Project → Crashlytics → Alerts**
2. Configure ALERT-1 and ALERT-2 under Crashlytics crash rate conditions
3. Navigate to **Firebase Console → Project → Analytics → BigQuery → Scheduled Queries** for ALERT-4
4. Configure ALERT-3, ALERT-5, ALERT-6, ALERT-7 via Cloud Monitoring alerting policies

## On-Call Rotation

- Minimum 1 engineer on-call per 24-hour period for the first 7 days post-launch
- On-call schedule managed via PagerDuty / Slack rotation
- Escalation chain: L1 On-call → Engineering Lead → CTO

## Incident Response Playbook

### P1: Crash spike
1. Check Crashlytics for the crashing stack trace
2. If reproducible: immediately pause Android staged rollout (Play Console → Production → Manage rollout → Halt)
3. If iOS: submit emergency patch to App Store review using Expedited Review
4. Root cause analysis within 4 hours

### P1: Daily challenge generation failure
1. Manually trigger: `firebase functions:call scheduledDailyChallenge --data '{"date":"YYYY-MM-DD"}'`
2. Monitor Firestore `/dailyChallenges/{date}` for successful write
3. Investigate Cloud Function logs for root cause

### P2: Leaderboard rejections spiking
1. Check anti-cheat Cloud Function logs for rejection reasons
2. If false positives: temporarily raise thresholds via Remote Config
3. Root cause analysis + patch within 24 hours
