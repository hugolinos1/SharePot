"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Icons } from "@/components/icons";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";

const data = [
  { name: "Jean D.", depenses: 300 },
  { name: "Sophie L.", depenses: 250 },
  { name: "Luc M.", depenses: 450 },
  { name: "Marie P.", depenses: 200 },
];

const recentExpenses = [
  { id: 1, description: "Restaurant Chez Michel", project: "Voyage à Prague", date: "22 avr. 2025", amount: "120,50 €", tag: "nourriture" },
  { id: 2, description: "Tickets de métro", project: "Voyage à Prague", date: "22 avr. 2025", amount: "45,20 €", tag: "transport" },
  { id: 3, description: "Visite du musée", project: "Voyage à Prague", date: "22 avr. 2025", amount: "85,00 €", tag: "musée" },
  { id: 4, description: "Loyer", project: "Colocation Juin", date: "22 avr. 2025", amount: "350,75 €", tag: "logement" },
  { id: 5, description: "Courses alimentaires", project: "Colocation Juin", date: "22 avr. 2025", amount: "65,45 €", tag: "nourriture" },
];

const activeProjects = [
  { id: 1, name: "Voyage à Prague", expenseCount: 12, totalExpense: "1250,75 €" },
  { id: 2, name: "Colocation Juin", expenseCount: 5, totalExpense: "450,30 €" },
  { id: 3, name: "Dîner d'équipe", expenseCount: 3, totalExpense: "210,45 €" },
];

export default function DashboardPage() {
  return (
    <SidebarProvider>
      <div className="flex flex-col">
        <div className="flex h-16 items-center justify-between px-4">
          <h1 className="text-2xl font-bold">Dépense Partagée</h1>
          <SidebarTrigger className="md:hidden"/>
        </div>
        <div className="flex flex-1 items-start">
          <Sidebar>
            <SidebarHeader className="hidden md:flex">
              <Icons.home className="mr-2 h-4 w-4"/>
              Dépense Partagée
            </SidebarHeader>
            <SidebarContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/dashboard">
                      <Icons.home className="mr-2 h-4 w-4"/>
                      <span>Tableau de bord</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/expenses/new">
                      <Icons.plusCircle className="mr-2 h-4 w-4"/>
                      <span>Nouvelle dépense</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/projects">
                      <Icons.file className="mr-2 h-4 w-4"/>
                      <span>Projets</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/users">
                      <Icons.user className="mr-2 h-4 w-4"/>
                      <span>Utilisateurs</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/settings">
                      <Icons.settings className="mr-2 h-4 w-4"/>
                      <span>Paramètres</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
              <SidebarSeparator/>
              <div className="p-2 text-center text-xs text-muted-foreground">
                © {new Date().getFullYear()} Firebase Studio
              </div>
            </SidebarFooter>
          </Sidebar>
          <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold">Tableau de bord</h1>
              <Button asChild>
                <Link href="/projects/create">Nouveau projet</Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <Card>
                <CardHeader>
                  <CardTitle>Total dépensé</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">666,90 €</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Dépenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">5</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Projets actifs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">3</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Moyenne / pers.</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">222,30 €</div>
                </CardContent>
              </Card>
            </div>

            <div className="mb-4">
              <Card>
                <CardHeader>
                  <CardTitle>Analyse des dépenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Bar dataKey="depenses" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="mb-4">
              <Card>
                <CardHeader>
                  <CardTitle>Dépenses récentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul>
                    {recentExpenses.map(expense => (
                      <li key={expense.id} className="py-2 border-b">
                        <div className="font-bold">{expense.description}</div>
                        <div className="text-sm">{expense.project} - {expense.date}</div>
                        <div className="text-sm">{expense.amount} ({expense.tag})</div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Vos projets actifs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {activeProjects.map(project => (
                      <div key={project.id} className="p-4 border rounded">
                        <div className="font-bold">{project.name}</div>
                        <div className="text-sm">{project.expenseCount} dépenses</div>
                        <div className="text-sm">{project.totalExpense}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
