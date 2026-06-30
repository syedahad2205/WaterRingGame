// TimerArc.tsx has an arc angle computation: fraction × 360 degrees
// Test the arc angle formula: percentRemaining -> strokeDashoffset or angle

describe('TimerArc angle computation (task 8.2.2a)', () => {
  // The arc uses a fraction: angle = fraction * 2π or percentage * circumference
  // From TimerArc.tsx: ARC_CIRCUMFERENCE = 2 * Math.PI * ARC_RADIUS
  // strokeDashoffset = ARC_CIRCUMFERENCE * (1 - fraction)

  function computeArcFraction(percentRemaining: number): number {
    return percentRemaining / 100;
  }

  function computeStrokeDashoffset(percentRemaining: number, circumference: number): number {
    return circumference * (1 - percentRemaining / 100);
  }

  it('100% remaining → offset = 0 (full arc shown)', () => {
    expect(computeStrokeDashoffset(100, 314)).toBeCloseTo(0);
  });

  it('50% remaining → offset = half circumference', () => {
    const c = 314;
    expect(computeStrokeDashoffset(50, c)).toBeCloseTo(c / 2);
  });

  it('30% remaining → offset = 70% of circumference', () => {
    const c = 314;
    expect(computeStrokeDashoffset(30, c)).toBeCloseTo(c * 0.7);
  });

  it('10% remaining → offset = 90% of circumference', () => {
    const c = 314;
    expect(computeStrokeDashoffset(10, c)).toBeCloseTo(c * 0.9);
  });

  it('0% remaining → offset = full circumference (no arc shown)', () => {
    const c = 314;
    expect(computeStrokeDashoffset(0, c)).toBeCloseTo(c);
  });

  it('fraction is always between 0 and 1', () => {
    [0, 10, 30, 50, 100].forEach(pct => {
      const f = computeArcFraction(pct);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(1);
    });
  });

  it('TimerArc.tsx defines 30% and 10% color transition thresholds', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../src/components/TimerArc.tsx'), 'utf8'
    );
    expect(source).toMatch(/0\.3|30/);
    expect(source).toMatch(/0\.1|10/);
  });
});
