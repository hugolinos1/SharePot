// src/services/currency-converter.ts
export interface CurrencyConversionResult {
  convertedAmountEUR: number | null;
  errorMessage?: string;
}

export async function convertToEur(
  amount: number,
  sourceCurrency: string
): Promise<CurrencyConversionResult> {
  console.log(`[convertToEur] Initiating conversion for ${amount} ${sourceCurrency} to EUR.`);
  if (sourceCurrency.toUpperCase() === 'EUR') {
    console.log('[convertToEur] Source currency is EUR, no conversion needed.');
    return { convertedAmountEUR: amount, errorMessage: undefined };
  }
  if (!amount || amount <= 0 || !sourceCurrency) {
    console.warn('[convertToEur] Invalid input for conversion:', { amount, sourceCurrency });
    return { convertedAmountEUR: null, errorMessage: "Montant ou devise source invalide." };
  }

  const apiUrl = `https://hexarate.paikama.co/api/rates/latest/${sourceCurrency.toUpperCase()}?target=EUR`;
  console.log(`[convertToEur] Calling API: ${apiUrl} (for original amount: ${amount})`);

  try {
    const response = await fetch(apiUrl);
    const responseStatus = response.status;
    const responseText = await response.text();
    
    console.log(`[convertToEur] API Response Status: ${responseStatus}`);
    console.log(`[convertToEur] API Raw Response Text: ${responseText}`);

    if (!response.ok) {
      let apiErrorMessage = `L'API de conversion a répondu avec le statut ${responseStatus}`;
      try {
        const errorJson = JSON.parse(responseText);
        if (errorJson && errorJson.error && errorJson.error.info) {
          apiErrorMessage = errorJson.error.info;
        } else if (errorJson && errorJson.error && errorJson.error.type) {
          apiErrorMessage = errorJson.error.type;
        } else if (errorJson && errorJson.message) { // Certains API peuvent retourner juste un message
          apiErrorMessage = errorJson.message;
        } else {
           apiErrorMessage = `${apiErrorMessage}. Réponse: ${responseText.substring(0, 200)}`;
        }
      } catch (e) {
        // responseText is not JSON or error in parsing
        apiErrorMessage = `${apiErrorMessage}. Réponse brute: ${responseText.substring(0, 200)}`;
      }
      console.error(`[convertToEur] API request failed: ${apiErrorMessage}`);
      return { convertedAmountEUR: null, errorMessage: apiErrorMessage };
    }

    const jsonData = JSON.parse(responseText);
    console.log('[convertToEur] API Parsed JSON Response:', jsonData);

    if (jsonData && jsonData.status_code === 200 && jsonData.data && typeof jsonData.data.mid === 'number') {
      const rate = jsonData.data.mid;
      const converted = amount * rate;
      console.log(`[convertToEur] Conversion successful: ${amount} ${sourceCurrency} @ ${rate} = ${converted.toFixed(4)} EUR`);
      // Utiliser toFixed(2) pour les montants finaux généralement
      return { convertedAmountEUR: parseFloat(converted.toFixed(2)), errorMessage: undefined };
    } else {
      let apiErrorMessage = 'L\'API n\'a pas retourné une conversion réussie ou un taux valide.';
      if (jsonData.error) {
        if (jsonData.error.info) apiErrorMessage = jsonData.error.info;
        else if (jsonData.error.type) apiErrorMessage = jsonData.error.type;
        else if (jsonData.error.code) apiErrorMessage = `Code d'erreur API: ${jsonData.error.code}`;
      }
      console.error('[convertToEur] API call did not return a successful conversion or valid result. API Error:', apiErrorMessage, "Full JSON Response:", JSON.stringify(jsonData));
      return { convertedAmountEUR: null, errorMessage: `Erreur API de conversion: ${apiErrorMessage}` };
    }
  } catch (error: any) {
    console.error('[convertToEur] Network or other error during currency conversion:', error.message, error);
    return { convertedAmountEUR: null, errorMessage: error.message || 'Erreur réseau pendant la conversion' };
  }
}
