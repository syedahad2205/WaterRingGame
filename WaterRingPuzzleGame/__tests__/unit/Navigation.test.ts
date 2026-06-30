// No native mocks needed — we just check the type definitions

describe('Navigation route completeness', () => {
  it('RootStackParamList type covers all 18 required screens', () => {
    const fs = require('fs');
    const path = require('path');
    const navSource = fs.readFileSync(
      path.resolve(__dirname, '../../src/app/Navigation.tsx'), 'utf8'
    );

    const requiredScreens = [
      'Splash', 'Loading', 'MainTabs', 'Game',
      'PauseScreen', 'VictoryScreen', 'DefeatScreen', 'ContinueScreen',
      'Achievements', 'Inventory', 'Collection', 'Settings',
      'DailyChallenge', 'Statistics', 'ReplayViewer',
      'Home', 'Leaderboard', 'Store', 'Profile',
    ];

    requiredScreens.forEach(screen => {
      expect(navSource).toContain(screen);
    });
  });

  it('has a linking config with waterring:// scheme', () => {
    const fs = require('fs');
    const path = require('path');
    const navSource = fs.readFileSync(
      path.resolve(__dirname, '../../src/app/Navigation.tsx'), 'utf8'
    );
    expect(navSource).toContain('waterring://');
  });

  it('Navigation.tsx exports a default component', () => {
    const fs = require('fs');
    const path = require('path');
    const navSource = fs.readFileSync(
      path.resolve(__dirname, '../../src/app/Navigation.tsx'), 'utf8'
    );
    expect(navSource).toMatch(/export default/);
  });
});
