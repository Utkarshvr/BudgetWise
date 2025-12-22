import { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useSupabaseSession } from "@/hooks";
import { useThemeColors } from "@/constants/theme";
import { buildTypeMeta } from "./utils/typeMeta";
import { TransactionsList } from "./components/TransactionsList";
import { SummarySection } from "./components/SummarySection";
import { EmptyState } from "./components/EmptyState";
import { TransactionActionSheet } from "./components/TransactionActionSheet";
import { Transaction } from "@/types/transaction";
import { supabase } from "@/lib";
import TransactionFormScreen from "./TransactionFormScreen";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Modal } from "react-native";

export default function SearchTransactionsScreen() {
  const colors = useThemeColors();
  const typeMeta = buildTypeMeta(colors);
  const { session } = useSupabaseSession();

  const [searchQuery, setSearchQuery] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  // Fetch all transactions for search
  const fetchAllTransactions = useCallback(async () => {
    if (!session?.user || !searchQuery.trim()) {
      setTransactions([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select(
          `
          *,
          from_account:accounts!from_account_id(id, name, type, currency),
          to_account:accounts!to_account_id(id, name, type, currency),
          category:categories(id, name, emoji, background_color, category_type)
        `
        )
        .eq("user_id", session.user.id)
        .ilike("note", `%${searchQuery.trim()}%`)
        .order("created_at", { ascending: false })
        .limit(100); // Limit to 100 results for performance

      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      console.error("Error searching transactions:", error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [session, searchQuery]);

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchAllTransactions();
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [fetchAllTransactions]);

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
    async (transaction: Transaction) => {
      try {
        const { error } = await supabase
          .from("transactions")
          .delete()
          .eq("id", transaction.id)
          .eq("user_id", session?.user.id);

        if (error) throw error;

        // Remove from local state
        setTransactions((prev) =>
          prev.filter((t) => t.id !== transaction.id)
        );
        setShowActionSheet(false);
        setSelectedTransaction(null);
      } catch (error: any) {
        console.error("Error deleting transaction:", error);
      }
    },
    [session?.user.id]
  );

  // Group transactions by date
  const filteredAndGroupedTransactions = useMemo(() => {
    const grouped: Record<string, Transaction[]> = {};
    transactions.forEach((transaction) => {
      const dateKey = new Date(transaction.created_at).toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(transaction);
    });

    return Object.entries(grouped)
      .sort(([dateA], [dateB]) => {
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      })
      .map(([date, transactions]) => ({
        date,
        transactions: transactions.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
      }));
  }, [transactions]);

  return (
    <>
      <Stack.Screen
        options={{
          title: "Search",
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
        {/* Search Input */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.background.DEFAULT,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.background.subtle,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          >
            <MaterialIcons
              name="search"
              size={20}
              color={colors.muted.foreground}
            />
            <TextInput
              style={{
                flex: 1,
                marginLeft: 8,
                fontSize: 16,
                color: colors.foreground,
              }}
              placeholder="Search transactions..."
              placeholderTextColor={colors.muted.foreground}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                style={{ padding: 4 }}
              >
                <MaterialIcons
                  name="close"
                  size={20}
                  color={colors.muted.foreground}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Results */}
        <ScrollView style={{ flex: 1 }}>
          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <ActivityIndicator
                size="large"
                color={colors.primary.DEFAULT}
              />
            </View>
          ) : searchQuery.trim().length === 0 ? (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <MaterialIcons
                name="search"
                size={48}
                color={colors.muted.foreground}
              />
              <Text
                style={{
                  marginTop: 16,
                  fontSize: 16,
                  color: colors.muted.foreground,
                }}
              >
                Start typing to search transactions
              </Text>
            </View>
          ) : filteredAndGroupedTransactions.length > 0 ? (
            <>
              <SummarySection
                filteredTransactions={transactions}
                colors={colors}
                loading={loading}
              />
              <TransactionsList
                grouped={filteredAndGroupedTransactions}
                colors={colors}
                typeMeta={typeMeta}
                onTransactionPress={handleTransactionPress}
              />
            </>
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
                fetchAllTransactions();
              }}
            />
          </BottomSheetModalProvider>
        </Modal>
      </SafeAreaView>
    </>
  );
}

