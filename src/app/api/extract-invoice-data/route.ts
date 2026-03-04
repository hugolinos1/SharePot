import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const PROMPT_TEXT = `Extract technical financial data from this invoice image. 
Return ONLY a valid JSON object with the following keys:
- montant_total_ttc: (number or string with currency, e.g., 123.45 or "123.45 EUR")
- date_facture: (string in YYYY-MM-DD format)
- nom_client: (string)
- numero_facture: (string)
- nom_fournisseur: (string)

If a field is missing, use null. No preamble, no explanation. Just JSON.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { base64Image, fileType } = body;

    if (!base64Image) {
      return NextResponse.json({ error: 'Missing image data' }, { status: 400 });
    }

    // Fetch API Key from Firestore settings
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
      console.error("[OCR Route] Error fetching key from Firestore:", dbError.message);
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'Clé API OpenRouter non configurée. Veuillez la saisir dans les paramètres Admin.' }, { status: 500 });
    }

    console.log("[OCR Route] Calling OpenRouter with model: google/gemini-2.0-flash-lite-preview-02-05:free");

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
        "messages": [
          {
            "role": "user",
            "content": [
              {
                "type": "text",
                "text": PROMPT_TEXT
              },
              {
                "type": "image_url",
                "image_url": {
                  "url": base64Image
                }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[OCR Route] OpenRouter Error:", response.status, errorText);
      return NextResponse.json({ error: `Erreur API OpenRouter (${response.status}): ${errorText.substring(0, 100)}` }, { status: response.status });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: "Réponse vide de l'IA" }, { status: 500 });
    }

    // Extraction du JSON au cas où le modèle ajoute des blocs de code markdown
    let jsonStr = content.trim();
    if (jsonStr.includes('```json')) {
      jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
    } else if (jsonStr.includes('```')) {
      jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
    }

    try {
      const extractedData = JSON.parse(jsonStr);
      console.log("[OCR Route] Extraction réussie:", extractedData);
      return NextResponse.json(extractedData);
    } catch (parseError) {
      console.error("[Parse Error] Content was:", content);
      return NextResponse.json({ error: "Impossible de lire le format JSON de l'IA", raw: content }, { status: 500 });
    }

  } catch (error: any) {
    console.error("[OCR Route Error]", error);
    return NextResponse.json({ error: error.message || 'Erreur interne du serveur' }, { status: 500 });
  }
}