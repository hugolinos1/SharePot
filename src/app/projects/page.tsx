"use client";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icons } from "@/components/icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

const defaultProjects = [
  { id: "1", name: "Voyage à Prague", description: "Dépenses du voyage à Prague" },
  { id: "2", name: "Colocation Juin", description: "Dépenses de la colocation de Juin" },
  { id: "3", name: "Dîner d'équipe", description: "Dépenses du dîner d'équipe" },
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState(defaultProjects);

  const handleDelete = (id: string) => {
    setProjects(projects.filter(project => project.id !== id));
    toast({
      title: "Project Deleted",
      description: "Your project has been successfully deleted.",
    });
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manage Projects</h1>
        <Button asChild>
          <Link href="/projects/create">
            <Icons.plusCircle className="mr-2 h-4 w-4" />
            Nouveau projet
          </Link>
        </Button>
      </div>
      <Table>
        <TableCaption>A list of your projects.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <TableRow key={project.id}>
              <TableCell className="font-medium">{project.id}</TableCell>
              <TableCell>{project.name}</TableCell>
              <TableCell>{project.description}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <Icons.settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/expenses?projectId=${project.id}`}>
                        <Icons.file className="mr-2 h-4 w-4" />
                        View Expenses
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/projects/edit/${project.id}`}>
                        <Icons.edit className="mr-2 h-4 w-4" />
                        Edit
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" className="w-full justify-start">
                            <Icons.trash className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete your project
                              and remove all data associated with it.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(project.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="mt-4">
        <Button asChild>
          <Link href="/dashboard">
            <Icons.arrowRight className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
