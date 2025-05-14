// src/data/mock-data.ts
import type { Timestamp } from 'firebase/firestore';

export interface User {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
}

export const mockUsers: User[] = [
  { id: 'user1', name: 'Admin User', email: 'admin@example.com', isAdmin: true },
  { id: 'user2', name: 'Jean Dupont', email: 'jean.d@example.com', isAdmin: false },
  { id: 'user3', name: 'Marie Martin', email: 'marie.m@example.com', isAdmin: false },
  { id: 'user4', name: 'Paul Durand', email: 'paul.d@example.com', isAdmin: false },
  { id: 'user5', name: 'Alice Dubois', email: 'alice.d@example.com', isAdmin: false },
  { id: 'user6', name: 'Bob Moreau', email: 'bob.m@example.com', isAdmin: false },
  { id: 'user7', name: 'Sarah Leroy', email: 'sarah.l@example.com', isAdmin: false },
  { id: 'user8', name: 'Lucie Petit', email: 'lucie.p@example.com', isAdmin: false },
  { id: 'user9', name: 'Marc Blanc', email: 'marc.b@example.com', isAdmin: false },
  { id: 'user10', name: 'Sophie Vert', email: 'sophie.v@example.com', isAdmin: false },
  { id: 'user11', name: 'Julien Noir', email: 'julien.n@example.com', isAdmin: false },
  { id: 'user12', name: 'Claire Jaune', email: 'claire.j@example.com', isAdmin: false },
];

export interface Project {
  id: string; // Firestore document ID
  name: string;
  description: string;
  status: 'Actif' | 'En attente' | 'Terminé' | string;
  totalExpenses: number;
  lastActivity: string | Timestamp; // Can be string from old mock data, but Timestamp from Firestore
  budget: number;
  members: string[];
  recentExpenses: Array<{
    name: string;
    date: string | Timestamp; // Can be string from old mock data, but Timestamp from Firestore
    amount: number;
    payer?: string;
  }>;
  notes?: string;
  tags: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// initialProjects is now primarily for reference or potential seeding.
// Pages should fetch data from Firestore.
export const initialProjects: Project[] = [
    {
      id: 'mock1', // Mock IDs will be replaced by Firestore IDs
      name: 'Voyage à Paris',
      status: 'Actif',
      description: 'Vacances d\'été avec l\'équipe',
      totalExpenses: 1245.50,
      lastActivity: '2023-06-15', // Using ISO string for mock
      budget: 2000.00,
      members: ['Jean Dupont', 'Marie Martin', 'Paul Durand', 'Alice Dubois', 'Bob Moreau'],
      recentExpenses: [
        { name: 'Hôtel Mercure', date: '2023-06-12', amount: 450.00, payer: 'Jean Dupont' },
        { name: 'Billets de train', date: '2023-06-10', amount: 320.50, payer: 'Marie Martin' },
        { name: 'Dîner au restaurant', date: '2023-06-08', amount: 175.00, payer: 'Paul Durand' },
      ],
      notes: 'Projet de vacances pour l\'équipe du 15 au 20 juin 2023. Budget total de €2000. Hôtel réservé pour 5 personnes. Activités prévues : visite de la Tour Eiffel, croisière sur la Seine, et journée à Disneyland. Les repas du midi sont à la charge de chacun. Les dîners sont pris en charge par le projet.',
      tags: ['voyage', 'équipe'],
      // createdAt and updatedAt would be Timestamps from Firestore
    },
    {
      id: 'mock2',
      name: 'Événement Startup',
      status: 'En attente',
      description: 'Conférence annuelle des startups',
      totalExpenses: 780.00,
      lastActivity: '2023-06-03',
      budget: 5000.00,
      members: ['Admin User', 'Sarah Leroy'],
      recentExpenses: [],
      notes: '',
      tags: ['conférence', 'startup'],
    },
    {
      id: 'mock3',
      name: 'Déménagement Bureau',
      status: 'Terminé',
      description: 'Relocalisation des bureaux',
      totalExpenses: 3420.75,
      lastActivity: '2023-05-15',
      budget: 3500.00,
      members: ['Admin User', 'Lucie Petit', 'Marc Blanc', 'Sophie Vert', 'Julien Noir', 'Claire Jaune'],
      recentExpenses: [
         { name: 'Location camion', date: '2023-05-10', amount: 150.00, payer: 'Admin User' },
         { name: 'Achat cartons', date: '2023-05-05', amount: 80.75, payer: 'Lucie Petit' },
      ],
      notes: 'Déménagement des anciens locaux vers le nouveau site. Contrat avec déménageurs signé. Installation prévue le 14 mai.',
      tags: ['logistique', 'bureau'],
    },
     {
      id: 'mock4',
      name: 'Développement Application Mobile',
      status: 'Actif',
      description: 'Création d\'une nouvelle application mobile interne',
      totalExpenses: 5500.00,
      lastActivity: '2023-06-20',
      budget: 10000.00,
      members: ['Jean Dupont', 'Alice Dubois', 'Marc Blanc', 'Sophie Vert'],
      recentExpenses: [
        { name: 'Licence Logiciel', date: '2023-06-18', amount: 1200.00, payer: 'Jean Dupont' },
        { name: 'Freelance Designer', date: '2023-06-15', amount: 2500.00, payer: 'Alice Dubois' },
      ],
      notes: 'Développement en cours. Phase de test prévue pour Juillet.',
      tags: ['mobile', 'développement', 'interne'],
    },
  ];
