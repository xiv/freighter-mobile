import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { BalancesList } from "components/BalancesList";
import BottomSheet from "components/BottomSheet";
import ContextMenuButton from "components/ContextMenuButton";
import { IconButton } from "components/IconButton";
import { BaseLayout } from "components/layout/BaseLayout";
import ManageAccountBottomSheet from "components/screens/HomeScreen/ManageAccountBottomSheet";
import RenameAccountModal from "components/screens/HomeScreen/RenameAccountModal";
import Avatar from "components/sds/Avatar";
import Icon from "components/sds/Icon";
import { Display, Text } from "components/sds/Typography";
import { DEFAULT_PADDING } from "config/constants";
import {
  MainTabStackParamList,
  MAIN_TAB_ROUTES,
  ROOT_NAVIGATOR_ROUTES,
  RootStackParamList,
} from "config/routes";
import { Account } from "config/types";
import { useAuthenticationStore } from "ducks/auth";
import { useBalancesStore } from "ducks/balances";
import { pxValue } from "helpers/dimensions";
import useAppTranslation from "hooks/useAppTranslation";
import { useClipboard } from "hooks/useClipboard";
import useColors from "hooks/useColors";
import useGetActiveAccount from "hooks/useGetActiveAccount";
import { useTotalBalance } from "hooks/useTotalBalance";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, Platform, TouchableOpacity, View } from "react-native";

const { width } = Dimensions.get("window");

/**
 * Top section of the home screen containing account info and actions
 */
type HomeScreenProps = BottomTabScreenProps<
  MainTabStackParamList & RootStackParamList,
  typeof MAIN_TAB_ROUTES.TAB_HOME
>;

/**
 * Home screen component displaying account information and balances
 */
export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { account } = useGetActiveAccount();
  const {
    network,
    getAllAccounts,
    renameAccount,
    selectAccount,
    allAccounts,
    isRenamingAccount,
  } = useAuthenticationStore();
  const { themeColors } = useColors();
  const [accountToRename, setAccountToRename] = useState<Account | null>(null);
  const [renameAccountModalVisible, setRenameAccountModalVisible] =
    useState(false);
  const manageAccountBottomSheetModalRef = useRef<BottomSheetModal>(null);

  const { t } = useAppTranslation();
  const { copyToClipboard } = useClipboard();

  const { formattedBalance, rawBalance } = useTotalBalance();
  const balances = useBalancesStore((state) => state.balances);

  const hasAssets = useMemo(() => Object.keys(balances).length > 0, [balances]);
  const hasZeroBalance = useMemo(
    () => rawBalance?.isLessThanOrEqualTo(0) ?? true,
    [rawBalance],
  );

  useEffect(() => {
    const fetchAccounts = async () => {
      await getAllAccounts();
    };

    fetchAccounts();
  }, [getAllAccounts]);

  const actions = [
    {
      title: t("home.actions.settings"),
      systemIcon: Platform.select({
        ios: "gear",
        android: "baseline_settings",
      }),
      onPress: () => navigation.navigate(ROOT_NAVIGATOR_ROUTES.SETTINGS_STACK),
    },
    ...(hasAssets
      ? [
          {
            title: t("home.actions.manageAssets"),
            systemIcon: Platform.select({
              ios: "pencil",
              android: "baseline_delete",
            }),
            onPress: () =>
              navigation.navigate(ROOT_NAVIGATOR_ROUTES.MANAGE_ASSETS_STACK),
          },
        ]
      : []),
    {
      title: t("home.actions.myQRCode"),
      systemIcon: Platform.select({
        ios: "qrcode",
        android: "outline_circle",
      }),
      onPress: () => {}, // TODO: Implement QR code functionality
      disabled: true,
    },
  ];

  const handleCopyAddress = (publicKey?: string) => {
    if (!publicKey) return;

    copyToClipboard(publicKey, {
      notificationMessage: t("accountAddressCopied"),
    });
  };

  const handleAddAnotherWallet = () => {
    manageAccountBottomSheetModalRef.current?.dismiss();
    navigation.navigate(ROOT_NAVIGATOR_ROUTES.MANAGE_WALLETS_STACK);
  };

  const handleRenameAccount = async (newAccountName: string) => {
    if (!accountToRename || !account) return;

    await renameAccount({
      accountName: newAccountName,
      publicKey: accountToRename.publicKey,
    });
    setRenameAccountModalVisible(false);
  };

  const handleSelectAccount = async (publicKey: string) => {
    if (publicKey === account?.publicKey) {
      return;
    }

    await selectAccount(publicKey);
    manageAccountBottomSheetModalRef.current?.dismiss();
  };

  const handleOpenRenameAccountModal = (selectedAccount: Account) => {
    setAccountToRename(selectedAccount);

    setRenameAccountModalVisible(true);
  };

  return (
    <BaseLayout insets={{ bottom: false }}>
      <RenameAccountModal
        modalVisible={renameAccountModalVisible}
        setModalVisible={setRenameAccountModalVisible}
        handleRenameAccount={handleRenameAccount}
        account={accountToRename!}
        isRenamingAccount={isRenamingAccount}
      />
      <BottomSheet
        snapPoints={["80%"]}
        modalRef={manageAccountBottomSheetModalRef}
        handleCloseModal={() =>
          manageAccountBottomSheetModalRef.current?.dismiss()
        }
        bottomSheetModalProps={{
          enablePanDownToClose: false,
        }}
        customContent={
          <ManageAccountBottomSheet
            handleCloseModal={() =>
              manageAccountBottomSheetModalRef.current?.dismiss()
            }
            onPressAddAnotherWallet={handleAddAnotherWallet}
            handleCopyAddress={handleCopyAddress}
            handleRenameAccount={handleOpenRenameAccountModal}
            accounts={allAccounts}
            activeAccount={account}
            handleSelectAccount={handleSelectAccount}
          />
        }
      />
      <View
        className="flex-row justify-between items-center"
        style={{ marginBottom: DEFAULT_PADDING }}
      >
        <ContextMenuButton
          contextMenuProps={{
            actions,
          }}
        >
          <Icon.DotsHorizontal size={24} color={themeColors.base[1]} />
        </ContextMenuButton>
      </View>

      <View
        className="w-full items-center"
        style={{
          paddingTop: pxValue(22),
        }}
      >
        <View
          className="items-center"
          style={{
            gap: pxValue(12),
          }}
        >
          <TouchableOpacity
            onPress={() => manageAccountBottomSheetModalRef.current?.present()}
          >
            <View className="flex-row items-center gap-2">
              <Avatar size="sm" publicAddress={account?.publicKey ?? ""} />
              <Text>{account?.accountName ?? t("home.title")}</Text>
              <Icon.ChevronDown
                size={16}
                color={themeColors.foreground.primary}
              />
            </View>
          </TouchableOpacity>
          <Display lg medium>
            {formattedBalance}
          </Display>
        </View>

        <View
          className="flex-row items-center justify-center"
          style={{
            gap: pxValue(24),
            marginVertical: pxValue(32),
          }}
        >
          <IconButton Icon={Icon.Plus} title={t("home.buy")} />
          <IconButton
            Icon={Icon.ArrowUp}
            title={t("home.send")}
            disabled={hasZeroBalance}
            onPress={() =>
              navigation.navigate(ROOT_NAVIGATOR_ROUTES.SEND_PAYMENT_STACK)
            }
          />
          <IconButton Icon={Icon.RefreshCw02} title={t("home.swap")} />
          <IconButton
            Icon={Icon.Copy01}
            title={t("home.copy")}
            onPress={() => handleCopyAddress(account?.publicKey)}
          />
        </View>
      </View>

      <View
        className="border-b ml-[-24px] mb-6 border-b-border-primary"
        style={{
          width,
        }}
      />

      <BalancesList publicKey={account?.publicKey ?? ""} network={network} />
    </BaseLayout>
  );
};

export default HomeScreen;
