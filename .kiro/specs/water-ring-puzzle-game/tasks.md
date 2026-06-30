# Implementation Plan: Water Ring Puzzle Game
## Complete Production Engineering Backlog — v1.0

**Roadmap:** Water Ring Puzzle Game — Global Top 100 Launch
**Workflow:** Design-First
**Total Epics:** 20
**Estimated Duration:** 24 Weeks (10 Milestones)
**Team Size:** ~20 Engineers

---

## Overview

This backlog is organized as:
`Roadmap → Release → Epic → Feature → User Story → Engineering Task → Subtask`

Every engineering task includes: Task ID, Priority, Estimated Story Points + Hours, Owner Role, Definition of Done, Required Tests, Required Documentation, and Review Checklist. All test subtasks are marked optional (`*`). Documentation subtasks are marked optional (`*`).

**Priority Legend:** P0 = Critical (blocks launch), P1 = High (core experience), P2 = Medium (quality/polish), P3 = Low (nice-to-have)
**Story Points:** Fibonacci scale (1, 2, 3, 5, 8, 13, 21)
**Labels:** frontend, backend, physics, firebase, rendering, analytics, economy, uiux, audio, animation, qa, performance, testing, documentation, devops, security, accessibility, liveops

---

## Tasks

All tasks are organized by Epic below. See the `## Notes` section at the end for conventions.

## Release 1.0: Launch


---

# Epic 1: Foundation

**Objectives:** Establish the project scaffold, tooling, CI/CD pipeline, and development environment so all engineers can work in a consistent, high-quality baseline from day one.
**Business Value:** Zero-cost debt prevention. Proper foundation avoids architecture rework that typically costs 2–3x the original investment at week 12+.
**Dependencies:** None — this is the first epic.
**Technical Risks:** React Native version compatibility with Skia, Reanimated 3, and Matter.js; CI pipeline configuration for both iOS and Android; Firebase project access provisioning.
**Success Criteria:** All CI checks pass on the empty project shell; Firebase emulator tests run; branch protection is active; every engineer can build and run the app on a simulator within 30 minutes of cloning.
**Estimated Duration:** Weeks 1–4 (Milestone 1)
**Required Roles:** DevOps Engineer (lead), Senior React Native Engineer, Backend Engineer
**Definition of Done:** All CI checks green on `main`; README documents setup in < 5 steps; zero TypeScript errors; ESLint zero errors; Jest runs and passes; Firebase emulator connected.

---

## Feature 1.1: React Native Project Scaffolding

**Purpose:** Initialize the React Native project with TypeScript strict mode, feature-based folder structure, and all root-level config files.
**Architecture:** React Native CLI (not Expo) for maximum native module control; TypeScript strict mode; absolute imports via `tsconfig paths`.
**Dependencies:** Node.js 18, React Native 0.73+, TypeScript 5.x
**Acceptance Criteria:** Project builds on iOS Simulator and Android Emulator; `tsc --noEmit` exits 0; folder structure matches design.md spec exactly.
**Edge Cases:** Windows dev machines require WSL2 for Android builds; M-series Macs need Rosetta for certain native modules.
**Performance Considerations:** Metro bundler config must exclude `__tests__/` from production bundle.
**Accessibility Considerations:** N/A (scaffold only)
**Testing Requirements:** Build passes on both platforms; folder structure validated by a CI lint script.

- [x] 1.1.1 Initialize React Native project with TypeScript
  - Run `npx react-native init WaterRingPuzzleGame --template react-native-template-typescript`
  - Enable `"strict": true` in `tsconfig.json`
  - Configure absolute imports via `tsconfig.json` paths and `babel-plugin-module-resolver`
  - _Requirements: 51.3, 6.1_

  - [ ]* 1.1.1a Write CI script to validate folder structure matches spec
    - Script reads `src/` directory tree and asserts required directories exist
    - _Requirements: 6.1, 6.2_

- [x] 1.1.2 Create complete feature-based folder structure
  - Create all directories: `src/app/`, `src/screens/`, `src/features/game/core/`, `src/features/game/physics/`, `src/features/game/rendering/`, `src/features/game/generation/`, `src/features/game/adaptive/`, `src/features/audio/`, `src/features/progression/`, `src/features/economy/`, `src/features/social/`, `src/features/replay/`
  - Create `src/store/slices/`, `src/services/firebase/`, `src/services/sync/`, `src/hooks/`, `src/utils/`, `src/constants/`, `src/types/`, `src/assets/`
  - Create all placeholder `.ts` files for every module listed in Requirements 7 and 8
  - _Requirements: 6.2, 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

  - [ ]* 1.1.2a Write unit test asserting all 55+ required files exist
    - _Requirements: 6.1_

- [x] 1.1.3 Create `src/app/App.tsx`, `Navigation.tsx`, and `Providers.tsx` stubs
  - `App.tsx` renders `<Providers><Navigation /></Providers>`
  - `Navigation.tsx` defines all 18 screen routes using React Navigation 6 Stack + Tab navigators
  - `Providers.tsx` wraps with QueryClientProvider, Redux/Zustand, and SafeAreaProvider
  - _Requirements: 6.5, 6.6_

  - [x]* 1.1.3a Write unit test for Navigation route definitions
    - Assert all 18 screen names are registered
    - _Requirements: 6.7_


## Feature 1.2: ESLint, Prettier, and Code Quality Tooling

**Purpose:** Enforce code quality, naming conventions, dependency direction rules, and style consistency from commit 1.
**Architecture:** ESLint 8.x + `@typescript-eslint`; Prettier; `eslint-plugin-import` for path restrictions; `eslint-plugin-react-hooks` for hooks rules.
**Dependencies:** Feature 1.1
**Acceptance Criteria:** `eslint .` exits 0 on empty scaffold; `import/no-restricted-paths` rules block cross-layer imports; `max-lines` rule warns at 250 and errors at 300; `no-explicit-any` is an error.
**Edge Cases:** IDE ESLint plugins must be configured separately from CI — document in README.
**Performance Considerations:** ESLint must run in under 60 seconds in CI.
**Testing Requirements:** CI step that runs `eslint --max-warnings 0`.

- [x] 1.2.1 Configure ESLint with TypeScript and React Native rules
  - Install: `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-import`
  - Configure `no-explicit-any` as error, `max-lines` warn at 250 / error at 300, `max-lines-per-function` error at 40
  - Configure `@typescript-eslint/explicit-function-return-type` as error
  - _Requirements: 51.1, 51.2, 51.3, 51.4, 51.6_

- [x] 1.2.2 Configure `import/no-restricted-paths` for dependency direction
  - Block: `src/features/game/physics/` importing from `src/features/game/rendering/`
  - Block: any file outside `src/features/game/physics/` importing from `matter-js` directly
  - Block: any file outside `src/features/game/generation/` reading challenge seeds
  - Block: UI layer importing from services layer (must go through store)
  - _Requirements: 2.2, 2.3, 2.4_

  - [ ]* 1.2.2a Write test asserting ESLint catches a mock forbidden import
    - _Requirements: 2.7_

- [x] 1.2.3 Configure Prettier and pre-commit hooks with Husky + lint-staged
  - Prettier: single quotes, 100 char print width, 2 space indent, trailing commas ES5
  - Husky pre-commit: run lint-staged (ESLint + Prettier on staged files)
  - Commit-msg hook: enforce conventional commits format
  - _Requirements: 52.1_

  - [x]* 1.2.3a Document ESLint rule rationale in `docs/code-standards.md`
    - _Requirements: 51.1_


## Feature 1.3: Jest and fast-check Test Infrastructure

**Purpose:** Set up unit test and property-based test frameworks so test-driven development can begin immediately.
**Architecture:** Jest 29.x with `ts-jest`; fast-check 3.x; separate `jest.config.js` configurations for unit and property test suites.
**Dependencies:** Feature 1.1
**Acceptance Criteria:** `jest --testPathPattern=unit` runs and passes on empty scaffold; `jest --testPathPattern=property` runs; coverage reporting configured; CI enforces gates.
**Edge Cases:** fast-check seed must be logged on failure for reproducibility; CI must run 500 iterations per property.
**Testing Requirements:** Self-testing — the test infrastructure itself has a smoke test.

- [x] 1.3.1 Configure Jest 29 with TypeScript and coverage
  - Install `jest`, `ts-jest`, `@types/jest`, `jest-circus`
  - Configure `jest.config.ts` with `preset: 'ts-jest'`, coverage thresholds (statements 75%, branches 70%, functions 80%, lines 75%)
  - Configure separate projects for `unit/` and `property/` test suites
  - _Requirements: 45.1, 45.4, 45.5_

  - [ ]* 1.3.1a Write a passing smoke test in `__tests__/unit/smoke.test.ts`
    - `expect(1 + 1).toBe(2)` — confirms setup works
    - _Requirements: 45.1_

- [x] 1.3.2 Configure fast-check 3.x for property-based tests
  - Install `fast-check`
  - Configure minimum 500 runs in CI via `fc.configureGlobal({ numRuns: 500 })`
  - Configure verbose failure output with counterexample logging
  - _Requirements: 46.1, 46.3_

  - [ ]* 1.3.2a Write a passing smoke property test
    - Property: `fc.property(fc.integer(), n => n + 0 === n)` — identity addition
    - _Requirements: 46.1_

  - [x]* 1.3.2b Document how to run property tests locally and reproduce failures
    - _Requirements: 46.3_


## Feature 1.4: CI/CD Pipeline

**Purpose:** Automate build, test, lint, and deployment pipelines for both iOS and Android on every PR and merge.
**Architecture:** GitHub Actions (or equivalent); separate jobs for: lint, test-unit, test-property, test-integration, ios-build, android-build; Fastlane for app distribution.
**Dependencies:** Features 1.1, 1.2, 1.3; Firebase project created; App Store Connect and Google Play Console access.
**Acceptance Criteria:** PR to `main` triggers all CI jobs; branch protection blocks merge if any job fails; Fastlane deploys to TestFlight and Internal Track on merge to `main`.
**Edge Cases:** iOS builds require macOS runners (expensive — cache aggressively); Android Emulator tests require hardware acceleration.
**Performance Considerations:** CI total pipeline time target under 20 minutes; use caching for node_modules, CocoaPods, Gradle.
**Testing Requirements:** CI pipeline itself tested by verifying a deliberate linting error blocks the PR.

- [x] 1.4.1 Create GitHub Actions workflow for lint and unit tests
  - `.github/workflows/ci.yml`: jobs for `lint`, `test-unit`, `test-property`
  - Cache: `node_modules` by `package-lock.json` hash
  - Upload coverage report as artifact
  - _Requirements: 48.2, 53.1_

- [x] 1.4.2 Create GitHub Actions workflow for iOS build
  - macOS runner; cache CocoaPods `Pods/` directory
  - Steps: `pod install`, `xcodebuild -workspace ... -scheme ... -configuration Debug`
  - _Requirements: 48.1, 53.1_

  - [ ]* 1.4.2a Document Fastlane match certificate setup for iOS signing
    - _Requirements: 48.1_

- [x] 1.4.3 Create GitHub Actions workflow for Android build
  - Ubuntu runner; cache Gradle `~/.gradle`
  - Steps: `./gradlew assembleDebug`
  - _Requirements: 48.1, 53.1_

- [x] 1.4.4 Configure Fastlane for TestFlight and Play Internal Track deployment
  - `Fastfile` with `lane :beta_ios` (build + TestFlight upload) and `lane :beta_android` (build + Internal Track upload)
  - Secrets: App Store Connect API key, Google Play JSON key — stored in GitHub Secrets
  - _Requirements: 48.1, 50.6_

  - [ ]* 1.4.4a Write Fastlane smoke test lane that validates configuration
    - _Requirements: 48.1_

- [x] 1.4.5 Configure branch protection rules on `main`
  - Require: all CI jobs pass, 1 approving review, no direct pushes
  - _Requirements: 52.2_

  - [x]* 1.4.5a Document branch naming conventions and PR checklist in `CONTRIBUTING.md`
    - Includes PR checklist from Requirement 52.4
    - _Requirements: 52.3, 52.4_


## Feature 1.5: Firebase Project Setup

**Purpose:** Create and configure the Firebase project with all required services so backend development can begin in parallel.
**Architecture:** Firebase project with: Auth, Firestore, Analytics, Crashlytics, Remote Config, Cloud Functions, Storage, Hosting. Separate dev/staging/prod projects.
**Dependencies:** Feature 1.4 (secrets management)
**Acceptance Criteria:** Firebase emulator suite runs locally; all 6 required Firestore collections exist with security rules applied; Anonymous Auth enabled; Remote Config has all 10 required parameters.
**Edge Cases:** Firebase emulator ports must not conflict with other local services; CI must use emulator, never production.
**Performance Considerations:** Firestore indexes must be created before QA phase.
**Testing Requirements:** Firebase emulator integration tests pass in CI.

- [x] 1.5.1 Create Firebase project and configure SDK
  - Create Firebase project (dev and prod environments)
  - Install `@react-native-firebase/app`, `@react-native-firebase/auth`, `@react-native-firebase/firestore`, `@react-native-firebase/analytics`, `@react-native-firebase/crashlytics`, `@react-native-firebase/remote-config`, `@react-native-firebase/storage`, `@react-native-firebase/functions`
  - Add `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)
  - _Requirements: 28.1, 55.2_

- [x] 1.5.2 Configure Firebase Emulator Suite for local development
  - `firebase.json` with emulator ports for Auth, Firestore, Functions, Storage
  - `package.json` script: `"emulators": "firebase emulators:start"`
  - CI job: start emulators before integration tests
  - _Requirements: 47.1_

  - [ ]* 1.5.2a Write integration smoke test using Firebase emulator
    - Test: anonymous sign-in succeeds; Firestore write succeeds with correct auth
    - _Requirements: 28.1, 26.7_

- [x] 1.5.3 Configure Remote Config with all 10 required parameters and defaults
  - Parameters: `salt_global`, `salt_daily`, `base_continue_cost`, `base_water_force`, `max_daily_ad_views`, `event_windows`, `quality_score_threshold`, `near_miss_bonus_seconds`, `max_active_bubbles`, `max_active_ripples`
  - All parameters must have hardcoded fallback defaults in `src/constants/`
  - _Requirements: 28.5, 28.6_

  - [ ]* 1.5.3a Write unit test asserting all 10 Remote Config keys have fallback defaults
    - _Requirements: 28.5_

- [x] 1.5.4 Create Firestore security rules and deploy to dev project
  - Rules for all collections: `/players/{userId}`, `/leaderboards/...`, `/economy/...`, `/challenge_intelligence/...`
  - All rules require valid Firebase Auth token
  - Player documents readable/writable only by matching userId
  - Leaderboard entries readable by all authenticated users; writable only by Cloud Functions
  - _Requirements: 26.3, 26.4, 26.5, 26.6, 26.7_

  - [x]* 1.5.4a Write Firebase security rule unit tests using `@firebase/rules-unit-testing`
    - Cover: unauthenticated read rejected, wrong-user write rejected, Cloud Function write accepted
    - _Requirements: 26.3, 26.7, 55.1_


## Feature 1.6: Performance Benchmark Baseline

**Purpose:** Establish the performance measurement infrastructure so regressions are caught automatically.
**Architecture:** Maestro for E2E perf measurements; custom physics benchmark for device tier detection; Flipper for local profiling.
**Dependencies:** Features 1.1, 1.4
**Acceptance Criteria:** Physics benchmark produces a result on both iOS and Android; Maestro runs cold start measurement; baseline values stored as CI fixtures.
**Edge Cases:** CI emulators are slower than physical devices — performance gates apply to physical devices only (via Fastlane device tests).
**Testing Requirements:** Performance benchmark suite produces baseline measurements per Requirement 48.2.

- [x] 1.6.1 Implement 1-second physics benchmark for device tier detection
  - `src/utils/PerformanceBenchmark.ts`: run 60 physics ticks (16.67ms each) with 5 rings and measure wall-clock time
  - Classify: under 67ms = high-end, 67–90ms = mid-range, over 90ms = low-end
  - Cache result to MMKV key `device_performance_tier`
  - _Requirements: 24.3, 44.4_

  - [ ]* 1.6.1a Write unit test for benchmark classification thresholds
    - _Requirements: 24.3, 44.4_

- [x] 1.6.2 Create Maestro E2E baseline measurement flow
  - Measure: cold start time (tap to HomeScreen interactive), challenge load time
  - Store baseline values in `__tests__/perf-baselines.json`
  - _Requirements: 47.4, 53.5, 53.6_

  - [x]* 1.6.2a Document how to run Maestro tests on physical devices
    - _Requirements: 47.4_

## Epic 1: Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1.1", "1.1.2"] },
    { "id": 1, "tasks": ["1.1.3", "1.1.1a", "1.1.2a"] },
    { "id": 2, "tasks": ["1.2.1", "1.3.1", "1.5.1"] },
    { "id": 3, "tasks": ["1.2.2", "1.2.3", "1.3.2", "1.5.2", "1.5.3"] },
    { "id": 4, "tasks": ["1.2.2a", "1.3.1a", "1.3.2a", "1.3.2b", "1.5.2a", "1.5.3a", "1.5.4"] },
    { "id": 5, "tasks": ["1.4.1", "1.4.2", "1.4.3", "1.5.4a", "1.2.3a"] },
    { "id": 6, "tasks": ["1.4.4", "1.4.5", "1.6.1"] },
    { "id": 7, "tasks": ["1.4.4a", "1.4.5a", "1.6.1a", "1.6.2"] },
    { "id": 8, "tasks": ["1.6.2a"] }
  ]
}
```

**Critical Path:** 1.1.1 → 1.1.2 → 1.2.1 → 1.4.1 → 1.4.4 → 1.4.5
**Parallelizable:** Firebase setup (1.5.x) runs in parallel with ESLint/test setup (1.2.x, 1.3.x)
**Blocking Tasks:** 1.5.1 (Firebase SDK) blocks all Firebase-dependent features; 1.4.5 (branch protection) blocks team workflow

---


# Epic 2: Architecture

**Objectives:** Implement the core architectural patterns: Zustand state management, MMKV persistence, dependency injection via React Context, typed event emitter system, and all service interface stubs with proper DI setup.
**Business Value:** A solid architecture reduces future feature implementation time by 40%+ and prevents the most expensive category of bugs (data flow issues) before they start.
**Dependencies:** Epic 1 (project scaffold, Firebase setup)
**Technical Risks:** Reanimated 3 Worklet threading model is complex; Zustand + MMKV hydration race conditions on app start; React Context performance with large state trees.
**Success Criteria:** All 7 Zustand slices persist to MMKV and restore correctly; event emitter dispatches and receives all game events; dependency injection works without circular imports; ESLint dependency rules catch violations.
**Estimated Duration:** Weeks 2–5 (overlaps with Epic 1)
**Required Roles:** Senior React Native Engineer (lead), Backend Engineer
**Definition of Done:** All slices serialize/deserialize; all service interfaces are stubbed and injectable; event types are fully typed; zero circular dependencies detected.

---

## Feature 2.1: Zustand Store and Slice Implementation

**Purpose:** Implement all 7 Zustand slices with proper TypeScript types, selectors, and MMKV persistence.
**Architecture:** Zustand with `zustand/middleware` persist middleware backed by MMKV; each slice in its own file; selectors use granular reads to prevent re-renders.
**Dependencies:** Epic 1
**Acceptance Criteria:** Each slice persists its state to MMKV on every write; slices restore correctly on app restart; selectors are granular (no slice-wide selectors).
**Edge Cases:** MMKV read failure must fall back to default state; migration chain must run if schemaVersion changes.
**Testing Requirements:** Unit tests for all slice reducers and selectors; integration test for MMKV round-trip.

- [x] 2.1.1 Implement `playerSlice.ts` with profile, XP, level, prestige data
  - State: userId, username, displayName, avatarUrl, country, xp, level, prestige, rank, totalStars, completionScorePercent
  - Actions: `updateProfile`, `addXP`, `levelUp`, `prestige`
  - Selectors: `selectPlayerLevel`, `selectPlayerXP`, `selectPrestige` (granular)
  - Persist to MMKV key `player_slice`
  - _Requirements: 17.1, 18.1, 18.2_

  - [ ]* 2.1.1a Write unit tests for playerSlice reducers and selectors
    - Test: XP addition, level-up threshold, prestige reset
    - _Requirements: 17.1_

- [x] 2.1.2 Implement `economySlice.ts` with coin balance and transaction history
  - State: coinBalance, transactionHistory (last 50), purchaseState, freeContinueTracking, dailyAdViewCount
  - Actions: `creditCoins`, `debitCoins`, `recordTransaction`, `recordAdView`
  - Selectors: `selectCoinBalance`, `selectDailyAdCount`
  - Persist to MMKV; write immediately on any coin change
  - _Requirements: 17.2, 18.4_

  - [ ]* 2.1.2a Write unit tests for economySlice coin conservation
    - Test: balance never goes negative; transaction history capped at 50
    - _Requirements: 17.2, Property 11_

- [x] 2.1.3 Implement `challengeSlice.ts` with active challenge state
  - State: activeChallengeConfig, timerRemaining, ringPositions, ringVelocities, pegStates, winLossState, continueCount, adaptiveAssistFlags
  - Actions: `loadChallenge`, `updatePhysicsState`, `setTimer`, `recordWin`, `recordLoss`, `useContinue`
  - Write to MMKV every 1 second during active gameplay; immediate write on challenge start/end
  - _Requirements: 17.3, 18.3, 18.4_

  - [ ]* 2.1.3a Write unit tests for challengeSlice state transitions
    - Test: win state, loss state, continue count increment
    - _Requirements: 17.3_

- [x] 2.1.4 Implement `settingsSlice.ts`, `cosmeticsSlice.ts`, `socialSlice.ts`, `onboardingSlice.ts`
  - `settingsSlice`: audioVolumes, hapticSettings, accessibilitySettings, language, graphicsQuality
  - `cosmeticsSlice`: ownedCosmeticIds (Set), equippedCosmeticIds (per category Map)
  - `socialSlice`: friendsList, leaderboardCache, ghostCache, pendingNotifications
  - `onboardingSlice`: tutorialComplete, highestChallengeShown, featureUnlockFlags, accountPromptShown
  - _Requirements: 17.4, 17.5, 17.6, 17.7_

  - [x]* 2.1.4a Write unit tests for each remaining slice
    - _Requirements: 17.4, 17.5, 17.6, 17.7_


## Feature 2.2: MMKV Persistence Layer

**Purpose:** Implement the MMKV persistence layer with CRC32 checksums, corruption recovery, and Firestore sync triggers.
**Architecture:** `react-native-mmkv`; each Zustand slice has its own MMKV key; CRC32 checksum stored alongside each value; corruption triggers Firestore cloud recovery.
**Dependencies:** Feature 2.1
**Acceptance Criteria:** App survives kill and reboot with state restored; CRC32 mismatch triggers cloud recovery; MMKV writes happen within 1ms (synchronous).
**Edge Cases:** MMKV write during challenge crash must be recoverable; large state blobs must not exceed MMKV performance SLA.
**Testing Requirements:** Integration test: kill app mid-challenge, restart, verify state restored.

- [x] 2.2.1 Configure `react-native-mmkv` and create MMKV storage wrapper
  - Install `react-native-mmkv`
  - Create `src/services/storage/MMKVStorage.ts` wrapper with typed get/set/delete methods
  - Implement CRC32 checksum on every write; verify on every read
  - On checksum failure: log to Crashlytics, return null (triggering cloud fallback)
  - _Requirements: 18.1, 18.5, 18.6_

  - [ ]* 2.2.1a Write unit tests for CRC32 checksum write and verification
    - Test: corrupt data detected; valid data passes; null returned on corruption
    - _Requirements: 18.5_

- [x] 2.2.2 Wire Zustand persist middleware to MMKV storage
  - Replace default Zustand storage with MMKV wrapper
  - Each slice serializes independently to its MMKV key
  - `challengeSlice` writes on a 1-second interval using `setInterval` in worklet
  - Immediate write triggers: challenge start, end, complete, continue, IAP, settings change, cosmetic equip
  - _Requirements: 18.2, 18.3, 18.4_

  - [x]* 2.2.2a Write integration test for MMKV round-trip persistence
    - Test: write state, simulate app restart, verify state restored
    - _Requirements: 18.6_


## Feature 2.3: Typed Event Emitter and Dependency Injection

**Purpose:** Implement the typed event emitter system for game-to-service communication and the React Context-based dependency injection pattern.
**Architecture:** Custom typed `EventEmitter<T>` using TypeScript discriminated unions; React Context provides services to components; no service imports directly in UI components.
**Dependencies:** Features 2.1, 2.2
**Acceptance Criteria:** All 9 game event types dispatch and receive correctly; Analytics, Audio, and Haptic services receive events without calling back into game systems; DI context provides all services.
**Edge Cases:** Event listeners must be cleaned up on component unmount; event emitter must handle rapid-fire events without memory leaks.
**Testing Requirements:** Unit test for each event type dispatch and subscription; integration test for multi-listener scenarios.

- [x] 2.3.1 Implement typed `GameEventEmitter` with all 9 event types
  - Event types: `input_processed`, `physics_stepped`, `win_condition_met`, `timer_expired`, `ring_settled`, `ring_near_peg`, `ring_collision`, `obstacle_collision`, `assist_triggered`
  - `src/utils/GameEventEmitter.ts`: typed subscribe/dispatch/unsubscribe with TypeScript discriminated union events
  - _Requirements: 3.1, 3.3_

  - [ ]* 2.3.1a Write unit tests for all 9 event types
    - Test: subscribe, dispatch, receive, unsubscribe for each
    - _Requirements: 3.1_

- [x] 2.3.2 Implement Service DI context (`Providers.tsx`)
  - Create `ServiceContext` providing: `audioEngine`, `hapticManager`, `analyticsService`, `economyService`, `leaderboardService`, `replayService`
  - All services are instantiated once in `Providers.tsx` and injected via context
  - No UI component may import a service directly — must use `useServices()` hook
  - _Requirements: 1.7, 3.4, 3.5, 3.6_

  - [ ]* 2.3.2a Write unit test asserting services are accessible via `useServices()`
    - _Requirements: 1.7_

- [x] 2.3.3 Implement `useSharedValue` bridge for physics state to React rendering
  - Create shared values for ring positions, velocities, peg states
  - Game loop writes to shared values; React render tree reads from them
  - No `setState` calls from game loop code — only shared value writes
  - _Requirements: 4.4_

  - [x]* 2.3.3a Write test asserting game loop never calls setState
    - Static analysis / AST test asserting no `setState` in game loop files
    - _Requirements: 4.4_

## Epic 2: Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1.1", "2.1.2", "2.1.3", "2.1.4"] },
    { "id": 1, "tasks": ["2.1.1a", "2.1.2a", "2.1.3a", "2.1.4a", "2.2.1"] },
    { "id": 2, "tasks": ["2.2.1a", "2.2.2"] },
    { "id": 3, "tasks": ["2.2.2a", "2.3.1"] },
    { "id": 4, "tasks": ["2.3.1a", "2.3.2"] },
    { "id": 5, "tasks": ["2.3.2a", "2.3.3"] },
    { "id": 6, "tasks": ["2.3.3a"] }
  ]
}
```

**Critical Path:** 2.1.1–2.1.4 → 2.2.1 → 2.2.2 → 2.3.1 → 2.3.2 → 2.3.3
**Parallelizable:** All 4 slice implementations (2.1.1–2.1.4) are independent and can run in parallel
**Blocking Tasks:** 2.2.1 (MMKV) blocks all persistence; 2.3.2 (DI context) blocks all feature service integration

---


# Epic 3: Game Loop

**Objectives:** Implement the fixed-timestep game loop running in a Reanimated 3 Worklet, input controller with all 6 interaction patterns, win/loss detection, timer system, and developer debug overlay.
**Business Value:** This is the core playable loop — nothing else in the game works without it. Delivering a working single-challenge experience unlocks parallel development across all other epics.
**Dependencies:** Epics 1, 2; Epic 4 (PhysicsWorld) in parallel
**Technical Risks:** Reanimated 3 Worklet debugging is difficult; fixed-timestep accumulation logic must handle frame drops gracefully; game loop must never cause JS thread jank.
**Success Criteria:** A single challenge is playable end-to-end on iOS and Android; physics tick time under 4ms; win detection fires correctly after 500ms stability window; timer counts down correctly.
**Estimated Duration:** Weeks 3–8 (Milestone 2)
**Required Roles:** Senior React Native Engineer (lead), Physics Engineer
**Definition of Done:** Challenge playable; win/loss triggers correctly; timer works; press counts work; input state machine handles all 6 interaction types.

---

## Feature 3.1: GameLoop Controller

**Purpose:** Implement the fixed-timestep GameLoop orchestrator in a Reanimated 3 Worklet.
**Architecture:** Reanimated 3 `useFrameCallback` in a worklet; accumulator-based fixed timestep; maximum 5-frame lag cap; tick order enforced.
**Dependencies:** Epics 1, 2; Feature 4.1 (PhysicsWorld)
**Acceptance Criteria:** 60 Hz physics ticks on 60 Hz display; correct interpolation for 90/120 Hz displays; never blocks JS thread; serializes state to MMKV at 1-second checkpoints.
**Edge Cases:** App backgrounding must pause loop cleanly; resuming from background must not produce spiral-of-death; device lock screen must pause physics.
**Testing Requirements:** Unit tests for tick-order assertions; integration test for background/foreground cycle.

- [x] 3.1.1 Implement GameLoop fixed-timestep orchestrator in Reanimated Worklet
  - `src/features/game/core/GameLoop.ts`
  - Expose: `start(config)`, `stop()`, `pause()`, `resume()`, `applyInput(input)`, `onWin(cb)`, `onTimerExpire(cb)`, `getCurrentState()`
  - Fixed timestep: 16.67ms; accumulator pattern; max lag cap: 5 frames (83.35ms)
  - Tick order: `processInput → applyWaterForces → Matter.Engine.update → checkWinCondition → checkTimerExpiry → checkAdaptiveAssistance → persistStateIfCheckpoint`
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ]* 3.1.1a Write unit tests for GameLoop tick order and frame lag cap
    - Test: verify each tick step executes in correct order; test lag cap fires at 5 frames
    - _Requirements: 9.2, 9.3_

- [x] 3.1.2 Implement position interpolation for smooth rendering at variable refresh rates
  - `alpha = accumulator / FIXED_TIMESTEP`
  - Interpolate ring positions: `renderPos = prevPos + (currentPos - prevPos) * alpha`
  - Write interpolated positions to Reanimated shared values
  - _Requirements: 4.5, 9.5_

  - [ ]* 3.1.2a Write unit test for interpolation formula at alpha 0, 0.5, and 1.0
    - _Requirements: 9.5_

- [x] 3.1.3 Implement MMKV checkpoint serialization (1-second interval + triggers)
  - 1-second interval: serialize physics state to MMKV `challenge_checkpoint`
  - Immediate triggers: challenge start, challenge end, continue granted, pause
  - On restore: deserialize from checkpoint and resume from saved physics state
  - _Requirements: 9.6, 18.3, 18.4_

  - [ ]* 3.1.3a Write integration test for checkpoint restore after simulated crash
    - _Requirements: 18.6_


## Feature 3.2: InputController

**Purpose:** Implement the InputController that translates raw touch events into typed InputEvents for all 6 interaction patterns.
**Architecture:** `InputController.ts`; state machine: Idle → Pressing → Holding → LongHold; detects tap (< 150ms), hold (150–1500ms), long hold (> 1500ms), rapid tap (3+ in 500ms), simultaneous press, alternating tap (L-R-L in 600ms).
**Dependencies:** Feature 3.1
**Acceptance Criteria:** All 6 interaction types correctly detected; raw touch coordinates never enter game loop; simultaneous press detected within 50ms window.
**Edge Cases:** Simultaneous press on older Android devices with touch latency over 80ms; rapid tap counter must reset correctly.
**Testing Requirements:** Unit tests for all 6 detection algorithms; property test for timing edge cases.

- [x] 3.2.1 Implement InputController state machine and all 6 detection algorithms
  - `src/features/game/core/InputController.ts`
  - Expose: `onLeftPress`, `onLeftRelease`, `onRightPress`, `onRightRelease`, `getCurrentInputState`, `reset`
  - Implement tap detection (< 150ms), hold detection (150–1500ms), long hold (> 1500ms)
  - Implement rapid tap counter (3+ taps in 500ms sliding window)
  - Implement simultaneous press detection (both held within 50ms)
  - Implement alternating tap pattern (L-R-L within 600ms)
  - _Requirements: 16.1_

  - [ ]* 3.2.1a Write unit tests for all 6 InputController detection algorithms
    - Test each edge: exact threshold at 150ms; exactly 3 taps in 500ms; simultaneous at 45ms gap
    - _Requirements: 16.1_

  - [ ]* 3.2.1b Write property test for input timing edge cases
    - **Property: tap/hold distinction never misclassified at timing boundaries**
    - `fc.property(fc.integer({ min: 0, max: 2000 }), duration => duration < 150 ? isTap(duration) : duration >= 150)`
    - _Requirements: 16.1_

- [ ] 3.2.2 Implement button intensity ramp model
  - Ramp from 0 to 1.0 over 300ms hold; maintain at 1.0 until 1500ms; decay to floor 0.3 over next 2000ms
  - Expose current intensity via `getCurrentInputState().leftIntensity` and `.rightIntensity`
  - _Requirements: 22.6_

  - [ ]* 3.2.2a Write unit test for intensity ramp at t=0, t=300ms, t=1500ms, t=3500ms
    - _Requirements: 22.6_


## Feature 3.3: WinCondition and TimerController

**Purpose:** Implement win condition checking with 500ms stability window and the timer countdown controller with continue integration.
**Architecture:** `WinCondition.ts`; `TimerController.ts`; timer runs in game loop tick; win condition checks all ring-peg pairs each tick.
**Dependencies:** Feature 3.1
**Acceptance Criteria:** Win fires only after 500ms of continuous all-ring stability; timer fires `timer_expired` exactly when countdown reaches 0; continue adds correct bonus time.
**Edge Cases:** Ring leaving peg during 500ms window resets counter; near-miss bonus time added correctly.
**Testing Requirements:** Unit tests for win condition stability window; property test for timer monotonicity.

- [x] 3.3.1 Implement WinCondition checker with 500ms stability window
  - `src/features/game/core/WinCondition.ts`
  - Each tick: check all required ring-peg pairs are satisfied
  - Maintain stability counter; reset on any pair breaking
  - Fire `win_condition_met` event after 500ms continuous stability
  - _Requirements: 9.1, 23.5_

  - [ ]* 3.3.1a Write unit test for stability window reset behavior
    - Test: 499ms of stability then ring leaves → counter resets; 501ms → win fires
    - _Requirements: 23.5_

  - [ ]* 3.3.1b Write property test for win condition
    - **Property: win only fires when all ring-peg pairs satisfied AND stable 500ms**
    - _Requirements: 23.5_

- [x] 3.3.2 Implement TimerController with countdown and continue bonus time
  - `src/features/game/core/TimerController.ts`
  - Countdown in fixed timestep; fire `timer_expired` at zero
  - Expose `addBonusTime(seconds)` for continue grants
  - Write timer state to challengeSlice each tick
  - _Requirements: 9.1, 16.2_

  - [ ]* 3.3.2a Write property test: timer monotonicity
    - **Property 15: timer never increases without an explicit continue call**
    - `fc.property(fc.integer({ min: 1, max: 10000 }), ticks => timerAfterNTicks(ticks) <= initialTimer)`
    - **Validates: Requirements 9.1, 16.2**
    - _Requirements: Property 15_

- [ ] 3.3.3 Implement developer debug overlay
  - Toggle via shake gesture or dev menu
  - Display: current FPS, physics tick time (ms), active ring/peg count, challenge number, current template, assist flags, MMKV write latency
  - Enabled only in dev/debug builds; tree-shaken from production
  - _Requirements: 48.3_

  - [ ]* 3.3.3a Write unit test for debug overlay data collection
    - _Requirements: 48.3_

## Epic 3: Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["3.1.1"] },
    { "id": 1, "tasks": ["3.1.1a", "3.1.2", "3.1.3"] },
    { "id": 2, "tasks": ["3.1.2a", "3.1.3a", "3.2.1", "3.3.1", "3.3.2"] },
    { "id": 3, "tasks": ["3.2.1a", "3.2.1b", "3.2.2", "3.3.1a", "3.3.1b", "3.3.2a"] },
    { "id": 4, "tasks": ["3.2.2a", "3.3.3"] },
    { "id": 5, "tasks": ["3.3.3a"] }
  ]
}
```

**Critical Path:** 3.1.1 → 3.2.1 → 3.3.1 → 3.3.2 (sequential core loop dependencies)
**Parallelizable:** WinCondition (3.3.1) and TimerController (3.3.2) implement in parallel; debug overlay (3.3.3) is independent
**Blocking Tasks:** 3.1.1 (GameLoop) blocks everything; 3.2.1 (InputController) blocks input pipeline

---


# Epic 4: Physics Engine

**Objectives:** Implement the complete Matter.js physics integration including the four-layer water force model, ring/peg body construction, collision detection, and all physics safety systems (stuck detection, NaN recovery).
**Business Value:** The physics engine IS the game. A physically credible, performant engine that runs deterministically is the single largest technical differentiator against competing games.
**Dependencies:** Epics 1, 2
**Technical Risks:** Matter.js determinism across platforms requires careful management of floating-point operations; buoyancy and water forces must feel credible without SPH; stuck detection must not feel like teleportation.
**Success Criteria:** Physics tick under 4ms; deterministic replay of golden challenges passes; all 5 force/physics property tests pass; ring landing feels satisfying and correct.
**Estimated Duration:** Weeks 3–8 (Milestone 2)
**Required Roles:** Physics Engineer (lead), Senior React Native Engineer
**Definition of Done:** Matter.js configured; all force layers implemented; ring landing works; stuck detection works; NaN recovery works; determinism test passes.

---

## Feature 4.1: PhysicsWorld and Matter.js Integration

**Purpose:** Implement the PhysicsWorld module as the sole Matter.js integration point, hiding all Matter.js APIs behind a clean interface.
**Architecture:** `PhysicsWorld.ts`; Matter.js 0.19+; specific gravity/iteration config; arena walls as static bodies; 24-vertex ring polygons; peg sensor bodies.
**Dependencies:** Epics 1, 2
**Acceptance Criteria:** PhysicsWorld exposes the required interface; no file outside `src/features/game/physics/` calls Matter.js; arena walls correctly bounded; ring body construction matches spec.
**Edge Cases:** Matter.js `fromVertices` may produce non-convex shapes — use `decomp` library for concave poly support; body reuse pool must be initialized at challenge start.
**Testing Requirements:** Unit tests for PhysicsWorld interface; property test for arena containment.

- [x] 4.1.1 Implement PhysicsWorld module with Matter.js configuration
  - `src/features/game/physics/PhysicsWorld.ts`
  - Expose: `initialize(config)`, `step(dt)`, `applyWaterForces(input)`, `getRingStates()`, `getPegStates()`, `serializeState()`, `restoreState(state)`, `destroy()`
  - Configure Matter.js: `gravity.y=1`, `gravity.scale=0.001`, `positionIterations=6`, `velocityIterations=4`, `constraintIterations=2`, `broadphase='grid'`
  - _Requirements: 10.1, 10.2, 21.1_

  - [ ]* 4.1.1a Write unit tests for PhysicsWorld interface contract
    - Test: initialize creates engine, step advances time, destroy cleans up
    - _Requirements: 10.1_

- [x] 4.1.2 Implement RingBody construction (24-vertex polygon approximation)
  - `src/features/game/physics/RingBody.ts`
  - Construct rings as 24-vertex polygon using `Matter.Bodies.fromVertices`
  - Apply per-ring physics properties: mass, restitution, frictionAir, angularDamping, linearDamping per size tier
  - Small: outerRadius=22px, mass=0.5, buoyancy=0.85; Medium: 32px, 1.0, 0.65; Large: 44px, 2.2, 0.45
  - Pre-allocate all ring bodies at challenge start (object pooling); no new allocations during gameplay
  - _Requirements: 10.3, 23.1, 23.2, 23.3, 24.4_

  - [ ]* 4.1.2a Write unit tests for ring body construction per size tier
    - Test: correct mass, radius, and buoyancy per tier
    - _Requirements: 23.1, 23.2, 23.3_

- [x] 4.1.3 Implement PegBody construction as sensor bodies
  - `src/features/game/physics/PegBody.ts`
  - Construct pegs as sensor bodies with separate collision filter layer from ring interiors
  - Peg sensor zones: center within 1.2× tipRadius for acceptance
  - Moving peg support: apply velocity along MovementPath each tick
  - _Requirements: 10.4_

  - [ ]* 4.1.3a Write unit test for peg sensor collision filter setup
    - _Requirements: 10.4_

- [x] 4.1.4 Implement arena wall bodies and boundary setup
  - Four static walls: top, bottom, left, right; restitution=0.3, friction=0.1
  - Arena dimensions derived from ChallengeConfig arenaLayout
  - _Requirements: 21.4, 21.5_

  - [x]* 4.1.4a Write property test for arena containment
    - **Property 8: all ring initial positions lie strictly within arena bounds**
    - `fc.property(fc.integer({ min: 1, max: 100 }), N => allInsideBounds(generateChallenge(N)))`
    - **Validates: Requirement 11**
    - _Requirements: Property 8_


## Feature 4.2: Water Force Model (Four Layers)

**Purpose:** Implement all four water force layers: directional button force, background current, buoyancy, and turbulence.
**Architecture:** `WaterSimulation.ts`; forces applied via `Matter.Events.on(engine, 'beforeUpdate', handler)`; each layer is a pure function of ring state and input state.
**Dependencies:** Feature 4.1
**Acceptance Criteria:** All four force layers apply correctly; total force never exceeds MAX_WATER_FORCE; buoyancy is always upward; button forces are symmetric; settled rings receive zero force.
**Edge Cases:** Force at arena edges; turbulence seed from input timestamp; drag higher at arena bottom.
**Testing Requirements:** Property tests for all 5 force properties (Properties 1–4).

- [x] 4.2.1 Implement Layer 1: Directional Button Force
  - `F_button(x, side, intensity) = BASE_FORCE × intensity × (1 - |x - sourceX| / ScreenWidth) × DirectionVector`
  - Left button → rightward force; Right button → leftward force
  - Force applied via `beforeUpdate` event handler
  - _Requirements: 22.2_

  - [ ]* 4.2.1a Write property test for button force symmetry
    - **Property 4: left button force at (x,y) == right button force at (W-x, y)**
    - `fc.property(fc.tuple(fc.float({min:0, max:1}), fc.float({min:0, max:1})), ([x,y]) => leftForce(x,y) === rightForce(arenaW-x,y))`
    - **Validates: Requirement 22**
    - _Requirements: Property 4_

- [x] 4.2.2 Implement Layer 2: Background Current Force
  - Persistent ambient force from seed-determined current profile
  - `CurrentMagnitude = BASE_CURRENT × (1 + ND × CURRENT_SCALE)`
  - Apply as constant force each tick in the current direction
  - _Requirements: 22.3_

  - [ ]* 4.2.2a Write unit test for current magnitude scaling with difficulty
    - _Requirements: 22.3_

- [x] 4.2.3 Implement Layer 3: Buoyancy Force
  - `F_buoy = BUOYANCY_BASE × ring.buoyancy × (y - waterSurface) / arenaHeight`
  - Always upward (y component ≤ 0); deeper rings feel more upward pull
  - Apply as `beforeUpdate` handler
  - _Requirements: 22.4_

  - [ ]* 4.2.3a Write property test for buoyancy direction
    - **Property 3: computeBuoyancy always returns force.y <= 0**
    - `fc.property(fc.record({y: fc.float({min:0,max:1000}), buoyancy: fc.float({min:0,max:1})}), ring => computeBuoyancy(ring).y <= 0)`
    - **Validates: Requirement 22**
    - _Requirements: Property 3_

- [x] 4.2.4 Implement Layer 4: Turbulence Force
  - Triggered by rapid-tap input event
  - `F_turb = BaseForce × TURBULENCE_FACTOR × RandomUnit(θ ± 45°, seed=inputTimestamp)`
  - Use xoshiro128** PRNG seeded from input timestamp
  - _Requirements: 22.5_

  - [ ]* 4.2.4a Write unit test for turbulence force direction bounds (±45° range)
    - _Requirements: 22.5_

- [x] 4.2.5 Implement drag model and force accumulation
  - Linear drag: `v(t+1) = v(t) × (1 - linearDamping × dt)`; angular drag similar
  - Higher drag near arena bottom (factor scales with y position)
  - Force boundedness check: total force per ring capped at MAX_WATER_FORCE
  - _Requirements: 22.7_

  - [ ]* 4.2.5a Write property test for force boundedness
    - **Property 1: total force never exceeds MAX_WATER_FORCE for any ring position and input state**
    - `fc.property(fc.record({pos: arbRingPos, input: arbInputState, config: arbConfig}), ({pos,input,config}) => totalForce(pos,input,config) <= MAX_WATER_FORCE)`
    - **Validates: Requirement 22**
    - _Requirements: Property 1_

  - [ ]* 4.2.5b Write property test: no force on settled rings
    - **Property 2: settled rings receive zero net force regardless of input**
    - `fc.property(arbInputState, input => applyWaterForces({...ring, settledOnPegId: 'peg1'}, input).magnitude === 0)`
    - **Validates: Requirement 22**
    - _Requirements: Property 2_


## Feature 4.3: Ring Landing Detection and Safety Systems

**Purpose:** Implement ring landing detection with all 5 conditions, stuck detection with recovery, and NaN guard with checkpoint restoration.
**Architecture:** Landing detection via `collisionStart` event; stuck detection tracks velocity per ring over 5 seconds; NaN guard runs before every render.
**Dependencies:** Features 4.1, 4.2
**Acceptance Criteria:** Landing fires only when all 5 conditions met; stuck ring receives up to 3 nudges then teleports; NaN triggers Crashlytics log and checkpoint restore.
**Edge Cases:** Ring bouncing at settle velocity threshold must not false-trigger; occupied peg must reject incoming ring.
**Testing Requirements:** Unit tests for each landing condition individually; integration test for stuck detection cycle.

- [ ] 4.3.1 Implement ring landing detection with all 5 conditions
  - Via `Matter.Events.on(engine, 'collisionStart', handler)`
  - Conditions: center within 1.2× tipRadius, velocity < settleVelocityThreshold, angle ±15° (±8° for Precision), no bounce within 200ms, colorId matches
  - Fire `ring_settled` event on confirmed landing
  - Handle `pegOccupied` haptic when landing blocked by occupied peg
  - _Requirements: 10.6, 23.4_

  - [ ]* 4.3.1a Write unit tests for each of the 5 landing conditions independently
    - _Requirements: 10.6, 23.4_

- [ ] 4.3.2 Implement stuck detection and recovery system
  - Track velocity and angularVelocity per ring each tick
  - If below STUCK_THRESHOLD for 5 continuous seconds and ring not settled: apply random impulse
  - Allow up to 3 nudges; after 3 failures teleport ring to random open position
  - _Requirements: 10.7_

  - [ ]* 4.3.2a Write integration test for stuck detection and recovery cycle
    - Test: ring stuck 5s → nudge; stuck again → nudge; stuck again → teleport
    - _Requirements: 10.7_

- [ ] 4.3.3 Implement NaN guard and checkpoint restoration
  - Before every render: check all ring positions for NaN/Infinity
  - On detection: restore from last valid MMKV checkpoint; log non-fatal Crashlytics event
  - _Requirements: 10.8_

  - [ ]* 4.3.3a Write unit test for NaN detection and recovery trigger
    - _Requirements: 10.8_

- [ ] 4.3.4 Implement physics state serialization and restoration
  - `serializeState()`: serialize all ring positions, velocities, angles, angularVelocities, settled states
  - `restoreState(state)`: restore all body positions and velocities from serialized state
  - Used by GameLoop checkpoint system and replay system
  - _Requirements: 10.1_

  - [ ]* 4.3.4a Write unit test for state serialize/restore round-trip
    - Test: serialize state, modify positions, restore, assert positions match original
    - _Requirements: 10.1_

## Epic 4: Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["4.1.1", "4.1.2", "4.1.3", "4.1.4"] },
    { "id": 1, "tasks": ["4.1.1a", "4.1.2a", "4.1.3a", "4.1.4a", "4.2.1"] },
    { "id": 2, "tasks": ["4.2.1a", "4.2.2", "4.2.3", "4.2.4"] },
    { "id": 3, "tasks": ["4.2.2a", "4.2.3a", "4.2.4a", "4.2.5"] },
    { "id": 4, "tasks": ["4.2.5a", "4.2.5b", "4.3.1", "4.3.4"] },
    { "id": 5, "tasks": ["4.3.1a", "4.3.2", "4.3.3", "4.3.4a"] },
    { "id": 6, "tasks": ["4.3.2a", "4.3.3a"] }
  ]
}
```

**Critical Path:** 4.1.1 → 4.2.1 → 4.2.5 → 4.3.1 (foundation → forces → safety)
**Parallelizable:** Ring/Peg/Wall body construction (4.1.2–4.1.4) are independent; force layers 1–4 (4.2.1–4.2.4) are independent
**Blocking Tasks:** 4.1.1 (PhysicsWorld init) blocks all physics; 4.2.5 (force accumulation) blocks safety systems

---


# Epic 5: Water Renderer

**Objectives:** Implement the complete 5-layer water visual system using React Native Skia, including the water body shader, displacement visualization, ring wake system, bubble system, and ripple overlay. Implement device-tier-based layer toggling.
**Business Value:** The water renderer is the primary visual differentiator. "Water feel" is the #1 player retention driver in the playtest research — players who feel the water is satisfying play 3× longer per session.
**Dependencies:** Epics 1, 2, 3, 4
**Technical Risks:** Skia GLSL shader compilation failures on specific GPU drivers; bubble and ripple object pooling must prevent garbage collection pauses; dirty-flag optimization is critical for battery life.
**Success Criteria:** Render frame time under 8ms on iPhone 11; all 5 layers active on high-end tier; low-end tier disables layers 4–5; water shader compiles without errors on all target GPUs; team playtest vote ≥80% approval.
**Estimated Duration:** Weeks 6–11 (Milestone 4)
**Required Roles:** Graphics Engineer (lead), React Native Engineer
**Definition of Done:** All 5 layers rendering; dirty-flag optimization working; device tier detection disables layers correctly; shader fallback implemented; no frame drops during gameplay.

---

## Feature 5.1: Water Body and Shader (Layer 1)

**Purpose:** Implement the base water body with four summed sine waves and the Skia GLSL water shader.
**Architecture:** `WaterRenderer.tsx` using `@shopify/react-native-skia`; `WaterShader.ts` compiles GLSL at startup; four sine wave parameters driven by time uniform; shader uniforms driven by active theme.
**Dependencies:** Epics 1, 2
**Acceptance Criteria:** Water surface animates with four summed sine waves; shader applies gradient darkening, caustic shimmer, specular highlight, chromatic aberration; shader compiles on iOS (Metal) and Android (Vulkan/OpenGL); fallback gradient renders on compile failure.
**Edge Cases:** Shader compile failure on old GPUs; theme change must update uniforms without recompilation.
**Testing Requirements:** Render performance benchmark; shader compilation test on both platforms.

- [ ] 5.1.1 Implement four summed sine wave water surface animation
  - `src/features/game/rendering/WaterRenderer.tsx`
  - Sum four waves: base swell (4px, 0.3Hz, 0.4 rad/s), mid ripple (2px, 0.8Hz, 0.9 rad/s), high ripple (1px, 1.6Hz, 1.8 rad/s), micro chop (0.5px, 3.2Hz, 3.5 rad/s)
  - Animate with `useFrameCallback` in Reanimated; write surface Y positions to shared values
  - _Requirements: 38.1_

  - [ ]* 5.1.1a Write unit test for sine wave surface Y computation at t=0, t=1s, t=5s
    - _Requirements: 38.1_

- [ ] 5.1.2 Implement Skia water shader (GLSL)
  - `src/assets/shaders/water.glsl`: vertical gradient darkening, caustic shimmer, specular highlight, chromatic aberration
  - No branching (`if` statements) in shader code
  - Uniforms: brightness, causticSpeed, tint, time — driven by active theme
  - `WaterShader.ts`: load and compile shader; catch compile error; fallback to gradient
  - _Requirements: 41.3, 41.4, 41.5_

  - [ ]* 5.1.2a Write test that shader compiles without error in CI (mock Skia environment)
    - _Requirements: 41.3_

  - [ ]* 5.1.2b Write unit test for shader fallback on compile error
    - _Requirements: 41.5_

- [ ] 5.1.3 Implement dirty-flag optimization for water surface
  - Track whether wave parameters changed since last render
  - If button not pressed and no rings moving: surface wave still animates (always dirty)
  - If settled state: only water body layer redraws; all other layers skip
  - _Requirements: 4.3_

  - [ ]* 5.1.3a Write unit test for dirty flag logic: stable state = only layer 1 dirty
    - _Requirements: 4.3_


## Feature 5.2: Water Displacement and Ring Wake System (Layers 2–3)

**Purpose:** Implement water displacement visualization on button press and ring wake trails.
**Architecture:** `WaterRenderer.tsx`; displacement as Gaussian bell curve Skia path; wakes as V-shaped Skia path fills from circular buffer of ring positions.
**Dependencies:** Feature 5.1
**Acceptance Criteria:** Displacement bulge visible on button press (max 12px, sigma=ScreenWidth×0.2, τ=300ms); wake trails appear behind rings moving above threshold velocity; Kelvin angle 19.5°; fade over 600ms.
**Edge Cases:** Displacement updates visual only, not physics; wakes capped at 3 rings when 6+ rings active.
**Testing Requirements:** Visual regression test; unit tests for Gaussian bell formula.

- [ ] 5.2.1 Implement Layer 2: Water Displacement visualization
  - `DisplacementBulge(x, side, intensity, t) = intensity × Gaussian(x, μ=sourceX, σ=ScreenWidth×0.2) × DecayEnvelope(t, τ=300ms)`
  - Render as Skia path over water surface; visual only, no physics effect
  - Peak displacement: 12px at wall, 0 at screen center at max intensity
  - _Requirements: 38.3_

  - [ ]* 5.2.1a Write unit test for displacement Gaussian formula at x=0, x=ScreenWidth/2, x=ScreenWidth
    - _Requirements: 38.3_

- [ ] 5.2.2 Implement Layer 3: Ring Wake System
  - `src/features/game/rendering/WaterRenderer.tsx` (wake logic section)
  - Each ring maintains circular buffer: last 300ms of positions at 30 samples/second
  - Wake rendered as V-shaped Skia path fill; Kelvin angle 19.5°; max length 80px; exponential fade over 600ms
  - Performance cap: with 6+ active rings, show wakes for 3 fastest rings only
  - _Requirements: 38.4_

  - [ ]* 5.2.2a Write unit test for circular position buffer behavior (overflow, age-out)
    - _Requirements: 38.4_

  - [ ]* 5.2.2b Write unit test for wake performance cap logic (6 rings → 3 wakes)
    - _Requirements: 38.4_

## Feature 5.3: Bubble System (Layer 4)

**Purpose:** Implement the sub-surface bubble particle system with all four generation triggers and rise physics.
**Architecture:** `BubbleSystem.ts`; object pool of 40 bubbles; circular buffer; rise with sinusoidal x-wobble; trigger events from GameEventEmitter.
**Dependencies:** Features 5.1, 5.2
**Acceptance Criteria:** Bubbles generate on button press, ring collisions, ring landing, and ambient; max 40 active; rise at 40px/s with wobble; pop at surface triggers micro ripple; oldest culled on overflow.
**Edge Cases:** Rapid button presses must not spawn more than 12 bubbles at once; ambient generation rate correct.
**Testing Requirements:** Unit tests for bubble lifecycle; performance test: 40 bubbles at 60fps.

- [ ] 5.3.1 Implement BubbleSystem with object pool and generation logic
  - `src/features/game/rendering/BubbleSystem.ts`
  - Pool of max 40 `Bubble` objects; circular buffer management
  - Generation triggers: button press (5–12 bubbles), ring collision (2–4), ring landing (6–10), ambient (1 every 2–4s)
  - Bubble properties per spec: radius 2–8px, initial opacity 0.7
  - _Requirements: 43.4_

  - [ ]* 5.3.1a Write unit test for bubble pool max-40 cap with overflow culling
    - _Requirements: 43.4_

- [ ] 5.3.2 Implement bubble rise physics and pop trigger
  - Rise: `y(t) = y(0) - RISE_SPEED × t` (40px/s)
  - Wobble: `x(t) = x(0) + 4px × sin(1.5Hz × t + wobblePhase)`
  - Opacity decay as bubble approaches surface
  - On surface reach: fire micro ripple event, remove bubble from pool
  - _Requirements: 38.5_

  - [ ]* 5.3.2a Write unit test for bubble rise position formula at t=0, t=0.5s, t=2s
    - _Requirements: 38.5_


## Feature 5.4: Ripple Overlay and Ring Rendering (Layers 5, Rings, Pegs)

**Purpose:** Implement the surface ripple overlay, ring rendering with skin/highlight/shadow, and peg rendering with glow.
**Architecture:** `RippleSystem.ts`; `RingRenderer.tsx`; `PegRenderer.tsx`; all via Skia canvas; ripple pool max 20; ring inner highlight arc; drop shadow; peg glow pulse.
**Dependencies:** Features 5.1, 5.2, 5.3
**Acceptance Criteria:** Ripples expand correctly per type parameters; ring inner highlight visible at 30° upper-left; drop shadow scales with ring height; peg glow pulses at 1.5Hz when ring settled.
**Edge Cases:** Multiple simultaneous ripple triggers on fast input; ring texture atlas loaded only during GameScreen.
**Testing Requirements:** Unit tests for ripple expansion formula; visual regression test.

- [ ] 5.4.1 Implement Layer 5: RippleSystem
  - `src/features/game/rendering/RippleSystem.ts`
  - Pool: max 20 ripples; oldest culled on overflow
  - 4 ripple types: bubble pop (0.3 opacity, 600ms, 80px/s), ring surface break (0.5, 800ms, 100px/s), button press (0.4, 1000ms, 120px/s), rain drop (0.25, 500ms, 60px/s)
  - Render via `drawCircle` with stroke style; color = water color at 80% lightness
  - _Requirements: 43.4_

  - [ ]* 5.4.1a Write unit test for ripple radius and opacity formula per type at t=0, midlife, end
    - _Requirements: 43.4_

- [ ] 5.4.2 Implement RingRenderer with highlight and drop shadow
  - `src/features/game/rendering/RingRenderer.tsx`
  - Ring body: torus shape in active skin color/texture (from ring atlas)
  - Inner highlight: 70% opacity white arc, 30° at upper-left, 3px stroke
  - Drop shadow: soft elliptical shadow below ring, scales with ring height above bottom
  - Settled ring: pulsing colored glow at 1.5Hz, opacity 0.3–0.8
  - Near-peg ring: glow pulse at 1.5Hz activates within 100px of correct peg
  - _Requirements: 36.2, 36.6_

  - [ ]* 5.4.2a Write visual regression test for ring rendering (snapshot)
    - _Requirements: 36.2_

- [ ] 5.4.3 Implement PegRenderer with glow and accepted-ring indicator
  - `src/features/game/rendering/PegRenderer.tsx`
  - Peg body: conical shape in peg color; glow color matches required ring colorId
  - When ring settled: glow pulses at 1.5Hz between opacity 0.3–0.6
  - Peg visual indicator: shows required ring color/size via icon
  - _Requirements: 36.6_

  - [ ]* 5.4.3a Write unit test for peg glow color mapping (colorId → glow color)
    - _Requirements: 36.6_

## Feature 5.5: Device Tier Rendering Management

**Purpose:** Implement device-tier-based layer toggling and performance scaling.
**Architecture:** Tier detection result from Epic 1 benchmark; read from MMKV; settings override; conditional layer rendering; Low Power Mode listener.
**Dependencies:** Features 5.1–5.4; Feature 1.6
**Acceptance Criteria:** High-end: all 5 layers; Mid-range: layers 1–4; Low-end: layers 1–2 only; manual override persists; Low Power Mode downgrades one tier.
**Testing Requirements:** Integration test for tier detection → layer count correlation.

- [ ] 5.5.1 Implement device tier layer management in WaterRenderer
  - Read `device_performance_tier` from MMKV; apply settings override if present
  - High-end: all layers active; Mid: disable layers 4–5; Low: disable layers 3–5
  - Listen for `RNDeviceInfo` Low Power Mode / Battery Saver events; downgrade one tier
  - _Requirements: 44.1, 44.2, 44.3, 44.5, 44.6_

  - [ ]* 5.5.1a Write integration test for tier → active layer count mapping
    - _Requirements: 44.1, 44.2, 44.3_

## Epic 5: Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["5.1.1", "5.1.2"] },
    { "id": 1, "tasks": ["5.1.1a", "5.1.2a", "5.1.2b", "5.1.3"] },
    { "id": 2, "tasks": ["5.1.3a", "5.2.1", "5.3.1"] },
    { "id": 3, "tasks": ["5.2.1a", "5.2.2", "5.3.1a", "5.3.2"] },
    { "id": 4, "tasks": ["5.2.2a", "5.2.2b", "5.3.2a", "5.4.1"] },
    { "id": 5, "tasks": ["5.4.1a", "5.4.2", "5.4.3"] },
    { "id": 6, "tasks": ["5.4.2a", "5.4.3a", "5.5.1"] },
    { "id": 7, "tasks": ["5.5.1a"] }
  ]
}
```

**Critical Path:** 5.1.1 → 5.1.2 → 5.1.3 → 5.2.1 → 5.4.1 → 5.4.2
**Parallelizable:** Bubble system (5.3.x) runs in parallel with Layer 2–3 (5.2.x); RingRenderer and PegRenderer (5.4.2–5.4.3) are independent
**Blocking Tasks:** 5.1.1 (WaterRenderer base) blocks all layers; 5.1.2 (shader) is independent critical path

---


# Epic 6: Challenge Generator

**Objectives:** Implement the deterministic 12-step challenge generation pipeline, xoshiro128** PRNG, all 24 challenge templates, Poisson disk peg placement, solvability validation, quality scoring, and challenge intelligence metadata.
**Business Value:** The challenge generator is the game's infinite content engine. Without it, the game has no levels. A high-quality generator produces content that keeps players engaged for years without handcrafted level design.
**Dependencies:** Epics 1, 2; Physics properties must be defined (Epic 4)
**Technical Risks:** xoshiro128** must produce identical results on iOS, Android, and JS (floating-point handling); forked sub-PRNGs must be correctly isolated; quality score calibration requires playtesting data.
**Success Criteria:** Challenge determinism property test passes at 1000 runs; difficulty monotonicity and ceiling properties pass; ≥95% of challenges pass quality score ≥0.65 without retries; 20 golden replay fixtures pass.
**Estimated Duration:** Weeks 5–9 (Milestone 3)
**Required Roles:** Game Engineer (lead), QA Engineer
**Definition of Done:** All 12 pipeline steps implemented; all 24 templates registered; validation and quality scoring work; golden replays all pass; property tests for Properties 5–10 all pass.

---

## Feature 6.1: xoshiro128** PRNG Implementation

**Purpose:** Implement the xoshiro128** PRNG with fork capability and all required methods.
**Architecture:** `src/features/game/generation/SeedGenerator.ts`; pure TypeScript; uses only 32-bit integer operations; fork creates child PRNG from current state.
**Dependencies:** Epic 1
**Acceptance Criteria:** PRNG produces byte-identical results on iOS, Android, and Node.js; fork() creates independent sub-sequence; statistical quality passes Chi-squared test.
**Edge Cases:** JavaScript number overflow for 32-bit operations requires explicit `>>> 0` masking; PRNG state must be serializable for replay.
**Testing Requirements:** Property test for determinism; statistical quality test; unit tests for all PRNG methods.

- [x] 6.1.1 Implement xoshiro128** PRNG class
  - `src/features/game/generation/SeedGenerator.ts`
  - Methods: `seed(s0,s1,s2,s3)`, `nextFloat()`, `nextInt(min,max)`, `nextChoice<T>(array)`, `shuffle<T>(array)`, `fork()`
  - All operations use `>>> 0` masking for 32-bit unsigned arithmetic
  - Serializable state: `getState()` and `restoreState(state)` for replay
  - _Requirements: 11.1, 24.6_

  - [ ]* 6.1.1a Write unit tests for all PRNG methods with known seed values
    - Test: seed(1,2,3,4) → first 10 outputs match known reference values
    - _Requirements: 24.6_

  - [ ]* 6.1.1b Write property test for PRNG determinism
    - **Property 5 (partial): same seed → same output sequence**
    - `fc.property(fc.tuple(fc.integer(), fc.integer(), fc.integer(), fc.integer()), state => { const a = new PRNG(state), b = new PRNG(state); return range(100).every(i => a.nextFloat() === b.nextFloat()) })`
    - _Requirements: Property 5_

  - [x]* 6.1.1c Write statistical quality test (Chi-squared, 10,000 samples)
    - _Requirements: 24.6_


## Feature 6.2: Difficulty Calculator and Seed Architecture

**Purpose:** Implement the deterministic difficulty score D(N) function and master seed derivation formula.
**Architecture:** `DifficultyCalculator.ts`; pure functions of N; two-phase formula; component formulas for timer, ring count, peg size, obstacle count.
**Dependencies:** Feature 6.1
**Acceptance Criteria:** D(N) is non-decreasing; D(N) ≤ 100 for all N; reference values match spec table; MasterSeed derivation matches spec formula.
**Edge Cases:** Large N values (N=10,000,000) must not overflow; PRIME_A and SALT_GLOBAL must be configurable via Remote Config.
**Testing Requirements:** Property tests 9 and 10 (monotonicity and ceiling); unit tests for reference values.

- [x] 6.2.1 Implement DifficultyCalculator with two-phase D(N) formula
  - `src/features/game/generation/DifficultyCalculator.ts`
  - Phase 1 (N ≤ 1000): `D = 50 × log(1+N) / log(1001)`
  - Phase 2 (N > 1000): `D = 50 + 50 × (1 - e^(-(N-1000)/5000))`
  - Component formulas: timerBase, requiredRings, decoyRings, obstacleCount, modifierChance, currentStrength
  - _Requirements: 11.2_

  - [ ]* 6.2.1a Write unit tests for D(N) reference values from spec table
    - Test: D(1)=0.07, D(50)≈9.0, D(1000)=50.0, D(10000)≈84.1
    - _Requirements: 11.2_

  - [ ]* 6.2.1b Write property test: difficulty monotonicity
    - **Property 9: D(N+1) >= D(N) for all N >= 1**
    - `fc.property(fc.integer({min:1, max:99999}), N => D(N+1) >= D(N))`
    - **Validates: Requirement 11**
    - _Requirements: Property 9_

  - [ ]* 6.2.1c Write property test: difficulty ceiling
    - **Property 10: D(N) <= 100 for all N**
    - `fc.property(fc.integer({min:1, max:10000000}), N => D(N) <= 100)`
    - **Validates: Requirement 11**
    - _Requirements: Property 10_

- [x] 6.2.2 Implement MasterSeed and DailySeed derivation
  - `MasterSeed(N) = xoshiro128_init(splitmix64(N × PRIME_A + SALT_GLOBAL))`
  - `DailySeed(date) = xoshiro128_init(splitmix64(UnixDayNumber(date) × PRIME_B + SALT_DAILY))`
  - Challenge code encoding: `Base36(N) + "-" + LuhnCheckDigit(N)`
  - _Requirements: 11.1_

  - [x]* 6.2.2a Write unit test for challenge code encoding/decoding (Base36 + Luhn)
    - Test: N=527 → "EJ-8"; decode "EJ-8" → N=527
    - _Requirements: 11.1_


## Feature 6.3: Challenge Generation Pipeline (12 Steps)

**Purpose:** Implement all 12 steps of the challenge generation pipeline using forked sub-PRNGs.
**Architecture:** `ChallengeGenerator.ts`; pure function; 12 ordered steps; forked PRNGs at steps 5–11; Poisson disk sampling for peg placement; timer and modifier computation.
**Dependencies:** Features 6.1, 6.2
**Acceptance Criteria:** `generate(N)` produces identical ChallengeConfig on any device; forked PRNGs isolate steps; all rejection rules correctly applied; daily challenge uses date seed.
**Edge Cases:** Maximum 5 seed-offset retries on validation failure; quality below threshold reduces difficulty one step after 5 retries.
**Testing Requirements:** Property test for challenge determinism (1000 runs); property tests for peg separation and bijection.

- [x] 6.3.1 Implement Poisson Disk peg placement (Step 5)
  - `src/features/game/generation/ChallengeGenerator.ts` (step 5 logic)
  - Poisson disk sampling using forked PRNG; minimum separation = `minPegSeparation(D(N))`
  - All peg positions within arena bounds
  - _Requirements: 11.2, 11.3_

  - [ ]* 6.3.1a Write property test for peg minimum separation
    - **Property 6: all peg pairs satisfy distance >= minPegSeparation(D(N))**
    - `fc.property(fc.integer({min:1,max:10000}), N => allPegsMinSeparated(generateChallenge(N)))`
    - **Validates: Requirement 11**
    - _Requirements: Property 6_

- [x] 6.3.2 Implement ring placement, obstacle placement, and bijection (Steps 6–7)
  - Ring initial positions in upper half of arena with minimum separation
  - Ring-to-peg assignment: bijection (one-to-one, no sharing)
  - Decoy rings assigned no target peg
  - Obstacle placement after pegs and rings to prevent overlaps
  - _Requirements: 11.2_

  - [ ]* 6.3.2a Write property test for ring-peg bijection
    - **Property 7: every required ring maps to exactly one peg; no two rings share a peg**
    - `fc.property(fc.integer({min:1,max:10000}), N => isStrictBijection(generateChallenge(N).ringToPegMap))`
    - **Validates: Requirement 11**
    - _Requirements: Property 7_

- [x] 6.3.3 Implement water current, timer, physics modifiers, environment (Steps 8–11)
  - Step 8: CurrentX = random [-1,1]; magnitude scales with ND
  - Step 9: `TimerBase = 180 - 120 × ND`; add variance; apply template multiplier
  - Step 10: modifier selection with probability `min(0.6, ND × 0.8)`
  - Step 11: weather/lighting variant from environment config
  - _Requirements: 11.2_

  - [ ]* 6.3.3a Write unit tests for timer formula at D=0, D=50, D=100
    - _Requirements: 11.2_

- [ ] 6.3.4 Implement complete `generate(N)` pipeline orchestration
  - Run all 12 steps in order with forked PRNGs at steps 5–11
  - Return complete `ChallengeConfig`
  - Also implement `generateDaily(date)` using DailySeed
  - _Requirements: 11.1, 11.2, 11.3, 11.6_

  - [ ]* 6.3.4a Write property test for challenge generation determinism
    - **Property 5: generate(N) returns byte-identical ChallengeConfig on repeated calls**
    - `fc.property(fc.integer({min:1,max:10000000}), N => deepEqual(generate(N), generate(N)))`
    - **Validates: Requirements 11, 24**
    - _Requirements: Property 5_


## Feature 6.4: Solvability Validation and Quality Scoring

**Purpose:** Implement the heuristic solver, solvability validation, and 5-component quality scoring system.
**Architecture:** `ValidationSolver.ts`; `ChallengeScorer.ts`; `QualityEvaluator.ts`; 3 solver strategies; quality = weighted sum of 5 components; rejection rules.
**Dependencies:** Feature 6.3
**Acceptance Criteria:** Solver runs 3 strategies; score = weighted sum; minimum threshold 0.65; all automatic rejection rules applied; ≥95% of challenges pass without retry.
**Edge Cases:** Solver must complete within 80ms budget; pathological challenges trigger max 5 retries.
**Testing Requirements:** Unit tests for each quality component; integration test for full validation pipeline.

- [ ] 6.4.1 Implement ValidationSolver with 3 solver strategies
  - `src/features/game/generation/ValidationSolver.ts`
  - Strategy 1: greedy nearest-peg approach
  - Strategy 2: global ordering (largest ring first)
  - Strategy 3: random order with random button sequence
  - `SolvabilityScore`: all 3 pass → 1.0; 2/3 → 0.7; 1/3 → 0.4; 0/3 → rejected
  - _Requirements: 11.4_

  - [ ]* 6.4.1a Write unit tests for each solver strategy on known challenges
    - _Requirements: 11.4_

- [ ] 6.4.2 Implement ChallengeScorer and QualityEvaluator
  - `ChallengeScorer.ts`: compute FunScore, FairnessScore, VarietyScore, PacingScore
  - `QualityEvaluator.ts`: `QualityScore = 0.30×Solvability + 0.25×Fun + 0.20×Fairness + 0.15×Variety + 0.10×Pacing`
  - Apply all automatic rejection rules (impossible, too trivial, timer mismatch, etc.)
  - _Requirements: 11.5_

  - [ ]* 6.4.2a Write unit tests for quality score computation with known component values
    - Test: known components → correct weighted sum
    - _Requirements: 11.5_

- [ ] 6.4.3 Implement Challenge Intelligence Metadata generation (Step 12)
  - `ChallengeIntelligence` object: predictedSolveTime, predictedCompletionRate, predictedRetryCount, structuralMetrics
  - Computed from solver run results and challenge config analysis
  - Stored with ChallengeConfig; later enriched with actual player data from Cloud Function
  - _Requirements: 11.2_

  - [ ]* 6.4.3a Write unit test for metadata computation from solver results
    - _Requirements: 11.2_

## Feature 6.5: Template Registry (24 Templates)

**Purpose:** Implement all 24 challenge template definitions with per-template physics modifiers and timer multipliers.
**Architecture:** `TemplateRegistry.ts`; each template is a typed object with: id, name, first-appearance N, physics modifiers, timer multiplier, peg constraints; weighted selection per difficulty range.
**Dependencies:** Feature 6.2
**Acceptance Criteria:** All 24 templates registered; template first-appearance N respected; weight functions produce correct distribution; Precision template uses ±8° angle constraint.
**Edge Cases:** Template combinations in forbidden list must be rejected by validator.
**Testing Requirements:** Unit tests for template selection weights at each difficulty range.

- [x] 6.5.1 Implement TemplateRegistry with all 24 template definitions
  - `src/features/game/generation/TemplateRegistry.ts`
  - Templates include: Standard, Precision, Moving Pegs, Limited Presses, Strong Current, Pressure Zones, Maze Navigation, Boss variants, and all others from design.md
  - Each template: physics modifiers, timer multiplier, first-appearance challenge number, weight function
  - `getTemplateById(id)` and `selectTemplate(prng, D, N)` methods
  - _Requirements: 11.1_

  - [ ]* 6.5.1a Write unit tests for template selection weighted distribution
    - Test: D=5 → Standard template dominates; D=80 → advanced templates appear
    - _Requirements: 11.1_

- [ ] 6.5.2 Create 20 golden replay challenge fixtures
  - Run generator for challenges 1, 10, 50, 100, 250, 500, 1000, and 13 additional hand-selected challenges
  - Store `ChallengeConfig` as JSON fixtures in `__tests__/fixtures/golden/`
  - CI test: re-generate and compare byte-for-byte
  - _Requirements: 24.8, 47.2_

  - [ ]* 6.5.2a Write golden replay CI test runner
    - `__tests__/integration/goldenReplay.test.ts`: load 20 fixtures, regenerate, compare
    - _Requirements: 47.2, 47.3_

## Epic 6: Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["6.1.1"] },
    { "id": 1, "tasks": ["6.1.1a", "6.1.1b", "6.1.1c", "6.2.1"] },
    { "id": 2, "tasks": ["6.2.1a", "6.2.1b", "6.2.1c", "6.2.2"] },
    { "id": 3, "tasks": ["6.2.2a", "6.3.1", "6.3.2", "6.3.3", "6.5.1"] },
    { "id": 4, "tasks": ["6.3.1a", "6.3.2a", "6.3.3a", "6.3.4"] },
    { "id": 5, "tasks": ["6.3.4a", "6.4.1"] },
    { "id": 6, "tasks": ["6.4.1a", "6.4.2"] },
    { "id": 7, "tasks": ["6.4.2a", "6.4.3", "6.5.1a"] },
    { "id": 8, "tasks": ["6.4.3a", "6.5.2"] },
    { "id": 9, "tasks": ["6.5.2a"] }
  ]
}
```

**Critical Path:** 6.1.1 → 6.2.1 → 6.3.4 → 6.4.1 → 6.4.2 → 6.5.2
**Parallelizable:** Template registry (6.5.1) can start at same time as 6.3.1–6.3.3; quality components (6.4.2) is independent of solver strategies (6.4.1)
**Blocking Tasks:** 6.1.1 (PRNG) blocks everything; 6.3.4 (full pipeline) blocks validation and golden replay

---


# Epic 7: Gameplay Loop

**Objectives:** Implement the complete end-to-end gameplay loop: challenge loading, active gameplay session, timer continue flow, adaptive difficulty assistance, boss challenges, and the full onboarding experience for challenges 1–20.
**Business Value:** The first 20 challenges determine D1 retention. Players who complete all 20 tutorial challenges have 4× higher 30-day retention than those who drop before challenge 10. The continue flow is the primary monetization touchpoint for the first 90 days.
**Dependencies:** Epics 1–6
**Technical Risks:** Adaptive difficulty assistance must be invisible — players must never feel "cheated"; continue modal timing must balance revenue and retention; onboarding flow must be frictionless.
**Success Criteria:** Complete challenge playable; continue flow works with coins and ads; adaptive assistance activates on frustration; onboarding completes without rage-quits; timer counts correctly.
**Estimated Duration:** Weeks 9–13 (Milestone 5, partial)
**Required Roles:** Game Designer + Engineer (lead), Mobile Engineer
**Definition of Done:** Full challenge lifecycle works; continue grants bonus time; adaptive assist activates; onboarding challenges 1–20 all have tutorial guidance.

---

## Feature 7.1: Challenge Loading and Session Management

**Purpose:** Implement challenge loading, session state initialization, and session lifecycle management.
**Architecture:** `GameScreen.tsx` orchestrates; `challengeSlice` owns session state; `ChallengeGenerator.generate(N)` provides config; session ends on win, loss, or quit.
**Dependencies:** Epics 2–6
**Acceptance Criteria:** Challenge loads in < 500ms; physics state initialized correctly from ChallengeConfig; session state destroyed on end; new session starts fresh; offline play works fully.
**Edge Cases:** Resume from background mid-challenge; app kill recovery from MMKV checkpoint.
**Testing Requirements:** Integration test for full challenge lifecycle (start → play → win).

- [ ] 7.1.1 Implement challenge loading in GameScreen
  - Read challenge number from navigation params or challengeSlice
  - Call `ChallengeGenerator.generate(N)` (or daily variant)
  - Initialize PhysicsWorld with generated config
  - Load audio theme, water shader uniforms for challenge theme
  - Navigate to GameScreen with config; challenge load time < 500ms
  - _Requirements: 43.6, 43.7_

  - [ ]* 7.1.1a Write integration test for full challenge load pipeline (< 500ms)
    - _Requirements: 43.6_

- [ ] 7.1.2 Implement session lifecycle: start, win, loss, quit flows
  - Challenge start: initialize all systems; write MMKV checkpoint; log `challenge_start` analytics
  - Win flow: pause physics; dispatch `win_condition_met`; show VictoryModal; compute rewards
  - Loss flow: timer expires; dispatch `timer_expired`; show ContinueModal; if declined show DefeatModal
  - Quit flow: show confirmation dialog; navigate back to HomeScreen; no partial rewards
  - _Requirements: 9.1, 20.6_

  - [ ]* 7.1.2a Write integration test for win → victory modal flow
    - _Requirements: 9.1_

  - [ ]* 7.1.2b Write integration test for loss → continue modal → defeat modal flow
    - _Requirements: 20.6_


## Feature 7.2: Continue Flow and Adaptive Difficulty Assistance

**Purpose:** Implement the continue mechanic (coins and watch-ad paths) and the invisible adaptive difficulty assistance layer.
**Architecture:** `ContinueModal` component; `EconomyService.spendCoins` or `AdService.watchRewardedAd`; `AdaptiveAssistController.ts` monitors frustration and applies invisible assistance.
**Dependencies:** Features 7.1, Epic 12 (economy), Epic 9 (ads)
**Acceptance Criteria:** Continue cost escalates per formula; bonus time added correctly; ad path works when coins insufficient; adaptive assist activates on frustration; assist never visible to player.
**Edge Cases:** Continue cost must never go negative; ad not available → coin fallback only; assist must not activate on first attempt.
**Testing Requirements:** Property tests for continue cost escalation and bonus time bounds (Properties 12, 16).

- [ ] 7.2.1 Implement continue cost formula and spendCoins integration
  - `continueCost(D, n)`: cost escalates per design (n=1 base, increases each continue)
  - Check balance before deducting; show "insufficient coins" if balance low
  - Add bonus time via `TimerController.addBonusTime(continueBonusTime(D))`
  - Log `continue_used` analytics event
  - _Requirements: 16.2_

  - [ ]* 7.2.1a Write property test: continue cost escalation
    - **Property 12: ContinueCost(D, n+1) > ContinueCost(D, n) for all D and n >= 1**
    - `fc.property(fc.tuple(fc.float({min:0,max:100}), fc.integer({min:1,max:10})), ([D,n]) => continueCost(D,n+1) > continueCost(D,n))`
    - **Validates: Requirement 30**
    - _Requirements: Property 12_

  - [ ]* 7.2.1b Write property test: continue bonus time bounded
    - **Property 16: continueBonusTime(D) <= originalChallengeTimer(D)**
    - `fc.property(fc.float({min:0,max:100}), D => continueBonusTime(D) <= timerBase(D))`
    - **Validates: Requirement 30**
    - _Requirements: Property 16_

- [ ] 7.2.2 Implement AdaptiveAssistController
  - `src/features/game/adaptive/AdaptiveAssistController.ts`
  - `recordAttempt(result)`: track fail count per challenge
  - `recordQuit(progress)`: track abandonment
  - Frustration triggers: ≥3 failures in 30 min on same challenge; 2+ consecutive quits; max continues used and still lost
  - Active assists: near-miss bonus seconds, subtle current boost, ring size hint glow
  - `getActiveAssists()`, `shouldShowSkipOption()`, `getNearMissBonusSeconds()`, `reset(N)`
  - _Requirements: 16.2_

  - [ ]* 7.2.2a Write unit tests for frustration trigger conditions
    - Test: exactly 3 failures triggers; 2 failures does not; consecutive quits logic
    - _Requirements: 16.2_

  - [ ]* 7.2.2b Write unit test for assist invisibility (no UI change, only physics parameter change)
    - _Requirements: 16.2_

## Feature 7.3: Onboarding Challenges 1–20

**Purpose:** Implement the full new player experience with tutorial guidance for challenges 1–20.
**Architecture:** `onboardingSlice` tracks tutorial state; tutorial overlays use Reanimated; guidance is challenge-specific; account prompt at appropriate challenge numbers.
**Dependencies:** Features 7.1, 7.2; Epic 8 (UI)
**Acceptance Criteria:** Each of challenges 1–20 has appropriate tutorial guidance; guidance disappears permanently once player has performed the action; account prompt appears at correct challenge; no prompt before challenge 10.
**Edge Cases:** Player who clears app data must see tutorial again; tutorial must not interfere with physics; tutorial overlays must be accessible.
**Testing Requirements:** E2E test for full onboarding flow (challenges 1–5 as representative subset).

- [ ] 7.3.1 Implement onboarding tutorial overlays for challenges 1–5
  - Challenge 1: left/right button introduction with animated arrows
  - Challenge 2: introduction of hold mechanic (hold prompt after 3 taps)
  - Challenge 3: ring size introduction (large ring requires more force)
  - Challenge 4: multi-ring introduction
  - Challenge 5: peg color matching explanation
  - All overlays use Reanimated spring animations; dismissed on first correct action
  - _Requirements: 28.4, 6.7_

  - [ ]* 7.3.1a Write E2E test for challenge 1 tutorial dismissal on button press
    - _Requirements: 28.4_

- [ ] 7.3.2 Implement tutorial state tracking and feature unlock flow
  - `onboardingSlice`: track per-challenge tutorial completion flags
  - Feature gates: timer visible from challenge 3; continue visible from challenge 6; daily challenge unlocked at challenge 15; leaderboard unlocked at challenge 20
  - Account prompt: shown at challenge 10 (dismissible) and challenge 25 (dismissible, no earlier)
  - _Requirements: 28.4_

  - [ ]* 7.3.2a Write unit tests for feature unlock conditions
    - Test: timer not shown before challenge 3; leaderboard not shown before challenge 20
    - _Requirements: 28.4_

## Epic 7: Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["7.1.1"] },
    { "id": 1, "tasks": ["7.1.1a", "7.1.2"] },
    { "id": 2, "tasks": ["7.1.2a", "7.1.2b", "7.2.1"] },
    { "id": 3, "tasks": ["7.2.1a", "7.2.1b", "7.2.2"] },
    { "id": 4, "tasks": ["7.2.2a", "7.2.2b", "7.3.1"] },
    { "id": 5, "tasks": ["7.3.1a", "7.3.2"] },
    { "id": 6, "tasks": ["7.3.2a"] }
  ]
}
```

**Critical Path:** 7.1.1 → 7.1.2 → 7.2.1 → 7.2.2 → 7.3.1 → 7.3.2
**Parallelizable:** Onboarding tutorial (7.3.x) can run after 7.1.2 without waiting for adaptive assist (7.2.2)
**Blocking Tasks:** 7.1.1 (challenge loading) blocks all gameplay; 7.2.1 (continue flow) blocks monetization

---


# Epic 8: UI (All 18 Screens)

**Objectives:** Implement all 18 screens with complete navigation, all reusable components, frosted glass/modal overlays, bottom navigation, and all screen-specific UI per the design spec. All components must be accessible and meet WCAG 2.5.5 touch targets.
**Business Value:** UI quality is the first impression. Players decide to continue or delete in the first 30 seconds based on UI polish. All 18 screens must be production-quality for launch.
**Dependencies:** Epics 1–7 (core gameplay), Epic 11 (progression data), Epic 12 (economy data), Epic 13 (Firebase data)
**Technical Risks:** React Navigation deep-link handling on both platforms; frosted glass blur effect performance on Android; Bottom tab re-render optimization; Lottie animation memory management.
**Success Criteria:** All 18 screens render without crashes on both platforms; all navigation paths work; all modals dismiss correctly; WCAG 2.5.5 touch targets met; reduced-motion alternatives work.
**Estimated Duration:** Weeks 12–17 (Milestone 7)
**Required Roles:** UI/UX Engineer (lead), React Native Engineer
**Definition of Done:** All 18 screens implemented; all modals working; navigation complete; accessibility props on all interactive elements; reduced-motion alternatives active.

---

## Feature 8.1: Core Navigation and App Shell

**Purpose:** Implement the complete React Navigation structure with all 18 screens, bottom tab bar, and deep-link support.
**Architecture:** React Navigation 6; Stack navigator for gameplay screens; Tab navigator for home/leaderboard/store/profile; modal presentations for overlays.
**Dependencies:** Epic 1 (scaffold)
**Acceptance Criteria:** All 18 routes registered; bottom nav 4 tabs with active state; deep links work for challenge sharing; all transitions use 300ms ease or reduced-motion fade.
**Testing Requirements:** Unit tests for navigation route registration; integration test for bottom tab switching.

- [ ] 8.1.1 Implement React Navigation stack and tab structure
  - Stack navigator: Splash → Loading → Home → Game → Pause → Victory → Defeat → Continue → Leaderboard → Achievements → Inventory → Collection → Store → Settings → DailyChallenge → Profile → Statistics → ReplayViewer
  - Bottom tab navigator: Home, Leaderboard, Store, Profile (4 tabs with filled icons + accent underline)
  - _Requirements: 34.7, 6.7_

  - [ ]* 8.1.1a Write unit test for navigation route completeness (all 18 screens registered)
    - _Requirements: 6.7_

- [ ] 8.1.2 Implement deep-link configuration for challenge sharing
  - URL scheme: `waterring://challenge/{N}` and `waterring://replay/{id}`
  - Handle deep links in `Navigation.tsx`; navigate to correct screen with params
  - _Requirements: 34.7_

  - [ ]* 8.1.2a Write unit test for deep-link URL parsing
    - _Requirements: 34.7_

- [ ] 8.1.3 Implement BottomNav component with 4 tabs
  - Tabs: Home (house icon), Leaderboard (trophy), Store (bag), Profile (person)
  - Active tab: filled icon + accent color underline
  - Haptic `navigationTap` on each tab press
  - `accessibilityRole="button"`, `accessibilityLabel` per tab
  - _Requirements: 34.7, 15.3_

  - [ ]* 8.1.3a Write accessibility test for BottomNav tab labels
    - _Requirements: 33.6_


## Feature 8.2: GameScreen and HUD Components

**Purpose:** Implement the GameScreen with all HUD components: WaterButton, TimerArc, ChallengeHUD, and PressCounterHUD.
**Architecture:** `GameScreen.tsx` composes rendering and HUD layers; `WaterButton.tsx` with gesture handling; `TimerArc.tsx` as SVG arc; `ChallengeHUD.tsx` as top overlay.
**Dependencies:** Features 8.1, Epic 3 (game loop), Epic 5 (rendering)
**Acceptance Criteria:** WaterButton minimum 88×88dp; depress 3dp on press; ripple emits on press; TimerArc depletes clockwise; amber at 30%; red + 1Hz pulse at 10%; HUD in minimum safe area.
**Edge Cases:** Timer arc must handle 0% gracefully; PressCounter must show shake on < 10 presses.
**Testing Requirements:** Unit tests for TimerArc arc calculation; accessibility test for WaterButton.

- [ ] 8.2.1 Implement WaterButton component
  - `src/screens/` (composed in GameScreen)
  - Min touch target: 88×88dp; depress 3dp in 50ms, spring back 150ms on release
  - Emit radial water ripple at press origin (Layer 5 ripple system)
  - Fire `buttonTap` haptic on press start
  - Props: `side`, `onPressIn`, `onPressOut`, `disabled`, `skin`, `accessibilityLabel`
  - `accessibilityRole="button"`, non-empty `accessibilityLabel`
  - _Requirements: 33.1, 33.2, 33.6, 33.7_

  - [ ]* 8.2.1a Write unit tests for WaterButton press events and haptic trigger
    - _Requirements: 33.1, 33.2_

  - [ ]* 8.2.1b Write accessibility test: touch target ≥ 88dp; accessibilityLabel present
    - _Requirements: 33.7_

- [ ] 8.2.2 Implement TimerArc component
  - Circular arc that depletes clockwise; computed as SVG `drawArc` path
  - Color shift to amber over 500ms at 30%; color shift to red over 300ms + 1Hz pulse at 10%
  - Display remaining time numerically in center
  - _Requirements: 33.3, 36.5_

  - [ ]* 8.2.2a Write unit test for arc angle computation at 100%, 50%, 30%, 10%, 0%
    - _Requirements: 33.3_

- [ ] 8.2.3 Implement ChallengeHUD and PressCounterHUD
  - `ChallengeHUD`: challenge number, template icon, TimerArc, star progress (0–3), continue count
  - In top safe area; minimal footprint; all elements accessible
  - `PressCounterHUD` (Limited Presses template only): remaining press budget; shake + red shift at ≤10
  - _Requirements: 33.4, 33.5_

  - [ ]* 8.2.3a Write unit test for PressCounterHUD shake trigger at threshold
    - _Requirements: 33.5_

## Feature 8.3: Modals and Overlays

**Purpose:** Implement all game overlay components: PauseOverlay, ContinueModal, VictoryModal, DefeatModal, and AchievementUnlockBanner.
**Architecture:** All modals use React Navigation modal presentation; frosted glass via BlurView; animations via Reanimated; auto-dismiss with user-interaction pause.
**Dependencies:** Feature 8.1, Epic 7 (gameplay)
**Acceptance Criteria:** VictoryModal star animation sequence ≥4 seconds; ContinueModal auto-dismiss pauses on interaction; DefeatModal never uses "FAIL"; all overlays have reduced-motion alternatives.
**Testing Requirements:** Integration tests for victory/defeat modal flows; accessibility test for modal labels.

- [ ] 8.3.1 Implement PauseOverlay with frosted glass
  - Frosted glass via `@react-native-community/blur` (BlurView)
  - Buttons: Resume, Restart (with confirmation), Settings shortcut, Quit to Home
  - Pause audio on show, fade music to 15% volume
  - _Requirements: 34.1_

  - [ ]* 8.3.1a Write integration test: pause → resume returns to exact game state
    - _Requirements: 34.1_

- [ ] 8.3.2 Implement ContinueModal with 10-second auto-dismiss
  - Display: rings placed progress, remaining time, bonus time to be granted, cost (coins or Watch Ad), Cancel
  - 10-second auto-dismiss countdown (visible progress bar)
  - Auto-dismiss PAUSES on user touch; resumes when touch ends
  - _Requirements: 34.2_

  - [ ]* 8.3.2a Write unit test for auto-dismiss timer pause on touch
    - _Requirements: 34.2_

- [ ] 8.3.3 Implement VictoryModal with complete animation sequence
  - Stars flip one-by-one (250ms each, 100ms gap)
  - Coins arc to counter with trail particles (600–800ms)
  - XP bar shimmer fill (600ms)
  - Total sequence ≥ 4 seconds
  - _Requirements: 34.3, 37.1_

  - [ ]* 8.3.3a Write unit test for VictoryModal animation sequence timing
    - Test: all animations fire in correct order; total duration ≥ 4s
    - _Requirements: 34.3_

- [ ] 8.3.4 Implement DefeatModal and AchievementUnlockBanner
  - DefeatModal: rings-placed progress; CTA "Continue"; never uses "FAIL"/"FAILED"
  - AchievementUnlockBanner: slide down 400ms, display 2200ms, slide up 400ms; dismissible by tap; particle burst on appearance
  - Reduced-motion alternative: opacity fade instead of slide for both
  - _Requirements: 34.4, 34.5, 34.6_

  - [ ]* 8.3.4a Write accessibility test: DefeatModal has no "FAIL" text
    - _Requirements: 34.4_

  - [ ]* 8.3.4b Write unit test for AchievementBanner timing sequence
    - _Requirements: 34.5_


## Feature 8.4: Secondary Screens (Store, Leaderboard, Profile, Collection, Settings)

**Purpose:** Implement all secondary screens with their specific components: CosmeticCard, LeaderboardRow, CollectionCard, ProfileCard, StatisticsChart, and SettingsScreen.
**Architecture:** Each screen reads from relevant Zustand slice; components are pure display components receiving data via props; Reanimated-driven chart animations; WCAG accessibility throughout.
**Dependencies:** Features 8.1, Epic 11 (progression), Epic 12 (economy), Epic 13 (Firebase)
**Acceptance Criteria:** All store items display correctly; leaderboard player row pinned at bottom; collection shows grey for missing items; profile shows correct data; charts animate on screen entry.
**Testing Requirements:** Unit tests for component rendering with mock data; accessibility tests.

- [ ] 8.4.1 Implement StoreScreen with CosmeticCard component
  - `CosmeticCard`: thumbnail, name, tier badge, price in coins or "OWNED" badge; tap-to-preview
  - Grid layout; filter by category (ring skins, water colors, victory animations, etc.)
  - Purchase flow calls `EconomyService.spendCoins`
  - _Requirements: 35.1_

  - [ ]* 8.4.1a Write unit tests for CosmeticCard with owned/unowned/locked states
    - _Requirements: 35.1_

- [ ] 8.4.2 Implement LeaderboardScreen with LeaderboardRow component
  - `LeaderboardRow`: rank, avatar, display name, rank badge, score, time, ghost replay button
  - Player's own row pinned at bottom of list
  - Filters: global/country/friends, today/week/allTime
  - Stale cache display with "Last updated [time]" indicator when offline
  - _Requirements: 35.2, 20.2_

  - [ ]* 8.4.2a Write unit tests for LeaderboardRow rendering with mock data
    - _Requirements: 35.2_

- [ ] 8.4.3 Implement CollectionScreen, ProfileScreen, StatisticsScreen
  - `CollectionCard`: full color for complete; grey missing items with "how to get" on tap
  - `ProfileCard`: avatar + frame + banner, username, title, rank badge + progress bar, 3 pinned achievements, completion score %
  - `StatisticsChart`: line (stars over time), area (coins earned vs spent), bar (challenges per template); all animate on entry
  - _Requirements: 35.3, 35.4, 35.5_

  - [ ]* 8.4.3a Write accessibility test for ProfileCard rank badge label
    - _Requirements: 35.4_

- [ ] 8.4.4 Implement SettingsScreen with all settings controls
  - Audio: master, music, ambient, SFX sliders
  - Haptics: global toggle, intensity slider (25/50/75/100%), gameplay and UI sub-toggles
  - Accessibility: reduced motion toggle, mono audio, color-blind preset selector, motor accessibility toggle
  - Language selector, Graphics Quality tier (manual override)
  - Privacy Policy and Terms of Service links
  - _Requirements: 17.4, 54.6_

  - [ ]* 8.4.4a Write integration test: change haptic intensity → verify HapticManager receives new scale
    - _Requirements: 15.4, 15.5_

## Feature 8.5: Remaining Screens (SplashScreen, HomeScreen, DailyChallengeScreen, AchievementsScreen, InventoryScreen, ReplayViewerScreen)

**Purpose:** Implement all remaining screens to complete the 18-screen requirement.
**Architecture:** Each screen reads from Zustand; SplashScreen handles app init sequence; HomeScreen is the primary hub; DailyChallenge shows daily countdown; ReplayViewer integrates ReplayPlayer.
**Dependencies:** Features 8.1–8.4, Epics 11, 12, 15
**Acceptance Criteria:** Splash → Loading → Home transition < 3s cold start; HomeScreen shows correct challenge state; daily challenge shows countdown timer; replay viewer has all controls.
**Testing Requirements:** E2E cold start timing test; unit tests for DailyChallenge countdown.

- [ ] 8.5.1 Implement SplashScreen and LoadingScreen
  - Splash: logo animation (Lottie); check Firebase Auth; load MMKV state; run device benchmark
  - Loading: progress indicator while Remote Config fetches and assets preload
  - Total splash → home time < 3 seconds (cold start target)
  - _Requirements: 43.5_

  - [ ]* 8.5.1a Write E2E cold start timing test (< 3s target, < 5s hard limit)
    - _Requirements: 43.5, 53.5_

- [ ] 8.5.2 Implement HomeScreen as primary hub
  - Show: current challenge number, next challenge preview, daily challenge countdown, streak, coin balance
  - Feature unlock gates (leaderboard, store, daily) per onboarding state
  - Play button navigates to GameScreen with next challenge number
  - _Requirements: 28.4_

  - [ ]* 8.5.2a Write integration test: HomeScreen shows correct challenge number and coin balance
    - _Requirements: 28.4_

- [ ] 8.5.3 Implement DailyChallengeScreen, AchievementsScreen, InventoryScreen, ReplayViewerScreen
  - Daily: countdown to midnight UTC reset; show today's challenge (global seed); leaderboard for today
  - Achievements: grid of all achievements (locked/unlocked); progress for in-progress
  - Inventory: ring skins, water colors, victory animations, button skins — with equip/unequip
  - ReplayViewer: play/pause, scrub bar, speed selector (0.25×–4×), step-frame, camera follow, reset
  - _Requirements: 13.4, 13.6_

  - [ ]* 8.5.3a Write unit tests for ReplayViewer playback speed selector
    - _Requirements: 13.4_

## Epic 8: Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["8.1.1", "8.1.2", "8.1.3"] },
    { "id": 1, "tasks": ["8.1.1a", "8.1.2a", "8.1.3a", "8.2.1", "8.2.2", "8.2.3"] },
    { "id": 2, "tasks": ["8.2.1a", "8.2.1b", "8.2.2a", "8.2.3a", "8.3.1", "8.3.4"] },
    { "id": 3, "tasks": ["8.3.1a", "8.3.2", "8.3.3"] },
    { "id": 4, "tasks": ["8.3.2a", "8.3.3a", "8.3.4a", "8.3.4b", "8.4.1", "8.4.2", "8.4.3", "8.4.4"] },
    { "id": 5, "tasks": ["8.4.1a", "8.4.2a", "8.4.3a", "8.4.4a", "8.5.1"] },
    { "id": 6, "tasks": ["8.5.1a", "8.5.2"] },
    { "id": 7, "tasks": ["8.5.2a", "8.5.3"] },
    { "id": 8, "tasks": ["8.5.3a"] }
  ]
}
```

**Critical Path:** 8.1.1 → 8.2.1 → 8.3.1 → 8.5.1 → 8.5.2 (nav → game UI → modals → shell)
**Parallelizable:** All secondary screens (8.4.1–8.4.4) can run in parallel; remaining screens (8.5.x) mostly independent
**Blocking Tasks:** 8.1.1 (navigation) blocks all screens; 8.2.1 (WaterButton) blocks gameplay UX

---


# Epic 9: Audio

**Objectives:** Implement the three-layer adaptive audio system: SFX (all events), ambient loops (per theme), and adaptive layered music (state-driven stem mixing). Implement HapticManager with all 25 events and graceful degradation.
**Business Value:** Audio is the emotional amplifier of gameplay. ASMR-quality water sounds and adaptive music are cited as top-3 retention drivers in the design philosophy. Haptics make the game feel alive in the player's hand.
**Dependencies:** Epics 1–3 (game events), Epic 8 (settings UI)
**Technical Risks:** React Native Track Player stem switching latency must be < 1 bar; audio session duck configuration differs between iOS and Android; haptic patterns must degrade cleanly on all device variants.
**Success Criteria:** All SFX events trigger on correct game events; music stems activate per state machine; haptics fire correctly on all supported devices; muted SFX triggers visual compensation cues; no audio memory leaks.
**Estimated Duration:** Weeks 9–13 (Milestone 5)
**Required Roles:** Audio Engineer (lead), Mobile Engineer
**Definition of Done:** All SFX events implemented; adaptive music state machine working; haptics for all 25 events working; audio session configured; visual compensation active when SFX muted.

---

## Feature 9.1: AudioEngine and SFX System

**Purpose:** Implement the AudioEngine orchestrator and all SFX events from the design catalog.
**Architecture:** `AudioEngine.ts` wraps React Native Sound (SFX) and React Native Track Player (music); event subscriptions via GameEventEmitter; volume settings from settingsSlice.
**Dependencies:** Epics 2, 3
**Acceptance Criteria:** All SFX events trigger on correct game event; spatial panning applied to collision events; ±8% pitch variation applied; muted SFX triggers visual compensation.
**Edge Cases:** SFX file not loaded (missing asset) must not crash; max concurrent SFX to prevent audio overload.
**Testing Requirements:** Integration test for each SFX trigger event mapping.

- [x] 9.1.1 Implement AudioEngine orchestrator with three-layer management
  - `src/features/audio/AudioEngine.ts`
  - Expose all methods from Requirement 14.1
  - Manage three independent layers: SFX, Ambient, Music
  - Configure platform audio session: duck external audio (iOS: `AVAudioSessionCategoryPlayback`; Android: `AUDIOFOCUS_GAIN`)
  - _Requirements: 14.1, 14.2, 14.5_

  - [ ]* 9.1.1a Write unit tests for AudioEngine state machine (pause/resume/victory/defeat)
    - _Requirements: 14.1_

- [x] 9.1.2 Implement SFXManager with all gameplay SFX events
  - `src/features/audio/SFXManager.ts`
  - All SFX from design catalog: button tap/hold, ring collisions, ring landing, timer events, victory, defeat, etc.
  - Spatial panning: ring-ring collision SFX panned by x-position relative to screen center
  - ±8% pitch variation: use challenge PRNG sub-seed for reproducibility in replays
  - Maximum 3 collision SFX per 100ms (throttle for spam prevention)
  - _Requirements: 14.1, 15.4_

  - [ ]* 9.1.2a Write integration tests for all SFX trigger-event mappings
    - Test: `ring_settled` event → ring-lands-on-peg SFX plays
    - _Requirements: 14.1_

- [ ] 9.1.3 Implement visual compensation for muted SFX
  - When SFX muted: subscribe to `14.6` flag; notify UI layer
  - Ring landing: sparkle animation on ring body (micro particle burst)
  - Button press: button flash animation (glow pulse 200ms)
  - `WaterButton` and `RingRenderer` accept `showVisualFeedback` prop
  - _Requirements: 14.6_

  - [ ]* 9.1.3a Write unit test: SFX muted → visual compensation components active
    - _Requirements: 14.6_


## Feature 9.2: Adaptive Music System

**Purpose:** Implement the state-driven layered music system with React Native Track Player stem mixing.
**Architecture:** `MusicLayerManager.ts` manages 4–6 stems per music theme; stems loaded as separate audio tracks; volume transitions use `TrackPlayer` volume APIs; state-driven mixing rules from design spec.
**Dependencies:** Feature 9.1
**Acceptance Criteria:** Base+Texture stems active from challenge start; Rhythm added on first ring moved; Melody added on first ring landed; Intensity stem added in final 20%; pause fades to 15%; resume fades back over 1.5 bars.
**Edge Cases:** Theme change while playing must crossfade seamlessly; boss challenge music activates immediately from start.
**Testing Requirements:** Integration test for stem activation state machine.

- [ ] 9.2.1 Implement MusicLayerManager with stem-based adaptive mixing
  - `src/features/audio/MusicLayerManager.ts`
  - Load all stems for active theme at challenge start
  - State machine for stem activation per mixing rules (from design.md)
  - `ChallengeStart` → Base + Texture; `FirstRingMoved` → add Rhythm at 0.6; `FirstRingLanded` → add Melody at 0.7; `Midpoint` → add Counter at 0.5; `TimerAmber` → Rhythm to 0.85, Melody to 0.5; `TimerCritical` → add Intensity at 0.7
  - Pause: fade all to 15% volume; Resume: fade to active levels over 1.5 bars
  - _Requirements: 14.2, 14.3, 14.4_

  - [ ]* 9.2.1a Write integration tests for music stem state transitions
    - Test each state transition fires correct stem activation
    - _Requirements: 14.2_

- [ ] 9.2.2 Implement ambient system and music theme crossfade
  - `src/features/audio/AudioEngine.ts` (ambient section)
  - Per-theme ambient loops; crossfade 1.5 seconds on theme change
  - Ambient mixed at 25–35% of SFX layer volume
  - Menu music: Base + Texture only; transition from menu to gameplay is smooth 2-second crossfade (music does not restart)
  - _Requirements: 14.2_

  - [ ]* 9.2.2a Write unit test for ambient crossfade timing (1.5s transition)
    - _Requirements: 14.2_

## Feature 9.3: HapticManager with all 25 Events

**Purpose:** Implement the HapticManager with platform capability detection, all 25 named haptic events, graceful degradation, and settings integration.
**Architecture:** `HapticManager.ts`; iOS: Taptic Engine via `RNHapticFeedback`; Android: VibrationEffect API; pattern-based triggering; global intensity scale from settings.
**Dependencies:** Epics 2, 3
**Acceptance Criteria:** All 25 events trigger correct pattern; unsupported devices: no-op without errors; global intensity scales all amplitudes; collision throttle 3/100ms; ring landing haptic is most satisfying event.
**Testing Requirements:** Unit tests for all 25 event pattern definitions; integration test for capability detection.

- [x] 9.3.1 Implement HapticManager with capability detection and all 25 events
  - `src/features/audio/HapticManager.ts`
  - Expose: `trigger(event)`, `triggerPattern(pattern)`, `cancelAll()`, `setGlobalIntensity(scale)`, `isSupported()`
  - Detect iOS Taptic Engine vs basic vibrator; detect Android API 26+ VibrationEffect vs legacy
  - On unsupported: all methods are no-ops (no exceptions)
  - Implement all 25 named events from design catalog with correct patterns
  - Ring collision throttle: max 3 per 100ms
  - _Requirements: 15.1, 15.2, 15.3, 15.4_

  - [ ]* 9.3.1a Write unit tests for all 25 haptic event pattern definitions
    - Test: each event has correct amplitude and timing arrays
    - _Requirements: 15.3_

  - [ ]* 9.3.1b Write unit test: unsupported device → trigger() is no-op without error
    - _Requirements: 15.2_

- [x] 9.3.2 Implement global intensity scaling and settings integration
  - `setGlobalIntensity(scale)`: multiply all amplitude values by scale
  - At 0% intensity: all haptics suppressed (no vibration)
  - Read initial intensity from `settingsSlice.hapticIntensity`; subscribe to setting changes
  - _Requirements: 15.5_

  - [ ]* 9.3.2a Write unit test: intensity 0% → trigger produces no vibration
    - _Requirements: 15.5_

## Epic 9: Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["9.1.1", "9.3.1"] },
    { "id": 1, "tasks": ["9.1.1a", "9.1.2", "9.3.1a", "9.3.1b", "9.3.2"] },
    { "id": 2, "tasks": ["9.1.2a", "9.1.3", "9.3.2a"] },
    { "id": 3, "tasks": ["9.1.3a", "9.2.1"] },
    { "id": 4, "tasks": ["9.2.1a", "9.2.2"] },
    { "id": 5, "tasks": ["9.2.2a"] }
  ]
}
```

**Critical Path:** 9.1.1 → 9.1.2 → 9.2.1 → 9.2.2
**Parallelizable:** HapticManager (9.3.x) is fully independent of audio engine and can run in parallel
**Blocking Tasks:** 9.1.1 (AudioEngine) blocks all audio; no audio features block core gameplay (passive observers)

---


# Epic 10: Animation

**Objectives:** Implement all animations specified in Requirements 36–38: ring landing, ring near-peg glow, button press depression, water ripple, timer arc color shift, peg victory glow, victory sequence, defeat sequence, achievement banner, rank-up, and continue-granted animations.
**Business Value:** Animations are the sensory glue that makes physics consequences feel real. The victory sequence in particular must be earned-feeling — it's the primary positive reinforcement loop.
**Dependencies:** Epics 3–8
**Technical Risks:** Complex animation sequences (victory) must be interruptible; spring animations must not produce oscillation artifacts; reduced-motion alternatives must be comprehensive.
**Success Criteria:** All animations match spec parameters (duration, easing, stiffness); reduced-motion variants work; no jank during animation sequences; victory sequence always ≥4 seconds.
**Estimated Duration:** Weeks 12–17 (Milestone 7, overlaps)
**Required Roles:** Animation Engineer (lead), React Native Engineer
**Definition of Done:** All animations implemented; reduced-motion alternatives active; animation tests pass; no frame drops during sequences.

---

## Feature 10.1: Core Gameplay Animations

**Purpose:** Implement all in-game physics-consequence animations: ring landing bounce, ring near-peg glow pulse, button press depression, and water ripple on press.
**Architecture:** All via Reanimated 3 `useSharedValue` and `withSpring`/`withTiming`; driven by game events; reduced-motion substitutes opacity fade.
**Dependencies:** Epics 3, 5, 8
**Acceptance Criteria:** Ring landing: scale +10% over 100ms ease-out, spring back 300ms (stiffness 200, damping 20); near-peg glow: 1.5Hz sinusoidal 0.3–0.8 opacity; button depress: 3dp/50ms linear, spring 150ms.
**Testing Requirements:** Unit tests for animation parameter values; reduced-motion smoke test.

- [ ] 10.1.1 Implement ring landing animation
  - Scale +10% over 100ms ease-out → spring back to 1.0 over 300ms (stiffness 200, damping 20)
  - Triggered by `ring_settled` game event
  - Reduced-motion: opacity flash (50ms fade down, 150ms fade up)
  - _Requirements: 36.1_

  - [ ]* 10.1.1a Write unit test for ring landing animation spring parameters
    - Test: stiffness=200, damping=20; max scale 1.1; total duration ≤ 400ms
    - _Requirements: 36.1_

- [ ] 10.1.2 Implement ring near-peg glow pulse and button press animations
  - Near-peg glow: `withRepeat(withTiming(...))` at 1.5Hz; opacity 0.3–0.8; activates at 100px proximity
  - Button press: 3dp depress linear 50ms; spring back `withSpring` 150ms on release
  - Water ripple: expand radially at 120px/s; opacity 0.4 → 0 over 1000ms; max 120px radius
  - _Requirements: 36.2, 36.3, 36.4_

  - [ ]* 10.1.2a Write unit test for near-peg glow opacity range (0.3–0.8) and frequency (1.5Hz)
    - _Requirements: 36.2_

- [ ] 10.1.3 Implement timer arc animations (amber and red transitions)
  - Amber transition: color shift over 500ms when crossing 30%
  - Red transition: color shift over 300ms + 1Hz pulse when crossing 10%
  - Peg victory glow: 1.5Hz pulse, opacity 0.3–0.6, ring's color
  - _Requirements: 36.5, 36.6_

  - [ ]* 10.1.3a Write unit test for timer animation transitions at 30% and 10% thresholds
    - _Requirements: 36.5_


## Feature 10.2: Victory, Defeat, and State Change Animations

**Purpose:** Implement all state-transition animation sequences: victory sequence, defeat sequence, achievement banner, rank-up animation, and continue-granted animation.
**Architecture:** Reanimated 3 `withSequence` and `withDelay`; Lottie for victory tier animations; ParticleSystem for particle bursts; all sequences use `runOnJS` for modal navigation.
**Dependencies:** Features 10.1, Epic 8 (modals)
**Acceptance Criteria:** Victory sequence: camera zoom → flash → modal → stars one-by-one → coins arc → XP fill; total ≥ 4 seconds; defeat: drain overlay then modal; achievement: slide down → display → slide up in 400+2200+400ms.
**Testing Requirements:** Integration tests for victory and defeat sequence execution order; timing tests.

- [ ] 10.2.1 Implement complete Victory Sequence
  - Step 1: camera zoom 10% over 400ms ease-out (Reanimated transform)
  - Step 2: screen flash white 20ms (full-screen overlay opacity 0→1→0)
  - Step 3: VictoryModal slides in 300ms
  - Step 4: stars flip one-by-one: 250ms each, 100ms gap
  - Step 5: coins arc to counter with trail particles: 600–800ms
  - Step 6: XP bar shimmer fill: 600ms
  - Total: ≥ 4 seconds; orchestrated via `withSequence`
  - Reduced-motion: skip steps 1–2; fade in modal; no star flip animation
  - _Requirements: 37.1_

  - [ ]* 10.2.1a Write integration test for victory sequence step order and timing
    - Test: all 6 steps execute in order; total duration ≥ 4s
    - _Requirements: 37.1_

- [ ] 10.2.2 Implement Defeat, Achievement, Rank-Up, and Continue animations
  - Defeat: water drain overlay (400ms fade in, 800ms drain); DefeatModal scale-from-0.85 + fade 300ms
  - Achievement banner: slide down 400ms spring (stiffness 300, damping 30); display 2200ms; slide up 400ms; particle burst at appearance
  - Rank-up: badge scale 0 → 1.2 → 1.0 (400ms spring overshoot); 600ms glow pulse; 8 radiating particle lines
  - Continue: green arc addition to TimerArc over 300ms
  - All have reduced-motion opacity-fade alternatives
  - _Requirements: 37.2, 37.3, 37.4, 37.5_

  - [ ]* 10.2.2a Write unit tests for each animation parameter (achievement banner timing, rank-up spring)
    - _Requirements: 37.3, 37.4_

  - [ ]* 10.2.2b Write integration test for defeat sequence → modal render
    - _Requirements: 37.2_

## Epic 10: Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["10.1.1", "10.1.2", "10.1.3"] },
    { "id": 1, "tasks": ["10.1.1a", "10.1.2a", "10.1.3a"] },
    { "id": 2, "tasks": ["10.2.1"] },
    { "id": 3, "tasks": ["10.2.1a", "10.2.2"] },
    { "id": 4, "tasks": ["10.2.2a", "10.2.2b"] }
  ]
}
```

**Critical Path:** 10.1.1 → 10.2.1 (ring animation → victory sequence)
**Parallelizable:** Core animations 10.1.1–10.1.3 are fully independent; victory and defeat (10.2.x) are independent of each other
**Blocking Tasks:** No epic-level blocking (animations are polish layer); however ring animations must complete before UI sign-off

---


# Epic 11: Progression

**Objectives:** Implement the full meta-progression system: XP and leveling, prestige system, template mastery tracking, achievement engine (60+ achievements), and collection system (20 collections).
**Business Value:** Progression systems are the #1 long-term retention mechanism. A well-designed XP/prestige curve keeps players engaged for months. Achievements create mini-goals that fill the gaps between challenge milestones.
**Dependencies:** Epics 2, 3, 6, 7
**Technical Risks:** XP formula must be tuned to provide ~5 level-ups per day for average players; achievement evaluation must not lag the UI; collection tracking must be efficient with many items.
**Success Criteria:** XP system levels players up correctly; prestige resets with meaningful benefits; mastery tracks per template; achievement unlock fires events correctly; all 20 collections trackable.
**Estimated Duration:** Weeks 12–17 (Milestone 7)
**Required Roles:** Game Designer + Engineer (lead)
**Definition of Done:** All 6 progression modules implemented; XP/level tests pass; achievement unlock events fire correctly; collections query efficiently.

---

## Feature 11.1: XP System and Leveling

**Purpose:** Implement the XP system, level-up formula, and prestige system.
**Architecture:** `XPSystem.ts`; `LevelSystem.ts`; `PrestigeSystem.ts`; XP earned per challenge; level-up threshold uses `xpRequired(level)` formula; prestige at max level resets level with multiplier.
**Dependencies:** Epic 2 (playerSlice)
**Acceptance Criteria:** XP awards computed correctly from star count, difficulty, and first-time bonus; level-up triggers at correct threshold; prestige provides correct benefits; `xpRequired(level)` tested at key values.
**Edge Cases:** Level-up during challenge end animation (handle sequentially); prestige max level boundary.
**Testing Requirements:** Unit tests for xpRequired formula; property test for XP conservation.

- [ ] 11.1.1 Implement XPSystem with challenge XP awards
  - `src/features/progression/XPSystem.ts`
  - XP per challenge: base × difficulty multiplier × star multiplier × (2.0 if first completion)
  - Apply XP to playerSlice; check for level-up after each award
  - Log `xp_earned` analytics event
  - _Requirements: 17.1_

  - [ ]* 11.1.1a Write unit tests for XP formula at D=0, D=50, D=100 with 1, 2, 3 stars
    - _Requirements: 17.1_

- [ ] 11.1.2 Implement LevelSystem and PrestigeSystem
  - `LevelSystem.ts`: `xpRequired(level) = BASE_XP × level^1.8`; levelUp() dispatches `playerSlice.levelUp`; fires `level_up` analytics event
  - `PrestigeSystem.ts`: `prestige()` resets level to 1 but grants prestige title, badge, and XP multiplier; max prestige = 10
  - _Requirements: 17.1_

  - [ ]* 11.1.2a Write unit tests for xpRequired at level 1, 10, 50, 100
    - _Requirements: 17.1_

  - [ ]* 11.1.2b Write unit test: prestige resets level to 1, grants multiplier
    - _Requirements: 17.1_

## Feature 11.2: Mastery Tracker and Achievement Engine

**Purpose:** Implement per-template mastery tracking and the achievement engine that evaluates 60+ achievements.
**Architecture:** `MasteryTracker.ts` tracks completions per template; `AchievementEngine.ts` evaluates conditions after challenge completion; dispatches `achievement_unlock` events.
**Dependencies:** Features 11.1, Epic 7
**Acceptance Criteria:** Mastery increments per template on completion; achievement conditions evaluated after every challenge end; unlock events fire to Analytics and HapticManager; all 60+ achievements defined.
**Edge Cases:** Achievement with complex cross-session conditions (e.g., "win 10 challenges without continues"); duplicate unlock protection.
**Testing Requirements:** Unit tests for achievement condition evaluation; integration test for unlock event chain.

- [ ] 11.2.1 Implement MasteryTracker per template
  - `src/features/progression/MasteryTracker.ts`
  - Track: completion count, best time, best stars per template (Firestore: `/players/{userId}/mastery/{templateId}`)
  - Mastery levels: Bronze (5 completions), Silver (20), Gold (50), Platinum (100)
  - _Requirements: 8.2_

  - [ ]* 11.2.1a Write unit tests for mastery level calculation
    - _Requirements: 8.2_

- [ ] 11.2.2 Implement AchievementEngine with all achievement definitions
  - `src/features/progression/AchievementEngine.ts`
  - Expose: `evaluateAfterChallenge(result)`, `evaluateAfterSession(session)`, `isUnlocked(achievementId)`
  - Dispatch `achievement_unlock` event to Analytics and HapticManager on unlock
  - Define all 60+ achievements: first win, win streak, no-continue win, perfect 3-star, template mastery, etc.
  - Prevent duplicate unlock (check against `playerSlice.unlockedAchievements`)
  - _Requirements: 16.4_

  - [ ]* 11.2.2a Write unit tests for achievement condition evaluation (10 representative achievements)
    - _Requirements: 16.4_

  - [ ]* 11.2.2b Write integration test: achievement unlock → analytics event + haptic event chain
    - _Requirements: 16.4_

## Feature 11.3: Collection System (20 Collections)

**Purpose:** Implement the 20 collection definitions and CollectionTracker that tracks progress toward each.
**Architecture:** `CollectionTracker.ts`; collections group related achievements or challenge completions; completion rewards cosmetics; all collections defined as config data.
**Dependencies:** Feature 11.2
**Acceptance Criteria:** All 20 collections defined; progress tracked; collection completion grants reward; CollectionScreen shows correct status; progress syncs to Firestore.
**Testing Requirements:** Unit tests for collection progress computation; integration test for reward grant on completion.

- [ ] 11.3.1 Implement CollectionTracker with all 20 collection definitions
  - `src/features/progression/CollectionTracker.ts`
  - Collections: template mastery sets, cosmetic type sets, streak milestone sets, boss challenge sets, etc.
  - Track completion per item in each collection
  - Complete collection → grant reward (cosmetic or coins) → log `collection_complete` analytics
  - _Requirements: 8.2_

  - [ ]* 11.3.1a Write unit tests for collection completion detection and reward grant
    - _Requirements: 8.2_

## Epic 11: Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["11.1.1", "11.2.1"] },
    { "id": 1, "tasks": ["11.1.1a", "11.1.2"] },
    { "id": 2, "tasks": ["11.1.2a", "11.1.2b", "11.2.2"] },
    { "id": 3, "tasks": ["11.2.1a", "11.2.2a", "11.2.2b"] },
    { "id": 4, "tasks": ["11.3.1"] },
    { "id": 5, "tasks": ["11.3.1a"] }
  ]
}
```

**Critical Path:** 11.1.1 → 11.1.2 → 11.2.2 → 11.3.1
**Parallelizable:** MasteryTracker (11.2.1) can run in parallel with XPSystem (11.1.1)
**Blocking Tasks:** 11.1.1 (XP) and 11.2.2 (Achievements) needed before economy rewards; 11.2.2 blocks collection completion

---


# Epic 12: Economy

**Objectives:** Implement the complete economy system: coin ledger with HMAC signing, EconomyService with server validation, RevenueCat IAP integration, rewarded ads via AdMob/IronSource, and the store purchase flow.
**Business Value:** The economy is the primary revenue mechanism. Every monetization touchpoint (continue, store, IAP) flows through this system. Incorrect implementation = revenue loss or player trust damage.
**Dependencies:** Epics 2, 13 (Cloud Functions)
**Technical Risks:** RevenueCat entitlement sync latency; HMAC signing key obfuscation in JS; optimistic update + rollback on Cloud Function rejection; ad availability is not guaranteed.
**Success Criteria:** Coin conservation property holds; IAP completes end-to-end in sandbox; idempotent coin credit property holds; non-negative balance property holds; ads serve in test environment.
**Estimated Duration:** Weeks 10–15 (Milestone 6)
**Required Roles:** Backend Engineer (lead), Mobile Engineer
**Definition of Done:** EconomyService interface implemented; RevenueCat integrated; ads serving; all 4 economy property tests pass; Cloud Function validation working.

---

## Feature 12.1: EconomyService and CoinLedger

**Purpose:** Implement the EconomyService with all required methods, HMAC signing, optimistic updates, and Cloud Function validation.
**Architecture:** `EconomyService.ts`; `CoinLedger.ts`; HMAC-SHA256 with PBKDF2 key; optimistic MMKV update; Cloud Function call; rollback on rejection.
**Dependencies:** Epics 2, 13
**Acceptance Criteria:** creditCoins idempotent by txId; spendCoins rejects negative balance; HMAC signed correctly; optimistic update visible instantly; rollback on server rejection within 3s.
**Edge Cases:** Cloud Function timeout → retry once after 5s → queue for background retry; duplicate txId → silent success (no double credit).
**Testing Requirements:** Property tests 11, 13, 14 (conservation, idempotency, non-negative).

- [ ] 12.1.1 Implement CoinLedger with HMAC signing
  - `src/features/economy/CoinLedger.ts`
  - Track balance in economySlice; maintain transaction history (last 50)
  - Sign every coin-grant event: `HMAC-SHA256(key=PBKDF2(userId + deviceId + appSecret), message=txData)`
  - `appSecret` must be obfuscated via native code (not in JS source)
  - _Requirements: 12.4, 52.7_

  - [ ]* 12.1.1a Write unit test for HMAC signature generation and verification
    - _Requirements: 12.4_

- [ ] 12.1.2 Implement EconomyService with full interface
  - `src/features/economy/EconomyService.ts`
  - `creditCoins(userId, amount, source, txId)`: idempotent (check txId in MMKV); optimistic update; Cloud Function call; rollback on rejection
  - `spendCoins(userId, amount, sink)`: reject if would go negative; optimistic deduct; rollback on failure
  - `getBalance(userId)`: from economySlice (synchronous, no network)
  - _Requirements: 12.1, 12.2, 12.3, 12.5_

  - [ ]* 12.1.2a Write property test: coin conservation
    - **Property 11: finalBalance = initialBalance + sum(credits) - sum(debits)**
    - `fc.property(fc.array(arbTransaction), txs => runTransactions(txs).balance === computeExpected(txs))`
    - **Validates: Requirements 12, 30**
    - _Requirements: Property 11_

  - [ ]* 12.1.2b Write property test: idempotent coin credit
    - **Property 13: creditCoins with same txId multiple times credits exactly once**
    - `fc.property(fc.string(), txId => { creditCoins(txId); creditCoins(txId); return getBalance() === initialBalance + AMOUNT })`
    - **Validates: Requirements 12, 30**
    - _Requirements: Property 13_

  - [ ]* 12.1.2c Write property test: non-negative balance
    - **Property 14: spendCoins never results in balance < 0**
    - `fc.property(fc.integer({min:0,max:10000}), amount => { spendCoins(amount); return getBalance() >= 0 })`
    - **Validates: Requirements 12, 30**
    - _Requirements: Property 14_


## Feature 12.2: RevenueCat IAP Integration

**Purpose:** Integrate RevenueCat for IAP lifecycle management, receipt validation, and entitlement management.
**Architecture:** `PurchaseService.ts` wraps RevenueCat SDK; products configured in App Store Connect and Google Play Console; `restorePurchases()` for iOS requirement.
**Dependencies:** Feature 12.1; App Store Connect and Google Play products created
**Acceptance Criteria:** `initiatePurchase(productId)` completes purchase; RevenueCat txId used as idempotency key; entitlements granted immediately; `restorePurchases()` works; sandbox tested.
**Edge Cases:** Purchase interrupted (user killed app) must be recoverable on next launch; IAP initiation blocked when offline.
**Testing Requirements:** Integration test with RevenueCat sandbox; unit test for offline IAP block.

- [ ] 12.2.1 Implement PurchaseService wrapping RevenueCat SDK
  - `src/features/economy/PurchaseService.ts`
  - `initiatePurchase(productId)`: call RevenueCat `purchaseProduct`; on success call `creditCoins(txId=revenueCatTxId)`
  - `restorePurchases()`: call RevenueCat restore; grant any ungranted entitlements
  - Block IAP initiation when offline; show "Network required for purchases" message
  - _Requirements: 12.1, 12.2, 20.4_

  - [ ]* 12.2.1a Write integration test for complete sandbox IAP flow (purchase → credit)
    - _Requirements: 54.7_

  - [ ]* 12.2.1b Write unit test for offline IAP block behavior
    - _Requirements: 20.4_

## Feature 12.3: Rewarded Ads (AdMob/IronSource)

**Purpose:** Implement the rewarded ad flow via AdMob/IronSource with fatigue protection and continue-via-ad path.
**Architecture:** `AdService.ts`; preload rewarded video; `watchRewardedAd()` returns a promise; daily ad view limit from Remote Config.
**Dependencies:** Feature 12.1
**Acceptance Criteria:** Rewarded ad serves and completes; daily view limit enforced; coin reward granted after completion; fatigue protection (max views/day); ad unavailable shows coin fallback.
**Testing Requirements:** Integration test with production placement IDs in test mode; unit test for daily limit enforcement.

- [ ] 12.3.1 Implement AdService with daily limit and fatigue protection
  - `src/features/economy/AdService.ts`
  - Preload rewarded video on app launch; reload after each view
  - `watchRewardedAd()`: check daily limit (from Remote Config `max_daily_ad_views`); show ad; on completion grant reward; increment daily counter
  - Ad unavailable → show "No ads available, use coins instead" fallback
  - _Requirements: 17.2_

  - [ ]* 12.3.1a Write unit test for daily ad limit enforcement (counter increments, blocks at max)
    - _Requirements: 17.2_

  - [ ]* 12.3.1b Write integration test: ad completion → coin credit
    - _Requirements: 55.5_

## Feature 12.4: Cosmetic Physical Isolation

**Purpose:** Ensure equipping/unequipping cosmetics has zero effect on physics parameters.
**Architecture:** Cosmetics affect only rendering (skin IDs, shader uniforms); ChallengeConfig physics properties must be identical regardless of cosmetics; property test validates this invariant.
**Dependencies:** Features 12.1, Epic 5 (rendering)
**Acceptance Criteria:** equipping any cosmetic never changes mass, gravity, force constants, peg radius, settle velocity, or collision params.
**Testing Requirements:** Property test 20 (cosmetic physical isolation).

- [ ] 12.4.1 Implement cosmetic application (rendering-only) and isolation guard
  - Apply cosmetic skin IDs to renderer; update shader uniforms for water color themes
  - Assert in `ChallengeGenerator.generate()` that cosmetics from cosmeticsSlice are never read
  - _Requirements: Property 20_

  - [ ]* 12.4.1a Write property test: cosmetic physical isolation
    - **Property 20: equipping/unequipping any cosmetic → ChallengeConfig physics unchanged**
    - `fc.property(arbCosmeticSet, cosmetics => physicsEqual(generateWith(cosmetics), generateWithout()))`
    - **Validates: Requirements 11, 12**
    - _Requirements: Property 20_

## Epic 12: Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["12.1.1"] },
    { "id": 1, "tasks": ["12.1.1a", "12.1.2"] },
    { "id": 2, "tasks": ["12.1.2a", "12.1.2b", "12.1.2c", "12.2.1", "12.3.1"] },
    { "id": 3, "tasks": ["12.2.1a", "12.2.1b", "12.3.1a", "12.3.1b", "12.4.1"] },
    { "id": 4, "tasks": ["12.4.1a"] }
  ]
}
```

**Critical Path:** 12.1.1 → 12.1.2 → 12.2.1 (ledger → service → IAP)
**Parallelizable:** RevenueCat (12.2.1) and AdService (12.3.1) can run in parallel after 12.1.2
**Blocking Tasks:** 12.1.2 (EconomyService) blocks all monetization touchpoints; 12.2.1 must be done before launch readiness

---


# Epic 13: Firebase Backend

**Objectives:** Implement all Firestore collections, document schemas, security rules, Cloud Functions (5 functions), Firebase Auth anonymous+social, and the SyncManager with conflict resolution.
**Business Value:** The backend enables cross-device play, social features, live balancing, and anti-cheat — all critical for a top-chart game. Without it, the game is a single-device silo.
**Dependencies:** Epic 1 (Firebase setup), Epic 2 (store and sync)
**Technical Risks:** Firestore security rules are hard to test thoroughly; Cloud Function replay validation is computationally expensive; conflict resolution edge cases (login streaks across time zones).
**Success Criteria:** All security rules pass rule unit tests; all 5 Cloud Functions deployed and smoke-tested; SyncManager syncs correctly; conflict resolution deterministic; offline queue flushes on reconnect.
**Estimated Duration:** Weeks 10–15 (Milestone 6)
**Required Roles:** Backend Engineer (lead), Security Engineer (reviewer)
**Definition of Done:** All rules reviewed by 2 engineers; all 5 functions deployed; integration tests pass; all Requirement 25–28 acceptance criteria met.

---

## Feature 13.1: Firestore Collections and Document Schemas

**Purpose:** Implement all Firestore collections with correct document schemas, indexes, and size constraints.
**Architecture:** Collection paths per Requirement 25; all writes via `set({ merge: true })`; composite indexes for leaderboard queries; PlayerDocument ≤ 100KB.
**Dependencies:** Epic 1 (Firebase setup)
**Acceptance Criteria:** All 6 collection paths exist; PlayerDocument matches schema; all required fields present; composite indexes created; document ≤ 100KB.
**Testing Requirements:** Integration test for document write/read round-trip; index query test.

- [ ] 13.1.1 Implement FirestoreService with typed document operations
  - `src/services/firebase/FirestoreService.ts`
  - Typed methods for all collections: `getPlayer`, `savePlayer`, `getChallengeRecord`, `saveChallengeRecord`, `getLeaderboard`, `getChallengeIntelligence`
  - All writes use `set({ merge: true })`; all reads cache-first with 5s network timeout
  - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.5, 30.4, 30.5_

  - [ ]* 13.1.1a Write integration tests for all FirestoreService operations against Firebase emulator
    - Test: write player, read player, merge update; leaderboard query
    - _Requirements: 25.1_

- [ ] 13.1.2 Create Firestore indexes (composite)
  - Index 1: `/leaderboards/{id}/entries` by (score DESC, completionTime ASC, continuesUsed ASC)
  - Index 2: `/leaderboards/{id}/entries` by (country, score DESC) for country filter
  - Deploy via `firestore.indexes.json`
  - _Requirements: 26.1, 26.2_

  - [ ]* 13.1.2a Write integration test for leaderboard query using both composite indexes
    - _Requirements: 26.1, 26.2_

## Feature 13.2: Cloud Functions Implementation

**Purpose:** Implement all 5 Cloud Functions: leaderboard, dailyChallenge, antiCheat, economy, challengeIntelligence.
**Architecture:** Node.js 18 Cloud Functions; all reject unauthenticated requests (HTTP 401); leaderboard function re-runs simulation server-side; economy function validates HMAC.
**Dependencies:** Feature 13.1
**Acceptance Criteria:** All 5 functions deployed; leaderboard validation rejects tampered replays; economy function is idempotent; antiCheat flags below-minimum submissions; dailyChallenge runs at midnight UTC.
**Security Considerations:** Functions never trust client-sent data; all computation server-side.
**Testing Requirements:** Integration tests for each function against Firebase emulator; anti-cheat rejection tests.

- [ ] 13.2.1 Implement `leaderboard.ts` Cloud Function
  - `functions/src/leaderboard.ts`
  - `submitScore`: re-generate challenge from seed; verify layout hash; check completionTime ≥ minPossibleSolveTime(N); replay input log server-side; verify outcome; rate limit 1/challenge/player/5min
  - Return: success + rank OR failure + reason
  - _Requirements: 27.1_

  - [ ]* 13.2.1a Write integration test: tampered input log rejected; valid submission accepted
    - _Requirements: 27.1, 55.6_

- [ ] 13.2.2 Implement `economy.ts` Cloud Function
  - `functions/src/economy.ts`
  - Validate HMAC-SHA256 signature; check idempotency key not used; verify amount matches server formula; write to `/economy/{txId}`
  - `spendCoins`: atomically reject if balance - amount < 0
  - _Requirements: 27.2_

  - [ ]* 13.2.2a Write integration tests: invalid HMAC rejected; duplicate txId silently accepted; negative balance rejected
    - _Requirements: 27.2, Property 13, 14_

- [ ] 13.2.3 Implement `dailyChallenge.ts`, `antiCheat.ts`, `challengeIntelligence.ts`
  - `dailyChallenge.ts`: cron at midnight UTC; generate with DailySeed(date); store in Firestore; push notification
  - `antiCheat.ts`: flag below-minPossibleSolveTime; flag coin earn rate above max; flag input hash mismatch
  - `challengeIntelligence.ts`: daily aggregate; compute actual completion rates; flag predicted vs actual divergence > threshold for 100+ plays
  - _Requirements: 27.3, 27.4, 27.5, 27.6_

  - [ ]* 13.2.3a Write integration tests for antiCheat rejection criteria
    - Test: below-minimum time → flagged; excess coin rate → flagged
    - _Requirements: 27.4, 55.6_

  - [ ]* 13.2.3b Write integration test for dailyChallenge cron generation
    - _Requirements: 27.3_


## Feature 13.3: Firebase Auth and SyncManager

**Purpose:** Implement anonymous+social Firebase Auth, the SyncManager with conflict resolution, and the offline queue system.
**Architecture:** `AuthService.ts`; `SyncManager.ts`; `ConflictResolver.ts`; state machine: Offline/Syncing/Synced/Dirty; exponential backoff; per-field conflict rules.
**Dependencies:** Features 13.1, 13.2, Epic 2
**Acceptance Criteria:** Anonymous Auth on first launch without player action; social sign-in merges progress; SyncManager syncs at correct events; conflict resolution is deterministic; offline queue flushes on reconnect; sync never blocks gameplay.
**Testing Requirements:** Integration test for offline queue flush; property test for sync idempotency.

- [ ] 13.3.1 Implement AuthService with anonymous and social sign-in
  - `src/services/firebase/AuthService.ts`
  - Create anonymous session on first launch (no user action required)
  - Support Google Sign-In and Apple Sign-In via `@react-native-google-signin/google-signin` and `@invertase/react-native-apple-authentication`
  - On social link: merge anonymous progress using max-merge
  - Never prompt for auth before challenge 10
  - _Requirements: 28.1, 28.2, 28.3, 28.4_

  - [ ]* 13.3.1a Write integration test for anonymous auth creation and social link
    - _Requirements: 28.1, 28.3_

- [ ] 13.3.2 Implement SyncManager with state machine and conflict resolution
  - `src/services/sync/SyncManager.ts`; `ConflictResolver.ts`
  - State machine: Offline → Syncing → Synced → Dirty; transitions on network events and sync triggers
  - Sync triggers: app launch, challenge end, IAP, every 5 minutes
  - Exponential backoff on failure: 1s, 2s, 4s, 8s, capped at 30s
  - Per-field conflict rules: coinBalance max, challengesCompleted max, highestChallenge max, cosmetics union, stars max, settings cloud wins, achievements union
  - Login streak: max same-date; merge consecutive dates as continuous streak
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.7_

  - [ ]* 13.3.2a Write property test: sync idempotency
    - **Property 19: calling syncNow() N times produces same Firestore state as calling once**
    - `fc.property(fc.integer({min:1, max:10}), n => syncNTimes(n).equals(syncOnce()))`
    - **Validates: Requirements 19, 30**
    - _Requirements: Property 19_

  - [ ]* 13.3.2b Write integration test for offline queue flush on reconnect
    - _Requirements: 19.6_

  - [ ]* 13.3.2c Write unit test for per-field conflict resolution rules
    - Test: coinBalance takes max; cosmetics take union; settings: cloud wins
    - _Requirements: 19.3_

## Epic 13: Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["13.1.1"] },
    { "id": 1, "tasks": ["13.1.1a", "13.1.2"] },
    { "id": 2, "tasks": ["13.1.2a", "13.2.1", "13.2.3", "13.3.1"] },
    { "id": 3, "tasks": ["13.2.1a", "13.2.2", "13.2.3a", "13.2.3b", "13.3.1a"] },
    { "id": 4, "tasks": ["13.2.2a", "13.3.2"] },
    { "id": 5, "tasks": ["13.3.2a", "13.3.2b", "13.3.2c"] }
  ]
}
```

**Critical Path:** 13.1.1 → 13.1.2 → 13.2.1 → 13.2.2 → 13.3.2 (data model → functions → sync)
**Parallelizable:** Auth (13.3.1), antiCheat (13.2.3), and dailyChallenge (13.2.3) can run in parallel with economy function (13.2.2)
**Blocking Tasks:** 13.1.1 (Firestore service) blocks all backend; 13.2.1 (leaderboard function) blocks leaderboard epic

---


# Epic 14: Leaderboards

**Objectives:** Implement the full leaderboard system: score submission with Cloud Function validation, leaderboard display with filters, social (friends) leaderboard, ghost replay integration, and daily/weekly challenge leaderboards.
**Business Value:** Leaderboards are the primary social retention mechanism. Players with friends on the leaderboard have 2× higher weekly retention. Ghost replays convert leaderboard competition into directly watchable social proof.
**Dependencies:** Epics 8, 13 (Firebase and Cloud Functions)
**Technical Risks:** Leaderboard submission validation replay is expensive on Cloud Functions; stale cache must not block UI; anti-cheat silent rejection must not break player UX.
**Success Criteria:** Score submission completes with rank returned; stale cache shows with timestamp; ghost replay button available; offline submission queued and retried; leaderboard score ordering property holds.
**Estimated Duration:** Weeks 15–19 (Milestone 8)
**Required Roles:** Backend Engineer (lead), Mobile Engineer
**Definition of Done:** Submission works with validation; display with filters works; ghost replay integration works; property tests 17 and 18 pass.

---

## Feature 14.1: Score Submission and Leaderboard Service

**Purpose:** Implement the LeaderboardService that submits scores via Cloud Function and queries leaderboard data.
**Architecture:** `LeaderboardService.ts`; never writes directly to Firestore leaderboard collections; stale cache returns while background refresh; pending retry on timeout.
**Dependencies:** Epic 13
**Acceptance Criteria:** `submitScore` uses Cloud Function only; returns rank on success; silently succeeds on anti-cheat rejection; timeout queues for next app launch; stale cache shows max 5 minutes old.
**Testing Requirements:** Integration test for submission → rank return; property tests 17 and 18.

- [ ] 14.1.1 Implement LeaderboardService with submission and query
  - `src/features/social/LeaderboardService.ts`
  - `submitScore(...)`: call `CloudFunctionsService.submitScore`; on timeout store in MMKV as pending; retry on next launch
  - `getLeaderboard(id, scope, timeFilter, pageSize, cursor)`: return cached + background refresh
  - Anti-cheat silent success: client always gets success response regardless of server flag
  - `60-second penalty per continue` applied to dailyScore completionTime before submission
  - _Requirements: 16.5, 29.1, 29.2, 29.3, 29.4, 29.5, 31.7_

  - [ ]* 14.1.1a Write property test: leaderboard score ordering
    - **Property 17: lower completionTime and fewer continuesUsed → strictly higher rank**
    - `fc.property(fc.tuple(arbEntry, arbEntry), ([a,b]) => a.time < b.time ? rank(a) < rank(b) : true)`
    - **Validates: Requirement 29**
    - _Requirements: Property 17_

  - [ ]* 14.1.1b Write property test: minimum solve time gate
    - **Property 18: no entry with completionTime < minPossibleSolveTime(N) is accepted**
    - `fc.property(fc.integer({min:1,max:10000}), N => submitBelowMin(N).rejected === true)`
    - **Validates: Requirements 27, 29**
    - _Requirements: Property 18_

  - [ ]* 14.1.1c Write integration test for offline submission queue and retry on reconnect
    - _Requirements: 29.5_

## Feature 14.2: Leaderboard Display and Ghost Replay Integration

**Purpose:** Implement leaderboard screen display with all filters and ghost replay button integration.
**Architecture:** LeaderboardScreen reads from `socialSlice.leaderboardCache`; filters dispatch LeaderboardService queries; ghost replay button triggers ReplayPlayer with ghost mode.
**Dependencies:** Features 14.1, Epic 15 (replay)
**Acceptance Criteria:** All filter combinations work (scope, timeFilter); player's own row pinned; ghost button visible when replay available; offline shows last-fetched with timestamp.
**Testing Requirements:** Unit tests for filter combinations; integration test for ghost replay launch.

- [ ] 14.2.1 Implement leaderboard display with all scope and time filters
  - LeaderboardScreen reads cached data; dispatch getLeaderboard on mount and filter change
  - Filters: global/country/friends × today/week/allTime = 9 combinations
  - Offline: show cached data with "Last updated [timestamp]" indicator
  - Player row pinned at bottom even when not in top N
  - _Requirements: 29.2, 20.2_

  - [ ]* 14.2.1a Write unit tests for filter parameter combinations
    - _Requirements: 29.2_

- [ ] 14.2.2 Implement ghost replay button and social challenge sharing
  - `LeaderboardRow` ghost button: navigate to ReplayViewerScreen in ghost mode (overlay on live challenge)
  - `ChallengeShareService.ts`: generate share URL (`waterring://challenge/{N}`); use React Native Share API
  - Get top replay IDs from `getTopReplays(challengeNumber)` (max 5)
  - _Requirements: 32.3_

  - [ ]* 14.2.2a Write integration test: ghost replay launches ReplayPlayer in ghost overlay mode
    - _Requirements: 32.3_

## Epic 14: Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["14.1.1"] },
    { "id": 1, "tasks": ["14.1.1a", "14.1.1b", "14.1.1c"] },
    { "id": 2, "tasks": ["14.2.1"] },
    { "id": 3, "tasks": ["14.2.1a", "14.2.2"] },
    { "id": 4, "tasks": ["14.2.2a"] }
  ]
}
```

**Critical Path:** 14.1.1 → 14.2.1 → 14.2.2
**Parallelizable:** Property tests can run in parallel with display implementation
**Blocking Tasks:** 14.1.1 (LeaderboardService) blocks all leaderboard features; ghost replay (14.2.2) requires Epic 15

---


# Epic 15: Replay System

**Objectives:** Implement the complete replay system: ReplayRecorder (timestamped input events), LZ4 compression, Firebase Storage upload, ReplayPlayer with full playback controls and seeking, ghost mode overlay, and Cloud Function validation.
**Business Value:** Replays drive social proof and virality. Players sharing their personal-best replays is organic marketing. Ghost mode competition (see #1 player's technique) drives re-engagement and challenge restarts.
**Dependencies:** Epics 2, 3, 13
**Technical Risks:** LZ4 compression in React Native requires native module; replay seeking requires periodic state checkpoints; Cloud Function replay validation is computationally expensive.
**Success Criteria:** Recording captures all input events; compression achieves ≤ 50KB; playback is deterministic; seeking latency < 5s; ghost overlay renders correctly.
**Estimated Duration:** Weeks 15–19 (Milestone 8)
**Required Roles:** Game Engineer (lead), Backend Engineer
**Definition of Done:** Record/compress/upload pipeline works; player with all controls works; ghost mode works; Cloud Function validates and rejects invalid replays.

---

## Feature 15.1: ReplayRecorder and Compression

**Purpose:** Implement the ReplayRecorder that captures all input events, compresses with LZ4, and uploads to Firebase Storage.
**Architecture:** `ReplayRecorder.ts`; record all input as `{ t: number, type: 'L_DOWN'|'L_UP'|'R_DOWN'|'R_UP' }`; LZ4 compress; Firebase Storage upload with Firestore metadata write.
**Dependencies:** Epics 2, 3, 13
**Acceptance Criteria:** All input events recorded with millisecond timestamps; uncompressed size 800–2400 bytes for 90s challenge; compressed ≤ 50KB; truncation if exceeded; upload path matches spec.
**Edge Cases:** Recording must survive app background without losing events; truncation must append completion event.
**Testing Requirements:** Unit tests for event recording; compression ratio test.

- [ ] 15.1.1 Implement ReplayRecorder with input event capture
  - `src/features/replay/ReplayRecorder.ts`
  - Subscribe to InputController events; record all press/release with `t = Date.now() - challengeStartTime`
  - Buffer events in memory; flush on challenge end
  - _Requirements: 13.1_

  - [ ]* 15.1.1a Write unit test for event recording with correct timestamps and types
    - _Requirements: 13.1_

- [ ] 15.1.2 Implement LZ4 compression and Firebase Storage upload
  - `src/features/replay/ReplayCompressor.ts`: LZ4 compress event buffer; enforce 50KB limit; truncate if exceeded (append completion event)
  - `src/features/replay/ReplayStorageService.ts`: upload to `/replays/{userId}/{N}/{replayId}.lz4`; write metadata to Firestore
  - _Requirements: 13.2, 13.3, 32.2_

  - [ ]* 15.1.2a Write unit test: 90s challenge uncompressed size 800–2400 bytes
    - _Requirements: 13.2_

  - [ ]* 15.1.2b Write integration test: upload → Firestore metadata write round-trip
    - _Requirements: 32.2_

## Feature 15.2: ReplayPlayer with Controls and Ghost Mode

**Purpose:** Implement the ReplayPlayer with all playback controls, seeking with checkpoints, and ghost overlay mode.
**Architecture:** `ReplayPlayer.ts`; drive physics via Matter.js `timing.timeScale` for speed control; periodic state checkpoints every 5 seconds for seeking; ghost = semi-transparent ring overlays on live challenge.
**Dependencies:** Feature 15.1, Epic 4 (physics), Epic 8 (ReplayViewerScreen)
**Acceptance Criteria:** All speed variants work (0.25×–4×); seeking to any point in < 5s; step-frame works; ghost overlay semi-transparent; Cloud Function validates replay outcome.
**Testing Requirements:** Integration test for seek latency; unit test for speed multiplier application.

- [ ] 15.2.1 Implement ReplayPlayer with speed control and seeking
  - `src/features/replay/ReplayPlayer.ts`
  - Deserialize and decompress replay; replay events via `applyInput` to GameLoop
  - Speed control: set `Matter.js timing.timeScale` to 0.25/0.5/1.0/2.0/4.0
  - Checkpoints: save physics state every 5 seconds during playback; seeking restores nearest checkpoint then fast-forwards
  - Step-frame: advance exactly one physics tick while paused
  - _Requirements: 13.4, 13.5, 13.6_

  - [ ]* 15.2.1a Write integration test: seek to t=45s in a 90s replay; latency < 5s
    - _Requirements: 13.5_

  - [ ]* 15.2.1b Write unit test for playback speed multiplier (timeScale values)
    - _Requirements: 13.4_

- [ ] 15.2.2 Implement ghost overlay mode on live challenge
  - Ghost replay rings rendered as 40% opacity overlays on top of live challenge
  - Ghost rings follow recorded positions; do not interact with live physics
  - Toggle ghost visibility via camera-follow toggle in ReplayViewer controls
  - _Requirements: 13.6_

  - [ ]* 15.2.2a Write unit test: ghost rings not part of physics simulation (no collision)
    - _Requirements: 13.6_

## Epic 15: Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["15.1.1"] },
    { "id": 1, "tasks": ["15.1.1a", "15.1.2"] },
    { "id": 2, "tasks": ["15.1.2a", "15.1.2b", "15.2.1"] },
    { "id": 3, "tasks": ["15.2.1a", "15.2.1b", "15.2.2"] },
    { "id": 4, "tasks": ["15.2.2a"] }
  ]
}
```

**Critical Path:** 15.1.1 → 15.1.2 → 15.2.1 → 15.2.2
**Parallelizable:** All subtasks within each wave are parallelizable
**Blocking Tasks:** 15.1.1 (recorder) and 15.1.2 (upload) must precede player and ghost mode

---


# Epic 16: Analytics

**Objectives:** Implement the complete analytics event catalog (60+ events) via Firebase Analytics, AnalyticsService, Crashlytics integration, Remote Config live balancing, and the challenge intelligence update loop.
**Business Value:** Analytics are the nervous system of the live game. Without complete instrumentation, the team cannot identify retention drop-offs, economy imbalances, or content difficulty spikes. Each missed event = a blind spot that costs real money.
**Dependencies:** Epics 2, 3, 7, 11, 12
**Technical Risks:** Analytics events must never block the main thread; batching must not lose events on app kill; event schema changes break dashboards.
**Success Criteria:** Every event in the catalog fires in test session and is visible in Firebase Analytics DebugView; no event ever throws an exception; batch flush works; all 60+ events covered.
**Estimated Duration:** Weeks 17–21 (Milestone 9)
**Required Roles:** Data Engineer (lead), Mobile Engineer
**Definition of Done:** All 60+ events implemented; DebugView validation complete; Crashlytics integrated; Remote Config integrated; no unhandled analytics exceptions.

---

## Feature 16.1: AnalyticsService and Core Event Catalog

**Purpose:** Implement the AnalyticsService wrapper and all core gameplay analytics events.
**Architecture:** `AnalyticsService.ts` wraps Firebase Analytics SDK; passive observer of GameEventEmitter; batch in memory, flush every 10s or on background; always include mandatory context fields.
**Dependencies:** Epics 2, 3
**Acceptance Criteria:** Every event includes: userId, sessionId, challengeNumber, timestamp, platform, appVersion, generatorVersion, deviceTier; service never throws; batch flush on background; ≥60 events defined.
**Edge Cases:** Firebase SDK initialization failure must be caught silently; app kill mid-batch must not lose events (Firebase SDK local persistence handles this).
**Testing Requirements:** Integration test confirming each event fires with correct shape; no-exception test.

- [ ] 16.1.1 Implement AnalyticsService with mandatory context and error suppression
  - `src/services/firebase/AnalyticsService.ts`
  - `logEvent(name, properties)`: append mandatory context; call Firebase Analytics SDK; catch all errors silently
  - Batch: accumulate events in memory; flush every 10s via `setInterval`; flush on `AppState.change` to 'background'
  - Subscribe as passive observer to GameEventEmitter (never call back into game)
  - _Requirements: 31.1, 31.2, 31.3, 31.4_

  - [ ]* 16.1.1a Write unit test: logEvent never throws for any input (including null/undefined props)
    - _Requirements: 31.4_

  - [ ]* 16.1.1b Write integration test: event fires with all 7 mandatory context fields
    - _Requirements: 31.2_

- [ ] 16.1.2 Implement all gameplay analytics events (challenge lifecycle, input, physics)
  - Events: `challenge_start`, `challenge_complete`, `challenge_fail`, `challenge_quit`, `continue_used`, `ring_settled`, `ring_near_peg_glow`, `first_ring_moved`, `first_ring_landed`, `challenge_midpoint`
  - `button_tap`, `button_hold_start`, `button_hold_peak`, `rapid_tap`, `simultaneous_press`
  - `physics_nuke_recovery`, `stuck_detection_nudge`, `stuck_detection_teleport`
  - All events fired from passive observer subscriptions, never inline in game code
  - _Requirements: 31.5_

  - [ ]* 16.1.2a Write integration test for all 17 gameplay events firing during simulated challenge session
    - _Requirements: 31.5_

- [ ] 16.1.3 Implement progression, economy, and social analytics events
  - Progression: `xp_earned`, `level_up`, `prestige`, `achievement_unlock`, `collection_complete`, `mastery_level_up`
  - Economy: `coin_earned`, `coin_spent`, `iap_initiated`, `iap_complete`, `iap_failed`, `ad_view_start`, `ad_view_complete`, `ad_skip`
  - Social: `leaderboard_view`, `score_submitted`, `ghost_replay_started`, `challenge_shared`, `friend_added`
  - Session: `session_start`, `session_end`, `app_background`, `app_foreground`
  - _Requirements: 31.5_

  - [ ]* 16.1.3a Write integration tests for progression, economy, and social event batches
    - _Requirements: 31.5_


## Feature 16.2: Crashlytics, Remote Config, and Firebase Alerts

**Purpose:** Implement Crashlytics crash reporting, Remote Config integration, and Firebase Alert configuration.
**Architecture:** `RemoteConfigService.ts`; Crashlytics auto-collection + custom non-fatal events; alerts configured in Firebase console; Remote Config fetch-at-start with 1-hour cache.
**Dependencies:** Feature 16.1, Epic 1 (Firebase setup)
**Acceptance Criteria:** Crashlytics captures crashes with physics state context; non-fatal events logged for NaN recovery, stuck detection; Remote Config fetches at start, caches 1h, uses hardcoded defaults on failure; all 7 Firebase Alerts configured.
**Testing Requirements:** Integration test for Remote Config fetch and fallback; unit test for non-fatal event logging.

- [ ] 16.2.1 Implement RemoteConfigService with fetch, cache, and fallback
  - `src/services/firebase/RemoteConfigService.ts`
  - Fetch at app start; cache for 1 hour
  - Fallback to hardcoded defaults in `src/constants/remoteConfigDefaults.ts` on failure
  - Apply new values only between sessions (never mid-challenge)
  - _Requirements: 28.5, 28.6, 16.6_

  - [ ]* 16.2.1a Write integration test: Remote Config unavailable → fallback defaults used
    - _Requirements: 28.6_

- [ ] 16.2.2 Implement Crashlytics custom events and physics state context
  - Configure Crashlytics auto-collection
  - Custom non-fatal events: NaN recovery (`physics_nan_recovery`), stuck detection (`ring_stuck_teleport`), golden replay mismatch
  - Add physics state context to every crash report: activeRingCount, challengeNumber, D(N), platform, deviceTier
  - _Requirements: 10.8_

  - [ ]* 16.2.2a Write unit test for Crashlytics non-fatal logging on NaN detection
    - _Requirements: 10.8_

- [ ] 16.2.3 Configure Firebase Alerts for all 7 monitoring thresholds
  - Alert 1: crash rate > 0.5% → P1
  - Alert 2: ANR rate > 0.2% → P1
  - Alert 3: API error rate > 2% → P2
  - Alert 4: D1 retention drop > 5 points → P2
  - Alert 5: economy sink:earn ratio < 0.15 → P3
  - Alert 6: leaderboard submission rejection rate > 10% → P2
  - Alert 7: daily challenge generation failure → P1
  - _Requirements: 55.7_

  - [ ]* 16.2.3a Document Firebase Alert setup and on-call escalation procedures
    - _Requirements: 55.7, 55.10_

## Epic 16: Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["16.1.1"] },
    { "id": 1, "tasks": ["16.1.1a", "16.1.1b", "16.1.2", "16.2.1"] },
    { "id": 2, "tasks": ["16.1.2a", "16.1.3", "16.2.1a", "16.2.2"] },
    { "id": 3, "tasks": ["16.1.3a", "16.2.2a", "16.2.3"] },
    { "id": 4, "tasks": ["16.2.3a"] }
  ]
}
```

**Critical Path:** 16.1.1 → 16.1.2 → 16.1.3 (service → gameplay events → all events)
**Parallelizable:** RemoteConfig (16.2.1), Crashlytics (16.2.2), and event batches (16.1.2, 16.1.3) are independent
**Blocking Tasks:** 16.1.1 (AnalyticsService) blocks all event tracking; 16.2.3 (alerts) needed before launch

---


# Epic 17: Accessibility

**Objectives:** Implement all accessibility modes: VoiceOver/TalkBack screen reader support on all 18 screens, color-blind mode (3 presets), motor accessibility (enlarged targets, simplified gestures), reduced-motion mode, mono audio, and large text scaling.
**Business Value:** Accessibility is both a legal requirement and a market opportunity. Games that pass full VoiceOver/TalkBack certification can reach 15% more players. App Store review increasingly rejects apps with accessibility failures.
**Dependencies:** Epics 8, 9, 10
**Technical Risks:** VoiceOver focus order in complex game screen must be manually tested; color-blind shader variants require Skia uniform changes; reduced-motion variants need careful parallel implementation.
**Success Criteria:** axe-core zero WCAG 2.1 AA violations; full VoiceOver pass on all 18 screens; full TalkBack pass; all ring/peg combos work in all 3 color-blind presets; reduced-motion mode removes all motion-triggered animations.
**Estimated Duration:** Weeks 17–21 (Milestone 9)
**Required Roles:** Accessibility Engineer (lead), QA Engineer
**Definition of Done:** axe-core passes CI; manual VoiceOver and TalkBack passes documented; color-blind test matrix complete; all interactive elements have accessibility labels.

---

## Feature 17.1: Screen Reader Support (VoiceOver and TalkBack)

**Purpose:** Add complete accessibility props to all 18 screens and all interactive components for VoiceOver (iOS) and TalkBack (Android).
**Architecture:** All interactive components get `accessibilityRole`, `accessibilityLabel`, `accessibilityHint`; game state changes announced via `AccessibilityInfo.announceForAccessibility`; focus order managed with `accessibilityViewIsModal`.
**Dependencies:** Epic 8 (all screens)
**Acceptance Criteria:** Every interactive element has role + label + hint; game events announced (ring landed, timer warning, win, defeat); modals trap focus correctly; focus order is logical on all screens.
**Edge Cases:** Game screen has complex dynamic content — ring positions must be announced on settle, not continuously; timer announcements every 10 seconds in critical zone.
**Testing Requirements:** Automated axe-core test in CI; manual VoiceOver pass documented.

- [ ] 17.1.1 Add accessibility props to all interactive components in GameScreen and HUD
  - `WaterButton`: `accessibilityRole="button"`, `accessibilityLabel="Left water button"`, `accessibilityHint="Press to push water right"`
  - `TimerArc`: `accessibilityLabel="Timer: [X] seconds remaining"` (updated on state change)
  - `ChallengeHUD` elements: challenge number, star count, continue count all labeled
  - Announce game events: ring landed (success sound + announcement), win, defeat, timer critical
  - _Requirements: 33.6, 54.1_

  - [ ]* 17.1.1a Write axe-core accessibility test for GameScreen (zero AA violations)
    - _Requirements: 47.5_

- [ ] 17.1.2 Add accessibility props to all 17 secondary screens
  - All buttons, links, form elements on all 17 non-game screens
  - Modals: `accessibilityViewIsModal={true}`; focus moves to modal on open; returns to trigger on close
  - Lists (leaderboard, achievements): `accessibilityRole="list"`, items `accessibilityRole="listitem"`
  - Charts (StatisticsScreen): provide data table alternative with `accessibilityRole="table"`
  - _Requirements: 54.1, 54.2_

  - [ ]* 17.1.2a Write axe-core accessibility tests for all 17 secondary screens
    - _Requirements: 47.5_

  - [ ]* 17.1.2b Document manual VoiceOver test procedure for all 18 screens
    - _Requirements: 54.1_

  - [ ]* 17.1.2c Document manual TalkBack test procedure for all 18 screens
    - _Requirements: 54.2_


## Feature 17.2: Color-Blind Mode and Visual Accessibility

**Purpose:** Implement color-blind mode with 3 presets (deuteranopia, protanopia, tritanopia) and visual accessibility for ring/peg color pairs.
**Architecture:** Skia shader uniform changes for water color; ring skins use pattern + shape differentiation (not color alone); settings option for preset selection.
**Dependencies:** Epic 5 (rendering), Epic 8 (settings)
**Acceptance Criteria:** All 6 ring/peg color pairs distinguishable in all 3 presets using pattern + shape; color-blind shader applied to water rendering; no gameplay-critical information conveyed by color alone.
**Edge Cases:** Color-blind mode + custom water color cosmetic — cosmetic must be adjusted if conflicting.
**Testing Requirements:** Color-blind simulation test matrix (6 colors × 3 presets = 18 combinations); all pass readability.

- [ ] 17.2.1 Implement color-blind mode presets and ring pattern differentiation
  - `settingsSlice.colorBlindPreset`: none, deuteranopia, protanopia, tritanopia
  - Ring visual differentiation: each color has unique pattern (stripes, dots, solid, cross-hatch, etc.) in addition to color
  - Color-blind shader uniforms: adjust ring and peg colors to accessible combinations per preset
  - _Requirements: 54.3_

  - [ ]* 17.2.1a Write color-blind simulation test: all 6 ring colors distinguishable in all 3 presets
    - _Requirements: 54.3_

- [ ] 17.2.2 Implement reduced-motion mode and motor accessibility
  - Reduced-motion: system preference detected via `AccessibilityInfo.isReduceMotionEnabled`; in-game toggle as override
  - Replace all motion-triggered animations with opacity fades (per animation spec)
  - Motor accessibility: enlarged touch targets (+20% beyond 88dp for WaterButton in motor mode), hold-repeat disabled, simplified gesture detection
  - Large text scaling: test at 150% and 200%; all text containers use `adjustsFontSizeToFit` fallback
  - _Requirements: 34.6, 40.4_

  - [ ]* 17.2.2a Write integration test: reduced-motion active → all animations use opacity fade
    - _Requirements: 34.6_

  - [ ]* 17.2.2b Write large-text layout test at 150% and 200% text scale
    - _Requirements: 40.4_

## Epic 17: Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["17.1.1", "17.2.1"] },
    { "id": 1, "tasks": ["17.1.1a", "17.1.2", "17.2.1a", "17.2.2"] },
    { "id": 2, "tasks": ["17.1.2a", "17.1.2b", "17.1.2c", "17.2.2a", "17.2.2b"] }
  ]
}
```

**Critical Path:** 17.1.1 → 17.1.2 → 17.1.2a (game screen → all screens → automated test)
**Parallelizable:** Color-blind (17.2.1) and reduced-motion (17.2.2) are independent; all secondary screen accessibility (17.1.2) tasks are parallel
**Blocking Tasks:** 17.1.1 must complete before manual VoiceOver pass (launch gate); 17.2.1 needed for launch accessibility gate

---


# Epic 18: Performance

**Objectives:** Implement performance budgets, automatic tier-based scaling, memory management (texture atlas release, audio buffer management), and all optimizations needed to meet hard frame time limits on reference devices.
**Business Value:** Performance is table stakes for a top-chart game. A game that drops below 60fps or crashes with OOM on common devices will be removed from the App Store top charts by the algorithm within days.
**Dependencies:** Epics 4, 5, 9
**Technical Risks:** Skia draw call batching on Android with complex water layers; audio buffer memory on theme switches; texture atlas 50MB limit; JS thread must stay under 2ms.
**Success Criteria:** P95 frame time < 12ms on iPhone 11 and Pixel 5; physics tick < 4ms; render < 8ms; heap < 150MB; cold start < 3s; all budgets met per Requirement 42–44.
**Estimated Duration:** Weeks 17–21 (Milestone 9, ongoing throughout all epics)
**Required Roles:** Performance Engineer (lead)
**Definition of Done:** Maestro performance suite passes all benchmarks on physical devices; P95 frame time under limit; heap under limit; all resource cleanup implemented.

---

## Feature 18.1: Frame Time Optimization and Resource Management

**Purpose:** Implement frame time optimizations, object pooling validation, and all memory management systems.
**Architecture:** Physics object pooling (Epic 4); Skia dirty-flag optimization (Epic 5); texture atlas lifecycle management; audio buffer lifecycle; GC pressure reduction.
**Dependencies:** Epics 4, 5, 9
**Acceptance Criteria:** Total frame time < 13ms target, < 16.67ms hard on iPhone 11; physics tick < 4ms; render < 8ms; JS thread < 2ms; GPU < 60% sustained; P95 < 12ms.
**Edge Cases:** Victory screen particle burst must not cause frame drops (60 particles); audio theme switch must release old buffers immediately.
**Testing Requirements:** Maestro performance benchmark suite; manual Flipper profiling session documented.

- [ ] 18.1.1 Implement texture atlas lifecycle management
  - Release all texture atlases on `GameScreen` unmount via `useEffect` cleanup
  - Reload asynchronously on next `GameScreen` entry
  - Atlas memory budget: ≤ 50MB
  - Track with Flipper memory timeline
  - _Requirements: 40.6, 43.2_

  - [ ]* 18.1.1a Write integration test: leave GameScreen → atlas released; re-enter → reloaded
    - _Requirements: 40.6_

- [ ] 18.1.2 Implement audio buffer memory management
  - Release inactive theme stems on theme switch
  - Audio buffer budget: ≤ 20MB
  - _Requirements: 43.3_

  - [ ]* 18.1.2a Write integration test: theme switch → old stems released within 500ms
    - _Requirements: 43.3_

- [ ] 18.1.3 Implement ghost replay LRU cache management
  - Max total ghost replay cache: 50MB
  - LRU eviction when limit exceeded
  - _Requirements: 40.7_

  - [ ]* 18.1.3a Write unit test for LRU eviction trigger at 50MB limit
    - _Requirements: 40.7_

- [ ] 18.1.4 Validate particle count caps and garbage collection prevention
  - Assert: bubbles ≤ 40, ripples ≤ 20, button particles ≤ 30, victory particles ≤ 60 via pool limits
  - Profile GC pauses with Hermes profiler; ensure no allocation during gameplay render loop
  - Pre-allocate all physics bodies at challenge start (no new Matter.js body during gameplay)
  - _Requirements: 43.4, 24.4_

  - [ ]* 18.1.4a Write performance benchmark: 60 victory particles + 40 bubbles + 20 ripples at same time; assert < 16.67ms frame
    - _Requirements: 42.1_

## Feature 18.2: Performance Benchmark Suite and Device Testing

**Purpose:** Run the complete Maestro performance benchmark suite on physical reference devices and verify all budgets.
**Architecture:** Maestro flows for: cold start, challenge generation, first render, P95 frame time, Victory transition; Fastlane integration for device testing.
**Dependencies:** Feature 18.1; all gameplay epics complete
**Acceptance Criteria:** Cold start < 3s on iPhone 11, < 4s on Pixel 5; challenge generation < 80ms target; P95 frame time < 12ms on both devices; app size < 100MB.
**Testing Requirements:** Maestro suite runs on Fastlane device farm; results stored as CI artifacts.

- [ ] 18.2.1 Run Maestro benchmark suite on iPhone 11 and Pixel 5
  - Run: cold_start.yaml, challenge_load.yaml, gameplay_30s.yaml, victory_sequence.yaml
  - Assert all within budget; fail CI if any exceeds hard limit
  - _Requirements: 47.4, 53.5, 53.6, 53.7_

  - [ ]* 18.2.1a Document performance profiling session (Flipper + Hermes) with screenshots
    - _Requirements: 53.6_

- [ ] 18.2.2 Implement auto-drop to 30fps when 60fps cannot be sustained
  - Monitor frame time rolling average; if P10 > 14ms for 3s: double fixed timestep (30fps mode)
  - Log `frame_drop` analytics event on tier downgrade
  - _Requirements: 42.6, 24.2_

  - [ ]* 18.2.2a Write integration test: simulated slow device → auto-downgrade to 30fps mode
    - _Requirements: 42.6_

## Epic 18: Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["18.1.1", "18.1.2", "18.1.3", "18.1.4"] },
    { "id": 1, "tasks": ["18.1.1a", "18.1.2a", "18.1.3a", "18.1.4a"] },
    { "id": 2, "tasks": ["18.2.1", "18.2.2"] },
    { "id": 3, "tasks": ["18.2.1a", "18.2.2a"] }
  ]
}
```

**Critical Path:** 18.1.4 → 18.2.1 (caps validated → full benchmark suite)
**Parallelizable:** All resource management tasks (18.1.1–18.1.4) are fully independent
**Blocking Tasks:** 18.2.1 (Maestro benchmark) is a launch gate — must pass before submission

---


# Epic 19: Testing

**Objectives:** Implement and execute the complete test strategy: unit tests (all pure functions), property-based tests (all 20 correctness properties), integration tests (Firebase emulator), 20 golden replay determinism tests, E2E Detox tests, and performance benchmark suite. All tests must pass before launch.
**Business Value:** Testing is launch insurance. A single physics determinism bug affecting leaderboard fairness at launch can destroy player trust in 24 hours and tank app store ratings. All 20 property tests exist specifically to prevent this.
**Dependencies:** All feature epics complete (final integration)
**Technical Risks:** Detox E2E on Android has known flakiness with timing; golden replay test must account for floating-point accumulation across long sessions; Firebase emulator must match production rules exactly.
**Success Criteria:** Unit test suite: 100% pass, coverage thresholds met; all 20 property tests: 500 runs each; 20 golden replays: pass byte-for-byte; integration tests: all scenarios green; E2E: pass on iOS Sim and Android Emulator; accessibility scan: zero AA violations.
**Estimated Duration:** Weeks 20–24 (Milestone 10, QA pass)
**Required Roles:** QA Engineer (lead), all engineers
**Definition of Done:** All CI checks green on release branch; coverage gates met; golden replay suite passes; accessibility zero violations; performance gates met.

---

## Feature 19.1: Unit Test Completeness Audit

**Purpose:** Ensure all pure functions have complete unit tests per Requirement 45.2.
**Architecture:** Jest 29 test suite; each function tested in isolation; mock for any dependencies.
**Dependencies:** All feature epics
**Acceptance Criteria:** All functions from Req 45.2 have dedicated unit tests; coverage gates: statements 75%, branches 70%, functions 80%, lines 75%; unit suite runs in < 30 seconds.
**Testing Requirements:** Self-referential — the test suite validates the rest of the codebase.

- [ ] 19.1.1 Audit and complete unit tests for all required pure functions
  - Functions requiring tests: `generateMasterSeed`, `D(N)`, `poissonDisk`, `qualityScore`, `computeBuoyancy`, `computeButtonForce`, `continueCost`, `continueBonusTime`, `timerBase`, `xpRequired`, `resolveConflict`, all migration functions in MIGRATIONS
  - Create any missing tests; ensure each has at least 5 test cases per function
  - _Requirements: 45.2_

  - [ ]* 19.1.1a Run coverage report; confirm all gates met (statements 75%, branches 70%, functions 80%, lines 75%)
    - _Requirements: 45.5, 53.2_

- [ ] 19.1.2 Implement and test all state machine transition tests
  - Game State Machine: all valid transitions (Idle → Loading → Playing → Paused → Victory → Defeat)
  - Input State Machine: all 6 input type transitions
  - Sync State Machine: Offline → Syncing → Synced → Dirty and all edges
  - _Requirements: 45.3_

  - [ ]* 19.1.2a Write unit tests for all invalid state machine transitions (should throw or be no-ops)
    - _Requirements: 45.3_

## Feature 19.2: All 20 Property-Based Tests Completeness Audit

**Purpose:** Ensure all 20 correctness properties from the requirements document have passing property tests.
**Architecture:** fast-check 3.x; 500 runs per property in CI; each property in its own file; counterexample logged on failure.
**Dependencies:** All feature epics
**Acceptance Criteria:** All 20 properties have dedicated property tests; all pass at 500 runs; counterexample attached to PR on failure.
**Testing Requirements:** CI blocks build on property test failure.

- [ ] 19.2.1 Verify all 20 property tests are implemented and passing
  - Properties to verify: 1 (force boundedness), 2 (no force on settled), 3 (buoyancy direction), 4 (button symmetry), 5 (challenge determinism), 6 (peg separation), 7 (bijection), 8 (arena containment), 9 (difficulty monotonicity), 10 (difficulty ceiling), 11 (coin conservation), 12 (continue escalation), 13 (idempotent credit), 14 (non-negative balance), 15 (timer monotonicity), 16 (continue bonus bounded), 17 (leaderboard ordering), 18 (min solve gate), 19 (sync idempotency), 20 (cosmetic isolation)
  - Cross-reference each property test against the requirements document property number
  - _Requirements: 46.1, 46.2_

  - [ ]* 19.2.1a Run all 20 property tests at 1000 runs (double CI minimum) as pre-launch audit
    - _Requirements: 46.1, 53.3_


## Feature 19.3: Integration Tests, Golden Replay Suite, and E2E Tests

**Purpose:** Run complete integration tests against Firebase emulator, verify all 20 golden replay determinism tests, and run E2E Detox tests.
**Architecture:** Firebase emulator suite; Detox for E2E; golden replay binary fixture comparison.
**Dependencies:** Feature 19.1, 19.2; all feature epics
**Acceptance Criteria:** All integration scenarios green; all 20 golden replays pass byte-for-byte; E2E passes on iOS Simulator and Android Emulator; CI fails immediately on golden replay mismatch.
**Testing Requirements:** CI job for each test category; failure messages include counterexample or diff.

- [ ] 19.3.1 Run and verify complete integration test suite against Firebase emulator
  - Scenarios: full challenge lifecycle, continue flow, offline + sync, IAP flow, conflict resolution, schema migration (all MIGRATIONS)
  - All scenarios must pass before release branch is created
  - _Requirements: 47.1, 53.1_

  - [ ]* 19.3.1a Write missing integration test scenarios (audit against Requirement 47.1 list)
    - _Requirements: 47.1_

- [ ] 19.3.2 Run and verify all 20 golden replay determinism tests
  - Load all 20 fixtures from `__tests__/fixtures/golden/`; re-run simulation; compare byte-for-byte
  - Failure message: "Physics determinism broken — increment generatorVersion if intentional"
  - _Requirements: 47.2, 47.3, 53.3_

  - [ ]* 19.3.2a Update golden replay fixtures for release build (regenerate with release binary)
    - _Requirements: 24.8_

- [ ] 19.3.3 Implement and run Detox E2E test suite
  - E2E flows: onboarding challenge 1, complete challenge, continue flow, store purchase, settings navigation
  - Run on iOS Simulator and Android Emulator in CI
  - _Requirements: 53.1_

  - [ ]* 19.3.3a Document Detox flakiness mitigations (timeouts, wait conditions)
    - _Requirements: 53.1_

## Feature 19.4: Manual QA and Accessibility Pre-Launch Test Pass

**Purpose:** Conduct final manual QA pass on 5+ physical devices, complete accessibility test matrix.
**Architecture:** Manual test plans documented; tested on: iPhone 11, iPhone 14 Pro, Samsung Galaxy A32, Pixel 5, plus one low-end Android (2020 or earlier).
**Dependencies:** Feature 19.3; all feature epics
**Acceptance Criteria:** No P0 bugs; no P1 bugs in core gameplay; full VoiceOver and TalkBack pass on physical devices; color-blind matrix complete; large text 200% passes.
**Testing Requirements:** Manual test results documented; sign-off from QA lead and engineering lead.

- [ ] 19.4.1 Conduct manual QA pass on all 5 required physical devices
  - Test matrix: core gameplay, all 18 screens, all modals, audio, haptics, continue flow, offline mode, IAP sandbox
  - Document any bugs found; P0s block release; P1s require fix plan
  - _Requirements: 53.7_

  - [ ]* 19.4.1a Document manual QA test results and sign-off sheet
    - _Requirements: 53.7_

- [ ] 19.4.2 Complete accessibility test matrix on physical devices
  - VoiceOver on iPhone 14 Pro: all 18 screens
  - TalkBack on Pixel 5: all 18 screens
  - Color-blind simulation: all ring/peg combinations in all 3 presets
  - Large text at 200%: all screens, no clipping
  - _Requirements: 54.1, 54.2, 54.3, 47.6_

  - [ ]* 19.4.2a Document accessibility test results with pass/fail per screen
    - _Requirements: 54.1, 54.2_

## Epic 19: Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["19.1.1", "19.2.1"] },
    { "id": 1, "tasks": ["19.1.1a", "19.1.2", "19.2.1a"] },
    { "id": 2, "tasks": ["19.1.2a", "19.3.1", "19.3.2"] },
    { "id": 3, "tasks": ["19.3.1a", "19.3.2a", "19.3.3"] },
    { "id": 4, "tasks": ["19.3.3a", "19.4.1"] },
    { "id": 5, "tasks": ["19.4.1a", "19.4.2"] },
    { "id": 6, "tasks": ["19.4.2a"] }
  ]
}
```

**Critical Path:** 19.1.1 → 19.3.2 → 19.4.1 (unit tests → golden replay → manual QA)
**Parallelizable:** Unit test audit (19.1.x) and property test audit (19.2.x) are fully parallel; device QA can run in parallel with CI-based tests
**Blocking Tasks:** 19.3.2 (golden replay) is a hard launch gate; 19.4.2 (accessibility) is a launch gate per Requirement 54

---


# Epic 20: Launch

**Objectives:** Complete all launch readiness checklist items: App Store and Google Play metadata in 8 locales, privacy policy and ToS publication, TestFlight and Internal Track deployment, production Firebase deployment and smoke testing, staged rollout configuration, on-call rotation definition, and final sign-off.
**Business Value:** A flawed launch is extremely expensive to recover from. Day-1 crash rates above 0.5% trigger App Store algorithmic suppression. A structured launch checklist prevents the most common launch failures.
**Dependencies:** All epics complete; all launch gates passed (Epics 18, 19)
**Technical Risks:** Apple review may reject for undisclosed data collection; staged Android rollout must have clear pause criteria; production Firebase must differ from dev/staging in all config.
**Success Criteria:** App Store submission accepted without rejection; all 7 Firebase Alerts active; staged rollout proceeds to 100% without pausing; on-call rotation staffed for first 7 days; D1 retention ≥ benchmark target.
**Estimated Duration:** Weeks 20–24 (Milestone 10)
**Required Roles:** Engineering Manager (lead), Product Manager, all engineers
**Definition of Done:** App submitted to both stores; all launch gates signed off; production smoke tests complete; on-call rotation documented and active.

---

## Feature 20.1: App Store and Play Store Submission Preparation

**Purpose:** Prepare all app store metadata, screenshots, descriptions, and privacy documentation in all 8 locales.
**Architecture:** App Store Connect and Google Play Console; Fastlane `deliver` (iOS) and `supply` (Android) for metadata management; all strings localized.
**Dependencies:** Epics 1–19 (all features complete); localization (Requirement 40)
**Acceptance Criteria:** All 8 locales have: app name, subtitle, description, keywords, promotional text, IAP descriptions; screenshots prepared for all required device sizes; Privacy Policy and ToS at public URLs; all IAPs created and sandbox tested.
**Testing Requirements:** Sandbox IAP test documented; metadata preview reviewed by product.

- [ ] 20.1.1 Prepare App Store metadata in all 8 locales
  - Create/update App Store Connect listing: name, subtitle (≤30 chars), description, keywords, promotional text
  - Locales: en-US, es-ES, fr-FR, de-DE, ja-JP, ko-KR, zh-Hans, pt-BR
  - All IAPs created: continue packs, coin bundles, cosmetic bundles; descriptions localized
  - Privacy Nutrition Labels: declare all data types collected (usage data, identifiers, diagnostics)
  - _Requirements: 54.5, 54.7_

  - [ ]* 20.1.1a Review all 8 locale metadata for accuracy with native speaker confirmation (P2)
    - _Requirements: 54.5_

- [ ] 20.1.2 Prepare Google Play Store metadata and App Bundle
  - Play Console listing: title, short description (≤80 chars), full description, all 8 locales
  - Content rating questionnaire completed (IARC/ESRB)
  - Data safety form: declare all Firebase/RevenueCat/AdMob data collection
  - App Bundle (`.aab`) built and uploaded to Internal Track
  - _Requirements: 54.5_

  - [ ]* 20.1.2a Verify Data Safety form matches actual data collection implementation
    - _Requirements: 54.5_

- [ ] 20.1.3 Publish Privacy Policy and Terms of Service
  - Host at public URLs (e.g., Firebase Hosting)
  - Link from: App Store listing, Play Store listing, in-app SettingsScreen, first-launch screen
  - _Requirements: 54.6_

  - [ ]* 20.1.3a Verify all 3 Privacy Policy link locations are functional (deep link test)
    - _Requirements: 54.6_


## Feature 20.2: Production Firebase Deployment and Smoke Testing

**Purpose:** Deploy all Firebase services to production, run smoke tests with production Auth tokens, verify all alerts.
**Architecture:** Firebase production project; Cloud Functions deployed via `firebase deploy --only functions`; security rules deployed; all 7 Firebase Alerts configured.
**Dependencies:** All backend epics complete (Epics 13–16)
**Acceptance Criteria:** All 5 Cloud Functions smoke-tested in production; all security rules reviewed by 2 engineers; analytics events visible in production DebugView; all 7 Firebase Alerts active.
**Testing Requirements:** Manual smoke test checklist signed off by backend engineer + security reviewer.

- [ ] 20.2.1 Deploy all Cloud Functions to production and run smoke tests
  - `firebase deploy --only functions` to production project
  - Manual smoke tests with production Auth tokens: leaderboard submit/retrieve, economy credit/spend, daily challenge generation, anti-cheat trigger
  - _Requirements: 55.2, 55.6_

  - [ ]* 20.2.1a Document smoke test results for all 5 Cloud Functions (sign-off required)
    - _Requirements: 55.2_

- [ ] 20.2.2 Deploy and review Firestore security rules for production
  - Security rules reviewed by 2 engineers (cross-reference against Requirement 26)
  - Rule test suite passes 100% against production rules
  - _Requirements: 55.1_

  - [ ]* 20.2.2a Document security review sign-off (2 engineer signatures)
    - _Requirements: 55.1_

- [ ] 20.2.3 Validate all 60+ analytics events in Firebase DebugView
  - Run test session with DebugView active; verify every event in catalog fires
  - RevenueCat: configure all products/entitlements; end-to-end sandbox purchase test
  - AdMob/IronSource: rewarded video serves and completes in device test with production placement IDs
  - _Requirements: 55.3, 55.4, 55.5_

  - [ ]* 20.2.3a Document analytics validation: event checklist with screenshot for each event group
    - _Requirements: 55.3_

## Feature 20.3: Staged Rollout, On-Call, and Final Launch

**Purpose:** Configure staged rollout, define on-call rotation, execute launch, and establish Day-1 monitoring.
**Architecture:** iOS phased release (7-day); Android staged rollout (5% → 20% → 50% → 100%); pause criteria documented; on-call playbook written.
**Dependencies:** Features 20.1, 20.2; all testing epics passed
**Acceptance Criteria:** iOS submitted with phased rollout enabled; Android at 5% initial rollout; pause criteria documented; on-call rotation staffed for 7 days; rollback plan documented.
**Testing Requirements:** Rollback plan tested (can we pull the 5% Android rollout?).

- [ ] 20.3.1 Submit iOS app with phased rollout enabled
  - Build production IPA via Fastlane; submit to App Store Connect via `fastlane deliver`
  - Enable phased release (7-day rollout period)
  - _Requirements: 55.9_

  - [ ]* 20.3.1a Document App Store submission checklist (all Review Information fields completed)
    - _Requirements: 55.9_

- [ ] 20.3.2 Submit Android app with staged rollout at 5%
  - Build release AAB via Fastlane; submit to Google Play via `fastlane supply`
  - Set initial rollout to 5%; document pause criteria (crash > 0.5% OR ANR > 0.2%)
  - Staged rollout plan: 5% (Day 1) → 20% (Day 3) → 50% (Day 5) → 100% (Day 7) if no alerts
  - _Requirements: 55.8_

  - [ ]* 20.3.2a Document Android rollout plan with pause criteria and escalation contacts
    - _Requirements: 55.8_

- [ ] 20.3.3 Define on-call rotation and launch monitoring playbook
  - On-call rotation: at least 1 engineer per 24-hour period for first 7 days post-launch
  - Monitoring dashboard: crash rate, ANR rate, D1 retention, economy ratios, leaderboard submission rate
  - Incident playbook: crash spike → rollback steps; economy bug → disable coins → patch deploy
  - _Requirements: 55.10_

  - [ ]* 20.3.3a Conduct pre-launch war game: simulate a P1 crash incident and walk through playbook
    - _Requirements: 55.10_

## Epic 20: Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["20.1.1", "20.1.2", "20.1.3"] },
    { "id": 1, "tasks": ["20.1.1a", "20.1.2a", "20.1.3a", "20.2.1", "20.2.2"] },
    { "id": 2, "tasks": ["20.2.1a", "20.2.2a", "20.2.3"] },
    { "id": 3, "tasks": ["20.2.3a", "20.3.1", "20.3.3"] },
    { "id": 4, "tasks": ["20.3.1a", "20.3.2", "20.3.3a"] },
    { "id": 5, "tasks": ["20.3.2a"] }
  ]
}
```

**Critical Path:** 20.1.1 + 20.1.2 (parallel) → 20.2.1 → 20.2.3 → 20.3.1 + 20.3.2 (parallel submissions)
**Parallelizable:** iOS metadata (20.1.1) and Android metadata (20.1.2) are fully parallel; iOS and Android submissions (20.3.1, 20.3.2) are parallel
**Blocking Tasks:** Security rules review (20.2.2) must complete before production deployment; analytics validation (20.2.3) is a hard launch gate per Requirement 55.3

---


---

# Milestone Checkpoints

- [ ] Milestone 1 Checkpoint (End of Week 4) — Ensure all CI checks pass on empty project; Firebase emulator tests run; branch protection active; all engineers can build in < 30 minutes. Ask the user if questions arise.

- [ ] Milestone 2 Checkpoint (End of Week 8) — Ensure a single challenge is playable on iOS and Android; physics tick < 4ms; force boundedness, buoyancy direction, and button symmetry property tests pass. Ask the user if questions arise.

- [ ] Milestone 3 Checkpoint (End of Week 9) — Ensure challenge determinism property test passes at 1000 runs; difficulty monotonicity and ceiling properties pass; ≥95% of generated challenges pass QS ≥ 0.65 without retries. Ask the user if questions arise.

- [ ] Milestone 4 Checkpoint (End of Week 11) — Ensure render frame time < 8ms on iPhone 11; all 5 water layers active on high-end tier; low-end tier auto-disables layers 4–5; water receives ≥80% team playtest approval. Ask the user if questions arise.

- [ ] Milestone 5 Checkpoint (End of Week 13) — Ensure all SFX trigger correctly; adaptive music state machine works; all 25 haptic events fire; onboarding challenges 1–20 complete without rage-quits. Ask the user if questions arise.

- [ ] Milestone 6 Checkpoint (End of Week 15) — Ensure all 7 Zustand slices persist; SyncManager syncs correctly; all Cloud Functions deployed to staging; RevenueCat sandbox purchase completes; economy property tests pass. Ask the user if questions arise.

- [ ] Milestone 7 Checkpoint (End of Week 17) — Ensure all 18 screens render; all modals work; VictoryModal sequence ≥4 seconds; XP/level system works; all animations match spec parameters. Ask the user if questions arise.

- [ ] Milestone 8 Checkpoint (End of Week 19) — Ensure leaderboard submission works with validation; ghost replay works; replay recording and playback deterministic; daily challenge generates at midnight. Ask the user if questions arise.

- [ ] Milestone 9 Checkpoint (End of Week 21) — Ensure all 60+ analytics events fire; axe-core zero violations; all property tests pass at 500 runs; adaptive assist activates on frustration; all 20 collections defined. Ask the user if questions arise.

- [ ] Milestone 10 Checkpoint (End of Week 24 — Launch Gate) — ALL CI checks pass; all performance benchmarks met; all golden replays pass; all 5 physical device tests complete; accessibility matrix complete; store metadata in 8 locales; production Firebase smoke tests done; on-call rotation staffed. Ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional/QA tasks and can be skipped for faster MVP, but all are strongly recommended before launch.
- Every engineering task references specific requirements for traceability — the requirement numbers map directly to `requirements.md`.
- All 20 correctness properties from `requirements.md` are covered by property-based tests distributed across Epics 3, 4, 6, 7, 11, 12, 13, 14, and 19.
- The golden replay suite (20 fixtures) is a hard launch gate — failure means physics changed non-deterministically.
- Performance gates are hard limits: any CI run that exceeds frame time budgets on reference devices must be blocked.
- The staged rollout (Epic 20) is designed to catch production-only issues before they reach 100% of users.
- Property tests validate universal invariants; unit tests validate specific examples. Both are required and complementary.
- All optional subtasks marked `*` are documented for traceability but implementations will be skipped by the coding agent.


---

## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1.1.1", "1.1.2"],
      "description": "Project initialization — no dependencies"
    },
    {
      "id": 1,
      "tasks": ["1.1.3", "1.2.1", "1.3.1", "1.5.1", "1.1.1a", "1.1.2a"],
      "description": "Core tooling + Firebase SDK — depend on project scaffold"
    },
    {
      "id": 2,
      "tasks": ["1.2.2", "1.2.3", "1.3.2", "1.5.2", "1.5.3", "1.3.1a", "2.1.1", "2.1.2", "2.1.3", "2.1.4"],
      "description": "ESLint rules, test infra, Firebase emulator, Zustand slices — all parallel"
    },
    {
      "id": 3,
      "tasks": ["1.4.1", "1.4.2", "1.4.3", "1.5.4", "2.2.1", "2.3.1", "6.1.1"],
      "description": "CI pipeline + MMKV + event emitter + PRNG — all parallel"
    },
    {
      "id": 4,
      "tasks": ["1.4.4", "1.4.5", "1.6.1", "2.2.2", "2.3.2", "2.3.3", "6.2.1", "4.1.1", "4.1.2", "4.1.3", "4.1.4"],
      "description": "Fastlane + DI context + difficulty calc + physics bodies — parallel"
    },
    {
      "id": 5,
      "tasks": ["1.6.2", "3.1.1", "4.2.1", "4.2.2", "4.2.3", "4.2.4", "6.2.2", "6.5.1", "9.1.1", "9.3.1"],
      "description": "GameLoop + force layers + seed arch + audio engine + haptics — parallel"
    },
    {
      "id": 6,
      "tasks": ["3.1.2", "3.1.3", "3.2.1", "3.3.1", "3.3.2", "4.2.5", "6.3.1", "6.3.2", "6.3.3", "9.1.2", "9.3.2"],
      "description": "Interpolation + input + win/loss + drag model + pipeline steps 5-8"
    },
    {
      "id": 7,
      "tasks": ["3.2.2", "3.3.3", "4.3.1", "4.3.4", "6.3.4", "5.1.1", "5.1.2", "8.1.1", "8.1.2", "8.1.3", "9.2.1"],
      "description": "Physics safety + full pipeline + water base + navigation + music"
    },
    {
      "id": 8,
      "tasks": ["4.3.2", "4.3.3", "5.1.3", "5.2.1", "5.3.1", "6.4.1", "8.2.1", "8.2.2", "8.2.3", "9.2.2", "11.1.1", "11.2.1", "12.1.1"],
      "description": "Stuck detection + displacement + bubbles + solver + game UI + progression + economy"
    },
    {
      "id": 9,
      "tasks": ["5.2.2", "5.3.2", "5.4.1", "6.4.2", "6.4.3", "7.1.1", "8.3.1", "8.3.2", "8.3.3", "8.3.4", "11.1.2", "11.2.2", "12.1.2", "13.1.1"],
      "description": "Wake system + ripple + quality score + challenge load + modals + level system + economy service + Firestore"
    },
    {
      "id": 10,
      "tasks": ["5.4.2", "5.4.3", "5.5.1", "6.5.2", "7.1.2", "7.2.1", "8.4.1", "8.4.2", "8.4.3", "8.4.4", "10.1.1", "10.1.2", "10.1.3", "11.3.1", "12.2.1", "12.3.1", "13.1.2", "13.2.1", "13.3.1", "16.1.1"],
      "description": "Ring/peg rendering + golden replays + session lifecycle + secondary screens + animations + collections + IAP + ads + Cloud Functions + analytics"
    },
    {
      "id": 11,
      "tasks": ["8.5.1", "8.5.2", "8.5.3", "10.2.1", "10.2.2", "12.4.1", "13.2.2", "13.2.3", "13.3.2", "14.1.1", "15.1.1", "16.1.2", "16.2.1", "16.2.2", "17.1.1", "17.2.1", "18.1.1", "18.1.2", "18.1.3", "18.1.4"],
      "description": "Remaining screens + state animations + economy isolation + all remaining Cloud Functions + SyncManager + leaderboard service + replay recorder + events + Remote Config + accessibility + performance"
    },
    {
      "id": 12,
      "tasks": ["7.2.2", "7.3.1", "7.3.2", "14.2.1", "14.2.2", "15.1.2", "15.2.1", "15.2.2", "16.1.3", "16.2.3", "17.1.2", "17.2.2", "18.2.1", "18.2.2"],
      "description": "Adaptive assist + onboarding + leaderboard display + ghost mode + replay upload + player + remaining events + alerts + all secondary screen accessibility + performance benchmarks"
    },
    {
      "id": 13,
      "tasks": ["19.1.1", "19.1.2", "19.2.1", "19.3.1", "19.3.2", "20.1.1", "20.1.2", "20.1.3"],
      "description": "Testing audit + golden replay verification + store metadata — parallel"
    },
    {
      "id": 14,
      "tasks": ["19.3.3", "19.4.1", "20.2.1", "20.2.2", "20.2.3"],
      "description": "E2E tests + manual QA + production deployment"
    },
    {
      "id": 15,
      "tasks": ["19.4.2", "20.3.1", "20.3.2", "20.3.3"],
      "description": "Accessibility matrix + App Store + Play Store submissions + on-call"
    }
  ]
}
```

### Cross-Epic Critical Path
`1.1.1 → 1.1.2 → 2.1.1 → 2.2.1 → 2.3.1 → 4.1.1 → 4.2.1 → 4.2.5 → 6.1.1 → 6.2.1 → 6.3.4 → 7.1.1 → 7.1.2 → 8.2.1 → 19.3.2 → 20.3.1`

### Top Parallelizable Waves
- Wave 2: All 4 Zustand slices (2.1.1–2.1.4) + ESLint rules + test infrastructure + Firebase emulator
- Wave 10: 20 tasks across rendering, screens, animations, IAP, analytics, Cloud Functions
- Wave 11: 20 tasks — all remaining screens, replay, leaderboard, analytics, accessibility, performance

### Hard Blocking Tasks (unblocks multiple epics)
| Task | Unblocks |
|------|---------|
| 1.1.1 (project init) | Everything |
| 2.2.1 (MMKV) | All persistence |
| 4.1.1 (PhysicsWorld) | All physics |
| 6.1.1 (PRNG) | All generation |
| 6.3.4 (pipeline) | Validation, golden replay |
| 8.1.1 (navigation) | All 18 screens |
| 13.1.1 (Firestore service) | All backend features |
| 16.1.1 (AnalyticsService) | All event tracking |
| 19.3.2 (golden replay) | Launch gate |

