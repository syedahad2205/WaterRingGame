# Maestro E2E Performance Tests

Maestro is a mobile UI testing framework used to measure performance baselines and automate UI flows for the Water Ring Puzzle Game.

## Installation

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

After installation, restart your terminal and verify:

```bash
maestro --version
```

## Running Flows

### Run a single flow

```bash
maestro test __tests__/maestro/cold_start.yaml
```

### Run all flows

```bash
maestro test __tests__/maestro/
```

## Available Flows

| File | Name | Purpose |
|------|------|---------|
| `cold_start.yaml` | Cold Start Measurement | Measures time from app launch (with cleared state) to HomeScreen interactive |
| `challenge_load.yaml` | Challenge Load Time | Measures time from Play tap to challenge screen visible |
| `gameplay_30s.yaml` | 30-Second Gameplay Session | Simulates ~30s of alternating left/right button taps |
| `victory_sequence.yaml` | Victory Screen Transition | Verifies the app launches and enters gameplay |

## Performance Baselines

Baseline threshold values are stored in `__tests__/perf-baselines.json`. These thresholds apply to **physical devices only** — CI emulators are significantly slower and are excluded from performance gates.

| Metric | Target | Hard Limit | Reference Device |
|--------|--------|------------|-----------------|
| Cold Start (iOS) | 3,000 ms | 5,000 ms | iPhone 11 |
| Cold Start (Android) | 3,500 ms | 5,000 ms | Pixel 5 |
| Challenge Load | 500 ms | 1,000 ms | — |
| Challenge Generation | 80 ms | 150 ms | — |
| Victory Transition | 300 ms | 500 ms | — |
| P95 Frame Time | 12 ms | 16.67 ms | iPhone 11 |
| Max Heap | 150 MB | 200 MB | — |

## Interpreting Results

Maestro prints a pass/fail result for each `assertVisible` and `tapOn` command. A flow **passes** when all assertions succeed within their timeouts.

For performance measurement, use Maestro's `--format junit` flag to capture timing data:

```bash
maestro test __tests__/maestro/cold_start.yaml --format junit --output results.xml
```

The cold start time is the wall-clock duration from `launchApp` to the first `assertVisible` succeeding. Compare against `perf-baselines.json` `coldStartMs.hardLimit`.

## Running on Physical Devices

Connect a device via USB and ensure it is recognized:

- **iOS:** `idevice_id -l` (requires libimobiledevice)
- **Android:** `adb devices`

Then run Maestro normally — it auto-detects the connected device:

```bash
maestro test __tests__/maestro/cold_start.yaml
```

For CI physical device testing, Maestro flows are run via the Fastlane `device_tests` lane defined in `Fastfile`. Performance gate failures on physical devices will block the release lane.

## Updating Baselines

Baseline values in `perf-baselines.json` are placeholders measured on reference hardware. To update them:

1. Run all flows on the reference device (iPhone 11 for iOS, Pixel 5 for Android)
2. Capture the measured timings
3. Update `perf-baselines.json` with the new `target` values (keep `hardLimit` as target × 1.67)
4. Submit a PR with the updated baselines and device measurement evidence
