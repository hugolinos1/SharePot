
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { useToast } from "@/hooks/use-toast";
import type { User } from '@/data/mock-data';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

// TODO: Remplacer par une véritable authentification Firebase Auth.
// Pour l'instant, cette page affiche le profil de l'utilisateur admin par défaut.
// Dans une application réelle, l'ID viendrait de auth.currentUser.uid.
const USER_TO_DISPLAY_ID = 'adminPrincipal'; 

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Le nom doit comporter au moins 2 caractères." }).max(50, { message: "Le nom ne doit pas dépasser 50 caractères." }),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: '',
    },
  });

  const fetchUserProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const userDocRef = doc(db, "users", USER_TO_DISPLAY_ID);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const userData = { id: userDocSnap.id, ...userDocSnap.data() } as User;
        setUserProfile(userData);
        form.reset({ name: userData.name }); 
      } else {
        console.error(`Profil utilisateur (ID: ${USER_TO_DISPLAY_ID}) non trouvé.`);
        toast({
          title: "Erreur",
          description: `Profil utilisateur (ID: ${USER_TO_DISPLAY_ID}) introuvable.`,
          variant: "destructive",
        });
        // Optionnel: rediriger si le profil admin par défaut n'est pas trouvé
        // router.push('/dashboard'); 
      }
    } catch (error) {
      console.error("Erreur lors de la récupération du profil: ", error);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger le profil utilisateur.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, form]); // router retiré des dépendances si non utilisé en cas d'erreur

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const getAvatarFallback = (name: string | undefined) => {
    if (!name) return '??';
    const parts = name.split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] || '') + (parts[parts.length - 1][0] || '');
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleSaveName = async (values: ProfileFormValues) => {
    if (!userProfile) return;
    // Ne pas remettre setIsLoading à true ici, car il est géré par le FormField et le bouton de soumission.
    // Si le bouton est déjà en mode "isLoading", cela peut causer des conflits.
    // Le formulaire gère déjà son propre état de soumission.

    try {
      const userDocRef = doc(db, "users", userProfile.id);
      await updateDoc(userDocRef, {
        name: values.name,
        // updatedAt: serverTimestamp(), // Envisagez d'ajouter un champ updatedAt pour les utilisateurs aussi
      });
      setUserProfile(prev => prev ? { ...prev, name: values.name } : null);
      toast({
        title: "Profil mis à jour",
        description: "Votre nom a été modifié avec succès.",
      });
      setIsEditingName(false);
    } catch (error) {
      console.error("Erreur lors de la mise à jour du nom: ", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le nom.",
        variant: "destructive",
      });
    } 
    // setIsLoading(false) n'est pas nécessaire ici si le bouton de formulaire gère son propre état de chargement
  };

  if (isLoading && !userProfile) { // Modifié pour afficher le loader seulement si userProfile n'est pas encore là
    return (
      <div className="container mx-auto py-10 text-center">
        <Icons.loader className="mx-auto h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Chargement du profil...</p>
      </div>
    );
  }

  if (!userProfile) { // Si après chargement, userProfile est toujours null
     return (
      <div className="container mx-auto py-10 text-center">
        <p className="text-xl text-destructive">Profil utilisateur non trouvé.</p>
        <p className="text-muted-foreground mb-6">Impossible de charger les informations du profil (ID: {USER_TO_DISPLAY_ID}). Veuillez vérifier votre base de données ou la configuration.</p>
        <Link href="/dashboard" passHref>
          <Button variant="outline">
            <Icons.arrowLeft className="mr-2 h-4 w-4" />
            Retour au tableau de bord
          </Button>
        </Link>
      </div>
    );
  }


  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Mon Profil</h1>
        <Link href="/dashboard" passHref>
          <Button variant="outline">
            <Icons.arrowLeft className="mr-2 h-4 w-4" />
            Retour au tableau de bord
          </Button>
        </Link>
      </div>

      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader className="items-center text-center">
          <Avatar className="h-24 w-24 mb-4 ring-2 ring-primary ring-offset-2 ring-offset-background">
            <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.name)}&background=random&color=fff&size=128`} alt={userProfile.name} data-ai-hint="user avatar large"/>
            <AvatarFallback className="text-3xl">{getAvatarFallback(userProfile.name)}</AvatarFallback>
          </Avatar>
          {!isEditingName ? (
            <div className="flex items-center gap-2">
              <CardTitle className="text-2xl">{userProfile.name}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => { form.setValue('name', userProfile.name); setIsEditingName(true); }} className="h-7 w-7">
                <Icons.edit className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSaveName)} className="flex items-center gap-2 w-full max-w-sm">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="flex-grow">
                      <FormControl>
                        <Input placeholder="Votre nom" {...field} className="text-lg text-center" data-ai-hint="user name input" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" size="icon" className="h-8 w-8" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? <Icons.loader className="h-4 w-4 animate-spin"/> : <Icons.save className="h-4 w-4" />}
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsEditingName(false)} disabled={form.formState.isSubmitting}>
                  <Icons.close className="h-4 w-4" />
                </Button>
              </form>
            </Form>
          )}
          <CardDescription>{userProfile.email}</CardDescription>
        </CardHeader>
        <CardContent className="mt-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Rôle</h3>
              <Badge variant={userProfile.isAdmin ? 'default' : 'secondary'}>
                {userProfile.isAdmin ? 'Administrateur' : 'Membre'}
              </Badge>
            </div>
            
            <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-2">Paramètres du compte</h3>
                <Button variant="outline" className="w-full justify-start" disabled>
                    <Icons.lock className="mr-2 h-4 w-4" /> Modifier le mot de passe (Indisponible)
                </Button>
                 <Button variant="destructive" className="w-full justify-start mt-2" disabled>
                    <Icons.trash className="mr-2 h-4 w-4" /> Supprimer le compte (Indisponible)
                </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
