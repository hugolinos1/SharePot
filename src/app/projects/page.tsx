
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
      setProjects(fetchedProjects);

    } catch (error) {
      console.error("[ProjectsPage fetchProjects] Erreur:", error);
      setProjects([]);
    } finally {
      setIsFetchingProjects(false);
    }
  }, [currentUser]);

  const fetchAllSystemUsers = useCallback(async () => { 
    if (!currentUser || !isAdmin) { 
      setIsLoadingAllUserProfiles(false);
      setAllUserProfiles(userProfile ? [userProfile] : []); 
      return;
    }
    setIsLoadingAllUserProfiles(true);
    try {
      const usersCollectionRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersCollectionRef);
      const usersList = usersSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as AppUserType));
      setAllUserProfiles(usersList);
    } catch (error: any) {
      console.error("[ProjectsPage fetchAllSystemUsers] Erreur:", error);
      setAllUserProfiles([]);
    } finally {
      setIsLoadingAllUserProfiles(false);
    }
  }, [currentUser, isAdmin, userProfile]);

 useEffect(() => {
    if (currentUser) {
      fetchProjects();
      if (isAdmin) { 
        fetchAllSystemUsers();
      } else {
        setIsLoadingAllUserProfiles(false); 
      }
    }
  }, [currentUser, isAdmin, fetchProjects, fetchAllSystemUsers]);


  const handleViewProjectDetails = async (project: ProjectType) => {
    if (!currentUser) return;
    
    // On réinitialise les états pour éviter d'afficher les données du projet précédent
    setProjectModalMemberProfiles([]);
    setDetailedModalExpenses([]);
    setSelectedProject(project);
    setCurrentBudget(project.budget != null ? project.budget : '');
    setCurrentNotes(project.notes || '');
    
    setIsLoadingProjectModalMemberProfiles(true);
    setIsLoadingDetailedModalExpenses(true);

    try {
      // 1. Récupération des profils des membres
      if (project.members && project.members.length > 0) {
        const profilePromises = project.members.map(uid => firestoreGetDoc(doc(db, "users", uid)));
        const profileDocsSnapshots = await Promise.allSettled(profilePromises);
        
        const fetchedProfilesArray: AppUserType[] = [];
        profileDocsSnapshots.forEach((result, index) => {
          const uid = project.members[index];
          if (result.status === 'fulfilled' && result.value.exists()) {
            fetchedProfilesArray.push({ id: result.value.id, ...result.value.data() } as AppUserType);
          } else {
            fetchedProfilesArray.push({ id: uid, name: `Inconnu (${uid.substring(0,4)})`, email: "N/A", isAdmin: false, avatarUrl: '' });
          }
        });
        setProjectModalMemberProfiles(fetchedProfilesArray);
      }

      // 2. Récupération des dépenses détaillées
      const expensesQuery = query(collection(db, "expenses"), where("projectId", "==", project.id));
      const expensesSnapshot = await getDocs(expensesQuery);
      const fetchedExpenses = expensesSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as ExpenseItem));
      setDetailedModalExpenses(fetchedExpenses);

    } catch (error: any) {
      console.error("[ProjectsPage handleViewProjectDetails] Error:", error);
      toast({ title: "Erreur de chargement", description: "Impossible de récupérer tous les détails.", variant: "destructive"});
    } finally {
      setIsLoadingProjectModalMemberProfiles(false);
      setIsLoadingDetailedModalExpenses(false);
    }
  };


  const handleCloseProjectDetails = () => {
    setSelectedProject(null);
    setEditingBudget(false);
    setEditingNotes(false);
    setProjectModalMemberProfiles([]);
    setDetailedModalExpenses([]);
    inviteMemberForm.reset();
  };

  const handleSaveBudget = async () => {
    if (selectedProject && typeof currentBudget === 'number' && currentBudget >=0 && currentUser) {
      if (selectedProject.ownerId !== currentUser.uid && !isAdmin) {
        toast({ title: "Non autorisé", variant: "destructive" });
        return;
      }
      setIsProcessingProjectAction(true);
      try {
        const projectRef = doc(db, "projects", selectedProject.id);
        await updateDoc(projectRef, { budget: currentBudget, updatedAt: serverTimestamp() });
        const updatedProject = { ...selectedProject, budget: currentBudget, updatedAt: Timestamp.now() }; 
        setSelectedProject(updatedProject);
        setProjects(prevProjects => prevProjects.map(p => p.id === selectedProject.id ? updatedProject : p));
        toast({ title: "Budget mis à jour" });
      } catch (error) {
        toast({ title: "Erreur", variant: "destructive" });
      } finally {
        setIsProcessingProjectAction(false);
        setEditingBudget(false);
      }
    }
  };

  const handleSaveNotes = async () => {
    if (selectedProject && currentUser) {
      setIsProcessingProjectAction(true);
      try {
        const projectRef = doc(db, "projects", selectedProject.id);
        await updateDoc(projectRef, { notes: currentNotes, updatedAt: serverTimestamp() });
        const updatedProject = { ...selectedProject, notes: currentNotes, updatedAt: Timestamp.now() };
        setSelectedProject(updatedProject);
        setProjects(prevProjects => prevProjects.map(p => p.id === selectedProject.id ? updatedProject : p));
        toast({ title: "Notes mises à jour" });
      } catch (error) {
        toast({ title: "Erreur", variant: "destructive" });
      } finally {
        setIsProcessingProjectAction(false);
        setEditingNotes(false);
      }
    }
  };

  const handleDeleteProject = async () => {
    if (selectedProject && currentUser) {
      setIsProcessingProjectAction(true);
      try {
        await deleteDoc(doc(db, "projects", selectedProject.id));
        setProjects(projects.filter(p => p.id !== selectedProject.id));
        toast({ title: "Projet supprimé" });
        setSelectedProject(null); 
        setIsDeleteConfirmModalOpen(false);
      } catch (error) {
        toast({ title: "Erreur", variant: "destructive" });
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
    if (!selectedProject || !currentUser) return;
    const currentMemberIds = new Set(selectedProject.members);
    const systemUsersToFilterFrom = isAdmin ? allUserProfiles : (userProfile ? [userProfile] : []);
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
      toast({ title: "Membres ajoutés" });
      setIsAddMemberDialogOpen(false);
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setIsProcessingProjectAction(false);
    }
  };

  const onInviteMemberSubmit = async (values: InviteMemberFormValues) => {
    if (!selectedProject || !currentUser) return;
    setIsSendingInvite(true);
    try {
      const baseUrl = window.location.origin;
      const invitationLink = `${baseUrl}/register?projectId=${selectedProject.id}&invitedEmail=${encodeURIComponent(values.email)}`;
      const response = await fetch('/api/send-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toEmail: values.email, projectName: selectedProject.name, invitationLink }),
      });
      if (response.ok) {
        toast({ title: "Invitation envoyée", description: `Un email a été envoyé à ${values.email}.` });
        inviteMemberForm.reset();
      } else {
        throw new Error('Erreur SMTP');
      }
    } catch (error: any) {
      toast({ title: "Échec de l'invitation", description: "Vérifiez la configuration SMTP.", variant: "destructive" });
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
                    src={userProfile?.avatarUrl || undefined}
                    alt={userProfile?.name || "User"}
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
                  <Icons.user className="mr-2 h-4 w-4" /> Mon Profil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <Icons.logOut className="mr-2 h-4 w-4" /> Déconnexion
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
                {[1,2,3].map(i => <Card key={i} className="animate-pulse bg-muted h-48 rounded-xl"></Card>)}
            </div>
        ) : projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card key={project.id} className="hover:shadow-lg transition-shadow duration-300 flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-xl">{project.name}</CardTitle>
                    <Badge variant={getStatusBadgeVariant(project.status)}>{project.status}</Badge>
                  </div>
                  <CardDescription className="h-10 overflow-hidden text-ellipsis">{project.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="flex items-center justify-between mb-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="font-semibold">{(project.totalExpenses || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Activité</p>
                      <p>{formatDateFromTimestamp(project.lastActivity)}</p>
                    </div>
                  </div>
                  {(project.budget || 0) > 0 && (
                    <div className="mb-4">
                      <Progress value={((project.totalExpenses || 0) / (project.budget || 1)) * 100} className="h-2" />
                    </div>
                  )}
                </CardContent>
                <CardFooter className="p-4 pt-0 border-t mt-auto">
                     <div className="flex items-center justify-between w-full">
                        <div className="flex -space-x-2">
                            {project.members.slice(0, 3).map((uid, i) => (
                              <Avatar key={uid} className="h-8 w-8 border-2 border-background">
                                <AvatarFallback className="text-xs">{uid.substring(0,2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                            ))}
                        </div>
                        <Button variant="link" onClick={() => handleViewProjectDetails(project)} className="text-primary">
                            Détails <Icons.arrowRight className="ml-1 h-4 w-4" />
                        </Button>
                    </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="py-10 text-center">
            <CardContent>
              <Icons.folderKanban className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">Aucun projet trouvé</h3>
              <Button onClick={() => router.push('/projects/create')} className="mt-6">Créer un projet</Button>
            </CardContent>
          </Card>
        )}
      </main>

      {selectedProject && (
        <Dialog open={!!selectedProject} onOpenChange={(isOpen) => !isOpen && handleCloseProjectDetails()}>
          <DialogContent className="sm:max-w-2xl md:max-w-4xl lg:max-w-7xl max-h-[95vh] flex flex-col overflow-hidden">
            <DialogHeader>
              <DialogTitle className="text-2xl">{selectedProject.name}</DialogTitle>
              <DialogDescription>{selectedProject.description}</DialogDescription>
            </DialogHeader>
            
            <div className="flex-grow overflow-y-auto pr-2 py-4">
              {(!isLoadingProjectModalMemberProfiles && !isLoadingDetailedModalExpenses) ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    <ProjectExpenseSettlement
                      project={selectedProject}
                      memberProfilesOfProject={projectModalMemberProfiles}
                      detailedProjectExpenses={detailedModalExpenses}
                      isLoadingMemberProfiles={false}
                      isLoadingDetailedExpenses={false}
                    />
                    <Card>
                      <CardHeader><CardTitle>Dépenses Récentes</CardTitle></CardHeader>
                      <CardContent>
                        {detailedModalExpenses.length > 0 ? (
                          <ul className="space-y-3">
                            {detailedModalExpenses.slice(0,5).map((exp) => (
                              <li key={exp.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                <div><p className="font-medium">{exp.title}</p><p className="text-xs text-muted-foreground">{formatDateFromTimestamp(exp.expenseDate)}</p></div>
                                <div className="text-right"><p className="font-semibold">{exp.amount.toLocaleString('fr-FR', { style: 'currency', currency: exp.currency })}</p><p className="text-xs text-muted-foreground">Par: {exp.paidByName}</p></div>
                              </li>
                            ))}
                          </ul>
                        ) : <p className="text-muted-foreground text-sm">Aucune dépense.</p>}
                      </CardContent>
                    </Card>
                  </div>

                  <div className="lg:col-span-1 space-y-6">
                    <Card>
                      <CardHeader><CardTitle>Budget</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-lg">{(selectedProject.budget || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
                          <Button variant="ghost" size="icon" onClick={() => setEditingBudget(true)}><Icons.edit className="h-4 w-4"/></Button>
                        </div>
                        {editingBudget && (
                          <div className="flex gap-2"><Input type="number" value={currentBudget} onChange={e => setCurrentBudget(parseFloat(e.target.value))} /><Button onClick={handleSaveBudget}>OK</Button></div>
                        )}
                        <div><p className="text-xs text-muted-foreground">Dépenses : {selectedProject.totalExpenses.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p></div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader><CardTitle>Membres</CardTitle></CardHeader>
                      <CardContent className="space-y-3">
                        {projectModalMemberProfiles.map(m => (
                          <div key={m.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
                            <Avatar className="h-6 w-6"><AvatarImage src={m.avatarUrl}/><AvatarFallback>{getAvatarFallbackText(m.name, m.email)}</AvatarFallback></Avatar>
                            <span className="text-sm font-medium">{m.name}</span>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" className="w-full" onClick={handleOpenAddMemberDialog}>Ajouter</Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader><CardTitle>Inviter</CardTitle></CardHeader>
                      <CardContent>
                        <Form {...inviteMemberForm}><form onSubmit={inviteMemberForm.handleSubmit(onInviteMemberSubmit)} className="space-y-2">
                          <FormField control={inviteMemberForm.control} name="email" render={({field}) => <Input placeholder="email" {...field} />}></FormField>
                          <Button type="submit" disabled={isSendingInvite} className="w-full">{isSendingInvite ? <Icons.loader className="animate-spin"/> : "Envoyer"}</Button>
                        </form></Form>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20"><Icons.loader className="h-10 w-10 animate-spin mx-auto text-primary" /><p className="mt-4">Chargement des détails...</p></div>
              )}
            </div>
            
            <ModalDialogFooter className="border-t pt-4">
              <Button onClick={() => router.push(`/expenses/new?projectId=${selectedProject.id}`)}>Nouvelle dépense</Button>
              <DialogClose asChild><Button variant="outline">Fermer</Button></DialogClose>
            </ModalDialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
