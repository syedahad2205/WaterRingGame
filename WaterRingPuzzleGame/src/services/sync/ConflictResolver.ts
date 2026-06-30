export type ConflictStrategy =
  | 'server_wins'
  | 'client_wins'
  | 'max_value'
  | 'latest_timestamp'
  | 'merge_array';

export interface FieldConflictRule {
  field: string;
  strategy: ConflictStrategy;
}

export const USER_CONFLICT_RULES: FieldConflictRule[] = [
  { field: 'userId',       strategy: 'server_wins' },
  { field: 'displayName',  strategy: 'client_wins' },
  { field: 'username',     strategy: 'client_wins' },
  { field: 'avatarUrl',    strategy: 'client_wins' },
  { field: 'country',      strategy: 'client_wins' },
  { field: 'level',        strategy: 'max_value' },
  { field: 'xp',           strategy: 'max_value' },
  { field: 'prestige',     strategy: 'max_value' },
  { field: 'coinBalance',  strategy: 'server_wins' },
  { field: 'totalStars',   strategy: 'max_value' },
  { field: 'createdAt',    strategy: 'server_wins' },
  { field: 'updatedAt',    strategy: 'latest_timestamp' },
];

export interface ConflictResolution {
  resolved: Record<string, unknown>;
  conflictedFields: string[];
  appliedRules: Record<string, ConflictStrategy>;
}

export class ConflictResolver {
  // eslint-disable-next-line max-lines-per-function
  resolve(
    local: Record<string, unknown>,
    remote: Record<string, unknown>,
    rules: FieldConflictRule[],
  ): ConflictResolution {
    const resolved: Record<string, unknown> = { ...remote };
    const conflictedFields: string[] = [];
    const appliedRules: Record<string, ConflictStrategy> = {};

    const ruleMap = new Map<string, ConflictStrategy>(
      rules.map(r => [r.field, r.strategy]),
    );

    const allFields = new Set([
      ...Object.keys(local),
      ...Object.keys(remote),
    ]);

    for (const field of allFields) {
      const localVal = local[field];
      const remoteVal = remote[field];

      if (localVal === remoteVal) continue;

      const strategy = ruleMap.get(field) ?? 'server_wins';
      const isConflict =
        localVal !== undefined && remoteVal !== undefined && localVal !== remoteVal;

      if (isConflict) {
        conflictedFields.push(field);
        appliedRules[field] = strategy;
      }

      switch (strategy) {
        case 'server_wins':
          resolved[field] = remoteVal ?? localVal;
          break;

        case 'client_wins':
          resolved[field] = localVal ?? remoteVal;
          break;

        case 'max_value':
          resolved[field] = this.resolveMaxValue(localVal, remoteVal);
          break;

        case 'latest_timestamp':
          resolved[field] = this.resolveLatestTimestamp(local, remote, field);
          break;

        case 'merge_array':
          resolved[field] = this.resolveMergeArray(localVal, remoteVal);
          break;
      }
    }

    return { resolved, conflictedFields, appliedRules };
  }

  private resolveMaxValue(
    localVal: unknown,
    remoteVal: unknown,
  ): unknown {
    const l = typeof localVal === 'number' ? localVal : Number(localVal);
    const r = typeof remoteVal === 'number' ? remoteVal : Number(remoteVal);
    if (isNaN(l) && isNaN(r)) return remoteVal;
    if (isNaN(l)) return remoteVal;
    if (isNaN(r)) return localVal;
    return Math.max(l, r);
  }

  private resolveLatestTimestamp(
    local: Record<string, unknown>,
    remote: Record<string, unknown>,
    field: string,
  ): unknown {
    const l = Number(local[field]);
    const r = Number(remote[field]);
    if (isNaN(l) && isNaN(r)) return remote[field];
    if (isNaN(l)) return remote[field];
    if (isNaN(r)) return local[field];
    return l > r ? local[field] : remote[field];
  }

  private resolveMergeArray(
    localVal: unknown,
    remoteVal: unknown,
  ): unknown[] {
    const l = Array.isArray(localVal) ? localVal : [];
    const r = Array.isArray(remoteVal) ? remoteVal : [];
    const seen = new Set<unknown>();
    const merged: unknown[] = [];
    for (const item of [...l, ...r]) {
      const key =
        typeof item === 'object' && item !== null
          ? JSON.stringify(item)
          : item;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(item);
      }
    }
    return merged;
  }
}

export const conflictResolver = new ConflictResolver();
