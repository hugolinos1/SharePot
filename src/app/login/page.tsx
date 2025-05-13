
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

const loginSchema = z.object({
  email: z.string().email({ message: "Adresse e-mail invalide." }),
  password: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: LoginFormValues) => {
    console.log("Login data:", data);
    // Here you would typically handle authentication
    // For now, redirect to dashboard
    router.push('/dashboard');
  };

  const DollarSignIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5" // Thinner stroke
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-24 w-24 md:h-32 md:w-32 text-white" // Adjusted size and stroke
    >
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );


  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-4xl lg:grid lg:grid-cols-2 shadow-2xl overflow-hidden rounded-xl">
        {/* Left Panel */}
        <div className="bg-primary p-8 md:p-12 flex flex-col justify-center items-center text-primary-foreground">
          <div className="text-center">
            <DollarSignIcon />
            <h1 className="text-4xl md:text-5xl font-bold mt-4">Dépense Partagée</h1>
            <p className="mt-3 text-lg md:text-xl">
              Simplifiez la gestion de vos dépenses partagées en quelques clics
            </p>
          </div>
          <ul className="mt-8 md:mt-12 space-y-4 text-left w-full max-w-xs">
            <li className="flex items-center">
              <Icons.trendingUp className="h-6 w-6 mr-3 shrink-0" />
              <span>Suivi des dépenses en temps réel</span>
            </li>
            <li className="flex items-center">
              <Icons.repeat className="h-6 w-6 mr-3 shrink-0" /> {/* Changed to Repeat */}
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

        {/* Right Panel - Login Form */}
        <div className="p-8 md:p-12 flex flex-col justify-center">
          <h2 className="text-3xl font-semibold text-foreground mb-2">Connectez-vous</h2>
          <p className="text-muted-foreground mb-8">
            Entrez vos identifiants pour accéder à votre compte
          </p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
              
              <div className="text-right">
                <Link href="#" className="text-sm text-primary hover:underline">
                  Mot de passe oublié ?
                </Link>
              </div>

              <Button type="submit" className="w-full text-lg py-3">
                Se connecter
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
            Vous n&apos;avez pas de compte ?{' '}
            <Link href="#" className="font-semibold text-primary hover:underline">
              Créer un compte
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
