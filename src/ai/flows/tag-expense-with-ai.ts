
'use server';

/**
 * @fileOverview An AI agent that suggests a single thematic category for an expense based on its description.
 * It uses OpenRouter with a free model and the API key stored in Firestore settings.
 *
 * - tagExpense - A function that handles the expense category suggestion.
 * - TagExpenseInput - The input type for the tagExpense function.
 * - TagExpenseOutput - The return type for the tagExpense function (a single string).
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const TagExpenseInputSchema = z.object({
  description: z.string().describe('The description of the expense.'),
});
export type TagExpenseInput = z.infer<typeof TagExpenseInputSchema>;

const TagExpenseOutputSchema = z.string().describe('A single thematic category for the expense.');
export type TagExpenseOutput = z.infer<typeof TagExpenseOutputSchema>;

export async function tagExpense(input: TagExpenseInput): Promise<TagExpenseOutput> {
  console.log('[tagExpenseFlow] Input received:', input);
  return tagExpenseFlow(input);
}

const tagExpenseFlow = ai.defineFlow(
  {
    name: 'tagExpenseFlow',
    inputSchema: TagExpenseInputSchema,
    outputSchema: TagExpenseOutputSchema,
  },
  async (input: TagExpenseInput) => {
    console.log('[tagExpenseFlow] Starting categorization for:', input.description);

    try {
      // 1. Récupération de la clé API depuis Firestore
      let apiKey = process.env.OPENROUTER_API_KEY;
      try {
        const settingsDoc = await getDoc(doc(db, "settings", "openrouter"));
        if (settingsDoc.exists()) {
          apiKey = settingsDoc.data().apiKey || apiKey;
        }
      } catch (dbError: any) {
        console.error("[tagExpenseFlow] Erreur lors de la récupération de la clé dans Firestore:", dbError.message);
      }

      if (!apiKey) {
        console.warn("[tagExpenseFlow] Aucune clé API configurée. Repli sur 'Non catégorisé'.");
        return "Non catégorisé";
      }

      // 2. Préparation du prompt pour OpenRouter
      const prompt = `Tu es un assistant IA spécialisé dans la catégorisation des dépenses, et tu dois répondre en FRANÇAIS.
      Basé sur la description de la dépense fournie ci-dessous, génère une SEULE catégorie thématique, concise et pertinente.
      Exemples de catégories : Alimentation, Transport, Alcool, Restaurant, Divertissement, Hébergement, Bar, Produits d'entretien, Sport, Shopping, Utilitaires, Loyer, Voyage, Santé, Éducation, Cadeaux, Animaux, Non catégorisé.
      Sors UNIQUEMENT le nom de la catégorie sous forme de chaîne de caractères simple, sans formatage JSON ni texte supplémentaire.

      Description de la dépense : ${input.description}

      Catégorie suggérée :`;

      // 3. Appel à OpenRouter avec un modèle gratuit
      // Nous utilisons google/gemini-2.0-flash-exp:free qui est très performant et gratuit
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://sharepot.app",
          "X-Title": "SharePot"
        },
        body: JSON.stringify({
          "model": "google/gemini-2.0-flash-exp:free",
          "messages": [
            {
              "role": "user",
              "content": prompt
            }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[tagExpenseFlow] Erreur API OpenRouter:", errorText);
        return "Non catégorisé";
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content || content.trim() === '') {
        console.warn("[tagExpenseFlow] Réponse vide de l'IA.");
        return "Non catégorisé";
      }

      const suggestedCategory = content.trim();
      console.log('[tagExpenseFlow] Catégorie suggérée avec succès:', suggestedCategory);
      
      return suggestedCategory;

    } catch (error: any) {
      console.error("[tagExpenseFlow] Erreur globale lors de la suggestion:", error.message);
      return "Non catégorisé";
    }
  }
);
