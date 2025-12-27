import { Text, View } from "react-native";
import { useThemeColors } from "@/constants/theme";
import { formatBalance } from "../utils/formatting";

type AccountsHeaderProps = {
  totalBalance: number; // total balance in smallest currency unit
  currency: string; // primary currency
};

export function AccountsHeader({ totalBalance, currency }: AccountsHeaderProps) {
  const colors = useThemeColors();
  
  return (
    <View className="flex-row items-center justify-between mb-6">
      <Text
        className="text-3xl font-bold"
        style={{ color: colors.foreground }}
      >
        Accounts
      </Text>
      <View className="items-end">
        <Text
          className="text-xs text-right"
          style={{ color: colors.muted.foreground }}
        >
          Total
        </Text>
        <Text
          className="text-base font-medium text-right"
          style={{ color: colors.foreground }}
        >
          {formatBalance(totalBalance, currency)}
        </Text>
      </View>
    </View>
  );
}

