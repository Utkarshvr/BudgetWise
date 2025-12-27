import { Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "@/constants/theme";

export function AccountsEmptyState() {
  const colors = useThemeColors();
  
  return (
    <View className="items-center justify-center py-12">
      <MaterialIcons
        name="account-balance-wallet"
        size={64}
        color={colors.muted.foreground}
      />
      <Text
        className="text-lg mt-4 text-center"
        style={{ color: colors.muted.foreground }}
      >
        No accounts yet
      </Text>
      <Text
        className="text-sm mt-2 text-center"
        style={{ color: colors.muted.foreground }}
      >
        Add your first account to get started
      </Text>
    </View>
  );
}

