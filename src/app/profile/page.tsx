
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
import { db, storage } from '@/lib/firebase'; 
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
  if (name && name.trim() !== '') {
    const parts = name.trim().split(' ');
    if (parts.length >= 2 && parts[0] && parts[parts.length - 1]) {
      return (parts[0][0] || '').toUpperCase() + (parts[parts.length - 1][0] || '').toUpperCase();
    }
    const singleName = parts[0];
    if (singleName && singleName.length >= 2) {
      return singleName.substring(0, 2).toUpperCase();
    }
    if (singleName && singleName.length === 1) {
      return singleName[0].toUpperCase();
    }
  }
  if (email && email.trim() !== '') {
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
      name: '', 
    },
  });

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.replace('/login');
    }
    if (userProfile) {
      console.log("[ProfilePage useEffect userProfile] userProfile loaded:", JSON.stringify(userProfile, null, 2));
      form.reset({ name: userProfile.name || '' });
      if (!selectedAvatarFile) {
        setAvatarPreviewUrl(null); 
      }
    } else if (!authLoading && currentUser && !userProfile) {
      console.warn("[ProfilePage useEffect userProfile] Auth loaded, currentUser exists, but userProfile is still null. This might indicate an issue with AuthContext profile loading.");
    }
  }, [authLoading, currentUser, userProfile, router, form, selectedAvatarFile]);

  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedAvatarFile(file);
      setAvatarPreviewUrl(URL.createObjectURL(file));
    } else {
      setSelectedAvatarFile(null);
      setAvatarPreviewUrl(null);
    }
  };

  const handleSaveAvatar = async () => {
    console.log("[ProfilePage handleSaveAvatar] Attempting to save avatar.");
    if (!currentUser || !selectedAvatarFile || !userProfile) {
      console.error("[ProfilePage handleSaveAvatar] Pre-condition failed: currentUser, selectedAvatarFile, or userProfile missing.", { currentUserPresent: !!currentUser, selectedAvatarFilePresent: !!selectedAvatarFile, userProfilePresent: !!userProfile });
      toast({ title: "Erreur", description: "Informations utilisateur ou fichier manquant.", variant: "destructive" });
      return;
    }
    setIsUploadingAvatar(true);
    console.log("[ProfilePage handleSaveAvatar] User:", currentUser.uid, "File:", selectedAvatarFile.name);

    const oldAvatarStoragePath = userProfile.avatarStoragePath;
    const newFileName = `${Date.now()}-${selectedAvatarFile.name}`;
    const newAvatarStoragePath = `avatars/${currentUser.uid}/${newFileName}`;
    const avatarRef = ref(storage, newAvatarStoragePath);
    console.log("[ProfilePage handleSaveAvatar] New avatar path:", newAvatarStoragePath);

    try {
      console.log("[ProfilePage handleSaveAvatar] Starting upload to Firebase Storage...");
      await uploadBytes(avatarRef, selectedAvatarFile);
      console.log("[ProfilePage handleSaveAvatar] Upload to Storage successful.");

      const newAvatarUrl = await getDownloadURL(avatarRef);
      console.log("[ProfilePage handleSaveAvatar] Got download URL:", newAvatarUrl);

      if (oldAvatarStoragePath && oldAvatarStoragePath !== newAvatarStoragePath) {
        console.log("[ProfilePage handleSaveAvatar] Attempting to delete old avatar from Storage:", oldAvatarStoragePath);
        try {
          const oldAvatarRef = ref(storage, oldAvatarStoragePath);
          await deleteObject(oldAvatarRef);
          console.log("[ProfilePage handleSaveAvatar] Old avatar deleted successfully from Storage.");
        } catch (deleteError: any) {
          if (deleteError.code === 'storage/object-not-found') {
            console.info("[ProfilePage handleSaveAvatar] Old avatar not found in Storage (already deleted or path was invalid):", oldAvatarStoragePath);
            // No toast needed if object was already gone
          } else {
            // Log other errors as actual errors and show a warning toast
            console.error("[ProfilePage handleSaveAvatar] Error deleting old avatar from Storage:", deleteError.message, deleteError);
            toast({ title: "Avertissement", description: "Un problème est survenu lors de la suppression de l'ancien avatar, mais le nouveau est sauvegardé.", variant: "default" });
          }
        }
      }
      
      const userDocRef = doc(db, "users", currentUser.uid);
      const updateData = {
        avatarUrl: newAvatarUrl,
        avatarStoragePath: newAvatarStoragePath, // Make sure to save the new path
      };
      console.log("[ProfilePage handleSaveAvatar] Attempting to update Firestore user document with:", updateData);
      await updateDoc(userDocRef, updateData);
      console.log("[ProfilePage handleSaveAvatar] Firestore user document updated successfully.");
      
      if(setContextUserProfile) {
        const updatedProfile = { ...userProfile, avatarUrl: newAvatarUrl, avatarStoragePath: newAvatarStoragePath };
        setContextUserProfile(updatedProfile);
        console.log("[ProfilePage handleSaveAvatar] AuthContext userProfile updated.");
        // Log to confirm the context update after React has processed state changes
        setTimeout(() => {
            // To check the global context state, you might need to inspect it through DevTools
            // or by triggering a re-render of a component that uses it.
            // For now, we rely on the fact that setContextUserProfile was called.
            console.log("[ProfilePage handleSaveAvatar AFTER CONTEXT UPDATE (timeout)] userProfile.avatarUrl should now be new URL.");
        }, 0);
      }

      toast({
        title: "Avatar mis à jour",
        description: "Votre nouvel avatar a été enregistré.",
      });
      setSelectedAvatarFile(null);
      setAvatarPreviewUrl(null); 
    } catch (error: any) {
      console.error("[ProfilePage handleSaveAvatar] Error during avatar update process:", error.message, error);
      toast({
        title: "Erreur de mise à jour de l'avatar",
        description: `Impossible de mettre à jour l'avatar: ${error.message || "Une erreur inconnue est survenue."}`,
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
      console.log("[ProfilePage handleSaveAvatar] Finished avatar save attempt.");
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

  console.log("[ProfilePage Render] userProfile.avatarUrl at render time:", userProfile?.avatarUrl);

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
                    src={userProfile?.avatarUrl && userProfile.avatarUrl.trim() !== '' ? userProfile.avatarUrl : undefined}
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
                        src={(avatarPreviewUrl || (userProfile.avatarUrl && userProfile.avatarUrl.trim() !== '' ? userProfile.avatarUrl : undefined)) || undefined}
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
            {avatarPreviewUrl && selectedAvatarFile && (
                <Button onClick={handleSaveAvatar} disabled={isUploadingAvatar} className="mt-2">
                {isUploadingAvatar ? <Icons.loader className="animate-spin mr-2 h-4 w-4"/> : <Icons.save className="mr-2 h-4 w-4"/>}
                Enregistrer l'avatar
                </Button>
            )}

          {!isEditingName ? (
            <div className="flex items-center gap-2">
              <CardTitle className="text-2xl">{userProfile.name}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => { form.setValue('name', userProfile.name || ''); setIsEditingName(true); }} className="h-7 w-7">
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

