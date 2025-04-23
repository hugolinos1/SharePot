'use client';

import {Button} from "@/components/ui/button";
import {useRouter} from 'next/navigation';
import {Icons} from "@/components/icons";
import Link from "next/link";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faBell, faPlus, faProjectDiagram, faArrowRight, faTimes, faTrashAlt, faSave, faEdit} from "@fortawesome/free-solid-svg-icons";

export default function ProjectsPage() {
  const router = useRouter();

  return (
    
      
        
          
            
              <FontAwesomeIcon icon={faProjectDiagram} className="mr-2"/>
              ExpenseShare
            
          
          
            
              
                
                  
                    <button className="p-2 text-gray-500 hover:text-blue-600">
                      <FontAwesomeIcon icon={faBell}/>
                    </button>
                    
                      
                        Admin User
                        <img src="https://ui-avatars.com/api/?name=Admin+User&background=4f46e5&color=fff"
                             alt="User" className="w-8 h-8 rounded-full"/>
                      
                    
                  
                
              
            
          
        
      

      
        
          
            
              Gestion des Projets
              Créez et gérez vos projets collaboratifs
            
            
              Nouveau Projet
            
          
        

        
          
            
              
                
                  Voyage à Paris
                  Actif
                
                Vacances d'été avec l'équipe

                
                  
                    Dépenses totales
                    €1,245.50
                  
                  
                    Dernière activité
                    15 juin 2023
                  
                

                
                  
                    Budget
                    €2,000.00
                  
                  
                    
                  
                

                
                  
                    
                      <img src="https://ui-avatars.com/api/?name=Jean+Dupont&background=4f46e5&color=fff"
                           alt="Member" className="w-8 h-8 rounded-full border-2 border-white member-avatar"/>
                      <img src="https://ui-avatars.com/api/?name=Marie+Martin&background=8b5cf6&color=fff"
                           alt="Member" className="w-8 h-8 rounded-full border-2 border-white member-avatar"/>
                      <img src="https://ui-avatars.com/api/?name=Paul+Durand&background=10b981&color=fff"
                           alt="Member" className="w-8 h-8 rounded-full border-2 border-white member-avatar"/>
                      
                        +2
                      
                    
                  
                  
                    Voir détails 
                  
                
              
            

            
              
                
                  Événement Startup
                  En attente
                
                Conférence annuelle des startups

                
                  
                    Dépenses totales
                    €780.00
                  
                  
                    Dernière activité
                    3 juin 2023
                  
                

                
                  
                    Budget
                    €5,000.00
                  
                  
                    
                  
                

                
                  
                    
                      <img src="https://ui-avatars.com/api/?name=Admin+User&background=4f46e5&color=fff"
                           alt="Member" className="w-8 h-8 rounded-full border-2 border-white member-avatar"/>
                      <img src="https://ui-avatars.com/api/?name=Sarah+Leroy&background=f59e0b&color=fff"
                           alt="Member" className="w-8 h-8 rounded-full border-2 border-white member-avatar"/>
                    
                  
                  
                    Voir détails 
                  
                
              
            

            
              
                
                  Déménagement Bureau
                  Terminé
                
                Relocalisation des bureaux

                
                  
                    Dépenses totales
                    €3,420.75
                  
                  
                    Dernière activité
                    15 mai 2023
                  
                

                
                  
                    Budget
                    €3,500.00
                  
                  
                    
                  
                

                
                  
                    
                      <img src="https://ui-avatars.com/api/?name=Admin+User&background=4f46e5&color=fff"
                           alt="Member" className="w-8 h-8 rounded-full border-2 border-white member-avatar"/>
                      <img src="https://ui-avatars.com/api/?name=Lucie+Petit&background=8b5cf6&color=fff"
                           alt="Member" className="w-8 h-8 rounded-full border-2 border-white member-avatar"/>
                      
                        +5
                      
                    
                  
                  
                    Voir détails 
                  
                
              
            
          
        

        
          
            
              
                
                  Voyage à Paris
                  
                
                Vacances d'été avec l'équipe
                
                  
                
              

              
                
                  
                    
                      Dépenses récentes
                      
                        
                          
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
                          
                        
                      
                      
                        Voir toutes les dépenses 
                      
                    

                    
                      
                        Notes du projet
                        
                          
                            Projet de vacances pour l'équipe du 15 au 20 juin 2023. Budget total de €2000.
                            Hôtel réservé pour 5 personnes. Activités prévues : visite de la Tour Eiffel, croisière sur la Seine, et journée à Disneyland.
                            Les repas du midi sont à la charge de chacun. Les dîners sont pris en charge par le projet.
                          
                        
                      
                    
                  

                  
                    
                      
                        Statistiques
                        
                          
                            
                              Budget total
                              €2,000.00
                            
                            
                              Dépenses totales
                              €1,245.50
                            
                            
                              Budget restant
                              €754.50
                            
                            
                              Pourcentage utilisé
                              
                                
                              
                              62%
                            
                          
                        

                        
                          
                            
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
                      
                    
                  
                
              
            
          

          
            
              
                
                  Nouveau Projet
                  
                    
                  
                
              

              
                
                  
                    Nom du projet*
                    
                      
                    
                  

                  
                    Description
                    
                      
                    
                  

                  
                    
                      
                        Date de début
                        
                          
                        
                      
                      
                        Date de fin
                        
                          
                        
                      
                    
                  

                  
                    Budget (€)
                    
                      
                    
                  

                  
                    Membres du projet
                    
                      
                        {/* Selected members will appear here */}
                      
                      
                        
                          Sélectionnez un membre
                          Jean Dupont
                          Marie Martin
                          Paul Durand
                          Lucie Petit
                          Sarah Leroy
                        
                        
                          
                        
                      
                    
                  

                  
                    Tags
                    
                      
                        
                          voyage
                          
                            
                              
                            
                          
                          équipe
                          
                            
                              
                            
                          
                        
                      
                      
                        
                          
                        
                        
                          
                        
                      
                    
                  

                  
                    
                      Annuler
                    
                    
                      
                        Enregistrer
                      
                    
                  
                
              
            
          

          
            
              
                
                  Confirmer la suppression
                  
                    
                  
                
                Êtes-vous sûr de vouloir supprimer ce projet? Cette action est irréversible et toutes les données associées seront perdues.
                
                  
                    Annuler
                  
                  
                    
                      Supprimer
                    
                  
                
              
            
          
        
      
    
  );
}
