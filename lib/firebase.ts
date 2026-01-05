import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"
import { getAuth, type Auth } from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"

// Firebase config (hardcoded for simplicity)
const firebaseConfig = {
  apiKey: "AIzaSyAhtR1jX2lycnS2xYLhiAtMAjn5dLOYAZM",
  authDomain: "resource-4e4fc.firebaseapp.com",
  databaseURL: "https://resource-4e4fc-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "resource-4e4fc",
  storageBucket: "resource-4e4fc.firebasestorage.app",
  messagingSenderId: "487406832998",
  appId: "1:487406832998:web:a6ac2bedaacaf430bc4ca7",
  measurementId: "G-72YEYF40GR"
};

// Singleton instances
let firebaseApp: FirebaseApp | null = null
let firebaseAuth: Auth | null = null
let firebaseDb: Firestore | null = null

function initApp(): FirebaseApp {
  if (!firebaseApp) {
    firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
  }
  return firebaseApp
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
  return firebaseDb
}
