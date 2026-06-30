import * as fc from 'fast-check';

/**
 * Smoke property test — confirms fast-check is correctly installed and configured.
 *
 * Validates: Requirements 46.1
 */
describe('fast-check smoke test', () => {
  it('identity addition: n + 0 === n for all integers', () => {
    fc.assert(
      fc.property(fc.integer(), (n: number) => n + 0 === n),
    );
  });
});
