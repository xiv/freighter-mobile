import Icon from "components/sds/Icon";
import useColors from "hooks/useColors";
import React from "react";
import { View, Text } from "react-native";

interface BannerProps {
  text: string;
}

/**
 * Simple banner component with info icon and text
 * Used for displaying informational messages
 */
export const Banner: React.FC<BannerProps> = ({ text }) => {
  const { themeColors } = useColors();

  return (
    <View className="flex-row items-center justify-center bg-gray-6 px-3 py-2">
      <View className="mr-2">
        <Icon.InfoCircle size={16} color={themeColors.lilac[9]} />
      </View>
      <Text className="flex-1 text-sm text-gray-12">{text}</Text>
    </View>
  );
};
