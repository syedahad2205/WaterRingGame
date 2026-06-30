# VoiceOver / TalkBack Manual Test Procedure

Epic 17 — Requirements 17.1.2b, 17.1.2c

---

## iOS VoiceOver (Requirement 17.1.2b)

### Setup

1. On device: Settings > Accessibility > VoiceOver > Turn On (or triple-click side button if shortcut is enabled).
2. Build and install the app in debug: `npx react-native run-ios --device`.
3. Navigate with single-finger swipe right to move focus forward, swipe left to move back.
4. Double-tap to activate the focused element.

### Test Cases

| # | Screen | Action | Expected VoiceOver announcement |
|---|--------|--------|----------------------------------|
| 1 | Home | Focus on "Play" button | "Play, button" |
| 2 | Home | Focus on bottom nav tabs | "Home, tab, 1 of 4" / "Daily, tab, 2 of 4" / etc. |
| 3 | Game | Ring placed on correct peg | "Ring placed. 3 rings remaining." (or equivalent via announceForAccessibility) |
| 4 | Game | Timer reaches 10 seconds | "10 seconds remaining" announced |
| 5 | Game | Win condition met | "Puzzle solved! You earned 3 stars." |
| 6 | Game | Loss (timer expired) | "Time's up. Continue or forfeit?" |
| 7 | Settings | Color-blind preset picker | Each option read aloud: "None", "Deuteranopia", "Protanopia", "Tritanopia" |
| 8 | Settings | Reduced motion toggle | "Reduced motion, switch, off" → after toggle → "Reduced motion, switch, on" |
| 9 | Pause overlay | Dismiss button | "Resume game, button" |
| 10 | Victory modal | Star count | "You earned 3 stars, image" or equivalent |

### Pass Criteria

- Every interactive element has a non-empty `accessibilityLabel`.
- No element is focused but silent (empty label).
- Dynamic announcements (ring placed, timer, win/loss) are delivered within 500 ms of the event.
- No two adjacent focusable elements share the same label.

---

## Android TalkBack (Requirement 17.1.2c)

### Setup

1. On device: Settings > Accessibility > TalkBack > Turn On.
2. Build and install: `npx react-native run-android --device`.
3. Navigate with single-finger swipe right/left. Double-tap to activate.
4. Explore by touch: drag finger to hear elements under finger.

### Test Cases

| # | Screen | Action | Expected TalkBack announcement |
|---|--------|--------|----------------------------------|
| 1 | Home | Focus on "Play" button | "Play, button, double-tap to activate" |
| 2 | Home | Focus on bottom nav tabs | "Home, tab, 1 of 4" |
| 3 | Game | Ring placed on correct peg | Announcement via `AccessibilityInfo.announceForAccessibility` heard within 1 s |
| 4 | Game | Timer at 10 s | "10 seconds remaining" announced |
| 5 | Game | Win | "Puzzle solved" announcement |
| 6 | Game | Loss | "Time's up" announcement |
| 7 | Settings | Color-blind preset | Each RadioButton/Picker option read with value |
| 8 | Settings | Reduced motion toggle | State change announced ("on"/"off") |
| 9 | Pause overlay | Buttons | All buttons reachable and labeled |
| 10 | Collection screen | Ring grid items | Each item labeled with ring type and status |

### Pass Criteria

- All pass criteria from VoiceOver section apply.
- `importantForAccessibility` set correctly on purely decorative views (set to `'no'`).
- `accessibilityRole` present on all interactive controls.
- Linear focus order matches visual top-to-bottom, left-to-right layout.

---

## Color-Blind Mode Visual Check (Requirement 17.1.2b / 54.3)

1. Open Settings > Accessibility > Color-Blind Preset.
2. Cycle through: Deuteranopia, Protanopia, Tritanopia, None.
3. Return to a puzzle with all 6 ring colors visible.
4. Verify:
   - All 6 rings are visually distinguishable without relying on hue alone.
   - Each ring shows its unique pattern (solid, stripes, dots, checkers, crosshatch, waves).
   - VoiceOver/TalkBack speaks the pattern-based label (e.g. "Orange-stripe ring") not the raw color.

---

## Reduced Motion Check (Requirement 34.6)

1. Enable either: iOS Settings > Accessibility > Motion > Reduce Motion, OR in-app Settings > Reduce Motion Override.
2. Navigate to game screen and place a ring.
3. Verify: ring placement uses opacity fade only — no translate/scale motion.
4. Disable reduced motion, repeat: ring placement uses full spring animation.

---

## Motor Accessibility Mode Check (Requirement 40.4)

1. Enable Settings > Accessibility > Motor Accessibility Mode.
2. Open a puzzle.
3. Verify: all touch targets are visibly larger (minimum 88 dp × 88 dp).
4. Verify: no time-sensitive gestures are required (drag targets accept tap-to-select + tap-to-place).

---

## Large Text Mode Check (Requirement 54.2)

1. Enable Settings > Accessibility > Large Text.
2. Navigate all primary screens (Home, Game, Settings, Collection).
3. Verify: no text is clipped or overflows its container.
4. Verify: font sizes scale up uniformly without breaking layout.

---

## Sign-Off

| Tester | Device | OS Version | Date | Pass/Fail |
|--------|--------|------------|------|-----------|
|        |        |            |      |           |
|        |        |            |      |           |
