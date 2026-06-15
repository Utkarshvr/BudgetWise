import { Category, CategoryReservation } from "@/types/category";

/** A group (folder) that can contain child categories. */
export function isGroupCategory(category: Category): boolean {
  return category.is_parent_category === true;
}

/** A category nested under a group. */
export function isChildCategory(category: Category): boolean {
  return !!category.parent_id;
}

/** Only top-level expense categories (groups or standalone) hold reserved funds. */
export function canHoldFunds(category: Category): boolean {
  return category.category_type === "expense" && !category.parent_id;
}

/** Category id whose reservation pool backs spending for this category. */
export function getFundCategoryId(category: Category): string {
  return category.parent_id || category.id;
}

export function getFundCategory(
  category: Category,
  categories: Category[]
): Category | undefined {
  return categories.find((c) => c.id === getFundCategoryId(category));
}

export function getReservationsForCategoryFund(
  category: Category,
  reservations: CategoryReservation[]
): CategoryReservation[] {
  const fundId = getFundCategoryId(category);
  return reservations.filter((r) => r.category_id === fundId);
}

export function getTotalReservedForCategoryFund(
  category: Category,
  reservations: CategoryReservation[]
): number {
  return getReservationsForCategoryFund(category, reservations).reduce(
    (sum, r) => sum + r.reserved_amount,
    0
  );
}
