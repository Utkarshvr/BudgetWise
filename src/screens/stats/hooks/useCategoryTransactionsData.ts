import { useState, useEffect, useMemo, useCallback } from "react";
import { Session } from "@supabase/supabase-js";
import { Alert } from "react-native";
import { supabase } from "@/lib";
import { Transaction } from "@/types/transaction";
import { Category } from "@/types/category";
import {
  DateRangeFilter,
  getDateRangeForPeriod,
} from "@/screens/transactions/utils/dateRange";
import { getErrorMessage } from "@/utils";
import { useRefresh } from "@/contexts/RefreshContext";

type CategoryTransactionsParams = {
  categoryId: string;
  transactionType: "income" | "expense";
  period: DateRangeFilter;
  referenceDate: Date;
  accountIds: string[];
};

export function useCategoryTransactionsData(
  session: Session | null,
  params: CategoryTransactionsParams
) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { registerTransactionsRefresh } = useRefresh();

  const currentDateRange = useMemo(
    () => getDateRangeForPeriod(params.period, params.referenceDate),
    [params.period, params.referenceDate]
  );

  const fetchTransactions = useCallback(async () => {
    if (!session?.user) return;

    const { start, end } = currentDateRange;
    setLoading(true);

    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("id, name, parent_id")
        .eq("user_id", session.user.id);

      if (categoriesError) throw categoriesError;

      const categoriesMap = new Map<string, Category>();
      categoriesData?.forEach((cat) => {
        categoriesMap.set(cat.id, cat as Category);
      });

      const { data, error } = await supabase
        .from("transactions")
        .select(
          `
          *,
          from_account:accounts!from_account_id(id, name, type, currency),
          to_account:accounts!to_account_id(id, name, type, currency),
          category:categories(id, name, emoji, background_color, category_type, parent_id)
        `
        )
        .eq("user_id", session.user.id)
        .eq("type", params.transactionType)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      const enrichedTransactions = (data || []).map((transaction: any) => {
        if (transaction.category && transaction.category.parent_id) {
          const parentCategory = categoriesMap.get(
            transaction.category.parent_id
          );
          if (parentCategory) {
            transaction.category.parent = {
              id: parentCategory.id,
              name: parentCategory.name,
            } as Category;
          }
        }
        return transaction;
      });

      let filtered = enrichedTransactions;

      if (params.categoryId === "Other") {
        filtered = filtered.filter((t) => !t.category_id);
      } else {
        filtered = filtered.filter(
          (t) => t.category_id === params.categoryId
        );
      }

      if (params.accountIds.length > 0) {
        filtered = filtered.filter((transaction) => {
          const fromAccountMatch =
            transaction.from_account_id &&
            params.accountIds.includes(transaction.from_account_id);
          const toAccountMatch =
            transaction.to_account_id &&
            params.accountIds.includes(transaction.to_account_id);
          return fromAccountMatch || toAccountMatch;
        });
      }

      setTransactions(filtered);
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error, "Failed to fetch transactions");
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session, currentDateRange, params.categoryId, params.transactionType, params.accountIds]);

  useEffect(() => {
    if (session) {
      fetchTransactions();
    }
  }, [session, fetchTransactions]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    const cleanup = registerTransactionsRefresh(handleRefresh);
    return cleanup;
  }, [handleRefresh, registerTransactionsRefresh]);

  const groupedTransactions = useMemo(() => {
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
      .map(([date, txs]) => ({
        date,
        transactions: txs.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
      }));
  }, [transactions]);

  const totalAmount = useMemo(
    () => transactions.reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  );

  const currency = useMemo(() => {
    if (transactions.length === 0) return "INR";
    const counts = new Map<string, number>();
    transactions.forEach((t) => {
      const c = t.currency || "INR";
      counts.set(c, (counts.get(c) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }, [transactions]);

  return {
    transactions,
    groupedTransactions,
    totalAmount,
    currency,
    loading,
    refreshing,
    handleRefresh,
  };
}
