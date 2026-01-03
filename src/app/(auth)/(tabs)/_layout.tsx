import { usePathname, useRouter } from "expo-router";
import { View } from "react-native";
import { useState } from "react";
import { BottomTabs, FloatingActionButton } from "@/components/ui";
import AmountInputScreen from "@/screens/transactions/AmountInputScreen";

export default function TabLayout() {
  const [showAmountInput, setShowAmountInput] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const isTransactionsTab = pathname?.includes("/transactions");

  return (
    <View style={{ flex: 1 }}>
      <BottomTabs />

      {isTransactionsTab && (
        <FloatingActionButton
          onPress={() => setShowAmountInput(true)}
          label="Transaction"
        />
      )}

      {/* Amount Input Screen */}
      <AmountInputScreen
        visible={showAmountInput}
        onClose={() => setShowAmountInput(false)}
        onContinue={(amount) => {
          setShowAmountInput(false);
          router.push({
            pathname: "/(auth)/transaction-form",
            params: { initialAmount: amount },
          });
        }}
      />
    </View>
  );
}
