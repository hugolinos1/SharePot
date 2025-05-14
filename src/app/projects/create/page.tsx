
"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import React from "react";
import { Icons } from "@/components/icons";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Le nom du projet doit comporter au moins 2 caractères.",
  }),
  description: z.string().optional(),
  budget: z.coerce.number().nonnegative({ message: "Le budget doit être un nombre positif ou zéro." }).optional(),
});

export default function ProjectCreatePage() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      budget: 0,
    },
  });

  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const newProjectData = {
        name: values.name,
        description: values.description || "",
        budget: values.budget || 0,
        status: 'Actif', // Default status
        totalExpenses: 0,
        lastActivity: new Date().toLocaleDateString('fr-FR'), // Or serverTimestamp()
        members: ['Admin User'], // Default member, ideally make this selectable
        recentExpenses: [],
        notes: '',
        tags: [], // Default tags, ideally make this selectable
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await addDoc(collection(db, "projects"), newProjectData);
      toast({
        title: "Projet créé",
        description: `Le projet "${values.name}" a été ajouté avec succès.`,
      });
      router.push('/projects');
    } catch (error) {
      console.error("Erreur lors de la création du projet: ", error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le projet. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Créer un Nouveau Projet</h1>
        <Button variant="outline" onClick={() => router.push('/projects')}>
           <Icons.arrowLeft className="mr-2 h-4 w-4" />
          Retour aux projets
        </Button>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto p-6 bg-card shadow-lg rounded-xl">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom du Projet*</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Voyage d'entreprise" {...field} data-ai-hint="project name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Décrivez le projet..."
                    {...field}
                    rows={4}
                    data-ai-hint="project description"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="budget"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Budget (€)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    {...field} 
                    step="0.01"
                    data-ai-hint="project budget" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Icons.save className="mr-2 h-4 w-4" />
                  Créer le Projet
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
