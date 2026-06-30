# Firebase Setup Guide

This document describes how to connect the Water Ring Puzzle Game to a real Firebase project.

The Firebase SDK packages are already installed. You only need to create the Firebase project and replace the placeholder config files.

---

## Prerequisites

- A Google account
- [Node.js 18+](https://nodejs.org/)
- Firebase CLI: `npm install -g firebase-tools`

---

## Step 1 — Create Firebase Projects

Create two separate Firebase projects: one for development and one for production.

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project**
3. Name it `WaterRingPuzzleGame-dev` (repeat for `WaterRingPuzzleGame-prod`)
4. Enable Google Analytics when prompted

---

## Step 2 — Enable Required Firebase Services

For **each project** (dev and prod), enable the following services in the Firebase console:

| Service | Console Location |
|---|---|
| Authentication | Build → Authentication → Get started |
| Firestore | Build → Firestore Database → Create database |
| Cloud Functions | Build → Functions → Get started |
| Storage | Build → Storage → Get started |
| Remote Config | Run → Remote Config → Get started |
| Analytics | Already enabled if you opted in during project creation |
| Crashlytics | Run → Crashlytics → Get started |

For **Authentication**, enable the following sign-in providers:
- Anonymous (required for guest play)
- Email/Password (for account creation)
- Apple (iOS — required for App Store)
- Google (for cross-platform login)

---

## Step 3 — Add Android App

1. In your Firebase project, go to **Project Settings** (gear icon)
2. Click **Add app** → Android
3. Enter the Android package name: `com.waterringpuzzlegame`
4. (Optional) Enter app nickname: `WaterRingPuzzleGame Android`
5. Click **Register app**
6. Download `google-services.json`
7. **Replace** the placeholder `google-services.json` in the project root with the real one
8. Once the Android native directory exists, copy it to: `android/app/google-services.json`

---

## Step 4 — Add iOS App

1. In your Firebase project, go to **Project Settings**
2. Click **Add app** → iOS
3. Enter the iOS bundle ID: `com.waterringpuzzlegame`
4. (Optional) Enter app nickname: `WaterRingPuzzleGame iOS`
5. Click **Register app**
6. Download `GoogleService-Info.plist`
7. **Replace** the placeholder `GoogleService-Info.plist` in the project root with the real one
8. Once the iOS native directory exists, copy it to: `ios/WaterRingPuzzleGame/GoogleService-Info.plist`

> **Important for iOS:** The `GoogleService-Info.plist` must be added to the Xcode project target (not just the filesystem). Open Xcode, right-click the `WaterRingPuzzleGame` folder, and choose **Add Files to "WaterRingPuzzleGame"**.

---

## Step 5 — Update `.firebaserc`

Replace the placeholder project IDs in `.firebaserc`:

```json
{
  "projects": {
    "default": "your-dev-project-id",
    "dev": "your-dev-project-id",
    "prod": "your-prod-project-id"
  }
}
```

You can find your project ID in **Project Settings → General → Project ID**.

---

## Step 6 — Android Native Configuration

Once the Android directory exists (after running `npx react-native init` or ejecting), add Google Services to Gradle:

**`android/build.gradle`** — add to `buildscript.dependencies`:
```groovy
classpath 'com.google.gms:google-services:4.4.1'
classpath 'com.google.firebase:firebase-crashlytics-gradle:2.9.9'
```

**`android/app/build.gradle`** — add at the bottom:
```groovy
apply plugin: 'com.google.gms.google-services'
apply plugin: 'com.google.firebase.crashlytics'
```

---

## Step 7 — iOS Native Configuration

Once the iOS directory exists, install CocoaPods dependencies:

```bash
cd ios && pod install
```

The `@react-native-firebase` packages handle most native linking automatically via auto-linking. No manual `Podfile` changes are required beyond running `pod install`.

---

## Step 8 — Configure Remote Config Parameters

After creating the Firebase project, add the following Remote Config parameters in the Firebase console (**Run → Remote Config → Add parameter**):

| Parameter Key | Type | Default Value | Description |
|---|---|---|---|
| `salt_global` | String | `water-ring-v1` | PRNG salt for global challenges |
| `salt_daily` | String | `daily-v1` | PRNG salt for daily challenges |
| `base_continue_cost` | Number | `50` | Coin cost for a continue |
| `base_water_force` | Number | `0.003` | Water force multiplier |
| `max_daily_ad_views` | Number | `5` | Max ad views per day |
| `event_windows` | JSON | `{}` | Live event configuration |
| `quality_score_threshold` | Number | `0.65` | Min quality score for challenges |
| `near_miss_bonus_seconds` | Number | `3` | Bonus time for near-miss events |
| `max_active_bubbles` | Number | `50` | Performance cap for bubble particles |
| `max_active_ripples` | Number | `20` | Performance cap for ripple particles |

The hardcoded fallback defaults live in `src/constants/remoteConfigDefaults.ts`.

---

## Step 9 — Firebase Emulator (Local Development)

For local development and CI, use the Firebase Emulator Suite instead of the real Firebase project:

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Log in
firebase login

# Start all emulators
npm run emulators
# or directly:
firebase emulators:start
```

Emulator ports (configured in `firebase.json`):

| Service | Port |
|---|---|
| Auth | 9099 |
| Firestore | 8080 |
| Functions | 5001 |
| Storage | 9199 |
| Hosting | 5000 |
| Emulator UI | 4000 |

Add `"emulators"` npm script to `package.json`:
```json
"emulators": "firebase emulators:start"
```

To connect the app to the emulator during development, configure your Firebase services to point to `localhost` with the above ports. See task 1.5.2 for the emulator connection code.

---

## Step 10 — Verify Setup

After completing the above steps, verify your setup:

```bash
# TypeScript should compile with no errors
npm run tsc

# Firebase emulators should start
firebase emulators:start

# (After native setup) iOS build
npx react-native run-ios

# (After native setup) Android build
npx react-native run-android
```

---

## Important Notes

- **Never commit real `google-services.json` or `GoogleService-Info.plist`** — add them to `.gitignore`
- The placeholder files checked into the repo are safe (they contain no real credentials)
- Use the **dev** Firebase project for all local development and CI
- Use the **prod** Firebase project only for App Store / Play Store releases
- Firestore security rules are currently set to **deny all** (placeholder) — implement proper rules in task 1.5.4

---

## Installed Firebase Packages

The following `@react-native-firebase` packages are already installed:

| Package | Purpose |
|---|---|
| `@react-native-firebase/app` | Core Firebase SDK (required by all other packages) |
| `@react-native-firebase/auth` | Authentication (anonymous, email, social) |
| `@react-native-firebase/firestore` | Cloud Firestore database |
| `@react-native-firebase/analytics` | Firebase Analytics event tracking |
| `@react-native-firebase/crashlytics` | Crash reporting and non-fatal errors |
| `@react-native-firebase/remote-config` | Live parameter configuration |
| `@react-native-firebase/storage` | Cloud Storage (replay uploads) |
| `@react-native-firebase/functions` | Cloud Functions callable client |
