import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  NavigationContainer,
  createNavigationContainerRef,
} from "@react-navigation/native";
import { RootStackParamList } from "config/routes";
import { THEME } from "config/theme";
import { debug } from "helpers/debug";
import i18n from "i18n";
import { RootNavigator } from "navigators/RootNavigator";
import { AuthCheckProvider } from "providers/AuthCheckProvider";
import { NetworkProvider } from "providers/NetworkProvider";
import { ToastProvider } from "providers/ToastProvider";
import { WalletKitProvider } from "providers/WalletKitProvider";
import React, { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import { Appearance, StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Create a navigation ref that can be used outside of the Navigation Provider
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export const App = (): React.JSX.Element => {
  useEffect(() => {
    Appearance.setColorScheme("dark");
  }, []);

  useEffect(() => {
    AsyncStorage.getAllKeys().then(async keys => {
      debug('APP > > > > > All keys:', keys);
      const keyValues = await Promise.all(
        keys.map(async key => {
          const value = await AsyncStorage.getItem(key);
          return { key, value };
        })
      );
      debug('APP > > > > > All key-values:', keyValues);
    });
  }, []);
  
  return (
    <GestureHandlerRootView>
      <SafeAreaProvider>
        <ToastProvider>
          <BottomSheetModalProvider>
            <I18nextProvider i18n={i18n}>
              <NavigationContainer ref={navigationRef}>
                <AuthCheckProvider>
                  <NetworkProvider>
                    <StatusBar
                      backgroundColor={THEME.colors.background.default}
                      barStyle="light-content"
                    />
                    <WalletKitProvider>
                      <RootNavigator />
                    </WalletKitProvider>
                  </NetworkProvider>
                </AuthCheckProvider>
              </NavigationContainer>
            </I18nextProvider>
          </BottomSheetModalProvider>
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};
