import { useState, useEffect, useMemo } from "react";
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { Category, CategoryFormData } from "@/types/category";
import { Account } from "@/types/account";
import { CategoryFormSheet } from "./components/CategoryFormSheet";
import { PrimaryButton } from "@/screens/auth/components/PrimaryButton";

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) {
    return "Just now";
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

function formatCurrency(amount: number, currency: string | null | undefined): string {
  const mainUnit = (amount || 0) / 100;
  return `${currency || "INR"} ${mainUnit.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function CategoriesScreen() {
  const { session } = useSupabaseSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [formSheetVisible, setFormSheetVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fundModal, setFundModal] = useState<{
    visible: boolean;
    mode: "add" | "withdraw";
    category: Category | null;
    accountId: string | null;
  }>({ visible: false, mode: "add", category: null, accountId: null });
  const [fundAmount, setFundAmount] = useState("");
  const [fundError, setFundError] = useState<string | null>(null);
  const [fundSubmitting, setFundSubmitting] = useState(false);
  const accountFundTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    categories.forEach((category) => {
      if (
        category.category_type === "fund" &&
        category.fund_account_id
      ) {
        totals[category.fund_account_id] =
          (totals[category.fund_account_id] || 0) +
          (category.fund_balance || 0);
      }
    });
    return totals;
  }, [categories]);

  const getAccountAvailable = (accountId: string | null) => {
    if (!accountId) return 0;
    const account = accounts.find((acc) => acc.id === accountId);
    if (!account) return 0;
    const allocated = accountFundTotals[accountId] || 0;
    return Math.max(account.balance - allocated, 0);
  };

  useEffect(() => {
    if (session) {
      fetchCategories();
      fetchAccounts();
    }
  }, [session]);

  const fetchCategories = async () => {
    if (!session?.user) return;

    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to fetch categories");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAccounts = async () => {
    if (!session?.user) return;

    try {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", session.user.id)
        .order("name", { ascending: true });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      console.error("Failed to fetch accounts", error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCategories();
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    setFormSheetVisible(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setFormSheetVisible(true);
  };

  const handleDeleteCategory = (category: Category) => {
    Alert.alert(
      "Delete Category",
      `Are you sure you want to delete "${category.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("categories")
                .delete()
                .eq("id", category.id);

              if (error) throw error;
              fetchCategories();
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to delete category");
            }
          },
        },
      ]
    );
  };

  const handleSubmitCategory = async (formData: CategoryFormData) => {
    if (!session?.user) return;

    setSubmitting(true);
    try {
      if (editingCategory) {
        if (
          editingCategory.category_type === "fund" &&
          editingCategory.fund_balance > 0 &&
          formData.fund_account_id &&
          editingCategory.fund_account_id &&
          editingCategory.fund_account_id !== formData.fund_account_id
        ) {
          Alert.alert(
            "Account locked",
            "Move funds out before changing the linked account."
          );
          setSubmitting(false);
          return;
        }

        if (
          editingCategory.category_type === "fund" &&
          formData.category_type === "regular" &&
          editingCategory.fund_balance > 0
        ) {
          Alert.alert(
            "Balance remaining",
            "Withdraw all funds before converting this category."
          );
          setSubmitting(false);
          return;
        }

        // Update existing category
        const { error } = await supabase
          .from("categories")
          .update({
            name: formData.name.trim(),
            emoji: formData.emoji,
            background_color: formData.background_color,
            category_type: formData.category_type,
            fund_account_id:
              formData.category_type === "fund"
                ? formData.fund_account_id
                : null,
          })
          .eq("id", editingCategory.id);

        if (error) throw error;
      } else {
        // Create new category
        if (
          formData.category_type === "fund" &&
          formData.fund_account_id &&
          formData.initial_fund_amount.trim()
        ) {
          const initialAmountNum = parseFloat(formData.initial_fund_amount || "0");
          if (!isFinite(initialAmountNum) || initialAmountNum < 0) {
            Alert.alert("Invalid amount", "Enter a valid allocation amount.");
            setSubmitting(false);
            return;
          }
          const initialAmountSmallest = Math.round(initialAmountNum * 100);
          const available = getAccountAvailable(formData.fund_account_id);
          if (initialAmountSmallest > available) {
            Alert.alert(
              "Not enough balance",
              "This account doesn't have enough unallocated balance for that amount."
            );
            setSubmitting(false);
            return;
          }
        }

        const { data, error } = await supabase
          .from("categories")
          .insert({
            user_id: session.user.id,
            name: formData.name.trim(),
            emoji: formData.emoji,
            background_color: formData.background_color,
            category_type: formData.category_type,
            fund_account_id:
              formData.category_type === "fund"
                ? formData.fund_account_id
                : null,
          })
          .select()
          .single();

        if (error) throw error;

        const initialAmount = parseFloat(formData.initial_fund_amount || "0");
        if (
          data &&
          formData.category_type === "fund" &&
          initialAmount > 0 &&
          formData.fund_account_id
        ) {
          const amountSmallest = Math.round(initialAmount * 100);
          const { error: fundError } = await supabase.rpc(
            "adjust_category_fund_balance",
            {
              p_category_id: data.id,
              p_amount_delta: amountSmallest,
              p_account_id: formData.fund_account_id,
            }
          );
          if (fundError) throw fundError;
        }
      }

      setFormSheetVisible(false);
      setEditingCategory(null);
      fetchCategories();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save category");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-900 items-center justify-center">
        <ActivityIndicator size="large" color="#22c55e" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-900">
      <ScrollView
        className="flex-1 px-4 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#22c55e"
          />
        }
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-3xl font-bold text-white">Categories</Text>
          <Text className="text-neutral-400 text-sm">
            {categories.length} categor{categories.length !== 1 ? "ies" : "y"}
          </Text>
        </View>

        {/* Categories Grid */}
        {categories.length > 0 && (
          <View className="mb-6">
            <View className="flex-row flex-wrap">
              {categories.map((category) => {
                const isFund = category.category_type === "fund";
                const fundAccount = accounts.find(
                  (acc) => acc.id === category.fund_account_id
                );

                return (
                <TouchableOpacity
                  key={category.id}
                  className="w-[48%] mb-3 mr-[4%]"
                  onPress={() => handleEditCategory(category)}
                  onLongPress={() => handleDeleteCategory(category)}
                >
                  <View
                    className="bg-neutral-800 rounded-2xl p-4"
                    style={{ backgroundColor: category.background_color + "20" }}
                  >
                    <TouchableOpacity
                      onPress={() => handleDeleteCategory(category)}
                      className="absolute top-2 right-2 p-2"
                    >
                      <MaterialIcons name="more-vert" size={20} color="#9ca3af" />
                    </TouchableOpacity>
                    <View className="flex-row items-center mb-3">
                      <View
                        className="w-12 h-12 rounded-xl items-center justify-center mr-3"
                        style={{ backgroundColor: category.background_color }}
                      >
                        <Text style={{ fontSize: 24 }}>{category.emoji}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-white text-base font-semibold">
                          {category.name}
                        </Text>
                        <Text className="text-neutral-500 text-xs mt-1">
                          Updated {formatDate(category.updated_at)}
                        </Text>
                      </View>
                    </View>
                    {isFund && (
                      <View className="bg-neutral-900/60 rounded-xl p-3 mt-2">
                        <Text className="text-white text-sm font-semibold">
                          Fund Balance
                        </Text>
                        <Text className="text-green-400 text-lg font-bold mt-1">
                          {formatCurrency(
                            category.fund_balance,
                            category.fund_currency
                          )}
                        </Text>
                        {fundAccount && (
                          <Text className="text-neutral-400 text-xs mt-1">
                            Source account · {fundAccount.name}
                          </Text>
                        )}
                        <View className="flex-row mt-3">
                          <TouchableOpacity
                            className="flex-1 bg-green-600 rounded-xl py-2 mr-2 items-center"
                            onPress={() =>
                              setFundModal({
                                visible: true,
                                mode: "add",
                                category,
                                accountId:
                                  category.fund_account_id || accounts[0]?.id || null,
                              })
                            }
                            disabled={accounts.length === 0}
                          >
                            <Text className="text-white text-sm font-semibold">
                              Allocate
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            className="flex-1 bg-neutral-700 rounded-xl py-2 items-center"
                            onPress={() =>
                              setFundModal({
                                visible: true,
                                mode: "withdraw",
                                category,
                                accountId: category.fund_account_id,
                              })
                            }
                            disabled={category.fund_balance === 0}
                          >
                            <Text
                              className={`text-sm font-semibold ${
                                category.fund_balance === 0
                                  ? "text-neutral-400"
                                  : "text-white"
                              }`}
                            >
                              Withdraw
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
              })}
            </View>
          </View>
        )}

        {/* Empty State */}
        {categories.length === 0 && (
          <View className="items-center justify-center py-12">
            <MaterialIcons name="category" size={64} color="#6b7280" />
            <Text className="text-neutral-400 text-lg mt-4 text-center">
              No categories yet
            </Text>
            <Text className="text-neutral-500 text-sm mt-2 text-center">
              Add your first category to get started
            </Text>
          </View>
        )}

        {/* Add Category Section */}
        <TouchableOpacity
          className="border-2 border-dashed border-neutral-600 rounded-2xl p-4 mb-6"
          onPress={handleAddCategory}
        >
          <View className="flex-row items-center">
            <View className="bg-neutral-700 w-10 h-10 rounded-full items-center justify-center mr-3">
              <MaterialIcons name="add" size={24} color="white" />
            </View>
            <Text className="text-white text-base font-semibold">
              Add Category
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Category Form Sheet */}
      <CategoryFormSheet
        visible={formSheetVisible}
        category={editingCategory}
        onClose={() => {
          setFormSheetVisible(false);
          setEditingCategory(null);
        }}
        onSubmit={handleSubmitCategory}
        loading={submitting}
        accounts={accounts}
        accountFundTotals={accountFundTotals}
      />

      {/* Fund Modal */}
      {fundModal.category && (
        <Modal
          visible={fundModal.visible}
          transparent
          animationType="slide"
          onRequestClose={() =>
            setFundModal((prev) => ({ ...prev, visible: false }))
          }
        >
          <View className="flex-1 bg-black/60 justify-end">
            <View className="bg-neutral-900 rounded-t-3xl p-6">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-2xl font-bold text-white">
                  {fundModal.mode === "add" ? "Allocate Funds" : "Withdraw Funds"}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setFundModal((prev) => ({ ...prev, visible: false }))
                  }
                >
                  <MaterialIcons name="close" size={24} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              <View className="mb-4">
                <Text className="text-white text-lg font-semibold">
                  {fundModal.category.name}
                </Text>
                <Text className="text-neutral-400 text-sm mt-1">
                  Current balance ·{" "}
                  {formatCurrency(
                    fundModal.category.fund_balance,
                    fundModal.category.fund_currency
                  )}
                </Text>
                {fundModal.mode === "add" &&
                  fundModal.category.fund_account_id && (
                    <Text className="text-neutral-400 text-xs mt-1">
                      Account available ·{" "}
                      {formatCurrency(
                        getAccountAvailable(fundModal.category.fund_account_id),
                        accounts.find(
                          (acc) => acc.id === fundModal.category.fund_account_id
                        )?.currency || "INR"
                      )}
                    </Text>
                  )}
              </View>

              {fundModal.mode === "add" &&
                !fundModal.category.fund_account_id && (
                  <View className="mb-4">
                    <Text className="text-neutral-300 text-sm mb-2">
                      Choose source account
                    </Text>
                    {accounts.map((account) => (
                      <TouchableOpacity
                        key={account.id}
                        className={`bg-neutral-800 rounded-xl px-4 py-3 mb-2 ${
                          fundModal.accountId === account.id
                            ? "border border-green-500"
                            : "border border-transparent"
                        }`}
                        onPress={() =>
                          setFundModal((prev) => ({
                            ...prev,
                            accountId: account.id,
                          }))
                        }
                      >
                        <Text className="text-white font-semibold">
                          {account.name}
                        </Text>
                        <Text className="text-neutral-400 text-xs mt-1">
                          Currency · {account.currency}
                        </Text>
                        <Text className="text-neutral-400 text-xs mt-1">
                          Available ·{" "}
                          {formatCurrency(
                            getAccountAvailable(account.id),
                            account.currency
                          )}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

              <View className="mb-4">
                <Text className="text-neutral-300 text-sm mb-2">Amount</Text>
                <TextInput
                  value={fundAmount}
                  onChangeText={(text) => setFundAmount(text)}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor="#6b7280"
                  className="bg-neutral-800 rounded-xl px-4 py-3 text-white text-base"
                />
              </View>

              {fundModal.mode === "add" && (
                <Text className="text-neutral-400 text-xs mb-4">
                  Available to allocate ·{" "}
                  {formatCurrency(
                    getAccountAvailable(
                      fundModal.category.fund_account_id || fundModal.accountId
                    ),
                    accounts.find(
                      (acc) =>
                        acc.id ===
                        (fundModal.category.fund_account_id || fundModal.accountId)
                    )?.currency || "INR"
                  )}
                </Text>
              )}

              {fundError && (
                <Text className="text-red-500 text-sm mb-4">{fundError}</Text>
              )}

              <PrimaryButton
                label={fundModal.mode === "add" ? "Add Funds" : "Withdraw"}
                loading={fundSubmitting}
                onPress={async () => {
                  if (!fundModal.category) return;
                  const amountNum = parseFloat(fundAmount);
                  if (isNaN(amountNum) || amountNum <= 0) {
                    setFundError("Enter a valid amount");
                    return;
                  }

                  const amountSmallest = Math.round(amountNum * 100);
                  if (
                    fundModal.mode === "withdraw" &&
                    amountSmallest > fundModal.category.fund_balance
                  ) {
                    setFundError("Cannot withdraw more than available balance");
                    return;
                  }

                  const accountId =
                    fundModal.category.fund_account_id || fundModal.accountId;

                  if (fundModal.mode === "add" && !accountId) {
                    setFundError("Select an account first");
                    return;
                  }

                  if (fundModal.mode === "add") {
                    const available = getAccountAvailable(accountId);
                    if (amountSmallest > available) {
                      setFundError("Amount exceeds unallocated balance");
                      return;
                    }
                  }

                  setFundSubmitting(true);
                  try {
                    const delta =
                      fundModal.mode === "add"
                        ? amountSmallest
                        : -amountSmallest;
                    const { error } = await supabase.rpc(
                      "adjust_category_fund_balance",
                      {
                        p_category_id: fundModal.category.id,
                        p_amount_delta: delta,
                        p_account_id: accountId,
                      }
                    );
                    if (error) throw error;

                    setFundModal((prev) => ({ ...prev, visible: false }));
                    setFundAmount("");
                    setFundError(null);
                    fetchCategories();
                  } catch (err: any) {
                    setFundError(err.message || "Unable to update funds");
                  } finally {
                    setFundSubmitting(false);
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

