
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getAnalytics, type Analytics, isSupported } from 'firebase/analytics';
import { firebaseConfig } from '@/firebase/config';

// Vérification stricte pour éviter les erreurs bloquantes lors du build statique
const isConfigValid = typeof firebaseConfig.apiKey === 'string' && 
                      firebaseConfig.apiKey.startsWith('AIza');

let app: FirebaseApp;

if (getApps().length) {
  app = getApp();
} else {
  // En production/build, on utilise la config si elle est valide, sinon un fallback neutre
  if (isConfigValid) {
    app = initializeApp(firebaseConfig);
  } else {
    // Fallback factice indispensable pour que le build Next.js ne plante pas
    app = initializeApp({ 
      apiKey: "AIza-BUILD-TIME-FALLBACK-IGNORE",
      authDomain: "build-fallback.firebaseapp.com",
      projectId: "build-fallback",
      storageBucket: "build-fallback.appspot.com",
      messagingSenderId: "123456789",
      appId: "1:123456789:web:abcdef"
    });
  }
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
