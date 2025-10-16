import { useDebugStore } from "ducks/debug";
import { useRemoteConfigStore } from "ducks/remoteConfig";
import { isIOS } from "helpers/device";
import {
  isVersionBelowLatest,
  isVersionBelowRequired,
} from "helpers/versionComparison";
import useAppTranslation from "hooks/useAppTranslation";
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
  const {
    required_app_version: requiredAppVersion,
    latest_app_version: latestAppVersion,
    app_update_text: updateText,
  } = useRemoteConfigStore();
  const { overriddenAppVersion } = useDebugStore();

  // Use overridden version in DEV mode, otherwise use actual version
  const currentVersion =
    __DEV__ && overriddenAppVersion ? overriddenAppVersion : getVersion();

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
      isIOS
        ? IOS_APP_STORE_URL // iOS is using TestFlight for development builds - not able to generate a programatic link
        : ANDROID_APP_STORE_URL,
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
