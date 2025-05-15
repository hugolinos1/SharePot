
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Timestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Firebase Storage

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
import { db, storage } from '@/lib/firebase'; // Import storage
import { collection, getDocs, addDoc, serverTimestamp, doc, updateDoc, runTransaction, getDoc, query, where } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import type { User as AppUserType } from '@/data/mock-data';


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
  receipt: z.instanceof(File).optional().nullable(),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export default function NewExpensePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, userProfile, loading: authLoading } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  const [usersForDropdown, setUsersForDropdown] = useState<AppUserType[]>([]);
  const [isLoadingUsersForDropdown, setIsLoadingUsersForDropdown] = useState(false);

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
        amount: form.getValues('amount') || ('' as unknown as number),
        description: form.getValues('description') || '',
        currency: form.getValues('currency') || 'EUR',
        projectId: form.getValues('projectId') || '',
        expenseDate: form.getValues('expenseDate') || new Date(),
        tags: form.getValues('tags') || '',
        receipt: form.getValues('receipt') || null,
      });
    }
  }, [currentUser, form, authLoading]);


  const fetchProjects = useCallback(async () => {
    if (!currentUser) return;
    setIsLoadingProjects(true);
    try {
      const projectsCollection = collection(db, "projects");
      const q = query(projectsCollection, where("members", "array-contains", currentUser.uid));
      const projectSnapshot = await getDocs(q);
      const projectsList = projectSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Project));
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
      if (!currentUser || !projectId) {
        setUsersForDropdown(userProfile ? [userProfile] : (currentUser ? [{id: currentUser.uid, name: currentUser.displayName || currentUser.email || "Utilisateur Actuel", email: currentUser.email || "", isAdmin: false, avatarUrl: currentUser.photoURL || ''}] : []));
        if (currentUser && !form.getValues('paidById')) {
            form.setValue('paidById', currentUser.uid);
        }
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
         // Ensure current user is in the list if they are a member of the project
        if (currentUser && fetchedProjectMembers.some(m => m.id === currentUser.uid) && !uniqueMemberMap.has(currentUser.uid)) {
            const currentUserProfileForDropdown = userProfile || { id: currentUser.uid, name: currentUser.displayName || currentUser.email || "Utilisateur Actuel", email: currentUser.email || "", isAdmin: false, avatarUrl: currentUser.photoURL || '' };
            uniqueMemberMap.set(currentUser.uid, currentUserProfileForDropdown);
        } else if (currentUser && !fetchedProjectMembers.some(m => m.id === currentUser.uid) && userProfile && projectId) {
            // if current user is not in fetched members, but a project is selected (and they should be a member if they can select it)
            // add them. This might happen if userProfile is loaded but project.members hasn't updated in cache yet.
            // This is more of a fallback.
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
            } else {
                 form.setValue('paidById', currentUser?.uid || ''); 
            }
        }

      } catch (error) {
        console.error("Erreur lors de la récupération des membres du projet pour la liste 'Payé par': ", error);
        toast({
          title: "Erreur de chargement",
          description: "Impossible de charger les membres du projet pour la sélection du payeur.",
          variant: "destructive",
        });
        setUsersForDropdown(userProfile ? [userProfile] : (currentUser ? [{id: currentUser.uid, name: currentUser.displayName || currentUser.email || "Utilisateur Actuel", email: currentUser.email || "", isAdmin: false, avatarUrl: currentUser.photoURL || ''}] : []));
         if (currentUser && !form.getValues('paidById')) {
            form.setValue('paidById', currentUser.uid);
        }
      } finally {
        setIsLoadingUsersForDropdown(false);
      }
    };

    if (watchedProjectId) {
      fetchProjectMembersAndSetDropdown(watchedProjectId);
    } else {
      setUsersForDropdown(userProfile ? [userProfile] : (currentUser ? [{id: currentUser.uid, name: currentUser.displayName || currentUser.email || "Utilisateur Actuel", email: currentUser.email || "", isAdmin: false, avatarUrl: currentUser.photoURL || ''}] : []));
       if (currentUser && !form.getValues('paidById')) {
         form.setValue('paidById', currentUser.uid);
      }
    }
  }, [watchedProjectId, currentUser, userProfile, toast, form]);


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
        toast({ title: "Erreur de données", description: `Payeur introuvable (ID: ${values.paidById}). Assurez-vous que le payeur est membre du projet.`, variant: "destructive" });
        setIsSubmitting(false);
        return;
    }

    let receiptDownloadUrl: string | null = null;
    const expenseCollectionRef = collection(db, "expenses");
    const newExpenseRef = doc(expenseCollectionRef); // Generate a new ID for the expense

    if (values.receipt) {
      console.log("[NewExpensePage onSubmit] Receipt file selected:", values.receipt.name);
      const fileName = `${Date.now()}-${values.receipt.name}`;
      const storageRef = ref(storage, `receipts/${selectedProject.id}/${newExpenseRef.id}/${fileName}`);
      try {
        const uploadTask = await uploadBytes(storageRef, values.receipt);
        receiptDownloadUrl = await getDownloadURL(uploadTask.ref);
        console.log("[NewExpensePage onSubmit] Receipt uploaded. URL:", receiptDownloadUrl);
      } catch (uploadError) {
        console.error("Erreur lors du téléversement du justificatif: ", uploadError);
        toast({
          title: "Erreur de téléversement",
          description: "Impossible de sauvegarder le justificatif. La dépense sera créée sans.",
          variant: "destructive",
        });
      }
    } else {
      console.log("[NewExpensePage onSubmit] No receipt file selected.");
    }


    try {
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
        receiptUrl: receiptDownloadUrl, // Use the URL from storage or null
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
      };

      console.log("[NewExpensePage onSubmit] Data to be saved to Firestore:", newExpenseDocData);

      await runTransaction(db, async (transaction) => {
        const projectRef = doc(db, "projects", selectedProject.id);
        const projectDoc = await transaction.get(projectRef);
        if (!projectDoc.exists()) {
          throw "Project document does not exist!";
        }
        const projectData = projectDoc.data() as Project;

        const currentTotalExpenses = projectData.totalExpenses || 0;
        const expenseAmount = typeof values.amount === 'number' ? values.amount : parseFloat(values.amount as any);
        if (isNaN(expenseAmount)) {
            throw "Invalid expense amount for project total calculation.";
        }
        const newTotalExpenses = currentTotalExpenses + expenseAmount;

        const recentExpenseSummary = {
          id: newExpenseRef.id, 
          name: values.description,
          date: Timestamp.fromDate(values.expenseDate),
          amount: expenseAmount,
          payer: payerProfile.name || payerProfile.email || "Nom Inconnu",
        };
        
        const updatedRecentExpenses = [...(projectData.recentExpenses || []), recentExpenseSummary].slice(-5); // Keep only last 5


        const projectUpdateData: Partial<Project> = {
            totalExpenses: newTotalExpenses,
            recentExpenses: updatedRecentExpenses,
            lastActivity: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };
        
        transaction.set(newExpenseRef, newExpenseDocData);
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
         receipt: null
      });
      setUsersForDropdown(userProfile ? [userProfile] : (currentUser ? [{id: currentUser.uid, name: currentUser.displayName || currentUser.email || "Utilisateur Actuel", email: currentUser.email || "", isAdmin: false, avatarUrl: currentUser.photoURL || ''}] : []));
      router.push('/expenses');
    } catch (error: any) {
        console.error("Erreur lors de l'ajout de la dépense: ", error);
        toast({
            title: "Erreur d'enregistrement",
            description: `Impossible d'enregistrer la dépense: ${error.message || "Veuillez réessayer."}`,
            variant: "destructive",
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  if (authLoading || !currentUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Icons.loader className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
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
          <CardDescription>
            Remplissez les informations ci-dessous pour ajouter une dépense.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <Select onValueChange={field.onChange} value={field.value || ''} disabled={isLoadingProjects}>
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
                            {user.name} {user.id === currentUser?.uid ? "(Moi)" : ""}
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
                render={({ field: { onChange, value, ...rest } }) => ( 
                  <FormItem>
                    <FormLabel>Justificatif (optionnel)</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept="image/*" 
                        onChange={(e) => onChange(e.target.files ? e.target.files[0] : null)}
                        className="pt-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                        data-ai-hint="receipt file upload"
                        {...rest} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                  Annuler
                </Button>
                <Button type="submit" disabled={isSubmitting || isLoadingProjects || isLoadingUsersForDropdown}>
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
  );
}

