
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
      const prompt = `Tu es un expert en comptabilité personnelle et gestion de budget, spécialisé dans la classification automatique des dépenses.
      
      TA MISSION :
      Analyser la description d'une dépense et retourner UNE SEULE catégorie thématique concise et pertinente.
      
      LISTE DE RÉFÉRENCE DES CATÉGORIES (Utilise celles-ci en priorité) :
      - Alimentation (Courses, Supermarché, Épicerie)
      - Restaurant & Café (Resto, Fast-food, Déjeuner, Dîner)
      - Bar & Vie nocturne (Bars, Pubs, Boîtes de nuit, Alcool)
      - Transport (Essence, Parking, Train, Avion, Uber, Bus, Péage)
      - Logement & Énergie (Loyer, Charges, Électricité, Assurances)
      - Culture & Loisirs (Musée, Cinéma, Concert, Théâtre, Activités touristiques, Billetterie)
      - Sport (Salle de sport, Équipement sportif, Match)
      - Shopping (Vêtements, Accessoires, Déco, High-tech)
      - Santé (Pharmacie, Médecin, Optique)
      - Services & Abonnements (Internet, Streaming, Téléphone, SaaS)
      - Cadeaux & Dons (Cadeaux, Charité)
      - Divers (Autres, Imprévus)

      CONSIGNES STRICTES :
      1. Réponds UNIQUEMENT par le nom de la catégorie (ex: "Culture & Loisirs").
      2. Pas de ponctuation à la fin, pas de phrases, pas de bloc de code Markdown.
      3. Si la description correspond à un lieu ou une institution (ex: "Musée de la mer"), déduis l'activité associée (dans ce cas : Culture & Loisirs).
      4. Si tu hésites vraiment, utilise la catégorie "Divers".
      5. La réponse doit être en FRANÇAIS.

      DESCRIPTION DE LA DÉPENSE : "${input.description}"

      CATÉGORIE :`;

      // 3. Appel à OpenRouter avec un modèle gratuit
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
