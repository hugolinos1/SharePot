"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import React, { useState } from 'react';
import { Icons } from '@/components/icons'; // Assuming Icons are defined here

// Mock project data for the dropdown
const projects = [
  { id: 'all', name: 'Tous les projets' },
  { id: '1', name: 'Voyage à Paris' },
  { id: '2', name: 'Événement Startup' },
  { id: '3', name: 'Déménagement Bureau' },
];

export default function Home() {
  const router = useRouter();
  const [selectedProject, setSelectedProject] = useState('all');

  const handleProjectChange = (value: string) => {
    setSelectedProject(value);
    // You can add logic here to filter data based on the selected project
    // For now, it just updates the state.
    console.log("Selected Project ID:", value);
    // Example: Navigate to a filtered dashboard view
    // router.push(`/dashboard?project=${value}`);
  };


  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-background">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-4 sm:px-20 text-center">
        <h1 className="text-4xl sm:text-6xl font-bold text-foreground">
          Bienvenue sur <span className="text-primary">Dépense Partagée</span>
        </h1>
        <p className="mt-3 text-lg sm:text-2xl text-muted-foreground">
          Gérez et partagez vos dépenses facilement.
        </p>

        {/* Project Filter Dropdown */}
        <div className="mt-6 w-full max-w-xs sm:max-w-sm">
           <label htmlFor="project-filter" className="sr-only">Filtrer par projet</label>
           <Select value={selectedProject} onValueChange={handleProjectChange}>
             <SelectTrigger id="project-filter" className="w-full">
               <SelectValue placeholder="Sélectionner un projet" />
             </SelectTrigger>
             <SelectContent>
               {projects.map((project) => (
                 <SelectItem key={project.id} value={project.id}>
                   {project.name}
                 </SelectItem>
               ))}
             </SelectContent>
           </Select>
         </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3 sm:gap-4">
           <Link href="/dashboard" passHref>
             <Button size="lg">
                <Icons.home className="mr-2 h-5 w-5" /> Tableau de Bord
             </Button>
           </Link>
           <Link href="/projects" passHref>
             <Button variant="outline" size="lg">
                 <Icons.workflow className="mr-2 h-5 w-5" /> Gérer les Projets
             </Button>
           </Link>
           <Link href="/admin" passHref>
             <Button variant="secondary" size="lg">
                 <Icons.settings className="mr-2 h-5 w-5" /> Gestion Admin
             </Button>
           </Link>
           {/* You can add more primary action buttons here */}
         </div>

      </main>

      <footer className="w-full h-24 border-t border-border flex items-center justify-center mt-10">
        <p className="text-muted-foreground">
          Propulsé par Firebase & Next.js
        </p>
      </footer>
    </div>
  );
}