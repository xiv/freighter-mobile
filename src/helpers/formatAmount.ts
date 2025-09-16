import BigNumber from "bignumber.js";
import { getOSLocale } from "helpers/getOsLanguage";

/**
 * Converts various input types to a BigNumber instance for consistent handling of numeric values
 *
 * @param {string | number | BigNumber | { toString: () => string }} value - The value to convert to BigNumber
 * @returns {BigNumber} A BigNumber instance representing the input value
 *
 * @example
 * convertToBigNumber(123); // Returns BigNumber(123)
 * convertToBigNumber("123.45"); // Returns BigNumber(123.45)
 * convertToBigNumber(new BigNumber("123.45")); // Returns the same BigNumber instance
 * convertToBigNumber({ toString: () => "123.45" }); // Returns BigNumber(123.45)
 */
const convertToBigNumber = (
  value: string | number | BigNumber | { toString: () => string },
): BigNumber => {
  if (typeof value === "number") {
    return new BigNumber(value);
  }

  if (value instanceof BigNumber) {
    return value;
  }

  return new BigNumber(value.toString());
};

/**
 * Formats a numeric value as a human-readable token amount with optional token code
 *
 * This function formats numbers with thousand separators and appropriate decimal places
 * for displaying token amounts in the UI. Uses the device's locale for consistent
 * decimal and thousands separators.
 *
 * @param {string | number | { toString: () => string }} amount - The amount to format
 * @param {string} [code] - Optional token code to append to the formatted amount
 * @param {string} [locale] - Optional locale override; uses device locale by default
 * @returns {string} Formatted token amount string with optional token code
 *
 * @example
 * formatTokenAmount(1234.56); // Returns "1,234.56" (en-US) or "1.234,56" (de-DE)
 * formatTokenAmount("1234.56789"); // Returns "1,234.56789" (en-US) or "1.234,56789" (de-DE)
 * formatTokenAmount(1234.56, "XLM"); // Returns "1,234.56 XLM" (en-US) or "1.234,56 XLM" (de-DE)
 */
export const formatTokenAmount = (
  amount: string | number | { toString: () => string },
  code?: string,
  locale?: string,
) => {
  const bnAmount = convertToBigNumber(amount);
  let deviceLocale = locale || getOSLocale();

  // Fallback to en-US if the locale is invalid
  try {
    // Test if the locale is valid by creating a formatter
    const testFormatter = new Intl.NumberFormat(deviceLocale);
    testFormatter.format(1); // Test that it works
  } catch (error) {
    deviceLocale = "en-US";
  }

  const formatter = new Intl.NumberFormat(deviceLocale, {
    useGrouping: true,
    minimumFractionDigits: 2, // Always show at least 2 decimal places
    maximumFractionDigits: 20, // Support high precision if needed
  });

  // Format the number and remove unnecessary trailing zeros
  const formattedAmount = formatter.format(bnAmount.toNumber());

  // Return the formatted amount with the token code if provided
  return code ? `${formattedAmount} ${code}` : formattedAmount;
};

/**
 * Formats a numeric value as a currency amount in USD
 *
 * This function formats numbers as USD currency values with the $ symbol,
 * thousand separators, and exactly 2 decimal places. Uses the device's locale
 * for consistent number formatting.
 *
 * @param {string | number | { toString: () => string }} amount - The amount to format as currency
 * @param {string} [locale] - Optional locale override; uses device locale by default
 * @returns {string} Formatted currency string (e.g., "$1,234.56" or "1.234,56 $")
 *
 * @example
 * formatFiatAmount(1234.56); // Returns "$1,234.56" (en-US) or "1.234,56 $" (de-DE)
 * formatFiatAmount("1234.5"); // Returns "$1,234.50" (en-US) or "1.234,50 $" (de-DE)
 * formatFiatAmount(0.1); // Returns "$0.10" (en-US) or "0,10 $" (de-DE)
 */
export const formatFiatAmount = (
  amount: string | number | { toString: () => string },
  locale?: string,
) => {
  // Convert input to a number
  const numericAmount =
    typeof amount === "number" ? amount : parseFloat(amount.toString());
  let deviceLocale = locale || getOSLocale();

  // Fallback to en-US if the locale is invalid
  try {
    // Test if the locale is valid by creating a formatter
    const testFormatter = new Intl.NumberFormat(deviceLocale);
    testFormatter.format(1); // Test that it works
  } catch (error) {
    deviceLocale = "en-US";
  }

  // Format as USD currency with 2 decimal places using device locale
  return new Intl.NumberFormat(deviceLocale, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
};

/**
 * Gets the decimal separator used by the device's locale
 *
 * @param {string} [locale] - Optional locale override; uses device locale by default
 * @returns {string} The decimal separator character ("." or ",")
 *
 * @example
 * getLocaleDecimalSeparator(); // Returns "." (en-US) or "," (de-DE)
 */
export const getLocaleDecimalSeparator = (locale?: string): string => {
  const deviceLocale = locale || getOSLocale();

  // Fallback to en-US if the locale is invalid
  try {
    const formatter = new Intl.NumberFormat(deviceLocale);
    const parts = formatter.formatToParts(1.1); // dummy value to get the decimal separator
    const decimalPart = parts.find((part) => part.type === "decimal");
    return decimalPart?.value || ".";
  } catch (error) {
    return "."; // Default to dot for en-US
  }
};

/**
 * Parses a numeric string that may use locale-specific decimal separators
 *
 * This function normalizes locale-specific decimal input (e.g., "1,23" or "1.23")
 * to a standard JavaScript number. It handles both comma and dot as decimal separators.
 *
 * @param {string} input - The numeric string to parse
 * @param {string} [locale] - Optional locale override; uses device locale by default
 * @returns {number} The parsed number
 *
 * @example
 * parseLocaleNumber("1,23"); // Returns 1.23 (handles comma decimal separator)
 * parseLocaleNumber("1.23"); // Returns 1.23 (handles dot decimal separator)
 * parseLocaleNumber("1,234.56"); // Returns 1234.56 (handles thousands separator)
 */
export const parseLocaleNumber = (input: string, locale?: string): number => {
  if (!input || input === "") return 0;

  const deviceLocale = locale || getOSLocale();

  try {
    const formatter = new Intl.NumberFormat(deviceLocale);
    const parts = formatter.formatToParts(12345.6);

    const thousandSeparator =
      parts.find((part) => part.type === "group")?.value || ",";
    const decimalSeparator =
      parts.find((part) => part.type === "decimal")?.value || ".";

    // Remove thousand separators and normalize decimal separator to dot
    const normalized = input
      .replace(new RegExp(`\\${thousandSeparator}`, "g"), "")
      .replace(new RegExp(`\\${decimalSeparator}`), ".");

    return parseFloat(normalized) || 0;
  } catch (error) {
    // Fallback: try to handle both comma and dot as decimal separators
    const normalized = input
      .replace(/,/g, ".") // Convert comma to dot
      .replace(/[^\d.-]/g, ""); // Remove any non-numeric characters except dot and minus

    return parseFloat(normalized) || 0;
  }
};

/**
 * Formats a constant number value with locale-aware decimal separators
 *
 * This function takes a constant like "0.00001" and formats it according to the user's locale.
 * Useful for displaying constants like MIN_TRANSACTION_FEE in the correct format.
 *
 * @param {string} constantValue - The constant value to format (e.g., "0.00001")
 * @param {string} [locale] - Optional locale override; uses device locale by default
 * @returns {string} Formatted constant with locale-appropriate decimal separator
 *
 * @example
 * formatConstantForLocale("0.00001"); // Returns "0.00001" (en-US) or "0,00001" (de-DE)
 * formatConstantForLocale("0.5", "pt-BR"); // Returns "0,5"
 */
export const formatConstantForLocale = (
  constantValue: string,
  locale?: string,
): string => {
  const deviceLocale = locale || getOSLocale();

  try {
    const numericValue = parseFloat(constantValue);
    if (Number.isNaN(numericValue)) {
      return constantValue; // Return original if not a valid number
    }

    const formatter = new Intl.NumberFormat(deviceLocale, {
      useGrouping: false, // Don't add thousands separators for constants
      minimumFractionDigits: 0,
      maximumFractionDigits: 20, // Support high precision
    });

    return formatter.format(numericValue);
  } catch (error) {
    // Fallback: manually replace dot with locale decimal separator
    const decimalSeparator = getLocaleDecimalSeparator(deviceLocale);
    return constantValue.replace(".", decimalSeparator);
  }
};

/**
 * Formats a numeric value as a percentage with sign indicator
 *
 * This function formats numbers with 2 decimal places and adds a percentage symbol.
 * Positive numbers are prefixed with a '+' sign, and negative numbers with a '-' sign.
 *
 * @param {string | number | { toString: () => string }} [amount] - The amount to format as percentage
 * @returns {string} Formatted percentage string with sign (e.g., "+1.23%" or "-1.23%")
 *
 * @example
 * formatPercentageAmount(1.23); // Returns "+1.23%"
 * formatPercentageAmount(-1.23); // Returns "-1.23%"
 * formatPercentageAmount(0); // Returns "0.00%"
 * formatPercentageAmount(); // Returns "0.00%"
 */
export const formatPercentageAmount = (
  amount?: string | number | { toString: () => string } | null,
): string => {
  if (amount === null || amount === undefined) {
    return "--";
  }

  const bnAmount = convertToBigNumber(amount);

  // Format the number with 2 decimal places
  const formattedNumber = bnAmount.toFixed(2);

  // Add the appropriate sign and percentage symbol
  if (bnAmount.gt(0)) {
    return `+${formattedNumber}%`;
  }

  // BigNumber already includes the negative sign in formattedNumber
  return `${formattedNumber}%`;
};

export const stroopToXlm = (
  stroops: BigNumber | string | number,
): BigNumber => {
  if (stroops instanceof BigNumber) {
    return stroops.dividedBy(1e7);
  }
  return new BigNumber(Number(stroops) / 1e7);
};

export const xlmToStroop = (lumens: BigNumber | string): BigNumber => {
  if (lumens instanceof BigNumber) {
    return lumens.times(1e7);
  }
  // round to nearest stroop
  return new BigNumber(Math.round(Number(lumens) * 1e7));
};
