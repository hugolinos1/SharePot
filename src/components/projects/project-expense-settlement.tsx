
"use client";

import React, { useEffect, useState } from 'react';
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
  project: Project, 
  memberProfilesInput: AppUserType[],
  detailedExpensesInput: ExpenseItem[]
): MemberBalance[] => {
  const memberProfilesOfProject = Array.isArray(memberProfilesInput) ? memberProfilesInput : [];
  const detailedProjectExpenses = Array.isArray(detailedExpensesInput) ? detailedExpensesInput : [];
  
  console.log(`[ProjectExpenseSettlement calculateBalances] Project: ${project?.name}, Members UIDs from project: ${project?.members ? project.members.join(', ') : 'N/A'}`);
  if (memberProfilesOfProject.length > 0) {
    console.log(`[ProjectExpenseSettlement calculateBalances] Received memberProfiles:`, JSON.stringify(memberProfilesOfProject.map(u => ({id: u.id, name: u.name}))));
  } else {
    console.warn(`[ProjectExpenseSettlement calculateBalances] Received memberProfiles is empty or undefined. Value:`, memberProfilesInput);
  }
  console.log(`[ProjectExpenseSettlement calculateBalances] Received detailedExpenses count:`, detailedProjectExpenses.length);


  if (!project || !project.members || project.members.length === 0) {
    console.warn(`[ProjectExpenseSettlement calculateBalances] Pre-conditions not met - project or project.members missing or empty. Project members: ${project?.members?.length}`);
    return [];
  }
   if (memberProfilesOfProject.length === 0 && project.members.length > 0) {
    console.warn(`[ProjectExpenseSettlement calculateBalances] Pre-conditions not met - memberProfiles is empty. Project: ${project.name}. Project members UIDs: ${project.members.join(', ')}. Falling back to UID-based balances.`);
     // Calculate total from detailed expenses if project.totalExpenses is not reliable or if we want to be fully self-contained
     const totalProjectExpensesEUR = detailedProjectExpenses.reduce((sum, expense) => sum + (expense.amountEUR ?? 0), 0);
     console.log(`[ProjectExpenseSettlement calculateBalances] Fallback totalProjectExpensesEUR based on detailedExpenses: ${totalProjectExpensesEUR}`);
     const fallbackShare = project.members.length > 0 ? totalProjectExpensesEUR / project.members.length : 0;
     return project.members.map(memberUid => ({
        uid: memberUid,
        name: `UID: ${memberUid.substring(0,6)}...`, 
        balance: 0 - fallbackShare, 
        amountPaidEUR: 0, // Cannot determine this without profiles or better expense data
        shareEUR: fallbackShare,
     }));
  }

  const totalPaidByMemberUidEUR: { [key: string]: number } = {};
  project.members.forEach(memberUid => {
    totalPaidByMemberUidEUR[memberUid] = 0;
  });

  let currentProjectTotalExpensesEUR = 0;
  detailedProjectExpenses.forEach(expense => {
    const amountToAdd = expense.amountEUR ?? 0;
    currentProjectTotalExpensesEUR += amountToAdd; 
    
    // Attribute payment to member by paidById (UID)
    if (expense.paidById && project.members.includes(expense.paidById)) {
        const payerProfile = memberProfilesOfProject.find(p => p.id === expense.paidById);
        totalPaidByMemberUidEUR[expense.paidById] = (totalPaidByMemberUidEUR[expense.paidById] || 0) + amountToAdd;
        console.log(`[ProjectExpenseSettlement calculateBalances] Attributed ${amountToAdd.toFixed(2)} EUR to UID ${expense.paidById} (Name: ${payerProfile?.name || expense.paidById}) for expense "${expense.title}"`);
    } else if (expense.paidById) {
        console.warn(`[ProjectExpenseSettlement calculateBalances] Payer UID "${expense.paidById}" (from expense: "${expense.title}") not found among project members or in provided profiles for project "${project.name}".`);
    }
  });
  console.log(`[ProjectExpenseSettlement calculateBalances] totalPaidByMemberUidEUR for project "${project.name}":`, JSON.stringify(totalPaidByMemberUidEUR));
  console.log(`[ProjectExpenseSettlement calculateBalances] currentProjectTotalExpensesEUR (CALCULATED from detailedExpenses) for project "${project.name}": ${currentProjectTotalExpensesEUR}`);
  
  // Use project.totalExpenses for share calculation as it's the official total from Firestore
  const totalForShareCalculation = project.totalExpenses || currentProjectTotalExpensesEUR; // Fallback if project.totalExpenses is 0 or undefined
  console.log(`[ProjectExpenseSettlement calculateBalances] Using totalForShareCalculation: ${totalForShareCalculation} (project.totalExpenses: ${project.totalExpenses}, sum of detailed: ${currentProjectTotalExpensesEUR})`);

  const sharePerMemberEUR = project.members.length > 0 ? totalForShareCalculation / project.members.length : 0;
  console.log(`[ProjectExpenseSettlement calculateBalances] sharePerMemberEUR for project "${project.name}": ${sharePerMemberEUR} (based on total: ${totalForShareCalculation})`);

  const balances = project.members.map(memberUid => {
    const memberProfile = memberProfilesOfProject.find(u => u.id === memberUid);
    let memberName = `UID: ${memberUid.substring(0,6)}...`; 
    if (!memberProfile) {
        console.warn(`[ProjectExpenseSettlement calculateBalances] Profile for member UID "${memberUid}" NOT FOUND in memberProfilesOfProject for project "${project.name}".`);
    } else if (memberProfile.name && memberProfile.name.trim() !== '') {
        memberName = memberProfile.name.trim();
    } else {
        console.warn(`[ProjectExpenseSettlement calculateBalances] Profile for UID ${memberUid} found, but 'name' is missing or empty. Using UID as name: "${memberUid}".`);
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
  console.log(`[ProjectExpenseSettlement calculateBalances] Calculated balances for project "${project.name}":`, JSON.stringify(balances.map(b => ({name: b.name, balance: b.balance.toFixed(2), paid:b.amountPaidEUR.toFixed(2), share:b.shareEUR.toFixed(2) }))));
  return balances;
};

const generateSettlementSuggestions = (balancesInput: MemberBalance[]): { from: string, to: string, amount: number }[] => {
  console.log("[SettlementSuggestions] Starting optimized suggestions. Input balances:", JSON.stringify(balancesInput.map(b => ({ name: b.name, balance: b.balance }))));

  if (!Array.isArray(balancesInput) || balancesInput.length === 0) {
    console.log("[SettlementSuggestions] Balances input is not an array or is empty. Returning empty suggestions.");
    return [];
  }

  const balances: MemberBalance[] = balancesInput.map(b => ({ ...b })); 
  const suggestions: { from: string, to: string, amount: number }[] = [];
  const epsilon = 0.005; 

  let debtors = balances.filter(m => m.balance < -epsilon).sort((a, b) => a.balance - b.balance); 
  let creditors = balances.filter(m => m.balance > epsilon).sort((a, b) => b.balance - a.balance); 
  
  console.log("[SettlementSuggestions] Initial Debtors:", JSON.stringify(debtors.map(d => ({name: d.name, balance: d.balance.toFixed(2)}))));
  console.log("[SettlementSuggestions] Initial Creditors:", JSON.stringify(creditors.map(c => ({name: c.name, balance: c.balance.toFixed(2)}))));

  let iteration = 0;
  const maxIterations = balances.length * balances.length; 

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
    console.warn("[SettlementSuggestions] Max iterations reached, but debts/credits might still exist.");
  }

  console.log("[SettlementSuggestions] Final suggestions:", JSON.stringify(suggestions));
  return suggestions;
};

export const ProjectExpenseSettlement: React.FC<ProjectExpenseSettlementProps> = ({
  project,
  memberProfilesOfProject: memberProfilesFromProp, 
  detailedProjectExpenses: detailedProjectExpensesFromProp, 
  isLoadingMemberProfiles,
  isLoadingDetailedExpenses,
}) => {
  
  const memberProfilesOfProject = Array.isArray(memberProfilesFromProp) ? memberProfilesFromProp : [];
  const detailedProjectExpenses = Array.isArray(detailedProjectExpensesFromProp) ? detailedProjectExpensesFromProp : [];

  console.log(`[ProjectExpenseSettlement Render] Received props - Project: ${project?.name}, MemberProfiles count: ${memberProfilesOfProject.length}, DetailedExpenses count: ${detailedProjectExpenses.length}, isLoadingMembers: ${isLoadingMemberProfiles}, isLoadingExpenses: ${isLoadingDetailedExpenses}`);

  if (isLoadingMemberProfiles || isLoadingDetailedExpenses) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Répartition des Paiements</CardTitle>
           {project && <CardDescription>Projet : {project.name}</CardDescription>}
        </CardHeader>
        <CardContent className="text-center py-5">
          <Icons.loader className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">Chargement des données de répartition...</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!project) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Répartition des Paiements</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-3">Aucun projet sélectionné pour afficher la répartition.</p>
        </CardContent>
      </Card>
    );
  }
  
  // Calculate balances only if data is not loading and project is defined
  const memberBalances = (!isLoadingMemberProfiles && !isLoadingDetailedExpenses && project) 
    ? calculateBalances(project, memberProfilesOfProject, detailedProjectExpenses) 
    : [];
  
  const settlementSuggestions = memberBalances.length > 0 ? generateSettlementSuggestions(memberBalances) : [];
  
  const noExpenses = detailedProjectExpenses.length === 0;
  const allBalanced = memberBalances.every(b => Math.abs(b.balance) <= 0.005) && settlementSuggestions.length === 0;

  if (memberProfilesOfProject.length === 0 && project.members && project.members.length > 0 && !isLoadingMemberProfiles) {
    return (
     <Card>
       <CardHeader>
         <CardTitle className="text-lg">Répartition des Paiements</CardTitle>
         <CardDescription>Projet : {project.name}</CardDescription>
       </CardHeader>
       <CardContent>
         <p className="text-muted-foreground text-center py-3">Les profils des membres de ce projet n'ont pas pu être chargés ou sont manquants. Impossible de calculer les balances.</p>
       </CardContent>
     </Card>
   );
 }

  if (noExpenses && !isLoadingDetailedExpenses && project.members && project.members.length > 0) {
    return (
     <Card>
       <CardHeader>
         <CardTitle className="text-lg">Répartition des Paiements</CardTitle>
          <CardDescription>Projet : {project.name}</CardDescription>
       </CardHeader>
       <CardContent>
         <p className="text-muted-foreground text-center py-3">Aucune dépense enregistrée pour ce projet. Les balances s'afficheront ici une fois des dépenses ajoutées.</p>
       </CardContent>
     </Card>
   );
 }


  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Répartition des Paiements</CardTitle>
        <CardDescription>Projet : {project.name}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {memberBalances.length > 0 ? (
        <>
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Balances Individuelles</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
            {memberBalances.map(({ uid, name, balance, amountPaidEUR, shareEUR }) => {
              const userProfile = memberProfilesOfProject.find(u => u.id === uid);
              const displayName = userProfile?.name && userProfile.name.trim() !== '' ? userProfile.name.trim() : name;
              const avatarUrl = userProfile?.avatarUrl;

              return (
                <div key={uid} className="flex items-center justify-between p-2.5 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-8 w-8">
                      <AvatarImage 
                        src={avatarUrl && avatarUrl.trim() !== '' ? avatarUrl : undefined} 
                        alt={displayName || "Membre"} 
                        data-ai-hint="member avatar"
                      />
                      <AvatarFallback className="text-xs">{getAvatarFallbackText(displayName, userProfile?.email)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-xs">{displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        Payé: {amountPaidEUR.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} /
                        Part: {shareEUR.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
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
              );
            })}
          </div>
        </div>

        {settlementSuggestions.length > 0 && !allBalanced && (
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Suggestions de Remboursement</h3>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-2">
              {settlementSuggestions.map((settlement, index) => {
                const fromUserProfile = memberProfilesOfProject.find(u=>u.name && u.name.trim().toLowerCase() === settlement.from.trim().toLowerCase());
                const toUserProfile = memberProfilesOfProject.find(u=>u.name && u.name.trim().toLowerCase() === settlement.to.trim().toLowerCase());
                const fromAvatarUrl = fromUserProfile?.avatarUrl;
                const toAvatarUrl = toUserProfile?.avatarUrl;

                return(
                <div key={index} className="flex items-center justify-between p-2 border border-border/70 bg-card rounded-md shadow-xs">
                    <div className="flex items-center gap-1.5 text-xs">
                        <Avatar className="h-6 w-6">
                            <AvatarImage 
                              src={fromAvatarUrl && fromAvatarUrl.trim() !== '' ? fromAvatarUrl : undefined} 
                              alt={settlement.from} 
                              data-ai-hint="payer avatar"
                            />
                            <AvatarFallback className="text-xxs">{getAvatarFallbackText(settlement.from, fromUserProfile?.email)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{settlement.from}</span>
                        <Icons.arrowRight className="h-3 w-3 text-muted-foreground mx-0.5" />
                        <Avatar className="h-6 w-6">
                             <AvatarImage 
                              src={toAvatarUrl && toAvatarUrl.trim() !== '' ? toAvatarUrl : undefined} 
                              alt={settlement.to} 
                              data-ai-hint="receiver avatar"
                             />
                             <AvatarFallback className="text-xxs">{getAvatarFallbackText(settlement.to, toUserProfile?.email)}</AvatarFallback>
                        </Avatar>
                         <span className="font-medium">{settlement.to}</span>
                    </div>
                    <Badge variant="outline" className="font-semibold text-xs px-2 py-0.5">
                        {settlement.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </Badge>
                </div>
              );
            })}
            </div>
          </div>
        )}
         {allBalanced && !noExpenses && !isLoadingDetailedExpenses && !isLoadingMemberProfiles && ( 
            <div className="text-center text-green-600 font-medium py-2.5 bg-green-500/10 rounded-md text-sm">
                <Icons.checkCircle className="inline mr-1.5 h-4 w-4"/> Dépenses équilibrées!
            </div>
        )}
        </>
        ) : (
             !isLoadingMemberProfiles && !isLoadingDetailedExpenses && <p className="text-sm text-muted-foreground text-center py-3">{noExpenses ? "Les balances s'afficheront ici une fois des dépenses ajoutées." : "Chargement des données de balance ou membres/dépenses manquants..."}</p>
        )}
      </CardContent>
    </Card>
  );
};
