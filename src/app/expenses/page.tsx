
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
import type { Project } from '@/data/mock-data'; 
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp, type DocumentData } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Updated ExpenseItem interface to reflect Firestore structure
export interface ExpenseItem {
  id: string; // Firestore document ID
  title: string;
  projectId: string;
  projectName: string; // Denormalized for display
  paidById: string;
  paidByName: string; // Denormalized for display
  expenseDate: Timestamp; // Firestore Timestamp
  amount: number;
  currency: string;
  tags: string[]; // Array of strings
  createdAt?: Timestamp;
}

const formatDateFromTimestamp = (timestamp: Timestamp | undefined): string => {
  if (!timestamp) return 'N/A';
  try {
    return format(timestamp.toDate(), 'PP', { locale: fr });
  } catch (e) {
    return 'Date invalide';
  }
};

export default function ExpensesPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [allExpenses, setAllExpenses] = useState<ExpenseItem[]>([]);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
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

  const fetchExpenses = useCallback(async () => {
    setIsLoadingExpenses(true);
    try {
      const expensesCollection = collection(db, "expenses");
      // For now, fetch all expenses. Could be optimized with queries later.
      const expenseSnapshot = await getDocs(expensesCollection);
      const expensesList = expenseSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as ExpenseItem));
      setAllExpenses(expensesList);
    } catch (error) {
      console.error("Erreur lors de la récupération des dépenses: ", error);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger la liste des dépenses.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingExpenses(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProjects();
    fetchExpenses();
  }, [fetchProjects, fetchExpenses]);

  const filteredExpenses = useMemo(() => {
    let expensesToFilter = allExpenses;

    if (selectedProjectId !== 'all' && !isLoadingProjects) {
        expensesToFilter = expensesToFilter.filter(expense => expense.projectId === selectedProjectId);
    }
    
    if (searchTerm) {
      const lowerCaseSearch = searchTerm.toLowerCase();
      expensesToFilter = expensesToFilter.filter(expense =>
        expense.title.toLowerCase().includes(lowerCaseSearch) ||
        expense.projectName.toLowerCase().includes(lowerCaseSearch) ||
        expense.paidByName.toLowerCase().includes(lowerCaseSearch) ||
        expense.tags.some(tag => tag.toLowerCase().includes(lowerCaseSearch)) ||
        expense.amount.toString().includes(lowerCaseSearch)
      );
    }
    return expensesToFilter;
  }, [selectedProjectId, searchTerm, allExpenses, isLoadingProjects]);
  
  const handleExpenseAction = (actionType: 'edit' | 'delete') => {
    toast({
        title: "Fonctionnalité en cours de développement",
        description: `L'action de "${actionType}" dépense n'est pas encore connectée à Firestore.`,
    });
  };

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
                <CardTitle>Liste des Dépenses ({isLoadingExpenses ? '...' : filteredExpenses.length})</CardTitle>
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
                {isLoadingExpenses && (
                    <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-10 h-32">
                            <Icons.loader className="mx-auto h-8 w-8 animate-spin" />
                            Chargement des dépenses...
                        </TableCell>
                    </TableRow>
                )}
                {!isLoadingExpenses && filteredExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">{expense.title}</TableCell>
                    <TableCell className="text-muted-foreground">{expense.projectName}</TableCell>
                    <TableCell className="text-muted-foreground">{expense.paidByName}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDateFromTimestamp(expense.expenseDate)}</TableCell>
                    <TableCell className="text-right font-semibold">
                        {expense.amount.toLocaleString('fr-FR', { style: 'currency', currency: expense.currency })}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {expense.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0.5">{tag}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="mr-1 h-8 w-8" onClick={() => handleExpenseAction('edit')}>
                            <Icons.edit className="h-4 w-4" />
                            <span className="sr-only">Modifier</span>
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90 h-8 w-8" onClick={() => handleExpenseAction('delete')}>
                            <Icons.trash className="h-4 w-4" />
                            <span className="sr-only">Supprimer</span>
                        </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoadingExpenses && filteredExpenses.length === 0 && (
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
