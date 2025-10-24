import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

// Real Firebase Authentication
export const signInWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Get the ID token
    const idToken = await user.getIdToken();
    
    return {
      idToken,
      uid: user.uid,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        emailVerified: user.emailVerified
      }
    };
  } catch (error: any) {
    // Handle Firebase auth errors
    let errorMessage = 'Authentication failed';
    
    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = 'No account found with this email address';
        break;
      case 'auth/wrong-password':
        errorMessage = 'Incorrect password';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address';
        break;
      case 'auth/user-disabled':
        errorMessage = 'This account has been disabled';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Too many failed attempts. Please try again later';
        break;
      case 'auth/network-request-failed':
        errorMessage = 'Network error. Please check your connection';
        break;
      default:
        errorMessage = error.message || 'Authentication failed';
    }
    
    throw new Error(errorMessage);
  }
};

// Sign out function
export const signOutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

// Auth state observer
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Get current user
export const getCurrentUser = () => {
  return auth.currentUser;
};
