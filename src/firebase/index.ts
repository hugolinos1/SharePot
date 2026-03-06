
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

// Vérification pour le build
const isConfigValid = typeof firebaseConfig.apiKey === 'string' && firebaseConfig.apiKey.startsWith('AIza');

export function initializeFirebase() {
  if (getApps().length) {
    return getSdks(getApp());
  }

  let firebaseApp: FirebaseApp;
  
  try {
    // Tentative d'initialisation automatique (Firebase App Hosting)
    firebaseApp = initializeApp();
  } catch (e) {
    // Fallback sur la config manuelle ou un dummy pour le build
    if (isConfigValid) {
      firebaseApp = initializeApp(firebaseConfig);
    } else {
      firebaseApp = initializeApp({ 
        apiKey: "AIza-BUILD-TIME-FALLBACK-IGNORE",
        authDomain: "build-fallback.firebaseapp.com",
        projectId: "build-fallback"
      });
    }
  }

  return getSdks(firebaseApp);
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
