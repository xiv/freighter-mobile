/* eslint-disable react/no-unstable-nested-components */
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CustomNavigationHeader from "components/CustomNavigationHeader";
import SwapAmountScreen from "components/screens/SwapScreens/screens/SwapAmountScreen";
import SwapFromScreen from "components/screens/SwapScreens/screens/SwapScreen";
import { SWAP_ROUTES, SwapStackParamList } from "config/routes";
import useAppTranslation from "hooks/useAppTranslation";
import React from "react";
import { View } from "react-native";

const SwapStack = createNativeStackNavigator<SwapStackParamList>();

const BlankScreen = () => <View />;

export const SwapStackNavigator = () => {
  const { t } = useAppTranslation();

  return (
    <SwapStack.Navigator
      screenOptions={{
        header: (props) => <CustomNavigationHeader {...props} />,
      }}
    >
      <SwapStack.Screen
        name={SWAP_ROUTES.SWAP_FROM_SCREEN}
        component={SwapFromScreen}
        options={{
          headerTitle: t("swapFromScreen.title"),
        }}
      />
      <SwapStack.Screen
        name={SWAP_ROUTES.SWAP_AMOUNT_SCREEN}
        component={SwapAmountScreen}
        options={{
          headerTitle: t("swapAmountScreen.title"),
        }}
      />
      <SwapStack.Screen
        name={SWAP_ROUTES.SWAP_FEE_SCREEN}
        component={BlankScreen}
        options={{
          headerTitle: t("swapFeeScreen.title"),
        }}
      />
      <SwapStack.Screen
        name={SWAP_ROUTES.SWAP_TIMEOUT_SCREEN}
        component={BlankScreen}
        options={{
          headerTitle: t("swapTimeoutScreen.title"),
        }}
      />
      <SwapStack.Screen
        name={SWAP_ROUTES.SWAP_SLIPPAGE_SCREEN}
        component={BlankScreen}
        options={{
          headerTitle: t("swapSlippageScreen.title"),
        }}
      />
    </SwapStack.Navigator>
  );
};
