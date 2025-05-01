"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Icons } from "@/components/icons";

// Mock data - replace with actual data fetching later
const initialProjects = [
  {
    id: '1',
    name: 'Voyage à Paris',
    status: 'Actif',
    description: 'Vacances d\'été avec l\'équipe',
    totalExpenses: 1245.50,
    lastActivity: '15 juin 2023',
    budget: 2000.00,
    members: ['Jean Dupont', 'Marie Martin', 'Paul Durand', 'Alice Dubois', 'Bob Moreau'],
    recentExpenses: [
      { name: 'Hôtel Mercure', date: '12 juin 2023', amount: 450.00, payer: 'Jean Dupont' },
      { name: 'Billets de train', date: '10 juin 2023', amount: 320.50, payer: 'Marie Martin' },
      { name: 'Dîner au restaurant', date: '8 juin 2023', amount: 175.00, payer: 'Paul Durand' },
    ],
    notes: 'Projet de vacances pour l\'équipe du 15 au 20 juin 2023. Budget total de €2000. Hôtel réservé pour 5 personnes. Activités prévues : visite de la Tour Eiffel, croisière sur la Seine, et journée à Disneyland. Les repas du midi sont à la charge de chacun. Les dîners sont pris en charge par le projet.',
    tags: ['voyage', 'équipe'],
  },
  {
    id: '2',
    name: 'Événement Startup',
    status: 'En attente',
    description: 'Conférence annuelle des startups',
    totalExpenses: 780.00,
    lastActivity: '3 juin 2023',
    budget: 5000.00,
    members: ['Admin User', 'Sarah Leroy'],
    recentExpenses: [],
    notes: '',
    tags: ['conférence', 'startup'],
  },
  {
    id: '3',
    name: 'Déménagement Bureau',
    status: 'Terminé',
    description: 'Relocalisation des bureaux',
    totalExpenses: 3420.75,
    lastActivity: '15 mai 2023',
    budget: 3500.00,
    members: ['Admin User', 'Lucie Petit', 'Marc Blanc', 'Sophie Vert', 'Julien Noir', 'Claire Jaune'],
    recentExpenses: [
       { name: 'Location camion', date: '10 mai 2023', amount: 150.00, payer: 'Admin User' },
       { name: 'Achat cartons', date: '5 mai 2023', amount: 80.75, payer: 'Lucie Petit' },
    ],
    notes: 'Déménagement des anciens locaux vers le nouveau site. Contrat avec déménageurs signé. Installation prévue le 14 mai.',
    tags: ['logistique', 'bureau'],
  },
];

type Project = typeof initialProjects[0];

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

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
    }
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
             <Icons.file className="mr-2 h-6 w-6" /> Dépense Partagée
           </Link>
           <div className="flex items-center space-x-4">
             {/* Add notification icon/button here if needed */}
             <div className="flex items-center space-x-2">
               <span className="text-sm font-medium hidden sm:inline">Admin User</span>
               <img src="https://ui-avatars.com/api/?name=Admin+User&background=4f46e5&color=fff"
                    alt="User Avatar" className="w-8 h-8 rounded-full" data-ai-hint="user avatar placeholder"/>
             </div>
              <Button variant="outline" size="sm" onClick={() => router.push('/')}>
                <Icons.home className="mr-2 h-4 w-4" /> Retour
              </Button>
           </div>
         </div>
       </header>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Projets</h2>
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
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="flex -space-x-2 overflow-hidden">
                  {project.members.slice(0, 3).map((member, index) => (
                    <img
                      key={index}
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(member)}&background=random&color=fff`}
                      alt={`Avatar ${member}`}
                      title={member}
                      className="inline-block h-8 w-8 rounded-full ring-2 ring-card"
                      data-ai-hint="member avatar placeholder"
                    />
                  ))}
                  {project.members.length > 3 && (
                    <span className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-muted-foreground ring-2 ring-card text-xs font-medium">
                      +{project.members.length - 3}
                    </span>
                  )}
                </div>
                <Button variant="link" onClick={() => handleViewDetails(project)} className="text-primary">
                  Voir détails <Icons.arrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
            {/* Optional Footer
            <CardFooter className="flex justify-end">
               Add actions like Edit/Delete icons here if needed outside modal
            </CardFooter>
            */}
          </Card>
        ))}
      </div>

      {/* Project Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="sm:max-w-[600px] md:max-w-[800px] lg:max-w-[1000px] max-h-[90vh] overflow-y-auto">
          {selectedProject && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedProject.name}</DialogTitle>
                <DialogDescription>{selectedProject.description}</DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4">
                {/* Left Column (Recent Expenses & Notes) */}
                <div className="lg:col-span-2 space-y-4">
                   <Card>
                       <CardHeader>
                           <CardTitle className="text-lg">Dépenses récentes</CardTitle>
                       </CardHeader>
                       <CardContent>
                           <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
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
                           <p className="text-sm text-muted-foreground">
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
                              <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                                  {selectedProject.members.map((member, index) => (
                                      <div key={index} className="flex items-center space-x-3 p-2 bg-muted/50 rounded-lg">
                                          <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(member)}&background=random&color=fff`}
                                               alt={`Avatar ${member}`} className="w-8 h-8 rounded-full" data-ai-hint="member avatar placeholder"/>
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
                 </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row sm:justify-between items-center mt-4 pt-4 border-t">
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
