import Spinner from "components/Spinner";
import { DiscoveryHomepage } from "components/screens/DiscoveryScreen/components";
import { TabWebView } from "components/screens/DiscoveryScreen/components/TabWebView";
import { APP_VERSION, BROWSER_CONSTANTS } from "config/constants";
import { logger } from "config/logger";
import { useBrowserTabsStore } from "ducks/browserTabs";
import { isHomepageUrl } from "helpers/browser";
import { captureTabScreenshot } from "helpers/screenshots";
import useColors from "hooks/useColors";
import React, { useRef, useCallback, useEffect, useState } from "react";
import { View, Animated } from "react-native";
import ViewShot from "react-native-view-shot";
import { WebView, WebViewNavigation } from "react-native-webview";

interface WebViewContainerProps {
  onNavigationStateChange: (navState: WebViewNavigation) => void;
  onShouldStartLoadWithRequest: (request: WebViewNavigation) => boolean;
}

// Memoize to avoid unnecessary expensive re-renders
const WebViewContainer: React.FC<WebViewContainerProps> = React.memo(
  ({ onNavigationStateChange, onShouldStartLoadWithRequest }) => {
    const { tabs, isTabActive, updateTab, activeTabId } = useBrowserTabsStore();
    const { themeColors } = useColors();

    const [isLoading, setIsLoading] = useState(false);
    const fadeLoadingAnim = useRef(new Animated.Value(0)).current;

    // Refs to track ViewShot components for each tab
    const viewShotRefs = useRef<{ [tabId: string]: ViewShot | null }>({});
    const quickCaptureTimeouts = useRef<{ [tabId: string]: NodeJS.Timeout }>(
      {},
    );
    const finalCaptureTimeouts = useRef<{ [tabId: string]: NodeJS.Timeout }>(
      {},
    );
    const scrollCaptureTimeouts = useRef<{ [tabId: string]: NodeJS.Timeout }>(
      {},
    );

    /**
     * Clears WebView cache for a specific WebView instance without affecting cookies
     * @param webViewInstance - The WebView instance to clear cache for
     */
    const clearWebViewCache = useCallback((webViewInstance: WebView | null) => {
      if (!webViewInstance) return;

      try {
        webViewInstance.clearCache?.(false); // false = preserve cookies
      } catch (error) {
        logger.warn("WebViewContainer", "Failed to clear WebView cache", error);
      }
    }, []);

    // Show spinner when switching tabs - DISABLED for multi-WebView approach
    // useEffect(() => {
    //   if (!activeTabId) {
    //     return undefined;
    //   }

    //   // Show spinner immediately
    //   setIsLoading(true);
    //   fadeLoadingAnim.setValue(1);

    //   // Fade out after 500ms
    //   const timer = setTimeout(() => {
    //     Animated.timing(fadeLoadingAnim, {
    //       toValue: 0,
    //       duration: BROWSER_CONSTANTS.TAB_SWITCH_SPINNER_DURATION,
    //       useNativeDriver: true,
    //     }).start(() => {
    //       setIsLoading(false);
    //     });
    //   }, BROWSER_CONSTANTS.TAB_SWITCH_SPINNER_DELAY);

    //   return () => clearTimeout(timer);
    // }, [activeTabId, fadeLoadingAnim]);

    // Expose WebView refs to parent components via a global reference
    // This avoids store updates that cause re-renders
    useEffect(() => {
      // Store the webViewRefs in a global location accessible to browser actions
      (global as any).webViewRefs = webViewRefs.current;
    }, []);

    const captureScreenshot = useCallback(
      async (tabId: string) => {
        // Get current tabs and updateTab from store to avoid stale closures
        const currentTabs = useBrowserTabsStore.getState().tabs;
        const currentUpdateTab = useBrowserTabsStore.getState().updateTab;
        
        await captureTabScreenshot({
          viewShotRef: viewShotRefs.current[tabId],
          tabId,
          tabs: currentTabs,
          updateTab: currentUpdateTab,
          source: "WebViewContainer",
        });
      },
      [], // Empty dependency array to prevent re-renders
    );

    // Use refs to store WebView instances locally - no store updates to prevent re-renders
    const webViewRefs = useRef<{ [tabId: string]: WebView | null }>({});

    const handleScroll = useCallback(
      (tabId: string) => {
        // Clear any existing scroll capture timeout for this tab
        if (scrollCaptureTimeouts.current[tabId]) {
          clearTimeout(scrollCaptureTimeouts.current[tabId]);
        }

        // Capture screenshot after 1s of no-scrolling
        scrollCaptureTimeouts.current[tabId] = setTimeout(() => {
          captureScreenshot(tabId);
          delete scrollCaptureTimeouts.current[tabId];
        }, BROWSER_CONSTANTS.SCREENSHOT_SCROLL_DELAY);
      },
      [captureScreenshot],
    );

    const handleLoadEnd = useCallback(
      (tabId: string) => {
        logger.debug("WebViewContainer", "handleLoadEnd, tabId:", tabId);

        // Clear any existing timeouts for this tab
        if (quickCaptureTimeouts.current[tabId]) {
          clearTimeout(quickCaptureTimeouts.current[tabId]);
        }
        if (finalCaptureTimeouts.current[tabId]) {
          clearTimeout(finalCaptureTimeouts.current[tabId]);
        }

        // Quick screenshot for immediate preview (500ms)
        quickCaptureTimeouts.current[tabId] = setTimeout(() => {
          captureScreenshot(tabId);
          delete quickCaptureTimeouts.current[tabId];
        }, BROWSER_CONSTANTS.SCREENSHOT_ON_LOAD_DELAY);

        // Final screenshot after animations complete (2000ms)
        finalCaptureTimeouts.current[tabId] = setTimeout(() => {
          // Clear the quick timeout if it hasn't fired yet
          if (quickCaptureTimeouts.current[tabId]) {
            clearTimeout(quickCaptureTimeouts.current[tabId]);
            delete quickCaptureTimeouts.current[tabId];
          }
          // Capture final screenshot after animations should be complete
          captureScreenshot(tabId);
          delete finalCaptureTimeouts.current[tabId];
        }, BROWSER_CONSTANTS.SCREENSHOT_FINAL_DELAY);
      },
      [captureScreenshot],
    );

    // Cleanup timeouts when component unmounts
    useEffect(
      () => () => {
        Object.values(quickCaptureTimeouts.current).forEach((timeout) => {
          if (timeout) clearTimeout(timeout);
        });
        Object.values(finalCaptureTimeouts.current).forEach((timeout) => {
          if (timeout) clearTimeout(timeout);
        });
        Object.values(scrollCaptureTimeouts.current).forEach((timeout) => {
          if (timeout) clearTimeout(timeout);
        });
      },
      [],
    );

    // Clean up WebView refs for closed tabs
    useEffect(() => {
      const currentTabIds = tabs.map(tab => tab.id);
      Object.keys(webViewRefs.current).forEach(tabId => {
        if (!currentTabIds.includes(tabId)) {
          delete webViewRefs.current[tabId];
        }
      });
      Object.keys(viewShotRefs.current).forEach(tabId => {
        if (!currentTabIds.includes(tabId)) {
          delete viewShotRefs.current[tabId];
        }
      });
    }, [tabs]);

    return (
      <View className="flex-1">
        {tabs && tabs.length > 0 ? tabs.map((tab) => {
          const isActive = isTabActive(tab.id);

          return (
            <View key={tab.id} className="absolute inset-0">
              {isHomepageUrl(tab.url) ? (
                <DiscoveryHomepage tabId={tab.id} />
              ) : (
                <TabWebView
                  key={tab.id}
                  tabId={tab.id}
                  url={tab.url}
                  isActive={isActive}
                  onNavigationStateChange={onNavigationStateChange}
                  onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
                  onLoadEnd={handleLoadEnd}
                  onScroll={handleScroll}
                  onWebViewRef={(tabId, ref) => {
                    webViewRefs.current[tabId] = ref;
                    if (ref) {
                      clearWebViewCache(ref);
                    }
                  }}
                  onViewShotRef={(tabId, ref) => {
                    viewShotRefs.current[tabId] = ref;
                  }}
                />
              )}
            </View>
          );
        }) : null}

        {/* Loading spinner overlay for smoother tab transition */}
        {isLoading && (
          <Animated.View
            className="absolute inset-0 justify-center items-center z-[50] pointer-events-none"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.3)",
              opacity: fadeLoadingAnim,
            }}
          >
            <Spinner size="small" color={themeColors.gray[10]} />
          </Animated.View>
        )}
      </View>
    );
  },
);

WebViewContainer.displayName = "WebViewContainer";

export default WebViewContainer;
