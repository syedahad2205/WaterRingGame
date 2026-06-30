/**
 * Firebase Emulator Connection Helper
 *
 * Connects Firebase services to local emulator ports when running in a
 * test or CI environment. Call `connectToEmulators()` once at app startup
 * (before any Firebase service is used) when the emulator flag is active.
 *
 * Emulator ports match firebase.json:
 *   Auth      → 9099
 *   Firestore → 8080
 *   Functions → 5001
 *   Storage   → 9199
 */

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import storage from '@react-native-firebase/storage';

const EMULATOR_HOST = 'localhost';

const EMULATOR_PORTS = {
  auth: 9099,
  firestore: 8080,
  functions: 5001,
  storage: 9199,
} as const;

/**
 * Returns true when the app is running in a test or CI context where
 * Firebase emulators should be used instead of production services.
 */
export function shouldUseEmulators(): boolean {
  // React Native exposes __DEV__ as a global boolean set to true in
  // development/test builds. Alternatively, NODE_ENV is set to 'test'
  // by Jest and most CI runners.
  return (
    (typeof __DEV__ !== 'undefined' && __DEV__ === true) ||
    process.env.NODE_ENV === 'test' ||
    process.env.USE_FIREBASE_EMULATOR === 'true'
  );
}

let emulatorsConnected = false;

/**
 * Connects all Firebase services to their local emulator counterparts.
 * Safe to call multiple times — subsequent calls are no-ops.
 *
 * Must be called before any Firebase operation is initiated.
 *
 * @example
 * // In Providers.tsx or app entry point:
 * import { connectToEmulators } from '@/services/firebase/emulatorConfig';
 * connectToEmulators();
 */
export function connectToEmulators(): void {
  if (emulatorsConnected) {
    return;
  }

  if (!shouldUseEmulators()) {
    return;
  }

  // Auth emulator
  auth().useEmulator(`http://${EMULATOR_HOST}:${EMULATOR_PORTS.auth}`);

  // Firestore emulator
  firestore().useEmulator(EMULATOR_HOST, EMULATOR_PORTS.firestore);

  // Functions emulator (region defaults to 'us-central1')
  functions().useEmulator(EMULATOR_HOST, EMULATOR_PORTS.functions);

  // Storage emulator
  storage().useEmulator(EMULATOR_HOST, EMULATOR_PORTS.storage);

  emulatorsConnected = true;

  if (__DEV__) {
    console.log(
      '[Firebase] Connected to emulators:',
      `Auth:${EMULATOR_PORTS.auth}`,
      `Firestore:${EMULATOR_PORTS.firestore}`,
      `Functions:${EMULATOR_PORTS.functions}`,
      `Storage:${EMULATOR_PORTS.storage}`,
    );
  }
}
