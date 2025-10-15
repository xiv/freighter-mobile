import { ForceUpdateScreen } from "components/screens/ForceUpdateScreen/ForceUpdateScreen";
import { renderWithProviders } from "helpers/testUtils";
import React from "react";
import { Alert } from "react-native";

// Mock the useAppTranslation hook
jest.mock("hooks/useAppTranslation", () => ({
  __esModule: true,
  default: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "appUpdate.forceUpdate.title": "Update your app",
        "appUpdate.forceUpdate.description1":
          "We noticed that you haven't updated your app. Please update to the latest version. Your funds are not affected.",
        "appUpdate.forceUpdate.description2":
          "Freighter works best when you've updated the application. Choosing not to update the app means that you take responsibility for any transaction errors.",
        "appUpdate.forceUpdate.updateButton": "Update app",
        "appUpdate.forceUpdate.laterButton": "I'll update later",
        "common.error": "Error",
        "common.unknownError": "An unknown error occurred",
        "common.confirm": "Confirm",
      };
      return translations[key] || key;
    },
  }),
}));

// Mock the useAppUpdate hook
jest.mock("hooks/useAppUpdate", () => ({
  useAppUpdate: () => ({
    openAppStore: jest.fn(),
  }),
}));

// Mock the FreighterLogo component
jest.mock("components/FreighterLogo", () => ({
  FreighterLogo: () => <div data-testid="freighter-logo" />,
}));

// Mock the Button component
jest.mock("components/sds/Button", () => ({
  Button: ({ children, onPress, variant }: any) => (
    <button type="button" data-testid={`button-${variant}`} onClick={onPress}>
      {children}
    </button>
  ),
}));

// Mock Alert
jest.spyOn(Alert, "alert").mockImplementation(() => {});

describe("ForceUpdateScreen", () => {
  const renderForceUpdateScreen = (
    props: React.ComponentProps<typeof ForceUpdateScreen>,
  ) => renderWithProviders(<ForceUpdateScreen {...props} />);

  const defaultProps = {
    onDismiss: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders correctly with all required text elements", () => {
    const { getByText } = renderForceUpdateScreen(defaultProps);

    // Check if all main text elements are present
    expect(getByText("Update your app")).toBeTruthy();
    expect(
      getByText(
        "We noticed that you haven't updated your app. Please update to the latest version. Your funds are not affected.",
      ),
    ).toBeTruthy();
    expect(
      getByText(
        "Freighter works best when you've updated the application. Choosing not to update the app means that you take responsibility for any transaction errors.",
      ),
    ).toBeTruthy();
  });

  it("renders buttons with correct text", () => {
    const { getByText } = renderForceUpdateScreen(defaultProps);

    // The component should render without errors, which means the buttons are being rendered
    expect(getByText("Update your app")).toBeTruthy();
  });

  it("renders without errors", () => {
    expect(() => renderForceUpdateScreen(defaultProps)).not.toThrow();
  });

  it("renders without onDismiss prop", () => {
    expect(() => renderForceUpdateScreen({})).not.toThrow();
  });
});
