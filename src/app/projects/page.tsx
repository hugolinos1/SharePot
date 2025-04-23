"use client";

import {Button} from "@/components/ui/button";
import {useRouter} from 'next/navigation';
import {Icons} from "@/components/icons";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {useEffect, useState} from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {Textarea} from "@/components/ui/textarea";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Checkbox} from "@/components/ui/checkbox";
import {Separator} from "@/components/ui/separator";
import {Progress} from "@/components/ui/progress";
import Link from "next/link";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faBell, faProjectDiagram, faEdit, faTrashAlt, faPlus, faSave, faTimes, faArrowRight} from "@fortawesome/free-solid-svg-icons";

const initialProjects = [
  {
    id: '1',
    name: 'Voyage à Paris',
    status: 'Actif',
    description: 'Vacances d\'été avec l\'équipe',
    totalExpenses: 1245.50,
    lastActivity: '15 juin 2023',
    budget: 2000.00,
    members: ['Jean Dupont', 'Marie Martin', 'Paul Durand'],
    recentExpenses: [
      {name: 'Hôtel Mercure', date: '12 juin 2023', amount: 450.00, payer: 'Jean Dupont'},
      {name: 'Billets de train', date: '10 juin 2023', amount: 320.50, payer: 'Marie Martin'},
      {name: 'Dîner au restaurant', date: '8 juin 2023', amount: 175.00, payer: 'Paul Durand'},
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
    tags: [],
  },
  {
    id: '3',
    name: 'Déménagement Bureau',
    status: 'Terminé',
    description: 'Relocalisation des bureaux',
    totalExpenses: 3420.75,
    lastActivity: '15 mai 2023',
    budget: 3500.00,
    members: ['Admin User', 'Lucie Petit'],
    recentExpenses: [],
    notes: '',
    tags: [],
  },
];

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [open, setOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectStartDate, setProjectStartDate] = useState('');
  const [projectEndDate, setProjectEndDate] = useState('');
  const [projectBudget, setProjectBudget] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [availableMembers, setAvailableMembers] = useState([
    'Jean Dupont',
    'Marie Martin',
    'Paul Durand',
    'Lucie Petit',
    'Sarah Leroy',
  ]);
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState('');

  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);

  const handleOpenChange = () => {
    setProjectName('');
    setProjectDescription('');
    setProjectStartDate('');
    setProjectEndDate('');
    setProjectBudget('');
    setSelectedMembers([]);
    setAvailableMembers([
      'Jean Dupont',
      'Marie Martin',
      'Paul Durand',
      'Lucie Petit',
      'Sarah Leroy',
    ]);
    setTags([]);
    setNewTag('');
    setOpen(prevState => !prevState);
  };

  const handleOpenChangeDetails = (project) => {
    setSelectedProject(project);
  };

  const handleCloseDetails = () => {
    setSelectedProject(null);
  };

  const handleDeleteConfirmationOpen = () => {
    setDeleteConfirmationOpen(true);
  };

  const handleDeleteConfirmationClose = () => {
    setDeleteConfirmationOpen(false);
  };

  const handleDeleteProject = () => {
    if (selectedProject) {
      setProjects(prevProjects => prevProjects.filter(p => p.id !== selectedProject.id));
      setSelectedProject(null);
      setDeleteConfirmationOpen(false);
    }
  };

  const handleAddMember = () => {
    const select = document.getElementById('member-select') as HTMLSelectElement;
    const memberName = select.value;
    if (memberName && !selectedMembers.includes(memberName)) {
      setSelectedMembers([...selectedMembers, memberName]);
      setAvailableMembers(availableMembers.filter(member => member !== memberName));
    }
  };

  const handleRemoveMember = (memberToRemove) => {
    setSelectedMembers(selectedMembers.filter(member => member !== memberToRemove));
    setAvailableMembers([...availableMembers, memberToRemove]);
  };

  const handleAddTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    
      
        
          
            
              <Icons.file className="mr-2 h-4 w-4"/>
              Dépense Partagée
            
          
          
            
              Admin User
              <img src="https://ui-avatars.com/api/?name=Admin+User&background=4f46e5&color=fff"
                   alt="User" className="w-8 h-8 rounded-full"/>
            
          
        
      

      
        
          
            Gestion des Projets
            Créez et gérez vos projets collaboratifs
          
          
            <Button asChild>
                <Link href="/projects/create">Nouveau Projet</Link>
            </Button>
          
        
        
          
            {projects.map((project) => (
              
                
                  
                    
                      {project.name}
                      {project.status}
                    
                    {project.description}

                    
                      
                        Dépenses totales
                        €{project.totalExpenses.toFixed(2)}
                      
                      
                        Dernière activité
                        {project.lastActivity}
                      
                    
                  

                  
                    
                      Budget
                      €{project.budget.toFixed(2)}
                    
                    
                      
                        {(project.totalExpenses / project.budget) * 100}%
                      
                    
                  

                  
                    
                      {project.members.map((member, index) => (
                        
                          <img
                            key={index}
                            src={`https://ui-avatars.com/api/?name=${member}&background=4f46e5&color=fff`}
                            alt="Member"
                            className="w-8 h-8 rounded-full border-2 border-white member-avatar"
                          />
                        
                      ))}
                      {project.members.length > 3 && (
                        
                          +{project.members.length - 3}
                        
                      )}
                    
                    
                      <Button variant="link" onClick={() => handleOpenChangeDetails(project)}>Voir détails</Button>
                    
                  
                
              
            ))}
          
        

        
          {selectedProject && (
            <Dialog open={!!selectedProject} onOpenChange={handleCloseDetails}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{selectedProject.name}</DialogTitle>
                  <DialogDescription>
                    {selectedProject.description}
                  </DialogDescription>
                </DialogHeader>

                
                  
                    
                      Hôtel Mercure
                      12 juin 2023
                    
                    
                      €450.00
                      Jean Dupont
                    
                  
                  
                    
                      Billets de train
                      10 juin 2023
                    
                    
                      €320.50
                      Marie Martin
                    
                  
                  
                    
                      Dîner au restaurant
                      8 juin 2023
                    
                    
                      €175.00
                      Paul Durand
                    
                  
                
                <Button variant="link">Voir toutes les dépenses </Button>

                
                  Notes du projet
                  
                    Projet de vacances pour l'équipe du 15 au 20 juin 2023. Budget total de €2000.
                    Hôtel réservé pour 5 personnes. Activités prévues : visite de la Tour Eiffel, croisière sur la Seine, et journée à Disneyland.
                    Les repas du midi sont à la charge de chacun. Les dîners sont pris en charge par le projet.
                  
                

                
                  
                    
                      Statistiques
                      
                        
                          
                            Budget total
                            €{selectedProject.budget.toFixed(2)}
                          
                          
                            Dépenses totales
                            €{selectedProject.totalExpenses.toFixed(2)}
                          
                          
                            Budget restant
                            €{(selectedProject.budget - selectedProject.totalExpenses).toFixed(2)}
                          
                          
                            Pourcentage utilisé
                            
                              
                            
                            {(selectedProject.totalExpenses / selectedProject.budget) * 100}%
                          
                        

                        
                          
                            
                              Membres
                              
                                
                                  
                                    Jean Dupont
                                    €450.00 dépensés
                                  
                                
                              
                              
                                
                                  
                                    Marie Martin
                                    €320.50 dépensés
                                  
                                
                              
                              
                                
                                  
                                    Paul Durand
                                    €175.00 dépensés
                                  
                                
                              
                            
                            
                              Ajouter un membre
                            
                          
                        
                      
                    
                  
                

                
                  
                    Supprimer
                  
                  
                    
                      Fermer
                      
                        Modifier
                      
                    
                  
                
              </DialogContent>
            </Dialog>
          )}

          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Nouveau Projet</DialogTitle>
                <DialogDescription>
                  Créez un nouveau projet
                </DialogDescription>
              </DialogHeader>
              
                
                  
                    Nom du projet*
                    
                      
                    
                  

                  
                    Description
                    
                      
                    
                  

                  
                    
                      
                        Date de début
                        
                          
                        
                      
                      
                        Date de fin
                        
                          
                        
                      
                    
                  

                  
                    Budget (€)
                    
                      
                    
                  

                  
                    Membres du projet
                    
                      {selectedMembers.map((member, index) => (
                        
                          {member}
                          <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveMember(member)}>
                            <Icons.close/>
                          </Button>
                        
                      ))}
                      
                        
                          Sélectionnez un membre
                          {availableMembers.map(member => (
                            
                              {member}
                            
                          ))}
                        
                        
                          <Button type="button" size="icon" onClick={handleAddMember}>
                            <Icons.plus/>
                          </Button>
                        
                      
                    
                  

                  
                    Tags
                    
                      {tags.map((tag, index) => (
                        
                          {tag}
                          <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveTag(tag)}>
                            <Icons.close/>
                          </Button>
                        
                      ))}
                      
                        
                          
                        
                        
                          <Button type="button" size="icon" onClick={handleAddTag}>
                            <Icons.plus/>
                          </Button>
                        
                      
                    
                  

                  
                    Annuler
                     asChild>
                        Fermer
                      
                   asChild>
                        Enregistrer
                      
                    
                  
                
              
            </DialogContent>
          </Dialog>

          
            
              Confirmer la suppression
              
                
              
              Êtes-vous sûr de vouloir supprimer ce projet? Cette action est irréversible et toutes les données associées seront perdues.
              
                Annuler
                
                  
                    Supprimer
                  
                
              
            
          
        
      
    
  );
}

