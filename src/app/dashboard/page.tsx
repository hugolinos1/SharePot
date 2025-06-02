
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Icons } from '@/components/icons';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';

import type { Project, User as AppUserType } from '@/data/mock-data';
import { BalanceSummary } from '@/components/dashboard/balance-summary';
import { db } from '@/lib/firebase';
import { collection, getDocs, Timestamp, query, where, orderBy, limit, doc, getDoc as firestoreGetDoc, type QueryConstraint } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { ExpenseItem } from '@/app/expenses/page';
import { useAuth } from '@/contexts/AuthContext';

const ExpenseAnalysisChart = dynamic(() => import('@/components/dashboard/expense-analysis-chart'), {
  ssr: false,
  loading: () => <div className="h-[350px] w-full bg-muted rounded-lg animate-pulse" />,
});

const ExpenseCategoryPieChart = dynamic(() => import('@/components/dashboard/expense-category-pie-chart'), {
  ssr: false,
  loading: () => <div className="h-[350px] w-full bg-muted rounded-lg animate-pulse flex items-center justify-center"><Icons.loader className="h-8 w-8 animate-spin"/></div>,
});


interface SummaryCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  description?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon, description }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </CardContent>
  </Card>
);

interface DisplayExpenseItem extends Omit<ExpenseItem, 'category'> {
  displayIcon: React.ElementType;
  category?: string;
}


const formatDateFromTimestamp = (timestampInput: Timestamp | string | Date | undefined): string => {
  if (!timestampInput) return 'N/A';

  let date: Date;

  if (timestampInput instanceof Timestamp) {
    date = timestampInput.toDate();
  } else if (timestampInput instanceof Date) {
    date = timestampInput;
  } else if (typeof timestampInput === 'string') {
    try {
      date = new Date(timestampInput);
      if (isNaN(date.getTime())) { // Check if date is valid
        throw new Error("Invalid date string");
      }
    } catch (e) {
      console.error("Error parsing date string:", e, "Input:", timestampInput);
      return 'Date invalide (str)';
    }
  } else {
    // Handle cases where the input is a Firestore-like object string
    // e.g., "Timestamp(seconds=..., nanoseconds=...)"
    if (typeof timestampInput === 'object' && 'seconds' in timestampInput && 'nanoseconds' in timestampInput) {
       try {
        const seconds = (timestampInput as any).seconds;
        const nanoseconds = (timestampInput as any).nanoseconds;
        date = new Timestamp(seconds, nanoseconds).toDate();
      } catch (e) {
        console.error("Error parsing Firestore Timestamp-like object:", e, "Input:", timestampInput);
        return 'Date invalide (TS obj)';
      }
    } else {
       console.error("Unhandled date/timestamp format:", timestampInput);
       return 'Format date inconnu';
    }
  }
  
  try {
    return format(date, 'PP', { locale: fr });
  } catch (e) {
     console.error("Error formatting date with date-fns:", e, "Input Date Object:", date);
     return 'Date invalide (format)';
  }
};


const getAvatarFallbackText = (name?: string | null, email?: string | null): string => {
  if (name && name.trim() !== '') {
    const parts = name.trim().split(' ');
    if (parts.length >= 2 && parts[0] && parts[parts.length - 1]) {
      return (parts[0][0] || '').toUpperCase() + (parts[parts.length - 1][0] || '').toUpperCase();
    }
    const singleName = parts[0];
    if (singleName && singleName.length >= 2) {
      return singleName.substring(0, 2).toUpperCase();
    }
    if (singleName && singleName.length === 1) {
      return singleName[0].toUpperCase();
    }
  }
  if (email && email.trim() !== '') {
    const emailPrefix = email.split('@')[0];
    if (emailPrefix && emailPrefix.length >= 2) {
      return emailPrefix.substring(0, 2).toUpperCase();
    }
    if (emailPrefix && emailPrefix.length === 1) {
      return emailPrefix[0].toUpperCase();
    }
  }
  return 'SP';
};


export default function DashboardPage() {
  const { currentUser, userProfile, isAdmin, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  
  const [recentExpenses, setRecentExpenses] = useState<DisplayExpenseItem[]>([]);
  const [isLoadingRecentExpenses, setIsLoadingRecentExpenses] = useState(true);
  
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  
  const [allUserProfiles, setAllUserProfiles] = useState<AppUserType[]>([]);
  const [isLoadingUserProfiles, setIsLoadingUserProfiles] = useState(true);

  const [userExpenseChartData, setUserExpenseChartData] = useState<Array<{ user: string; Dépenses: number }>>([]);
  const [categoryChartData, setCategoryChartData] = useState<Array<{ category: string; Dépenses: number }>>([]);
  const [isLoadingExpenseChartData, setIsLoadingExpenseChartData] = useState(true);

  const [detailedExpensesForSummary, setDetailedExpensesForSummary] = useState<ExpenseItem[]>([]);

  const [totalExpenseCount, setTotalExpenseCount] = useState<number | string>('...');
  const [isLoadingTotalExpenseCount, setIsLoadingTotalExpenseCount] = useState(true);


  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.replace('/login');
    }
  }, [authLoading, currentUser, router]);

  const fetchProjects = useCallback(async () => {
    if (!currentUser) {
      setProjects([]);
      setIsLoadingProjects(true); // Keep loading until user is confirmed or not
      return;
    }
    setIsLoadingProjects(true);
    console.log("DashboardPage: fetchProjects - Called for user:", currentUser.uid);
    try {
      const projectsCollectionRef = collection(db, "projects");
      const memberQuery = query(projectsCollectionRef,
        where("members", "array-contains", currentUser.uid)
      );
      const ownerQuery = query(projectsCollectionRef,
        where("ownerId", "==", currentUser.uid)
      );

      const [memberSnapshot, ownerSnapshot] = await Promise.all([
        getDocs(memberQuery),
        getDocs(ownerQuery)
      ]);

      const projectsMap = new Map<string, Project>();
      memberSnapshot.docs.forEach(docSnap => {
        projectsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as Project);
      });
      ownerSnapshot.docs.forEach(docSnap => {
        projectsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as Project);
      });

      const fetchedProjects = Array.from(projectsMap.values());
      setProjects(fetchedProjects);
      console.log("DashboardPage: Fetched projects:", fetchedProjects.length, "items");
    } catch (error) {
      console.error("Erreur lors de la récupération des projets: ", error);
      setProjects([]);
    } finally {
      setIsLoadingProjects(false);
    }
  }, [currentUser]); 

  const fetchRecentGlobalExpenses = useCallback(async () => {
    if (!currentUser || isLoadingProjects) {
      setRecentExpenses([]);
      setIsLoadingRecentExpenses(isLoadingProjects); 
      return;
    }
  
    setIsLoadingRecentExpenses(true);
    try {
      const expensesRef = collection(db, "expenses");
      let q;
  
      if (selectedProjectId !== 'all') {
        console.log(`DashboardPage: fetchRecentGlobalExpenses - Fetching for specific project ID: ${selectedProjectId}`);
        q = query(expensesRef, where("projectId", "==", selectedProjectId), orderBy("createdAt", "desc"), limit(5));
      } else { 
        if (isAdmin) {
          console.log("DashboardPage: fetchRecentGlobalExpenses - Admin fetching global expenses (all projects).");
          q = query(expensesRef, orderBy("createdAt", "desc"), limit(5));
        } else { 
          const userProjectIds = projects.map(p => p.id);
          if (userProjectIds.length === 0) {
            console.log("DashboardPage: fetchRecentGlobalExpenses - Non-admin, 'All Projects', no projects found. Clearing recent expenses.");
            setRecentExpenses([]);
            setIsLoadingRecentExpenses(false);
            return;
          }
          console.log("DashboardPage: fetchRecentGlobalExpenses - Non-admin, 'All Projects', fetching for project IDs:", userProjectIds);
          q = query(expensesRef, where("projectId", "in", userProjectIds), orderBy("createdAt", "desc"), limit(5));
        }
      }
  
      const querySnapshot = await getDocs(q);
      const fetchedExpenses = querySnapshot.docs.map(docSnap => {
         const data = docSnap.data() as ExpenseItem;
         return {
            ...data,
            id: docSnap.id,
            displayIcon: Icons.fileText, 
            expenseDate: data.expenseDate, 
        } as DisplayExpenseItem
      });
      setRecentExpenses(fetchedExpenses);
      console.log(`DashboardPage: Fetched recent expenses (context: ${selectedProjectId === 'all' ? 'global' : selectedProjectId}):`, fetchedExpenses.length, "items");
  
    } catch (error: any) {
      console.error("Erreur lors de la récupération des dépenses récentes: ", error);
      if (error.code === 'failed-precondition' && error.message.includes("index")) {
        console.warn("DashboardPage: Firestore index missing for recent expenses query. Please create it via the link in the Firebase console error.");
      }
      setRecentExpenses([]);
    } finally {
      setIsLoadingRecentExpenses(false);
    }
  }, [currentUser, isAdmin, projects, isLoadingProjects, selectedProjectId]);
  
 const fetchAllUserProfilesGlobal = useCallback(async () => {
    if (!currentUser) {
      console.warn("DashboardPage: fetchAllUserProfilesGlobal called without currentUser.");
      setAllUserProfiles([]);
      setIsLoadingUserProfiles(false);
      return;
    }
    
    console.log("DashboardPage: fetchAllUserProfiles. isAdmin:", isAdmin, "isLoadingProjects:", isLoadingProjects);
    setIsLoadingUserProfiles(true);

    if (isAdmin) {
      console.log("DashboardPage: fetchAllUserProfiles - Admin fetching all user profiles globally.");
      try {
        const usersCollectionRef = collection(db, "users");
        const usersSnapshot = await getDocs(usersCollectionRef);
        const usersList = usersSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as AppUserType));
        setAllUserProfiles(usersList);
        console.log("DashboardPage: fetchAllUserProfiles (Admin) - Successfully set allUserProfiles:", JSON.stringify(usersList.map(u => ({id: u.id, name: u.name}))));
      } catch (error) {
        console.error("Erreur lors de la récupération de tous les profils utilisateurs (Dashboard Admin): ", error);
        if (userProfile) setAllUserProfiles([userProfile]); else setAllUserProfiles([]);
      } finally {
        setIsLoadingUserProfiles(false);
      }
    } else { // Not admin
      if (isLoadingProjects) {
        console.log("DashboardPage: fetchAllUserProfiles (Non-Admin, 'All Projects' view) - Projects still loading. Will only use self profile for now.");
        if (userProfile) setAllUserProfiles([userProfile]); else setAllUserProfiles([]);
        // Keep isLoadingUserProfiles true or manage differently if waiting for projects to load for full member list
      } else if (projects.length > 0) {
        console.log("DashboardPage: fetchAllUserProfiles (Non-Admin, 'All Projects' view) - Projects loaded. Fetching profiles for all members of user's projects.");
        const allMemberUIDs = new Set<string>();
        projects.forEach(p => {
          if (p.members && Array.isArray(p.members)) {
            p.members.forEach(uid => allMemberUIDs.add(uid));
          }
          if (p.ownerId && !allMemberUIDs.has(p.ownerId)) {
            allMemberUIDs.add(p.ownerId);
          }
        });
        if (currentUser?.uid && !allMemberUIDs.has(currentUser.uid)) {
          allMemberUIDs.add(currentUser.uid);
        }

        if (allMemberUIDs.size > 0) {
          const profilesPromises = Array.from(allMemberUIDs).map(uid => firestoreGetDoc(doc(db, "users", uid)));
          try {
            const profileDocs = await Promise.all(profilesPromises);
            const fetchedProfiles = profileDocs
              .filter(docSnap => docSnap.exists())
              .map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as AppUserType));
            
            const uniqueProfilesMap = new Map<string, AppUserType>();
            fetchedProfiles.forEach(p => uniqueProfilesMap.set(p.id, p));
            
            if (userProfile && !uniqueProfilesMap.has(userProfile.id)) {
              uniqueProfilesMap.set(userProfile.id, userProfile);
            }
            const uniqueProfiles = Array.from(uniqueProfilesMap.values());
            setAllUserProfiles(uniqueProfiles);
            console.log("DashboardPage: fetchAllUserProfiles (Non-Admin, 'All Projects' view) - Successfully set allUserProfiles:", JSON.stringify(uniqueProfiles.map(u => ({id: u.id, name: u.name}))));
          } catch (e) {
            console.error("DashboardPage: Error fetching some user profiles for non-admin 'all projects' view:", e);
            if (userProfile) setAllUserProfiles([userProfile]); else setAllUserProfiles([]);
          } finally {
            setIsLoadingUserProfiles(false);
          }
        } else {
           console.log("DashboardPage: fetchAllUserProfiles (Non-Admin, 'All Projects' view) - No member UIDs found across projects. Setting self profile.");
           if (userProfile) setAllUserProfiles([userProfile]); else setAllUserProfiles([]);
           setIsLoadingUserProfiles(false);
        }
      } else { 
        console.log("DashboardPage: fetchAllUserProfiles (Non-Admin, 'All Projects' view) - No projects. Setting self profile.");
        if (userProfile) setAllUserProfiles([userProfile]); else setAllUserProfiles([]);
        setIsLoadingUserProfiles(false);
      }
    }
  }, [currentUser, isAdmin, userProfile, projects, isLoadingProjects]);


  const fetchSelectedProjectMembersProfiles = useCallback(async (projectId: string) => {
    if (!currentUser || !projectId || projectId === 'all') {
      // if 'all' is selected by non-admin, fetchAllUserProfilesGlobal handles it.
      // If 'all' by admin, also handled by fetchAllUserProfilesGlobal.
      // This function is for a *specific* project selection.
      return;
    }
    console.log(`DashboardPage: fetchSelectedProjectMembersProfiles - Fetching members for specific project ID: ${projectId}`);
    setIsLoadingUserProfiles(true); // We are loading profiles for this specific project context
    try {
      const projectRef = doc(db, "projects", projectId);
      const projectSnap = await firestoreGetDoc(projectRef);
      if (projectSnap.exists()) {
        const projectData = projectSnap.data() as Project;
        console.log(`DashboardPage: fetchSelectedProjectMembersProfiles - Project "${projectData.name}" members UIDs:`, projectData.members);
        if (projectData.members && projectData.members.length > 0) {
          const fetchedProfilesArray: AppUserType[] = [];
          for (const uid of projectData.members) {
            console.log(`DashboardPage: fetchSelectedProjectMembersProfiles - Attempting to fetch profile for UID: ${uid}`);
            try {
              const userDocRef = doc(db, "users", uid);
              const userDocSnap = await firestoreGetDoc(userDocRef);
              if (userDocSnap.exists()) {
                fetchedProfilesArray.push({ id: userDocSnap.id, ...userDocSnap.data() } as AppUserType);
                console.log(`DashboardPage: fetchSelectedProjectMembersProfiles - Profile fetched for UID ${uid}:`, userDocSnap.data());
              } else {
                console.warn(`DashboardPage: fetchSelectedProjectMembersProfiles - Profile for UID ${uid} not found in 'users' collection.`);
                fetchedProfilesArray.push({ id: uid, name: `UID: ${uid.substring(0,6)}... (profil manquant)` , email: "", isAdmin: false, avatarUrl: '' });
              }
            } catch (profileError) {
               console.error(`DashboardPage: fetchSelectedProjectMembersProfiles - Error fetching profile for UID ${uid}:`, profileError);
               fetchedProfilesArray.push({ id: uid, name: `UID: ${uid.substring(0,6)}... (erreur chargement)` , email: "", isAdmin: false, avatarUrl: '' });
            }
          }
          setAllUserProfiles(fetchedProfilesArray); // This now holds profiles for *only* the selected project's members
          console.log(`DashboardPage: Successfully fetched members for selected project "${projectData.name}":`, JSON.stringify(fetchedProfilesArray.map(p => ({id: p.id, name: p.name}))));
        } else {
          console.log(`DashboardPage: fetchSelectedProjectMembersProfiles - Project "${projectData.name}" has no members. Setting empty profiles.`);
          setAllUserProfiles([]); // No members, so no profiles to show for this project
        }
      } else {
        console.warn(`DashboardPage: fetchSelectedProjectMembersProfiles - Project with ID ${projectId} not found.`);
        setAllUserProfiles([]); // Project not found, clear profiles
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des membres du projet sélectionné: ", error);
      setAllUserProfiles([]);
    } finally {
      setIsLoadingUserProfiles(false);
    }
  }, [currentUser]);


 const fetchAndProcessExpensesForChart = useCallback(async () => {
    console.log(`Chart: fetchAndProcessExpensesForChart called. SelectedProjectId: ${selectedProjectId}, isLoadingUserProfiles: ${isLoadingUserProfiles}, isLoadingProjects: ${isLoadingProjects}`);
    console.log(`Chart: Current allUserProfiles at start:`, JSON.stringify(allUserProfiles.map(u => ({id: u.id, name: u.name}))));

    if (!currentUser || isLoadingProjects || isLoadingUserProfiles ) { 
      console.log(`Chart: Bailing early. Conditions - currentUser: ${!!currentUser}, isLoadingProjects: ${isLoadingProjects}, isLoadingUserProfiles: ${isLoadingUserProfiles}`);
      setUserExpenseChartData([]);
      setCategoryChartData([]);
      setTotalExpenseCount(0);
      setDetailedExpensesForSummary([]);
      setIsLoadingExpenseChartData(false); // Ensure loading is false if bailing
      setIsLoadingTotalExpenseCount(false);
      return;
    }

    if (selectedProjectId !== 'all' && (!projects.find(p => p.id === selectedProjectId) || allUserProfiles.length === 0)) {
      console.log(`Chart: Selected project ${selectedProjectId} details or its member profiles not ready. allUserProfiles length: ${allUserProfiles.length}`);
      // Potentially wait or bail if critical info for a specific project isn't there
    }


    setIsLoadingExpenseChartData(true);
    setIsLoadingTotalExpenseCount(true);

    let projectIdsToQuery: string[] = [];
    if (selectedProjectId === 'all') {
      if (projects.length === 0 && !isAdmin) { 
        console.log("Chart: 'All projects' selected, but non-admin user has no projects. Clearing chart data.");
        setUserExpenseChartData([]);
        setCategoryChartData([]);
        setTotalExpenseCount(0);
        setDetailedExpensesForSummary([]);
        setIsLoadingExpenseChartData(false);
        setIsLoadingTotalExpenseCount(false);
        return;
      }
      projectIdsToQuery = isAdmin ? projects.map(p => p.id) : projects.filter(p => p.members && p.members.includes(currentUser.uid) || p.ownerId === currentUser.uid).map(p => p.id);
      if (isAdmin && projectIdsToQuery.length === 0 && projects.length > 0){ 
        projectIdsToQuery = projects.map(p => p.id); 
      }
    } else {
      projectIdsToQuery = [selectedProjectId];
    }
    console.log("Chart: projectIdsToQuery:", projectIdsToQuery);

    if (projectIdsToQuery.length === 0 && !(isAdmin && selectedProjectId === 'all')) { 
      console.log("Chart: No project IDs to query. Setting empty chart data.");
      setUserExpenseChartData([]);
      setCategoryChartData([]);
      setTotalExpenseCount(0);
      setDetailedExpensesForSummary([]);
      setIsLoadingExpenseChartData(false);
      setIsLoadingTotalExpenseCount(false);
      return;
    }

    try {
      const expensesRef = collection(db, "expenses");
      let fetchedExpenses: ExpenseItem[] = []; 
      
      if (isAdmin && selectedProjectId === 'all' && projectIdsToQuery.length === 0) {
          console.log("Chart: Admin fetching all expenses globally (no projectId filter).");
          const q = query(expensesRef); // Fetch all expenses
          const querySnapshot = await getDocs(q);
          querySnapshot.docs.forEach(docSnap => {
             const data = docSnap.data() as ExpenseItem; 
             if (data.paidById && data.amountEUR != null) { 
                fetchedExpenses.push({id: docSnap.id, ...data});
             }
          });
      } else if (projectIdsToQuery.length > 0) {
          const CHUNK_SIZE = 30; 
          for (let i = 0; i < projectIdsToQuery.length; i += CHUNK_SIZE) {
            const chunk = projectIdsToQuery.slice(i, i + CHUNK_SIZE);
            if (chunk.length > 0) {
              const q = query(expensesRef, where("projectId", "in", chunk));
              const querySnapshot = await getDocs(q);
              querySnapshot.docs.forEach(docSnap => {
                 const data = docSnap.data() as ExpenseItem; 
                 if (data.paidById && data.amountEUR != null) { 
                    fetchedExpenses.push({id: docSnap.id, ...data});
                 }
              });
            }
          }
      } else if (!isAdmin && selectedProjectId === 'all' && projectIdsToQuery.length === 0) {
         console.log("Chart: Non-admin, 'All Projects', no specific project IDs to query after filtering. Clearing chart data.");
         setUserExpenseChartData([]);
         setCategoryChartData([]);
         setTotalExpenseCount(0);
         setDetailedExpensesForSummary([]);
         setIsLoadingExpenseChartData(false);
         setIsLoadingTotalExpenseCount(false);
         return;
      }

      console.log("Chart: Fetched expenses for chart:", fetchedExpenses.length, "items");
      setTotalExpenseCount(fetchedExpenses.length);
      setDetailedExpensesForSummary(fetchedExpenses); // Set detailed expenses for BalanceSummary

      const aggregatedExpensesByUser: { [paidById: string]: number } = {};
      fetchedExpenses.forEach(expense => {
        const amountToAdd = expense.amountEUR ?? 0; // Use EUR amount, fallback to 0 if null
        aggregatedExpensesByUser[expense.paidById] = (aggregatedExpensesByUser[expense.paidById] || 0) + amountToAdd;
      });
      console.log("Chart: Aggregated expenses by paidById (UID) (EUR):", aggregatedExpensesByUser);

      const formattedUserChartData = Object.entries(aggregatedExpensesByUser).map(([paidById, totalAmountEUR]) => {
        const user = allUserProfiles.find(u => u.id === paidById);
        const userName = user?.name || paidById; 
        console.log(`Chart: (Inside map) paidById: ${paidById}. allUserProfiles used for name lookup:`, JSON.stringify(allUserProfiles.map(u => ({id: u.id, name: u.name}))));
        console.log(`Chart (User): Mapping UID ${paidById} to userName ${userName}. Profile found: ${!!user}. Total EUR: ${totalAmountEUR}`);
        return { user: userName, Dépenses: totalAmountEUR * 100 }; // Convert EUR to cents for chart display
      });
      console.log("Chart (User): Final formattedUserChartData:", formattedUserChartData);
      setUserExpenseChartData(formattedUserChartData);

      const aggregatedExpensesByCategory: { [category: string]: number } = {};
      fetchedExpenses.forEach(expense => {
        const category = expense.category || "Non catégorisé"; 
        const amountToAdd = expense.amountEUR ?? 0; // Use EUR amount
        aggregatedExpensesByCategory[category] = (aggregatedExpensesByCategory[category] || 0) + amountToAdd;
      });
      console.log("Chart: Aggregated expenses by category (EUR):", aggregatedExpensesByCategory);
      const formattedCategoryChartData = Object.entries(aggregatedExpensesByCategory).map(([category, totalAmountEUR]) => {
        return { category: category, Dépenses: totalAmountEUR * 100 }; // Convert EUR to cents
      });
      console.log("Chart (Category): Final formattedCategoryChartData:", formattedCategoryChartData);
      setCategoryChartData(formattedCategoryChartData);

    } catch (error) {
      console.error("Erreur lors du traitement des dépenses pour le graphique: ", error);
      setUserExpenseChartData([]);
      setCategoryChartData([]);
      setTotalExpenseCount(0);
      setDetailedExpensesForSummary([]);
    } finally {
      setIsLoadingExpenseChartData(false);
      setIsLoadingTotalExpenseCount(false);
    }
  }, [currentUser, projects, selectedProjectId, allUserProfiles, isLoadingUserProfiles, isLoadingProjects, isAdmin]);


  useEffect(() => {
    console.log("DashboardPage: useEffect (Core data) - Fetching projects.");
    if (currentUser) {
      fetchProjects();
    } else if (!authLoading) { // Only reset if not loading and no user
      setProjects([]);
      setIsLoadingProjects(false); // Explicitly set loading to false
      setRecentExpenses([]);
      setIsLoadingRecentExpenses(false);
    }
  }, [currentUser, authLoading, fetchProjects]);

  useEffect(() => {
    console.log(`DashboardPage: useEffect (Recent Expenses) - Triggered. currentUser: ${!!currentUser}, isLoadingProjects: ${isLoadingProjects}, selectedProjectId: ${selectedProjectId}`);
    if (currentUser && !isLoadingProjects) { 
      console.log("DashboardPage: useEffect (Recent Expenses) - Conditions met, calling fetchRecentGlobalExpenses.");
      fetchRecentGlobalExpenses();
    } else {
      console.log("DashboardPage: useEffect (Recent Expenses) - Conditions NOT met (waiting for user or projects).");
       if(!currentUser && !authLoading) { 
        setRecentExpenses([]);
        setIsLoadingRecentExpenses(false);
      }
    }
  }, [currentUser, selectedProjectId, isLoadingProjects, fetchRecentGlobalExpenses, authLoading]);


 useEffect(() => {
    console.log(`DashboardPage: useEffect (User Profiles) - Triggered. currentUser: ${!!currentUser}, isAdmin: ${isAdmin}, selectedProjectId: ${selectedProjectId}, isLoadingProjects: ${isLoadingProjects}`);
    if (currentUser && !authLoading) { // Ensure auth is settled
        if (selectedProjectId === 'all') {
             fetchAllUserProfilesGlobal(); 
        } else { 
            fetchSelectedProjectMembersProfiles(selectedProjectId);
        }
    } else if (!authLoading && !currentUser) { // Auth settled, no user
        setAllUserProfiles([]);
        setIsLoadingUserProfiles(false); 
    }
  }, [currentUser, isAdmin, selectedProjectId, isLoadingProjects, authLoading, fetchAllUserProfilesGlobal, fetchSelectedProjectMembersProfiles]);


  useEffect(() => {
    console.log(`DashboardPage: useEffect (chart data) triggered. Conditions - currentUser: ${!!currentUser}, isLoadingProjects: ${isLoadingProjects}, isLoadingUserProfiles: ${isLoadingUserProfiles}, allUserProfiles.length: ${allUserProfiles.length} Content of allUserProfiles for chart useEffect:`, JSON.stringify(allUserProfiles.map(u=>({id: u.id, name:u.name}))));

    if (currentUser && !isLoadingProjects && !isLoadingUserProfiles ) {
       console.log(`DashboardPage: useEffect (chart data) - Conditions MET. allUserProfiles.length: ${allUserProfiles.length}`);
       // Ensure allUserProfiles is not empty unless it's a non-admin with no projects, or admin with no projects.
       if (allUserProfiles.length > 0 || (projects.length === 0 && (!isAdmin || selectedProjectId === 'all') ) || (isAdmin && selectedProjectId === 'all') ) { 
           console.log("DashboardPage: useEffect (chart data) - Calling fetchAndProcessExpensesForChart.");
           fetchAndProcessExpensesForChart();
       } else {
           console.warn("DashboardPage: useEffect (chart data) - Conditions not fully met for optimal chart data (e.g., profiles empty but projects exist for non-admin specific project selection). Clearing chart data for safety.");
           setUserExpenseChartData([]);
           setCategoryChartData([]);
           setTotalExpenseCount(0);
           setDetailedExpensesForSummary([]);
           setIsLoadingExpenseChartData(false);
           setIsLoadingTotalExpenseCount(false);
       }
    } else {
      console.log("DashboardPage: useEffect (chart data) - Conditions NOT MET for fetching chart data (waiting for projects or profiles).");
       if(!currentUser && !authLoading) { // Auth settled, no user
        setUserExpenseChartData([]);
        setCategoryChartData([]);
        setTotalExpenseCount(0);
        setDetailedExpensesForSummary([]);
        setIsLoadingExpenseChartData(false);
        setIsLoadingTotalExpenseCount(false);
      }
    }
  }, [currentUser, selectedProjectId, allUserProfiles, projects, isLoadingProjects, isLoadingUserProfiles, authLoading, isAdmin, fetchAndProcessExpensesForChart]);


  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error("Erreur de déconnexion:", error);
      toast({ title: "Erreur de déconnexion", variant: "destructive" });
    }
  };

  const selectedProject = useMemo(() => {
    console.log(`DashboardPage: Calculating selectedProject. selectedProjectId: ${selectedProjectId}, isLoadingProjects: ${isLoadingProjects}, projects count: ${projects.length}`);
    if (selectedProjectId === 'all' || isLoadingProjects) return null;
    const foundProject = projects.find(p => p.id === selectedProjectId);
    console.log(`DashboardPage: Found project for ID ${selectedProjectId}:`, foundProject ? foundProject.name : 'Not found');
    return foundProject;
  }, [selectedProjectId, projects, isLoadingProjects]);

  const summaryData = useMemo(() => {
    if (isLoadingProjects || (selectedProjectId !== 'all' && isLoadingUserProfiles)) {
        return { totalSpent: "Chargement...", expenseCount: "...", participantsCount: "...", averagePerPerson: "..." };
    }

    const projectToSummarize = selectedProject; 

    if (!projectToSummarize && selectedProjectId !== 'all') {
        return { totalSpent: "0,00 €", expenseCount: isLoadingTotalExpenseCount ? '...' : totalExpenseCount.toString(), participantsCount: "0", averagePerPerson: "0,00 €" };
    }
    
    let totalSpentAll = 0;
    let participantsSet = new Set<string>();
    let expenseCountForSummary = isLoadingTotalExpenseCount ? '...' : totalExpenseCount.toString();

    if (projectToSummarize) { // Specific project selected
        totalSpentAll = projectToSummarize.totalExpenses || 0;
        if (projectToSummarize.members && Array.isArray(projectToSummarize.members)) {
            projectToSummarize.members.forEach(memberUid => participantsSet.add(memberUid));
        }
        // For specific project, expenseCount is from totalExpenseCount if it matches the project, or re-fetch if needed.
        // Here, totalExpenseCount is already filtered by selectedProjectId in fetchAndProcessExpensesForChart.
    } else { // "All projects" selected
        projects.forEach(p => {
            totalSpentAll += (p.totalExpenses || 0);
            if(p.members && Array.isArray(p.members)) {
                p.members.forEach(memberUid => participantsSet.add(memberUid));
            }
        });
    }
    
    const participantsCount = participantsSet.size > 0 ? participantsSet.size : (projects.length === 0 && userProfile ? 1 : 0) ;
    const averagePerPersonAll = participantsCount > 0 ? totalSpentAll / participantsCount : 0;

    return {
      totalSpent: `${totalSpentAll.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`,
      expenseCount: expenseCountForSummary,
      participantsCount: participantsCount.toString(),
      averagePerPerson: `${averagePerPersonAll.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`,
    };
  }, [selectedProject, projects, isLoadingProjects, userProfile, isLoadingUserProfiles, allUserProfiles, selectedProjectId, currentUser, totalExpenseCount, isLoadingTotalExpenseCount]);


  if (authLoading || !currentUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Icons.loader className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen>
      <Sidebar 
        className="border-r text-white" 
        style={{ backgroundColor: '#5b43d7' }} 
        collapsible="icon"
      >
        <SidebarHeader className="p-4">
           <Link href="/dashboard" className="block w-full">
             <Image
              src="https://i.ibb.co/Swfy8wfX/logo-Share-Pot-full.png"
              alt="SharePot Logo"
              width={251} 
              height={50} 
              className="w-full h-auto" 
              data-ai-hint="app logo"
              priority
            />
          </Link>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive>
                <Link href="/dashboard"><Icons.layoutDashboard /> Tableau de bord</Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/projects"><Icons.folders /> Projets</Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
               <SidebarMenuButton onClick={() => router.push('/expenses')}>
                <Icons.receipt /> Dépenses
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/expenses/new"><Icons.plusSquare /> Nouvelle dépense</Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

          </SidebarMenu>
          {isAdmin && (
            <>
              <Separator className="my-4" />
              <SidebarGroup>
                <SidebarGroupLabel className="text-white/70">ADMINISTRATION</SidebarGroupLabel>
                <SidebarMenu>
                    <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                        <Link href="/users"><Icons.users /> Utilisateurs</Link>
                    </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                        <Link href="/admin"><Icons.settings /> Gestion Projets (Admin)</Link>
                    </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>
            </>
          )}
        </SidebarContent>
        <SidebarFooter className="p-4">
           <Button
              variant="ghost"
              onClick={handleLogout}
              className="text-white border border-white/50 hover:bg-purple-700 hover:border-purple-500 w-full justify-start"
            >
                <Icons.logOut className="mr-2 h-4 w-4" /> Déconnexion
          </Button>
          <p className="text-xs text-center text-white/70 mt-2">Version 2.01</p>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="flex flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6 shadow-sm">
          <SidebarTrigger><Icons.chevronsLeft /></SidebarTrigger>
          <div className="relative flex-1">
            <Icons.search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Rechercher..." className="pl-10 w-full md:w-1/3 lg:w-1/4 placeholder:text-foreground" data-ai-hint="search input"/>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Icons.bell className="h-5 w-5" />
              <span className="sr-only">Notifications</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-9 w-9 cursor-pointer">
                  <AvatarImage
                    src={userProfile?.avatarUrl && userProfile.avatarUrl.trim() !== '' ? userProfile.avatarUrl : undefined}
                    alt={userProfile?.name || currentUser?.email || "User"}
                    data-ai-hint="user avatar"
                  />
                  <AvatarFallback>{getAvatarFallbackText(userProfile?.name, currentUser?.email)}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{userProfile?.name || currentUser?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <Icons.user className="mr-2 h-4 w-4" />
                    Mon Profil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                   <Link href="#">
                    <Icons.settings className="mr-2 h-4 w-4" />
                    Paramètres
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <Icons.logOut className="mr-2 h-4 w-4" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">Tableau de bord</h1>
              <p className="text-foreground">
                {selectedProject ? `Aperçu du projet: ${selectedProject.name}` : `Bienvenue, ${userProfile?.name || currentUser?.email || 'Utilisateur'}.`}
              </p>
            </div>
            <div className="w-full sm:w-auto sm:min-w-[250px] md:min-w-[300px] space-y-1.5 bg-card p-4 rounded-lg shadow">
             <Label htmlFor="project-filter-select" className="text-sm font-medium text-card-foreground/80">Filtrer par projet</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId} disabled={isLoadingProjects}>
                <SelectTrigger id="project-filter-select" className="w-full py-2.5 text-base bg-background" data-ai-hint="project filter">
                  <SelectValue placeholder={isLoadingProjects ? "Chargement..." : "Sélectionner un projet"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les projets</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <SummaryCard title="Total dépensé" value={summaryData.totalSpent} icon={<Icons.euro className="h-5 w-5 text-muted-foreground" />} />
            <SummaryCard title="Nombre de Dépenses" value={summaryData.expenseCount} icon={<Icons.fileText className="h-5 w-5 text-muted-foreground" />} description="Total pour la sélection actuelle"/>
            <SummaryCard title="Participants" value={summaryData.participantsCount} icon={<Icons.users className="h-5 w-5 text-muted-foreground" />} description={selectedProject ? "Dans ce projet" : "Total unique"}/>
            <SummaryCard title="Moyenne / pers." value={summaryData.averagePerPerson} icon={<Icons.lineChart className="h-5 w-5 text-muted-foreground" />} />
          </div>

          <BalanceSummary
            projectDataForBalance={selectedProject} // Pass selectedProject which can be null
            detailedExpensesForBalance={detailedExpensesForSummary}
            memberProfilesForBalance={allUserProfiles} // This list updates based on admin status and project selection
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Analyse des dépenses</CardTitle>
                <CardDescription>
                  {selectedProject ? `Dépenses pour ${selectedProject.name}` : "Vue d'ensemble des dépenses"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <Tabs defaultValue="user">
                  <TabsList className="mb-4">
                    <TabsTrigger value="user">Par utilisateur</TabsTrigger>
                    <TabsTrigger value="category">Par catégorie</TabsTrigger>
                  </TabsList>
                  <TabsContent value="user">
                     <ExpenseAnalysisChart data={userExpenseChartData} isLoading={isLoadingExpenseChartData} yAxisDataKey="user" />
                  </TabsContent>
                  <TabsContent value="category">
                     <ExpenseCategoryPieChart data={categoryChartData} isLoading={isLoadingExpenseChartData} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>
                  {selectedProjectId !== 'all' && selectedProject ?
                    `Dépenses récentes pour ${selectedProject.name}` :
                    "Dépenses récentes (globales)"}
                </CardTitle>
                <CardDescription>
                  {selectedProjectId !== 'all' && selectedProject ?
                    `Les 5 dernières transactions pour ce projet.` :
                    `Les 5 dernières transactions globales ${isAdmin ? "" : "(sur vos projets)"}.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingRecentExpenses && (
                    <div className="text-center py-4"><Icons.loader className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
                )}
                {!isLoadingRecentExpenses && recentExpenses.length > 0 ? (
                  recentExpenses.map(expense => (
                    <div key={expense.id} className="flex items-start gap-4 p-3 bg-muted/50 rounded-lg">
                      <div className="p-2 bg-primary/10 rounded-md">
                           <Icons.fileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <p className="font-medium">{expense.title}</p>
                          <p className="font-semibold text-sm">
                            {expense.amount.toLocaleString('fr-FR', {style: 'currency', currency: expense.currency || 'EUR'})}
                            {expense.currency !== 'EUR' && (
                                <span className="block text-xs text-muted-foreground font-normal">
                                (env. {expense.amountEUR != null ? expense.amountEUR.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) : 'N/A'})
                                </span>
                            )}
                          </p>
                        </div>
                         <p className="text-xs text-muted-foreground">{expense.projectName} • {formatDateFromTimestamp(expense.expenseDate)}</p>
                        {expense.category && <Badge variant="outline" className="text-xs mt-1">{expense.category}</Badge>}
                      </div>
                    </div>
                  ))
                ) : (
                  !isLoadingRecentExpenses && <p className="text-muted-foreground text-center py-4">Aucune dépense récente à afficher.</p>
                )}
                 <Button variant="link" className="w-full mt-2 text-primary" asChild>
                    <Link href="/expenses">Voir toutes les dépenses</Link>
                 </Button>
              </CardContent>
            </Card>
          </div>

        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

