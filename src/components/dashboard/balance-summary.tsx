
"use client";

import type React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Project } from '@/data/mock-data';
import { Icons } from '@/components/icons';

interface BalanceSummaryProps {
  project: Project | null;
}

interface MemberBalance {
  name: string;
  balance: number; // Positive if owed by project, negative if owes to project
  amountPaid: number;
  share: number;
}

const getAvatarFallback = (name: string) => {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return parts[0][0] + (parts[parts.length - 1][0] || '');
  }
  return name.substring(0, 2).toUpperCase();
};

const calculateBalances = (project: Project): MemberBalance[] => {
  if (!project || project.members.length === 0 || project.recentExpenses.length === 0) {
    return [];
  }

  const totalPaidByMember: { [key: string]: number } = {};
  project.members.forEach(member => {
    totalPaidByMember[member] = 0;
  });

  let currentProjectTotalExpenses = 0;
  project.recentExpenses.forEach(expense => {
    if (expense.payer && typeof totalPaidByMember[expense.payer] === 'number') {
      totalPaidByMember[expense.payer] += expense.amount;
    }
    currentProjectTotalExpenses += expense.amount;
  });
  
  const sharePerMember = project.members.length > 0 ? currentProjectTotalExpenses / project.members.length : 0;

  return project.members.map(member => {
    const amountPaid = totalPaidByMember[member] || 0;
    return {
      name: member,
      balance: amountPaid - sharePerMember,
      amountPaid: amountPaid,
      share: sharePerMember,
    };
  }).sort((a, b) => b.balance - a.balance); 
};

const generateSettlementSuggestions = (balances: MemberBalance[]): { from: string, to: string, amount: number }[] => {
  const suggestions: { from: string, to: string, amount: number }[] = [];
  // Create mutable copies for processing
  let debtors = balances.filter(m => m.balance < -0.005).map(m => ({ name: m.name, balance: -m.balance })).sort((a,b) => b.balance - a.balance); 
  let creditors = balances.filter(m => m.balance > 0.005).map(m => ({ name: m.name, balance: m.balance })).sort((a,b) => b.balance - a.balance); 

  let i = 0; // debtors index
  let j = 0; // creditors index

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amountToTransfer = Math.min(debtor.balance, creditor.balance);

    if (amountToTransfer > 0.005) { 
      suggestions.push({
        from: debtor.name,
        to: creditor.name,
        amount: amountToTransfer,
      });

      debtor.balance -= amountToTransfer;
      creditor.balance -= amountToTransfer;
    }

    if (debtor.balance < 0.005) i++;
    if (creditor.balance < 0.005) j++;
  }
  return suggestions;
}


export const BalanceSummary: React.FC<BalanceSummaryProps> = ({ project }) => {
  if (!project) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Répartition des Paiements</CardTitle>
          <CardDescription>Sélectionnez un projet pour voir les détails des balances.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">Aucun projet sélectionné.</p>
        </CardContent>
      </Card>
    );
  }

  const memberBalances = calculateBalances(project);
  
  if (memberBalances.length === 0) {
     return (
      <Card>
        <CardHeader>
          <CardTitle>Répartition des Paiements - {project.name}</CardTitle>
          <CardDescription>Pas de données de dépenses ou de membres pour calculer les balances pour ce projet.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">Aucune balance à afficher.</p>
        </CardContent>
      </Card>
    );
  }
  
  // Pass a deep copy of memberBalances to generateSettlementSuggestions as it modifies the balance property
  const settlementSuggestions = generateSettlementSuggestions(memberBalances.map(mb => ({ ...mb })));


  const allBalanced = memberBalances.every(b => Math.abs(b.balance) <= 0.005);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Répartition des Paiements - {project.name}</CardTitle>
        <CardDescription>Résumé des balances et suggestions de remboursement basées sur les dépenses enregistrées.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-md font-semibold mb-3">Balances Individuelles</h3>
          <div className="space-y-3">
            {memberBalances.map(({ name, balance, amountPaid, share }) => (
              <div key={name} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`} alt={name} data-ai-hint="member avatar" />
                    <AvatarFallback>{getAvatarFallback(name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{name}</p>
                    <p className="text-xs text-muted-foreground">
                      A payé: {amountPaid.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} / 
                      Part: {share.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </p>
                  </div>
                </div>
                {balance > 0.005 && (
                  <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-primary-foreground">
                    Doit recevoir {balance.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </Badge>
                )}
                {balance < -0.005 && (
                  <Badge variant="destructive">
                    Doit payer {Math.abs(balance).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </Badge>
                )}
                {Math.abs(balance) <= 0.005 && (
                   <Badge variant="secondary">Équilibré</Badge>
                )}
              </div>
            ))}
          </div>
        </div>

        {settlementSuggestions.length > 0 && !allBalanced && (
          <div>
            <h3 className="text-md font-semibold mb-3">Suggestions de Remboursement</h3>
            <div className="space-y-2">
              {settlementSuggestions.map((settlement, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-border bg-card rounded-lg shadow-sm">
                    <div className="flex items-center gap-2 text-sm">
                        <Avatar className="h-7 w-7">
                            <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(settlement.from)}&background=random&color=fff&size=28`} alt={settlement.from} data-ai-hint="payer avatar"/>
                            <AvatarFallback className="text-xs">{getAvatarFallback(settlement.from)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{settlement.from}</span>
                        <Icons.arrowRight className="h-4 w-4 text-muted-foreground mx-1" />
                        <Avatar className="h-7 w-7">
                             <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(settlement.to)}&background=random&color=fff&size=28`} alt={settlement.to} data-ai-hint="receiver avatar"/>
                             <AvatarFallback className="text-xs">{getAvatarFallback(settlement.to)}</AvatarFallback>
                        </Avatar>
                         <span className="font-medium">{settlement.to}</span>
                    </div>
                    <Badge variant="outline" className="font-semibold text-sm">
                        {settlement.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
         {allBalanced && (
            <div className="text-center text-green-600 font-medium py-3 bg-green-500/10 rounded-md">
                <Icons.checkCircle className="inline mr-2 h-5 w-5"/> Toutes les dépenses sont équilibrées pour ce projet !
            </div>
        )}

      </CardContent>
    </Card>
  );
};
