import { Text, View, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "@/constants/theme";
import { CategoryReservation } from "@/types/category";
import { ReservationItem } from "./ReservationItem";

type ReservationsSectionProps = {
  // reservedFundsList: Array<{ name: string; amount: number }>
  reservations: Array<
    CategoryReservation & { categoryName: string; categoryEmoji: string }
  >;
  expanded: boolean;
  onToggle: () => void;
};

export function ReservationsSection({
  reservations,
  expanded,
  onToggle,
}: ReservationsSectionProps) {
  const colors = useThemeColors();
  const hasReservations = reservations.length > 0;

  return (
    <View className="mt-4">
      {hasReservations ? (
        <>
          <TouchableOpacity
            onPress={onToggle}
            className="flex-row items-center justify-between"
          >
            <Text
              className="text-xs uppercase tracking-[0.2em]"
              style={{ color: colors.muted.foreground }}
            >
              Funds ({reservations.length})
            </Text>
            <MaterialIcons
              name={expanded ? "expand-less" : "expand-more"}
              size={20}
              color={colors.muted.foreground}
            />
          </TouchableOpacity>
          {expanded && (
            <View
              className="mt-2 rounded-2xl border"
              style={{ borderColor: colors.border }}
            >
              {reservations.map((item, index) => (
                <ReservationItem
                  key={item.id}
                  reservation={item}
                  showDivider={index < reservations.length - 1}
                />
              ))}
            </View>
          )}
        </>
      ) : (
        <>
          <Text
            className="text-xs uppercase tracking-[0.2em]"
            style={{ color: colors.muted.foreground }}
          >
            Funds
          </Text>
          <Text
            className="text-sm mt-2"
            style={{ color: colors.muted.foreground }}
          >
            No funds yet. Create one to reserve money for goals.
          </Text>
        </>
      )}
    </View>
  );
}

