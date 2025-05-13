
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icons } from '@/components/icons'; // Assuming Icons are defined here

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-background">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-4 sm:px-20 text-center">
        <Icons.loader className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">
          Redirection en cours...
        </p>
      </main>
    </div>
  );
}
