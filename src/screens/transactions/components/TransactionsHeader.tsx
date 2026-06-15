import React, { useState } from "react";
import { Text, View, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { type ThemeColors } from "@/constants/theme";
import { DateRangeFilter } from "../utils/dateRange";
import { PeriodPickerModal } from "./PeriodPickerModal";

type TransactionsHeaderProps = {
  totalCount: number;
  colors: ThemeColors;
  period: DateRangeFilter;
  referenceDate: Date;
  onPeriodChange: (period: DateRangeFilter) => void;
  onPrev: () => void;
  onNext: () => void;
  onDateSelect?: (date: Date) => void;
  onSearchPress?: () => void;
  onFilterPress?: () => void;
  hasActiveFilters?: boolean;
};

function formatPeriodLabel(period: DateRangeFilter, referenceDate: Date): string {
  if (period === "month") {
    return referenceDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }
  return referenceDate.getFullYear().toString();
}

export function TransactionsHeader({
  colors,
  period,
  referenceDate,
  onPeriodChange,
  onPrev,
  onNext,
  onDateSelect,
  onSearchPress,
  onFilterPress,
  hasActiveFilters = false,
}: TransactionsHeaderProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSelect = (date: Date, newPeriod: DateRangeFilter) => {
    onPeriodChange(newPeriod);
    onDateSelect?.(date);
  };

  return (
    <>
      <View className="p-2 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="flex-row items-center justify-center">
            <TouchableOpacity onPress={onPrev} className="pr-1 py-1">
              <MaterialIcons
                name="chevron-left"
                size={28}
                color={colors.foreground}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              className="px-1 py-1"
            >
              <Text
                className="text-base font-bold text-center"
                style={{ color: colors.foreground }}
              >
                {formatPeriodLabel(period, referenceDate)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onNext} className="pl-1 py-1">
              <MaterialIcons
                name="chevron-right"
                size={28}
                color={colors.foreground}
              />
            </TouchableOpacity>
          </View>
        </View>
        <View className="flex-row items-center gap-2">
          {onSearchPress && (
            <TouchableOpacity onPress={onSearchPress} className="p-2">
              <MaterialIcons
                name="search"
                size={24}
                color={colors.foreground}
              />
            </TouchableOpacity>
          )}
          {onFilterPress && (
            <TouchableOpacity
              onPress={onFilterPress}
              className="p-2"
              style={{ position: "relative" }}
            >
              <MaterialIcons
                name="filter-alt"
                size={24}
                color={hasActiveFilters ? colors.primary.DEFAULT : colors.foreground}
              />
              {hasActiveFilters && (
                <View
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: colors.primary.DEFAULT,
                  }}
                />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      <PeriodPickerModal
        visible={showDatePicker}
        currentDate={referenceDate}
        period={period}
        colors={colors}
        onClose={() => setShowDatePicker(false)}
        onSelect={handleSelect}
      />
    </>
  );
}
