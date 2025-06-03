/* eslint-disable @typescript-eslint/no-unused-vars */
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { BalancesList } from "components/BalancesList";
import { MenuItem } from "components/ContextMenuButton";
import Icon from "components/sds/Icon";
import { Input } from "components/sds/Input";
import { Text } from "components/sds/Typography";
import { PricedBalanceWithIdAndAssetType } from "config/types";
import { useAuthenticationStore } from "ducks/auth";
import { pxValue } from "helpers/dimensions";
import {
  buildStellarExpertAssetUrl,
  getStellarExpertUrl,
} from "helpers/stellarExpert";
import useAppTranslation from "hooks/useAppTranslation";
import { useClipboard } from "hooks/useClipboard";
import useColors from "hooks/useColors";
import useGetActiveAccount from "hooks/useGetActiveAccount";
import React, { useState } from "react";
import { Linking, Platform, TouchableOpacity, View } from "react-native";

interface AssetListBottomSheetProps {
  handleCloseModal: () => void;
  handleTokenPress: (token: PricedBalanceWithIdAndAssetType) => void;
  title: string;
}

const icons = Platform.select({
  ios: {
    copyAddress: "doc.on.doc",
    viewOnStellarExpert: "link",
  },
  android: {
    copyAddress: "baseline_format_paint",
    viewOnStellarExpert: "baseline_format_paint",
  },
});

const AssetListBottomSheet: React.FC<AssetListBottomSheetProps> = ({
  handleCloseModal,
  handleTokenPress,
  title,
}) => {
  const { t } = useAppTranslation();
  const { account } = useGetActiveAccount();
  const { network } = useAuthenticationStore();
  const publicKey = account?.publicKey;
  const { themeColors } = useColors();
  const [searchText, setSearchText] = useState<string>("");
  const { getClipboardText, copyToClipboard } = useClipboard();
  const [selectedAsset, setSelectedAsset] =
    useState<PricedBalanceWithIdAndAssetType | null>(null);
  const stellarExpertUrl = getStellarExpertUrl(network);

  const handlePasteFromClipboard = () => {
    getClipboardText().then(setSearchText);
  };

  const menuActions: MenuItem[] = [
    {
      title: t("swapAmountScreen.swapToBottomSheet.actions.copyAddress"),
      systemIcon: icons!.copyAddress,
      onPress: () => {
        if (selectedAsset) {
          copyToClipboard(selectedAsset.id);
        }
      },
    },
    {
      title: t(
        "swapAmountScreen.swapToBottomSheet.actions.viewOnStellarExpert",
      ),
      systemIcon: icons!.viewOnStellarExpert,
      onPress: () => {
        console.log("selectedAsset: ", selectedAsset);
        // if (selectedAsset) {
        //   Linking.openURL(
        //     buildStellarExpertAssetUrl(
        //       network,
        //       selectedAsset.tokenCode ?? "",
        //       selectedAsset.id ?? "",
        //     ),
        //   );
        // }
      },
    },
  ];

  return (
    <View className="flex-1 justify-between items-center">
      <View className="flex-row items-center justify-between w-full mb-6">
        <TouchableOpacity onPress={handleCloseModal}>
          <Icon.X size={24} color={themeColors.base[1]} />
        </TouchableOpacity>
        <Text md primary semiBold>
          {title}
        </Text>
        <View className="w-6" />
      </View>
      <View className="mb-4 w-full">
        <Input
          fieldSize="lg"
          leftElement={
            <Icon.SearchMd size={16} color={themeColors.foreground.primary} />
          }
          testID="search-input"
          placeholder={t("swapFromScreen.inputPlaceholder")}
          onChangeText={setSearchText}
          endButton={{
            content: t("common.paste"),
            onPress: handlePasteFromClipboard,
          }}
          value={searchText}
        />
      </View>
      <BottomSheetScrollView
        className="w-full"
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={false}
        contentContainerStyle={{
          paddingTop: pxValue(24),
        }}
      >
        <BalancesList
          publicKey={publicKey ?? ""}
          network={network}
          showTitleIcon
          onTokenPress={handleTokenPress}
          searchText={searchText}
          shouldUseScrollView
          disableFundAccount
          rightContent={
            <TouchableOpacity onPress={() => {}}>
              <Icon.PlusCircle size={24} color={themeColors.base[1]} />
            </TouchableOpacity>
          }
        />
      </BottomSheetScrollView>
    </View>
  );
};

export default AssetListBottomSheet;
