
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
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        let profileDataToSet: AppUserType | null = null;

        if (userDocSnap.exists()) {
          profileDataToSet = { id: userDocSnap.id, ...userDocSnap.data() } as AppUserType;
        } else {
          console.warn(`User profile document not found in Firestore for UID: ${user.uid}. Using fallback profile data.`);
          profileDataToSet = {
            id: user.uid,
            name: user.displayName || user.email?.split('@')[0] || "Utilisateur",
            email: user.email || "",
            isAdmin: false, 
            avatarUrl: user.photoURL || '', 
          };
        }
        
        if (profileDataToSet && (!profileDataToSet.avatarUrl || profileDataToSet.avatarUrl.startsWith('https://ui-avatars.com'))) {
          console.log(`AuthContext: User ${profileDataToSet.name} has no avatar or a default one, attempting to generate a new one.`);
          try {
            const seedText = profileDataToSet.name || profileDataToSet.email || 'user';
            const generatedAvatarUrl = await generateAvatar({ seedText });
            if (generatedAvatarUrl && !generatedAvatarUrl.includes('placehold.co')) { // Check if generation was successful
              profileDataToSet.avatarUrl = generatedAvatarUrl;
              console.log(`AuthContext: Generated avatar for ${profileDataToSet.name}: ${generatedAvatarUrl.substring(0,50)}...`);
            } else {
              console.warn(`AuthContext: Avatar generation failed or returned placeholder for ${profileDataToSet.name}.`)
            }
          } catch (genError) {
            console.error(`AuthContext: Error generating avatar for ${profileDataToSet.name}:`, genError);
          }
        }
        
        setUserProfile(profileDataToSet);
        setIsAdmin(profileDataToSet?.isAdmin || false);

      } else {
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
