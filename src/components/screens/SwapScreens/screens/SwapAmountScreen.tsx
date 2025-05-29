/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unstable-nested-components */
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { CommonActions } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BigNumber } from "bignumber.js";
import { BalanceRow } from "components/BalanceRow";
import BottomSheet from "components/BottomSheet";
import ContextMenuButton from "components/ContextMenuButton";
import NumericKeyboard from "components/NumericKeyboard";
import { BaseLayout } from "components/layout/BaseLayout";
import { SendReviewBottomSheet } from "components/screens/SendScreen/components";
import { TransactionProcessingScreen } from "components/screens/SendScreen/screens";
import AssetListBottomSheet from "components/screens/SwapScreens/components/AssetListBottomSheet";
import { AssetRow } from "components/screens/SwapScreens/components/AssetRow";
import { SelectAssetRow } from "components/screens/SwapScreens/components/SelectAssetRow";
import { Button } from "components/sds/Button";
import Icon from "components/sds/Icon";
import { Display, Text } from "components/sds/Typography";
import { BASE_RESERVE } from "config/constants";
import { logger } from "config/logger";
import {
  ROOT_NAVIGATOR_ROUTES,
  MAIN_TAB_ROUTES,
  SwapStackParamList,
  SWAP_ROUTES,
} from "config/routes";
import {
  AssetTypeWithCustomToken,
  PricedBalanceWithIdAndAssetType,
} from "config/types";
import { useAuthenticationStore } from "ducks/auth";
import { useTransactionBuilderStore } from "ducks/transactionBuilder";
import { useTransactionSettingsStore } from "ducks/transactionSettings";
import { formatAssetAmount, formatFiatAmount } from "helpers/formatAmount";
import useAppTranslation from "hooks/useAppTranslation";
import useColors from "hooks/useColors";
import useGetActiveAccount from "hooks/useGetActiveAccount";
import { useTokenFiatConverter } from "hooks/useTokenFiatConverter";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { getAccount } from "services/stellar";

// Define amount error types
enum AmountError {
  TOO_HIGH = "amount too high",
  // DEC_MAX handled by formatNumericInput
  // SEND_MAX is less critical for mobile? (Extension has it)
}

type SwapAmountScreenProps = NativeStackScreenProps<
  SwapStackParamList,
  typeof SWAP_ROUTES.SWAP_AMOUNT_SCREEN
>;

/**
 * SwapAmountScreen Component
 *
 * A screen for entering swap amounts in either token or fiat currency.
 * Supports switching between token and fiat input modes with automatic conversion.
 *
 * @param {SwapAmountScreenProps} props - Component props
 * @returns {JSX.Element} The rendered component
 */
const SwapAmountScreen: React.FC<SwapAmountScreenProps> = ({
  navigation,
  route,
}) => {
  const { t } = useAppTranslation();
  const { themeColors } = useColors();
  const { account } = useGetActiveAccount();
  const { network } = useAuthenticationStore();
  const {
    transactionMemo,
    transactionFee,
    transactionTimeout,
    recipientAddress,
  } = useTransactionSettingsStore();

  const {
    buildTransaction,
    signTransaction,
    submitTransaction,
    resetTransaction,
    isBuilding,
  } = useTransactionBuilderStore();

  const publicKey = account?.publicKey;
  const reviewBottomSheetModalRef = useRef<BottomSheetModal>(null);
  const assetListBottomSheetModalRef = useRef<BottomSheetModal>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [amountError, setAmountError] = useState<AmountError | null>(null);
  const [toToken, setToToken] =
    useState<PricedBalanceWithIdAndAssetType | null>(null);
  const [subentryCount, setSubentryCount] = useState(0);
  const fromToken = useMemo(() => route.params?.fromToken, [route.params]);

  useEffect(() => {
    const fetchSenderAccount = async () => {
      if (publicKey && network) {
        try {
          const senderAccount = await getAccount(publicKey, network);
          setSubentryCount(senderAccount?.subentry_count || 0);
        } catch (error) {
          logger.error(
            "Failed to fetch sender account details:",
            error instanceof Error ? error.message : String(error),
          );
        }
      }
    };

    fetchSenderAccount();
  }, [publicKey, network]);

  const {
    tokenAmount,
    fiatAmount,
    showFiatAmount,
    setShowFiatAmount,
    handleAmountChange,
    handlePercentagePress,
  } = useTokenFiatConverter({ selectedBalance: fromToken });

  const spendableBalance = useMemo(() => {
    if (!fromToken) return BigNumber(0);

    if (
      fromToken.assetType !== AssetTypeWithCustomToken.NATIVE &&
      fromToken.assetType !== AssetTypeWithCustomToken.CREDIT_ALPHANUM4 &&
      fromToken.assetType !== AssetTypeWithCustomToken.CREDIT_ALPHANUM12 &&
      fromToken.assetType !== AssetTypeWithCustomToken.CUSTOM_TOKEN
    ) {
      return BigNumber(fromToken.total);
    }

    if (fromToken.assetType !== AssetTypeWithCustomToken.NATIVE) {
      return BigNumber(fromToken.total);
    }

    const currentBalance = BigNumber(fromToken.total);
    const minBalance = BigNumber(2 + subentryCount).multipliedBy(BASE_RESERVE);
    const calculatedSpendable = currentBalance
      .minus(minBalance)
      .minus(BigNumber(transactionFee));

    return calculatedSpendable.isGreaterThan(0)
      ? calculatedSpendable
      : BigNumber(0);
  }, [fromToken, subentryCount, transactionFee]);

  useEffect(() => {
    const currentTokenAmount = BigNumber(tokenAmount);

    // Check if amount exceeds available balance
    if (
      spendableBalance &&
      currentTokenAmount.isGreaterThan(spendableBalance)
    ) {
      setAmountError(AmountError.TOO_HIGH);
    } else {
      setAmountError(null);
    }
  }, [tokenAmount, spendableBalance]);

  // TODO: This is a mocked function; add the actual price calculation here on the Data Flow task
  const toTokenAmount = useMemo(() => {
    if (!toToken) return "0";

    return BigNumber(tokenAmount)
      .multipliedBy(toToken.currentPrice ?? 0)
      .toString();
  }, [toToken, tokenAmount]);

  const menuActions = useMemo(
    () => [
      {
        title: t("swapAmountScreen.menu.fee", { fee: transactionFee }),
        systemIcon: "arrow.trianglehead.swap",
        onPress: () => {
          navigation.navigate(SWAP_ROUTES.SWAP_FEE_SCREEN);
        },
      },
      {
        title: t("swapAmountScreen.menu.timeout", {
          timeout: transactionTimeout,
        }),
        systemIcon: "clock",
        onPress: () => {
          navigation.navigate(SWAP_ROUTES.SWAP_TIMEOUT_SCREEN);
        },
      },
      {
        title: t("swapAmountScreen.menu.slippage"),
        systemIcon: "text.page",
        onPress: () => {
          navigation.navigate(SWAP_ROUTES.SWAP_SLIPPAGE_SCREEN);
        },
      },
    ],
    [t, navigation, transactionFee, transactionTimeout],
  );

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <ContextMenuButton
          contextMenuProps={{
            actions: menuActions,
          }}
        >
          <Icon.Settings04 size={24} color={themeColors.base[1]} />
        </ContextMenuButton>
      ),
    });
  }, [navigation, menuActions, themeColors]);

  const handleTransactionConfirmation = () => {
    reviewBottomSheetModalRef.current?.dismiss();

    // Wait for the bottom sheet to dismiss before showing the processing screen
    setTimeout(() => {
      setIsProcessing(true);
    }, 100);

    const processTransaction = async () => {
      try {
        if (!account) {
          throw new Error("Unable to retrieve account");
        }

        const { privateKey } = account;

        if (!privateKey) {
          throw new Error("Unable to retrieve account secret key");
        }

        signTransaction({
          secretKey: privateKey,
          network,
        });

        await submitTransaction({
          network,
        });
      } catch (error) {
        logger.error(
          "SwapAmountScreen",
          "Transaction submission failed:",
          error instanceof Error ? error.message : String(error),
        );
      }
    };

    processTransaction();
  };

  const handleProcessingScreenClose = () => {
    setIsProcessing(false);
    resetTransaction();

    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: ROOT_NAVIGATOR_ROUTES.MAIN_TAB_STACK,
            state: {
              index: 0,
              routes: [{ name: MAIN_TAB_ROUTES.TAB_HISTORY }],
            },
          },
        ],
      }),
    );
  };

  if (isProcessing) {
    return (
      <TransactionProcessingScreen
        key={fromToken?.id}
        onClose={handleProcessingScreenClose}
        transactionAmount={tokenAmount}
        selectedBalance={fromToken}
      />
    );
  }

  return (
    <BaseLayout insets={{ top: false }}>
      <View className="flex-1">
        <View className="items-center gap-[12px]">
          <View className="rounded-[12px] gap-[8px] py-[32px] px-[24px] items-center">
            {showFiatAmount ? (
              <Display
                md
                medium
                {...(Number(fiatAmount) > 0
                  ? { primary: true }
                  : { secondary: true })}
              >
                {formatFiatAmount(fiatAmount)}
              </Display>
            ) : (
              <View className="flex-row items-center gap-[4px]">
                <Display
                  md
                  medium
                  {...(Number(tokenAmount) > 0
                    ? { primary: true }
                    : { secondary: true })}
                >
                  {tokenAmount}
                </Display>
                <Text md medium secondary>
                  {fromToken?.tokenCode}
                </Text>
              </View>
            )}
            <View className="flex-row items-center justify-center">
              <Text lg medium secondary>
                {showFiatAmount
                  ? formatAssetAmount(tokenAmount, fromToken?.tokenCode)
                  : formatFiatAmount(fiatAmount)}
              </Text>
              <TouchableOpacity
                className="ml-2"
                onPress={() => setShowFiatAmount(!showFiatAmount)}
              >
                <Icon.RefreshCcw03
                  size={16}
                  color={themeColors.text.secondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View className="rounded-[12px] py-[12px] px-[16px] bg-background-tertiary">
            <AssetRow
              token={fromToken}
              rightElement={
                <Button secondary lg onPress={() => handlePercentagePress(100)}>
                  {t("swapAmountScreen.setMax")}
                </Button>
              }
            />
          </View>
          <View className="rounded-[12px] py-[12px] px-[16px] bg-background-tertiary">
            {toToken ? (
              <BalanceRow
                balance={toToken}
                onPress={() => {
                  assetListBottomSheetModalRef.current?.present();
                }}
                rightContent={
                  <Text md medium>
                    {formatAssetAmount(toTokenAmount, toToken?.tokenCode)}
                  </Text>
                }
                isSingleRow
              />
            ) : (
              <SelectAssetRow
                onPress={() => {
                  assetListBottomSheetModalRef.current?.present();
                }}
                testID="select-asset-row"
              />
            )}
          </View>
        </View>
        <View className="flex-1 items-center mt-[32px] gap-[24px]">
          <View className="w-full">
            <NumericKeyboard onPress={handleAmountChange} />
          </View>
          <View className="w-full mt-auto mb-4">
            {toToken ? (
              <Button
                tertiary
                xl
                onPress={() => {}}
                disabled={
                  !!amountError ||
                  BigNumber(tokenAmount).isLessThanOrEqualTo(0) ||
                  isBuilding
                }
              >
                {t("swapAmountScreen.review")}
              </Button>
            ) : (
              <Button
                tertiary
                xl
                onPress={() => {
                  assetListBottomSheetModalRef.current?.present();
                }}
              >
                {t("swapAmountScreen.selectAnAssetButton")}
              </Button>
            )}
          </View>
        </View>
      </View>

      <BottomSheet
        modalRef={reviewBottomSheetModalRef}
        handleCloseModal={() => reviewBottomSheetModalRef.current?.dismiss()}
        customContent={
          <SendReviewBottomSheet
            selectedBalance={fromToken}
            tokenAmount={tokenAmount}
            onCancel={() => reviewBottomSheetModalRef.current?.dismiss()}
            onConfirm={handleTransactionConfirmation}
          />
        }
      />
      <BottomSheet
        modalRef={assetListBottomSheetModalRef}
        handleCloseModal={() => assetListBottomSheetModalRef.current?.dismiss()}
        snapPoints={["85%"]}
        enableDynamicSizing={false}
        customContent={
          <AssetListBottomSheet
            handleCloseModal={() =>
              assetListBottomSheetModalRef.current?.dismiss()
            }
            handleTokenPress={(token) => {
              setToToken(token);
              assetListBottomSheetModalRef.current?.dismiss();
            }}
            title={t("swapAmountScreen.swapToBottomSheet.title")}
          />
        }
      />
    </BaseLayout>
  );
};

export default SwapAmountScreen;
