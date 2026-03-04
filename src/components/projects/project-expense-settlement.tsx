
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Project, User as AppUserType } from '@/data/mock-data';
import { Icons } from '@/components/icons';
import type { ExpenseItem } from '@/app/expenses/page'; 

interface ProjectExpenseSettlementProps {
  project: Project | null; 
  memberProfilesOfProject: AppUserType[];
  detailedProjectExpenses: ExpenseItem[];
  isLoadingMemberProfiles: boolean;
  isLoadingDetailedExpenses: boolean;
}

interface MemberBalance {
  uid: string;
  name: string;
  balance: number; 
  amountPaidEUR: number;
  shareEUR: number;
}

const getAvatarFallbackText = (name?: string | null, email?: string | null): string => {
  if (name && name.trim() !== '') {
    const parts = name.trim().split(' ');
    if (parts.length >= 2 && parts[0] && parts[parts.length - 1]) {
      return (parts[0][0] || '').toUpperCase() + (parts[parts.length - 1][0] || '').toUpperCase();
    }
    return (name[0] || '?').toUpperCase();
  }
  return '??';
};

/**
 * Calcul les balances individuelles pour chaque membre du projet.
 */
const calculateBalances = (
  project: Project, 
  memberProfiles: AppUserType[],
  expenses: ExpenseItem[]
): MemberBalance[] => {
  const members = project.members || [];
  if (members.length === 0) return [];

  const totalSpentEUR = expenses.reduce((sum, exp) => sum + (exp.amountEUR || 0), 0);
  const sharePerPerson = totalSpentEUR / members.length;

  const paidByMember: Record<string, number> = {};
  members.forEach(uid => paidByMember[uid] = 0);

  expenses.forEach(exp => {
    if (exp.paidById && members.includes(exp.paidById)) {
      paidByMember[exp.paidById] += (exp.amountEUR || 0);
    }
  });

  return members.map(uid => {
    const profile = memberProfiles.find(p => p.id === uid);
    const paid = paidByMember[uid] || 0;
    return {
      uid,
      name: profile?.name || `Membre (${uid.substring(0,4)})`,
      amountPaidEUR: paid,
      shareEUR: sharePerPerson,
      balance: paid - sharePerPerson
    };
  }).sort((a, b) => b.balance - a.balance);
};

/**
 * Algorithme optimisé pour les suggestions de remboursement.
 */
const generateSettlementSuggestions = (balances: MemberBalance[]) => {
  const suggestions: { from: string, to: string, amount: number }[] = [];
  const debtors = balances.filter(b => b.balance < -0.01).map(b => ({...b}));
  const creditors = balances.filter(b => b.balance > 0.01).map(b => ({...b}));

  debtors.sort((a, b) => a.balance - b.balance);
  creditors.sort((a, b) => b.balance - a.balance);

  let d = 0, c = 0;
  while (d < debtors.length && c < creditors.length) {
    const amount = Math.min(Math.abs(debtors[d].balance), creditors[c].balance);
    if (amount > 0.01) {
      suggestions.push({ from: debtors[d].name, to: creditors[c].name, amount });
    }
    debtors[d].balance += amount;
    creditors[c].balance -= amount;
    if (Math.abs(debtors[d].balance) < 0.01) d++;
    if (Math.abs(creditors[c].balance) < 0.01) c++;
  }
  return suggestions;
};

export const ProjectExpenseSettlement: React.FC<ProjectExpenseSettlementProps> = ({
  project,
  memberProfilesOfProject,
  detailedProjectExpenses,
  isLoadingMemberProfiles,
  isLoadingDetailedExpenses,
}) => {
  
  const balances = useMemo(() => {
    if (!project || isLoadingMemberProfiles || isLoadingDetailedExpenses) return [];
    return calculateBalances(project, memberProfilesOfProject, detailedProjectExpenses);
  }, [project, memberProfilesOfProject, detailedProjectExpenses, isLoadingMemberProfiles, isLoadingDetailedExpenses]);

  const suggestions = useMemo(() => generateSettlementSuggestions(balances), [balances]);

  if (isLoadingMemberProfiles || isLoadingDetailedExpenses) {
    return <div className="text-center p-6"><Icons.loader className="animate-spin mx-auto h-8 w-8 text-primary"/></div>;
  }

  if (!project || detailedProjectExpenses.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">Répartition des Paiements</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground text-center py-4">Aucune dépense enregistrée pour ce projet.</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Répartition des Paiements</CardTitle>
        <CardDescription>Analyse basée sur {detailedProjectExpenses.length} dépenses.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold mb-3">Balances</h3>
          <div className="space-y-2">
            {balances.map((b) => (
              <div key={b.uid} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{getAvatarFallbackText(b.name)}</AvatarFallback></Avatar>
                  <div>
                    <p className="font-medium text-sm">{b.name}</p>
                    <p className="text-xs text-muted-foreground">Payé: {b.amountPaidEUR.toFixed(2)}€ / Part: {b.shareEUR.toFixed(2)}€</p>
                  </div>
                </div>
                <Badge variant={b.balance > 0 ? "default" : b.balance < -0.01 ? "destructive" : "secondary"}>
                  {b.balance > 0.01 ? `+${b.balance.toFixed(2)}€` : `${b.balance.toFixed(2)}€`}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {suggestions.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3">Remboursements suggérés</h3>
            <div className="space-y-2">
              {suggestions.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                  <span className="font-medium">{s.from}</span>
                  <Icons.arrowRight className="h-4 w-4 text-muted-foreground"/>
                  <span className="font-medium">{s.to}</span>
                  <Badge variant="outline">{s.amount.toFixed(2)}€</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
