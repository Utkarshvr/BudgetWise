import { usePathname } from "expo-router";
import { View } from "react-native";
import { useState } from "react";
import { BottomTabs, FloatingActionButton } from "@/components/ui";
import AmountInputScreen from "@/screens/transactions/AmountInputScreen";
import TransactionFormScreen from "@/screens/transactions/TransactionFormScreen";

export default function TabLayout() {
  const [showAmountInput, setShowAmountInput] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [transactionAmount, setTransactionAmount] = useState("0.00");
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
          setTransactionAmount(amount);
          setShowAmountInput(false);
          setShowAddTransaction(true);
        }}
      />

      {/* Add Transaction Screen */}
      {showAddTransaction && (
        <View
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <TransactionFormScreen
            initialAmount={transactionAmount}
            onClose={() => setShowAddTransaction(false)}
            onSuccess={() => {
              setShowAddTransaction(false);
              setTransactionAmount("0.00");
            }}
          />
        </View>
      )}
    </View>
  );
}
