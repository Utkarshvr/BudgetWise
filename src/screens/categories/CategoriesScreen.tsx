import { useState, useMemo } from "react";
import { Alert, RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib";
import { useSupabaseSession } from "@/hooks";
import { Category, CategoryFormData } from "@/types/category";
import { useThemeColors } from "@/constants/theme";
import { useCategoriesData } from "./hooks/useCategoriesData";
import { CategoryFormSheet } from "./components/CategoryFormSheet";
import { CategoryReservationSheet } from "./components/CategoryReservationSheet";
import { CategoryActionSheet } from "./components/CategoryActionSheet";
import { CategoryParentSelectSheet } from "./components/CategoryParentSelectSheet";
import { CategoriesHeader } from "./components/CategoriesHeader";
import { CategoriesTabs } from "./components/CategoriesTabs";
import { CategoriesEmptyState } from "./components/CategoriesEmptyState";
import { CategoryList } from "./components/CategoryList";
import { FullScreenLoader } from "@/components/ui";
import { getTotalReserved as getTotalReservedForAccount } from "@/screens/accounts/utils/accountHelpers";
import { getErrorMessage } from "@/utils";

export default function CategoriesScreen() {
  const colors = useThemeColors();
  const { session } = useSupabaseSession();
  const {
    categories,
    accounts,
    reservations,
    loading,
    refreshing,
    activeTab,
    filteredCategories,
    setActiveTab,
    handleRefresh,
    getReservationsForCategory,
    getTotalReserved,
  } = useCategoriesData(session);

  const [formSheetVisible, setFormSheetVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reservationSheetVisible, setReservationSheetVisible] = useState(false);
  const [selectedCategoryForReservation, setSelectedCategoryForReservation] =
    useState<Category | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [parentSelectSheetVisible, setParentSelectSheetVisible] = useState(false);
  const [categoryToMove, setCategoryToMove] = useState<Category | null>(null);
  const [movingCategory, setMovingCategory] = useState(false);

  const accountUnreserved = useMemo(() => {
    const map: Record<string, number> = {};
    accounts.forEach((account) => {
      const totalReservedForAccount = getTotalReservedForAccount(
        account.id,
        reservations
      );
      map[account.id] = Math.max(account.balance - totalReservedForAccount, 0);
    });
    return map;
  }, [accounts, reservations]);

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
      "Delete or Archive Category",
      `What would you like to do with "${category.name}"?\n\nDelete: Permanently delete the category and all transactions with this category.\n\nArchive: Hide the category from category screens, but keep it for previous transactions. You won't be able to create new transactions with this category.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "default",
          onPress: async () => {
            try {
              // The database trigger will handle:
              // - Returning fund_balance to account
              // - Deleting category_reservations
              // - Resetting fund fields
              const { error } = await supabase
                .from("categories")
                .update({ is_archived: true })
                .eq("id", category.id);

              if (error) throw error;
              handleRefresh();
            } catch (error: any) {
              const errorMessage = getErrorMessage(error, "Failed to archive category");
              Alert.alert("Error", errorMessage);
            }
          },
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // The database trigger will automatically delete all transactions
              // with this category_id when the category is deleted
              const { error } = await supabase
                .from("categories")
                .delete()
                .eq("id", category.id);

              if (error) throw error;
              handleRefresh();
            } catch (error: any) {
              const errorMessage = getErrorMessage(error, "Failed to delete category");
              Alert.alert("Error", errorMessage);
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
      const trimmedName = formData.name.trim();
      
      // Check for duplicate category by (name, category_type) combination (case-insensitive name)
      // Include archived categories to check for duplicates
      let duplicateQuery = supabase
        .from("categories")
        .select("id, name, category_type, is_archived")
        .eq("user_id", session.user.id)
        .eq("category_type", formData.category_type); // Check same type

      // When editing, exclude the current category from the duplicate check
      if (editingCategory) {
        duplicateQuery = duplicateQuery.neq("id", editingCategory.id);
      }

      const { data: allCategories, error: duplicateError } = await duplicateQuery;

      if (duplicateError) throw duplicateError;

      // Check for case-insensitive duplicate with same category_type
      const duplicateCategory = allCategories?.find(
        (cat) => cat.name.toLowerCase() === trimmedName.toLowerCase()
      );

      // If creating a new category and an archived category with the same (name, type) exists
      // Automatically restore it without prompting
      if (!editingCategory && duplicateCategory && duplicateCategory.is_archived) {
        const { error } = await supabase
          .from("categories")
          .update({
            is_archived: false,
            emoji: formData.emoji, // Update emoji to the one selected by user
            background_color: formData.background_color,
            // category_type should already match, but keep it for safety
            category_type: formData.category_type,
          })
          .eq("id", duplicateCategory.id);

        if (error) throw error;
        setFormSheetVisible(false);
        setEditingCategory(null);
        handleRefresh();
        return;
      }

      // Check for active duplicate (non-archived) with same (name, type)
      if (duplicateCategory && !duplicateCategory.is_archived) {
        Alert.alert(
          "Duplicate Category",
          `A ${formData.category_type} category with the name "${trimmedName}" already exists. Please choose a different name.`
        );
        setSubmitting(false);
        return;
      }

      if (editingCategory) {
        const { error } = await supabase
          .from("categories")
          .update({
            name: trimmedName,
            emoji: formData.emoji,
            background_color: formData.background_color,
            parent_id: formData.parent_id || null,
            // Don't update category_type when editing
          })
          .eq("id", editingCategory.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert({
          user_id: session.user.id,
          name: trimmedName,
          emoji: formData.emoji,
          background_color: formData.background_color,
          category_type: formData.category_type,
          parent_id: formData.parent_id || null,
        });

        if (error) throw error;
      }

      setFormSheetVisible(false);
      setEditingCategory(null);
      handleRefresh();
    } catch (error: any) {
      const errorMessage = getErrorMessage(error, "Failed to save category");
      Alert.alert("Error", errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleManageReservations = (category: Category) => {
    // Check if this is a parent category
    if (category.is_parent_category === true) {
      Alert.alert(
        "Parent Category",
        "Parent categories don't hold funds directly. Manage funds for individual child categories instead."
      );
      return;
    }
    setSelectedCategoryForReservation(category);
    setReservationSheetVisible(true);
  };

  const handleReservationUpdated = () => {
    handleRefresh();
  };

  const toggleCategory = (category: Category) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category.id]: !prev[category.id],
    }));
  };

  const handleShowActions = (category: Category) => {
    setSelectedCategory(category);
    setActionSheetVisible(true);
  };

  const handleMoveToParent = (category: Category) => {
    setCategoryToMove(category);
    setParentSelectSheetVisible(true);
  };

  const handleMoveCategory = async (parentId: string | null) => {
    if (!categoryToMove || !session?.user) return;
    setMovingCategory(true);
    try {
      const { error } = await supabase
        .from("categories")
        .update({ parent_id: parentId })
        .eq("id", categoryToMove.id);

      if (error) throw error;
      setParentSelectSheetVisible(false);
      setCategoryToMove(null);
      handleRefresh();
    } catch (error: any) {
      const errorMessage = getErrorMessage(error, "Failed to move category");
      Alert.alert("Error", errorMessage);
    } finally {
      setMovingCategory(false);
    }
  };

  if (loading) {
    return <FullScreenLoader />;
  }

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: colors.background.DEFAULT }}
    >
      <ScrollView
        className="flex-1 px-4 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary.DEFAULT}
          />
        }
      >
        <CategoriesHeader onAddCategory={handleAddCategory} />

        <CategoriesTabs activeTab={activeTab} onChangeTab={setActiveTab} />

        {filteredCategories.length === 0 ? (
          <CategoriesEmptyState
            activeTab={activeTab}
            onCreateCategory={handleAddCategory}
          />
        ) : (
          <CategoryList
            categories={filteredCategories}
            accounts={accounts}
            reservations={reservations}
            expandedCategories={expandedCategories}
            onToggleCategory={toggleCategory}
            onShowActions={handleShowActions}
            onEditCategory={handleEditCategory}
            onManageReservations={handleManageReservations}
            getReservationsForCategory={getReservationsForCategory}
            getTotalReserved={getTotalReserved}
          />
        )}
      </ScrollView>

      <CategoryFormSheet
        visible={formSheetVisible}
        category={editingCategory}
        defaultCategoryType={activeTab}
        onClose={() => setFormSheetVisible(false)}
        onSubmit={handleSubmitCategory}
        loading={submitting}
        allCategories={categories}
      />

      <CategoryReservationSheet
        visible={reservationSheetVisible}
        category={selectedCategoryForReservation}
        accounts={accounts}
        reservations={getReservationsForCategory(
          selectedCategoryForReservation?.id || ""
        )}
        accountUnreserved={accountUnreserved}
        onClose={() => {
          setReservationSheetVisible(false);
          setSelectedCategoryForReservation(null);
        }}
        onUpdated={handleReservationUpdated}
      />

      <CategoryActionSheet
        visible={actionSheetVisible}
        category={selectedCategory}
        onClose={() => {
          setActionSheetVisible(false);
          setSelectedCategory(null);
        }}
        onEdit={handleEditCategory}
        onDelete={handleDeleteCategory}
        onMoveToParent={handleMoveToParent}
      />

      <CategoryParentSelectSheet
        visible={parentSelectSheetVisible}
        category={categoryToMove}
        categories={categories}
        onClose={() => {
          setParentSelectSheetVisible(false);
          setCategoryToMove(null);
        }}
        onMove={handleMoveCategory}
        loading={movingCategory}
      />
    </SafeAreaView>
  );
}
