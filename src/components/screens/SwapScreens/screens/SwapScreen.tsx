import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BalancesList } from "components/BalancesList";
import { BaseLayout } from "components/layout/BaseLayout";
import Icon from "components/sds/Icon";
import { Input } from "components/sds/Input";
import { SWAP_ROUTES, SwapStackParamList } from "config/routes";
import { PricedBalanceWithIdAndAssetType } from "config/types";
import { useAuthenticationStore } from "ducks/auth";
import useAppTranslation from "hooks/useAppTranslation";
import { useClipboard } from "hooks/useClipboard";
import useColors from "hooks/useColors";
import useGetActiveAccount from "hooks/useGetActiveAccount";
import React, { useState } from "react";
import { View } from "react-native";

type SwapFromScreenProps = NativeStackScreenProps<
  SwapStackParamList,
  typeof SWAP_ROUTES.SWAP_FROM_SCREEN
>;

const SwapFromScreen: React.FC<SwapFromScreenProps> = ({ navigation }) => {
  const { t } = useAppTranslation();
  const { account } = useGetActiveAccount();
  const { network } = useAuthenticationStore();
  const publicKey = account?.publicKey;
  const { themeColors } = useColors();
  const [searchText, setSearchText] = useState<string>("");
  const { getClipboardText } = useClipboard();

  const handleTokenPress = (token: PricedBalanceWithIdAndAssetType) => {
    navigation.navigate(SWAP_ROUTES.SWAP_AMOUNT_SCREEN, {
      fromToken: token,
    });
  };

  const handlePasteFromClipboard = () => {
    getClipboardText().then(setSearchText);
  };

  return (
    <BaseLayout insets={{ top: false }}>
      <View className="flex-1">
        <View className="mb-8">
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
        <View className="flex-1">
          <BalancesList
            publicKey={publicKey ?? ""}
            network={network}
            showTitleIcon
            onTokenPress={handleTokenPress}
            searchText={searchText}
          />
        </View>
      </View>
    </BaseLayout>
  );
};

export default SwapFromScreen;
