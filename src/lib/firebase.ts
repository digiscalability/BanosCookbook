import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCljkLW6noHaK2K95XiWeuezVx-VfIAdDQ",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "studio-4664575455-de3d2.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "studio-4664575455-de3d2",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "studio-4664575455-de3d2.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "749739171915",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:749739171915:web:32241175164a8c33b4edce"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);

// Connect to emulators in development (optional)
if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true' && typeof window !== 'undefined') {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectAuthEmulator(auth, 'http://localhost:9099');
    // Other emulators (storage, functions) could be connected here if needed
    console.info('Connected to Firebase emulators (firestore, auth)');
  } catch (emulatorErr) {
    console.warn('Failed to connect to Firebase emulators:', emulatorErr);
  }
}

export default app;
