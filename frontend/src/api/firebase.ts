import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBrx5Xkh7bKJVCu_ITmhR8xDMx8KxtOI3s',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'rag-project-8f3e6.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'rag-project-8f3e6',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'rag-project-8f3e6.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '359402213968',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:359402213968:web:3536646967d14747f2f755',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-KBNP87TVR6',
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

export const isFirebaseConfigured = (): boolean => {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.apiKey.length > 10);
};

if (isFirebaseConfigured()) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
  } catch (error) {
    console.warn('Firebase initialization error:', error);
  }
}

export interface AuthResult {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  idToken: string;
}

/**
 * Sign in using Google OAuth with Firebase.
 * If Firebase Web API key is not yet configured, gracefully simulates
 * login so the user can test the workflow locally without errors.
 */
export const signInWithGoogle = async (): Promise<AuthResult> => {
  if (isFirebaseConfigured() && auth && googleProvider) {
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const user = userCredential.user;
      const idToken = await user.getIdToken();

      // Persist auth token for FastAPI Bearer header
      localStorage.setItem('auth_token', idToken);
      localStorage.setItem(
        'auth_user',
        JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        })
      );

      return {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'Anna University Student',
        photoURL: user.photoURL,
        idToken,
      };
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      throw err;
    }
  }

  // Graceful fallback for local development when web apiKey is awaiting user input
  console.info(
    'Firebase Web API Key not set in frontend/.env. Using simulated Anna University student session.'
  );
  const mockUser: AuthResult = {
    uid: 'google_anna_student_' + Math.random().toString(36).substring(2, 9),
    email: 'student.annauniv@gmail.com',
    displayName: 'Anna Univ Student',
    photoURL: null,
    idToken: 'mock_firebase_google_id_token_' + Date.now(),
  };

  localStorage.setItem('auth_token', mockUser.idToken);
  localStorage.setItem('auth_user', JSON.stringify(mockUser));
  return mockUser;
};

/**
 * Sign out user and clear stored tokens.
 */
export const logoutUser = async (): Promise<void> => {
  if (auth) {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Firebase signOut error:', err);
    }
  }
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
};

/**
 * Observe auth state changes.
 */
export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  if (auth) {
    return onAuthStateChanged(auth, callback);
  }
  return () => {};
};

export { auth };
