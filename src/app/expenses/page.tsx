
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import type { Project } from '@/data/mock-data'; // Import Project type
import { db } from '@/lib/firebase';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ExpenseItem {
  id: string;
  title: string; 
  project: string; 
  paidBy: string; 
  date: string | Timestamp; // Allow Timestamp
  amount: string; 
  tags: { label: string; variant: "default" | "secondary" | "destructive" | "outline" }[];
  // Potentially add original amount and currency if different from display
  // originalAmount?: number;
  // originalCurrency?: string;
}

// This mock data will be replaced by fetching expenses, possibly filtered by project, from Firestore.
// For now, it serves as a placeholder.
const allExpensesData: ExpenseItem[] = [
  { id: 'exp1', title: 'Restaurant Chez Michel', project: 'Voyage à Paris', paidBy: 'Jean Dupont', date: '2025-05-13', amount: '120,50 €', tags: [{label: 'nourriture', variant: 'secondary'}, {label: 'restaurant', variant: 'secondary'}] },
  { id: 'exp2', title: 'Tickets de métro', project: 'Voyage à Paris', paidBy: 'Marie Martin', date: '2025-05-13', amount: '45,20 €', tags: [{label: 'transport', variant: 'secondary'}] },
  { id: 'exp3', title: 'Visite du musée', project: 'Voyage à Paris', paidBy: 'Paul Durand', date: '2025-05-13', amount: '85,00 €', tags: [{label: 'divertissement', variant: 'secondary'}, {label: 'musée', variant: 'secondary'}] },
  { id: 'exp4', title: 'Loyer agence', project: 'Déménagement Bureau', paidBy: 'Admin User', date: '2025-06-01', amount: '1350,75 €', tags: [{label: 'logement', variant: 'secondary'}, {label: 'fixe', variant: 'secondary'}] },
  { id: 'exp5', title: 'Courses alimentaires equipe', project: 'Déménagement Bureau', paidBy: 'Lucie Petit', date: '2025-06-03', amount: '65,45 €', tags: [{label: 'nourriture', variant: 'secondary'}, {label: 'équipe', variant: 'secondary'}] },
  { id: 'exp6', title: 'Billets d\'avion conférence', project: 'Événement Startup', paidBy: 'Admin User', date: '2025-05-10', amount: '220,00 €', tags: [{label: 'transport', variant: 'secondary'}, {label: 'voyage affaire', variant: 'secondary'}] },
  { id: 'exp7', title: 'Frais de stand salon', project: 'Événement Startup', paidBy: 'Sarah Leroy', date: '2025-05-11', amount: '560,00 €', tags: [{label: 'marketing', variant: 'secondary'}, {label: 'événement', variant: 'secondary'}] },
  { id: 'exp8', title: 'Logiciel de design (Abonnement)', project: 'Développement Application Mobile', paidBy: 'Jean Dupont', date: '2025-06-15', amount: '150,00 €', tags: [{label: 'logiciel', variant: 'secondary'}, {label: 'design', variant: 'secondary'}]},
  { id: 'exp9', title: 'Hébergement serveur (Mensuel)', project: 'Développement Application Mobile', paidBy: 'Alice Dubois', date: '2025-06-20', amount: '75,00 €', tags: [{label: 'infra', variant: 'secondary'}, {label: 'cloud', variant: 'secondary'}]},
  { id: 'exp10', title: 'Fournitures de bureau diverses', project: 'Déménagement Bureau', paidBy: 'Marc Blanc', date: '2025-05-01', amount: '95,00 €', tags: [{label: 'bureau', variant: 'secondary'}, {label: 'fournitures', variant: 'secondary'}]},
  { id: 'exp11', title: 'Déjeuner client Alpha', project: 'Voyage à Paris', paidBy: 'Jean Dupont', date: '2025-05-14', amount: '70,00 €', tags: [{label: 'client', variant: 'secondary'}, {label: 'restaurant', variant: 'secondary'}]},
  { id: 'exp12', title: 'Publicité en ligne', project: 'Événement Startup', paidBy: 'Admin User', date: '2025-05-05', amount: '300,00 €', tags: [{label: 'marketing', variant: 'secondary'}, {label: 'pub', variant: 'secondary'}]},
];

const formatDateFromTimestamp = (timestamp: Timestamp | string | undefined): string => {
  if (!timestamp) return 'N/A';
  if (typeof timestamp === 'string') {
     try { return format(new Date(timestamp), 'PP', { locale: fr }); } catch (e) { return 'Date invalide'; }
  }
  if (timestamp instanceof Timestamp) {
    return format(timestamp.toDate(), 'PP', { locale: fr });
  }
  return 'Date invalide';
};

export default function ExpensesPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
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
    // Here you would also fetch expenses, possibly based on selectedProjectId or all expenses
    // For now, we use mock allExpensesData
  }, [fetchProjects]);

  const filteredExpenses = useMemo(() => {
    let expensesToFilter = allExpensesData; // Replace with fetched expenses from Firestore

    if (selectedProjectId !== 'all' && !isLoadingProjects) {
      const selectedProjectDetails = projects.find(p => p.id === selectedProjectId);
      if (selectedProjectDetails) {
        expensesToFilter = expensesToFilter.filter(expense => expense.project === selectedProjectDetails.name);
      } else {
        expensesToFilter = []; // Or handle as "no project found with this ID"
      }
    }
    
    if (searchTerm) {
      const lowerCaseSearch = searchTerm.toLowerCase();
      expensesToFilter = expensesToFilter.filter(expense =>
        expense.title.toLowerCase().includes(lowerCaseSearch) ||
        expense.project.toLowerCase().includes(lowerCaseSearch) ||
        expense.paidBy.toLowerCase().includes(lowerCaseSearch) ||
        expense.tags.some(tag => tag.label.toLowerCase().includes(lowerCaseSearch))
      );
    }
    return expensesToFilter;
  }, [selectedProjectId, searchTerm, projects, isLoadingProjects]);

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">Gestion des Dépenses</h1>
          <p className="text-lg text-muted-foreground">
            Visualisez et filtrez toutes les dépenses enregistrées.
          </p>
        </div>
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <Link href="/dashboard" passHref>
            <Button variant="outline">
              <Icons.layoutDashboard className="mr-2 h-4 w-4" /> Tableau de bord
            </Button>
          </Link>
           <Link href="/expenses/new" passHref>
              <Button><Icons.plus className="mr-2 h-4 w-4" /> Nouvelle Dépense</Button>
            </Link>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
                <CardTitle>Liste des Dépenses ({filteredExpenses.length})</CardTitle>
                <CardDescription>
                Filtrez par projet ou recherchez par mots-clés.
                </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId} disabled={isLoadingProjects}>
                    <SelectTrigger className="w-full sm:w-[200px] md:w-[250px] py-2.5 text-base">
                        <SelectValue placeholder={isLoadingProjects ? "Chargement..." : "Filtrer par projet"} />
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
                <div className="relative w-full sm:w-[200px] md:w-[250px]">
                    <Icons.search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Rechercher dépenses..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Projet</TableHead>
                  <TableHead>Payé par</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">{expense.title}</TableCell>
                    <TableCell className="text-muted-foreground">{expense.project}</TableCell>
                    <TableCell className="text-muted-foreground">{expense.paidBy}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDateFromTimestamp(expense.date)}</TableCell>
                    <TableCell className="text-right font-semibold">{expense.amount}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {expense.tags.map(tag => (
                          <Badge key={tag.label} variant={tag.variant} className="text-xs px-1.5 py-0.5">{tag.label}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="mr-1 h-8 w-8">
                            <Icons.edit className="h-4 w-4" />
                            <span className="sr-only">Modifier</span>
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90 h-8 w-8">
                            <Icons.trash className="h-4 w-4" />
                            <span className="sr-only">Supprimer</span>
                        </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredExpenses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-10 h-32">
                      Aucune dépense trouvée pour les filtres actuels.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
