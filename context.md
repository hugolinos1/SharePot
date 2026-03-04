# Contexte du Projet : SharePot (Dépense Partagée)

## 🎯 Objectif
Développer une application web professionnelle en français pour la gestion et le partage de dépenses de groupe. L'accent est mis sur l'automatisation (IA), la simplicité d'utilisation (OCR, conversion de devises) et la précision des remboursements.

## 🏗️ Architecture Technique

### 🔑 Core Stack
- **Framework** : Next.js 15 (App Router)
- **Langage** : TypeScript
- **Backend** : Firebase (Authentication, Firestore, Storage)
- **UI** : Tailwind CSS, Shadcn UI, Lucide React
- **IA** : Genkit avec les modèles Google Gemini (2.0 Flash / 1.5 Pro)
- **Graphiques** : Recharts

### 📁 Structure des Fichiers Clés
- `src/app/` : Routes de l'application.
    - `dashboard/` : Vue d'ensemble globale, statistiques et balances.
    - `projects/` : Gestion des projets, détails et algorithme de remboursement.
    - `expenses/` : CRUD des dépenses avec intégration OCR.
    - `api/` : Routes serveurs (extraction de données via IA, envoi d'emails SMTP).
- `src/components/` : Composants réutilisables.
    - `projects/project-expense-settlement.tsx` : Logique de calcul des dettes.
    - `dashboard/balance-summary.tsx` : Résumé financier global.
- `src/contexts/AuthContext.tsx` : Gestion globale de l'utilisateur, de son profil et de son avatar généré par IA.
- `src/ai/flows/` : Workflows Genkit (catégorisation automatique, génération d'avatars).
- `src/services/currency-converter.ts` : Service de conversion de devises en temps réel vers l'EUR.

## 🧠 Décisions Importantes
1.  **Référentiel EUR** : Toutes les dépenses sont converties et stockées avec une valeur pivot en EUR (`amountEUR`) pour permettre des calculs de balance cohérents entre membres.
2.  **Algorithme de Remboursement ("Greedy")** : Utilisation d'un algorithme optimisé qui minimise le nombre de transactions nécessaires pour équilibrer les comptes.
3.  **Sécurité Firestore** : Passage à une collection unique `users` (au lieu de `userProfiles`) pour simplifier les règles et garantir que chaque membre peut voir le nom de ses partenaires de projet.
4.  **IA Multimodale** : Utilisation de Gemini 1.5 Pro pour l'analyse OCR des factures car il gère mieux la lecture d'images complexes.
5.  **SMTP Gmail** : Choix de Gmail avec mot de passe d'application pour l'envoi des invitations par email.

## ⚠️ Ne pas toucher (Sensible)
- `src/firebase/config.ts` & `src/lib/firebase.ts` : Configuration critique de la base de données.
- `src/components/projects/project-expense-settlement.tsx` : La logique de l'algorithme de remboursement est finement réglée.
- `firestore.rules` : Les règles de sécurité sont synchronisées avec la structure des collections `users`, `projects` et `expenses`.

## 📈 État Actuel & Prochaines Étapes

### État Actuel
- Authentification et profils fonctionnels.
- Création de projets et invitation par email opérationnelles.
- Ajout de dépenses avec conversion automatique et suggestion de catégorie par IA.
- Analyse OCR fonctionnelle (capture caméra ou upload).
- Répartition des paiements corrigée et synchronisée entre le tableau de bord et la fiche projet.

### Prochaines Étapes
1.  **Stockage des Justificatifs** : Finaliser la persistance des images de factures dans Firebase Storage après l'analyse OCR.
2.  **Notifications** : Ajouter des notifications in-app pour les nouveaux membres ou les nouvelles dépenses.
3.  **Optimisation Mobile** : Affiner certains éléments de l'interface pour une expérience encore plus fluide sur smartphone.
