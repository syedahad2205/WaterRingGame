import { GhostReplayLRUCache } from '../../src/utils/GhostReplayLRUCache';

describe('GhostReplayLRUCache LRU eviction (task 18.1.3a)', () => {
  it('evicts LRU entry when budget exceeded', () => {
    const cache = new GhostReplayLRUCache(10 * 1024 * 1024); // 10MB test budget
    const entry6MB = new Uint8Array(6 * 1024 * 1024);
    const entry6MB_2 = new Uint8Array(6 * 1024 * 1024);
    
    cache.set('a', entry6MB);
    cache.set('b', entry6MB_2); // should evict 'a'
    
    expect(cache.getTotalBytes()).toBeLessThanOrEqual(10 * 1024 * 1024);
    expect(cache.has('b')).toBe(true);
    // 'a' was evicted to make room for 'b'
  });
  
  it('get updates last-accessed time for LRU ordering', () => {
    const cache = new GhostReplayLRUCache(15 * 1024 * 1024);
    cache.set('a', new Uint8Array(4 * 1024 * 1024));
    cache.set('b', new Uint8Array(4 * 1024 * 1024));
    
    // Access 'a' to make it recently used
    cache.get('a');
    
    // Add 'c' which causes eviction — 'b' should be evicted (LRU), not 'a'
    cache.set('c', new Uint8Array(8 * 1024 * 1024));
    
    expect(cache.has('a')).toBe(true);
    expect(cache.has('c')).toBe(true);
  });
  
  it('remove() decrements total bytes', () => {
    const cache = new GhostReplayLRUCache();
    cache.set('x', new Uint8Array(1024 * 1024)); // 1MB
    cache.remove('x');
    expect(cache.getTotalBytes()).toBe(0);
    expect(cache.has('x')).toBe(false);
  });
  
  it('clear() empties the cache', () => {
    const cache = new GhostReplayLRUCache();
    cache.set('a', new Uint8Array(1024));
    cache.set('b', new Uint8Array(1024));
    cache.clear();
    expect(cache.getCount()).toBe(0);
    expect(cache.getTotalBytes()).toBe(0);
  });
  
  it('entry larger than budget is not cached', () => {
    const cache = new GhostReplayLRUCache(5 * 1024 * 1024);
    cache.set('toobig', new Uint8Array(10 * 1024 * 1024));
    expect(cache.has('toobig')).toBe(false);
  });
});
