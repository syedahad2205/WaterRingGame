jest.mock('@react-native-firebase/functions', () => () => ({
  httpsCallable: jest.fn(() => jest.fn(() => Promise.resolve({ data: { success: true } }))),
  useEmulator: jest.fn(),
}));

jest.mock('../../src/services/firebase/CloudFunctionsService', () => ({
  cloudFunctionsService: {
    call: jest.fn(() => Promise.resolve({ data: { success: true }, success: true })),
  },
}));

import { syncManager, SyncManager } from '../../src/services/sync/SyncManager';

const makeOp = (type: 'user_update' | 'score_submit' = 'user_update') => ({
  type,
  payload: { test: true },
});

describe('SyncManager', () => {
  let manager: SyncManager;

  beforeEach(() => {
    jest.useFakeTimers();
    manager = new SyncManager();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('syncManager is exported', () => {
    expect(syncManager).not.toBeNull();
    expect(syncManager).toBeInstanceOf(SyncManager);
  });

  it('initial getStatus returns idle state with empty queue', () => {
    const status = manager.getStatus();
    expect(status.state).toBe('idle');
    expect(status.queueLength).toBe(0);
    expect(status.lastSyncAt).toBeNull();
    expect(status.error).toBeNull();
  });

  it('enqueue increases queueLength by 1', () => {
    // Prevent flush from running by mocking the internal call
    const { cloudFunctionsService } = require('../../src/services/firebase/CloudFunctionsService');
    // Keep the promise pending so queue doesn't drain
    cloudFunctionsService.call.mockReturnValue(new Promise(() => {}));

    manager.enqueue(makeOp());
    expect(manager.getStatus().queueLength).toBe(1);
  });

  it('enqueue with multiple ops accumulates correctly', () => {
    const { cloudFunctionsService } = require('../../src/services/firebase/CloudFunctionsService');
    cloudFunctionsService.call.mockReturnValue(new Promise(() => {}));

    manager.enqueue(makeOp());
    manager.enqueue(makeOp('score_submit'));
    manager.enqueue(makeOp());
    expect(manager.getStatus().queueLength).toBe(3);
  });

  it('removeFromQueue reduces queueLength by 1 when id exists', () => {
    const { cloudFunctionsService } = require('../../src/services/firebase/CloudFunctionsService');
    cloudFunctionsService.call.mockReturnValue(new Promise(() => {}));

    manager.enqueue(makeOp());
    const id = (manager as any).queue[0].id;
    expect(manager.getStatus().queueLength).toBe(1);
    manager.removeFromQueue(id);
    expect(manager.getStatus().queueLength).toBe(0);
  });

  it('removeFromQueue with unknown id does not throw', () => {
    expect(() => manager.removeFromQueue('nonexistent-id')).not.toThrow();
  });

  it('getStatus().state after flush() is idle, success, or failed (not syncing after settle)', async () => {
    const { cloudFunctionsService } = require('../../src/services/firebase/CloudFunctionsService');
    cloudFunctionsService.call.mockResolvedValue({ data: { success: true }, success: true });

    manager.enqueue(makeOp());
    await manager.flush();

    const state = manager.getStatus().state;
    expect(['idle', 'success', 'failed']).toContain(state);
  });

  it('startPeriodicSync returns a function', () => {
    const stop = manager.startPeriodicSync();
    expect(typeof stop).toBe('function');
    stop();
  });

  it('the function returned by startPeriodicSync is callable (stop fn)', () => {
    const stop = manager.startPeriodicSync();
    expect(() => stop()).not.toThrow();
  });
});
