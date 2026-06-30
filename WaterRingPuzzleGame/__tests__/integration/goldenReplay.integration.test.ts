/**
 * goldenReplay.integration.test.ts — task 6.5.2a
 *
 * CI test runner that validates all 20 golden fixture files.
 * Verifies structural correctness: required fields, ring/peg counts,
 * timer values, and requiredPairs consistency.
 */

import * as fs from 'fs';
import * as path from 'path';

const FIXTURE_DIR = path.resolve(__dirname, '../fixtures/golden');

describe('Golden replay fixtures CI validation', () => {
  const files = fs.readdirSync(FIXTURE_DIR).filter((f) => f.endsWith('.json'));

  it('has exactly 20 golden fixtures', () => {
    expect(files.length).toBe(20);
  });

  it('fixture files are named challenge_001.json through challenge_020.json', () => {
    for (let i = 1; i <= 20; i++) {
      const name = `challenge_${String(i).padStart(3, '0')}.json`;
      expect(files).toContain(name);
    }
  });

  files.forEach((file) => {
    describe(`Fixture: ${file}`, () => {
      let config: any;

      beforeAll(() => {
        config = JSON.parse(
          fs.readFileSync(path.join(FIXTURE_DIR, file), 'utf8'),
        );
      });

      it('has required top-level fields', () => {
        expect(config).toHaveProperty('challengeNumber');
        expect(config).toHaveProperty('seed');
        expect(config).toHaveProperty('rings');
        expect(config).toHaveProperty('pegs');
        expect(config).toHaveProperty('requiredPairs');
        expect(config).toHaveProperty('timer');
        expect(config).toHaveProperty('arena');
      });

      it('challengeNumber is a positive integer', () => {
        expect(typeof config.challengeNumber).toBe('number');
        expect(config.challengeNumber).toBeGreaterThanOrEqual(1);
        expect(Number.isInteger(config.challengeNumber)).toBe(true);
      });

      it('seed is a non-empty string', () => {
        expect(typeof config.seed).toBe('string');
        expect(config.seed.length).toBeGreaterThan(0);
      });

      it('has at least one ring', () => {
        expect(Array.isArray(config.rings)).toBe(true);
        expect(config.rings.length).toBeGreaterThanOrEqual(1);
      });

      it('has matching rings and pegs count', () => {
        expect(config.pegs.length).toBeGreaterThanOrEqual(config.rings.length);
        expect(config.requiredPairs.length).toBe(config.rings.length);
      });

      it('timer totalSeconds is positive', () => {
        expect(config.timer.totalSeconds).toBeGreaterThan(0);
      });

      it('arena has width and height', () => {
        expect(config.arena.width).toBe(390);
        expect(config.arena.height).toBe(844);
      });

      it('all ring IDs in requiredPairs exist in rings array', () => {
        const ringIds = new Set(config.rings.map((r: any) => r.id));
        config.requiredPairs.forEach((pair: any) => {
          expect(ringIds.has(pair.ringId)).toBe(true);
        });
      });

      it('all peg IDs in requiredPairs exist in pegs array', () => {
        const pegIds = new Set(config.pegs.map((p: any) => p.id));
        config.requiredPairs.forEach((pair: any) => {
          expect(pegIds.has(pair.pegId)).toBe(true);
        });
      });

      it('each ring has id, colorId, size, and initialPosition', () => {
        for (const ring of config.rings) {
          expect(ring).toHaveProperty('id');
          expect(ring).toHaveProperty('colorId');
          expect(ring).toHaveProperty('size');
          expect(ring).toHaveProperty('initialPosition');
          expect(ring.initialPosition).toHaveProperty('x');
          expect(ring.initialPosition).toHaveProperty('y');
        }
      });

      it('each peg has id, colorId, and position', () => {
        for (const peg of config.pegs) {
          expect(peg).toHaveProperty('id');
          expect(peg).toHaveProperty('colorId');
          expect(peg).toHaveProperty('position');
          expect(peg.position).toHaveProperty('x');
          expect(peg.position).toHaveProperty('y');
        }
      });

      it('has metadata with qualityScore and solvabilityScore', () => {
        expect(config).toHaveProperty('metadata');
        expect(config.metadata.qualityScore).toBeGreaterThan(0);
        expect(config.metadata.solvabilityScore).toBe(1.0);
      });
    });
  });

  it('challenges 1-5 have 1 ring and 90s timer', () => {
    for (let i = 1; i <= 5; i++) {
      const file = path.join(FIXTURE_DIR, `challenge_${String(i).padStart(3, '0')}.json`);
      const config = JSON.parse(fs.readFileSync(file, 'utf8'));
      expect(config.rings.length).toBe(1);
      expect(config.timer.totalSeconds).toBe(90);
    }
  });

  it('challenges 6-15 have 2 rings', () => {
    for (let i = 6; i <= 15; i++) {
      const file = path.join(FIXTURE_DIR, `challenge_${String(i).padStart(3, '0')}.json`);
      const config = JSON.parse(fs.readFileSync(file, 'utf8'));
      expect(config.rings.length).toBe(2);
    }
  });

  it('challenges 16-20 have 3 rings and 70s timer', () => {
    for (let i = 16; i <= 20; i++) {
      const file = path.join(FIXTURE_DIR, `challenge_${String(i).padStart(3, '0')}.json`);
      const config = JSON.parse(fs.readFileSync(file, 'utf8'));
      expect(config.rings.length).toBe(3);
      expect(config.timer.totalSeconds).toBe(70);
    }
  });
});
