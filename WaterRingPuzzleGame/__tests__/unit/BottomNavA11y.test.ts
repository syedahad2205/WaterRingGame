describe('BottomNav accessibility labels (task 8.1.3a)', () => {
  it('Navigation.tsx defines 4 MainTabs tab screens', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../src/app/Navigation.tsx'), 'utf8'
    );
    // Count Tab.Screen occurrences
    const tabScreenMatches = source.match(/Tab\.Screen/g) || [];
    expect(tabScreenMatches.length).toBeGreaterThanOrEqual(4);
  });

  it('Navigation.tsx uses tabBarAccessibilityLabel', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../src/app/Navigation.tsx'), 'utf8'
    );
    expect(source).toContain('tabBarAccessibilityLabel');
  });

  it('tab icons cover all 4 main tabs', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../src/app/Navigation.tsx'), 'utf8'
    );
    ['Home', 'Leaderboard', 'Store', 'Profile'].forEach(tab => {
      expect(source).toContain(tab);
    });
  });
});
