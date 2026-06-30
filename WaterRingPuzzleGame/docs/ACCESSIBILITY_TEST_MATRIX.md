# Accessibility Test Matrix — Water Ring Puzzle Game
**Task 19.4.2 | Version 1.0 | Status: DRAFT**

---

## 1. Overview

This matrix covers three accessibility testing dimensions:
1. **VoiceOver (iOS)** — screen reader with swipe navigation
2. **TalkBack (Android)** — screen reader with explore-by-touch
3. **Color-blind mode** — protanopia, deuteranopia, tritanopia simulations

All P0 items must pass before App Store / Play Store submission.

---

## 2. VoiceOver (iOS) Test Matrix

### Setup
- Device: iPhone 15 Pro
- Enable: Settings → Accessibility → VoiceOver → ON
- Navigation: single finger swipe right/left to move, double-tap to activate

| ID | Screen / Component | Expected VoiceOver Label | Test Steps | Pass/Fail | Notes |
|----|-------------------|-------------------------|------------|-----------|-------|
| VO-01 | WaterButton (Left) | "Left water button, double tap to activate" | Navigate to game screen, swipe to left button | | |
| VO-02 | WaterButton (Right) | "Right water button, double tap to activate" | Navigate to game screen, swipe to right button | | |
| VO-03 | TimerArc | "Time remaining: [N] seconds" | Navigate to TimerArc during challenge | | |
| VO-04 | ChallengeHUD | "Challenge [N], difficulty [D]" or equivalent | Navigate to challenge HUD | | |
| VO-05 | PauseButton | "Pause game, button" | Swipe to pause button | | |
| VO-06 | PauseOverlay — Resume | "Resume game, button" | Open pause overlay, swipe to Resume | | |
| VO-07 | PauseOverlay — Quit | "Quit challenge, button" | Open pause overlay, swipe to Quit | | |
| VO-08 | VictoryModal — claim | "Claim reward, button" | Win a challenge, navigate modal | | |
| VO-09 | DefeatModal — continue | "Continue for [N] coins, button" | Lose a challenge, navigate modal | | |
| VO-10 | DefeatModal — quit | "Give up, button" | Navigate to quit button in DefeatModal | | |
| VO-11 | ContinueModal — timer | "Auto-dismiss in [N] seconds" | Navigate to continue modal | | |
| VO-12 | Bottom nav — Home | "Home, tab, 1 of 4" | Navigate to bottom nav | | |
| VO-13 | Bottom nav — Store | "Store, tab, 2 of 4" | Swipe to Store tab | | |
| VO-14 | Bottom nav — Leaderboard | "Leaderboard, tab, 3 of 4" | Swipe to Leaderboard tab | | |
| VO-15 | Bottom nav — Profile | "Profile, tab, 4 of 4" | Swipe to Profile tab | | |
| VO-16 | Coin balance display | "Coin balance: [N] coins" | Navigate to any screen with coin display | | |
| VO-17 | Store — product card | "250 coins bundle, [price], button" | Navigate to Store screen | | |
| VO-18 | Leaderboard row | "Rank [N], [username], [score]" | Navigate to Leaderboard | | |
| VO-19 | Achievement banner | "Achievement unlocked: [name]" | Trigger achievement | | |
| VO-20 | Settings — sound toggle | "Sound effects, switch, [on/off]" | Navigate to Settings | | |
| VO-21 | Game screen focus order | Focus moves: HUD → buttons → pause | VoiceOver swipe through game screen | | |
| VO-22 | Modal focus trap | Focus stays inside modal while open | Open VictoryModal, swipe past edges | | |
| VO-23 | Ring position announcement | "Ring [color] at position [x,y]" or grouped | Navigate game screen with VO | | |
| VO-24 | Challenge complete announcement | Live region announces "Challenge won!" | Win a challenge | | |
| VO-25 | Error states announced | "Insufficient coins" announced on failure | Attempt continue with 0 coins | | |

---

## 3. TalkBack (Android) Test Matrix

### Setup
- Device: Samsung Galaxy S24
- Enable: Settings → Accessibility → TalkBack → ON
- Navigation: swipe right/left to move, double-tap to activate, swipe up+right for menu

| ID | Screen / Component | Expected TalkBack Label | Test Steps | Pass/Fail | Notes |
|----|-------------------|------------------------|------------|-----------|-------|
| TB-01 | WaterButton (Left) | "Left water button, activate by double-tapping" | Navigate to game screen | | |
| TB-02 | WaterButton (Right) | "Right water button, activate by double-tapping" | Navigate to game screen | | |
| TB-03 | TimerArc | Reads remaining time in seconds | Explore timer area | | |
| TB-04 | PauseButton | "Pause, button" | Explore game HUD | | |
| TB-05 | VictoryModal — claim | "Claim reward, button" | Win challenge | | |
| TB-06 | DefeatModal — continue | "Continue for [N] coins, button" | Lose challenge | | |
| TB-07 | Bottom nav | Each tab reads name and selected state | Explore bottom nav | | |
| TB-08 | Coin balance | Reads coin value | Explore any screen showing coins | | |
| TB-09 | Leaderboard rows | "Rank [N], [username], [score]" | Explore leaderboard | | |
| TB-10 | Modal focus trap | TalkBack navigation stays inside modal | Open any modal | | |
| TB-11 | Store product | "Reads product name and price" | Explore store screen | | |
| TB-12 | Live region — win | "Challenge won!" announced automatically | Win challenge | | |
| TB-13 | Settings toggle labels | Each setting read with state | Explore settings | | |
| TB-14 | Input field labels | Username field labeled properly | Profile edit screen | | |
| TB-15 | Swipe gesture conflict | WaterButton hold gesture works in a11y mode | Challenge screen with TalkBack | | Reduced-motion alternative expected |

---

## 4. Color-Blind Mode Test Matrix

### Setup
- iOS: Settings → Accessibility → Display & Text Size → Color Filters → [mode]
- Android: Settings → Accessibility → Color Correction → [mode]
- Also test in-app color-blind palette toggle (Settings screen)

#### Simulation modes to test
- **Protanopia** — red deficiency (red appears brown/yellow)
- **Deuteranopia** — green deficiency (green appears orange/brown)
- **Tritanopia** — blue deficiency (blue appears green/pink)
- **Monochromacy** — full grayscale (most severe)

| ID | UI Element | Original Colors | Issue Risk | Protanopia OK? | Deuteranopia OK? | Tritanopia OK? | Notes |
|----|-----------|----------------|-----------|----------------|-----------------|----------------|-------|
| CB-01 | Ring colors (red, blue, green, yellow, purple, orange) | All 6 colors | Red/green confusion | Check red vs green | Check green vs orange | Check blue vs green | Must use shape + pattern as secondary cue |
| CB-02 | Target peg highlight (win condition) | Green glow | Red/green confusion | | | | Use distinct shape change, not just color |
| CB-03 | Timer arc color (urgent = red) | Green → orange → red | Red/green | | | | Add numeric countdown as primary indicator |
| CB-04 | Win state (green) vs Loss state (red) | Green / red | Red/green | | | | Use icons (✓ vs ✗) not just color |
| CB-05 | Coin balance text | Gold/yellow | Blue deficiency | | | | High contrast background ensures legibility |
| CB-06 | Achievement banner | Gold background | — | | | | |
| CB-07 | Leaderboard rank 1/2/3 (gold/silver/bronze) | Yellow, gray, brown | All types | | | | Add numeric rank label |
| CB-08 | Water simulation color | Blue gradient | Tritanopia | | | | Ensure sufficient contrast with rings |
| CB-09 | Obstacle bodies | Red/orange | Protanopia | | | | Use distinct shape/texture |
| CB-10 | In-app color-blind palette toggle | Settings screen | — | Verify toggle switches palette | | | Must visually distinguish all ring colors |
| CB-11 | XP progress bar | Blue fill | Tritanopia | | | | Check against background |
| CB-12 | Store "SALE" badge | Red badge | Protanopia | | | | |

---

## 5. Reduced Motion Test Matrix

| ID | Animation | Reduced Motion Behavior | Pass/Fail |
|----|-----------|------------------------|-----------|
| RM-01 | Victory confetti | Disabled or instant reveal | |
| RM-02 | Ring drop animation | Instant placement (no physics animation) | |
| RM-03 | Timer arc sweep | Instant jump or alpha-only transition | |
| RM-04 | Achievement banner slide-in | Cross-fade instead of slide | |
| RM-05 | Water surface wave | Static or minimal motion | |
| RM-06 | Screen transitions | Fade instead of slide/push | |
| RM-07 | Coin sparkle effects | Disabled | |
| RM-08 | Bubble particles | Disabled | |

---

## 6. Minimum Contrast Ratios (WCAG AA)

All text must meet WCAG 2.1 AA (4.5:1 for normal text, 3:1 for large text):

| Element | Foreground | Background | Ratio Target | Status |
|---------|-----------|-----------|-------------|--------|
| Coin balance | #FFD700 | #1A1A2E | ≥ 4.5:1 | |
| Timer digits | #FFFFFF | #000000 | ≥ 4.5:1 | |
| Challenge number | #FFFFFF | dark overlay | ≥ 4.5:1 | |
| Button labels | #FFFFFF | #2D6BE4 | ≥ 4.5:1 | |
| Modal body text | #111111 | #FFFFFF | ≥ 4.5:1 | |
| Leaderboard rows | #222222 | #F5F5F5 | ≥ 4.5:1 | |

---

## 7. Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Accessibility QA | | | |
| Design Lead | | | |
| Engineering Lead | | | |
