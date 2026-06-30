import { AudioBufferManager } from '../../src/utils/AudioBufferManager';

describe('AudioBufferManager (task 18.1.2a)', () => {
  beforeEach(() => {
    AudioBufferManager.releaseAll();
    (AudioBufferManager as any).stems.clear();
    (AudioBufferManager as any).activeThemeId = null;
    (AudioBufferManager as any).totalLoadedBytes = 0;
  });
  
  it('marks stem as loaded', () => {
    AudioBufferManager.register('stem_menu', 'theme_default', 2);
    AudioBufferManager.markLoaded('stem_menu');
    expect(AudioBufferManager.isLoaded('stem_menu')).toBe(true);
  });
  
  it('switchTheme releases old theme stems within 500ms', async () => {
    AudioBufferManager.register('stem_old_1', 'theme_A', 3);
    AudioBufferManager.register('stem_old_2', 'theme_A', 3);
    AudioBufferManager.register('stem_new_1', 'theme_B', 3);
    AudioBufferManager.markLoaded('stem_old_1');
    AudioBufferManager.markLoaded('stem_old_2');
    (AudioBufferManager as any).activeThemeId = 'theme_A';
    
    const start = Date.now();
    await AudioBufferManager.switchTheme('theme_B');
    const elapsed = Date.now() - start;
    
    expect(elapsed).toBeLessThan(500);
    expect(AudioBufferManager.isLoaded('stem_old_1')).toBe(false);
    expect(AudioBufferManager.isLoaded('stem_old_2')).toBe(false);
  });
  
  it('getActiveThemeId updates after switch', async () => {
    (AudioBufferManager as any).activeThemeId = 'theme_A';
    await AudioBufferManager.switchTheme('theme_C');
    expect(AudioBufferManager.getActiveThemeId()).toBe('theme_C');
  });
  
  it('does not exceed 20MB budget', () => {
    AudioBufferManager.register('huge', 'theme_X', 25); // 25MB
    AudioBufferManager.markLoaded('huge');
    expect(AudioBufferManager.getTotalLoadedBytes()).toBeLessThanOrEqual(20 * 1024 * 1024);
  });
});
