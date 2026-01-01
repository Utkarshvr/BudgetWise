import { useState, useEffect, useMemo, useCallback } from "react";
import { Session } from "@supabase/supabase-js";
import { Alert } from "react-native";
import { supabase } from "@/lib";
import { Account, AccountFormData } from "@/types/account";
import { Category, CategoryReservation } from "@/types/category";
import { getErrorMessage } from "@/utils";
import { getTotalReserved } from "../utils/accountHelpers";
import { useRefresh } from "@/contexts/RefreshContext";

export function useAccountsData(session: Session | null) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reservations, setReservations] = useState<CategoryReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { registerAccountsRefresh } = useRefresh();

  const fetchAccounts = useCallback(async () => {
    if (!session?.user) return;

    try {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error, "Failed to fetch accounts");
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session]);

  const fetchCategories = useCallback(async () => {
    if (!session?.user) return;
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", session.user.id)
        .order("name", { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error("Error fetching categories", error);
    }
  }, [session]);

  const fetchReservations = useCallback(async () => {
    if (!session?.user) return;
    try {
      const { data, error } = await supabase
        .from("category_reservations")
        .select("*")
        .eq("user_id", session.user.id);

      if (error) throw error;
      setReservations(data || []);
    } catch (error: any) {
      console.error("Error fetching reservations", error);
    }
  }, [session]);

  const fetchData = useCallback(async () => {
    await Promise.all([fetchAccounts(), fetchCategories(), fetchReservations()]);
  }, [fetchAccounts, fetchCategories, fetchReservations]);

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session, fetchData]);

  const groupedAccounts = useMemo(() => {
    return accounts.reduce(
      (acc, account) => {
        if (account.type === "cash") {
          acc.cash.push(account);
        } else {
          acc.bank.push(account);
        }
        return acc;
      },
      { cash: [] as Account[], bank: [] as Account[] }
    );
  }, [accounts]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
  }, [fetchData]);

  // Register refresh function with context
  useEffect(() => {
    const cleanup = registerAccountsRefresh(handleRefresh);
    return cleanup;
  }, [handleRefresh, registerAccountsRefresh]);

  const handleDeleteAccount = async (account: Account) => {
    return new Promise<void>((resolve, reject) => {
      Alert.alert(
        "Delete Account",
        `Are you sure you want to delete "${account.name}"?`,
        [
          { text: "Cancel", style: "cancel", onPress: () => resolve() },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                const { error } = await supabase
                  .from("accounts")
                  .delete()
                  .eq("id", account.id);

                if (error) throw error;
                await fetchData();
                resolve();
              } catch (error: any) {
                const errorMessage = getErrorMessage(error, "Failed to delete account");
                Alert.alert("Error", errorMessage);
                reject(error);
              }
            },
          },
        ]
      );
    });
  };

  const handleSubmitAccount = async (formData: AccountFormData, editingAccount: Account | null) => {
    if (!session?.user) return;

    try {
      // Convert balance to smallest currency unit (paise/cents)
      const balanceInSmallestUnit = Math.round(
        parseFloat(formData.balance) * 100
      );

      const currency = formData.currency;

      if (editingAccount) {
        // Update existing account (don't update currency when editing)
        const { error } = await supabase
          .from("accounts")
          .update({
            name: formData.name.trim(),
            type: formData.type,
            balance: balanceInSmallestUnit,
          })
          .eq("id", editingAccount.id);

        if (error) throw error;
      } else {
        // Create new account with currency from global settings
        const { error } = await supabase.from("accounts").insert({
          user_id: session.user.id,
          name: formData.name.trim(),
          type: formData.type,
          currency: currency,
          balance: balanceInSmallestUnit,
        });

        if (error) throw error;
      }

      await fetchData();
    } catch (error: any) {
      const errorMessage = getErrorMessage(error, "Failed to save account");
      Alert.alert("Error", errorMessage);
      throw error;
    }
  };

  const handleAdjustBalance = async (account: Account, newSpendable: number) => {
    if (!session?.user) return;

    try {
      const currentBalance = account.balance;
      const reservedTotal = getTotalReserved(account.id, reservations);
      const currentSpendable = Math.max(currentBalance - reservedTotal, 0);
      
      // Calculate the adjustment to spendable
      const newSpendableInSmallestUnit = Math.round(newSpendable * 100);
      const spendableAdjustment = newSpendableInSmallestUnit - currentSpendable;

      // Validate: Can't have negative spendable
      if (newSpendableInSmallestUnit < 0) {
        throw new Error("Spendable balance cannot be negative");
      }

      // Calculate the actual balance adjustment
      // If spendable increases, total balance increases by the same amount
      // If spendable decreases, total balance decreases by the same amount
      const adjustedAmount = spendableAdjustment;

      // Validate: Adjustment amount cannot be 0
      if (adjustedAmount === 0) {
        throw new Error("Adjustment amount cannot be zero. No changes were made.");
      }

      // Validate: Can't subtract more than current spendable
      if (adjustedAmount < 0 && Math.abs(adjustedAmount) > currentSpendable) {
        const spendableDisplay = (currentSpendable / 100).toFixed(2);
        throw new Error(
          `Cannot subtract more than spendable amount (${spendableDisplay} ${account.currency})`
        );
      }

      // Create adjustment transaction
      // Note: amount is set to the absolute value for display, adjusted_amount is the actual change
      const { error } = await supabase.from("transactions").insert({
        user_id: session.user.id,
        note: "Balance adjustment",
        type: "adjustment",
        amount: Math.abs(adjustedAmount), // Display amount (always positive)
        adjusted_amount: adjustedAmount, // Actual change (positive or negative)
        to_account_id: account.id,
        currency: account.currency,
      });

      if (error) throw error;

      await fetchData();
    } catch (error: any) {
      const errorMessage = getErrorMessage(error, "Failed to adjust balance");
      Alert.alert("Error", errorMessage);
      throw error;
    }
  };

  return {
    accounts,
    categories,
    reservations,
    loading,
    refreshing,
    groupedAccounts,
    handleRefresh,
    handleDeleteAccount,
    handleSubmitAccount,
    handleAdjustBalance,
  };
}

