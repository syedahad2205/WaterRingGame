# Firestore Security Rules Review Checklist
**Task 20.2.2 | Version 1.0 | 2-Engineer Sign-off Required**

---

## Overview

All Firestore and Storage security rules changes must be reviewed and signed off by two engineers before production deployment. This checklist must be completed in full. No partial sign-offs are accepted.

---

## How to Use

1. Reviewer 1 completes all sections independently, then signs Section 7.
2. Reviewer 2 completes all sections independently, then signs Section 7.
3. Both signatures are required before `firebase deploy --only firestore:rules` is run in production.
4. This completed checklist is committed to the repository alongside the rules change.

---

## 1. User Document Rules (`/users/{userId}`)

| # | Check | R1 | R2 |
|---|-------|----|----|
| 1.1 | `read` is allowed only when `request.auth.uid == userId` | ☐ | ☐ |
| 1.2 | `write` (create/update) is allowed only when `request.auth.uid == userId` | ☐ | ☐ |
| 1.3 | `delete` is disallowed for clients (server-only via Admin SDK) | ☐ | ☐ |
| 1.4 | `coinBalance` field cannot be written by clients (server-only field) | ☐ | ☐ |
| 1.5 | `createdAt` field is immutable after creation | ☐ | ☐ |
| 1.6 | `userId` field matches `request.auth.uid` on create | ☐ | ☐ |
| 1.7 | No other user can read any field of another user's document | ☐ | ☐ |
| 1.8 | Unauthenticated requests are denied entirely | ☐ | ☐ |

---

## 2. Leaderboard Rules (`/leaderboards/{boardId}/scores/{scoreId}`)

| # | Check | R1 | R2 |
|---|-------|----|----|
| 2.1 | `read` (list) is allowed for any authenticated user | ☐ | ☐ |
| 2.2 | `write` (create/update/delete) is disallowed for all clients | ☐ | ☐ |
| 2.3 | Only Cloud Functions (Admin SDK) can write score documents | ☐ | ☐ |
| 2.4 | `userId` on score document cannot be spoofed by client | ☐ | ☐ |
| 2.5 | Unauthenticated reads are denied | ☐ | ☐ |

---

## 3. Replay Metadata Rules (`/replays/{userId}/{replayId}`)

| # | Check | R1 | R2 |
|---|-------|----|----|
| 3.1 | `read` allowed only when `request.auth.uid == userId` | ☐ | ☐ |
| 3.2 | `create` allowed only when `request.auth.uid == userId` | ☐ | ☐ |
| 3.3 | `update` allowed only when `request.auth.uid == userId` | ☐ | ☐ |
| 3.4 | `delete` allowed only when `request.auth.uid == userId` | ☐ | ☐ |
| 3.5 | `replayData` field size is validated (< 1 MB) if stored inline | ☐ | ☐ |

---

## 4. Achievements and Progression (`/achievements/{userId}`)

| # | Check | R1 | R2 |
|---|-------|----|----|
| 4.1 | `read` allowed only when `request.auth.uid == userId` | ☐ | ☐ |
| 4.2 | `write` is disallowed for clients (Cloud Function only) | ☐ | ☐ |
| 4.3 | Achievement unlock cannot be reversed by client | ☐ | ☐ |

---

## 5. Daily Challenge Rules (`/dailyChallenges/{date}`)

| # | Check | R1 | R2 |
|---|-------|----|----|
| 5.1 | `read` allowed for any authenticated user | ☐ | ☐ |
| 5.2 | `write` is disallowed for all clients | ☐ | ☐ |
| 5.3 | Only Admin SDK (Cloud Function `getDailyChallenge`) can write | ☐ | ☐ |

---

## 6. General Security Checks

| # | Check | R1 | R2 |
|---|-------|----|----|
| 6.1 | Default deny: rules do not have a wildcard `allow read, write: if true` anywhere | ☐ | ☐ |
| 6.2 | All collection paths are explicitly listed — no unintentional open paths | ☐ | ☐ |
| 6.3 | `request.auth != null` check appears before any field-level check | ☐ | ☐ |
| 6.4 | No rules rely solely on security-through-obscurity (e.g. guessing collection name) | ☐ | ☐ |
| 6.5 | Rules have been validated against the Firestore Rules Playground with both positive and negative test cases | ☐ | ☐ |
| 6.6 | Rules have been tested with the Firebase Emulator (`yarn test:integration:emulator`) | ☐ | ☐ |
| 6.7 | `firestoreRules.test.ts` passes 100% | ☐ | ☐ |
| 6.8 | No field-level validation is bypassed by omitting the field entirely | ☐ | ☐ |
| 6.9 | Timestamp fields use `request.time` not client-supplied values | ☐ | ☐ |
| 6.10 | Storage rules mirror the Firestore rules for the same resource (no inconsistency) | ☐ | ☐ |

---

## 7. Reviewer Sign-off

### Reviewer 1

- [ ] I have independently reviewed all sections above
- [ ] I have run the emulator tests and they pass
- [ ] I have tested at least 3 negative cases (denied requests) in the Rules Playground
- [ ] I found no security issues **OR** all issues found have been resolved (see notes below)

**Name:** ________________________
**Date:** ________________________
**Signature:** ________________________

**Notes:**
```
(any findings or waivers here)
```

---

### Reviewer 2

- [ ] I have independently reviewed all sections above (without seeing Reviewer 1's notes first)
- [ ] I have run the emulator tests and they pass
- [ ] I have tested at least 3 different negative cases from Reviewer 1
- [ ] I found no security issues **OR** all issues found have been resolved (see notes below)

**Name:** ________________________
**Date:** ________________________
**Signature:** ________________________

**Notes:**
```
(any findings or waivers here)
```

---

## 8. Change Log

| Date | Reviewer 1 | Reviewer 2 | Change Summary |
|------|-----------|-----------|----------------|
| | | | Initial rules deployment |

---

## Appendix: Testing Commands

```bash
# Run Firestore rules emulator tests
cd WaterRingPuzzleGame
yarn test:integration:emulator

# Run the specific rules test file
yarn jest __tests__/integration/firestoreRules.test.ts --runInBand

# Open Firebase Rules Playground (manual testing)
# https://console.firebase.google.com/project/<PROJECT_ID>/firestore/rules
```
