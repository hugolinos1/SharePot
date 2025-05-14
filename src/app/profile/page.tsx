
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
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Le nom doit comporter au moins 2 caractères." }).max(50, { message: "Le nom ne doit pas dépasser 50 caractères." }),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, userProfile, loading: authLoading, setUserProfile: setContextUserProfile } = useAuth(); // Use from AuthContext
  const [isLoading, setIsLoading] = useState(false); // For form submission, authLoading handles initial load
  const [isEditingName, setIsEditingName] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: userProfile?.name || '',
    },
  });

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.replace('/login');
    }
    if (userProfile) {
      form.reset({ name: userProfile.name });
    }
  }, [authLoading, currentUser, userProfile, router, form]);


  const getAvatarFallback = (name: string | undefined | null) => {
    if (!name) return '??';
    const parts = name.split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] || '') + (parts[parts.length - 1][0] || '');
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleSaveName = async (values: ProfileFormValues) => {
    if (!currentUser || !userProfile) return;
    setIsLoading(true); // For form submission

    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      await updateDoc(userDocRef, {
        name: values.name,
      });
      // Update local context state
      if(setContextUserProfile) { // Check if setUserProfile exists
        setContextUserProfile(prev => prev ? { ...prev, name: values.name } : null);
      }

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
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || !currentUser || !userProfile) {
    return (
      <div className="container mx-auto py-10 text-center">
        <Icons.loader className="mx-auto h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Chargement du profil...</p>
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
            <AvatarImage src={userProfile.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.name || 'User')}&background=random&color=fff&size=128`} alt={userProfile.name || 'User'} data-ai-hint="user avatar large"/>
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
                <Button type="submit" size="icon" className="h-8 w-8" disabled={isLoading || form.formState.isSubmitting}>
                  {(isLoading || form.formState.isSubmitting) ? <Icons.loader className="h-4 w-4 animate-spin"/> : <Icons.save className="h-4 w-4" />}
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsEditingName(false)} disabled={isLoading || form.formState.isSubmitting}>
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
