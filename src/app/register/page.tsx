
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { useRouter } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { setDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
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
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: data.name });

      // Create user document in Firestore
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, {
        id: user.uid, 
        name: data.name,
        email: data.email,
        isAdmin: data.email.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
        createdAt: serverTimestamp() as Timestamp, // Cast to Timestamp for type consistency
        avatarUrl: '', 
        avatarStoragePath: '',
      });

      toast({
        title: "Inscription réussie",
        description: "Votre compte a été créé. Vous allez être redirigé.",
      });
      router.push('/dashboard');
    } catch (error: any) {
      console.error("Erreur d'inscription:", error);
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
              <Icons.trendingUp className="h-6 w-6 mr-3 shrink-0" />
              <span>Suivi des dépenses en temps réel</span>
            </li>
            <li className="flex items-center">
              <Icons.repeat className="h-6 w-6 mr-3 shrink-0" /> 
              <span>Conversion automatique des devises</span>
            </li>
            <li className="flex items-center">
              <Icons.users className="h-6 w-6 mr-3 shrink-0" />
              <span>Gestion collaborative des projets</span>
            </li>
            <li className="flex items-center">
              <Icons.eye className="h-6 w-6 mr-3 shrink-0" />
              <span>Visualisation avancée des données</span>
            </li>
          </ul>
        </div>

        <div className="p-8 md:p-12 flex flex-col justify-center">
          <h2 className="text-3xl font-semibold text-foreground mb-2">Créer un compte</h2>
          <p className="text-muted-foreground mb-8">
            Remplissez le formulaire pour vous inscrire.
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
                        <Icons.user className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
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
                        <Icons.mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                          type="email" 
                          placeholder="exemple@email.com" 
                          {...field} 
                          className="pl-10" 
                          data-ai-hint="email input"
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
                        <Icons.lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
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
              
              <Button type="submit" className="w-full text-lg py-3" disabled={isLoading}>
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

          <p className="text-center text-sm text-muted-foreground">
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
