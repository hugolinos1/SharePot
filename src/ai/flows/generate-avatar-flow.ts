
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

// This flow does not need a dedicated prompt object, it directly calls ai.generate
const generateAvatarFlow = ai.defineFlow(
  {
    name: 'generateAvatarFlow',
    inputSchema: GenerateAvatarInputSchema,
    outputSchema: GenerateAvatarOutputSchema,
  },
  async (input: GenerateAvatarInput) => {
    try {
      const {media} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp', // Use the image-capable model
        prompt: `Generate a very small, funny, quirky, and abstract cartoon avatar suitable for a profile picture. Use the concept of "${input.seedText}" as very loose inspiration. The avatar should be simple, iconic, and not a literal representation. Ensure the background is transparent or a solid muted color. Make it fun!`,
        config: {
          responseModalities: ['IMAGE', 'TEXT'], // Must request IMAGE
           safetySettings: [ // Relax safety settings slightly if needed for creative avatars
            {category: 'HARM_CATEGORY_HARASSMENT', threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE},
            {category: 'HARM_CATEGORY_HATE_SPEECH', threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE},
            {category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE},
            {category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH}, // Be careful with this
          ],
        },
      });

      if (media && media.url) {
        return media.url; // This is the data URI, e.g., "data:image/png;base64,..."
      } else {
        console.warn('Avatar generation did not return media or media.url');
        // Fallback to a default placeholder or indicate failure
        return 'https://placehold.co/40x40.png?text=Error'; // Default placeholder on error
      }
    } catch (error) {
      console.error('Error generating avatar:', error);
      // Fallback to a default placeholder or indicate failure
      return 'https://placehold.co/40x40.png?text=Error'; // Default placeholder on error
    }
  }
);

// Helper for safety settings - not strictly needed for this flow as config is inline
enum HarmBlockThreshold {
  BLOCK_NONE = 'BLOCK_NONE',
  BLOCK_ONLY_HIGH = 'BLOCK_ONLY_HIGH',
  BLOCK_MEDIUM_AND_ABOVE = 'BLOCK_MEDIUM_AND_ABOVE',
  BLOCK_LOW_AND_ABOVE = 'BLOCK_LOW_AND_ABOVE',
}
enum HarmCategory {
    HARM_CATEGORY_HARASSMENT = "HARM_CATEGORY_HARASSMENT",
    HARM_CATEGORY_HATE_SPEECH = "HARM_CATEGORY_HATE_SPEECH",
    HARM_CATEGORY_SEXUALLY_EXPLICIT = "HARM_CATEGORY_SEXUALLY_EXPLICIT",
    HARM_CATEGORY_DANGEROUS_CONTENT = "HARM_CATEGORY_DANGEROUS_CONTENT",
}
