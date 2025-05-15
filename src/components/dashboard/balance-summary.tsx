
"use client";

import type React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Project, User as AppUserType } from '@/data/mock-data';
import { Icons } from '@/components/icons';

interface BalanceSummaryProps {
  project: Project | null;
  allUsersProfiles: AppUserType[];
  isLoadingUserProfiles: boolean;
}

interface MemberBalance {
  uid: string;
  name: string; // Can be UID if name not found
  balance: number; // Positive if owed by project, negative if owes to project
  amountPaid: number;
  share: number;
}

const getAvatarFallback = (name: string | undefined | null) => {
  if (!name) return '??';
  const parts = name.trim().split(' ');
  if (parts.length >= 2 && parts[0] && parts[parts.length - 1]) {
    return (parts[0][0] || '').toUpperCase() + (parts[parts.length - 1][0] || '').toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const calculateBalances = (project: Project, allUsersProfiles: AppUserType[]): MemberBalance[] => {
  console.log(`BalanceSummary (calculateBalances) for project "${project?.name}": Received allUsersProfiles:`, JSON.stringify(allUsersProfiles.map(u => ({id: u.id, name: u.name}))));
  
  if (!project || project.members.length === 0 || !allUsersProfiles) {
    console.warn("BalanceSummary (calculateBalances): Pre-condition fail. Project:", project, "allUsersProfiles:", allUsersProfiles);
    return [];
  }
  console.log("BalanceSummary (calculateBalances): Calculating for project:", project.name, "with members (UIDs):", project.members.join(', '));


  const getUserProfileByUid = (uid: string): AppUserType | undefined => allUsersProfiles.find(u => u.id === uid);
  
  const getUserProfileByName = (name: string): AppUserType | undefined => {
    if (!name || !allUsersProfiles) return undefined;
    const normalizedName = name.trim().toLowerCase();
    return allUsersProfiles.find(u => u.name && u.name.trim().toLowerCase() === normalizedName);
  };

  const totalPaidByMemberUid: { [key: string]: number } = {};
  project.members.forEach(memberUid => {
    totalPaidByMemberUid[memberUid] = 0; 
  });

  let currentProjectTotalExpenses = 0;
  (project.recentExpenses || []).forEach(expense => {
    if (expense.payer) { 
      const payerProfile = getUserProfileByName(expense.payer);
      if (payerProfile && project.members.includes(payerProfile.id)) { 
        totalPaidByMemberUid[payerProfile.id] = (totalPaidByMemberUid[payerProfile.id] || 0) + expense.amount;
        console.log(`BalanceSummary (calculateBalances): Attributed ${expense.amount} to UID ${payerProfile.id} (Name: ${payerProfile.name}) for expense "${expense.name}"`);
      } else {
         console.warn(`BalanceSummary (calculateBalances): Payer "${expense.payer}" (from expense: ${expense.name}) not found in project members or user profiles, or name mismatch for project "${project.name}". PayerProfile found: ${JSON.stringify(payerProfile)}, Project Members: ${project.members.join(', ')}`);
      }
    }
    currentProjectTotalExpenses += expense.amount;
  });
  
  const sharePerMember = project.members.length > 0 ? currentProjectTotalExpenses / project.members.length : 0;

  const balances = project.members.map(memberUid => {
    const memberProfile = getUserProfileByUid(memberUid);
    console.log(`BalanceSummary (calculateBalances): For memberUid "${memberUid}", found profile in allUsersProfiles:`, JSON.stringify(memberProfile));
    
    let memberName = memberUid; // Default to UID if profile or name is missing
    if (memberProfile) {
        if (memberProfile.name && memberProfile.name.trim() !== '') {
            memberName = memberProfile.name.trim();
        } else {
            console.warn(`BalanceSummary (calculateBalances): Profile for UID ${memberUid} found, but 'name' field is missing or empty. Using UID as name.`);
        }
    } else {
        console.warn(`BalanceSummary (calculateBalances): Profile for UID ${memberUid} not found in allUsersProfiles. Using UID as name.`);
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


export const BalanceSummary: React.FC<BalanceSummaryProps> = ({ project, allUsersProfiles, isLoadingUserProfiles }) => {
  console.log("BalanceSummary Render: Project:", project?.name, "isLoadingUserProfiles:", isLoadingUserProfiles);
  if (allUsersProfiles && allUsersProfiles.length > 0) {
    console.log("BalanceSummary Render: allUsersProfiles content:", JSON.stringify(allUsersProfiles.map(u => ({id: u.id, name: u.name}))));
  } else if (allUsersProfiles) {
    console.log("BalanceSummary Render: allUsersProfiles is empty.");
  } else {
    console.log("BalanceSummary Render: allUsersProfiles is undefined or null.");
  }


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
  
  if (isLoadingUserProfiles) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Répartition des Paiements - {project.name}</CardTitle>
          <CardDescription>Chargement des informations utilisateurs...</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-4">
          <Icons.loader className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const memberBalances = calculateBalances(project, allUsersProfiles);
  
  if (memberBalances.length === 0 && (project.recentExpenses || []).length === 0) {
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
   if (memberBalances.length === 0 && (project.recentExpenses || []).length > 0) {
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
        <CardDescription>Résumé des balances et suggestions de remboursement basées sur les dépenses enregistrées.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-md font-semibold mb-3">Balances Individuelles</h3>
          <div className="space-y-3">
            {memberBalances.map(({ name, balance, amountPaid, share, uid }) => {
              const userProfileInList = allUsersProfiles.find(u=>u.id===uid);
              
              let displayName = name; // Defaults to name from memberBalances (which might be UID)
              if (userProfileInList) {
                if (userProfileInList.name && userProfileInList.name.trim() !== '') {
                    displayName = userProfileInList.name.trim();
                } else {
                     console.warn(`BalanceSummary (JSX Display): Profile for UID ${uid} found, but 'name' is missing or empty. Displaying fallback name: "${name}".`);
                }
              } else {
                  console.warn(`BalanceSummary (JSX Display): Profile for UID ${uid} NOT FOUND in allUsersProfiles. Displaying fallback name: "${name}".`);
              }
                            
              const avatarUrl = userProfileInList?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&color=fff`;

              return (
                <div key={uid} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={avatarUrl} alt={displayName} data-ai-hint="member avatar" />
                      <AvatarFallback>{getAvatarFallback(displayName)}</AvatarFallback>
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
                 const fromUserProfile = allUsersProfiles.find(u=>u.name && u.name.trim().toLowerCase() === settlement.from.trim().toLowerCase());
                 const toUserProfile = allUsersProfiles.find(u=>u.name && u.name.trim().toLowerCase() === settlement.to.trim().toLowerCase());
                 const fromAvatarUrl = fromUserProfile?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(settlement.from)}&background=random&color=fff&size=28`;
                 const toAvatarUrl = toUserProfile?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(settlement.to)}&background=random&color=fff&size=28`;

                return (
                <div key={index} className="flex items-center justify-between p-3 border border-border bg-card rounded-lg shadow-sm">
                    <div className="flex items-center gap-2 text-sm">
                        <Avatar className="h-7 w-7">
                            <AvatarImage src={fromAvatarUrl} alt={settlement.from} data-ai-hint="payer avatar"/>
                            <AvatarFallback className="text-xs">{getAvatarFallback(settlement.from)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{settlement.from}</span>
                        <Icons.arrowRight className="h-4 w-4 text-muted-foreground mx-1" />
                        <Avatar className="h-7 w-7">
                             <AvatarImage src={toAvatarUrl} alt={settlement.to} data-ai-hint="receiver avatar"/>
                             <AvatarFallback className="text-xs">{getAvatarFallback(settlement.to)}</AvatarFallback>
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
         {allBalanced && (project.recentExpenses || []).length > 0 && (
            <div className="text-center text-green-600 font-medium py-3 bg-green-500/10 rounded-md">
                <Icons.checkCircle className="inline mr-2 h-5 w-5"/> Toutes les dépenses sont équilibrées pour ce projet !
            </div>
        )}

      </CardContent>
    </Card>
  );
};


