import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

export type AuthProvider = 'anonymous' | 'google' | 'apple';

export interface AuthUser {
  uid: string;
  isAnonymous: boolean;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export interface SignInResult {
  user: AuthUser;
  isNewUser: boolean;
}

function toAuthUser(u: FirebaseAuthTypes.User): AuthUser {
  return {
    uid: u.uid,
    isAnonymous: u.isAnonymous,
    displayName: u.displayName,
    email: u.email,
    photoURL: u.photoURL,
  };
}

export class AuthService {
  async signInAnonymously(): Promise<SignInResult> {
    const result = await auth().signInAnonymously();
    return {
      user: toAuthUser(result.user),
      isNewUser: result.additionalUserInfo?.isNewUser ?? false,
    };
  }

  async linkWithSocialProvider(
    provider: 'google' | 'apple',
  ): Promise<SignInResult> {
    const current = auth().currentUser;
    if (!current) throw new Error('No signed-in user to link.');

    if (provider === 'google') {
      throw new Error(
        'Pass idToken from Google Sign-In SDK and call linkWithGoogle instead.',
      );
    } else {
      throw new Error(
        'Pass identityToken + nonce from Apple Sign-In SDK and call linkWithApple instead.',
      );
    }
  }

  async signInWithGoogle(idToken: string): Promise<SignInResult> {
    const credential = auth.GoogleAuthProvider.credential(idToken);
    const current = auth().currentUser;
    let result: FirebaseAuthTypes.UserCredential;
    if (current?.isAnonymous) {
      result = await current.linkWithCredential(credential);
    } else {
      result = await auth().signInWithCredential(credential);
    }
    return {
      user: toAuthUser(result.user),
      isNewUser: result.additionalUserInfo?.isNewUser ?? false,
    };
  }

  async signInWithApple(
    identityToken: string,
    nonce: string,
  ): Promise<SignInResult> {
    const credential = auth.AppleAuthProvider.credential(identityToken, nonce);
    const current = auth().currentUser;
    let result: FirebaseAuthTypes.UserCredential;
    if (current?.isAnonymous) {
      result = await current.linkWithCredential(credential);
    } else {
      result = await auth().signInWithCredential(credential);
    }
    return {
      user: toAuthUser(result.user),
      isNewUser: result.additionalUserInfo?.isNewUser ?? false,
    };
  }

  getCurrentUser(): AuthUser | null {
    const u = auth().currentUser;
    return u ? toAuthUser(u) : null;
  }

  onAuthStateChanged(
    callback: (user: AuthUser | null) => void,
  ): () => void {
    return auth().onAuthStateChanged(u => {
      callback(u ? toAuthUser(u) : null);
    });
  }

  async signOut(): Promise<void> {
    await auth().signOut();
  }

  async deleteAccount(): Promise<void> {
    const u = auth().currentUser;
    if (!u) throw new Error('No signed-in user.');
    await u.delete();
  }
}

export const authService = new AuthService();
