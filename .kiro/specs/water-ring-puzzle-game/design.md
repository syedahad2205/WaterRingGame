# Design Document: Water Ring Puzzle Game
## Version 2.0 — Full Production Design (Audited & Enhanced)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Gameplay Systems](#core-gameplay-systems)
4. [Water Feel — Visual & Physics Fidelity](#water-feel)
5. [Haptic Design](#haptic-design)
6. [Audio Design](#audio-design)
7. [Challenge Generation System](#challenge-generation-system)
8. [Procedural Validation & Challenge Intelligence](#procedural-validation)
9. [Difficulty System](#difficulty-system)
10. [Adaptive Difficulty Assistance](#adaptive-difficulty-assistance)
11. [Challenge Templates](#challenge-templates)
12. [Timer System](#timer-system)
13. [New Player Experience & Onboarding](#new-player-experience)
14. [Meta Progression](#meta-progression)
15. [Player Psychology](#player-psychology)
16. [Economy System](#economy-system)
17. [Economy Simulation](#economy-simulation)
18. [Cosmetics System](#cosmetics-system)
19. [Collection System](#collection-system)
20. [Environment System](#environment-system)
21. [Social Features](#social-features)
22. [Replay System](#replay-system)
23. [Live Operations](#live-operations)
24. [UI/UX Design](#uiux-design)
25. [Accessibility](#accessibility)
26. [Technical Architecture](#technical-architecture)
27. [React Native Engineering Standards](#react-native-engineering-standards)
28. [Physics Engine Integration](#physics-engine-integration)
29. [Analytics — Expanded](#analytics)
30. [Data Models](#data-models)
31. [Key Algorithms and Formal Specifications](#key-algorithms)
32. [State Machines](#state-machines)
33. [Edge Cases and Resilience](#edge-cases)
34. [Security and Anti-Cheat](#security)
35. [Testing Strategy](#testing)
36. [Deployment and Scalability](#deployment)
37. [Dependencies](#dependencies)

---

## Overview

Water Ring Puzzle Game is a premium, physics-driven mobile puzzle game inspired by the classic handheld water ring toy — the iconic transparent plastic device filled with water, floating colored rings, and two push-button water jets. Players never touch rings directly. They control only water pressure through two virtual buttons. The water moves the rings. The rings drift, spin, collide, and settle onto conical pegs when guided with patience and skill.

The game targets the Top 100 Puzzle Games globally on both Google Play and the App Store. Its competitive reference points are Royal Match, Candy Crush, Block Blast, Monument Valley, and Alto's Odyssey. It sits in the relaxing physics puzzle segment — premium feel, zero aggression, deeply satisfying moment-to-moment tactility.

### Design Audit Summary (v1 → v2 Changes)

The v1 document established strong foundations: deterministic procedural generation, sound physics model, clean economy philosophy, and solid technical stack choices. However, a Director-level audit identified the following critical gaps that would have prevented top-chart performance:

| Gap Area | Risk Level | Resolution in v2 |
|----------|------------|-----------------|
| No new player experience design | Critical | Full 20-challenge onboarding chapter |
| Water feel unspecified | Critical | Dedicated Water Feel chapter |
| No haptic design system | High | Complete Haptic Design chapter |
| Audio was a table, not a system | High | Adaptive Audio System chapter |
| Meta progression was shallow | Critical | Full Meta Progression chapter |
| No player psychology framework | High | Player Psychology chapter |
| Adaptive difficulty missing | High | Adaptive Assistance System chapter |
| Economy had no simulation | High | Economy Simulation chapter |
| Procedural validation insufficient | High | Procedural Validation + Challenge Intelligence |
| Collections underdesigned | Medium | Full Collection System chapter |
| No environment variety system | Medium | Environment System chapter |
| Replay system was two paragraphs | Medium | Full Replay System chapter |
| Analytics was a table | High | Expanded Analytics chapter |
| Accessibility was five bullets | High | Full Accessibility chapter |
| No engineering standards | High | React Native Engineering Standards chapter |

Every section below has been rebuilt, not summarized. The document is now the single source of truth for building a game that can sustain millions of players for five or more years.

---

## Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Mobile Client (React Native)                  │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  UI Layer    │  │  Game Loop   │  │   Audio Engine       │  │
│  │  (Skia +     │◄─│  Controller  │──│   (Adaptive Music    │  │
│  │  Reanimated) │  │              │  │    + SFX)            │  │
│  └──────────────┘  └──────┬───────┘  └──────────────────────┘  │
│                           │                                      │
│  ┌──────────────┐  ┌──────▼───────┐  ┌──────────────────────┐  │
│  │  Input       │  │  Physics     │  │   Water Renderer     │  │
│  │  Handler     │─►│  Engine      │──│   (Particle +        │  │
│  │  (Gesture)   │  │  (Matter.js) │  │    Shader System)    │  │
│  └──────────────┘  └──────┬───────┘  └──────────────────────┘  │
│                           │                                      │
│  ┌──────────────┐  ┌──────▼───────┐  ┌──────────────────────┐  │
│  │  Local Store │  │  Challenge   │  │   Adaptive           │  │
│  │  (MMKV)      │◄─│  Generator   │  │   Difficulty         │  │
│  └──────┬───────┘  └──────────────┘  │   Controller         │  │
│         │                            └──────────────────────┘  │
└─────────┼───────────────────────────────────────────────────────┘
          │
┌─────────▼──────────────────────────────────────────────────────┐
│                     Firebase Backend                            │
│  Auth │ Firestore │ Analytics │ Crashlytics │ RemoteConfig      │
│  Cloud Functions │ Storage │ Hosting                            │
└─────────────────────────────────────────────────────────────────┘
          │
┌─────────▼──────────────────────────────────────────────────────┐
│              Third-Party Services                               │
│  RevenueCat (IAP) │ AdMob/IronSource (Rewarded Ads)             │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibility Summary

| Component | Responsibility |
|-----------|---------------|
| UI Layer | Rendering rings, pegs, water, buttons, HUD, all menus |
| Game Loop Controller | Fixed-timestep physics orchestration, win/loss detection |
| Physics Engine (Matter.js) | Rigid body simulation, collision, buoyancy, water forces |
| Input Handler | Touch events → typed InputEvents → InputState machine |
| Water Renderer | Surface ripples, displacement, bubbles, wakes, shaders |
| Audio Engine | Adaptive layered music, spatial SFX, dynamic mixing |
| Adaptive Difficulty Controller | Player behavior monitoring, invisible assistance layer |
| Challenge Generator | Deterministic procedural challenge construction |
| Local Store (MMKV) | Sub-millisecond local persistence, game state checkpoints |
| Firebase Auth | Anonymous + social sign-in, cross-device identity |
| Firestore | Cloud saves, leaderboards, economy, social data |
| Analytics | Complete event funnel, behavioral telemetry |
| Crashlytics | Crash + ANR reporting with physics state context |
| Remote Config | Live balance tuning, feature flags, event windows |
| Cloud Functions | Score validation, leaderboard writes, economy server ops |
| RevenueCat | IAP lifecycle, receipt validation, entitlement management |
| Ad Network | Rewarded video integration with fatigue protection |


### Folder Structure

```
water-ring-puzzle-game/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── Navigation.tsx
│   │   └── Providers.tsx
│   ├── screens/
│   │   ├── SplashScreen.tsx
│   │   ├── LoadingScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── GameScreen.tsx
│   │   ├── PauseScreen.tsx
│   │   ├── VictoryScreen.tsx
│   │   ├── DefeatScreen.tsx
│   │   ├── ContinueScreen.tsx
│   │   ├── LeaderboardScreen.tsx
│   │   ├── AchievementsScreen.tsx
│   │   ├── InventoryScreen.tsx
│   │   ├── CollectionScreen.tsx
│   │   ├── StoreScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   ├── DailyChallengeScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   ├── StatisticsScreen.tsx
│   │   └── ReplayViewerScreen.tsx
│   ├── features/
│   │   ├── game/
│   │   │   ├── core/
│   │   │   │   ├── GameLoop.ts
│   │   │   │   ├── GameState.ts
│   │   │   │   ├── InputController.ts
│   │   │   │   ├── WinCondition.ts
│   │   │   │   └── TimerController.ts
│   │   │   ├── physics/
│   │   │   │   ├── PhysicsWorld.ts
│   │   │   │   ├── WaterSimulation.ts
│   │   │   │   ├── RingBody.ts
│   │   │   │   ├── PegBody.ts
│   │   │   │   └── ObstacleBody.ts
│   │   │   ├── rendering/
│   │   │   │   ├── GameRenderer.tsx
│   │   │   │   ├── WaterRenderer.tsx
│   │   │   │   ├── WaterShader.ts
│   │   │   │   ├── RippleSystem.ts
│   │   │   │   ├── BubbleSystem.ts
│   │   │   │   ├── RingRenderer.tsx
│   │   │   │   ├── PegRenderer.tsx
│   │   │   │   └── ParticleSystem.tsx
│   │   │   ├── generation/
│   │   │   │   ├── SeedGenerator.ts
│   │   │   │   ├── ChallengeGenerator.ts
│   │   │   │   ├── TemplateRegistry.ts
│   │   │   │   ├── DifficultyCalculator.ts
│   │   │   │   ├── ValidationSolver.ts
│   │   │   │   ├── ChallengeScorer.ts
│   │   │   │   └── QualityEvaluator.ts
│   │   │   └── adaptive/
│   │   │       ├── PlayerBehaviorMonitor.ts
│   │   │       ├── AdaptiveAssistController.ts
│   │   │       └── SessionAnalyzer.ts
│   │   ├── audio/
│   │   │   ├── AudioEngine.ts
│   │   │   ├── MusicLayerManager.ts
│   │   │   ├── SFXManager.ts
│   │   │   └── HapticManager.ts
│   │   ├── progression/
│   │   │   ├── XPSystem.ts
│   │   │   ├── LevelSystem.ts
│   │   │   ├── PrestigeSystem.ts
│   │   │   ├── MasteryTracker.ts
│   │   │   ├── AchievementEngine.ts
│   │   │   └── CollectionTracker.ts
│   │   ├── economy/
│   │   │   ├── EconomyService.ts
│   │   │   ├── CoinLedger.ts
│   │   │   ├── PurchaseService.ts
│   │   │   └── AdService.ts
│   │   ├── social/
│   │   │   ├── LeaderboardService.ts
│   │   │   ├── FriendsService.ts
│   │   │   └── ChallengeShareService.ts
│   │   └── replay/
│   │       ├── ReplayRecorder.ts
│   │       ├── ReplayPlayer.ts
│   │       ├── ReplayCompressor.ts
│   │       └── ReplayStorageService.ts
│   ├── store/
│   │   ├── index.ts
│   │   └── slices/
│   │       ├── playerSlice.ts
│   │       ├── economySlice.ts
│   │       ├── challengeSlice.ts
│   │       ├── settingsSlice.ts
│   │       ├── cosmeticsSlice.ts
│   │       ├── socialSlice.ts
│   │       └── onboardingSlice.ts
│   ├── services/
│   │   ├── firebase/
│   │   │   ├── AuthService.ts
│   │   │   ├── FirestoreService.ts
│   │   │   ├── AnalyticsService.ts
│   │   │   ├── RemoteConfigService.ts
│   │   │   └── CloudFunctionsService.ts
│   │   └── sync/
│   │       ├── SyncManager.ts
│   │       └── ConflictResolver.ts
│   ├── hooks/
│   ├── utils/
│   ├── constants/
│   ├── types/
│   └── assets/
│       ├── images/
│       ├── sounds/
│       ├── shaders/
│       ├── fonts/
│       └── animations/
├── functions/
│   └── src/
│       ├── leaderboard.ts
│       ├── dailyChallenge.ts
│       ├── antiCheat.ts
│       ├── economy.ts
│       └── challengeIntelligence.ts
├── __tests__/
│   ├── unit/
│   ├── integration/
│   └── property/
└── ...
```

---

## Core Gameplay Systems

### The Water Ring Toy Model

The physical toy has: a sealed water chamber, two pressure-jet buttons, floating rings of varying sizes, and fixed conical pegs. The digital version preserves every sensory dimension of this:

- The chamber is the full screen viewport, with a visible water surface line that responds to input.
- Water pressure is a spatial force field — not a particle simulation, but a layered model that feels physically credible at 60fps on mobile.
- Rings are 2D rigid bodies with mass, angular inertia, drag, and buoyancy. They rotate naturally, collide with satisfying resistance, and settle with organic momentum.
- Pegs are conical static bodies with sensor zones for ring acceptance.
- The player's only agency is the two buttons. Everything else is physics.

The core loop must feel satisfying on the first touch and still feel satisfying at challenge 10,000. The physics model is therefore designed with **tactile expressiveness** as the primary success metric — not simulation accuracy.

### Input System

Two player inputs only: Left Button and Right Button.

| Interaction | Duration | Effect |
|-------------|----------|--------|
| Tap | < 150ms | Short burst impulse from that wall |
| Hold | 150ms – 1500ms | Sustained current, ramps up over 300ms to peak |
| Long Hold | > 1500ms | Intensity decays to prevent infinite holding |
| Rapid Tap | 3+ taps in 500ms | Turbulence: multi-directional splash |
| Simultaneous Press | Both held together | Upward surge — lifts all rings |
| Alternating Tap | L-R-L within 600ms | Creates oscillating current pattern |

The Left button generates a rightward water current (pushes rings away from left wall). The Right button generates a leftward current. This matches toy intuition.

### Water Physics Model

Water simulation uses a layered force field approach. No particle physics — too expensive. Instead, four independent force layers combine per ring per tick:

**Layer 1: Directional Button Force**

```
F_button(x, side, intensity) = BaseForce × intensity × (1 - |x - sourceX| / ScreenWidth) × DirectionVector
```

Force falls off linearly with distance from the source wall. A ring on the far side of the arena from the pressed button receives ~10% of the maximum force.

**Layer 2: Background Current**

Every challenge has a persistent ambient current from the seed-determined profile. This simulates the slight water drift always present in the real toy.

**Layer 3: Buoyancy**

```
F_buoy(ring, y) = BUOYANCY_BASE × ring.buoyancy × (y - waterSurface) / arenaHeight
```

Upward only. Deeper rings feel more upward pull. Rings at the surface feel no buoyancy.

**Layer 4: Turbulence**

Rapid tap events inject random micro-impulses. The turbulence seed is derived from the input timestamp, making it non-reproducible but bounded:

```
F_turb = BaseForce × TURBULENCE_FACTOR × RandomUnit(θ ± 45°, seed=inputTimestamp)
```

**Drag Model:**

Linear and angular drag are applied every tick:
```
v(t+1) = v(t) × (1 - linearDamping × dt)
ω(t+1) = ω(t) × (1 - angularDamping × dt)
```

Drag is higher near the bottom of the arena (simulating hydrostatic pressure from still water).

**Current Decay:**

Button intensity ramps up over 300ms, holds at peak until 1500ms, then decays to a 30% floor over the next 2000ms. This prevents "hold left forever" as a dominant strategy and rewards rhythmic play.

### Ring Physics Properties

```typescript
interface RingPhysicsConfig {
  outerRadius: number       // Visual and collision outer radius
  innerRadius: number       // Inner hole radius (visual only; collision uses outer)
  mass: number              // kg-equivalent; affects water force response
  buoyancy: number          // 0.0 (stone) to 1.0 (cork)
  angularDamping: number    // How quickly spin decays
  linearDamping: number     // How quickly translation decays
  restitution: number       // Wall/ring bounce coefficient
  frictionAir: number       // Water drag coefficient
  sizeCategory: 'small' | 'medium' | 'large'
  colorId: string           // Required for peg matching
  skinId: string            // Active cosmetic skin
  isDecoy: boolean          // Decoy rings need no peg
}
```

**Size tier properties:**

| Size | Outer Radius | Mass | Buoyancy | Character |
|------|-------------|------|----------|-----------|
| Small | 22px | 0.5 | 0.85 | Fast, nimble, hard to aim precisely |
| Medium | 32px | 1.0 | 0.65 | Balanced |
| Large | 44px | 2.2 | 0.45 | Sluggish, satisfying to land |

### Peg Physics Properties

```typescript
interface PegConfig {
  id: string
  position: Vector2D
  height: number
  baseRadius: number
  tipRadius: number
  acceptedRingSizes: RingSizeCategory[]
  acceptedColorId: string
  isMoving: boolean
  movementPath?: PathDefinition
  requiresMinVelocity?: number    // Pressure Zones template
  glowColor: string               // Matches required ring color
}
```

**Ring landing conditions (all must be true):**
1. Ring center within 1.2× peg tipRadius horizontally
2. Ring velocity below `settleVelocityThreshold`
3. Ring angle within ±15° of vertical (±8° for Precision template)
4. Ring has not bounced off this peg within last 200ms
5. Ring colorId matches peg acceptedColorId

### Win Condition

```
Win = all required (ring, peg) pairs satisfied AND stable for ≥ 500ms continuously
```

The 500ms stability window prevents false victories from rings momentarily touching pegs. If any required ring leaves its peg during the window, the counter resets to zero.

### Loss Condition

Timer reaches zero. Gameplay pauses. Continue modal appears. If declined or unaffordable, challenge is lost.


---

## Water Feel — Visual and Physics Fidelity

This chapter is the single most important differentiator between a good water ring game and a great one. Every top mobile game in this genre competes on feel. The water must feel real enough to be satisfying and stylized enough to be beautiful. This chapter specifies every layer of the water rendering and simulation stack.

### Design Principle

The water is not a decoration. It is the game. Players spend 100% of their time interacting with it. Every visual layer must reinforce the physical metaphor: pressing a button should feel like pressing the real toy button. The water should respond like water — not like a force field with a blue rectangle on top.

### Layer Architecture

The water visual system has five independent rendering layers, composited in order:

```
Layer 5: Ripple Overlay (surface perturbations)
Layer 4: Bubble System (sub-surface bubbles)
Layer 3: Ring Wake System (wakes behind moving rings)
Layer 2: Water Displacement (button pressure visualization)
Layer 1: Water Body (base color + shader)
```

Each layer is implemented as a Skia canvas draw pass. On low-end devices, layers 4 and 5 are disabled automatically.

### Layer 1: Water Body

The water fills the entire arena. The base color is the player's equipped water color palette. The water surface is not flat — it has a sinusoidal wave that undulates at all times:

```
WaterSurfaceY(x, t) = BASE_SURFACE_Y + Σ(i=1..4) [
  Amplitude_i × sin(2π × Frequency_i × (x / ScreenWidth) + Phase_i × t)
]
```

Four sine wave layers are summed to create the appearance of natural wave interference. Parameters:

| Wave Layer | Amplitude | Frequency | Phase Speed |
|-----------|-----------|-----------|-------------|
| Base swell | 4px | 0.3 Hz | 0.4 rad/s |
| Mid ripple | 2px | 0.8 Hz | 0.9 rad/s |
| High ripple | 1px | 1.6 Hz | 1.8 rad/s |
| Micro chop | 0.5px | 3.2 Hz | 3.5 rad/s |

When a button is pressed, wave amplitudes of layers 3 and 4 are temporarily scaled up (×3.0 on the pressed side, decaying over 400ms). This gives the surface a visible "breathing" response to input.

**Water Shader:**

The water body uses a Skia shader (GLSL-style, compiled to Metal on iOS and Vulkan/OpenGL on Android via Skia's backend) that applies:
- A vertical gradient darkening (deep water appears darker)
- A horizontal caustic shimmer pattern (light refraction effect) that scrolls slowly
- A specular highlight streak near the surface (simulates light bounce)
- A subtle chromatic aberration near the surface line (enhances glass/water illusion)

The shader is a static compiled program — it has no branching on mobile. Parameters (brightness, caustic speed, tint) are passed as uniforms and driven by the active theme.

**Performance budget for water body:** < 0.5ms per frame on minimum-spec device.

### Layer 2: Water Displacement

When a button is pressed, water visually "bulges" from that side — showing the player where the force is coming from. This is rendered as a Skia path drawn over the water surface:

```
DisplacementBulge(x, side, intensity, t) = intensity × GaussianBell(x, μ=sourceX, σ=ScreenWidth×0.2)
                                           × DecayEnvelope(t - pressStartTime, tau=300ms)
```

The displacement is a Gaussian bell curve centered at the pressed wall, scaled by current button intensity, and decaying with a 300ms time constant. At maximum intensity, the bulge is 12px tall at the wall, fading to 0 at the center of the arena.

This displacement affects only the visual surface line, not the physics. It provides a readable visual cue for force origin without adding physics complexity.

### Layer 3: Ring Wake System

Every ring moving faster than a minimum velocity threshold generates a wake — a V-shaped trail of surface disturbance behind it, like a boat wake or a ring sliding through the real toy.

**Wake parameters:**
- Wake angle: 19.5° half-angle (matches real water wake physics — Kelvin wake angle)
- Wake length: scales with ring velocity, max 80px
- Wake fade: exponential decay over 600ms
- Wake width: proportional to ring outerRadius

Wakes are rendered as Skia path fills with decreasing opacity along their length. Each ring maintains its own wake trail as a circular buffer of position samples (last 300ms of positions at 30 samples/second).

On devices with fewer than 4 active rings, all rings generate wakes. With 6+ rings, only the 3 fastest rings generate wakes (performance cap).

### Layer 4: Bubble System

Sub-surface bubbles are generated by:
1. Button press events (burst of 5–12 small bubbles from the pressed side)
2. Ring collisions (2–4 tiny bubbles at the collision point)
3. Ring-on-peg landing (burst of 6–10 medium bubbles)
4. Ambient passive generation (1 random bubble every 2–4 seconds per active challenge)

**Bubble properties:**

```typescript
interface Bubble {
  position: Vector2D
  radius: number           // 2–8px depending on event
  velocity: Vector2D       // Upward with slight random X
  opacity: number          // Starts at 0.7, fades as approaches surface
  wobblePhase: number      // Random phase for left-right wobble
}
```

Bubbles rise with a slight sinusoidal wobble (like real bubbles ascending in water):
```
bubble.x(t) = bubble.x(0) + WOBBLE_AMPLITUDE × sin(WOBBLE_FREQ × t + wobblePhase)
bubble.y(t) = bubble.y(0) - RISE_SPEED × t
```

Bubbles are removed when they reach the water surface (they "pop" with a micro ripple event, triggering a tiny Layer 5 ripple).

Maximum active bubbles: 40 (oldest are culled when this is exceeded).

### Layer 5: Ripple Overlay

Surface ripples are triggered by:
- Bubble pop at the surface
- Ring breaking the water surface (ring moving upward past waterSurfaceY)
- Rain weather overlay (Environment System)
- Button press (radial ripple from the button's wall)

Each ripple is a circular ring that expands from its origin:

```
RippleRadius(t) = RIPPLE_SPEED × (t - birthTime)
RippleOpacity(t) = MAX_OPACITY × (1 - (t - birthTime) / RIPPLE_LIFETIME)
RippleWidth(t) = BASE_WIDTH × (1 + (t - birthTime) / RIPPLE_LIFETIME × 0.5)
```

| Ripple Type | Max Opacity | Lifetime | Speed | Max Radius |
|------------|-------------|---------|-------|-----------|
| Bubble pop | 0.3 | 600ms | 80px/s | 48px |
| Ring surface break | 0.5 | 800ms | 100px/s | 80px |
| Button press | 0.4 | 1000ms | 120px/s | 120px |
| Rain drop | 0.25 | 500ms | 60px/s | 36px |

Maximum active ripples: 20. Oldest culled on overflow.

Ripples are rendered using Skia's `drawCircle` with a stroke style. The stroke color is the water color with 80% lightness adjustment (slightly lighter than the water body).

### Water Turbulence Visualization

Rapid tap events trigger a turbulence effect across the entire water surface: wave amplitudes spike and randomize briefly (200ms), then return to their normal undulation. This is implemented as a time-limited noise function added to the surface wave sum:

```
TurbulenceNoise(x, t) = MAX_TURB × (1 - t_elapsed/TURB_DURATION) × PerlinNoise1D(x × 0.05 + t × 8.0)
```

The visual result: the water surface briefly "shudders" during turbulence, matching the chaotic force behavior happening in the physics layer.

### Ring Visual Design

Rings are rendered with three visual components:
1. **Ring body** — the torus shape in the active skin color/texture
2. **Inner highlight** — a thin arc of 70% opacity white, 30° long, on the upper-left of the ring (simulates light hitting the plastic/material)
3. **Drop shadow** — a soft elliptical shadow below the ring, scaled with ring height above the bottom

The inner highlight and drop shadow together create the "depth" of the ring sitting in water, giving it a 3D quality without actual 3D rendering.

When a ring is correctly placed on its target peg, a soft colored glow pulses from the ring (ring's colorId color, 50% opacity, pulsing at 1.5 Hz) to signal "this one is done."

### Performance Considerations

| Device Tier | Water Layers Active | Bubble Max | Ripple Max | Shader |
|------------|---------------------|------------|------------|--------|
| High-end (iPhone 14+, Pixel 8+) | All 5 | 40 | 20 | Full |
| Mid-range (iPhone 11, Pixel 5) | Layers 1-4 | 20 | 10 | Simplified |
| Low-end (older devices) | Layers 1-2 | 8 | 5 | None (gradient only) |

Device tier is detected at launch by measuring a 1-second physics benchmark. The benchmark result is cached in MMKV and re-evaluated on app update. Players can manually override the tier in Settings → Graphics Quality.

### Fake vs Real Simulation

The choice to use a layered fake simulation over particle-based real water simulation is intentional and optimal:

| Approach | Visual Quality | Performance Cost | Decision |
|----------|---------------|-----------------|----------|
| Particle water (SPH) | Highest | Unacceptable (200+ ms/frame) | Rejected |
| Grid fluid simulation | High | High (20-40 ms/frame) | Rejected |
| Shader-only (our approach) | Very high | Very low (< 1ms/frame) | **Chosen** |
| Static sprite animation | Medium | Trivial | Rejected |

The shader approach with layered ripples, bubbles, and wakes achieves visual quality indistinguishable from particle simulation at a fraction of the cost. Players cannot tell the difference. The goal is feel, not physics accuracy.


---

## Haptic Design

Haptics are the invisible layer that makes the game feel alive in the player's hand. In a game about water and physics, haptics must reinforce every physical event. This chapter specifies every vibration pattern, intensity, duration, and trigger condition in the game.

### Platform Capabilities

| Platform | Haptic Engine | Capabilities |
|----------|--------------|-------------|
| iOS (iPhone 8+) | Taptic Engine | UIImpactFeedbackGenerator (light/medium/heavy), UINotificationFeedbackGenerator (success/warning/error), Custom patterns via CHHapticEngine |
| iOS (older) | Basic vibrator | Simple on/off vibration |
| Android (API 26+) | VibrationEffect API | Amplitude control, waveform patterns, predefined constants |
| Android (older) | Legacy vibrate | Duration only |

The `HapticManager` service detects capability on init and gracefully degrades. On devices without haptic support, nothing fires (no silent failures).

### Haptic Event Catalog

#### Gameplay Haptics

**Button Tap (single press < 150ms)**
- Type: Impact, Light
- Duration: 1 pulse, ~10ms
- Intensity: 0.4 (normalized)
- Feel: A satisfying micro-click, like a real button
- iOS: `UIImpactFeedbackGenerator(style: .light).impactOccurred()`
- Android: `VibrationEffect.createOneShot(12, 80)`
- Rationale: Light enough not to fatigue over thousands of taps. Confirms the press without demanding attention.

**Button Hold Start (hold threshold crossed at 150ms)**
- Type: Impact, Medium
- Duration: 1 pulse, ~15ms
- Intensity: 0.55
- Feel: Noticeably stronger than tap — signals the player entered "hold mode"
- iOS: `UIImpactFeedbackGenerator(style: .medium).impactOccurred()`

**Button Hold Sustained (every 300ms while holding)**
- Type: Custom waveform — very light pulse
- Duration: 1 pulse, ~8ms, repeating every 300ms
- Intensity: 0.25
- Feel: A subtle heartbeat in the button, like feeling water pressure through the device
- Stops when button is released

**Button Hold Peak (intensity reaches maximum at 1500ms)**
- Type: Impact, Heavy
- Duration: 1 pulse, ~20ms
- Intensity: 0.8
- Feel: A satisfying "thump" — you've reached maximum pressure
- Fires once per hold session, not repeatedly

**Rapid Tap / Turbulence**
- Type: Custom waveform — three rapid light pulses
- Pattern: 15ms on, 30ms off, 15ms on, 30ms off, 15ms on
- Intensity: 0.5 each pulse
- Feel: The physical sensation of chaos — three little splashes
- Fires once when turbulence is triggered (not per tap)

**Simultaneous Press (both buttons)**
- Type: Impact, Heavy
- Duration: 1 pulse, ~25ms
- Intensity: 0.9
- Feel: A strong surge — feels like the whole toy lurching upward
- Fires immediately on simultaneous detection

**Ring-to-Ring Collision**
- Type: Impact, Light
- Duration: 1 pulse, scaled with collision velocity
- Intensity: 0.2 + (collisionSpeed / MAX_SPEED) × 0.4
- Feel: A soft plastic bump. More intense for fast collisions, barely felt for slow ones
- Maximum 3 collision haptics per 100ms (prevents haptic spam with many rings)

**Ring-to-Wall Collision**
- Type: Impact, Medium
- Duration: 1 pulse, ~12ms
- Intensity: 0.35
- Feel: Slightly stronger than ring-ring collision — wall is rigid

**Ring Near Peg (correct ring within 80px of its target peg)**
- Type: Custom waveform — double light tap
- Pattern: 10ms on, 40ms off, 10ms on
- Intensity: 0.3 each pulse
- Feel: A gentle "ping" — the game whispers "you're close"
- Fires once per ring-peg proximity trigger (resets if ring moves away > 120px, fires again on re-approach)

**Ring Landing on Peg (correct placement confirmed)**
- Type: Notification, Success
- Duration: Two-pulse pattern — medium then heavy
- Pattern: 15ms on, 20ms off, 30ms on
- Intensity: 0.6 / 0.9
- Feel: A resonant "clunk" — plastic ring settling onto a cone. This is the most important haptic in the game. Must feel deeply satisfying.
- iOS: `UINotificationFeedbackGenerator().notificationOccurred(.success)` then `UIImpactFeedbackGenerator(style: .heavy).impactOccurred()` with 20ms delay
- Android: custom waveform pattern

**Perfect Placement (ring lands on correct peg with timer > 60% remaining, no continues)**
- Type: Custom — three escalating pulses
- Pattern: 10ms on, 15ms off, 20ms on, 15ms off, 35ms on
- Intensity: 0.4 / 0.65 / 0.95
- Feel: A celebratory escalation — significantly better than normal landing
- Reserved for moments of genuine player skill expression

**Peg Already Occupied (ring tries to land on occupied peg)**
- Type: Notification, Error
- Duration: 1 pulse, ~15ms
- Intensity: 0.5
- Feel: A blocked thud — communicates "no" without being harsh
- iOS: `UINotificationFeedbackGenerator().notificationOccurred(.error)`

#### State Change Haptics

**Timer Warning (30% remaining)**
- Type: Custom — slow pulse, 1 per second
- Duration: 8ms per pulse
- Intensity: 0.3
- Fires every second while timer is in amber zone (10–30%)
- Feel: A quiet heartbeat, subtle urgency without panic

**Timer Critical (10% remaining)**
- Type: Custom — faster pulse, 2 per second
- Duration: 8ms per pulse
- Intensity: 0.5
- Feel: More urgent but still soft. Not alarming. This is a relaxing game.

**Victory (challenge complete)**
- Type: Custom escalating celebration — 5 pulses
- Pattern: 10/20/30/45/60ms on, 20ms gaps
- Intensity: 0.3 / 0.5 / 0.7 / 0.85 / 1.0
- Feel: A crescendo — each pulse stronger, building to a final "THUMP"
- Duration total: ~250ms
- This is the most elaborate haptic in the game. It should feel earned.

**Defeat (timer expired, no continue)**
- Type: Custom — two dull pulses with long gap
- Pattern: 30ms on, 80ms off, 20ms on
- Intensity: 0.6 / 0.35
- Feel: A deflated pair of thumps. Heavy first, then lighter — like something winding down.
- Intentionally not punishing. The game is relaxing.

**Boss Challenge Complete**
- Type: Custom extended celebration — 8 pulses
- Pattern: escalating amplitudes, 15ms each, 15ms gaps
- Intensity: 0.2 through 1.0 in linear steps
- Feel: Distinctly more epic than regular victory. Players should feel the difference.

**Continue Granted**
- Type: Impact, Medium
- Duration: 1 pulse, 15ms
- Intensity: 0.55
- Feel: A restart — a firm tap to signal "okay, back into it"

#### Menu and UI Haptics

**Navigation tap (button press in menus)**
- Type: Selection feedback (lightest available)
- Duration: ~6ms
- Intensity: 0.2
- Feel: Barely perceptible — confirms touch without interrupting the UI experience

**Store purchase confirm**
- Type: Notification, Success
- Feel: Same as ring-landing — deliberate choice. Purchases should feel rewarding.

**Achievement unlock**
- Type: Custom — three ascending pulses with distinct intervals
- Pattern: 12ms on, 30ms off, 18ms on, 30ms off, 25ms on
- Feel: A mini-celebration, not as long as victory but clearly special

**Cosmetic equipped**
- Type: Impact, Light
- Feel: A soft confirm — the cosmetic is now "on"

**Coin earn (significant amount, 500+)**
- Type: Custom — rapid triple micro-tap
- Pattern: 6ms on, 8ms off, 6ms on, 8ms off, 6ms on
- Intensity: 0.25 each
- Feel: Like coins landing — playful, not overdone

**Error / action blocked**
- Type: Notification, Warning
- Duration: 15ms
- Intensity: 0.45
- Feel: A gentle "nope" — not harsh, not annoying

### Haptic Settings

Players have full control:
- **Haptics Enabled**: Global on/off toggle
- **Haptic Intensity**: Slider 25% / 50% / 75% / 100% (scales all intensities)
- **Gameplay Haptics**: Separate toggle for in-game haptics
- **UI Haptics**: Separate toggle for menu haptics

Intensity preference persists to MMKV and syncs to cloud. Default is 100% enabled. The default must be on — players who never change settings should experience the full haptic design.

### HapticManager Implementation Interface

```typescript
interface HapticManager {
  trigger(event: HapticEvent): void
  triggerPattern(pattern: HapticPattern): void
  cancelAll(): void
  setGlobalIntensity(scale: number): void
  isSupported(): boolean
}

type HapticEvent =
  | 'buttonTap' | 'buttonHoldStart' | 'buttonHoldSustained' | 'buttonHoldPeak'
  | 'rapidTap' | 'simultaneousPress'
  | 'ringCollisionLight' | 'ringCollisionHeavy' | 'ringWallCollision'
  | 'ringNearPeg' | 'ringLandedPeg' | 'perfectPlacement' | 'pegOccupied'
  | 'timerWarning' | 'timerCritical'
  | 'victory' | 'defeat' | 'bossVictory' | 'continueGranted'
  | 'navigationTap' | 'purchaseConfirm' | 'achievementUnlock'
  | 'cosmeticEquipped' | 'coinEarn' | 'actionBlocked'

interface HapticPattern {
  amplitudes: number[]   // 0–255 per step
  timings: number[]      // ms per step
  repeat: number         // -1 = infinite, 0 = once
}
```

---

## Audio Design

### Design Philosophy

Sound is the emotional amplifier of gameplay. In a relaxing physics puzzle game, sound must do three things simultaneously: reinforce the physical reality of water, reflect the emotional state of the session, and never become irritating or fatiguing. The audio design reference is: **ASMR-quality water sounds, wrapped in ambient electronic music that could play in a spa.**

No harsh buzzers. No aggressive stingers. No sounds that feel like failures rather than setbacks. Every audio event is designed to feel pleasant, even when communicating failure.

### Audio Architecture

The audio system has three independent layers:

```
Layer 3: Music System (Adaptive layered background music)
Layer 2: Ambient System (Environment sounds, idle water)
Layer 1: SFX System (Physics events, UI interactions)
```

All three layers are mixed in real time. The `AudioEngine` controls:
- Master volume
- Layer volumes (music, ambient, SFX independently)
- Dynamic mixing decisions (reduce music when timer is critical)
- Platform audio session configuration (duck external audio properly)

**Technology:** React Native Track Player for music layer management. React Native Sound for SFX. Custom AudioEngine wrapper coordinates both.

### Layer 1: SFX System

Every physics event and UI interaction has a corresponding SFX. All SFX are designed to be:
- Short (< 500ms for discrete events, loopable for continuous events)
- Non-fatiguing (not shrill, not overly punchy)
- Spatially credible (water sounds from where the water is)

**SFX Event Catalog:**

| Event | Sound Design | Duration | Notes |
|-------|-------------|----------|-------|
| Button tap (left) | Short directional water jet burst, panned slightly left | 180ms | Stereo panning: L button = 40% left, R button = 40% right |
| Button tap (right) | Same, panned slightly right | 180ms | |
| Button hold (sustained) | Looping water current — starts soft, swells over 300ms | Loopable | Volume and pitch scale with hold intensity |
| Button hold peak | Subtle higher-frequency rush added to hold loop | Added layer | |
| Rapid tap | Chaotic splash burst — bubbling, splashing, no single tone | 350ms | |
| Simultaneous press | Deep underwater surge with high-end shimmer | 400ms | Lower register than normal — feels "bigger" |
| Ring-ring collision | Soft hollow plastic bump | 80ms | Pitch varies with collision speed (±15%) |
| Ring-wall collision | Slightly harder plastic thud with brief resonance | 120ms | |
| Ring near peg | Gentle descending musical note — a soft "ping" | 200ms | Pitch matches ring color (each color = unique note in pentatonic scale) |
| Ring lands on peg | Satisfying hollow "plonk" with water swirl around it | 350ms | This is the most important SFX. A resonant, wooden-hollow tone with water wash. |
| Perfect placement | Ring landing + ascending chime sting | 600ms | The chime is 3 notes ascending — C, E, G. Feels like a small celebration. |
| Ring decoy settled (wrong peg) | Soft rejected "thud" | 150ms | Lower pitch than correct placement. No buzz. Just a muted thump. |
| Timer warning (amber) | Distant heartbeat pulse | 400ms per beat | Very subtle. Barely audible if not listening for it. Fires at 30% timer. |
| Timer critical (red) | Faster heartbeat, slightly louder | 400ms per beat | Fires at 10% timer. Still relaxing — just slightly urgent. |
| Victory (standard) | Water whoosh + ascending musical sting (3 notes) | 1200ms | |
| Victory (perfect 3-star) | Extended sting with additional harmony notes | 2000ms | More notes, longer sustain, more satisfying |
| Defeat | Descending tone + bubbles draining out | 800ms | Like water draining. No harsh tone. Melancholic, not punishing. |
| Boss victory | Epic sting — full chord progression, 5 notes | 3000ms | |
| Continue granted | Short upward sting — "fresh start" feel | 400ms | |
| Achievement unlock | Bell tone + paper rustling sound | 500ms | Pleasant but not intrusive |
| Coin earn (small) | Soft chime — single note | 150ms | Varies pitch slightly per coin earn to avoid repetition |
| Coin earn (large) | 3-note ascending chime | 400ms | |
| Level up | Ascending arpeggio (6 notes) + water splash | 1000ms | Feels celebratory without being overwhelming |
| Store purchase | Cash register tone + sparkle | 400ms | Satisfying but not garishly "cha-ching" |
| Button press (UI) | Very soft click — barely perceptible | 60ms | |
| Daily challenge available | Gentle water bell chime | 400ms | Heard on home screen notification badge |

**Pitch Variation:** All impact SFX (collisions, placements) have ±8% random pitch variation per play to prevent robotic repetition. The variation uses the same seeded PRNG as the game (passed a different sub-seed) so it is reproducible in replays.

**Spatial Audio:** The arena has a virtual 2D audio space. Ring-ring collision SFX are panned based on the x-position of the collision point relative to screen center. This gives collisions spatial presence.

### Layer 2: Ambient System

The ambient layer provides the living atmosphere of the water environment. It plays continuously during gameplay at low volume (mixed at 25–35% of SFX layer).

**Ambient tracks by theme:**

| Theme | Ambient Sound | Character |
|-------|--------------|-----------|
| Classic | Gentle water lapping, distant room tone | Nostalgic, warm |
| Beach | Ocean waves, seagulls (distant), light breeze | Relaxing, open |
| Space | Light electronic hum, subtle wind | Mysterious, vast |
| Zen Garden | Bamboo chime, soft rain, stream | Peaceful |
| Underwater | Bubbling water, muffled depth sounds | Immersive |
| Halloween | Wind gusts, distant owl (very quiet) | Slightly spooky without jarring |
| Winter | Snow ambience, crackling fire (faint) | Cozy |

Ambient sounds crossfade (1.5 second fade) when the theme changes. They loop seamlessly with no audible loop point.

### Layer 3: Music System — Adaptive Layered Architecture

The music system is the most technically sophisticated audio component. It uses a horizontal re-sequencing approach (not vertical remix) combined with dynamic layer activation based on game state.

**Core Concept: Musical Layers**

Each piece of music exists as 4–6 independent instrument stems that are mixed in real time:

| Stem | Instrument | Always Active? |
|------|-----------|----------------|
| Base | Low piano, soft bass, pad | Yes |
| Rhythm | Gentle percussion (subtle, not driving) | Activates in mid-challenge |
| Melody | Lead melodic instrument (marimba/glockenspiel) | Activates when first ring lands |
| Counter | Counter-melody harmony | Activates at challenge 50%+ |
| Texture | Ambient pad / strings | Always active at low volume |
| Intensity | Higher register, faster rhythm | Activates in final 20% of timer |

**State-driven mixing rules:**

```
ChallengStart → Fade in Base + Texture (8 bar intro)
FirstRingMoved → Add Rhythm at volume 0.6
FirstRingLanded → Add Melody at volume 0.7
ChallengeMidpoint (50%) → Add Counter at volume 0.5
TimerAmber (30%) → Increase Rhythm volume to 0.85, reduce Melody to 0.5
TimerCritical (10%) → Add Intensity stem at 0.7, further reduce Melody
Victory → Fade all to silence in 1.5s, play Victory sting, return to menu music
Defeat → Fade all to silence in 2s while Defeat sound plays

Pause → Fade music to 15% volume (game is paused but music confirms continuity)
Resume → Fade back to active levels over 1.5 bars
```

**Musical key and tempo:**

All music is written in A minor / C major tonality (shares the same key signatures). This ensures crossfades and stem swaps never create dissonance. Tempo: 72–80 BPM. Slow enough to be relaxing, fast enough to feel alive.

**Boss Challenge Music:**

Boss challenges use a separate music set with a darker, more intense character:
- Minor key (instead of relative major)
- Lower register, more tension in the texture stem
- The intensity stem is active from the beginning (not unlocked by timer)
- Victory sting for Boss is longer and more dramatic

**Daily Challenge Music:**

Daily challenges use a "special occasion" variant — same stems but with a brighter melody instrument and a slightly faster tempo (82 BPM). This signals to the player that today's challenge is different.

**Menu Music:**

Home screen and menus use a simplified version of the Base + Texture stems only, at lower volume, with a longer and more ambient character. The transition from menu to gameplay is a smooth crossfade (2 seconds) — the music does not restart.

**Music Themes:**

Each background theme has its own music set. There are 8 music sets in v1:

| Theme | Music Style |
|-------|------------|
| Classic | Minimalist piano + water-drop percussion |
| Beach | Light acoustic guitar + soft pan flute |
| Space | Ambient electronic + slow synth pads |
| Zen Garden | Koto + flute + sparse percussion |
| Underwater | Slow electronic + whale song texture |
| Halloween | Minor key piano + theremin texture |
| Winter | Music box + light orchestral strings |
| Boss | Tense low piano + driving rhythm |

**Volume Psychology:**

The music intentionally never drowns out the water SFX. The SFX layer is always mixed higher than the music during active gameplay. This keeps the physical feedback loop (sound = physics happening) intact. Players who mute music do not lose any gameplay information.

### Audio Accessibility

- Subtitles/captions: Not applicable (no dialogue)
- Visual audio indicators: When SFX are muted, physics events show brief on-screen micro-animations (ring sparkle on landing, button flash on press) to compensate for lost audio feedback
- Mono audio option: All spatial SFX collapse to center when enabled
- Independent volume controls: Music, Ambient, and SFX each have individual sliders in Settings

### The Psychology of Sound in This Game

**Why pentatonic ring tones?** Pentatonic scales have no dissonant intervals. Any combination of notes from a pentatonic scale sounds pleasant. By assigning each ring color a note from the C major pentatonic (C, D, E, G, A), every combination of rings landing on pegs produces a musical chord sequence that sounds harmonious. The player is inadvertently composing music while solving the puzzle.

**Why does defeat sound like draining water?** The visuals show water draining out of the arena. The sound matches that visual metaphor. This makes the defeat feel narrative ("the water left") rather than punishing ("you failed"). Players are more likely to retry after a defeat that feels like a story moment rather than a punishment.

**Why is the music quiet and layered, not driving?** This game is played during commutes, before sleep, and in moments of calm. Driving, prominent music would make those moments impossible. Layered stems that build gradually respect the player's environment and mental state.


---

## Challenge Generation System

### Design Philosophy

Every challenge is deterministic from a seed derived from the challenge number. Challenge #527 is always identical for every player on every device. The seed encodes the entire challenge: layout, physics, timer, theme, rewards, and all modifiers.

### Seed Architecture

**Master Seed Formula:**
```
MasterSeed(N) = xoshiro128_init(splitmix64(N × PRIME_A + SALT_GLOBAL))
```

Where:
- `PRIME_A = 2654435761` (Knuth multiplicative hash)
- `SALT_GLOBAL` is a server-controlled value from Remote Config (rotatable)
- splitmix64 produces 4 × 32-bit state words for xoshiro128

**Daily Challenge Seed:**
```
DailySeed(date) = xoshiro128_init(splitmix64(UnixDayNumber(date) × PRIME_B + SALT_DAILY))
```

**Challenge Code Encoding:**
```
Code = Base36(N) + "-" + LuhnCheckDigit(N)
```
Example: Challenge 527 = "EJ-8". Codes are 3–7 characters for the first 10 billion challenges.

### PRNG Implementation

xoshiro128** PRNG chosen for: period 2^128, excellent statistical quality, 4 operations per output, reproducible across all platforms, no floating-point ambiguity.

```typescript
interface PRNG {
  seed(s0: number, s1: number, s2: number, s3: number): void
  nextFloat(): number          // [0.0, 1.0)
  nextInt(min: number, max: number): number
  nextChoice<T>(array: T[]): T
  shuffle<T>(array: T[]): T[]
  fork(): PRNG                 // Creates a child PRNG from current state (for sub-systems)
}
```

The `fork()` method is critical: it creates an independent sub-PRNG for water current generation, obstacle generation, etc., without consuming values from the main sequence. This prevents adding new generation steps from corrupting existing challenges.

### Generation Pipeline (12 Steps)

```
Input N → MasterSeed → PRNG Init
         ↓
Step 1:  Template Selection (weighted by D(N))
Step 2:  Difficulty Score D(N) (deterministic, no PRNG)
Step 3:  Visual Theme + Environment Variant
Step 4:  Arena Layout (active zone dimensions)
Step 5:  Peg Placement (Poisson Disk, forked PRNG)
Step 6:  Ring Placement (initial positions, forked PRNG)
Step 7:  Obstacle Placement (template-conditional, forked PRNG)
Step 8:  Water Current Profile (forked PRNG)
Step 9:  Timer Computation
Step 10: Physics Modifiers (weighted selection)
Step 11: Environment Modifiers (weather, lighting)
Step 12: Challenge Intelligence Metadata generation
         ↓
Solvability Validation → Pass → ChallengeConfig
                       → Fail → seed offset +1, retry from Step 4 (max 5)
```

The use of `fork()` at Steps 5–11 means steps are independent sub-sequences. Adding a new step anywhere in the pipeline only requires inserting a new fork call; it does not consume values from other steps and does not break existing challenges.

### Step-by-Step Documentation

**Step 1: Template Selection**

Weighted sampling from the template registry. Weights are functions of challenge number N, not difficulty score, to enable precise first-appearance control.

**Step 2: Difficulty Score**

Pure function of N. See Difficulty System chapter. No PRNG consumed here.

**Step 3: Visual Theme + Environment**

```
ThemeIndex = floor(N / THEME_CYCLE_LENGTH) mod totalThemes
EnvironmentVariant = prng.nextChoice(availableVariantsForTheme)
```

Event window overrides applied last (from Remote Config `event_windows`).

**Step 4: Arena Layout**

Active zone dimensions scale with difficulty. Pegs and obstacles must fit within the active zone. Background elements fill the full viewport.

**Step 5: Peg Placement (Poisson Disk)**

Poisson Disk sampling guarantees minimum separation between pegs. Uses a forked PRNG. Full algorithm in Key Algorithms chapter.

**Step 6: Ring Placement**

Rings begin in the upper half of the arena, distributed with minimum separation. Rings are assigned target pegs deterministically (first ring → first peg by position).

**Step 7: Obstacle Placement**

Only for templates that include obstacles. Obstacles are sampled after pegs and rings to prevent overlaps. Obstacle count scales with difficulty.

**Step 8: Water Current Profile**

```
CurrentX = prng.nextFloat() × 2 - 1  // [-1, 1] direction
CurrentMagnitude = BASE_CURRENT × (1 + NormalizedDifficulty(D) × CURRENT_SCALE)
CurrentChangeInterval = Strong Current template: 15s, else null
```

**Step 9: Timer**

```
BaseTime = 180 - 120 × NormalizedDifficulty(D)
Variance = prng.nextFloat() × VARIANCE_RANGE - VARIANCE_RANGE/2
FinalTimer = max(MIN_TIMER, BaseTime + Variance) × TemplateMultiplier
```

**Step 10: Physics Modifiers**

```
ModifierChance = min(0.6, NormalizedDifficulty(D) × 0.8)
IF prng.nextFloat() < ModifierChance:
  modifier = prng.nextChoice(MODIFIER_POOL)
  apply modifier to physics config
```

**Step 11: Environment Modifiers**

Weather variant is applied to the active zone visuals (rain, fog, golden hour, etc.). No gameplay effect. See Environment System chapter.

**Step 12: Challenge Intelligence Metadata**

After generation but before validation, the challenge's predicted metadata is computed. See Procedural Validation chapter.


---

## Procedural Validation and Challenge Intelligence

### Why the v1 Approach Was Insufficient

The v1 document described solvability validation as: run a heuristic solver, if it fails retry. This is necessary but not sufficient for a game targeting top charts. The problems:

1. A challenge can be technically solvable but frustratingly tedious (10-minute solve time for a challenge the player has 60 seconds for)
2. A challenge can be solvable but mechanically boring (same template mechanic five times in a row)
3. A challenge can be fair by formula but feel unfair (three simultaneous moving pegs all at minimum frequency creates confusion)
4. There is no data to feed back into the balancing system after launch

The solution is a complete Challenge Intelligence layer that computes rich metadata for every challenge before it is released to players.

### Challenge Quality Score

Every generated challenge receives a Quality Score before being accepted. Challenges with a score below the threshold are regenerated (seed offset +1).

**Quality Score Components:**

```
QualityScore = w1 × SolvabilityScore
             + w2 × FunScore
             + w3 × FairnessScore
             + w4 × VarietyScore
             + w5 × PacingScore

Weights: w1=0.30, w2=0.25, w3=0.20, w4=0.15, w5=0.10
Minimum passing QualityScore: 0.65
```

**SolvabilityScore (0.0–1.0):**

Measures how "solvable" the challenge is, not just whether it passes the binary solvable/not check. Computed by running the heuristic solver 3 times with different strategies and observing:
- Did all 3 strategies succeed? Score: 1.0
- Did 2/3 succeed? Score: 0.7
- Did 1/3 succeed? Score: 0.4
- 0/3 succeed: immediately rejected (binary failure)

**FunScore (0.0–1.0):**

Measures predicted player enjoyment based on heuristic features:
- Expected solve time vs available timer ratio (ideal: 60–80% of timer used)
- Number of distinct movements required (too few = trivial; too many = tedious)
- Whether any "aha moment" exists (a ring that requires a non-obvious path)
- Ring count diversity (mix of sizes is more interesting than all the same)

```
FunScore = 0.3 × TimerUtilizationScore    // Predicted time / available time → ideal 0.65
         + 0.3 × MovementDiversityScore   // Variety of required inputs
         + 0.2 × AhaMomentScore           // Whether any non-obvious path exists
         + 0.2 × SizeVarietyScore         // Ring size diversity
```

**FairnessScore (0.0–1.0):**

Measures whether the challenge feels fair to the player:
- All pegs reachable from initial ring positions
- No ring requires passing through another ring's occupied peg zone
- Minimum expected solve time ≥ 15 seconds (not instantly trivial)
- No single ring requires more than 40% of the total available time

**VarietyScore (0.0–1.0):**

Measures how different this challenge is from the previous 5 challenges in the same session. Requires challenge history context (passed to the generator for session-aware generation):
- Same template as last challenge: penalty -0.2
- Same template as 2 challenges ago: penalty -0.1
- Same physics modifier as last challenge: penalty -0.1
- Same ring count as last 3 challenges: penalty -0.1

**PacingScore (0.0–1.0):**

Measures whether the challenge fits naturally in the difficulty curve:
- D(N) is within ±3 points of expected for challenge N
- Ring count is appropriate for difficulty level
- No template combination that causes known player frustration

### Challenge Metadata

Every accepted challenge carries rich metadata used by analytics, live balancing, and adaptive difficulty:

```typescript
interface ChallengeIntelligence {
  challengeNumber: number
  seed: number
  qualityScore: number

  // Predicted metrics (from heuristic solver)
  predictedSolveTime: number        // seconds, median of 3 solver runs
  predictedCompletionRate: number   // 0.0–1.0, based on difficulty model
  predictedRetryCount: number       // Expected number of player retries
  predictedFrustrationScore: number // 0.0–1.0 (higher = more frustrating)
  predictedFunScore: number         // 0.0–1.0
  minPossibleSolveTime: number      // Theoretical minimum (fastest humanly possible)

  // Structural metrics
  ringCount: number
  decoyRingCount: number
  pegCount: number
  obstacleCount: number
  requiredInputCount: number        // Estimated number of button interactions
  mechanicalFocus: MechanicalFocus  // 'precision' | 'timing' | 'navigation' | 'patience'
  templateId: string
  secondaryTemplateId: string | null
  physicsModifiers: string[]

  // Actual metrics (populated post-launch from real player data)
  actualMedianSolveTime: number | null
  actualCompletionRate: number | null
  actualRetryCount: number | null
  actualFrustrationRate: number | null   // % of players who quit without completing
  actualContinueRate: number | null
  playerRatingAverage: number | null     // 1–5 stars, from optional post-challenge rating
}
```

### Automatic Rejection Rules

Beyond the quality score threshold, certain conditions cause automatic rejection regardless of score:

| Rejection Rule | Condition |
|---------------|-----------|
| Impossible | 0/3 solver strategies succeed |
| Too trivial | PredictedSolveTime < 8 seconds |
| Physically uninteresting | RequiredInputCount < 5 |
| Pegs unreachable | Any peg inaccessible from initial ring positions |
| Timer mismatch | PredictedSolveTime > AvailableTimer × 1.5 |
| Forbidden combination | Template combination in forbidden list |
| Variety failure | VarietyScore < 0.3 after 3 retries |
| Quality below threshold | QualityScore < 0.65 after 5 retries |

### Machine Balancing Loop

After launch, actual player data flows back to inform challenge quality:

```
Daily Cloud Function: ChallengeIntelligenceUpdater
- Reads aggregate analytics for each challenge number played that day
- Computes: actualCompletionRate, actualMedianSolveTime, actualRetryCount, actualFrustrationRate
- Writes to ChallengeIntelligence document in Firestore
- Compares predicted vs actual for each metric
- If |predicted - actual| > threshold for ≥ 100 plays:
    FlagForBalancingReview(challengeNumber, predicted, actual)
```

The flagged challenges are reviewed weekly. Persistent divergence between predicted and actual metrics indicates the difficulty model needs calibration. Remote Config parameters are adjusted accordingly.

### Challenge Frustration Detection

A challenge is flagged as "frustrating" in real-time if a player:
- Fails the same challenge ≥ 3 times within 30 minutes
- Abandons mid-challenge 2+ times in a row on the same challenge number
- Uses the maximum number of continues and still loses

When frustration is detected, the Adaptive Difficulty Assistance system activates (see next chapter).


---

## Difficulty System

### Design Philosophy

Three simultaneous constraints:
1. **Deterministic** — D(N) is always the same for a given N
2. **Gradual** — No spikes that break immersion
3. **Infinite** — Meaningful up to challenge 100,000+

### Difficulty Score Formula

```
Phase 1 (N ≤ 1000):
D(N) = D_MAX_PHASE1 × log(1 + N) / log(1 + PHASE1_CAP)

Phase 2 (N > 1000):
D(N) = D_MAX_PHASE1 + (D_CEILING - D_MAX_PHASE1) × (1 - e^(-(N-1000) / SCALE_FACTOR))

Constants:
D_MAX_PHASE1 = 50.0
D_CEILING = 100.0
PHASE1_CAP = 1000
SCALE_FACTOR = 5000
```

**Reference values:**

| Challenge | D(N) | Timer | Required Rings | Total Rings |
|-----------|------|-------|---------------|-------------|
| 1 | 0.07 | 180s | 1 | 1 |
| 10 | 1.7 | 178s | 1 | 1 |
| 50 | 9.0 | 169s | 2 | 2 |
| 100 | 13.7 | 163s | 2 | 3 |
| 250 | 22.0 | 153s | 3 | 4 |
| 500 | 31.0 | 143s | 3 | 5 |
| 1000 | 50.0 | 120s | 4 | 7 |
| 2000 | 61.0 | 107s | 5 | 8 |
| 5000 | 73.2 | 92s | 5 | 9 |
| 10000 | 84.1 | 80s | 6 | 10 |

### Normalized Difficulty

```
ND(N) = D(N) / D_CEILING   // [0.0, 1.0]
```

All component formulas use ND(N).

### Component Formulas

**Timer:**
```
TimerBase(D) = 180 - 120 × ND
Minimum: 45 seconds
```

**Ring Count:**
```
RequiredRings = clamp(1 + floor(ND × 5), 1, 6)
DecoyRings = clamp(floor(ND × 4), 0, 4)
```

**Peg Size:**
```
PegBaseRadius = PEG_MAX_RADIUS × (1 - 0.5 × ND)
Minimum: PEG_MIN_RADIUS (always physically landable)
```

**Peg Spacing:**
```
MinPegSeparation = MAX_SEP × (1 - 0.4 × ND)
```

**Obstacle Count:**
```
ObstacleCount = floor(ND × MAX_OBSTACLES)
First obstacle: D > 10
MAX_OBSTACLES = 6
```

**Physics Modifier Probability:**
```
ModifierChance = min(0.6, ND × 0.8)
First modifier: D > 15
```

**Current Strength:**
```
MaxCurrentStrength = BASE_CURRENT × (1 + 2 × ND)
```

**Reward Multiplier:**
```
RewardMultiplier = 1.0 + 3.0 × ND
```

**Template Selection Weights by difficulty:**

| Template | D < 10 | D 10-30 | D 30-60 | D 60+ |
|----------|--------|---------|---------|-------|
| Classic | 80% | 35% | 20% | 12% |
| Precision | 0% | 15% | 12% | 8% |
| Moving Pegs | 0% | 8% | 10% | 9% |
| Strong Current | 0% | 10% | 8% | 7% |
| Heavy Rings | 0% | 10% | 8% | 6% |
| Maze | 0% | 0% | 8% | 7% |
| (others) | 20% | 22% | 34% | 51% |

---

## Adaptive Difficulty Assistance

### Core Principle

The challenge generation is fully deterministic. Challenge #527 is always identical for every player. However, the **experience** of playing challenge #527 is invisible adapted for each player through the Assistance Layer.

The Assistance Layer never modifies the challenge layout, the physics constants, or the timer. It only modifies how the game communicates with the player: which hints appear, how the water responds to input at the margins, and whether certain "near-miss" visual treatments are activated.

This preserves leaderboard fairness: two players completing challenge #527 face identical physics. The assistance only changes player guidance, not outcomes.

### Player Behavior Monitor

The `PlayerBehaviorMonitor` tracks the following signals during every session:

```typescript
interface PlayerBehaviorState {
  challengeNumber: number
  attemptNumber: number              // How many times this challenge has been tried
  consecutiveFailures: number        // Fails in a row on this specific challenge
  quitMidChallenge: number          // Times player quit before timer expired
  nearMissCount: number             // Times all but 1 ring was placed when timer expired
  bestRingsPlaced: number           // Best progress made across all attempts
  averageButtonInputRate: number    // Inputs per second (low = confused or frustrated)
  sessionFrustrationScore: number   // Computed from above signals
  successTooEasy: boolean           // Challenge solved with > 80% timer remaining
  lastSessionOutcome: 'win' | 'loss' | 'quit' | 'continue_win'
}
```

### Assistance Triggers and Responses

**Trigger 1: Repeated Failure (consecutiveFailures ≥ 2)**

Response: Activate "Proximity Glow" — target pegs glow more visibly (stronger ring-on-peg proximity indicator, visible from 150px instead of 80px). This helps confused players understand where to aim.

Implementation: `glowProximityRange` is an in-memory parameter on the ring renderer, not stored in the challenge config. It does not affect physics.

**Trigger 2: Near Miss (all but 1 ring placed, timer expired)**

Response: On the next attempt of the same challenge, the timer is extended by 15 seconds invisibly (the display still shows the same timer — the extension is silent). The challenge seed, layout, and physics are unchanged.

This is the single most impactful retention intervention in mobile gaming. The player was 1 ring away. Giving them a silent 15 seconds frequently converts a loss into a win without any intrusive intervention.

The silent extension is only applied once per player per challenge and is not reflected in leaderboard scores (it is logged as a "near-miss assist" event in analytics, allowing the team to measure its impact on retention).

**Trigger 3: Rage Pattern (3+ quits within 5 minutes on same challenge)**

Response: Offer an "Auto-skip" — a gentle modal: "Stuck on this one? Skip to the next challenge and come back later." This is non-intrusive. The player is shown it once. If they decline, it is not shown again on this challenge.

The skip does not mark the challenge as completed. The player can return and complete it for full rewards.

**Trigger 4: Confusion (low button input rate < 0.3 inputs/sec for > 10 seconds)**

Response: Activate a subtle animated arrow on the screen, pointing at the ring that is furthest from its target peg. The arrow pulses gently once every 3 seconds. It disappears after 10 seconds or after any input.

**Trigger 5: Success Too Easy (first-attempt win with > 80% timer remaining, 3+ times in a row)**

Response: On next challenge, difficulty is computed using D(N+5) instead of D(N) — effectively jumping 5 challenges ahead in difficulty. The challenge number displayed does not change; only the difficulty parameters shift.

This prevents boredom among skilled players who are progressing through the tutorial zone too slowly for their skill level.

The jump is capped at +10 challenges maximum and resets to normal after any failed challenge.

**Trigger 6: Extended Absence from Specific Challenge (came back after 24+ hours)**

Response: Reduce visual noise. Decoy ring glows are faded by 30%. Target peg glows are brightened by 30%. The player needs spatial re-orientation after time away.

### What Assistance Never Does

- Never modifies physics constants (gravity, mass, force magnitudes)
- Never modifies timer duration (except the single near-miss +15s which is invisible)
- Never modifies peg or ring positions
- Never locks a player out of a challenge
- Never shows a different layout to different players
- Never communicates to the player that assistance is active (to preserve player self-efficacy)

### Fairness Architecture

For leaderboard submissions, the analytics event includes `assistanceFlagsActive: string[]` listing which assistance layers were active during the session. The leaderboard validation cloud function:
- Does not reject scores where assistance was active (assistance never affects physics outcomes)
- Does record which scores were completed with near-miss extension (as metadata, not a score penalty)

The near-miss extension is the only assistance that touches timing. A score achieved with near-miss extension is marked `nearMissAssisted: true` in the leaderboard document. Players with this flag are still eligible for all rewards. The flag is not displayed publicly. It is used only for internal analytics to measure the system's effectiveness.


---

## Challenge Templates

Templates define the core mechanic twist of each challenge. 24 templates are defined in v1. The generator selects one primary template and may combine with one secondary at D > 60.

### Template Registry

#### T01: Classic
Fixed pegs, standard rings, default water. The foundational template. Weight: 80% at D<20, declining to 12% at D>60. No special mechanics.

#### T02: Precision
Pegs reduced to 60% base radius. Settle angle tolerance ±8° (vs ±15° standard). Teaches controlled, slow approach. Minimum challenge 15.

#### T03: Moving Pegs
Pegs oscillate: `Position(t) = Base + Amplitude × sin(2π × Freq × t + Phase)`. Freq: 0.2–0.8 Hz. Amplitude: 50–200px. Multiple pegs may be in or out of phase. Minimum challenge 40.

#### T04: Limited Presses
Button budget: `MaxPresses = 20 + floor(50 × (1 - ND))`. Tap = 1 press. Hold = 1 press per 300ms. Running out freezes water. Counter visible in HUD. Minimum challenge 30.

#### T05: Strong Current
Background current × 4.0 from base. Direction shown as visual water ripple. Direction may change every 15 seconds at D > 60. Minimum challenge 25.

#### T06: Tiny Pegs
Pegs at 25% of base radius. Very precise placement. Cannot combine with Moving Pegs or Invisible Water. Minimum challenge 100.

#### T07: Heavy Rings
Ring masses × 2.0 (× 2.5 at high difficulty). Slower response to water. Settling threshold reduced. Minimum challenge 20.

#### T08: Low Gravity
Gravity × 0.35. Rings float freely. Small impulses carry rings far. Stable window increases to 1200ms. Minimum challenge 50.

#### T09: High Gravity
Gravity × 2.0. Rings sink fast. Players must sustain upward current. Minimum challenge 60.

#### T10: Rotating Obstacles
Paddles rotate at 0.5–2.0 RPM. Paddle length 30–60% arena width. Player must time movement between sweeps. Minimum challenge 70.

#### T11: Wind
`WindForce(t) = MaxWind × sin(2π × WindFreq × t)`. Freq: 0.1–0.3 Hz. Visualized with particle streaks. Minimum challenge 55.

#### T12: Maze
Static obstacle maze (Recursive Backtracking, seeded). Minimum path width: 2× max ring diameter. All peg zones reachable. Minimum challenge 90.

#### T13: Boss Challenge
Every 50 challenges. Combines 2 templates. Dark visual treatment. 5× rewards. Timer × 0.7. 1 max continue at 3× cost. 3 attempts before difficulty reduces. Minimum challenge 50.

#### T14: Color Restriction
2–3 rings share color with wrong pegs. Player must use size as differentiator. Correct peg has subtle shape highlight. Minimum challenge 45.

#### T15: Conveyor Belt
Persistent horizontal drag near the arena floor. Direction reverses every 20 seconds at D > 60. Minimum challenge 35.

#### T16: Frozen Zones
Crystalline zone overlays. Rings in zones: very low friction, no buoyancy. Must navigate around zones. Minimum challenge 80.

#### T17: Multiplier Rush
Bonus multiplier starts 3.0×, decays 0.05×/second, floor 1.0×. Encourages fast play. No mechanical twist. Suitable any difficulty.

#### T18: Mirror Mode
Both buttons create symmetrical dual currents (left button → right + mirrored left simultaneously). Ring chaos increases. Minimum challenge 110.

#### T19: Chain Reaction
Ring pairs tethered by translucent strands. Moving one pulls the other. Tether breaks at 3× ring mass tension. Minimum challenge 130.

#### T20: Invisible Water
Water layer hidden. Players infer movement from ring motion. Haptics + audio still active. Minimum challenge 150.

#### T21: Pressure Zones
Pegs require minimum arrival velocity. Velocity indicator on peg. Player must build momentum. Minimum challenge 120.

#### T22: Daily Challenge
Seed from daily seed formula. Extended timer × 1.2. Global leaderboard. Continues add 60s time penalty to score. Unique daily badge reward.

#### T23: Weekly Boss
Monday release. Single attempt per week. 5× rewards. Top 100 get extra rewards. No retry on failure.

#### T24: Seasonal
Holiday-themed physics quirks + visual. Halloween: ghost rings + wind. Winter: low gravity + frozen zones. Spring: extra buoyancy + wind. Summer: high current.

### Template Combination Rules

Secondary templates are selected at D > 60. Forbidden combinations:

| Primary | Forbidden Secondaries |
|---------|----------------------|
| Tiny Pegs | Moving Pegs, Invisible Water, Pressure Zones |
| Boss | Boss, Daily, Weekly |
| Maze | Chain Reaction, Mirror Mode |
| Invisible Water | Color Restriction, Chain Reaction |
| Limited Presses | Multiplier Rush |
| Low Gravity + High Gravity | Each other |

All other combinations permitted, subject to QualityScore ≥ 0.65.

---

## Timer System

### Timer Architecture

Server-synchronized countdown. Client tracks delta using `performance.now()` (monotonic, unaffected by device clock changes). Authoritative time is computed from:

```
TimeRemaining = (StartServerTimestamp + TotalAllottedTime) - Now
LocalDelta = performance.now() - lastFrameTime
DisplayTime = ServerSnapshot - AccumulatedLocalDelta
```

On reconnect, the server snapshot is refreshed. Maximum drift: 500ms.

### Timer Expiry Flow

```
Timer → 0 → Pause physics → Show Continue modal (10s auto-dismiss)
          → Watch Ad (1st continue only, max 3 ads/session) → +BonusTime → Resume
          → Spend Coins → Deduct → +BonusTime → Resume
          → Decline / can't afford → Defeat Screen
```

### Continue Bonus Time

```
BonusTime(D) = max(30, 60 × (1 - 0.5 × ND))
```

Never exceeds original challenge timer.

### Continue Pricing

```
Cost(D, n) = BASE_COST × (1 + ND) × 1.5^(n-1)
BASE_COST = 100
```

Examples at medium difficulty (D=25):
- 1st: 125 coins
- 2nd: 188 coins
- 3rd: 281 coins

### Maximum Continues

```
MaxContinues = clamp(3 - floor(ND × 2), 1, 3)
```

Boss: always 1. Daily/Weekly: allowed but each adds 60s leaderboard penalty.

### Anti-Abuse Rules

- Timer persisted to MMKV every second; synced to Firestore at start/continue/end
- Monotonic clock delta prevents device clock manipulation
- Cloud Function validates: time added matches expected BonusTime formula
- Offline timer uses accumulated local delta, corrected on reconnect

### Free Continue Allowance

All players: 1 free continue per day (no coins, no ad). Resets midnight UTC. Purpose: removes friction for first continue experience.


---

## New Player Experience and Onboarding

### Design Philosophy

The first 20 challenges are the single most important 20 challenges in the entire game. If a player leaves before challenge 20, they will never become a retained user. Every tutorial challenge serves a specific learning objective. The game must teach through doing, never through walls of text.

Core principles:
- **Show, never tell** — no text walls, no mandatory tutorial screens
- **Teach one thing at a time** — each challenge introduces exactly one new concept
- **Celebrate every win** — first win must feel enormous regardless of how easy the challenge was
- **Fail gracefully** — if a player fails in the tutorial, the game gently tries again with subtle assistance
- **No friction on first session** — skip sign-in, skip notifications, skip everything that interrupts play

### Pre-Challenge 1: First Launch

**Splash → Logo → Home → immediate "Play" transition**

The player should be in the physics arena within 7 seconds of launching the app for the first time. No onboarding modal. No permission requests. No login screen. Just the game.

Account creation is prompted after challenge 10 (see challenge 10 notes below).

### Challenge 1: The First Touch

**Learning objective:** Left button pushes rings right. Right button pushes rings left.

**Setup:**
- 1 ring (large size, bright blue)
- 1 peg (large, very wide acceptance zone — 3× normal diameter)
- Peg positioned directly left-center of arena
- Ring starts at center-right
- No timer visible (timer exists but not shown — removes pressure)
- No HUD chrome except the two buttons

**Camera:** Zoomed in slightly (90% of normal FOV) so ring and peg fill the view naturally. No dramatic zoom or pan.

**On launch:** The ring bobs gently in the water with natural buoyancy. A very faint animated arrow pulses once from the right button toward the ring, suggesting "press this." The arrow fades after 3 seconds and does not repeat.

**First button press:** The water visually surges from the right wall. The ring moves. A subtle screen-edge ripple effect runs. The haptic fires (light tap). No text annotation needed — the player immediately understands cause and effect.

**When ring approaches peg:** The peg begins to glow gently (amber). The ring-near-peg haptic fires (double light pulse). No text.

**When ring lands:** Full first-win celebration:
- Screen flashes white briefly (20ms)
- Ring settles with the signature "plonk" SFX + resonant tone
- Stars animate in (1 star — earned just for completing)
- Coins animate from arena to counter (small amount, very visually satisfying arc)
- Haptic: the full victory pattern fires
- Text appears for the first time: "Well done! 🌊" (no other text)
- "Next →" button appears

**If player fails (timer expiry) on Challenge 1:** Impossible by design. The timer is set to 300 seconds on challenge 1 and not shown. The peg acceptance zone is enormous. The Adaptive Assistance proximityglow is always active. The challenge is virtually impossible to fail.

### Challenge 2: Hold the Button

**Learning objective:** Holding creates a stronger, sustained current.

**Setup:**
- 1 ring (large, red)
- 1 peg (large, positioned further away — right side)
- Ring starts on far left

**Camera:** Normal FOV, centered.

**Guidance:** After 3 seconds of no input, a pulsing hold icon appears on the left button (an animated press-and-hold symbol). Fades after first hold input.

**Teaching moment:** A single tap won't carry the ring all the way across. The player discovers they need to hold. When they hold for > 400ms, the water swell visualization kicks in (Layer 2 water displacement). The current is visually stronger.

**Victory:** Same celebration as Challenge 1. Coin reward slightly higher (teaches that completion = coins).

### Challenge 3: Both Buttons — Upward Surge

**Learning objective:** Pressing both buttons simultaneously lifts rings.

**Setup:**
- 1 ring (medium, green)
- 1 peg positioned slightly above center
- Ring starts near the bottom of arena

**Guidance:** After 5 seconds of unsuccessful attempts to push the ring to the peg (the ring keeps going sideways), a gentle animated "both buttons" indicator appears — two thumbs pressing both buttons simultaneously, pulsing once. It disappears after first simultaneous input.

**Teaching moment:** Player discovers the upward surge mechanic. Ring floats upward strongly. First time the player experiences "both at once" as a tool.

### Challenge 4: Two Rings, Same Color

**Learning objective:** Multiple rings exist. Only one needs to go on the peg.

**Setup:**
- 2 rings (large, blue — identical)
- 1 peg (only one ring needed)
- Second ring is a decoy (lighter shade indicates it is not required — subtle visual differentiation)

**First introduction of HUD:** Challenge number "#4" appears for the first time. Progress indicator shows 1/1 rings to place.

**Teaching moment:** Player may accidentally put the wrong ring on the peg. That's fine — the correct ring still needs to go. This teaches the concept of "target rings vs decoys" without explicit explanation.

### Challenge 5: Two Rings, Two Pegs

**Learning objective:** Two required rings, each needs its own peg. Colors match peg color.

**Setup:**
- 2 rings (one blue, one red)
- 2 pegs (one blue, one red)
- Timer appears for first time (generous: 180 seconds)
- Wide peg spacing

**Teaching moment:** The color-matching rule is learned by doing. If the blue ring tries to land on the red peg, the rejected-thud SFX fires and the ring bounces off. The player understands: colors must match.

**First time timer is shown:** Timer appears but at full 180 seconds. A very brief text hint appears on first timer appearance: "Complete before time runs out" (disappears in 4 seconds, never shown again).

### Challenge 6: Rapid Tap Discovery

**Learning objective:** Rapid tapping creates chaos — sometimes useful.

**Setup:**
- 3 rings (small, floating in a cluster)
- 3 pegs (spread apart)
- Rings are deliberately positioned in an overlapping tangle

**Guidance:** None. Player discovers rapid tap organically when trying to untangle rings.

**Teaching moment:** Turbulence scatters the tangled rings. Player learns rapid tap as a problem-solving tool for clustered situations. No text, no arrow — discovery only.

### Challenge 7: First Precision Requirement

**Learning objective:** Some challenges require careful, slow approach.

**Setup:**
- 1 ring (small)
- 1 peg (medium — slightly smaller than before)
- Ring placed close to peg (very short travel needed)
- Wide timer

**Teaching moment:** Tapping sends ring past the peg. Holding sends it too fast. The player discovers that a brief light tap, followed by no input, lets the ring drift gently onto the peg. First experience of precision and patience.

### Challenge 8: Obstacle Introduction

**Learning objective:** Obstacles exist that rings bounce off.

**Setup:**
- 2 rings
- 2 pegs
- 1 static horizontal bar between rings and pegs
- Bar positioned so rings can navigate around it (not a dead block)

**Visual callout:** On first frame, the obstacle flashes briefly to draw attention (3 pulses of slight brightness increase). This signals "this is new."

**Teaching moment:** Player discovers that direct paths are blocked. They must route rings around the obstacle.

### Challenge 9: Current Introduction

**Learning objective:** Background currents drift rings even without button input.

**Setup:**
- 3 rings
- 3 pegs
- Light but noticeable background current flowing left-to-right
- Current visualized by water surface ripple lines (animated streaks)

**Teaching moment:** After completing the first ring, the player observes the remaining rings drifting right on their own. The player learns to anticipate and counter the current.

### Challenge 10: Sign-In Prompt (Contextual)

**Learning objective:** Same as challenge mechanics, but this challenge is also the account creation gate.

**Setup:** Standard 3-ring challenge.

**Account prompt trigger:** At the victory screen of challenge 10, after coins and stars are shown, a gentle prompt appears: "Save your progress! Your first 10 challenges are worth keeping." Two options: "Sign in with Google/Apple" and "Maybe later." The game is fully playable without signing in. The prompt is shown once more at challenge 20, then never again until the player manually triggers it from Settings.

**Why challenge 10?** The player has had 10 successful experiences. They have a sense of investment. The request to create an account is backed by real earned progress worth protecting. Research from games like Subway Surfers and Among Us shows conversion rates on account creation prompts are highest when players have a clear sense of "I'd lose something if I don't sign in."

### Challenge 11: Moving Pegs First Encounter

**Learning objective:** Pegs can move. Timing matters.

**Setup:**
- 2 rings
- 2 pegs — both oscillating slowly (0.3 Hz, 80px amplitude — very gentle)
- Wide timer
- First encounter with T03 template (but at very low frequency/amplitude)

**Visual treatment:** A subtle motion trail behind each peg on first frame. A tiny clock icon appears above the pegs for 3 seconds (signals "timing is involved"). Disappears. Never shown again.

**Teaching moment:** Player discovers they need to wait for the peg to come to them, not chase it.

### Challenge 12: Simultaneous Ring Management

**Learning objective:** Managing multiple rings at different stages simultaneously.

**Setup:**
- 4 rings (2 small, 2 medium)
- 4 pegs
- No obstacles, no special mechanics — just the challenge of managing complexity

**Teaching moment:** First time where the player might need to strategize which ring to place first (large pegs easier to land on first, freeing up space for small rings). No guidance — pure discovery.

### Challenge 13: Low Gravity Introduction

**Learning objective:** Physics can change. Rings behave differently.

**Setup:**
- 2 rings
- 2 pegs
- Low gravity (0.35× normal)
- Visual treatment: floating particles in background, slightly dreamy color shift

**Teaching moment:** Player's learned button-press habits overshoot dramatically. The ring floats up and stays up. They discover they need much lighter inputs. Teaches adaptability.

### Challenge 14: Limited Presses Introduction

**Learning objective:** Button presses are a resource.

**Setup:**
- 2 rings
- 2 pegs
- 30 press budget (very generous)
- Press counter prominent in HUD

**Teaching moment:** Player learns to think before pressing. Even with a generous budget, awareness of "I have a limited resource" changes behavior. Introduces strategic thinking.

### Challenge 15: Color Restriction Introduction

**Learning objective:** Color alone is not always sufficient identification — size matters too.

**Setup:**
- 3 rings (2 blue rings of different sizes, 1 red ring)
- 3 pegs (1 needs small blue, 1 needs large blue, 1 needs red)
- At first glance, 2 rings look the same color

**Teaching moment:** Player places the wrong blue ring on the wrong peg. The rejected thud fires. They inspect more carefully — the rings are different sizes. Size is the differentiator. Teaches attention to ring size as a meaningful game element.

### Challenge 16: Wind Introduction

**Learning objective:** External forces push rings independent of buttons.

**Setup:**
- 2 rings
- 2 pegs
- Slow cyclic wind (0.15 Hz — very predictable)
- Wind visualized by particle streaks blowing across the arena

**Teaching moment:** Player discovers rings drift in a pattern independent of their input. They learn to time their inputs around the wind cycle.

### Challenge 17: High Gravity Introduction

**Learning objective:** Gravity can work against the player.

**Setup:**
- 2 rings (light buoyancy)
- 2 pegs (middle height)
- High gravity (2.0×)
- Rings sink fast

**Teaching moment:** Rings that the player stops pushing immediately sink. They discover that sustained input is necessary to keep rings mobile. Introduces "don't let go" as a tactical consideration.

### Challenge 18: Maze Introduction

**Learning objective:** Obstacles can form routes, not just barriers.

**Setup:**
- 2 rings
- 2 pegs (one on each side of a central wall with gaps)
- Simple maze with two clear paths
- Both paths lead to valid pegs

**Teaching moment:** Player must navigate each ring through its appropriate path. The challenge is geometric — which ring goes through which gap.

### Challenge 19: Decoys at Higher Count

**Learning objective:** Not all rings need placement. Identify which ones matter.

**Setup:**
- 5 total rings (3 required, 2 decoys — clearly marked by a more muted appearance)
- 3 pegs
- Standard mechanics

**Teaching moment:** First time having significantly more rings than pegs. Player must manage the arena while ignoring irrelevant rings. Introduces "visual noise" as a challenge mechanic.

### Challenge 20: First Full Challenge

**Learning objective:** All mechanics learned. Player is ready for the real game.

**Setup:** A moderately complex challenge using all learned mechanics at low difficulty. Template: Classic with slight current. 3 rings, 3 pegs, 1 obstacle.

**End of tutorial marker:** Upon completing challenge 20, a brief celebratory moment: "You've got it! The real adventure begins." The tutorial flag is cleared. All templates unlock. Difficulty scaling begins.

**At this point the player receives:**
- "Flow State" title (earned through tutorial completion)
- 500 coins welcome bonus
- Access to the daily challenge
- First cosmetic gift: a Common ring skin

### Failure Handling in Tutorial

If a player fails any tutorial challenge (timer expiry — very rare given generous timers):
- Defeat screen says: "Almost! Want to try again?" (single CTA, no continue cost)
- Retry is free and unlimited in challenges 1–20
- On 2nd failure of same challenge, proximity glow assist activates
- On 3rd failure, the timer is silently extended by 60 seconds for the next attempt

The game must never let a new player feel punished in their first 20 challenges. Failure in tutorials should feel like a minor speed bump, not a wall.

### Tutorial Analytics

The following funnel is tracked for every new player:

```
App Launch → Challenge 1 Start → Challenge 1 Complete
→ Challenge 3 Complete → Challenge 5 Complete → Challenge 10 Complete
→ Challenge 20 Complete → Challenge 50 Complete
```

D1 retention target: 50% of players who complete challenge 1 return the next day.
Challenge 5 completion target: 85% of players who started challenge 1.
Challenge 10 completion target: 70% of players who started challenge 1.
Challenge 20 completion target: 55% of players who started challenge 1.

If any funnel step falls below target, the tutorial challenges at that step are flagged for re-evaluation.


---

## Meta Progression

### Why the v1 Progression Was Insufficient

The v1 document had: XP → levels (formula), stars (3 tiers), ranks (8 tiers), achievements (table), mastery (5 tiers per template). This is structurally correct but psychologically incomplete.

The missing elements:
- No Prestige system (what happens after level 100?)
- No unlock paths (features appearing over time as the player progresses)
- No visible long-term goal structure ("what am I working toward?")
- No reward psychology design (why do rewards feel rewarding?)
- No completionist hooks
- No 5-year progression arc

This chapter redesigns the full meta progression as an interconnected web of systems, each reinforcing the others.

### The Progression Web

```
Challenges Completed
       ↓
XP → Player Level → Prestige → Mastery Prestige Titles
       ↓                             ↓
Stars Earned → Star Milestones   Template Mastery
       ↓                             ↓
Ranks          Collections       Diamond Mastery Cosmetics
       ↓               ↓
Achievements   Collection Museum
       ↓
Badges & Titles
       ↓
Hall of Fame (top 1% of all time)
```

Every system feeds the next. Players always have multiple things they are "working toward" simultaneously, which is the fundamental retention mechanism of great mobile games.

### Player Level and XP

**XP Sources (complete):**

| Source | XP Reward | Notes |
|--------|-----------|-------|
| Challenge completion | 100 × RewardMultiplier(D) | Scales with difficulty |
| First completion bonus | +200 XP | Once per challenge number |
| 3-star completion | +150 XP | Bonus for excellent play |
| No-continue completion | +100 XP | Bonus for clean play |
| Daily challenge | +500 XP | Once per day |
| Weekly challenge | +2000 XP | Once per week |
| Boss challenge | +800 XP | Every 50 challenges |
| Achievement unlock | 100–5000 XP | Per achievement |
| Login streak | 50 XP per day | Streak bonus |
| Friend challenge win | 100 XP | Per win |
| Seasonal event completion | +1000–5000 XP | Per event |

**Level Formula:**
```
XP_Required(level) = 500 × level^1.6
```

| Level | XP to Next | Cumulative |
|-------|-----------|------------|
| 1→2 | 500 | 500 |
| 5→6 | 1,900 | 6,400 |
| 10→11 | 5,800 | 25,000 |
| 25→26 | 24,400 | 220,000 |
| 50→51 | 74,000 | 1.2M |
| 100→101 | 236,000 | 5.4M |

At 5 challenges per day (casual player), XP earned per day ≈ 800 XP. Reaching level 50 takes approximately 1,500 / 800 ≈ 1,875 days ≈ 5 years of casual play. The progression genuinely lasts.

### Prestige System

At level 100, the player earns Prestige 1. The level resets to 1. XP requirements remain the same. A Prestige icon appears next to the player's name (a stylized wave badge numbered by prestige level).

At each Prestige level, the player permanently unlocks:
- A unique Prestige cosmetic (ring tint, frame border)
- The title "[Prestige N] Diver" (e.g., "Prestige 3 Diver")
- A permanent 5% XP bonus (stacking, capped at 50% bonus at Prestige 10)

Prestige 10 is the effective "endgame" of the prestige system. A Prestige 10 player is a multi-year veteran. Their profile shows a special golden wave badge. They are on the Hall of Fame.

**Prestige cosmetics:**

| Prestige | Frame | Ring Tint | Title |
|---------|-------|-----------|-------|
| 1 | Silver wave border | Silver shimmer | "Wave Rider" |
| 2 | Gold wave border | Gold shimmer | "Tide Master" |
| 3 | Platinum border | Platinum pulse | "Current Sage" |
| 5 | Diamond border | Rainbow shift | "Maelstrom" |
| 10 | Legendary animated border | Deep blue void | "Leviathan" |

### Feature Unlock Progression

New features unlock as the player advances. This serves two purposes: it prevents new players from being overwhelmed, and it gives mid-players something to look forward to.

| Unlock | Requirement | Feature |
|--------|-------------|---------|
| Daily Challenge | Challenge 5 complete | Access to daily challenge |
| Leaderboard | Challenge 10 complete | Can view and submit to leaderboards |
| Social Challenges | Challenge 15 complete | Can challenge friends |
| Ghost Runs | Challenge 20 complete + sign in | Can record and watch ghosts |
| Weekly Boss | Level 5 | Access to weekly boss challenge |
| Rotating Shop | Level 3 | Shop rotations visible |
| Seasonal Events | Challenge 20 complete | Can participate in events |
| Boss Streak Tracking | First Boss completed | Boss streak system activates |
| Collection Museum | Level 10 + 5 collections started | Museum view unlocked |
| Replay Viewer | Challenge 25 complete | Can view full challenge replays |
| Challenge Intelligence | Level 15 | Players can see predicted metadata for upcoming challenges |

This staggered unlock creates a series of "wow, something new" moments spread across the first few weeks of play. Each unlock is celebrated with a brief animation and notification.

### Stars System

Stars are earned per challenge:
- 1 star: Any completion
- 2 stars: Timer > 30% remaining at win
- 3 stars: Timer > 60% remaining AND no continues

Re-playing a challenge can improve star rating. Best rating is stored.

**Star Milestone Rewards (expanded):**

| Stars Total | Reward |
|-------------|--------|
| 10 | Intro ring skin (Pearlescent) |
| 25 | 200 coins |
| 50 | Marble ring skin + 500 coins |
| 100 | Bronze Star Frame |
| 200 | Beach Theme + 1000 coins |
| 350 | Silver Star Frame |
| 500 | 2000 coins + Title "Star Chaser" |
| 750 | Gold Star Frame |
| 1000 | Galaxy ring skin + 3000 coins |
| 1500 | Platinum Star Frame + Prestige 1 XP boost |
| 2500 | Legendary cosmetic + Title "Star Master" |
| 5000 | Diamond Star Frame + Hall of Fame nomination |

### Rank System

Eight ranks based on challenge number and stars:

| Rank | Requirement | Badge Color |
|------|-------------|------------|
| Ripple | Challenges 1–49 | Light blue |
| Current | Challenges 50–149 | Cyan |
| Wave | Challenges 150–299 | Teal |
| Tide | Challenges 300–499 | Ocean blue |
| Surge | Challenges 500–799 | Deep blue |
| Tempest | Challenges 800–1199 | Indigo |
| Maelstrom | Challenges 1200–1999 | Dark purple |
| Leviathan | Challenges 2000+ | Black with animated wave |

Rank is visible on leaderboards, profile card, and friend list. It serves as an instant signal of a player's experience level.

### Achievement System

**Four categories, 60+ achievements in v1:**

**Core Achievements (gameplay mastery):**

| ID | Title | Requirement | Reward |
|----|-------|-------------|--------|
| C01 | First Drop | Complete challenge 1 | 100 coins |
| C02 | Flow State | Complete tutorial (challenge 20) | 500 coins + Title |
| C03 | No Help | Complete 50 challenges without continues | 1000 coins |
| C04 | Speed Run | Complete any challenge in < 20 seconds | Title "Lightning" |
| C05 | Patience | Complete challenge without pressing any button for 5+ seconds | 200 coins |
| C06 | Perfect 10 | 3-star 10 challenges in a row | 800 coins |
| C07 | Boss First Blood | Complete first Boss challenge | 500 coins |
| C08 | Boss Streak 3 | 3 consecutive Boss completions | 1500 coins |
| C09 | Boss Legend | 10 consecutive Boss completions | Legendary cosmetic |
| C10 | Untouchable | 3-star 100 total challenges | Legendary cosmetic + Title |

**Mastery Achievements (template expertise):**

One achievement per template: Bronze, Silver, Gold tiers.
- Bronze: Complete 10 challenges of this template
- Silver: Complete 50 challenges, with 20 being 3-star
- Gold: Complete 100 challenges, with 50 being 3-star + top 10% leaderboard on a daily

Gold mastery in any template unlocks that template's Diamond cosmetic.

**Social Achievements:**

| ID | Title | Requirement | Reward |
|----|-------|-------------|--------|
| S01 | Social Splash | Add first friend | 100 coins |
| S02 | Challenge Issued | Send first friend challenge | 100 coins |
| S03 | Top 100 | Reach global top 100 on any leaderboard | Title "Elite" + Profile Banner |
| S04 | Daily Devotee | Complete daily challenge 30 days in a row | Epic cosmetic |
| S05 | World Champion | #1 on daily challenge leaderboard | Legendary cosmetic + Title "Champion" |

**Collection Achievements:**

Complete specific cosmetic collections (see Collection System chapter).

### Mastery System

Every challenge template has a separate mastery track. Mastery XP earned per challenge:

```
MasteryXP(template, D) = BASE_MASTERY × NormalizedDifficulty(D)
BASE_MASTERY = 50
```

Mastery tiers per template:

| Tier | Challenges Required | Reward |
|------|---------------------|--------|
| Bronze | 10 | Bronze badge for template |
| Silver | 50 | Silver badge + cosmetic accent |
| Gold | 100 | Gold badge + 500 coins |
| Platinum | 250 | Platinum badge + exclusive particle effect |
| Diamond | 500 | Diamond badge + template's unique Legendary cosmetic |

Diamond mastery is a genuine multi-year achievement for dedicated players. The cosmetics awarded are exclusive — only 500-challenge masters can ever own them.

**Total Mastery Prestige:** Players who achieve Diamond in all 24 templates earn the "Grand Master" title and the rarest cosmetic in the game: the Grand Tide Ring — an animated ring with a color-shifting water effect.

### Boss Streak System

Every 50 challenges is a Boss. Completing Bosses consecutively:

| Streak | Reward |
|--------|--------|
| 1 | Standard Boss reward (5× base) |
| 3 | +1000 coins + Title "Boss Slayer" |
| 5 | +2500 coins + Epic cosmetic |
| 7 | +5000 coins + Title "Boss Crusher" |
| 10 | Legendary cosmetic + Hall of Fame entry |
| 20 | Grand cosmetic + Title "Warlord" (exclusive) |

Streak resets on any Boss failure. Each week, players can retry their most recent failed Boss once.

### Long-Term Goals and Completionist Hooks

**The "Complete" player goal (5+ years):**
- All 1000+ achievements unlocked
- All collections completed
- Diamond mastery in all 24 templates
- Prestige 10
- Grand Master title
- Level 100 (multiple times for prestige players)

**Visible progress toward completionist status:** The Profile screen shows a "Completion Score" — a percentage of all available content completed. This gives perfectionist players a single number to chase.

### Retention Loops (Psychological Architecture)

**Short loop (daily):** Login → daily challenge → daily missions → coins → spend on something
**Medium loop (weekly):** Weekly boss → weekly missions → larger rewards → cosmetic progress
**Long loop (monthly):** Seasonal event → limited cosmetics → collection progress → prestige XP
**Infinite loop:** New challenges forever → mastery XP → approaching Diamond in each template

Each loop has a clear reward and a clear next step. No loop ends in a dead state. There is always something to do tomorrow.


---

## Player Psychology

### Design Framework

This game sits in a unique psychological space: it must be **genuinely relaxing** while simultaneously maintaining **engagement and motivation**. The tension between relaxation and motivation is the central design challenge. Get it wrong in either direction and the game fails: too relaxing = boring; too motivating through pressure = stressful.

The framework draws from Self-Determination Theory (Deci & Ryan), Flow Theory (Csikszentmihalyi), and behavioral psychology principles documented in successful mobile games.

### Flow State Architecture

Flow state requires: **challenge approximately equal to skill, clear goals, immediate feedback, sense of control.**

The difficulty curve is designed explicitly for flow:
- The logarithmic growth rate matches the average human skill acquisition curve
- Players stay in their flow zone (challenge ≈ skill) for longer periods than with linear difficulty
- Immediate feedback is built into physics (the ring responds to every input instantly)
- Sense of control is maximized by the deterministic physics (the same input always produces the same result given the same state)

**Anti-flow conditions to avoid:**

| Anti-flow Condition | Our Prevention |
|--------------------|----------------|
| Unclear goals | Target pegs glow, ring-peg color matching is obvious |
| Unresponsive feedback | Physics is 60fps, haptics are immediate, SFX fire on every interaction |
| Feeling out of control | No RNG in physics — only in challenge layout (which is fixed per challenge) |
| Interruptions | No mandatory ads mid-session, no aggressive notifications |
| Boredom (too easy) | Adaptive difficulty detects easy wins, jumps forward |
| Anxiety (too hard) | Adaptive assistance activates on repeated failures |

### Reward Anticipation

The dopamine cycle is: **anticipate → act → receive reward → anticipate next reward.**

In this game:
- **Anticipation hook:** Before starting a challenge, the player sees the challenge number and the difficulty indicator. There is a moment of "can I do this?" anticipation.
- **Act phase:** The physics experience. This phase must be intrinsically motivating (see Intrinsic Motivation below).
- **Reward delivery:** Stars animate one by one (not all at once). Coins arc across the screen. XP bar fills with a satisfying shimmer. Each element is timed to maximize the reward experience. The total victory screen takes ~4 seconds to complete — that is the minimum satisfying reward delivery time.
- **Next anticipation hook:** Victory screen shows "Next Challenge: #N+1 — Medium Difficulty 🌊" — immediately setting up the next anticipation cycle.

### Near Miss Psychology

Near misses (placing 3 of 4 rings, timer runs out) are powerful motivators. The defeat screen uses this intentionally:

- Show exactly how close they were ("3 of 4 rings placed")
- Use encouraging language ("So close!")
- Show the challenge code (implicitly: "I can try this exact challenge again")
- The first CTA is Continue, not Try Again — exploiting the near-miss motivation

The Adaptive Difficulty near-miss assist (silent +15s) converts a significant percentage of near-misses into wins, which converts a potential quit event into a satisfying completion event. This is the highest-value retention mechanism in the game.

### Small Wins

Small wins are achievements, coins, XP, and milestone rewards that trigger frequently in the early game and keep triggering throughout. The progression system is designed so that **something always happens every session**:

- Every challenge completion: coins, XP, possibly a star
- Every 10 challenges: likely a milestone reward
- Every login: streak reward
- Every session: progress toward at least 3 different tracks (daily missions, mastery, collections)

This is deliberate. The game should never feel like a session where "nothing happened."

### Daily Return Reasons

There must always be at least 3 compelling reasons to open the game tomorrow:

1. Daily challenge (refreshes every day — the challenge is literally different)
2. Login streak reward (direct loss aversion — breaking the streak feels bad)
3. Active daily missions (specific tasks that reset daily)

These three alone guarantee a daily return trigger. Additional triggers:
4. Rotating shop (changes every 48 hours — FOMO for wanted items)
5. Friend challenges received (social obligation loop)
6. Seasonal event progress (time-limited)

### Completion Psychology

Humans have a strong drive to complete things (Zeigarnik effect — incomplete tasks are remembered better than complete ones). The game exploits this through:

- **Collection sets:** Each cosmetic is part of a set. Owning 3 of 5 items in a set creates a "completion pull" toward the remaining 2.
- **Achievement progress bars:** All achievements show progress bars. Seeing "47/50 challenges without continues" is more compelling than just the achievement existing.
- **Star improvement:** Knowing that challenge 37 has 1 star and could be 3 stars is an open loop. Players return to improve ratings.
- **Mastery tiers:** Each template shows mastery progress bar. The incomplete status is visible at all times.

### Mastery and Skill Expression

The most intrinsically motivated players are those who feel genuinely skilled. The game provides visible skill expression through:

- **Speed runs:** Completing a challenge with 90%+ timer remaining is visually celebrated (different star graphic). Players can compete on time.
- **No-continue streaks:** Tracked and rewarded explicitly. The "No Help Needed" achievement line is a prestige marker.
- **Ghost comparison:** Watching their own ghost and improving their route creates genuine mastery satisfaction.
- **Leaderboard rank:** Seeing yourself ranked 4,732 globally on a specific daily challenge tells a specific story about your skill.

### Intrinsic vs Extrinsic Motivation

The game is designed so intrinsic motivation (pleasure from the physics, pride in skill, curiosity about new templates) is always stronger than extrinsic motivation (coins, rewards, metrics).

**Intrinsic motivators:**
- The physics feel — pressing the button and feeling the ring respond is intrinsically satisfying
- The "plonk" of a ring landing on a peg — one of the most satisfying sounds in the game
- Visual beauty — the water renderer makes every session beautiful to look at
- Problem solving — finding the optimal route for 5 rings across an arena
- Mastery growth — feeling measurably better at the game over weeks

**Extrinsic motivators (supporting, not dominant):**
- Coins (enable cosmetics)
- Achievements (celebrate milestones)
- Leaderboard rank (social comparison)
- Streak rewards (behavioral reinforcement)

**Why the balance matters:** Games that are primarily extrinsically motivated (grind for coins, spend coins for progress) become unfun when the extrinsic reward is removed or when the player has "enough." Games that are primarily intrinsically motivated (the physics feel) retain players indefinitely because the core experience remains satisfying regardless of rewards.

### What We Deliberately Avoid

| Dark Pattern | Why We Avoid It |
|-------------|-----------------|
| Pay-to-win mechanics | Destroys intrinsic motivation; alienates ethical players |
| Energy/lives system | Creates frustration instead of relaxation |
| Mandatory ad viewing | Disrupts flow state; damages trust |
| Predatory loot boxes | Regulatorily risky; ethically wrong |
| Aggressive countdown timers on offers | Creates anxiety; violates relaxing feel |
| Misleading almost-win animations | Exploits gambling psychology; unethical |
| Shame on defeat | Damages player self-efficacy |
| Artificial scarcity on non-limited items | Destroys trust |

The philosophy is: **earn trust through honest design, and players will spend willingly.** Players who never feel manipulated are far more likely to become long-term supporters.


---

## Economy System

### Currency Philosophy

Single soft currency: **Coins**. No premium currency. Reasons: transparent pricing builds trust, no regulatory scrutiny for obfuscated pricing, aligns with the relaxing/non-aggressive brand identity.

Revenue sources:
1. Coin packs (direct purchase)
2. Direct cosmetic purchases (coins or real money)
3. Remove Ads subscription ($2.99/month, $19.99/year)
4. Rewarded ads (free continues / bonus coins)

### Coin Earning (Complete)

| Source | Amount | Frequency |
|--------|--------|-----------|
| Challenge completion | 50 × RewardMultiplier(D) | Per challenge |
| First completion bonus | +100 | Once per challenge number |
| 3-star completion | +40 | Per 3-star |
| No-continue bonus | +30 | Per clean run |
| Daily challenge | 500 | Once per day |
| Weekly challenge | 2000 | Once per week |
| Boss challenge | 5× standard | Every 50 challenges |
| Login streak (Day 1–7) | 25–500 | Per day |
| Login streak (Day 14) | 1000 | Milestone |
| Login streak (Day 30) | 2000 | Milestone |
| Achievement unlock | 50–2000 | Per achievement |
| Level-up | 200 × PlayerLevel | Per level |
| Rewarded ad | 100 | Max 5/day |
| Friend challenge win | 75 | Per win |
| Seasonal events | Variable | Per event |
| Welcome back (3+ days) | 200–1000 | On return |

### Coin Sinks (Complete)

| Sink | Cost Range | Notes |
|------|-----------|-------|
| Continue (1st) | 100–200 | Scales with difficulty |
| Continue (2nd) | 150–300 | 1.5× escalation |
| Continue (3rd) | 225–450 | 1.5× escalation |
| Ring skin (Common) | 500 | Shop |
| Ring skin (Rare) | 1000 | Shop / Achievement |
| Ring skin (Epic) | 1500 | Events |
| Ring skin (Legendary) | 2000 | Boss / Limited |
| Background theme | 1000–3000 | Shop |
| Water color palette | 400–1500 | Shop |
| Button skin | 300–1000 | Shop |
| Particle effect | 500–2000 | Shop |
| Victory animation | 700–1200 | Shop |
| Profile frame | 200–800 | Shop |
| Profile banner | 500–2000 | Shop |
| Hint (5s path guidance) | 150 | Per use |
| Collection completion shortcut | 500–1500 | Speeds collection via coin exchange |

### IAP Pricing

| Pack | Coins | Price (USD) | Coins/$ |
|------|-------|------------|---------|
| Starter | 500 | $0.99 | 505 |
| Small | 1,200 | $1.99 | 603 |
| Medium | 3,000 | $4.99 | 601 |
| Large | 6,500 | $9.99 | 651 |
| Mega | 14,000 | $19.99 | 700 |
| Whale | 35,000 | $49.99 | 700 |

Value per dollar intentionally increases with pack size. This is industry standard and expected by players.

### Remove Ads Subscription

$2.99/month or $19.99/year:
- Removes all interstitial ads
- Continue modals show 1 free daily continue instead of ad option
- +50% coin bonus on all challenge completions
- Monthly exclusive cosmetic (Common tier)

### Free Continue Daily Allowance

1 free continue per player per day. Resets midnight UTC. Removes friction for the continue system.

---

## Economy Simulation

### Virtual Player Archetypes

To validate the economy, we simulate 7 virtual player archetypes over 1 month, 6 months, 1 year, and 3 years.

**Archetype Definitions:**

| Archetype | Challenges/Day | IAP Likelihood | Continue Usage | Ad Watching |
|-----------|---------------|----------------|----------------|-------------|
| Casual | 2–3 | Very low | Rare | Occasional |
| Daily | 5–8 | Low | Moderate | Regular |
| Hardcore | 15–25 | Medium | Frequent | Regular |
| Whale | 10–20 | High (>$20/mo) | Frequent | Never |
| Collector | 5–10 | Medium (cosmetics) | Rare | Occasional |
| Completionist | 10–15 | Low | Rare | Regular |
| Speedrunner | 20–30 | Low | Never | Never |

### Simulation: Casual Player

**Assumptions:** 2–3 challenges/day, no IAP, watches 1–2 rewarded ads/day, occasional continues (1/week).

**Monthly projection:**
```
Challenges: 75 avg challenges
Average D: 15 (challenge 75 area)
RewardMultiplier: ~1.45

Daily earn:
  Challenges: 2.5 × 50 × 1.45 = 181 coins
  Daily challenge: 500 (if attempted 3/week = 500×3/7 = 214 daily avg)
  Login: 75 avg (streak day variable)
  Ads: 1.5 × 100 = 150
  Total daily: ~620 coins

Monthly earn: 620 × 30 = 18,600 coins

Monthly spend:
  Continues: ~4 × 125 avg = 500 coins
  Cosmetics: ~1 per month × 750 avg = 750 coins
  Total spend: ~1,250 coins

Net monthly: +17,350 coins
12-month balance: ~200,000 coins
```

**Assessment:** Casual players accumulate large balances. This is acceptable because their balance gives them the feeling of wealth and security, and they will spend on cosmetics over time as collections progress. The cosmetics catalog must expand regularly to provide ongoing sinks.

### Simulation: Daily Player

**Assumptions:** 6 challenges/day, no IAP, watches 2 rewarded ads/day, 1 continue every 2 days.

```
Monthly earn:
  Challenges: 180 × 50 × 1.6 avg = 14,400
  Daily: 500 × 30 = 15,000
  Login: 100 avg × 30 = 3,000
  Ads: 2 × 100 × 30 = 6,000
  Level-ups: ~3 level-ups × 200 × 5 = 3,000
  Total: ~41,400 coins/month

Monthly spend:
  Continues: 15 × 150 avg = 2,250
  Cosmetics: 2 per month × 1000 avg = 2,000
  Total: ~4,250 coins/month

Net monthly: +37,150 coins
12-month balance: ~430,000 coins
```

**Assessment:** Daily players accumulate significant balances. At this rate, they can afford all cosmetics without ever purchasing. This is the intended design — daily players should feel like VIPs without paying. Their value is in retention (ad revenue) and social proof (active friends on leaderboard).

**Inflation risk:** At 6-month balance of ~215,000 coins with all cosmetics costing max 35,000 coins total (catalog), a daily player can own everything without purchasing. This is acceptable if the catalog expands. Target: new cosmetics worth 10,000+ coins per month through updates and events.

### Simulation: Whale Player

**Assumptions:** 15 challenges/day, $50+/month IAP, continues frequently.

```
Monthly IAP: $50 → 35,000 coins
Monthly earn (gameplay): ~85,000 coins
Total monthly intake: ~120,000 coins

Monthly spend:
  Continues: 30 × 200 avg = 6,000
  Cosmetics: all available + rotating shop = ~20,000
  Total: ~26,000 coins/month

Net monthly: +94,000 coins
```

**Assessment:** Whales accumulate very large balances. By month 6 they own all cosmetics. This is a problem. Solution: **Limited edition cosmetics and bundles** targeting whales specifically:
- Monthly "Collector's Edition" bundle: 3 exclusive cosmetics + 1000 coins, $9.99 direct purchase (not coin purchasable)
- Season Pass (v2): provides unique prestige cosmetics

Whale monetization in v1 is primarily: coin packs + cosmetic FOMO (limited edition items). The catalog must include items that appeal to whales who "have everything."

### Simulation: Collector Player

**Assumptions:** 7 challenges/day, IAP $5–$10/month specifically for cosmetics, actively pursues collections.

This archetype is the economy's most important segment for long-term coin sink health. They have large coin balances AND will spend real money when a specific desired cosmetic is available.

Design recommendation: The rotating shop should always include at least 2 items that are "collection completers" — the missing piece from popular partial collections. A collector who has 4/5 Zen Garden items will pay real money to complete the set if the 5th item appears in rotation.

### Economy Health Over Time

| Period | Main Risk | Mitigation |
|--------|-----------|-----------|
| Month 1 | Too few sinks | 60+ achievements, 15+ collections drive early spending |
| Month 6 | Casual inflation | New cosmetic catalog update required (min 20 new items) |
| Year 1 | Whale boredom | Season Pass launch, limited monthly bundles |
| Year 3 | Long-term inflation | Prestige cosmetics, Collection Museum completion rewards |

### Economy Health Metrics to Monitor

```
Monitored weekly via Cloud Functions analytics:
- P50 coin balance (median player)
- P90 coin balance (near-whale player)
- Daily coin sink:earn ratio (target: > 0.3 → players spending 30%+ of daily earn)
- IAP conversion rate (target: > 5% of active players ever)
- Rewarded ad fill rate
- Continue purchase rate
- Days since last coin spend for P50 player (if > 14 days: add new sink)
```

If P50 coin balance exceeds 100,000 and daily sink:earn ratio falls below 0.15, this indicates economy inflation. Corrective actions (in order of severity):
1. Add new cosmetics to shop
2. Introduce a limited-time coin sink event ("The Great Auction")
3. Adjust daily earn amounts via Remote Config (-10% on challenge base earn)
4. Introduce new high-value cosmetic tier above Legendary


---

## Cosmetics System

### Design Principles

Every cosmetic is purely aesthetic. No cosmetic changes physics, timing, or outcomes. This is enforced in code: cosmetics only modify visual asset references, never physics configuration values.

### Cosmetic Categories

**Ring Skins** — Replace ring appearance. Physics properties unchanged.

| Tier | Examples | Coin Cost | Source |
|------|----------|-----------|--------|
| Common | Marble, Woodgrain, Metallic | 500 | Shop |
| Rare | Neon Glow, Holographic, Crystal | 1000 | Shop / Achievement |
| Epic | Lava Flow, Galaxy Swirl, Arctic | 1500 | Events |
| Legendary | Koi Fish, Zodiac, Dragon Scale | 2000 | Boss / Limited |

**Water Colors** — Replace water fill and affects matching particle color.

| Palette | Cost |
|---------|------|
| Classic (default) | Free |
| Tropical | 400 |
| Sunset | 600 |
| Deep Ocean | 800 |
| Aurora | 1200 |
| Inkwell | 1500 |

**Background Themes** — Replace arena background and ambient decorations.

| Theme | Style | Cost |
|-------|-------|------|
| Classic | Transparent toy | Default |
| Beach | Sandy shores | 1000 |
| Space | Nebulae, stars | 1500 |
| Zen Garden | Minimalist | 1000 |
| Underwater | Coral reef | 2000 |
| Seasonal themes | Holiday-specific | Seasonal only |

**Button Skins** (300–600 coins), **Particle Effects** (400–1200 coins), **Victory Animations** (700–1200 coins), **Profile Frames** (200–800 coins), **Profile Banners** (500–2000 coins), **Titles** (Achievement-earned only).

All owned cosmetics are permanent. Seasonal cosmetics are purchasable only during their event window but persist permanently once owned.

---

## Collection System

### Philosophy

Collections are the long-term engagement engine of the cosmetics system. Instead of presenting a flat catalog of items, cosmetics are organized into thematic sets. Owning part of a set creates a powerful completion pull. Completing a set unlocks bonus rewards not available elsewhere.

Every cosmetic belongs to exactly one collection. Every collection has a defined completion bonus.

### Collection Structure

Each collection contains 3–6 items. Items span categories (rings + water + particles, or theme + button + frame, etc.). This cross-category design means players must engage with multiple cosmetic categories to complete any collection.

**Collection Registry (v1 — 20 collections):**

| Collection | Items (Category) | Completion Bonus |
|-----------|-----------------|-----------------|
| Ocean Depths | Underwater bg + Tropical water + Bubble particles + Ocean frame | 3000 coins + "Ocean Master" title |
| Neon Rave | Neon ring + Electric particles + Tech button + Neon frame | 2000 coins + exclusive Neon title |
| Zen Space | Zen Garden bg + Deep Ocean water + Minimal button | 1500 coins + Zen profile banner |
| Galactic | Space bg + Galaxy ring + Aurora water + Star particles | 4000 coins + "Cosmos" title + animated frame |
| Boss Collection | Boss Trophy ring + Boss bg + Boss victory anim | 5000 coins + "Destroyer" title (Boss rewards only) |
| Autumn Harvest | Halloween bg + Ghost ring + Wind particles + Jack-o'-lantern frame | 2500 coins + "Witch" title (seasonal) |
| Arctic Expedition | Winter bg + Snowflake particles + Crystal ring + Festive button | 2500 coins + "Frost" title (seasonal) |
| Beach Day | Beach bg + Turquoise water + Sun burst particles + Sand frame | 2000 coins |
| Retro Player | Retro Arcade bg + 8-bit button + Retro ring skin | 1500 coins + "Retro" title |
| Master of Precision | Precision Diamond cosmetic + Silver mastery frame + Title | Mastery-earned only |
| Rush Hour | Multiplier Rush skin set | Earned through Multiplier Rush challenges |
| Speed Set | Lightning ring + Speed particles + Timer frame | Speedrun achievements |
| Grand Tide | All 5 water colors | 2000 coins + animated water color cycling unlock |
| Button Collector | All 5 button skins | 500 coins + custom button glow |
| Prestige I Set | Prestige 1 frame + ring tint + banner | Prestige 1 unlock reward |
| Prestige V Set | Prestige 5 frame + ring + banner + particle | Prestige 5 unlock reward |
| Prestige X Set | All Prestige 10 cosmetics | Prestige 10 only |
| Daily Hero | 30 daily challenge badges | 3000 coins + "Daily Hero" title |
| Diamond Mastery Set | Diamond cosmetics from 5 templates | 10000 coins + Grand Tide ring |
| Grand Master | All 24 Diamond template cosmetics | Grand Tide animated ring + "Grand Master" title |

### Collection Rarity Tiers

| Rarity | Completion Difficulty | Visual Treatment |
|--------|----------------------|-----------------|
| Common | All items buyable from shop | Bronze collection badge |
| Rare | Mix of shop + achievement items | Silver collection badge |
| Epic | Event items required | Gold collection badge |
| Legendary | Boss/Prestige items only | Animated collection badge |
| Mythic | Mastery milestones + challenge completions | Unique holographic badge |

### Collection Museum

Unlocked at Level 10 with 5+ collections started. A separate screen showing all collections as display cases:

- Completed collections show in full color with completion bonus displayed
- Partial collections show greyed items with cost/requirement for each missing piece
- "Next closest to complete" is highlighted at the top
- Players can tap any collection item to see "How to get this"

The Museum is a retention mechanism disguised as a feature. Seeing 14/15 items in a collection is more motivating than a raw item count. The Museum makes collection progress visible and persistent.

### Hidden Collections

Three hidden collections are not shown in the Museum until the player discovers their first item. These create surprise and delight for veterans:

1. **"The First Toy" Collection:** Awarded for completing challenge 1,000. Contains nostalgic items themed after the original toy.
2. **"Silent Perfectionist" Collection:** Awarded for achieving 3 stars on 500 challenges without ever using a hint. Not described anywhere in-game.
3. **"Daily Legend" Collection:** For completing every daily challenge in a 30-day calendar month.

Discovering a hidden collection triggers a special animation and a reveal modal.

### Seasonal Collections

Seasonal collections are available only during their event window. Items are purchasable with coins during the event. After the event, items cannot be purchased but existing owners keep them.

Each season (quarterly), a new seasonal collection is introduced. This creates four distinct collection targets per year and incentivizes engagement with seasonal events.

---

## Environment System

### Purpose

Challenges should not all feel identical. The environment system introduces visual variety across challenges without affecting gameplay. The physics arena is always the same; the world around and behind it varies.

### Environment Variants

Each challenge gets an environment variant from Step 11 of the generation pipeline. The variant is purely visual — weather effects, lighting conditions, and ambient decorations.

**Weather Variants:**

| Variant | Visual Effect | Ambient Sound | Gameplay Effect |
|---------|--------------|---------------|-----------------|
| Clear | Standard — no weather overlay | Standard ambient | None |
| Rain (light) | Rain droplet particles falling in background, occasional water surface ripples from raindrops | Rain patter | None |
| Rain (heavy) | Dense rain, fog overlay at arena edges, reduced background visibility | Heavy rain + thunder (distant) | None |
| Fog | Milky white overlay at 30% opacity at arena edges, reducing visibility of background elements | Low hum | None |
| Sunset | Warm amber tint on background, horizontal light shaft effects | None | None |
| Night | Dark background, bioluminescent ring glow effect, ambient moonlight reflection on water | Night crickets (faint) | None |
| Storm | Dark clouds in background, occasional lightning flash (1% chance per 10 seconds), high rain | Thunder, wind | None |
| Golden Hour | Intense amber/gold warmth, long shadows in background, sparkle highlights on water | None | None |
| Underwater (deep) | Blue-green tint, bubble streams from bottom, shifting light caustics | Deep water ambience | None |
| Snowfall | Light snowflakes in background (not in arena), frost border | Winter ambience | None |
| Overcast | Neutral grey tone, flat diffuse lighting | Wind (soft) | None |

**Lighting Conditions:**

| Condition | Water Shader Parameters |
|-----------|------------------------|
| Standard | Caustic brightness 1.0, specular 0.8 |
| Bright (noon) | Caustic brightness 1.4, specular 1.2 |
| Dim (evening) | Caustic brightness 0.6, specular 0.5 |
| Dark (night) | Caustic brightness 0.2, specular 0.3, bioluminescence active |
| Golden | Caustic hue shift toward amber, specular warm tint |

### Environment Selection Logic

```
BaseVariant = prng.nextChoice(weightedVariantPool)

WeightedVariantPool:
  Clear: 35%
  Rain (light): 12%
  Sunset: 10%
  Overcast: 8%
  Fog: 7%
  Night: 7%
  Golden Hour: 6%
  Rain (heavy): 4%
  Storm: 3%
  Snowfall: 4% (higher in winter months)
  Underwater: 4%
```

Seasonal overrides apply: Snowfall probability increases to 20% in December–January. Storm probability increases in autumn months.

### Performance

Environment effects are rendered entirely in the background layer (behind the arena border). They never overlap the gameplay area (rings, pegs, water surface, buttons). Performance cost:
- Clear/Overcast: 0ms additional
- Light effects (sunset, golden, night): < 0.2ms additional
- Rain particles: < 0.5ms (capped particle count)
- Storm with lightning: < 0.8ms

On low-end devices, environment variants default to Clear/Overcast only (the visual quality fallback). Players can override in Settings → Graphics Quality.

---

## Social Features

### Leaderboard Architecture

All leaderboard writes are Cloud Function only. Client calls function; function validates, then writes.

**Score Formula:**
```
Score(D, time, continues) = floor(1000 × RewardMultiplier(D))
                            × (1 + timeRemaining / totalTime)
                            × (0.8 ^ continuesUsed)
```

**Leaderboard Categories:**

| Leaderboard | Scope | Reset | Notes |
|-------------|-------|-------|-------|
| Daily Challenge | Global / Country / Friends | Daily midnight UTC | |
| Weekly Challenge | Global / Country / Friends | Monday midnight UTC | |
| All-Time Total Score | Global / Country / Friends | Never | Sum of all challenge scores |
| Total Stars | Global / Country / Friends | Never | |
| Total Challenges | Global / Country / Friends | Never | |
| Seasonal Ranking | Global | Per season (3 months) | |

**Fairness validation (Cloud Function):**
1. Re-derive challenge seed, verify layout hash matches submitted layout hash
2. Check completion time ≥ minimum possible solve time for that challenge
3. Check continue count matches claimed count
4. Flag submissions > 3σ from mean completion time for manual review
5. Rate limit: max 1 submission per challenge per player per 5 minutes

### Friends System

- Add via: username search, shareable deep link, social login contact import
- Max 200 friends
- Friend list shows: rank, online indicator (last seen), current challenge number

### Ghost Runs

After completing a challenge, player may upload a ghost. Ghosts record input events only (button press/release timestamps and types). Stored in Firebase Storage. Replayed by running deterministic physics with recorded inputs.

Ghost metadata includes: challenge number, completion time, continues used, quality rating (1–5 from viewer).

Players can watch a friend's ghost before attempting a challenge (see Replay System chapter for full details).

### Social Challenge Mode

1. Player completes challenge → taps "Challenge a Friend" → selects friend
2. Friend receives notification with player's score
3. Friend has 72 hours to respond
4. Completion scores compared; winner earns 75 coins, loser earns 25 consolation coins
5. Pending challenges shown on Home screen as a badge

### Country and World Rankings

Country determined at registration (changeable once per month). Top 100 world ranking receives monthly profile frame.

### Seasonal Ranking

Seasonal points = sum of all challenge scores during the season (3 months). Season end:

| Rank Range | Reward |
|------------|--------|
| Top 100 | Legendary cosmetic + exclusive title |
| Top 1000 | Epic cosmetic + 5000 coins |
| Top 10000 | Rare cosmetic + 2000 coins |
| All participants | Seasonal avatar frame |


---

## Replay System

### Design Goals

The replay system serves three purposes:
1. **Learning** — Watch top players to improve your own technique
2. **Social** — Share your best run with friends
3. **Analytics** — Internal tool for detecting physics anomalies and balancing outliers

### Replay Architecture

Replays are stored as compressed input event sequences, not frame-by-frame state. Because the game physics is deterministic, replaying the same input sequence from the same seed produces an identical outcome on any device. This makes replay storage extremely compact.

**Replay Record Structure:**

```typescript
interface ReplayRecord {
  replayId: string              // UUID
  challengeNumber: number
  seed: number
  generatorVersion: string      // Version of challenge generator used
  appVersion: string            // App version during recording
  userId: string
  completionTime: number        // ms
  stars: number
  continuesUsed: number

  // Input sequence — the complete recording
  inputEvents: InputEvent[]

  // Compression metadata
  originalSize: number          // bytes before compression
  compressedSize: number        // bytes after compression
  compressionAlgorithm: 'lz4' | 'zstd'

  // Social metadata
  isPublic: boolean
  uploadedAt: Timestamp
  viewCount: number
  qualityRating: number         // 1–5, averaged from viewer ratings
}

interface InputEvent {
  t: number                     // Relative timestamp in ms from challenge start
  type: 'L_DOWN' | 'L_UP' | 'R_DOWN' | 'R_UP'
}
```

Input events are stored as typed, timestamped records. A typical 90-second challenge with active play produces approximately 200–600 input events. At 4 bytes per event (2 for type, 2 for relative timestamp encoded as uint16 in ms), a typical replay is 800–2400 bytes before compression. After LZ4 compression, this is typically 400–1200 bytes.

Maximum replay size cap: 50KB (accommodates extremely long or input-heavy runs). Replays exceeding this after compression are truncated (the first portion of the challenge is saved; the completion event is appended).

### Replay Storage

- **Personal replays:** Stored in Firebase Storage at `/replays/{userId}/{challengeNumber}/{replayId}.lz4`
- **Public/ghost replays:** Copied to `/ghosts/{challengeNumber}/{replayId}.lz4` when a player marks their replay as public
- **Top replays per challenge:** Cloud Function runs daily and maintains `/top_replays/{challengeNumber}/` with the top 5 by score

Each player's best replay per challenge is kept. Previous bests are overwritten. Up to 100 total personal replays are stored per player. Older replays are pruned when the limit is exceeded.

### Replay Player

The Replay Viewer is a separate screen (`ReplayViewerScreen.tsx`) that re-renders the physics simulation in real time using recorded inputs.

**Playback controls:**

| Control | Action |
|---------|--------|
| Play/Pause | Toggle playback |
| Scrub bar | Seek to any timestamp (re-simulates from last checkpoint) |
| Speed selector | 0.25× / 0.5× / 1× / 2× / 4× |
| Step frame | Advance one physics tick (1/60s) while paused |
| Camera follow | Toggle auto-follow on selected ring |
| Reset | Return to beginning |

**Seek implementation:** To support seeking without re-simulating from the beginning, physics state checkpoints are saved at every 5-second mark during replay playback. Seeking to any point replays from the most recent checkpoint before the target time. This makes seek latency < 5 seconds of simulation, which at 4× speed equals < 1.25 seconds wall time.

**Annotations:** When viewing a ghost replay, the viewer can optionally overlay:
- Input visualization (button press indicators in the corner)
- Ring trajectories (path trails for each ring)
- Force vectors (small arrows showing water force direction on each ring)

Force vectors are toggleable because they add significant visual complexity.

### Fast Forward and Slow Motion

**Fast Forward (2×, 4×):** The physics engine's `timing.timeScale` is set to 2.0 or 4.0. The render loop runs at normal frame rate but each rendered frame advances physics by 2× or 4× the normal timestep. This is accurate (deterministic) and produces the same outcome as 1× playback.

**Slow Motion (0.25×, 0.5×):** `timing.timeScale` set to 0.25 or 0.5. Useful for analyzing precise ring landing moments.

**Frame Stepping:** Set `timing.timeScale = 0`, then manually call `Matter.Engine.update(engine, FIXED_TIMESTEP)` on each frame button press. Allows frame-by-frame analysis of critical moments.

### Ghost Mode During Challenge Play

When a challenge is loaded, the player can optionally load a ghost to run alongside them:
- Ghost rings are rendered at 40% opacity with a different tint (silver for friend ghosts, gold for top-ranked ghost)
- Ghost input events are replayed simultaneously with the player's live session
- Ghost never interferes with player's rings (ghost bodies are in a separate collision group — they are visual only)
- At the end, player's time vs ghost time is shown

Loading a ghost before play:
1. Player is on the challenge preview screen
2. Taps "Watch Ghost" → sees list of available ghosts (friend ghosts prioritized)
3. Selects a ghost → downloads if not cached
4. Ghost replays alongside live play session

Ghost data is downloaded and cached locally. Popular challenge ghosts (Daily Challenge, Weekly) are pre-cached automatically.

### Share Replay

Players can share a replay link from the Victory screen:
1. "Share my run" button → generates a deep link with replayId
2. Link opens the game to the Replay Viewer for that specific run
3. If recipient doesn't have the game, link redirects to App Store/Play Store

Share links are valid for 30 days. After 30 days the replay may be pruned from storage (unless the player has it in their personal saved replays).

### Social Replay Features

- **Best Run Gallery:** Each player profile shows their Top 5 public replays by score
- **Replay Rating:** Viewers can rate any public replay 1–5 stars. High-rated replays surface in "Featured Runs" on the leaderboard screen
- **Daily Challenge Replay Pack:** After the daily challenge closes, the top 10 replays are packaged and can be viewed by any player who attempted that day's challenge

### Replay Integrity

All replays are validated before being stored as public/ghost:
1. Cloud Function re-runs the replay simulation
2. Verifies the outcome matches the claimed completion (stars, time, rings placed)
3. Rejects replays that produce different outcomes (indicates input log tampering or version mismatch)

Version mismatch handling: If the replay was recorded on a different `generatorVersion` than the current version, it is flagged as "legacy replay" and cannot be run as a live ghost (the physics may differ). It can still be viewed as a recording.

---

## Live Operations

### Daily Missions

3 missions per day, refreshing midnight UTC. Pool scales with player level.

**Sample Mission Pool:**

| Mission | Requirement | Reward |
|---------|-------------|--------|
| Water Rider | Complete 3 challenges | 100 coins |
| Precision Drop | Land 5 rings on first attempt | 200 coins |
| No Rush | Complete a challenge with > 50% timer remaining | 150 coins |
| Speed Splash | Complete any challenge in < 45 seconds | 250 coins |
| Social Star | Share a challenge code with a friend | 100 coins |
| Curious Diver | Attempt a template you haven't tried before | 150 coins |
| Daily Devotee | Complete today's daily challenge | 300 coins |

All 3 missions complete: +200 coins + 100 XP bonus.

### Weekly Missions

5 missions/week, reset Monday midnight UTC.

| Mission | Requirement | Reward |
|---------|-------------|--------|
| Week Warrior | Complete 25 challenges | 500 coins |
| Template Explorer | Complete 5 different templates | 400 coins |
| Boss Tamer | Complete the weekly boss | 2000 coins |
| Social Butterfly | Challenge 3 friends | 300 coins |
| Star Collector | Earn 15 stars this week | 600 coins |

All 5 complete: 1000 coins + unique weekly badge.

### Monthly Events

Themed events 2–4 weeks long. Each event has:
- Unique visual theme applied globally
- 1.5× coin multiplier on all challenges
- Event-exclusive cosmetic earnable via event points
- 3–5 event-specific challenge types

Events scheduled 6 months ahead, communicated via in-game news banner.

### Holiday Events

| Holiday | Duration | Exclusive Items |
|---------|---------|-----------------|
| Halloween | Oct 15–Nov 1 | Ghost Ring, Haunted Background |
| Winter | Dec 1–Jan 5 | Snowflake particles, Festive button |
| New Year | Dec 30–Jan 3 | Fireworks victory animation |
| Valentine's | Feb 7–14 | Heart ring skin |
| Spring | Mar 20–Apr 5 | Bloom particles |
| Summer | Jun 20–Sep 1 | Beach theme (discounted), Sun burst particles |

### Login Rewards

| Streak Day | Reward |
|-----------|--------|
| 1 | 25 coins |
| 3 | 75 coins |
| 5 | 150 coins + Common cosmetic |
| 7 | 500 coins + Rare cosmetic |
| 14 | 1000 coins + Epic cosmetic |
| 30 | 2000 coins + Legendary cosmetic |
| 60+ | 300 coins/day sustained |

1 streak shield per week. Automatically consumed on first missed day.

### Retention Systems

**Push Notifications (opt-in, all individually toggleable):**

| Trigger | Message | Timing |
|---------|---------|--------|
| Daily challenge live | "Today's challenge is live 🌊" | 9:00 AM local |
| Streak about to break | "Don't lose your streak! 🔥" | 8:00 PM if not logged in |
| Friend challenge received | "[Name] challenged you!" | Immediate |
| Weekly boss live | "Weekly Boss is here!" | Monday 9:00 AM UTC |
| Event starts | "Halloween Event begins!" | Event start |

**Returning Player Bonus:**
- 3–6 days: 200 coins
- 7–13 days: 500 coins + daily challenge shortcut
- 14+ days: 1000 coins + free Common cosmetic picker

### Rotating Shop

Refreshes every 48 hours. 6 items at 15–30% discount. All players see same rotation (server-side seed). Creates daily shop-browsing habit.

At least 2 rotation slots are always items that complete a popular partial collection.

### Battle Pass (v2)

Deferred. Target: launch v2 Battle Pass at 6 months post-launch, 500K+ DAU. The Battle Pass design will be documented in a separate v2 specification.


---

## UI/UX Design

### Design Language

**Premium Toylike Clarity** — the visual identity should feel exactly like holding the real toy: transparent, tactile, satisfying, slightly nostalgic. Key principles:

- **Glassmorphism**: Semi-transparent elements, frosted glass modals
- **Fluid Motion**: All transitions mimic water — ease-in-out with slight overshoot (spring physics)
- **Minimal Chrome**: HUD is always subordinate to the physics arena
- **Color**: Soft blues and teals dominate; accent colors driven by active theme
- **Typography**: Nunito or equivalent — rounded, warm, readable

### Screen Specifications

**Splash Screen:** 1.5 seconds. Animated game logo (ring settling onto peg). Deep ocean blue gradient. Soft water + rising tone audio. Fade to Loading.

**Loading Screen:** Animated ring-orbits-peg loader. Random gameplay tip text. Min 500ms display. Slide-up to Home.

**Home Screen:**
```
[Top bar: Coin balance | Profile avatar | Settings gear]
[Water animated background — subtle ripple loop]
[Challenge number preview: #N  Difficulty●●●○  Template icon]
[PLAY button — large, centered, glowing on water background]
[Daily challenge shortcut — glows when daily is available]
[Friends activity ticker: "Alice completed #527 🌊"]
[Bottom nav: Home | Leaderboard | Store | Profile]
```

**Gameplay Screen:**
```
┌──────────────────────────────┐
│ #527 [template icon]   ⏱[arc]│  ← Minimal HUD
│ ★★☆  ●●●○(continues)         │
├──────────────────────────────┤
│                              │
│    [Water + rings + pegs]    │
│       physics arena          │
│                              │
├──────────────────────────────┤
│ [◀ LEFT]        [RIGHT ▶]    │
└──────────────────────────────┘
```

Timer: circular arc (not number bar) — depletes clockwise. Amber at 30%, red at 10% with pulse. Buttons: 88×88dp minimum. Depress 3dp on press, water ripple spawns. Each peg shows a faint target color ring.

**Pause Screen:** Frosted glass overlay over blurred arena. Resume / Restart (confirm) / Settings / Quit to Home. Shows current challenge progress and score preview.

**Victory Screen:**
- Victory animation plays (equipped cosmetic)
- Stars flip in one by one (250ms each)
- Coins arc from arena to counter
- XP bar fills with shimmer
- Breakdown: time bonus, no-continue bonus, difficulty multiplier
- Actions: Next Challenge | Replay (free) | Share | Leaderboard

**Defeat Screen:**
- Water drain animation
- "X of Y rings placed — so close!" (never "FAIL")
- Progress shown as partial ring icons
- Primary CTA: Continue (cost shown) / Watch Ad for free continue
- Secondary: Try Again | Quit

**Continue Screen:** Two options side-by-side (Watch Ad | Spend N Coins). Shows exact bonus time. 10-second countdown before auto-dismiss (to prevent accidental purchase on timeout). If max continues: only Try Again + Quit.

**Leaderboard Screen:** Tab bar: Global | Country | Friends. Time filter: Today | This Week | All Time. Player's rank always pinned at bottom. Ghost replay button next to top entries. Pull-to-refresh.

**Achievements Screen:** Grid of achievement cards with progress bars. Locked show silhouette + hint. Filter: All | Core | Mastery | Social | Collection. Unlock triggers inline celebration (bounce + particles).

**Inventory Screen:** Category tabs. Grid with equip toggle. Preview any item. "Get More" links to Store.

**Collection Museum:** Gallery of all collections. Completed = full color. Partial = greyed missing items with "how to get" on tap. "Closest to complete" highlighted first.

**Store Screen:** Tabs: Featured | Rings | Themes | Bundles | Coins. Rotating shop in Featured. Purchase: Tap → Preview → Confirm → Success animation. "OWNED" badge on owned items.

**Settings Screen:** Master / Music / SFX sliders. Haptics toggle + intensity. Notifications per-category. Account section. Privacy / Delete account (double confirm + 30-day grace). Accessibility (see Accessibility chapter). Language. About.

**Daily Challenge Screen:** Challenge details. Timer to next daily. Player's score if completed. Leaderboard link.

**Profile Screen:** Avatar + frame + banner + username + title. Stats row. Rank badge + progress bar to next rank. 3 pinned achievements. Recent activity feed. Completion score percentage.

**Statistics Screen:** Challenges per template (bar chart). Stars over time (line). Coins earned vs spent (area). Button usage (left/right ratio). Average completion time by challenge range. All charts animated (Reanimated-driven).

**Replay Viewer Screen:** Full physics simulation replay. Playback controls (play/pause/speed/scrub/frame-step). Ring trajectory trails (toggle). Input visualization. Force vector overlay (toggle).

### Animation and Transition Catalog

| Transition | Spec |
|-----------|------|
| Screen navigation | Shared element transition + directional slide (200ms) |
| Modal appear | Scale from 0.85 + fade, 300ms ease-out spring |
| Modal dismiss | Scale to 0.85 + fade, 200ms ease-in |
| Coin earn (small) | Coins arc to counter, 600ms, 20 coins max visualized |
| Coin earn (large) | Burst of coins from arena, 800ms with trail |
| Star flip | Scale-flip Y-axis 250ms each, 100ms gap between |
| Achievement unlock | Top banner slide-down, 400ms, auto-dismiss 3s |
| XP fill | Shimmer sweep across bar, 600ms |
| Button press | 3dp depress, 50ms release |
| Water ripple | Radial pulse from button position, 800ms |
| Ring land | Bounce: scale +10% then back, 400ms |
| Ring near peg | Peg glow pulse at 1.5 Hz |
| Victory zoom | Camera zoom-in on arena 400ms, then overlay 300ms |
| Rank up | Dramatic rank badge scale from 0 to 1.2 to 1.0, 600ms |

### Micro-Interactions

- Coin balance counter shakes gently when clicked with insufficient balance
- Timer pulses each second below 10 seconds
- Peg glows when correct ring is within 100px radius
- Buttons emit gentle light particles during hold
- Mission progress bar fills with water-pour animation
- Collection item glows briefly when added to the Museum

### Typography Hierarchy

| Use | Font Weight | Size |
|-----|------------|------|
| Challenge number | Bold | 24sp |
| HUD stats | Medium | 14sp |
| Button labels | SemiBold | 16sp |
| Body text | Regular | 14sp |
| Titles/headings | Bold | 20–28sp |
| Achievement titles | Bold | 16sp |
| Tooltips | Light | 12sp |

All text uses system Dynamic Type scaling (iOS) and sp units (Android) to honor user font preferences.

---

## Accessibility

### Commitment

The game must be fully accessible to players with:
- Color vision deficiencies (deuteranopia, protanopia, tritanopia)
- Motor impairments (one-handed play, limited dexterity)
- Hearing impairments
- Visual impairments (low vision, not full blindness)
- Motion sensitivity

All accessibility options are in Settings → Accessibility and also offered in the new player onboarding (shown once during challenge 5).

### Color Vision Support

**Color Blind Mode (Deuteranopia / Protanopia / Tritanopia):**

Rings use **shape patterns** in addition to color to identify their target peg:
- Red ring: triangle pattern on face
- Green ring: square pattern on face
- Blue ring: circle pattern on face (matching default)
- Yellow ring: diamond pattern on face
- Purple ring: star pattern on face
- Orange ring: cross pattern on face

Pegs also display the corresponding shape symbol.

Three color blind presets (deuteranopia, protanopia, tritanopia) shift the color palette to maximize contrast for each type. These use perceptually uniform color shifts validated against WCAG 2.1 contrast guidelines.

### One-Handed Mode

In one-handed mode, both buttons are repositioned to one side of the screen (left or right configurable). One button is placed at the natural thumb position; the other is reachable with a slight thumb stretch.

Alternatively, one-handed mode allows a tap on the left half of the screen to activate the left button, and a tap on the right half to activate the right button. This removes the need for precise button targeting.

### Left-Handed Mode

Mirrors the entire UI horizontally. Buttons, HUD elements, and navigation all swap sides. The physics is unchanged (water direction remains consistent with button label, not position).

### Large Button Mode

Buttons enlarge to 120×120dp. HUD elements scale up. Bottom safe area padding increases. All touch targets meet WCAG 2.5.5 (AAA) 44dp minimum.

### Sensitivity Sliders

**Water Force Sensitivity:** Slider 25%–200%. At 50%, button force is halved (helpful for players with tremor who trigger unintended holds). At 200%, buttons are more responsive (helpful for players with limited finger strength).

**Hold Detection Threshold:** Adjustable from 50ms to 400ms. Players with tremor may need a longer threshold to avoid accidental holds.

**Tap Detection Threshold:** Adjustable from 50ms to 250ms. Controls how long a press must be to count as a tap vs start of hold.

### Reduced Motion Mode

When enabled:
- All screen transitions become simple fade transitions (no slide, no scale)
- Physics animations play at 60fps but ring visual effects (trails, wakes) are disabled
- Particle systems are disabled
- Victory animation is replaced with a simple fade-glow effect
- Coin animation is replaced with a simple counter increment

The physics simulation itself cannot have reduced motion (it is the game), but all visual layers on top of it are deactivated.

### Reduced Particles Mode

Independent of Reduced Motion. Disables: bubble system, ring wakes, victory particles, button hold particles. Maintains: ripples, water surface, ring visuals. For players who find dense particle effects visually distracting.

### Low-End Graphics Mode

Equivalent to the lowest device tier preset: no shader on water body (gradient fill only), no wakes, minimal bubbles (max 8), minimal ripples (max 5). Explicitly selectable by any player, not just forced on low-end devices.

### High Contrast Mode

Increases contrast between arena background and all gameplay elements:
- Arena background darkens by 30%
- Ring outlines increase to 3px (from 1px)
- Peg visual size increases by 10% (visual only — physics unchanged)
- HUD text contrast ratio meets WCAG 2.1 AA (4.5:1 minimum)

### Hearing Accessibility

When SFX are muted:
- Ring-near-peg: peg increases glow brightness by 50% (compensates for lost audio cue)
- Ring landing on peg: a brief white flash on the ring (compensates for lost SFX)
- Timer warning: timer arc color change is more dramatic (compensates for lost heartbeat audio)
- Victory: full-screen ripple effect (compensates for lost victory sting)

No gameplay-critical information is conveyed through sound only. Every audio cue has a visual equivalent.

### Screen Reader Support (VoiceOver / TalkBack)

All interactive elements have `accessibilityLabel` and `accessibilityHint`:
- Left Button: "Left water button" / "Creates rightward water current. Tap or hold."
- Right Button: "Right water button" / "Creates leftward water current. Tap or hold."
- Coin counter: "Coins: [value]"
- Timer: "Time remaining: [seconds] seconds"
- Challenge number: "Challenge [number]"
- All shop items: "[Item name], [price] coins, [owned/not owned]"

The physics arena itself cannot be made fully accessible to screen reader users (it is a visual physics simulation). However, an "Audio Description Mode" is planned for v2 that narrates ring positions and proximity to pegs using text-to-speech.

### Motor Impairment Support

- Switch control compatible (both buttons can be mapped to accessibility switches on iOS)
- Android external switch/device support via AccessibilityService
- Configurable hold duration minimum (prevents accidental long holds for tremor users)
- No time-based UI interactions (modals do not auto-dismiss on a countdown that cannot be paused)

### Testing Requirements for Accessibility

Before each release:
- Manual VoiceOver testing on all screens
- Manual TalkBack testing on all screens
- Color blind simulator testing for all ring/peg color combinations
- One-handed mode functional test on both iOS and Android
- Large text scaling test at 200% system font scale
- Low-end graphics mode visual regression test


---

## Technical Architecture

### State Management

**Zustand** with slice-based organization. Chosen over Redux for: less boilerplate, native TypeScript, smaller bundle, simpler testing. MMKV replaces AsyncStorage for persistence (10–100× faster synchronous reads/writes).

**Store slices:**

| Slice | Owns |
|-------|------|
| playerSlice | Profile, XP, level, prestige, rank |
| economySlice | Coins, transactions, purchase state |
| challengeSlice | Active challenge state, timer, ring positions |
| settingsSlice | Audio, haptics, accessibility, language |
| cosmeticsSlice | Owned cosmetics, equipped cosmetics |
| socialSlice | Friends list, leaderboard cache, ghost cache |
| onboardingSlice | Tutorial state, feature unlock flags |
| progressionSlice | Stars, achievements, mastery, collections |

Each slice serializes independently to MMKV. Large slices (challengeSlice with physics state) use a separate MMKV key with higher write frequency (every 1 second during gameplay).

### Game Loop Architecture

Fixed timestep, decoupled from render frequency:

```
FIXED_TIMESTEP = 16.67ms (60 Hz)
MAX_FRAME_LAG = 5 frames

each animation frame:
  delta = clamp(now - lastTime, 0, MAX_FRAME_LAG × FIXED_TIMESTEP)
  accumulator += delta
  lastTime = now

  while accumulator >= FIXED_TIMESTEP:
    processInput()
    applyWaterForces()
    Matter.Engine.update(engine, FIXED_TIMESTEP)
    checkWinCondition()
    checkTimerExpiry()
    checkAdaptiveAssistance()
    persistStateIfCheckpoint()
    accumulator -= FIXED_TIMESTEP

  alpha = accumulator / FIXED_TIMESTEP
  render(interpolate(prevState, currentState, alpha))
```

The interpolation alpha allows the renderer to smooth positions between physics ticks, producing visually smooth motion at any display refresh rate (60, 90, 120 Hz).

The game loop runs inside a React Native Reanimated 3 Worklet — off the JS thread, on the UI thread, avoiding JS thread jank. Physics state is communicated to the React render tree via `useSharedValue` references.

### Rendering Architecture

**React Native Skia** for the game canvas. Chosen over SVG (too slow at 60fps), Canvas (poor RN performance), and OpenGL (unnecessary complexity for 2D).

Rendering pipeline per frame:
1. Read ring/peg positions from Reanimated shared values
2. Draw water body (shader + gradient)
3. Draw water displacement layer
4. Draw ring wakes
5. Draw bubbles
6. Draw rings (with skin, shadow, highlight)
7. Draw pegs (with glow if ring nearby)
8. Draw obstacles
9. Draw ripples
10. Draw particles (buttons, victory)
11. Draw HUD overlay (timer arc, progress)

Each layer is a Skia `Canvas` draw call group. Skia handles compositing on the GPU.

**Dirty flag optimization:** Only layers with state changes are redrawn. In a stable state (no input, rings settled), only the water surface layer animates — the ring and peg layers are cached and not redrawn until a ring position changes.

### Offline Support

The game is fully offline-capable during play. All challenge generation is local. Leaderboard and economy sync queue locally and flush on reconnect.

**Offline behavior:**

| Feature | Offline Behavior |
|---------|-----------------|
| Challenge play | Fully functional |
| Leaderboard | Cached data shown |
| Daily/Weekly challenge | Available; submitted on reconnect |
| IAP | Blocked (requires network) |
| Ghost download | Blocked |
| Sync | Queued; flushed on reconnect |

### Two-Tier Save System

**Tier 1: Local (MMKV)**
- Written every 1 second during gameplay (physics state checkpoint)
- Written immediately on: challenge start, challenge end, purchase, settings change
- Survives app kill, device reboot
- Source of truth for active session

**Tier 2: Cloud (Firestore)**
- Synced at: app start, challenge end, purchase, every 5 minutes during active play
- Source of truth for cross-device continuity

### Cloud Sync Conflict Resolution

```
On app start / reconnect:
  Fetch cloud document
  If cloud.schemaVersion > local.schemaVersion: migrate local
  For each field, apply merge rule:
    coinBalance: max(local, cloud)
    challengesCompleted: max(local, cloud)
    highestChallenge: max(local, cloud)
    cosmetics: union(local, cloud)
    stars per challenge: max(local, cloud)
    settings: cloud wins (intentional cross-device sync)
    achievements: union(local.unlocked, cloud.unlocked)
  Write merged state to MMKV
  Write merged state to Firestore
```

### Performance Optimization

| Area | Strategy |
|------|---------|
| Physics | Fixed 60fps; on slow devices drop to 30fps (timestep × 2) |
| Rendering | Skia GPU canvas; dirty-flag layer caching |
| JS thread | Game loop in Reanimated Worklet (UI thread) |
| Memory | Texture atlas for ring/peg skins; release on screen exit |
| Network | Firestore offline persistence + cache-first reads |
| Bundle | Lazy load game assets on GameScreen entry |
| Images | WebP, @1x/@2x/@3x resolutions |
| Fonts | Subset to required character set |
| Physics bodies | Maximum 20 active bodies (10 rings + 8 pegs + 6 obstacles + 4 walls) |

**Performance budgets:**

| Metric | Target | Hard Limit |
|--------|--------|-----------|
| Physics tick | < 4ms | < 8ms |
| Render frame | < 8ms | < 16ms |
| Total frame | < 13ms | < 16.67ms (60fps) |
| JS thread | < 2ms | < 5ms |
| Memory (game) | < 150MB | < 200MB |
| Cold start | < 3s | < 5s |
| Challenge generation | < 80ms | < 150ms |

### Anti-Cheat Architecture

The client is treated as untrusted for all economy and leaderboard operations.

1. **Score validation**: Cloud Function re-generates challenge from seed, verifies layout hash. Checks completion time ≥ theoretical minimum.
2. **Input log verification**: Submitted input event log is replayed server-side. Outcome verified.
3. **Coin transaction signing**: All coin-granting events include HMAC-SHA256 signature (key = PBKDF2(userId + appSecret)).
4. **Leaderboard injection prevention**: Leaderboard writes via Cloud Function only. Direct Firestore writes blocked by security rules.
5. **Rate limiting**: Max 1 score submission per challenge per player per 5 minutes.
6. **Anomaly detection**: Submissions > 3σ from mean time flagged for manual review.

### Remote Config Parameters

All economy, difficulty, and feature flag parameters are tunable via Firebase Remote Config without an app update:

| Parameter | Default | Purpose |
|-----------|---------|---------|
| difficulty_scale_factor | 5000 | Phase 2 curve steepness |
| base_continue_cost | 100 | Continue pricing base |
| daily_coin_reward | 500 | Daily challenge reward |
| boss_reward_multiplier | 5.0 | Boss rewards scale |
| ad_cooldown_minutes | 15 | Ad fatigue window |
| prng_salt_global | [secret] | Challenge seed salt |
| prng_salt_daily | [secret] | Daily seed salt |
| near_miss_bonus_seconds | 15 | Silent near-miss extension |
| event_windows | [] | Active event definitions |
| feature_ghost_runs | true | Enable/disable ghosts |
| feature_social_challenges | true | Enable/disable social challenges |
| water_shader_enabled | true | Enable/disable water shader |
| max_active_bubbles | 40 | Bubble system cap |
| max_active_ripples | 20 | Ripple system cap |

Config fetched at app start, cached 1 hour. Always falls back to hardcoded defaults on fetch failure. Config activation only between sessions (never mid-challenge).


---

## React Native Engineering Standards

### Purpose

These standards exist to ensure the codebase remains maintainable, testable, and performant at scale. A game targeting 50 million downloads will be maintained by multiple engineers over multiple years. Without explicit standards, entropy accumulates fast. These rules are enforced via ESLint, code review checklist, and CI gates.

### Architecture Principles

**1. Feature-First Folder Organization**

All code is organized by feature, not by type. This means `src/features/game/` contains everything related to the game feature (components, hooks, services, types), not scattered across `src/components/`, `src/services/`, `src/types/`.

```
WRONG:
  src/components/RingRenderer.tsx
  src/services/PhysicsWorld.ts
  src/types/ring.ts

RIGHT:
  src/features/game/rendering/RingRenderer.tsx
  src/features/game/physics/PhysicsWorld.ts
  src/features/game/types/ring.ts
```

Exception: Truly shared utilities (math helpers, date utils) live in `src/utils/`. Truly shared types (base types used across 3+ features) live in `src/types/`.

**2. No Business Logic in UI Components**

UI components are dumb renderers. They receive data as props and emit events via callbacks. They never call services, never mutate store, never contain conditionals that determine game rules.

```
WRONG (in a React component):
  if (ring.velocity < SETTLE_THRESHOLD && peg.colorId === ring.colorId) {
    setRingSettled(ring.id)
  }

RIGHT: This belongs in WinCondition.ts, called from the game loop.
  The component only renders: <Ring position={ring.position} settled={ring.settled} />
```

**3. Physics Isolation**

The physics world is a black box. It takes input state, advances time, and returns updated body states. Nothing outside `src/features/game/physics/` directly reads from or writes to the Matter.js world. All external access goes through `PhysicsWorld.ts`'s public interface.

**4. Pure Generators**

`ChallengeGenerator.ts` is a pure function: same inputs always produce same output, no side effects, no network calls, no store reads. It takes a challenge number and returns a `ChallengeConfig`. It may be called in a worker thread or during validation without any environment setup.

**5. Dependency Injection for Services**

Services (FirestoreService, PurchaseService, AdService) are injected via React Context, not imported directly. This makes testing trivial (inject mock services) and avoids tight coupling.

```typescript
// Context definition
const ServicesContext = createContext<AppServices>(defaultServices)

// Usage in component
const { economy, leaderboard } = useServices()

// In tests
renderWithServices(<Component />, { economy: mockEconomyService })
```

### File Standards

**Maximum file length: 300 lines.** If a file exceeds 300 lines, it is doing too much. Extract sub-concerns into separate files. This rule is enforced by ESLint (`max-lines` rule, warn at 250, error at 300).

**File naming:**
- React components: `PascalCase.tsx`
- Services, utilities, hooks: `camelCase.ts`
- Types: `camelCase.types.ts` or `types.ts` within feature folder
- Constants: `camelCase.constants.ts` or `constants.ts`
- Tests: `[FileName].test.ts` or `[FileName].spec.ts`

**One export per file** for classes and React components. Utility files may export multiple related functions.

### Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| React components | PascalCase | `RingRenderer` |
| Hooks | camelCase with `use` prefix | `useGameLoop` |
| Services | PascalCase with `Service` suffix | `EconomyService` |
| Interfaces | PascalCase with `I` prefix (optional) | `RingPhysicsConfig` |
| Types | PascalCase | `ChallengeTemplate` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RING_VELOCITY` |
| Enums | PascalCase, members PascalCase | `RingSize.Large` |
| Event handlers | `handle` prefix | `handleButtonPress` |
| Boolean props/state | `is`/`has`/`can` prefix | `isSettled`, `hasWon` |
| Private class members | `_` prefix | `_physicsWorld` |

### TypeScript Standards

- **Strict mode enabled**: `"strict": true` in tsconfig. No `any` types. No type assertions (`as Type`) without comment explaining why.
- **No implicit returns**: All function branches must explicitly return.
- **No `undefined` without explicit handling**: All nullable values handled at declaration site.
- **Discriminated unions** for state machines:

```typescript
// WRONG
type GameState = {
  status: string
  challenge?: ChallengeConfig
  result?: ChallengeResult
}

// RIGHT
type GameState =
  | { status: 'idle' }
  | { status: 'playing'; challenge: ChallengeConfig; timer: number }
  | { status: 'paused'; challenge: ChallengeConfig; timer: number }
  | { status: 'victory'; challenge: ChallengeConfig; result: ChallengeResult }
  | { status: 'defeat'; challenge: ChallengeConfig }
```

### Performance Standards

**JS Thread Budget:** The main JS thread may not perform any work during a physics tick. All game loop logic runs in a Reanimated Worklet. The JS thread handles: navigation, store updates, network calls, analytics.

**No `useEffect` for game loop logic.** Game loop runs via `useFrameCallback` (Reanimated) or `requestAnimationFrame` in a Worklet. Never `useEffect` with `setInterval`.

**Memoization rules:**
- All Skia draw functions must be wrapped in `useMemo` keyed on their data dependencies
- All expensive computations (difficulty score, challenge metadata) are memoized with `useMemo`
- Avoid unnecessary `useCallback` on simple event handlers — profile first

**Avoid re-renders:**
- Game components use `React.memo` where renders are expensive
- Store selectors are always granular (`usePlayer` → `player.level`, not `usePlayer` → full player object)
- Shared values from Reanimated bypass React re-renders entirely (this is the preferred pattern for physics state)

### Memory Budget

| Area | Limit |
|------|-------|
| Total heap | < 200MB |
| Texture atlases | < 50MB |
| Physics bodies | < 5MB |
| Audio buffers | < 20MB |
| Firestore cache | < 10MB |

Texture atlases are released when leaving `GameScreen`. Audio buffers for unused themes are released on theme switch.

### Battery Usage

- Physics runs at 30fps on low-power mode (detected via `usePowerState`)
- Background sync uses batch writes (never individual writes per event)
- Audio uses hardware codecs (no JS-based decoding)
- Avoid GPS, camera, and continuous sensor access

### Testing Requirements

Every new feature requires:
- **Unit tests** for all pure functions (generators, calculators, formatters)
- **Property-based tests** for physics functions and economy calculations
- **Integration test** for the happy path of the feature
- **Snapshot test** for all new screens

Minimum coverage gates (enforced in CI):
- Statements: 75%
- Branches: 70%
- Functions: 80%
- Lines: 75%

Physics determinism tests: A golden replay suite of 20 challenges is run on every CI build. Any change that produces different physics outcomes from the golden replays is a breaking change requiring explicit migration versioning.

### Code Review Checklist

Before merging any PR, reviewer confirms:

**Architecture:**
- [ ] No business logic in UI components
- [ ] No direct Matter.js access outside physics feature folder
- [ ] Services injected, not imported directly
- [ ] Pure functions tested with property tests

**Performance:**
- [ ] No heavy computation in render path
- [ ] No unnecessary React re-renders (check with React DevTools profiler)
- [ ] No memory leaks (event listeners removed on unmount)
- [ ] Animation frames released properly

**Code Quality:**
- [ ] No `any` types
- [ ] No unchecked null/undefined access
- [ ] File length < 300 lines
- [ ] All edge cases documented or handled

**Testing:**
- [ ] Unit tests for new pure functions
- [ ] Integration test for new user flow
- [ ] Analytics events added for new user-observable events

**Economy & Game Balance:**
- [ ] No hardcoded economy values (use constants or Remote Config)
- [ ] No physics constants in economy code
- [ ] Challenge generator pipeline order unchanged (or migration version incremented)

### Dependency Management

- All dependencies pinned to exact versions (no `^` or `~` in package.json for production dependencies)
- New dependency added only after: purpose documented, bundle size impact measured, license checked (MIT / Apache 2.0 required)
- `react-native-*` packages must be tested on both iOS and Android before merging
- Native modules (requiring rebuild) require senior engineer approval

### CI/CD Pipeline

```
PR opened:
  → TypeScript compile check
  → ESLint (zero errors, zero warnings)
  → Unit tests (Jest)
  → Property tests (fast-check, 500 runs per property)
  → Coverage gates
  → Bundle size check (alert if > 5% increase)
  → Physics golden replay check (determinism)

Merge to main:
  → All PR checks
  → Integration tests (Firebase Emulator)
  → E2E tests (Detox) on iOS simulator + Android emulator
  → Build artifacts (iOS .ipa, Android .aab)

Release branch:
  → All above
  → Fastlane deploy to TestFlight (iOS) + Internal track (Android)
  → Automated accessibility check (axe-core)
  → Performance benchmark (Maestro flows on reference device)
```


---

## Physics Engine Integration

### Matter.js Configuration

```typescript
interface PhysicsWorldConfig {
  gravity: { x: 0; y: 1; scale: 0.001 }  // Normal; Low: y=0.35; High: y=2.0
  positionIterations: 6
  velocityIterations: 4
  constraintIterations: 2
  timing: { timeScale: 1.0; delta: 16.67 }
  broadphase: 'grid'
}
```

### Ring Body Construction

Rings are 24-vertex outer polygon approximating a circle. Matter.js does not natively support hollow bodies — the inner hole is visual only. Pegs are in a separate collision filter layer from ring interiors, so rings can "pass over" pegs until settling conditions are met.

```pascal
PROCEDURE createRingBody(config)
  vertices ← []
  FOR i FROM 0 TO 23 DO
    angle ← (2π × i) / 24
    vertices.APPEND({ x: pos.x + outerRadius×cos(angle),
                      y: pos.y + outerRadius×sin(angle) })
  body ← Matter.Bodies.fromVertices(pos.x, pos.y, vertices)
  Matter.Body.setMass(body, config.mass)
  body.frictionAir ← config.frictionAir
  body.restitution ← config.restitution
  body.label ← 'ring'
  body.plugin ← { ringId, config, settledOnPegId: null }
  RETURN body
```

### Water Force Application

Applied each tick via `Matter.Events.on(engine, 'beforeUpdate', handler)`:

```pascal
FOR EACH ring (not settled) DO
  force ← backgroundCurrent(config, ring.position)
  IF leftHeld: force += buttonForce(ring.position, 'left', leftIntensity)
  IF rightHeld: force += buttonForce(ring.position, 'right', rightIntensity)
  IF turbulenceActive: force += turbulenceForce(ring.position)
  force += buoyancy(ring, config)
  Matter.Body.applyForce(ring, ring.position, force)
```

### Button Force Formula

```
F_button(x, side, intensity) = {
  sourceX: side='left' ? 0 : screenWidth
  falloff: 1 - |x - sourceX| / screenWidth
  magnitude: BASE_FORCE × intensity × falloff
  result: { x: direction × magnitude × H_FACTOR,
            y: -magnitude × V_FACTOR }
}
```

### Button Intensity Ramp

```
t < 300ms:  intensity = t / 300          (ramp up)
t < 1500ms: intensity = 1.0              (peak)
t >= 1500ms: intensity = max(0.3, 1.0 - (t-1500)/2000)  (decay)
```

### Peg Landing Detection

Pegs are sensor bodies (no collision response). `Matter.Events.on(engine, 'collisionStart', handler)` fires:

```pascal
FOR EACH pair DO
  ring ← identifyRing(pair); peg ← identifyPeg(pair)
  IF ring=null OR peg=null: CONTINUE
  IF |ring.angle mod π| > SETTLE_ANGLE: CONTINUE   // 15° tolerance
  IF vectorMag(ring.velocity) > SETTLE_VELOCITY: CONTINUE
  IF ring.plugin.colorId ≠ peg.plugin.colorId: CONTINUE
  IF timeSinceLastBounce(ring) < 200ms: CONTINUE
  markSettled(ring, peg)
  Matter.Body.setVelocity(ring, {x:0, y:0})
  Matter.Body.setPosition(ring, peg.position)
```

### Arena Bounds

Four static walls (top, bottom, left, right) form the arena boundary. Restitution 0.3 (slight bounce). Friction 0.1. Walls are in the default collision category — rings bounce off walls naturally.

### Stuck Detection

Per ring, per tick: if velocity < STUCK_THRESHOLD and angularVelocity < STUCK_THRESHOLD for > 5 seconds continuously AND ring is not settled, apply a small random impulse. Maximum 3 nudges per ring per challenge. After 3 nudges, teleport ring to a random open position (treat as respawn).

---

## Analytics — Expanded

### Event Philosophy

Track every player-observable moment. Analytics drives live balancing, retention optimization, and economy health monitoring. Events follow `noun_verb` convention. All events include the standard envelope.

### Standard Event Envelope

```typescript
{
  userId: string
  sessionId: string           // UUID, reset each app launch
  challengeNumber?: number
  timestamp: number           // Unix ms
  platform: 'ios' | 'android'
  appVersion: string
  generatorVersion: string    // Challenge generator version
  deviceTier: 'high' | 'mid' | 'low'
  properties: Record<string, string | number | boolean>
}
```

### Complete Event Catalog

**Session Events:**

| Event | Properties |
|-------|-----------|
| session_start | coldStart, previousSessionDuration |
| session_end | duration, challengesPlayed, coinsEarned |
| app_background | reason |
| app_foreground | timeInBackground |

**Challenge Events:**

| Event | Properties |
|-------|-----------|
| challenge_start | challengeNumber, difficulty, template, secondaryTemplate, physicsModifiers, environmentVariant, attemptNumber |
| challenge_complete | challengeNumber, time, stars, continues, score, assistanceFlagsActive |
| challenge_fail | challengeNumber, ringsPlaced, totalRequired, timeExpired, attemptNumber |
| challenge_quit | challengeNumber, ringsPlaced, totalRequired, timeRemaining, timeInChallenge |
| challenge_near_miss | challengeNumber, ringsPlaced, totalRequired (ringsPlaced = totalRequired - 1) |
| ring_placed | challengeNumber, ringColorId, ringSize, timeElapsed, placementNumber |
| ring_bounced_off_peg | challengeNumber, ringColorId, approachSpeed |
| obstacle_collision | challengeNumber, obstacleId, ringId |
| simultaneous_press_used | challengeNumber, timeElapsed |
| turbulence_triggered | challengeNumber, tapCount, timeElapsed |

**Input Analytics (sampled every 5 seconds per challenge):**

| Event | Properties |
|-------|-----------|
| input_sample | leftTaps, rightTaps, leftHoldMs, rightHoldMs, simultaneousPresses, inInterval |

These sampled events allow computing: average tap frequency, hold preference (left vs right), play style classification (tapper vs holder).

**Timer and Continue Events:**

| Event | Properties |
|-------|-----------|
| timer_warning_shown | challengeNumber, timerPercent (30 or 10) |
| continue_shown | challengeNumber, continueNumber, coinCost, adAvailable |
| continue_accepted_coins | challengeNumber, continueNumber, coinCost |
| continue_accepted_ad | challengeNumber, adProvider |
| continue_declined | challengeNumber, continueNumber, reason (no_coins / chose_quit) |
| near_miss_assist_applied | challengeNumber, bonusSeconds |

**Economy Events:**

| Event | Properties |
|-------|-----------|
| iap_initiated | productId, price, currency, coinBalance |
| iap_complete | productId, price, currency, coinsGranted, transactionId |
| iap_failed | productId, errorCode |
| iap_restored | productId, transactionId |
| coins_earned | source, amount, newBalance |
| coins_spent | sink, amount, newBalance |
| cosmetic_previewed | cosmeticId, category, price |
| cosmetic_purchased | cosmeticId, category, price, coinsAfter |
| cosmetic_equipped | cosmeticId, category |
| shop_opened | |
| shop_item_tapped | cosmeticId, isOwned, price |

**Ad Events:**

| Event | Properties |
|-------|-----------|
| ad_requested | placement, provider |
| ad_loaded | placement, provider, loadTimeMs |
| ad_shown | placement, provider |
| ad_complete | placement, provider, rewardType, rewardAmount |
| ad_skipped | placement, secondsWatched |
| ad_failed | placement, errorCode |

**Progression Events:**

| Event | Properties |
|-------|-----------|
| level_up | newLevel, totalXP, prestige |
| prestige_earned | prestigeLevel |
| achievement_unlock | achievementId, category, coinsRewarded, xpRewarded |
| rank_up | newRank, challengeNumber |
| mastery_tier_up | templateId, newTier |
| collection_complete | collectionId, completionTime |
| star_milestone | totalStars, reward |

**Social Events:**

| Event | Properties |
|-------|-----------|
| friend_added | method (search/invite/social) |
| challenge_shared | challengeNumber, platform (clipboard/link/social) |
| challenge_received | challengeNumber, senderId |
| ghost_uploaded | challengeNumber, completionTime |
| ghost_watched | challengeNumber, ghostOwnerId |
| leaderboard_viewed | leaderboardType, scope |

**Technical Events:**

| Event | Properties |
|-------|-----------|
| frame_drop | challengeNumber, droppedFrames, avgFps, deviceTier |
| physics_anomaly | challengeNumber, type (escaped/stuck/nan), ringId |
| crash_context | challengeNumber, physicsBodyCount, lastEvent |
| sync_failed | retryCount, errorCode |
| challenge_generation_time | challengeNumber, durationMs, retries |

### Key Analytics Dashboards

**Retention Dashboard:**
- D1, D7, D30, D90 retention curves
- Challenge funnel (1 → 5 → 10 → 20 → 50 → 100)
- Tutorial drop-off by challenge number

**Economy Dashboard:**
- Daily coin earn/spend ratio
- P25/P50/P75/P90 coin balance distribution
- IAP conversion rate (lifetime), revenue per DAU
- Rewarded ad fill rate, completion rate
- Continue usage rate by challenge range
- Top cosmetics by purchase count

**Gameplay Dashboard:**
- Template completion rates (which templates have lowest completion?)
- Challenge frustration rate (quit + fail without continue) by challenge number
- Near-miss rate (feeds into adaptive system monitoring)
- Average session length, challenges per session
- Button usage ratio (left vs right)

**Performance Dashboard:**
- P95 frame time by device tier
- Physics anomaly rate
- Crash rate by app version
- Challenge generation latency


---

## Data Models

### Player Document — Firestore `/players/{userId}`

```typescript
interface PlayerDocument {
  userId: string
  username: string
  displayName: string
  avatarUrl: string | null
  country: string                    // ISO 3166-1 alpha-2
  createdAt: Timestamp
  lastActiveAt: Timestamp
  schemaVersion: number

  progression: {
    playerLevel: number
    totalXP: number
    prestige: number
    challengesCompleted: number
    highestChallengeNumber: number
    totalStars: number
    rank: PlayerRank
    completionScore: number          // 0–100, completionist %
  }

  economy: {
    coinBalance: number
    totalCoinsEarned: number
    totalCoinsSpent: number
    lastTransactionId: string
    freeContinueUsedToday: boolean
    freeContinueResetDate: string    // YYYY-MM-DD
    dailyAdViewCount: number
    dailyAdResetDate: string
  }

  streaks: {
    loginStreak: number
    lastLoginDate: string            // YYYY-MM-DD
    streakShieldsAvailable: number
    bossStreak: number
    lastBossAttemptDate: string
  }

  social: {
    friendIds: string[]
    friendRequestsReceived: string[]
    showOnLeaderboard: boolean
    countryChangeCount: number
    lastCountryChangeDate: string
  }

  settings: PlayerSettings

  onboarding: {
    tutorialComplete: boolean
    highestChallengeShown: number
    featureUnlocks: Record<string, boolean>
    accountPromptShownAt: number[]   // Challenge numbers where shown
  }
}
```

### Challenge Record — Firestore `/players/{userId}/challenges/{N}`

```typescript
interface ChallengeRecord {
  challengeNumber: number
  seed: number
  generatorVersion: string
  templateId: string
  difficultyScore: number

  bestTime: number | null            // ms
  bestScore: number | null
  bestStars: number | null
  totalAttempts: number
  continuesUsedInBestRun: number
  firstCompletedAt: Timestamp | null
  lastAttemptAt: Timestamp

  leaderboardSubmitted: boolean
  leaderboardRank: number | null
  nearMissAssistUsed: boolean
  bestReplayId: string | null
}
```

### Mastery Record — Firestore `/players/{userId}/mastery/{templateId}`

```typescript
interface MasteryRecord {
  templateId: string
  masteryXP: number
  tier: 'none' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
  challengesCompleted: number
  threeStarCount: number
}
```

### Leaderboard Entry — Firestore `/leaderboards/{leaderboardId}/entries/{userId}`

```typescript
interface LeaderboardEntry {
  userId: string
  username: string
  displayName: string
  avatarUrl: string | null
  rank: PlayerRank
  prestige: number
  country: string

  score: number
  completionTime: number
  stars: number
  continuesUsed: number
  nearMissAssisted: boolean

  submittedAt: Timestamp
  challengeNumber: number
  generatorVersion: string
  inputEventHash: string             // SHA-256 of input event sequence
  replayId: string | null
}
```

### Economy Transaction — Firestore `/economy/{txId}`

```typescript
interface EconomyTransaction {
  transactionId: string              // UUID, idempotency key
  userId: string
  type: 'earn' | 'spend'
  amount: number                     // Positive always; type determines direction
  balanceBefore: number
  balanceAfter: number
  createdAt: Timestamp
  serverVerified: boolean

  source: {
    type: 'challenge' | 'purchase' | 'continue' | 'achievement' | 'daily'
           | 'ad' | 'event' | 'levelup' | 'cosmetic' | 'hint'
    challengeNumber?: number
    productId?: string
    cosmeticId?: string
    achievementId?: string
  }

  clientSignature: string            // HMAC-SHA256 for integrity
}
```

### Challenge Intelligence — Firestore `/challenge_intelligence/{N}`

```typescript
interface ChallengeIntelligenceDocument {
  challengeNumber: number
  generatorVersion: string
  qualityScore: number

  predicted: {
    solveTime: number
    completionRate: number
    retryCount: number
    frustrationScore: number
    funScore: number
    minPossibleSolveTime: number
  }

  actual: {
    medianSolveTime: number | null
    completionRate: number | null
    avgRetryCount: number | null
    frustrationRate: number | null   // % who quit without completing
    continueRate: number | null
    sampleSize: number               // Number of player attempts included
    lastUpdatedAt: Timestamp | null
  }

  metadata: {
    ringCount: number
    decoyCount: number
    pegCount: number
    obstacleCount: number
    templateId: string
    secondaryTemplateId: string | null
    physicsModifiers: string[]
    mechanicalFocus: string
    environmentVariant: string
  }
}
```

---

## Key Algorithms and Formal Specifications

### Algorithm 1: Master Seed Generation

```pascal
FUNCTION generateMasterSeed(N: integer): (s0, s1, s2, s3: uint32)
  PRECONDITIONS: N >= 1; SALT_GLOBAL initialized
  POSTCONDITIONS: Same N → same output; N±1 produces entirely different output

  raw ← N × PRIME_A + SALT_GLOBAL   // PRIME_A = 2654435761
  r1 ← lcgHash(raw)
  r2 ← lcgHash(r1)
  r3 ← lcgHash(r2)

  // splitmix64 expansion to 4 × uint32
  s0 ← uint32(r3 XOR (r3 >> 30)) × 0xBF58476D1CE4E5B9
  s1 ← uint32(s0 XOR (s0 >> 27)) × 0x94D049BB133111EB
  s2 ← uint32(s1 XOR (s1 >> 31))
  s3 ← uint32(r2) XOR uint32(r1)

  RETURN (s0, s1, s2, s3)

FUNCTION lcgHash(x): x × 6364136223846793005 + 1442695040888963407 mod 2^64
```

### Algorithm 2: Difficulty Score

```pascal
FUNCTION D(N: integer): float
  PRECONDITIONS: N >= 1
  POSTCONDITIONS: D(N+1) >= D(N); 0 <= D(N) <= 100

  IF N <= 1000:
    RETURN 50 × log(1+N) / log(1001)
  ELSE:
    RETURN 50 + 50 × (1 - exp(-(N-1000) / 5000))
```

### Algorithm 3: Poisson Disk Peg Placement

```pascal
FUNCTION poissonDisk(count, zone, minDist, prng): Vector2D[]
  PRECONDITIONS: count >= 1; minDist > 0; zone has positive area
  POSTCONDITIONS: |result| = count; all pairs satisfy distance >= minDist; all within zone

  grid ← SpatialGrid(cellSize = minDist / sqrt(2))
  active ← []; positions ← []

  first ← randomInZone(zone, prng)
  active.push(first); positions.push(first); grid.insert(first)

  WHILE |active| > 0 AND |positions| < count DO
    idx ← prng.nextInt(0, |active|-1)
    point ← active[idx]; found ← false

    FOR attempt FROM 0 TO 29 DO
      angle ← prng.nextFloat() × 2π
      dist ← minDist × (1 + prng.nextFloat())
      candidate ← point + (dist×cos(angle), dist×sin(angle))
      IF inZone(candidate, zone) AND NOT grid.hasNeighbor(candidate, minDist):
        active.push(candidate); positions.push(candidate)
        grid.insert(candidate); found ← true; BREAK

    IF NOT found: active.removeAt(idx)

  IF |positions| < count: RETURN gridFallback(count, zone, prng)
  RETURN positions
```

### Algorithm 4: Win Condition Checker

```pascal
PROCEDURE checkWinCondition(world, config, stableTimerRef, dt)
  allSettled ← true
  FOR EACH (ringId, pegId) IN config.requiredPairs DO
    ring ← getRing(world, ringId)
    IF ring.settledOnPegId ≠ pegId: allSettled ← false; BREAK

  IF allSettled:
    stableTimerRef.value += dt
    IF stableTimerRef.value >= 500: triggerVictory()
  ELSE:
    stableTimerRef.value ← 0
```

### Algorithm 5: Challenge Quality Score

```pascal
FUNCTION qualityScore(config, solverResults): float
  solvabilityScore ← solverResults.successCount / 3.0

  // Fun score components
  timerUtil ← predictedSolveTime / config.timerSeconds
  funScore ← 0.3 × gaussianScore(timerUtil, ideal=0.7, sigma=0.15)
           + 0.3 × movementDiversityScore(config)
           + 0.2 × ahaMomentScore(config)
           + 0.2 × sizeVarietyScore(config)

  fairnessScore ← computeFairness(config)
  varietyScore ← computeVariety(config, sessionHistory)
  pacingScore ← computePacing(config)

  RETURN 0.30 × solvabilityScore
       + 0.25 × funScore
       + 0.20 × fairnessScore
       + 0.15 × varietyScore
       + 0.10 × pacingScore
```

---

## State Machines

### Game State Machine

```
[*] → Splash → Loading → Home

Home → ChallengeSetup (play pressed)
ChallengeSetup → Playing (challenge generated)
Playing → Paused (pause / background)
Paused → Playing (resume)
Paused → Home (quit confirmed)
Paused → ChallengeSetup (restart confirmed)
Playing → TimerExpired (timer = 0)
TimerExpired → ContinueModal
ContinueModal → Playing (continue granted)
ContinueModal → Defeat (declined / max continues)
Playing → Victory (win condition met)
Victory → ChallengeSetup (next)
Victory → Home (home)
Defeat → ChallengeSetup (try again)
Defeat → Home (home)
```

### Input State Machine

```
Idle
  → leftTapStart (<150ms) → LeftTapping → tapEnd → Idle
  → leftHoldStart (≥150ms) → LeftHolding → holdEnd → Idle
  → rightTapStart → RightTapping → tapEnd → Idle
  → rightTapStart (≥150ms) → RightHolding → holdEnd → Idle
  → LeftTapping + rapidCount≥3 → Turbulence → 300ms → Idle
  → LeftHolding + rightPressed → BothHeld → bothReleased → Idle
  → BothHeld → rightReleased → LeftHolding
  → BothHeld → leftReleased → RightHolding
```

### Sync State Machine

```
Offline → Syncing (network available)
Syncing → Synced (sync complete)
Syncing → SyncFailed (error)
SyncFailed → Syncing (30s retry timeout)
Synced → Dirty (local change)
Dirty → Syncing (network + debounce elapsed)
Synced → Offline (network lost)
Dirty → Offline (network lost)
```

---

## Edge Cases and Resilience

### Player Leaves Mid-Challenge

Physics state (ring positions, velocities, timer remaining) serialized to MMKV every 1 second. On next app launch, if a pending challenge record exists and `timerRemaining > 0` (accounting for elapsed wall time), offer: "Resume challenge #N?" Accept: restore physics from serialized state. Decline: mark as failed, clear record.

If the timer would have expired while app was backgrounded, show Continue/Defeat screen immediately on resume.

### Phone Dies / Hard Shutdown

MMKV writes are synchronous. The most recent 1-second checkpoint is always written. On restart, recover from that checkpoint.

### Network Disconnects Mid-Challenge

Challenge play continues unaffected (fully offline). Leaderboard submission is queued in MMKV with status `pending`. On reconnect, `SyncManager` flushes the queue (exponential backoff: 1s, 2s, 4s, 8s, max 30s). If submission fails after 5 retries, it is marked `failed` and shown to user in challenge history as "Not submitted to leaderboard."

### Physics Bug: Ring Escapes Arena

Arena bounds check runs every tick. If any ring position is outside arena boundaries, it is immediately clamped to the nearest valid position. A non-fatal Crashlytics event is logged with physics state dump.

### Physics Bug: Ring Stuck

Velocity below `STUCK_THRESHOLD` (0.5 px/s) for > 5 continuous seconds AND not settled → apply random impulse. Max 3 nudges. After 3, teleport ring to random open position. Log non-fatal event.

### Physics Bug: NaN in State

NaN check before render. If any ring position/velocity is NaN, restore that body to its last valid MMKV checkpoint. Log non-fatal event.

### Coin Purchase Interrupted

RevenueCat handles receipt recovery automatically on next app launch. Firestore `EconomyTransaction` uses the RevenueCat transaction ID as idempotency key — duplicate events are silently ignored. Player can trigger manual restore from Settings → Restore Purchases.

### Challenge Generator Version Mismatch

Leaderboard entries include `generatorVersion`. If a player's submission references an old version and the server cannot verify the layout (version was deprecated), the submission is archived, not rejected — it goes to a `legacy_leaderboard` partition. Players are not penalized; they simply do not appear on the current leaderboard.

### Leaderboard Tampering

All writes via Cloud Function. Direct Firestore writes blocked by security rules. Cloud Function validates: layout hash, minimum time, input log hash, rate limit. Invalid submissions are silently dropped (no error message — prevents feedback loop for cheaters).

### Save Corruption

MMKV writes include CRC32 checksum. On read, checksum is verified. On failure, discard local save and fetch from Firestore. If Firestore also unavailable, start fresh with a 48-hour recovery window message: "Reconnect to restore your cloud save."

### Schema Version Migration

```typescript
const MIGRATIONS: Record<number, (data: any) => any> = {
  1: (d) => d,
  2: (d) => ({ ...d, streakShieldsAvailable: 0 }),
  3: (d) => ({ ...d, settings: defaultSettings() }),
  4: (d) => ({ ...d, onboarding: defaultOnboarding() }),
}

function migrate(data: any, from: number, to: number): PlayerDocument {
  for (let v = from; v < to; v++) {
    data = MIGRATIONS[v + 1](data)
  }
  return data
}
```

All migrations are additive. Never remove fields — old app versions reading new documents ignore unknown fields gracefully.

### Cloud Conflict (Two Devices Offline)

Per-field conflict resolution:
- `coinBalance`: max
- `highestChallengeNumber`: max
- `cosmetics`: union
- `stars` per challenge: max
- `achievements unlocked`: union
- `settings`: last-write-wins (Firestore server timestamp comparison)
- `loginStreak`: If both devices recorded same-date activity, take max streak. If different consecutive dates, merge as continuous streak.

### Rewarded Ad Failure

Ad network fails to load: show "Ad unavailable" message. Offer coin-based continue as fallback. Log `ad_failed` event. Do not retry immediately (prevents frozen loading screen). Retry next challenge.

### New Player Anonymous Session

Anonymous session stored keyed by device fingerprint in MMKV. On sign-in, merge anonymous progress into authenticated account. If authenticated account already has higher progress, use higher values (max merge). If anonymous session is > 30 days old without sign-in, offer one-time "Save before you lose it" prompt.

---

## Security and Anti-Cheat

### Threat Model

| Threat | Severity | Mitigation |
|--------|----------|-----------|
| Coin farming (modified client) | High | Server-side validation; HMAC signatures |
| Leaderboard injection | High | Server-only writes; score validation |
| Timer manipulation (device clock) | Medium | Monotonic delta clock |
| Replay reuse across challenges | Medium | Input log hashed against challenge seed |
| IAP receipt fraud | High | RevenueCat server validation |
| Seed reverse engineering | Medium | Salt in Remote Config; rotatable |
| Man-in-the-middle | Medium | Firebase SDK enforces TLS |

### Firestore Security Rules (Summary)

- Players read/write own document only
- Leaderboard entries: readable all; writable Cloud Functions only
- Economy transactions: readable by owner; writable Cloud Functions only
- Challenge intelligence: readable all; writable Cloud Functions only

### Client Signing

```
Signature = HMAC-SHA256(eventData, PBKDF2(userId + deviceId + appSecret, salt, 10000))
```

`appSecret` is obfuscated in the binary. Catches packet modification attacks. Does not stop sophisticated reverse engineering — but combined with server-side validation, no single attack vector is sufficient for economy exploitation.

---

## Testing Strategy

### Unit Tests (Jest + TypeScript)

- All pure functions: difficulty, seed generation, economy formulas, timer calculations
- Generator pipeline: each step independently
- State machines: all transitions
- Conflict resolution: all merge rules
- Schema migrations: each migration step

### Property-Based Tests (fast-check)

- `D(N+1) >= D(N)` for all N in [1, 100000]
- `D(N) <= 100` for all N
- `generateChallenge(N)` called twice produces identical config (determinism)
- All peg pairs in any generated challenge satisfy minimum distance
- `creditCoins(amount)` then `spendCoins(amount)` → net balance unchanged
- `ContinueCost(D, n+1) > ContinueCost(D, n)` for all D, n
- Button force is always bounded by MAX_WATER_FORCE

### Integration Tests (Firebase Emulator)

- Full challenge lifecycle: generate → play → win → score recorded
- Continue flow: timer expire → coin pay → resume → win
- Offline + sync: play offline → reconnect → leaderboard submitted
- Purchase flow: initiate → mock RevenueCat → coins credited
- Conflict resolution: write device A → write device B → verify merge

### Physics Golden Replay Tests

20 challenge replays stored as golden fixtures. On every CI build, each replay is re-executed and output compared byte-for-byte. Any change in physics output is a breaking change requiring explicit migration versioning.

### Performance Benchmarks (Maestro on reference device)

Reference devices: iPhone 11 (iOS 16), Pixel 5 (Android 12).

| Benchmark | Target |
|-----------|--------|
| Cold start to Home | < 3s |
| Challenge generation | < 80ms |
| First render after challenge load | < 500ms |
| P95 frame time during gameplay | < 12ms |
| Victory screen transition | < 300ms |

### Accessibility Testing

Manual VoiceOver + TalkBack testing on all screens before each release. Automated axe-core scan in CI (zero critical violations).

---

## Deployment and Scalability

### Release Roadmap

**v1.0 (Launch):** All systems in this document. Full gameplay, economy, meta progression, social, LiveOps, accessibility.

**v1.x (Monthly patches):** New cosmetic catalog expansions, seasonal events, balance tuning via Remote Config.

**v2.0 (6+ months):** Battle Pass, expanded social (clans/guilds), Challenge Builder (player-created challenges), audio description mode.

### Firestore Scaling

- Leaderboard uses sharded counter pattern for high-write paths
- Player documents < 100KB (within Firestore document limit)
- Leaderboard queries paginate (20 entries per page)
- Challenge intelligence documents archived after 6 months to Firestore archive tier
- Daily challenge leaderboards auto-archive after 7 days

### App Store Deployment

**iOS:** TestFlight → App Store. Budget 3–5 days review time. Metadata localized: EN, ES, FR, DE, JA, KO, ZH-Hans, PT-BR.

**Android:** Internal → Closed → Open → Production (staged: 5% → 20% → 50% → 100% over 2 weeks). Monitor crash rate and ANR rate; pause rollout if either exceeds 0.5%.

### Monitoring and Alerting

| Metric | Alert Threshold | Severity |
|--------|----------------|----------|
| Crash rate | > 0.5% sessions | P1 |
| ANR rate | > 0.2% sessions | P1 |
| API error rate | > 2% requests | P2 |
| D1 retention drop | > 5 points day-over-day | P2 |
| Economy sink:earn ratio | < 0.15 | P3 |
| Physics anomaly rate | > 0.1% sessions | P3 |

---

## Dependencies

### Client-Side

| Package | Version | Purpose |
|---------|---------|---------|
| react-native | 0.73+ | Core framework |
| typescript | 5.x | Type safety |
| matter-js | 0.19+ | Physics engine |
| react-native-reanimated | 3.x | Animations + Worklets |
| react-native-gesture-handler | 2.x | Touch input |
| @shopify/react-native-skia | 0.1.x | GPU 2D rendering |
| @react-navigation/native | 6.x | Screen navigation |
| zustand | 4.x | State management |
| react-native-mmkv | 2.x | Local storage |
| @react-native-firebase/app | 18.x | Firebase core |
| @react-native-firebase/auth | 18.x | Authentication |
| @react-native-firebase/firestore | 18.x | Cloud database |
| @react-native-firebase/analytics | 18.x | Analytics |
| @react-native-firebase/crashlytics | 18.x | Crash reporting |
| @react-native-firebase/remote-config | 18.x | Remote Config |
| @react-native-firebase/functions | 18.x | Cloud Functions |
| @react-native-firebase/storage | 18.x | Replay storage |
| react-native-purchases | 6.x | RevenueCat IAP |
| react-native-track-player | 4.x | Music layer management |
| react-native-sound | 0.11+ | SFX playback |
| react-native-haptic-feedback | 2.x | Haptics |
| fast-check | 3.x | Property testing (dev) |
| jest | 29.x | Unit testing (dev) |
| detox | 20.x | E2E testing (dev) |

### Target Platform Versions

| Platform | Minimum |
|----------|---------|
| iOS | 14.0 |
| Android | API 24 (Android 7.0) |
| Node.js (Cloud Functions) | 18 |

---

## Components and Interfaces

### GameLoopController

```typescript
interface GameLoopController {
  start(config: ChallengeConfig): void
  stop(): void
  pause(): void
  resume(): void
  applyInput(input: InputEvent): void
  onWin(callback: (result: ChallengeResult) => void): void
  onTimerExpire(callback: () => void): void
  getCurrentState(): GameLoopSnapshot
}
```

Orchestrates the fixed-timestep physics loop, input processing, win/loss detection, and timer management. Acts as central coordinator for all game systems during an active challenge.

### PhysicsWorld

```typescript
interface PhysicsWorld {
  initialize(config: ChallengeConfig): void
  step(dt: number): void
  applyWaterForces(input: InputState): void
  getRingStates(): RingState[]
  getPegStates(): PegState[]
  serializeState(): SerializedPhysicsState
  restoreState(state: SerializedPhysicsState): void
  destroy(): void
}
```

Wraps the Matter.js engine. Manages all rigid bodies and applies custom water forces each tick. The only external interface to physics state.

### ChallengeGenerator

```typescript
interface ChallengeGenerator {
  generate(challengeNumber: number): ChallengeConfig
  generateDaily(date: Date): ChallengeConfig
  validate(config: ChallengeConfig): SolvabilityResult
  scoreQuality(config: ChallengeConfig): ChallengeQualityScore
  getTemplateById(id: string): ChallengeTemplate
}
```

Pure function: same input always produces same output. No side effects, no network, no store access.

### InputController

```typescript
interface InputController {
  onLeftPress(event: TouchEvent): void
  onLeftRelease(event: TouchEvent): void
  onRightPress(event: TouchEvent): void
  onRightRelease(event: TouchEvent): void
  getCurrentInputState(): InputState
  reset(): void
}
```

Translates raw touch events into typed InputState. Manages hold duration tracking, rapid-tap detection, simultaneous press detection.

### EconomyService

```typescript
interface EconomyService {
  creditCoins(userId: string, amount: number, source: CoinSource, txId: string): Promise<void>
  spendCoins(userId: string, amount: number, sink: CoinSink): Promise<SpendResult>
  getBalance(userId: string): Promise<number>
  initiatePurchase(productId: string): Promise<PurchaseResult>
  restorePurchases(): Promise<RestoreResult>
}
```

All coin-earning and spending with full auditability. Server-side validation via Cloud Functions.

### SyncManager

```typescript
interface SyncManager {
  initialize(userId: string): void
  syncNow(): Promise<SyncResult>
  queueEvent(event: SyncableEvent): void
  flushQueue(): Promise<void>
  resolveConflict(local: PlayerDocument, cloud: PlayerDocument): PlayerDocument
  getLastSyncTime(): number
  getSyncStatus(): SyncStatus
}
```

Keeps MMKV state synchronized with Firestore. Handles offline queuing and conflict resolution.

### HapticManager

```typescript
interface HapticManager {
  trigger(event: HapticEvent): void
  triggerPattern(pattern: HapticPattern): void
  cancelAll(): void
  setGlobalIntensity(scale: number): void
  isSupported(): boolean
}
```

### AudioEngine

```typescript
interface AudioEngine {
  startChallenge(themeId: string): void
  onFirstRingMoved(): void
  onFirstRingLanded(): void
  onChallengeMidpoint(): void
  onTimerAmber(): void
  onTimerCritical(): void
  onVictory(): void
  onDefeat(): void
  pause(): void
  resume(): void
  playSFX(event: SFXEvent, options?: SFXOptions): void
  setMasterVolume(v: number): void
  setMusicVolume(v: number): void
  setSFXVolume(v: number): void
}
```

### AdaptiveAssistController

```typescript
interface AdaptiveAssistController {
  recordAttempt(result: AttemptResult): void
  recordQuit(progress: AttemptProgress): void
  getActiveAssists(): AssistFlag[]
  shouldShowSkipOption(): boolean
  getNearMissBonusSeconds(): number | null
  reset(challengeNumber: number): void
}
```

---

## Error Handling

### Physics Errors

| Condition | Detection | Response |
|-----------|-----------|----------|
| Ring escapes arena | Position check per tick | Clamp to bounds; log non-fatal |
| Ring permanently stuck | Velocity < threshold 5s | Nudge (max 3); then teleport; log non-fatal |
| NaN in physics state | NaN check before render | Restore from last MMKV checkpoint; log non-fatal |
| Body count mismatch | Count check every 100 ticks | Log warning; reinitialize if count drops unexpectedly |
| Tick exceeds 50ms | Tick duration monitoring | Skip accumulated frames; log warning |

### Network Errors

| Condition | Response |
|-----------|----------|
| Firestore read timeout | Use local cache; show offline indicator |
| Firestore write failure | Queue; retry with exponential backoff (1s→2s→4s→30s max) |
| Cloud Function timeout | Retry once; then queue for background retry |
| Remote Config fetch failure | Use cached config; fall back to hardcoded defaults |
| RevenueCat API failure | Show "Purchase unavailable, try again"; never leave in loading state |
| Ad network failure | Silently show coin-continue option instead |

### Economy Errors

| Condition | Response |
|-----------|----------|
| Insufficient coins | Disable that option; show "Not enough coins" |
| Duplicate transaction | Silently ignore (idempotency key) |
| Invalid HMAC signature | Reject server-side; log security event |
| Balance conflict | Take maximum |
| IAP receipt invalid | Show "Purchase could not be verified"; prompt Restore Purchases |

### Challenge Errors

| Condition | Response |
|-----------|----------|
| Quality validation fails 5× | Reduce difficulty one step; regenerate |
| Timer sync drift > 1s | Resync from server timestamp |
| Leaderboard submission rejected | Store locally as "not submitted"; show indicator |
| Ghost replay version mismatch | Mark as legacy; disable as live ghost; allow as recording |
| Daily seed failure | Apply Remote Config fallback offset |

---

## Correctness Properties

The following properties must hold universally. All are verifiable via property-based tests.

### Property 1: Force Boundedness
For any ring position, input state, and challenge config, `applyWaterForces` never produces a force magnitude exceeding `MAX_WATER_FORCE`. **Validates: Requirements 1.1**

### Property 2: No Force on Settled Rings
If a ring has `settledOnPegId !== null`, `applyWaterForces` applies zero force to that ring. **Validates: Requirements 1.2**

### Property 3: Buoyancy Direction
`computeBuoyancy` always returns a force with y ≤ 0 (upward only). It never pushes rings downward. **Validates: Requirements 1.3**

### Property 4: Button Symmetry
Force magnitude on a ring at position (x, y) from the left button equals force magnitude at position (W−x, y) from the right button. The arena is horizontally symmetric. **Validates: Requirements 1.4**

### Property 5: Determinism
`generateChallenge(N)` called multiple times, on multiple devices, in multiple sessions, always produces byte-identical `ChallengeConfig`. **Validates: Requirements 2.1**

### Property 6: Peg Separation
For any generated challenge, all peg pairs satisfy `distance(peg_i, peg_j) ≥ minPegSeparation(D(N))`. **Validates: Requirements 2.2**

### Property 7: Ring-Peg Bijection
Every required ring maps to exactly one target peg. No two required rings share a target peg. **Validates: Requirements 2.3**

### Property 8: Arena Containment
All peg positions and ring initial positions in any generated challenge are within arena bounds. **Validates: Requirements 2.4**

### Property 9: Difficulty Monotonicity
For all N ≥ 1: `D(N+1) ≥ D(N)`. The difficulty score is non-decreasing. **Validates: Requirements 3.1**

### Property 10: Difficulty Ceiling
For all N ≥ 1: `D(N) ≤ 100`. The difficulty score never exceeds D_CEILING. **Validates: Requirements 3.2**

### Property 11: Coin Conservation
For any sequence of economy transactions: `finalBalance = initialBalance + sum(credits) − sum(debits)`. **Validates: Requirements 4.1**

### Property 12: Continue Cost Escalation
For any fixed D and any n ≥ 1: `ContinueCost(D, n+1) > ContinueCost(D, n)`. Subsequent continues always cost more. **Validates: Requirements 4.2**

### Property 13: Idempotent Credit
Calling `creditCoins` with the same `transactionId` twice results in coins being credited exactly once. **Validates: Requirements 4.3**

### Property 14: Non-Negative Balance
The system never allows `coinBalance < 0`. Any spend that would result in negative balance is rejected before execution. **Validates: Requirements 4.4**

### Property 15: Timer Monotonicity
`timerRemaining` is strictly non-increasing during active gameplay, excluding continues. It never goes backward without a continue being applied. **Validates: Requirements 5.1**

### Property 16: Continue Bonus Bounded
`continueBonusSeconds(D) ≤ originalChallengeTimer(D)` for all D. A continue cannot grant more time than the original timer. **Validates: Requirements 5.2**

### Property 17: Score Ordering
For any two leaderboard submissions on the same challenge, the submission with lower `completionTime` and fewer `continuesUsed` always ranks higher. **Validates: Requirements 6.1**

### Property 18: Submission Time Gate
No leaderboard entry with `completionTime < minPossibleSolveTime(N)` can ever be recorded. **Validates: Requirements 6.2**

### Property 19: Sync Idempotency
Syncing the same local state to Firestore N times produces the same cloud state as syncing once. **Validates: Requirements 6.3**

### Property 20: Cosmetic Isolation
Equipping any cosmetic — or unequipping all cosmetics — changes zero physics configuration values (mass, gravity, force constants, peg size, ring radius). **Validates: Requirements 7.1**

---

*End of Design Document v2.0*
*This document is the single source of truth for building the Water Ring Puzzle Game.*
*Every system is specified. Every edge case is handled. Every formula is documented.*
*It is ready to be handed to an engineering team for implementation.*
