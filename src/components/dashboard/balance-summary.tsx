
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

interface BalanceSummaryProps {
  project: Project | null;
  memberProfilesOfProject: AppUserType[];
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

  if (Array.isArray(memberProfiles) && memberProfiles.length > 0) {
    console.log(`BalanceSummary (calculateBalances) for project "${project?.name}": Received memberProfilesOfProject:`, JSON.stringify(memberProfiles.map(u => ({id: u.id, name: u.name}))));
  } else {
    console.warn(`BalanceSummary (calculateBalances) for project "${project?.name}": Received memberProfilesOfProject is not a non-empty array or is undefined/null. Value:`, memberProfilesInput);
  }
  console.log(`BalanceSummary (calculateBalances): Received detailedExpenses count:`, detailedExpenses.length);


  if (!project || !project.members || project.members.length === 0) {
    console.warn(`BalanceSummary (calculateBalances): Pre-condition fail - project or project.members missing or empty. Project:`, project);
    return [];
  }
  if (memberProfiles.length === 0 && project.members.length > 0) {
    console.warn(`BalanceSummary (calculateBalances): No member profiles provided, but project has members. Project: ${project.name}. Members: ${project.members.join(', ')}. Falling back to UID-based balances.`);
     const fallbackShare = project.members.length > 0 ? (detailedExpenses.reduce((sum, exp) => sum + exp.amount, 0)) / project.members.length : 0;
     return project.members.map(memberUid => ({
        uid: memberUid,
        name: memberUid,
        balance: 0 - fallbackShare,
        amountPaid: 0,
        share: fallbackShare,
     }));
  }
  console.log(`BalanceSummary (calculateBalances): Calculating for project: "${project.name}", with members (UIDs): ${project.members.join(', ')}`);

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
        console.log(`BalanceSummary (calculateBalances): Attributed ${expense.amount} to UID ${expense.paidById} (Name: ${payerProfile?.name || expense.paidById}) for expense "${expense.title}"`);
    } else if (expense.paidById) {
         console.warn(`BalanceSummary (calculateBalances): Payer UID "${expense.paidById}" (from expense: "${expense.title}") not found in project members list for project "${project.name}". Project Members UIDs: ${project.members.join(', ')}`);
    } else if (expense.paidByName) {
        const payerProfileByName = getUserProfileByName(expense.paidByName);
        if (payerProfileByName && project.members.includes(payerProfileByName.id)) {
            totalPaidByMemberUid[payerProfileByName.id] = (totalPaidByMemberUid[payerProfileByName.id] || 0) + expense.amount;
            console.log(`BalanceSummary (calculateBalances): Attributed ${expense.amount} by NAME to UID ${payerProfileByName.id} (Name: ${payerProfileByName.name}) for expense "${expense.title}"`);
        } else {
            console.warn(`BalanceSummary (calculateBalances): Payer name "${expense.paidByName}" (from expense: "${expense.title}") not found in project members or user profiles, or name mismatch for project "${project.name}". PayerProfile found: ${payerProfileByName}, Project Members: ${project.members.join(', ')}`);
        }
    }
  });
  console.log(`BalanceSummary (calculateBalances): totalPaidByMemberUid for project "${project.name}":`, JSON.stringify(totalPaidByMemberUid));

  const currentProjectTotalExpenses = detailedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  console.log(`BalanceSummary (calculateBalances): currentProjectTotalExpenses (CALCULATED from detailedExpenses) for project "${project.name}": ${currentProjectTotalExpenses}`);

  const sharePerMember = project.members.length > 0 ? currentProjectTotalExpenses / project.members.length : 0;
  console.log(`BalanceSummary (calculateBalances): sharePerMember for project "${project.name}": ${sharePerMember}`);

  const balances = project.members.map(memberUid => {
    const memberProfile = getUserProfileByUid(memberUid);
    let memberName = memberUid; // Fallback to UID

    if (memberProfile) {
        if (memberProfile.name && memberProfile.name.trim() !== '') {
            memberName = memberProfile.name.trim();
        } else {
            console.warn(`BalanceSummary (calculateBalances): Profile for UID ${memberUid} found, but 'name' is missing or empty. Using fallback name: "${memberName}".`);
        }
    } else {
        console.warn(`BalanceSummary (calculateBalances): Profile for UID ${memberUid} not found in memberProfilesOfProject. Using fallback name: "${memberName}".`);
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
  console.log(`BalanceSummary (calculateBalances): Calculated balances for project "${project.name}":`, JSON.stringify(balances));
  return balances;
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


export const BalanceSummary: React.FC<BalanceSummaryProps> = ({ project, memberProfilesOfProject }) => {
  const [detailedProjectExpenses, setDetailedProjectExpenses] = useState<ExpenseItem[]>([]);
  const [isLoadingDetailedExpenses, setIsLoadingDetailedExpenses] = useState(false);

  console.log(`BalanceSummary Render: Project: ${project?.name}, memberProfilesOfProject length: ${memberProfilesOfProject?.length}`);
  if (Array.isArray(memberProfilesOfProject) && memberProfilesOfProject.length > 0) {
    console.log(`BalanceSummary Render: memberProfilesOfProject content:`, JSON.stringify(memberProfilesOfProject.map(u => ({id: u.id, name: u.name}))));
  } else {
    console.log(`BalanceSummary Render: memberProfilesOfProject is empty.`);
  }


  useEffect(() => {
    const fetchDetailedExpenses = async () => {
      if (!project || !project.id) {
        setDetailedProjectExpenses([]);
        return;
      }
      setIsLoadingDetailedExpenses(true);
      try {
        console.log(`BalanceSummary: Fetching detailed expenses for project ID: ${project.id}`);
        const expensesRef = collection(db, "expenses");
        const q = query(expensesRef, where("projectId", "==", project.id));
        const querySnapshot = await getDocs(q);
        const fetchedExpenses = querySnapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data(),
        } as ExpenseItem));
        setDetailedProjectExpenses(fetchedExpenses);
        console.log(`BalanceSummary: Successfully fetched ${fetchedExpenses.length} detailed expenses for project ${project.name}`);
      } catch (error) {
        console.error(`BalanceSummary: Error fetching detailed expenses for project ${project.id}:`, error);
        setDetailedProjectExpenses([]);
      } finally {
        setIsLoadingDetailedExpenses(false);
      }
    };

    fetchDetailedExpenses();
  }, [project]);

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

  if (isLoadingDetailedExpenses) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Répartition des Paiements - {project.name}</CardTitle>
          <CardDescription>Chargement des informations...</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-4">
          <Icons.loader className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  
  const memberBalances = calculateBalances(project, memberProfilesOfProject, detailedProjectExpenses);

  if (memberBalances.length === 0 && detailedProjectExpenses.length === 0 && !isLoadingDetailedExpenses) {
     return (
      <Card>
        <CardHeader>
          <CardTitle>Répartition des Paiements - {project.name}</CardTitle>
          <CardDescription>Pas de données de dépenses ou de membres pour calculer les balances pour ce projet.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">Aucune dépense enregistrée pour ce projet.</p>
        </CardContent>
      </Card>
    );
  }
   if (memberBalances.length === 0 && detailedProjectExpenses.length > 0 && !isLoadingDetailedExpenses) {
     return (
      <Card>
        <CardHeader>
          <CardTitle>Répartition des Paiements - {project.name}</CardTitle>
          <CardDescription>Impossible de calculer les balances. Vérifiez les membres du projet et leurs profils utilisateurs.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">Aucun membre trouvé pour répartir les dépenses, ou les profils utilisateurs ne sont pas encore chargés/complets.</p>
        </CardContent>
      </Card>
    );
  }

  const settlementSuggestions = generateSettlementSuggestions(memberBalances.map(mb => ({ ...mb })));
  const allBalanced = memberBalances.every(b => Math.abs(b.balance) <= 0.005);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Répartition des Paiements - {project.name}</CardTitle>
        <CardDescription>Résumé des balances et suggestions de remboursement basées sur toutes les dépenses enregistrées pour ce projet.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-md font-semibold mb-3">Balances Individuelles</h3>
          <div className="space-y-3">
            {memberBalances.map(({ name, balance, amountPaid, share, uid }) => {
              const userProfileInList = memberProfilesOfProject.find(u=>u.id===uid);

              let displayName = name; // Fallback to name from calculateBalances (which might be UID)
              if (userProfileInList) {
                if (userProfileInList.name && userProfileInList.name.trim() !== '') {
                    displayName = userProfileInList.name.trim();
                } else {
                     console.warn(`BalanceSummary (JSX Display) UID "${uid}": Profile found, but 'name' is missing or empty. Displaying fallback name: "${name}".`);
                }
              } else if (name === uid) { 
                  console.warn(`BalanceSummary (JSX Display) UID "${uid}": Profile NOT FOUND in memberProfilesOfProject. Displaying fallback name: "${name}".`);
              }

              const avatarUrl = userProfileInList?.avatarUrl;

              return (
                <div key={uid} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={avatarUrl && avatarUrl.trim() !== '' ? avatarUrl : undefined} alt={displayName || "Utilisateur"} data-ai-hint="member avatar" />
                      <AvatarFallback>{getAvatarFallbackText(displayName, userProfileInList?.email)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{displayName}</p>
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
              );
            })}
          </div>
        </div>

        {settlementSuggestions.length > 0 && !allBalanced && (
          <div>
            <h3 className="text-md font-semibold mb-3">Suggestions de Remboursement</h3>
            <div className="space-y-2">
              {settlementSuggestions.map((settlement, index) => {
                 const fromUserProfile = memberProfilesOfProject.find(u=>u.name && u.name.trim().toLowerCase() === settlement.from.trim().toLowerCase());
                 const toUserProfile = memberProfilesOfProject.find(u=>u.name && u.name.trim().toLowerCase() === settlement.to.trim().toLowerCase());
                 const fromAvatarUrl = fromUserProfile?.avatarUrl;
                 const toAvatarUrl = toUserProfile?.avatarUrl;

                return (
                <div key={index} className="flex items-center justify-between p-3 border border-border bg-card rounded-lg shadow-sm">
                    <div className="flex items-center gap-2 text-sm">
                        <Avatar className="h-7 w-7">
                            <AvatarImage src={fromAvatarUrl && fromAvatarUrl.trim() !== '' ? fromAvatarUrl : undefined} alt={settlement.from} data-ai-hint="payer avatar"/>
                            <AvatarFallback className="text-xs">{getAvatarFallbackText(settlement.from, fromUserProfile?.email)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{settlement.from}</span>
                        <Icons.arrowRight className="h-4 w-4 text-muted-foreground mx-1" />
                        <Avatar className="h-7 w-7">
                             <AvatarImage src={toAvatarUrl && toAvatarUrl.trim() !== '' ? toAvatarUrl : undefined} alt={settlement.to} data-ai-hint="receiver avatar"/>
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
         {allBalanced && detailedProjectExpenses.length > 0 && (
            <div className="text-center text-green-600 font-medium py-3 bg-green-500/10 rounded-md">
                <Icons.checkCircle className="inline mr-2 h-5 w-5"/> Toutes les dépenses sont équilibrées pour ce projet !
            </div>
        )}
      </CardContent>
    </Card>
  );
};

