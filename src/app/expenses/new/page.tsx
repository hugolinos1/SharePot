
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
// import { Textarea } from '@/components/ui/textarea'; // No longer used for description, using Input
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
  receipt: z.instanceof(File).optional().nullable(), // Updated for single file
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
      amount: '' as unknown as number, // Keep as empty string for controlled input
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
        amount: form.getValues('amount') || ('' as unknown as number), // Ensure amount is reset correctly
        description: form.getValues('description') || '',
        currency: form.getValues('currency') || 'EUR',
        projectId: form.getValues('projectId') || '',
        expenseDate: form.getValues('expenseDate') || new Date(),
        tags: form.getValues('tags') || '',
        receipt: form.getValues('receipt') || null,
      });
    }
  }, [currentUser, form, authLoading]); // Added authLoading to dependencies


  const fetchProjects = useCallback(async () => {
    if (!currentUser) return;
    setIsLoadingProjects(true);
    try {
      const projectsCollection = collection(db, "projects");
      // Query projects where the current user is a member
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
        // If no project selected, default to current user if profile exists
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
        
        // Ensure unique members by ID and prioritize current user if present
        const uniqueMemberMap = new Map<string, AppUserType>();
        if (userProfile && fetchedProjectMembers.some(m => m.id === userProfile.id)) {
            uniqueMemberMap.set(userProfile.id, userProfile);
        } else if (userProfile) {
             // If current user not in fetched members (but should be if they created the project/are a member)
            // This case might indicate project.members array is not up-to-date or userProfile is out of sync
            // For safety, add current user if they have a profile
            // uniqueMemberMap.set(userProfile.id, userProfile);
        } else if (currentUser && !userProfile && fetchedProjectMembers.some(m => m.id === currentUser.uid)) {
            // If no full userProfile, but currentUser is a member, find their basic data
            const currentMemberData = fetchedProjectMembers.find(m => m.id === currentUser.uid);
            if(currentMemberData) uniqueMemberMap.set(currentUser.uid, currentMemberData);

        } else if (currentUser && !userProfile) {
            // Fallback: create a very basic profile for current user if no profile and not in fetched members
            // uniqueMemberMap.set(currentUser.uid, {id: currentUser.uid, name: currentUser.displayName || currentUser.email || "Utilisateur Actuel", email: currentUser.email || "", isAdmin: false, avatarUrl: currentUser.photoURL || ''});
        }


        fetchedProjectMembers.forEach(member => {
            if(!uniqueMemberMap.has(member.id)) {
                uniqueMemberMap.set(member.id, member);
            }
        });
        const finalUsersList = Array.from(uniqueMemberMap.values());
        setUsersForDropdown(finalUsersList);


        // Logic to set default paidById or validate existing one
        const currentPaidById = form.getValues('paidById');
        const currentUserIsAmongFetched = finalUsersList.some(u => u.id === currentUser?.uid);

        if (!currentPaidById || !finalUsersList.some(u => u.id === currentPaidById)) {
            if (currentUserIsAmongFetched && currentUser) {
                form.setValue('paidById', currentUser.uid);
            } else if (finalUsersList.length > 0 && finalUsersList[0]) {
                form.setValue('paidById', finalUsersList[0].id);
            } else {
                 form.setValue('paidById', ''); // Or handle empty list case
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
      // If no project is selected, clear users or set to current user only
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


    if (!currentUser || !userProfile) { // Ensure userProfile is also loaded for name
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

    let receiptDownloadUrl: string | undefined | null = undefined;
    if (values.receipt) {
      // TODO: Implement file upload to Firebase Storage
      // 1. Get a reference to Firebase Storage (import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";)
      // 2. Create a storage reference (e.g., `receipts/${currentUser.uid}/${selectedProject.id}/${values.receipt.name}`)
      // 3. Upload the file using `uploadBytes(storageRef, values.receipt)`
      // 4. Get the download URL using `getDownloadURL(uploadTask.snapshot.ref)`
      // 5. Assign it to `receiptDownloadUrl`
      console.warn("File upload to Firebase Storage not implemented. Receipt will not be saved.");
      toast({
        title: "Téléversement non implémenté",
        description: "Le justificatif n'a pas été sauvegardé car le téléversement vers Firebase Storage n'est pas encore implémenté.",
        variant: "default",
        duration: 7000,
      });
      // receiptDownloadUrl remains undefined as upload is not implemented
    }

    try {
      const newExpenseDocData = {
        title: values.description,
        amount: values.amount,
        currency: values.currency,
        projectId: values.projectId,
        projectName: selectedProject.name,
        paidById: payerProfile.id, // Use UID
        paidByName: payerProfile.name || payerProfile.email || "Nom Inconnu", // Use name from profile
        expenseDate: Timestamp.fromDate(values.expenseDate),
        tags: values.tags?.split(',').map(tag => tag.trim()).filter(tag => tag) || [],
        receiptUrl: receiptDownloadUrl === undefined ? null : receiptDownloadUrl, // Ensure null not undefined
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
      };

      console.log("[NewExpensePage onSubmit] Data to be saved to Firestore:", newExpenseDocData);

      // This will be the ID of the newly created expense document
      // const expenseDocRef = await addDoc(collection(db, "expenses"), newExpenseDocData);

      // Transaction to add expense and update project
      await runTransaction(db, async (transaction) => {
        // 1. Add the new expense document
        const expenseCollectionRef = collection(db, "expenses");
        const newExpenseRef = doc(expenseCollectionRef); // Create a new doc ref for expense
        transaction.set(newExpenseRef, newExpenseDocData);


        // 2. Update the project document
        const projectRef = doc(db, "projects", selectedProject.id);
        const projectDoc = await transaction.get(projectRef); // Get project doc within transaction
        if (!projectDoc.exists()) {
          throw "Project document does not exist!";
        }
        const currentTotalExpenses = projectDoc.data().totalExpenses || 0;
        const expenseAmount = typeof values.amount === 'number' ? values.amount : parseFloat(values.amount as any);
        if (isNaN(expenseAmount)) {
            throw "Invalid expense amount for project total calculation.";
        }
        const newTotalExpenses = currentTotalExpenses + expenseAmount;

        const recentExpenseSummary = {
          id: newExpenseRef.id, // Use the ID of the new expense document
          name: values.description,
          date: Timestamp.fromDate(values.expenseDate),
          amount: expenseAmount,
          payer: payerProfile.name || payerProfile.email || "Nom Inconnu",
        };

        // Prepare project update object
        const projectUpdateData: Partial<Project> = {
            totalExpenses: newTotalExpenses,
            recentExpenses: arrayUnion(recentExpenseSummary),
            lastActivity: serverTimestamp(), // serverTimestamp() for atomic update
            updatedAt: serverTimestamp(),   // serverTimestamp() for atomic update
        };
        transaction.update(projectRef, projectUpdateData);
      });


      toast({
        title: "Dépense ajoutée",
        description: `La dépense "${values.description}" a été enregistrée avec succès.`,
      });
      form.reset({
         description: '',
         amount: '' as unknown as number, // Reset to empty string
         currency: 'EUR',
         projectId: '',
         paidById: currentUser?.uid || '', // Default to current user if available
         expenseDate: new Date(),
         tags: '',
         receipt: null
      });
      // Reset usersForDropdown based on whether a project was selected
      setUsersForDropdown(userProfile ? [userProfile] : (currentUser ? [{id: currentUser.uid, name: currentUser.displayName || currentUser.email || "Utilisateur Actuel", email: currentUser.email || "", isAdmin: false, avatarUrl: currentUser.photoURL || ''}] : []));
      router.push('/expenses'); // Or to project details page: /projects/${selectedProject.id}
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

  if (authLoading || !currentUser) { // Also check for currentUser to avoid rendering form for logged out state
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
                        value={field.value || ''} // Ensure value is not undefined
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
                render={({ field: { onChange, value, ...rest } }) => ( // `value` is handled internally by file input
                  <FormItem>
                    <FormLabel>Justificatif (optionnel)</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept="image/*" // Accept only image files
                        onChange={(e) => onChange(e.target.files ? e.target.files[0] : null)}
                        className="pt-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                        data-ai-hint="receipt file upload"
                        {...rest} // Pass other field props like name, ref, onBlur etc.
                      />
                    </FormControl>
                     <FormDescription>
                      Le téléversement de fichiers vers Firebase Storage n'est pas encore implémenté.
                    </FormDescription>
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
