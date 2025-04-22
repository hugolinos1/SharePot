/**
 * Represents the result of a currency conversion.
 */
export interface CurrencyConversionResult {
  /**
   * The converted amount in the target currency.
   */
  convertedAmount: number;
  /**
   * The target currency code.
   */
  targetCurrency: string;
}

/**
 * Asynchronously converts an amount from one currency to another.
 *
 * @param amount The amount to convert.
 * @param sourceCurrency The source currency code (e.g., 'CZK').
 * @param targetCurrency The target currency code (e.g., 'EUR').
 * @returns A promise that resolves to a CurrencyConversionResult object.
 */
export async function convertCurrency(
  amount: number,
  sourceCurrency: string,
  targetCurrency: string
): Promise<CurrencyConversionResult> {
  // TODO: Implement this by calling an API.

  return {
    convertedAmount: amount * 0.04,
    targetCurrency: targetCurrency,
  };
}
