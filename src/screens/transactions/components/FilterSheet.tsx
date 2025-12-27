import { useEffect, useMemo, useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { Account } from "@/types/account";
import { Category } from "@/types/category";
import { Transaction } from "@/types/transaction";
import { type ThemeColors } from "@/constants/theme";
import { useSupabaseSession } from "@/hooks";
import { supabase } from "@/lib";
import { getErrorMessage } from "@/utils";
import { formatAmount } from "../utils/formatting";

type FilterSheetProps = {
  visible: boolean;
  colors: ThemeColors;
  selectedAccountIds: string[];
  selectedCategoryIds: string[];
  currentDateRange: { start: Date; end: Date };
  onClose: () => void;
  onApply: (accountIds: string[], categoryIds: string[]) => void;
};

type TabType = "income" | "expense" | "account";

export function FilterSheet({
  visible,
  colors,
  selectedAccountIds,
  selectedCategoryIds,
  currentDateRange,
  onClose,
  onApply,
}: FilterSheetProps) {
  const { session } = useSupabaseSession();
  const [activeTab, setActiveTab] = useState<TabType>("expense");

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [tempSelectedAccountIds, setTempSelectedAccountIds] =
    useState<string[]>(selectedAccountIds);
  const [tempSelectedCategoryIds, setTempSelectedCategoryIds] =
    useState<string[]>(selectedCategoryIds);

  useEffect(() => {
    if (visible) {
      // Reset temp selections to current selections when opening
      setTempSelectedAccountIds(selectedAccountIds);
      setTempSelectedCategoryIds(selectedCategoryIds);
      fetchData();
    }
  }, [visible, selectedAccountIds, selectedCategoryIds]);

  const fetchData = async () => {
    if (!session?.user) return;

    setLoading(true);
    try {
      // Fetch accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", session.user.id)
        .order("name", { ascending: true });

      if (accountsError) throw accountsError;

      // Fetch categories (both income and expense, exclude archived)
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("is_archived", false)
        .order("name", { ascending: true });

      if (categoriesError) throw categoriesError;

      // Fetch transactions for the selected month
      const { start, end } = currentDateRange;
      const { data: transactionsData, error: transactionsError } =
        await supabase
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
          .lte("created_at", end.toISOString());

      if (transactionsError) throw transactionsError;

      setAccounts(accountsData || []);
      setCategories(categoriesData || []);
      setTransactions(transactionsData || []);
    } catch (error: any) {
      const errorMessage = getErrorMessage(
        error,
        "Failed to fetch filter data"
      );
      console.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleAccount = (accountId: string) => {
    setTempSelectedAccountIds((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  };

  const toggleCategory = (categoryId: string) => {
    setTempSelectedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleAll = () => {
    if (activeTab === "account") {
      if (tempSelectedAccountIds.length === accounts.length) {
        setTempSelectedAccountIds([]);
      } else {
        setTempSelectedAccountIds(accounts.map((acc) => acc.id));
      }
    } else {
      const relevantCategories =
        activeTab === "income" ? incomeCategories : expenseCategories;
      const othersId =
        activeTab === "income" ? "others_income" : "others_expense";
      const hasOthers = tempSelectedCategoryIds.includes(othersId);
      const hasOthersTotal =
        categoryTotals[othersId] && categoryTotals[othersId] > 0;

      // Check if all categories (including Others if it exists) are selected
      const allCategoryIds = relevantCategories.map((cat) => cat.id);
      if (hasOthersTotal) {
        allCategoryIds.push(othersId);
      }
      const allSelected = allCategoryIds.every((id) =>
        tempSelectedCategoryIds.includes(id)
      );

      if (allSelected) {
        // Deselect all
        setTempSelectedCategoryIds(
          tempSelectedCategoryIds.filter((id) => !allCategoryIds.includes(id))
        );
      } else {
        // Select all
        const newIds = [
          ...tempSelectedCategoryIds,
          ...allCategoryIds.filter(
            (id) => !tempSelectedCategoryIds.includes(id)
          ),
        ];
        setTempSelectedCategoryIds(newIds);
      }
    }
  };

  const handleApply = () => {
    onApply(tempSelectedAccountIds, tempSelectedCategoryIds);
    onClose();
  };

  const handleClear = () => {
    setTempSelectedAccountIds([]);
    setTempSelectedCategoryIds([]);
  };

  const incomeCategories = useMemo(
    () => categories.filter((cat) => cat.category_type === "income"),
    [categories]
  );

  const expenseCategories = useMemo(
    () => categories.filter((cat) => cat.category_type === "expense"),
    [categories]
  );

  // Calculate totals for each category (filtered by selected accounts if any)
  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    let othersIncome = 0;
    let othersExpense = 0;

    // Filter transactions by selected accounts if any are selected
    const filteredTransactions = transactions.filter((transaction) => {
      if (tempSelectedAccountIds.length === 0) {
        return true; // No account filter, include all
      }

      // Check if transaction involves any selected account
      const fromAccountMatch =
        transaction.from_account_id &&
        tempSelectedAccountIds.includes(transaction.from_account_id);
      const toAccountMatch =
        transaction.to_account_id &&
        tempSelectedAccountIds.includes(transaction.to_account_id);

      return fromAccountMatch || toAccountMatch;
    });

    filteredTransactions.forEach((transaction) => {
      if (transaction.category_id) {
        const current = totals[transaction.category_id] || 0;
        if (transaction.type === "income" || transaction.type === "expense") {
          totals[transaction.category_id] = current + transaction.amount;
        }
      } else if (
        transaction.type === "income" ||
        transaction.type === "expense"
      ) {
        // Track transactions with no category
        if (transaction.type === "income") {
          othersIncome += transaction.amount;
        } else {
          othersExpense += transaction.amount;
        }
      }
    });

    // Add "Others" totals
    if (othersIncome > 0) {
      totals["others_income"] = othersIncome;
    }
    if (othersExpense > 0) {
      totals["others_expense"] = othersExpense;
    }

    return totals;
  }, [transactions, tempSelectedAccountIds]);

  // Calculate totals for each account (income and expense separately)
  const accountTotals = useMemo(() => {
    const totals: Record<
      string,
      { income: number; expense: number; currency: string }
    > = {};
    transactions.forEach((transaction) => {
      const currency = transaction.currency || "INR";
      if (transaction.type === "income" && transaction.to_account_id) {
        if (!totals[transaction.to_account_id]) {
          totals[transaction.to_account_id] = {
            income: 0,
            expense: 0,
            currency,
          };
        }
        totals[transaction.to_account_id].income += transaction.amount;
      } else if (
        transaction.type === "expense" &&
        transaction.from_account_id
      ) {
        if (!totals[transaction.from_account_id]) {
          totals[transaction.from_account_id] = {
            income: 0,
            expense: 0,
            currency,
          };
        }
        totals[transaction.from_account_id].expense += transaction.amount;
      } else if (transaction.type === "transfer") {
        // For transfers, count as expense from from_account and income to to_account
        if (transaction.from_account_id) {
          if (!totals[transaction.from_account_id]) {
            totals[transaction.from_account_id] = {
              income: 0,
              expense: 0,
              currency,
            };
          }
          totals[transaction.from_account_id].expense += transaction.amount;
        }
        if (transaction.to_account_id) {
          if (!totals[transaction.to_account_id]) {
            totals[transaction.to_account_id] = {
              income: 0,
              expense: 0,
              currency,
            };
          }
          totals[transaction.to_account_id].income += transaction.amount;
        }
      }
    });
    return totals;
  }, [transactions]);

  // Calculate all totals (for percentage calculation)
  const allTotals = useMemo(() => {
    let income = 0;
    let expense = 0;
    let currency = "INR";

    transactions.forEach((transaction) => {
      if (transaction.type === "income") {
        income += transaction.amount;
        if (currency === "INR" && transaction.currency) {
          currency = transaction.currency;
        }
      } else if (transaction.type === "expense") {
        expense += transaction.amount;
        if (currency === "INR" && transaction.currency) {
          currency = transaction.currency;
        }
      }
    });

    return { income, expense, currency };
  }, [transactions]);

  // Calculate filtered summary totals based on selected filters
  const summaryTotals = useMemo(() => {
    let filteredIncome = 0;
    let filteredExpense = 0;
    let currency = "INR";

    // If no filters are selected, show 0%
    const hasFilters =
      tempSelectedAccountIds.length > 0 || tempSelectedCategoryIds.length > 0;

    if (!hasFilters) {
      return {
        income: 0,
        expense: 0,
        total: 0,
        currency: allTotals.currency,
        incomePercent: 0,
        expensePercent: 0,
      };
    }

    // Filter transactions based on selected accounts and categories
    const filteredTransactions = transactions.filter((transaction) => {
      // Filter by accounts
      if (tempSelectedAccountIds.length > 0) {
        const accountMatch =
          (transaction.from_account_id &&
            tempSelectedAccountIds.includes(transaction.from_account_id)) ||
          (transaction.to_account_id &&
            tempSelectedAccountIds.includes(transaction.to_account_id));
        if (!accountMatch) return false;
      }

      // Filter by categories
      if (tempSelectedCategoryIds.length > 0) {
        const hasOthersIncome =
          tempSelectedCategoryIds.includes("others_income");
        const hasOthersExpense =
          tempSelectedCategoryIds.includes("others_expense");

        // If transaction has no category, check if "Others" is selected
        if (!transaction.category_id) {
          if (transaction.type === "income" && !hasOthersIncome) {
            return false;
          }
          if (transaction.type === "expense" && !hasOthersExpense) {
            return false;
          }
        } else {
          // If transaction has a category, check if it's selected
          if (!tempSelectedCategoryIds.includes(transaction.category_id)) {
            return false;
          }
        }
      }

      return true;
    });

    filteredTransactions.forEach((transaction) => {
      if (transaction.type === "income") {
        filteredIncome += transaction.amount;
        if (currency === "INR" && transaction.currency) {
          currency = transaction.currency;
        }
      } else if (transaction.type === "expense") {
        filteredExpense += transaction.amount;
        if (currency === "INR" && transaction.currency) {
          currency = transaction.currency;
        }
      }
    });

    const total = filteredIncome - filteredExpense;

    // Calculate percentages: filtered amount / total amount * 100
    const incomePercent =
      allTotals.income > 0 ? (filteredIncome / allTotals.income) * 100 : 0;
    const expensePercent =
      allTotals.expense > 0 ? (filteredExpense / allTotals.expense) * 100 : 0;

    return {
      income: filteredIncome,
      expense: filteredExpense,
      total,
      currency,
      incomePercent,
      expensePercent,
    };
  }, [
    transactions,
    tempSelectedAccountIds,
    tempSelectedCategoryIds,
    allTotals,
  ]);

  const hasActiveFilters =
    selectedAccountIds.length > 0 || selectedCategoryIds.length > 0;

  // Check if filters are dirty (different from initial state)
  const isDirty = useMemo(() => {
    const accountsChanged =
      tempSelectedAccountIds.length !== selectedAccountIds.length ||
      !tempSelectedAccountIds.every((id) => selectedAccountIds.includes(id)) ||
      !selectedAccountIds.every((id) => tempSelectedAccountIds.includes(id));

    const categoriesChanged =
      tempSelectedCategoryIds.length !== selectedCategoryIds.length ||
      !tempSelectedCategoryIds.every((id) =>
        selectedCategoryIds.includes(id)
      ) ||
      !selectedCategoryIds.every((id) => tempSelectedCategoryIds.includes(id));

    return accountsChanged || categoriesChanged;
  }, [
    tempSelectedAccountIds,
    tempSelectedCategoryIds,
    selectedAccountIds,
    selectedCategoryIds,
  ]);

  // Group accounts by type
  const groupedAccounts = useMemo(() => {
    const grouped: Record<string, Account[]> = {};
    accounts.forEach((account) => {
      const type =
        account.type === "cash"
          ? "Cash"
          : account.type === "checking" || account.type === "savings"
            ? "Accounts"
            : "Card";
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(account);
    });
    return grouped;
  }, [accounts]);

  const isAllSelected = useMemo(() => {
    if (activeTab === "account") {
      return (
        tempSelectedAccountIds.length === accounts.length && accounts.length > 0
      );
    } else {
      const relevantCategories =
        activeTab === "income" ? incomeCategories : expenseCategories;
      const othersId =
        activeTab === "income" ? "others_income" : "others_expense";
      const hasOthersTotal =
        categoryTotals[othersId] && categoryTotals[othersId] > 0;

      const allCategoryIds = relevantCategories.map((cat) => cat.id);
      if (hasOthersTotal) {
        allCategoryIds.push(othersId);
      }

      return (
        allCategoryIds.length > 0 &&
        allCategoryIds.every((id) => tempSelectedCategoryIds.includes(id))
      );
    }
  }, [
    activeTab,
    tempSelectedAccountIds,
    tempSelectedCategoryIds,
    accounts,
    incomeCategories,
    expenseCategories,
    categoryTotals,
  ]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: colors.background.DEFAULT,
        }}
      >
        {/* Fixed Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.background.DEFAULT,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: colors.foreground,
            }}
          >
            Filter Transactions
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {(tempSelectedAccountIds.length > 0 ||
              tempSelectedCategoryIds.length > 0) && (
              <TouchableOpacity
                onPress={handleClear}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: colors.background.subtle,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: colors.foreground,
                  }}
                >
                  Clear All
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleApply}
              disabled={!isDirty}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: isDirty
                  ? colors.primary.DEFAULT
                  : colors.background.subtle,
                opacity: isDirty ? 1 : 0.5,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: isDirty ? "#ffffff" : colors.muted.foreground,
                }}
              >
                Apply
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Fixed Summary Section */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 20,
            flexDirection: "row",
            alignItems: "center",
            gap: 20,
            backgroundColor: colors.background.DEFAULT,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          {/* Income Circle */}
          <View style={{ alignItems: "center", flex: 1 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                borderWidth: 8,
                borderColor: colors.transaction.income.badgeIcon,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.transaction.income.badgeIcon,
                }}
              >
                {Math.round(summaryTotals.incomePercent)}%
              </Text>
            </View>
            <Text
              style={{
                fontSize: 12,
                color: colors.muted.foreground,
                marginBottom: 4,
              }}
            >
              Income
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: colors.transaction.income.badgeIcon,
              }}
            >
              {formatAmount(summaryTotals.income, summaryTotals.currency)}
            </Text>
          </View>

          {/* Expense Circle */}
          <View style={{ alignItems: "center", flex: 1 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                borderWidth: 8,
                borderColor: colors.transaction.expense.badgeIcon,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.transaction.expense.badgeIcon,
                }}
              >
                {Math.round(summaryTotals.expensePercent)}%
              </Text>
            </View>
            <Text
              style={{
                fontSize: 12,
                color: colors.muted.foreground,
                marginBottom: 4,
              }}
            >
              Expenses
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: colors.transaction.expense.badgeIcon,
              }}
            >
              {formatAmount(summaryTotals.expense, summaryTotals.currency)}
            </Text>
          </View>

          {/* Total */}
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Text
              style={{
                fontSize: 12,
                color: colors.muted.foreground,
                marginBottom: 4,
              }}
            >
              Total
            </Text>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color:
                  summaryTotals.total >= 0
                    ? colors.transaction.income.badgeIcon
                    : colors.transaction.expense.badgeIcon,
              }}
            >
              {formatAmount(summaryTotals.total, summaryTotals.currency)}
            </Text>
          </View>
        </View>

        {/* Fixed Tabs */}
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.background.DEFAULT,
          }}
        >
          <TouchableOpacity
            onPress={() => setActiveTab("income")}
            style={{
              flex: 1,
              paddingVertical: 12,
              alignItems: "center",
              borderBottomWidth: activeTab === "income" ? 2 : 0,
              borderBottomColor:
                activeTab === "income" ? colors.primary.DEFAULT : "transparent",
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: activeTab === "income" ? "600" : "400",
                color:
                  activeTab === "income"
                    ? colors.primary.DEFAULT
                    : colors.muted.foreground,
              }}
            >
              INCOME
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("expense")}
            style={{
              flex: 1,
              paddingVertical: 12,
              alignItems: "center",
              borderBottomWidth: activeTab === "expense" ? 2 : 0,
              borderBottomColor:
                activeTab === "expense"
                  ? colors.primary.DEFAULT
                  : "transparent",
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: activeTab === "expense" ? "600" : "400",
                color:
                  activeTab === "expense"
                    ? colors.primary.DEFAULT
                    : colors.muted.foreground,
              }}
            >
              EXPENSES
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("account")}
            style={{
              flex: 1,
              paddingVertical: 12,
              alignItems: "center",
              borderBottomWidth: activeTab === "account" ? 2 : 0,
              borderBottomColor:
                activeTab === "account"
                  ? colors.primary.DEFAULT
                  : "transparent",
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: activeTab === "account" ? "600" : "400",
                color:
                  activeTab === "account"
                    ? colors.primary.DEFAULT
                    : colors.muted.foreground,
              }}
            >
              ACCOUNT
            </Text>
          </TouchableOpacity>
        </View>

        {/* Scrollable Content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          {/* Content */}
          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
            </View>
          ) : (
            <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
              {/* All checkbox */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <TouchableOpacity
                  onPress={toggleAll}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderWidth: 2,
                      borderColor: isAllSelected
                        ? colors.primary.DEFAULT
                        : colors.border,
                      borderRadius: 4,
                      backgroundColor: isAllSelected
                        ? colors.primary.DEFAULT
                        : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isAllSelected && (
                      <MaterialIcons name="check" size={14} color="#ffffff" />
                    )}
                  </View>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "500",
                      color: colors.foreground,
                    }}
                  >
                    All
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Account Tab Content */}
              {activeTab === "account" && (
                <View style={{ gap: 24 }}>
                  {accounts.length === 0 ? (
                    <Text
                      style={{
                        color: colors.muted.foreground,
                        fontSize: 14,
                        fontStyle: "italic",
                        textAlign: "center",
                        paddingVertical: 20,
                      }}
                    >
                      No accounts available
                    </Text>
                  ) : (
                    Object.entries(groupedAccounts)
                      .filter(([_, groupAccounts]) => groupAccounts.length > 0)
                      .map(([groupName, groupAccounts]) => (
                        <View key={groupName}>
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "600",
                              color: colors.foreground,
                              marginBottom: 12,
                            }}
                          >
                            {groupName}
                          </Text>
                          <View style={{ gap: 8 }}>
                            {groupAccounts.map((account) => {
                              const isSelected =
                                tempSelectedAccountIds.includes(account.id);
                              const totals = accountTotals[account.id] || {
                                income: 0,
                                expense: 0,
                                currency: account.currency,
                              };
                              return (
                                <TouchableOpacity
                                  key={account.id}
                                  onPress={() => toggleAccount(account.id)}
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    paddingVertical: 12,
                                    paddingHorizontal: 12,
                                    borderRadius: 8,
                                    backgroundColor: colors.background.subtle,
                                  }}
                                >
                                  <View
                                    style={{
                                      width: 20,
                                      height: 20,
                                      borderWidth: 2,
                                      borderColor: isSelected
                                        ? colors.primary.DEFAULT
                                        : colors.border,
                                      borderRadius: 4,
                                      backgroundColor: isSelected
                                        ? colors.primary.DEFAULT
                                        : "transparent",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      marginRight: 12,
                                    }}
                                  >
                                    {isSelected && (
                                      <MaterialIcons
                                        name="check"
                                        size={14}
                                        color="#ffffff"
                                      />
                                    )}
                                  </View>
                                  <Text
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                    style={{
                                      fontSize: 14,
                                      color: colors.foreground,
                                      flex: 1,
                                    }}
                                  >
                                    {account.name}
                                  </Text>
                                  <View
                                    style={{
                                      flexDirection: "row",
                                      alignItems: "center",
                                      gap: 12,
                                    }}
                                  >
                                    <Text
                                      style={{
                                        fontSize: 14,
                                        color:
                                          colors.transaction.income.badgeIcon,
                                      }}
                                    >
                                      {formatAmount(
                                        totals.income,
                                        totals.currency
                                      )}
                                    </Text>
                                    <Text
                                      style={{
                                        fontSize: 14,
                                        color:
                                          colors.transaction.expense.badgeIcon,
                                      }}
                                    >
                                      {formatAmount(
                                        totals.expense,
                                        totals.currency
                                      )}
                                    </Text>
                                  </View>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      ))
                  )}
                </View>
              )}

              {/* Income/Expense Categories Tab Content */}
              {(activeTab === "income" || activeTab === "expense") && (
                <View style={{ gap: 8 }}>
                  {(activeTab === "income"
                    ? incomeCategories
                    : expenseCategories
                  ).length === 0 ? (
                    <Text
                      style={{
                        color: colors.muted.foreground,
                        fontSize: 14,
                        fontStyle: "italic",
                        textAlign: "center",
                        paddingVertical: 20,
                      }}
                    >
                      No {activeTab === "income" ? "income" : "expense"}{" "}
                      categories available
                    </Text>
                  ) : (
                    (activeTab === "income"
                      ? incomeCategories
                      : expenseCategories
                    ).map((category) => {
                      const isSelected = tempSelectedCategoryIds.includes(
                        category.id
                      );
                      const total = categoryTotals[category.id] || 0;
                      // Find currency from filtered transactions (by account if selected)
                      const filteredForCurrency =
                        tempSelectedAccountIds.length > 0
                          ? transactions.filter((t) => {
                              const fromMatch =
                                t.from_account_id &&
                                tempSelectedAccountIds.includes(
                                  t.from_account_id
                                );
                              const toMatch =
                                t.to_account_id &&
                                tempSelectedAccountIds.includes(
                                  t.to_account_id
                                );
                              return (
                                (fromMatch || toMatch) &&
                                t.category_id === category.id
                              );
                            })
                          : transactions.filter(
                              (t) => t.category_id === category.id
                            );
                      const currency =
                        filteredForCurrency[0]?.currency || "INR";
                      return (
                        <TouchableOpacity
                          key={category.id}
                          onPress={() => toggleCategory(category.id)}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            paddingVertical: 12,
                            paddingHorizontal: 12,
                            borderRadius: 8,
                            backgroundColor: colors.background.subtle,
                          }}
                        >
                          <View
                            style={{
                              width: 20,
                              height: 20,
                              borderWidth: 2,
                              borderColor: isSelected
                                ? colors.primary.DEFAULT
                                : colors.border,
                              borderRadius: 4,
                              backgroundColor: isSelected
                                ? colors.primary.DEFAULT
                                : "transparent",
                              alignItems: "center",
                              justifyContent: "center",
                              marginRight: 12,
                            }}
                          >
                            {isSelected && (
                              <MaterialIcons
                                name="check"
                                size={14}
                                color="#ffffff"
                              />
                            )}
                          </View>
                          <View
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              backgroundColor: category.background_color,
                              alignItems: "center",
                              justifyContent: "center",
                              marginRight: 12,
                            }}
                          >
                            <Text style={{ fontSize: 16 }}>
                              {category.emoji}
                            </Text>
                          </View>
                          <Text
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            style={{
                              fontSize: 14,
                              color: colors.foreground,
                              flex: 1,
                            }}
                          >
                            {category.name}
                          </Text>
                          <Text
                            style={{
                              fontSize: 14,
                              color:
                                activeTab === "income"
                                  ? colors.transaction.income.badgeIcon
                                  : colors.transaction.expense.badgeIcon,
                            }}
                          >
                            {formatAmount(total, currency)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  )}

                  {/* Others Category */}
                  {(() => {
                    const othersId =
                      activeTab === "income"
                        ? "others_income"
                        : "others_expense";
                    const othersTotal = categoryTotals[othersId] || 0;
                    const hasOthersTotal = othersTotal > 0;

                    if (!hasOthersTotal) return null;

                    const isSelected =
                      tempSelectedCategoryIds.includes(othersId);
                    // Find currency from filtered transactions (by account if selected)
                    const filteredForCurrency =
                      tempSelectedAccountIds.length > 0
                        ? transactions.filter((t) => {
                            const fromMatch =
                              t.from_account_id &&
                              tempSelectedAccountIds.includes(
                                t.from_account_id
                              );
                            const toMatch =
                              t.to_account_id &&
                              tempSelectedAccountIds.includes(t.to_account_id);
                            return (
                              (fromMatch || toMatch) &&
                              !t.category_id &&
                              ((activeTab === "income" &&
                                t.type === "income") ||
                                (activeTab === "expense" &&
                                  t.type === "expense"))
                            );
                          })
                        : transactions.filter(
                            (t) =>
                              !t.category_id &&
                              ((activeTab === "income" &&
                                t.type === "income") ||
                                (activeTab === "expense" &&
                                  t.type === "expense"))
                          );
                    const currency = filteredForCurrency[0]?.currency || "INR";

                    return (
                      <TouchableOpacity
                        key={othersId}
                        onPress={() => toggleCategory(othersId)}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingVertical: 12,
                          paddingHorizontal: 12,
                          borderRadius: 8,
                          backgroundColor: colors.background.subtle,
                        }}
                      >
                        <View
                          style={{
                            width: 20,
                            height: 20,
                            borderWidth: 2,
                            borderColor: isSelected
                              ? colors.primary.DEFAULT
                              : colors.border,
                            borderRadius: 4,
                            backgroundColor: isSelected
                              ? colors.primary.DEFAULT
                              : "transparent",
                            alignItems: "center",
                            justifyContent: "center",
                            marginRight: 12,
                          }}
                        >
                          {isSelected && (
                            <MaterialIcons
                              name="check"
                              size={14}
                              color="#ffffff"
                            />
                          )}
                        </View>
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            backgroundColor: colors.categoryBackgroundColor,
                            alignItems: "center",
                            justifyContent: "center",
                            marginRight: 12,
                          }}
                        >
                          {activeTab === "income" ? (
                            <MaterialIcons
                              name="arrow-outward"
                              size={18}
                              color={colors.transaction.income.badgeIcon}
                              style={{ transform: [{ rotate: "180deg" }] }}
                            />
                          ) : (
                            <MaterialIcons
                              name="arrow-outward"
                              size={18}
                              color={colors.transaction.expense.badgeIcon}
                            />
                          )}
                        </View>
                        <Text
                          numberOfLines={1}
                          ellipsizeMode="tail"
                          style={{
                            fontSize: 14,
                            color: colors.foreground,
                            flex: 1,
                          }}
                        >
                          Others
                        </Text>
                        <Text
                          style={{
                            fontSize: 14,
                            color:
                              activeTab === "income"
                                ? colors.transaction.income.badgeIcon
                                : colors.transaction.expense.badgeIcon,
                          }}
                        >
                          {formatAmount(othersTotal, currency)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })()}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
