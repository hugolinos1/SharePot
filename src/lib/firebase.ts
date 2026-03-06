import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getAnalytics, type Analytics, isSupported } from 'firebase/analytics';
import { firebaseConfig } from '@/firebase/config';

// Vérification de la validité de la configuration
// NEXT_PUBLIC_FIREBASE_API_KEY doit être présente en production (Netlify)
const isConfigValid = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== "undefined" && !firebaseConfig.apiKey.includes('PLACEHOLDER');

let app: FirebaseApp;

if (getApps().length) {
  app = getApp();
} else {
  // Pendant le build Next.js (analyse statique), les variables d'env peuvent manquer.
  // On utilise une config factice pour éviter l'erreur bloquante auth/invalid-api-key.
  const configToUse = isConfigValid 
    ? firebaseConfig 
    : { 
        ...firebaseConfig, 
        apiKey: "AIza-build-fallback-ignore-me",
        authDomain: "build-fallback.firebaseapp.com",
        projectId: "build-fallback"
      };
    
  app = initializeApp(configToUse);
}

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);
let analytics: Analytics | null = null;

if (typeof window !== 'undefined' && isConfigValid) {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { app, auth, db, storage, analytics };