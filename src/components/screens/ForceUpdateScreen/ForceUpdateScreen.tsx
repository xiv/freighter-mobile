import { FreighterLogo } from "components/FreighterLogo";
import { Button } from "components/sds/Button";
import useAppTranslation from "hooks/useAppTranslation";
import { useAppUpdate } from "hooks/useAppUpdate";
import React from "react";
import { View, Text, Alert } from "react-native";

interface ForceUpdateScreenProps {
  onDismiss?: () => void;
}

/**
 * Full-screen component that forces users to update their app
 * Used for critical updates that could affect fund security
 */
export const ForceUpdateScreen: React.FC<ForceUpdateScreenProps> = ({
  onDismiss,
}) => {
  const { t } = useAppTranslation();
  const { openAppStore } = useAppUpdate();

  const handleUpdate = async () => {
    try {
      await openAppStore();
    } catch (error) {
      Alert.alert(t("common.error"), t("common.unknownError"), [
        { text: t("common.confirm") },
      ]);
    }
  };

  const handleLater = () => {
    onDismiss?.();
  };

  return (
    <View className="flex-1 justify-center items-center p-6 bg-gray-1">
      <View className="bg-gray-3 rounded-[24px] p-6 w-full max-w-sm">
        <View className="mb-6">
          <FreighterLogo width={56} height={56} />
        </View>

        <Text className="text-xl font-semibold text-gray-12 text-left mb-4">
          {t("appUpdate.forceUpdate.title")}
        </Text>

        <Text className="text-base text-gray-11 text-left mb-6">
          {t("appUpdate.forceUpdate.description1")}
        </Text>

        <Text className="text-base text-gray-11 text-left mb-6">
          {t("appUpdate.forceUpdate.description2")}
        </Text>

        <View className="gap-4">
          <Button variant="tertiary" xl onPress={handleUpdate}>
            {t("appUpdate.forceUpdate.updateButton")}
          </Button>
          <Button variant="secondary" xl onPress={handleLater}>
            {t("appUpdate.forceUpdate.laterButton")}
          </Button>
        </View>
      </View>
    </View>
  );
};
