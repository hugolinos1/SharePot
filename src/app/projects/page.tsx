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
    
      
        
          <h1 className="text-2xl font-bold text-blue-600">
            <FontAwesomeIcon icon={faProjectDiagram} className="mr-2"/> ExpenseShare
          </h1>
          <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-500 hover:text-blue-600">
              <FontAwesomeIcon icon={faBell}/>
            </button>
            <div className="relative">
              <button className="flex items-center space-x-2 focus:outline-none" id="user-menu-button">
                <span className="text-sm font-medium">Admin User</span>
                <img src="https://ui-avatars.com/api/?name=Admin+User&amp;background=4f46e5&amp;color=fff"
                     alt="User" className="w-8 h-8 rounded-full"/>
              </button>
            </div>
          </div>
        
      

      
        
          
            <h2 className="text-2xl font-bold text-gray-800">Gestion des Projets</h2>
            <p className="text-gray-600">Créez et gérez vos projets collaboratifs</p>
          
          <Button onClick={() => router.push('/projects/create')}
                  className="mt-4 md:mt-0 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center">
            <FontAwesomeIcon icon={faPlus} className="mr-2"/> Nouveau Projet
          </Button>
        

        
          
            {/* Project Card 1 */}
            
              
                
                  <h3 className="text-lg font-semibold text-gray-800">Voyage à Paris</h3>
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Actif</span>
                
                <p className="text-gray-600 text-sm mb-4">Vacances d'été avec l'équipe</p>

                
                  
                    <p className="text-xs text-gray-500">Dépenses totales</p>
                    <p className="font-semibold">€1,245.50</p>
                  
                  
                    <p className="text-xs text-gray-500">Dernière activité</p>
                    <p className="text-sm">15 juin 2023</p>
                  
                

                
                  
                    <span>Budget</span>
                    <span>€2,000.00</span>
                  
                  
                    
                  
                

                
                  
                    
                      <img src="https://ui-avatars.com/api/?name=Jean+Dupont&amp;background=4f46e5&amp;color=fff"
                           alt="Member" className="w-8 h-8 rounded-full border-2 border-white member-avatar"/>
                      <img src="https://ui-avatars.com/api/?name=Marie+Martin&amp;background=8b5cf6&amp;color=fff"
                           alt="Member" className="w-8 h-8 rounded-full border-2 border-white member-avatar"/>
                      <img src="https://ui-avatars.com/api/?name=Paul+Durand&amp;background=10b981&amp;color=fff"
                           alt="Member" className="w-8 h-8 rounded-full border-2 border-white member-avatar"/>
                      <span
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 border-2 border-white text-xs font-medium">
                        +2
                      </span>
                    
                  
                  
                    Voir détails <FontAwesomeIcon icon={faArrowRight} className="ml-1"/>
                  
                
              
            

            
              
                
                  <h3 className="text-lg font-semibold text-gray-800">Événement Startup</h3>
                  <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">En attente</span>
                
                <p className="text-gray-600 text-sm mb-4">Conférence annuelle des startups</p>

                
                  
                    <p className="text-xs text-gray-500">Dépenses totales</p>
                    <p className="font-semibold">€780.00</p>
                  
                  
                    <p className="text-xs text-gray-500">Dernière activité</p>
                    <p className="text-sm">3 juin 2023</p>
                  
                

                
                  
                    <span>Budget</span>
                    <span>€5,000.00</span>
                  
                  
                    
                  
                

                
                  
                    
                      <img src="https://ui-avatars.com/api/?name=Admin+User&amp;background=4f46e5&amp;color=fff"
                           alt="Member" className="w-8 h-8 rounded-full border-2 border-white member-avatar"/>
                      <img src="https://ui-avatars.com/api/?name=Sarah+Leroy&amp;background=f59e0b&amp;color=fff"
                           alt="Member" className="w-8 h-8 rounded-full border-2 border-white member-avatar"/>
                    
                  
                  
                    Voir détails <FontAwesomeIcon icon={faArrowRight} className="ml-1"/>
                  
                
              
            

            
              
                
                  <h3 className="text-lg font-semibold text-gray-800">Déménagement Bureau</h3>
                  <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">Terminé</span>
                
                <p className="text-gray-600 text-sm mb-4">Relocalisation des bureaux</p>

                
                  
                    <p className="text-xs text-gray-500">Dépenses totales</p>
                    <p className="font-semibold">€3,420.75</p>
                  
                  
                    <p className="text-xs text-gray-500">Dernière activité</p>
                    <p className="text-sm">15 mai 2023</p>
                  
                

                
                  
                    <span>Budget</span>
                    <span>€3,500.00</span>
                  
                  
                    
                  
                

                
                  
                    
                      <img src="https://ui-avatars.com/api/?name=Admin+User&amp;background=4f46e5&amp;color=fff"
                           alt="Member" className="w-8 h-8 rounded-full border-2 border-white member-avatar"/>
                      <img src="https://ui-avatars.com/api/?name=Lucie+Petit&amp;background=8b5cf6&amp;color=fff"
                           alt="Member" className="w-8 h-8 rounded-full border-2 border-white member-avatar"/>
                      <span
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 border-2 border-white text-xs font-medium">
                        +5
                      </span>
                    
                  
                  
                    Voir détails <FontAwesomeIcon icon={faArrowRight} className="ml-1"/>
                  
                
              
            
          
        

        
          
            
              
                
                  <h3 className="text-2xl font-bold text-gray-800" id="modal-project-title">Voyage à Paris</h3>
                  <p className="text-gray-600" id="modal-project-description">Vacances d'été avec l'équipe</p>
                
                
                  <FontAwesomeIcon icon={faTimes}/>
                
              

              
                
                  
                    
                      <h4 className="font-medium text-gray-800 mb-3">Dépenses récentes</h4>
                      
                        
                          
                            <p className="font-medium">Hôtel Mercure</p>
                            <p className="text-sm text-gray-500">12 juin 2023</p>
                          
                          
                            <p className="font-semibold">€450.00</p>
                            <p className="text-xs text-gray-500">Jean Dupont</p>
                          
                        
                        
                          
                            <p className="font-medium">Billets de train</p>
                            <p className="text-sm text-gray-500">10 juin 2023</p>
                          
                          
                            <p className="font-semibold">€320.50</p>
                            <p className="text-xs text-gray-500">Marie Martin</p>
                          
                        
                        
                          
                            <p className="font-medium">Dîner au restaurant</p>
                            <p className="text-sm text-gray-500">8 juin 2023</p>
                          
                          
                            <p className="font-semibold">€175.00</p>
                            <p className="text-xs text-gray-500">Paul Durand</p>
                          
                        
                      
                      
                        Voir toutes les dépenses <FontAwesomeIcon icon={faArrowRight} className="ml-1"/>
                      
                    

                    
                      <h4 className="font-medium text-gray-800 mb-3">Notes du projet</h4>
                      
                        
                          Projet de vacances pour l'équipe du 15 au 20 juin 2023. Budget total de €2000.
                          Hôtel réservé pour 5 personnes. Activités prévues : visite de la Tour Eiffel, croisière sur la Seine, et journée à Disneyland.
                          Les repas du midi sont à la charge de chacun. Les dîners sont pris en charge par le projet.
                        
                      
                    
                  

                  
                    
                      <h4 className="font-medium text-gray-800 mb-3">Statistiques</h4>
                      
                        
                          
                            <p className="text-sm text-gray-500">Budget total</p>
                            <p className="font-semibold">€2,000.00</p>
                          
                          
                            <p className="text-sm text-gray-500">Dépenses totales</p>
                            <p className="font-semibold">€1,245.50</p>
                          
                          
                            <p className="text-sm text-gray-500">Budget restant</p>
                            <p className="font-semibold text-green-600">€754.50</p>
                          
                          
                            <p className="text-sm text-gray-500">Pourcentage utilisé</p>
                            
                              
                            
                            <p className="text-right text-sm font-medium mt-1">62%</p>
                          
                        
                      

                      
                        
                          <h4 className="font-medium text-gray-800 mb-3">Membres</h4>
                          
                            
                              
                                <img src="https://ui-avatars.com/api/?name=Jean+Dupont&amp;background=4f46e5&amp;color=fff"
                                     alt="Member" className="w-8 h-8 rounded-full"/>
                                
                                  <p className="font-medium">Jean Dupont</p>
                                  <p className="text-xs text-gray-500">€450.00 dépensés</p>
                                
                              
                            
                            
                              
                                <img src="https://ui-avatars.com/api/?name=Marie+Martin&amp;background=8b5cf6&amp;color=fff"
                                     alt="Member" className="w-8 h-8 rounded-full"/>
                                
                                  <p className="font-medium">Marie Martin</p>
                                  <p className="text-xs text-gray-500">€320.50 dépensés</p>
                                
                              
                            
                            
                              
                                <img src="https://ui-avatars.com/api/?name=Paul+Durand&amp;background=10b981&amp;color=fff"
                                     alt="Member" className="w-8 h-8 rounded-full"/>
                                
                                  <p className="font-medium">Paul Durand</p>
                                  <p className="text-xs text-gray-500">€175.00 dépensés</p>
                                
                              
                            
                          
                          
                            <FontAwesomeIcon icon={faPlus} className="mr-1"/> Ajouter un membre
                          
                        
                      
                    
                  
                

                
                  
                    Supprimer
                  
                  
                    
                      Fermer
                    
                    
                      <FontAwesomeIcon icon={faEdit} className="mr-2"/> Modifier
                    
                  
                
              
            
          

          
            
              
                
                  <h3 className="text-xl font-bold text-gray-800">Nouveau Projet</h3>
                  
                    <FontAwesomeIcon icon={faTimes}/>
                  
                
              

              
                
                  
                    <label htmlFor="project-name"
                           className="block text-sm font-medium text-gray-700 mb-1">Nom du projet*</label>
                    
                      
                    
                  

                  
                    <label htmlFor="project-description"
                           className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    
                      
                    
                  

                  
                    
                      
                        <label htmlFor="project-start-date"
                               className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
                        
                          
                        
                      
                      
                        <label htmlFor="project-end-date"
                               className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
                        
                          
                        
                      
                    
                  

                  
                    <label htmlFor="project-budget"
                           className="block text-sm font-medium text-gray-700 mb-1">Budget (€)</label>
                    
                      
                    
                  

                  
                    <label className="block text-sm font-medium text-gray-700 mb-2">Membres du projet</label>
                    
                      
                        {/* Selected members will appear here */}
                      
                      
                        
                          Sélectionnez un membre
                          Jean Dupont
                          Marie Martin
                          Paul Durand
                          Lucie Petit
                          Sarah Leroy
                        
                        
                          <FontAwesomeIcon icon={faPlus}/>
                        
                      
                    
                  

                  
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                    
                      
                        
                          voyage
                          
                            
                              <FontAwesomeIcon icon={faTimes}/>
                            
                          
                          équipe
                          
                            
                              <FontAwesomeIcon icon={faTimes}/>
                            
                          
                        
                      
                      
                        
                          
                        
                        
                          <FontAwesomeIcon icon={faPlus}/>
                        
                      
                    
                  

                  
                    
                      Annuler
                    
                    
                      <FontAwesomeIcon icon={faSave} className="mr-2"/> Enregistrer
                    
                  
                
              
            
          

          
            
              
                
                  Confirmer la suppression
                  
                    <FontAwesomeIcon icon={faTimes}/>
                  
                
                Êtes-vous sûr de vouloir supprimer ce projet? Cette action est irréversible et toutes les données associées seront perdues.
                
                  
                    Annuler
                  
                  
                    <FontAwesomeIcon icon={faTrashAlt} className="mr-2"/> Supprimer
                  
                
              
            
          
        
      
    
  );
}

