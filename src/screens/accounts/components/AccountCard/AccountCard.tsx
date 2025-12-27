import { Text, View, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Account } from "@/types/account";
import { Category, CategoryReservation } from "@/types/category";
import { useThemeColors } from "@/constants/theme";
import {
  ACCOUNT_TYPE_ICONS,
  ACCOUNT_TYPE_COLORS,
  formatBalance,
  getAccountReservations,
  getTotalReserved,
} from "../../utils";
import { ReservationsSection } from "./ReservationsSection";

type AccountCardProps = {
  account: Account;
  reservations: CategoryReservation[];
  categories: Category[];
  showTypeMeta: boolean;
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
  onShowActions: (account: Account) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
};

export function AccountCard({
  account,
  reservations,
  categories,
  showTypeMeta,
  onEdit,
  onDelete,
  onShowActions,
  expanded,
  onToggleExpanded,
}: AccountCardProps) {
  const router = useRouter();
  const colors = useThemeColors();

  const accountReservations = getAccountReservations(
    account.id,
    reservations,
    categories
  );

  // Placeholder-style values for clarity of the money hierarchy
  const totalBalance = account.balance;
  const reservedTotal = getTotalReserved(account.id, reservations);
  const freeToSpend = Math.max(totalBalance - reservedTotal, 0);
  const reservedFundsList = accountReservations;

  return (
    <LinearGradient
      colors={[
        colors.surfaceGradient.from,
        colors.surfaceGradient.to,
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.cardGradient}
    >
      <TouchableOpacity
        className="rounded-3xl"
        activeOpacity={0.9}
        style={[
          styles.cardInner,
          {
            backgroundColor: colors.cardOverlay,
            shadowColor: colors.shadow,
          },
        ]}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-row items-center flex-1 pr-3">
            <View
              className={`${ACCOUNT_TYPE_COLORS[account.type]} w-11 h-11 rounded-2xl items-center justify-center mr-3`}
            >
              <MaterialIcons
                name={ACCOUNT_TYPE_ICONS[account.type] as any}
                size={22}
                color={colors.white}
              />
            </View>
            <View className="flex-1">
              <Text
                className="text-base font-semibold"
                style={{ color: colors.foreground }}
              >
                {account.name}
              </Text>
              <Text
                className="text-xs mt-1"
                style={{ color: colors.muted.foreground }}
              >
                {showTypeMeta
                  ? `${account.type.replace("_", " ")} • ${account.currency}`
                  : account.currency}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onShowActions(account);
            }}
            className="w-8 h-8 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.background.subtle }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons
              name="more-vert"
              size={18}
              color={colors.muted.foreground}
            />
          </TouchableOpacity>
        </View>

        {/* Hero total balance */}
        <View className="mt-4">
          <Text
            className="text-3xl text-center font-extrabold mt-1"
            style={{ color: colors.foreground }}
          >
            {formatBalance(totalBalance, account.currency)}
          </Text>
        </View>

        {/* Mini stats row: Reserved / Free to Spend */}
        <View
          className="mt-4 flex-row items-center rounded-2xl px-4 py-3 border"
          style={{
            backgroundColor: colors.card.DEFAULT,
            borderColor: colors.border,
          }}
        >
          <View className="flex-1 mr-3">
            <Text
              className="text-[10px] uppercase tracking-[0.2em]"
              style={{ color: colors.muted.foreground }}
            >
              SPENDABLE
            </Text>
            <Text
              className="text-xl font-semibold mt-1"
              style={{ color: colors.primary.DEFAULT }}
            >
              {formatBalance(freeToSpend, account.currency)}
            </Text>
          </View>

          <View
            className="w-px h-8"
            style={{ backgroundColor: colors.border }}
          />

          <View className="flex-1 ml-3 items-end">
            <Text
              className="text-[10px] uppercase tracking-[0.2em]"
              style={{ color: colors.muted.foreground }}
            >
              Reserved
            </Text>
            <Text
              className="text-xl font-semibold mt-1"
              style={{ color: "#FACC15" }}
            >
              {formatBalance(reservedTotal, account.currency)}
            </Text>
          </View>
        </View>

        {/* Reserved funds list below stats */}
        <ReservationsSection
          reservations={reservedFundsList}
          expanded={expanded}
          onToggle={onToggleExpanded}
        />

        {/* Manage funds button at the bottom */}
        <TouchableOpacity
          className="mt-4 flex-row items-center justify-center rounded-2xl border py-2"
          style={{
            backgroundColor: colors.primary.soft,
            borderColor: colors.primary.border,
          }}
          onPress={() => router.push("/(auth)/(tabs)/categories")}
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
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  cardGradient: {
    borderRadius: 28,
    marginBottom: 16,
  },
  cardInner: {
    borderRadius: 28,
    padding: 16,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 6,
  },
});
