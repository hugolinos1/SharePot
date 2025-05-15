
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
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
import { collection, getDocs, Timestamp, query, where, orderBy, limit, doc, getDoc, type QueryConstraint } from 'firebase/firestore';
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
    if (parts[0] && parts[0].length >= 2) {
      return parts[0].substring(0, 2).toUpperCase();
    }
     if (parts[0] && parts[0].length === 1) {
      return parts[0][0].toUpperCase();
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

  const [expenseChartData, setExpenseChartData] = useState<Array<{ user: string; Dépenses: number }>>([]);
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
      memberSnapshot.docs.forEach(doc => {
        projectsMap.set(doc.id, { id: doc.id, ...doc.data() } as Project);
      });
      ownerSnapshot.docs.forEach(doc => {
        projectsMap.set(doc.id, { id: doc.id, ...doc.data() } as Project);
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
        const fetchedExpenses = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            displayIcon: Icons.fileText, 
        } as DisplayExpenseItem));
        setRecentGlobalExpenses(fetchedExpenses);
    } catch (error) {
        console.error("Erreur lors de la récupération des dépenses récentes: ", error);
        toast({
            title: "Erreur de chargement",
            description: "Impossible de charger les dépenses récentes.",
            variant: "destructive",
        });
    } finally {
        setIsLoadingRecentExpenses(false);
    }
  }, [currentUser, toast]);

  const fetchAllUserProfiles = useCallback(async () => {
    if (!currentUser || !isAdmin) {
        console.warn("DashboardPage: fetchAllUserProfiles called by non-admin or no currentUser. Setting isLoadingUserProfiles to false.");
        setIsLoadingUserProfiles(false);
        return;
    }
    
    setIsLoadingUserProfiles(true);
    console.log("DashboardPage: fetchAllUserProfiles - Admin is fetching all user profiles.");
    try {
      const usersCollectionRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersCollectionRef);
      const usersList = usersSnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      } as AppUserType));
      setAllUserProfiles(usersList);
      console.log("DashboardPage: Successfully fetched allUserProfiles (Admin):", JSON.stringify(usersList.map(u => ({id: u.id, name: u.name}))));
    } catch (error) {
      console.error("Erreur lors de la récupération de tous les profils utilisateurs (Dashboard - Admin): ", error);
      toast({
        title: "Erreur de chargement (Admin)",
        description: "Impossible de charger tous les profils utilisateurs.",
        variant: "destructive",
      });
      setAllUserProfiles([]); 
    } finally {
      setIsLoadingUserProfiles(false);
    }
  }, [currentUser, isAdmin, toast]);

  const fetchSelectedProjectMembersProfiles = useCallback(async (projectId: string) => {
    if (!currentUser || !projectId || projectId === 'all') {
      console.warn("DashboardPage: fetchSelectedProjectMembersProfiles called with invalid projectId or no currentUser.");
      setIsLoadingUserProfiles(false);
      setAllUserProfiles(userProfile ? [userProfile] : []); 
      return;
    }
    setIsLoadingUserProfiles(true);
    console.log(`DashboardPage: fetchSelectedProjectMembersProfiles - Fetching members for project ID: ${projectId}`);
    try {
      const projectRef = doc(db, "projects", projectId);
      const projectSnap = await getDoc(projectRef);

      if (!projectSnap.exists()) {
        console.warn(`DashboardPage: fetchSelectedProjectMembersProfiles - Project with ID ${projectId} not found.`);
        toast({ title: "Erreur", description: `Projet ${projectId} non trouvé.`, variant: "destructive" });
        setAllUserProfiles(userProfile ? [userProfile] : []); 
        setIsLoadingUserProfiles(false);
        return;
      }

      const projectData = projectSnap.data() as Project;
      const memberUIDs = projectData.members || [];
      console.log(`DashboardPage: fetchSelectedProjectMembersProfiles - Project "${projectData.name}" members UIDs: ${memberUIDs.join(', ')}`);

      if (memberUIDs.length === 0) {
        console.log(`DashboardPage: fetchSelectedProjectMembersProfiles - Project "${projectData.name}" has no members. Setting user profiles accordingly.`);
        setAllUserProfiles(userProfile && memberUIDs.includes(userProfile.id) ? [userProfile] : []);
        setIsLoadingUserProfiles(false);
        return;
      }

      const fetchedMemberProfiles: AppUserType[] = [];
      for (const uid of memberUIDs) {
        console.log(`DashboardPage: fetchSelectedProjectMembersProfiles - Attempting to fetch profile for UID: ${uid}`);
        try {
          const userDocRef = doc(db, "users", uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const profileData = { id: userDocSnap.id, ...userDocSnap.data() } as AppUserType;
            fetchedMemberProfiles.push(profileData);
            console.log(`DashboardPage: fetchSelectedProjectMembersProfiles - Profile fetched for UID ${uid}:`, JSON.stringify(profileData));
          } else {
            console.warn(`DashboardPage: fetchSelectedProjectMembersProfiles - Profile for UID ${uid} not found in 'users' collection.`);
          }
        } catch (profileError) {
            console.error(`DashboardPage: fetchSelectedProjectMembersProfiles - Error fetching profile for UID ${uid}:`, profileError);
        }
      }
      
      setAllUserProfiles(fetchedMemberProfiles);
      console.log(`DashboardPage: fetchSelectedProjectMembersProfiles - Successfully set allUserProfiles for project "${projectData.name}":`, JSON.stringify(fetchedMemberProfiles.map(u => ({id: u.id, name: u.name}))));

    } catch (error) {
      console.error("Erreur lors de la récupération des profils des membres du projet sélectionné (Dashboard): ", error);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger les profils des membres du projet sélectionné.",
        variant: "destructive",
      });
      setAllUserProfiles(userProfile ? [userProfile] : []); 
    } finally {
      setIsLoadingUserProfiles(false);
    }
  }, [currentUser, userProfile, toast]);

  const getProfilesForAllUsersProjects = useCallback(async () => {
    if (!currentUser || !projects || projects.length === 0) {
      console.log("DashboardPage: getProfilesForAllUsersProjects - No current user or no projects. Setting self-profile.");
      setAllUserProfiles(userProfile ? [userProfile] : []);
      setIsLoadingUserProfiles(false);
      return;
    }
    setIsLoadingUserProfiles(true);
    console.log("DashboardPage: getProfilesForAllUsersProjects - Fetching profiles for all members of user's projects.");
    
    const allMemberUIDs = new Set<string>();
    projects.forEach(p => p.members.forEach(uid => allMemberUIDs.add(uid)));

    const fetchedMemberProfiles: AppUserType[] = [];
    for (const uid of Array.from(allMemberUIDs)) {
        console.log(`DashboardPage: getProfilesForAllUsersProjects - Attempting to fetch profile for UID: ${uid}`);
        try {
            const userDocRef = doc(db, "users", uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                const profileData = { id: userDocSnap.id, ...userDocSnap.data() } as AppUserType;
                fetchedMemberProfiles.push(profileData);
            } else {
                 console.warn(`DashboardPage: getProfilesForAllUsersProjects - Profile for UID ${uid} not found in 'users' collection.`);
            }
        } catch (profileError) {
            console.error(`DashboardPage: getProfilesForAllUsersProjects - Error fetching profile for UID ${uid}:`, profileError);
        }
    }
    // Ensure current user's profile is included if they are not part of any project members list explicitly but have projects
    if (userProfile && !fetchedMemberProfiles.find(p => p.id === userProfile.id)) {
        const currentUserIsAlreadyMemberOfAnyProject = projects.some(p => p.members.includes(userProfile.id));
        if (!currentUserIsAlreadyMemberOfAnyProject && projects.some(p=> p.ownerId === userProfile.id)){ // User is owner but maybe not in members list
            fetchedMemberProfiles.push(userProfile);
        } else if (currentUserIsAlreadyMemberOfAnyProject) {
            // Already included, do nothing
        } else { // User has no projects or not member of any, ensure self is there.
             fetchedMemberProfiles.push(userProfile);
        }
    }
     // Remove duplicates by ID, keeping the first occurrence
    const uniqueFetchedMemberProfiles = fetchedMemberProfiles.filter((user, index, self) => index === self.findIndex(u => u.id === user.id));


    setAllUserProfiles(uniqueFetchedMemberProfiles);
    console.log("DashboardPage: getProfilesForAllUsersProjects - Successfully set allUserProfiles:", JSON.stringify(uniqueFetchedMemberProfiles.map(u => ({id: u.id, name: u.name}))));
    setIsLoadingUserProfiles(false);
  }, [currentUser, projects, userProfile]);

  const fetchAndProcessExpensesForChart = useCallback(async () => {
    console.log("Chart: fetchAndProcessExpensesForChart called. SelectedProjectId:", selectedProjectId, "isLoadingUserProfiles:", isLoadingUserProfiles);
    console.log("Chart: Current allUserProfiles (at start of fetchAndProcess):", JSON.stringify(allUserProfiles.map(u => ({id: u.id, name: u.name}))));

    if (!currentUser || isLoadingUserProfiles || (projects.length === 0 && selectedProjectId === 'all' && !isLoadingProjects)) {
      console.log("Chart: Bailing early. Conditions not met. currentUser:", !!currentUser, "isLoadingUserProfiles:", isLoadingUserProfiles, "projects condition:", (projects.length === 0 && selectedProjectId === 'all' && !isLoadingProjects));
      if(projects.length === 0 && selectedProjectId === 'all' && !isLoadingProjects) {
        setExpenseChartData([]);
        setIsLoadingExpenseChartData(false);
      }
      return;
    }
    setIsLoadingExpenseChartData(true);

    let projectIdsToQuery: string[] = [];
    if (selectedProjectId === 'all') {
      projectIdsToQuery = projects.map(p => p.id);
    } else {
      projectIdsToQuery = [selectedProjectId];
    }
    console.log("Chart: projectIdsToQuery:", projectIdsToQuery);

    if (projectIdsToQuery.length === 0) {
      setExpenseChartData([]);
      setIsLoadingExpenseChartData(false);
      console.log("Chart: No project IDs to query. Setting empty chart data.");
      return;
    }

    try {
      const expensesRef = collection(db, "expenses");
      let fetchedExpenses: ExpenseItem[] = [];
      const chunkSize = 30;
      for (let i = 0; i < projectIdsToQuery.length; i += chunkSize) {
          const chunk = projectIdsToQuery.slice(i, i + chunkSize);
          if (chunk.length > 0) {
            const q = query(expensesRef, where("projectId", "in", chunk));
            const querySnapshot = await getDocs(q);
            querySnapshot.docs.forEach(doc => fetchedExpenses.push(doc.data() as ExpenseItem));
          }
      }
      console.log("Chart: Fetched expenses for chart:", fetchedExpenses.length, "items");

      const aggregatedExpenses: { [paidById: string]: number } = {};
      fetchedExpenses.forEach(expense => {
        if (expense.paidById) { 
            aggregatedExpenses[expense.paidById] = (aggregatedExpenses[expense.paidById] || 0) + expense.amount;
        }
      });
      console.log("Chart: Aggregated expenses by paidById (UID):", aggregatedExpenses);

      const formattedChartData = Object.entries(aggregatedExpenses).map(([paidById, totalAmount]) => {
        const user = allUserProfiles.find(u => u.id === paidById);
        const userName = user?.name || paidById; 
        console.log(`Chart: (Inside map) allUserProfiles used for name lookup:`, JSON.stringify(allUserProfiles.map(u => ({id: u.id, name:u.name}))));
        console.log(`Chart: Mapping UID ${paidById} to userName ${userName}. Profile found in allUserProfiles: ${!!user}`);
        return {
          user: userName,
          Dépenses: totalAmount * 100, 
        };
      });
      console.log("Chart: Final formattedChartData:", formattedChartData);
      setExpenseChartData(formattedChartData);
    } catch (error) {
      console.error("Erreur lors du traitement des dépenses pour le graphique: ", error);
      toast({
        title: "Erreur graphique",
        description: "Impossible de charger les données pour l'analyse des dépenses.",
        variant: "destructive",
      });
      setExpenseChartData([]);
    } finally {
      setIsLoadingExpenseChartData(false);
    }
  }, [currentUser, projects, selectedProjectId, allUserProfiles, isLoadingUserProfiles, toast, isLoadingProjects]);


  // Effect 1: Core data fetching (projects, recent expenses)
  useEffect(() => {
    if (currentUser) {
      console.log("DashboardPage: useEffect (Core data) - Fetching projects and recent expenses.");
      fetchProjects();
      fetchRecentGlobalExpenses();
    }
  }, [currentUser, fetchProjects, fetchRecentGlobalExpenses]);

  // Effect 2: User profiles fetching (admin all, or non-admin specific)
  useEffect(() => {
    console.log(`DashboardPage: useEffect (User Profiles) - Triggered. currentUser: ${!!currentUser}, isAdmin: ${isAdmin}, selectedProjectId: ${selectedProjectId}, isLoadingProjects: ${isLoadingProjects}`);
    if (currentUser) {
      if (isAdmin) {
        console.log("DashboardPage: useEffect (User Profiles) - Admin detected, fetching all user profiles.");
        fetchAllUserProfiles();
      } else { // Non-admin
        if (selectedProjectId === 'all') {
          if (!isLoadingProjects && projects.length > 0) {
            console.log("DashboardPage: useEffect (User Profiles) - Non-admin, 'all' projects, projects loaded. Fetching profiles for all their project members.");
            getProfilesForAllUsersProjects();
          } else if (!isLoadingProjects && projects.length === 0) {
            console.log("DashboardPage: useEffect (User Profiles) - Non-admin, 'all' projects, no projects. Setting self profile.");
            setAllUserProfiles(userProfile ? [userProfile] : []);
            setIsLoadingUserProfiles(false);
          } else {
             console.log("DashboardPage: useEffect (User Profiles) - Non-admin, 'all' projects, projects still loading. Waiting.");
             setIsLoadingUserProfiles(true); // Ensure loading state while waiting for projects
          }
        } else { // Specific project selected by non-admin
          console.log(`DashboardPage: useEffect (User Profiles) - Non-admin, specific project selected: ${selectedProjectId}. Fetching members.`);
          fetchSelectedProjectMembersProfiles(selectedProjectId);
        }
      }
    } else {
      setIsLoadingUserProfiles(false); // No user, no profiles to load
    }
  }, [currentUser, isAdmin, selectedProjectId, projects, isLoadingProjects, userProfile, fetchAllUserProfiles, getProfilesForAllUsersProjects, fetchSelectedProjectMembersProfiles]);


  // Effect 3: Chart data - depends on selectedProjectId and allUserProfiles
  useEffect(() => {
    console.log(
        "DashboardPage: useEffect (chart data) triggered. Conditions - currentUser:", !!currentUser, 
        "isLoadingProjects:", isLoadingProjects, 
        "isLoadingUserProfiles:", isLoadingUserProfiles,
        "allUserProfiles.length:", allUserProfiles.length,
        "Content of allUserProfiles for chart useEffect:", JSON.stringify(allUserProfiles.map(u=>({id: u.id, name: u.name})))
    );
    if (currentUser && !isLoadingProjects && !isLoadingUserProfiles && allUserProfiles.length > 0) {
      console.log("DashboardPage: useEffect (chart data) - Conditions MET. Calling fetchAndProcessExpensesForChart.");
      fetchAndProcessExpensesForChart();
    } else {
      console.log("DashboardPage: useEffect (chart data) - Conditions NOT MET or allUserProfiles empty. Clearing chart data and setting loading to false if necessary.");
      setExpenseChartData([]); // Clear chart data if conditions not met
      if (isLoadingExpenseChartData) { // Only set to false if it was true, to avoid unnecessary re-renders
         setIsLoadingExpenseChartData(false);
      }
    }
  }, [selectedProjectId, allUserProfiles, fetchAndProcessExpensesForChart, currentUser, isLoadingProjects, isLoadingUserProfiles]);


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
    if (projectsToConsider.length === 0 && !selectedProject) { 
        return { totalSpent: "0,00 €", expenseCount: "0", participantsCount: "0", averagePerPerson: "0,00 €" };
    }
    const totalSpentAll = projectsToConsider.reduce((sum, p) => sum + (p.totalExpenses || 0), 0);
    const totalExpenseCountAll = projectsToConsider.reduce((sum, p) => sum + (p.recentExpenses?.length || 0), 0); 
    
    let participantsSet = new Set<string>();
    if (selectedProject) {
      selectedProject.members.forEach(memberUid => participantsSet.add(memberUid));
    } else {
      projects.forEach(p => p.members.forEach(memberUid => participantsSet.add(memberUid)));
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
      <Sidebar className="border-r" collapsible="icon">
        <SidebarHeader className="p-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold text-primary">
            <Icons.dollarSign className="h-7 w-7" />
            <span>DépensePartagée</span>
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
              <SidebarMenuButton asChild>
                <Link href="/expenses"><Icons.receipt /> Dépenses</Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/expenses/new"><Icons.plusSquare /> Nouvelle dépense</Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="#"><Icons.barChartBig /> Rapports</Link>
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
           <Button variant="outline" onClick={handleLogout}>
                <Icons.logOut className="mr-2 h-4 w-4" /> Déconnexion
          </Button>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="flex flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6 shadow-sm">
          <SidebarTrigger><Icons.chevronsLeft /></SidebarTrigger>
          <div className="relative flex-1">
            <Icons.search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Rechercher..." className="pl-10 w-full md:w-1/3 lg:w-1/4" data-ai-hint="search input"/>
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
                    src={userProfile?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.name || currentUser?.email || 'U')}&background=random&color=fff&size=32`} 
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
              <p className="text-muted-foreground">
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
                  {selectedProject ? `Dépenses pour ${selectedProject.name} (basées sur données graphiques)` : "Vue d'ensemble des dépenses (basées sur données graphiques)"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <Tabs defaultValue="user">
                  <TabsList className="mb-4">
                    <TabsTrigger value="user">Par utilisateur</TabsTrigger>
                    <TabsTrigger value="category">Par catégorie</TabsTrigger>
                  </TabsList>
                  <TabsContent value="user">
                     <ExpenseAnalysisChart data={expenseChartData} isLoading={isLoadingExpenseChartData} />
                  </TabsContent>
                  <TabsContent value="category">
                    <p className="text-muted-foreground text-center py-8">Analyse par catégorie bientôt disponible.</p>
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
                        <p className="text-xs text-muted-foreground">{expense.projectName} • {formatDateFromTimestamp(expense.expenseDate)}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {expense.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0.5">{tag}</Badge>
                          ))}
                        </div>
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
