"use client";

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faProjectDiagram, faBell, faPlus, faArrowRight, faTimes, faTrashAlt, faSave, faEdit } from '@fortawesome/free-solid-svg-icons';
import { library } from '@fortawesome/fontawesome-svg-core';
import { useRouter } from 'next/navigation';

library.add(faProjectDiagram, faBell, faPlus, faArrowRight, faTimes, faTrashAlt, faSave, faEdit);

const ProjectsPage = () => {
    const router = useRouter();

    const openProjectModal = () => {
        const modal = document.getElementById('new-project-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    };

    const closeNewProjectModal = () => {
        const modal = document.getElementById('new-project-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    };

    const viewProject = (projectId: string) => {
        const modalTitle = document.getElementById('modal-project-title');
        const modalDescription = document.getElementById('modal-project-description');
        const projectModal = document.getElementById('project-modal');

        if (modalTitle && modalDescription && projectModal) {
            modalTitle.textContent = "Voyage à Paris";
            modalDescription.textContent = "Vacances d'été avec l'équipe";
            projectModal.classList.remove('hidden');
        }
    };

    const closeProjectModal = () => {
        const projectModal = document.getElementById('project-modal');
        if (projectModal) {
            projectModal.classList.add('hidden');
        }
    };

    const editCurrentProject = () => {
        closeProjectModal();
        openProjectModal();
        const projectNameInput = document.getElementById('project-name') as HTMLInputElement;
        const projectDescriptionInput = document.getElementById('project-description') as HTMLTextAreaElement;

        if (projectNameInput && projectDescriptionInput) {
            projectNameInput.value = "Voyage à Paris";
            projectDescriptionInput.value = "Vacances d'été avec l'équipe";
        }
    };

    const confirmDeleteProject = () => {
        closeProjectModal();
        const deleteConfirmModal = document.getElementById('delete-confirm-modal');
        if (deleteConfirmModal) {
            deleteConfirmModal.classList.remove('hidden');
        }
    };

    const closeDeleteConfirmModal = () => {
        const deleteConfirmModal = document.getElementById('delete-confirm-modal');
        if (deleteConfirmModal) {
            deleteConfirmModal.classList.add('hidden');
        }
    };

    const deleteProject = () => {
        closeDeleteConfirmModal();
        alert("Projet supprimé avec succès!");
    };

    const addMember = () => {
        const select = document.getElementById('member-select') as HTMLSelectElement;
        const memberId = select.value;
        const memberName = select.options[select.selectedIndex].text;

        if (memberId && !document.getElementById(`member-${memberId}`)) {
            const selectedMembers = document.getElementById('selected-members');
            if (selectedMembers) {
                const memberBadge = document.createElement('div');
                memberBadge.id = `member-${memberId}`;
                memberBadge.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800';
                memberBadge.innerHTML = `
                    ${memberName}
                    <button type="button" onclick="removeMember('${memberId}')" class="ml-1 text-blue-500 hover:text-blue-700">
                        <i className="fas fa-times"></i>
                    </button>
                `;
                selectedMembers.appendChild(memberBadge);
            }
        }
    };

    const removeMember = (memberId: string) => {
        const memberBadge = document.getElementById(`member-${memberId}`);
        if (memberBadge) {
            memberBadge.remove();
        }
    };

    const addTag = () => {
        const tagInput = document.getElementById('tag-input') as HTMLInputElement;
        const tagValue = tagInput.value.trim();

        if (tagValue && !document.getElementById(`tag-${tagValue}`)) {
            const selectedTags = document.getElementById('selected-tags');
            if (selectedTags) {
                const tagBadge = document.createElement('span');
                tagBadge.id = `tag-${tagValue}`;
                tagBadge.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 tag-pill';
                tagBadge.innerHTML = `
                    ${tagValue}
                    <button type="button" onclick="removeTag('${tagValue}')" class="ml-1 text-gray-500 hover:text-gray-700">
                        <i className="fas fa-times"></i>
                    </button>
                `;
                selectedTags.appendChild(tagBadge);
                tagInput.value = '';
            }
        }
    };

    const removeTag = (tagValue: string) => {
        const tagBadge = document.getElementById(`tag-${tagValue}`);
        if (tagBadge) {
            tagBadge.remove();
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const projectName = (document.getElementById('project-name') as HTMLInputElement).value;
        alert(`Projet "${projectName}" enregistré avec succès!`);
        closeNewProjectModal();
        form.reset();
        const selectedMembers = document.getElementById('selected-members');
        const selectedTags = document.getElementById('selected-tags');
        if (selectedMembers) selectedMembers.innerHTML = '';
        if (selectedTags) selectedTags.innerHTML = '';
    };

    return (
        
            
                
                    
                        <h1 className="text-2xl font-bold text-blue-600">
                            <FontAwesomeIcon icon="project-diagram" className="mr-2" /> ExpenseShare
                        </h1>
                        <div className="flex items-center space-x-4">
                            <button className="p-2 text-gray-500 hover:text-blue-600">
                                <FontAwesomeIcon icon="bell" />
                            </button>
                            <div className="relative">
                                <button className="flex items-center space-x-2 focus:outline-none" id="user-menu-button">
                                    <span className="text-sm font-medium">Admin User</span>
                                    <img src="https://ui-avatars.com/api/?name=Admin+User&background=4f46e5&color=fff"
                                         alt="User" className="w-8 h-8 rounded-full" />
                                </button>
                            </div>
                        </div>
                    
                

                
                    
                        
                            <h2 className="text-2xl font-bold text-gray-800">Gestion des Projets</h2>
                            <p className="text-gray-600">Créez et gérez vos projets collaboratifs</p>
                        
                        <button onClick={openProjectModal}
                                className="mt-4 md:mt-0 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center">
                            <FontAwesomeIcon icon="plus" className="mr-2" /> Nouveau Projet
                        </button>
                    

                    
                        
                            
                                
                                    <h3 className="text-lg font-semibold text-gray-800">Voyage à Paris</h3>
                                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Actif</span>
                                
                                <p className="text-gray-600 text-sm mb-4">Vacances d'été avec l'équipe</p>

                                
                                    
                                        <p className="text-xs text-gray-500">Dépenses totales</p>
                                        <p className="font-semibold">€1,245.50</p>
                                    
                                    
                                        <p className="text-xs text-gray-500">Dernière activité</p>
                                        <p className="text-sm">15 juin 2023</p>
                                    
                                

                                
                                    
                                        <span>Budget</span>
                                        <span>€2,000.00</span>
                                    
                                    
                                        
                                            
                                        
                                    
                                

                                
                                    
                                        <img src="https://ui-avatars.com/api/?name=Jean+Dupont&background=4f46e5&color=fff"
                                             alt="Member" className="w-8 h-8 rounded-full border-2 border-white member-avatar" />
                                        <img src="https://ui-avatars.com/api/?name=Marie+Martin&background=8b5cf6&color=fff"
                                             alt="Member" className="w-8 h-8 rounded-full border-2 border-white member-avatar" />
                                        <img src="https://ui-avatars.com/api/?name=Paul+Durand&background=10b981&color=fff"
                                             alt="Member" className="w-8 h-8 rounded-full border-2 border-white member-avatar" />
                                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 border-2 border-white text-xs font-medium">
                                            +2
                                        </span>
                                    
                                    <button onClick={() => viewProject('voyage-paris')}
                                            className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                        Voir détails <FontAwesomeIcon icon="arrow-right" className="ml-1" />
                                    </button>
                                
                            
                        

                        
                            
                                
                                    <h3 className="text-lg font-semibold text-gray-800">Événement Startup</h3>
                                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">En attente</span>
                                
                                <p className="text-gray-600 text-sm mb-4">Conférence annuelle des startups</p>

                                
                                    
                                        <p className="text-xs text-gray-500">Dépenses totales</p>
                                        <p className="font-semibold">€780.00</p>
                                    
                                    
                                        <p className="text-xs text-gray-500">Dernière activité</p>
                                        <p className="text-sm">3 juin 2023</p>
                                    
                                

                                
                                    
                                        <span>Budget</span>
                                        <span>€5,000.00</span>
                                    
                                    
                                        
                                            
                                        
                                    
                                

                                
                                    
                                        <img src="https://ui-avatars.com/api/?name=Admin+User&background=4f46e5&color=fff"
                                             alt="Member" className="w-8 h-8 rounded-full border-2 border-white member-avatar" />
                                        <img src="https://ui-avatars.com/api/?name=Sarah+Leroy&background=f59e0b&color=fff"
                                             alt="Member" className="w-8 h-8 rounded-full border-2 border-white member-avatar" />
                                    
                                    <button onClick={() => viewProject('event-startup')}
                                            className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                        Voir détails <FontAwesomeIcon icon="arrow-right" className="ml-1" />
                                    </button>
                                
                            
                        

                        
                            
                                
                                    <h3 className="text-lg font-semibold text-gray-800">Déménagement Bureau</h3>
                                    <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">Terminé</span>
                                
                                <p className="text-gray-600 text-sm mb-4">Relocalisation des bureaux</p>

                                
                                    
                                        <p className="text-xs text-gray-500">Dépenses totales</p>
                                        <p className="font-semibold">€3,420.75</p>
                                    
                                    
                                        <p className="text-xs text-gray-500">Dernière activité</p>
                                        <p className="text-sm">15 mai 2023</p>
                                    
                                

                                
                                    
                                        <span>Budget</span>
                                        <span>€3,500.00</span>
                                    
                                    
                                        
                                            
                                        
                                    
                                

                                
                                    
                                        <img src="https://ui-avatars.com/api/?name=Admin+User&background=4f46e5&color=fff"
                                             alt="Member" className="w-8 h-8 rounded-full border-2 border-white member-avatar" />
                                        <img src="https://ui-avatars.com/api/?name=Lucie+Petit&background=8b5cf6&color=fff"
                                             alt="Member" className="w-8 h-8 rounded-full border-2 border-white member-avatar" />
                                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 border-2 border-white text-xs font-medium">
                                            +5
                                        </span>
                                    
                                    <button onClick={() => viewProject('demenagement-bureau')}
                                            className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                        Voir détails <FontAwesomeIcon icon="arrow-right" className="ml-1" />
                                    </button>
                                
                            
                        
                    
                

                
                    
                        
                            
                                <h3 className="text-2xl font-bold text-gray-800" id="modal-project-title">Voyage à Paris</h3>
                                <p className="text-gray-600" id="modal-project-description">Vacances d'été avec l'équipe</p>
                            
                            <button onClick={closeProjectModal} className="text-gray-500 hover:text-gray-700">
                                <FontAwesomeIcon icon="times" />
                            </button>
                        

                        
                            
                                
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
                                            
                                        
                                    
                                    <button className="mt-4 w-full text-center text-blue-600 hover:text-blue-800 font-medium">
                                        Voir toutes les dépenses <FontAwesomeIcon icon="arrow-right" className="ml-1" />
                                    </button>
                                

                                
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
                                    
                                        
                                            
                                                <img src="https://ui-avatars.com/api/?name=Jean+Dupont&background=4f46e5&color=fff"
                                                     alt="Member" className="w-8 h-8 rounded-full" />
                                                
                                                    <p className="font-medium">Jean Dupont</p>
                                                    <p className="text-xs text-gray-500">€450.00 dépensés</p>
                                                
                                            
                                        
                                        
                                            
                                                <img src="https://ui-avatars.com/api/?name=Marie+Martin&background=8b5cf6&color=fff"
                                                     alt="Member" className="w-8 h-8 rounded-full" />
                                                
                                                    <p className="font-medium">Marie Martin</p>
                                                    <p className="text-xs text-gray-500">€320.50 dépensés</p>
                                                
                                            
                                        
                                        
                                            
                                                <img src="https://ui-avatars.com/api/?name=Paul+Durand&background=10b981&color=fff"
                                                     alt="Member" className="w-8 h-8 rounded-full" />
                                                
                                                    <p className="font-medium">Paul Durand</p>
                                                    <p className="text-xs text-gray-500">€175.00 dépensés</p>
                                                
                                            
                                        
                                    
                                    <button className="mt-3 w-full text-center text-blue-600 hover:text-blue-800 text-sm font-medium">
                                        <FontAwesomeIcon icon="plus" className="mr-1" /> Ajouter un membre
                                    </button>
                                
                            
                        
                    

                    
                        <button onClick={confirmDeleteProject}
                                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center">
                            <FontAwesomeIcon icon="trash-alt" className="mr-2" /> Supprimer
                        </button>
                        
                            <button onClick={closeProjectModal}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                                Fermer
                            </button>
                            <button onClick={editCurrentProject}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                <FontAwesomeIcon icon="edit" className="mr-2" /> Modifier
                            </button>
                        
                    
                
            

            
                
                    
                        
                            <h3 className="text-xl font-bold text-gray-800">Nouveau Projet</h3>
                            <button onClick={closeNewProjectModal} className="text-gray-500 hover:text-gray-700">
                                <FontAwesomeIcon icon="times" />
                            </button>
                        

                        <form id="project-form" onSubmit={handleSubmit}>
                            
                                <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-1">Nom du projet*</label>
                                <input type="text" id="project-name"
                                       className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                       placeholder="Ex: Voyage d'entreprise" required />
                            

                            
                                <label htmlFor="project-description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea id="project-description" rows={3}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                          placeholder="Décrivez le projet..."></textarea>
                            

                            
                                
                                    
                                        <label htmlFor="project-start-date" className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
                                        <input type="date" id="project-start-date"
                                               className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                                    
                                    
                                        <label htmlFor="project-end-date" className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
                                        <input type="date" id="project-end-date"
                                               className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                                    
                                
                            

                            
                                <label htmlFor="project-budget" className="block text-sm font-medium text-gray-700 mb-1">Budget (€)</label>
                                <input type="number" step="0.01" id="project-budget"
                                       className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                       placeholder="0.00" />
                            

                            
                                <label className="block text-sm font-medium text-gray-700 mb-2">Membres du projet</label>
                                
                                    
                                        
                                    
                                
                                
                                    <select id="member-select"
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                                        <option value="">Sélectionnez un membre</option>
                                        <option value="user1">Jean Dupont</option>
                                        <option value="user2">Marie Martin</option>
                                        <option value="user3">Paul Durand</option>
                                        <option value="user4">Lucie Petit</option>
                                        <option value="user5">Sarah Leroy</option>
                                    </select>
                                    <button type="button" onClick={addMember}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700">
                                        <FontAwesomeIcon icon="plus" />
                                    </button>
                                
                            

                            
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                                
                                    
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 tag-pill">
                                            voyage
                                            <button type="button" className="ml-1 text-blue-500 hover:text-blue-700">
                                                <FontAwesomeIcon icon="times" />
                                            </button>
                                        </span>
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 tag-pill">
                                            équipe
                                            <button type="button" className="ml-1 text-green-500 hover:text-green-700">
                                                <FontAwesomeIcon icon="times" />
                                            </button>
                                        </span>
                                    
                                
                                
                                    <input type="text" id="tag-input"
                                           className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                           placeholder="Ajouter un tag" />
                                    <button type="button" onClick={addTag}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700">
                                        <FontAwesomeIcon icon="plus" />
                                    </button>
                                
                            

                            
                                <button type="button" onClick={closeNewProjectModal}
                                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                                    Annuler
                                </button>
                                <button type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                                    <FontAwesomeIcon icon="save" className="mr-2" /> Enregistrer
                                </button>
                            
                        
                    </form>
                
            

            
                
                    
                        <h3 className="text-lg font-bold text-gray-800">Confirmer la suppression</h3>
                        <button onClick={closeDeleteConfirmModal} className="text-gray-500 hover:text-gray-700">
                            <FontAwesomeIcon icon="times" />
                        </button>
                    
                    <p className="text-gray-600 mb-6">Êtes-vous sûr de vouloir supprimer ce projet? Cette action est irréversible et toutes les données associées seront perdues.</p>
                    
                        <button onClick={closeDeleteConfirmModal}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                            Annuler
                        </button>
                        <button onClick={deleteProject}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                            <FontAwesomeIcon icon="trash-alt" className="mr-2" /> Supprimer
                        </button>
                    
                
            
        
    );
};

export default ProjectsPage;
