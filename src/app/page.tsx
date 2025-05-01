"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation'; // Import if not already present for navigation

export default function Home() {
  const router = useRouter(); // Initialize router if using button navigation

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <h1 className="text-6xl font-bold">
          Welcome to <span className="text-primary">Dépense Partagée</span>
        </h1>
        <p className="mt-3 text-2xl">
          Manage and share your expenses easily.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
           <Link href="/dashboard">
             <Button>Go to Dashboard</Button>
           </Link>
           <Link href="/projects">
             <Button variant="outline">Manage Projects</Button>
           </Link>
           {/* You can add more primary action buttons here */}
         </div>

         {/* Example of how to add a back button (useful on other pages) */}
         {/* <Button variant="outline" onClick={() => router.back()} className="mt-10">
            Go Back
         </Button> */}

      </main>

      <footer className="w-full h-24 border-t flex items-center justify-center mt-10">
        <p className="text-muted-foreground">
          Powered by Firebase & Next.js
        </p>
      </footer>
    </div>
  );
}
