
"use client";

import type React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Project, User as AppUserType } from '@/data/mock-data';
import { Icons } from '@/components/icons';

interface ProjectExpenseSettlementProps {
  project: Project;
  // Renamed to reflect that these are profiles relevant to THIS project
  memberProfilesOfProject: AppUserType[]; 
  isLoadingUserProfiles: boolean; // Renamed for consistency, reflects loading of memberProfilesOfProject
}

interface MemberBalance {
  uid: string;
  name: string; // Should be the resolved name
  balance: number; 
  amountPaid: number;
  share: number;
}

const getAvatarFallbackText = (name?: string | null, email?: string | null): string => {
  if (name) {
    const parts = name.split(' ');
    if (parts.length >= 2 && parts[0] && parts[parts.length - 1]) {
      return (parts[0][0] || '').toUpperCase() + (parts[parts.length - 1][0] || '').toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
  if (email) {
    return email.substring(0, 2).toUpperCase();
  }
  return '??';
};
  

const calculateBalances = (project: Project, memberProfiles: AppUserType[]): MemberBalance[] => {
  console.log(`ProjectExpenseSettlement (calculateBalances): Project: ${project.name}, Members UIDs from project: ${project.members.join(', ')}`);
  console.log(`ProjectExpenseSettlement (calculateBalances): Received memberProfiles:`, JSON.stringify(memberProfiles.map(u => ({id: u.id, name: u.name}))));

  if (!project || project.members.length === 0 || !memberProfiles || memberProfiles.length === 0) {
    console.warn(`ProjectExpenseSettlement (calculateBalances): Pre-conditions not met. Project members: ${project?.members?.length}, Member profiles provided: ${memberProfiles?.length}`);
    return [];
  }

  const getUserProfileByUid = (uid: string): AppUserType | undefined => memberProfiles.find(u => u.id === uid);
  
  const getUserProfileByName = (name: string): AppUserType | undefined => {
    if (!name || !memberProfiles) return undefined;
    const normalizedName = name.trim().toLowerCase();
    return memberProfiles.find(u => u.name && u.name.trim().toLowerCase() === normalizedName);
  };

  const totalPaidByMemberUid: { [key: string]: number } = {};
  project.members.forEach(memberUid => {
    totalPaidByMemberUid[memberUid] = 0;
  });

  let currentProjectTotalExpenses = 0;
  (project.recentExpenses || []).forEach(expense => { // Ensure recentExpenses is not undefined
    if (expense.payer) { 
      const payerProfile = getUserProfileByName(expense.payer); // Search within the provided memberProfiles
      if (!payerProfile) {
          console.warn(`ProjectExpenseSettlement (calculateBalances): Payer name "${expense.payer}" (from expense: "${expense.name}") NOT FOUND in provided memberProfiles for project "${project.name}". Checked profiles:`, JSON.stringify(memberProfiles.map(p => p.name)));
      } else if (!project.members.includes(payerProfile.id)) {
          // This case should be less likely if memberProfiles are correctly fetched for project.members
          console.warn(`ProjectExpenseSettlement (calculateBalances): Payer "${expense.payer}" (UID: ${payerProfile.id}) is NOT a member of project "${project.name}" based on project.members. Project Members UIDs: ${project.members.join(', ')}`);
      } else {
        totalPaidByMemberUid[payerProfile.id] = (totalPaidByMemberUid[payerProfile.id] || 0) + expense.amount;
      }
    }
    currentProjectTotalExpenses += expense.amount;
  });
  
  console.log(`ProjectExpenseSettlement (calculateBalances): totalPaidByMemberUid for project "${project.name}":`, JSON.stringify(totalPaidByMemberUid));
  console.log(`ProjectExpenseSettlement (calculateBalances): currentProjectTotalExpenses for project "${project.name}": ${currentProjectTotalExpenses}`);

  const sharePerMember = project.members.length > 0 ? currentProjectTotalExpenses / project.members.length : 0;
  console.log(`ProjectExpenseSettlement (calculateBalances): sharePerMember for project "${project.name}": ${sharePerMember}`);


  return project.members.map(memberUid => {
    const memberProfile = getUserProfileByUid(memberUid);
    if (!memberProfile) {
        console.warn(`ProjectExpenseSettlement (calculateBalances): Profile for member UID "${memberUid}" NOT FOUND in provided memberProfiles for project "${project.name}". This member's name will be their UID.`);
    }
    const memberName = memberProfile?.name || memberUid; 
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
  
  if (isLoadingUserProfiles) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Répartition des Paiements</CardTitle>
          <CardDescription>Chargement des informations utilisateurs...</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-4">
          <Icons.loader className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  
  const memberBalances = calculateBalances(project, memberProfilesOfProject);
  const settlementSuggestions = generateSettlementSuggestions(memberBalances.map(mb => ({ ...mb }))); 
  const allBalanced = memberBalances.every(b => Math.abs(b.balance) <= 0.005);
  const noExpenses = (project.recentExpenses || []).length === 0; // Ensure recentExpenses is not undefined

  if (memberBalances.length === 0 && noExpenses && !isLoadingUserProfiles) {
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
  if (memberBalances.length === 0 && !noExpenses && !isLoadingUserProfiles) {
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
        {noExpenses && !isLoadingUserProfiles && <CardDescription>Aucune dépense enregistrée pour ce projet.</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoadingUserProfiles ? (
            <div className="text-center py-4"><Icons.loader className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : noExpenses ? (
             <p className="text-sm text-muted-foreground text-center py-3">Les balances s'afficheront ici une fois des dépenses ajoutées.</p>
        ) : (
        <>
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Balances Individuelles</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
            {memberBalances.map(({ uid, name, balance, amountPaid, share }) => {
              const userProfile = memberProfilesOfProject.find(u => u.id === uid); // Use the passed profiles
              const displayName = userProfile?.name || name; // Fallback to name from balance if profile name is not found
              const avatarUrl = userProfile?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&color=fff`;

              return (
                <div key={uid} className="flex items-center justify-between p-2.5 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={avatarUrl} alt={displayName} data-ai-hint="member avatar"/>
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
                const fromAvatarUrl = fromUserProfile?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(settlement.from)}&background=random&color=fff&size=24`;
                const toAvatarUrl = toUserProfile?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(settlement.to)}&background=random&color=fff&size=24`;

                return(
                <div key={index} className="flex items-center justify-between p-2 border border-border/70 bg-card rounded-md shadow-xs">
                    <div className="flex items-center gap-1.5 text-xs">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={fromAvatarUrl} alt={settlement.from} data-ai-hint="payer avatar"/>
                            <AvatarFallback className="text-xxs">{getAvatarFallbackText(settlement.from, fromUserProfile?.email)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{settlement.from}</span>
                        <Icons.arrowRight className="h-3 w-3 text-muted-foreground mx-0.5" />
                        <Avatar className="h-6 w-6">
                             <AvatarImage src={toAvatarUrl} alt={settlement.to} data-ai-hint="receiver avatar"/>
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
         {allBalanced && (project.recentExpenses || []).length > 0 && ( // Ensure recentExpenses is not undefined
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


    