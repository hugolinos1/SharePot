import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const PROMPT_TEXT = `Analyse cette image de facture et extrais les données techniques.
Renvoie UNIQUEMENT un objet JSON valide avec ces clés :
- montant_total_ttc: (nombre ou chaîne avec devise, ex: 123.45 ou "123.45 EUR")
- date_facture: (chaîne au format YYYY-MM-DD)
- nom_client: (chaîne)
- numero_facture: (chaîne)
- nom_fournisseur: (chaîne)

Si un champ est manquant, utilise null. Pas de texte avant ou après, juste le JSON.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { base64Image } = body;

    if (!base64Image) {
      return NextResponse.json({ error: 'Données image manquantes' }, { status: 400 });
    }

    // Récupération de la clé API depuis Firestore
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
      console.error("[OCR Route] Erreur Firestore:", dbError.message);
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'Clé API OpenRouter non configurée dans l\'onglet Admin.' }, { status: 500 });
    }

    // On utilise Qwen 2 VL pour l'analyse d'image car Qwen 3 (text-only) ne supporte pas la vision.
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://sharepot.app",
        "X-Title": "SharePot"
      },
      body: JSON.stringify({
        "model": "qwen/qwen-2-vl-7b-instruct:free",
        "messages": [
          {
            "role": "user",
            "content": [
              { "type": "text", "text": PROMPT_TEXT },
              { "type": "image_url", "image_url": { "url": base64Image } }
            ]
          }
        ]
      })
    });

    if (response.status === 429) {
      return NextResponse.json({ error: "L'IA est temporairement surchargée (Erreur 429). Veuillez patienter 10 secondes et réessayer." }, { status: 429 });
    }

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: `Erreur API (${response.status}): ${errorText.substring(0, 100)}` }, { status: response.status });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: "Réponse vide de l'IA" }, { status: 500 });
    }

    let jsonStr = content.trim();
    if (jsonStr.includes('```json')) {
      jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
    } else if (jsonStr.includes('```')) {
      jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
    }

    try {
      const extractedData = JSON.parse(jsonStr);
      return NextResponse.json(extractedData);
    } catch (parseError) {
      return NextResponse.json({ error: "Format JSON invalide reçu de l'IA", raw: content }, { status: 500 });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur interne' }, { status: 500 });
  }
}
