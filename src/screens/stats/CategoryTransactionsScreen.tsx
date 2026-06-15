import { useState, useCallback, useMemo } from "react";
import {
  ScrollView,
  RefreshControl,
  View,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { useSupabaseSession } from "@/hooks";
import { useThemeColors } from "@/constants/theme";
import { useRefresh } from "@/contexts/RefreshContext";
import { buildTypeMeta } from "@/screens/transactions/utils/typeMeta";
import { TransactionsList } from "@/screens/transactions/components/TransactionsList";
import { SummarySection } from "@/screens/transactions/components/SummarySection";
import { EmptyState } from "@/screens/transactions/components/EmptyState";
import { TransactionActionSheet } from "@/screens/transactions/components/TransactionActionSheet";
import { Transaction } from "@/types/transaction";
import { DateRangeFilter } from "@/screens/transactions/utils/dateRange";
import { supabase } from "@/lib";
import { useCategoryTransactionsData } from "./hooks/useCategoryTransactionsData";

export default function CategoryTransactionsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const typeMeta = buildTypeMeta(colors);
  const { session } = useSupabaseSession();
  const { refreshAll, refreshAccounts } = useRefresh();

  const params = useLocalSearchParams<{
    categoryId: string;
    categoryName: string;
    categoryEmoji: string;
    type: "income" | "expense";
    period: DateRangeFilter;
    referenceDate: string;
    accountIds: string;
  }>();

  const categoryId = params.categoryId ?? "Other";
  const categoryName = params.categoryName ?? "Other";
  const categoryEmoji = params.categoryEmoji ?? "📦";
  const transactionType = params.type ?? "expense";
  const period = (params.period ?? "month") as DateRangeFilter;
  const referenceDate = useMemo(
    () => new Date(params.referenceDate ?? new Date().toISOString()),
    [params.referenceDate]
  );
  const accountIds = useMemo(
    () => (params.accountIds ? JSON.parse(params.accountIds) : []),
    [params.accountIds]
  );

  const {
    transactions,
    groupedTransactions,
    loading,
    refreshing,
    handleRefresh,
  } = useCategoryTransactionsData(session, {
    categoryId,
    transactionType,
    period,
    referenceDate,
    accountIds,
  });

  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);

  const screenTitle = `${categoryEmoji} ${categoryName}`;

  const handleTransactionPress = useCallback((transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowActionSheet(true);
  }, []);

  const handleCloseActionSheet = useCallback(() => {
    setShowActionSheet(false);
    setSelectedTransaction(null);
  }, []);

  const handleEditTransaction = useCallback(
    (transaction: Transaction) => {
      setShowActionSheet(false);
      router.push({
        pathname: "/(auth)/transaction-form",
        params: { transactionId: transaction.id },
      });
    },
    [router]
  );

  const handleDeleteTransaction = useCallback(
    (transaction: Transaction) => {
      Alert.alert(
        "Delete Transaction",
        `Are you sure you want to delete "${transaction.note}"?`,
        [
          { text: "Cancel", style: "cancel" },
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

                refreshAccounts();
                handleRefresh();
                refreshAll();
                Alert.alert("Success", "Transaction deleted successfully");
              } catch (error: unknown) {
                const message =
                  error instanceof Error
                    ? error.message
                    : "Failed to delete transaction";
                Alert.alert("Error", message);
              }
            },
          },
        ]
      );
    },
    [handleRefresh, session?.user.id, refreshAccounts, refreshAll]
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: screenTitle,
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.background.DEFAULT,
          },
          headerTintColor: colors.foreground,
          headerTitleStyle: {
            fontWeight: "600",
          },
        }}
      />
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.background.DEFAULT }}
        edges={["bottom"]}
      >
        <ScrollView
          style={{ flex: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary.DEFAULT}
            />
          }
        >
          <SummarySection
            filteredTransactions={transactions}
            colors={colors}
            loading={loading || refreshing}
          />

          {loading && !refreshing ? (
            <View className="py-8 items-center justify-center">
              <ActivityIndicator
                size="large"
                color={colors.primary.DEFAULT}
              />
            </View>
          ) : groupedTransactions.length > 0 ? (
            <TransactionsList
              grouped={groupedTransactions}
              colors={colors}
              typeMeta={typeMeta}
              onTransactionPress={handleTransactionPress}
            />
          ) : (
            <EmptyState colors={colors} />
          )}
        </ScrollView>

        <TransactionActionSheet
          visible={showActionSheet}
          transaction={selectedTransaction}
          colors={colors}
          typeMeta={typeMeta}
          onClose={handleCloseActionSheet}
          onEdit={handleEditTransaction}
          onDelete={handleDeleteTransaction}
        />
      </SafeAreaView>
    </>
  );
}
