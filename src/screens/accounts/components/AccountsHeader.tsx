import { Text, View } from "react-native";
import { formatBalance } from "../utils/formatting";

type AccountsHeaderProps = {
  totalBalance: number; // total balance in smallest currency unit
  currency: string; // primary currency
};

export function AccountsHeader({ totalBalance, currency }: AccountsHeaderProps) {
  return (
    <View className="flex-row items-center justify-between mb-6">
      <Text className="text-3xl font-bold text-foreground">Accounts</Text>
      <View className="items-end">
        <Text className="text-xs text-muted-foreground text-right">Total</Text>
        <Text className="text-base font-medium text-foreground text-right">
          {formatBalance(totalBalance, currency)}
        </Text>
      </View>
    </View>
  );
}

