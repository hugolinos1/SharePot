'use server';

/**
 * @fileOverview An AI agent that suggests a single thematic category for an expense based on its description.
 * It uses OpenRouter with Mistral Small 24B Instruct and the API key stored in Firestore settings.
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
          console.log("[tagExpenseFlow] API Key retrieved from Firestore.");
        } else {
          console.warn("[tagExpenseFlow] No settings doc found in Firestore at settings/openrouter");
        }
      } catch (dbError: any) {
        console.error("[tagExpenseFlow] Error fetching key from Firestore:", dbError.message);
      }

      if (!apiKey) {
        console.warn("[tagExpenseFlow] No API Key available.");
        return "Non catégorisé";
      }

      // 2. Préparation du prompt
      const prompt = `Tu es un expert en comptabilité. Analyse la description et renvoie UNIQUEMENT le nom de la catégorie parmi la liste : Alimentation, Restaurant & Café, Bar & Vie nocturne, Transport, Logement & Énergie, Culture & Loisirs, Sport, Shopping, Santé, Services & Abonnements, Cadeaux & Dons, Divers.
      
      Description : "${input.description}"
      Catégorie :`;

      console.log("[tagExpenseFlow] Calling OpenRouter...");

      // 3. Appel à OpenRouter
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://sharepot.app",
          "X-Title": "SharePot"
        },
        body: JSON.stringify({
          "model": "mistralai/mistral-small-24b-instruct-2501:free",
          "messages": [{ "role": "user", "content": prompt }],
          "temperature": 0.1,
          "max_tokens": 20
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[tagExpenseFlow] OpenRouter API Error:", response.status, errorText);
        return "Erreur API";
      }

      const data = await response.json();
      console.log("[tagExpenseFlow] OpenRouter Response Data:", JSON.stringify(data));
      
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        console.warn("[tagExpenseFlow] Empty response from AI.");
        return "Non catégorisé";
      }

      return content.trim().replace(/[".]/g, '');

    } catch (error: any) {
      console.error("[tagExpenseFlow] Global error:", error.message);
      return "Erreur système";
    }
  }
);
