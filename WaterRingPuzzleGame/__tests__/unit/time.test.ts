import { formatSeconds, formatMs, msToSeconds, secondsToMs } from '@utils/time';

describe('formatSeconds', () => {
  it('formats zero seconds', () => {
    expect(formatSeconds(0)).toBe('0:00');
  });

  it('formats seconds below a minute', () => {
    expect(formatSeconds(5)).toBe('0:05');
    expect(formatSeconds(59)).toBe('0:59');
  });

  it('formats exactly one minute', () => {
    expect(formatSeconds(60)).toBe('1:00');
  });

  it('formats minutes and seconds', () => {
    expect(formatSeconds(83)).toBe('1:23');
    expect(formatSeconds(125)).toBe('2:05');
  });

  it('pads single-digit seconds with a leading zero', () => {
    expect(formatSeconds(61)).toBe('1:01');
    expect(formatSeconds(70)).toBe('1:10');
  });

  it('handles large values (e.g. 3600 seconds = 60 minutes)', () => {
    expect(formatSeconds(3600)).toBe('60:00');
  });

  it('truncates fractional seconds', () => {
    expect(formatSeconds(83.9)).toBe('1:23');
  });

  it('handles negative values by treating them as their absolute value', () => {
    expect(formatSeconds(-83)).toBe('1:23');
  });
});

describe('formatMs', () => {
  it('formats zero milliseconds', () => {
    expect(formatMs(0)).toBe('0ms');
  });

  it('formats small values without separator', () => {
    expect(formatMs(500)).toBe('500ms');
    expect(formatMs(999)).toBe('999ms');
  });

  it('formats values over 1000 with comma separator', () => {
    expect(formatMs(1234)).toBe('1,234ms');
    expect(formatMs(10000)).toBe('10,000ms');
  });

  it('rounds fractional milliseconds', () => {
    expect(formatMs(1234.6)).toBe('1,235ms');
    expect(formatMs(1234.4)).toBe('1,234ms');
  });

  it('handles negative values by treating them as their absolute value', () => {
    expect(formatMs(-1234)).toBe('1,234ms');
  });
});

describe('msToSeconds', () => {
  it('converts 1000ms to 1 second', () => {
    expect(msToSeconds(1000)).toBe(1);
  });

  it('converts partial milliseconds correctly', () => {
    expect(msToSeconds(1500)).toBe(1.5);
    expect(msToSeconds(500)).toBe(0.5);
  });

  it('converts zero', () => {
    expect(msToSeconds(0)).toBe(0);
  });

  it('handles negative values', () => {
    expect(msToSeconds(-2000)).toBe(-2);
  });
});

describe('secondsToMs', () => {
  it('converts 1 second to 1000ms', () => {
    expect(secondsToMs(1)).toBe(1000);
  });

  it('converts fractional seconds correctly', () => {
    expect(secondsToMs(1.5)).toBe(1500);
    expect(secondsToMs(0.5)).toBe(500);
  });

  it('converts zero', () => {
    expect(secondsToMs(0)).toBe(0);
  });

  it('handles negative values', () => {
    expect(secondsToMs(-2)).toBe(-2000);
  });
});

describe('msToSeconds / secondsToMs round-trip', () => {
  it('round-trips correctly for integer values', () => {
    const values = [0, 1, 60, 3600, 100, 250];
    for (const v of values) {
      expect(msToSeconds(secondsToMs(v))).toBe(v);
      expect(secondsToMs(msToSeconds(v))).toBe(v);
    }
  });
});
