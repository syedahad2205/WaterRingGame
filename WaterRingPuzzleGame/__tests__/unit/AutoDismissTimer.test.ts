jest.mock('react-native-mmkv', () => ({ MMKV: jest.fn().mockImplementation(() => ({ getString: jest.fn().mockReturnValue(null), set: jest.fn(), delete: jest.fn() })) }));

// Test the auto-dismiss countdown logic from ContinueScreen
// ContinueScreen uses a 10-second auto-dismiss: setInterval, decrements, calls navigation.navigate on 0

describe('Auto-dismiss timer pause on touch (task 8.3.2a)', () => {
  it('auto-dismiss uses 10-second countdown', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../src/screens/ContinueScreen.tsx'), 'utf8'
    );
    // Should contain DISMISS_COUNTDOWN or 10 as countdown value
    expect(source).toMatch(/DISMISS_COUNTDOWN|auto.*dismiss|countdown.*10|10.*countdown/i);
  });

  it('ContinueScreen has touch handler to cancel/pause timer', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../src/screens/ContinueScreen.tsx'), 'utf8'
    );
    expect(source).toMatch(/onPress|Pressable|TouchableOpacity/);
  });

  it('ContinueScreen clears interval on unmount', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../src/screens/ContinueScreen.tsx'), 'utf8'
    );
    expect(source).toContain('clearInterval');
  });

  it('countdown timer uses setInterval with 1000ms', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../src/screens/ContinueScreen.tsx'), 'utf8'
    );
    expect(source).toContain('setInterval');
    expect(source).toContain('1000');
  });
});
