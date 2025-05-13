
"use client";

import React, { useState, useMemo } from 'react';
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
import { initialProjects, Project as ProjectType, User } from '@/data/mock-data'; // Assuming User type is also in mock-data
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ProjectExpenseSettlement } from '@/components/projects/project-expense-settlement';

// Helper function to get avatar fallback
const getAvatarFallback = (name: string) => {
  const parts = name.split(' ');
  if (parts.length > 0 && parts[0].length > 0) {
    if (parts.length > 1 && parts[parts.length -1].length > 0) {
        return parts[0][0].toUpperCase() + parts[parts.length - 1][0].toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }
  return '??';
};


export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectType[]>(initialProjects);
  const [selectedProject, setSelectedProject] = useState<ProjectType | null>(null);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);

  // Form state for new/edit project
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectBudget, setProjectBudget] = useState<number | ''>('');
  const [projectNotes, setProjectNotes] = useState('');
  const [editingBudget, setEditingBudget] = useState(false);
  const [currentBudget, setCurrentBudget] = useState<number | string>('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [currentNotes, setCurrentNotes] = useState('');


  const handleViewProjectDetails = (project: ProjectType) => {
    setSelectedProject(project);
    setCurrentBudget(project.budget);
    setCurrentNotes(project.notes || '');
  };

  const handleCloseProjectDetails = () => {
    setSelectedProject(null);
    setEditingBudget(false);
    setEditingNotes(false);
  };

  const handleCreateNewProject = () => {
    // Reset form fields
    setProjectName('');
    setProjectDescription('');
    setProjectBudget('');
    // In a real app, you'd also handle members and tags here
    setIsNewProjectModalOpen(true);
  };

  const handleSaveNewProject = (e: React.FormEvent) => {
    e.preventDefault();
    // Basic validation
    if (!projectName) {
      alert('Project name is required.');
      return;
    }
    const newProject: ProjectType = {
      id: (projects.length + 1).toString(),
      name: projectName,
      description: projectDescription,
      status: 'Actif', // Default status
      totalExpenses: 0,
      lastActivity: new Date().toLocaleDateString('fr-FR'),
      budget: Number(projectBudget) || 0,
      members: ['Admin User'], // Default member
      recentExpenses: [],
      notes: '',
      tags: [],
    };
    setProjects([...projects, newProject]);
    setIsNewProjectModalOpen(false);
  };
  
  const handleSaveBudget = () => {
    if (selectedProject && typeof currentBudget === 'number') {
      const updatedProject = { ...selectedProject, budget: currentBudget };
      setSelectedProject(updatedProject);
      const updatedProjects = projects.map(p => 
        p.id === selectedProject.id ? updatedProject : p
      );
      setProjects(updatedProjects);
    }
    setEditingBudget(false);
  };

  const handleSaveNotes = () => {
    if (selectedProject) {
      const updatedProject = { ...selectedProject, notes: currentNotes };
      setSelectedProject(updatedProject);
       const updatedProjects = projects.map(p => 
        p.id === selectedProject.id ? updatedProject : p
      );
      setProjects(updatedProjects);
    }
    setEditingNotes(false);
  };


  const handleDeleteProject = () => {
    if (selectedProject) {
      setProjects(projects.filter(p => p.id !== selectedProject.id));
      setSelectedProject(null);
      setIsDeleteConfirmModalOpen(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'actif':
        return 'default'; // Greenish or primary
      case 'en attente':
        return 'secondary'; // Yellowish or secondary
      case 'terminé':
        return 'outline'; // Greyish or outline
      default:
        return 'secondary';
    }
  };
  

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <header className="bg-card shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold text-primary flex items-center">
             <Icons.dollarSign className="mr-2 h-7 w-7 inline-block"/>
            DépensePartagée
          </Link>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
              <Icons.bell className="h-5 w-5" />
              <span className="sr-only">Notifications</span>
            </Button>
            <Avatar className="h-9 w-9">
              <AvatarImage src="https://picsum.photos/40/40" alt="User" data-ai-hint="user avatar" />
              <AvatarFallback>AU</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold">Gestion des Projets</h2>
            <p className="text-muted-foreground">Créez et gérez vos projets collaboratifs.</p>
          </div>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <Button onClick={handleCreateNewProject}>
              <Icons.plus className="mr-2 h-4 w-4" /> Nouveau Projet
            </Button>
            <Link href="/dashboard" passHref>
              <Button variant="outline">
                <Icons.home className="mr-2 h-4 w-4" /> Tableau de Bord
              </Button>
            </Link>
          </div>
        </div>

        {/* Projects Grid */}
        {projects.length > 0 ? (
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
                      <p className="text-xs text-muted-foreground">Dépenses totales</p>
                      <p className="font-semibold">{project.totalExpenses.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Dernière activité</p>
                      <p>{project.lastActivity}</p>
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
                            {project.members.slice(0, 3).map((memberName, index) => (
                            <Avatar key={index} className="h-8 w-8 border-2 border-background">
                                <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(memberName)}&background=random&color=fff&size=32`} alt={memberName} data-ai-hint="member avatar"/>
                                <AvatarFallback className="text-xs">{getAvatarFallback(memberName)}</AvatarFallback>
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
            ))}
          </div>
        ) : (
          <Card className="col-span-full">
            <CardContent className="py-10 text-center">
              <Icons.folderKanban className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">Aucun projet trouvé</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Commencez par créer un nouveau projet pour organiser vos dépenses.
              </p>
              <Button onClick={handleCreateNewProject} className="mt-6">
                <Icons.plus className="mr-2 h-4 w-4" /> Créer un projet
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Project Details Modal */}
      {selectedProject && (
        <Dialog open={!!selectedProject} onOpenChange={(isOpen) => !isOpen && handleCloseProjectDetails()}>
          <DialogContent className="sm:max-w-2xl md:max-w-4xl lg:max-w-7xl max-h-[95vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-2xl">{selectedProject.name}</DialogTitle>
              <DialogDescription>{selectedProject.description}</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4 overflow-y-auto flex-grow pr-2">
              {/* Left Column / Main content */}
              <div className="lg:col-span-2 space-y-6">
                <ProjectExpenseSettlement project={selectedProject} />
                
                <Card>
                  <CardHeader>
                    <CardTitle>Dépenses Récentes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedProject.recentExpenses.length > 0 ? (
                      <ul className="space-y-3">
                        {selectedProject.recentExpenses.slice(0,3).map((expense, index) => (
                          <li key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                            <div>
                              <p className="font-medium">{expense.name}</p>
                              <p className="text-sm text-muted-foreground">{expense.date}</p>
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
                    {selectedProject.recentExpenses.length > 3 && (
                         <Button variant="link" className="mt-4 w-full text-primary">
                           Voir toutes les dépenses <Icons.arrowRight className="ml-1 h-4 w-4" />
                         </Button>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column / Sidebar */}
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
                          />
                          <Button size="sm" onClick={handleSaveBudget}><Icons.check className="h-4 w-4"/></Button>
                          <Button size="sm" variant="ghost" onClick={() => { setEditingBudget(false); setCurrentBudget(selectedProject.budget);}}><Icons.x className="h-4 w-4"/></Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between mt-1">
                          <p className="font-semibold text-lg">
                            {(typeof currentBudget === 'number' ? currentBudget : selectedProject.budget).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                          </p>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingBudget(true)}>
                            <Icons.edit className="h-4 w-4"/>
                          </Button>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Dépenses totales</p>
                      <p className="font-semibold text-lg">{selectedProject.totalExpenses.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
                    </div>
                    {selectedProject.budget > 0 && (
                      <>
                        <div>
                          <p className="text-sm text-muted-foreground">Budget restant</p>
                          <p className={`font-semibold text-lg ${selectedProject.budget - selectedProject.totalExpenses < 0 ? 'text-destructive' : 'text-green-600'}`}>
                            {(selectedProject.budget - selectedProject.totalExpenses).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Pourcentage utilisé</p>
                          <Progress value={(selectedProject.totalExpenses / selectedProject.budget) * 100} className="mt-1 h-2.5" />
                           <p className="text-right text-sm font-medium mt-1">{((selectedProject.totalExpenses / selectedProject.budget) * 100).toFixed(0)}%</p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Membres ({selectedProject.members.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 max-h-48 overflow-y-auto">
                    {selectedProject.members.map((member, index) => (
                      <div key={index} className="flex items-center space-x-3 p-2 bg-muted/50 rounded-lg">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(member)}&background=random&color=fff&size=32`} alt={member} data-ai-hint="member avatar small"/>
                          <AvatarFallback className="text-xs">{getAvatarFallback(member)}</AvatarFallback>
                        </Avatar>
                        <p className="font-medium text-sm">{member}</p>
                      </div>
                    ))}
                     <Button variant="link" className="mt-2 w-full text-primary text-sm">
                        <Icons.plus className="mr-1 h-4 w-4" /> Ajouter un membre
                     </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Tags</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {selectedProject.tags.length > 0 ? selectedProject.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">{tag}</Badge>
                    )) : <p className="text-sm text-muted-foreground">Aucun tag.</p>}
                     <Button variant="link" size="sm" className="text-primary p-0 h-auto leading-none">
                        <Icons.plus className="mr-1 h-3 w-3" /> Ajouter
                     </Button>
                  </CardContent>
                </Card>
              </div>
                 {/* Notes section moved to the bottom of the modal content */}
                 <div className="lg:col-span-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Notes du projet</CardTitle>
                             {!editingNotes && (
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingNotes(true)}>
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
                                    />
                                    <div className="flex justify-end gap-2">
                                        <Button size="sm" variant="ghost" onClick={() => {setEditingNotes(false); setCurrentNotes(selectedProject.notes || '');}}>Annuler</Button>
                                        <Button size="sm" onClick={handleSaveNotes}>Enregistrer Notes</Button>
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
              <Button variant="destructive" onClick={() => {setIsDeleteConfirmModalOpen(true); /* Keep details modal open until delete confirmed */}}>
                <Icons.trash className="mr-2 h-4 w-4" /> Supprimer
              </Button>
              <DialogClose asChild>
                 <Button variant="outline">Fermer</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* New Project Modal */}
      <Dialog open={isNewProjectModalOpen} onOpenChange={setIsNewProjectModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Nouveau Projet</DialogTitle>
            <DialogDescription>
              Remplissez les informations ci-dessous pour créer un nouveau projet.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveNewProject}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="project-name" className="text-right">
                  Nom*
                </Label>
                <Input
                  id="project-name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="col-span-3"
                  placeholder="Ex: Voyage d'entreprise"
                  required
                  data-ai-hint="project name input"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="project-description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="project-description"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  className="col-span-3"
                  placeholder="Décrivez le projet..."
                  data-ai-hint="project description input"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="project-budget" className="text-right">
                  Budget (€)
                </Label>
                <Input
                  id="project-budget"
                  type="number"
                  value={projectBudget}
                  onChange={(e) => setProjectBudget(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="col-span-3"
                  placeholder="0.00"
                  data-ai-hint="project budget input"
                />
              </div>
              {/* Add member and tag selection here in a real app */}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Annuler</Button>
              </DialogClose>
              <Button type="submit">
                <Icons.check className="mr-2 h-4 w-4" /> Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

       {/* Delete Confirmation Modal */}
        <Dialog open={isDeleteConfirmModalOpen} onOpenChange={setIsDeleteConfirmModalOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Confirmer la suppression</DialogTitle>
                    <DialogDescription>
                        Êtes-vous sûr de vouloir supprimer le projet "{selectedProject?.name}"? Cette action est irréversible.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDeleteConfirmModalOpen(false)}>Annuler</Button>
                    <Button variant="destructive" onClick={handleDeleteProject}>
                        <Icons.trash className="mr-2 h-4 w-4"/>Supprimer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

    </div>
  );
}

