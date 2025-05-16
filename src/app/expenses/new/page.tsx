
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Timestamp, doc, getDoc, serverTimestamp, addDoc, collection, query, where, getDocs, runTransaction } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { useToast } from "@/hooks/use-toast";
import type { Project } from '@/data/mock-data';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from '@/contexts/AuthContext';
import type { User as AppUserType } from '@/data/mock-data';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


const currencies = ["EUR", "USD", "GBP", "CZK"];

const expenseFormSchema = z.object({
  description: z.string().min(3, { message: "La description doit comporter au moins 3 caractères." }).max(100, { message: "La description ne doit pas dépasser 100 caractères." }),
  amount: z.coerce.number().positive({ message: "Le montant doit être un nombre positif." }),
  currency: z.string().min(1, { message: "Veuillez sélectionner une devise."}).default("EUR"),
  projectId: z.string().min(1, { message: "Veuillez sélectionner un projet." }),
  paidById: z.string().min(1, { message: "Veuillez sélectionner qui a payé." }),
  expenseDate: z.date({
    required_error: "Veuillez sélectionner une date.",
  }),
  tags: z.string().optional(),
  invoiceForAnalysis: z.instanceof(File).optional().nullable(),
  receipt: z.instanceof(File).optional().nullable(), 
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

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


export default function NewExpensePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, userProfile, loading: authLoading, logout } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  const [usersForDropdown, setUsersForDropdown] = useState<AppUserType[]>([]);
  const [isLoadingUsersForDropdown, setIsLoadingUsersForDropdown] = useState(false);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      description: '',
      amount: '' as unknown as number, 
      currency: 'EUR',
      projectId: '', 
      paidById: '',
      expenseDate: new Date(),
      tags: '',
      invoiceForAnalysis: null,
      receipt: null,
    },
  });

  const watchedProjectId = form.watch('projectId');

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.replace('/login');
    }
  }, [authLoading, currentUser, router]);


  useEffect(() => {
    if (currentUser && !form.getValues('paidById')) {
      form.reset({
        ...form.getValues(),
        paidById: currentUser.uid,
        amount: form.getValues('amount') || '' as unknown as number,
        description: form.getValues('description') || '',
        currency: form.getValues('currency') || 'EUR',
        projectId: form.getValues('projectId') || '', 
        expenseDate: form.getValues('expenseDate') || new Date(),
        tags: form.getValues('tags') || '',
        invoiceForAnalysis: null,
        receipt: null,
      });
    }
  }, [currentUser, form, authLoading]);


  const fetchProjects = useCallback(async () => {
    if (!currentUser) return;
    setIsLoadingProjects(true);
    try {
      const projectsCollection = collection(db, "projects");
      const memberQuery = query(projectsCollection, where("members", "array-contains", currentUser.uid));
      const ownerQuery = query(projectsCollection, where("ownerId", "==", currentUser.uid));

      const [memberSnapshot, ownerSnapshot] = await Promise.all([
        getDocs(memberQuery),
        getDocs(ownerQuery)
      ]);
      
      const projectsMap = new Map<string, Project>();
      memberSnapshot.docs.forEach(docSnap => projectsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as Project));
      ownerSnapshot.docs.forEach(docSnap => projectsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as Project));
      
      const projectsList = Array.from(projectsMap.values());
      setProjects(projectsList);

    } catch (error) {
      console.error("Erreur lors de la récupération des projets: ", error);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger la liste des projets.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingProjects(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    if(currentUser){
      fetchProjects();
    }
  }, [currentUser, fetchProjects]);

  useEffect(() => {
    const fetchProjectMembersAndSetDropdown = async (projectId: string) => {
      console.log(`[NewExpensePage useEffect paidById] Watched projectId: ${projectId}. CurrentUser: ${!!currentUser}, UserProfile: ${!!userProfile}`);
      if (!currentUser || !projectId) {
        const defaultUserArray = userProfile ? [userProfile] : (currentUser ? [{id: currentUser.uid, name: currentUser.displayName || currentUser.email || "Utilisateur Actuel", email: currentUser.email || "", isAdmin: false, avatarUrl: currentUser.photoURL || ''}] : []);
        setUsersForDropdown(defaultUserArray);
        if (currentUser && defaultUserArray.length > 0 && defaultUserArray[0] && !form.getValues('paidById')) {
             form.setValue('paidById', currentUser.uid);
        }
        setIsLoadingUsersForDropdown(false);
        return;
      }
      setIsLoadingUsersForDropdown(true);
      try {
        const projectRef = doc(db, "projects", projectId);
        const projectSnap = await getDoc(projectRef);

        let fetchedProjectMembers: AppUserType[] = [];
        if (projectSnap.exists()) {
          const projectData = projectSnap.data() as Project;
          const memberUIDs = projectData.members || [];

          if (memberUIDs.length > 0) {
            const userPromises = memberUIDs.map(uid => getDoc(doc(db, "users", uid)));
            const userDocs = await Promise.all(userPromises);
            fetchedProjectMembers = userDocs
              .filter(d => d.exists())
              .map(d => ({ id: d.id, ...d.data() } as AppUserType));
          }
        } else {
          toast({ title: "Erreur", description: "Projet non trouvé pour charger les membres payeurs.", variant: "destructive" });
        }

        const uniqueMemberMap = new Map<string, AppUserType>();
        fetchedProjectMembers.forEach(member => {
            if(!uniqueMemberMap.has(member.id)) {
                uniqueMemberMap.set(member.id, member);
            }
        });
        if (currentUser && userProfile && !uniqueMemberMap.has(currentUser.uid) && fetchedProjectMembers.some(m => m.id === currentUser.uid)) {
            uniqueMemberMap.set(currentUser.uid, userProfile);
        } else if (currentUser && userProfile && !uniqueMemberMap.has(currentUser.uid) && fetchedProjectMembers.length === 0) {
             uniqueMemberMap.set(currentUser.uid, userProfile);
        }

        const finalUsersList = Array.from(uniqueMemberMap.values());
        setUsersForDropdown(finalUsersList);

        const currentPaidById = form.getValues('paidById');
        const currentUserIsAmongFetched = finalUsersList.some(u => u.id === currentUser?.uid);

        if (!currentPaidById || !finalUsersList.some(u => u.id === currentPaidById)) {
            if (currentUserIsAmongFetched && currentUser) {
                form.setValue('paidById', currentUser.uid);
            } else if (finalUsersList.length > 0 && finalUsersList[0]) {
                form.setValue('paidById', finalUsersList[0].id);
            } else if (currentUser) {
                 form.setValue('paidById', currentUser.uid);
            } else {
                form.setValue('paidById', '');
            }
        }

      } catch (error) {
        console.error("[NewExpensePage useEffect paidById] Erreur lors de la récupération des membres du projet pour la liste 'Payé par': ", error);
        toast({
          title: "Erreur de chargement",
          description: "Impossible de charger les membres du projet pour la sélection du payeur.",
          variant: "destructive",
        });
        const defaultUserOnError = userProfile ? [userProfile] : (currentUser ? [{id: currentUser.uid, name: currentUser.displayName || currentUser.email || "Utilisateur Actuel", email: currentUser.email || "", isAdmin: false, avatarUrl: currentUser.photoURL || ''}] : []);
        setUsersForDropdown(defaultUserOnError);
         if (currentUser && defaultUserOnError.length > 0 && defaultUserOnError[0] && !form.getValues('paidById')) {
            form.setValue('paidById', currentUser.uid);
        }
      } finally {
        setIsLoadingUsersForDropdown(false);
      }
    };

    if (watchedProjectId) {
      fetchProjectMembersAndSetDropdown(watchedProjectId);
    } else {
      const defaultUserArray = userProfile ? [userProfile] : (currentUser ? [{id: currentUser.uid, name: currentUser.displayName || currentUser.email || "Utilisateur Actuel", email: currentUser.email || "", isAdmin: false, avatarUrl: currentUser.photoURL || ''}] : []);
      setUsersForDropdown(defaultUserArray);
      if (currentUser && defaultUserArray.length > 0 && defaultUserArray[0] && !form.getValues('paidById')) {
         form.setValue('paidById', currentUser.uid);
      }
      setIsLoadingUsersForDropdown(false);
    }
  }, [watchedProjectId, currentUser, userProfile, toast, form]);


  const handleAnalyzeInvoice = async () => {
    if (!invoiceFile) {
      toast({ title: "Aucun fichier", description: "Veuillez sélectionner un fichier de facture à analyser.", variant: "destructive" });
      return;
    }
    setIsAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(invoiceFile);
      reader.onloadend = async () => {
        const base64Image = reader.result as string;
        const fileType = invoiceFile.type;

        const response = await fetch('/api/extract-invoice-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64Image, fileType }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || errorData.message || `Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();

        form.setValue('description', data.nom_fournisseur || data.nom_client || "Facture analysée");

        let amountValue = 0;
        let currencyValue = "EUR";

        if (data.montant_total_ttc) {
            if (typeof data.montant_total_ttc === 'number') {
                amountValue = data.montant_total_ttc;
            } else if (typeof data.montant_total_ttc === 'string') {
                const amountString = data.montant_total_ttc.replace(',', '.');
                const numericMatch = amountString.match(/[\d.]+/);
                if (numericMatch && numericMatch[0]) {
                    amountValue = parseFloat(numericMatch[0]);
                }

                const currencyMatch = amountString.match(/(EUR|USD|GBP|CZK)/i);
                if (currencyMatch && currencyMatch[0]) {
                    const foundCurrency = currencyMatch[0].toUpperCase();
                    if (currencies.includes(foundCurrency)) {
                        currencyValue = foundCurrency;
                    }
                }
            }
        }
        form.setValue('amount', amountValue);
        form.setValue('currency', currencyValue);


        if (data.date_facture) {
          try {
            const parsedDate = parseISO(data.date_facture);
            form.setValue('expenseDate', parsedDate);
          } catch (dateError) {
            console.error("Erreur de parsing de la date de la facture:", dateError);
            toast({ title: "Avertissement", description: "Format de date de facture non reconnu. Veuillez vérifier la date."});
          }
        }

        toast({ title: "Analyse réussie", description: "Les champs ont été pré-remplis." });
      };
      reader.onerror = () => {
        throw new Error("Erreur de lecture du fichier.");
      };
    } catch (error: any) {
      console.error("Erreur lors de l'analyse de la facture:", error);
      toast({ title: "Erreur d'analyse", description: error.message || "Impossible d'analyser la facture.", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };


  async function onSubmit(values: ExpenseFormValues) {
    console.log("[NewExpensePage onSubmit] Form values:", values);
    console.log("[NewExpensePage onSubmit] Current usersForDropdown state:", usersForDropdown);
    console.log("[NewExpensePage onSubmit] Current userProfile from context:", userProfile);
    console.log("[NewExpensePage onSubmit] Current currentUser from context:", currentUser);

    if (!currentUser || !userProfile) {
        toast({ title: "Utilisateur non connecté ou profil incomplet", description: "Veuillez vous connecter et vous assurer que votre profil est chargé.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }
    setIsSubmitting(true);

    const selectedProject = projects.find(p => p.id === values.projectId);
    const payerProfile = usersForDropdown.find(u => u.id === values.paidById);

    console.log("[NewExpensePage onSubmit] Selected Project:", selectedProject);
    console.log("[NewExpensePage onSubmit] Found Payer Profile (from usersForDropdown):", payerProfile);

    if (!selectedProject) {
        toast({ title: "Erreur de données", description: "Projet introuvable.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }
    if (!payerProfile) {
        toast({ title: "Erreur de données", description: `Payeur introuvable (ID: ${values.paidById}).`, variant: "destructive" });
        setIsSubmitting(false);
        return;
    }

    let receiptDownloadUrl: string | null = null;
    let receiptStoragePathForDb: string | null = null;
    
    const fileToUploadForReceipt = values.receipt || invoiceFile; 
    console.log("[NewExpensePage onSubmit] File chosen for receipt:", fileToUploadForReceipt ? fileToUploadForReceipt.name : "None");


    const newExpenseRef = doc(collection(db, "expenses")); 

    if (fileToUploadForReceipt && currentUser && selectedProject) {
      console.log(`[NewExpensePage onSubmit Attempting upload] User UID: ${currentUser.uid}, Project ID: ${selectedProject.id}, Expense ID (for path): ${newExpenseRef.id}, File: ${fileToUploadForReceipt.name}`);
      const storageRefPath = `receipts/${selectedProject.id}/${newExpenseRef.id}/${Date.now()}-${fileToUploadForReceipt.name}`;
      const fileRef = ref(storage, storageRefPath);
      try {
        await uploadBytes(fileRef, fileToUploadForReceipt);
        receiptDownloadUrl = await getDownloadURL(fileRef);
        receiptStoragePathForDb = storageRefPath;
        console.log("[NewExpensePage onSubmit] Receipt uploaded. URL:", receiptDownloadUrl, "Path:", receiptStoragePathForDb);
      } catch (uploadError: any) {
        console.error("Erreur lors du téléversement du justificatif:", uploadError);
        toast({
          title: "Erreur de téléversement du justificatif",
          description: `Le justificatif n'a pas pu être sauvegardé : ${uploadError.message}. La dépense sera créée sans justificatif.`,
          variant: "destructive",
          duration: 7000,
        });
      }
    } else {
      console.log("[NewExpensePage onSubmit] No receipt file to upload or missing user/project info for path.");
    }

    try {
      const projectRef = doc(db, "projects", selectedProject.id);
      
      await runTransaction(db, async (transaction) => {
        const projectDoc = await transaction.get(projectRef);
        if (!projectDoc.exists()) {
          throw new Error("Le projet associé n'existe plus.");
        }
        const projectData = projectDoc.data() as Project;

        const newExpenseDocData = {
            id: newExpenseRef.id,
            title: values.description,
            amount: values.amount,
            currency: values.currency,
            projectId: values.projectId,
            projectName: selectedProject.name,
            paidById: payerProfile.id,
            paidByName: payerProfile.name || payerProfile.email || "Nom Inconnu",
            expenseDate: Timestamp.fromDate(values.expenseDate),
            tags: values.tags?.split(',').map(tag => tag.trim()).filter(tag => tag) || [],
            createdAt: serverTimestamp(),
            createdBy: currentUser.uid,
            updatedAt: serverTimestamp(),
            receiptUrl: receiptDownloadUrl, 
            receiptStoragePath: receiptStoragePathForDb,
        };
        console.log("[NewExpensePage onSubmit] Data to be saved to Firestore:", newExpenseDocData);
        transaction.set(newExpenseRef, newExpenseDocData);
        
        const currentTotalExpenses = projectData.totalExpenses || 0;
        const expenseAmount = typeof values.amount === 'number' ? values.amount : parseFloat(values.amount as any);
        if (isNaN(expenseAmount)) {
            throw new Error("Montant de dépense invalide pour le calcul du total du projet.");
        }
        const newTotalExpenses = currentTotalExpenses + expenseAmount;

        const recentExpenseSummary = {
          id: newExpenseRef.id,
          name: values.description,
          date: Timestamp.fromDate(values.expenseDate),
          amount: expenseAmount,
          payer: payerProfile.name || payerProfile.email || "Nom Inconnu",
        };

        let updatedRecentExpenses = projectData.recentExpenses ? [...projectData.recentExpenses] : [];
        updatedRecentExpenses.unshift(recentExpenseSummary); // Add to the beginning
        updatedRecentExpenses.sort((a, b) => b.date.toMillis() - a.date.toMillis()); // Sort by date desc
        updatedRecentExpenses = updatedRecentExpenses.slice(0, 5); // Keep only the latest 5


        const projectUpdateData: Partial<Project> = {
            totalExpenses: newTotalExpenses,
            recentExpenses: updatedRecentExpenses,
            lastActivity: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        transaction.update(projectRef, projectUpdateData);
      });


      toast({
        title: "Dépense ajoutée",
        description: `La dépense "${values.description}" a été enregistrée avec succès.`,
      });
      form.reset({
         description: '',
         amount: '' as unknown as number,
         currency: 'EUR',
         projectId: '',
         paidById: currentUser?.uid || '',
         expenseDate: new Date(),
         tags: '',
         invoiceForAnalysis: null,
         receipt: null,
      });
      setInvoiceFile(null);
      const defaultUserArrayReset = userProfile ? [userProfile] : (currentUser ? [{id: currentUser.uid, name: currentUser.displayName || currentUser.email || "Utilisateur Actuel", email: currentUser.email || "", isAdmin: false, avatarUrl: currentUser.photoURL || ''}] : []);
      setUsersForDropdown(defaultUserArrayReset);
      if (currentUser && defaultUserArrayReset.length > 0 && defaultUserArrayReset[0]) {
        form.setValue('paidById', currentUser.uid);
      } else {
        form.setValue('paidById', '');
      }

      router.push('/expenses');
    } catch (error: any) {
        console.error("Erreur lors de l'ajout de la dépense (Firestore transaction): ", error);
        toast({
            title: "Erreur d'enregistrement Firestore",
            description: `Impossible d'enregistrer la dépense: ${error.message || "Veuillez réessayer."}`,
            variant: "destructive",
        });
    } finally {
        setIsSubmitting(false);
    }
  }

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
             <Icons.dollarSign className="mr-2 h-7 w-7"/>
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
                <AvatarImage
                  src={userProfile?.avatarUrl}
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
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Nouvelle Dépense</h1>
        <Link href="/expenses" passHref>
          <Button variant="outline">
            <Icons.arrowLeft className="mr-2 h-4 w-4" />
            Retour aux dépenses
          </Button>
        </Link>
      </div>

      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>Enregistrer une nouvelle dépense</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            <Card className="bg-muted/30 p-4">
                <CardHeader className="p-0 pb-3">
                    <CardTitle className="text-lg">Analyse de facture par IA (Optionnel)</CardTitle>
                    <CardDescription className="text-xs">
                        Chargez une image de votre facture pour pré-remplir certains champs.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <FormField
                        control={form.control}
                        name="invoiceForAnalysis"
                        render={({ field }) => {
                          const { value, onChange: rhfOnChange, ...restOfField } = field; 
                          return (
                            <FormItem>
                               <FormLabel>Fichier de facture pour analyse</FormLabel>
                                <FormControl>
                                <Input
                                    type="file"
                                    accept="image/png, image/jpeg, image/webp"
                                    onChange={(e) => {
                                        const file = e.target.files ? e.target.files[0] : null;
                                        rhfOnChange(file); 
                                        setInvoiceFile(file);
                                    }}
                                    className="pt-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                    data-ai-hint="invoice file upload for AI analysis"
                                    {...restOfField} 
                                />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                          );
                        }}
                    />
                    <Button
                        type="button"
                        onClick={handleAnalyzeInvoice}
                        disabled={!invoiceFile || isAnalyzing || isSubmitting}
                        className="mt-3 w-full"
                        variant="outline"
                    >
                        {isAnalyzing ? (
                            <>
                            <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
                            Analyse en cours...
                            </>
                        ) : (
                            <>
                            <Icons.scan className="mr-2 h-4 w-4" />
                            Analyser la facture
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            <Separator className="my-6" />


              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Dîner d'équipe" {...field} data-ai-hint="expense description"/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Montant</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0.00"
                          {...field}
                          step="0.01"
                          data-ai-hint="expense amount"
                          value={field.value === undefined || field.value === null || field.value === '' ? '' : Number(field.value)}
                          onChange={e => field.onChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Devise</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-ai-hint="currency select">
                            <SelectValue placeholder="Choisir une devise" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {currencies.map(currencyCode => (
                            <SelectItem key={currencyCode} value={currencyCode}>
                              {currencyCode}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Projet associé</FormLabel>
                    <Select
                        onValueChange={field.onChange}
                        value={field.value || ''}
                        disabled={isLoadingProjects} 
                    >
                      <FormControl>
                        <SelectTrigger data-ai-hint="project select">
                          <SelectValue placeholder={isLoadingProjects ? "Chargement des projets..." : "Sélectionner un projet"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projects.map(project => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                         {projects.length === 0 && !isLoadingProjects && (
                            <p className="p-2 text-sm text-muted-foreground">Aucun projet disponible. Créez-en un d'abord.</p>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paidById"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payé par</FormLabel>
                    <Select
                        onValueChange={field.onChange}
                        value={field.value || ''}
                        disabled={isLoadingUsersForDropdown || !watchedProjectId}
                    >
                      <FormControl>
                        <SelectTrigger data-ai-hint="user select paid by">
                          <SelectValue placeholder={
                            !watchedProjectId
                              ? "Sélectionnez d'abord un projet"
                              : isLoadingUsersForDropdown
                                ? "Chargement des membres..."
                                : usersForDropdown.length === 0
                                    ? "Aucun membre pour ce projet"
                                    : "Sélectionner un payeur"
                          } />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {usersForDropdown.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} {currentUser && user.id === currentUser.uid ? "(Moi)" : ""}
                          </SelectItem>
                        ))}
                         {usersForDropdown.length === 0 && watchedProjectId && !isLoadingUsersForDropdown && (
                            <p className="p-2 text-sm text-muted-foreground">Aucun membre pour ce projet ou chargement en cours.</p>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expenseDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date de la dépense</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                            data-ai-hint="date picker trigger"
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: fr })
                            ) : (
                              <span>Choisir une date</span>
                            )}
                            <Icons.calendar className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                          locale={fr}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags (optionnel)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: nourriture, transport (séparés par une virgule)" {...field} data-ai-hint="expense tags"/>
                    </FormControl>
                    <FormDescription>
                      Séparez les tags par une virgule.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="receipt"
                render={({ field }) => {
                  const { value, onChange: rhfOnChange, ...restOfField } = field; 
                  return (
                  <FormItem>
                    <FormLabel>Justificatif à enregistrer (optionnel)</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={(e) => rhfOnChange(e.target.files ? e.target.files[0] : null)}
                        className="pt-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                        data-ai-hint="receipt file upload"
                        {...restOfField} 
                      />
                    </FormControl>
                     <FormDescription>
                      Ce fichier sera stocké avec la dépense. Si aucun fichier n'est sélectionné ici, le fichier utilisé pour l'analyse IA (si fourni) sera utilisé comme justificatif.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                  );
                }}
              />


              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting || isAnalyzing}>
                  Annuler
                </Button>
                <Button type="submit" disabled={isSubmitting || isLoadingProjects || isLoadingUsersForDropdown || isAnalyzing}>
                  {isSubmitting ? (
                    <>
                      <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Icons.save className="mr-2 h-4 w-4" />
                      Enregistrer la dépense
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
    </div>
  );
}

