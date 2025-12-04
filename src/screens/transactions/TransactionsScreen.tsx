import { useState, useCallback, useMemo } from "react";
import { ScrollView, RefreshControl, Alert, Modal, View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { useThemeColors } from "@/constants/theme";
import { useTransactionsData } from "./hooks/useTransactionsData";
import { buildTypeMeta } from "./utils/typeMeta";
import { TransactionsHeader } from "./components/TransactionsHeader";
import { SummarySection } from "./components/SummarySection";
import { TransactionsList } from "./components/TransactionsList";
import { EmptyState } from "./components/EmptyState";
import { TransactionActionSheet } from "./components/TransactionActionSheet";
import { Transaction } from "@/types/transaction";
import { supabase } from "@/lib/supabase";
import TransactionFormScreen from "./TransactionFormScreen";

export default function TransactionsScreen() {
  const colors = useThemeColors();
  const typeMeta = buildTypeMeta(colors);

  const { session } = useSupabaseSession();
  const {
    loading,
    refreshing,
    currentDateRange,
    filteredAndGroupedTransactions,
    handleRefresh,
    handlePreviousPeriod,
    handleNextPeriod,
  } = useTransactionsData(session);

  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  const handleTransactionPress = useCallback((transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowActionSheet(true);
  }, []);

  const handleCloseActionSheet = useCallback(() => {
    setShowActionSheet(false);
    setSelectedTransaction(null);
  }, []);

  const handleEditTransaction = useCallback((transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowActionSheet(false);
    setShowTransactionForm(true);
  }, []);

  const handleDeleteTransaction = useCallback(
    (transaction: Transaction) => {
      Alert.alert(
        "Delete Transaction",
        `Are you sure you want to delete "${transaction.note}"?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                const { error } = await supabase
                  .from("transactions")
                  .delete()
                  .eq("id", transaction.id)
                  .eq("user_id", session?.user.id);

                if (error) throw error;

                Alert.alert("Success", "Transaction deleted successfully");
                handleRefresh();
              } catch (error: any) {
                Alert.alert(
                  "Error",
                  error.message || "Failed to delete transaction"
                );
              }
            },
          },
        ]
      );
    },
    [handleRefresh, session?.user.id]
  );

  // Swipe gesture handler for navigating between months
  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-10, 10]) // Activate when horizontal movement exceeds 10px
        .failOffsetY([-5, 5]) // Fail if vertical movement exceeds 5px (prevents interference with ScrollView)
        .onEnd((event) => {
          const { translationX } = event;
          // Swipe left (positive translationX) = next month
          if (translationX < -50) {
            runOnJS(handleNextPeriod)();
          }
          // Swipe right (negative translationX) = previous month
          else if (translationX > 50) {
            runOnJS(handlePreviousPeriod)();
          }
        }),
    [handleNextPeriod, handlePreviousPeriod]
  );

  const totalCount = filteredAndGroupedTransactions.reduce(
    (sum, group) => sum + group.transactions.length,
    0
  );

  // Flatten filtered transactions for income/expense calculation
  const filteredTransactions = filteredAndGroupedTransactions.flatMap(
    (group) => group.transactions
  );

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: colors.background.DEFAULT }}
    >
      <GestureDetector gesture={swipeGesture}>
        <ScrollView
          className="flex-1"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary.DEFAULT}
            />
          }
        >
          <TransactionsHeader
            totalCount={totalCount}
            colors={colors}
            currentDateRange={currentDateRange}
            onPrev={handlePreviousPeriod}
            onNext={handleNextPeriod}
          />

          <SummarySection
            filteredTransactions={filteredTransactions}
            colors={colors}
            loading={loading || refreshing}
          />

          {loading && !refreshing ? (
            <View className="py-8 items-center justify-center">
              <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
            </View>
          ) : filteredAndGroupedTransactions.length > 0 ? (
            <TransactionsList
              grouped={filteredAndGroupedTransactions}
              colors={colors}
              typeMeta={typeMeta}
              onTransactionPress={handleTransactionPress}
            />
          ) : (
            <EmptyState colors={colors} />
          )}
        </ScrollView>
      </GestureDetector>

      <TransactionActionSheet
        visible={showActionSheet}
        transaction={selectedTransaction}
        colors={colors}
        typeMeta={typeMeta}
        onClose={handleCloseActionSheet}
        onEdit={handleEditTransaction}
        onDelete={handleDeleteTransaction}
      />

      {/* Transaction Form Screen (for editing) */}
      <Modal
        visible={showTransactionForm}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          setShowTransactionForm(false);
          setEditingTransaction(null);
        }}
      >
        <BottomSheetModalProvider>
          <TransactionFormScreen
            transaction={editingTransaction}
            onClose={() => {
              setShowTransactionForm(false);
              setEditingTransaction(null);
            }}
            onSuccess={() => {
              setShowTransactionForm(false);
              setEditingTransaction(null);
              handleRefresh();
            }}
          />
        </BottomSheetModalProvider>
      </Modal>
    </SafeAreaView>
  );
}
