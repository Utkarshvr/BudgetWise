import { Text, View } from "react-native";
import { useThemeColors } from "@/constants/theme";
import { CategoryReservation } from "@/types/category";
import { formatBalance, formatDate } from "../../utils";

type ReservationItemProps = {
  reservation: CategoryReservation & { categoryName: string; categoryEmoji: string };
  showDivider: boolean;
};

export function ReservationItem({ reservation, showDivider }: ReservationItemProps) {
  const colors = useThemeColors();
  const updatedLabel = reservation.updated_at
    ? `Updated ${formatDate(reservation.updated_at)}`
    : null;

  return (
    <View>
      <View className="flex-row items-center justify-between px-3 py-2">
        <View className="flex-row items-center flex-1 pr-2">
          <View
            className="w-9 h-9 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.muted.DEFAULT }}
          >
            <Text style={{ fontSize: 18 }}>{reservation.categoryEmoji}</Text>
          </View>
          <View className="ml-3 flex-1">
            <Text
              className="text-sm font-semibold"
              style={{ color: colors.foreground }}
            >
              {reservation.categoryName}
            </Text>
            {updatedLabel && (
              <Text
                className="text-xs mt-0.5"
                style={{ color: colors.muted.foreground }}
              >
                {updatedLabel}
              </Text>
            )}
          </View>
        </View>
        <Text
          className="text-sm font-semibold"
          style={{ color: colors.muted.foreground }}
        >
          {formatBalance(reservation.reserved_amount, reservation.currency)}
        </Text>
      </View>
      {showDivider && (
        <View
          className="h-px"
          style={{ backgroundColor: colors.border }}
        />
      )}
    </View>
  );
}

