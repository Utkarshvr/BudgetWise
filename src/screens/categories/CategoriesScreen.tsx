import { useState, useEffect } from "react";
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { Category, CategoryFormData } from "@/types/category";
import { CategoryFormSheet } from "./components/CategoryFormSheet";

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

export default function CategoriesScreen() {
  const { session } = useSupabaseSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [formSheetVisible, setFormSheetVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (session) {
      fetchCategories();
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
        // Update existing category
        const { error } = await supabase
          .from("categories")
          .update({
            name: formData.name.trim(),
            emoji: formData.emoji,
            background_color: formData.background_color,
          })
          .eq("id", editingCategory.id);

        if (error) throw error;
      } else {
        // Create new category
        const { error } = await supabase.from("categories").insert({
          user_id: session.user.id,
          name: formData.name.trim(),
          emoji: formData.emoji,
          background_color: formData.background_color,
        });

        if (error) throw error;
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
              {categories.map((category) => (
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
                      <TouchableOpacity
                        onPress={() => handleDeleteCategory(category)}
                        className="p-2"
                      >
                        <MaterialIcons name="more-vert" size={20} color="#9ca3af" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
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
      />
    </SafeAreaView>
  );
}

