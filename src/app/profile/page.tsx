
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { db, storage } from '@/lib/firebase'; // Ensure storage is exported from firebase.ts
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Le nom doit comporter au moins 2 caractères." }).max(50, { message: "Le nom ne doit pas dépasser 50 caractères." }),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

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

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, userProfile, loading: authLoading, setUserProfile: setContextUserProfile, logout } = useAuth();
  
  const [isLoadingName, setIsLoadingName] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);


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

  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedAvatarFile(file);
      setAvatarPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSaveAvatar = async () => {
    if (!currentUser || !selectedAvatarFile) return;
    setIsUploadingAvatar(true);

    const oldAvatarStoragePath = userProfile?.avatarStoragePath;
    const newFileName = `${Date.now()}-${selectedAvatarFile.name}`;
    const newAvatarStoragePath = `avatars/${currentUser.uid}/${newFileName}`;
    const avatarRef = ref(storage, newAvatarStoragePath);

    try {
      // Upload new avatar
      await uploadBytes(avatarRef, selectedAvatarFile);
      const newAvatarUrl = await getDownloadURL(avatarRef);

      // Update Firestore
      const userDocRef = doc(db, "users", currentUser.uid);
      await updateDoc(userDocRef, {
        avatarUrl: newAvatarUrl,
        avatarStoragePath: newAvatarStoragePath,
      });

      // Delete old avatar if it exists and is different
      if (oldAvatarStoragePath && oldAvatarStoragePath !== newAvatarStoragePath) {
        try {
          const oldAvatarRef = ref(storage, oldAvatarStoragePath);
          await deleteObject(oldAvatarRef);
          console.log("[ProfilePage] Old avatar deleted from Storage:", oldAvatarStoragePath);
        } catch (deleteError) {
          console.error("[ProfilePage] Error deleting old avatar from Storage:", deleteError);
          // Non-critical error, proceed
        }
      }
      
      if(setContextUserProfile) {
        setContextUserProfile(prev => prev ? { ...prev, avatarUrl: newAvatarUrl, avatarStoragePath: newAvatarStoragePath } : null);
      }

      toast({
        title: "Avatar mis à jour",
        description: "Votre nouvel avatar a été enregistré.",
      });
      setSelectedAvatarFile(null);
      setAvatarPreviewUrl(null);
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'avatar: ", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'avatar.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };


  const handleSaveName = async (values: ProfileFormValues) => {
    if (!currentUser || !userProfile) return;
    setIsLoadingName(true);

    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      await updateDoc(userDocRef, {
        name: values.name,
      });
      
      if(setContextUserProfile) {
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
      setIsLoadingName(false);
    }
  };

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


  if (authLoading || !currentUser || !userProfile) {
    return (
      <div className="container mx-auto py-10 text-center">
        <Icons.loader className="mx-auto h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Chargement du profil...</p>
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
            <div className="relative group">
                <Avatar className="h-24 w-24 mb-4 ring-2 ring-primary ring-offset-2 ring-offset-background cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                    <AvatarImage 
                        src={avatarPreviewUrl || userProfile.avatarUrl} 
                        alt={userProfile.name || 'User'} 
                        data-ai-hint="user avatar large"
                    />
                    <AvatarFallback className="text-3xl">{getAvatarFallbackText(userProfile.name, userProfile.email)}</AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity duration-300 rounded-full cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                    <Icons.edit className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
            </div>
            <input
                type="file"
                accept="image/*"
                ref={avatarInputRef}
                onChange={handleAvatarFileChange}
                className="hidden"
                data-ai-hint="avatar file input"
            />
            {avatarPreviewUrl && (
                <Button onClick={handleSaveAvatar} disabled={isUploadingAvatar} className="mt-2">
                {isUploadingAvatar ? <Icons.loader className="animate-spin mr-2"/> : <Icons.save className="mr-2"/>}
                Enregistrer l'avatar
                </Button>
            )}

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
                <Button type="submit" size="icon" className="h-8 w-8" disabled={isLoadingName || form.formState.isSubmitting}>
                  {(isLoadingName || form.formState.isSubmitting) ? <Icons.loader className="h-4 w-4 animate-spin"/> : <Icons.save className="h-4 w-4" />}
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsEditingName(false)} disabled={isLoadingName || form.formState.isSubmitting}>
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
    </div>
  );
}

