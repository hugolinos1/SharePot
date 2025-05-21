
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { setDoc, doc, serverTimestamp, Timestamp, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import React from 'react';

const ADMIN_EMAIL = "hugues.rabier@gmail.com";

const registerSchema = z.object({
  name: z.string().min(2, { message: "Le nom doit contenir au moins 2 caractères." }),
  email: z.string().email({ message: "Adresse e-mail invalide." }),
  password: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères." }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: searchParams.get('invitedEmail') || "", // Pré-remplir si invité
      password: "",
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    const projectId = searchParams.get('projectId');
    const invitedEmail = searchParams.get('invitedEmail');

    console.log("[RegisterPage onSubmit] Attempting registration for:", data.email);
    console.log("[RegisterPage onSubmit] projectId from URL:", projectId);
    console.log("[RegisterPage onSubmit] invitedEmail from URL:", invitedEmail);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;
      console.log("[RegisterPage onSubmit] Firebase Auth user created successfully. UID:", user.uid);

      await updateProfile(user, { displayName: data.name });

      const userDocRef = doc(db, "users", user.uid);
      const userDocData = {
        id: user.uid,
        name: data.name,
        email: data.email,
        isAdmin: data.email.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
        createdAt: serverTimestamp() as Timestamp,
        avatarUrl: '', // Sera généré par AuthContext si vide
        avatarStoragePath: '',
      };
      await setDoc(userDocRef, userDocData);
      console.log("[RegisterPage onSubmit] Firestore user document created for UID:", user.uid, "Data:", JSON.stringify(userDocData));

      toast({
        title: "Inscription réussie",
        description: "Votre compte a été créé.",
      });

      if (projectId && invitedEmail && user.email) {
        console.log(`[RegisterPage onSubmit] Checking invitation conditions: User email: ${user.email.toLowerCase()}, Invited email from URL: ${invitedEmail.toLowerCase()}`);
        if (user.email.toLowerCase() === invitedEmail.toLowerCase()) {
          console.log(`[RegisterPage onSubmit] Email match! Attempting to add user ${user.uid} to project ${projectId}.`);
          try {
            const projectRef = doc(db, "projects", projectId);
            const projectDoc = await getDoc(projectRef);

            if (!projectDoc.exists()) {
              console.error(`[RegisterPage onSubmit] Project ${projectId} does not exist. Cannot add member.`);
              toast({
                title: "Erreur d'ajout au projet",
                description: "Le projet invité n'existe plus.",
                variant: "destructive",
              });
            } else {
              const projectUpdateData = {
                members: arrayUnion(user.uid),
                updatedAt: serverTimestamp(),
              };
              await updateDoc(projectRef, projectUpdateData);
              toast({
                title: "Projet rejoint",
                description: "Vous avez été automatiquement ajouté au projet invité.",
              });
              console.log(`[RegisterPage onSubmit] Successfully added user ${user.uid} to project ${projectId}. Update data:`, JSON.stringify(projectUpdateData));
            }
          } catch (projectAddError: any) {
            console.error(`[RegisterPage onSubmit] Error adding user to project ${projectId}:`, projectAddError.message, projectAddError);
            toast({
              title: "Erreur d'ajout au projet",
              description: `Impossible de vous ajouter automatiquement au projet invité: ${projectAddError.message}. Vérifiez les règles Firestore ou si le projet existe.`,
              variant: "destructive",
              duration: 7000,
            });
          }
        } else {
          console.warn(`[RegisterPage onSubmit] Email mismatch. User email from form: ${data.email.toLowerCase()}, Invited email from URL: ${invitedEmail.toLowerCase()}. User not added to project.`);
        }
      } else {
        console.log("[RegisterPage onSubmit] No projectId or invitedEmail in URL, or user.email is null. Skipping project auto-join.");
      }

      router.push('/dashboard');
    } catch (error: any) {
      console.error("[RegisterPage onSubmit] Erreur d'inscription générale:", error.message, error);
      let errorMessage = "Une erreur est survenue lors de l'inscription.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Cette adresse e-mail est déjà utilisée.";
      }
      toast({
        title: "Erreur d'inscription",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const DollarSignIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-24 w-24 md:h-32 md:w-32 text-white"
    >
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-4xl lg:grid lg:grid-cols-2 shadow-2xl overflow-hidden rounded-xl">
         <div className="bg-primary p-8 md:p-12 flex flex-col justify-center items-center text-primary-foreground order-last lg:order-first">
          <div className="text-center">
            <DollarSignIcon />
            <h1 className="text-4xl md:text-5xl font-bold mt-4">Sharepot</h1>
            <p className="mt-3 text-lg md:text-xl">
              Rejoignez-nous et simplifiez vos finances de groupe !
            </p>
          </div>
            <ul className="mt-8 md:mt-12 space-y-4 text-left w-full max-w-xs">
            <li className="flex items-center">
              <Icons.trendingUp className="mr-3 shrink-0 h-6 w-6" />
              <span>Suivi des dépenses en temps réel</span>
            </li>
            <li className="flex items-center">
              <Icons.repeat className="mr-3 shrink-0 h-6 w-6" />
              <span>Conversion automatique des devises</span>
            </li>
            <li className="flex items-center">
              <Icons.users className="mr-3 shrink-0 h-6 w-6" />
              <span>Gestion collaborative des projets</span>
            </li>
            <li className="flex items-center">
              <Icons.eye className="mr-3 shrink-0 h-6 w-6" />
              <span>Visualisation avancée des données</span>
            </li>
          </ul>
        </div>

        <div className="p-8 md:p-12 flex flex-col justify-center">
          <h2 className="text-3xl font-semibold text-foreground mb-2">Créer un compte</h2>
          <p className="text-muted-foreground mb-8">
            {searchParams.get('projectId') ? "Rejoignez un projet en créant votre compte." : "Remplissez le formulaire pour vous inscrire."}
          </p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom complet</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Icons.user className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Votre nom complet"
                          {...field}
                          className="pl-10"
                          data-ai-hint="full name input"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse e-mail</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Icons.mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="email"
                          placeholder="exemple@email.com"
                          {...field}
                          className="pl-10"
                          data-ai-hint="email input"
                          disabled={!!searchParams.get('invitedEmail')} // Désactiver si l'email est pré-rempli par une invitation
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Icons.lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                          className="pl-10"
                          data-ai-hint="password input"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full py-3 text-lg" disabled={isLoading}>
                {isLoading ? <Icons.loader className="animate-spin" /> : "S'inscrire"}
              </Button>
            </form>
          </Form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                OU
              </span>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Vous avez déjà un compte ?{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}

    