import { CategoryReservation } from "@/types/category";

export function getReservationsForCategory(
  categoryId: string,
  reservations: CategoryReservation[]
): CategoryReservation[] {
  return reservations.filter((r) => r.category_id === categoryId);
}

export function getTotalReserved(
  categoryId: string,
  reservations: CategoryReservation[]
): number {
  return getReservationsForCategory(categoryId, reservations).reduce(
    (sum, r) => sum + r.reserved_amount,
    0
  );
}

