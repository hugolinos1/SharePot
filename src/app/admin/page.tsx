"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User, Project } from '@/data/mock-data'; 
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";

import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, serverTimestamp, getDoc, setDoc } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { tagExpense } from '@/ai/flows/tag-expense-with-ai';

const getAvatarFallbackText = (name?: string | null, email?: string | null): string => {
  if (name) {
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

const editProjectFormSchema = z.object({
  name: z.string().min(2, { message: "Le nom du projet doit comporter au moins 2 caractères." }),
  description: z.string().optional(),
  status: z.string().min(1, {message: "Le statut est requis."})
});
type EditProjectFormValues = z.infer<typeof editProjectFormSchema>;

const ocrConfigSchema = z.object({
  openRouterKey: z.string().min(1, { message: "La clé API est requise." }),
});
type OCRConfigValues = z.infer<typeof ocrConfigSchema>;

export default function AdminProjectsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { currentUser, userProfile, isAdmin, loading: authLoading, logout } = useAuth();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoadingProjects, setIsLoadingProjects] = useState(true);

    const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
    const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
    const [isUpdatingProject, setIsUpdatingProject] = useState(false);

    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [isDeleteProjectConfirmModalOpen, setIsDeleteProjectConfirmModalOpen] = useState(false);
    const [isDeletingProject, setIsDeletingProject] = useState(false);

    const [isSavingOCR, setIsSavingOCR] = useState(false);
    const [isTestingAI, setIsTestingIA] = useState(false);
    const [aiTestResult, setAiTestResult] = useState<string | null>(null);

    const editForm = useForm<EditProjectFormValues>({
        resolver: zodResolver(editProjectFormSchema),
        defaultValues: {
          name: "",
          description: "",
          status: "Actif",
        },
    });

    const ocrForm = useForm<OCRConfigValues>({
        resolver: zodResolver(ocrConfigSchema),
        defaultValues: {
          openRouterKey: "",
        },
    });

    useEffect(() => {
        if (!authLoading && !currentUser) {
            router.replace('/login');
        } else if (!authLoading && currentUser && !isAdmin) {
            router.replace('/dashboard'); 
            toast({
                title: "Accès non autorisé",
                description: "Vous n'avez pas les droits pour accéder à cette page.",
                variant: "destructive"
            });
        }
    }, [authLoading, currentUser, isAdmin, router, toast]);

    const fetchProjects = useCallback(async () => {
      if (!isAdmin) return; 
      setIsLoadingProjects(true);
      try {
        const projectsCollection = collection(db, "projects");
        const projectSnapshot = await getDocs(projectsCollection);
        const projectsList = projectSnapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data(),
        } as Project));
        setProjects(projectsList);
      } catch (error) {
        console.error("Erreur lors de la récupération des projets: ", error);
        toast({
          title: "Erreur de chargement",
          description: "Impossible de charger les projets.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingProjects(false);
      }
    }, [isAdmin, toast]);

    const fetchOCRConfig = useCallback(async () => {
      if (!isAdmin) return;
      try {
        const docRef = doc(db, "settings", "openrouter");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          ocrForm.setValue("openRouterKey", docSnap.data().apiKey || "");
        }
      } catch (error) {
        console.error("Erreur chargement config OCR:", error);
      }
    }, [isAdmin, ocrForm]);
  
    useEffect(() => {
      if (isAdmin) { 
        fetchProjects();
        fetchOCRConfig();
      }
    }, [isAdmin, fetchProjects, fetchOCRConfig]);

     const filteredProjects = useMemo(() => {
         if (isLoadingProjects) return [];
         if (!searchTerm) return projects;
         const lowerCaseSearch = searchTerm.toLowerCase();
         return projects.filter(project =>
             project.name.toLowerCase().includes(lowerCaseSearch) ||
             (project.description && project.description.toLowerCase().includes(lowerCaseSearch)) ||
             (project.tags && Array.isArray(project.tags) && project.tags.some(tag => tag.toLowerCase().includes(lowerCaseSearch)))
         );
     }, [projects, searchTerm, isLoadingProjects]);
    
    const handleOpenEditProjectModal = (project: Project) => {
        setProjectToEdit(project);
        editForm.reset({
            name: project.name,
            description: project.description || "",
            status: project.status || "Actif",
        });
        setIsEditProjectModalOpen(true);
    };

    const handleSaveProjectEdit = async (values: EditProjectFormValues) => {
        if (!projectToEdit || !isAdmin) return;
        setIsUpdatingProject(true);
        try {
            const projectRef = doc(db, "projects", projectToEdit.id);
            await updateDoc(projectRef, {
                name: values.name,
                description: values.description || "",
                status: values.status,
                updatedAt: serverTimestamp(),
            });
            toast({ title: "Projet mis à jour", description: `Le projet "${values.name}" a été modifié.` });
            fetchProjects(); 
            setIsEditProjectModalOpen(false);
        } catch (error) {
            console.error("Erreur lors de la mise à jour du projet:", error);
            toast({ title: "Erreur de mise à jour", description: "Impossible de modifier le projet.", variant: "destructive" });
        } finally {
            setIsUpdatingProject(false);
        }
    };

    const handleSaveOCRConfig = async (values: OCRConfigValues) => {
        if (!isAdmin) return;
        setIsSavingOCR(true);
        try {
            await setDoc(doc(db, "settings", "openrouter"), {
                apiKey: values.openRouterKey.trim(), // On trim avant de sauvegarder
                updatedAt: serverTimestamp(),
            }, { merge: true });
            toast({ title: "Configuration enregistrée", description: "La clé API OpenRouter a été stockée en toute sécurité." });
        } catch (error) {
            console.error("Erreur sauvegarde OCR:", error);
            toast({ title: "Erreur", description: "Impossible d'enregistrer la clé API.", variant: "destructive" });
        } finally {
            setIsSavingOCR(false);
        }
    };

    const handleTestAI = async () => {
        setIsTestingIA(true);
        setAiTestResult(null);
        try {
            const result = await tagExpense({ description: "Musée de la mer" });
            setAiTestResult(result);
            if (result.includes("Erreur")) {
                toast({ title: "Échec du test", description: result, variant: "destructive" });
            } else {
                toast({ title: "Test réussi", description: `Catégorie : ${result}` });
            }
        } catch (error: any) {
            console.error("Erreur fatale test IA:", error);
            setAiTestResult("Erreur critique : " + error.message);
            toast({ title: "Erreur critique", description: error.message, variant: "destructive" });
        } finally {
            setIsTestingIA(false);
        }
    };

    const handleOpenDeleteProjectModal = (project: Project) => {
        setProjectToDelete(project);
        setIsDeleteProjectConfirmModalOpen(true);
    };

    const handleConfirmDeleteProject = async () => {
        if (!projectToDelete || !isAdmin) return;
        setIsDeletingProject(true);
        try {
            await deleteDoc(doc(db, "projects", projectToDelete.id));
            toast({ title: "Projet supprimé", description: `Le projet "${projectToDelete.name}" a été supprimé.` });
            fetchProjects(); 
            setIsDeleteProjectConfirmModalOpen(false);
            setProjectToDelete(null);
        } catch (error) {
            console.error("Erreur lors de la suppression du projet:", error);
            toast({ title: "Erreur de suppression", description: "Impossible de supprimer le projet.", variant: "destructive" });
        } finally {
            setIsDeletingProject(false);
        }
    };


    const handleLogout = async () => {
      try {
        await logout();
        router.push('/login');
        toast({ title: "Déconnexion réussie" });
      } catch (error) {
        console.error("Erreur de deconnexion:", error);
        toast({ title: "Erreur de deconnexion", variant: "destructive" });
      }
    };

    if (authLoading || !currentUser) {
        return (
          <div className="container mx-auto py-10 text-center">
            <Icons.loader className="mx-auto h-12 w-12 animate-spin text-primary" />
            <p className="mt-4">Chargement...</p>
          </div>
        );
    }
    
    if (!isAdmin) {
         return (
            <div className="container mx-auto py-10 text-center">
                 <p className="text-2xl font-semibold mb-4">Accès non autorisé</p>
                 <p className="text-muted-foreground mb-6">Vous n'avez pas les droits nécessaires pour accéder à cette page.</p>
                 <Button onClick={() => router.push('/dashboard')}>
                     <Icons.home className="mr-2 h-4 w-4" />
                     Retour au tableau de bord
                 </Button>
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
                    src={userProfile?.avatarUrl ? userProfile.avatarUrl : undefined}
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
             <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
                 <div>
                     <h1 className="text-3xl font-bold mb-1">Gestion de la Plateforme (Admin)</h1>
                     <p className="text-lg text-muted-foreground">
                        Gérez les projets et la configuration technique.
                     </p>
                 </div>
                 <div className="flex items-center gap-4 mt-4 md:mt-0">
                    <Input
                        type="search"
                        placeholder="Rechercher des projets..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-xs"
                        data-ai-hint="search projects"
                    />
                     <Link href="/dashboard" passHref>
                       <Button variant="outline">
                         <Icons.layoutDashboard className="mr-2 h-4 w-4" /> Tableau de bord
                       </Button>
                     </Link>
                      <Link href="/projects/create" passHref>
                       <Button>
                         <Icons.plus className="mr-2 h-4 w-4" /> Nouveau Projet
                       </Button>
                     </Link>
                 </div>
             </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Liste des Projets ({isLoadingProjects ? '...' : filteredProjects.length})</CardTitle>
                        <CardDescription>
                        Vue complète de tous les projets.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead>Nom du Projet</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead>Membres</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingProjects && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                                    <Icons.loader className="mx-auto h-8 w-8 animate-spin" />
                                    Chargement des projets...
                                    </TableCell>
                                </TableRow>
                                )}
                                {!isLoadingProjects && filteredProjects.map((project) => (
                                <TableRow key={project.id}>
                                    <TableCell className="font-medium">{project.name}</TableCell>
                                    <TableCell className="text-muted-foreground truncate max-w-xs">{project.description}</TableCell>
                                    <TableCell>
                                        <Badge variant={project.status === 'Actif' ? 'default' : project.status === 'Terminé' ? 'outline' : 'secondary'}>
                                            {project.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{project.members?.length || 0}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" className="mr-1 h-8 w-8" onClick={() => handleOpenEditProjectModal(project)}>
                                        <Icons.edit className="h-4 w-4" />
                                            <span className="sr-only">Modifier</span>
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90 h-8 w-8" onClick={() => handleOpenDeleteProjectModal(project)}>
                                        <Icons.trash className="h-4 w-4" />
                                            <span className="sr-only">Supprimer</span>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                                ))}
                                {!isLoadingProjects && filteredProjects.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                                    Aucun projet trouvé.
                                    </TableCell>
                                </TableRow>
                                )}
                            </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Configuration OCR & IA</CardTitle>
                            <CardDescription>
                                Paramétrez l'IA pour l'analyse des factures et catégories.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form {...ocrForm}>
                                <form onSubmit={ocrForm.handleSubmit(handleSaveOCRConfig)} className="space-y-4">
                                    <FormField
                                        control={ocrForm.control}
                                        name="openRouterKey"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Clé API OpenRouter</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input 
                                                            type="password" 
                                                            placeholder="sk-or-v1-..." 
                                                            {...field} 
                                                            data-ai-hint="openrouter api key input"
                                                        />
                                                    </div>
                                                </FormControl>
                                                <FormDescription className="text-xs">
                                                    Modèle stable utilisé : Gemini 2.0 Flash Exp (Free)
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" className="w-full" disabled={isSavingOCR}>
                                        {isSavingOCR && <Icons.loader className="mr-2 h-4 w-4 animate-spin" />}
                                        <Icons.save className="mr-2 h-4 w-4" />
                                        Enregistrer la clé
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Diagnostic IA</CardTitle>
                            <CardDescription>
                                Testez la connexion et la réponse de l'IA (Catégorisation).
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Button 
                                variant="outline" 
                                className="w-full" 
                                onClick={handleTestAI} 
                                disabled={isTestingAI}
                            >
                                {isTestingAI ? (
                                    <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Icons.sparkles className="mr-2 h-4 w-4" />
                                )}
                                Tester "Musée de la mer"
                            </Button>
                            
                            {aiTestResult && (
                                <div className={`p-3 rounded-md border text-sm font-mono break-all ${aiTestResult.includes('Erreur') ? 'bg-destructive/10 border-destructive/20 text-destructive' : 'bg-muted border-border'}`}>
                                    <p className="text-xs text-muted-foreground mb-1 font-sans">Réponse du modèle :</p>
                                    {aiTestResult}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>

        {/* Edit Project Modal */}
        <Dialog open={isEditProjectModalOpen} onOpenChange={setIsEditProjectModalOpen}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Modifier le Projet: {projectToEdit?.name}</DialogTitle>
                    <DialogDescription>
                        Mettez à jour les informations du projet ci-dessous.
                    </DialogDescription>
                </DialogHeader>
                <Form {...editForm}>
                    <form onSubmit={editForm.handleSubmit(handleSaveProjectEdit)} className="space-y-4 py-4">
                        <FormField
                            control={editForm.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nom du Projet</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Nom du projet" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={editForm.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Description du projet" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={editForm.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Statut</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Actif, Terminé" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline" disabled={isUpdatingProject}>
                                    Annuler
                                </Button>
                            </DialogClose>
                            <Button type="submit" disabled={isUpdatingProject}>
                                {isUpdatingProject && <Icons.loader className="mr-2 h-4 w-4 animate-spin" />}
                                Enregistrer
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>

        {/* Delete Project Confirmation Modal */}
        <AlertDialog open={isDeleteProjectConfirmModalOpen} onOpenChange={setIsDeleteProjectConfirmModalOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                    <AlertDialogDescription>
                        Êtes-vous sûr de vouloir supprimer le projet "{projectToDelete?.name}"? Cette action est irréversible.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setIsDeleteProjectConfirmModalOpen(false)} disabled={isDeletingProject}>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmDeleteProject} disabled={isDeletingProject} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                        {isDeletingProject ? <Icons.loader className="mr-2 h-4 w-4 animate-spin" /> : <Icons.trash className="mr-2 h-4 w-4" />}
                        Supprimer
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
    );
}