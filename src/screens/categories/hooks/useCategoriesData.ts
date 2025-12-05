import { useState, useEffect, useMemo } from "react";
import { Session } from "@supabase/supabase-js";
import { Alert } from "react-native";
import { supabase } from "@/lib/supabase";
import { Category, CategoryReservation } from "@/types/category";
import { Account } from "@/types/account";
import { getReservationsForCategory, getTotalReserved } from "../utils/reservationHelpers";
import { getErrorMessage } from "@/utils/errorHandler";

export function useCategoriesData(session: Session | null) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [reservations, setReservations] = useState<CategoryReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"income" | "expense">("expense");

  useEffect(() => {
    if (session?.user) {
      fetchData();
    }
  }, [session]);

  const fetchData = async () => {
    await Promise.all([
      fetchCategories(),
      fetchAccounts(),
      fetchReservations(),
    ]);
  };

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
      const errorMessage = getErrorMessage(error, "Failed to fetch categories");
      Alert.alert("Error", errorMessage);
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
      console.error("Error fetching accounts:", error);
    }
  };

  const fetchReservations = async () => {
    if (!session?.user) return;
    try {
      const { data, error } = await supabase
        .from("category_reservations")
        .select("*")
        .eq("user_id", session.user.id);

      if (error) throw error;
      setReservations(data || []);
    } catch (error: any) {
      console.error("Error fetching reservations:", error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => cat.category_type === activeTab);
  }, [categories, activeTab]);

  return {
    categories,
    accounts,
    reservations,
    loading,
    refreshing,
    activeTab,
    filteredCategories,
    setActiveTab,
    handleRefresh,
    getReservationsForCategory: (categoryId: string) =>
      getReservationsForCategory(categoryId, reservations),
    getTotalReserved: (categoryId: string) =>
      getTotalReserved(categoryId, reservations),
  };
}

