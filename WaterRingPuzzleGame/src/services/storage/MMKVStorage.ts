/**
 * MMKVStorage.ts
 * Zustand `persist` middleware storage adapter backed by react-native-mmkv.
 *
 * Every write stores the value alongside a CRC32 checksum:
 *   { value: string, checksum: number }
 *
 * Every read verifies the checksum. On mismatch the corrupt entry is removed,
 * Crashlytics is notified, and null is returned so the caller falls back to
 * the Firestore cloud copy (Requirement 18.5, 18.6).
 */

import { MMKV } from 'react-native-mmkv';
import { StateStorage } from 'zustand/middleware';
import * as CRC32 from 'crc-32';

// ---------------------------------------------------------------------------
// Shared MMKV instance — one instance per app, multiple keys.
// ---------------------------------------------------------------------------
export const mmkv = new MMKV();

// ---------------------------------------------------------------------------
// Per-slice MMKV instance registry — each slice gets its own MMKV instance
// (for storage isolation) but all share the CRC32 checksum logic.
// ---------------------------------------------------------------------------
const _sliceInstances: Map<string, MMKV> = new Map();

// ---------------------------------------------------------------------------
// Internal stored format
// ---------------------------------------------------------------------------
interface StoredEntry {
  value: string;
  checksum: number;
}

// ---------------------------------------------------------------------------
// CRC32 helpers
// ---------------------------------------------------------------------------

/**
 * Compute a CRC32 checksum for the given UTF-8 string.
 * Returns a signed 32-bit integer (as produced by the crc-32 library).
 */
function computeChecksum(data: string): number {
  return CRC32.str(data);
}

// ---------------------------------------------------------------------------
// Crashlytics shim — avoids a hard compile-time dependency on the Firebase
// Crashlytics module while the service layer is still being wired up.
// When Crashlytics is fully initialised the real module will be present;
// until then we fall back to console.error so no crash data is silently lost.
// ---------------------------------------------------------------------------
function logChecksumFailure(key: string, stored: number, expected: number): void {
  const message =
    `[MMKVStorage] CRC32 mismatch for key "${key}". ` +
    `stored=${stored}, computed=${expected}. Discarding corrupt data.`;

  try {
    // Dynamic require keeps the module optional — if Crashlytics is not yet
    // linked (e.g. unit-test environment) this will throw and we fall through.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const crashlytics = require('@react-native-firebase/crashlytics').default;
    crashlytics().recordError(new Error(message));
  } catch {
    // Crashlytics unavailable — log to console so the issue is still visible.
    console.error(message);
  }
}

// ---------------------------------------------------------------------------
// Core read / write helpers with checksum logic
// ---------------------------------------------------------------------------

/**
 * Write a string value to MMKV under the given key, bundling a CRC32 checksum.
 */
export function setItem(key: string, value: string): void {
  const checksum = computeChecksum(value);
  const entry: StoredEntry = { value, checksum };
  mmkv.set(key, JSON.stringify(entry));
}

/**
 * Read a string value from MMKV and verify its CRC32 checksum.
 *
 * Returns the stored string on success, or null when:
 *  - the key does not exist,
 *  - the stored JSON is malformed,
 *  - the checksum does not match the value (corruption detected).
 *
 * On checksum failure, the corrupt entry is removed and Crashlytics is notified.
 */
export function getItem(key: string): string | null {
  const raw = mmkv.getString(key);
  if (raw === undefined || raw === null) {
    return null;
  }

  let entry: StoredEntry;
  try {
    entry = JSON.parse(raw) as StoredEntry;
  } catch {
    // Stored data is not valid JSON — treat as corrupt.
    console.error(`[MMKVStorage] Failed to parse stored entry for key "${key}". Discarding.`);
    mmkv.delete(key);
    return null;
  }

  if (typeof entry.value !== 'string' || typeof entry.checksum !== 'number') {
    // Malformed entry — treat as corrupt.
    console.error(`[MMKVStorage] Malformed entry schema for key "${key}". Discarding.`);
    mmkv.delete(key);
    return null;
  }

  const expected = computeChecksum(entry.value);
  if (entry.checksum !== expected) {
    logChecksumFailure(key, entry.checksum, expected);
    mmkv.delete(key);
    return null;
  }

  return entry.value;
}

/**
 * Delete the stored entry for the given key.
 */
export function removeItem(key: string): void {
  mmkv.delete(key);
}

// ---------------------------------------------------------------------------
// Zustand StateStorage adapter
// ---------------------------------------------------------------------------

/**
 * A Zustand `StateStorage` implementation backed by MMKV with CRC32 integrity
 * checking on every read and write.
 *
 * Compatible with the `persist` middleware:
 *   persist(storeCreator, { storage: MMKVStorage })
 */
export const MMKVStorage: StateStorage = {
  getItem,
  setItem,
  removeItem,
};

// ---------------------------------------------------------------------------
// Per-slice MMKV storage factory
// ---------------------------------------------------------------------------

/**
 * Get or create a dedicated MMKV instance for the given slice ID.
 * Instances are cached so a single MMKV instance is reused across calls
 * (avoids duplicate native handles for the same ID).
 *
 * @internal — use `createSliceMMKVStorage` to obtain a StateStorage adapter.
 */
function getSliceMMKV(sliceId: string): MMKV {
  let instance = _sliceInstances.get(sliceId);
  if (!instance) {
    instance = new MMKV({ id: sliceId });
    _sliceInstances.set(sliceId, instance);
  }
  return instance;
}

/**
 * Read a string value from the given MMKV instance and verify its CRC32
 * checksum. Mirrors the top-level `getItem` but operates on a specific
 * per-slice MMKV instance rather than the shared one.
 */
function sliceGetItem(store: MMKV, key: string): string | null {
  const raw = store.getString(key);
  if (raw === undefined || raw === null) {
    return null;
  }

  let entry: StoredEntry;
  try {
    entry = JSON.parse(raw) as StoredEntry;
  } catch {
    console.error(`[MMKVStorage] Failed to parse stored entry for key "${key}". Discarding.`);
    store.delete(key);
    return null;
  }

  if (typeof entry.value !== 'string' || typeof entry.checksum !== 'number') {
    console.error(`[MMKVStorage] Malformed entry schema for key "${key}". Discarding.`);
    store.delete(key);
    return null;
  }

  const expected = computeChecksum(entry.value);
  if (entry.checksum !== expected) {
    logChecksumFailure(key, entry.checksum, expected);
    store.delete(key);
    return null;
  }

  return entry.value;
}

/**
 * Write a string value to the given MMKV instance, bundling a CRC32 checksum.
 */
function sliceSetItem(store: MMKV, key: string, value: string): void {
  const checksum = computeChecksum(value);
  const entry: StoredEntry = { value, checksum };
  store.set(key, JSON.stringify(entry));
}

/**
 * Create a Zustand `StateStorage` adapter backed by a dedicated MMKV instance
 * for the given `sliceId`.
 *
 * - Each `sliceId` gets its own MMKV namespace (storage isolation per slice).
 * - Every write is wrapped with a CRC32 checksum.
 * - Every read verifies the checksum; corrupt data is discarded and `null`
 *   is returned, triggering Zustand's default-state fallback (Requirement 18.5).
 *
 * Usage in a Zustand slice:
 * ```ts
 * import { createSliceMMKVStorage } from '../../services/storage/MMKVStorage';
 *
 * persist(storeCreator, {
 *   name: 'my_slice',
 *   storage: createJSONStorage(() => createSliceMMKVStorage('my_slice')),
 * })
 * ```
 *
 * Requirements: 18.2, 18.5
 */
export function createSliceMMKVStorage(sliceId: string): StateStorage {
  // Lazily initialise the MMKV instance so that the module can be imported in
  // a Node.js test environment without native binaries available. The lazy
  // initialisation pattern keeps all tests functional via the existing MMKV
  // mock pattern used in the test suite.
  let store: MMKV | null = null;

  const getStore = (): MMKV | null => {
    if (store) return store;
    try {
      store = getSliceMMKV(sliceId);
    } catch {
      // Native module unavailable (e.g. Jest environment).
      store = null;
    }
    return store;
  };

  return {
    getItem: (key: string): string | null => {
      const s = getStore();
      if (!s) return null;
      return sliceGetItem(s, key);
    },
    setItem: (key: string, value: string): void => {
      const s = getStore();
      if (!s) return;
      sliceSetItem(s, key, value);
    },
    removeItem: (key: string): void => {
      const s = getStore();
      s?.delete(key);
    },
  };
}
