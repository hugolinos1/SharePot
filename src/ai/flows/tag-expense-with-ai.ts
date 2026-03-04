'use server';

/**
 * @fileOverview An AI agent that suggests a single thematic category for an expense based on its description.
 * It uses OpenRouter with Gemini 2.0 Flash Lite (Free Tier) and the API key stored in Firestore settings.
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
          const storedKey = settingsDoc.data().apiKey;
          if (storedKey) {
            apiKey = storedKey.trim();
            console.log("[tagExpenseFlow] API Key retrieved and trimmed from Firestore.");
          }
        }
      } catch (dbError: any) {
        console.error("[tagExpenseFlow] Error fetching key from Firestore:", dbError.message);
      }

      if (!apiKey) {
        return "Erreur : Clé API manquante. Configurez-la dans l'onglet Admin.";
      }

      // 2. Préparation du prompt
      const prompt = `Tu es un expert en comptabilité. Analyse la description d'une dépense et renvoie UNIQUEMENT le nom de la catégorie la plus appropriée parmi la liste suivante : 
      Alimentation, Restaurant & Café, Bar & Vie nocturne, Transport, Logement & Énergie, Culture & Loisirs, Sport, Shopping, Santé, Services & Abonnements, Cadeaux & Dons, Divers.
      
      Instructions :
      - Si c'est un lieu culturel (musée, cinéma, théâtre, monument), choisis "Culture & Loisirs".
      - Si c'est un déplacement (essence, train, bus, parking, péage), choisis "Transport".
      - Renvoie uniquement le mot de la catégorie, sans ponctuation ni explication.

      Description : "${input.description}"
      Catégorie :`;

      // 3. Appel à OpenRouter avec Gemini 2.0 Flash Lite (Modèle gratuit stable)
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://sharepot.app",
          "X-Title": "SharePot"
        },
        body: JSON.stringify({
          "model": "google/gemini-2.0-flash-lite-preview-02-05:free",
          "messages": [{ "role": "user", "content": prompt }],
          "temperature": 0.1,
          "max_tokens": 20
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[tagExpenseFlow] OpenRouter API Error:", response.status, errorText);
        return `Erreur API (${response.status}) : ${errorText.substring(0, 100)}`;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        return "Erreur : Réponse vide de l'IA";
      }

      return content.trim().replace(/[".]/g, '');

    } catch (error: any) {
      console.error("[tagExpenseFlow] Global error:", error.message);
      return `Erreur système : ${error.message}`;
    }
  }
);