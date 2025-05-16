
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
            avatarUrl: user.photoURL || '', // Prioritize Firebase Auth photoURL if available
            createdAt: undefined, // Or new Timestamp(0,0) if needed, but usually not for fallback
          };
        }

        // Check if avatar generation is needed
        const needsAvatarGeneration = profileDataToSet && (!profileDataToSet.avatarUrl || profileDataToSet.avatarUrl.startsWith('https://ui-avatars.com'));
        console.log(`[AuthContext] Profile for ${profileDataToSet?.name}: Current avatarUrl: '${profileDataToSet?.avatarUrl}'. Needs generation: ${needsAvatarGeneration}`);

        if (needsAvatarGeneration) {
          const seedText = profileDataToSet.name || profileDataToSet.email || 'user_avatar_seed';
          console.log(`[AuthContext] Attempting to generate avatar for ${profileDataToSet.name} with seed: "${seedText}"`);
          try {
            const generatedAvatarUrl = await generateAvatar({ seedText });
            if (generatedAvatarUrl && !generatedAvatarUrl.includes('placehold.co')) { // Check if generation was successful
              profileDataToSet.avatarUrl = generatedAvatarUrl;
              console.log(`[AuthContext] Successfully generated and set avatar for ${profileDataToSet.name}.`);
            } else {
              console.warn(`[AuthContext] Avatar generation failed or returned placeholder for ${profileDataToSet.name}. Fallback URL: ${generatedAvatarUrl}`);
              // Keep the placeholder URL if generation failed, or let it be empty if it was initially empty
              if (generatedAvatarUrl.includes('placehold.co')) {
                profileDataToSet.avatarUrl = generatedAvatarUrl;
              } else if (!profileDataToSet.avatarUrl) { // If it was empty and generation returned nothing valid
                 profileDataToSet.avatarUrl = ''; // Keep it empty or set a default error image
              }
            }
          } catch (genError) {
            console.error(`[AuthContext] Error during avatar generation for ${profileDataToSet.name}:`, genError);
             if (!profileDataToSet.avatarUrl) { // If it was empty and generation errored
                profileDataToSet.avatarUrl = 'https://placehold.co/40x40.png?text=Err'; // Fallback on error if still no avatar
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
