import { useRemoteConfigStore } from "ducks/remoteConfig";
import {
  isVersionBelowLatest,
  isVersionBelowRequired,
} from "helpers/versionComparison";
import useAppTranslation from "hooks/useAppTranslation";
import { useCallback } from "react";
import { Linking, Platform } from "react-native";

/**
 * Hook to manage app update logic and UI state
 */
export const useAppUpdate = () => {
  const { t, i18n } = useAppTranslation();
  const {
    required_app_version: requiredAppVersion,
    latest_app_version: latestAppVersion,
    app_update_text: updateText,
  } = useRemoteConfigStore();

  const currentVersion = "1.3.23";

  // Parse the update text JSON for internationalization
  const updateMessage = (() => {
    if (!updateText.enabled || !updateText.payload) {
      return t("appUpdate.defaultMessage");
    }

    if (typeof updateText.payload === "object" && updateText.payload !== null) {
      const currentLanguage = i18n.language;
      const payload = updateText.payload as Record<string, string>;
      return (
        payload[currentLanguage] || payload.en || t("appUpdate.defaultMessage")
      );
    }

    return t("appUpdate.defaultMessage");
  })();

  // Check if app needs forced update (critical)
  const needsForcedUpdate = isVersionBelowRequired(
    currentVersion,
    requiredAppVersion,
  );

  // Check if app needs optional update (non-critical)
  const needsOptionalUpdate = isVersionBelowLatest(
    currentVersion,
    latestAppVersion,
  );

  // Get app store URLs based on platform
  const getAppStoreUrl = useCallback(
    () =>
      Platform.OS === "ios"
        ? "https://apps.apple.com/app/freighter/id1234567890"
        : "https://play.google.com/store/apps/details?id=com.freighter.mobile",
    [],
  );

  // Open app store for update
  const openAppStore = useCallback(async () => {
    try {
      const url = getAppStoreUrl();
      await Linking.openURL(url);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to open app store:", error);
    }
  }, [getAppStoreUrl]);

  return {
    currentVersion,
    requiredVersion: requiredAppVersion,
    latestVersion: latestAppVersion,
    updateMessage,
    needsForcedUpdate,
    needsOptionalUpdate,
    openAppStore,
  };
};
