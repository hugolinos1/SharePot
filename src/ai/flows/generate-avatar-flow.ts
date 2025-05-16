
'use server';
/**
 * @fileOverview A Genkit flow to generate a funny avatar image.
 *
 * - generateAvatar - A function that generates an avatar image.
 * - GenerateAvatarInput - The input type for the generateAvatar function.
 * - GenerateAvatarOutput - The return type for the generateAvatar function (data URI of the image).
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const GenerateAvatarInputSchema = z.object({
  seedText: z.string().describe('A seed text, like a user name or email, to inspire the avatar generation.'),
});
export type GenerateAvatarInput = z.infer<typeof GenerateAvatarInputSchema>;

// Output will be a string (data URI)
const GenerateAvatarOutputSchema = z.string().describe('The generated avatar image as a data URI.');
export type GenerateAvatarOutput = z.infer<typeof GenerateAvatarOutputSchema>;

export async function generateAvatar(input: GenerateAvatarInput): Promise<GenerateAvatarOutput> {
  return generateAvatarFlow(input);
}

const generateAvatarFlow = ai.defineFlow(
  {
    name: 'generateAvatarFlow',
    inputSchema: GenerateAvatarInputSchema,
    outputSchema: GenerateAvatarOutputSchema,
  },
  async (input: GenerateAvatarInput) => {
    const promptText = `Generate a very small, funny, quirky, and abstract cartoon avatar suitable for a profile picture. Use the concept of "${input.seedText}" as very loose inspiration. The avatar should be simple, iconic, and not a literal representation. Ensure the background is transparent or a solid muted color. Make it fun! Output only the image.`;
    console.log('[generateAvatarFlow] Attempting to generate avatar with prompt seed:', input.seedText);
    console.log('[generateAvatarFlow] Full prompt for model:', promptText);

    try {
      const {media} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp', // Use the image-capable model
        prompt: promptText,
        config: {
          responseModalities: ['IMAGE', 'TEXT'], // Must request IMAGE
           safetySettings: [ 
            {category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE'},
            {category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE'},
            {category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE'},
            {category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH'},
          ],
        },
      });

      if (media && media.url) {
        console.log('[generateAvatarFlow] Avatar generated successfully for seed:', input.seedText, 'URL starts with:', media.url.substring(0, 50) + '...');
        return media.url; // This is the data URI, e.g., "data:image/png;base64,..."
      } else {
        console.warn('[generateAvatarFlow] Avatar generation did not return media or media.url for seed:', input.seedText);
        return 'https://placehold.co/40x40.png?text=GenFail'; // More distinct placeholder
      }
    } catch (error) {
      console.error('[generateAvatarFlow] Error generating avatar for seed:', input.seedText, error);
      return 'https://placehold.co/40x40.png?text=GenError'; // More distinct placeholder
    }
  }
);
