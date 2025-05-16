
"use client";

import type { User as FirebaseUserType } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, ReactNode, Dispatch, SetStateAction } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, DocumentData } from 'firebase/firestore';
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
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        let profileDataToSet: AppUserType | null = null;

        if (userDocSnap.exists()) {
          console.log('[AuthContext] User profile found in Firestore for UID:', user.uid);
          profileDataToSet = { id: userDocSnap.id, ...userDocSnap.data() } as AppUserType;
        } else {
          console.warn(`[AuthContext] User profile document not found in Firestore for UID: ${user.uid}. Creating fallback profile.`);
          profileDataToSet = {
            id: user.uid,
            name: user.displayName || user.email?.split('@')[0] || "Nouvel Utilisateur",
            email: user.email || "",
            isAdmin: false,
            avatarUrl: user.photoURL || '',
            createdAt: undefined, 
          };
        }

        console.log(`[AuthContext] Checking avatar for ${profileDataToSet.id}. Current avatarUrl: "${profileDataToSet.avatarUrl}"`);
        const needsAvatarGeneration = profileDataToSet && (!profileDataToSet.avatarUrl || profileDataToSet.avatarUrl.startsWith('https://ui-avatars.com'));
        console.log(`[AuthContext] For ${profileDataToSet.id}, needsAvatarGeneration: ${needsAvatarGeneration}`);

        if (needsAvatarGeneration) {
          const seedText = profileDataToSet.name || profileDataToSet.email || 'user_avatar_seed';
          console.log(`[AuthContext] Attempting to generate avatar for ${profileDataToSet.name} with seed: "${seedText}"`);
          try {
            const generatedAvatarUrl = await generateAvatar({ seedText });
            if (generatedAvatarUrl && !generatedAvatarUrl.includes('placehold.co')) {
              profileDataToSet.avatarUrl = generatedAvatarUrl;
              console.log(`[AuthContext] Successfully generated and set avatar for ${profileDataToSet.name}. New URL starts with: ${generatedAvatarUrl.substring(0,50)}...`);
            } else {
              console.warn(`[AuthContext] Avatar generation failed or returned placeholder for ${profileDataToSet.name}. Fallback URL from flow: ${generatedAvatarUrl}`);
              if (generatedAvatarUrl.includes('placehold.co') && profileDataToSet) {
                profileDataToSet.avatarUrl = generatedAvatarUrl; 
              } else if (profileDataToSet && !profileDataToSet.avatarUrl) { 
                 profileDataToSet.avatarUrl = 'https://placehold.co/40x40.png?text=NoGen'; 
              }
            }
          } catch (genError: any) {
            console.error(`[AuthContext] Error during avatar generation call for ${profileDataToSet.name}:`, genError.message ? genError.message : genError);
             if (profileDataToSet && !profileDataToSet.avatarUrl) { 
                profileDataToSet.avatarUrl = 'https://placehold.co/40x40.png?text=CtxErr';
             }
          }
        }

        setUserProfile(profileDataToSet);
        setIsAdmin(profileDataToSet?.isAdmin || false);
        console.log('[AuthContext] User profile set:', profileDataToSet);

      } else {
        console.log('[AuthContext] No user authenticated.');
        setUserProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
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
