
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image'; // Import next/image
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
import { Badge } from '@/components/ui/badge';
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
  if (name) {
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
  if (email) {
    const emailPrefix = email.split('@')[0];
    if (emailPrefix && emailPrefix.length >= 2) {
      return emailPrefix.substring(0, 2).toUpperCase();
    }
    if (emailPrefix && emailPrefix.length === 1) {
      return emailPrefix[0].toUpperCase();
    }
  }
  return '??';
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
        const q = query(expensesRef, where("createdBy", "==", currentUser.uid), orderBy("createdAt", "desc"), limit(5));
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
  }, [currentUser, toast]);

  const fetchAllUserProfiles = useCallback(async () => {
    if (!currentUser) {
      setIsLoadingUserProfiles(false);
      return;
    }
    setIsLoadingUserProfiles(true);

    if (isAdmin) {
      console.log("DashboardPage: fetchAllUserProfiles - Admin is fetching all user profiles.");
      try {
        const usersCollectionRef = collection(db, "users");
        const usersSnapshot = await getDocs(usersCollectionRef);
        const usersList = usersSnapshot.docs.map(docSnap => ({
          id: docSnap.id, ...docSnap.data(),
        } as AppUserType));
        setAllUserProfiles(usersList);
        console.log("DashboardPage: Successfully fetched allUserProfiles (Admin):", JSON.stringify(usersList.map(u => ({ id: u.id, name: u.name }))));
      } catch (error) {
        console.error("Erreur lors de la récupération de tous les profils utilisateurs (Dashboard Admin): ", error);
        toast({
          title: "Erreur de chargement (Profils Admin)",
          description: "Impossible de charger tous les profils utilisateurs.",
          variant: "destructive",
        });
        setAllUserProfiles([]);
      } finally {
        setIsLoadingUserProfiles(false);
      }
    } else { // Non-admin
      if (selectedProjectId === 'all') {
        if (!isLoadingProjects && projects.length > 0) {
          console.log("DashboardPage: fetchAllUserProfiles (Non-Admin, All Projects) - Projects loaded. Fetching profiles for all their project members.");
          const allMemberUIDs = new Set<string>();
          projects.forEach(p => {
            if (p.members && Array.isArray(p.members)) {
              p.members.forEach(uid => allMemberUIDs.add(uid));
            }
          });
          if(currentUser) allMemberUIDs.add(currentUser.uid);

          const fetchedMemberProfiles: AppUserType[] = [];
          for (const uid of Array.from(allMemberUIDs)) {
            try {
              const userDocRef = doc(db, "users", uid);
              const userDocSnap = await firestoreGetDoc(userDocRef);
              if (userDocSnap.exists()) {
                fetchedMemberProfiles.push({ id: userDocSnap.id, ...userDocSnap.data() } as AppUserType);
              } else {
                console.warn(`DashboardPage: fetchAllUserProfiles (Non-Admin, All Projects) - Profile for UID ${uid} not found.`);
              }
            } catch (profileError) {
              console.error(`DashboardPage: fetchAllUserProfiles (Non-Admin, All Projects) - Error fetching profile for UID ${uid}:`, profileError);
            }
          }
          const uniqueFetchedMemberProfiles = fetchedMemberProfiles.filter((user, index, self) => index === self.findIndex(u => u.id === user.id));
          setAllUserProfiles(uniqueFetchedMemberProfiles);
          console.log("DashboardPage: fetchAllUserProfiles (Non-Admin, All Projects) - Successfully set allUserProfiles:", JSON.stringify(uniqueFetchedMemberProfiles.map(u => ({ id: u.id, name: u.name }))));
        } else if (!isLoadingProjects && projects.length === 0 && userProfile) {
          console.log("DashboardPage: fetchAllUserProfiles (Non-Admin, All Projects) - No projects. Setting self profile.");
          setAllUserProfiles([userProfile]);
           setIsLoadingUserProfiles(false);
        } else if (isLoadingProjects && userProfile) {
          console.log("DashboardPage: fetchAllUserProfiles (Non-Admin, All Projects) - Projects loading, setting self profile as fallback.");
          setAllUserProfiles([userProfile]);
           setIsLoadingUserProfiles(false); // Still need to set loading false even if it's a fallback
        } else {
          console.log("DashboardPage: fetchAllUserProfiles (Non-Admin, All Projects) - No current projects or profiles to display. Setting empty profiles.");
          setAllUserProfiles([]);
          setIsLoadingUserProfiles(false);
        }
      } else { // Specific project selected by non-admin
        const project = projects.find(p => p.id === selectedProjectId);
        if (project && project.members) {
          console.log(`DashboardPage: fetchAllUserProfiles (Non-Admin, Specific Project ${selectedProjectId}) - Fetching profiles for members:`, project.members);
          const fetchedMemberProfiles: AppUserType[] = [];
          for (const uid of project.members) {
            try {
              const userDocRef = doc(db, "users", uid);
              const userDocSnap = await firestoreGetDoc(userDocRef);
              if (userDocSnap.exists()) {
                fetchedMemberProfiles.push({ id: userDocSnap.id, ...userDocSnap.data() } as AppUserType);
              } else {
                 console.warn(`DashboardPage: fetchAllUserProfiles (Non-Admin, Specific Project ${selectedProjectId}) - Profile for UID ${uid} not found.`);
              }
            } catch (profileError) {
              console.error(`DashboardPage: fetchAllUserProfiles (Non-Admin, Specific Project ${selectedProjectId}) - Error fetching profile for UID ${uid}:`, profileError);
            }
          }
          setAllUserProfiles(fetchedMemberProfiles.filter((user, index, self) => index === self.findIndex(u => u.id === user.id)));
          console.log(`DashboardPage: fetchAllUserProfiles (Non-Admin, Specific Project ${selectedProjectId}) - Successfully set profiles:`, JSON.stringify(fetchedMemberProfiles.map(u => ({ id: u.id, name: u.name }))));
        } else if (userProfile) { // Specific project selected, but project/members not found or empty
          setAllUserProfiles([userProfile]);
        } else {
           setAllUserProfiles([]);
        }
        setIsLoadingUserProfiles(false);
      }
    }
  }, [currentUser, isAdmin, userProfile, projects, isLoadingProjects, selectedProjectId, toast]);


 const fetchAndProcessExpensesForChart = useCallback(async () => {
    console.log("Chart: fetchAndProcessExpensesForChart called. SelectedProjectId:", selectedProjectId);
    console.log("Chart: Current allUserProfiles at start:", JSON.stringify(allUserProfiles.map(u => ({id: u.id, name: u.name}))));

    if (!currentUser || (!isAdmin && isLoadingUserProfiles && allUserProfiles.length === 0)) {
      console.log("Chart: Bailing early from fetchAndProcessExpensesForChart. Conditions: currentUser:", !!currentUser, "isLoadingUserProfiles (non-admin case):", (!isAdmin && isLoadingUserProfiles && allUserProfiles.length === 0) );
      setIsLoadingExpenseChartData(false);
      return;
    }
    if (allUserProfiles.length === 0 && !isLoadingUserProfiles) {
        console.log("Chart: allUserProfiles is empty and not loading. Bailing to avoid errors with empty profile list.");
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
      if (projectIdsToQuery.length === 0 && !isLoadingProjects) {
        console.log("Chart: 'All projects' selected, projects loaded, but no project IDs found. Clearing chart data.");
        setUserExpenseChartData([]);
        setCategoryChartData([]);
        setIsLoadingExpenseChartData(false);
        return;
      }
    } else {
      projectIdsToQuery = [selectedProjectId];
    }
    console.log("Chart: projectIdsToQuery:", projectIdsToQuery);

    if (projectIdsToQuery.length === 0 ) {
        setUserExpenseChartData([]);
        setCategoryChartData([]);
        setIsLoadingExpenseChartData(false);
        console.log("Chart: No project IDs to query. Setting empty chart data.");
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
        console.log(`Chart: (Inside map) paidById: ${paidById}. allUserProfiles used for name lookup:`, JSON.stringify(allUserProfiles.map(u => ({id: u.id, name: u.name}))));
        console.log(`Chart (User): Mapping UID ${paidById} to userName ${userName}. Profile found: ${!!user}`);
        return { user: userName, Dépenses: totalAmount };
      });
      console.log("Chart (User): Final formattedUserChartData:", formattedUserChartData);
      setUserExpenseChartData(formattedUserChartData);

      const aggregatedExpensesByCategory: { [category: string]: number } = {};
      fetchedExpenses.forEach(expense => {
        const category = expense.category || "Non catégorisé";
        aggregatedExpensesByCategory[category] = (aggregatedExpensesByCategory[category] || 0) + expense.amount;
      });
      console.log("Chart: Aggregated expenses by category:", aggregatedExpensesByCategory);

      const formattedCategoryChartData = Object.entries(aggregatedExpensesByCategory).map(([category, totalAmount]) => {
        return { category: category, Dépenses: totalAmount };
      });
      console.log("Chart (Category): Final formattedCategoryChartData:", formattedCategoryChartData);
      setCategoryChartData(formattedCategoryChartData);

    } catch (error) {
      console.error("Erreur lors du traitement des dépenses pour le graphique: ", error);
      toast({
        title: "Erreur graphique",
        description: "Impossible de charger les données pour l'analyse des dépenses.",
        variant: "destructive",
      });
      setUserExpenseChartData([]);
      setCategoryChartData([]);
    } finally {
      setIsLoadingExpenseChartData(false);
    }
  }, [currentUser, projects, selectedProjectId, allUserProfiles, isLoadingUserProfiles, toast, isLoadingProjects, isAdmin]);

  useEffect(() => {
    console.log("DashboardPage: useEffect (Core data) - currentUser:", !!currentUser);
    if (currentUser) {
      fetchProjects();
      fetchRecentGlobalExpenses();
    }
  }, [currentUser, fetchProjects, fetchRecentGlobalExpenses]);

 useEffect(() => {
    console.log(`DashboardPage: useEffect (User Profiles) - Triggered. currentUser: ${!!currentUser}, isAdmin: ${isAdmin}, selectedProjectId: ${selectedProjectId}, isLoadingProjects: ${isLoadingProjects}, projects.length: ${projects.length}`);
    if (currentUser) {
        fetchAllUserProfiles();
    } else {
      console.log("DashboardPage: useEffect (User Profiles) - No currentUser, clearing profiles and setting loading false.");
      setAllUserProfiles([]);
      setIsLoadingUserProfiles(false);
    }
  }, [currentUser, isAdmin, selectedProjectId, projects, isLoadingProjects, fetchAllUserProfiles]);


  useEffect(() => {
    console.log(
        "DashboardPage: useEffect (chart data) triggered. Conditions - currentUser:", !!currentUser,
        "isLoadingProjects:", isLoadingProjects,
        "isLoadingUserProfiles:", isLoadingUserProfiles,
        "allUserProfiles.length:", allUserProfiles.length,
        "selectedProjectId:", selectedProjectId
    );
    if (currentUser && !isLoadingProjects && !isLoadingUserProfiles) {
      console.log(`DashboardPage: useEffect (chart data) - Conditions MET to consider calling fetch. allUserProfiles.length: ${allUserProfiles.length}, isLoadingUserProfiles: ${isLoadingUserProfiles}`);
        if (allUserProfiles.length > 0 || (selectedProjectId === 'all' && projects.length === 0) ) {
             console.log("DashboardPage: useEffect (chart data) - Calling fetchAndProcessExpensesForChart.");
             fetchAndProcessExpensesForChart();
        } else if (allUserProfiles.length === 0 && (selectedProjectId !== 'all' || projects.length > 0)) {
            console.warn("DashboardPage: useEffect (chart data) - Profiles loaded but empty for the current context. Clearing chart data.");
            setUserExpenseChartData([]);
            setCategoryChartData([]);
            setIsLoadingExpenseChartData(false);
        } else {
             console.log("DashboardPage: useEffect (chart data) - Profiles loaded but empty, likely because no projects or specific project has no members. Clearing chart data.");
             setUserExpenseChartData([]);
             setCategoryChartData([]);
             setIsLoadingExpenseChartData(false);
        }
    } else {
      console.log("DashboardPage: useEffect (chart data) - Conditions NOT MET. Waiting for projects or profiles to load.");
    }
  }, [currentUser, selectedProjectId, projects, allUserProfiles, isLoadingProjects, isLoadingUserProfiles, fetchAndProcessExpensesForChart]);


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
    let totalExpenseCountAll = 0;
    projectsToConsider.forEach(p => {
        totalSpentAll += (p.totalExpenses || 0);
        totalExpenseCountAll += (p.recentExpenses?.length || 0); // This is only for summary card, might not be 'all' expenses
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
    }
    const participantsCount = participantsSet.size;

    const averagePerPersonAll = participantsCount > 0 ? totalSpentAll / participantsCount : 0;
    return {
      totalSpent: `${totalSpentAll.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`,
      expenseCount: totalExpenseCountAll.toString(),
      participantsCount: participantsCount.toString(),
      averagePerPerson: `${averagePerPersonAll.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`,
    };
  }, [selectedProject, projects, isLoadingProjects]);

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
      <Sidebar className="border-r bg-sidebar text-sidebar-foreground" collapsible="icon">
        <SidebarHeader className="p-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-xl font-semibold text-sidebar-header-title-color">
            <Image src="https://i.ibb.co/Swfy8wfX/logo-Share-Pot-full.png" alt="SharePot Logo" width={32} height={32} className="h-8 w-auto mr-1" data-ai-hint="logo finance"/>
            <span>SharePot</span>
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
            <SummaryCard title="Dépenses (global)" value={isLoadingRecentExpenses ? '...' : recentGlobalExpenses.length.toString()} icon={<Icons.fileText className="h-5 w-5 text-muted-foreground" />} description="Basé sur les 5 dernières" />
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
                        <p className="text-xs text-muted-foreground">{expense.projectName} • {formatDateFromTimestamp(expense.expenseDate.toString())}</p>
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

