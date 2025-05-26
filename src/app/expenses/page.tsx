
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image'; // Import Image from next/image
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
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import type { Project } from '@/data/mock-data';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp, deleteDoc, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage as AvatarImagePrimitive } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface ExpenseItem {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  paidById: string;
  paidByName: string;
  expenseDate: Timestamp;
  amount: number; // Original amount
  currency: string; // Original currency
  amountEUR: number | null; // Amount converted to EUR
  category?: string;
  createdAt?: Timestamp;
  createdBy: string;
  updatedAt?: Timestamp;
}

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
  return '??';
};

const formatDateFromTimestamp = (timestamp: Timestamp | undefined): string => {
  if (!timestamp) return 'N/A';
  try {
    return format(timestamp.toDate(), 'PP', { locale: fr });
  } catch (e) {
    return 'Date invalide';
  }
};

export default function ExpensesPage() {
  const { currentUser, userProfile, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [allExpenses, setAllExpenses] = useState<ExpenseItem[]>([]);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseItem | null>(null);


  useEffect(() => {
    console.log("ExpensesPage: useEffect for fetchProjects - currentUser detected, calling fetchProjects.");
    if (currentUser) {
      fetchProjects();
    } else if (!authLoading) {
      console.log("ExpensesPage: useEffect for fetchProjects - No currentUser and not authLoading. Resetting states and redirecting to login.");
      setProjects([]);
      setAllExpenses([]);
      setIsLoadingProjects(true);
      setIsLoadingExpenses(true);
      router.replace('/login');
    } else {
      console.log("ExpensesPage: useEffect for fetchProjects - No currentUser but auth is loading. Waiting.");
       // Explicitly set loading states to true if waiting for auth
      setIsLoadingProjects(true);
      setIsLoadingExpenses(true);
    }
  }, [currentUser, authLoading, router]); // Removed fetchProjects from dependencies

  const fetchProjects = useCallback(async () => {
    if (!currentUser) {
      console.log("ExpensesPage: fetchProjects - No currentUser, clearing projects.");
      setProjects([]);
      setIsLoadingProjects(false); // Set to false as the operation is "complete" (no user)
      return;
    }
    setIsLoadingProjects(true);
    try {
      const projectsCollectionRef = collection(db, "projects");
      const memberQuery = query(projectsCollectionRef, where("members", "array-contains", currentUser.uid));
      const ownerQuery = query(projectsCollectionRef, where("ownerId", "==", currentUser.uid));

      const [memberSnapshot, ownerSnapshot] = await Promise.all([
        getDocs(memberQuery),
        getDocs(ownerQuery)
      ]);

      const projectsMap = new Map<string, Project>();
      memberSnapshot.docs.forEach(docSn => projectsMap.set(docSn.id, { id: docSn.id, ...docSn.data() } as Project));
      ownerSnapshot.docs.forEach(docSn => {
        if (!projectsMap.has(docSn.id)) { // Ensure no duplicates if user is both member and owner
          projectsMap.set(docSn.id, { id: docSn.id, ...docSn.data() } as Project);
        }
      });

      const projectsList = Array.from(projectsMap.values());
      console.log("ExpensesPage: Fetched projectsList:", projectsList.length, "items:", JSON.stringify(projectsList.map(p => p.id)));
      setProjects(projectsList);
    } catch (error) {
      console.error("Erreur lors de la récupération des projets: ", error);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger les projets pour le filtre.",
        variant: "destructive",
      });
      setProjects([]); // Reset projects on error
    } finally {
      setIsLoadingProjects(false);
    }
  }, [currentUser, toast]);


  const fetchExpenses = useCallback(async () => {
    if (!currentUser) {
      console.log("ExpensesPage: fetchExpenses - No currentUser, clearing expenses.");
      setAllExpenses([]);
      setIsLoadingExpenses(false);
      return;
    }
    // Condition: Only fetch expenses if projects are loaded and there are projects,
    // OR if isLoadingProjects is false and projects array might be empty (meaning user has no projects).
    if (isLoadingProjects) {
        console.log("ExpensesPage: fetchExpenses - Waiting for projects to load before fetching expenses.");
        return;
    }

    setIsLoadingExpenses(true);
    console.log("ExpensesPage: fetchExpenses - Called. projects.length:", projects.length, "isLoadingProjects:", isLoadingProjects);
    try {
      const expensesCollectionRef = collection(db, "expenses");

      if (projects.length > 0) {
        const projectIds = projects.map(p => p.id);
        console.log("ExpensesPage: fetchExpenses - projectIds to query:", projectIds);

        let expensesList: ExpenseItem[] = [];
        const chunkSize = 30; // Firestore 'in' query limit is 30 values
        for (let i = 0; i < projectIds.length; i += chunkSize) {
          const chunk = projectIds.slice(i, i + chunkSize);
          if (chunk.length > 0) {
            const q = query(expensesCollectionRef, where("projectId", "in", chunk));
            const querySnapshot = await getDocs(q);
            querySnapshot.docs.forEach(docSnap => {
              expensesList.push({ id: docSnap.id, ...docSnap.data() } as ExpenseItem);
            });
          }
        }
        console.log("ExpensesPage: fetchExpenses - Fetched expensesList:", expensesList.length, "items:", JSON.stringify(expensesList.map(e => ({ id: e.id, title: e.title }))));
        setAllExpenses(expensesList);
      } else {
        console.log("ExpensesPage: fetchExpenses - No projects available for current user, setting empty expenses.");
        setAllExpenses([]);
      }
    } catch (error: any) {
      console.error("Erreur lors de la récupération des dépenses: ", error);
      toast({
        title: "Erreur de chargement",
        description: `Impossible de charger la liste des dépenses. ${error.message}`,
        variant: "destructive",
      });
      setAllExpenses([]); // Reset expenses on error
    } finally {
      setIsLoadingExpenses(false);
      console.log("ExpensesPage: fetchExpenses - Finished. isLoadingExpenses set to false.");
    }
  }, [currentUser, projects, isLoadingProjects, toast]);


  useEffect(() => {
    console.log("ExpensesPage: useEffect for fetchExpenses triggered. currentUser:", !!currentUser, "projects.length:", projects.length, "isLoadingProjects:", isLoadingProjects);
    if (currentUser && !isLoadingProjects) { // Only call if projects are loaded or loading is finished
      console.log("ExpensesPage: Calling fetchExpenses because currentUser is present and projects loading is complete.");
      fetchExpenses();
    } else if (currentUser && isLoadingProjects) {
      console.log("ExpensesPage: useEffect for fetchExpenses - Still waiting for projects to load.");
    } else {
      console.log("ExpensesPage: Conditions not met to call fetchExpenses (currentUser missing or projects still loading).");
      if (!isLoadingProjects && !currentUser) { // If projects not loading and no user, clear expenses
        setAllExpenses([]);
        setIsLoadingExpenses(false);
      }
    }
  }, [currentUser, projects, isLoadingProjects, fetchExpenses]); // Added projects and fetchExpenses to dependencies


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
        (expense.category && expense.category.toLowerCase().includes(lowerCaseSearch)) ||
        expense.amount.toString().includes(lowerCaseSearch)
      );
    }
    return expensesToFilter.sort((a, b) =>
      (b.createdAt?.toMillis() || b.expenseDate?.toMillis() || 0) -
      (a.createdAt?.toMillis() || a.expenseDate?.toMillis() || 0)
    );
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
        
        const expenseAmountToSubtract = expenseToDelete.amountEUR ?? expenseToDelete.amount; // Prioritize amountEUR
        const newTotalExpenses = (projectData.totalExpenses || 0) - expenseAmountToSubtract;

        let updatedRecentExpenses = projectData.recentExpenses || [];
        updatedRecentExpenses = updatedRecentExpenses
          .filter((expSummary) => expSummary.id !== expenseToDelete.id)
          .sort((a, b) => b.date.toMillis() - a.date.toMillis()) // Re-sort in case order matters
          .slice(0, 5); // Keep only the latest 5

        transaction.delete(expenseRef);
        transaction.update(projectRef, {
          totalExpenses: newTotalExpenses < 0 ? 0 : newTotalExpenses,
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

  const handleEditExpense = (expenseId: string) => {
    router.push(`/expenses/${expenseId}/edit`);
  };


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


  console.log("ExpensesPage: Rendering. isLoadingExpenses:", isLoadingExpenses, "isLoadingProjects:", isLoadingProjects, "filteredExpenses.length:", filteredExpenses.length, "projects.length:", projects.length);


  if (authLoading || !currentUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Icons.loader className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-card px-6 shadow-sm">
        <Link href="/dashboard" className="text-xl font-bold text-sidebar-header-title-color flex items-center">
          <Icons.dollarSign className="mr-2 h-7 w-7" />
          <span>SharePot</span>
        </Link>
        <div className="flex flex-1 items-center justify-end gap-4">
          <Button variant="ghost" size="icon" className="rounded-full">
            <Icons.bell className="h-5 w-5" />
            <span className="sr-only">Notifications</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-9 w-9 cursor-pointer">
                <AvatarImagePrimitive
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
              <DropdownMenuItem onClick={handleLogout}>
                <Icons.logOut className="mr-2 h-4 w-4" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 flex-grow">
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
                    <TableHead>Catégorie</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingExpenses && (projects.length > 0 || isLoadingProjects) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-10 h-32">
                        <Icons.loader className="mx-auto h-8 w-8 animate-spin" />
                        Chargement des dépenses...
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoadingExpenses && filteredExpenses.map((expense) => {
                    console.log("Rendering expense in table:", JSON.stringify(expense, null, 2));
                    return (
                      <TableRow key={expense.id}>
                        <TableCell className="font-medium">{expense.title}</TableCell>
                        <TableCell className="text-muted-foreground">{expense.projectName}</TableCell>
                        <TableCell className="text-muted-foreground">{expense.paidByName}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDateFromTimestamp(expense.expenseDate)}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {expense.amount.toLocaleString('fr-FR', { style: 'currency', currency: expense.currency })}
                          {expense.currency !== 'EUR' && expense.amountEUR != null && (
                            <span className="block text-xs text-muted-foreground font-normal">
                              (env. {expense.amountEUR.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })})
                            </span>
                          )}
                           {expense.currency !== 'EUR' && expense.amountEUR == null && (
                            <span className="block text-xs text-muted-foreground font-normal">
                              (env. N/A)
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {expense.category && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0.5">{expense.category}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="mr-1 h-8 w-8" onClick={() => handleEditExpense(expense.id)}>
                            <Icons.edit className="h-4 w-4" />
                            <span className="sr-only">Modifier</span>
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90 h-8 w-8" onClick={() => openDeleteConfirmDialog(expense)}>
                            <Icons.trash className="h-4 w-4" />
                            <span className="sr-only">Supprimer</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {(!isLoadingExpenses || (!isLoadingProjects && projects.length === 0)) && filteredExpenses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-10 h-32">
                        {!isLoadingProjects && projects.length === 0 ? "Aucun projet trouvé pour cet utilisateur. Ajoutez ou rejoignez un projet pour voir des dépenses." : "Aucune dépense trouvée pour les filtres actuels."}
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
    </div>
  );
}
