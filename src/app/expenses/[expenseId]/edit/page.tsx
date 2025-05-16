
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Timestamp, doc, getDoc, updateDoc, runTransaction, serverTimestamp, collection, getDocs, query, where } from 'firebase/firestore';

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
import type { Project, User as AppUserType } from '@/data/mock-data';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import type { ExpenseItem } from '@/app/expenses/page';
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

const editExpenseFormSchema = z.object({
  title: z.string().min(3, { message: "La description doit comporter au moins 3 caractères." }).max(100, { message: "La description ne doit pas dépasser 100 caractères." }),
  amount: z.coerce.number().positive({ message: "Le montant doit être un nombre positif." }),
  currency: z.string().min(1, { message: "Veuillez sélectionner une devise."}).default("EUR"),
  projectId: z.string().min(1, { message: "Le projet est requis." }),
  paidById: z.string().min(1, { message: "Veuillez sélectionner qui a payé." }),
  expenseDate: z.date({
    required_error: "Veuillez sélectionner une date.",
  }),
  tags: z.string().optional(),
});

type EditExpenseFormValues = z.infer<typeof editExpenseFormSchema>;

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


export default function EditExpensePage() {
  const router = useRouter();
  const params = useParams();
  const expenseId = params.expenseId as string;
  const { toast } = useToast();
  const { currentUser, userProfile, loading: authLoading, logout } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [originalExpense, setOriginalExpense] = useState<ExpenseItem | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [usersForDropdown, setUsersForDropdown] = useState<AppUserType[]>([]);
  const [isLoadingUsersForDropdown, setIsLoadingUsersForDropdown] = useState(true);

  const form = useForm<EditExpenseFormValues>({
    resolver: zodResolver(editExpenseFormSchema),
    defaultValues: {
      title: '',
      amount: '' as unknown as number,
      currency: 'EUR',
      projectId: '',
      paidById: '',
      expenseDate: new Date(),
      tags: '',
    },
  });

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.replace('/login');
    }
  }, [authLoading, currentUser, router]);

  const fetchExpenseAndProjectData = useCallback(async () => {
    if (!expenseId || !currentUser) return;
    setIsLoading(true);
    try {
      const expenseDocRef = doc(db, "expenses", expenseId);
      const expenseSnap = await getDoc(expenseDocRef);

      if (!expenseSnap.exists()) {
        toast({ title: "Erreur", description: "Dépense non trouvée.", variant: "destructive" });
        router.replace('/expenses');
        return;
      }
      const expenseData = { id: expenseSnap.id, ...expenseSnap.data() } as ExpenseItem;
      setOriginalExpense(expenseData);

      const projectDocRef = doc(db, "projects", expenseData.projectId);
      const projectSnap = await getDoc(projectDocRef);
      if (projectSnap.exists()) {
        const projectData = { id: projectSnap.id, ...projectSnap.data() } as Project;
        setProject(projectData);

        const memberUIDs = projectData.members || [];
        let fetchedProjectMembers: AppUserType[] = [];
        if (memberUIDs.length > 0) {
          const userPromises = memberUIDs.map(uid => getDoc(doc(db, "users", uid)));
          const userDocs = await Promise.all(userPromises);
          fetchedProjectMembers = userDocs
            .filter(d => d.exists())
            .map(d => ({ id: d.id, ...d.data() } as AppUserType));
        }
        setUsersForDropdown(fetchedProjectMembers);

        form.reset({
          title: expenseData.title,
          amount: expenseData.amount,
          currency: expenseData.currency,
          projectId: expenseData.projectId,
          paidById: expenseData.paidById,
          expenseDate: expenseData.expenseDate.toDate(),
          tags: expenseData.tags.join(', '),
        });

      } else {
        toast({ title: "Erreur", description: "Projet associé non trouvé.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Erreur lors de la récupération de la dépense: ", error);
      toast({ title: "Erreur de chargement", description: "Impossible de charger la dépense.", variant: "destructive" });
      router.replace('/expenses');
    } finally {
      setIsLoading(false);
      setIsLoadingUsersForDropdown(false);
    }
  }, [expenseId, currentUser, toast, router, form]);

  useEffect(() => {
    if (expenseId && currentUser) {
      fetchExpenseAndProjectData();
    }
  }, [expenseId, currentUser, fetchExpenseAndProjectData]);


  async function onSubmit(values: EditExpenseFormValues) {
    if (!currentUser || !originalExpense || !project) {
      toast({ title: "Données manquantes", description: "Impossible de traiter la modification.", variant: "destructive" });
      return;
    }
    setIsUpdating(true);

    const payerProfile = usersForDropdown.find(u => u.id === values.paidById);
    if (!payerProfile) {
        toast({ title: "Erreur de données", description: `Payeur introuvable (ID: ${values.paidById}).`, variant: "destructive" });
        setIsUpdating(false);
        return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        const expenseRef = doc(db, "expenses", originalExpense.id);
        const projectRef = doc(db, "projects", originalExpense.projectId);

        const projectDoc = await transaction.get(projectRef);
        if (!projectDoc.exists()) {
          throw new Error("Le projet associé n'existe plus.");
        }
        const projectData = projectDoc.data() as Project;

        const amountDifference = values.amount - originalExpense.amount;
        const newTotalExpenses = (projectData.totalExpenses || 0) + amountDifference;

        const updatedExpenseData: Partial<ExpenseItem> = {
          title: values.title,
          amount: values.amount,
          currency: values.currency,
          paidById: payerProfile.id,
          paidByName: payerProfile.name || payerProfile.email || "Nom Inconnu",
          expenseDate: Timestamp.fromDate(values.expenseDate),
          tags: values.tags?.split(',').map(tag => tag.trim()).filter(tag => tag) || [],
          updatedAt: serverTimestamp(),
        };
        transaction.update(expenseRef, updatedExpenseData);

        const updatedRecentExpenses = (projectData.recentExpenses || []).map(expSummary => {
          if (expSummary.id === originalExpense.id) {
            return {
              ...expSummary,
              name: values.title,
              date: Timestamp.fromDate(values.expenseDate),
              amount: values.amount,
              payer: payerProfile.name || payerProfile.email || "Nom Inconnu",
            };
          }
          return expSummary;
        }).sort((a,b) => b.date.toMillis() - a.date.toMillis()).slice(0,5);

        transaction.update(projectRef, {
          totalExpenses: newTotalExpenses < 0 ? 0 : newTotalExpenses,
          recentExpenses: updatedRecentExpenses,
          lastActivity: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      toast({
        title: "Dépense modifiée",
        description: `La dépense "${values.title}" a été mise à jour avec succès.`,
      });
      router.push('/expenses');
    } catch (error: any) {
      console.error("Erreur lors de la modification de la dépense: ", error);
      toast({
        title: "Erreur de mise à jour",
        description: `Impossible de mettre à jour la dépense: ${error.message || "Veuillez réessayer."}`,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
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

  if (isLoading || authLoading || !currentUser || !originalExpense) {
    return (
      <div className="container mx-auto py-10 text-center">
        <Icons.loader className="mx-auto h-12 w-12 animate-spin text-primary" />
        <p className="mt-4">Chargement de la dépense...</p>
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
                    src={userProfile?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.name || currentUser?.email || 'User')}&background=random&color=fff&size=32`}
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
        <h1 className="text-3xl font-bold">Modifier la Dépense</h1>
        <Link href="/expenses" passHref>
          <Button variant="outline">
            <Icons.arrowLeft className="mr-2 h-4 w-4" />
            Retour aux dépenses
          </Button>
        </Link>
      </div>

      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>Modifier les détails de la dépense</CardTitle>
          <CardDescription>
            Projet associé : {project?.name || originalExpense.projectName} (Non modifiable)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
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
                    <FormLabel>Projet associé (Non modifiable)</FormLabel>
                    <Select value={field.value} disabled>
                      <FormControl>
                        <SelectTrigger data-ai-hint="project select disabled">
                          <SelectValue placeholder="Projet de la dépense" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {project && <SelectItem value={project.id}>{project.name}</SelectItem>}
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
                        disabled={isLoadingUsersForDropdown}
                    >
                      <FormControl>
                        <SelectTrigger data-ai-hint="user select paid by">
                          <SelectValue placeholder={
                            isLoadingUsersForDropdown
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
                         {usersForDropdown.length === 0 && !isLoadingUsersForDropdown && (
                            <p className="p-2 text-sm text-muted-foreground">Aucun membre pour ce projet.</p>
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

              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={() => router.push('/expenses')} disabled={isUpdating}>
                  Annuler
                </Button>
                <Button type="submit" disabled={isUpdating || isLoadingUsersForDropdown}>
                  {isUpdating ? (
                    <>
                      <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
                      Mise à jour...
                    </>
                  ) : (
                    <>
                      <Icons.save className="mr-2 h-4 w-4" />
                      Enregistrer les modifications
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
