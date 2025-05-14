
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Icons } from '@/components/icons';
import type { Project as ProjectType, User as AppUserType } from '@/data/mock-data';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ProjectExpenseSettlement } from '@/components/projects/project-expense-settlement';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, serverTimestamp, Timestamp, query, where, arrayUnion, getDoc } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { Checkbox } from '@/components/ui/checkbox'; 

const getAvatarFallbackText = (name?: string | null, email?: string | null): string => {
  if (name) {
    const parts = name.split(' ');
    if (parts.length >= 2 && parts[0] && parts[parts.length-1]) {
      return (parts[0][0] || '').toUpperCase() + (parts[parts.length - 1][0] || '').toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
  if (email) {
    return email.substring(0, 2).toUpperCase();
  }
  return '??';
};

const formatDateFromTimestamp = (timestamp: Timestamp | string | undefined): string => {
  if (!timestamp) return 'N/A';
  if (typeof timestamp === 'string') { 
    try {
      return format(new Date(timestamp), 'PP', { locale: fr });
    } catch (e) { return 'Date invalide'; }
  }
  if (timestamp instanceof Timestamp) {
    return format(timestamp.toDate(), 'PP', { locale: fr });
  }
  return 'Date invalide';
};


export default function ProjectsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, userProfile, isAdmin, loading: authLoading } = useAuth();

  const [projects, setProjects] = useState<ProjectType[]>([]);
  const [isLoading, setIsLoading] = useState(true); 
  const [isFetchingProjects, setIsFetchingProjects] = useState(true);
  const [selectedProject, setSelectedProject] = useState<ProjectType | null>(null);
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);

  const [allUserProfiles, setAllUserProfiles] = useState<AppUserType[]>([]); 
  const [isLoadingAllUserProfiles, setIsLoadingAllUserProfiles] = useState(true); 

  const [projectModalMemberProfiles, setProjectModalMemberProfiles] = useState<AppUserType[]>([]);
  const [isLoadingProjectModalMemberProfiles, setIsLoadingProjectModalMemberProfiles] = useState(false);


  const [editingBudget, setEditingBudget] = useState(false);
  const [currentBudget, setCurrentBudget] = useState<number | string>('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [currentNotes, setCurrentNotes] = useState('');

  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [usersToAddToProject, setUsersToAddToProject] = useState<string[]>([]);
  const [availableUsersForProject, setAvailableUsersForProject] = useState<AppUserType[]>([]);


  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.replace('/login');
    }
  }, [authLoading, currentUser, router]);

  const fetchAllUserProfiles = useCallback(async () => {
    if (!currentUser) {
        console.warn("ProjectsPage: fetchAllUserProfiles called without currentUser.");
        setIsLoadingAllUserProfiles(false);
        setAllUserProfiles([]);
        return;
    }
    if (!isAdmin) { 
      setIsLoadingAllUserProfiles(false);
      if(userProfile) setAllUserProfiles([userProfile]); else setAllUserProfiles([]);
      console.log("ProjectsPage: fetchAllUserProfiles - Not admin. Minimal profiles set.");
      return;
    }
    console.log("ProjectsPage: fetchAllUserProfiles - Admin is fetching all user profiles.");
    setIsLoadingAllUserProfiles(true);
    try {
      const usersCollectionRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersCollectionRef);
      const usersList = usersSnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      } as AppUserType));
      setAllUserProfiles(usersList);
      console.log("ProjectsPage: fetchAllUserProfiles - Successfully fetched profiles:", usersList.length);
    } catch (error) {
      console.error("Erreur lors de la récupération de tous les profils utilisateurs (Admin - ProjectsPage): ", error);
      toast({
        title: "Erreur de chargement (Admin)",
        description: "Impossible de charger tous les profils utilisateurs.",
        variant: "destructive",
      });
      setAllUserProfiles([]);
    } finally {
      setIsLoadingAllUserProfiles(false);
    }
  }, [currentUser, isAdmin, userProfile, toast]);

  const fetchProjects = useCallback(async () => {
    if (!currentUser) return;
    setIsFetchingProjects(true);
    try {
      const projectsCollectionRef = collection(db, "projects");
      
      const memberQuery = query(projectsCollectionRef, 
        where("members", "array-contains", currentUser.uid)
      );
      
      const ownerQuery = query(projectsCollectionRef, 
        where("ownerId", "==", currentUser.uid)
      );

      const [memberSnapshot, ownerSnapshot] = await Promise.all([
        getDocs(memberQuery),
        getDocs(ownerQuery)
      ]);

      const projectsMap = new Map<string, ProjectType>();

      memberSnapshot.docs.forEach(docSnap => {
        projectsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as ProjectType);
      });

      ownerSnapshot.docs.forEach(docSnap => {
        projectsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as ProjectType);
      });
      
      setProjects(Array.from(projectsMap.values()));

    } catch (error) {
      console.error("Erreur lors de la récupération des projets: ", error);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger les projets.",
        variant: "destructive",
      });
    } finally {
      setIsFetchingProjects(false);
      setIsLoading(false); 
    }
  }, [currentUser, toast]);

  useEffect(() => {
    if (currentUser) {
      fetchProjects();
      console.log(`ProjectsPage: useEffect - currentUser exists. isAdmin from context: ${isAdmin}`);
      if (isAdmin) {
        console.log("ProjectsPage: useEffect - Calling fetchAllUserProfiles because isAdmin is true.");
        fetchAllUserProfiles();
      } else {
        console.log("ProjectsPage: useEffect - Not admin. Setting minimal allUserProfiles. Will rely on specific member fetching for modals.");
        if (userProfile) {
          setAllUserProfiles([userProfile]);
        } else {
          setAllUserProfiles([]);
        }
        setIsLoadingAllUserProfiles(false); 
      }
    } else {
      console.log("ProjectsPage: useEffect - currentUser is null.");
    }
  }, [currentUser, userProfile, isAdmin, fetchProjects, fetchAllUserProfiles]);


  const handleViewProjectDetails = async (project: ProjectType) => {
    console.log("ProjectsPage (handleViewProjectDetails): Viewing project:", JSON.stringify(project, null, 2));
    setSelectedProject(project);
    setCurrentBudget(project.budget);
    setCurrentNotes(project.notes || '');

    if (project.members && project.members.length > 0) {
      console.log("ProjectsPage (handleViewProjectDetails): Fetching profiles for member UIDs:", project.members.join(', '));
      setIsLoadingProjectModalMemberProfiles(true);
      try {
        const memberPromises = project.members.map(uid => {
          console.log(`ProjectsPage (handleViewProjectDetails): Creating getDoc promise for user UID: ${uid}`);
          return getDoc(doc(db, "users", uid));
        });
        const memberDocSnapshots = await Promise.all(memberPromises);
        console.log(`ProjectsPage (handleViewProjectDetails): Received ${memberDocSnapshots.length} snapshots from Firestore.`);
        
        const fetchedProfiles = memberDocSnapshots
          .map((docSnapshot, index) => {
            const uid = project.members[index];
            if (docSnapshot.exists()) {
              console.log(`ProjectsPage (handleViewProjectDetails): Document for UID ${uid} EXISTS. Data:`, JSON.stringify(docSnapshot.data()));
              return { id: docSnapshot.id, ...docSnapshot.data() } as AppUserType;
            } else {
              console.warn(`ProjectsPage (handleViewProjectDetails): Document for UID ${uid} DOES NOT EXIST in 'users' collection.`);
              return null;
            }
          })
          .filter(profile => profile !== null) as AppUserType[];
        
        console.log("ProjectsPage (handleViewProjectDetails): Successfully processed fetchedProfiles:", JSON.stringify(fetchedProfiles.map(p => ({id: p.id, name: p.name})), null, 2));
        setProjectModalMemberProfiles(fetchedProfiles);
      } catch (error) {
        console.error("Erreur lors de la récupération des profils des membres du projet pour la modale:", error);
        toast({
          title: "Erreur de chargement",
          description: "Impossible de charger les détails des membres du projet.",
          variant: "destructive",
        });
        setProjectModalMemberProfiles([]);
      } finally {
        setIsLoadingProjectModalMemberProfiles(false);
      }
    } else {
      console.log("ProjectsPage (handleViewProjectDetails): Project has no members or members array is invalid.");
      setProjectModalMemberProfiles([]);
    }
  };


  const handleCloseProjectDetails = () => {
    setSelectedProject(null);
    setEditingBudget(false);
    setEditingNotes(false);
    setProjectModalMemberProfiles([]); 
  };
  
  const handleSaveBudget = async () => {
    if (selectedProject && typeof currentBudget === 'number' && currentBudget >=0 && currentUser) {
      if (selectedProject.ownerId !== currentUser.uid && !isAdmin) {
        toast({ title: "Non autorisé", description: "Seul le propriétaire ou un admin peut modifier le budget.", variant: "destructive" });
        return;
      }
      setIsLoading(true);
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
        setIsLoading(false);
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
      setIsLoading(true);
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
        setIsLoading(false);
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
      setIsLoading(true);
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
        setIsLoading(false);
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

  const getAnyUserProfileById = (uid: string): AppUserType | undefined => {
    // For project cards, use allUserProfiles IF admin and loaded, otherwise it's limited.
    // For modal member display, projectModalMemberProfiles should be used.
    // This function is primarily for the "Add Member" dialog (admin) or general lookup.
    if (isLoadingAllUserProfiles && !isAdmin) return undefined; // Avoid using incomplete list for non-admins here
    const profile = allUserProfiles.find(p => p.id === uid);
    if (!profile) console.warn(`ProjectsPage (getAnyUserProfileById): Profile for UID ${uid} not found in allUserProfiles.`);
    return profile;
  };

  const handleOpenAddMemberDialog = () => {
    if (!selectedProject || isLoadingAllUserProfiles || !isAdmin) { 
      toast({ title: "Action non autorisée", description: "Seul un administrateur peut ajouter des membres via cette interface.", variant: "destructive" });
      return;
    }
    const currentMemberIds = new Set(selectedProject.members);
    const available = allUserProfiles.filter(user => !currentMemberIds.has(user.id));
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
    if (!selectedProject || usersToAddToProject.length === 0 || !isAdmin) return;
    setIsLoading(true);
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
      
      // Refetch member profiles for the modal if they were updated
      if (updatedProjectData.members && updatedProjectData.members.length > 0) {
        setIsLoadingProjectModalMemberProfiles(true); // Indicate loading for modal update
        const memberPromises = updatedProjectData.members.map(uid => getDoc(doc(db, "users", uid)));
        const memberDocs = await Promise.all(memberPromises);
        setProjectModalMemberProfiles(memberDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() } as AppUserType)));
        setIsLoadingProjectModalMemberProfiles(false);
      }

      toast({ title: "Membres ajoutés", description: `${usersToAddToProject.length} membre(s) ont été ajoutés au projet.` });
      setIsAddMemberDialogOpen(false);
    } catch (error) {
      console.error("Erreur lors de l'ajout de membres: ", error);
      toast({ title: "Erreur", description: "Impossible d'ajouter les membres.", variant: "destructive" });
    } finally {
      setIsLoading(false);
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
    <div className="bg-background min-h-screen">
      <header className="bg-card shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold text-primary flex items-center">
             <Icons.dollarSign className="mr-2 h-7 w-7 inline-block"/>
            <span>DépensePartagée</span>
          </Link>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
              <Icons.bell className="h-5 w-5" />
              <span className="sr-only">Notifications</span>
            </Button>
            <Avatar className="h-9 w-9">
              <AvatarImage src={userProfile?.avatarUrl || `https://placehold.co/40x40.png`} alt={userProfile?.name || "User"} data-ai-hint="user avatar"/>
              <AvatarFallback>{getAvatarFallbackText(userProfile?.name, currentUser.email)}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold">Gestion des Projets</h2>
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
                        <DialogFooter className="p-4 pt-0 border-t mt-auto"><div className="animate-pulse bg-muted h-8 w-full rounded"></div></DialogFooter>
                    </Card>
                ))}
            </div>
        ) : projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              // For project card display, try to use allUserProfiles if admin and loaded for quick name resolution
              // Otherwise, it will fall back to UIDs or limited info. Full profiles are fetched for modal.
              const displayableMemberProfiles = project.members.map(uid => 
                (isAdmin && !isLoadingAllUserProfiles && allUserProfiles.length > 0) 
                ? getAnyUserProfileById(uid) 
                : ({ id: uid, name: uid.substring(0,6)+"..." , email: "", isAdmin: false } as AppUserType) // Fallback display
              ).filter(Boolean) as AppUserType[];

              return (
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
                      <p className="text-xs text-muted-foreground">Dépenses totales</p>
                      <p className="font-semibold">{(project.totalExpenses || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Dernière activité</p>
                      <p>{formatDateFromTimestamp(project.lastActivity)}</p>
                    </div>
                  </div>
                  
                  {project.budget > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Budget</span>
                        <span>{project.budget.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                      </div>
                      <Progress value={(project.totalExpenses / project.budget) * 100} className="h-2" />
                    </div>
                  )}
                </CardContent>
                <DialogFooter className="p-4 pt-0 border-t mt-auto">
                     <div className="flex items-center justify-between w-full">
                        <div className="flex -space-x-2 overflow-hidden">
                            {displayableMemberProfiles.slice(0, 3).map((memberProfile, index) => (
                            <Avatar key={memberProfile.id || index} className="h-8 w-8 border-2 border-background">
                                <AvatarImage src={memberProfile.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(memberProfile.name || 'N A')}&background=random&color=fff&size=32`} alt={memberProfile.name || 'Membre'} data-ai-hint="member avatar"/>
                                <AvatarFallback className="text-xs">{getAvatarFallbackText(memberProfile.name)}</AvatarFallback> 
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
                </DialogFooter>
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
              <div className="lg:col-span-2 space-y-6">
                <ProjectExpenseSettlement 
                    project={selectedProject} 
                    memberProfilesOfProject={projectModalMemberProfiles} 
                    isLoadingUserProfiles={isLoadingProjectModalMemberProfiles} 
                />
                <Card>
                  <CardHeader>
                    <CardTitle>Dépenses Récentes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(selectedProject.recentExpenses || []).length > 0 ? (
                      <ul className="space-y-3">
                        {(selectedProject.recentExpenses || []).slice(0,3).map((expense, index) => (
                          <li key={expense.id || index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                            <div>
                              <p className="font-medium">{expense.name}</p>
                              <p className="text-sm text-muted-foreground">{formatDateFromTimestamp(expense.date)}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{expense.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
                              {expense.payer && <p className="text-xs text-muted-foreground">Payé par: {expense.payer}</p>}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground text-sm">Aucune dépense récente pour ce projet.</p>
                    )}
                    {(selectedProject.recentExpenses || []).length > 3 && (
                         <Button variant="link" className="mt-4 w-full text-primary">
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
                            disabled={isLoading}
                          />
                          <Button size="sm" onClick={handleSaveBudget} disabled={isLoading}><Icons.check className="h-4 w-4"/></Button>
                          <Button size="sm" variant="ghost" onClick={() => { setEditingBudget(false); setCurrentBudget(selectedProject.budget || 0);}} disabled={isLoading}><Icons.x className="h-4 w-4"/></Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between mt-1">
                          <p className="font-semibold text-lg">
                            {(typeof currentBudget === 'number' ? currentBudget : (selectedProject.budget || 0)).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                          </p>
                          {(selectedProject.ownerId === currentUser?.uid || isAdmin) && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingBudget(true)} disabled={isLoading}>
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
                              <AvatarImage src={member?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(member?.name || 'N A')}&background=random&color=fff&size=32`} alt={member?.name || 'Membre'} data-ai-hint="member avatar small"/>
                              <AvatarFallback className="text-xs">{getAvatarFallbackText(member?.name)}</AvatarFallback>
                            </Avatar>
                            <p className="font-medium text-sm">{member?.name || member.id}</p> 
                          </div>
                        ))
                    )}
                     {(selectedProject.ownerId === currentUser?.uid || isAdmin) && (
                       <Button variant="link" className="mt-2 w-full text-primary text-sm" onClick={handleOpenAddMemberDialog} disabled={isLoading || isLoadingAllUserProfiles}>
                           <Icons.plus className="mr-1 h-4 w-4" /> Ajouter un membre
                       </Button>
                     )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Tags</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {(selectedProject.tags || []).length > 0 ? selectedProject.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">{tag}</Badge>
                    )) : <p className="text-sm text-muted-foreground">Aucun tag.</p>}
                    {(selectedProject.ownerId === currentUser?.uid || isAdmin) && (
                     <Button variant="link" size="sm" className="text-primary p-0 h-auto leading-none" disabled={isLoading}>
                        <Icons.plus className="mr-1 h-3 w-3" /> Ajouter
                     </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
                 <div className="lg:col-span-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Notes du projet</CardTitle>
                             {!editingNotes && (selectedProject.ownerId === currentUser?.uid || isAdmin) && (
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingNotes(true)} disabled={isLoading}>
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
                                        disabled={isLoading}
                                    />
                                    <div className="flex justify-end gap-2">
                                        <Button size="sm" variant="ghost" onClick={() => {setEditingNotes(false); setCurrentNotes(selectedProject.notes || '');}} disabled={isLoading}>Annuler</Button>
                                        <Button size="sm" onClick={handleSaveNotes} disabled={isLoading}>Enregistrer Notes</Button>
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
            </div>
            <DialogFooter className="border-t pt-4">
              {(selectedProject.ownerId === currentUser?.uid || isAdmin) && (
                <Button variant="destructive" onClick={() => {setIsDeleteConfirmModalOpen(true);}} disabled={isLoading}>
                  <Icons.trash className="mr-2 h-4 w-4" /> Supprimer
                </Button>
              )}
              <DialogClose asChild>
                 <Button variant="outline" disabled={isLoading}>Fermer</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

       <Dialog open={isDeleteConfirmModalOpen} onOpenChange={setIsDeleteConfirmModalOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Confirmer la suppression</DialogTitle>
                    <DialogDescription>
                        Êtes-vous sûr de vouloir supprimer le projet "{selectedProject?.name}"? Cette action est irréversible.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDeleteConfirmModalOpen(false)} disabled={isLoading}>Annuler</Button>
                    <Button variant="destructive" onClick={handleDeleteProject} disabled={isLoading}>
                        {isLoading ? <Icons.loader className="mr-2 h-4 w-4 animate-spin"/> : <Icons.trash className="mr-2 h-4 w-4"/>}
                        Supprimer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Ajouter des membres au projet "{selectedProject?.name}"</DialogTitle>
                    <DialogDescription>
                        Sélectionnez les utilisateurs à ajouter à ce projet.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-3 max-h-72 overflow-y-auto">
                    {isLoadingAllUserProfiles ? ( 
                        <p>Chargement des utilisateurs...</p>
                    ) : availableUsersForProject.length > 0 ? (
                        availableUsersForProject.map(user => (
                            <div key={user.id} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-md">
                                <Checkbox
                                    id={`add-member-${user.id}`}
                                    checked={usersToAddToProject.includes(user.id)}
                                    onCheckedChange={() => handleToggleUserForAddition(user.id)}
                                />
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'N A')}&background=random&color=fff&size=32`} alt={user.name || 'Utilisateur'} data-ai-hint="user avatar"/>
                                  <AvatarFallback className="text-xs">{getAvatarFallbackText(user.name, user.email)}</AvatarFallback>
                                </Avatar>
                                <label
                                    htmlFor={`add-member-${user.id}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer"
                                >
                                    {user.name} ({user.email})
                                </label>
                            </div>
                        ))
                    ) : (
                        <p className="text-muted-foreground text-sm text-center">Aucun nouvel utilisateur disponible à ajouter.</p>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddMemberDialogOpen(false)} disabled={isLoading}>Annuler</Button>
                    <Button onClick={handleConfirmAddMembers} disabled={isLoading || usersToAddToProject.length === 0}>
                        {isLoading ? <Icons.loader className="mr-2 h-4 w-4 animate-spin"/> : <Icons.plus className="mr-2 h-4 w-4"/>}
                        Ajouter les membres sélectionnés
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

    </div>
  );
}
    

    

      

    