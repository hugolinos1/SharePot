
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User, Project } from '@/data/mock-data';
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
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';

export default function UsersPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { currentUser, isAdmin, loading: authLoading } = useAuth();

    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [projects, setProjects] = useState<Project[]>([]);
    
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const [isLoadingProjects, setIsLoadingProjects] = useState(true); 

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
  
    useEffect(() => {
      if (isAdmin) {
        fetchAllUsers();
        fetchProjects(); 
      }
    }, [isAdmin, fetchAllUsers, fetchProjects]);

    const filteredUsers = useMemo(() => {
        if (!isAdmin || isLoadingUsers) return [];
        if (!searchTerm) return allUsers;
        const lowerCaseSearch = searchTerm.toLowerCase();
        return allUsers.filter(user =>
            user.name.toLowerCase().includes(lowerCaseSearch) ||
            user.email.toLowerCase().includes(lowerCaseSearch)
        );
    }, [isAdmin, allUsers, searchTerm, isLoadingUsers]);

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
    
    const handleUserAction = (actionType: 'edit' | 'delete', userId: string) => {
        toast({
            title: "Fonctionnalité en cours de développement",
            description: `L'action de "${actionType}" pour l'utilisateur ${userId} n'est pas encore connectée à Firestore.`,
            variant: "default",
        });
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
                    Vue complète de tous les utilisateurs enregistrés.
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
                            const userProjectsList = getProjectsForUser(user.name);
                            return (
                                <TableRow key={user.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff`} alt={user.name} data-ai-hint="user avatar placeholder"/>
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
        </div>
    );
}
