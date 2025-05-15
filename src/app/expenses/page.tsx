
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import type { Project } from '@/data/mock-data';
import { db, storage } from '@/lib/firebase'; // Import storage
import { collection, getDocs, query, where, Timestamp, deleteDoc, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { ref, deleteObject } from "firebase/storage"; // Import for deleting from storage
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';

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
  receiptUrl?: string | null; // Can be null
  receiptStoragePath?: string | null; // Store the full path in Storage
  createdAt?: Timestamp;
  createdBy: string;
  updatedAt?: Timestamp; // Added for edit page
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

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);


  const fetchProjects = useCallback(async () => {
    if (!currentUser) {
      setProjects([]);
      setIsLoadingProjects(false);
      return;
    }
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
      console.log("ExpensesPage: Fetched projectsList:", projectsList.length, "items:", JSON.stringify(projectsList.map(p => p.id)));
    } catch (error) {
      console.error("Erreur lors de la récupération des projets: ", error);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger les projets pour le filtre.",
        variant: "destructive",
      });
      setProjects([]);
    } finally {
      setIsLoadingProjects(false);
    }
  }, [currentUser, toast]);

  const fetchExpenses = useCallback(async () => {
    if(!currentUser) {
        console.log("ExpensesPage: fetchExpenses - No currentUser, returning.");
        setAllExpenses([]);
        setIsLoadingExpenses(false);
        return;
    }
    setIsLoadingExpenses(true);
    console.log("ExpensesPage: fetchExpenses - Called. projects.length:", projects.length, "isLoadingProjects:", isLoadingProjects);
    try {
      const expensesCollectionRef = collection(db, "expenses");

      if (projects.length > 0) {
        const projectIds = projects.map(p => p.id);
        console.log("ExpensesPage: fetchExpenses - projectIds to query:", projectIds);

        if (projectIds.length > 0) {
          let expensesList: ExpenseItem[] = [];
          const chunkSize = 30;
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
            console.log("ExpensesPage: fetchExpenses - Fetched expensesList:", expensesList.length, "items:", JSON.stringify(expensesList.map(e=>({id: e.id, title: e.title}))));
            setAllExpenses(expensesList);
        } else {
            console.log("ExpensesPage: fetchExpenses - projectIds array is empty after map, setting empty expenses.");
            setAllExpenses([]);
        }
      } else {
         console.log("ExpensesPage: fetchExpenses - No projects available for current user, setting empty expenses.");
         setAllExpenses([]);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des dépenses: ", error);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger la liste des dépenses.",
        variant: "destructive",
      });
      setAllExpenses([]);
    } finally {
      setIsLoadingExpenses(false);
      console.log("ExpensesPage: fetchExpenses - Finished. isLoadingExpenses set to false.");
    }
  }, [currentUser, projects, toast, isLoadingProjects]); 

  useEffect(() => {
    if (currentUser) {
      console.log("ExpensesPage: useEffect for fetchProjects - currentUser detected, calling fetchProjects.");
      fetchProjects();
    } else {
      console.log("ExpensesPage: useEffect for fetchProjects - No currentUser, clearing projects and expenses.");
      setProjects([]);
      setAllExpenses([]);
      setIsLoadingProjects(true); 
      setIsLoadingExpenses(true);
    }
  }, [currentUser, fetchProjects]);

  useEffect(() => {
    console.log("ExpensesPage: useEffect for fetchExpenses triggered. currentUser:", !!currentUser, "projects.length:", projects.length, "isLoadingProjects:", isLoadingProjects);
    if (currentUser && !isLoadingProjects) {
      if (projects.length > 0) {
        console.log("ExpensesPage: Calling fetchExpenses because currentUser, projects loaded, and projects exist.");
        fetchExpenses();
      } else {
        console.log("ExpensesPage: Setting allExpenses to empty and isLoadingExpenses to false because no projects found for user after loading.");
        setAllExpenses([]);
        setIsLoadingExpenses(false);
      }
    } else if (currentUser && isLoadingProjects) {
        console.log("ExpensesPage: useEffect for fetchExpenses - Waiting for projects to load.");
    } else {
        console.log("ExpensesPage: Conditions not met to call fetchExpenses (currentUser missing or projects still loading).");
        if (!isLoadingProjects) {
            setAllExpenses([]);
            setIsLoadingExpenses(false);
        }
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

      // Delete receipt from Storage if path exists
      if (expenseToDelete.receiptStoragePath) {
        try {
          const receiptFileRef = ref(storage, expenseToDelete.receiptStoragePath);
          await deleteObject(receiptFileRef);
          console.log("Justificatif supprimé de Firebase Storage.");
        } catch (storageError: any) {
          console.warn("Erreur lors de la suppression du justificatif de Storage: ", storageError.code, storageError.message);
          // Continue with Firestore deletion even if storage deletion fails
        }
      }

      await runTransaction(db, async (transaction) => {
        const projectDoc = await transaction.get(projectRef);
        if (!projectDoc.exists()) {
          throw new Error("Projet associé non trouvé.");
        }
        const projectData = projectDoc.data() as Project;
        const newTotalExpenses = (projectData.totalExpenses || 0) - expenseToDelete.amount;

        const updatedRecentExpenses = (projectData.recentExpenses || []).filter(
          (expSummary) => expSummary.id !== expenseToDelete.id
        ).sort((a,b) => b.date.toMillis() - a.date.toMillis()).slice(0,5); // Sort and keep last 5

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

  const openReceiptModal = (receiptUrl: string) => {
    setSelectedReceiptUrl(receiptUrl);
    setIsReceiptModalOpen(true);
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
                  <TableHead>Justificatif</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingExpenses && (projects.length > 0 || isLoadingProjects) && ( 
                    <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-10 h-32">
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
                    <TableCell>
                      {expense.receiptUrl ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => openReceiptModal(expense.receiptUrl!)}
                          aria-label="Voir le justificatif"
                        >
                          <Image
                            src={expense.receiptUrl}
                            alt={`Justificatif pour ${expense.title}`}
                            width={24}
                            height={24}
                            className="object-cover rounded-sm"
                            data-ai-hint="receipt thumbnail"
                          />
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Aucun</span>
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
                ))}
                {(!isLoadingExpenses || (!isLoadingProjects && projects.length === 0)) && filteredExpenses.length === 0 && ( 
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-10 h-32">
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

      <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
        <DialogContent className="sm:max-w-xl md:max-w-2xl lg:max-w-4xl p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Visualisation du Justificatif</DialogTitle>
          </DialogHeader>
          <div className="p-4 max-h-[80vh] overflow-y-auto">
            {selectedReceiptUrl ? (
              <Image
                src={selectedReceiptUrl}
                alt="Justificatif en taille réelle"
                width={1200} 
                height={1600}
                className="w-full h-auto object-contain rounded-md"
                data-ai-hint="full receipt image"
              />
            ) : (
              <p className="text-muted-foreground text-center py-10">Aucun justificatif à afficher.</p>
            )}
          </div>
          <DialogClose asChild>
            <Button variant="outline" className="m-4 mt-0">Fermer</Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </div>
  );
}
