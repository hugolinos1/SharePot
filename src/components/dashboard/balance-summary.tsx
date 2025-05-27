
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Project, User as AppUserType } from '@/data/mock-data';
import { Icons } from '@/components/icons';
import type { ExpenseItem } from '@/app/expenses/page';

interface BalanceSummaryProps {
  projectDataForBalance: Project | null; 
  detailedExpensesForBalance: ExpenseItem[];
  memberProfilesForBalance: AppUserType[];
}

interface MemberBalance {
  uid: string;
  name: string;
  balance: number; // Positive if they are owed, negative if they owe
  amountPaidEUR: number;
  shareEUR: number;
}

const getAvatarFallbackText = (name?: string | null, email?: string | null): string => {
  if (name && name.trim() !== '') {
    const parts = name.trim().split(' ');
    if (parts.length >= 2 && parts[0] && parts[parts.length - 1]) {
      return (parts[0][0] || '').toUpperCase() + (parts[parts.length - 1][0] || '').toUpperCase();
    }
    const singleName = parts[0];
    if (singleName && singleName.length >= 2) {
      return singleName.substring(0, 2).toUpperCase();
    }
    if (singleName && singleName.length === 1) {
      return singleName[0].toUpperCase();
    }
  }
  if (email && email.trim() !== '') {
    const emailPrefix = email.split('@')[0];
    if (emailPrefix && emailPrefix.length >= 2) {
      return emailPrefix.substring(0, 2).toUpperCase();
    }
    if (emailPrefix && emailPrefix.length === 1) {
      return emailPrefix[0].toUpperCase();
    }
  }
  return '??';
};

const calculateBalances = (
  project: Project | null,
  memberProfilesInput: AppUserType[],
  detailedExpensesInput: ExpenseItem[]
): MemberBalance[] => {
  const localMemberProfiles = Array.isArray(memberProfilesInput) ? memberProfilesInput : [];
  const localDetailedExpenses = Array.isArray(detailedExpensesInput) ? detailedExpensesInput : [];

  if (Array.isArray(localMemberProfiles) && localMemberProfiles.length > 0) {
    console.log(`BalanceSummary (calculateBalances) for project "${project?.name}": Received allUsersProfiles:`, JSON.stringify(localMemberProfiles.map(u => ({id: u.id, name: u.name}))));
  } else {
    console.warn(`BalanceSummary (calculateBalances) for project "${project?.name}": Received allUsersProfiles is empty or undefined. Value:`, memberProfilesInput);
  }
  console.log(`BalanceSummary (calculateBalances): Received detailedExpenses count for project "${project?.name}": ${localDetailedExpenses.length}`);


  if (!project || !project.members || project.members.length === 0) {
    console.warn(`BalanceSummary (calculateBalances): Pre-condition fail - project or project.members missing or empty. Project:`, project, "Project members count:", project?.members?.length);
     if (project && project.members && project.members.length === 0) {
      return [];
    }
    return [];
  }
  
  if (localMemberProfiles.length === 0 && project.members.length > 0) {
    console.warn(`BalanceSummary (calculateBalances): No member profiles provided, but project has members. Project: ${project.name}. Members: ${project.members.join(', ')}. Falling back to UID-based balances.`);
     const fallbackTotalExpenses = localDetailedExpenses.reduce((sum, expense) => sum + (expense.amountEUR ?? 0), 0);
     const fallbackShare = project.members.length > 0 ? fallbackTotalExpenses / project.members.length : 0;
     return project.members.map(memberUid => ({
        uid: memberUid,
        name: memberUid, 
        balance: 0 - fallbackShare, 
        amountPaidEUR: 0,
        shareEUR: fallbackShare,
     }));
  }

  const getUserProfileByUid = (uid: string): AppUserType | undefined => localMemberProfiles.find(u => u.id === uid);
  
  const totalPaidByMemberUidEUR: { [key: string]: number } = {};
  project.members.forEach(memberUid => {
    totalPaidByMemberUidEUR[memberUid] = 0;
  });
  
  let currentProjectTotalExpensesEUR = 0;
  localDetailedExpenses.forEach(expense => {
    const amountToAdd = expense.amountEUR ?? 0; 
    currentProjectTotalExpensesEUR += amountToAdd;

    const payerProfile = localMemberProfiles.find(p => p.id === expense.paidById);
    if (payerProfile && project.members.includes(expense.paidById)) {
      totalPaidByMemberUidEUR[expense.paidById] = (totalPaidByMemberUidEUR[expense.paidById] || 0) + amountToAdd;
       console.log(`BalanceSummary (calculateBalances): Attributed ${amountToAdd.toFixed(2)} EUR to UID ${expense.paidById} (Name: ${payerProfile.name || expense.paidById}) for expense "${expense.title}" in project "${project.name}"`);
    } else if (expense.paidById) {
       console.warn(`BalanceSummary (calculateBalances): Payer UID "${expense.paidById}" (from expense: "${expense.title}") not found among project members or in provided profiles for project "${project.name}". Project Members UIDs: ${project.members.join(', ')}, Profile UIDs: ${localMemberProfiles.map(p=>p.id).join(', ')}`);
    }
  });

  console.log(`BalanceSummary (calculateBalances): totalPaidByMemberUidEUR for project "${project.name}":`, JSON.stringify(totalPaidByMemberUidEUR));
  console.log(`BalanceSummary (calculateBalances): currentProjectTotalExpensesEUR (CALCULATED from detailedExpenses) for project "${project.name}": ${currentProjectTotalExpensesEUR}`);

  // Use the sum of detailed expenses for calculating the share if project.totalExpenses is not reliable or up-to-date.
  const totalForShareCalculation = currentProjectTotalExpensesEUR; 
  const sharePerMemberEUR = project.members.length > 0 ? totalForShareCalculation / project.members.length : 0;
  console.log(`BalanceSummary (calculateBalances): sharePerMemberEUR for project "${project.name}": ${sharePerMemberEUR} (based on total: ${totalForShareCalculation})`);

  const balances = project.members.map(memberUid => {
    const memberProfile = getUserProfileByUid(memberUid);
    let memberName = memberUid; 

    if (memberProfile) {
        if (memberProfile.name && memberProfile.name.trim() !== '') {
            memberName = memberProfile.name.trim();
        } else {
             console.warn(`BalanceSummary (calculateBalances): Profile for UID ${memberUid} found, but 'name' is missing or empty. Using fallback name: "${memberName}".`);
        }
    } else {
        console.warn(`BalanceSummary (calculateBalances): Profile for member UID "${memberUid}" NOT FOUND in memberProfiles for project "${project.name}". This member's name will be their UID.`);
    }
    
    const amountPaid = totalPaidByMemberUidEUR[memberUid] || 0;
    return {
      uid: memberUid,
      name: memberName,
      balance: amountPaid - sharePerMemberEUR,
      amountPaidEUR: amountPaid,
      shareEUR: sharePerMemberEUR,
    };
  }).sort((a, b) => b.balance - a.balance); 
  console.log(`BalanceSummary (calculateBalances): Calculated balances for project "${project.name}":`, JSON.stringify(balances.map(b => ({name: b.name, balance: b.balance.toFixed(2), paid:b.amountPaidEUR.toFixed(2), share:b.shareEUR.toFixed(2) }))));
  return balances;
};

const generateSettlementSuggestions = (balancesInput: MemberBalance[]): { from: string, to: string, amount: number }[] => {
  console.log("[SettlementSuggestions] Starting optimized suggestions. Input balances:", JSON.stringify(balancesInput.map(b => ({ name: b.name, balance: b.balance }))));

  if (!Array.isArray(balancesInput) || balancesInput.length === 0) {
    console.log("[SettlementSuggestions] Balances input is not an array or is empty. Returning empty suggestions.");
    return [];
  }

  // Create a deep copy of balances to avoid mutating the original array/objects
  const balances: MemberBalance[] = balancesInput.map(b => ({ ...b })); // Manual deep copy for simple objects
  const suggestions: { from: string, to: string, amount: number }[] = [];
  const epsilon = 0.005; // Tolerance for floating point comparisons

  let debtors = balances.filter(m => m.balance < -epsilon).sort((a, b) => a.balance - b.balance); // most negative first
  let creditors = balances.filter(m => m.balance > epsilon).sort((a, b) => b.balance - a.balance); // most positive first
  
  console.log("[SettlementSuggestions] Initial Debtors:", JSON.stringify(debtors.map(d => ({name: d.name, balance: d.balance.toFixed(2)}))));
  console.log("[SettlementSuggestions] Initial Creditors:", JSON.stringify(creditors.map(c => ({name: c.name, balance: c.balance.toFixed(2)}))));

  let iteration = 0;
  const maxIterations = balances.length * balances.length; // Safety break for unexpected loops

  while (debtors.length > 0 && creditors.length > 0 && iteration < maxIterations) {
    iteration++;
    console.log(`[SettlementSuggestions] Iteration ${iteration}. Debtors: ${debtors.length}, Creditors: ${creditors.length}`);

    const debtor = debtors[0]; 
    const creditor = creditors[0]; 

    console.log(`[SettlementSuggestions] Current Debtor: ${debtor.name} (Owes: ${Math.abs(debtor.balance).toFixed(2)})`);
    console.log(`[SettlementSuggestions] Current Creditor: ${creditor.name} (Is Owed: ${creditor.balance.toFixed(2)})`);

    const amountToTransfer = Math.min(Math.abs(debtor.balance), creditor.balance);
    console.log(`[SettlementSuggestions] Amount to transfer: ${amountToTransfer.toFixed(2)}`);

    if (amountToTransfer > epsilon) {
      suggestions.push({
        from: debtor.name,
        to: creditor.name,
        amount: amountToTransfer,
      });
      console.log(`[SettlementSuggestions] -----> SUGGESTION: ${debtor.name} pays ${creditor.name} ${amountToTransfer.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`);

      debtor.balance += amountToTransfer;
      creditor.balance -= amountToTransfer;

      console.log(`[SettlementSuggestions] Updated balances - Debtor ${debtor.name}: ${debtor.balance.toFixed(2)}, Creditor ${creditor.name}: ${creditor.balance.toFixed(2)}`);
    } else {
      console.warn('[SettlementSuggestions] AmountToTransfer is too small or zero, breaking loop to prevent issues. Amount:', amountToTransfer);
      break; 
    }

    if (Math.abs(debtor.balance) < epsilon) {
      console.log(`[SettlementSuggestions] Debtor ${debtor.name} settled. Removing.`);
      debtors.shift();
    }
    if (Math.abs(creditor.balance) < epsilon) { 
      console.log(`[SettlementSuggestions] Creditor ${creditor.name} settled. Removing.`);
      creditors.shift();
    }
  }

  if (iteration >= maxIterations && (debtors.length > 0 || creditors.length > 0)) {
    console.warn("[SettlementSuggestions] Max iterations reached, but debts/credits might still exist. This could indicate an issue in the algorithm or floating point precision problems.");
  }

  console.log("[SettlementSuggestions] Final suggestions:", JSON.stringify(suggestions));
  return suggestions;
};


export const BalanceSummary: React.FC<BalanceSummaryProps> = ({
  projectDataForBalance,
  detailedExpensesForBalance,
  memberProfilesForBalance,
}) => {
  
  console.log(`BalanceSummary Render: Project: ${projectDataForBalance?.name}`);
  if (Array.isArray(memberProfilesForBalance) && memberProfilesForBalance.length > 0) {
    console.log(`BalanceSummary Render: memberProfilesForBalance content:`, JSON.stringify(memberProfilesForBalance.map(u => ({id: u.id, name: u.name}))));
  } else if (memberProfilesForBalance === undefined) {
     console.warn(`BalanceSummary Render: memberProfilesForBalance is undefined.`);
  } else {
     console.warn(`BalanceSummary Render: memberProfilesForBalance is empty.`);
  }

  if (!projectDataForBalance) {
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
  
  const memberBalances = calculateBalances(
    projectDataForBalance,
    memberProfilesForBalance,
    detailedExpensesForBalance
  );

  if (memberBalances.length === 0 && detailedExpensesForBalance.length === 0) {
     return (
      <Card>
        <CardHeader>
          <CardTitle>Répartition des Paiements - {projectDataForBalance.name}</CardTitle>
          <CardDescription>Pas de données de dépenses ou de membres pour calculer les balances pour ce projet.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">Aucune dépense enregistrée pour ce projet.</p>
        </CardContent>
      </Card>
    );
  }
   if (memberBalances.length === 0 && detailedExpensesForBalance.length > 0) {
     return (
      <Card>
        <CardHeader>
          <CardTitle>Répartition des Paiements - {projectDataForBalance.name}</CardTitle>
          <CardDescription>Impossible de calculer les balances. Vérifiez les membres du projet et leurs profils utilisateurs.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">Aucun membre trouvé pour répartir les dépenses, ou les profils utilisateurs ne sont pas encore chargés/complets.</p>
        </CardContent>
      </Card>
    );
  }

  const settlementSuggestions = generateSettlementSuggestions(memberBalances);
  const allBalanced = memberBalances.every(b => Math.abs(b.balance) <= 0.005) && settlementSuggestions.length === 0;


  return (
    <Card>
      <CardHeader>
        <CardTitle>Répartition des Paiements - {projectDataForBalance.name}</CardTitle>
        <CardDescription>Résumé des balances et suggestions de remboursement basées sur toutes les dépenses enregistrées pour ce projet.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-md font-semibold mb-3">Balances Individuelles</h3>
          <div className="space-y-3">
            {memberBalances.map(({ uid, name, balance, amountPaidEUR, shareEUR }) => {
              const userProfileInList = Array.isArray(memberProfilesForBalance) ? memberProfilesForBalance.find(u=>u.id===uid) : undefined;
              const displayName = userProfileInList?.name || name;
              const avatarUrl = userProfileInList?.avatarUrl;

              return (
                <div key={uid} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                       <AvatarImage 
                        src={avatarUrl && avatarUrl.trim() !== '' ? avatarUrl : undefined} 
                        alt={displayName || "Utilisateur"} 
                        data-ai-hint="member avatar"
                      />
                      <AvatarFallback>{getAvatarFallbackText(displayName, userProfileInList?.email)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        A payé: {amountPaidEUR.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} /
                        Part: {shareEUR.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
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
              );
            })}
          </div>
        </div>

        {settlementSuggestions.length > 0 && !allBalanced && (
          <div>
            <h3 className="text-md font-semibold mb-3">Suggestions de Remboursement</h3>
            <div className="space-y-2">
              {settlementSuggestions.map((settlement, index) => {
                 const fromUserProfile = Array.isArray(memberProfilesForBalance) ? memberProfilesForBalance.find(u=>u.name && u.name.trim().toLowerCase() === settlement.from.trim().toLowerCase()) : undefined;
                 const toUserProfile = Array.isArray(memberProfilesForBalance) ? memberProfilesForBalance.find(u=>u.name && u.name.trim().toLowerCase() === settlement.to.trim().toLowerCase()) : undefined;
                 const fromAvatarUrl = fromUserProfile?.avatarUrl;
                 const toAvatarUrl = toUserProfile?.avatarUrl;

                return (
                <div key={index} className="flex items-center justify-between p-3 border border-border bg-card rounded-lg shadow-sm">
                    <div className="flex items-center gap-2 text-sm">
                        <Avatar className="h-7 w-7">
                            <AvatarImage 
                              src={fromAvatarUrl && fromAvatarUrl.trim() !== '' ? fromAvatarUrl : undefined} 
                              alt={settlement.from} 
                              data-ai-hint="payer avatar"
                            />
                            <AvatarFallback className="text-xs">{getAvatarFallbackText(settlement.from, fromUserProfile?.email)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{settlement.from}</span>
                        <Icons.arrowRight className="h-4 w-4 text-muted-foreground mx-1" />
                        <Avatar className="h-7 w-7">
                             <AvatarImage 
                              src={toAvatarUrl && toAvatarUrl.trim() !== '' ? toAvatarUrl : undefined} 
                              alt={settlement.to} 
                              data-ai-hint="receiver avatar"
                            />
                             <AvatarFallback className="text-xs">{getAvatarFallbackText(settlement.to, toUserProfile?.email)}</AvatarFallback>
                        </Avatar>
                         <span className="font-medium">{settlement.to}</span>
                    </div>
                    <Badge variant="outline" className="font-semibold text-sm">
                        {settlement.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </Badge>
                </div>
              );
            })}
            </div>
          </div>
        )}
         {allBalanced && detailedExpensesForBalance.length > 0 && (
            <div className="text-center text-green-600 font-medium py-3 bg-green-500/10 rounded-md">
                <Icons.checkCircle className="inline mr-2 h-5 w-5"/> Toutes les dépenses sont équilibrées pour ce projet !
            </div>
        )}
         {detailedExpensesForBalance.length === 0 && (
            <div className="text-center text-muted-foreground py-3">
                Aucune dépense enregistrée pour calculer les balances de ce projet.
            </div>
        )}
      </CardContent>
    </Card>
  );
};
