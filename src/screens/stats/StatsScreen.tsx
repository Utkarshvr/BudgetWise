import { useState, useMemo } from "react";
import {
  ScrollView,
  RefreshControl,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Dimensions,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { PieChart } from "react-native-gifted-charts";
import { useSupabaseSession } from "@/hooks";
import { useThemeColors, getCategoryBackgroundColor } from "@/constants/theme";
import { useStatsData } from "./hooks/useStatsData";
import {
  DateRangeFilter,
  getDateRangeForPeriod,
} from "@/screens/transactions/utils/dateRange";
import { formatAmount } from "@/screens/transactions/utils/formatting";
import { CategoryStat } from "./hooks/useStatsData";
import { Text as SvgText } from "react-native-svg";
import { MonthYearPickerModal } from "@/screens/transactions/components/MonthYearPickerModal";
import { FilterSheet } from "@/screens/transactions/components/FilterSheet";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function StatsScreen() {
  const colors = useThemeColors();
  const categoryBgColor = getCategoryBackgroundColor(colors);
  const { session } = useSupabaseSession();

  const [period, setPeriod] = useState<DateRangeFilter>("month");
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [selectedType, setSelectedType] = useState<"income" | "expense">(
    "expense"
  );
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  const filters = useMemo(
    () => ({
      accountIds: selectedAccountIds,
      categoryIds: selectedCategoryIds,
    }),
    [selectedAccountIds, selectedCategoryIds]
  );

  const { statsData, loading, refreshing, handleRefresh } = useStatsData(
    session,
    period,
    referenceDate,
    filters
  );

  const currentDateRange = useMemo(
    () => getDateRangeForPeriod(period, referenceDate),
    [period, referenceDate]
  );

  const hasActiveFilters =
    selectedAccountIds.length > 0 || selectedCategoryIds.length > 0;

  const currentStats = useMemo(
    () =>
      selectedType === "income"
        ? statsData.incomeStats
        : statsData.expenseStats,
    [selectedType, statsData]
  );

  const totalAmount = useMemo(
    () =>
      selectedType === "income"
        ? statsData.totalIncome
        : statsData.totalExpense,
    [selectedType, statsData]
  );

  // Prepare pie chart data
  const pieData = useMemo(() => {
    if (currentStats.length === 0) return [];

    return currentStats.map((stat, index) => ({
      value: stat.percentage,
      color: stat.categoryColor,
      // text: `${formatAmount(stat.totalAmount, stat.currency)}`,
      // text: `${stat.percentage.toFixed(1)}%`,
      text: `${stat.categoryEmoji}`,
      label: `${stat.categoryEmoji} ${stat.categoryName}`,
      focused: index === 0,
      gradientCenterColor: stat.categoryColor,
    }));
  }, [currentStats]);

  const handlePreviousPeriod = () => {
    const newDate = new Date(referenceDate);
    if (period === "month") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (period === "year") {
      newDate.setFullYear(newDate.getFullYear() - 1);
    }
    setReferenceDate(newDate);
  };

  const handleNextPeriod = () => {
    const newDate = new Date(referenceDate);
    if (period === "month") {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (period === "year") {
      newDate.setFullYear(newDate.getFullYear() + 1);
    }
    setReferenceDate(newDate);
  };

  const formatPeriodLabel = () => {
    if (period === "month") {
      return referenceDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    } else if (period === "year") {
      return referenceDate.getFullYear().toString();
    }
    return "";
  };

  const periodOptions: { label: string; value: DateRangeFilter }[] = [
    { label: "Monthly", value: "month" },
    { label: "Annually", value: "year" },
  ];

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background.DEFAULT }}
      edges={["top"]}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary.DEFAULT}
          />
        }
        onScrollBeginDrag={() => {
          if (showPeriodDropdown) {
            setShowPeriodDropdown(false);
          }
        }}
        scrollEventThrottle={16}
      >
        {/* Header */}
        <View className="px-4 pt-4 pb-2" style={{ position: "relative" }}>
          <View className="flex-row items-center justify-between mb-4">
            {/* Period Navigation */}
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={handlePreviousPeriod}
                className="pr-1 py-1"
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="chevron-left"
                  size={24}
                  color={colors.foreground}
                />
              </TouchableOpacity>
              {period === "month" ? (
                <TouchableOpacity
                  onPress={() => setShowMonthPicker(true)}
                  activeOpacity={0.7}
                >
                  <Text
                    className="text-lg font-semibold"
                    style={{ color: colors.foreground }}
                  >
                    {formatPeriodLabel()}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text
                  className="text-lg font-semibold"
                  style={{ color: colors.foreground }}
                >
                  {formatPeriodLabel()}
                </Text>
              )}
              <TouchableOpacity
                onPress={handleNextPeriod}
                className="pl-1 py-1"
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="chevron-right"
                  size={24}
                  color={colors.foreground}
                />
              </TouchableOpacity>
            </View>

            {/* Period Selector with Dropdown + Filter Icon */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                position: "relative",
                zIndex: 1000,
              }}
            >
              <View style={{ position: "relative" }}>
                <TouchableOpacity
                  onPress={() => setShowPeriodDropdown(!showPeriodDropdown)}
                  className="flex-row items-center gap-1 px-3 py-1.5 rounded-md"
                  style={{ backgroundColor: colors.background.subtle }}
                  activeOpacity={0.7}
                >
                  <Text
                    className="text-sm font-medium"
                    style={{ color: colors.foreground }}
                  >
                    {period === "month" ? "Monthly" : "Annually"}
                  </Text>
                  <MaterialIcons
                    name={
                      showPeriodDropdown ? "arrow-drop-up" : "arrow-drop-down"
                    }
                    size={20}
                    color={colors.foreground}
                  />
                </TouchableOpacity>

                {/* Dropdown */}
                {showPeriodDropdown && (
                  <View
                    style={{
                      position: "absolute",
                      top: "100%",
                      right: 0,
                      marginTop: 4,
                      backgroundColor: colors.card.DEFAULT,
                      borderRadius: 8,
                      paddingVertical: 4,
                      minWidth: 140,
                      borderWidth: 1,
                      borderColor: colors.border,
                      shadowColor: colors.shadow,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.25,
                      shadowRadius: 4,
                      elevation: 10,
                      zIndex: 1001,
                    }}
                    onStartShouldSetResponder={() => true}
                  >
                    {periodOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        onPress={() => {
                          setPeriod(option.value);
                          setShowPeriodDropdown(false);
                        }}
                        className="py-3 px-4"
                        style={{
                          backgroundColor:
                            period === option.value
                              ? colors.primary.soft
                              : "transparent",
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          className="text-sm font-medium"
                          style={{
                            color:
                              period === option.value
                                ? colors.primary.DEFAULT
                                : colors.foreground,
                          }}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Filter Icon */}
              <TouchableOpacity
                onPress={() => setShowFilterSheet(true)}
                style={{ padding: 6, position: "relative" }}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="filter-alt"
                  size={22}
                  color={hasActiveFilters ? colors.primary.DEFAULT : colors.foreground}
                />
                {hasActiveFilters && (
                  <View
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: colors.primary.DEFAULT,
                    }}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Income/Expense Toggle */}
          <View
            className="flex-row gap-2 mb-4 p-1 rounded-lg"
            style={{ backgroundColor: colors.background.subtle }}
          >
            <TouchableOpacity
              onPress={() => setSelectedType("income")}
              className="flex-1 py-2 px-4 rounded-md items-center"
              style={{
                backgroundColor:
                  selectedType === "income"
                    ? colors.primary.DEFAULT
                    : "transparent",
              }}
              activeOpacity={0.7}
            >
              <Text
                className="text-sm font-semibold"
                style={{
                  color:
                    selectedType === "income"
                      ? colors.primary.foreground
                      : colors.muted.foreground,
                }}
              >
                Income
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSelectedType("expense")}
              className="flex-1 py-2 px-4 rounded-md items-center"
              style={{
                backgroundColor:
                  selectedType === "expense"
                    ? colors.destructive.DEFAULT
                    : "transparent",
              }}
              activeOpacity={0.7}
            >
              <Text
                className="text-sm font-semibold"
                style={{
                  color:
                    selectedType === "expense"
                      ? colors.destructive.foreground
                      : colors.muted.foreground,
                }}
              >
                Expense
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Pie Chart */}
        {currentStats.length > 0 ? (
          <View
            className="items-center"
            // style={{ backgroundColor: colors.background.subtle }}
          >
            <PieChart
              data={pieData}
              radius={120}
              // Text
              showText
              textSize={18}
              textColor={colors.foreground}
              // Stroke
              strokeWidth={1}
              strokeColor={colors.background.DEFAULT}
              // Dont
              donut
              innerCircleColor={colors.background.DEFAULT}
              innerRadius={60}
              centerLabelComponent={() => (
                <View className="items-center justify-center">
                  {/* <Text className="text-2xl font-bold">Total</Text> */}
                  <Text
                    className="text-base font-bold"
                    style={{
                      color:
                        selectedType === "income"
                          ? colors.primary.DEFAULT
                          : colors.destructive.DEFAULT,
                    }}
                  >
                    {formatAmount(totalAmount, statsData.currency)}
                  </Text>
                </View>
              )}
              // External Labels
              // extraRadius={80}
              // showExternalLabels
              // showValuesAsLabels
              labelsPosition="outward"
              // externalLabelComponent={(item: any) => {
              //   return (
              //     <SvgText
              //       fontSize={11}
              //       fontWeight="800"
              //       fill={colors.foreground}
              //     >
              //       {item?.label}
              //     </SvgText>
              //   );
              // }}
              // labelLineConfig={{
              //   // length: 8,
              //   tailLength: 16,
              //   color: colors.muted.foreground,
              //   thickness: 1,
              //   labelComponentWidth: 42,
              //   // ⬇️ THIS is the main fix
              //   avoidOverlappingOfLabels: true,
              // }}
            />
          </View>
        ) : (
          <View className="items-center py-12">
            <MaterialIcons
              name="pie-chart"
              size={64}
              color={colors.muted.foreground}
            />
            <Text
              className="text-base mt-4"
              style={{ color: colors.muted.foreground }}
            >
              No {selectedType} data available
            </Text>
          </View>
        )}

        {/* Category List */}
        {currentStats.length > 0 && (
          <View className="mt-4">
            {/* <Text
              className="text-lg font-semibold mb-3 px-4"
              style={{ color: colors.foreground }}
            >
              Category Breakdown
            </Text> */}
            <View
              style={{
                backgroundColor: colors.card.DEFAULT,
                width: "100%",
              }}
            >
              {currentStats.map((stat, index) => (
                <CategoryListItem
                  key={stat.categoryId || `uncategorized-${index}`}
                  stat={stat}
                  colors={colors}
                  categoryBgColor={categoryBgColor}
                  currency={statsData.currency}
                  isLast={index === currentStats.length - 1}
                  selectedType={selectedType}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Filter Sheet */}
      <FilterSheet
        visible={showFilterSheet}
        colors={colors}
        selectedAccountIds={selectedAccountIds}
        selectedCategoryIds={selectedCategoryIds}
        currentDateRange={currentDateRange}
        onClose={() => setShowFilterSheet(false)}
        onApply={(accountIds, categoryIds) => {
          setSelectedAccountIds(accountIds);
          setSelectedCategoryIds(categoryIds);
        }}
      />

      {/* Month/Year Picker Modal (only shown when period is month) */}
      {period === "month" && (
        <MonthYearPickerModal
          visible={showMonthPicker}
          currentDate={referenceDate}
          colors={colors}
          onClose={() => setShowMonthPicker(false)}
          onSelect={(date) => {
            setReferenceDate(date);
            setShowMonthPicker(false);
          }}
        />
      )}
    </SafeAreaView>
  );
}

interface CategoryListItemProps {
  stat: CategoryStat;
  colors: ReturnType<typeof useThemeColors>;
  categoryBgColor: string;
  currency: string;
  isLast: boolean;
  selectedType: "income" | "expense";
}

function CategoryListItem({
  stat,
  colors,
  categoryBgColor,
  currency,
  isLast,
  selectedType,
}: CategoryListItemProps) {
  return (
    <View
      className="flex-row items-center justify-between py-2 px-4"
      style={{
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.border,
      }}
    >
      <View className="flex-row items-center gap-3 flex-1">
        {/* Percentage Box */}
        <View
          className="size-8 rounded-md items-center justify-center"
          style={{ backgroundColor: stat.categoryColor }}
        >
          <Text
            className="text-xs font-bold"
            style={{ color: colors.white }}
          >
            {Math.round(stat.percentage)}%
          </Text>
        </View>

        {/* Category Info */}
        <View className="flex-row items-center gap-2 flex-1">
          <Text className="text-2xl">{stat.categoryEmoji}</Text>
          <Text
            className="text-base font-medium flex-1"
            style={{ color: colors.foreground }}
            numberOfLines={1}
          >
            {stat.categoryName}
          </Text>
        </View>
      </View>

      {/* Amount */}
      <Text
        className="text-base font-semibold ml-2"
        style={{
          color:
            selectedType === "income"
              ? colors.primary.DEFAULT
              : colors.destructive.DEFAULT,
        }}
      >
        {formatAmount(stat.totalAmount, currency)}
      </Text>
    </View>
  );
}
