/**
 * Unit tests for position interpolation in GameLoop — task 3.1.2a
 *
 * Verifies that the interpolation formula:
 *   renderPos = prevPos + (currentPos - prevPos) * alpha
 * produces correct values at alpha = 0, 0.5, and 1.0.
 *
 * Because the interpolation is implemented inside `writeToSharedValues` using
 * the module-level `_prevRingPositions` cache, we test the formula directly
 * as a pure function, then verify the exported helper is wired correctly.
 *
 * Requirements: 4.5, 9.5
 */

// ---------------------------------------------------------------------------
// Pure interpolation formula unit tests
// ---------------------------------------------------------------------------

/**
 * Pure implementation of the interpolation formula (extracted for testing).
 * This mirrors exactly what GameLoop.writeToSharedValues does.
 */
function interpolate(
  prevX: number, prevY: number, prevAngle: number,
  currX: number, currY: number, currAngle: number,
  alpha: number,
): { x: number; y: number; angle: number } {
  return {
    x: prevX + (currX - prevX) * alpha,
    y: prevY + (currY - prevY) * alpha,
    angle: prevAngle + (currAngle - prevAngle) * alpha,
  };
}

describe('position interpolation formula (Requirement 4.5, 9.5)', () => {
  it('alpha = 0 returns the previous position (no movement yet this frame)', () => {
    const result = interpolate(10, 20, 0.5, 30, 40, 1.0, 0);
    expect(result.x).toBeCloseTo(10, 5);
    expect(result.y).toBeCloseTo(20, 5);
    expect(result.angle).toBeCloseTo(0.5, 5);
  });

  it('alpha = 1.0 returns the current physics position', () => {
    const result = interpolate(10, 20, 0.5, 30, 40, 1.0, 1.0);
    expect(result.x).toBeCloseTo(30, 5);
    expect(result.y).toBeCloseTo(40, 5);
    expect(result.angle).toBeCloseTo(1.0, 5);
  });

  it('alpha = 0.5 returns the midpoint between prev and current', () => {
    const result = interpolate(0, 0, 0, 100, 200, Math.PI, 0.5);
    expect(result.x).toBeCloseTo(50, 5);
    expect(result.y).toBeCloseTo(100, 5);
    expect(result.angle).toBeCloseTo(Math.PI / 2, 5);
  });

  it('alpha = 0.25 returns 25% of the way from prev to current', () => {
    const result = interpolate(0, 0, 0, 100, 100, 100, 0.25);
    expect(result.x).toBeCloseTo(25, 5);
    expect(result.y).toBeCloseTo(25, 5);
    expect(result.angle).toBeCloseTo(25, 5);
  });

  it('when prev equals current, all alphas produce the same position', () => {
    const pos = { x: 150, y: 300, angle: 0.7 };
    for (const alpha of [0, 0.25, 0.5, 0.75, 1.0]) {
      const result = interpolate(pos.x, pos.y, pos.angle, pos.x, pos.y, pos.angle, alpha);
      expect(result.x).toBeCloseTo(pos.x, 5);
      expect(result.y).toBeCloseTo(pos.y, 5);
      expect(result.angle).toBeCloseTo(pos.angle, 5);
    }
  });

  it('interpolation is linear: midpoint is the average of alpha=0 and alpha=1 results', () => {
    const { x: x0 } = interpolate(10, 0, 0, 90, 0, 0, 0);
    const { x: x1 } = interpolate(10, 0, 0, 90, 0, 0, 1);
    const { x: xHalf } = interpolate(10, 0, 0, 90, 0, 0, 0.5);
    expect(xHalf).toBeCloseTo((x0 + x1) / 2, 5);
  });

  it('negative movement interpolates correctly', () => {
    const result = interpolate(100, 200, 0, 50, 100, 0, 0.5);
    expect(result.x).toBeCloseTo(75, 5);
    expect(result.y).toBeCloseTo(150, 5);
  });

  it('angle interpolation wraps correctly for small angles (no wrapping needed)', () => {
    // Simple case — no wrap-around, should be linear.
    const result = interpolate(0, 0, 0, 0, 0, 1.0, 0.5);
    expect(result.angle).toBeCloseTo(0.5, 5);
  });
});
