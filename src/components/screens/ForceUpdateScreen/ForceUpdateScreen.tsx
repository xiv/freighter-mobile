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
  const { updateMessage, openAppStore } = useAppUpdate();

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
    Alert.alert(
      t("appUpdate.forceUpdate.title"),
      t("appUpdate.forceUpdate.laterWarning"),
      [
        {
          text: t("common.continue"),
          onPress: () => {
            onDismiss?.();
          },
        },
      ],
    );
  };

  return (
    <View className="flex-1 justify-center items-center p-5">
      <Text className="text-base text-center mb-8">{updateMessage}</Text>
      <View className="w-full gap-4">
        <Button variant="primary" lg onPress={handleUpdate}>
          {t("appUpdate.forceUpdate.updateButton")}
        </Button>
        <Button variant="secondary" lg onPress={handleLater}>
          {t("appUpdate.forceUpdate.laterButton")}
        </Button>
      </View>
    </View>
  );
};
