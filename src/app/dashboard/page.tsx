
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
import type { ChartConfig } from '@/components/ui/chart';
import type { Project, User as AppUserType } from '@/data/mock-data';
import { BalanceSummary } from '@/components/dashboard/balance-summary';
import { db } from '@/lib/firebase';
import { collection, getDocs, Timestamp, query, where, orderBy, limit } from 'firebase/firestore';
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

const SidebarGroupContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className="space-y-2">{children}</div>;
};

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
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] || '') + (parts[parts.length - 1][0] || '');
    }
    return name.substring(0, 2).toUpperCase();
  }
  if (email) {
    return email.substring(0, 2).toUpperCase();
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
      
      setProjects(Array.from(projectsMap.values()));
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
        const q = query(expensesRef, orderBy("createdAt", "desc"), limit(5));
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
    if (!currentUser) {
      console.warn("DashboardPage: fetchAllUserProfiles called without currentUser.");
      setIsLoadingUserProfiles(false);
      setAllUserProfiles([]);
      return;
    }
     // Removed isAdmin check here, will be handled by useEffect logic
    setIsLoadingUserProfiles(true);
    try {
      console.log("DashboardPage: Fetching all user profiles.");
      const usersCollectionRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersCollectionRef);
      const usersList = usersSnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      } as AppUserType));
      setAllUserProfiles(usersList);
      console.log("DashboardPage: Successfully fetched allUserProfiles:", JSON.stringify(usersList.map(u => ({id: u.id, name: u.name}))));
    } catch (error) {
      console.error("Erreur lors de la récupération des profils utilisateurs (Dashboard): ", error);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger les profils utilisateurs pour les balances.",
        variant: "destructive",
      });
      setAllUserProfiles([]); 
    } finally {
      setIsLoadingUserProfiles(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    if (currentUser) {
      fetchProjects();
      fetchRecentGlobalExpenses();
      console.log(`DashboardPage: useEffect - currentUser exists. isAdmin: ${isAdmin}`);
      if (isAdmin) {
        console.log("DashboardPage: useEffect - Calling fetchAllUserProfiles because isAdmin is true.");
        fetchAllUserProfiles();
      } else {
        console.log("DashboardPage: useEffect - Not admin or isAdmin status pending. Providing minimal profiles.");
        if (userProfile) {
          setAllUserProfiles([userProfile]);
           console.log("DashboardPage: useEffect - Set allUserProfiles for non-admin with userProfile:", JSON.stringify([userProfile].map(u => ({id: u.id, name: u.name}))));
        } else {
          setAllUserProfiles([]);
          console.log("DashboardPage: useEffect - Set allUserProfiles to empty for non-admin (no userProfile).");
        }
        setIsLoadingUserProfiles(false);
      }
    }
  }, [currentUser, userProfile, isAdmin, fetchProjects, fetchRecentGlobalExpenses, fetchAllUserProfiles]);

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

  const chartConfig = {
    Dépenses: { label: "Dépenses (€)", color: "hsl(var(--primary))" },
    JeanD: { label: "Jean D.", color: "hsl(var(--chart-1))" },
    SophieL: { label: "Sophie L.", color: "hsl(var(--chart-2))" },
    LucM: { label: "Luc M.", color: "hsl(var(--chart-3))" },
    MarieP: { label: "Marie P.", color: "hsl(var(--chart-4))" },
  } satisfies ChartConfig;

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
                <SidebarGroupContent>
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
                </SidebarGroupContent>
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
            <Input placeholder="Rechercher..." className="pl-10 w-full md:w-1/3 lg:w-1/4" />
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Icons.bell className="h-5 w-5" />
              <span className="sr-only">Notifications</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-9 w-9 cursor-pointer">
                  <AvatarImage src={userProfile?.avatarUrl || `https://placehold.co/40x40.png`} alt={userProfile?.name || "User"} data-ai-hint="user avatar"/>
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
                <SelectTrigger id="project-filter-select" className="w-full py-2.5 text-base bg-background">
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
                    <ExpenseAnalysisChart /> 
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

    
