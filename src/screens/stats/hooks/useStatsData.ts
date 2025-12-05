import { useState, useEffect, useMemo, useCallback } from "react";
import { Session } from "@supabase/supabase-js";
import { Alert } from "react-native";
import { supabase } from "@/lib/supabase";
import { Transaction } from "@/types/transaction";
import { getDateRangeForPeriod, DateRangeFilter } from "@/screens/transactions/utils/dateRange";
import { getErrorMessage } from "@/utils/errorHandler";

// 20 Income Category Colors (Darker Tones, Positive Palette)
const INCOME_CATEGORY_COLORS = [
  "#1E5024",
  "#153A1A",
  "#24692E",
  "#2F7A36",
  "#2B6B31",
  "#1D5F46",
  "#006B63",
  "#004E47",
  "#00564F",
  "#1A7B74",
  "#0E386F",
  "#082B5A",
  "#0F4391",
  "#1F2A5C",
  "#331F71",
  "#422783",
  "#2A3478",
  "#1558A2",
  "#0273A0",
  "#005B6A",
];
// 20 Expense Category Colors (Darker Tones, Warmer Palette)
const EXPENSE_CATEGORY_COLORS = [
  "#8F1F1F",
  "#751515",
  "#992424",
  "#B12C2C",
  "#C03E1B",
  "#8A2A0A",
  "#B35000",
  "#A23F00",
  "#C46200",
  "#D87300",
  "#4A342F",
  "#3E2B26",
  "#37241E",
  "#6E554C",
  "#5F473F",
  "#8B6E60",
  "#7F1242",
  "#6A0E36",
  "#7E1F78",
  "#5D1763",
];


export interface CategoryStat {
  categoryId: string | null;
  categoryName: string;
  categoryEmoji: string;
  categoryColor: string;
  totalAmount: number;
  percentage: number;
  currency: string;
}

export interface StatsData {
  incomeStats: CategoryStat[];
  expenseStats: CategoryStat[];
  totalIncome: number;
  totalExpense: number;
  currency: string;
}

export function useStatsData(
  session: Session | null,
  period: DateRangeFilter,
  referenceDate: Date
) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Calculate current date range based on period
  const currentDateRange = useMemo(() => {
    return getDateRangeForPeriod(period, referenceDate);
  }, [period, referenceDate]);

  const fetchTransactions = useCallback(async () => {
    if (!session?.user) return;

    const { start, end } = currentDateRange;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("transactions")
        .select(
          `
          *,
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
      const errorMessage = getErrorMessage(error, "Failed to fetch transactions");
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session, currentDateRange]);

  useEffect(() => {
    if (session) {
      fetchTransactions();
    }
  }, [session, fetchTransactions]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
  };

  // Process transactions into stats
  const statsData = useMemo((): StatsData => {
    // Separate income and expense transactions
    const incomeTransactions = transactions.filter(
      (t) => t.type === "income"
    );
    const expenseTransactions = transactions.filter(
      (t) => t.type === "expense"
    );

    // Group by category and calculate totals
    const processCategoryStats = (
      transactionList: Transaction[],
      isIncome: boolean
    ): CategoryStat[] => {
      const categoryMap = new Map<
        string,
        {
          categoryId: string | null;
          categoryName: string;
          categoryEmoji: string;
          totalAmount: number;
          currency: string;
        }
      >();

      transactionList.forEach((transaction) => {
        const categoryId = transaction.category_id || "uncategorized";
        const categoryName =
          transaction.category?.name || "Uncategorized";
        const categoryEmoji = transaction.category?.emoji || "📦";
        const amount = transaction.amount;
        const currency = transaction.currency || "INR";

        if (categoryMap.has(categoryId)) {
          const existing = categoryMap.get(categoryId)!;
          existing.totalAmount += amount;
        } else {
          categoryMap.set(categoryId, {
            categoryId,
            categoryName,
            categoryEmoji,
            totalAmount: amount,
            currency,
          });
        }
      });

      // Convert to array and calculate percentages
      const total = Array.from(categoryMap.values()).reduce(
        (sum, stat) => sum + stat.totalAmount,
        0
      );

      const colorPalette = isIncome ? INCOME_CATEGORY_COLORS : EXPENSE_CATEGORY_COLORS;

      return Array.from(categoryMap.values())
        .map((stat) => ({
          ...stat,
          percentage: total > 0 ? (stat.totalAmount / total) * 100 : 0,
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .map((stat, index) => ({
          ...stat,
          categoryColor: colorPalette[index % colorPalette.length],
        }));
    };

    const incomeStats = processCategoryStats(incomeTransactions, true);
    const expenseStats = processCategoryStats(expenseTransactions, false);

    const totalIncome = incomeTransactions.reduce(
      (sum, t) => sum + t.amount,
      0
    );
    const totalExpense = expenseTransactions.reduce(
      (sum, t) => sum + t.amount,
      0
    );

    // Get the most common currency (default to INR)
    const currencies = transactions.map((t) => t.currency || "INR");
    const currencyCounts = currencies.reduce(
      (acc, curr) => {
        acc[curr] = (acc[curr] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    const currency =
      Object.keys(currencyCounts).length > 0
        ? Object.entries(currencyCounts).sort((a, b) => b[1] - a[1])[0][0]
        : "INR";

    return {
      incomeStats,
      expenseStats,
      totalIncome,
      totalExpense,
      currency,
    };
  }, [transactions]);

  return {
    statsData,
    loading,
    refreshing,
    handleRefresh,
  };
}

