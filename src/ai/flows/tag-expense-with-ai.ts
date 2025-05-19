
'use server';

/**
 * @fileOverview An AI agent that suggests a single thematic category for an expense based on its description.
 *
 * - tagExpense - A function that handles the expense category suggestion.
 * - TagExpenseInput - The input type for the tagExpense function.
 * - TagExpenseOutput - The return type for the tagExpense function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const TagExpenseInputSchema = z.object({
  description: z.string().describe('The description of the expense.'),
});
export type TagExpenseInput = z.infer<typeof TagExpenseInputSchema>;

// The output is now a single category string directly, not an object.
const TagExpenseOutputSchema = z.string().describe('A single thematic category for the expense.');
export type TagExpenseOutput = TagExpenseOutputSchema; // z.infer is not needed for a direct Zod type

export async function tagExpense(input: TagExpenseInput): Promise<TagExpenseOutput> {
  console.log('[tagExpenseFlow] Input received:', input);
  return tagExpenseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'tagExpensePrompt',
  input: {
    schema: TagExpenseInputSchema, // Input remains an object with 'description'
  },
  output: {
    // The model should output a simple string, not a JSON object.
    // We will parse the text() from the model response directly.
    // No Zod schema is needed here if the model is instructed to return plain text.
  },
  // Updated prompt to ask for a single category string directly and include examples
  prompt: `Tu es un assistant IA spécialisé dans la catégorisation des dépenses, et tu dois répondre en FRANÇAIS.
  Basé sur la description de la dépense fournie ci-dessous, génère une SEULE catégorie thématique, concise et pertinente.
  Exemples de catégories : Alimentation, Transport, Alcool, Restaurant, Divertissement, Hébergement, Bar, Produits d'entretien, Sport, Shopping, Utilitaires, Loyer, Voyage, Santé, Éducation, Cadeaux, Animaux, Non catégorisé.
  Sors UNIQUEMENT le nom de la catégorie sous forme de chaîne de caractères simple, sans formatage JSON ni texte supplémentaire.

  Description de la dépense : {{{description}}}

  Catégorie suggérée :`,
});

const tagExpenseFlow = ai.defineFlow(
  {
    name: 'tagExpenseFlow',
    inputSchema: TagExpenseInputSchema,
    // Output is a plain string, matching TagExpenseOutputSchema
    outputSchema: TagExpenseOutputSchema,
  },
  async (input: TagExpenseInput) => {
    console.log('[tagExpenseFlow] Calling AI model with description:', input.description);
    const {text, usage} = await prompt(input); // Get the raw text response
    const modelOutput = text; // The model should return a plain string.
    
    console.log('[tagExpenseFlow] Raw model output (text):', modelOutput);
    console.log('[tagExpenseFlow] Usage:', usage);

    if (!modelOutput || modelOutput.trim() === '') {
      console.warn('[tagExpenseFlow] Model returned empty or whitespace string.');
      // Decide on a fallback, e.g., an empty string or a specific "Uncategorized"
      return "Non catégorisé"; 
    }
    
    // The output of the flow is now the direct string.
    // No need to access a 'category' property from an object.
    return modelOutput.trim();
  }
);

