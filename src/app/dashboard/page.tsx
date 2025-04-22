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
                  <SidebarMenuButton>
                    <Icons.home className="mr-2 h-4 w-4"/>
                    <span>Home</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <Icons.plusCircle className="mr-2 h-4 w-4"/>
                    <span>New Expense</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
              <SidebarSeparator/>
              <SidebarGroup>
                <SidebarHeader>Projects</SidebarHeader>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <Icons.file className="mr-2 h-4 w-4"/>
                      <span>Project 1</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <Icons.file className="mr-2 h-4 w-4"/>
                      <span>Project 2</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
              <SidebarSeparator/>
              <div className="p-2 text-center text-xs text-muted-foreground">
                © {new Date().getFullYear()} Firebase Studio
              </div>
            </SidebarFooter>
          </Sidebar>
          <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Dashboard Content</h1>
            <p>Main content area. Add your dashboard elements here.</p>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
