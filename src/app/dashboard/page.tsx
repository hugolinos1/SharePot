
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
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
import type { ChartConfig } from '@/components/ui/chart';
import type { Project } from '@/data/mock-data'; 
import { BalanceSummary } from '@/components/dashboard/balance-summary';
import { db } from '@/lib/firebase';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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

interface RecentExpenseItem { 
  id: string;
  icon: React.ElementType;
  title: string;
  project: string; 
  date: string | Timestamp;
  amount: string; // This is a display string, like "120,50 €"
  tags: { label: string; variant: "default" | "secondary" | "destructive" | "outline" }[];
}

// This mock data might be replaced by fetching from Firestore later
const mockRecentExpenseItems: RecentExpenseItem[] = [ 
  { id: '1', icon: Icons.fileText, title: 'Restaurant Chez Michel', project: 'Voyage à Paris', date: '2025-05-13', amount: '120,50 €', tags: [{label: 'nourriture', variant: 'secondary'}, {label: 'restaurant', variant: 'secondary'}] },
  { id: '2', icon: Icons.fileText, title: 'Tickets de métro', project: 'Voyage à Paris', date: '2025-05-13', amount: '45,20 €', tags: [{label: 'transport', variant: 'secondary'}] },
  { id: '3', icon: Icons.fileText, title: 'Visite du musée', project: 'Voyage à Paris', date: '2025-05-13', amount: '85,00 €', tags: [{label: 'divertissement', variant: 'secondary'}, {label: 'musée', variant: 'secondary'}] },
  { id: '4', icon: Icons.fileText, title: 'Loyer', project: 'Déménagement Bureau', date: '2025-05-13', amount: '350,75 €', tags: [{label: 'logement', variant: 'secondary'}] },
  { id: '5', icon: Icons.fileText, title: 'Courses alimentaires', project: 'Déménagement Bureau', date: '2025-05-13', amount: '65,45 €', tags: [{label: 'nourriture', variant: 'secondary'}] },
  { id: '6', icon: Icons.fileText, title: 'Billets d\'avion', project: 'Événement Startup', date: '2025-05-10', amount: '220,00 €', tags: [{label: 'transport', variant: 'secondary'}, {label: 'voyage affaire', variant: 'secondary'}] },
  { id: '7', icon: Icons.fileText, title: 'Frais de stand', project: 'Événement Startup', date: '2025-05-11', amount: '560,00 €', tags: [{label: 'marketing', variant: 'secondary'}, {label: 'événement', variant: 'secondary'}] },
];


interface SidebarGroupContentProps {
  children: React.ReactNode;
}

const SidebarGroupContent: React.FC<SidebarGroupContentProps> = ({ children }) => {
  return <div className="space-y-2">{children}</div>;
};

const formatDateFromTimestamp = (timestamp: Timestamp | string | undefined): string => {
  if (!timestamp) return 'N/A';
  if (typeof timestamp === 'string') { // Could be an ISO string
    try {
      return format(new Date(timestamp), 'PP', { locale: fr });
    } catch (e) { return 'Date invalide'; }
  }
  if (timestamp instanceof Timestamp) {
    return format(timestamp.toDate(), 'PP', { locale: fr });
  }
  return 'Date invalide';
};


export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const { toast } = useToast();

  const fetchProjects = useCallback(async () => {
    setIsLoadingProjects(true);
    try {
      const projectsCollection = collection(db, "projects");
      const projectSnapshot = await getDocs(projectsCollection);
      const projectsList = projectSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Project));
      setProjects(projectsList);
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
  }, [toast]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);


  const chartConfig = {
    Dépenses: {
      label: "Dépenses (€)",
      color: "hsl(var(--primary))",
    },
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
    if (isLoadingProjects && projects.length === 0) { // Still loading initial data
        return { totalSpent: "Chargement...", expenseCount: "...", participantsCount: "...", averagePerPerson: "..." };
    }

    const projectsToConsider = selectedProject ? [selectedProject] : projects;
    
    if (projectsToConsider.length === 0 && !selectedProject) { // No projects at all
        return { totalSpent: "0,00 €", expenseCount: "0", participantsCount: "0", averagePerPerson: "0,00 €" };
    }

    const totalSpentAll = projectsToConsider.reduce((sum, p) => sum + (p.totalExpenses || 0), 0);
    const totalExpenseCountAll = projectsToConsider.reduce((sum, p) => sum + (p.recentExpenses?.length || 0), 0);
    
    const allParticipants = new Set<string>();
    projectsToConsider.forEach(p => p.members?.forEach(m => allParticipants.add(m)));
    
    const averagePerPersonAll = allParticipants.size > 0 ? totalSpentAll / allParticipants.size : 0;

    return {
      totalSpent: `${totalSpentAll.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`,
      expenseCount: totalExpenseCountAll.toString(),
      participantsCount: allParticipants.size.toString(),
      averagePerPerson: `${averagePerPersonAll.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`,
    };
  }, [selectedProject, projects, isLoadingProjects]);

  const filteredRecentExpenses = useMemo(() => {
    // Note: mockRecentExpenseItems is used here. For real data, this would filter actual expenses.
    if (selectedProject) {
      return mockRecentExpenseItems.filter(expense => expense.project === selectedProject.name);
    }
    return mockRecentExpenseItems;
  }, [selectedProject]);


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
          <Separator className="my-4" />
           <SidebarGroup>
            <SidebarGroupLabel>ADMINISTRATION</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/admin"><Icons.users /> Utilisateurs</Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="#"><Icons.settings /> Paramètres</Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-4">
           <Button variant="outline" asChild>
            <Link href="/login">
                <Icons.logOut className="mr-2 h-4 w-4" /> Déconnexion
            </Link>
          </Button>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="flex flex-col">
        {/* Header */}
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
            <Avatar className="h-9 w-9">
              <AvatarImage src="https://picsum.photos/40/40" alt="User" data-ai-hint="user avatar"/>
              <AvatarFallback>AD</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">Tableau de bord</h1>
              <p className="text-muted-foreground">
                {selectedProject ? `Aperçu du projet: ${selectedProject.name}` : "Bienvenue. Voici un aperçu global."}
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

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <SummaryCard title="Total dépensé" value={summaryData.totalSpent} icon={<Icons.euro className="h-5 w-5 text-muted-foreground" />} />
            <SummaryCard title="Dépenses enregistrées" value={summaryData.expenseCount} icon={<Icons.fileText className="h-5 w-5 text-muted-foreground" />} />
            <SummaryCard title="Participants" value={summaryData.participantsCount} icon={<Icons.users className="h-5 w-5 text-muted-foreground" />} description={selectedProject ? "Dans ce projet" : "Total unique"}/>
            <SummaryCard title="Moyenne / pers." value={summaryData.averagePerPerson} icon={<Icons.lineChart className="h-5 w-5 text-muted-foreground" />} />
          </div>

          {/* Balance Summary */}
          <BalanceSummary project={selectedProject} />

          {/* Charts and Recent Expenses */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Expense Analysis Chart */}
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

            {/* Recent Expenses List */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Dépenses récentes (global)</CardTitle> 
                <CardDescription>
                  {selectedProject ? `Dernières transactions globales (non filtré par projet ${selectedProject.name})` : "Vos dernières transactions globales"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {filteredRecentExpenses.length > 0 ? (
                  filteredRecentExpenses.slice(0, 5).map(expense => ( 
                    <div key={expense.id} className="flex items-start gap-4 p-3 bg-muted/50 rounded-lg">
                      <div className="p-2 bg-primary/10 rounded-md">
                           <expense.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <p className="font-medium">{expense.title}</p>
                          <p className="font-semibold text-sm">{expense.amount}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{expense.project} • {formatDateFromTimestamp(expense.date)}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {expense.tags.map(tag => (
                            <Badge key={tag.label} variant={tag.variant} className="text-xs px-1.5 py-0.5">{tag.label}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">Aucune dépense récente à afficher.</p>
                )}
                 <Button variant="link" className="w-full mt-2 text-primary">Voir toutes les dépenses</Button>
              </CardContent>
            </Card>
          </div>
          
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
