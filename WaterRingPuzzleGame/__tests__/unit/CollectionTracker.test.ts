/**
 * CollectionTracker.test.ts — task 11.3.1a
 * Tests CollectionTracker and COLLECTION_DEFINITIONS.
 */

import {
  CollectionTracker,
  COLLECTION_DEFINITIONS,
} from '../../src/features/progression/CollectionTracker';

describe('CollectionTracker', () => {
  let tracker: CollectionTracker;

  beforeEach(() => {
    tracker = new CollectionTracker();
  });

  describe('COLLECTION_DEFINITIONS', () => {
    it('has exactly 20 entries', () => {
      expect(COLLECTION_DEFINITIONS.length).toBe(20);
    });

    it('each collection has required fields', () => {
      for (const col of COLLECTION_DEFINITIONS) {
        expect(col.id).toBeTruthy();
        expect(col.name).toBeTruthy();
        expect(Array.isArray(col.itemIds)).toBe(true);
        expect(col.itemIds.length).toBeGreaterThan(0);
        expect(col.rewardCoins).toBeGreaterThan(0);
        expect(col.rewardXP).toBeGreaterThan(0);
      }
    });

    it('all collection ids are unique', () => {
      const ids = COLLECTION_DEFINITIONS.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('isCollectionComplete', () => {
    it('returns false when no items owned', () => {
      const col = COLLECTION_DEFINITIONS[0];
      expect(tracker.isCollectionComplete(col.id, [])).toBe(false);
    });

    it('returns true when all items in collection are owned', () => {
      const col = COLLECTION_DEFINITIONS[0];
      expect(tracker.isCollectionComplete(col.id, col.itemIds)).toBe(true);
    });

    it('returns false when only some items owned', () => {
      const col = COLLECTION_DEFINITIONS[0];
      const partial = col.itemIds.slice(0, col.itemIds.length - 1);
      expect(tracker.isCollectionComplete(col.id, partial)).toBe(false);
    });

    it('returns false for unknown collection id', () => {
      expect(tracker.isCollectionComplete('nonexistent_set', ['any_item'])).toBe(false);
    });
  });

  describe('getCompletionStatus', () => {
    it('returns array with all collections when no items owned', () => {
      const status = tracker.getCompletionStatus([]);
      expect(status.length).toBe(COLLECTION_DEFINITIONS.length);
    });

    it('all ownedCount = 0 when no items owned', () => {
      const status = tracker.getCompletionStatus([]);
      for (const s of status) {
        expect(s.ownedCount).toBe(0);
        expect(s.complete).toBe(false);
      }
    });

    it('marks complete correctly when all items provided', () => {
      const col = COLLECTION_DEFINITIONS[0];
      const status = tracker.getCompletionStatus(col.itemIds);
      const s = status.find((st) => st.collectionId === col.id);
      expect(s?.complete).toBe(true);
      expect(s?.ownedCount).toBe(col.itemIds.length);
    });
  });

  describe('getTotalCompletionPercent', () => {
    it('returns 0 when no items owned', () => {
      expect(tracker.getTotalCompletionPercent([])).toBe(0);
    });

    it('returns 100 when all items owned', () => {
      const allItems = COLLECTION_DEFINITIONS.flatMap((c) => c.itemIds);
      expect(tracker.getTotalCompletionPercent(allItems)).toBe(100);
    });

    it('returns partial percent for partial completion', () => {
      const col = COLLECTION_DEFINITIONS[0];
      const pct = tracker.getTotalCompletionPercent(col.itemIds);
      expect(pct).toBeGreaterThan(0);
      expect(pct).toBeLessThan(100);
    });
  });

  describe('checkNewCompletions', () => {
    it('returns empty array when nothing newly completed', () => {
      const result = tracker.checkNewCompletions([], []);
      expect(result).toEqual([]);
    });

    it('returns newly completed collection definitions', () => {
      const col = COLLECTION_DEFINITIONS[0];
      const result = tracker.checkNewCompletions([], col.itemIds);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].id).toBe(col.id);
    });

    it('does not return collections that were already complete', () => {
      const col = COLLECTION_DEFINITIONS[0];
      const result = tracker.checkNewCompletions(col.itemIds, col.itemIds);
      expect(result.find((c) => c.id === col.id)).toBeUndefined();
    });
  });
});
