
"use client";

import type React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Project } from '@/data/mock-data';
import { Icons } from '@/components/icons';

interface ProjectExpenseSettlementProps {
  project: Project;
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
    return project.members.map(member => ({
        name: member,
        balance: 0,
        amountPaid: 0,
        share: 0,
    }));
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
  let debtors = balances.filter(m => m.balance < -0.005).map(m => ({ name: m.name, balance: -m.balance })).sort((a,b) => b.balance - a.balance); 
  let creditors = balances.filter(m => m.balance > 0.005).map(m => ({ name: m.name, balance: m.balance })).sort((a,b) => b.balance - a.balance); 

  let i = 0; 
  let j = 0; 

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


export const ProjectExpenseSettlement: React.FC<ProjectExpenseSettlementProps> = ({ project }) => {
  const memberBalances = calculateBalances(project);
  const settlementSuggestions = generateSettlementSuggestions(memberBalances.map(mb => ({ ...mb })));
  const allBalanced = memberBalances.every(b => Math.abs(b.balance) <= 0.005);
  const noExpenses = project.recentExpenses.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Répartition des Paiements</CardTitle>
        {noExpenses && <CardDescription>Aucune dépense enregistrée pour ce projet.</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {noExpenses ? (
             <p className="text-sm text-muted-foreground text-center py-3">Les balances s'afficheront ici une fois des dépenses ajoutées.</p>
        ) : (
        <>
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Balances Individuelles</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
            {memberBalances.map(({ name, balance, amountPaid, share }) => (
              <div key={name} className="flex items-center justify-between p-2.5 bg-muted/50 rounded-md">
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=32`} alt={name} data-ai-hint="member avatar"/>
                    <AvatarFallback className="text-xs">{getAvatarFallback(name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-xs">{name}</p>
                    <p className="text-xs text-muted-foreground">
                      Payé: {amountPaid.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} / 
                      Part: {share.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </p>
                  </div>
                </div>
                {balance > 0.005 && (
                  <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-primary-foreground text-xs px-2 py-0.5">
                    Reçoit {balance.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </Badge>
                )}
                {balance < -0.005 && (
                  <Badge variant="destructive" className="text-xs px-2 py-0.5">
                    Doit {Math.abs(balance).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </Badge>
                )}
                {Math.abs(balance) <= 0.005 && (
                   <Badge variant="secondary" className="text-xs px-2 py-0.5">Équilibré</Badge>
                )}
              </div>
            ))}
          </div>
        </div>

        {settlementSuggestions.length > 0 && !allBalanced && (
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Suggestions de Remboursement</h3>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-2">
              {settlementSuggestions.map((settlement, index) => (
                <div key={index} className="flex items-center justify-between p-2 border border-border/70 bg-card rounded-md shadow-xs">
                    <div className="flex items-center gap-1.5 text-xs">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(settlement.from)}&background=random&color=fff&size=24`} alt={settlement.from} data-ai-hint="payer avatar"/>
                            <AvatarFallback className="text-xxs">{getAvatarFallback(settlement.from)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{settlement.from}</span>
                        <Icons.arrowRight className="h-3 w-3 text-muted-foreground mx-0.5" />
                        <Avatar className="h-6 w-6">
                             <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(settlement.to)}&background=random&color=fff&size=24`} alt={settlement.to} data-ai-hint="receiver avatar"/>
                             <AvatarFallback className="text-xxs">{getAvatarFallback(settlement.to)}</AvatarFallback>
                        </Avatar>
                         <span className="font-medium">{settlement.to}</span>
                    </div>
                    <Badge variant="outline" className="font-semibold text-xs px-2 py-0.5">
                        {settlement.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
         {allBalanced && project.recentExpenses.length > 0 && (
            <div className="text-center text-green-600 font-medium py-2.5 bg-green-500/10 rounded-md text-sm">
                <Icons.checkCircle className="inline mr-1.5 h-4 w-4"/> Dépenses équilibrées!
            </div>
        )}
        </>
        )}
      </CardContent>
    </Card>
  );
};
