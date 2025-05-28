
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Icons } from '@/components/icons';
import type { Project as ProjectType, User as AppUserType } from '@/data/mock-data';
import type { ExpenseItem } from '@/app/expenses/page';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter as ModalDialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ProjectExpenseSettlement } from '@/components/projects/project-expense-settlement';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, serverTimestamp, Timestamp, query, where, arrayUnion, getDoc as firestoreGetDoc } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

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

const formatDateFromTimestamp = (timestampInput: Timestamp | string | undefined | Date): string => {
  if (!timestampInput) return 'N/A';
  let dateToFormat: Date;
  if (timestampInput instanceof Date) {
    dateToFormat = timestampInput;
  } else if (typeof timestampInput === 'string') {
    try {
      dateToFormat = new Date(timestampInput);
    } catch (e) { return 'Date invalide'; }
  } else if (timestampInput instanceof Timestamp) {
    dateToFormat = timestampInput.toDate();
  } else {
    return 'Date invalide';
  }
  return format(dateToFormat, 'PP', { locale: fr });
};

const inviteMemberFormSchema = z.object({
  email: z.string().email({ message: "Veuillez entrer une adresse e-mail valide." }),
});
type InviteMemberFormValues = z.infer<typeof inviteMemberFormSchema>;


export default function ProjectsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, userProfile, isAdmin, loading: authLoading, logout } = useAuth();

  const [projects, setProjects] = useState<ProjectType[]>([]);
  const [isFetchingProjects, setIsFetchingProjects] = useState(true);
  const [selectedProject, setSelectedProject] = useState<ProjectType | null>(null);
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);

  const [allUserProfiles, setAllUserProfiles] = useState<AppUserType[]>([]); 
  const [isLoadingAllUserProfiles, setIsLoadingAllUserProfiles] = useState(true); 

  const [projectModalMemberProfiles, setProjectModalMemberProfiles] = useState<AppUserType[]>([]);
  const [isLoadingProjectModalMemberProfiles, setIsLoadingProjectModalMemberProfiles] = useState(false);
  const [detailedModalExpenses, setDetailedModalExpenses] = useState<ExpenseItem[]>([]);
  const [isLoadingDetailedModalExpenses, setIsLoadingDetailedModalExpenses] = useState(false);

  const [editingBudget, setEditingBudget] = useState(false);
  const [currentBudget, setCurrentBudget] = useState<number | string>('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [currentNotes, setCurrentNotes] = useState('');

  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [usersToAddToProject, setUsersToAddToProject] = useState<string[]>([]);
  const [availableUsersForProject, setAvailableUsersForProject] = useState<AppUserType[]>([]);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [isProcessingProjectAction, setIsProcessingProjectAction] = useState(false);

  const inviteMemberForm = useForm<InviteMemberFormValues>({
    resolver: zodResolver(inviteMemberFormSchema),
    defaultValues: {
      email: "",
    },
  });

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.replace('/login');
    }
  }, [authLoading, currentUser, router]);

  const fetchProjects = useCallback(async () => {
    if (!currentUser) return;
    setIsFetchingProjects(true);
    try {
      const projectsCollectionRef = collection(db, "projects");
      const memberQuery = query(projectsCollectionRef, where("members", "array-contains", currentUser.uid));
      const ownerQuery = query(projectsCollectionRef, where("ownerId", "==", currentUser.uid));

      const [memberSnapshot, ownerSnapshot] = await Promise.all([
        getDocs(memberQuery),
        getDocs(ownerQuery)
      ]);

      const projectsMap = new Map<string, ProjectType>();
      memberSnapshot.docs.forEach(docSnap => projectsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as ProjectType));
      ownerSnapshot.docs.forEach(docSnap => {
        if (!projectsMap.has(docSnap.id)) {
          projectsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as ProjectType);
        }
      });
      
      const fetchedProjects = Array.from(projectsMap.values());
      console.log("[ProjectsPage fetchProjects] Fetched projects for user:", fetchedProjects.length, "items.");
      setProjects(fetchedProjects);

    } catch (error) {
      console.error("[ProjectsPage fetchProjects] Erreur lors de la récupération des projets: ", error);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger les projets.",
        variant: "destructive",
      });
      setProjects([]);
    } finally {
      setIsFetchingProjects(false);
    }
  }, [currentUser, toast]);

  const fetchAllSystemUsers = useCallback(async () => { 
    if (!currentUser || !isAdmin) { 
      setIsLoadingAllUserProfiles(false);
      setAllUserProfiles(userProfile ? [userProfile] : []); 
      return;
    }
    console.log("[ProjectsPage fetchAllSystemUsers] Admin fetching all system users.");
    setIsLoadingAllUserProfiles(true);
    try {
      const usersCollectionRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersCollectionRef);
      const usersList = usersSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as AppUserType));
      setAllUserProfiles(usersList);
      console.log("[ProjectsPage fetchAllSystemUsers] Successfully fetched allUserProfiles (Admin):", usersList.length);
    } catch (error: any) {
      console.error("[ProjectsPage fetchAllSystemUsers] Erreur lors de la récupération de tous les profils utilisateurs (Admin): ", error);
      toast({ title: "Erreur (Profils Admin)", description: `Impossible de charger tous les profils: ${error.message}`, variant: "destructive"});
      setAllUserProfiles([]);
    } finally {
      setIsLoadingAllUserProfiles(false);
    }
  }, [currentUser, isAdmin, userProfile, toast]);

 useEffect(() => {
    if (currentUser) {
      fetchProjects();
      if (isAdmin) { 
        fetchAllSystemUsers();
      } else {
        setIsLoadingAllUserProfiles(false); 
      }
    } else {
      setProjects([]);
      setIsFetchingProjects(true);
      setAllUserProfiles([]);
      setIsLoadingAllUserProfiles(true);
    }
  }, [currentUser, isAdmin, fetchProjects, fetchAllSystemUsers]);


  const handleViewProjectDetails = async (project: ProjectType) => {
    console.log("[ProjectsPage handleViewProjectDetails] Viewing project:", JSON.stringify(project, null, 2));
    if (!currentUser) {
        toast({ title: "Erreur", description: "Utilisateur non connecté.", variant: "destructive" });
        return;
    }
    setSelectedProject(project);
    setCurrentBudget(project.budget != null ? project.budget : '');
    setCurrentNotes(project.notes || '');
    
    setIsLoadingProjectModalMemberProfiles(true);
    setIsLoadingDetailedModalExpenses(true);

    // Fetch member profiles
    if (project.members && project.members.length > 0) {
      console.log(`[ProjectsPage handleViewProjectDetails] Fetching profiles for member UIDs: ${project.members.join(', ')}`);
      try {
        const profilePromises = project.members.map(uid => {
          console.log(`[ProjectsPage handleViewProjectDetails] Attempting to fetch profile for UID: ${uid}`);
          return firestoreGetDoc(doc(db, "users", uid));
        });
        const profileDocsSnapshots = await Promise.allSettled(profilePromises);
        
        const fetchedProfilesArray: AppUserType[] = [];
        profileDocsSnapshots.forEach((result, index) => {
          const uid = project.members[index];
          if (result.status === 'fulfilled') {
            const docSnapshot = result.value;
            if (docSnapshot.exists()) {
              fetchedProfilesArray.push({ id: docSnapshot.id, ...docSnapshot.data() } as AppUserType);
            } else {
              console.warn(`[ProjectsPage handleViewProjectDetails] Document for UID ${uid} DOES NOT EXIST in 'users' collection. Adding fallback.`);
              fetchedProfilesArray.push({ id: uid, name: `Utilisateur Inconnu (ID: ${uid.substring(0,6)}...)` , email: "N/A", isAdmin: false, avatarUrl: '' });
            }
          } else {
            console.error(`[ProjectsPage handleViewProjectDetails] Error fetching profile for UID ${uid}:`, result.reason);
            fetchedProfilesArray.push({ id: uid, name: `Erreur Chargement (ID: ${uid.substring(0,6)}...)` , email: "N/A", isAdmin: false, avatarUrl: '' });
          }
        });
        setProjectModalMemberProfiles(fetchedProfilesArray);
        console.log(`[ProjectsPage handleViewProjectDetails] Fetched ${fetchedProfilesArray.length} member profiles for modal.`, fetchedProfilesArray.map(p=>({id:p.id, name:p.name})));
      } catch (error: any) {
        console.error("[ProjectsPage handleViewProjectDetails] Outer error fetching member profiles for modal:", error.message, error);
        setProjectModalMemberProfiles([]); 
      } finally {
        setIsLoadingProjectModalMemberProfiles(false);
      }
    } else {
      console.log("[ProjectsPage handleViewProjectDetails] Project has no members.");
      setProjectModalMemberProfiles([]);
      setIsLoadingProjectModalMemberProfiles(false);
    }

    // Fetch detailed expenses for the project
    if (project.id) {
      console.log(`[ProjectsPage handleViewProjectDetails] Fetching detailed expenses for project ${project.name} (ID: ${project.id})`);
      try {
        const expensesQuery = query(collection(db, "expenses"), where("projectId", "==", project.id));
        const expensesSnapshot = await getDocs(expensesQuery);
        const fetchedExpenses = expensesSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as ExpenseItem));
        setDetailedModalExpenses(fetchedExpenses);
        console.log(`[ProjectsPage handleViewProjectDetails] Fetched ${fetchedExpenses.length} detailed expenses for project ${project.name}:`, fetchedExpenses.map(e => ({title: e.title, amount: e.amount, amountEUR: e.amountEUR })));
      } catch (error: any) {
        console.error(`[ProjectsPage handleViewProjectDetails] Erreur lors de la récupération des dépenses détaillées pour le projet ${project.name}:`, error);
        setDetailedModalExpenses([]); 
      } finally {
        setIsLoadingDetailedModalExpenses(false);
      }
    } else {
      console.warn("[ProjectsPage handleViewProjectDetails] Project ID is missing, cannot fetch detailed expenses.");
      setDetailedModalExpenses([]);
      setIsLoadingDetailedModalExpenses(false);
    }
  };


  const handleCloseProjectDetails = () => {
    setSelectedProject(null);
    setEditingBudget(false);
    setEditingNotes(false);
    // Reset modal specific data to avoid showing stale data on next open
    setProjectModalMemberProfiles([]);
    setDetailedModalExpenses([]);
    setIsLoadingProjectModalMemberProfiles(false);
    setIsLoadingDetailedModalExpenses(false);
    inviteMemberForm.reset();
  };

  const handleSaveBudget = async () => {
    if (selectedProject && typeof currentBudget === 'number' && currentBudget >=0 && currentUser) {
      if (selectedProject.ownerId !== currentUser.uid && !isAdmin) {
        toast({ title: "Non autorisé", description: "Seul le propriétaire ou un admin peut modifier le budget.", variant: "destructive" });
        return;
      }
      setIsProcessingProjectAction(true);
      try {
        const projectRef = doc(db, "projects", selectedProject.id);
        await updateDoc(projectRef, {
          budget: currentBudget,
          updatedAt: serverTimestamp(),
        });
        const updatedProject = { ...selectedProject, budget: currentBudget, updatedAt: Timestamp.now() }; 
        setSelectedProject(updatedProject);
        setProjects(prevProjects => prevProjects.map(p => p.id === selectedProject.id ? updatedProject : p));
        toast({ title: "Budget mis à jour", description: `Le budget du projet "${selectedProject.name}" est maintenant de ${currentBudget.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}.` });
      } catch (error) {
        console.error("Erreur maj budget: ", error);
        toast({ title: "Erreur", description: "Impossible de mettre à jour le budget.", variant: "destructive" });
      } finally {
        setIsProcessingProjectAction(false);
        setEditingBudget(false);
      }
    } else {
       toast({ title: "Valeur invalide", description: "Le budget doit être un nombre positif ou nul.", variant: "destructive" });
    }
  };

  const handleSaveNotes = async () => {
    if (selectedProject && currentUser) {
      if (selectedProject.ownerId !== currentUser.uid && !isAdmin) {
        toast({ title: "Non autorisé", description: "Seul le propriétaire ou un admin peut modifier les notes.", variant: "destructive" });
        return;
      }
      setIsProcessingProjectAction(true);
      try {
        const projectRef = doc(db, "projects", selectedProject.id);
        await updateDoc(projectRef, {
          notes: currentNotes,
          updatedAt: serverTimestamp(),
        });
        const updatedProject = { ...selectedProject, notes: currentNotes, updatedAt: Timestamp.now() };
        setSelectedProject(updatedProject);
        setProjects(prevProjects => prevProjects.map(p => p.id === selectedProject.id ? updatedProject : p));
        toast({ title: "Notes mises à jour", description: `Les notes du projet "${selectedProject.name}" ont été enregistrées.` });
      } catch (error) {
        console.error("Erreur maj notes: ", error);
        toast({ title: "Erreur", description: "Impossible de mettre à jour les notes.", variant: "destructive" });
      } finally {
        setIsProcessingProjectAction(false);
        setEditingNotes(false);
      }
    }
  };

  const handleDeleteProject = async () => {
    if (selectedProject && currentUser) {
      if (selectedProject.ownerId !== currentUser.uid && !isAdmin) {
        toast({ title: "Non autorisé", description: "Seul le propriétaire ou un admin peut supprimer un projet.", variant: "destructive" });
        setIsDeleteConfirmModalOpen(false);
        return;
      }
      setIsProcessingProjectAction(true);
      try {
        await deleteDoc(doc(db, "projects", selectedProject.id));
        setProjects(projects.filter(p => p.id !== selectedProject.id));
        toast({ title: "Projet supprimé", description: `Le projet "${selectedProject.name}" a été supprimé.` });
        setSelectedProject(null); 
        setIsDeleteConfirmModalOpen(false);
      } catch (error) {
        console.error("Erreur suppression projet: ", error);
        toast({ title: "Erreur", description: "Impossible de supprimer le projet.", variant: "destructive" });
      } finally {
        setIsProcessingProjectAction(false);
      }
    }
  };

  const getStatusBadgeVariant = (status: string | undefined) => {
    switch (status?.toLowerCase()) {
      case 'actif': return 'default';
      case 'en attente': return 'secondary';
      case 'terminé': return 'outline';
      default: return 'secondary';
    }
  };

  const handleOpenAddMemberDialog = async () => {
    if (!selectedProject || !currentUser) {
        toast({ title: "Erreur", description: "Aucun projet sélectionné ou utilisateur non connecté.", variant: "destructive" });
        return;
    }
    if (selectedProject.ownerId !== currentUser.uid && !isAdmin) {
      toast({ title: "Action non autorisée", description: "Seul le propriétaire du projet ou un administrateur peut ajouter des membres.", variant: "destructive" });
      return;
    }
    
    // Ensure allUserProfiles is populated if admin, otherwise it's handled by main useEffect
    if (isAdmin && allUserProfiles.length === 0 && !isLoadingAllUserProfiles){
        await fetchAllSystemUsers(); 
    }
    // After ensuring allUserProfiles is populated (especially for admin)
    const currentMemberIds = new Set(selectedProject.members);
    const systemUsersToFilterFrom = isAdmin ? allUserProfiles : (userProfile ? [userProfile] : []); // Non-admin cannot add others via this dialog.
    
    const available = systemUsersToFilterFrom.filter(user => !currentMemberIds.has(user.id));
    setAvailableUsersForProject(available);
    setUsersToAddToProject([]); 
    setIsAddMemberDialogOpen(true);
  };

  const handleToggleUserForAddition = (userId: string) => {
    setUsersToAddToProject(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleConfirmAddMembers = async () => {
    if (!selectedProject || usersToAddToProject.length === 0 || !currentUser) return;
     if (selectedProject.ownerId !== currentUser.uid && !isAdmin) {
        toast({ title: "Non autorisé", description: "Seul le propriétaire ou un admin peut ajouter des membres.", variant: "destructive" });
        return;
    }
    setIsProcessingProjectAction(true);
    try {
      const projectRef = doc(db, "projects", selectedProject.id);
      await updateDoc(projectRef, {
        members: arrayUnion(...usersToAddToProject),
        updatedAt: serverTimestamp(),
      });

      const updatedMembers = Array.from(new Set([...selectedProject.members, ...usersToAddToProject]));
      const updatedProjectData = { ...selectedProject, members: updatedMembers, updatedAt: Timestamp.now() }; 

      setSelectedProject(updatedProjectData);
      setProjects(prevProjects => prevProjects.map(p => p.id === selectedProject.id ? updatedProjectData : p));

      // Refresh projectModalMemberProfiles with new members
      const newModalProfiles: AppUserType[] = [];
      for (const uid of updatedMembers) {
          const userDocRef = doc(db, "users", uid);
          const docSnapshot = await firestoreGetDoc(userDocRef); 
          if (docSnapshot.exists()) {
            newModalProfiles.push({ id: docSnapshot.id, ...docSnapshot.data() } as AppUserType);
          } else {
            newModalProfiles.push({ id: uid, name: `Utilisateur Inconnu (ID: ${uid.substring(0,6)}...)`, email: "N/A", isAdmin: false, avatarUrl: '' });
          }
      }
      setProjectModalMemberProfiles(newModalProfiles);

      toast({ title: "Membres ajoutés", description: `${usersToAddToProject.length} membre(s) ont été ajoutés au projet.` });
      setIsAddMemberDialogOpen(false);
    } catch (error) {
      console.error("Erreur lors de l'ajout de membres: ", error);
      toast({ title: "Erreur", description: "Impossible d'ajouter les membres.", variant: "destructive" });
    } finally {
      setIsProcessingProjectAction(false);
    }
  };

  const onInviteMemberSubmit = async (values: InviteMemberFormValues) => {
    if (!selectedProject || !currentUser) {
      toast({ title: "Erreur", description: "Projet non sélectionné ou utilisateur non connecté.", variant: "destructive" });
      return;
    }
    if (selectedProject.ownerId !== currentUser.uid && !isAdmin) {
      toast({ title: "Action non autorisée", description: "Seul le propriétaire du projet ou un administrateur peut inviter des membres.", variant: "destructive" });
      return;
    }

    setIsSendingInvite(true);
    const baseUrl = window.location.origin;
    const invitationLink = `${baseUrl}/register?projectId=${selectedProject.id}&invitedEmail=${encodeURIComponent(values.email)}`;
    console.log(`[ProjectsPage] Generated invitation link: ${invitationLink}`);

    try {
      const response = await fetch('/api/send-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          toEmail: values.email, 
          projectName: selectedProject.name,
          invitationLink: invitationLink 
        }),
      });
      const result = await response.json();
      if (response.ok) {
        toast({
          title: "Invitation envoyée",
          description: `Une invitation a été envoyée à ${values.email} pour rejoindre le projet "${selectedProject.name}".`,
        });
        inviteMemberForm.reset();
      } else {
        throw new Error(result.error || 'Erreur inconnue lors de l\'envoi de l\'invitation.');
      }
    } catch (error: any) {
      console.error("Erreur API lors de l'envoi de l'invitation:", error);
      toast({
        title: "Échec de l'invitation",
        description: error.message || "Impossible d'envoyer l'invitation. Vérifiez la configuration du serveur d'e-mails.",
        variant: "destructive",
      });
    } finally {
      setIsSendingInvite(false);
    }
  };


  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error("Erreur de déconnexion:", error);
      toast({ title: "Erreur de déconnexion", variant: "destructive" });
    }
  };

  if (authLoading || !currentUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Icons.loader className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-card px-6 shadow-sm">
          <Link href="/dashboard" className="text-xl font-bold text-sidebar-header-title-color flex items-center">
             <Icons.dollarSign className="mr-2 h-7 w-7"/>
             SharePot
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

      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 flex-grow">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">Gestion des Projets</h2>
            <p className="text-muted-foreground">Créez et gérez vos projets collaboratifs.</p>
          </div>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <Button onClick={() => router.push('/projects/create')}>
              <Icons.plus className="mr-2 h-4 w-4" /> Nouveau Projet
            </Button>
            <Link href="/dashboard" passHref>
              <Button variant="outline">
                <Icons.home className="mr-2 h-4 w-4" /> Tableau de Bord
              </Button>
            </Link>
          </div>
        </div>

        {isFetchingProjects ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1,2,3].map(i => (
                    <Card key={i} className="flex flex-col">
                        <CardHeader><CardTitle><Label className="animate-pulse bg-muted h-6 w-3/4 rounded"></Label></CardTitle><CardDescription className="animate-pulse bg-muted h-4 w-full rounded mt-1"></CardDescription></CardHeader>
                        <CardContent className="flex-grow space-y-3">
                            <div className="animate-pulse bg-muted h-5 w-1/2 rounded"></div>
                            <div className="animate-pulse bg-muted h-5 w-1/3 rounded"></div>
                            <div className="animate-pulse bg-muted h-2 w-full rounded"></div>
                        </CardContent>
                        <CardFooter className="p-4 pt-0 border-t mt-auto"><div className="animate-pulse bg-muted h-8 w-full rounded"></div></CardFooter>
                    </Card>
                ))}
            </div>
        ) : projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              // Ensure allUserProfiles is available before trying to find owner profile
              const ownerProfile = !isLoadingAllUserProfiles && allUserProfiles.find(user => user.id === project.ownerId);
              console.log(`[ProjectsPage Card Render] Project: ${project.name}, Owner ID: ${project.ownerId}, Found Owner Profile:`, ownerProfile ? {id: ownerProfile.id, name: ownerProfile.name} : undefined, "isLoadingAllUserProfiles:", isLoadingAllUserProfiles);
              const ownerName = (ownerProfile?.name && ownerProfile.name.trim() !== '') ? ownerProfile.name : project.ownerId;

              // Ensure allUserProfiles is available for member avatars
              const displayableMemberProfilesOnCard = !isLoadingAllUserProfiles 
                ? project.members.map(uid => {
                    const profile = allUserProfiles.find(p => p.id === uid);
                    return profile || ({ id: uid, name: `Inconnu (ID: ${uid.substring(0,6)}...)` , email: "", isAdmin: false, avatarUrl: '' } as AppUserType);
                  }).filter(Boolean) as AppUserType[]
                : [];

              return (
              <Card key={project.id} className="hover:shadow-lg transition-shadow duration-300 flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-xl">{project.name}</CardTitle>
                    <Badge variant={getStatusBadgeVariant(project.status)}>{project.status}</Badge>
                  </div>
                  <CardDescription className="h-10 overflow-hidden text-ellipsis">{project.description}</CardDescription>
                  <p className="text-xs text-muted-foreground mt-1">Propriétaire : {ownerName}</p>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="flex items-center justify-between mb-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Dépenses totales</p>
                      <p className="font-semibold">{(project.totalExpenses || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Dernière activité</p>
                      <p>{formatDateFromTimestamp(project.lastActivity)}</p>
                    </div>
                  </div>

                  {(project.budget || 0) > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Budget</span>
                        <span>{(project.budget || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                      </div>
                      <Progress value={((project.totalExpenses || 0) / (project.budget || 1)) * 100} className="h-2" />
                    </div>
                  )}
                </CardContent>
                <CardFooter className="p-4 pt-0 border-t mt-auto">
                     <div className="flex items-center justify-between w-full">
                        <div className="flex -space-x-2 overflow-hidden">
                            {displayableMemberProfilesOnCard.slice(0, 3).map((memberProfile, index) => (
                            <Avatar key={memberProfile.id || index} className="h-8 w-8 border-2 border-background">
                                <AvatarImage
                                  src={memberProfile?.avatarUrl && memberProfile.avatarUrl.trim() !== '' ? memberProfile.avatarUrl : undefined}
                                  alt={memberProfile?.name || 'Membre'}
                                  data-ai-hint="member avatar"
                                />
                                <AvatarFallback className="text-xs">{getAvatarFallbackText(memberProfile?.name, memberProfile?.email)}</AvatarFallback>
                            </Avatar>
                            ))}
                            {project.members.length > 3 && (
                            <Avatar className="h-8 w-8 border-2 border-background bg-muted text-muted-foreground">
                                <AvatarFallback className="text-xs">+{project.members.length - 3}</AvatarFallback>
                            </Avatar>
                            )}
                        </div>
                        <Button variant="link" onClick={() => handleViewProjectDetails(project)} className="text-primary">
                            Voir détails <Icons.arrowRight className="ml-1 h-4 w-4" />
                        </Button>
                    </div>
                </CardFooter>
              </Card>
            )})}
          </div>
        ) : (
          <Card className="col-span-full">
            <CardContent className="py-10 text-center">
              <Icons.folderKanban className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">Aucun projet trouvé</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Commencez par créer un nouveau projet pour organiser vos dépenses, ou vérifiez que vous êtes bien membre des projets existants.
              </p>
              <Button onClick={() => router.push('/projects/create')} className="mt-6">
                <Icons.plus className="mr-2 h-4 w-4" /> Créer un projet
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      {selectedProject && (
        <Dialog open={!!selectedProject} onOpenChange={(isOpen) => !isOpen && handleCloseProjectDetails()}>
          <DialogContent className="sm:max-w-2xl md:max-w-4xl lg:max-w-7xl max-h-[95vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-2xl">{selectedProject.name}</DialogTitle>
              <DialogDescription>{selectedProject.description}</DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4 overflow-y-auto flex-grow pr-2">
              {console.log("[ProjectsPage Rendering DialogContent] Props for ProjectExpenseSettlement: project:", selectedProject ? selectedProject.id : 'null', "memberProfiles count:", projectModalMemberProfiles.length, "detailedExpenses count:", detailedModalExpenses.length, "isLoadingMembers:", isLoadingProjectModalMemberProfiles, "isLoadingExpenses:", isLoadingDetailedModalExpenses)}
              {(isLoadingProjectModalMemberProfiles || isLoadingDetailedModalExpenses) ? (
                <div className="lg:col-span-3 text-center py-10">
                  <Icons.loader className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">Chargement des détails du projet...</p>
                </div>
              ) : (
                <>
                  <div className="lg:col-span-2 space-y-6">
                    {selectedProject && projectModalMemberProfiles.length > 0 && detailedModalExpenses.length > 0 && (
                       <ProjectExpenseSettlement
                          project={selectedProject}
                          memberProfilesOfProject={projectModalMemberProfiles}
                          detailedProjectExpenses={detailedModalExpenses}
                        />
                    )}
                    {(selectedProject && (projectModalMemberProfiles.length === 0 || detailedModalExpenses.length === 0) && !isLoadingProjectModalMemberProfiles && !isLoadingDetailedModalExpenses) && (
                        <Card>
                            <CardHeader><CardTitle className="text-lg">Répartition des Paiements</CardTitle></CardHeader>
                            <CardContent><p className="text-sm text-muted-foreground">Données insuffisantes pour calculer la répartition (membres ou dépenses manquants pour ce projet).</p></CardContent>
                        </Card>
                    )}
                    <Card>
                      <CardHeader>
                        <CardTitle>Dépenses Récentes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(detailedModalExpenses || []).length > 0 ? (
                          <ul className="space-y-3">
                            {(detailedModalExpenses || []).slice(0,3).map((expense, index) => (
                              <li key={expense.id || index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                <div>
                                  <p className="font-medium">{expense.title}</p>
                                  <p className="text-sm text-muted-foreground">{formatDateFromTimestamp(expense.expenseDate)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold">
                                    {expense.amount.toLocaleString('fr-FR', { style: 'currency', currency: expense.currency })}
                                    {expense.currency !== 'EUR' && expense.amountEUR != null && (
                                      <span className="block text-xs text-muted-foreground font-normal">
                                        (env. {expense.amountEUR.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })})
                                      </span>
                                    )}
                                    {expense.currency !== 'EUR' && expense.amountEUR == null && (
                                      <span className="block text-xs text-muted-foreground font-normal">
                                        (env. N/A)
                                      </span>
                                    )}
                                  </p>
                                  {expense.paidByName && <p className="text-xs text-muted-foreground">Payé par: {expense.paidByName}</p>}
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-muted-foreground text-sm">Aucune dépense récente pour ce projet.</p>
                        )}
                        {(detailedModalExpenses || []).length > 3 && (
                            <Button variant="link" className="mt-4 w-full text-primary" onClick={() => router.push(`/expenses?projectId=${selectedProject.id}`)}>
                              Voir toutes les dépenses <Icons.arrowRight className="ml-1 h-4 w-4" />
                            </Button>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <div className="lg:col-span-1 space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Statistiques</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label className="text-sm text-muted-foreground">Budget total</Label>
                          {editingBudget ? (
                            <div className="flex items-center gap-2 mt-1">
                              <Input
                                type="number"
                                value={currentBudget}
                                onChange={(e) => setCurrentBudget(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                className="h-8"
                                data-ai-hint="budget input"
                                disabled={isProcessingProjectAction}
                              />
                              <Button size="sm" onClick={handleSaveBudget} disabled={isProcessingProjectAction}><Icons.check className="h-4 w-4"/></Button>
                              <Button size="sm" variant="ghost" onClick={() => { setEditingBudget(false); setCurrentBudget(selectedProject.budget || 0);}} disabled={isProcessingProjectAction}><Icons.x className="h-4 w-4"/></Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between mt-1">
                              <p className="font-semibold text-lg">
                                {(typeof currentBudget === 'number' ? currentBudget : (selectedProject.budget || 0)).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                              </p>
                              {(selectedProject.ownerId === currentUser?.uid || isAdmin) && (
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingBudget(true)} disabled={isProcessingProjectAction}>
                                    <Icons.edit className="h-4 w-4"/>
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Dépenses totales</p>
                          <p className="font-semibold text-lg">{(selectedProject.totalExpenses || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
                        </div>
                        {(selectedProject.budget || 0) > 0 && (
                          <>
                            <div>
                              <p className="text-sm text-muted-foreground">Budget restant</p>
                              <p className={`font-semibold text-lg ${(selectedProject.budget || 0) - (selectedProject.totalExpenses || 0) < 0 ? 'text-destructive' : 'text-green-600'}`}>
                                {((selectedProject.budget || 0) - (selectedProject.totalExpenses || 0)).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Pourcentage utilisé</p>
                              <Progress value={((selectedProject.totalExpenses || 0) / (selectedProject.budget || 1)) * 100} className="mt-1 h-2.5" />
                              <p className="text-right text-sm font-medium mt-1">{(((selectedProject.totalExpenses || 0) / (selectedProject.budget || 1)) * 100).toFixed(0)}%</p>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Membres ({isLoadingProjectModalMemberProfiles ? "..." : projectModalMemberProfiles.length})</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 max-h-48 overflow-y-auto">
                        {isLoadingProjectModalMemberProfiles ? (
                          <div className="text-center py-2"><Icons.loader className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
                        ) : (
                          projectModalMemberProfiles.map((member) => (
                              <div key={member.id} className="flex items-center space-x-3 p-2 bg-muted/50 rounded-lg">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage
                                    src={member?.avatarUrl && member.avatarUrl.trim() !== '' ? member.avatarUrl : undefined}
                                    alt={member?.name || 'Membre'}
                                    data-ai-hint="member avatar small"
                                  />
                                  <AvatarFallback className="text-xs">{getAvatarFallbackText(member?.name, member?.email)}</AvatarFallback>
                                </Avatar>
                                <p className="font-medium text-sm">{member?.name || member.id}</p>
                              </div>
                            ))
                        )}
                        {(selectedProject.ownerId === currentUser?.uid || isAdmin) && (
                          <Button variant="link" className="mt-2 w-full text-primary text-sm" onClick={handleOpenAddMemberDialog} disabled={isProcessingProjectAction || isLoadingAllUserProfiles }>
                              <Icons.plus className="mr-1 h-4 w-4" /> Ajouter un membre existant
                          </Button>
                        )}
                      </CardContent>
                    </Card>

                    {(selectedProject.ownerId === currentUser?.uid || isAdmin) && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Inviter un nouveau membre</CardTitle>
                          <CardDescription>
                            Envoyer une invitation par e-mail.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Form {...inviteMemberForm}>
                            <form onSubmit={inviteMemberForm.handleSubmit(onInviteMemberSubmit)} className="space-y-4">
                              <FormField
                                control={inviteMemberForm.control}
                                name="email"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Adresse e-mail</FormLabel>
                                    <FormControl>
                                      <Input placeholder="exemple@email.com" {...field} data-ai-hint="invite email input"/>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <Button type="submit" className="w-full" disabled={isSendingInvite || isProcessingProjectAction}>
                                {isSendingInvite ? (
                                  <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Icons.mail className="mr-2 h-4 w-4" />
                                )}
                                Envoyer l'invitation
                              </Button>
                            </form>
                          </Form>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                  <div className="lg:col-span-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Notes du projet</CardTitle>
                                {!editingNotes && (selectedProject.ownerId === currentUser?.uid || isAdmin) && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingNotes(true)} disabled={isProcessingProjectAction}>
                                        <Icons.edit className="h-4 w-4"/>
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent>
                                {editingNotes ? (
                                    <div className="space-y-2">
                                        <Textarea
                                            value={currentNotes}
                                            onChange={(e) => setCurrentNotes(e.target.value)}
                                            rows={5}
                                            className="text-sm"
                                            placeholder="Ajoutez des notes pour ce projet..."
                                            data-ai-hint="project notes input"
                                            disabled={isProcessingProjectAction}
                                        />
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" variant="ghost" onClick={() => {setEditingNotes(false); setCurrentNotes(selectedProject.notes || '');}} disabled={isProcessingProjectAction}>Annuler</Button>
                                            <Button size="sm" onClick={handleSaveNotes} disabled={isProcessingProjectAction}>Enregistrer Notes</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="prose max-w-none text-sm text-muted-foreground min-h-[50px]">
                                        {currentNotes || "Aucune note pour ce projet."}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </>
              )}
            </div>
            <ModalDialogFooter className="border-t pt-4 flex flex-col sm:flex-row sm:justify-between">
               <div>
                 <Button
                    variant="default"
                    onClick={() => router.push(`/expenses/new?projectId=${selectedProject.id}`)}
                    disabled={isProcessingProjectAction}
                    className="w-full sm:w-auto"
                  >
                    <Icons.plusSquare className="mr-2 h-4 w-4" />
                    Ajouter une dépense à ce projet
                  </Button>
               </div>
              <div className="flex flex-col sm:flex-row gap-2 mt-2 sm:mt-0">
                {(selectedProject.ownerId === currentUser?.uid || isAdmin) && (
                  <Button variant="destructive" onClick={() => {setIsDeleteConfirmModalOpen(true);}} disabled={isProcessingProjectAction}>
                    <Icons.trash className="mr-2 h-4 w-4" /> Supprimer le Projet
                  </Button>
                )}
                <DialogClose asChild>
                   <Button variant="outline" disabled={isProcessingProjectAction}>Fermer</Button>
                </DialogClose>
              </div>
            </ModalDialogFooter>
          </DialogContent>
        </Dialog>
      )}

       <Dialog open={isDeleteConfirmModalOpen} onOpenChange={setIsDeleteConfirmModalOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Confirmer la suppression</DialogTitle>
                    <DialogDescription>
                        Êtes-vous sûr de vouloir supprimer le projet "{selectedProject?.name}"? Cette action est irréversible.
                         Les dépenses associées à ce projet ne seront pas supprimées mais pourraient devenir orphelines.
                    </DialogDescription>
                </DialogHeader>
                <ModalDialogFooter>
                    <Button variant="outline" onClick={() => setIsDeleteConfirmModalOpen(false)} disabled={isProcessingProjectAction}>Annuler</Button>
                    <Button variant="destructive" onClick={handleDeleteProject} disabled={isProcessingProjectAction}>
                        {isProcessingProjectAction ? <Icons.loader className="mr-2 h-4 w-4 animate-spin"/> : <Icons.trash className="mr-2 h-4 w-4"/>}
                        Supprimer
                    </Button>
                </ModalDialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Ajouter des membres existants au projet "{selectedProject?.name}"</DialogTitle>
                    <DialogDescription>
                        Sélectionnez les utilisateurs à ajouter à ce projet.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-3 max-h-72 overflow-y-auto">
                    {isLoadingAllUserProfiles ? ( 
                        <p className="text-sm text-muted-foreground text-center py-2">Chargement des utilisateurs disponibles...</p>
                    ) : availableUsersForProject.length > 0 ? (
                        availableUsersForProject.map(user => (
                            <div key={user.id} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-md">
                                <Checkbox
                                    id={`add-member-${user.id}`}
                                    checked={usersToAddToProject.includes(user.id)}
                                    onCheckedChange={() => handleToggleUserForAddition(user.id)}
                                />
                                <Avatar className="h-8 w-8">
                                  <AvatarImage
                                    src={user?.avatarUrl && user.avatarUrl.trim() !== '' ? user.avatarUrl : undefined}
                                    alt={user?.name || user?.email || 'Utilisateur'}
                                    data-ai-hint="user avatar"
                                  />
                                  <AvatarFallback className="text-xs">{getAvatarFallbackText(user?.name, user?.email)}</AvatarFallback>
                                </Avatar>
                                <label
                                    htmlFor={`add-member-${user.id}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer"
                                >
                                    {user.name || user.email}
                                </label>
                            </div>
                        ))
                    ) : (
                        <p className="text-muted-foreground text-sm text-center py-2">
                           {allUserProfiles.length > 0 ? "Tous les utilisateurs existants sont déjà membres de ce projet ou aucun autre utilisateur disponible." : "Aucun utilisateur trouvé dans la base de données."}
                        </p>
                    )}
                </div>
                <ModalDialogFooter>
                    <Button variant="outline" onClick={() => setIsAddMemberDialogOpen(false)} disabled={isProcessingProjectAction}>Annuler</Button>
                    <Button onClick={handleConfirmAddMembers} disabled={isProcessingProjectAction || usersToAddToProject.length === 0}>
                        {isProcessingProjectAction ? <Icons.loader className="mr-2 h-4 w-4 animate-spin"/> : <Icons.plus className="mr-2 h-4 w-4"/>}
                        Ajouter les membres sélectionnés
                    </Button>
                </ModalDialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
