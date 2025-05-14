
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { useRouter } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import React from 'react';

const resetPasswordSchema = z.object({
  email: z.string().email({ message: "Adresse e-mail invalide." }),
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [emailSent, setEmailSent] = React.useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, data.email);
      toast({
        title: "E-mail envoyé",
        description: "Si un compte existe pour cette adresse, un e-mail de réinitialisation a été envoyé.",
      });
      setEmailSent(true);
    } catch (error: any) {
      console.error("Erreur de réinitialisation de mot de passe:", error);
      // Ne pas révéler si l'e-mail existe ou non pour des raisons de sécurité
      toast({
        title: "E-mail envoyé",
        description: "Si un compte existe pour cette adresse, un e-mail de réinitialisation a été envoyé.",
      });
      setEmailSent(true); // Afficher le message de succès même en cas d'erreur pour ne pas révéler l'existence d'e-mails
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <Link href="/" className="absolute top-8 left-8 flex items-center text-lg font-semibold text-primary">
        <Icons.dollarSign className="h-7 w-7 mr-2" />
        <span>DépensePartagée</span>
      </Link>
      <Card className="w-full max-w-md shadow-xl rounded-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Mot de passe oublié ?</CardTitle>
          <CardDescription>
            {emailSent 
              ? "Vérifiez votre boîte de réception (et vos spams) pour le lien de réinitialisation."
              : "Entrez votre adresse e-mail pour recevoir un lien de réinitialisation."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!emailSent ? (
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
                
                <Button type="submit" className="w-full text-lg py-3" disabled={isLoading}>
                  {isLoading ? <Icons.loader className="animate-spin" /> : 'Envoyer le lien'}
                </Button>
              </form>
            </Form>
          ) : (
             <Button onClick={() => router.push('/login')} className="w-full text-lg py-3">
                Retour à la connexion
              </Button>
          )}

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-primary hover:underline">
              Se souvenir de son mot de passe ? Se connecter
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
