
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User } from '@/data/mock-data'; // Project type is not directly used here anymore for getProjectsForUser
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
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Input } from '@/components/ui/input';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, type DocumentData } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';

// Simplified Project type for this page's needs
interface UserProject {
  id: string;
  name: string;
  members: string[]; // Assuming members are stored by name for now
}

export default function UsersPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { currentUser, isAdmin, loading: authLoading } = useAuth();

    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [projects, setProjects] = useState<UserProject[]>([]);
    
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const [isLoadingProjects, setIsLoadingProjects] = useState(true); 

    const [selectedUserForModal, setSelectedUserForModal] = useState<User | null>(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

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


    const fetchAllUsers = useCallback(async () => {
      if (!isAdmin) return;
      setIsLoadingUsers(true);
      try {
        const usersCollection = collection(db, "users");
        const usersSnapshot = await getDocs(usersCollection);
        const usersList = usersSnapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data(),
        } as User));
        setAllUsers(usersList);
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
    }, [isAdmin, toast]);

    const fetchProjectsForUsers = useCallback(async () => {
      // Fetches all projects - admin context. Filtering per user is done client-side.
      if (!isAdmin) return;
      setIsLoadingProjects(true);
      try {
        const projectsCollectionRef = collection(db, "projects");
        const projectSnapshot = await getDocs(projectsCollectionRef);
        const projectsList = projectSnapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: data.name || "Projet sans nom",
            members: data.members || [], // Ensure members array exists
          } as UserProject;
        });
        setProjects(projectsList);
      } catch (error) {
        console.error("Erreur lors de la récupération des projets: ", error);
        toast({
          title: "Erreur de chargement",
          description: "Impossible de charger les projets pour les utilisateurs.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingProjects(false);
      }
    }, [isAdmin, toast]);
  
    useEffect(() => {
      if (isAdmin) {
        fetchAllUsers();
        fetchProjectsForUsers(); 
      }
    }, [isAdmin, fetchAllUsers, fetchProjectsForUsers]);

    const filteredUsers = useMemo(() => {
        if (!isAdmin || isLoadingUsers) return [];
        if (!searchTerm) return allUsers;
        const lowerCaseSearch = searchTerm.toLowerCase();
        return allUsers.filter(user =>
            user.name.toLowerCase().includes(lowerCaseSearch) ||
            user.email.toLowerCase().includes(lowerCaseSearch)
        );
    }, [isAdmin, allUsers, searchTerm, isLoadingUsers]);

    const getProjectsForSpecificUser = useCallback((userName: string): UserProject[] => {
        if (isLoadingProjects || !projects) return [];
        return projects.filter(project => project.members.includes(userName));
    }, [projects, isLoadingProjects]);

    const getAvatarFallback = (name: string | undefined) => {
        if (!name) return '??';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] || '') + (parts[parts.length - 1][0] || '');
        }
        return name.substring(0, 2).toUpperCase();
    };
    
    const handleUserAction = (actionType: 'edit' | 'delete', userId: string) => {
        toast({
            title: "Fonctionnalité en cours de développement",
            description: `L'action de "${actionType}" pour l'utilisateur ${userId} n'est pas encore connectée à Firestore.`,
        });
    };

    const handleOpenProfileModal = (user: User) => {
        setSelectedUserForModal(user);
        setIsProfileModalOpen(true);
    };

    if (authLoading) {
        return (
          <div className="container mx-auto py-10 text-center">
            <Icons.loader className="mx-auto h-12 w-12 animate-spin text-primary" />
            <p className="mt-4">Vérification des droits d'accès...</p>
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
        <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
             <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
                 <div>
                     <h1 className="text-3xl font-bold mb-1">Gestion des Utilisateurs</h1>
                     <p className="text-lg text-muted-foreground">
                        Gérez les comptes et les accès des utilisateurs.
                     </p>
                 </div>
                 <div className="flex items-center gap-4 mt-4 md:mt-0">
                    <Input
                        type="search"
                        placeholder="Rechercher des utilisateurs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-xs"
                        data-ai-hint="search users"
                    />
                     <Link href="/dashboard" passHref>
                       <Button variant="outline">
                         <Icons.layoutDashboard className="mr-2 h-4 w-4" /> Tableau de bord
                       </Button>
                     </Link>
                 </div>
             </div>

            <Card>
                <CardHeader>
                    <CardTitle>Liste des Utilisateurs ({isLoadingUsers ? '...' : filteredUsers.length})</CardTitle>
                    <CardDescription>
                    Vue complète de tous les utilisateurs enregistrés. Cliquez sur un nom pour voir les détails.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Nom</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Rôle</TableHead>
                            <TableHead>Projets</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(isLoadingUsers || isLoadingProjects) && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                                    <Icons.loader className="mx-auto h-8 w-8 animate-spin" />
                                    Chargement des données...
                                </TableCell>
                            </TableRow>
                            )}
                            {!isLoadingUsers && !isLoadingProjects && filteredUsers.map((user) => {
                            const userProjectsList = getProjectsForSpecificUser(user.name);
                            return (
                                <TableRow key={user.id}>
                                <TableCell>
                                    <button 
                                        onClick={() => handleOpenProfileModal(user)}
                                        className="flex items-center gap-3 text-left hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded-md p-1 -m-1"
                                    >
                                        <Avatar>
                                            <AvatarImage src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff`} alt={user.name} data-ai-hint="user avatar placeholder"/>
                                            <AvatarFallback>{getAvatarFallback(user.name)}</AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium">{user.name}</span>
                                    </button>
                                </TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    <Badge variant={user.isAdmin ? 'default' : 'secondary'}>
                                    {user.isAdmin ? 'Admin' : 'Membre'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {userProjectsList.length > 0 ? (
                                        <Badge variant="outline" title={userProjectsList.map(p => p.name).join(', ')}>
                                            {userProjectsList.length} projet(s)
                                        </Badge>
                                    ) : (
                                        <span className="text-muted-foreground text-sm">Aucun</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                <Button variant="ghost" size="sm" className="mr-1 h-8 w-8" onClick={() => handleUserAction('edit', user.id)}>
                                    <Icons.edit className="h-4 w-4" />
                                    <span className="sr-only">Modifier</span>
                                </Button>
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive/90 h-8 w-8" onClick={() => handleUserAction('delete', user.id)}>
                                    <Icons.trash className="h-4 w-4" />
                                    <span className="sr-only">Supprimer</span>
                                </Button>
                                </TableCell>
                                </TableRow>
                            );
                            })}
                            {!isLoadingUsers && !isLoadingProjects && filteredUsers.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                                Aucun utilisateur trouvé.
                                </TableCell>
                            </TableRow>
                            )}
                        </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {selectedUserForModal && (
                <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader className="items-center text-center pt-4">
                            <Avatar className="h-24 w-24 mb-3 ring-2 ring-primary ring-offset-2 ring-offset-background">
                                <AvatarImage src={selectedUserForModal.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUserForModal.name)}&background=random&color=fff&size=128`} alt={selectedUserForModal.name} data-ai-hint="user avatar large"/>
                                <AvatarFallback className="text-3xl">{getAvatarFallback(selectedUserForModal.name)}</AvatarFallback>
                            </Avatar>
                            <DialogTitle className="text-2xl">{selectedUserForModal.name}</DialogTitle>
                            <DialogDescription>{selectedUserForModal.email}</DialogDescription>
                        </DialogHeader>
                        <div className="py-4 px-6 space-y-4">
                             <div>
                                <h4 className="text-sm font-medium text-muted-foreground mb-1">Rôle</h4>
                                <Badge variant={selectedUserForModal.isAdmin ? 'default' : 'secondary'}>
                                    {selectedUserForModal.isAdmin ? 'Administrateur' : 'Membre'}
                                </Badge>
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-muted-foreground mb-2">Projets Participés</h4>
                                {isLoadingProjects ? (
                                     <p className="text-sm text-muted-foreground">Chargement des projets...</p>
                                ) : (
                                    getProjectsForSpecificUser(selectedUserForModal.name).length > 0 ? (
                                        <ul className="list-disc list-inside space-y-1 text-sm text-foreground max-h-32 overflow-y-auto">
                                            {getProjectsForSpecificUser(selectedUserForModal.name).map(proj => (
                                                <li key={proj.id}>{proj.name}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">Aucun projet pour cet utilisateur.</p>
                                    )
                                )}
                            </div>
                        </div>
                        <DialogFooter className="px-6 pb-4">
                            <DialogClose asChild>
                                <Button variant="outline">Fermer</Button>
                            </DialogClose>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );

    