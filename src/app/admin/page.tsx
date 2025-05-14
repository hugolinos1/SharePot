
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
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";

// TODO: Remplacer par une véritable authentification Firebase Auth
// Cet ID est utilisé pour récupérer le profil de l'utilisateur qui est supposé être l'administrateur.
// Assurez-vous qu'un document avec cet ID existe dans votre collection 'users'
// et qu'il a un champ `isAdmin: true`.
const EXPECTED_ADMIN_DOCUMENT_ID = 'adminPrincipal'; 

export default function AdminProjectsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [currentUserProfile, setCurrentUserProfile] = useState<User | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [projects, setProjects] = useState<Project[]>([]);
    
    const [isLoadingProjects, setIsLoadingProjects] = useState(true);
    const [isLoadingCurrentUser, setIsLoadingCurrentUser] = useState(true);

    const fetchCurrentUserProfile = useCallback(async () => {
      setIsLoadingCurrentUser(true);
      try {
        const userDocRef = doc(db, "users", EXPECTED_ADMIN_DOCUMENT_ID);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setCurrentUserProfile({ id: userDocSnap.id, ...userDocSnap.data() } as User);
        } else {
          console.error(`Profil administrateur (document ID: ${EXPECTED_ADMIN_DOCUMENT_ID}) non trouvé dans Firestore.`);
          toast({
            title: "Erreur de configuration Admin",
            description: `Profil administrateur (${EXPECTED_ADMIN_DOCUMENT_ID}) introuvable.`,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Erreur lors de la récupération du profil utilisateur admin: ", error);
        toast({
          title: "Erreur de chargement",
          description: "Impossible de charger le profil utilisateur admin.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingCurrentUser(false);
      }
    }, [toast]);

    const fetchProjects = useCallback(async () => {
      setIsLoadingProjects(true);
      try {
        const projectsCollection = collection(db, "projects");
        const projectSnapshot = await getDocs(projectsCollection);
        const projectsList = projectSnapshot.docs.map(docSnap => ({ // Renommé doc en docSnap
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
    }, [toast]);
  
    useEffect(() => {
      fetchCurrentUserProfile();
      fetchProjects();
    }, [fetchCurrentUserProfile, fetchProjects]);

    const isAdmin = useMemo(() => currentUserProfile?.isAdmin ?? false, [currentUserProfile]);

     const filteredProjects = useMemo(() => {
         if (isLoadingProjects) return [];
         if (!searchTerm) return projects; // Admins see all projects if no search term
         const lowerCaseSearch = searchTerm.toLowerCase();
         return projects.filter(project =>
             project.name.toLowerCase().includes(lowerCaseSearch) ||
             (project.description && project.description.toLowerCase().includes(lowerCaseSearch)) ||
             project.tags.some(tag => tag.toLowerCase().includes(lowerCaseSearch))
         );
     }, [projects, searchTerm, isLoadingProjects]);

    const getAvatarFallback = (name: string) => {
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] || '') + (parts[parts.length - 1][0] || '');
        }
        return name.substring(0, 2).toUpperCase();
    };
    
    const handleProjectAction = (actionType: 'edit' | 'delete', projectId: string) => {
        toast({
            title: "Fonctionnalité en cours de développement",
            description: `L'action de "${actionType}" pour le projet ${projectId} n'est pas encore connectée à Firestore.`,
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
    
    if (!isAdmin) {
         return (
            <div className="container mx-auto py-10 text-center">
                 <p className="text-2xl font-semibold mb-4">Accès non autorisé</p>
                 <p className="text-muted-foreground mb-6">Vous n'avez pas les droits nécessaires pour accéder à cette page. Vérifiez que votre compte est configuré comme administrateur dans la base de données (document ID: {EXPECTED_ADMIN_DOCUMENT_ID}).</p>
                 <Button onClick={() => router.push('/dashboard')}>
                     <Icons.home className="mr-2 h-4 w-4" />
                     Retour au tableau de bord
                 </Button>
            </div>
        );
    }

    // Ce cas est couvert par le !isAdmin ci-dessus si currentUserProfile est null ou n'a pas isAdmin:true
    // if (!currentUserProfile) {
    //     return <div className="container mx-auto py-10 text-center">Veuillez vous connecter pour accéder à cette page.</div>;
    // }


    return (
        <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
             <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
                 <div>
                     <h1 className="text-3xl font-bold mb-1">Gestion des Projets (Admin)</h1>
                     <p className="text-lg text-muted-foreground">
                        Gérez tous les projets de la plateforme.
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

            <Card>
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
                            <TableHead>Tags</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingProjects && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
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
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" className="mr-1 h-8 w-8" onClick={() => handleProjectAction('edit', project.id)}>
                                    <Icons.edit className="h-4 w-4" />
                                        <span className="sr-only">Modifier</span>
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive/90 h-8 w-8" onClick={() => handleProjectAction('delete', project.id)}>
                                    <Icons.trash className="h-4 w-4" />
                                        <span className="sr-only">Supprimer</span>
                                    </Button>
                                </TableCell>
                            </TableRow>
                            ))}
                            {!isLoadingProjects && filteredProjects.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
                                Aucun projet trouvé.
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
