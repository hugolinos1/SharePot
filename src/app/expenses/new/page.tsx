
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
import { Textarea } from '@/components/ui/textarea';
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
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, serverTimestamp, doc, updateDoc, arrayUnion, runTransaction, getDoc, query, where } from 'firebase/firestore';
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
  receipt: z.any().optional(), 
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export default function NewExpensePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, userProfile, loading: authLoading } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
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
      });
    }
  }, [currentUser, form]);


  const fetchProjects = useCallback(async () => {
    if (!currentUser) return;
    setIsLoadingProjects(true);
    try {
      const projectsCollection = collection(db, "projects");
      // Fetch projects where the current user is a member
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
        setUsersForDropdown(userProfile ? [userProfile] : []);
        if (currentUser && !form.getValues('paidById')) { // Ensure paidById is set if not already
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
            // Fetch profiles for each member UID
            const userPromises = memberUIDs.map(uid => getDoc(doc(db, "users", uid)));
            const userDocs = await Promise.all(userPromises);
            fetchedProjectMembers = userDocs
              .filter(d => d.exists())
              .map(d => ({ id: d.id, ...d.data() } as AppUserType));
          }
        } else {
          toast({ title: "Erreur", description: "Projet non trouvé pour charger les membres payeurs.", variant: "destructive" });
        }
        
        let finalUsersList: AppUserType[] = [];
        if (userProfile) { // Prioritize current user's profile
            finalUsersList = [userProfile, ...fetchedProjectMembers.filter(member => member.id !== userProfile.id)];
        } else if (currentUser) { // Fallback if profile is not yet loaded
            const currentAuthUserAsProfile: AppUserType = {id: currentUser.uid, name: currentUser.displayName || currentUser.email || "Utilisateur Actuel", email: currentUser.email || "", isAdmin: false, avatarUrl: currentUser.photoURL || ''};
            finalUsersList = [currentAuthUserAsProfile, ...fetchedProjectMembers.filter(member => member.id !== currentUser.uid)];
        } else {
            finalUsersList = fetchedProjectMembers;
        }
        
        // Remove duplicates by ID, keeping the first occurrence (which might be the prioritized current user)
        finalUsersList = finalUsersList.filter((user, index, self) => index === self.findIndex(u => u.id === user.id));
        setUsersForDropdown(finalUsersList);

        // If paidById is not set or not in the new list, default to current user if they are in the list
        const currentPaidById = form.getValues('paidById');
        const currentUserIsMember = finalUsersList.some(u => u.id === currentUser.uid);

        if (!currentPaidById || !finalUsersList.some(u => u.id === currentPaidById)) {
            if (currentUserIsMember) {
                form.setValue('paidById', currentUser.uid);
            } else if (finalUsersList.length > 0 && finalUsersList[0]) {
                form.setValue('paidById', finalUsersList[0].id);
            } else {
                 form.setValue('paidById', ''); // No valid payer
            }
        }

      } catch (error) {
        console.error("Erreur lors de la récupération des membres du projet pour la liste 'Payé par': ", error);
        toast({
          title: "Erreur de chargement",
          description: "Impossible de charger les membres du projet pour la sélection du payeur.",
          variant: "destructive",
        });
        // Fallback to current user if profile exists
        setUsersForDropdown(userProfile ? [userProfile] : []);
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
      // No project selected, default to current user if available for "Paid by"
      setUsersForDropdown(userProfile ? [userProfile] : []);
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


    if (!currentUser || !userProfile) { // userProfile also needed for creator info consistency
        toast({ title: "Utilisateur non connecté ou profil incomplet", description: "Veuillez vous connecter et vous assurer que votre profil est chargé.", variant: "destructive" });
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    
    const selectedProject = projects.find(p => p.id === values.projectId);
    // Find the payer's profile from the dropdown list using the UID stored in values.paidById
    const payerProfile = usersForDropdown.find(u => u.id === values.paidById);

    console.log("[NewExpensePage onSubmit] Selected Project:", selectedProject);
    console.log("[NewExpensePage onSubmit] Found Payer Profile (from usersForDropdown):", payerProfile);


    if (!selectedProject) {
        toast({ title: "Erreur de données", description: "Projet introuvable.", variant: "destructive" });
        setIsLoading(false);
        return;
    }
    if (!payerProfile) {
        toast({ title: "Erreur de données", description: `Payeur introuvable (ID: ${values.paidById}) dans la liste chargée. Vérifiez les logs pour le contenu de usersForDropdown.`, variant: "destructive" });
        setIsLoading(false);
        return;
    }

    try {
      const newExpenseDocData = {
        title: values.description,
        amount: values.amount,
        currency: values.currency,
        projectId: values.projectId,
        projectName: selectedProject.name, 
        paidById: payerProfile.id, // UID of the person who paid
        paidByName: payerProfile.name, // Name of the person who paid (denormalized)
        expenseDate: Timestamp.fromDate(values.expenseDate),
        tags: values.tags?.split(',').map(tag => tag.trim()).filter(tag => tag) || [],
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid, // UID of the user creating the expense entry (e.g., the admin)
        // creatorName: userProfile.name, // Optional: Name of the user creating the expense (denormalized)
      };

      console.log("[NewExpensePage onSubmit] Data to be saved to Firestore:", newExpenseDocData);

      const expenseDocRef = await addDoc(collection(db, "expenses"), newExpenseDocData);

      const projectRef = doc(db, "projects", selectedProject.id);
      await runTransaction(db, async (transaction) => {
        const projectDoc = await transaction.get(projectRef);
        if (!projectDoc.exists()) {
          throw "Project document does not exist!";
        }
        const currentTotalExpenses = projectDoc.data().totalExpenses || 0;
        // Ensure amount is a number before adding
        const expenseAmount = typeof values.amount === 'number' ? values.amount : parseFloat(values.amount as any);
        if (isNaN(expenseAmount)) {
            throw "Invalid expense amount for project total calculation.";
        }
        const newTotalExpenses = currentTotalExpenses + expenseAmount;
        
        const recentExpenseSummary = {
          id: expenseDocRef.id, 
          name: values.description, // Title of the expense
          date: Timestamp.fromDate(values.expenseDate), // Expense date as Timestamp
          amount: expenseAmount,
          payer: payerProfile.name, // Name of the actual payer
        };

        transaction.update(projectRef, {
          totalExpenses: newTotalExpenses,
          recentExpenses: arrayUnion(recentExpenseSummary), 
          lastActivity: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      toast({
        title: "Dépense ajoutée",
        description: `La dépense "${values.description}" a été enregistrée avec succès.`,
      });
      form.reset({ // Reset form to default values
         description: '',
         amount: '' as unknown as number, // Reset amount to empty string
         currency: 'EUR',
         projectId: '',
         paidById: currentUser.uid || '', // Default to current user after reset
         expenseDate: new Date(),
         tags: '',
         receipt: null
      }); 
      setUsersForDropdown(userProfile ? [userProfile] : []); // Reset dropdown to current user only
      router.push('/expenses'); 
    } catch (error: any) {
        console.error("Erreur lors de l'ajout de la dépense: ", error);
        toast({
            title: "Erreur d'enregistrement",
            description: `Impossible d'enregistrer la dépense: ${error.message || "Veuillez réessayer."}`,
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
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
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Justificatif (optionnel)</FormLabel>
                    <FormControl>
                      <Input 
                        type="file" 
                        onChange={(e) => field.onChange(e.target.files ? e.target.files[0] : null)} 
                        className="pt-2"
                        data-ai-hint="receipt file upload"
                      />
                    </FormControl>
                     <FormDescription>
                      Le téléchargement de fichiers n'est pas encore implémenté pour le stockage.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
                  Annuler
                </Button>
                <Button type="submit" disabled={isLoading || isLoadingProjects || isLoadingUsersForDropdown}>
                  {isLoading ? (
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

