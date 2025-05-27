
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Project, User as AppUserType } from '@/data/mock-data';
import { Icons } from '@/components/icons';
import type { ExpenseItem } from '@/app/expenses/page';

interface ProjectExpenseSettlementProps {
  project: Project;
  memberProfilesOfProject: AppUserType[] | undefined; // Can be undefined while loading
  detailedProjectExpenses: ExpenseItem[] | undefined; // Can be undefined while loading
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
  project: Project,
  memberProfilesInput: AppUserType[] | undefined,
  detailedExpensesInput: ExpenseItem[] | undefined
): MemberBalance[] => {
  const memberProfiles = Array.isArray(memberProfilesInput) ? memberProfilesInput : [];
  const detailedExpenses = Array.isArray(detailedExpensesInput) ? detailedExpensesInput : [];
  
  console.log(`ProjectExpenseSettlement (calculateBalances): Project: ${project?.name}, Members UIDs from project: ${project?.members ? project.members.join(', ') : 'N/A'}`);
  if (Array.isArray(memberProfiles) && memberProfiles.length > 0) {
    console.log(`ProjectExpenseSettlement (calculateBalances): Received memberProfiles:`, JSON.stringify(memberProfiles.map(u => ({id: u.id, name: u.name}))));
  } else {
    console.warn(`ProjectExpenseSettlement (calculateBalances): Received memberProfiles is empty or undefined. Value:`, memberProfilesInput);
  }
  console.log(`ProjectExpenseSettlement (calculateBalances): Received detailedExpenses count:`, detailedExpenses.length);


  if (!project || !project.members || project.members.length === 0) {
    console.warn(`ProjectExpenseSettlement (calculateBalances): Pre-conditions not met - project or project.members missing or empty. Project members: ${project?.members?.length}`);
    return [];
  }
   if (memberProfiles.length === 0) {
    console.warn(`ProjectExpenseSettlement (calculateBalances): Pre-conditions not met - memberProfiles is empty. Project: ${project.name}. Project members UIDs: ${project.members.join(', ')}. Falling back to UID-based balances.`);
     const fallbackShare = project.members.length > 0 ? (project.totalExpenses || 0) / project.members.length : 0;
     return project.members.map(memberUid => ({
        uid: memberUid,
        name: memberUid,
        balance: 0 - fallbackShare,
        amountPaidEUR: 0,
        shareEUR: fallbackShare,
     }));
  }

  const getUserProfileByUid = (uid: string): AppUserType | undefined => memberProfiles.find(u => u.id === uid);

  const totalPaidByMemberUidEUR: { [key: string]: number } = {};
  project.members.forEach(memberUid => {
    totalPaidByMemberUidEUR[memberUid] = 0;
  });

  detailedExpenses.forEach(expense => {
    const amountToAdd = expense.amountEUR ?? 0;
     if (expense.paidById && project.members.includes(expense.paidById)) {
        totalPaidByMemberUidEUR[expense.paidById] = (totalPaidByMemberUidEUR[expense.paidById] || 0) + amountToAdd;
        const payerProfile = getUserProfileByUid(expense.paidById);
        console.log(`ProjectExpenseSettlement (calculateBalances): Attributed ${amountToAdd} EUR to UID ${expense.paidById} (Name: ${payerProfile?.name || expense.paidById}) for expense "${expense.title}" in project "${project.name}"`);
    } else if (expense.paidById) {
        console.warn(`ProjectExpenseSettlement (calculateBalances): Payer UID "${expense.paidById}" (from expense: "${expense.title}") not found in project members for project "${project.name}". Project Members UIDs: ${project.members.join(', ')}`);
    }
  });
  console.log(`ProjectExpenseSettlement (calculateBalances): totalPaidByMemberUidEUR for project "${project.name}":`, JSON.stringify(totalPaidByMemberUidEUR));
  
  const currentProjectTotalExpensesEUR = project.totalExpenses; // Use the authoritative total from the project document
  console.log(`ProjectExpenseSettlement (calculateBalances): currentProjectTotalExpensesEUR (FROM PROJECT DOC) for project "${project.name}": ${currentProjectTotalExpensesEUR}`);

  const sharePerMemberEUR = project.members.length > 0 ? currentProjectTotalExpensesEUR / project.members.length : 0;
  console.log(`ProjectExpenseSettlement (calculateBalances): sharePerMemberEUR for project "${project.name}": ${sharePerMemberEUR}`);

  const balances = project.members.map(memberUid => {
    const memberProfile = getUserProfileByUid(memberUid);
    let memberName = memberUid; 
    if (!memberProfile) {
        console.warn(`ProjectExpenseSettlement (calculateBalances): Profile for member UID "${memberUid}" NOT FOUND in memberProfiles for project "${project.name}". This member's name will be their UID.`);
    } else if (memberProfile.name && memberProfile.name.trim() !== '') {
        memberName = memberProfile.name.trim();
    } else {
        console.warn(`ProjectExpenseSettlement (calculateBalances): Profile for UID ${memberUid} found, but 'name' is missing or empty. Using UID as name: "${memberUid}".`);
    }
    
    const amountPaid = totalPaidByMemberUidEUR[memberUid] || 0;
    return {
      uid: memberUid,
      name: memberName,
      balance: amountPaid - sharePerMemberEUR,
      amountPaidEUR: amountPaid,
      shareEUR: sharePerMemberEUR,
    };
  }).sort((a, b) => b.balance - a.balance); // Sort by balance descending (creditors first)
  console.log(`ProjectExpenseSettlement (calculateBalances): Calculated balances for project "${project.name}":`, JSON.stringify(balances));
  return balances;
};

const generateSettlementSuggestions = (balancesInput: MemberBalance[]): { from: string, to: string, amount: number }[] => {
  console.log("[ProjectExpenseSettlement generateSettlementSuggestions] Starting optimized suggestions calculation with balances:", JSON.stringify(balancesInput));
  if (!Array.isArray(balancesInput) || balancesInput.length === 0) {
    return [];
  }
  
  // Create a deep copy of balances to avoid mutating the original array/objects
  const balances: MemberBalance[] = JSON.parse(JSON.stringify(balancesInput));

  const suggestions: { from: string, to: string, amount: number }[] = [];
  const epsilon = 0.005; // Tolerance for floating point comparisons

  let debtors = balances.filter(m => m.balance < -epsilon).sort((a, b) => a.balance - b.balance); // Sort by most negative first
  let creditors = balances.filter(m => m.balance > epsilon).sort((a, b) => b.balance - a.balance); // Sort by most positive first

  console.log("[ProjectExpenseSettlement generateSettlementSuggestions] Initial Debtors:", JSON.stringify(debtors.map(d => ({name: d.name, balance: d.balance}))));
  console.log("[ProjectExpenseSettlement generateSettlementSuggestions] Initial Creditors:", JSON.stringify(creditors.map(c => ({name: c.name, balance: c.balance}))));

  while (debtors.length > 0 && creditors.length > 0) {
    const debtor = debtors[0]; 
    const creditor = creditors[0]; 

    const amountToTransfer = Math.min(-debtor.balance, creditor.balance);

    if (amountToTransfer > epsilon) {
      suggestions.push({
        from: debtor.name,
        to: creditor.name,
        amount: amountToTransfer,
      });
      console.log(`[ProjectExpenseSettlement generateSettlementSuggestions] Suggestion: ${debtor.name} pays ${creditor.name} ${amountToTransfer.toFixed(2)}`);

      debtor.balance += amountToTransfer;
      creditor.balance -= amountToTransfer;
    }

    // Remove if balanced
    if (Math.abs(debtor.balance) < epsilon) {
      debtors.shift();
    }
    if (Math.abs(creditor.balance) < epsilon) {
      creditors.shift();
    }
    
    // Re-sort if not removed, as balances changed
    debtors.sort((a, b) => a.balance - b.balance);
    creditors.sort((a, b) => b.balance - a.balance);
  }
  console.log("[ProjectExpenseSettlement generateSettlementSuggestions] Final suggestions:", JSON.stringify(suggestions));
  return suggestions;
}


export const ProjectExpenseSettlement: React.FC<ProjectExpenseSettlementProps> = ({
  project,
  memberProfilesOfProject,
  detailedProjectExpenses,
}) => {
  
  const localMemberProfiles = Array.isArray(memberProfilesOfProject) ? memberProfilesOfProject : [];
  const localDetailedExpenses = Array.isArray(detailedProjectExpenses) ? detailedProjectExpenses : [];

  if (!project || !project.members || project.members.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Répartition des Paiements</CardTitle>
          <CardDescription>Données du projet ou des membres manquantes.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-3">Impossible de calculer les balances.</p>
        </CardContent>
      </Card>
    );
  }

  const memberBalances = calculateBalances(project, localMemberProfiles, localDetailedExpenses);
  const settlementSuggestions = generateSettlementSuggestions(memberBalances);
  
  const noExpenses = localDetailedExpenses.length === 0;
  const allBalanced = memberBalances.every(b => Math.abs(b.balance) <= 0.005) && settlementSuggestions.length === 0;


  if (memberBalances.length === 0 && noExpenses) {
    return (
     <Card>
       <CardHeader>
         <CardTitle className="text-lg">Répartition des Paiements</CardTitle>
         <CardDescription>Aucune dépense enregistrée pour ce projet.</CardDescription>
       </CardHeader>
       <CardContent>
         <p className="text-muted-foreground text-center py-3">Les balances s'afficheront ici une fois des dépenses ajoutées.</p>
       </CardContent>
     </Card>
   );
 }
  if (memberBalances.length === 0 && !noExpenses && localMemberProfiles.length > 0) { // Added check for localMemberProfiles
    return (
     <Card>
       <CardHeader>
         <CardTitle className="text-lg">Répartition des Paiements</CardTitle>
         <CardDescription>Impossible de calculer les balances.</CardDescription>
       </CardHeader>
       <CardContent>
         <p className="text-muted-foreground text-center py-4">Vérifiez que tous les membres du projet ont un profil utilisateur avec un nom, et que les payeurs des dépenses correspondent à ces noms. Il se peut aussi que les dépenses ne soient pas encore chargées.</p>
       </CardContent>
     </Card>
   );
 }


  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Répartition des Paiements</CardTitle>
        {noExpenses && <CardDescription>Aucune dépense enregistrée pour ce projet.</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {memberBalances.length > 0 ? (
        <>
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Balances Individuelles</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
            {memberBalances.map(({ uid, name, balance, amountPaidEUR, shareEUR }) => {
              const userProfile = localMemberProfiles.find(u => u.id === uid);
              const displayName = (userProfile?.name && userProfile.name.trim() !== '') ? userProfile.name.trim() : name;
              const avatarUrl = userProfile?.avatarUrl;

              return (
                <div key={uid} className="flex items-center justify-between p-2.5 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={avatarUrl && avatarUrl.trim() !== '' ? avatarUrl : undefined} alt={displayName || "Membre"} data-ai-hint="member avatar"/>
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
                const fromUserProfile = localMemberProfiles.find(u=>u.name && u.name.trim().toLowerCase() === settlement.from.trim().toLowerCase());
                const toUserProfile = localMemberProfiles.find(u=>u.name && u.name.trim().toLowerCase() === settlement.to.trim().toLowerCase());
                const fromAvatarUrl = fromUserProfile?.avatarUrl;
                const toAvatarUrl = toUserProfile?.avatarUrl;

                return(
                <div key={index} className="flex items-center justify-between p-2 border border-border/70 bg-card rounded-md shadow-xs">
                    <div className="flex items-center gap-1.5 text-xs">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={fromAvatarUrl && fromAvatarUrl.trim() !== '' ? fromAvatarUrl : undefined} alt={settlement.from} data-ai-hint="payer avatar"/>
                            <AvatarFallback className="text-xxs">{getAvatarFallbackText(settlement.from, fromUserProfile?.email)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{settlement.from}</span>
                        <Icons.arrowRight className="h-3 w-3 text-muted-foreground mx-0.5" />
                        <Avatar className="h-6 w-6">
                             <AvatarImage src={toAvatarUrl && toAvatarUrl.trim() !== '' ? toAvatarUrl : undefined} alt={settlement.to} data-ai-hint="receiver avatar"/>
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
         {allBalanced && !noExpenses && ( // Changed from detailedProjectExpenses.length > 0 to !noExpenses
            <div className="text-center text-green-600 font-medium py-2.5 bg-green-500/10 rounded-md text-sm">
                <Icons.checkCircle className="inline mr-1.5 h-4 w-4"/> Dépenses équilibrées!
            </div>
        )}
        </>
        ) : (
             <p className="text-sm text-muted-foreground text-center py-3">{noExpenses ? "Les balances s'afficheront ici une fois des dépenses ajoutées." : "Chargement des données de balance ou membres manquants..."}</p>
        )}
      </CardContent>
    </Card>
  );
};

