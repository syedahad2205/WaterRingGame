import {
  conflictResolver,
  ConflictResolver,
  USER_CONFLICT_RULES,
  FieldConflictRule,
} from '../../src/services/sync/ConflictResolver';

describe('ConflictResolver', () => {
  it('conflictResolver is exported', () => {
    expect(conflictResolver).not.toBeNull();
    expect(conflictResolver).toBeInstanceOf(ConflictResolver);
  });

  it('USER_CONFLICT_RULES is an array', () => {
    expect(Array.isArray(USER_CONFLICT_RULES)).toBe(true);
    expect(USER_CONFLICT_RULES.length).toBeGreaterThan(0);
  });

  it('USER_CONFLICT_RULES contains entries for key fields', () => {
    const fields = USER_CONFLICT_RULES.map((r) => r.field);
    expect(fields).toContain('level');
    expect(fields).toContain('coinBalance');
    expect(fields).toContain('xp');
  });

  it('each rule has { field: string, strategy: string }', () => {
    for (const rule of USER_CONFLICT_RULES) {
      expect(typeof rule.field).toBe('string');
      expect(typeof rule.strategy).toBe('string');
    }
  });

  it('resolve returns { resolved, conflictedFields, appliedRules }', () => {
    const result = conflictResolver.resolve({ a: 1 }, { a: 2 }, [
      { field: 'a', strategy: 'server_wins' },
    ]);
    expect(result).toHaveProperty('resolved');
    expect(result).toHaveProperty('conflictedFields');
    expect(result).toHaveProperty('appliedRules');
  });

  it('max_value strategy: remote > local → resolved takes remote value', () => {
    const rules: FieldConflictRule[] = [{ field: 'coinBalance', strategy: 'max_value' }];
    const { resolved } = conflictResolver.resolve(
      { coinBalance: 100 },
      { coinBalance: 200 },
      rules,
    );
    expect(resolved.coinBalance).toBe(200);
  });

  it('max_value strategy: local > remote → takes local value', () => {
    const rules: FieldConflictRule[] = [{ field: 'coinBalance', strategy: 'max_value' }];
    const { resolved } = conflictResolver.resolve(
      { coinBalance: 300 },
      { coinBalance: 150 },
      rules,
    );
    expect(resolved.coinBalance).toBe(300);
  });

  it('client_wins strategy: local always wins', () => {
    const rules: FieldConflictRule[] = [{ field: 'displayName', strategy: 'client_wins' }];
    const { resolved } = conflictResolver.resolve(
      { displayName: 'Alice' },
      { displayName: 'ServerAlice' },
      rules,
    );
    expect(resolved.displayName).toBe('Alice');
  });

  it('server_wins strategy: remote always wins', () => {
    const rules: FieldConflictRule[] = [{ field: 'userId', strategy: 'server_wins' }];
    const { resolved } = conflictResolver.resolve(
      { userId: 'local-uid' },
      { userId: 'server-uid' },
      rules,
    );
    expect(resolved.userId).toBe('server-uid');
  });

  it('merge_array strategy: [1,2] vs [2,3] → [1,2,3] deduplicated union', () => {
    const rules: FieldConflictRule[] = [{ field: 'tags', strategy: 'merge_array' }];
    const { resolved } = conflictResolver.resolve(
      { tags: [1, 2] },
      { tags: [2, 3] },
      rules,
    );
    expect(resolved.tags).toEqual([1, 2, 3]);
  });

  it('latest_timestamp strategy: takes record with higher updatedAt', () => {
    const rules: FieldConflictRule[] = [{ field: 'updatedAt', strategy: 'latest_timestamp' }];
    const { resolved } = conflictResolver.resolve(
      { updatedAt: 2000 },
      { updatedAt: 1000 },
      rules,
    );
    expect(resolved.updatedAt).toBe(2000);
  });

  it('latest_timestamp strategy: remote wins when remote is higher', () => {
    const rules: FieldConflictRule[] = [{ field: 'updatedAt', strategy: 'latest_timestamp' }];
    const { resolved } = conflictResolver.resolve(
      { updatedAt: 500 },
      { updatedAt: 9999 },
      rules,
    );
    expect(resolved.updatedAt).toBe(9999);
  });
});
