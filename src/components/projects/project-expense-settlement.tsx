
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Project, User as AppUserType } from '@/data/mock-data';
import { Icons } from '@/components/icons';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, type DocumentData } from 'firebase/firestore';
import type { ExpenseItem } from '@/app/expenses/page';

interface ProjectExpenseSettlementProps {
  project: Project;
  memberProfilesOfProject: AppUserType[];
  isLoadingUserProfiles: boolean;
}

interface MemberBalance {
  uid: string;
  name: string;
  balance: number;
  amountPaid: number;
  share: number;
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


const calculateBalances = (project: Project, memberProfilesInput: AppUserType[], detailedExpensesInput: ExpenseItem[]): MemberBalance[] => {
  const memberProfiles = Array.isArray(memberProfilesInput) ? memberProfilesInput : [];
  const detailedExpenses = Array.isArray(detailedExpensesInput) ? detailedExpensesInput : [];
  
  console.log(`ProjectExpenseSettlement (calculateBalances): Project: ${project?.name}, Members UIDs from project: ${project?.members ? project.members.join(', ') : 'N/A'}`);
  if (Array.isArray(memberProfiles) && memberProfiles.length > 0) {
    console.log(`ProjectExpenseSettlement (calculateBalances): Received memberProfilesOfProject:`, JSON.stringify(memberProfiles.map(u => ({id: u.id, name: u.name}))));
  } else {
    console.warn(`ProjectExpenseSettlement (calculateBalances): Received memberProfilesOfProject is not a non-empty array or is undefined/null. Value:`, memberProfilesInput);
  }
  console.log(`ProjectExpenseSettlement (calculateBalances): Received detailedExpenses count:`, detailedExpenses.length);


  if (!project || !project.members || project.members.length === 0) {
    console.warn(`ProjectExpenseSettlement (calculateBalances): Pre-conditions not met - project or project.members missing or empty. Project members: ${project?.members?.length}`);
    return [];
  }
   if (memberProfiles.length === 0) {
    console.warn(`ProjectExpenseSettlement (calculateBalances): Pre-conditions not met - memberProfiles is empty. Project: ${project.name}. Project members UIDs: ${project.members.join(', ')}`);
     const fallbackShare = project.members.length > 0 ? (detailedExpenses.reduce((sum, exp) => sum + exp.amount, 0)) / project.members.length : 0;
     return project.members.map(memberUid => ({
        uid: memberUid, 
        name: memberUid, 
        balance: 0 - fallbackShare, 
        amountPaid: 0,
        share: fallbackShare,
     }));
  }

  const getUserProfileByUid = (uid: string): AppUserType | undefined => memberProfiles.find(u => u.id === uid);
  const getUserProfileByName = (name: string): AppUserType | undefined => {
    if (!name || name.trim() === '') return undefined;
    const normalizedName = name.trim().toLowerCase();
    return memberProfiles.find(u => u.name && u.name.trim().toLowerCase() === normalizedName);
  };

  const totalPaidByMemberUid: { [key: string]: number } = {};
  project.members.forEach(memberUid => {
    totalPaidByMemberUid[memberUid] = 0;
  });

  detailedExpenses.forEach(expense => {
     if (expense.paidById && project.members.includes(expense.paidById)) {
        totalPaidByMemberUid[expense.paidById] = (totalPaidByMemberUid[expense.paidById] || 0) + expense.amount;
        const payerProfile = getUserProfileByUid(expense.paidById);
        console.log(`ProjectExpenseSettlement (calculateBalances): Attributed ${expense.amount} to UID ${expense.paidById} (Name: ${payerProfile?.name || expense.paidById}) for expense "${expense.title}"`);
    } else if (expense.paidById) {
        console.warn(`ProjectExpenseSettlement (calculateBalances): Payer UID "${expense.paidById}" (from expense: "${expense.title}") not found in project members for project "${project.name}". Project Members UIDs: ${project.members.join(', ')}`);
    } else if (expense.paidByName) { // Fallback to paidByName if paidById is missing
        const payerProfileByName = getUserProfileByName(expense.paidByName);
        if (payerProfileByName && project.members.includes(payerProfileByName.id)) {
            totalPaidByMemberUid[payerProfileByName.id] = (totalPaidByMemberUid[payerProfileByName.id] || 0) + expense.amount;
            console.log(`ProjectExpenseSettlement (calculateBalances): Attributed ${expense.amount} by NAME to UID ${payerProfileByName.id} (Name: ${payerProfileByName.name}) for expense "${expense.title}"`);
        } else {
            console.warn(`ProjectExpenseSettlement (calculateBalances): Payer name "${expense.paidByName}" (from expense: "${expense.title}") NOT FOUND in memberProfiles for project "${project.name}". PayerProfile by name found:`, payerProfileByName);
        }
    } else {
        console.warn(`ProjectExpenseSettlement (calculateBalances): Expense "${expense.title}" has neither paidById nor paidByName.`);
    }
  });

  console.log(`ProjectExpenseSettlement (calculateBalances): totalPaidByMemberUid for project "${project.name}":`, JSON.stringify(totalPaidByMemberUid));

  const currentProjectTotalExpenses = detailedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  console.log(`ProjectExpenseSettlement (calculateBalances): currentProjectTotalExpenses (CALCULATED from detailedExpenses) for project "${project.name}": ${currentProjectTotalExpenses}`);

  const sharePerMember = project.members.length > 0 ? currentProjectTotalExpenses / project.members.length : 0;
  console.log(`ProjectExpenseSettlement (calculateBalances): sharePerMember for project "${project.name}": ${sharePerMember}`);


  return project.members.map(memberUid => {
    const memberProfile = getUserProfileByUid(memberUid);
    let memberName = memberUid; // Fallback to UID
    if (!memberProfile) {
        console.warn(`ProjectExpenseSettlement (calculateBalances): Profile for member UID "${memberUid}" NOT FOUND in memberProfilesOfProject for project "${project.name}". This member's name will be their UID.`);
    } else if (memberProfile.name && memberProfile.name.trim() !== '') {
        memberName = memberProfile.name.trim();
    } else {
        console.warn(`ProjectExpenseSettlement (calculateBalances): Profile for UID ${memberUid} found, but 'name' is missing or empty. Using UID as name: "${memberUid}".`);
    }
    
    const amountPaid = totalPaidByMemberUid[memberUid] || 0;
    return {
      uid: memberUid,
      name: memberName,
      balance: amountPaid - sharePerMember,
      amountPaid: amountPaid,
      share: sharePerMember,
    };
  }).sort((a, b) => b.balance - a.balance);
};

const generateSettlementSuggestions = (balances: MemberBalance[]): { from: string, to: string, amount: number }[] => {
  const suggestions: { from: string, to: string, amount: number }[] = [];
  let debtors = balances.filter(m => m.balance < -0.005).map(m => ({ ...m, balance: -m.balance })).sort((a,b) => b.balance - a.balance);
  let creditors = balances.filter(m => m.balance > 0.005).map(m => ({ ...m })).sort((a,b) => b.balance - a.balance);

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


export const ProjectExpenseSettlement: React.FC<ProjectExpenseSettlementProps> = ({ project, memberProfilesOfProject, isLoadingUserProfiles }) => {
  const [detailedProjectExpenses, setDetailedProjectExpenses] = useState<ExpenseItem[]>([]);
  const [isLoadingDetailedExpenses, setIsLoadingDetailedExpenses] = useState(false);

  useEffect(() => {
    const fetchDetailedExpenses = async () => {
      if (!project || !project.id) {
        setDetailedProjectExpenses([]);
        return;
      }
      setIsLoadingDetailedExpenses(true);
      try {
        console.log(`ProjectExpenseSettlement: Fetching detailed expenses for project ID: ${project.id}`);
        const expensesRef = collection(db, "expenses");
        const q = query(expensesRef, where("projectId", "==", project.id));
        const querySnapshot = await getDocs(q);
        const fetchedExpenses = querySnapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data(),
        } as ExpenseItem));
        setDetailedProjectExpenses(fetchedExpenses);
        console.log(`ProjectExpenseSettlement: Successfully fetched ${fetchedExpenses.length} detailed expenses for project ${project.name}`);
      } catch (error) {
        console.error(`ProjectExpenseSettlement: Error fetching detailed expenses for project ${project.id}:`, error);
        setDetailedProjectExpenses([]);
      } finally {
        setIsLoadingDetailedExpenses(false);
      }
    };

    if (project && project.id) {
        fetchDetailedExpenses();
    } else {
        setDetailedProjectExpenses([]);
    }
  }, [project]);


  if (isLoadingUserProfiles || isLoadingDetailedExpenses) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Répartition des Paiements</CardTitle>
          <CardDescription>Chargement des informations...</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-4">
          <Icons.loader className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const memberBalances = calculateBalances(project, memberProfilesOfProject, detailedProjectExpenses);
  const settlementSuggestions = generateSettlementSuggestions(memberBalances.map(mb => ({ ...mb })));
  const allBalanced = memberBalances.every(b => Math.abs(b.balance) <= 0.005);
  const noExpenses = detailedProjectExpenses.length === 0;

  if (memberBalances.length === 0 && noExpenses && !isLoadingUserProfiles && !isLoadingDetailedExpenses) {
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
  if (memberBalances.length === 0 && !noExpenses && !isLoadingUserProfiles && !isLoadingDetailedExpenses) {
    return (
     <Card>
       <CardHeader>
         <CardTitle className="text-lg">Répartition des Paiements</CardTitle>
         <CardDescription>Impossible de calculer les balances.</CardDescription>
       </CardHeader>
       <CardContent>
         <p className="text-muted-foreground text-center py-4">Vérifiez que tous les membres du projet ont un profil utilisateur avec un nom, et que les payeurs des dépenses correspondent à ces noms.</p>
       </CardContent>
     </Card>
   );
 }


  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Répartition des Paiements</CardTitle>
        {noExpenses && !isLoadingUserProfiles && !isLoadingDetailedExpenses && <CardDescription>Aucune dépense enregistrée pour ce projet.</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoadingUserProfiles || isLoadingDetailedExpenses ? (
            <div className="text-center py-4"><Icons.loader className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : noExpenses ? (
             <p className="text-sm text-muted-foreground text-center py-3">Les balances s'afficheront ici une fois des dépenses ajoutées.</p>
        ) : (
        <>
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Balances Individuelles</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
            {memberBalances.map(({ uid, name, balance, amountPaid, share }) => {
              const userProfile = memberProfilesOfProject.find(u => u.id === uid);
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
         {allBalanced && detailedProjectExpenses.length > 0 && (
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

