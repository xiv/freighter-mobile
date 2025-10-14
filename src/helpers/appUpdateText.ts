import { i18n } from "i18next";

/**
 * Helper function to get app update text from payload or fallback to translations
 * @param appUpdateText - The app update text object with enabled and payload
 * @param i18nInstance - The i18n instance for language detection
 * @param t - Translation function for fallback
 * @returns The localized update text
 */
export const getAppUpdateText = (
  appUpdateText: {
    enabled: boolean;
    payload: Record<string, string> | undefined;
  },
  i18nInstance: i18n,
  t: (key: string) => string,
): string => {
  // If not enabled or no payload, use translation fallback
  if (!appUpdateText.enabled || !appUpdateText.payload) {
    return t("appUpdate.defaultMessage");
  }

  // Only handle object payloads with language keys
  if (
    typeof appUpdateText.payload === "object" &&
    appUpdateText.payload !== null
  ) {
    const currentLanguage = i18nInstance.language;

    // Try current language, then English, then fallback to translation
    return (
      appUpdateText.payload[currentLanguage] ||
      appUpdateText.payload.en ||
      t("appUpdate.defaultMessage")
    );
  }

  // If payload is not an object (e.g., simple string), ignore and use default
  return t("appUpdate.defaultMessage");
};
