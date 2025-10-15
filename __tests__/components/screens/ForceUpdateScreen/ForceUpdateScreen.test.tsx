import { ForceUpdateScreen } from "components/screens/ForceUpdateScreen/ForceUpdateScreen";
import { renderWithProviders } from "helpers/testUtils";
import React from "react";
import { Alert } from "react-native";

// Mock the useAppTranslation hook
jest.mock("hooks/useAppTranslation", () => ({
  __esModule: true,
  default: () => ({
    t: (key: string) => key, // Return the key itself for testing
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

    // Check if all main text elements are present by translation keys
    expect(getByText("appUpdate.forceUpdate.title")).toBeTruthy();
    expect(getByText("appUpdate.forceUpdate.description1")).toBeTruthy();
    expect(getByText("appUpdate.forceUpdate.description2")).toBeTruthy();
  });

  it("renders without errors", () => {
    expect(() => renderForceUpdateScreen(defaultProps)).not.toThrow();
  });

  it("renders without onDismiss prop", () => {
    expect(() => renderForceUpdateScreen({})).not.toThrow();
  });
});
