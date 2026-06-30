/**
 * Unit tests for MMKVStorage.ts — CRC32 checksum storage layer.
 *
 * Tests cover:
 *   - CRC32 is written and verified correctly (round-trip)
 *   - Corrupted data returns null and removes the corrupt entry
 *   - The `createSliceMMKVStorage` factory provides isolation per slice ID
 *   - Shared `MMKVStorage` adapter (getItem / setItem / removeItem)
 *
 * Requirements: 18.5 (CRC32 checksum), 18.2 (per-slice isolation)
 *
 * react-native-mmkv requires native binaries; we mock it here so tests run
 * in the Node.js Jest environment.
 */

// ---------------------------------------------------------------------------
// Mock react-native-mmkv before any imports
// ---------------------------------------------------------------------------

/** In-memory backing store keyed by MMKV instance id, then by key. */
const mockStores: Map<string, Map<string, string>> = new Map();

/** Retrieve or create the in-memory map for a given MMKV instance id. */
function mockGetStore(id: string): Map<string, string> {
  if (!mockStores.has(id)) {
    mockStores.set(id, new Map());
  }
  return mockStores.get(id) as Map<string, string>;
}

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(({ id }: { id?: string } = {}) => {
    const instanceId = id ?? '__default__';
    return {
      getString: (key: string): string | undefined =>
        mockGetStore(instanceId).get(key),
      set: (key: string, value: string): void => {
        mockGetStore(instanceId).set(key, value);
      },
      delete: (key: string): void => {
        mockGetStore(instanceId).delete(key);
      },
    };
  }),
}));

// ---------------------------------------------------------------------------
// Imports (after mock is registered)
// ---------------------------------------------------------------------------

import * as MMKVStorageModule from '../../src/services/storage/MMKVStorage';

const { MMKVStorage, createSliceMMKVStorage, getItem, setItem, removeItem } =
  MMKVStorageModule as typeof MMKVStorageModule & {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
  };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Clear all mock stores between tests. */
beforeEach(() => {
  mockStores.clear();
});

// ---------------------------------------------------------------------------
// Shared MMKVStorage adapter (getItem / setItem / removeItem)
// ---------------------------------------------------------------------------

describe('MMKVStorage — shared adapter', () => {
  it('setItem stores a value, getItem retrieves it correctly (round-trip)', () => {
    MMKVStorage.setItem('test_key', 'hello world');
    const result = MMKVStorage.getItem('test_key');
    expect(result).toBe('hello world');
  });

  it('getItem returns null for a key that has never been written', () => {
    const result = MMKVStorage.getItem('nonexistent_key');
    expect(result).toBeNull();
  });

  it('removeItem deletes the entry so subsequent getItem returns null', () => {
    MMKVStorage.setItem('to_delete', 'some value');
    expect(MMKVStorage.getItem('to_delete')).toBe('some value');

    MMKVStorage.removeItem('to_delete');
    expect(MMKVStorage.getItem('to_delete')).toBeNull();
  });

  it('round-trips JSON-serialised objects correctly', () => {
    const payload = JSON.stringify({ foo: 'bar', count: 42, nested: { x: true } });
    MMKVStorage.setItem('json_key', payload);
    const retrieved = MMKVStorage.getItem('json_key');
    expect(retrieved).toBe(payload);
    expect(JSON.parse(retrieved as string)).toEqual({ foo: 'bar', count: 42, nested: { x: true } });
  });

  it('round-trips an empty string correctly', () => {
    MMKVStorage.setItem('empty_key', '');
    expect(MMKVStorage.getItem('empty_key')).toBe('');
  });

  it('round-trips a string with special characters', () => {
    const special = '{"value":"hello\nworld\ttab\\backslash\\"quote"}';
    MMKVStorage.setItem('special_key', special);
    expect(MMKVStorage.getItem('special_key')).toBe(special);
  });
});

// ---------------------------------------------------------------------------
// CRC32 checksum integrity
// ---------------------------------------------------------------------------

describe('MMKVStorage — CRC32 checksum integrity', () => {
  it('verifies CRC32 on read — valid data passes without modification', () => {
    MMKVStorage.setItem('crc_key', 'some data');
    // If checksum passes, we get back the original value.
    expect(MMKVStorage.getItem('crc_key')).toBe('some data');
  });

  it('detects corruption: tampered checksum returns null and removes entry', () => {
    MMKVStorage.setItem('corrupt_key', 'valid data');

    // Directly corrupt the raw MMKV entry — change the checksum field.
    // Access the underlying shared MMKV mock via the exported `mmkv` instance.
    const rawEntry = MMKVStorageModule.mmkv.getString('corrupt_key');
    expect(rawEntry).toBeDefined();

    const parsed = JSON.parse(rawEntry as string) as { value: string; checksum: number };
    // Flip the checksum to a clearly wrong value.
    const tampered = JSON.stringify({ value: parsed.value, checksum: parsed.checksum ^ 0xdeadbeef });
    MMKVStorageModule.mmkv.set('corrupt_key', tampered);

    // Now getItem should detect the mismatch and return null.
    const result = MMKVStorage.getItem('corrupt_key');
    expect(result).toBeNull();

    // The corrupt entry must be removed from storage.
    expect(MMKVStorageModule.mmkv.getString('corrupt_key')).toBeUndefined();
  });

  it('detects corruption: tampered value with original checksum returns null', () => {
    MMKVStorage.setItem('tampered_value_key', 'original value');

    const rawEntry = MMKVStorageModule.mmkv.getString('tampered_value_key');
    const parsed = JSON.parse(rawEntry as string) as { value: string; checksum: number };

    // Change the value but leave the checksum pointing to the original.
    const tampered = JSON.stringify({ value: 'maliciously modified value', checksum: parsed.checksum });
    MMKVStorageModule.mmkv.set('tampered_value_key', tampered);

    expect(MMKVStorage.getItem('tampered_value_key')).toBeNull();
  });

  it('detects corruption: invalid JSON stored raw returns null and removes entry', () => {
    // Write garbage directly to the shared mmkv instance.
    MMKVStorageModule.mmkv.set('malformed_key', 'not valid json {{}}');
    expect(MMKVStorage.getItem('malformed_key')).toBeNull();
    expect(MMKVStorageModule.mmkv.getString('malformed_key')).toBeUndefined();
  });

  it('detects corruption: missing checksum field returns null', () => {
    MMKVStorageModule.mmkv.set('missing_checksum', JSON.stringify({ value: 'some data' }));
    expect(MMKVStorage.getItem('missing_checksum')).toBeNull();
  });

  it('detects corruption: missing value field returns null', () => {
    MMKVStorageModule.mmkv.set('missing_value', JSON.stringify({ checksum: 12345 }));
    expect(MMKVStorage.getItem('missing_value')).toBeNull();
  });

  it('overwrites an existing key with a new value (new checksum applied)', () => {
    MMKVStorage.setItem('overwrite_key', 'first value');
    MMKVStorage.setItem('overwrite_key', 'second value');
    expect(MMKVStorage.getItem('overwrite_key')).toBe('second value');
  });
});

// ---------------------------------------------------------------------------
// createSliceMMKVStorage — per-slice isolated instances
// ---------------------------------------------------------------------------

describe('createSliceMMKVStorage — per-slice isolation', () => {
  it('round-trip persistence works for a single slice', () => {
    const storage = createSliceMMKVStorage('slice_a');
    storage.setItem('slice_a', 'slice_a_value');
    expect(storage.getItem('slice_a')).toBe('slice_a_value');
  });

  it('two slices with different IDs are isolated — writes in one do not affect the other', () => {
    const storageA = createSliceMMKVStorage('isolated_slice_a');
    const storageB = createSliceMMKVStorage('isolated_slice_b');

    storageA.setItem('key', 'value_from_a');
    storageB.setItem('key', 'value_from_b');

    expect(storageA.getItem('key')).toBe('value_from_a');
    expect(storageB.getItem('key')).toBe('value_from_b');
  });

  it('two calls with the same slice ID share the same underlying storage', () => {
    const storage1 = createSliceMMKVStorage('shared_slice');
    const storage2 = createSliceMMKVStorage('shared_slice');

    storage1.setItem('shared_key', 'written_by_first_handle');
    // Both handles resolve to the same MMKV instance, so storage2 reads what storage1 wrote.
    expect(storage2.getItem('shared_key')).toBe('written_by_first_handle');
  });

  it('removeItem deletes the entry from the slice', () => {
    const storage = createSliceMMKVStorage('remove_test_slice');
    storage.setItem('k', 'v');
    expect(storage.getItem('k')).toBe('v');
    storage.removeItem('k');
    expect(storage.getItem('k')).toBeNull();
  });

  it('CRC32 corruption detection works per-slice — tampered value returns null', () => {
    const sliceId = 'crc_slice';
    const storage = createSliceMMKVStorage(sliceId);
    storage.setItem('data_key', 'important data');

    // Corrupt the raw entry in this slice's MMKV instance.
    const sliceStore = mockGetStore(sliceId);
    const rawEntry = sliceStore.get('data_key');
    expect(rawEntry).toBeDefined();
    const parsed = JSON.parse(rawEntry as string) as { value: string; checksum: number };
    sliceStore.set('data_key', JSON.stringify({ value: 'corrupted data', checksum: parsed.checksum }));

    // Slice storage should detect the mismatch and return null.
    expect(storage.getItem('data_key')).toBeNull();
  });

  it('CRC32 round-trip works for Zustand-serialised JSON state', () => {
    const storage = createSliceMMKVStorage('zustand_slice');
    const zustandState = JSON.stringify({
      state: { coinBalance: 1000, transactionHistory: [], dailyAdViewCount: 3 },
      version: 0,
    });

    storage.setItem('zustand_slice', zustandState);
    const retrieved = storage.getItem('zustand_slice');
    expect(retrieved).toBe(zustandState);

    // Verify round-trip integrity of parsed state.
    const parsed = JSON.parse(retrieved as string) as {
      state: { coinBalance: number; dailyAdViewCount: number };
    };
    expect(parsed.state.coinBalance).toBe(1000);
    expect(parsed.state.dailyAdViewCount).toBe(3);
  });
});
