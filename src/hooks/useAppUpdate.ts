import { logger } from "config/logger";
import { useDebugStore } from "ducks/debug";
import { useRemoteConfigStore } from "ducks/remoteConfig";
import { isIOS } from "helpers/device";
import { isDev } from "helpers/isEnv";
import {
  isVersionBelowLatest,
  isVersionBelowRequired,
} from "helpers/versionComparison";
import useAppTranslation from "hooks/useAppTranslation";
import { useToast } from "providers/ToastProvider";
import { useCallback } from "react";
import { Linking } from "react-native";
import { getBundleId, getVersion } from "react-native-device-info";

const IOS_BUNDLE_ID = "id6743947720";
const IOS_APP_STORE_URL = `https://apps.apple.com/app/freighter/${IOS_BUNDLE_ID}`;
const ANDROID_APP_STORE_URL = `https://play.google.com/store/apps/details?id=${getBundleId()}`;

/**
 * Hook to manage app update logic and UI state
 */
export const useAppUpdate = () => {
  const { t, i18n } = useAppTranslation();
  const { showToast } = useToast();
  const {
    required_app_version: requiredAppVersion,
    latest_app_version: latestAppVersion,
    app_update_text: updateText,
    isInitialized,
  } = useRemoteConfigStore();
  const { overriddenAppVersion } = useDebugStore();

  const currentVersion =
    isDev && overriddenAppVersion ? overriddenAppVersion : getVersion();

  // Parse the update text JSON for internationalization
  const getUpdateMessage = useCallback(() => {
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
  }, [updateText.enabled, updateText.payload, i18n.language, t]);

  const updateMessage = getUpdateMessage();

  // Only check for updates when remote config is initialized
  const needsForcedUpdate =
    isInitialized && isVersionBelowRequired(currentVersion, requiredAppVersion);

  const needsOptionalUpdate =
    isInitialized && isVersionBelowLatest(currentVersion, latestAppVersion);

  const getAppStoreUrl = useCallback(
    () =>
      isIOS
        ? IOS_APP_STORE_URL // iOS is using TestFlight for development builds - not able to generate a programatic link
        : ANDROID_APP_STORE_URL,
    [],
  );

  const openAppStore = useCallback(async () => {
    try {
      const url = getAppStoreUrl();
      await Linking.openURL(url);
    } catch (error) {
      logger.error("useAppUpdate", "Failed to open app store", error);
      showToast({
        variant: "error",
        title: t("common.error", {
          errorMessage:
            error instanceof Error ? error.message : t("common.unknownError"),
        }),
        duration: 3000,
      });
    }
  }, [getAppStoreUrl, showToast, t]);

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
