"use client";

import type { User as FirebaseUserType } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, ReactNode, Dispatch, SetStateAction } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import type { User as AppUserType } from '@/data/mock-data';
import { generateAvatar } from '@/ai/flows/generate-avatar-flow';

interface AuthContextType {
  currentUser: FirebaseUserType | null;
  userProfile: AppUserType | null;
  setUserProfile: Dispatch<SetStateAction<AppUserType | null>>;
  isAdmin: boolean;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUserType | null>(null);
  const [userProfile, setUserProfile] = useState<AppUserType | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        console.log('[AuthContext] User authenticated. UID:', user.uid);
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          let profileDataToSet: AppUserType;

          if (userDocSnap.exists()) {
            profileDataToSet = { id: userDocSnap.id, ...userDocSnap.data() } as AppUserType;
          } else {
            profileDataToSet = {
              id: user.uid,
              name: user.displayName || user.email?.split('@')[0] || "Nouvel Utilisateur",
              email: user.email || "",
              isAdmin: false,
              avatarUrl: user.photoURL || '',
            };
          }

          // On définit le profil immédiatement pour ne pas bloquer l'UI
          setUserProfile(profileDataToSet);
          setIsAdmin(profileDataToSet.isAdmin || false);
          setLoading(false);

          // Puis on gère la génération d'avatar en arrière-plan si nécessaire
          const needsAvatarGeneration = !profileDataToSet.avatarUrl || profileDataToSet.avatarUrl === '' || profileDataToSet.avatarUrl.startsWith('https://ui-avatars.com');
          
          if (needsAvatarGeneration) {
            const seedText = profileDataToSet.name || profileDataToSet.email || user.uid;
            generateAvatar({ seedText }).then(async (generatedUrl) => {
              if (generatedUrl && !generatedUrl.includes('placehold.co')) {
                // Mise à jour de l'état local
                setUserProfile(prev => prev ? { ...prev, avatarUrl: generatedUrl } : null);
                // Sauvegarde dans Firestore pour la prochaine fois
                await updateDoc(userDocRef, { avatarUrl: generatedUrl });
              }
            }).catch(err => console.error("[AuthContext] Background avatar generation failed:", err));
          }
        } catch (error) {
          console.error("[AuthContext] Error loading user profile:", error);
          setLoading(false);
        }
      } else {
        setUserProfile(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await auth.signOut();
  };

  const value = {
    currentUser,
    userProfile,
    setUserProfile,
    isAdmin,
    loading,
    logout,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}