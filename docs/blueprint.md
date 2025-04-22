# **App Name**: Dépense Partagée

## Core Features:

- Responsive Layout: Implement a responsive layout using Tailwind CSS that adapts to different screen sizes.
- Expense Management UI: Develop a user interface for creating and editing expenses, including validated fields and feedback for loading, success, and error states.
- AI Expense Tagging: Implement AI-powered tagging for expenses by analyzing descriptions and suggesting thematic tags (e.g., food, transport).
- Expense Visualization: Generate dynamic charts to visualize expense distribution per project member and category using Recharts.
- Admin Interface: Create an admin interface for managing users and projects with restricted access based on user roles (admin vs. regular user).

## Style Guidelines:

- Primary color: Use a modern shade of blue as the main color.
- Secondary color: Light gray for backgrounds and subtle contrasts.
- Accent: Teal (#008080) for interactive elements and highlights.
- Use a clean, card-based layout for displaying expenses and project details.
- Employ Lucide React icons for a consistent and minimalist design.
- Incorporate subtle transitions and feedback animations to enhance user experience.

## Original User Request:
________________________________________
🎯 Objectif
Développer une application web complète de gestion et partage de dépenses, disponible en langue française, avec une interface professionnelle, responsive, et une architecture prête pour la production.
________________________________________
🔐 Authentification & Gestion des utilisateurs
•	Authentification par email / mot de passe via Firebase.
•	Administrateur dédié (hugues.rabier@gmail.com) avec droits étendus : gestion des utilisateurs, projets, et dépenses.
•	Fonctionnalité de réinitialisation de mot de passe sécurisée.
•	Règles RLS et contrôle d'accès aux routes réservées à l'admin.
•	Tous les utilisateurs peuvent appartenir à plusieurs projets simultanément.
________________________________________
💰 Suivi des Dépenses
•	Suivi des dépenses avec : montant, description, devise (EUR par défaut), et projet associé.
•	Conversion automatique des devises (ex : CZK → EUR) via l’API Gemini.
•	Interface de création/édition des dépenses :
o	Champs validés
o	États de chargement / succès / erreurs
•	Possibilité pour les utilisateurs réguliers de créer, modifier, ou supprimer leurs propres dépenses uniquement.
•	Les administrateurs peuvent créer des dépenses pour n’importe quel utilisateur.
________________________________________
🧠 Classification IA des Dépenses
•	Utilisation d'une IA pour analyser automatiquement les descriptions et associer des tags thématiques (ex : nourriture, restaurant, transport, musée, divertissement).
•	Moteur intelligent pour une suggestion de tag automatisée à la saisie ou à l'import d’un justificatif.
________________________________________
📊 Visualisation & Tableaux de Bord
•	Génération de graphiques dynamiques (via Recharts) pour :
o	Répartition des dépenses par membre d’un projet en barre et tracé d’une ligne indiquant la moyenne des dépenses
o	Répartition des dépenses par catégorie (Tag)
•	Page de synthèse des dépenses incluant totaux, conversions, indication claire de quoi doit quoi à quoi en fonction des dépenses déjà engagées par chacun et représentations visuelles.
________________________________________
📁 Téléversement & Traitement d’Images
•	Téléversement de justificatifs (photos, scans) lors de la création de dépenses.
•	Extraction automatique via OCR :
o	Montant
o	Devise
o	Date
o	Description
•	Conversion automatique en EUR (Gemini API) si devise détectée ≠ EUR.
________________________________________
🗂️ Gestion de Projets
•	Les administrateurs peuvent créer, modifier et supprimer des projets.
•	Les utilisateurs peuvent lier chaque dépense à un projet spécifique.
•	Suivi des dépenses par projet, avec ventilation des montants.
________________________________________
⚙️ Technologies utilisées
•	React + TypeScript + Vite
•	Firebase : authentification + base de données
•	Tailwind CSS : design moderne et responsive
•	React Router : navigation
•	Lucide React : icônes
•	Recharts : graphiques
________________________________________
🧾 Schéma de base de données
profiles
•	id (uuid, issu de l'auth Firebase)
•	name (texte)
•	is_admin (booléen)
•	created_at (timestamp)
•	avatar_url (texte, optionnel)
expenses
•	id (uuid)
•	amount (numérique)
•	currency (texte)
•	description (texte)
•	created_by (uuid → profiles)
•	project_id (uuid → projects)
•	created_at / updated_at (timestamps)
•	tags (array de texte)
projects
•	id (uuid)
•	name (texte)
•	created_by (uuid → profiles)
•	created_at (timestamp)
________________________________________
🧭 Pages de l'application
•	/login – Connexion
•	/register – Inscription
•	/reset-password – Réinitialisation du mot de passe
•	/dashboard – Tableau de bord et synthèse graphique
•	/expenses/new – Nouvelle dépense
•	/expenses/edit/:id – Modifier une dépense
•	/projects – Gestion des projets (admin)
•	/users – Gestion des utilisateurs (admin)
________________________________________
✅ Fonctionnalités UX/UI attendues
•	Design épuré et moderne (bleu comme couleur principale)
•	Entièrement responsive (mobile + desktop)
•	Feedback utilisateur : chargement, erreurs, succès
•	Navigation fluide et intuitive
•	Accessibilité renforcée (focus, aria-labels, etc.)
________________________________________
🔒 Sécurité & Production
•	Authentification Firebase avec règles de sécurité RLS
•	Accès restreint aux routes sensibles
•	Interface prête pour déploiement en production
  