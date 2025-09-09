import React, { memo, useRef, useEffect } from "react";
import { Freeze } from "react-freeze";
import { View } from "react-native";
import ViewShot from "react-native-view-shot";
import { WebView, WebViewNavigation } from "react-native-webview";
import { DiscoveryHomepage } from "./DiscoveryHomepage";
import { isHomepageUrl } from "helpers/browser";
import { BROWSER_CONSTANTS, APP_VERSION } from "config/constants";
import { logger } from "config/logger";

interface BrowserTabProps {
  tabId: string;
  url: string;
  isActive: boolean;
  onNavigationStateChange: (navState: WebViewNavigation) => void;
  onShouldStartLoadWithRequest: (request: WebViewNavigation) => boolean;
  onLoadEnd: (tabId: string) => void;
  onScroll: (tabId: string) => void;
  onWebViewRef: (tabId: string, ref: WebView | null) => void;
}

const TabWebView = memo(function TabWebView({
  tabId,
  url,
  isActive,
  onNavigationStateChange,
  onShouldStartLoadWithRequest,
  onLoadEnd,
  onScroll,
  onWebViewRef,
}: BrowserTabProps) {
  const webViewRef = useRef<WebView>(null);
  const viewShotRef = useRef<ViewShot>(null);

  // Update WebView ref when it changes
  useEffect(() => {
    onWebViewRef(tabId, webViewRef.current);
  }, [tabId, onWebViewRef]);

  // Handle tab becoming active/inactive
  useEffect(() => {
    logger.debug("BrowserTab", `Tab ${tabId} ${isActive ? "activated" : "deactivated"}`);
  }, [isActive, tabId]);

  return (
    <Freeze freeze={!isActive}>
      {isHomepageUrl(url) ? (
        <DiscoveryHomepage tabId={tabId} />
      ) : (
        <View
          className={`absolute inset-0 ${isActive ? "opacity-100" : "opacity-0"}`}
        >
          <ViewShot
            ref={viewShotRef}
            options={{
              format: BROWSER_CONSTANTS.SCREENSHOT_FORMAT,
              quality: BROWSER_CONSTANTS.SCREENSHOT_QUALITY,
              width: BROWSER_CONSTANTS.SCREENSHOT_WIDTH,
              height: BROWSER_CONSTANTS.SCREENSHOT_HEIGHT,
              result: "data-uri",
            }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          >
            <WebView
              userAgent={BROWSER_CONSTANTS.DISCOVERY_USER_AGENT}
              allowsLinkPreview={false}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              injectedJavaScriptBeforeContentLoaded={`
                window.stellar = {
                  provider: 'freighter',
                  platform: 'mobile',
                  version: '${APP_VERSION}'
                };
              `}
              ref={webViewRef}
              source={{ uri: url }}
              onLoadEnd={() => onLoadEnd(tabId)}
              onScroll={() => onScroll(tabId)}
              allowsBackForwardNavigationGestures={isActive}
              onNavigationStateChange={
                isActive ? onNavigationStateChange : undefined
              }
              onShouldStartLoadWithRequest={
                isActive ? onShouldStartLoadWithRequest : () => true
              }
            />
          </ViewShot>
        </View>
      )}
    </Freeze>
  );
});

export default TabWebView;
