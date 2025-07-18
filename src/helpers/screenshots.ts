import AsyncStorage from "@react-native-async-storage/async-storage";
import { BROWSER_CONSTANTS } from "config/constants";
import { logger } from "config/logger";
import { BrowserTab } from "ducks/browserTabs";
import ViewShot from "react-native-view-shot";

/**
 * Helper function to get account-specific storage key
 * @param accountId - The account ID
 * @param keyPrefix - The storage key prefix
 * @returns The account-specific storage key
 */
const getAccountStorageKey = (accountId: string, keyPrefix: string): string => {
  return `${keyPrefix}${accountId}`;
};

/**
 * Represents a screenshot associated with a browser tab.
 * @property tabId - The ID of the tab
 * @property tabUrl - The URL of the tab
 * @property uri - Base64 image data URI
 * @property timestamp - When the screenshot was taken
 */
export interface ScreenshotData {
  tabId: string;
  tabUrl: string;
  uri: string; // base64 image data URI
  timestamp: number;
}

/**
 * Retrieves all stored screenshots from persistent storage as a Map for O(1) lookups.
 * @param accountId - The account ID for account-specific storage
 * @returns Promise<Map<string, ScreenshotData>> - Map of tabId to screenshot data
 */
export const getStoredScreenshots = async (
  accountId: string,
): Promise<Map<string, ScreenshotData>> => {
  try {
    const storageKey = getAccountStorageKey(
      accountId,
      BROWSER_CONSTANTS.SCREENSHOT_STORAGE_KEY_PREFIX,
    );
    const data = await AsyncStorage.getItem(storageKey);
    if (!data) return new Map();

    const screenshotsMap = JSON.parse(data) as Record<string, ScreenshotData>;
    return new Map(Object.entries(screenshotsMap));
  } catch (error) {
    logger.error("screenshots", "Failed to get stored screenshots:", error);
    return new Map();
  }
};

/**
 * Finds screenshot for a given tab.
 * @param tabId - The ID of the tab
 * @param accountId - The account ID for account-specific storage
 * @returns Promise<ScreenshotData | null> - The screenshot data or null if not found
 */
export const findTabScreenshot = async (
  tabId: string,
  accountId: string,
): Promise<ScreenshotData | null> => {
  try {
    const screenshotsMap = await getStoredScreenshots(accountId);
    return screenshotsMap.get(tabId) || null;
  } catch (error) {
    logger.error("screenshots", "Failed to find tab screenshot:", error);
  }

  return null;
};

/**
 * Removes a specific screenshot from persistent storage.
 * @param tabId - The ID of the tab whose screenshot should be removed
 * @param accountId - The account ID for account-specific storage
 * @returns Promise<boolean> - True if removed successfully, false otherwise
 */
export const removeTabScreenshot = async (
  tabId: string,
  accountId: string,
): Promise<boolean> => {
  try {
    const screenshotsMap = await getStoredScreenshots(accountId);

    if (screenshotsMap.has(tabId)) {
      screenshotsMap.delete(tabId);

      const storageKey = getAccountStorageKey(
        accountId,
        BROWSER_CONSTANTS.SCREENSHOT_STORAGE_KEY_PREFIX,
      );
      await AsyncStorage.setItem(
        storageKey,
        JSON.stringify(Object.fromEntries(screenshotsMap)),
      );

      logger.debug(
        "removeTabScreenshot",
        `Screenshot removed for tab ${tabId}`,
      );
    }

    return true;
  } catch (error) {
    logger.error("removeTabScreenshot", "Failed to remove screenshot:", error);
    return false;
  }
};

/**
 * Saves a screenshot to persistent storage, keeping only the most recent ones.
 * @param screenshot - The screenshot data to save
 * @param accountId - The account ID for account-specific storage
 * @returns Promise<void>
 */
export const saveScreenshot = async (
  screenshot: ScreenshotData,
  accountId: string,
): Promise<void> => {
  try {
    const screenshotsMap = await getStoredScreenshots(accountId);

    // Add new screenshot (automatically replaces old one for same tabId)
    screenshotsMap.set(screenshot.tabId, screenshot);

    // Keep only the most recent screenshots to prevent storage bloat
    let limitedScreenshotsMap = screenshotsMap;
    if (screenshotsMap.size > BROWSER_CONSTANTS.MAX_SCREENSHOTS_STORED) {
      const sortedScreenshots = Array.from(screenshotsMap.values())
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, BROWSER_CONSTANTS.MAX_SCREENSHOTS_STORED);

      // Convert back to Map and store as object
      limitedScreenshotsMap = new Map(
        sortedScreenshots.map((scrshot) => [scrshot.tabId, scrshot]),
      );
    }

    const storageKey = getAccountStorageKey(
      accountId,
      BROWSER_CONSTANTS.SCREENSHOT_STORAGE_KEY_PREFIX,
    );
    await AsyncStorage.setItem(
      storageKey,
      JSON.stringify(Object.fromEntries(limitedScreenshotsMap)),
    );
  } catch (error) {
    logger.error("screenshots", "Failed to save screenshot:", error);
  }
};

/**
 * Clears all screenshots from persistent storage.
 * @param accountId - The account ID for account-specific storage
 * @returns Promise<boolean> - True if cleared successfully, false otherwise
 */
export const clearAllScreenshots = async (accountId: string): Promise<boolean> => {
  try {
    logger.debug("clearAllScreenshots", "Starting screenshot cleanup");
    const storageKey = getAccountStorageKey(
      accountId,
      BROWSER_CONSTANTS.SCREENSHOT_STORAGE_KEY_PREFIX,
    );
    await AsyncStorage.removeItem(storageKey);
    logger.debug("clearAllScreenshots", "All screenshots cleared successfully");
    return true;
  } catch (error) {
    logger.error("clearAllScreenshots", "Failed to clear screenshots:", error);
    return false;
  }
};

/**
 * Removes screenshots for tabs that are no longer active.
 * @param activeTabIds - Array of currently active tab IDs
 * @param accountId - The account ID for account-specific storage
 * @returns Promise<void>
 */
export const pruneScreenshots = async (
  activeTabIds: string[],
  accountId: string,
): Promise<void> => {
  try {
    if (activeTabIds.length === 0) {
      await clearAllScreenshots(accountId);
      return;
    }

    const screenshotsMap = await getStoredScreenshots(accountId);
    const activeTabIdsSet = new Set(activeTabIds);

    // Keep only screenshots for active tabs
    const screenshotsToKeep = Array.from(screenshotsMap.values()).filter(
      (screenshot) => activeTabIdsSet.has(screenshot.tabId),
    );

    // Convert to Map and store as object
    const filteredScreenshotsMap = new Map(
      screenshotsToKeep.map((screenshot) => [screenshot.tabId, screenshot]),
    );

    const storageKey = getAccountStorageKey(
      accountId,
      BROWSER_CONSTANTS.SCREENSHOT_STORAGE_KEY_PREFIX,
    );
    await AsyncStorage.setItem(
      storageKey,
      JSON.stringify(Object.fromEntries(filteredScreenshotsMap)),
    );
  } catch (error) {
    logger.error("screenshots", "Failed to prune screenshots:", error);
  }
};

/**
 * Parameters for capturing a screenshot of a tab.
 * @property viewShotRef - Reference to the ViewShot component
 * @property tabId - The ID of the tab
 * @property tabs - Array of all browser tabs
 * @property updateTab - Function to update a tab's properties
 * @property source - Used for logging
 * @property accountId - The account ID for account-specific storage
 */
export interface CaptureScreenshotParams {
  viewShotRef: ViewShot | null;
  tabId: string;
  tabs: BrowserTab[];
  updateTab: (tabId: string, updates: Partial<BrowserTab>) => void;
  source: string; // used for logging
  accountId: string;
}

/**
 * Captures a screenshot of a tab and saves it to persistent storage.
 * @param params - CaptureScreenshotParams object
 * @returns Promise<void>
 */
export const captureTabScreenshot = async ({
  viewShotRef,
  tabId,
  tabs,
  updateTab,
  source,
  accountId,
}: CaptureScreenshotParams): Promise<void> => {
  logger.debug(source, "attempting to capture screenshot for tabId:", tabId);

  try {
    if (viewShotRef?.capture) {
      const uri = await viewShotRef.capture();

      // Save to persistent storage
      const tab = tabs.find((t) => t.id === tabId);
      if (tab) {
        const screenshotData: ScreenshotData = {
          tabId,
          timestamp: Date.now(),
          uri,
          tabUrl: tab.url,
        };

        await saveScreenshot(screenshotData, accountId);
        updateTab(tabId, { screenshot: uri });

        logger.debug(source, `Screenshot captured for tab ${tabId}`);
      }
    }
  } catch (error) {
    logger.error(source, "Failed to capture screenshot:", error);
  }
};
