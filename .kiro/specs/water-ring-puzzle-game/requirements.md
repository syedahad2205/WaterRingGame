# Requirements Document
## Water Ring Puzzle Game — Implementation Specification

**Version:** 1.0
**Source of Truth:** design.md v2.0
**Purpose:** Complete formal requirements for a 20-person development team to build the Water Ring Puzzle Game with no ambiguity. Covers all 15 implementation specification areas.

---

## Introduction

The Water Ring Puzzle Game is a premium physics-driven mobile puzzle game for iOS and Android, built with React Native. Players control two virtual water-pressure buttons to guide floating rings onto colored conical pegs. The game targets the Top 100 Puzzle Games globally on both stores.

This document derives all requirements from the Game Design Document (design.md v2.0). All 15 parts are covered: Technical Architecture, Project Structure, Class & Module Design, State Management, Physics Engine, Firebase Backend, API Contracts, UI Components, Animation, Asset Pipeline, Performance Budget, Testing Specification, Production Roadmap, Developer Standards, and Launch Readiness.

---

## Glossary

- **Arena**: The full-screen physics simulation viewport containing rings, pegs, water, and obstacles.
- **Ring**: A 2D torus-shaped rigid body that floats in water and must be placed on a matching peg.
- **Peg**: A fixed conical static body with color and size constraints for ring acceptance.
- **ChallengeConfig**: The complete deterministic specification of a single challenge instance.
- **ChallengeGenerator**: The pure function that maps a challenge number to a ChallengeConfig.
- **D(N)**: The deterministic difficulty score for challenge number N (range 0–100).
- **ND**: Normalized Difficulty = D(N) / 100 (range 0.0–1.0).
- **PRNG**: Pseudo-random number generator (xoshiro128** algorithm).
- **GameLoop**: The fixed-timestep physics orchestration controller.
- **PhysicsWorld**: The wrapper around the Matter.js physics engine.
- **WaterRenderer**: The five-layer visual water simulation system.
- **EconomyService**: The service managing coin balances and IAP transactions.
- **SyncManager**: The service managing MMKV to Firestore synchronization.
- **HapticManager**: The service managing device vibration patterns.
- **AudioEngine**: The three-layer adaptive audio system.
- **AdaptiveAssistController**: The invisible player assistance layer.
- **ReplayRecord**: A compressed input-event sequence sufficient to reproduce a full challenge run.
- **Ghost**: A semi-transparent replay overlaid on a live challenge.
- **Coins**: The single soft in-game currency.
- **IAP**: In-app purchase.
- **MMKV**: Mobile key-value storage library used for local persistence.
- **Zustand**: React state management library used for global state slices.
- **Skia**: React Native Skia GPU-accelerated 2D canvas renderer.
- **Reanimated**: React Native Reanimated 3 Worklet-based animation system.
- **RevenueCat**: Third-party IAP management service.
- **Remote Config**: Firebase Remote Config for live parameter tuning.
- **Crashlytics**: Firebase Crashlytics for crash and ANR reporting.
- **Template**: A named challenge mechanic variant (24 templates in v1).
- **Boss Challenge**: An elevated challenge occurring every 50 challenge numbers.
- **Daily Challenge**: A globally shared challenge seeded by calendar date.
- **Quality Score**: A composite 0.0–1.0 score evaluating challenge fun, fairness, and solvability.

---

## Requirements

### Requirement 1: System Architecture Layers

**User Story:** As a tech lead, I want a clearly defined layered architecture with explicit ownership, so that every engineer knows exactly where to place code and how systems communicate.

#### Acceptance Criteria

1. THE System SHALL be organized into three physical tiers: Mobile Client (React Native), Firebase Backend (Auth, Firestore, Analytics, Crashlytics, Remote Config, Cloud Functions, Storage), and Third-Party Services (RevenueCat, AdMob/IronSource).
2. THE Mobile Client SHALL contain exactly these top-level layers: UI Layer (Skia + Reanimated), Game Loop Controller, Audio Engine, Input Handler, Physics Engine, Water Renderer, Adaptive Difficulty Controller, Challenge Generator, and Local Store (MMKV).
3. THE UI Layer SHALL own all rendering of rings, pegs, water, buttons, HUD, and all menus.
4. THE Game Loop Controller SHALL own fixed-timestep physics orchestration, win/loss detection, timer management, and input dispatching.
5. THE Physics Engine SHALL own all rigid body simulation, collision detection, buoyancy computation, and water force application.
6. THE Challenge Generator SHALL be a pure function: it SHALL accept a challenge number and return a ChallengeConfig with no side effects, no network calls, and no store access.
7. WHEN any two components need to communicate, THE System SHALL use exactly one of: direct function call within the same feature folder, event subscription via typed event emitter, or prop/callback pattern through React context.
8. THE System SHALL never permit bidirectional dependencies between components in the same architectural layer.

### Requirement 2: Feature-Based Architecture and Dependency Rules

**User Story:** As a developer, I want explicit dependency direction rules, so that I can add code without creating circular dependencies or breaking layer isolation.

#### Acceptance Criteria

1. THE Project SHALL organize all code by feature first, not by type; `src/features/game/` SHALL contain all game-related files, not `src/components/` plus `src/services/`.
2. THE Dependency Direction SHALL flow: UI Layer to Store to Services to Firebase; no layer SHALL import from a layer above it.
3. THE Physics Feature Folder (`src/features/game/physics/`) SHALL be the only location in the codebase that directly imports or calls Matter.js APIs.
4. THE Generation Feature Folder (`src/features/game/generation/`) SHALL be the only location in the codebase that reads or writes challenge seeds or templates.
5. WHEN a utility is used by three or more features, THE System SHALL place it in `src/utils/`; otherwise it SHALL remain in its owning feature folder.
6. WHEN a type is used by three or more features, THE System SHALL place it in `src/types/`; otherwise it SHALL remain in its owning feature folder.
7. THE System SHALL enforce dependency rules via ESLint `import/no-restricted-paths` rules configured in CI with a zero-tolerance policy.

### Requirement 3: Module Communication and Event Flow

**User Story:** As a developer, I want explicit module communication patterns, so that adding new game events does not create cascading changes across unrelated files.

#### Acceptance Criteria

1. THE GameLoop SHALL dispatch exactly these event types: `input_processed`, `physics_stepped`, `win_condition_met`, `timer_expired`, `ring_settled`, `ring_near_peg`, `ring_collision`, `obstacle_collision`, `assist_triggered`.
2. THE Input Handler SHALL translate raw touch events into typed InputEvents before dispatching to the GameLoop; no raw touch coordinates SHALL enter the game loop.
3. WHEN the game loop detects a win, THE System SHALL fire `win_condition_met` and pause physics immediately.
4. THE Analytics Service SHALL subscribe to game events as a passive observer; it SHALL never call back into game systems.
5. THE Audio Engine SHALL subscribe to game events as a passive observer; it SHALL never modify physics state.
6. THE Haptic Manager SHALL subscribe to game events as a passive observer; it SHALL never modify game state.

### Requirement 4: Data Flow and Rendering Pipeline

**User Story:** As a graphics engineer, I want an explicit rendering pipeline, so that every frame has a defined order of operations and no rendering step blocks physics.

#### Acceptance Criteria

1. THE Game Loop SHALL execute in a React Native Reanimated 3 Worklet on the UI thread, never on the JS thread.
2. THE Rendering Pipeline SHALL execute these draw passes in strict order each frame: (1) water body shader, (2) water displacement, (3) ring wakes, (4) bubbles, (5) rings with skins and shadows, (6) pegs with glow, (7) obstacles, (8) ripples, (9) particles, (10) HUD overlay.
3. THE System SHALL use a dirty-flag optimization: layers with no state changes SHALL NOT be redrawn; in a stable settled state only the water surface layer SHALL animate.
4. THE Physics State SHALL be communicated to the React render tree exclusively via Reanimated `useSharedValue` references; no `setState` call SHALL originate from the game loop.
5. THE Render Loop SHALL interpolate positions between physics ticks using alpha = accumulator / FIXED_TIMESTEP, producing smooth motion at 60, 90, and 120 Hz display refresh rates.
6. WHEN any Skia draw function depends on dynamic data, THE System SHALL wrap it in `useMemo` keyed on its data dependencies.

### Requirement 5: Save System and Sync Flows

**User Story:** As a backend engineer, I want explicit data flow specifications for save and sync, so that data integrity is maintained across all edge cases.

#### Acceptance Criteria

1. THE Two-Tier Save System SHALL write to MMKV every 1 second during gameplay and sync to Firestore at: app start, challenge end, purchase, and every 5 minutes during active play.
2. THE Sync Flow SHALL be: App Launch then Fetch Firestore then Apply Conflict Resolution then Write merged state to MMKV then Continue; sync SHALL never block gameplay.
3. THE Analytics Flow SHALL be: Game Event to Analytics Service (passive listener) to Firebase Analytics SDK; analytics SHALL never block the main game thread.
4. THE Backend Communication Flow for economy SHALL be: Client Action to Local MMKV update to Cloud Function call to Server validation to Firestore write to Client confirmation; the client SHALL optimistically update the local balance and roll back on server rejection.
5. THE Replay Flow SHALL be: Challenge Complete then ReplayRecorder serializes input events then LZ4 compress then Firebase Storage upload then Firestore metadata write.
6. THE Challenge Generation Flow SHALL be: Challenge Number to MasterSeed to PRNG init to 12-step pipeline to Solvability validation to Quality score check to ChallengeConfig returned; entirely local with no network calls.

### Requirement 6: Root Directory and App Layer Structure

**User Story:** As a developer joining the project, I want a documented folder structure, so that I know exactly where to find and place every type of file.

#### Acceptance Criteria

1. THE Project root SHALL contain exactly these top-level directories: `src/`, `functions/`, `__tests__/`, and standard React Native project files.
2. THE `src/` directory SHALL contain: `app/`, `screens/`, `features/`, `store/`, `services/`, `hooks/`, `utils/`, `constants/`, `types/`, and `assets/`.
3. THE `functions/` directory SHALL contain Cloud Functions source at `functions/src/` with exactly these files: `leaderboard.ts`, `dailyChallenge.ts`, `antiCheat.ts`, `economy.ts`, and `challengeIntelligence.ts`.
4. THE `__tests__/` directory SHALL contain exactly: `unit/`, `integration/`, and `property/` subdirectories.
5. THE `src/app/` directory SHALL contain exactly: `App.tsx` (root component), `Navigation.tsx` (all route definitions), and `Providers.tsx` (global context providers).
6. THE Screens Layer SHALL contain no business logic; it SHALL only compose feature components, read from the Zustand store, and call service functions received via context.
7. THE `src/screens/` directory SHALL contain exactly: `SplashScreen.tsx`, `LoadingScreen.tsx`, `HomeScreen.tsx`, `GameScreen.tsx`, `PauseScreen.tsx`, `VictoryScreen.tsx`, `DefeatScreen.tsx`, `ContinueScreen.tsx`, `LeaderboardScreen.tsx`, `AchievementsScreen.tsx`, `InventoryScreen.tsx`, `CollectionScreen.tsx`, `StoreScreen.tsx`, `SettingsScreen.tsx`, `DailyChallengeScreen.tsx`, `ProfileScreen.tsx`, `StatisticsScreen.tsx`, and `ReplayViewerScreen.tsx`.

### Requirement 7: Feature Folders — Game Core and Physics

**User Story:** As a developer, I want a complete feature folder specification, so that I know every file that needs to exist and why.

#### Acceptance Criteria

1. THE `src/features/game/core/` directory SHALL contain: `GameLoop.ts`, `GameState.ts`, `InputController.ts`, `WinCondition.ts`, and `TimerController.ts`.
2. THE `src/features/game/physics/` directory SHALL contain: `PhysicsWorld.ts`, `WaterSimulation.ts`, `RingBody.ts`, `PegBody.ts`, and `ObstacleBody.ts`.
3. THE `src/features/game/rendering/` directory SHALL contain: `GameRenderer.tsx`, `WaterRenderer.tsx`, `WaterShader.ts`, `RippleSystem.ts`, `BubbleSystem.ts`, `RingRenderer.tsx`, `PegRenderer.tsx`, and `ParticleSystem.tsx`.
4. THE `src/features/game/generation/` directory SHALL contain: `SeedGenerator.ts`, `ChallengeGenerator.ts`, `TemplateRegistry.ts`, `DifficultyCalculator.ts`, `ValidationSolver.ts`, `ChallengeScorer.ts`, and `QualityEvaluator.ts`.
5. THE `src/features/game/adaptive/` directory SHALL contain: `PlayerBehaviorMonitor.ts`, `AdaptiveAssistController.ts`, and `SessionAnalyzer.ts`.

### Requirement 8: Feature Folders — Audio, Progression, Economy, Social, Replay

**User Story:** As a developer, I want all remaining feature folders specified, so that no module is left without a defined home.

#### Acceptance Criteria

1. THE `src/features/audio/` directory SHALL contain: `AudioEngine.ts`, `MusicLayerManager.ts`, `SFXManager.ts`, and `HapticManager.ts`.
2. THE `src/features/progression/` directory SHALL contain: `XPSystem.ts`, `LevelSystem.ts`, `PrestigeSystem.ts`, `MasteryTracker.ts`, `AchievementEngine.ts`, and `CollectionTracker.ts`.
3. THE `src/features/economy/` directory SHALL contain: `EconomyService.ts`, `CoinLedger.ts`, `PurchaseService.ts`, and `AdService.ts`.
4. THE `src/features/social/` directory SHALL contain: `LeaderboardService.ts`, `FriendsService.ts`, and `ChallengeShareService.ts`.
5. THE `src/features/replay/` directory SHALL contain: `ReplayRecorder.ts`, `ReplayPlayer.ts`, `ReplayCompressor.ts`, and `ReplayStorageService.ts`.
6. THE `src/store/slices/` directory SHALL contain exactly: `playerSlice.ts`, `economySlice.ts`, `challengeSlice.ts`, `settingsSlice.ts`, `cosmeticsSlice.ts`, `socialSlice.ts`, and `onboardingSlice.ts`.
7. THE `src/services/firebase/` directory SHALL contain: `AuthService.ts`, `FirestoreService.ts`, `AnalyticsService.ts`, `RemoteConfigService.ts`, and `CloudFunctionsService.ts`.
8. THE `src/services/sync/` directory SHALL contain: `SyncManager.ts` and `ConflictResolver.ts`.
9. THE `src/constants/` directory SHALL contain all numeric constants referenced by SCREAMING_SNAKE_CASE names; no hardcoded magic numbers SHALL appear in feature code.

### Requirement 9: GameLoop Interface and Behavior

**User Story:** As a game engineer, I want a fully specified GameLoop interface, so that the physics orchestration contract is clear and testable.

#### Acceptance Criteria

1. THE GameLoop SHALL expose this public interface: `start(config: ChallengeConfig): void`, `stop(): void`, `pause(): void`, `resume(): void`, `applyInput(input: InputEvent): void`, `onWin(callback): void`, `onTimerExpire(callback): void`, `getCurrentState(): GameLoopSnapshot`.
2. THE GameLoop SHALL use a fixed timestep of 16.67ms (60 Hz) with a maximum frame lag cap of 5 frames.
3. EACH physics tick SHALL execute in this exact order: processInput, applyWaterForces, Matter.Engine.update, checkWinCondition, checkTimerExpiry, checkAdaptiveAssistance, persistStateIfCheckpoint.
4. THE GameLoop SHALL run inside a React Native Reanimated 3 Worklet on the UI thread and SHALL never block the JS thread.
5. THE GameLoop SHALL interpolate rendered positions between physics ticks using alpha = accumulator / FIXED_TIMESTEP.
6. THE GameLoop SHALL serialize physics state to MMKV at each 1-second checkpoint and immediately on challenge start, end, continue, and pause.

### Requirement 10: PhysicsWorld Interface and Behavior

**User Story:** As a physics engineer, I want a fully specified PhysicsWorld interface, so that no other module ever directly touches Matter.js.

#### Acceptance Criteria

1. THE PhysicsWorld SHALL expose: `initialize(config): void`, `step(dt): void`, `applyWaterForces(input): void`, `getRingStates(): RingState[]`, `getPegStates(): PegState[]`, `serializeState(): SerializedPhysicsState`, `restoreState(state): void`, `destroy(): void`.
2. THE PhysicsWorld SHALL configure Matter.js with: `gravity.y = 1`, `gravity.scale = 0.001`, `positionIterations = 6`, `velocityIterations = 4`, `constraintIterations = 2`, `broadphase = 'grid'`.
3. THE PhysicsWorld SHALL construct rings as 24-vertex polygon approximating a circle using `Matter.Bodies.fromVertices`.
4. THE PhysicsWorld SHALL construct pegs as sensor bodies (no collision response) in a separate collision filter layer from ring interiors.
5. THE PhysicsWorld SHALL apply water forces via `Matter.Events.on(engine, 'beforeUpdate', handler)` each tick.
6. THE PhysicsWorld SHALL detect ring landing via `Matter.Events.on(engine, 'collisionStart', handler)`, verifying all five landing conditions: center within 1.2x peg tipRadius, velocity below settle threshold, angle within ±15°, no bounce within last 200ms, and colorId match.
7. THE PhysicsWorld SHALL run stuck detection per ring: if velocity and angularVelocity are below STUCK_THRESHOLD for over 5 continuous seconds and ring is not settled, apply a random impulse up to 3 times; after 3 nudges teleport ring to a random open position.
8. THE PhysicsWorld SHALL check for NaN positions before every render; if found, restore from last valid MMKV checkpoint and log a non-fatal Crashlytics event.

### Requirement 11: ChallengeGenerator Interface and Pipeline

**User Story:** As a backend and QA engineer, I want a fully specified ChallengeGenerator, so that challenge reproduction is guaranteed across all devices and versions.

#### Acceptance Criteria

1. THE ChallengeGenerator SHALL expose: `generate(challengeNumber): ChallengeConfig`, `generateDaily(date): ChallengeConfig`, `validate(config): SolvabilityResult`, `scoreQuality(config): ChallengeQualityScore`, `getTemplateById(id): ChallengeTemplate`.
2. THE ChallengeGenerator SHALL execute the 12-step pipeline in strict order: Template Selection, Difficulty Score, Visual Theme, Arena Layout, Peg Placement, Ring Placement, Obstacle Placement, Water Current Profile, Timer Computation, Physics Modifiers, Environment Modifiers, Challenge Intelligence Metadata.
3. THE ChallengeGenerator SHALL use forked sub-PRNGs for steps 5 through 11 to ensure adding new pipeline steps cannot alter outputs of existing steps.
4. THE ChallengeGenerator SHALL reject any challenge that fails solvability (0/3 solver strategies succeed) by retrying with seed offset +1 up to a maximum of 5 retries.
5. THE ChallengeGenerator SHALL reject any challenge with QualityScore below 0.65 after 5 retries; in that case it SHALL reduce difficulty one step and regenerate.
6. THE ChallengeGenerator SHALL be a pure function with zero side effects, zero network calls, and callable in a worker thread or test environment without any app context.

### Requirement 12: EconomyService Interface and Behavior

**User Story:** As a product engineer, I want a fully specified EconomyService, so that every coin transaction is auditable and server-validated.

#### Acceptance Criteria

1. THE EconomyService SHALL expose: `creditCoins(userId, amount, source, txId): Promise<void>`, `spendCoins(userId, amount, sink): Promise<SpendResult>`, `getBalance(userId): Promise<number>`, `initiatePurchase(productId): Promise<PurchaseResult>`, `restorePurchases(): Promise<RestoreResult>`.
2. THE EconomyService SHALL use the RevenueCat transaction ID as the idempotency key for all IAP credits; duplicate `creditCoins` calls with the same `txId` SHALL be silently ignored.
3. THE EconomyService SHALL reject any `spendCoins` call that would result in a negative balance before executing the deduction.
4. THE EconomyService SHALL sign every coin-granting event with HMAC-SHA256 using key = PBKDF2(userId + deviceId + appSecret).
5. THE EconomyService SHALL optimistically update the local MMKV balance and roll back on Cloud Function rejection.

### Requirement 13: ReplayRecorder and ReplayPlayer

**User Story:** As a social and analytics engineer, I want a fully specified replay system, so that challenge runs can be reproduced exactly on any device.

#### Acceptance Criteria

1. THE ReplayRecorder SHALL record all input events as typed timestamped records: `{ t: number, type: 'L_DOWN' | 'L_UP' | 'R_DOWN' | 'R_UP' }` with `t` as milliseconds from challenge start.
2. THE ReplayRecorder SHALL LZ4-compress the input event sequence before storage; uncompressed size for a typical 90-second challenge SHALL be 800 to 2400 bytes.
3. THE ReplayRecorder SHALL enforce a maximum replay size of 50KB after compression; replays exceeding this SHALL be truncated with the completion event appended.
4. THE ReplayPlayer SHALL support playback speeds: 0.25x, 0.5x, 1x, 2x, and 4x via Matter.js `timing.timeScale`.
5. THE ReplayPlayer SHALL save physics state checkpoints at every 5-second mark during playback to enable seeking with latency under 5 seconds of simulation.
6. THE ReplayPlayer SHALL expose: play/pause, scrub bar, speed selector, step-frame (one physics tick while paused), camera-follow toggle, and reset controls.
7. THE ReplayPlayer SHALL validate every public replay via a Cloud Function that re-runs the simulation and verifies the outcome matches the claimed completion; mismatched replays SHALL be rejected.

### Requirement 14: AudioEngine Interface and Behavior

**User Story:** As an audio engineer, I want a fully specified AudioEngine interface, so that all audio state transitions are triggered by the correct game events.

#### Acceptance Criteria

1. THE AudioEngine SHALL expose: `startChallenge(themeId)`, `onFirstRingMoved()`, `onFirstRingLanded()`, `onChallengeMidpoint()`, `onTimerAmber()`, `onTimerCritical()`, `onVictory()`, `onDefeat()`, `pause()`, `resume()`, `playSFX(event, options)`, `setMasterVolume(v)`, `setMusicVolume(v)`, `setSFXVolume(v)`.
2. THE AudioEngine SHALL manage three independent layers: SFX (React Native Sound), Ambient (looping environment audio), and Music (React Native Track Player with stem-based adaptive mixing).
3. WHEN `pause()` is called, THE AudioEngine SHALL fade music to 15% volume to confirm game continuity rather than silencing it.
4. WHEN `resume()` is called, THE AudioEngine SHALL fade music back to active levels over 1.5 bars.
5. THE AudioEngine SHALL configure the platform audio session to duck external audio on both iOS and Android.
6. WHEN SFX are muted, THE AudioEngine SHALL notify the UI layer so visual compensation cues can activate.

### Requirement 15: HapticManager Interface and Events

**User Story:** As a mobile engineer, I want a fully specified HapticManager, so that haptic feedback is consistent, accessible, and never causes failures on unsupported devices.

#### Acceptance Criteria

1. THE HapticManager SHALL expose: `trigger(event: HapticEvent): void`, `triggerPattern(pattern: HapticPattern): void`, `cancelAll(): void`, `setGlobalIntensity(scale: number): void`, `isSupported(): boolean`.
2. THE HapticManager SHALL detect platform haptic capability on initialization and gracefully degrade; on unsupported devices `trigger()` and `triggerPattern()` SHALL be no-ops without errors.
3. THE HapticManager SHALL support all named haptic events: buttonTap, buttonHoldStart, buttonHoldSustained, buttonHoldPeak, rapidTap, simultaneousPress, ringCollisionLight, ringCollisionHeavy, ringWallCollision, ringNearPeg, ringLandedPeg, perfectPlacement, pegOccupied, timerWarning, timerCritical, victory, defeat, bossVictory, continueGranted, navigationTap, purchaseConfirm, achievementUnlock, cosmeticEquipped, coinEarn, actionBlocked.
4. THE HapticManager SHALL throttle ring-ring collision haptics to a maximum of 3 events per 100ms.
5. THE HapticManager SHALL apply the global intensity scale to all amplitude values; at 0% intensity all haptics SHALL be suppressed.

### Requirement 16: Additional Service Interfaces

**User Story:** As an engineer, I want complete interface specifications for all remaining services, so that every module boundary is unambiguous.

#### Acceptance Criteria

1. THE InputController SHALL expose: `onLeftPress(event): void`, `onLeftRelease(event): void`, `onRightPress(event): void`, `onRightRelease(event): void`, `getCurrentInputState(): InputState`, `reset(): void`; it SHALL detect tap (below 150ms), hold (150ms to 1500ms), long hold (above 1500ms), rapid tap (3+ in 500ms), simultaneous press, and alternating tap (L-R-L within 600ms).
2. THE AdaptiveAssistController SHALL expose: `recordAttempt(result): void`, `recordQuit(progress): void`, `getActiveAssists(): AssistFlag[]`, `shouldShowSkipOption(): boolean`, `getNearMissBonusSeconds(): number | null`, `reset(challengeNumber): void`.
3. THE SyncManager SHALL expose: `initialize(userId): void`, `syncNow(): Promise<SyncResult>`, `queueEvent(event): void`, `flushQueue(): Promise<void>`, `resolveConflict(local, cloud): PlayerDocument`, `getLastSyncTime(): number`, `getSyncStatus(): SyncStatus`.
4. THE AchievementEngine SHALL evaluate achievement conditions after every challenge completion and session end; it SHALL dispatch `achievement_unlock` events to the Analytics Service and Haptic Manager.
5. THE LeaderboardService SHALL only submit scores via Cloud Function; it SHALL never write directly to Firestore leaderboard collections.
6. THE RemoteConfigService SHALL fetch config at app start, cache for 1 hour, fall back to hardcoded defaults on failure, and apply new values only between sessions, never mid-challenge.

### Requirement 17: Zustand Store Slice Ownership

**User Story:** As a frontend engineer, I want defined slice ownership, so that no state is ever duplicated across slices or stored in the wrong place.

#### Acceptance Criteria

1. THE `playerSlice` SHALL own: profile data, XP, player level, prestige, rank, total stars, and completion score percentage.
2. THE `economySlice` SHALL own: coin balance, transaction history (last 50), purchase state, free continue tracking, and daily ad view count.
3. THE `challengeSlice` SHALL own: active challenge config, current timer value, ring positions and velocities, peg states, win/loss state, continue count, and adaptive assist flags.
4. THE `settingsSlice` SHALL own: audio volumes, haptic settings, accessibility settings, language preference, and graphics quality tier.
5. THE `cosmeticsSlice` SHALL own: the set of owned cosmetic IDs and the set of equipped cosmetic IDs per category.
6. THE `socialSlice` SHALL own: friends list, leaderboard cache (last-fetched entries), ghost cache, and pending challenge notifications.
7. THE `onboardingSlice` SHALL own: tutorial completion flag, highest challenge shown, feature unlock flags, and challenge numbers where the account prompt was shown.
8. WHEN any selector reads from a slice, THE Selector SHALL be granular and read only the specific field needed to prevent unnecessary re-renders.

### Requirement 18: MMKV Local Persistence

**User Story:** As a mobile engineer, I want MMKV persistence specified, so that no player progress is lost on app crash or device restart.

#### Acceptance Criteria

1. THE System SHALL use react-native-mmkv as the sole local persistence layer; AsyncStorage SHALL NOT be used anywhere in the project.
2. EACH Zustand slice SHALL serialize independently to a dedicated MMKV key.
3. THE `challengeSlice` SHALL write to its MMKV key every 1 second during active gameplay.
4. THE Following events SHALL trigger an immediate synchronous MMKV write: challenge start, challenge end, challenge complete, continue granted, IAP purchase, settings change, cosmetic equip/unequip.
5. THE MMKV writes SHALL include a CRC32 checksum; on read failure the corrupt data SHALL be discarded and the Firestore cloud copy SHALL be fetched.
6. THE System SHALL survive app kill and device reboot by recovering from the most recent MMKV checkpoint.

### Requirement 19: Firestore Cloud Sync and Conflict Resolution

**User Story:** As a cloud engineer, I want defined Firestore synchronization behavior, so that cross-device play works correctly and conflicts are resolved deterministically.

#### Acceptance Criteria

1. THE SyncManager SHALL synchronize to Firestore at: app launch, challenge end, IAP purchase completion, and every 5 minutes during active play.
2. THE SyncManager SHALL use a SyncStatus state machine: Offline, Syncing, Synced, Dirty with exponential backoff (1s, 2s, 4s, 8s, capped at 30s) on failure.
3. WHEN syncing, THE SyncManager SHALL apply per-field conflict resolution: coinBalance takes max, challengesCompleted takes max, highestChallengeNumber takes max, cosmetics takes union, stars per challenge takes max, settings cloud wins, achievements unlocked takes union.
4. WHEN a login streak conflicts between two devices, THE SyncManager SHALL take the max streak value if both devices recorded same-date activity; if different consecutive dates it SHALL merge as a continuous streak.
5. WHEN the cloud schemaVersion is greater than local, THE SyncManager SHALL run the migration chain before applying the sync.
6. WHEN offline, THE System SHALL queue all Firestore write operations in MMKV with status `pending`; on reconnect the SyncManager SHALL flush the queue.
7. THE SyncManager SHALL never block gameplay waiting for sync completion; sync operations SHALL run concurrently.

### Requirement 20: Session State and Offline Mode

**User Story:** As a player, I want to play offline without losing progress, so that network issues do not interrupt my session.

#### Acceptance Criteria

1. WHILE offline, THE System SHALL allow full challenge gameplay, challenge generation, and local save with no degradation.
2. WHILE offline, THE System SHALL display cached leaderboard data with a visible "Last updated [time]" indicator.
3. WHILE offline, THE System SHALL allow daily and weekly challenge play and queue the leaderboard submission for when connectivity is restored.
4. WHILE offline, THE System SHALL block IAP initiation and display a "Network required for purchases" message.
5. WHEN the device transitions from offline to online, THE SyncManager SHALL automatically begin flushing the queued event queue without requiring user action.
6. THE Session State (active challenge, timer, ring positions) SHALL be destroyed when a challenge ends; a new session starts fresh from the generated ChallengeConfig.
7. THE Adaptive Assist State SHALL persist per challenge number across sessions but reset when the challenge is successfully completed.

### Requirement 21: Matter.js Configuration and Game Loop

**User Story:** As a physics engineer, I want a fully specified Matter.js integration, so that the physics simulation is deterministic, performant, and correct.

#### Acceptance Criteria

1. THE System SHALL use Matter.js 0.19+ accessed exclusively through the PhysicsWorld module.
2. THE Physics Loop SHALL use a fixed timestep of 16.67ms; a variable render delta SHALL be accumulated and physics steps consumed until the accumulator is exhausted.
3. THE System SHALL cap maximum frame lag at 5 frames (83.35ms) to prevent spiral-of-death on slow frames.
4. THE Arena SHALL be bounded by four static walls (top, bottom, left, right) with restitution 0.3 and friction 0.1.
5. THE Physics World SHALL support a maximum of 20 active rigid bodies simultaneously: up to 10 rings, 8 pegs, 6 obstacles, and 4 arena walls.

### Requirement 22: Water Force Model

**User Story:** As a game designer, I want the four-layer water force model fully specified, so that the water feels physically credible on every device.

#### Acceptance Criteria

1. THE Water Force System SHALL combine exactly four layers per ring per tick: Directional Button Force, Background Current Force, Buoyancy Force, and Turbulence Force.
2. THE Button Force SHALL use: F = BASE_FORCE times intensity times (1 - |x - sourceX| / ScreenWidth) times DirectionVector; force falls off linearly with distance from the source wall.
3. THE Background Current SHALL be a persistent ambient force from the seed-determined current profile; magnitude scales with `BASE_CURRENT * (1 + ND * CURRENT_SCALE)`.
4. THE Buoyancy Force SHALL always be upward only (y <= 0 in screen coordinates); formula: `F_buoy = BUOYANCY_BASE * ring.buoyancy * (y - waterSurface) / arenaHeight`.
5. THE Turbulence Force SHALL be applied on rapid-tap events using: `F_turb = BaseForce * TURBULENCE_FACTOR * RandomUnit(theta +/- 45 degrees, seed=inputTimestamp)`.
6. THE Button Intensity SHALL ramp from 0 to 1.0 over the first 300ms of hold, maintain at 1.0 until 1500ms, then decay to a floor of 0.3 over the next 2000ms.
7. THE Drag Model SHALL apply per tick: `v(t+1) = v(t) * (1 - linearDamping * dt)` and `omega(t+1) = omega(t) * (1 - angularDamping * dt)`; drag SHALL be higher near the arena bottom.

### Requirement 23: Ring and Peg Physics Properties

**User Story:** As a physics engineer, I want all ring and peg physics properties defined, so that simulation parameters are never ambiguous.

#### Acceptance Criteria

1. THE Small Ring SHALL have: outerRadius = 22px, mass = 0.5, buoyancy = 0.85.
2. THE Medium Ring SHALL have: outerRadius = 32px, mass = 1.0, buoyancy = 0.65.
3. THE Large Ring SHALL have: outerRadius = 44px, mass = 2.2, buoyancy = 0.45.
4. THE Ring Landing SHALL require ALL five conditions simultaneously: ring center within 1.2x peg tipRadius horizontally, velocity below settleVelocityThreshold, angle within plus or minus 15 degrees (plus or minus 8 degrees for Precision template), no bounce off this peg within 200ms, and colorId matches peg acceptedColorId.
5. THE Win Condition SHALL require all required ring-peg pairs satisfied AND stable for at least 500ms continuously; if any required ring leaves its peg the counter resets to zero.

### Requirement 24: Physics Performance and Deterministic Replay

**User Story:** As a QA engineer, I want physics performance constraints and determinism requirements, so that 60fps is maintained and replay testing is reliable.

#### Acceptance Criteria

1. THE Physics Engine SHALL maintain a target tick time of under 4ms on reference devices (iPhone 11, Pixel 5) with a hard limit of under 8ms.
2. WHEN a device cannot maintain 60fps, THE System SHALL drop to 30fps by doubling the fixed timestep without degrading physics accuracy.
3. THE System SHALL detect device performance tier by running a 1-second physics benchmark at launch and cache the result in MMKV.
4. THE PhysicsWorld SHALL pre-allocate all ring and peg bodies at challenge start and reuse them (object pooling); no new body allocations SHALL occur during active gameplay.
5. THE Physics Engine SHALL produce byte-identical results for the same input sequence on any device, OS version, and app version with the same generatorVersion.
6. THE System SHALL use xoshiro128** PRNG for all pseudo-random physics values; the PRNG state SHALL be derivable from the challenge seed and input event timestamps.
7. WHEN a new app version changes any physics constant, THE generatorVersion SHALL be incremented and a migration document SHALL be created.
8. THE CI pipeline SHALL run 20 golden replay challenges on every build and fail if any produces a different outcome from the stored fixture.

### Requirement 25: Firestore Collections and Document Schemas

**User Story:** As a backend engineer, I want all Firestore collections, documents, and fields specified, so that the data model is unambiguous.

#### Acceptance Criteria

1. THE System SHALL use these top-level Firestore collections: `/players/{userId}`, `/players/{userId}/challenges/{N}`, `/players/{userId}/mastery/{templateId}`, `/leaderboards/{leaderboardId}/entries/{userId}`, `/economy/{txId}`, `/challenge_intelligence/{N}`.
2. THE PlayerDocument SHALL contain: userId, username, displayName, avatarUrl, country, createdAt, lastActiveAt, schemaVersion, and nested progression, economy, streaks, social, settings, and onboarding objects as defined in the GDD Data Models section.
3. THE ChallengeRecord SHALL contain: challengeNumber, seed, generatorVersion, templateId, difficultyScore, bestTime, bestScore, bestStars, totalAttempts, continuesUsedInBestRun, firstCompletedAt, lastAttemptAt, leaderboardSubmitted, leaderboardRank, nearMissAssistUsed, bestReplayId.
4. THE LeaderboardEntry SHALL contain: userId, username, displayName, avatarUrl, rank, prestige, country, score, completionTime, stars, continuesUsed, nearMissAssisted, submittedAt, challengeNumber, generatorVersion, inputEventHash, replayId.
5. THE EconomyTransaction SHALL contain: transactionId, userId, type, amount, balanceBefore, balanceAfter, createdAt, serverVerified, source (with type, challengeNumber, productId, cosmeticId, achievementId), clientSignature.
6. THE PlayerDocument SHALL not exceed 100KB to stay within Firestore document size limits.

### Requirement 26: Firestore Indexes and Security Rules

**User Story:** As a backend engineer, I want all required Firestore indexes and security rules defined, so that queries are performant and data is secure.

#### Acceptance Criteria

1. THE System SHALL create a composite index on `/leaderboards/{id}/entries` for: (score DESC, completionTime ASC, continuesUsed ASC).
2. THE System SHALL create a composite index on `/leaderboards/{id}/entries` for: (country, score DESC) to support country-filtered views.
3. THE `/players/{userId}` document SHALL be readable and writable only by the authenticated user matching the document ID.
4. THE `/leaderboards/{id}/entries/{userId}` collection SHALL be readable by all authenticated users; writable only by Cloud Functions.
5. THE `/economy/{txId}` collection SHALL be readable only by the transaction owner; writable only by Cloud Functions.
6. THE `/challenge_intelligence/{N}` collection SHALL be readable by all authenticated users; writable only by Cloud Functions.
7. ALL Firestore reads and writes SHALL require a valid Firebase Auth token; unauthenticated access SHALL be rejected for all collections.

### Requirement 27: Cloud Functions

**User Story:** As a backend engineer, I want all Cloud Functions specified, so that server-side validation is complete and no attack surface is unguarded.

#### Acceptance Criteria

1. THE `leaderboard.ts` Cloud Function SHALL validate submissions by: re-generating the challenge from seed, verifying layout hash, checking completionTime is at least the theoretical minimum, replaying the input event log server-side and verifying outcome, and rate-limiting to 1 submission per challenge per player per 5 minutes.
2. THE `economy.ts` Cloud Function SHALL validate all coin grants by: verifying the HMAC-SHA256 signature, checking the idempotency key has not been used, verifying the source type and amount match server-computed formulas, and writing to the economy collection.
3. THE `dailyChallenge.ts` Cloud Function SHALL run at midnight UTC, generate the next daily challenge using DailySeed(date), store the config in Firestore, and publish a push notification to opted-in players.
4. THE `antiCheat.ts` Cloud Function SHALL flag submissions with: completionTime below minPossibleSolveTime(N), coin earn rate above MAX_DAILY_COIN_EARN, or input hash mismatch.
5. THE `challengeIntelligence.ts` Cloud Function SHALL run daily, aggregate analytics for each challenge number, compute actual completion rates and median solve times, and flag challenges where predicted vs actual diverges by more than threshold for 100+ plays.
6. ALL Cloud Functions SHALL use Node.js 18 and reject unauthenticated requests with HTTP 401.

### Requirement 28: Firebase Authentication and Remote Config

**User Story:** As a player, I want seamless anonymous play with optional account creation, and as an engineer I want live parameter tuning without app updates.

#### Acceptance Criteria

1. THE System SHALL create an anonymous Firebase Auth session at first app launch without requiring any player action.
2. WHEN a player chooses to sign in, THE System SHALL support Sign in with Google and Sign in with Apple.
3. WHEN a player links their anonymous account to a social identity, THE System SHALL merge anonymous progress using max-merge conflict resolution.
4. THE System SHALL never prompt for authentication before challenge 10.
5. THE Remote Config SHALL include: salt_global, salt_daily, base_continue_cost, base_water_force, max_daily_ad_views, event_windows, quality_score_threshold, near_miss_bonus_seconds, max_active_bubbles, max_active_ripples.
6. THE System SHALL fetch Remote Config at every app start, cache for 1 hour, fall back to hardcoded defaults on failure, and apply new values only between sessions.

### Requirement 29: Leaderboard API Contract

**User Story:** As a frontend engineer, I want the complete Leaderboard API contract, so that leaderboard screens can be implemented without guessing at data shapes or error states.

#### Acceptance Criteria

1. THE `submitScore` Cloud Function SHALL accept: challengeNumber, completionTime, stars, continuesUsed, inputEvents, seed, generatorVersion; and return success with rank, or failure with reason.
2. THE `getLeaderboard` query SHALL accept: leaderboardId, scope (global/country/friends), timeFilter (today/week/allTime), pageSize (20), and optional cursor; returning entries, nextCursor, and the player's own entry.
3. THE Leaderboard API SHALL return stale cached data (max 5 minutes old) while a background refresh is in progress; it SHALL never block UI on a fresh fetch.
4. IF the submission is rejected by anti-cheat, THE API SHALL silently return success on the client; the rejection is logged internally.
5. ON network timeout above 10 seconds, THE Client SHALL mark the submission as pending in MMKV and retry on next app launch.

### Requirement 30: Economy and Cloud Save API Contracts

**User Story:** As a product and mobile engineer, I want the Economy and Cloud Save API contracts, so that transactions and sync are reliable and predictable.

#### Acceptance Criteria

1. THE `creditCoins` Cloud Function SHALL be idempotent: if the transactionId already exists it SHALL return success without crediting again.
2. THE `spendCoins` Cloud Function SHALL atomically reject if balance minus amount would be negative.
3. THE Economy API SHALL respond within 3 seconds; if not the client SHALL retry once after 5 seconds; if the second attempt fails the client SHALL queue for background retry.
4. THE `savePlayer` Firestore write SHALL use `set({ merge: true })` to prevent race conditions between simultaneous device writes.
5. THE `loadPlayer` Firestore read SHALL be cache-first; if the document is not in local cache a network fetch SHALL be attempted with a 5-second timeout.
6. THE `resolveConflict(local, cloud)` function SHALL be a pure function accepting two PlayerDocuments and returning a merged PlayerDocument using all per-field rules.

### Requirement 31: Analytics and Challenge API Contracts

**User Story:** As a data engineer, I want the Analytics and Challenge API contracts, so that every event has a consistent shape and is never lost.

#### Acceptance Criteria

1. THE Analytics API SHALL use Firebase Analytics SDK; all events SHALL be fired via `AnalyticsService.logEvent(name, properties)`.
2. EVERY analytics event SHALL include: userId, sessionId, challengeNumber (when in a challenge), timestamp, platform, appVersion, generatorVersion, deviceTier.
3. THE AnalyticsService SHALL batch events in memory and flush every 10 seconds or on app background.
4. THE AnalyticsService SHALL never throw exceptions; all Firebase Analytics errors SHALL be caught silently.
5. THE System SHALL log all events defined in the Complete Event Catalog in the GDD Analytics chapter; no player-observable moment SHALL be untracked.
6. THE `getDailyChallenge()` function SHALL check local MMKV cache keyed by date first; if the date matches today return cached; otherwise fetch from Firestore.
7. THE `submitDailyScore` SHALL add a 60-second penalty to completionTime for each continue used before leaderboard submission.

### Requirement 32: Profile and Replay API Contracts

**User Story:** As a frontend engineer, I want the Profile and Replay API contracts, so that social features and replay viewers are implementable.

#### Acceptance Criteria

1. THE `getProfile(userId)` Firestore read SHALL return only public-safe fields: username, displayName, avatarUrl, country, rank, prestige, progression summary, top 5 public replay IDs, and pinned achievements; it SHALL NOT return economy data or private settings.
2. THE `uploadReplay` Firebase Storage write SHALL use path: `/replays/{userId}/{challengeNumber}/{replayId}.lz4`.
3. THE `getTopReplays(challengeNumber)` SHALL read from `/top_replays/{challengeNumber}/` maintained by daily Cloud Function; it SHALL return at most 5 entries.
4. THE Replay download URL SHALL be pre-signed with a 30-day expiry.
5. THE `rateReplay(replayId, rating)` SHALL update the qualityRating as a running average; ratings SHALL be bounded to 1 through 5.

### Requirement 33: Button and HUD Components

**User Story:** As a UI engineer, I want all gameplay UI component specifications, so that interactive elements are consistent, accessible, and match the game's design.

#### Acceptance Criteria

1. THE `WaterButton` component SHALL have a minimum touch target of 88x88dp, depress 3dp on press, emit a radial water ripple at the press origin, and fire the `buttonTap` haptic event on tap start.
2. THE `WaterButton` SHALL support props: side (left or right), onPressIn, onPressOut, disabled, skin (ButtonSkinId), and accessibilityLabel.
3. THE `TimerArc` component SHALL render a circular arc that depletes clockwise; at 30% remaining it SHALL shift to amber; at 10% remaining it SHALL shift to red and pulse at 1 Hz.
4. THE `ChallengeHUD` component SHALL display: challenge number, template icon, TimerArc, star progress, and continue count indicator; it SHALL occupy the minimum safe area at the top of the screen.
5. THE `PressCounterHUD` (Limited Presses template only) SHALL display remaining press budget and animate a shake and color-shift to red when 10 or fewer presses remain.
6. ALL interactive UI components SHALL have `accessibilityRole="button"` and explicit non-empty `accessibilityLabel` props.
7. ALL button components SHALL meet WCAG 2.5.5 (AAA) minimum 44dp touch target; the WaterButton SHALL exceed this at 88dp.

### Requirement 34: Overlay, Modal, and Navigation Components

**User Story:** As a UI engineer, I want all overlay, modal, and navigation component specifications, so that game interruptions are handled consistently.

#### Acceptance Criteria

1. THE `PauseOverlay` SHALL render as a frosted glass overlay over a blurred arena showing: Resume, Restart (with confirmation), Settings shortcut, and Quit to Home.
2. THE `ContinueModal` SHALL display: rings placed progress, remaining time, bonus time to be granted, cost (coins or Watch Ad), a 10-second auto-dismiss countdown, and Cancel; the auto-dismiss SHALL pause during user interaction.
3. THE `VictoryModal` SHALL animate stars one-by-one (250ms each with 100ms gap), then coins arc to the counter, then XP bar fills with shimmer; the total victory sequence SHALL be at least 4 seconds.
4. THE `DefeatModal` SHALL show rings-placed progress and primary CTA "Continue" (with cost); it SHALL never use the word "FAIL" or "FAILED".
5. THE `AchievementUnlockBanner` SHALL slide down for 400ms, display for 2200ms, then slide up for 400ms; it SHALL be dismissible by tap.
6. ALL screen transitions SHALL use Reduced Motion alternatives (simple opacity fade) when the system or in-game Reduced Motion setting is active.
7. THE `BottomNav` SHALL contain four tabs: Home, Leaderboard, Store, Profile; the active tab SHALL be indicated by a filled icon and an accent color underline.

### Requirement 35: Store, Leaderboard, Profile, and Collection Components

**User Story:** As a UI engineer, I want all secondary screen component specifications, so that the meta-game UI is consistent and accessible.

#### Acceptance Criteria

1. THE `CosmeticCard` SHALL display: item thumbnail, item name, tier badge, price in coins or "OWNED" badge if already owned, and a tap-to-preview interaction.
2. THE `LeaderboardRow` SHALL display: rank number, player avatar, display name, rank badge, score, completion time, and a ghost replay button if available; the player's own row SHALL be pinned at the bottom.
3. THE `CollectionCard` SHALL show completed collections in full color and partial collections with greyed missing items showing "how to get" on tap.
4. THE `ProfileCard` SHALL display: avatar with frame and banner, username, title, rank badge with progress bar to next rank, 3 pinned achievements, and a completion score percentage.
5. THE `StatisticsChart` SHALL render using Reanimated-driven animations; line charts for stars-over-time, area charts for coins-earned-vs-spent, bar charts for challenges-per-template; all charts SHALL animate on screen entry.

### Requirement 36: Core Gameplay Animations

**User Story:** As an animation engineer, I want all in-game animation specifications, so that every visual event is defined with duration, easing, and parameters.

#### Acceptance Criteria

1. THE Ring Landing animation SHALL be: scale +10% over 100ms ease-out, then return to 1.0 over 300ms spring (stiffness 200, damping 20); total duration at most 400ms.
2. THE Ring Near-Peg glow SHALL pulse at 1.5 Hz with sinusoidal opacity between 0.3 and 0.8; it SHALL activate when the correct ring is within 100px of the peg center.
3. THE Button Press depression SHALL be 3dp downward over 50ms linear, then spring back over 150ms on release.
4. THE Water Ripple on button press SHALL expand radially at 120px/s, opacity starting at 0.4 and decaying over 1000ms; max radius 120px.
5. THE Timer Arc SHALL animate a color shift to amber over 500ms when crossing 30% threshold, and to red over 300ms with a 1 Hz pulse when crossing 10%.
6. THE Peg Victory Glow (settled ring) SHALL pulse at 1.5 Hz between opacity 0.3 and 0.6 in the ring's color.

### Requirement 37: Victory, Defeat, and State Change Animations

**User Story:** As an animation engineer, I want all state-transition animation specifications, so that win and loss emotional beats are precisely designed.

#### Acceptance Criteria

1. THE Victory Sequence SHALL execute in order: (1) camera zoom-in 10% over 400ms ease-out, (2) screen flash white 20ms, (3) VictoryModal slides in over 300ms, (4) stars flip one-by-one at 250ms each with 100ms gap, (5) coins arc to counter with trail particles over 600-800ms, (6) XP bar shimmer fill over 600ms.
2. THE Defeat Sequence SHALL execute: water drain animation overlay (400ms fade in, 800ms drain), then DefeatModal appears via scale from 0.85 and fade over 300ms.
3. THE Achievement Unlock Banner SHALL: slide down 400ms ease-out spring (stiffness 300, damping 30), display 2200ms, then slide up 400ms ease-in; a particle burst SHALL emit from the banner at appearance.
4. THE Rank Up Animation SHALL: badge scale from 0 to 1.2 to 1.0 (400ms total, spring overshoot), with a 600ms glow pulse and 8 radiating particle lines.
5. THE Continue Granted Animation SHALL: animate the bonus-time addition on the TimerArc as a green arc addition over 300ms.

### Requirement 38: Water Animations

**User Story:** As a graphics engineer, I want all water animation parameters defined, so that the water renderer is deterministic and tuneable.

#### Acceptance Criteria

1. THE Water Surface SHALL animate using four summed sine waves: base swell (4px amplitude, 0.3 Hz, 0.4 rad/s), mid ripple (2px, 0.8 Hz, 0.9 rad/s), high ripple (1px, 1.6 Hz, 1.8 rad/s), micro chop (0.5px, 3.2 Hz, 3.5 rad/s).
2. WHEN a button is pressed, THE Wave System SHALL scale layers 3 and 4 amplitudes by 3.0x on the pressed side, decaying back to baseline over 400ms.
3. THE Water Displacement Bulge SHALL be a Gaussian bell curve (sigma = ScreenWidth * 0.2) centered at the pressed wall, maximum height 12px, decaying with time constant 300ms.
4. THE Ring Wake trails SHALL use the Kelvin wake angle of 19.5 degrees half-angle, length scaling with ring velocity (max 80px), fading exponentially over 600ms.
5. THE Bubble Rise Animation SHALL use: rise speed 40px/s, sinusoidal x-wobble amplitude 4px at 1.5 Hz, opacity starting at 0.7 and decaying as bubble approaches the water surface.

### Requirement 39: Sprite, Image, and Audio Assets

**User Story:** As an art director and audio engineer, I want the full asset pipeline specified, so that every asset is correctly sized, named, and compressed.

#### Acceptance Criteria

1. THE Image Assets SHALL be provided in three resolutions: @1x, @2x, and @3x.
2. ALL raster images SHALL be in WebP format for production.
3. THE Ring Skin sprites SHALL be in a texture atlas named `ring_atlas.webp` (max 2048x2048px) with 4px padding per slot.
4. ALL asset file names SHALL use kebab-case with asset type prefix: e.g., `ring-marble-common.webp`, `bg-beach.webp`.
5. THE SFX Files SHALL be in OGG format (Android) and M4A format (iOS).
6. THE Music Stems SHALL be provided as individual audio tracks (one per stem per theme) with identical length and loop-point aligned.
7. ALL SFX files SHALL be under 500KB uncompressed; ambient loops under 1MB; music stems under 3MB each.
8. THE Ring SFX tones SHALL be tuned to C major pentatonic scale notes (C4, D4, E4, G4, A4) mapped to ring colors consistently.
9. ALL SFX SHALL have plus or minus 8% random pitch variation applied at playback time with the variation seed derived from the challenge PRNG.

### Requirement 40: Localization and Asset Versioning

**User Story:** As a product manager and performance engineer, I want localization and asset versioning specified, so that the game ships in all target languages and updates do not cause stale asset issues.

#### Acceptance Criteria

1. THE Game SHALL ship with localized strings for: English, Spanish, French, German, Japanese, Korean, Simplified Chinese, and Brazilian Portuguese.
2. ALL user-visible strings SHALL be accessed through a `t(key)` translation function; no hardcoded English strings SHALL appear in component code.
3. THE String Files SHALL be JSON format at `src/assets/localization/{locale}.json`; a CI check SHALL fail if any key is missing in any locale file.
4. THE UI Layout SHALL be tested at 150% text scale; no text SHALL be clipped or overflow its container.
5. ALL app-bundled assets SHALL have an explicit version in their MMKV cache key; on app update changed assets SHALL invalidate their cache entry.
6. THE Texture Atlases SHALL be released from memory when leaving GameScreen; they SHALL be re-loaded asynchronously on next GameScreen entry.
7. THE Ghost Replay Files SHALL be cached with a maximum total size of 50MB with LRU eviction.

### Requirement 41: Lottie, Fonts, and Shaders

**User Story:** As an engineer, I want Lottie, font, and shader asset specifications, so that non-standard asset types are handled correctly.

#### Acceptance Criteria

1. THE Victory Animation assets SHALL be in Lottie JSON format (under 200KB each) with one file per cosmetic tier: default, common, rare, epic, legendary.
2. THE Primary Typeface SHALL be Nunito (or equivalent rounded warm typeface); font files SHALL be subsetted to required Unicode ranges only.
3. THE Water Shader SHALL be compiled as a Skia-compatible GLSL program at `src/assets/shaders/water.glsl`; it SHALL have no branching (no `if` statements) to ensure consistent GPU performance.
4. THE Shader Parameters (brightness, caustic speed, tint) SHALL be passed as uniforms driven by the active theme.
5. THE Shader compilation error SHALL be caught at runtime and cause automatic fallback to a gradient-only water body renderer.

### Requirement 42: Frame Rate and Rendering Performance Budget

**User Story:** As a performance engineer, I want strict frame time budgets, so that the game maintains 60fps on all supported devices.

#### Acceptance Criteria

1. THE Total Frame Time SHALL be under 13ms target and under 16.67ms hard limit on reference devices (iPhone 11, Pixel 5).
2. THE Physics Tick Time SHALL be under 4ms target and under 8ms hard limit per physics step on reference devices.
3. THE Render Frame Time SHALL be under 8ms target and under 12ms hard limit per rendered frame.
4. THE JS Thread Time SHALL be under 2ms target and under 5ms hard limit per frame.
5. THE GPU Usage SHALL not exceed 60% sustained on reference devices during active gameplay.
6. WHEN a device cannot sustain 60fps, THE System SHALL automatically drop to 30fps physics (doubled timestep) and log a `frame_drop` analytics event.
7. THE P95 Frame Time (95th percentile across a 10-minute session) SHALL be under 12ms on reference devices.

### Requirement 43: Memory and App Launch Budget

**User Story:** As a performance engineer, I want strict memory and launch time budgets, so that the game does not trigger memory pressure or fail app store quality checks.

#### Acceptance Criteria

1. THE Total App Heap SHALL be under 150MB target and under 200MB hard limit during active gameplay.
2. THE Texture Atlas Memory SHALL be under 50MB; all atlases SHALL be released when leaving GameScreen.
3. THE Audio Buffer Memory SHALL be under 20MB; inactive theme stems SHALL be released on theme switch.
4. THE Maximum Active Particle Objects SHALL be: bubbles at most 40, ripples at most 20, button particles at most 30, victory particles at most 60.
5. THE Cold Start Time SHALL be under 3 seconds target, under 5 seconds hard limit, from tap to Home screen being interactive.
6. THE Challenge Load Time (Play tap to first physics frame) SHALL be under 500ms.
7. THE Challenge Generation Time SHALL be under 80ms target, under 150ms hard limit.
8. THE Total Installed App Size SHALL be under 100MB for the initial download.

### Requirement 44: Device Tier Performance Scaling

**User Story:** As a QA engineer, I want device tier performance specifications, so that all supported devices have an appropriate visual experience.

#### Acceptance Criteria

1. THE High-End Tier (iPhone 14+, Pixel 8+) SHALL run: all 5 water layers, 40 max bubbles, 20 max ripples, full water shader.
2. THE Mid-Range Tier (iPhone 11, Pixel 5) SHALL run: water layers 1 through 4 only, 20 max bubbles, 10 max ripples, simplified shader.
3. THE Low-End Tier (devices below mid-range) SHALL run: water layers 1 and 2 only, 8 max bubbles, 5 max ripples, no shader (gradient fill only).
4. THE Device Tier SHALL be detected by running a 1-second physics benchmark at launch; result SHALL be cached in MMKV and re-evaluated on app update.
5. THE Player SHALL be able to manually override the detected tier in Settings; the override SHALL persist across sessions.
6. WHEN the player enables Low Power Mode (iOS) or Battery Saver (Android), THE System SHALL automatically downgrade one performance tier.

### Requirement 45: Unit Tests

**User Story:** As a QA engineer, I want a complete unit test specification, so that all pure functions are validated in isolation.

#### Acceptance Criteria

1. THE Unit Test Suite SHALL use Jest 29.x with TypeScript support; all unit tests SHALL be in `__tests__/unit/`.
2. THE Following functions SHALL each have dedicated unit tests: generateMasterSeed(N), D(N), poissonDisk(), qualityScore(), computeBuoyancy(), computeButtonForce(), continueCost(D, n), continueBonusTime(D), timerBase(D), xpRequired(level), resolveConflict(local, cloud), and each migration function in MIGRATIONS.
3. THE State Machine Transitions SHALL be tested for all valid transitions in: the Game State Machine, the Input State Machine, and the Sync State Machine.
4. THE Unit Tests SHALL run in under 30 seconds total in CI.
5. THE CI Pipeline SHALL enforce minimum coverage gates: Statements at least 75%, Branches at least 70%, Functions at least 80%, Lines at least 75%.

### Requirement 46: Property-Based Tests

**User Story:** As a QA engineer, I want property-based tests for all invariants, so that edge cases are explored automatically across thousands of inputs.

#### Acceptance Criteria

1. THE Property-Based Test Suite SHALL use fast-check 3.x with a minimum of 500 runs per property in CI; all property tests SHALL be in `__tests__/property/`.
2. THE Following 20 correctness properties SHALL each have a dedicated property test: force boundedness, no force on settled rings, buoyancy direction, button force symmetry, challenge generation determinism, peg minimum separation, ring-peg bijection, arena containment, difficulty monotonicity, difficulty ceiling, coin conservation, continue cost escalation, idempotent coin credit, non-negative balance, timer monotonicity, continue bonus bounded, leaderboard score ordering, submission time gate, sync idempotency, and cosmetic physical isolation.
3. THE Property Tests SHALL run after unit tests in CI; fast-check SHALL output the exact counterexample on failure.
4. WHEN a property test fails in CI, THE Build SHALL be blocked; the failure counterexample SHALL be attached to the PR review as a required fix.

### Requirement 47: Integration, Determinism, and Accessibility Tests

**User Story:** As a QA engineer, I want integration tests, physics determinism tests, and accessibility tests, so that end-to-end behavior and regressions are caught before release.

#### Acceptance Criteria

1. THE Integration Tests SHALL use the Firebase Emulator Suite and cover: full challenge lifecycle, continue flow, offline plus sync flow, IAP flow, conflict resolution, and schema migration.
2. THE Golden Replay Test Suite SHALL contain 20 challenge replays as binary fixtures; each test SHALL re-run the simulation and compare output byte-for-byte.
3. IF any golden replay produces different output, THE CI Build SHALL fail with "Physics determinism broken — increment generatorVersion if intentional".
4. THE Performance Benchmark Suite SHALL use Maestro on reference devices and measure: cold start, challenge generation, first render, P95 frame time, and Victory screen transition time.
5. THE Automated Accessibility Check SHALL use axe-core in CI; the build SHALL fail on any WCAG 2.1 Level AA critical violation.
6. THE Manual Accessibility Tests SHALL be performed before every release: VoiceOver on all screens, TalkBack on all screens, color-blind simulation for all ring/peg color combinations, one-handed mode test, and large text scaling test at 200%.

### Requirement 48: Production Roadmap — Foundation and Core Physics Milestones

**User Story:** As an engineering manager, I want the first two milestones specified, so that infrastructure and the primary game mechanic are delivered on schedule.

#### Acceptance Criteria

1. THE Milestone 1 (Weeks 1-4) SHALL deliver: React Native project scaffolding with TypeScript strict mode, feature-based folder structure, ESLint configuration, Jest and fast-check test infrastructure, Firebase project setup, CI/CD pipeline, and Fastlane integration for iOS and Android.
2. THE Milestone 1 Acceptance Criteria: all CI checks pass on the empty project, Firebase emulator tests run successfully, branch protection rules are active on main, and performance benchmark suite produces baseline measurements.
3. THE Milestone 2 (Weeks 3-8) SHALL deliver: PhysicsWorld (Matter.js integration), water force model (all four layers), win condition checker, GameLoop fixed-timestep orchestrator in Reanimated Worklet, InputController (all 6 input types), and a developer debug overlay.
4. THE Milestone 2 Acceptance Criteria: a single challenge can be played to completion on both iOS and Android; physics tick time is under 4ms; force boundedness, buoyancy direction, and button symmetry property tests all pass.

### Requirement 49: Production Roadmap — Challenge Generation and Rendering Milestones

**User Story:** As an engineering manager, I want the challenge generation and rendering milestones specified, so that deterministic content and the primary visual differentiator are delivered before meta features.

#### Acceptance Criteria

1. THE Milestone 3 (Weeks 5-9) SHALL deliver: xoshiro128 PRNG, 12-step ChallengeGenerator pipeline, DifficultyCalculator, all 24 template definitions, Poisson disk peg placement, ValidationSolver, ChallengeScorer, QualityEvaluator, and 20 golden replay fixtures.
2. THE Milestone 3 Acceptance Criteria: challenge determinism property test passes at 1000 runs, difficulty monotonicity and ceiling properties pass, quality score at least 0.65 for at least 95% of generated challenges without retries.
3. THE Milestone 4 (Weeks 6-11) SHALL deliver: WaterRenderer (all five layers with device tier detection), WaterShader, RippleSystem, BubbleSystem, RingRenderer, PegRenderer, ParticleSystem, and dirty-flag optimization.
4. THE Milestone 4 Acceptance Criteria: render frame time under 8ms on iPhone 11; all five water layers active on high-end tier; low-end tier automatically disables layers 4-5; water receives at least 80% team approval in a manual playtest vote.

### Requirement 50: Production Roadmap — Feature Completion Milestones

**User Story:** As an engineering manager, I want all remaining milestones specified, so that the team has a clear delivery sequence to launch.

#### Acceptance Criteria

1. THE Milestone 5 (Weeks 9-13) SHALL deliver: AudioEngine (three-layer adaptive music), all SFX, HapticManager (all 25 events), and onboarding challenges 1-20 with all tutorial guidance systems.
2. THE Milestone 6 (Weeks 10-15) SHALL deliver: Zustand store, MMKV persistence, SyncManager, all Firestore collections and security rules, all Cloud Functions, RevenueCat integration, and economy system.
3. THE Milestone 7 (Weeks 12-17) SHALL deliver: meta progression (XP, levels, prestige, mastery, achievements, collections), all 18 UI screens, and all animations per the animation specification.
4. THE Milestone 8 (Weeks 15-19) SHALL deliver: social features (friends, leaderboards, ghost runs, challenge sharing), ReplayRecorder and ReplayPlayer, ReplayViewerScreen, and daily/weekly challenge LiveOps system.
5. THE Milestone 9 (Weeks 17-21) SHALL deliver: all accessibility modes, AdaptiveAssistController, all 60+ achievements, all 20 collections, environment variants, all analytics events, Crashlytics integration, and Remote Config integration.
6. THE Milestone 10 (Weeks 20-24) SHALL deliver: complete QA pass (all test suites passing), App Store/Play Store metadata in all 8 locales, TestFlight and Internal track deployment, and final launch readiness checklist sign-off.
7. EVERY Milestone SHALL have a code freeze period of at least 3 days before sign-off during which only bug fixes are accepted.

### Requirement 51: Developer Code Quality Standards

**User Story:** As an engineering lead, I want enforced code quality standards, so that complexity is managed proactively.

#### Acceptance Criteria

1. THE Maximum File Length SHALL be 300 lines; ESLint SHALL warn at 250 lines and error at 300 lines via the `max-lines` rule.
2. THE Maximum Function Length SHALL be 40 lines; functions exceeding this SHALL be extracted into named sub-functions.
3. THE TypeScript Configuration SHALL enable `"strict": true`; no exceptions SHALL be added.
4. THE `any` type SHALL be banned; ESLint `@typescript-eslint/no-explicit-any` SHALL be an error.
5. THE Game State Machine SHALL use discriminated unions; no loosely-typed `status: string` pattern SHALL be permitted.
6. ALL function branches SHALL have explicit return types; `--noImplicitReturns` SHALL be enabled.
7. ALL nullable values SHALL be handled at their declaration site; unsafe non-null assertions SHALL require a justifying comment.

### Requirement 52: Developer Naming, Git, and Security Standards

**User Story:** As an engineering lead, I want naming, Git workflow, and security standards defined, so that the codebase is consistent and no security vulnerability is introduced.

#### Acceptance Criteria

1. THE React Components SHALL use PascalCase; hooks SHALL use camelCase with `use` prefix; services SHALL use PascalCase with `Service` suffix; constants SHALL use SCREAMING_SNAKE_CASE; event handler functions SHALL use `handle` prefix; boolean variables SHALL use `is`, `has`, or `can` prefix.
2. THE `main` Branch SHALL be protected: direct pushes blocked, PRs require 1 approving review, all CI checks must pass.
3. THE Branch Naming SHALL follow: `feature/{ticket-id}-brief-description`, `bugfix/{ticket-id}-description`, `hotfix/{ticket-id}-description`.
4. THE PR Review Checklist SHALL verify: no business logic in UI components, no direct Matter.js access outside physics folder, services injected not imported, pure functions tested with property tests, no `any` types, file length under 300 lines, unit tests for new pure functions, analytics events added for new features.
5. ALL production dependencies SHALL be pinned to exact versions (no caret or tilde); devDependencies may use ranges.
6. NO Secret Keys SHALL be committed to the repository; they SHALL be managed via environment variables or secrets management.
7. THE appSecret used for HMAC signing SHALL be obfuscated in the binary using native code obfuscation; it SHALL never appear in JavaScript source.
8. ALL user inputs (usernames, search queries) SHALL be sanitized and length-limited before any Firebase write.
9. ALL async functions SHALL have explicit catch handlers; unhandled promise rejections SHALL be a CI ESLint error.

### Requirement 53: Launch Readiness — Code Quality and Performance Gate

**User Story:** As an engineering manager, I want a code quality and performance launch gate, so that no known debt or performance regression ships on launch day.

#### Acceptance Criteria

1. BEFORE launch, ALL CI checks SHALL pass on the release branch: TypeScript compile (zero errors), ESLint (zero errors), unit tests (100% pass), property tests (100% pass at 500 runs per property), integration tests (100% pass), E2E Detox tests (100% pass on iOS Simulator and Android Emulator).
2. BEFORE launch, THE Code Coverage SHALL meet all gate thresholds: Statements at least 75%, Branches at least 70%, Functions at least 80%, Lines at least 75%.
3. BEFORE launch, THE Golden Replay Suite (20 challenges) SHALL pass on the exact build being submitted to the app stores.
4. BEFORE launch, THE App Bundle Size SHALL not exceed 100MB for the initial download.
5. BEFORE launch, THE Cold Start Time SHALL be under 3 seconds on iPhone 11 and under 4 seconds on Pixel 5.
6. BEFORE launch, THE P95 Frame Time SHALL be under 12ms on both reference devices over a 10-minute gameplay session.
7. BEFORE launch, THE App SHALL have been tested on at least 5 distinct physical devices including: iPhone 11, iPhone 14 Pro, Samsung Galaxy A32, Pixel 5, and one low-end Android device from 2020 or earlier.

### Requirement 54: Launch Readiness — Accessibility, Store, and Content Gate

**User Story:** As a product manager, I want all accessibility and store requirements verified before launch, so that the app passes app store review without rejection.

#### Acceptance Criteria

1. BEFORE launch, A complete VoiceOver test pass SHALL have been conducted on all 18 screens on a physical iPhone; all interactive elements SHALL have correct accessibilityLabel and accessibilityHint values.
2. BEFORE launch, A complete TalkBack test pass SHALL have been conducted on all 18 screens on a physical Android device.
3. BEFORE launch, ALL six ring/peg color combinations SHALL have been tested using a color-blind simulator for all three presets (deuteranopia, protanopia, tritanopia).
4. BEFORE launch, THE axe-core automated accessibility scan SHALL produce zero WCAG 2.1 Level AA critical violations.
5. BEFORE launch, THE App Store metadata SHALL be prepared in all 8 locales: app name, subtitle, description, keywords, promotional text, and in-app purchase descriptions.
6. BEFORE launch, THE Privacy Policy and Terms of Service SHALL be hosted at public URLs and linked from: the store listing, the in-app Settings screen, and the first-launch screen.
7. BEFORE launch, ALL in-app purchases SHALL have been created in App Store Connect and Google Play Console; sandbox testing SHALL have been verified.

### Requirement 55: Launch Readiness — Firebase, Analytics, and Security Gate

**User Story:** As a backend engineer, I want all backend systems verified before launch, so that no data is lost and no revenue is missed on day one.

#### Acceptance Criteria

1. BEFORE launch, ALL Firestore security rules SHALL have been reviewed by at least two engineers and tested against the rule test suite.
2. BEFORE launch, ALL Cloud Functions SHALL have been deployed to the production Firebase project and smoke-tested manually with production Auth tokens.
3. BEFORE launch, THE Analytics event catalog SHALL have been validated: every event in the GDD catalog SHALL have been fired in a test session and verified visible in Firebase Analytics DebugView.
4. BEFORE launch, THE RevenueCat dashboard SHALL have been configured with all products and entitlements for both iOS and Android; end-to-end purchase SHALL have been tested in sandbox mode.
5. BEFORE launch, THE AdMob/IronSource SDK SHALL have been integrated and a rewarded video ad SHALL have been served and completed in a device test using production placement IDs.
6. BEFORE launch, THE Anti-Cheat System SHALL have been tested: a tampered input log SHALL be rejected, an invalid HMAC SHALL be rejected, and a below-minimum completion time SHALL be rejected.
7. BEFORE launch, ALL Firebase Alerts SHALL be configured: crash rate above 0.5% (P1), ANR rate above 0.2% (P1), API error rate above 2% (P2), D1 retention drop above 5 points (P2), economy sink:earn ratio below 0.15 (P3).
8. BEFORE launch, A rollback plan SHALL be documented: the staged Android rollout (5% to 20% to 50% to 100%) SHALL have defined pause criteria (crash rate above 0.5% or ANR rate above 0.2%).
9. BEFORE launch, THE iOS App SHALL be submitted with phased rollout enabled (7-day rollout period).
10. BEFORE launch, THE On-Call Rotation SHALL be defined for launch week with at least one engineer on-call per 24-hour period for the first 7 days.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — a formal statement verifiable through property-based testing.*

### Property 1: Force Boundedness

*For any* ring position, input state, and challenge config, `applyWaterForces` SHALL never produce a total force magnitude exceeding `MAX_WATER_FORCE` on any ring.

**Validates: Requirement 22**

### Property 2: No Force on Settled Rings

*For any* ring with `settledOnPegId !== null`, `applyWaterForces` SHALL apply zero net force to that ring regardless of input state.

**Validates: Requirement 22**

### Property 3: Buoyancy Direction

*For any* ring position within the arena, `computeBuoyancy` SHALL return a force vector with `y <= 0` (upward). Buoyancy SHALL never push a ring downward.

**Validates: Requirement 22**

### Property 4: Button Force Symmetry

*For any* ring at position (x, y), the force magnitude from the left button SHALL equal the force magnitude from the right button at position (W - x, y), where W is the arena width.

**Validates: Requirement 22**

### Property 5: Challenge Generation Determinism

*For any* challenge number N in [1, 10,000,000], calling `generateChallenge(N)` multiple times SHALL always return a byte-identical `ChallengeConfig` across all devices, OS versions, and app sessions with the same generatorVersion.

**Validates: Requirements 11, 24**

### Property 6: Peg Minimum Separation

*For any* generated `ChallengeConfig`, all peg pairs SHALL satisfy `distance(peg_i, peg_j) >= minPegSeparation(D(N))`.

**Validates: Requirement 11**

### Property 7: Ring-Peg Bijection

*For any* generated `ChallengeConfig`, the mapping from required rings to target pegs SHALL be a bijection: every required ring maps to exactly one target peg, and no two required rings share the same target peg.

**Validates: Requirement 11**

### Property 8: Arena Containment

*For any* generated `ChallengeConfig`, all peg positions and ring initial positions SHALL lie strictly within arena bounds.

**Validates: Requirement 11**

### Property 9: Difficulty Monotonicity

*For all* N >= 1, `D(N + 1) >= D(N)`. The difficulty score function is non-decreasing.

**Validates: Requirement 11**

### Property 10: Difficulty Ceiling

*For all* N >= 1, `D(N) <= 100`. The difficulty score never exceeds D_CEILING.

**Validates: Requirement 11**

### Property 11: Coin Conservation

*For any* sequence of economy transactions, `finalBalance = initialBalance + sum(credits) - sum(debits)`.

**Validates: Requirements 12, 30**

### Property 12: Continue Cost Escalation

*For any* fixed difficulty D and continue count n >= 1, `ContinueCost(D, n + 1) > ContinueCost(D, n)`.

**Validates: Requirement 30**

### Property 13: Idempotent Coin Credit

*For any* transactionId, calling `creditCoins(transactionId, ...)` multiple times SHALL credit the coins exactly once; subsequent calls with the same transactionId SHALL be no-ops.

**Validates: Requirements 12, 30**

### Property 14: Non-Negative Coin Balance

*For any* sequence of `spendCoins` calls, the resulting `coinBalance` SHALL never be less than 0.

**Validates: Requirements 12, 30**

### Property 15: Timer Monotonicity

*For any* active gameplay session without a continue being applied, `timerRemaining(t + dt) <= timerRemaining(t)` for all `dt > 0`.

**Validates: Requirements 9, 16**

### Property 16: Continue Bonus Time Bounded

*For any* difficulty D, `continueBonusTime(D) <= originalChallengeTimer(D)`.

**Validates: Requirement 30**

### Property 17: Leaderboard Score Ordering

*For any* two leaderboard submissions on the same challenge, the submission with lower `completionTime` and fewer `continuesUsed` SHALL rank strictly higher.

**Validates: Requirement 29**

### Property 18: Minimum Solve Time Gate

*For any* challenge N, no leaderboard entry with `completionTime < minPossibleSolveTime(N)` SHALL ever be recorded in Firestore.

**Validates: Requirements 27, 29**

### Property 19: Sync Idempotency

*For any* local `PlayerDocument` state, calling `syncNow()` N times SHALL produce the same Firestore cloud state as calling it once.

**Validates: Requirements 19, 30**

### Property 20: Cosmetic Physical Isolation

*For any* cosmetic being equipped or unequipped, the resulting `ChallengeConfig` physics properties SHALL be identical to the config with no cosmetics: mass, gravity, force constants, peg tip radius, ring outer radius, settle velocity threshold, and all collision parameters SHALL be unchanged.

**Validates: Requirements 11, 12**

---

*End of Requirements Document v1.0*

*This document covers all 15 implementation specification areas: Technical Architecture (Requirements 1-5), Project Structure (Requirements 6-8), Class and Module Design (Requirements 9-16), State Management (Requirements 17-20), Physics Engine (Requirements 21-24), Firebase Backend (Requirements 25-28), API Contracts (Requirements 29-32), UI Components (Requirements 33-35), Animation (Requirements 36-38), Asset Pipeline (Requirements 39-41), Performance Budget (Requirements 42-44), Testing Specification (Requirements 45-47), Production Roadmap (Requirements 48-50), Developer Standards (Requirements 51-52), Launch Readiness (Requirements 53-55). All 55 requirements and 20 correctness properties are derived exclusively from design.md v2.0.*
