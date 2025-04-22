'use server';

/**
 * @fileOverview An AI agent that suggests thematic tags for expenses based on their descriptions.
 *
 * - tagExpense - A function that handles the expense tagging process.
 * - TagExpenseInput - The input type for the tagExpense function.
 * - TagExpenseOutput - The return type for the tagExpense function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const TagExpenseInputSchema = z.object({
  description: z.string().describe('The description of the expense.'),
});
export type TagExpenseInput = z.infer<typeof TagExpenseInputSchema>;

const TagExpenseOutputSchema = z.object({
  tags: z.array(z.string()).describe('Suggested thematic tags for the expense.'),
});
export type TagExpenseOutput = z.infer<typeof TagExpenseOutputSchema>;

export async function tagExpense(input: TagExpenseInput): Promise<TagExpenseOutput> {
  return tagExpenseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'tagExpensePrompt',
  input: {
    schema: z.object({
      description: z.string().describe('The description of the expense.'),
    }),
  },
  output: {
    schema: z.object({
      tags: z.array(z.string()).describe('Suggested thematic tags for the expense.'),
    }),
  },
  prompt: `You are an AI assistant specialized in categorizing expenses.
  Based on the description of the expense provided by the user, you will generate
  a list of thematic tags that best describe the expense. The tags should be
  relevant and concise.

  Description: {{{description}}}

  Return a JSON array of strings representing the tags.
  `,
});

const tagExpenseFlow = ai.defineFlow<
  typeof TagExpenseInputSchema,
  typeof TagExpenseOutputSchema
>({
  name: 'tagExpenseFlow',
  inputSchema: TagExpenseInputSchema,
  outputSchema: TagExpenseOutputSchema,
},
async input => {
  const {output} = await prompt(input);
  return output!;
});
