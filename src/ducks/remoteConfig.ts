import { logger } from "config/logger";
import { isAndroid } from "helpers/device";
import { Platform } from "react-native";
import { freighterBackendV2 } from "services/backend";
import { create } from "zustand";

interface FeatureFlagsData {
  swap_enabled: boolean;
  discover_enabled: boolean;
}

interface FeatureFlagsParams {
  platform: string;
}

interface RemoteConfigState {
  // Feature flags
  swap_enabled: boolean;
  discover_enabled: boolean;

  // Actions
  fetchFeatureFlags: () => Promise<void>;
}

const INITIAL_REMOTE_CONFIG_STATE = {
  swap_enabled: isAndroid,
  discover_enabled: isAndroid,
};

export const useRemoteConfigStore = create<RemoteConfigState>()((set, get) => ({
  ...INITIAL_REMOTE_CONFIG_STATE,

  fetchFeatureFlags: async () => {
    try {
      const params: FeatureFlagsParams = {
        platform: Platform.OS,
      };

      const response = await freighterBackendV2.get<FeatureFlagsData>(
        "/feature-flags",
        { params },
      );

      if (response.data) {
        const featureFlags: FeatureFlagsData = response.data;
        const currentState = get();
        const updates: Partial<RemoteConfigState> = {};

        // Loop through all keys in the response and update state if key exists
        Object.keys(featureFlags).forEach((key) => {
          if (key in currentState) {
            const typedKey = key as keyof FeatureFlagsData;
            const typedUpdates = updates as Record<string, unknown>;
            typedUpdates[key] = featureFlags[typedKey];
          }
        });

        set(updates);
      }
    } catch (error) {
      // Silently fail and keep current state
      logger.warn(
        "remoteConfig.fetchFeatureFlags",
        "Failed to fetch feature flags",
        error,
      );
    }
  },
}));
