
'use server';

/**
 * @fileOverview Un agent IA qui suggère une catégorie thématique pour une dépense.
 * Utilise OpenRouter avec le nouveau modèle Gemini 2.5 Flash pour une performance optimale.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const TagExpenseInputSchema = z.object({
  description: z.string().describe('La description de la dépense.'),
});
export type TagExpenseInput = z.infer<typeof TagExpenseInputSchema>;

const TagExpenseOutputSchema = z.string().describe('Une catégorie thématique unique pour la dépense.');
export type TagExpenseOutput = z.infer<typeof TagExpenseOutputSchema>;

export async function tagExpense(input: TagExpenseInput): Promise<TagExpenseOutput> {
  console.log('[tagExpenseFlow] Entrée reçue:', input);
  return tagExpenseFlow(input);
}

const tagExpenseFlow = ai.defineFlow(
  {
    name: 'tagExpenseFlow',
    inputSchema: TagExpenseInputSchema,
    outputSchema: TagExpenseOutputSchema,
  },
  async (input: TagExpenseInput) => {
    console.log('[tagExpenseFlow] Début de catégorisation pour:', input.description);

    try {
      let apiKey = process.env.OPENROUTER_API_KEY;
      try {
        const settingsDoc = await getDoc(doc(db, "settings", "openrouter"));
        if (settingsDoc.exists()) {
          const storedKey = settingsDoc.data().apiKey;
          if (storedKey) {
            apiKey = storedKey.trim();
          }
        }
      } catch (dbError: any) {
        console.error("[tagExpenseFlow] Erreur Firestore:", dbError.message);
      }

      if (!apiKey) {
        return "Erreur : Clé API manquante. Configurez-la dans l'onglet Admin.";
      }

      const prompt = `Tu es un expert comptable français. Analyse la description d'une dépense et renvoie UNIQUEMENT le nom de la catégorie la plus appropriée.
      
      LISTE DES CATÉGORIES AUTORISÉES :
      - Alimentation (Courses, supermarché)
      - Restaurant & Café (Sorties, repas, café)
      - Bar & Vie nocturne (Boissons, soirées)
      - Transport (Train, Uber, Essence, Parking, Bus)
      - Logement & Énergie (Loyer, Airbnb, Hôtel, Électricité)
      - Culture & Loisirs (Musée, Cinéma, Concert, Monument, Activité)
      - Sport (Salle de sport, équipement)
      - Shopping (Vêtements, électronique)
      - Santé (Pharmacie, médecin)
      - Services & Abonnements (Netflix, Internet, logiciel)
      - Cadeaux & Dons
      - Divers (Si rien d'autre ne correspond)

      RÈGLES :
      - Si c'est un musée ou une visite culturelle, choisis "Culture & Loisirs".
      - Réponds UNIQUEMENT avec le nom de la catégorie exacte.
      - Pas de phrase, pas de ponctuation.

      Description : "${input.description}"
      Catégorie :`;

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://sharepot.app",
          "X-Title": "SharePot"
        },
        body: JSON.stringify({
          "model": "google/gemini-2.5-flash",
          "messages": [{ "role": "user", "content": prompt }],
          "temperature": 0.1,
          "max_tokens": 20
        })
      });

      if (response.status === 429) {
        return "Erreur 429 : L'IA est saturée. Réessayez dans 10 secondes.";
      }

      if (!response.ok) {
        const errorText = await response.text();
        return `Erreur API (${response.status}) : ${errorText.substring(0, 50)}`;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        return "Erreur : Réponse vide de l'IA";
      }

      return content.trim().replace(/[".]/g, '');

    } catch (error: any) {
      console.error("[tagExpenseFlow] Erreur globale:", error.message);
      return `Erreur système : ${error.message}`;
    }
  }
);
