import AsyncStorage from "@react-native-async-storage/async-storage";
import { BROWSER_CONSTANTS } from "config/constants";
import { logger } from "config/logger";
import { BrowserTab } from "ducks/browserTabs";
import ViewShot from "react-native-view-shot";

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
 * Retrieves all stored screenshots from persistent storage.
 * @returns Promise<ScreenshotData[]> - Array of stored screenshots
 */
export const getStoredScreenshots = async (): Promise<ScreenshotData[]> => {
  try {
    const data = await AsyncStorage.getItem(
      BROWSER_CONSTANTS.SCREENSHOT_STORAGE_KEY,
    );
    return data ? (JSON.parse(data) as ScreenshotData[]) : [];
  } catch (error) {
    logger.error("screenshots", "Failed to get stored screenshots:", error);
    return [];
  }
};

/**
 * Finds the most recent screenshot for a given tab and URL.
 * @param tabId - The ID of the tab
 * @param tabUrl - (Optional) The URL of the tab
 * @returns Promise<ScreenshotData | null> - The screenshot data or null if not found
 */
export const findTabScreenshot = async (
  tabId: string,
  tabUrl?: string,
): Promise<ScreenshotData | null> => {
  if (!tabUrl || tabUrl === BROWSER_CONSTANTS.HOMEPAGE_URL) return null;

  try {
    const screenshots = await getStoredScreenshots();
    const matchingScreenshots = screenshots.filter(
      (screenshot) => screenshot.tabId === tabId,
    );
    const screenshotsWithMatchingUrl = matchingScreenshots.filter(
      (screenshot) => screenshot.tabUrl === tabUrl,
    );

    if (screenshotsWithMatchingUrl.length > 0) {
      // Return the most recent screenshot
      return screenshotsWithMatchingUrl.reduce((a, b) =>
        a.timestamp > b.timestamp ? a : b,
      );
    }
  } catch (error) {
    logger.error("screenshots", "Failed to find tab screenshot:", error);
  }

  return null;
};

/**
 * Saves a screenshot to persistent storage, keeping only the most recent ones.
 * @param screenshot - The screenshot data to save
 * @returns Promise<void>
 */
export const saveScreenshot = async (
  screenshot: ScreenshotData,
): Promise<void> => {
  try {
    const screenshots = await getStoredScreenshots();

    // Remove old screenshots for the same tab and URL
    const filteredScreenshots = screenshots.filter(
      (s) => !(s.tabId === screenshot.tabId && s.tabUrl === screenshot.tabUrl),
    );

    // Add new screenshot
    const updatedScreenshots = [...filteredScreenshots, screenshot];

    // Keep only the most recent screenshots to prevent storage bloat
    const sortedScreenshots = updatedScreenshots
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, BROWSER_CONSTANTS.MAX_SCREENSHOTS_STORED);

    await AsyncStorage.setItem(
      BROWSER_CONSTANTS.SCREENSHOT_STORAGE_KEY,
      JSON.stringify(sortedScreenshots),
    );
  } catch (error) {
    logger.error("screenshots", "Failed to save screenshot:", error);
  }
};

/**
 * Removes screenshots for tabs that are no longer active.
 * @param activeTabIds - Array of currently active tab IDs
 * @returns Promise<void>
 */
export const pruneScreenshots = async (
  activeTabIds: string[],
): Promise<void> => {
  try {
    const screenshots = await getStoredScreenshots();
    const activeTabIdsSet = new Set(activeTabIds);

    // Keep only screenshots for active tabs
    const screenshotsToKeep = screenshots.filter((screenshot) =>
      activeTabIdsSet.has(screenshot.tabId),
    );

    await AsyncStorage.setItem(
      BROWSER_CONSTANTS.SCREENSHOT_STORAGE_KEY,
      JSON.stringify(screenshotsToKeep),
    );
  } catch (error) {
    logger.error("screenshots", "Failed to prune screenshots:", error);
  }
};

/**
 * Clears all screenshots from persistent storage.
 * @returns Promise<boolean> - True if cleared successfully, false otherwise
 */
export const clearAllScreenshots = async (): Promise<boolean> => {
  try {
    logger.info("clearAllScreenshots", "Starting screenshot cleanup");
    await AsyncStorage.removeItem(BROWSER_CONSTANTS.SCREENSHOT_STORAGE_KEY);
    logger.info("clearAllScreenshots", "All screenshots cleared successfully");
    return true;
  } catch (error) {
    logger.error("clearAllScreenshots", "Failed to clear screenshots:", error);
    return false;
  }
};

/**
 * Parameters for capturing a screenshot of a tab.
 * @property viewShotRef - Reference to the ViewShot component
 * @property tabId - The ID of the tab
 * @property tabs - Array of all browser tabs
 * @property updateTab - Function to update a tab's properties
 * @property source - Used for logging
 */
export interface CaptureScreenshotParams {
  viewShotRef: ViewShot | null;
  tabId: string;
  tabs: BrowserTab[];
  updateTab: (tabId: string, updates: Partial<BrowserTab>) => void;
  source: string; // used for logging
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

        await saveScreenshot(screenshotData);
        updateTab(tabId, { screenshot: uri });

        logger.debug(source, `Screenshot captured for tab ${tabId}`);
      }
    }
  } catch (error) {
    logger.error(source, "Failed to capture screenshot:", error);
  }
};
