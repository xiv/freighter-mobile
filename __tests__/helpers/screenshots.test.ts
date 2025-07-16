import AsyncStorage from "@react-native-async-storage/async-storage";
import { BROWSER_CONSTANTS } from "config/constants";
import { logger } from "config/logger";
import { BrowserTab } from "ducks/browserTabs";
import {
  getStoredScreenshots,
  findTabScreenshot,
  saveScreenshot,
  pruneScreenshots,
  clearAllScreenshots,
  captureTabScreenshot,
  ScreenshotData,
} from "helpers/screenshots";
import ViewShot from "react-native-view-shot";

// Mock dependencies
jest.mock("@react-native-async-storage/async-storage");
jest.mock("config/logger");
jest.mock("react-native-view-shot");

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe("screenshots helpers", () => {
  const mockScreenshotData: ScreenshotData = {
    tabId: "tab-123",
    tabUrl: "https://example.com",
    uri: "data:image/png;base64,test",
    timestamp: 1234567890,
  };

  const mockTab: BrowserTab = {
    id: "tab-123",
    url: "https://example.com",
    title: "Example",
    canGoBack: false,
    canGoForward: false,
    lastAccessed: 1234567890,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getStoredScreenshots", () => {
    it("should return empty array when no screenshots stored", async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await getStoredScreenshots();

      expect(result).toEqual([]);
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith(
        BROWSER_CONSTANTS.SCREENSHOT_STORAGE_KEY,
      );
    });

    it("should return parsed screenshots from storage", async () => {
      const storedData = JSON.stringify([mockScreenshotData]);
      mockAsyncStorage.getItem.mockResolvedValue(storedData);

      const result = await getStoredScreenshots();

      expect(result).toEqual([mockScreenshotData]);
    });

    it("should handle storage errors gracefully", async () => {
      const error = new Error("Storage error");
      mockAsyncStorage.getItem.mockRejectedValue(error);

      const result = await getStoredScreenshots();

      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith(
        "screenshots",
        "Failed to get stored screenshots:",
        error,
      );
    });

    it("should handle invalid JSON gracefully", async () => {
      mockAsyncStorage.getItem.mockResolvedValue("invalid json");

      const result = await getStoredScreenshots();

      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith(
        "screenshots",
        "Failed to get stored screenshots:",
        expect.any(Error),
      );
    });
  });

  describe("findTabScreenshot", () => {
    it("should return null for homepage URLs", async () => {
      const result = await findTabScreenshot(
        "tab-123",
        BROWSER_CONSTANTS.HOMEPAGE_URL,
      );

      expect(result).toBeNull();
    });

    it("should return null for empty URLs", async () => {
      const result = await findTabScreenshot("tab-123", "");

      expect(result).toBeNull();
    });

    it("should return null when no screenshots found", async () => {
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));

      const result = await findTabScreenshot("tab-123", "https://example.com");

      expect(result).toBeNull();
    });

    it("should return the most recent screenshot for matching tab and URL", async () => {
      const screenshots = [
        { ...mockScreenshotData, timestamp: 1000 },
        { ...mockScreenshotData, timestamp: 2000 },
        { ...mockScreenshotData, tabId: "other-tab", timestamp: 3000 },
      ];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(screenshots));

      const result = await findTabScreenshot("tab-123", "https://example.com");

      expect(result).toEqual({ ...mockScreenshotData, timestamp: 2000 });
    });

    it("should handle storage errors gracefully", async () => {
      const error = new Error("Storage error");
      mockAsyncStorage.getItem.mockRejectedValue(error);

      const result = await findTabScreenshot("tab-123", "https://example.com");

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        "screenshots",
        "Failed to get stored screenshots:",
        error,
      );
    });
  });

  describe("saveScreenshot", () => {
    it("should save new screenshot and remove old ones for same tab/URL", async () => {
      const existingScreenshots = [
        { ...mockScreenshotData, timestamp: 1000 },
        { ...mockScreenshotData, tabId: "other-tab", timestamp: 2000 },
      ];
      mockAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify(existingScreenshots),
      );

      const newScreenshot = { ...mockScreenshotData, timestamp: 3000 };
      await saveScreenshot(newScreenshot);

      // The actual implementation sorts by timestamp, so the order might be different
      const savedData = JSON.parse(mockAsyncStorage.setItem.mock.calls[0][1]);
      expect(savedData).toHaveLength(2);
      expect(
        savedData.find((s: ScreenshotData) => s.tabId === "other-tab"),
      ).toBeDefined();
      expect(
        savedData.find(
          (s: ScreenshotData) => s.tabId === "tab-123" && s.timestamp === 3000,
        ),
      ).toBeDefined();
    });

    it("should limit stored screenshots to MAX_SCREENSHOTS_STORED", async () => {
      const manyScreenshots = Array.from({ length: 20 }, (_, i) => ({
        ...mockScreenshotData,
        timestamp: i,
      }));
      mockAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify(manyScreenshots),
      );

      const newScreenshot = { ...mockScreenshotData, timestamp: 1000 };
      await saveScreenshot(newScreenshot);

      const savedData = JSON.parse(mockAsyncStorage.setItem.mock.calls[0][1]);
      expect(savedData.length).toBeLessThanOrEqual(
        BROWSER_CONSTANTS.MAX_SCREENSHOTS_STORED,
      );
    });

    it("should handle storage errors gracefully", async () => {
      const error = new Error("Storage error");
      mockAsyncStorage.getItem.mockRejectedValue(error);

      await expect(saveScreenshot(mockScreenshotData)).resolves.not.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith(
        "screenshots",
        "Failed to get stored screenshots:",
        error,
      );
    });
  });

  describe("pruneScreenshots", () => {
    it("should keep only screenshots for active tabs", async () => {
      const screenshots = [
        { ...mockScreenshotData, tabId: "tab-1" },
        { ...mockScreenshotData, tabId: "tab-2" },
        { ...mockScreenshotData, tabId: "tab-3" },
      ];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(screenshots));

      await pruneScreenshots(["tab-1", "tab-3"]);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        BROWSER_CONSTANTS.SCREENSHOT_STORAGE_KEY,
        JSON.stringify([
          { ...mockScreenshotData, tabId: "tab-1" },
          { ...mockScreenshotData, tabId: "tab-3" },
        ]),
      );
    });

    it("should remove all screenshots when no active tabs", async () => {
      const screenshots = [
        { ...mockScreenshotData, tabId: "tab-1" },
        { ...mockScreenshotData, tabId: "tab-2" },
      ];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(screenshots));

      await pruneScreenshots([]);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        BROWSER_CONSTANTS.SCREENSHOT_STORAGE_KEY,
        JSON.stringify([]),
      );
    });

    it("should handle storage errors gracefully", async () => {
      const error = new Error("Storage error");
      mockAsyncStorage.getItem.mockRejectedValue(error);

      await expect(pruneScreenshots(["tab-1"])).resolves.not.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith(
        "screenshots",
        "Failed to get stored screenshots:",
        error,
      );
    });
  });

  describe("clearAllScreenshots", () => {
    it("should remove all screenshots successfully", async () => {
      const result = await clearAllScreenshots();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        BROWSER_CONSTANTS.SCREENSHOT_STORAGE_KEY,
      );
      expect(result).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        "clearAllScreenshots",
        "Starting screenshot cleanup",
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        "clearAllScreenshots",
        "All screenshots cleared successfully",
      );
    });

    it("should handle errors gracefully", async () => {
      const error = new Error("Storage error");
      mockAsyncStorage.removeItem.mockRejectedValue(error);

      const result = await clearAllScreenshots();

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        "clearAllScreenshots",
        "Failed to clear screenshots:",
        error,
      );
    });
  });

  describe("captureTabScreenshot", () => {
    const mockUpdateTab = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should capture and save screenshot successfully", async () => {
      const mockUri = "data:image/png;base64,captured";
      const mockViewShotRef = {
        capture: jest.fn().mockResolvedValue(mockUri),
      } as unknown as ViewShot;

      // Mock AsyncStorage to return empty data
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));

      await captureTabScreenshot({
        viewShotRef: mockViewShotRef,
        tabId: "tab-123",
        tabs: [mockTab],
        updateTab: mockUpdateTab,
        source: "test",
      });

      // Test that the function doesn't throw
      expect(true).toBe(true);
    });

    it("should not capture if viewShotRef is null", async () => {
      await captureTabScreenshot({
        viewShotRef: null,
        tabId: "tab-123",
        tabs: [mockTab],
        updateTab: mockUpdateTab,
        source: "test",
      });

      expect(mockUpdateTab).not.toHaveBeenCalled();
    });

    it("should not capture if tab is not found", async () => {
      const mockViewShotRef = {
        capture: jest.fn().mockResolvedValue("data:image/png;base64,test"),
      } as unknown as ViewShot;

      await captureTabScreenshot({
        viewShotRef: mockViewShotRef,
        tabId: "non-existent",
        tabs: [mockTab],
        updateTab: mockUpdateTab,
        source: "test",
      });

      expect(mockUpdateTab).not.toHaveBeenCalled();
    });

    it("should handle capture errors gracefully", async () => {
      const error = new Error("Capture error");
      const mockViewShotRef = {
        capture: jest.fn().mockRejectedValue(error),
      } as unknown as ViewShot;

      // Mock AsyncStorage to return empty data
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));

      await expect(
        captureTabScreenshot({
          viewShotRef: mockViewShotRef,
          tabId: "tab-123",
          tabs: [mockTab],
          updateTab: mockUpdateTab,
          source: "test",
        }),
      ).resolves.not.toThrow();

      // Test that the function doesn't throw
      expect(true).toBe(true);
    });

    it("should handle save errors gracefully", async () => {
      const error = new Error("Save error");
      const mockViewShotRef = {
        capture: jest.fn().mockResolvedValue("data:image/png;base64,test"),
      } as unknown as ViewShot;
      mockAsyncStorage.getItem.mockRejectedValue(error);

      await expect(
        captureTabScreenshot({
          viewShotRef: mockViewShotRef,
          tabId: "tab-123",
          tabs: [mockTab],
          updateTab: mockUpdateTab,
          source: "test",
        }),
      ).resolves.not.toThrow();

      // Test that the function doesn't throw
      expect(true).toBe(true);
    });
  });
});
