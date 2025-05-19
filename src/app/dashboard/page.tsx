
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

interface DisplayExpenseItem extends ExpenseItem {
  displayIcon: React.ElementType;
  category?: string;
}

const formatDateFromTimestamp = (timestamp: Timestamp | string | undefined): string => {
  if (!timestamp) return 'N/A';
  if (typeof timestamp === 'string') {
    try {
      return format(new Date(timestamp), 'PP', { locale: fr });
    } catch (e) { return 'Date invalide'; }
  }
  if (timestamp instanceof Timestamp) {
    return format(timestamp.toDate(), 'PP', { locale: fr });
  }
  return 'Date invalide';
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [recentGlobalExpenses, setRecentGlobalExpenses] = useState<DisplayExpenseItem[]>([]);
  const [isLoadingRecentExpenses, setIsLoadingRecentExpenses] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [allUserProfiles, setAllUserProfiles] = useState<AppUserType[]>([]);
  const [isLoadingUserProfiles, setIsLoadingUserProfiles] = useState(true);
  const { toast } = useToast();

  const [userExpenseChartData, setUserExpenseChartData] = useState<Array<{ user: string; Dépenses: number }>>([]);
  const [categoryChartData, setCategoryChartData] = useState<Array<{ category: string; Dépenses: number }>>([]);
  const [isLoadingExpenseChartData, setIsLoadingExpenseChartData] = useState(true);


  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.replace('/login');
    }
  }, [authLoading, currentUser, router]);

  const fetchProjects = useCallback(async () => {
    if (!currentUser) return;
    setIsLoadingProjects(true);
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
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger les projets pour le filtre.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingProjects(false);
    }
  }, [currentUser, toast]);

  const fetchRecentGlobalExpenses = useCallback(async () => {
    if (!currentUser) return;
    setIsLoadingRecentExpenses(true);
    try {
        const expensesRef = collection(db, "expenses");
        let q;
        if (isAdmin) {
          q = query(expensesRef, orderBy("createdAt", "desc"), limit(5));
        } else {
          q = query(expensesRef, where("createdBy", "==", currentUser.uid), orderBy("createdAt", "desc"), limit(5));
        }
        
        const querySnapshot = await getDocs(q);
        const fetchedExpenses = querySnapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data(),
            displayIcon: Icons.fileText, 
        } as DisplayExpenseItem));
        setRecentGlobalExpenses(fetchedExpenses);
    } catch (error: any) {
        console.error("Erreur lors de la récupération des dépenses récentes: ", error);
        if (error.code === 'failed-precondition') {
             toast({
                title: "Index Firestore manquant",
                description: "Un index est requis pour cette requête. Veuillez vérifier la console Firebase pour le créer.",
                variant: "destructive",
                duration: 10000,
            });
        } else {
            toast({
                title: "Erreur de chargement",
                description: "Impossible de charger les dépenses récentes.",
                variant: "destructive",
            });
        }
    } finally {
        setIsLoadingRecentExpenses(false);
    }
  }, [currentUser, isAdmin, toast]);
  
  const fetchAllUserProfilesGlobal = useCallback(async () => {
    console.log("DashboardPage: fetchAllUserProfilesGlobal - Fetching all user profiles (admin).");
    setIsLoadingUserProfiles(true);
    try {
      const usersCollectionRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersCollectionRef);
      const usersList = usersSnapshot.docs.map(docSnap => ({
        id: docSnap.id, ...docSnap.data(),
      } as AppUserType));
      setAllUserProfiles(usersList);
      console.log("DashboardPage: Successfully fetched allUserProfiles:", usersList.length);
    } catch (error) {
      console.error("Erreur lors de la récupération de tous les profils utilisateurs (Dashboard Admin): ", error);
      toast({
        title: "Erreur de chargement (Profils)",
        description: "Impossible de charger tous les profils utilisateurs.",
        variant: "destructive",
      });
      setAllUserProfiles([]); 
    } finally {
      setIsLoadingUserProfiles(false);
    }
  }, [toast]);

  const fetchSelectedProjectMembersProfiles = useCallback(async (projectId: string) => {
    console.log(`DashboardPage: fetchSelectedProjectMembersProfiles - Fetching members for project ID: ${projectId}`);
    setIsLoadingUserProfiles(true);
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
          setAllUserProfiles(fetchedProfilesArray);
          console.log(`DashboardPage: Successfully fetched members for selected project "${projectData.name}":`, fetchedProfilesArray.map(p => ({id: p.id, name: p.name})));
        } else {
          console.log(`DashboardPage: fetchSelectedProjectMembersProfiles - Project "${projectData.name}" has no members. Setting self profile.`);
           if (userProfile) setAllUserProfiles([userProfile]); else setAllUserProfiles([]);
        }
      } else {
        toast({title: "Erreur", description: "Projet sélectionné non trouvé.", variant: "destructive"});
        if (userProfile) setAllUserProfiles([userProfile]); else setAllUserProfiles([]);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des membres du projet sélectionné: ", error);
      if (userProfile) setAllUserProfiles([userProfile]); else setAllUserProfiles([]);
    } finally {
      setIsLoadingUserProfiles(false);
    }
  }, [toast, userProfile]);


 const fetchAndProcessExpensesForChart = useCallback(async () => {
    console.log("Chart: fetchAndProcessExpensesForChart called. SelectedProjectId:", selectedProjectId, "isLoadingUserProfiles:", isLoadingUserProfiles);
    console.log("Chart: Current allUserProfiles at start of fetchAndProcessExpensesForChart:", JSON.stringify(allUserProfiles.map(u => ({id: u.id, name: u.name}))));

    if (!currentUser || (isLoadingUserProfiles && allUserProfiles.length === 0)) {
      console.log("Chart: Bailing early. Conditions: currentUser:", !!currentUser, "isLoadingUserProfiles:", isLoadingUserProfiles, "allUserProfiles.length:", allUserProfiles.length);
      setUserExpenseChartData([]);
      setCategoryChartData([]);
      setIsLoadingExpenseChartData(false);
      return;
    }

    setIsLoadingExpenseChartData(true);

    let projectIdsToQuery: string[] = [];
    if (selectedProjectId === 'all') {
      if (projects.length === 0 && !isLoadingProjects) {
        console.log("Chart: 'All projects' selected, but user has no projects. Clearing chart data.");
        setUserExpenseChartData([]);
        setCategoryChartData([]);
        setIsLoadingExpenseChartData(false);
        return;
      }
      projectIdsToQuery = projects.map(p => p.id);
    } else {
      projectIdsToQuery = [selectedProjectId];
    }
    console.log("Chart: projectIdsToQuery:", projectIdsToQuery);

    if (projectIdsToQuery.length === 0) {
      if (isLoadingProjects) {
        console.log("Chart: No project IDs to query YET because projects are still loading. Will wait.");
      } else {
        console.log("Chart: No project IDs to query (and projects not loading). Setting empty chart data.");
        setUserExpenseChartData([]);
        setCategoryChartData([]);
      }
      setIsLoadingExpenseChartData(false);
      return;
    }

    try {
      const expensesRef = collection(db, "expenses");
      let fetchedExpenses: ExpenseItem[] = [];
      const CHUNK_SIZE = 30; 
      for (let i = 0; i < projectIdsToQuery.length; i += CHUNK_SIZE) {
        const chunk = projectIdsToQuery.slice(i, i + CHUNK_SIZE);
        if (chunk.length > 0) {
          const q = query(expensesRef, where("projectId", "in", chunk));
          const querySnapshot = await getDocs(q);
          querySnapshot.docs.forEach(docSnap => {
             const data = docSnap.data() as ExpenseItem;
             if (data.paidById && data.amount != null) { 
                fetchedExpenses.push({id: docSnap.id, ...data});
             } else {
                console.warn("Chart: Filtered out expense due to missing paidById or amount:", docSnap.id, data);
             }
          });
        }
      }
      console.log("Chart: Fetched expenses for chart:", fetchedExpenses.length, "items");

      const aggregatedExpensesByUser: { [paidById: string]: number } = {};
      fetchedExpenses.forEach(expense => {
        aggregatedExpensesByUser[expense.paidById] = (aggregatedExpensesByUser[expense.paidById] || 0) + expense.amount;
      });
      console.log("Chart: Aggregated expenses by paidById (UID):", aggregatedExpensesByUser);

      const formattedUserChartData = Object.entries(aggregatedExpensesByUser).map(([paidById, totalAmount]) => {
        const user = allUserProfiles.find(u => u.id === paidById);
        const userName = user?.name || paidById; 
        console.log(`Chart (User): Mapping UID ${paidById} to userName ${userName}. Profile found: ${!!user}`);
        console.log(`Chart (User): allUserProfiles used for name lookup:`, JSON.stringify(allUserProfiles.map(u => ({id: u.id, name: u.name}))));
        return { user: userName, Dépenses: totalAmount * 100 }; // Multiply by 100 for cents for Recharts formatter
      });
      console.log("Chart (User): Final formattedUserChartData:", formattedUserChartData);
      setUserExpenseChartData(formattedUserChartData);

      const aggregatedExpensesByCategory: { [category: string]: number } = {};
      fetchedExpenses.forEach(expense => {
        const category = expense.category || "Non catégorisé";
        aggregatedExpensesByCategory[category] = (aggregatedExpensesByCategory[category] || 0) + expense.amount;
      });
      console.log("Chart: Aggregated expenses by category (tag):", aggregatedExpensesByCategory);
      const formattedCategoryChartData = Object.entries(aggregatedExpensesByCategory).map(([category, totalAmount]) => {
        return { category: category, Dépenses: totalAmount * 100 }; // Multiply by 100 for cents
      });
      console.log("Chart (Category): Final formattedCategoryChartData:", formattedCategoryChartData);
      setCategoryChartData(formattedCategoryChartData);

    } catch (error) {
      console.error("Erreur lors du traitement des dépenses pour le graphique: ", error);
      toast({ title: "Erreur graphique", description: "Impossible de charger les données pour l'analyse des dépenses.", variant: "destructive"});
      setUserExpenseChartData([]);
      setCategoryChartData([]);
    } finally {
      setIsLoadingExpenseChartData(false);
    }
  }, [currentUser, projects, selectedProjectId, allUserProfiles, isLoadingUserProfiles, toast, isLoadingProjects]);


  useEffect(() => {
    console.log("DashboardPage: useEffect (Core data) - Fetching projects and recent expenses.");
    if (currentUser) {
      fetchProjects();
      fetchRecentGlobalExpenses();
    }
  }, [currentUser, fetchProjects, fetchRecentGlobalExpenses]);

 useEffect(() => {
    console.log(`DashboardPage: useEffect (User Profiles) - Triggered. currentUser: ${!!currentUser}, isAdmin: ${isAdmin}, selectedProjectId: ${selectedProjectId}, isLoadingProjects: ${isLoadingProjects}, projects.length: ${projects.length}`);
    if (currentUser) {
      if (isAdmin) {
        console.log("DashboardPage: useEffect (User Profiles) - Admin is fetching all user profiles globally.");
        fetchAllUserProfilesGlobal();
      } else {
        console.log("DashboardPage: useEffect (User Profiles) - Not admin. Profile handling based on selectedProjectId.");
        if (selectedProjectId === 'all') {
          if (!isLoadingProjects && projects.length > 0) {
              console.log("DashboardPage: useEffect (User Profiles) - Non-admin, 'All Projects' selected. Fetching profiles for all their project members.");
              const allMemberUIDs = new Set<string>();
              projects.forEach(p => {
                if (p.members && Array.isArray(p.members)) {
                  p.members.forEach(uid => allMemberUIDs.add(uid));
                }
              });
              if (currentUser) allMemberUIDs.add(currentUser.uid); 

              if (allMemberUIDs.size > 0) {
                const fetchProfilesForUIDs = async (uids: string[]) => {
                  setIsLoadingUserProfiles(true);
                  const profiles: AppUserType[] = [];
                  for (const uid of uids) {
                    try {
                      const userDocRef = doc(db, "users", uid);
                      const userDocSnap = await firestoreGetDoc(userDocRef);
                      if (userDocSnap.exists()) profiles.push({ id: userDocSnap.id, ...userDocSnap.data() } as AppUserType);
                      else profiles.push({ id: uid, name: `UID: ${uid.substring(0,6)}... (profil manquant)` , email: "", isAdmin: false, avatarUrl: '' });
                    } catch (e) { profiles.push({ id: uid, name: `UID: ${uid.substring(0,6)}... (erreur chargement)` , email: "", isAdmin: false, avatarUrl: '' }); }
                  }
                  const uniqueProfiles = profiles.filter((p, index, self) => index === self.findIndex(t => t.id === p.id));
                  setAllUserProfiles(uniqueProfiles);
                  console.log("DashboardPage: useEffect (User Profiles) - Non-admin, All Projects, Successfully set allUserProfiles:", JSON.stringify(uniqueProfiles.map(u => ({id: u.id, name: u.name}))));
                  setIsLoadingUserProfiles(false);
                };
                fetchProfilesForUIDs(Array.from(allMemberUIDs));
              } else {
                 if (userProfile) setAllUserProfiles([userProfile]); else setAllUserProfiles([]);
                 setIsLoadingUserProfiles(false);
              }
          } else if (!isLoadingProjects && projects.length === 0) {
              console.log("DashboardPage: useEffect (User Profiles) - Non-admin, 'All Projects' selected, but no projects. Setting self profile.");
              if (userProfile) setAllUserProfiles([userProfile]); else setAllUserProfiles([]);
              setIsLoadingUserProfiles(false);
          } else {
            console.log("DashboardPage: useEffect (User Profiles) - Non-admin, 'All Projects' selected, but projects still loading. Setting self profile as fallback for now.");
             if (userProfile) setAllUserProfiles([userProfile]); else setAllUserProfiles([]);
             setIsLoadingUserProfiles(false); 
          }
        } else { 
          console.log(`DashboardPage: useEffect (User Profiles) - Non-admin, specific project selected: ${selectedProjectId}. Calling fetchSelectedProjectMembersProfiles.`);
          fetchSelectedProjectMembersProfiles(selectedProjectId);
        }
      }
    } else {
      setAllUserProfiles([]);
      setIsLoadingUserProfiles(false);
    }
  }, [currentUser, isAdmin, selectedProjectId, projects, isLoadingProjects, fetchAllUserProfilesGlobal, fetchSelectedProjectMembersProfiles, userProfile]);


  useEffect(() => {
    console.log(
        `DashboardPage: useEffect (chart data) triggered. Conditions - currentUser: ${!!currentUser}, isLoadingProjects: ${isLoadingProjects}, isLoadingUserProfiles: ${isLoadingUserProfiles}, allUserProfiles.length: ${allUserProfiles.length}`
    );
    console.log(`DashboardPage: Content of allUserProfiles for chart useEffect:`, JSON.stringify(allUserProfiles.map(u => ({id: u.id, name: u.name}))));

    if (currentUser && !isLoadingProjects && !isLoadingUserProfiles ) {
       console.log(`DashboardPage: useEffect (chart data) - Conditions MET. allUserProfiles.length: ${allUserProfiles.length}`);
       // Allow processing even if allUserProfiles is empty if no projects exist (to clear chart)
       if (allUserProfiles.length > 0 || (projects.length === 0 && selectedProjectId === 'all' ) ) {
           console.log("DashboardPage: useEffect (chart data) - Calling fetchAndProcessExpensesForChart.");
           fetchAndProcessExpensesForChart();
       } else if (!isLoadingProjects && !isLoadingUserProfiles && allUserProfiles.length === 0 && projects.length > 0) {
           console.warn("DashboardPage: useEffect (chart data) - Profiles might be loading for selected project, or no profiles found for members. Chart data might be incomplete or empty.");
           // Optionally, still call fetchAndProcess to clear or show empty state for chart
           fetchAndProcessExpensesForChart(); 
       } else {
           console.warn("DashboardPage: useEffect (chart data) - Conditions not fully met for optimal chart data (e.g. profiles empty but projects exist). Clearing chart data for safety.");
           setUserExpenseChartData([]);
           setCategoryChartData([]);
           setIsLoadingExpenseChartData(false);
       }
    } else {
      console.log("DashboardPage: useEffect (chart data) - Conditions NOT MET for fetching chart data (waiting for projects or profiles).");
      // If not loading and no current user, clear chart
       if(!currentUser && !isLoadingProjects && !isLoadingUserProfiles) {
        setUserExpenseChartData([]);
        setCategoryChartData([]);
        setIsLoadingExpenseChartData(false);
      }
    }
  }, [currentUser, selectedProjectId, allUserProfiles, projects, isLoadingProjects, isLoadingUserProfiles, fetchAndProcessExpensesForChart]);


  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
      toast({ title: "Déconnexion réussie" });
    } catch (error) {
      console.error("Erreur de déconnexion:", error);
      toast({ title: "Erreur de déconnexion", variant: "destructive" });
    }
  };

  const selectedProject = useMemo(() => {
    if (selectedProjectId === 'all' || isLoadingProjects) return null;
    return projects.find(p => p.id === selectedProjectId);
  }, [selectedProjectId, projects, isLoadingProjects]);

  const summaryData = useMemo(() => {
    if (isLoadingProjects && projects.length === 0) { 
        return { totalSpent: "Chargement...", expenseCount: "...", participantsCount: "...", averagePerPerson: "..." };
    }

    const projectsToConsider = selectedProject ? [selectedProject] : projects;

    if (projectsToConsider.length === 0 && !selectedProject && !isLoadingProjects) { 
        return { totalSpent: "0,00 €", expenseCount: "0", participantsCount: "0", averagePerPerson: "0,00 €" };
    }

    let totalSpentAll = 0;
    let totalExpenseCountFromRecents = 0; 
    projectsToConsider.forEach(p => {
        totalSpentAll += (p.totalExpenses || 0);
        totalExpenseCountFromRecents += (p.recentExpenses?.length || 0);
    });

    let participantsSet = new Set<string>();
    if (selectedProject && selectedProject.members) {
      selectedProject.members.forEach(memberUid => participantsSet.add(memberUid));
    } else {
      projects.forEach(p => {
          if(p.members && Array.isArray(p.members)) {
            p.members.forEach(memberUid => participantsSet.add(memberUid));
          }
      });
      if(projects.length === 0 && userProfile) { 
        participantsSet.add(userProfile.id);
      }
    }
    const participantsCount = participantsSet.size;
    const averagePerPersonAll = participantsCount > 0 ? totalSpentAll / participantsCount : 0;

    return {
      totalSpent: `${totalSpentAll.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`,
      expenseCount: isLoadingRecentExpenses ? '...' : recentGlobalExpenses.length.toString(), 
      participantsCount: participantsCount.toString(),
      averagePerPerson: `${averagePerPersonAll.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`,
    };
  }, [selectedProject, projects, isLoadingProjects, userProfile, recentGlobalExpenses, isLoadingRecentExpenses]);

  const displayRecentExpenses = useMemo(() => recentGlobalExpenses, [recentGlobalExpenses]);

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
        className="border-r text-sidebar-foreground" 
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
                <SidebarGroupLabel>ADMINISTRATION</SidebarGroupLabel>
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
              className="text-sidebar-foreground border border-sidebar-foreground/50 hover:bg-sidebar-accent hover:border-sidebar-accent-foreground w-full justify-start"
            >
                <Icons.logOut className="mr-2 h-4 w-4" /> Déconnexion
          </Button>
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
            <SummaryCard title="Dépenses (global)" value={summaryData.expenseCount} icon={<Icons.fileText className="h-5 w-5 text-muted-foreground" />} description="Basé sur les 5 dernières" />
            <SummaryCard title="Participants" value={summaryData.participantsCount} icon={<Icons.users className="h-5 w-5 text-muted-foreground" />} description={selectedProject ? "Dans ce projet" : "Total unique"}/>
            <SummaryCard title="Moyenne / pers." value={summaryData.averagePerPerson} icon={<Icons.lineChart className="h-5 w-5 text-muted-foreground" />} />
          </div>

          <BalanceSummary
            project={selectedProject}
            allUsersProfiles={allUserProfiles} 
            isLoadingUserProfiles={isLoadingUserProfiles}
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
                     <ExpenseAnalysisChart data={categoryChartData} isLoading={isLoadingExpenseChartData} yAxisDataKey="category" />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Dépenses récentes (global)</CardTitle>
                <CardDescription>
                  {selectedProject ? `Dernières transactions globales (non filtré par projet ${selectedProject.name})` : "Vos dernières transactions globales"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingRecentExpenses && (
                    <div className="text-center py-4"><Icons.loader className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
                )}
                {!isLoadingRecentExpenses && displayRecentExpenses.length > 0 ? (
                  displayRecentExpenses.map(expense => (
                    <div key={expense.id} className="flex items-start gap-4 p-3 bg-muted/50 rounded-lg">
                      <div className="p-2 bg-primary/10 rounded-md">
                           <expense.displayIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <p className="font-medium">{expense.title}</p>
                          <p className="font-semibold text-sm">{expense.amount.toLocaleString('fr-FR', {style: 'currency', currency: expense.currency})}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{expense.projectName} • {formatDateFromTimestamp(expense.expenseDate ? expense.expenseDate.toString() : undefined)}</p>
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

