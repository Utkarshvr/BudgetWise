import { useState, useEffect, useMemo, useCallback } from "react";
import { Session } from "@supabase/supabase-js";
import { Alert } from "react-native";
import { supabase } from "@/lib/supabase";
import { Transaction } from "@/types/transaction";
import { getDateRangeForPeriod } from "../utils/dateRange";

export function useTransactionsData(session: Session | null) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPeriodDate, setCurrentPeriodDate] = useState(new Date());

  // Calculate current date range (always month)
  const currentDateRange = useMemo(() => {
    return getDateRangeForPeriod("month", currentPeriodDate);
  }, [currentPeriodDate]);

  const fetchTransactions = useCallback(async () => {
    if (!session?.user) return;

    const { start, end } = currentDateRange;
    
    // Set loading state
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
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to fetch transactions");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session, currentDateRange]);

  // Fetch transactions when session or date range changes
  useEffect(() => {
    if (session) {
      fetchTransactions();
    }
  }, [session, fetchTransactions]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
  };

  const handlePreviousPeriod = () => {
    const newDate = new Date(currentPeriodDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentPeriodDate(newDate);
  };

  const handleNextPeriod = () => {
    const newDate = new Date(currentPeriodDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentPeriodDate(newDate);
  };

  // Group transactions by date
  const filteredAndGroupedTransactions = useMemo(() => {
    // Group by date
    const grouped: Record<string, Transaction[]> = {};
    transactions.forEach((transaction) => {
      const dateKey = new Date(transaction.created_at).toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(transaction);
    });

    // Convert to array and sort by date (newest first)
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

  return {
    transactions,
    loading,
    refreshing,
    currentPeriodDate,
    setCurrentPeriodDate,
    currentDateRange,
    filteredAndGroupedTransactions,
    handleRefresh,
    handlePreviousPeriod,
    handleNextPeriod,
  };
}

