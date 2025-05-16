
// src/data/mock-data.ts
import type { Timestamp } from 'firebase/firestore';

export interface User {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  avatarUrl?: string;
  avatarStoragePath?: string; // Added to store the path in Firebase Storage
  createdAt?: Timestamp;
}

// mockUsers is kept for potential reference or if parts of the app still use it,
// but primary user data should come from Firestore.
export const mockUsers: User[] = [
  { id: 'user1', name: 'Admin User', email: 'admin@example.com', isAdmin: true, avatarUrl: '' },
  { id: 'user2', name: 'Jean Dupont', email: 'jean.d@example.com', isAdmin: false, avatarUrl: '' },
  { id: 'user3', name: 'Marie Martin', email: 'marie.m@example.com', isAdmin: false, avatarUrl: '' },
  { id: 'user4', name: 'Paul Durand', email: 'paul.d@example.com', isAdmin: false, avatarUrl: '' },
  { id: 'user5', name: 'Alice Dubois', email: 'alice.d@example.com', isAdmin: false, avatarUrl: '' },
  { id: 'user6', name: 'Bob Moreau', email: 'bob.m@example.com', isAdmin: false, avatarUrl: '' },
  { id: 'user7', name: 'Sarah Leroy', email: 'sarah.l@example.com', isAdmin: false, avatarUrl: '' },
  { id: 'user8', name: 'Lucie Petit', email: 'lucie.p@example.com', isAdmin: false, avatarUrl: '' },
  { id: 'user9', name: 'Marc Blanc', email: 'marc.b@example.com', isAdmin: false, avatarUrl: '' },
  { id: 'user10', name: 'Sophie Vert', email: 'sophie.v@example.com', isAdmin: false, avatarUrl: '' },
  { id: 'user11', name: 'Julien Noir', email: 'julien.n@example.com', isAdmin: false, avatarUrl: '' },
  { id: 'user12', name: 'Claire Jaune', email: 'claire.j@example.com', isAdmin: false, avatarUrl: '' },
];

export interface Project {
  id: string; // Firestore document ID
  name: string;
  description: string;
  status: 'Actif' | 'En attente' | 'Terminé' | string;
  totalExpenses: number;
  lastActivity: Timestamp; // Should be Timestamp from Firestore
  budget: number;
  members: string[]; // Array of user UIDs
  ownerId: string; // UID of the project owner
  recentExpenses: Array<{
    id: string; // ID of the expense document
    name: string; // Title of the expense
    date: Timestamp; // Expense date as Timestamp
    amount: number;
    payer?: string; // Name of the payer (for display, could be denormalized)
  }>;
  notes?: string;
  tags: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// initialProjects is now primarily for reference or potential seeding.
// Pages should fetch data from Firestore.
export const initialProjects: Project[] = [
    // {
    //   id: 'mock1', // Mock IDs will be replaced by Firestore IDs
    //   name: 'Voyage à Paris',
    //   status: 'Actif',
    //   description: 'Vacances d\'été avec l\'équipe',
    //   totalExpenses: 1245.50,
    //   lastActivity: Timestamp.fromDate(new Date('2023-06-15')),
    //   budget: 2000.00,
    //   members: ['Jean Dupont', 'Marie Martin', 'Paul Durand', 'Alice Dubois', 'Bob Moreau'], // Should be UIDs
    //   ownerId: 'someOwnerUID1',
    //   recentExpenses: [
    //     { id: 'exp1', name: 'Hôtel Mercure', date: Timestamp.fromDate(new Date('2023-06-12')), amount: 450.00, payer: 'Jean Dupont' },
    //     { id: 'exp2', name: 'Billets de train', date: Timestamp.fromDate(new Date('2023-06-10')), amount: 320.50, payer: 'Marie Martin' },
    //     { id: 'exp3', name: 'Dîner au restaurant', date: Timestamp.fromDate(new Date('2023-06-08')), amount: 175.00, payer: 'Paul Durand' },
    //   ],
    //   notes: 'Projet de vacances pour l\'équipe du 15 au 20 juin 2023. Budget total de €2000. Hôtel réservé pour 5 personnes. Activités prévues : visite de la Tour Eiffel, croisière sur la Seine, et journée à Disneyland. Les repas du midi sont à la charge de chacun. Les dîners sont pris en charge par le projet.',
    //   tags: ['voyage', 'équipe'],
    // },
  ];

