import { BROWSER_CONSTANTS, APP_VERSION } from "config/constants";
import { logger } from "config/logger";
import { freezeWebsite, unfreezeWebsite, SCRIPTS_TO_INJECT } from "helpers/webviewScripts";
import React, { memo, useRef, useEffect, useState } from "react";
import { View } from "react-native";
import ViewShot from "react-native-view-shot";
import { WebView, WebViewNavigation } from "react-native-webview";

interface BrowserTabProps {
  tabId: string;
  url: string;
  isActive: boolean;
  onNavigationStateChange: (navState: WebViewNavigation) => void;
  onShouldStartLoadWithRequest: (request: WebViewNavigation) => boolean;
  onLoadEnd: (tabId: string) => void;
  onScroll: (tabId: string) => void;
  onWebViewRef: (tabId: string, ref: WebView | null) => void;
  onViewShotRef: (tabId: string, ref: ViewShot | null) => void;
}

const TabWebView = memo(({
  tabId,
  url,
  isActive,
  onNavigationStateChange,
  onShouldStartLoadWithRequest,
  onLoadEnd,
  onScroll,
  onWebViewRef,
  onViewShotRef,
}: BrowserTabProps) => {
  const webViewRef = useRef<WebView>(null);
  const viewShotRef = useRef<ViewShot>(null);
  
  // Stable render key - only changes if WebView crashes (like Rainbow)
  const [renderKey] = useState(`${tabId}-${Date.now()}`);

  // Debug: Log when WebView instance changes
  useEffect(() => {
    logger.debug("TabWebView", `WebView instance created/updated for tab ${tabId}, URL: ${url}, renderKey: ${renderKey}`);
  }, [tabId, url, renderKey]);

  // Update WebView ref when it changes
  useEffect(() => {
    onWebViewRef(tabId, webViewRef.current);
  }, [tabId, onWebViewRef]);

  // Update ViewShot ref when it changes
  useEffect(() => {
    onViewShotRef(tabId, viewShotRef.current);
  }, [tabId, onViewShotRef]);

  // Handle tab becoming active/inactive with freeze/unfreeze
  useEffect(() => {
    logger.debug("TabWebView", `Tab ${tabId} ${isActive ? "activated" : "deactivated"}`);
    
    if (webViewRef.current) {
      if (isActive) {
        // Unfreeze website when tab becomes active
        logger.debug("TabWebView", `Injecting unfreeze script for tab ${tabId}`);
        webViewRef.current.injectJavaScript(unfreezeWebsite);
      } else {
        // Freeze website when tab becomes inactive
        logger.debug("TabWebView", `Injecting freeze script for tab ${tabId}`);
        webViewRef.current.injectJavaScript(freezeWebsite);
      }
    }
  }, [isActive, tabId]);

  return (
    <View
      className={`absolute inset-0 ${isActive ? "opacity-100" : "opacity-0"}`}
      pointerEvents={isActive ? "auto" : "none"}
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
          key={renderKey}
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
          injectedJavaScript={SCRIPTS_TO_INJECT}
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
  );
});

export { TabWebView };

