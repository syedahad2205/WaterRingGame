const mockSignInAnonymously = jest.fn(() =>
  Promise.resolve({
    user: { uid: 'anon123', isAnonymous: true, displayName: null, email: null, photoURL: null },
    additionalUserInfo: { isNewUser: true },
  }),
);
const mockSignOut = jest.fn(() => Promise.resolve());
const mockOnAuthStateChanged = jest.fn(() => jest.fn());
const mockSignInWithCredential = jest.fn(() =>
  Promise.resolve({
    user: { uid: 'google1', isAnonymous: false, displayName: 'Bob', email: 'b@b.com', photoURL: null },
    additionalUserInfo: { isNewUser: false },
  }),
);

jest.mock('@react-native-firebase/auth', () => {
  const authInstance = () => ({
    signInAnonymously: mockSignInAnonymously,
    signOut: mockSignOut,
    onAuthStateChanged: mockOnAuthStateChanged,
    signInWithCredential: mockSignInWithCredential,
    currentUser: null,
  });
  (authInstance as any).GoogleAuthProvider = { credential: jest.fn(() => ({ providerId: 'google.com' })) };
  (authInstance as any).AppleAuthProvider = { credential: jest.fn(() => ({ providerId: 'apple.com' })) };
  return authInstance;
});

import { authService, AuthService } from '../../src/services/firebase/AuthService';

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignInAnonymously.mockResolvedValue({
      user: { uid: 'anon123', isAnonymous: true, displayName: null, email: null, photoURL: null },
      additionalUserInfo: { isNewUser: true },
    });
    mockOnAuthStateChanged.mockReturnValue(jest.fn());
  });

  it('authService is exported', () => {
    expect(authService).not.toBeNull();
    expect(authService).toBeInstanceOf(AuthService);
  });

  it('signInAnonymously returns { user: { uid, isAnonymous: true }, isNewUser: true }', async () => {
    const result = await authService.signInAnonymously();
    expect(result.user.uid).toBe('anon123');
    expect(result.user.isAnonymous).toBe(true);
    expect(result.isNewUser).toBe(true);
  });

  it('getCurrentUser returns null when not signed in', () => {
    const user = authService.getCurrentUser();
    expect(user).toBeNull();
  });

  it('onAuthStateChanged returns an unsubscribe function', () => {
    const unsubscribe = authService.onAuthStateChanged(() => {});
    expect(typeof unsubscribe).toBe('function');
  });

  it('signInWithGoogle is an async function', () => {
    mockSignInWithCredential.mockResolvedValueOnce({
      user: { uid: 'g1', isAnonymous: false, displayName: 'G', email: 'g@g.com', photoURL: null },
      additionalUserInfo: { isNewUser: false },
    });
    const result = authService.signInWithGoogle('fake-id-token');
    expect(result).toBeInstanceOf(Promise);
    return result.catch(() => {}); // swallow — no real credential
  });

  it('signInWithApple is an async function', () => {
    mockSignInWithCredential.mockResolvedValueOnce({
      user: { uid: 'a1', isAnonymous: false, displayName: 'A', email: 'a@a.com', photoURL: null },
      additionalUserInfo: { isNewUser: false },
    });
    const result = authService.signInWithApple('fake-identity-token', 'fake-nonce');
    expect(result).toBeInstanceOf(Promise);
    return result.catch(() => {});
  });

  it('signOut is callable without throwing', async () => {
    mockSignOut.mockResolvedValue(undefined);
    await expect(authService.signOut()).resolves.toBeUndefined();
  });

  it('signInAnonymously calls firebase signInAnonymously', async () => {
    await authService.signInAnonymously();
    expect(mockSignInAnonymously).toHaveBeenCalledTimes(1);
  });

  it('onAuthStateChanged registers callback via firebase', () => {
    const cb = jest.fn();
    authService.onAuthStateChanged(cb);
    expect(mockOnAuthStateChanged).toHaveBeenCalledTimes(1);
  });
});
