"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Icons } from "@/components/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // Import Avatar components
import { initialProjects, Project } from '@/data/mock-data'; // Import data from central location

// Remove FontAwesome imports if no longer used
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import { faProjectDiagram, faBell, faPlus, faArrowRight, faTimes, faTrashAlt, faEdit, faSave } from '@fortawesome/free-solid-svg-icons';


export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // Use useEffect to set initial state on client-side to avoid hydration mismatch
  useEffect(() => {
    setProjects(initialProjects);
  }, []);


  const handleViewDetails = (project: Project) => {
    setSelectedProject(project);
    setIsDetailsModalOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDetailsModalOpen(false);
    setSelectedProject(null);
  };

  const handleOpenDeleteDialog = (project: Project) => {
    setProjectToDelete(project);
    setIsDeleteDialogOpen(true);
    // Close details modal if open
    setIsDetailsModalOpen(false);
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setProjectToDelete(null);
  };

  const handleDeleteProject = () => {
    if (projectToDelete) {
      setProjects(prevProjects => prevProjects.filter(p => p.id !== projectToDelete.id));
      handleCloseDeleteDialog();
      // Add toast notification for success here if needed
      // toast({ title: "Projet supprimé", description: `Le projet "${projectToDelete.name}" a été supprimé.` });
       console.log(`Project "${projectToDelete.name}" deleted.`);
    }
  };

   const getAvatarFallback = (name: string) => {
      const parts = name.split(' ');
      if (parts.length >= 2) {
          return parts[0][0] + parts[parts.length - 1][0];
      }
      return name.substring(0, 2).toUpperCase();
   };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "outline" | "destructive" => {
    switch (status.toLowerCase()) {
      case 'actif': return 'default'; // Using primary color
      case 'en attente': return 'secondary'; // Using yellowish color might require theme adjustment
      case 'terminé': return 'outline'; // Using outline style
      default: return 'secondary';
    }
  };

  const calculateProgress = (totalExpenses: number, budget: number): number => {
    if (budget <= 0) return 0;
    return Math.min((totalExpenses / budget) * 100, 100);
  };

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header simulation - In a real app, this would be part of a layout */}
      <header className="bg-card text-card-foreground border-b mb-8">
         <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
           <Link href="/" className="text-2xl font-bold text-primary flex items-center">
             {/* Use Lucide icon */}
              <Icons.file className="mr-2 h-6 w-6"/>
              Dépense Partagée
           </Link>
           <div className="flex items-center space-x-4">
             {/* Notification Icon */}
             <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                <Icons.mail className="h-5 w-5"/> {/* Changed to Mail icon */}
                <span className="sr-only">Notifications</span>
             </Button>
             {/* User Menu */}
             <div className="flex items-center space-x-2">
               <span className="text-sm font-medium hidden sm:inline">Admin User</span>
               <Avatar className="w-8 h-8">
                    <AvatarImage src="https://ui-avatars.com/api/?name=Admin+User&background=4f46e5&color=fff" alt="User Avatar" data-ai-hint="user avatar"/>
                    <AvatarFallback>AU</AvatarFallback>
               </Avatar>
             </div>
              <Button variant="outline" size="sm" onClick={() => router.push('/')}>
                <Icons.home className="mr-2 h-4 w-4" /> Accueil
              </Button>
           </div>
         </div>
       </header>


      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
              <h2 className="text-2xl font-bold text-foreground">Gestion des Projets</h2>
              <p className="text-muted-foreground">Créez et gérez vos projets collaboratifs</p>
          </div>
        <Button onClick={() => router.push('/projects/create')} className="mt-4 md:mt-0">
          <Icons.plus className="mr-2 h-4 w-4" /> Nouveau Projet
        </Button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Card key={project.id} className="shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-start mb-2">
                <CardTitle className="text-lg">{project.name}</CardTitle>
                <Badge variant={getStatusBadgeVariant(project.status)}>{project.status}</Badge>
              </div>
              <CardDescription>{project.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="flex items-center justify-between mb-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Dépenses totales</p>
                  <p className="font-semibold">€{project.totalExpenses.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Dernière activité</p>
                  <p>{project.lastActivity}</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Budget</span>
                  <span>€{project.budget.toFixed(2)}</span>
                </div>
                <Progress value={calculateProgress(project.totalExpenses, project.budget)} className="h-2" />
                 <p className="text-right text-xs font-medium mt-1">{calculateProgress(project.totalExpenses, project.budget).toFixed(0)}% utilisé</p>
              </div>

               {/* Tags */}
                <div className="mb-4 flex flex-wrap gap-1">
                   {project.tags.map(tag => (
                       <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                   ))}
               </div>

              <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
                <div className="flex -space-x-2 overflow-hidden">
                  {project.members.slice(0, 3).map((member, index) => (
                     <Avatar key={index} className="h-8 w-8 border-2 border-card" title={member}>
                       <AvatarImage
                         src={`https://ui-avatars.com/api/?name=${encodeURIComponent(member)}&background=random&color=fff`}
                         alt={`Avatar ${member}`}
                         data-ai-hint="member avatar placeholder"
                       />
                       <AvatarFallback>{getAvatarFallback(member)}</AvatarFallback>
                     </Avatar>
                  ))}
                  {project.members.length > 3 && (
                      <Avatar className="h-8 w-8 border-2 border-card bg-muted text-muted-foreground">
                         <AvatarFallback className="text-xs font-medium">+{project.members.length - 3}</AvatarFallback>
                     </Avatar>
                  )}
                </div>
                <Button variant="link" onClick={() => handleViewDetails(project)} className="text-primary px-0">
                  Voir détails <Icons.arrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardContent>

          </Card>
        ))}
         {projects.length === 0 && (
            <Card className="md:col-span-2 lg:col-span-3">
                <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">Aucun projet à afficher pour le moment.</p>
                </CardContent>
            </Card>
        )}
      </div>

      {/* Project Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="sm:max-w-[600px] md:max-w-[800px] lg:max-w-[1000px] max-h-[90vh] flex flex-col">
          {selectedProject && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedProject.name}</DialogTitle>
                <DialogDescription>{selectedProject.description}</DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4 flex-grow overflow-y-auto pr-6 pl-6 -mr-6 -ml-6"> {/* Added padding and negative margin for scrollbar */}
                {/* Left Column (Recent Expenses & Notes) */}
                <div className="lg:col-span-2 space-y-4">
                   <Card>
                       <CardHeader>
                           <CardTitle className="text-lg">Dépenses récentes</CardTitle>
                       </CardHeader>
                       <CardContent>
                           <div className="space-y-3 max-h-60 overflow-y-auto pr-2"> {/* Scroll within card content */}
                               {selectedProject.recentExpenses.length > 0 ? selectedProject.recentExpenses.map((expense, index) => (
                                   <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                       <div>
                                           <p className="font-medium">{expense.name}</p>
                                           <p className="text-sm text-muted-foreground">{expense.date}</p>
                                       </div>
                                       <div className="text-right">
                                           <p className="font-semibold">€{expense.amount.toFixed(2)}</p>
                                           <p className="text-xs text-muted-foreground">{expense.payer}</p>
                                       </div>
                                   </div>
                               )) : <p className="text-sm text-muted-foreground">Aucune dépense récente.</p>}
                           </div>
                           {selectedProject.recentExpenses.length > 0 && (
                               <Button variant="link" className="mt-4 w-full justify-center text-primary">
                                   Voir toutes les dépenses <Icons.arrowRight className="ml-1 h-4 w-4" />
                               </Button>
                           )}
                       </CardContent>
                   </Card>

                   <Card>
                       <CardHeader>
                           <CardTitle className="text-lg">Notes du projet</CardTitle>
                       </CardHeader>
                       <CardContent>
                           <p className="text-sm text-muted-foreground whitespace-pre-wrap"> {/* Use whitespace-pre-wrap */}
                               {selectedProject.notes || "Aucune note pour ce projet."}
                           </p>
                       </CardContent>
                   </Card>
                 </div>

                 {/* Right Column (Stats & Members) */}
                 <div className="space-y-4">
                     <Card>
                         <CardHeader>
                             <CardTitle className="text-lg">Statistiques</CardTitle>
                         </CardHeader>
                         <CardContent className="space-y-4">
                              <div>
                                  <p className="text-sm text-muted-foreground">Budget total</p>
                                  <p className="font-semibold">€{selectedProject.budget.toFixed(2)}</p>
                              </div>
                              <div>
                                  <p className="text-sm text-muted-foreground">Dépenses totales</p>
                                  <p className="font-semibold">€{selectedProject.totalExpenses.toFixed(2)}</p>
                              </div>
                              <div>
                                  <p className="text-sm text-muted-foreground">Budget restant</p>
                                  <p className={`font-semibold ${selectedProject.budget - selectedProject.totalExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    €{(selectedProject.budget - selectedProject.totalExpenses).toFixed(2)}
                                  </p>
                              </div>
                              <div>
                                 <p className="text-sm text-muted-foreground">Pourcentage utilisé</p>
                                 <Progress value={calculateProgress(selectedProject.totalExpenses, selectedProject.budget)} className="h-2.5 mt-1" />
                                 <p className="text-right text-sm font-medium mt-1">{calculateProgress(selectedProject.totalExpenses, selectedProject.budget).toFixed(0)}%</p>
                             </div>
                         </CardContent>
                     </Card>

                     <Card>
                          <CardHeader>
                              <CardTitle className="text-lg">Membres ({selectedProject.members.length})</CardTitle>
                          </CardHeader>
                          <CardContent>
                              <div className="space-y-3 max-h-48 overflow-y-auto pr-2"> {/* Scroll within card content */}
                                  {selectedProject.members.map((member, index) => (
                                      <div key={index} className="flex items-center space-x-3 p-2 bg-muted/50 rounded-lg">
                                           <Avatar className="w-8 h-8">
                                              <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(member)}&background=random&color=fff`} alt={`Avatar ${member}`} data-ai-hint="member avatar placeholder"/>
                                               <AvatarFallback>{getAvatarFallback(member)}</AvatarFallback>
                                           </Avatar>
                                          <div>
                                              <p className="font-medium text-sm">{member}</p>
                                              {/* Optional: Add member-specific stats if available */}
                                              {/* <p className="text-xs text-muted-foreground">€X.XX dépensés</p> */}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                              <Button variant="link" className="mt-3 w-full justify-center text-primary">
                                  <Icons.plus className="mr-1 h-4 w-4" /> Ajouter un membre
                              </Button>
                          </CardContent>
                      </Card>

                       {/* Tags Section in Modal */}
                       <Card>
                          <CardHeader>
                              <CardTitle className="text-lg">Tags</CardTitle>
                          </CardHeader>
                           <CardContent className="flex flex-wrap gap-2">
                               {selectedProject.tags.map(tag => (
                                   <Badge key={tag} variant="secondary">{tag}</Badge>
                               ))}
                               {selectedProject.tags.length === 0 && (
                                   <p className="text-sm text-muted-foreground">Aucun tag.</p>
                               )}
                           </CardContent>
                       </Card>
                 </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row sm:justify-between items-center mt-auto pt-4 border-t"> {/* Ensure footer is at bottom */}
                 <Button variant="destructive" onClick={() => handleOpenDeleteDialog(selectedProject)}>
                    <Icons.trash className="mr-2 h-4 w-4" /> Supprimer
                 </Button>
                 <div className="flex space-x-2 mt-2 sm:mt-0">
                    <DialogClose asChild>
                       <Button variant="outline">Fermer</Button>
                    </DialogClose>
                    {/* Add Edit button functionality later */}
                    <Button>
                      <Icons.edit className="mr-2 h-4 w-4" /> Modifier
                    </Button>
                 </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le projet "{projectToDelete?.name}"? Cette action est irréversible et toutes les données associées seront perdues.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCloseDeleteDialog}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}