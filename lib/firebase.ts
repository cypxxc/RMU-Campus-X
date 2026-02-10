import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"
import { getAuth, type Auth } from "firebase/auth"
import { getFirestore, type Firestore, setLogLevel } from "firebase/firestore"

// Firebase config from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Singleton instances
let firebaseApp: FirebaseApp | null = null
let firebaseAuth: Auth | null = null
let firebaseDb: Firestore | null = null
let firestoreLogLevelConfigured = false

function initApp(): FirebaseApp {
  if (!firebaseApp) {
    firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
  }
  return firebaseApp
}

/**
 * Get or initialize the Firebase app instance
 * Exported for use by App Check and other modules
 */
export function getFirebaseApp(): FirebaseApp {
  return initApp()
}

export function getFirebaseAuth(): Auth {
  if (typeof window === "undefined") {
    throw new Error("Firebase Auth should only be used on the client side")
  }

  if (!firebaseAuth) {
    firebaseAuth = getAuth(initApp())
  }
  return firebaseAuth
}

export function getFirebaseDb(): Firestore {
  // Allow both client and server usage
  if (!firebaseDb) {
    firebaseDb = getFirestore(initApp())
  }
  if (!firestoreLogLevelConfigured && typeof window !== "undefined") {
    // Reduce noisy transport logs during temporary offline/network switches.
    setLogLevel("error")
    firestoreLogLevelConfigured = true
  }
  return firebaseDb
}
