import { TextureAtlasManager } from '../../src/utils/TextureAtlasManager';

describe('TextureAtlasManager lifecycle (task 18.1.1a)', () => {
  beforeEach(() => {
    // Reset state
    TextureAtlasManager.releaseAll();
    (TextureAtlasManager as any).atlases.clear();
    (TextureAtlasManager as any).totalLoadedBytes = 0;
  });
  
  it('register + loadAll marks atlas as loaded', async () => {
    TextureAtlasManager.register('rings', 5, async () => ({ handle: 'rings' }));
    await TextureAtlasManager.loadAll();
    expect(TextureAtlasManager.isLoaded('rings')).toBe(true);
  });
  
  it('releaseAll unloads all atlases', async () => {
    TextureAtlasManager.register('rings', 5, async () => ({}));
    await TextureAtlasManager.loadAll();
    TextureAtlasManager.releaseAll();
    expect(TextureAtlasManager.isLoaded('rings')).toBe(false);
    expect(TextureAtlasManager.getLoadedCount()).toBe(0);
    expect(TextureAtlasManager.getTotalLoadedBytes()).toBe(0);
  });
  
  it('does not exceed 50MB budget', async () => {
    TextureAtlasManager.register('atlas_a', 30, async () => ({}));
    TextureAtlasManager.register('atlas_b', 25, async () => ({})); // would exceed 50MB
    await TextureAtlasManager.loadAll();
    expect(TextureAtlasManager.getTotalLoadedBytes()).toBeLessThanOrEqual(50 * 1024 * 1024);
  });
  
  it('release(id) only removes the specified atlas', async () => {
    TextureAtlasManager.register('a', 5, async () => ({}));
    TextureAtlasManager.register('b', 5, async () => ({}));
    await TextureAtlasManager.loadAll();
    TextureAtlasManager.release('a');
    expect(TextureAtlasManager.isLoaded('a')).toBe(false);
    expect(TextureAtlasManager.isLoaded('b')).toBe(true);
  });
  
  it('getLoadedCount returns correct count', async () => {
    TextureAtlasManager.register('c', 3, async () => ({}));
    TextureAtlasManager.register('d', 3, async () => ({}));
    await TextureAtlasManager.loadAll();
    expect(TextureAtlasManager.getLoadedCount()).toBe(2);
  });
});
