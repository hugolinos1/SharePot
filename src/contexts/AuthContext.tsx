
"use client";

import type { User as FirebaseUserType } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, ReactNode, Dispatch, SetStateAction } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import type { User as AppUserType } from '@/data/mock-data';
import { generateAvatar } from '@/ai/flows/generate-avatar-flow';

const SUPER_ADMIN_EMAIL = "hugues.rabier@gmail.com";

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
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          let profileDataToSet: AppUserType;

          const isSuperAdmin = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

          if (userDocSnap.exists()) {
            profileDataToSet = { id: userDocSnap.id, ...userDocSnap.data() } as AppUserType;
            
            // Fail-safe: Si l'email correspond au super admin mais que Firestore dit non, on corrige
            if (isSuperAdmin && !profileDataToSet.isAdmin) {
              profileDataToSet.isAdmin = true;
              await updateDoc(userDocRef, { isAdmin: true });
            }
          } else {
            profileDataToSet = {
              id: user.uid,
              name: user.displayName || user.email?.split('@')[0] || "Utilisateur",
              email: user.email || "",
              isAdmin: isSuperAdmin,
              avatarUrl: user.photoURL || '',
            };
            await setDoc(userDocRef, profileDataToSet);
          }

          setUserProfile(profileDataToSet);
          setIsAdmin(profileDataToSet.isAdmin || false);
          setLoading(false);

          // Génération d'avatar en arrière-plan
          const needsAvatarGeneration = !profileDataToSet.avatarUrl || profileDataToSet.avatarUrl === '' || profileDataToSet.avatarUrl.startsWith('https://ui-avatars.com');
          
          if (needsAvatarGeneration) {
            const seedText = profileDataToSet.name || profileDataToSet.email || user.uid;
            generateAvatar({ seedText }).then(async (generatedUrl) => {
              if (generatedUrl && !generatedUrl.includes('placehold.co')) {
                setUserProfile(prev => prev ? { ...prev, avatarUrl: generatedUrl } : null);
                await updateDoc(userDocRef, { avatarUrl: generatedUrl });
              }
            }).catch(err => console.error("[AuthContext] Avatar generation failed:", err));
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
