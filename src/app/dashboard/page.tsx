
"use client";

import React, { useState, useMemo } from 'react';
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
import type { ChartConfig } from '@/components/ui/chart';
import { initialProjects, Project } from '@/data/mock-data'; 
import { BalanceSummary } from '@/components/dashboard/balance-summary'; // Import BalanceSummary

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
  date: string;
  amount: string;
  tags: { label: string; variant: "default" | "secondary" | "destructive" | "outline" }[];
}

const mockRecentExpenseItems: RecentExpenseItem[] = [ 
  { id: '1', icon: Icons.fileText, title: 'Restaurant Chez Michel', project: 'Voyage à Paris', date: '13 mai 2025', amount: '120,50 €', tags: [{label: 'nourriture', variant: 'secondary'}, {label: 'restaurant', variant: 'secondary'}] },
  { id: '2', icon: Icons.fileText, title: 'Tickets de métro', project: 'Voyage à Paris', date: '13 mai 2025', amount: '45,20 €', tags: [{label: 'transport', variant: 'secondary'}] },
  { id: '3', icon: Icons.fileText, title: 'Visite du musée', project: 'Voyage à Paris', date: '13 mai 2025', amount: '85,00 €', tags: [{label: 'divertissement', variant: 'secondary'}, {label: 'musée', variant: 'secondary'}] },
  { id: '4', icon: Icons.fileText, title: 'Loyer', project: 'Déménagement Bureau', date: '13 mai 2025', amount: '350,75 €', tags: [{label: 'logement', variant: 'secondary'}] },
  { id: '5', icon: Icons.fileText, title: 'Courses alimentaires', project: 'Déménagement Bureau', date: '13 mai 2025', amount: '65,45 €', tags: [{label: 'nourriture', variant: 'secondary'}] },
  { id: '6', icon: Icons.fileText, title: 'Billets d\'avion', project: 'Événement Startup', date: '10 mai 2025', amount: '220,00 €', tags: [{label: 'transport', variant: 'secondary'}, {label: 'voyage affaire', variant: 'secondary'}] },
  { id: '7', icon: Icons.fileText, title: 'Frais de stand', project: 'Événement Startup', date: '11 mai 2025', amount: '560,00 €', tags: [{label: 'marketing', variant: 'secondary'}, {label: 'événement', variant: 'secondary'}] },
];


interface SidebarGroupContentProps {
  children: React.ReactNode;
}

const SidebarGroupContent: React.FC<SidebarGroupContentProps> = ({ children }) => {
  return <div className="space-y-2">{children}</div>;
};

export default function DashboardPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

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
    if (selectedProjectId === 'all') return null;
    return initialProjects.find(p => p.id === selectedProjectId);
  }, [selectedProjectId]);

  const summaryData = useMemo(() => {
    if (selectedProject) {
      const totalExpenses = selectedProject.totalExpenses;
      const expenseCount = selectedProject.recentExpenses.length; 
      const averagePerPerson = selectedProject.members.length > 0 ? totalExpenses / selectedProject.members.length : 0;
      return {
        totalSpent: `${totalExpenses.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`,
        expenseCount: expenseCount.toString(),
        activeProjectsCount: "1", // Active projects count here would just be 1 as one is selected
        averagePerPerson: `${averagePerPerson.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`,
      };
    } else { 
      const totalSpentAll = initialProjects.reduce((sum, p) => sum + p.totalExpenses, 0);
      const totalExpenseCountAll = initialProjects.reduce((sum, p) => sum + p.recentExpenses.length, 0); 
      const allMembers = new Set<string>();
      initialProjects.forEach(p => p.members.forEach(m => allMembers.add(m)));
      const averagePerPersonAll = allMembers.size > 0 ? totalSpentAll / allMembers.size : 0;

      return {
        totalSpent: `${totalSpentAll.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`,
        expenseCount: totalExpenseCountAll.toString(),
        activeProjectsCount: initialProjects.filter(p => p.status === 'Actif').length.toString(),
        averagePerPerson: `${averagePerPersonAll.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`,
      };
    }
  }, [selectedProject]);

  const filteredRecentExpenses = useMemo(() => {
    if (selectedProject) {
      return mockRecentExpenseItems.filter(expense => expense.project === selectedProject.name);
    }
    return mockRecentExpenseItems;
  }, [selectedProject]);

  const filteredActiveProjects = useMemo(() => {
    const active = initialProjects.filter(p => p.status === 'Actif');
    if (selectedProject) {
      return active.filter(p => p.id === selectedProject.id);
    }
    return active;
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
                <Link href="#"><Icons.receipt /> Dépenses</Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="#"><Icons.plusSquare /> Nouvelle dépense</Link>
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
            <Link href="/"><Icons.home /> Accueil (Portail)</Link>
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
              <AvatarImage src="https://picsum.photos/40/40" alt="User" data-ai-hint="user avatar" />
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
            <div className="w-full sm:w-auto sm:min-w-[200px] md:min-w-[250px]">
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner un projet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les projets</SelectItem>
                  {initialProjects.map(project => (
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
            <SummaryCard title="Projets actifs" value={summaryData.activeProjectsCount} icon={<Icons.folders className="h-5 w-5 text-muted-foreground" />} />
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
                <CardTitle>Dépenses récentes (global)</CardTitle> {/* Title changed to reflect it shows mock global recent items */}
                <CardDescription>
                  {selectedProject ? `Dernières transactions globales (non filtré par projet ${selectedProject.name})` : "Vos dernières transactions globales"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {filteredRecentExpenses.length > 0 ? (
                  filteredRecentExpenses.slice(0, 5).map(expense => ( // Show only first 5 mock items
                    <div key={expense.id} className="flex items-start gap-4 p-3 bg-muted/50 rounded-lg">
                      <div className="p-2 bg-primary/10 rounded-md">
                           <expense.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <p className="font-medium">{expense.title}</p>
                          <p className="font-semibold text-sm">{expense.amount}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{expense.project} • {expense.date}</p>
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
          
          {/* Active Projects */}
           <Card>
                <CardHeader>
                    <CardTitle>
                      {selectedProject ? `Projet actif: ${selectedProject.name}` : "Vos projets actifs"}
                    </CardTitle>
                    <CardDescription>
                      {selectedProject ? `Détails du projet sélectionné` : "Projets auxquels vous participez"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredActiveProjects.map((project) => (
                            <Card key={project.id} className={`hover:shadow-md transition-shadow ${selectedProjectId === project.id ? 'ring-2 ring-primary' : ''}`}>
                                <CardContent className="p-4 flex flex-col items-center text-center">
                                    <div className="p-3 bg-primary/10 rounded-lg mb-2">
                                        <Icons.folderKanban className="h-8 w-8 text-primary" />
                                    </div>
                                    <p className="font-medium text-sm">{project.name}</p>
                                     <Badge variant={project.status === 'Actif' ? 'default' : 'secondary'} className="mt-1 text-xs">{project.status}</Badge>
                                </CardContent>
                            </Card>
                        ))}
                         {filteredActiveProjects.length === 0 && <p className="text-muted-foreground col-span-full text-center py-4">
                           {selectedProject ? "Ce projet n'est pas actif ou ne correspond pas aux filtres." : "Aucun projet actif."}
                           </p>}
                    </div>
                     {selectedProjectId !== 'all' && filteredActiveProjects.length > 0 && (
                        <Button variant="outline" onClick={() => setSelectedProjectId('all')} className="mt-4 w-full">
                            Voir tous les projets actifs
                        </Button>
                    )}
                </CardContent>
            </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

