import { BottomTabHeaderProps } from "@react-navigation/bottom-tabs";
import { NativeStackHeaderProps } from "@react-navigation/native-stack";
import {
  CustomHeaderButton,
  DEFAULT_HEADER_BUTTON_SIZE,
} from "components/layout/CustomHeaderButton";
import { Banner } from "components/screens/HomeScreen/UpdateBanner";
import { Text } from "components/sds/Typography";
import { DEFAULT_PADDING } from "config/constants";
import { pxValue } from "helpers/dimensions";
import { useAppUpdate } from "hooks/useAppUpdate";
import useColors from "hooks/useColors";
import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MIN_INSETS_TOP = 34;

const HomeScreenHeader = (
  props: NativeStackHeaderProps | BottomTabHeaderProps,
) => {
  const { navigation, options = {} } = props;
  const { themeColors } = useColors();
  const insets = useSafeAreaInsets();
  const { needsOptionalUpdate, updateMessage } = useAppUpdate();
  const baseColor = themeColors.base[1];

  // In case insets.top is not available, let's ensure at least 34px of top
  // padding to avoid touching issues related to the notch and the status bar
  const insetsTop = insets.top || pxValue(MIN_INSETS_TOP - DEFAULT_PADDING);
  const paddingTop = insetsTop + pxValue(DEFAULT_PADDING);

  return (
    <View className="bg-background-primary">
      {/* Main header */}
      <View
        className="flex-row justify-between items-center px-6 pb-4"
        style={{ paddingTop }}
      >
        {options.headerLeft ? (
          options.headerLeft({
            canGoBack: navigation.canGoBack(),
            tintColor: baseColor,
            pressColor: baseColor,
            pressOpacity: 0.5,
          })
        ) : (
          <CustomHeaderButton position="left" />
        )}
        {typeof options.headerTitle === "string" && (
          <Text md primary semiBold>
            {options.headerTitle}
          </Text>
        )}
        {options.headerRight ? (
          options.headerRight({
            canGoBack: navigation.canGoBack(),
            tintColor: baseColor,
            pressColor: baseColor,
            pressOpacity: 0.5,
          })
        ) : (
          // Need to leave this empty view here to maintain the correct alignment of the header title
          <View className={DEFAULT_HEADER_BUTTON_SIZE} />
        )}
      </View>

      {/* Update banner under the header */}
      {needsOptionalUpdate && <Banner text={updateMessage} />}
    </View>
  );
};

export default HomeScreenHeader;
