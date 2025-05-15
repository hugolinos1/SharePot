
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import type { Project } from '@/data/mock-data';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp, type DocumentData, deleteDoc, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';

export interface ExpenseItem {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  paidById: string;
  paidByName: string;
  expenseDate: Timestamp;
  amount: number;
  currency: string;
  tags: string[];
  createdAt?: Timestamp;
  createdBy: string; // UID of user who created the expense entry
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
  const { currentUser, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [allExpenses, setAllExpenses] = useState<ExpenseItem[]>([]);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseItem | null>(null);


  const fetchProjects = useCallback(async () => {
    if (!currentUser) return;
    setIsLoadingProjects(true);
    try {
      const projectsCollectionRef = collection(db, "projects");
      const q = query(projectsCollectionRef, where("members", "array-contains", currentUser.uid));
      const projectSnapshot = await getDocs(q);
      const projectsList = projectSnapshot.docs.map(docSn => ({
        id: docSn.id,
        ...docSn.data(),
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
  }, [currentUser, toast]);

  const fetchExpenses = useCallback(async () => {
    if(!currentUser) return;
    setIsLoadingExpenses(true);
    try {
      const expensesCollectionRef = collection(db, "expenses");
      // Fetch expenses related to projects the user is a member of
      // This requires knowing which projects the user is part of.
      // For simplicity, if projects are already loaded, we can filter by those project IDs.
      // A more robust solution might involve querying expenses where createdBy is user.uid OR projectId is in user's project list.
      // For now, let's fetch all expenses and filter client-side based on projects loaded for the user.
      // This is not ideal for large datasets but works for smaller ones.
      // A better way: fetch projects, then make specific queries for expenses for those projects.
      // Or if rules allow, query where 'memberIds' (if such field existed in expense) contains user.uid
      
      // Fetching all expenses if user is admin, otherwise filter.
      // This logic might need adjustment based on final data access patterns for expenses.
      // For now, let's assume a user can see all expenses of projects they are part of.
      // This means we first need to know the user's projects.
      
      // If projects are not loaded yet, or no projects, this will fetch nothing or all (if rules permit)
      if (projects.length > 0) {
        const projectIds = projects.map(p => p.id);
        if (projectIds.length > 0) {
          // Firestore 'in' query is limited to 30 items in the array.
          // If a user is part of more than 30 projects, this needs chunking.
          const expenseQueries = [];
          const chunkSize = 30; // Firestore 'in' query limit
           for (let i = 0; i < projectIds.length; i += chunkSize) {
                const chunk = projectIds.slice(i, i + chunkSize);
                expenseQueries.push(getDocs(query(expensesCollectionRef, where("projectId", "in", chunk))));
            }
            const querySnapshots = await Promise.all(expenseQueries);
            let expensesList: ExpenseItem[] = [];
            querySnapshots.forEach(snapshot => {
                snapshot.docs.forEach(docSnap => {
                    expensesList.push({ id: docSnap.id, ...docSnap.data() } as ExpenseItem);
                });
            });
            setAllExpenses(expensesList);

        } else {
            setAllExpenses([]); // No projects, so no expenses to show based on project membership
        }
      } else if (!isLoadingProjects) { // Projects loaded, but user has none
         setAllExpenses([]);
      } else {
        // Fallback: if projects are still loading, perhaps fetch expenses created by user?
        // Or wait for projects to load. For now, an empty list until projects are clear.
        // const q = query(expensesCollectionRef, where("createdBy", "==", currentUser.uid));
        // const expenseSnapshot = await getDocs(q);
        // const expensesList = expenseSnapshot.docs.map(doc => ({
        //   id: doc.id, ...doc.data(),
        // } as ExpenseItem));
        // setAllExpenses(expensesList);
        // This part can be refined based on desired behavior when projects are loading.
        // For now, we'll rely on the projects list to define which expenses to fetch.
      }


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
  }, [currentUser, toast, projects, isLoadingProjects]);

  useEffect(() => {
    if(currentUser) {
      fetchProjects();
    }
  }, [currentUser, fetchProjects]);

  useEffect(() => {
    if (currentUser && projects.length > 0 && !isLoadingProjects) {
      fetchExpenses();
    } else if (currentUser && !isLoadingProjects && projects.length === 0) {
      // User has no projects, so no expenses to fetch based on project membership
      setAllExpenses([]);
      setIsLoadingExpenses(false);
    }
  }, [currentUser, projects, isLoadingProjects, fetchExpenses]);


  const filteredExpenses = useMemo(() => {
    let expensesToFilter = allExpenses;

    if (selectedProjectId !== 'all' && !isLoadingProjects) {
        expensesToFilter = expensesToFilter.filter(expense => expense.projectId === selectedProjectId);
    }
    
    if (searchTerm) {
      const lowerCaseSearch = searchTerm.toLowerCase();
      expensesToFilter = expensesToFilter.filter(expense =>
        expense.title.toLowerCase().includes(lowerCaseSearch) ||
        (expense.projectName && expense.projectName.toLowerCase().includes(lowerCaseSearch)) ||
        (expense.paidByName && expense.paidByName.toLowerCase().includes(lowerCaseSearch)) ||
        expense.tags.some(tag => tag.toLowerCase().includes(lowerCaseSearch)) ||
        expense.amount.toString().includes(lowerCaseSearch)
      );
    }
    return expensesToFilter.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
  }, [selectedProjectId, searchTerm, allExpenses, isLoadingProjects]);
  
  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return;
    setIsDeleting(true);
    try {
      const expenseRef = doc(db, "expenses", expenseToDelete.id);
      const projectRef = doc(db, "projects", expenseToDelete.projectId);

      await runTransaction(db, async (transaction) => {
        const projectDoc = await transaction.get(projectRef);
        if (!projectDoc.exists()) {
          throw new Error("Projet associé non trouvé.");
        }
        const projectData = projectDoc.data() as Project;
        const newTotalExpenses = (projectData.totalExpenses || 0) - expenseToDelete.amount;
        
        const updatedRecentExpenses = (projectData.recentExpenses || []).filter(
          (expSummary) => expSummary.id !== expenseToDelete.id
        );

        transaction.delete(expenseRef);
        transaction.update(projectRef, {
          totalExpenses: newTotalExpenses < 0 ? 0 : newTotalExpenses, // Ensure it doesn't go negative
          recentExpenses: updatedRecentExpenses,
          lastActivity: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      setAllExpenses(prevExpenses => prevExpenses.filter(exp => exp.id !== expenseToDelete.id));
      toast({
        title: "Dépense supprimée",
        description: `La dépense "${expenseToDelete.title}" a été supprimée avec succès.`,
      });
    } catch (error: any) {
      console.error("Erreur lors de la suppression de la dépense: ", error);
      toast({
        title: "Erreur de suppression",
        description: `Impossible de supprimer la dépense: ${error.message || "Veuillez réessayer."}`,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setExpenseToDelete(null);
    }
  };
  
  const openDeleteConfirmDialog = (expenseItem: ExpenseItem) => {
    setExpenseToDelete(expenseItem);
  };

  if (authLoading || !currentUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Icons.loader className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

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
                <CardTitle>Liste des Dépenses ({isLoadingExpenses && projects.length > 0 ? '...' : filteredExpenses.length})</CardTitle>
                <CardDescription>
                Filtrez par projet ou recherchez par mots-clés.
                </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId} disabled={isLoadingProjects}>
                    <SelectTrigger className="w-full sm:w-[200px] md:w-[250px] py-2.5 text-base" data-ai-hint="project filter select">
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
                        data-ai-hint="search expenses input"
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
                {(isLoadingExpenses && projects.length > 0) && (
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
                        <Button variant="ghost" size="icon" className="mr-1 h-8 w-8" onClick={() => toast({ title: "Fonctionnalité à venir", description: "La modification des dépenses sera bientôt disponible."})}>
                            <Icons.edit className="h-4 w-4" />
                            <span className="sr-only">Modifier</span>
                        </Button>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90 h-8 w-8" onClick={() => openDeleteConfirmDialog(expense)}>
                                <Icons.trash className="h-4 w-4" />
                                <span className="sr-only">Supprimer</span>
                            </Button>
                        </AlertDialogTrigger>
                    </TableCell>
                  </TableRow>
                ))}
                {(!isLoadingExpenses || (isLoadingExpenses && projects.length === 0)) && filteredExpenses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-10 h-32">
                      {projects.length === 0 && !isLoadingProjects ? "Aucun projet trouvé pour cet utilisateur." : "Aucune dépense trouvée pour les filtres actuels."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!expenseToDelete} onOpenChange={(open) => !open && setExpenseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la dépense "{expenseToDelete?.title}"?
              Cette action est irréversible et mettra à jour le total des dépenses du projet associé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setExpenseToDelete(null)} disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExpense} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {isDeleting ? <Icons.loader className="mr-2 h-4 w-4 animate-spin" /> : <Icons.trash className="mr-2 h-4 w-4" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
