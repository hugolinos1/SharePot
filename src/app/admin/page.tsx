
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User, Project } from '@/data/mock-data'; // Assuming User type is from mock-data
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
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";

// Placeholder for current authenticated user ID - replace with actual auth logic
const CURRENT_USER_ID = 'user1'; 

export default function AdminPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [currentUserProfile, setCurrentUserProfile] = useState<User | null>(null);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [projects, setProjects] = useState<Project[]>([]);
    
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const [isLoadingProjects, setIsLoadingProjects] = useState(true);
    const [isLoadingCurrentUser, setIsLoadingCurrentUser] = useState(true);

    const fetchCurrentUserProfile = useCallback(async () => {
      setIsLoadingCurrentUser(true);
      try {
        const userDocRef = doc(db, "users", CURRENT_USER_ID);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setCurrentUserProfile({ id: userDocSnap.id, ...userDocSnap.data() } as User);
        } else {
          console.error("Current user profile not found in Firestore.");
          toast({
            title: "Erreur utilisateur",
            description: "Profil utilisateur actuel introuvable.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Erreur lors de la récupération du profil utilisateur: ", error);
        toast({
          title: "Erreur de chargement",
          description: "Impossible de charger le profil utilisateur.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingCurrentUser(false);
      }
    }, [toast]);

    const fetchAllUsers = useCallback(async () => {
      setIsLoadingUsers(true);
      try {
        const usersCollection = collection(db, "users");
        const usersSnapshot = await getDocs(usersCollection);
        const usersList = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
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
    }, [toast]);

    const fetchProjects = useCallback(async () => {
      setIsLoadingProjects(true);
      try {
        const projectsCollection = collection(db, "projects");
        const projectSnapshot = await getDocs(projectsCollection);
        const projectsList = projectSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
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
    }, [toast]);
  
    useEffect(() => {
      fetchCurrentUserProfile();
      fetchAllUsers();
      fetchProjects();
    }, [fetchCurrentUserProfile, fetchAllUsers, fetchProjects]);


    const isAdmin = useMemo(() => currentUserProfile?.isAdmin ?? false, [currentUserProfile]);

    const userProjects = useMemo(() => {
        if (!currentUserProfile || isLoadingProjects) return [];
        return projects.filter(project => project.members.includes(currentUserProfile.name));
    }, [currentUserProfile, projects, isLoadingProjects]);

    const visibleUsers = useMemo(() => {
        if (isLoadingUsers) return [];
        if (isAdmin) {
            return allUsers;
        }
        if (!currentUserProfile) return [];

        const relatedUserNames = new Set<string>();
        userProjects.forEach(project => {
            project.members.forEach(memberName => relatedUserNames.add(memberName));
        });

        return allUsers.filter(user => relatedUserNames.has(user.name));
    }, [isAdmin, currentUserProfile, userProjects, allUsers, isLoadingUsers]);

     const visibleProjects = useMemo(() => {
         if (isLoadingProjects) return [];
         if (isAdmin) return projects;
         return userProjects;
     }, [isAdmin, userProjects, projects, isLoadingProjects]);

    const filteredUsers = useMemo(() => {
        if (!searchTerm) return visibleUsers;
        const lowerCaseSearch = searchTerm.toLowerCase();
        return visibleUsers.filter(user =>
            user.name.toLowerCase().includes(lowerCaseSearch) ||
            user.email.toLowerCase().includes(lowerCaseSearch)
        );
    }, [visibleUsers, searchTerm]);

     const filteredProjects = useMemo(() => {
         if (!searchTerm) return visibleProjects;
         const lowerCaseSearch = searchTerm.toLowerCase();
         return visibleProjects.filter(project =>
             project.name.toLowerCase().includes(lowerCaseSearch) ||
             (project.description && project.description.toLowerCase().includes(lowerCaseSearch)) ||
             project.tags.some(tag => tag.toLowerCase().includes(lowerCaseSearch))
         );
     }, [visibleProjects, searchTerm]);

    const getProjectsForUser = (userName: string): Project[] => {
        if (isLoadingProjects) return [];
        return projects.filter(project => project.members.includes(userName));
    };

    const getAvatarFallback = (name: string) => {
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] || '') + (parts[parts.length - 1][0] || '');
        }
        return name.substring(0, 2).toUpperCase();
    };
    
    const handleUserAction = (actionType: 'edit' | 'delete') => {
        toast({
            title: "Fonctionnalité en cours de développement",
            description: `L'action de "${actionType}" utilisateur n'est pas encore connectée à Firestore.`,
            variant: "default",
        });
    };


    if (isLoadingCurrentUser) {
        return (
          <div className="container mx-auto py-10 text-center">
            <Icons.loader className="mx-auto h-12 w-12 animate-spin text-primary" />
            <p className="mt-4">Chargement du profil utilisateur...</p>
          </div>
        );
    }

    if (!currentUserProfile) {
        return <div className="container mx-auto py-10 text-center">Veuillez vous connecter pour accéder à cette page.</div>;
    }


    return (
        <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
             <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
                 <div>
                     <h1 className="text-3xl font-bold mb-1">Gestion Administrateur</h1>
                     <p className="text-lg text-muted-foreground">
                         {isAdmin ? 'Gérez les utilisateurs et les projets.' : 'Visualisez les utilisateurs et projets liés.'}
                     </p>
                 </div>
                 <div className="flex items-center gap-4 mt-4 md:mt-0">
                    <Input
                        type="search"
                        placeholder="Rechercher..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-xs"
                    />
                     <Link href="/dashboard" passHref>
                       <Button variant="outline">
                         <Icons.layoutDashboard className="mr-2 h-4 w-4" /> Tableau de bord
                       </Button>
                     </Link>
                 </div>
             </div>

             <Tabs defaultValue="users" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="users">Utilisateurs ({isLoadingUsers ? '...' : filteredUsers.length})</TabsTrigger>
                  <TabsTrigger value="projects">Projets ({isLoadingProjects ? '...' : filteredProjects.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="users">
                  <Card>
                    <CardHeader>
                      <CardTitle>Liste des Utilisateurs</CardTitle>
                      <CardDescription>
                        {isAdmin ? "Vue complète de tous les utilisateurs." : "Utilisateurs participant aux mêmes projets que vous."}
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
                                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {isLoadingUsers && (
                                <TableRow>
                                    <TableCell colSpan={isAdmin ? 5 : 4} className="text-center text-muted-foreground py-10">
                                        <Icons.loader className="mx-auto h-8 w-8 animate-spin" />
                                        Chargement des utilisateurs...
                                    </TableCell>
                                </TableRow>
                              )}
                              {!isLoadingUsers && filteredUsers.map((user) => {
                                const userProjectsList = getProjectsForUser(user.name);
                                return (
                                  <TableRow key={user.id}>
                                    <TableCell>
                                      <div className="flex items-center gap-3">
                                        <Avatar>
                                          <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff`} alt={user.name} data-ai-hint="user avatar placeholder"/>
                                          <AvatarFallback>{getAvatarFallback(user.name)}</AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium">{user.name}</span>
                                      </div>
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
                                    {isAdmin && (
                                      <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" className="mr-1" onClick={() => handleUserAction('edit')}>
                                            <Icons.edit className="h-4 w-4" />
                                            <span className="sr-only">Modifier</span>
                                        </Button>
                                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive/90" onClick={() => handleUserAction('delete')}>
                                            <Icons.trash className="h-4 w-4" />
                                            <span className="sr-only">Supprimer</span>
                                        </Button>
                                      </TableCell>
                                    )}
                                  </TableRow>
                                );
                              })}
                              {!isLoadingUsers && filteredUsers.length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={isAdmin ? 5 : 4} className="text-center text-muted-foreground py-4">
                                    Aucun utilisateur trouvé.
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="projects">
                  <Card>
                    <CardHeader>
                      <CardTitle>Liste des Projets</CardTitle>
                      <CardDescription>
                        {isAdmin ? "Vue complète de tous les projets." : "Projets auxquels vous participez."}
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
                                <TableHead>Tags</TableHead>
                                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {isLoadingProjects && (
                                <TableRow>
                                  <TableCell colSpan={isAdmin ? 6 : 5} className="text-center text-muted-foreground py-10">
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
                                     <div className="flex -space-x-2 overflow-hidden" title={project.members.join(', ')}>
                                        {project.members.slice(0, 3).map((member, index) => (
                                            <Avatar key={index} className="h-6 w-6 border-2 border-card">
                                                <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(member)}&background=random&color=fff&size=32`} alt={member} data-ai-hint="member avatar"/>
                                                <AvatarFallback>{getAvatarFallback(member)}</AvatarFallback>
                                            </Avatar>
                                        ))}
                                        {project.members.length > 3 && (
                                            <Avatar className="h-6 w-6 border-2 border-card bg-muted text-muted-foreground">
                                                <AvatarFallback className="text-xs">+{project.members.length - 3}</AvatarFallback>
                                            </Avatar>
                                        )}
                                     </div>
                                  </TableCell>
                                   <TableCell>
                                       <div className="flex flex-wrap gap-1">
                                           {project.tags.map(tag => (
                                               <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                                           ))}
                                       </div>
                                   </TableCell>
                                  {isAdmin && (
                                    <TableCell className="text-right">
                                      <Button variant="ghost" size="sm" className="mr-1" onClick={() => handleUserAction('edit')}>
                                        <Icons.edit className="h-4 w-4" />
                                         <span className="sr-only">Modifier</span>
                                      </Button>
                                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive/90" onClick={() => handleUserAction('delete')}>
                                        <Icons.trash className="h-4 w-4" />
                                         <span className="sr-only">Supprimer</span>
                                      </Button>
                                    </TableCell>
                                  )}
                                </TableRow>
                              ))}
                              {!isLoadingProjects && filteredProjects.length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={isAdmin ? 6 : 5} className="text-center text-muted-foreground py-4">
                                    Aucun projet trouvé.
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                       </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
        </div>
    );
}
