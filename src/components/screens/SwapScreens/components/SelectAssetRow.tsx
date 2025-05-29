import Icon from "components/sds/Icon";
import { Text } from "components/sds/Typography";
import useAppTranslation from "hooks/useAppTranslation";
import useColors from "hooks/useColors";
import React from "react";
import { TouchableOpacity, View } from "react-native";

interface SelectAssetRowProps {
  onPress: () => void;
  testID: string;
  className?: string;
}

/**
 * Component to display a asset with it's name and balance
 *
 * @param {AssetRowProps} props - Component props
 * @returns {JSX.Element} The rendered component
 */
export const SelectAssetRow: React.FC<SelectAssetRowProps> = ({
  onPress,
  testID,
  className,
}) => {
  const { t } = useAppTranslation();
  const { themeColors } = useColors();

  return (
    <TouchableOpacity
      className={`flex-row w-full h-[44px] justify-between items-center ${className || ""}`}
      onPress={onPress}
      testID={testID}
    >
      <View className="flex-row items-center flex-1 mr-4">
        <Icon.Plus circle size={25} color={themeColors.foreground.primary} />
        <View className="flex-col ml-4 flex-1">
          <Text medium numberOfLines={1}>
            {t("swapAmountScreen.receive")}
          </Text>
          <Text sm medium secondary numberOfLines={1}>
            {t("swapAmountScreen.chooseAsset")}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};
