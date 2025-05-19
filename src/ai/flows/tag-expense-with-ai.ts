
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
  // Updated prompt to ask for a single category string directly
  prompt: `You are an AI assistant specialized in categorizing expenses.
  Based on the description of the expense provided below, generate a single, concise,
  and relevant thematic category (e.g., Food, Transport, Entertainment, Restaurant, Groceries, Utilities, Rent, Travel, Shopping).
  Output ONLY the category name as a plain string, without any JSON formatting or extra text.

  Expense Description: {{{description}}}

  Suggested Category:`,
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
