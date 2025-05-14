
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
import type { Project, User } from '@/data/mock-data';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, serverTimestamp, doc, updateDoc, arrayUnion, runTransaction } from 'firebase/firestore';


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
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

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
        description: "Impossible de charger la liste des projets.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingProjects(false);
    }
  }, [toast]);

  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const usersCollection = collection(db, "users");
      const usersSnapshot = await getDocs(usersCollection);
      const usersList = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as User));
      setUsers(usersList);
    } catch (error) {
      console.error("Erreur lors de la récupération des utilisateurs: ", error);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger la liste des utilisateurs.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingUsers(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProjects();
    fetchUsers();
  }, [fetchProjects, fetchUsers]);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      description: '',
      amount: undefined,
      currency: 'EUR',
      projectId: '',
      paidById: '',
      expenseDate: new Date(),
      tags: '',
    },
  });

  async function onSubmit(values: ExpenseFormValues) {
    setIsLoading(true);
    
    const selectedProject = projects.find(p => p.id === values.projectId);
    const payer = users.find(u => u.id === values.paidById);

    if (!selectedProject || !payer) {
        toast({
            title: "Erreur de données",
            description: "Projet ou payeur introuvable. Veuillez vérifier les sélections.",
            variant: "destructive",
        });
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
        paidById: values.paidById,
        paidByName: payer.name, 
        expenseDate: Timestamp.fromDate(values.expenseDate),
        tags: values.tags?.split(',').map(tag => tag.trim()).filter(tag => tag) || [],
        createdAt: serverTimestamp(),
      };

      const expenseDocRef = await addDoc(collection(db, "expenses"), newExpenseDocData);

      const projectRef = doc(db, "projects", selectedProject.id);
      await runTransaction(db, async (transaction) => {
        const projectDoc = await transaction.get(projectRef);
        if (!projectDoc.exists()) {
          throw "Project document does not exist!";
        }
        const currentTotalExpenses = projectDoc.data().totalExpenses || 0;
        const newTotalExpenses = currentTotalExpenses + values.amount;
        
        const recentExpenseSummary = {
          id: expenseDocRef.id, 
          name: values.description,
          date: Timestamp.fromDate(values.expenseDate),
          amount: values.amount,
          payer: payer.name,
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
      form.reset(); 
      router.push('/expenses'); 
    } catch (error) {
        console.error("Erreur lors de l'ajout de la dépense: ", error);
        toast({
            title: "Erreur",
            description: "Impossible d'enregistrer la dépense. Veuillez réessayer.",
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
    }
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
                        <Input type="number" placeholder="0.00" {...field} step="0.01" data-ai-hint="expense amount"/>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingProjects}>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingUsers}>
                      <FormControl>
                        <SelectTrigger data-ai-hint="user select paid by">
                          <SelectValue placeholder={isLoadingUsers ? "Chargement des utilisateurs..." : "Sélectionner un utilisateur"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map(user => ( 
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
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
                <Button type="submit" disabled={isLoading || isLoadingProjects || isLoadingUsers}>
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

