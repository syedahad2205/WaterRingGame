import {
  getRingVisual,
  getAllRingVisuals,
  RING_COLOR_IDS,
} from '../../src/utils/colorBlindPalette';

describe('Color-blind palette (task 17.2.1a)', () => {
  const presets = ['none', 'deuteranopia', 'protanopia', 'tritanopia'] as const;

  it('all 6 ring colors are defined in all 4 presets', () => {
    presets.forEach(preset => {
      RING_COLOR_IDS.forEach(colorId => {
        const visual = getRingVisual(colorId, preset);
        expect(visual).toBeDefined();
        expect(visual.fill).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(visual.stroke).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(visual.pattern).toBeTruthy();
        expect(visual.ariaLabel).toBeTruthy();
      });
    });
  });

  it('all 6 ring colors have unique patterns in each preset', () => {
    presets.forEach(preset => {
      const visuals = getAllRingVisuals(preset);
      const patterns = RING_COLOR_IDS.map(id => visuals[id].pattern);
      const uniquePatterns = new Set(patterns);
      expect(uniquePatterns.size).toBe(6); // each color has a unique pattern
    });
  });

  it('all 6 ring colors have unique fills in deuteranopia', () => {
    const visuals = getAllRingVisuals('deuteranopia');
    const fills = RING_COLOR_IDS.map(id => visuals[id].fill);
    const uniqueFills = new Set(fills);
    expect(uniqueFills.size).toBe(6);
  });

  it('getRingVisual falls back to base for unknown preset', () => {
    const visual = getRingVisual('blue', 'unknown' as any);
    expect(visual).toBeDefined();
    expect(visual.fill).toBeTruthy();
  });

  it('all aria labels are non-empty strings for screen readers', () => {
    presets.forEach(preset => {
      RING_COLOR_IDS.forEach(colorId => {
        const visual = getRingVisual(colorId, preset);
        expect(typeof visual.ariaLabel).toBe('string');
        expect(visual.ariaLabel.length).toBeGreaterThan(0);
      });
    });
  });

  it('RING_COLOR_IDS has exactly 6 colors', () => {
    expect(RING_COLOR_IDS.length).toBe(6);
  });
});
