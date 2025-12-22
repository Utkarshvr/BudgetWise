import { useMemo } from "react";
import { View } from "react-native";
import { Category, CategoryReservation } from "@/types/category";
import { Account } from "@/types/account";
import { CategoryCard } from "./CategoryCard/CategoryCard";

type CategoryListProps = {
  categories: Category[];
  accounts: Account[];
  reservations: CategoryReservation[];
  expandedCategories: Record<string, boolean>;
  onToggleCategory: (category: Category) => void;
  onShowActions: (category: Category) => void;
  onEditCategory: (category: Category) => void;
  onManageReservations: (category: Category) => void;
  getReservationsForCategory: (id: string) => CategoryReservation[];
  getTotalReserved: (id: string) => number;
};

export function CategoryList({
  categories,
  accounts,
  reservations,
  expandedCategories,
  onToggleCategory,
  onShowActions,
  onEditCategory,
  onManageReservations,
  getReservationsForCategory,
  getTotalReserved,
}: CategoryListProps) {
  // Organize categories hierarchically: parent categories (is_parent_category = true) with their children
  // Also include normal categories (not parent, not child) as top-level items
  const organizedCategories = useMemo(() => {
    // Separate parent categories (is_parent_category = true), child categories, and normal categories
    const parentCategories = categories.filter((cat) => cat.is_parent_category === true);
    const childCategories = categories.filter((cat) => cat.parent_id);
    // Normal categories: not a parent, not a child, not archived
    const normalCategories = categories.filter(
      (cat) => 
        cat.is_parent_category !== true && 
        !cat.parent_id && 
        !cat.is_archived
    );

    // Group children by parent_id
    const childrenByParent: Record<string, Category[]> = {};
    childCategories.forEach((child) => {
      if (child.parent_id) {
        if (!childrenByParent[child.parent_id]) {
          childrenByParent[child.parent_id] = [];
        }
        childrenByParent[child.parent_id].push(child);
      }
    });

    // Return parent categories with their children, plus normal categories as standalone items
    const parentItems = parentCategories.map((parent) => ({
      parent,
      children: childrenByParent[parent.id] || [],
    }));
    
    const normalItems = normalCategories.map((normal) => ({
      parent: normal,
      children: [],
    }));
    
    return [...parentItems, ...normalItems];
  }, [categories]);

  // Calculate total reserved for a parent category (sum of all children)
  const getParentTotalReserved = (parentId: string): number => {
    const children = categories.filter((cat) => cat.parent_id === parentId);
    return children.reduce((total, child) => {
      return total + getTotalReserved(child.id);
    }, 0);
  };

  // Get all reservations for children of a parent
  const getParentReservations = (parentId: string): CategoryReservation[] => {
    const children = categories.filter((cat) => cat.parent_id === parentId);
    const allReservations: CategoryReservation[] = [];
    children.forEach((child) => {
      allReservations.push(...getReservationsForCategory(child.id));
    });
    return allReservations;
  };

  return (
    <View>
      {organizedCategories.map(({ parent, children }) => {
        const isParent = parent.is_parent_category === true;
        const categoryReservations = isParent
          ? getParentReservations(parent.id)
          : getReservationsForCategory(parent.id);
        const totalReserved = isParent
          ? getParentTotalReserved(parent.id)
          : getTotalReserved(parent.id);
        const isExpanded = !!expandedCategories[parent.id];

        return (
          <CategoryCard
            key={parent.id}
            category={parent}
            categoryReservations={categoryReservations}
            totalReserved={totalReserved}
            isExpanded={isExpanded}
            onToggle={() => onToggleCategory(parent)}
            onShowActions={() => onShowActions(parent)}
            onEditCategory={() => onEditCategory(parent)}
            accounts={accounts}
            onManageReservations={() => onManageReservations(parent)}
            children={children}
            getReservationsForCategory={getReservationsForCategory}
            getTotalReserved={getTotalReserved}
            onToggleChild={(child) => onToggleCategory(child)}
            onShowChildActions={(child) => onShowActions(child)}
            onEditChildCategory={(child) => onEditCategory(child)}
            onManageChildReservations={(child) => onManageReservations(child)}
            expandedChildren={expandedCategories}
          />
        );
      })}
    </View>
  );
}

