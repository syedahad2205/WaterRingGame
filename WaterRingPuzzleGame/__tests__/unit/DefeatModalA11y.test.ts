describe('DefeatModal accessibility — no FAIL text (task 8.3.4a)', () => {
  it('DefeatScreen.tsx does not contain the word FAIL or FAILED', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../src/screens/DefeatScreen.tsx'), 'utf8'
    );
    expect(source).not.toMatch(/\bFAIL\b|\bFAILED\b/);
  });

  it('DefeatScreen uses encouraging language', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../src/screens/DefeatScreen.tsx'), 'utf8'
    );
    // Should have positive/encouraging text
    expect(source).toMatch(/Time.s Up|close|practis|try again|keep going/i);
  });

  it('DefeatScreen has accessibilityRole on main elements', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../src/screens/DefeatScreen.tsx'), 'utf8'
    );
    expect(source).toContain('accessibilityRole');
  });

  it('DefeatScreen has Try Again button', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../src/screens/DefeatScreen.tsx'), 'utf8'
    );
    expect(source).toMatch(/Try Again|tryAgain/i);
  });
});
