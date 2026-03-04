
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
    const settingsDoc = await getDoc(doc(db, "settings", "openrouter"));
    const apiKey = settingsDoc.exists() ? settingsDoc.data().apiKey : process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'OpenRouter API Key not configured. Please go to Admin settings.' }, { status: 500 });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": req.headers.get("referer") || "http://localhost:3000",
        "X-Title": "SharePot"
      },
      body: JSON.stringify({
        "model": "nvidia/nemotron-nano-12b-v2-vl:free",
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
                  "url": base64Image // base64Image should already be a data URL (data:image/...)
                }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[OpenRouter Error]", errorText);
      return NextResponse.json({ error: `API Error: ${response.statusText}` }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: "Empty response from AI model" }, { status: 500 });
    }

    // Try to extract JSON from the response content (models sometimes add markdown blocks)
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
      console.error("[Parse Error] Content was:", content);
      return NextResponse.json({ error: "Failed to parse AI response as JSON", raw: content }, { status: 500 });
    }

  } catch (error: any) {
    console.error("[OCR Route Error]", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
