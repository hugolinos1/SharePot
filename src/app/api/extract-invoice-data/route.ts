// src/app/api/extract-invoice-data/route.ts
import {NextRequest, NextResponse} from 'next/server';
import {GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, Part} from '@google/generative-ai';

// Helper function to convert buffer to gemini part
function fileToGenerativePart(base64Data: string, mimeType: string): Part {
  return {
    inlineData: {
      data: base64Data,
      mimeType,
    },
  };
}

const PROMPT_TEXT = `
Tu es un expert en extraction de données à partir de documents financiers, spécialisé dans les factures.
Je vais te fournir l'image d'une facture.
Ta tâche est d'extraire les informations suivantes de cette facture :
1.  Montant total TTC (incluant toutes les taxes, sous forme de nombre si possible, sinon chaîne)
2.  Date de la facture (au format AAAA-MM-JJ)
3.  Nom du client (la personne ou l'entreprise facturée)
4.  Numéro de facture
5.  Nom du fournisseur (l'entreprise qui a émis la facture)

Fournis la réponse exclusivement au format JSON suivant :
{
  "montant_total_ttc": "...",
  "date_facture": "AAAA-MM-JJ",
  "nom_client": "...",
  "numero_facture": "...",
  "nom_fournisseur": "..."
}

Si une information n'est pas clairement identifiable sur la facture, utilise la valeur \`null\` pour le champ correspondant dans le JSON. Ne fournis aucune explication ou texte supplémentaire en dehors de ce JSON.
Si le montant est clairement un nombre, essaie de le retourner comme un nombre, sinon comme une chaîne.
Si la facture contient une devise, essaie de l'identifier et de l'inclure dans le champ montant_total_ttc (ex: "123.45 EUR", "USD 50.00"). Si aucune devise n'est identifiable, ne l'ajoute pas.
`;

export async function POST(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({error: 'Method Not Allowed'}, {status: 405});
  }

  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    console.error('Gemini API key is missing from .env GOOGLE_GENAI_API_KEY');
    return NextResponse.json({error: 'Gemini API key is missing on the server'}, {status: 500});
  }

  let body;
  try {
    body = await req.json();
  } catch (error) {
    console.error('Error parsing request body:', error);
    return NextResponse.json({error: 'Invalid JSON in request body'}, {status: 400});
  }

  const {base64Image, fileType} = body;

  if (!base64Image || typeof base64Image !== 'string' || !base64Image.startsWith('data:')) {
    return NextResponse.json({error: 'Invalid or missing base64Image (must be a data URL)'}, {status: 400});
  }
  if (!fileType || typeof fileType !== 'string') {
    return NextResponse.json({error: 'Invalid or missing fileType'}, {status: 400});
  }

  const imageData = base64Image.split(',')[1];
  if (!imageData) {
    return NextResponse.json({error: 'Could not extract image data from base64 string'}, {status: 400});
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-pro-latest', // Ou un autre modèle supportant l'analyse d'image
      generationConfig: {
        temperature: 0.1, // Basse température pour des résultats plus déterministes
        responseMimeType: 'application/json', // Demander une réponse JSON
      },
      safetySettings: [ // Configurations de sécurité
        {category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE},
        {category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE},
        {category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE},
        {category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE},
      ],
    });

    const imagePart = fileToGenerativePart(imageData, fileType);
    const textPart: Part = { text: PROMPT_TEXT };
    const contents = [{role: 'user', parts: [textPart, imagePart]}];

    const result = await model.generateContent({contents});
    const geminiResponse = result.response;
    
    if (!geminiResponse || !geminiResponse.candidates || geminiResponse.candidates.length === 0 || !geminiResponse.candidates[0].content || !geminiResponse.candidates[0].content.parts || geminiResponse.candidates[0].content.parts.length === 0) {
      console.error('Réponse inattendue de Gemini ou structure de contenu manquante:', geminiResponse);
       if (geminiResponse && geminiResponse.promptFeedback) {
        console.error('Prompt Feedback:', geminiResponse.promptFeedback);
        return NextResponse.json({error: `Analyse bloquée ou réponse vide. Raison: ${geminiResponse.promptFeedback.blockReason || 'Inconnue'}`}, {status: 500});
      }
      return NextResponse.json({error: "Réponse inattendue, structure de contenu manquante ou vide de l'API Gemini."}, {status: 500});
    }

    const firstPart = geminiResponse.candidates[0].content.parts[0];
     if (!firstPart || !firstPart.text) {
         console.error('Partie de texte manquante dans la réponse de Gemini:', geminiResponse.candidates[0].content);
         return NextResponse.json({error: "Partie de texte manquante dans la réponse de Gemini."}, {status: 500});
    }
    const text = firstPart.text;


    try {
      const jsonData = JSON.parse(text || '{}'); // Fournir un fallback '{}'
      return NextResponse.json(jsonData, {status: 200});
    } catch (parseError) {
      console.error('Erreur de parsing JSON de la réponse Gemini:', parseError);
      console.error('Réponse brute de Gemini:', text); // Loggez la réponse brute pour le débogage
      return NextResponse.json({error: "La réponse de Gemini n'est pas un JSON valide.", rawResponse: text}, {status: 500});
    }

  } catch (error: any) {
    console.error("Erreur lors de l'appel à l'API Gemini via SDK:", error.message);
    if (error.stack) {
        console.error("Stack trace:", error.stack);
    }
    // Spécifiquement pour les erreurs liées à la réponse de l'API Gemini
    if (error.response && error.response.data) {
        console.error("Error response data from Gemini API:", error.response.data);
    }
    return NextResponse.json({error: `Erreur serveur lors de l'analyse: ${error.message || 'Erreur inconnue'}`}, {status: 500});
  }
}
