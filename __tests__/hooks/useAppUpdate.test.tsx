import { renderHook } from "@testing-library/react-native";
import { logger } from "config/logger";
import { isDev } from "helpers/isEnv";
import { getDeviceLanguage } from "helpers/localeUtils";
import { isVersionBelowLatest } from "helpers/versionComparison";
import { useAppUpdate } from "hooks/useAppUpdate";
import { Linking } from "react-native";

// Mock the dependencies
const mockUseRemoteConfigStore = jest.fn();
const mockUseDebugStore = jest.fn();
const mockUseAppTranslation = jest.fn();
const mockUseToast = jest.fn();

jest.mock("ducks/remoteConfig", () => ({
  useRemoteConfigStore: () => mockUseRemoteConfigStore(),
}));

jest.mock("ducks/debug", () => ({
  useDebugStore: () => mockUseDebugStore(),
}));

jest.mock("hooks/useAppTranslation", () => ({
  __esModule: true,
  default: () => mockUseAppTranslation(),
}));

jest.mock("providers/ToastProvider", () => ({
  useToast: () => mockUseToast(),
}));

jest.mock("react-native-device-info", () => ({
  getVersion: () => "1.6.23",
  getBundleId: () => "com.freighter.mobile",
}));

jest.mock("helpers/device", () => ({
  isIOS: false,
}));

jest.mock("helpers/isEnv", () => ({
  isDev: jest.fn(() => false),
}));

jest.mock("helpers/versionComparison", () => ({
  isVersionBelowLatest: jest.fn(),
}));

jest.mock("react-native", () => ({
  Linking: {
    openURL: jest.fn(),
  },
}));

jest.mock("config/logger", () => ({
  logger: {
    error: jest.fn(),
  },
}));

jest.mock("helpers/localeUtils", () => ({
  getDeviceLanguage: jest.fn(() => "en"),
}));

jest.mock("i18next", () => ({
  t: jest.fn((key: string) => key),
}));

describe("useAppUpdate", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Set up default mocks
    mockUseRemoteConfigStore.mockReturnValue({
      required_app_version: "1.6.23",
      latest_app_version: "1.6.24",
      app_update_text: {
        enabled: true,
        payload: {
          en: "Update available in English",
          pt: "Atualização disponível em Português",
        },
      },
      isInitialized: true,
    });

    mockUseDebugStore.mockReturnValue({
      overriddenAppVersion: null,
    });

    mockUseAppTranslation.mockReturnValue({
      t: (key: string) => key,
      i18n: {
        language: "en",
      },
    });

    mockUseToast.mockReturnValue({
      showToast: jest.fn(),
    });

    (isVersionBelowLatest as jest.Mock).mockImplementation(
      (current, latest) => current !== latest,
    );
    (Linking.openURL as jest.Mock).mockResolvedValue(undefined);
    (logger.error as jest.Mock).mockImplementation(() => {});
  });

  it("should return correct values when remote config is initialized", () => {
    const { result } = renderHook(() => useAppUpdate());

    expect(result.current.currentVersion).toBe("1.6.23");
    expect(result.current.requiredVersion).toBe("1.6.23");
    expect(result.current.latestVersion).toBe("1.6.24");
    expect(result.current.updateMessage).toBe("Update available in English");
    expect(result.current.needsForcedUpdate).toBe(true);
    expect(result.current.needsOptionalUpdate).toBe(false);
    expect(typeof result.current.openAppStore).toBe("function");
  });

  it("should return fallback message when update text is disabled", () => {
    mockUseRemoteConfigStore.mockReturnValue({
      required_app_version: "1.6.23",
      latest_app_version: "1.6.24",
      app_update_text: {
        enabled: false,
        payload: null,
      },
      isInitialized: true,
    });

    const { result } = renderHook(() => useAppUpdate());

    expect(result.current.updateMessage).toBe("appUpdate.defaultMessage");
  });

  it("should return fallback message when no payload is provided", () => {
    mockUseRemoteConfigStore.mockReturnValue({
      required_app_version: "1.6.23",
      latest_app_version: "1.6.24",
      app_update_text: {
        enabled: true,
        payload: null,
      },
      isInitialized: true,
    });

    const { result } = renderHook(() => useAppUpdate());

    expect(result.current.updateMessage).toBe("appUpdate.defaultMessage");
  });

  it("should use Portuguese text when language is pt", () => {
    // Mock getDeviceLanguage to return Portuguese
    (getDeviceLanguage as jest.Mock).mockReturnValue("pt");

    const { result } = renderHook(() => useAppUpdate());

    expect(result.current.updateMessage).toBe(
      "Atualização disponível em Português",
    );
  });

  it("should fallback to English when current language is not available", () => {
    // Mock getDeviceLanguage to return French (not available in payload)
    (getDeviceLanguage as jest.Mock).mockReturnValue("fr");

    const { result } = renderHook(() => useAppUpdate());

    expect(result.current.updateMessage).toBe("Update available in English");
  });

  it("should not show updates when remote config is not initialized", () => {
    mockUseRemoteConfigStore.mockReturnValue({
      required_app_version: "1.6.23",
      latest_app_version: "1.6.24",
      app_update_text: {
        enabled: true,
        payload: {
          en: "Update available",
        },
      },
      isInitialized: false,
    });

    const { result } = renderHook(() => useAppUpdate());

    expect(result.current.needsForcedUpdate).toBe(false);
    expect(result.current.needsOptionalUpdate).toBe(false);
  });

  it("should trigger forced update for protocol version changes", () => {
    // Test that protocol version changes trigger forced updates
    // Current: 1.6.23, Latest: 1.6.24 - should trigger forced update
    mockUseRemoteConfigStore.mockReturnValue({
      required_app_version: "1.6.23",
      latest_app_version: "1.6.24",
      app_update_text: {
        enabled: true,
        payload: {
          en: "Protocol update required",
        },
      },
      isInitialized: true,
    });

    // Mock version comparison to return true for different versions
    (isVersionBelowLatest as jest.Mock).mockReturnValue(true);

    const { result } = renderHook(() => useAppUpdate());

    expect(result.current.currentVersion).toBe("1.6.23");
    expect(result.current.latestVersion).toBe("1.6.24");
    expect(result.current.needsForcedUpdate).toBe(true);
    expect(result.current.needsOptionalUpdate).toBe(false);
    expect(result.current.updateMessage).toBe("Protocol update required");
  });

  it("should trigger forced update for minor version changes", () => {
    mockUseRemoteConfigStore.mockReturnValue({
      required_app_version: "1.6.23",
      latest_app_version: "1.7.0",
      app_update_text: {
        enabled: true,
        payload: {
          en: "Minor version update required",
        },
      },
      isInitialized: true,
    });

    // Mock version comparison to return true for different versions
    (isVersionBelowLatest as jest.Mock).mockReturnValue(true);

    const { result } = renderHook(() => useAppUpdate());

    expect(result.current.currentVersion).toBe("1.6.23");
    expect(result.current.latestVersion).toBe("1.7.0");
    expect(result.current.needsForcedUpdate).toBe(true);
    expect(result.current.needsOptionalUpdate).toBe(false);
    expect(result.current.updateMessage).toBe("Minor version update required");
  });

  it("should trigger forced update for major version changes", () => {
    // Test that major version changes also trigger forced updates
    // Current: 1.6.23, Latest: 2.0.0 - should trigger forced update
    mockUseRemoteConfigStore.mockReturnValue({
      required_app_version: "1.6.23",
      latest_app_version: "2.0.0",
      app_update_text: {
        enabled: true,
        payload: {
          en: "Major version update required",
        },
      },
      isInitialized: true,
    });

    // Mock version comparison to return true for different versions
    (isVersionBelowLatest as jest.Mock).mockReturnValue(true);

    const { result } = renderHook(() => useAppUpdate());

    expect(result.current.currentVersion).toBe("1.6.23");
    expect(result.current.latestVersion).toBe("2.0.0");
    expect(result.current.needsForcedUpdate).toBe(true);
    expect(result.current.needsOptionalUpdate).toBe(false);
    expect(result.current.updateMessage).toBe("Major version update required");
  });

  it("should not trigger update when versions are the same", () => {
    // Test that no update is triggered when current and latest versions are the same
    // Current: 1.6.23, Latest: 1.6.23 - should not trigger update
    mockUseRemoteConfigStore.mockReturnValue({
      required_app_version: "1.6.23",
      latest_app_version: "1.6.23",
      app_update_text: {
        enabled: true,
        payload: {
          en: "No update needed",
        },
      },
      isInitialized: true,
    });

    // Mock version comparison to return false for same versions
    (isVersionBelowLatest as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() => useAppUpdate());

    expect(result.current.currentVersion).toBe("1.6.23");
    expect(result.current.latestVersion).toBe("1.6.23");
    expect(result.current.needsForcedUpdate).toBe(false);
    expect(result.current.needsOptionalUpdate).toBe(false);
  });

  it("should use overridden version in dev mode", () => {
    mockUseDebugStore.mockReturnValue({
      overriddenAppVersion: "1.6.20",
    });

    // Mock isDev to return true for this test
    (isDev as unknown as jest.Mock).mockReturnValue(true);

    const { result } = renderHook(() => useAppUpdate());

    expect(result.current.currentVersion).toBe("1.6.20");
  });

  it("should call openAppStore correctly", async () => {
    const { result } = renderHook(() => useAppUpdate());

    await result.current.openAppStore();

    expect(Linking.openURL).toHaveBeenCalledWith(
      "https://play.google.com/store/apps/details?id=com.freighter.mobile",
    );
  });

  it("should handle openAppStore errors", async () => {
    const mockShowToast = jest.fn();
    mockUseToast.mockReturnValue({
      showToast: mockShowToast,
    });

    const error = new Error("Failed to open URL");
    (Linking.openURL as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useAppUpdate());

    await result.current.openAppStore();

    expect(logger.error).toHaveBeenCalledWith(
      "useAppUpdate",
      "Failed to open app store",
      error,
    );
    expect(mockShowToast).toHaveBeenCalledWith({
      variant: "error",
      title: "common.error",
      duration: 3000,
    });
  });
});
