import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getAnalytics, type Analytics, isSupported } from 'firebase/analytics';
import { firebaseConfig } from '@/firebase/config';

// Vérification de la validité de la configuration
// Pendant le build Next.js sur Netlify, les variables d'environnement peuvent être manquantes
const isConfigValid = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== "undefined";

let app: FirebaseApp;

if (getApps().length) {
  app = getApp();
} else {
  // Si la config est invalide (build phase), on utilise une clé factice pour éviter de faire planter le build
  // car Next.js importe ce module lors de la génération statique.
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