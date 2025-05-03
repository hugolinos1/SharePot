"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Icons } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';


// Dynamically import the chart component with SSR disabled
const BalanceChart = dynamic(() => import('@/components/dashboard/balance-chart'), {
  ssr: false,
  loading: () => (
      <div className="h-[300px] w-full flex items-center justify-center">
        <Skeleton className="h-full w-full" />
      </div>
  ),
});

interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
}

// Mock data - keep transaction data here or fetch it
const latestTransactions: Transaction[] = [
  { id: 1, date: '2023-10-26', description: 'Grocery Shopping', amount: -50 },
  { id: 2, date: '2023-10-25', description: 'Salary', amount: 2000 },
  { id: 3, date: '2023-10-24', description: 'Restaurant', amount: -75 },
  { id: 4, date: '2023-10-24', description: 'Online Purchase', amount: -120 },
  { id: 5, date: '2023-10-23', description: 'Bonus', amount: 500 },
];

// Example balance data (can be passed to BalanceChart or fetched within it)
const currentBalance = 2500.00; // Example value

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">Tableau de Bord</h1>
            <h2 className="text-xl text-muted-foreground">
              Bienvenue ! Voici votre aperçu financier.
            </h2>
          </div>
           <Link href="/" passHref>
              <Button variant="outline">
                  <Icons.home className="mr-2 h-4 w-4" /> Accueil
              </Button>
           </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
            <CardHeader>
                <CardTitle>Solde Actuel</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-3xl font-bold">€{currentBalance.toFixed(2)}</p>
                {/* You might want to calculate or fetch this percentage */}
                <p className="text-sm text-green-500">+5% depuis le mois dernier</p>
            </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle>Revenus Totals</CardTitle>
                 <CardDescription>Ce Mois</CardDescription>
            </CardHeader>
            <CardContent>
                {/* Replace with actual fetched data */}
                <p className="text-3xl font-bold">€2500.00</p>
            </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle>Dépenses Totales</CardTitle>
                 <CardDescription>Ce Mois</CardDescription>
            </CardHeader>
            <CardContent>
                 {/* Replace with actual fetched data */}
                <p className="text-3xl font-bold">€-245.00</p>
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Évolution du Solde</CardTitle>
            <CardDescription>
              Votre évolution de solde sur les 10 derniers mois.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
             {/* Render the dynamically imported chart */}
             <BalanceChart />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Dernières Transactions</CardTitle>
            <CardDescription>
              Un résumé de vos transactions les plus récentes.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[300px] border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latestTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell className={`text-right font-medium ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.amount >= 0 ? '+' : ''}€{Math.abs(transaction.amount).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}