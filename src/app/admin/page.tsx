"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { mockUsers, initialProjects, User, Project } from '@/data/mock-data';
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

// Simulate fetching the current user (replace with actual authentication logic)
const getCurrentUser = (): User | undefined => {
    // For this example, assume the first user is the logged-in user
    // In a real app, this would come from your auth context/provider
    return mockUsers.find(u => u.id === 'user1'); // Assuming 'user1' is the admin
};


export default function AdminPage() {
    const router = useRouter();
    const currentUser = getCurrentUser();
    const [searchTerm, setSearchTerm] = useState('');

    // Determine if the current user is an admin
    const isAdmin = currentUser?.isAdmin ?? false;

    // --- Data Filtering Logic ---

    // Get projects the current user is a member of
    const userProjects = useMemo(() => {
        if (!currentUser) return [];
        return initialProjects.filter(project => project.members.includes(currentUser.name));
    }, [currentUser]);

    // Get IDs of projects the current user is a member of
    const userProjectIds = useMemo(() => {
        return userProjects.map(p => p.id);
    }, [userProjects]);

    // Get users who are members of the same projects as the current user
    const visibleUsers = useMemo(() => {
        if (isAdmin) {
            // Admin sees all users
            return mockUsers;
        }
        if (!currentUser) return [];

        const relatedUserNames = new Set<string>();
        userProjects.forEach(project => {
            project.members.forEach(memberName => relatedUserNames.add(memberName));
        });

        return mockUsers.filter(user => relatedUserNames.has(user.name));
    }, [isAdmin, currentUser, userProjects]);

     // Get projects visible to the current user (all for admin, user's projects for non-admin)
     const visibleProjects = useMemo(() => {
         if (isAdmin) return initialProjects;
         return userProjects;
     }, [isAdmin, userProjects]);

    // Filter users based on search term
    const filteredUsers = useMemo(() => {
        if (!searchTerm) return visibleUsers;
        const lowerCaseSearch = searchTerm.toLowerCase();
        return visibleUsers.filter(user =>
            user.name.toLowerCase().includes(lowerCaseSearch) ||
            user.email.toLowerCase().includes(lowerCaseSearch)
        );
    }, [visibleUsers, searchTerm]);

    // Filter projects based on search term
     const filteredProjects = useMemo(() => {
         if (!searchTerm) return visibleProjects;
         const lowerCaseSearch = searchTerm.toLowerCase();
         return visibleProjects.filter(project =>
             project.name.toLowerCase().includes(lowerCaseSearch) ||
             project.description.toLowerCase().includes(lowerCaseSearch) ||
             project.tags.some(tag => tag.toLowerCase().includes(lowerCaseSearch))
         );
     }, [visibleProjects, searchTerm]);


    // --- Helper Functions ---

    const getProjectsForUser = (userName: string): Project[] => {
        return initialProjects.filter(project => project.members.includes(userName));
    };

    const getAvatarFallback = (name: string) => {
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return parts[0][0] + parts[parts.length - 1][0];
        }
        return name.substring(0, 2).toUpperCase();
    };

    // --- Render Logic ---

    if (!currentUser) {
        // Handle case where user is not logged in (redirect or show message)
        // router.push('/login'); // Example redirect
        return <div className="container mx-auto py-10 text-center">Veuillez vous connecter pour accéder à cette page.</div>;
    }


    return (
        <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
            {/* Header */}
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
                        placeholder="Rechercher utilisateurs ou projets..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-xs"
                    />
                     <Link href="/" passHref>
                       <Button variant="outline">
                         <Icons.home className="mr-2 h-4 w-4" /> Accueil
                       </Button>
                     </Link>
                 </div>
             </div>

             <Tabs defaultValue="users" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="users">Utilisateurs ({filteredUsers.length})</TabsTrigger>
                  <TabsTrigger value="projects">Projets ({filteredProjects.length})</TabsTrigger>
                </TabsList>

                {/* Users Tab */}
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
                              {filteredUsers.map((user) => {
                                const userProjectsList = getProjectsForUser(user.name);
                                return (
                                  <TableRow key={user.id}>
                                    <TableCell>
                                      <div className="flex items-center gap-3">
                                        <Avatar>
                                          <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff`} alt={user.name} data-ai-hint="user avatar placeholder" />
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
                                        {/* Show project count or list names */}
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
                                        <Button variant="ghost" size="sm" className="mr-1">
                                            <Icons.edit className="h-4 w-4" />
                                            <span className="sr-only">Modifier</span>
                                        </Button>
                                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive/90">
                                            <Icons.trash className="h-4 w-4" />
                                            <span className="sr-only">Supprimer</span>
                                        </Button>
                                      </TableCell>
                                    )}
                                  </TableRow>
                                );
                              })}
                              {filteredUsers.length === 0 && (
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

                {/* Projects Tab */}
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
                              {filteredProjects.map((project) => (
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
                                      <Button variant="ghost" size="sm" className="mr-1">
                                        <Icons.edit className="h-4 w-4" />
                                         <span className="sr-only">Modifier</span>
                                      </Button>
                                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive/90">
                                        <Icons.trash className="h-4 w-4" />
                                         <span className="sr-only">Supprimer</span>
                                      </Button>
                                    </TableCell>
                                  )}
                                </TableRow>
                              ))}
                              {filteredProjects.length === 0 && (
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