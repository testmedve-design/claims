import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAaqgkXJXkntZBs7QQyss7Hy_HECyMXE2c", // Working API key from previous setup
  authDomain: "mv20-a1a09.firebaseapp.com",
  projectId: "mv20-a1a09",
  storageBucket: "mv20-a1a09.firebasestorage.app",
  messagingSenderId: "111793664073187114321",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:111793664073187114321:web:default" // Default app ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
