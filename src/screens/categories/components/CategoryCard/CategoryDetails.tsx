import { Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Category, CategoryReservation } from "@/types/category";
import { Account } from "@/types/account";
import { formatBalance } from "../../utils";
import { useThemeColors } from "@/constants/theme";

type CategoryDetailsProps = {
  category: Category;
  categoryReservations: CategoryReservation[];
  totalReserved: number;
  accounts: Account[];
  onManageReservations: () => void;
  onEditCategory?: () => void;
  isParent?: boolean;
};

export function CategoryDetails({
  category,
  categoryReservations,
  totalReserved,
  accounts,
  onManageReservations,
  onEditCategory,
  isParent = false,
}: CategoryDetailsProps) {
  const colors = useThemeColors();
  const isReserved = categoryReservations.length > 0;

  // Parent categories can't hold money directly
  if (isParent) {
    return (
      <View className="mt-3">
        <Text
          className="text-sm"
          style={{ color: colors.muted.foreground }}
        >
          Parent categories don't hold funds directly. The total shown is the sum of all child categories' funds.
        </Text>
        <View className="flex-row mt-3">
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center rounded-xl py-2"
            style={{ backgroundColor: colors.muted.DEFAULT }}
            onPress={onEditCategory}
          >
            <MaterialIcons name="edit" size={16} color={colors.foreground} />
            <Text
              className="text-sm font-semibold ml-2"
              style={{ color: colors.foreground }}
            >
              Edit Category
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (category.category_type === "income") {
    return (
      <View className="mt-3">
        <Text
          className="text-xs"
          style={{ color: colors.muted.foreground }}
        >
          Income categories don't hold funds. Use them to classify incoming
          money.
        </Text>
        <View className="flex-row mt-3">
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center rounded-xl py-2"
            style={{ backgroundColor: colors.muted.DEFAULT }}
            onPress={onEditCategory}
          >
            <MaterialIcons name="edit" size={16} color={colors.foreground} />
            <Text
              className="text-sm font-semibold ml-2"
              style={{ color: colors.foreground }}
            >
              Edit Category
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!isReserved) {
    return (
      <View className="mt-3">
        <Text
          className="text-sm"
          style={{ color: colors.muted.foreground }}
        >
          No funds reserved yet.
        </Text>
        <TouchableOpacity
          className="mt-3 flex-row items-center justify-center rounded-xl border py-2"
          style={{
            backgroundColor: colors.primary.soft,
            borderColor: colors.primary.border,
          }}
          onPress={onManageReservations}
        >
          <MaterialIcons name="add" size={16} color={colors.primary.DEFAULT} />
          <Text
            className="text-sm font-semibold ml-2"
            style={{ color: colors.primary.DEFAULT }}
          >
            Create Fund
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currency = categoryReservations[0]?.currency || "INR";
  const multiAccount = categoryReservations.length > 1;

  return (
    <View className="mt-3">
      <Text
        className="text-xs mb-2"
        style={{ color: colors.muted.foreground }}
      >
        Reserved from {categoryReservations.length} account
        {categoryReservations.length > 1 ? "s" : ""}
      </Text>

      <View
        className="rounded-2xl border"
        style={{ borderColor: colors.border }}
      >
        {categoryReservations.map((reservation, index) => {
          const account = accounts.find(
            (a) => a.id === reservation.account_id
          );
          return (
            <View key={reservation.id}>
              <View className="flex-row items-center justify-between px-3 py-2">
                <View className="flex-row items-center">
                  <View
                    className="size-1.5 rounded-full mr-2"
                    style={{ backgroundColor: colors.primary.DEFAULT }}
                  />
                  <Text
                    className="text-sm"
                    style={{ color: colors.foreground }}
                  >
                    {account?.name || "Unknown account"}
                  </Text>
                </View>
                <Text
                  className="text-sm font-semibold"
                  style={{ color: colors.primary.DEFAULT }}
                >
                  {formatBalance(
                    reservation.reserved_amount,
                    reservation.currency
                  )}
                </Text>
              </View>
              {index < categoryReservations.length - 1 && (
                <View
                  className="h-px"
                  style={{ backgroundColor: colors.border }}
                />
              )}
            </View>
          );
        })}

        <View
          className="h-px"
          style={{ backgroundColor: colors.border }}
        />
        <View className="flex-row items-center justify-between px-3 py-2">
          <Text
            className="text-xs uppercase tracking-wide"
            style={{ color: colors.muted.foreground }}
          >
            Total Reserved
          </Text>
          <Text
            className="text-base font-semibold"
            style={{ color: colors.primary.DEFAULT }}
          >
            {formatBalance(totalReserved, currency)}
          </Text>
        </View>
      </View>

      <View className="flex-row flex-wrap mt-3">
        <TouchableOpacity
          className="flex-1 flex-row items-center justify-center rounded-xl border py-2"
          style={{
            backgroundColor: colors.primary.soft,
            borderColor: colors.primary.border,
          }}
          onPress={onManageReservations}
        >
          <MaterialIcons
            name="savings"
            size={16}
            color={colors.primary.DEFAULT}
          />
          <Text
            className="text-sm font-semibold ml-2"
            style={{ color: colors.primary.DEFAULT }}
          >
            Manage Funds
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

