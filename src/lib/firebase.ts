
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from '@/firebase/config';

// Patterns Lazy pour éviter l'initialisation au moment du build Next.js
let app: FirebaseApp;

function getFirebaseApp(): FirebaseApp {
  if (getApps().length) {
    return getApp();
  }

  // Vérification de sécurité pour le build
  const isConfigValid = typeof firebaseConfig.apiKey === 'string' && firebaseConfig.apiKey.length > 10;

  if (isConfigValid) {
    return initializeApp(firebaseConfig);
  } else {
    // Fallback silencieux uniquement pour la phase de build statique de Next.js
    return initializeApp({
      apiKey: "AIza-BUILD-TIME-FALLBACK",
      authDomain: "build-fallback.firebaseapp.com",
      projectId: "build-fallback",
      storageBucket: "build-fallback.appspot.com",
      messagingSenderId: "123456789",
      appId: "1:123456789:web:abcdef"
    });
  }
}

// Exports via des getters ou initialisation différée
export const getFirebaseAuth = (): Auth => getAuth(getFirebaseApp());
export const getDb = (): Firestore => getFirestore(getFirebaseApp());
export const getFirebaseStorage = (): FirebaseStorage => getStorage(getFirebaseApp());

// On garde les exports directs pour la compatibilité existante, mais ils appellent getFirebaseApp()
export const auth = getAuth(getFirebaseApp());
export const db = getDb();
export const storage = getStorage(getFirebaseApp());
