/**
 * Smoke test — confirms the Jest + TypeScript test setup is working.
 * Requirements: 45.1
 */
describe('Jest setup smoke test', () => {
  it('should perform basic arithmetic correctly', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle TypeScript types', () => {
    const add = (a: number, b: number): number => a + b;
    expect(add(3, 4)).toBe(7);
  });
});
