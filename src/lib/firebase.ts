import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getAnalytics, type Analytics, isSupported } from 'firebase/analytics';
import { firebaseConfig } from '@/firebase/config';

// Vérification stricte de la configuration pour éviter les erreurs de build
const isConfigValid = typeof firebaseConfig.apiKey === 'string' && 
                      firebaseConfig.apiKey.startsWith('AIza') && 
                      !firebaseConfig.apiKey.includes('PLACEHOLDER');

let app: FirebaseApp;

if (getApps().length) {
  app = getApp();
} else {
  // Pendant le build (CI/CD), on injecte une config factice avec un format valide
  // pour que getAuth() et initializeApp() ne lèvent pas d'exception fatale.
  const configToUse = isConfigValid 
    ? firebaseConfig 
    : { 
        apiKey: "AIza-BUILD-TIME-FAKE-KEY-IGNORE-ME",
        authDomain: "build-fallback.firebaseapp.com",
        projectId: "build-fallback",
        storageBucket: "build-fallback.appspot.com",
        messagingSenderId: "123456789",
        appId: "1:123456789:web:abcdef"
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
