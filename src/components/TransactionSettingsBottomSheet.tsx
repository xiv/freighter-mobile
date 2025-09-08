import { BottomSheetModal } from "@gorhom/bottom-sheet";
import BottomSheet from "components/BottomSheet";
import InformationBottomSheet from "components/InformationBottomSheet";
import { Button } from "components/sds/Button";
import Icon from "components/sds/Icon";
import { Input } from "components/sds/Input";
import { NetworkCongestionIndicator } from "components/sds/NetworkCongestionIndicator";
import { Text } from "components/sds/Typography";
import {
  MIN_TRANSACTION_FEE,
  NATIVE_TOKEN_CODE,
  TransactionSetting,
} from "config/constants";
import { NetworkCongestion } from "config/types";
import { useSwapSettingsStore } from "ducks/swapSettings";
import { useTransactionSettingsStore } from "ducks/transactionSettings";
import useAppTranslation from "hooks/useAppTranslation";
import useColors from "hooks/useColors";
import { useNetworkFees } from "hooks/useNetworkFees";
import { useValidateMemo } from "hooks/useValidateMemo";
import { useValidateSlippage } from "hooks/useValidateSlippage";
import { useValidateTransactionFee } from "hooks/useValidateTransactionFee";
import { useValidateTransactionTimeout } from "hooks/useValidateTransactionTimeout";
import React, { useRef, useState } from "react";
import { TouchableOpacity, View } from "react-native";

/**
 * Props for the TransactionSettingsBottomSheet component
 * @interface TransactionSettingsBottomSheetProps
 * @property {() => void} onCancel - Callback function when settings are cancelled
 * @property {() => void} onConfirm - Callback function when settings are confirmed
 * @property {TransactionSetting[]} settings - Array of settings to display
 */
type TransactionSettingsBottomSheetProps = {
  onCancel: () => void;
  onConfirm: () => void;
  settings: TransactionSetting[];
};

/**
 * TransactionSettingsBottomSheet Component
 *
 * A bottom sheet modal that allows users to configure transaction settings including:
 * - Transaction fee (with network congestion indicator)
 * - Transaction timeout
 * - Transaction memo
 *
 * Each setting includes validation and informational tooltips. The component
 * manages local state for each setting and only saves to the global store
 * when the user confirms the changes.
 *
 * @param {TransactionSettingsBottomSheetProps} props - Component props
 * @returns {JSX.Element} The rendered bottom sheet component
 *
 * @example
 * ```tsx
 * <TransactionSettingsBottomSheet
 *   onCancel={() => setShowSettings(false)}
 *   onConfirm={() => {
 *     // Settings saved, proceed with transaction
 *     setShowSettings(false);
 *   }}
 * />
 * ```
 */
const TransactionSettingsBottomSheet: React.FC<
  TransactionSettingsBottomSheetProps
> = ({ onCancel, onConfirm, settings }) => {
  const { t } = useAppTranslation();
  const {
    transactionMemo,
    saveMemo,
    transactionTimeout,
    saveTransactionTimeout,
    transactionFee,
    saveTransactionFee,
  } = useTransactionSettingsStore();

  const { swapSlippage, saveSwapSlippage } = useSwapSettingsStore();
  const timeoutInfoBottomSheetModalRef = useRef<BottomSheetModal>(null);
  const feeInfoBottomSheetModalRef = useRef<BottomSheetModal>(null);
  const memoInfoBottomSheetModalRef = useRef<BottomSheetModal>(null);
  const slippageInfoBottomSheetModalRef = useRef<BottomSheetModal>(null);

  const { themeColors } = useColors();
  const { recommendedFee, networkCongestion } = useNetworkFees();
  const [localFee, setLocalFee] = useState(transactionFee ?? recommendedFee);
  const [localMemo, setLocalMemo] = useState(transactionMemo);
  const [localTimeout, setLocalTimeout] = useState(
    transactionTimeout.toString(),
  );
  const [localSlippage, setLocalSlippage] = useState(swapSlippage.toString());

  const { error: memoError } = useValidateMemo(localMemo);
  const { error: feeError } = useValidateTransactionFee(localFee);
  const { error: timeoutError } = useValidateTransactionTimeout(localTimeout);
  const { error: slippageError } = useValidateSlippage(localSlippage);

  /**
   * Updates slippage value
   * @param value - The numeric value (without %)
   */
  const updateSlippage = (value: string) => {
    setLocalSlippage(value);
  };

  /**
   * Handles text input changes
   * @param text - The input text
   */
  const handleSlippageTextChange = (text: string) => {
    // Remove % if user types it
    const numericValue = text.replace("%", "");
    setLocalSlippage(numericValue);
  };

  /**
   * Formats a number using the device's locale
   * @param value - The numeric value to format
   * @returns Formatted number string with locale-specific separators
   */
  const formatNumberWithLocale = (value: number): string =>
    new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(value);

  /**
   * Error mapping for each setting type
   */
  const settingErrors = {
    [TransactionSetting.Memo]: memoError,
    [TransactionSetting.Slippage]: slippageError,
    [TransactionSetting.Fee]: feeError,
    [TransactionSetting.Timeout]: timeoutError,
  };

  /**
   * Save callbacks for each setting type
   */
  const settingSaveCallbacks = {
    [TransactionSetting.Memo]: () => saveMemo(localMemo),
    [TransactionSetting.Slippage]: () =>
      saveSwapSlippage(Number(localSlippage)),
    [TransactionSetting.Fee]: () => saveTransactionFee(localFee),
    [TransactionSetting.Timeout]: () =>
      saveTransactionTimeout(Number(localTimeout)),
  };

  /**
   * Converts network congestion level to localized string
   *
   * @param {NetworkCongestion} congestion - The network congestion level
   * @returns {string} Localized string representation of congestion level
   */
  const getLocalizedCongestionLevel = (
    congestion: NetworkCongestion,
  ): string => {
    switch (congestion) {
      case NetworkCongestion.LOW:
        return t("low");
      case NetworkCongestion.MEDIUM:
        return t("medium");
      case NetworkCongestion.HIGH:
        return t("high");
      default:
        return t("low");
    }
  };

  /**
   * Individual row component functions
   */
  const getMemoRow = () => (
    <View className="flex-col gap-2 mt-[24px]">
      <View className="flex flex-row items-center gap-2">
        <Text sm secondary>
          {t("transactionSettingsBottomSheet.memoTitle")}
        </Text>
        <TouchableOpacity
          onPress={() => memoInfoBottomSheetModalRef.current?.present()}
        >
          <Icon.InfoCircle color={themeColors.gray[8]} size={16} />
        </TouchableOpacity>
      </View>
      <Input
        isBottomSheetInput
        fieldSize="lg"
        leftElement={
          <Icon.File02 size={16} color={themeColors.foreground.primary} />
        }
        placeholder={t("transactionMemoScreen.placeholder")}
        value={localMemo}
        onChangeText={setLocalMemo}
        error={memoError}
      />
    </View>
  );

  const getSlippageRow = () => (
    <View className="flex-col gap-2 mt-[24px]">
      <View className="flex flex-row items-center justify-between">
        <View className="flex flex-row items-center gap-2">
          <Text sm secondary>
            {t("transactionSettingsBottomSheet.slippageTitle")}
          </Text>
          <TouchableOpacity
            onPress={() => slippageInfoBottomSheetModalRef.current?.present()}
          >
            <Icon.InfoCircle color={themeColors.gray[8]} size={16} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => updateSlippage("1")}>
          <Text sm medium color={themeColors.lilac[11]}>
            {t("transactionSettingsBottomSheet.resetFee")}
          </Text>
        </TouchableOpacity>
      </View>
      <View className="flex flex-row items-start gap-2">
        <TouchableOpacity
          onPress={() => {
            const currentValue = parseFloat(localSlippage) || 0;
            if (currentValue > 0) {
              const newValue = Math.max(
                0,
                Math.round((currentValue - 0.5) * 10) / 10,
              );
              updateSlippage(formatNumberWithLocale(newValue));
            }
          }}
          className="w-10 h-10 rounded-full bg-gray-2 items-center justify-center mt-2"
          disabled={(parseFloat(localSlippage) || 0) <= 0}
        >
          <Icon.Minus
            size={16}
            color={
              (parseFloat(localSlippage) || 0) <= 0
                ? themeColors.gray[6]
                : themeColors.foreground.primary
            }
          />
        </TouchableOpacity>

        <View className="flex-1">
          <Input
            isBottomSheetInput
            fieldSize="lg"
            placeholder={t("slippageScreen.customPlaceholder")}
            value={localSlippage}
            onChangeText={handleSlippageTextChange}
            keyboardType="numeric"
            error={slippageError}
            textExtra="%"
            centered
          />
        </View>

        <TouchableOpacity
          onPress={() => {
            const currentValue = parseFloat(localSlippage) || 0;
            const newValue = Math.round((currentValue + 0.5) * 10) / 10;
            updateSlippage(formatNumberWithLocale(newValue));
          }}
          className="w-10 h-10 rounded-full bg-gray-2 items-center justify-center mt-2"
        >
          <Icon.Plus size={16} color={themeColors.foreground.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const getFeeRow = () => (
    <View className="flex flex-col gap-2">
      <View className="flex flex-row items-center justify-between">
        <View className="flex flex-row items-center gap-2">
          <Text sm secondary>
            {t("transactionSettingsBottomSheet.feeTitle")}
          </Text>
          <TouchableOpacity
            onPress={() => feeInfoBottomSheetModalRef.current?.present()}
          >
            <Icon.InfoCircle color={themeColors.gray[8]} size={16} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => setLocalFee(recommendedFee)}>
          <Text sm medium color={themeColors.lilac[11]}>
            {t("transactionSettingsBottomSheet.resetFee")}
          </Text>
        </TouchableOpacity>
      </View>
      <View className="flex flex-row mt-[4px] items-center gap-2">
        <Input
          isBottomSheetInput
          fieldSize="lg"
          value={localFee}
          leftElement={
            <Icon.Route size={16} color={themeColors.foreground.primary} />
          }
          onChangeText={setLocalFee}
          keyboardType="numeric"
          placeholder={MIN_TRANSACTION_FEE}
          error={feeError}
          rightElement={
            <Text md secondary>
              {NATIVE_TOKEN_CODE}
            </Text>
          }
        />
      </View>
      <View className="flex-row items-center gap-2 mt-2">
        <NetworkCongestionIndicator level={networkCongestion} size={16} />
        <Text sm secondary>
          {t("transactionFeeScreen.congestion", {
            networkCongestion: getLocalizedCongestionLevel(networkCongestion),
          })}
        </Text>
      </View>
    </View>
  );

  const getTimeoutRow = () => (
    <View className="flex flex-col gap-2 mt-[24px]">
      <View className="flex flex-row items-center gap-2">
        <Text sm secondary>
          {t("transactionSettingsBottomSheet.timeoutTitle")}
        </Text>
        <TouchableOpacity
          onPress={() => timeoutInfoBottomSheetModalRef.current?.present()}
        >
          <Icon.InfoCircle color={themeColors.gray[8]} size={16} />
        </TouchableOpacity>
      </View>
      <Input
        isBottomSheetInput
        fieldSize="lg"
        leftElement={
          <Icon.ClockRefresh size={16} color={themeColors.foreground.primary} />
        }
        placeholder={t("transactionTimeoutScreen.inputPlaceholder")}
        value={localTimeout}
        onChangeText={setLocalTimeout}
        keyboardType="numeric"
        error={timeoutError}
        rightElement={
          <Text md secondary>
            {t("transactionTimeoutScreen.seconds")}
          </Text>
        }
      />
    </View>
  );

  /**
   * Dynamic component configuration
   */
  const componentConfig = {
    [TransactionSetting.Memo]: getMemoRow,
    [TransactionSetting.Slippage]: getSlippageRow,
    [TransactionSetting.Fee]: getFeeRow,
    [TransactionSetting.Timeout]: getTimeoutRow,
  };

  /**
   * Handles confirmation of transaction settings
   * Validates all inputs and saves to global store if valid
   */
  const handleConfirm = () => {
    // Check for errors in enabled settings only
    const hasErrors = settings.some((setting) => settingErrors[setting]);

    if (hasErrors) return;

    // Save settings dynamically using callbacks
    settings.forEach((setting) => {
      const saveCallback = settingSaveCallbacks[setting];
      if (saveCallback) {
        saveCallback();
      }
    });

    onConfirm();
  };

  /**
   * Configuration for information bottom sheets
   * Each setting has its own info modal with icon, title, and content
   */
  const bottomSheetsConfig = [
    {
      IconComponent: Icon.File02,
      key: "memoInfo" as const,
      modalRef: memoInfoBottomSheetModalRef,
      title: t("transactionSettingsBottomSheet.memoInfo.title"),
      onClose: () => memoInfoBottomSheetModalRef.current?.dismiss(),
      texts: [
        {
          key: "description",
          value: t("transactionSettingsBottomSheet.memoInfo.description"),
        },
        {
          key: "additionalInfo",
          value: t("transactionSettingsBottomSheet.memoInfo.additionalInfo"),
        },
      ],
    },
    {
      IconComponent: Icon.CoinsSwap01,
      key: "slippageInfo" as const,
      modalRef: slippageInfoBottomSheetModalRef,
      title: t("transactionSettingsBottomSheet.slippageInfo.title"),
      onClose: () => slippageInfoBottomSheetModalRef.current?.dismiss(),
      texts: [
        {
          key: "description",
          value: t("transactionSettingsBottomSheet.slippageInfo.description"),
        },
      ],
    },
    {
      IconComponent: Icon.Route,
      key: "feeInfo" as const,
      modalRef: feeInfoBottomSheetModalRef,
      title: t("transactionSettingsBottomSheet.feeInfo.title"),
      onClose: () => feeInfoBottomSheetModalRef.current?.dismiss(),
      texts: [
        {
          key: "description",
          value: t("transactionSettingsBottomSheet.feeInfo.description"),
        },
        {
          key: "additionalInfo",
          value: t("transactionSettingsBottomSheet.feeInfo.additionalInfo"),
        },
      ],
    },
    {
      IconComponent: Icon.ClockRefresh,
      key: "timeoutInfo" as const,
      modalRef: timeoutInfoBottomSheetModalRef,
      title: t("transactionSettingsBottomSheet.timeoutInfo.title"),
      onClose: () => timeoutInfoBottomSheetModalRef.current?.dismiss(),
      texts: [
        {
          key: "description",
          value: t("transactionSettingsBottomSheet.timeoutInfo.description"),
        },
        {
          key: "additionalInfo",
          value: t("transactionSettingsBottomSheet.timeoutInfo.additionalInfo"),
        },
      ],
    },
  ];

  return (
    <View className="flex-1">
      <View className="flex-1 justify-between">
        <View className="flex flex-col gap-2">
          {/* Dynamically render settings based on the settings array */}
          {settings.map((setting) => {
            const Component = componentConfig[setting];
            return Component ? <Component key={setting} /> : null;
          })}
        </View>
      </View>

      <View className="mt-[24px] gap-[12px] flex-row">
        <View className="flex-1">
          <Button onPress={onCancel} secondary xl>
            {t("common.cancel")}
          </Button>
        </View>
        <View className="flex-1">
          <Button
            tertiary
            xl
            onPress={handleConfirm}
            disabled={settings.some((setting) => settingErrors[setting])}
          >
            {t("common.save")}
          </Button>
        </View>
      </View>

      {bottomSheetsConfig.map(
        ({ IconComponent, modalRef, onClose, title, key, texts }) => (
          <BottomSheet
            key={key}
            modalRef={modalRef}
            handleCloseModal={onClose}
            customContent={
              <InformationBottomSheet
                title={title}
                onClose={onClose}
                headerElement={
                  <View className="bg-lilac-3 p-2 rounded-[8px]">
                    <IconComponent color={themeColors.lilac[9]} size={28} />
                  </View>
                }
                texts={texts}
              />
            }
          />
        ),
      )}
    </View>
  );
};

export default TransactionSettingsBottomSheet;
