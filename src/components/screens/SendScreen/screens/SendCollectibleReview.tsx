import Blockaid from "@blockaid/client";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BigNumber } from "bignumber.js";
import BottomSheet from "components/BottomSheet";
import { CollectibleImage } from "components/CollectibleImage";
import { IconButton } from "components/IconButton";
import InformationBottomSheet from "components/InformationBottomSheet";
import { List, ListItemProps } from "components/List";
import TransactionSettingsBottomSheet from "components/TransactionSettingsBottomSheet";
import SecurityDetailBottomSheet from "components/blockaid/SecurityDetailBottomSheet";
import { BaseLayout } from "components/layout/BaseLayout";
import {
  ContactRow,
  SendReviewBottomSheet,
  SendReviewFooter,
} from "components/screens/SendScreen/components";
import { TransactionProcessingScreen } from "components/screens/SendScreen/screens";
import { useSignTransactionDetails } from "components/screens/SignTransactionDetails/hooks/useSignTransactionDetails";
import { Button } from "components/sds/Button";
import Icon from "components/sds/Icon";
import { Text } from "components/sds/Typography";
import { AnalyticsEvent } from "config/analyticsConfig";
import { TransactionSettingsContext } from "config/constants";
import { logger } from "config/logger";
import {
  SEND_PAYMENT_ROUTES,
  SendPaymentStackParamList,
  ROOT_NAVIGATOR_ROUTES,
  MAIN_TAB_ROUTES,
} from "config/routes";
import { useAuthenticationStore } from "ducks/auth";
import { useCollectiblesStore } from "ducks/collectibles";
import { useHistoryStore } from "ducks/history";
import { useSendRecipientStore } from "ducks/sendRecipient";
import { useTransactionBuilderStore } from "ducks/transactionBuilder";
import { useTransactionSettingsStore } from "ducks/transactionSettings";
import { calculateSpendableAmount, hasXLMForFees } from "helpers/balances";
import { useBlockaidTransaction } from "hooks/blockaid/useBlockaidTransaction";
import useAppTranslation from "hooks/useAppTranslation";
import { useBalancesList } from "hooks/useBalancesList";
import useColors from "hooks/useColors";
import useGetActiveAccount from "hooks/useGetActiveAccount";
import { useRightHeaderButton } from "hooks/useRightHeader";
import { useTokenFiatConverter } from "hooks/useTokenFiatConverter";
import { useValidateTransactionMemo } from "hooks/useValidateTransactionMemo";
import { useToast } from "providers/ToastProvider";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { View } from "react-native";
import { analytics } from "services/analytics";
import { SecurityLevel } from "services/blockaid/constants";
import {
  assessTransactionSecurity,
  extractSecurityWarnings,
} from "services/blockaid/helper";

type SendCollectibleReviewScreenProps = NativeStackScreenProps<
  SendPaymentStackParamList,
  typeof SEND_PAYMENT_ROUTES.SEND_COLLECTIBLE_REVIEW
>;

/**
 * SendCollectibleReviewScreen Component
 *
 * A screen for reviewing details of a collectible before sending.
 *
 * @param {SendCollectibleReviewScreenProps} props - Component props
 * @returns {JSX.Element} The rendered component
 */
const SendCollectibleReviewScreen: React.FC<
  SendCollectibleReviewScreenProps
> = ({ navigation, route }) => {
  const { tokenId, collectionAddress } = route.params;
  const { t } = useAppTranslation();
  const { themeColors } = useColors();
  const { account } = useGetActiveAccount();
  const { network } = useAuthenticationStore();
  const {
    transactionFee,
    recipientAddress,
    selectedTokenId,
    saveSelectedCollectibleDetails,
    resetSettings,
  } = useTransactionSettingsStore();
  const { collections } = useCollectiblesStore();

  const { resetSendRecipient } = useSendRecipientStore();
  const { fetchAccountHistory } = useHistoryStore();

  useEffect(() => {
    if (tokenId && collectionAddress) {
      saveSelectedCollectibleDetails({ tokenId, collectionAddress });
    }
  }, [tokenId, collectionAddress, saveSelectedCollectibleDetails]);

  const {
    buildTransaction,
    signTransaction,
    submitTransaction,
    resetTransaction,
    isBuilding,
    transactionXDR,
    transactionHash,
  } = useTransactionBuilderStore();

  // Reset everything on unmount
  useEffect(
    () => () => {
      saveSelectedCollectibleDetails({ collectionAddress: "", tokenId: "" });
      resetSendRecipient();
      resetSettings();
      resetTransaction();
    },
    [
      resetSettings,
      resetSendRecipient,
      saveSelectedCollectibleDetails,
      resetTransaction,
    ],
  );

  const { isValidatingMemo, isMemoMissing } =
    useValidateTransactionMemo(transactionXDR);

  const { scanTransaction } = useBlockaidTransaction();

  const publicKey = account?.publicKey;
  const reviewBottomSheetModalRef = useRef<BottomSheetModal>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [amountError, setAmountError] = useState<string | null>(null);
  const { showToast } = useToast();
  const addMemoExplanationBottomSheetModalRef = useRef<BottomSheetModal>(null);
  const transactionSettingsBottomSheetModalRef = useRef<BottomSheetModal>(null);
  const [transactionScanResult, setTransactionScanResult] = useState<
    Blockaid.StellarTransactionScanResponse | undefined
  >(undefined);
  const transactionSecurityWarningBottomSheetModalRef =
    useRef<BottomSheetModal>(null);
  const signTransactionDetails = useSignTransactionDetails({
    xdr: transactionXDR ?? "",
  });

  useRightHeaderButton({
    icon: Icon.Settings04,
    onPress: () => {
      transactionSettingsBottomSheetModalRef.current?.present();
    },
  });

  const onConfirmAddMemo = useCallback(() => {
    reviewBottomSheetModalRef.current?.dismiss();
    transactionSettingsBottomSheetModalRef.current?.present();
  }, []);

  const onCancelAddMemo = () => {
    addMemoExplanationBottomSheetModalRef.current?.dismiss();
  };

  const handleConfirmTransactionSettings = () => {
    transactionSettingsBottomSheetModalRef.current?.dismiss();
  };

  const handleOpenSettingsFromReview = () => {
    transactionSettingsBottomSheetModalRef.current?.present();
  };

  const handleCancelTransactionSettings = () => {
    addMemoExplanationBottomSheetModalRef.current?.dismiss();
    transactionSettingsBottomSheetModalRef.current?.dismiss();
  };

  const navigateToSelectContactScreen = () => {
    navigation.navigate(SEND_PAYMENT_ROUTES.SEND_SEARCH_CONTACTS_SCREEN);
  };

  const { balanceItems } = useBalancesList({
    publicKey: publicKey ?? "",
    network,
  });

  const selectedBalance = balanceItems.find(
    (item) => item.id === selectedTokenId,
  );

  const isRequiredMemoMissing = isMemoMissing && !isValidatingMemo;

  const transactionSecurityAssessment = useMemo(
    () => assessTransactionSecurity(transactionScanResult),
    [transactionScanResult],
  );

  const selectedCollectible = useMemo(() => {
    const collection = collections.find(
      (c) => c.collectionAddress === collectionAddress,
    );
    if (collection) {
      return collection.items.find(
        (collectible) => collectible.tokenId === tokenId,
      );
    }
    return undefined;
  }, [collections, collectionAddress, tokenId]);

  const { tokenAmount } = useTokenFiatConverter({ selectedBalance });

  const spendableBalance = useMemo(() => {
    if (!selectedBalance || !account) {
      return BigNumber(0);
    }

    const result = calculateSpendableAmount({
      balance: selectedBalance,
      subentryCount: account.subentryCount,
      transactionFee,
    });

    return result;
  }, [selectedBalance, account, transactionFee]);

  useEffect(() => {
    const currentTokenAmount = BigNumber(tokenAmount);

    if (!hasXLMForFees(balanceItems, transactionFee)) {
      const errorMessage = t(
        "transactionAmountScreen.errors.insufficientXlmForFees",
        {
          fee: transactionFee,
        },
      );
      setAmountError(errorMessage);
      showToast({
        variant: "error",
        title: t("transactionAmountScreen.errors.insufficientXlmForFees", {
          fee: transactionFee,
        }),
        toastId: "insufficient-xlm-for-fees",
        duration: 3000,
      });
      return;
    }

    if (
      spendableBalance &&
      currentTokenAmount.isGreaterThan(spendableBalance) &&
      !transactionHash
    ) {
      const errorMessage = t("transactionAmountScreen.errors.amountTooHigh");
      setAmountError(errorMessage);
      showToast({
        variant: "error",
        title: t("transactionAmountScreen.errors.amountTooHigh"),
        toastId: "amount-too-high",
        duration: 3000,
      });
    } else {
      setAmountError(null);
    }
  }, [
    tokenAmount,
    spendableBalance,
    balanceItems,
    transactionFee,
    transactionHash,
    t,
    showToast,
  ]);

  const prepareTransaction = useCallback(
    async (shouldOpenReview = false) => {
      const numberTokenAmount = new BigNumber(tokenAmount);

      const hasRequiredParams =
        recipientAddress &&
        selectedBalance &&
        numberTokenAmount.isGreaterThan(0);
      if (!hasRequiredParams) {
        return;
      }

      try {
        // Get fresh settings values each time the function is called
        const {
          transactionMemo: freshTransactionMemo,
          transactionFee: freshTransactionFee,
          transactionTimeout: freshTransactionTimeout,
          recipientAddress: storeRecipientAddress,
        } = useTransactionSettingsStore.getState();

        const finalXDR = await buildTransaction({
          tokenAmount,
          selectedBalance,
          recipientAddress: storeRecipientAddress,
          transactionMemo: freshTransactionMemo,
          transactionFee: freshTransactionFee,
          transactionTimeout: freshTransactionTimeout,
          network,
          senderAddress: publicKey,
        });

        if (!finalXDR) return;

        if (shouldOpenReview) {
          scanTransaction(finalXDR, "internal")
            .then((scanResult) => {
              logger.info("TransactionAmountScreen", "scanResult", scanResult);
              setTransactionScanResult(scanResult);
            })
            .catch(() => {
              setTransactionScanResult(undefined);
            })
            .finally(() => {
              reviewBottomSheetModalRef.current?.present();
            });
        }
      } catch (error) {
        logger.error(
          "TransactionAmountScreen",
          "Failed to build transaction:",
          error,
        );
      }
    },
    [
      tokenAmount,
      selectedBalance,
      network,
      publicKey,
      buildTransaction,
      scanTransaction,
      recipientAddress,
    ],
  );

  const handleSettingsChange = () => {
    // Settings have changed, rebuild the transaction with new values
    prepareTransaction(false);
  };

  const handleTransactionConfirmation = useCallback(() => {
    setIsProcessing(true);
    reviewBottomSheetModalRef.current?.dismiss();

    const processTransaction = async () => {
      try {
        if (!account?.privateKey || !selectedBalance || !recipientAddress) {
          throw new Error("Missing account or balance information");
        }

        const { privateKey } = account;

        signTransaction({
          secretKey: privateKey,
          network,
        });

        const success = await submitTransaction({
          network,
        });

        if (success) {
          analytics.trackSendPaymentSuccess({
            sourceToken: selectedBalance?.tokenCode || "unknown",
          });
        } else {
          analytics.trackTransactionError({
            error: "Transaction failed",
            transactionType: "payment",
          });
        }
      } catch (error) {
        logger.error(
          "TransactionAmountScreen",
          "Transaction submission failed:",
          error,
        );

        analytics.trackTransactionError({
          error: error instanceof Error ? error.message : String(error),
          transactionType: "payment",
        });
      }
    };

    processTransaction();
  }, [
    account,
    selectedBalance,
    signTransaction,
    network,
    submitTransaction,
    recipientAddress,
  ]);

  const handleProcessingScreenClose = () => {
    setIsProcessing(false);
    resetTransaction();

    if (account?.publicKey) {
      fetchAccountHistory({
        publicKey: account.publicKey,
        network,
        isBackgroundRefresh: true,
        hasRecentTransaction: true,
      });
    }

    navigation.reset({
      index: 0,
      routes: [
        {
          // @ts-expect-error: Cross-stack navigation to MainTabStack with History tab
          name: ROOT_NAVIGATOR_ROUTES.MAIN_TAB_STACK,
          state: {
            routes: [{ name: MAIN_TAB_ROUTES.TAB_HISTORY }],
            index: 0,
          },
        },
      ],
    });
  };

  const handleCancelSecurityWarning = () => {
    transactionSecurityWarningBottomSheetModalRef.current?.dismiss();
  };

  const transactionSecurityWarnings = useMemo(() => {
    if (
      transactionSecurityAssessment.isMalicious ||
      transactionSecurityAssessment.isSuspicious
    ) {
      const warnings = extractSecurityWarnings(transactionScanResult);

      if (Array.isArray(warnings) && warnings.length > 0) {
        return warnings;
      }
    }

    return [];
  }, [
    transactionSecurityAssessment.isMalicious,
    transactionSecurityAssessment.isSuspicious,
    transactionScanResult,
  ]);

  const transactionSecuritySeverity = useMemo(() => {
    if (transactionSecurityAssessment.isMalicious)
      return SecurityLevel.MALICIOUS;
    if (transactionSecurityAssessment.isSuspicious)
      return SecurityLevel.SUSPICIOUS;

    return undefined;
  }, [
    transactionSecurityAssessment.isMalicious,
    transactionSecurityAssessment.isSuspicious,
  ]);

  const handleCancelReview = useCallback(() => {
    reviewBottomSheetModalRef.current?.dismiss();
  }, []);

  const footerProps = useMemo(
    () => ({
      onCancel: handleCancelReview,
      onConfirm: isRequiredMemoMissing
        ? onConfirmAddMemo
        : handleTransactionConfirmation,
      isRequiredMemoMissing,
      isMalicious: transactionSecurityAssessment.isMalicious,
      isSuspicious: transactionSecurityAssessment.isSuspicious,
      isValidatingMemo,
      onSettingsPress: handleOpenSettingsFromReview,
    }),
    [
      handleCancelReview,
      isRequiredMemoMissing,
      transactionSecurityAssessment.isMalicious,
      transactionSecurityAssessment.isSuspicious,
      onConfirmAddMemo,
      handleTransactionConfirmation,
      isValidatingMemo,
    ],
  );

  const renderFooterComponent = useCallback(
    () => <SendReviewFooter {...footerProps} />,
    [footerProps],
  );

  const isContinueButtonDisabled = useMemo(() => {
    if (!recipientAddress) {
      return false;
    }

    return (
      !!amountError ||
      BigNumber(tokenAmount).isLessThanOrEqualTo(0) ||
      isBuilding
    );
  }, [amountError, tokenAmount, isBuilding, recipientAddress]);

  const selectCollectibleDetails: ListItemProps[] = useMemo(
    () => [
      {
        title: t("common.name"),
        titleColor: themeColors.text.secondary,
        trailingContent: (
          <View className="flex-row items-center gap-2">
            <Text md primary>
              {selectedCollectible?.name}
            </Text>
          </View>
        ),
      },
      {
        title: t("common.collection"),
        titleColor: themeColors.text.secondary,
        trailingContent: (
          <View className="flex-row items-center gap-2">
            <Text md primary>
              {selectedCollectible?.collectionName}
            </Text>
          </View>
        ),
      },
      {
        title: t("common.tokenId"),
        titleColor: themeColors.text.secondary,
        trailingContent: (
          <View className="flex-row items-center gap-2">
            <Text md primary>
              {selectedCollectible?.tokenId}
            </Text>
          </View>
        ),
      },
    ],
    [selectedCollectible, themeColors.text.secondary, t],
  );

  if (isProcessing) {
    return (
      <TransactionProcessingScreen
        key={selectedTokenId}
        onClose={handleProcessingScreenClose}
        transactionAmount={tokenAmount}
        selectedBalance={selectedBalance}
      />
    );
  }

  const handleConfirmAnyway = () => {
    transactionSecurityWarningBottomSheetModalRef.current?.dismiss();

    handleTransactionConfirmation();
  };

  const onBannerPress = () => {
    if (isRequiredMemoMissing) {
      addMemoExplanationBottomSheetModalRef.current?.present();
    } else {
      transactionSecurityWarningBottomSheetModalRef.current?.present();
    }
  };

  const handleContinueButtonPress = () => {
    if (!recipientAddress) {
      navigateToSelectContactScreen();
      return;
    }

    prepareTransaction(true);
  };

  const getContinueButtonText = () => {
    if (!recipientAddress) {
      return t("transactionAmountScreen.chooseRecipient");
    }

    return t("transactionAmountScreen.reviewButton");
  };

  return (
    <BaseLayout insets={{ top: false }}>
      <View className="flex-1">
        <View className="rounded-[16px] py-[12px] px-[16px] bg-background-tertiary max-xs:mt-[4px]">
          <ContactRow
            isSingleRow
            onPress={navigateToSelectContactScreen}
            address={recipientAddress}
            rightElement={
              <IconButton Icon={Icon.ChevronRight} size="sm" variant="ghost" />
            }
          />
        </View>
        <View className="mt-[24px] w-full flex items-center justify-center">
          <View className="w-[240px] h-[240px] rounded-2xl bg-background-tertiary p-1">
            <CollectibleImage
              imageUri={selectedCollectible?.image}
              placeholderIconSize={65}
            />
          </View>
        </View>
        <View className="mt-[24px]">
          <List variant="secondary" items={selectCollectibleDetails} />
        </View>
        <View className="w-full mt-auto mb-4">
          <Button
            tertiary
            xl
            onPress={handleContinueButtonPress}
            disabled={isContinueButtonDisabled}
          >
            {getContinueButtonText()}
          </Button>
        </View>
      </View>
      <BottomSheet
        modalRef={reviewBottomSheetModalRef}
        handleCloseModal={() => reviewBottomSheetModalRef.current?.dismiss()}
        analyticsEvent={AnalyticsEvent.VIEW_SEND_CONFIRM}
        scrollable
        customContent={
          <SendReviewBottomSheet
            selectedBalance={selectedBalance}
            tokenAmount={tokenAmount}
            onBannerPress={onBannerPress}
            // is passed here so the entire layout is ready when modal mounts, otherwise leaves a gap at the bottom related to the warning size
            isRequiredMemoMissing={isRequiredMemoMissing}
            isMalicious={transactionSecurityAssessment.isMalicious}
            isSuspicious={transactionSecurityAssessment.isSuspicious}
            signTransactionDetails={signTransactionDetails}
          />
        }
        renderFooterComponent={renderFooterComponent}
      />
      <BottomSheet
        modalRef={addMemoExplanationBottomSheetModalRef}
        handleCloseModal={onCancelAddMemo}
        customContent={
          <InformationBottomSheet
            title={t("addMemoExplanationBottomSheet.title")}
            onClose={onCancelAddMemo}
            onConfirm={onConfirmAddMemo}
            headerElement={
              <View className="bg-red-3 p-2 rounded-[8px]">
                <Icon.InfoOctagon
                  color={themeColors.status.error}
                  size={28}
                  withBackground
                />
              </View>
            }
            texts={[
              {
                key: "description",
                value: t("addMemoExplanationBottomSheet.description"),
              },
              {
                key: "disabledWarning",
                value: t("addMemoExplanationBottomSheet.disabledWarning"),
              },
              {
                key: "checkMemoRequirements",
                value: t("addMemoExplanationBottomSheet.checkMemoRequirements"),
              },
            ]}
          />
        }
      />
      <BottomSheet
        modalRef={transactionSettingsBottomSheetModalRef}
        handleCloseModal={() =>
          transactionSettingsBottomSheetModalRef.current?.dismiss()
        }
        customContent={
          <TransactionSettingsBottomSheet
            context={TransactionSettingsContext.Transaction}
            onCancel={handleCancelTransactionSettings}
            onConfirm={handleConfirmTransactionSettings}
            onSettingsChange={handleSettingsChange}
          />
        }
      />
      <BottomSheet
        modalRef={transactionSecurityWarningBottomSheetModalRef}
        handleCloseModal={handleCancelSecurityWarning}
        customContent={
          <SecurityDetailBottomSheet
            warnings={transactionSecurityWarnings}
            onCancel={handleCancelSecurityWarning}
            onProceedAnyway={handleConfirmAnyway}
            onClose={handleCancelSecurityWarning}
            severity={transactionSecuritySeverity}
            proceedAnywayText={t("transactionAmountScreen.confirmAnyway")}
          />
        }
      />
    </BaseLayout>
  );
};

export default SendCollectibleReviewScreen;
