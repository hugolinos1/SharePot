
"use client";

import type { User as FirebaseUserType } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, ReactNode, Dispatch, SetStateAction } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, DocumentData } from 'firebase/firestore';
import type { User as AppUserType } from '@/data/mock-data'; 

interface AuthContextType {
  currentUser: FirebaseUserType | null;
  userProfile: AppUserType | null;
  setUserProfile: Dispatch<SetStateAction<AppUserType | null>>; // To allow profile updates from ProfilePage
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
        if (userDocSnap.exists()) {
          const profileData = { id: userDocSnap.id, ...userDocSnap.data() } as AppUserType;
          setUserProfile(profileData);
          setIsAdmin(profileData.isAdmin || false);
        } else {
          setUserProfile(null);
          setIsAdmin(false);
          console.warn(`User profile not found in Firestore for UID: ${user.uid}. Attempting to create one.`);
          // Potentially create a basic profile if it doesn't exist, e.g., after social sign-in
          // For email/password, this should be created at registration.
        }
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
    // State will be updated by onAuthStateChanged listener
  };

  const value = {
    currentUser,
    userProfile,
    setUserProfile, // Expose setter
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
