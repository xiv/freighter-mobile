import { BalanceRow } from "components/BalanceRow";
import { PricedBalanceWithIdAndAssetType } from "config/types";
import React from "react";

interface AssetRowProps {
  token: PricedBalanceWithIdAndAssetType;
  onPress?: () => void;
  onDotsPress?: () => void;
  rightElement?: React.ReactNode;
  className?: string;
  testID?: string;
}

/**
 * Component to display a asset with it's name and balance
 *
 * @param {AssetRowProps} props - Component props
 * @returns {JSX.Element} The rendered component
 */
export const AssetRow: React.FC<AssetRowProps> = ({
  token,
  onPress,
  onDotsPress,
  rightElement,
  ...props
}) => (
  <BalanceRow
    balance={token}
    onPress={onPress}
    rightContent={rightElement}
    isSingleRow
    {...props}
  />
);

// return (
//   <TouchableOpacity
//     className={`flex-row w-full h-[44px] justify-between items-center ${className || ""}`}
//     onPress={onPress}
//     testID={testID}
//   >
//     <View className="flex-row items-center flex-1 mr-4">
//       <AssetIcon>
//       <View className="flex-col ml-4 flex-1">
//         <Text medium numberOfLines={1}>
//           {name || slicedAddress}
//         </Text>
//         <Text sm medium secondary numberOfLines={1}>
//           {slicedAddress}
//         </Text>
//       </View>
//     </View>
//     {rightElement ||
//       (onDotsPress && (
//         <Icon.DotsHorizontal
//           size={24}
//           color={themeColors.foreground.secondary}
//           onPress={onDotsPress}
//         />
//       ))}
//   </TouchableOpacity>
// );
