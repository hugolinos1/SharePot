
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from '@/firebase/config';

/**
 * Initialise l'application Firebase de manière paresseuse (lazy).
 * Cela empêche le build de planter si les variables d'environnement sont absentes
 * lors de l'analyse statique de Next.js.
 */
function getFirebaseApp(): FirebaseApp {
  if (getApps().length) {
    return getApp();
  }

  // Vérifie si la clé API semble valide (commence par AIza pour Firebase)
  const isConfigValid = typeof firebaseConfig.apiKey === 'string' && firebaseConfig.apiKey.startsWith('AIza');

  if (isConfigValid) {
    return initializeApp(firebaseConfig);
  } else {
    // Retourne une application factice pour sécuriser la phase de build
    // Elle sera remplacée par la vraie app en production grâce aux variables d'environnement
    return initializeApp({
      apiKey: "AIza-BUILD-TIME-FALLBACK-IGNORE",
      authDomain: "build-fallback.firebaseapp.com",
      projectId: "build-fallback",
      storageBucket: "build-fallback.appspot.com",
      messagingSenderId: "123456789",
      appId: "1:123456789:web:abcdef"
    });
  }
}

// Exports via fonctions pour assurer l'exécution différée
export const getFirebaseAuth = (): Auth => getAuth(getFirebaseApp());
export const getDb = (): Firestore => getFirestore(getFirebaseApp());
export const getFirebaseStorage = (): FirebaseStorage => getStorage(getFirebaseApp());

// Exports directs pour la compatibilité avec les composants existants
export const auth = getFirebaseAuth();
export const db = getDb();
export const storage = getFirebaseStorage();
