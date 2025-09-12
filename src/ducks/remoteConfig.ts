import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "config/constants";
import { logger } from "config/logger";
import { isAndroid } from "helpers/device";
import { Platform } from "react-native";
import { freighterBackendV2 } from "services/backend";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

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
  // Cache metadata
  lastFetched?: number;

  // Actions
  fetchFeatureFlags: () => Promise<void>;
}

const INITIAL_REMOTE_CONFIG_STATE = {
  swap_enabled: isAndroid,
  discover_enabled: isAndroid,
  lastFetched: undefined,
};

// Cache duration: 1 hour in milliseconds
const CACHE_DURATION_MS = 60 * 60 * 1000;

export const useRemoteConfigStore = create<RemoteConfigState>()(
  persist(
    (set, get) => ({
      ...INITIAL_REMOTE_CONFIG_STATE,

      fetchFeatureFlags: async () => {
        const { lastFetched } = get();
        const now = Date.now();

        // Check if we have cached data that's still valid (less than 1 hour old)
        if (lastFetched && now - lastFetched < CACHE_DURATION_MS) {
          return; // Use cached data, no need to fetch
        }

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
            const updates: Partial<RemoteConfigState> = { lastFetched: now };

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
    }),
    {
      name: STORAGE_KEYS.REMOTE_CONFIG,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
