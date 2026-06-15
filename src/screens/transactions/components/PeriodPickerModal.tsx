import React, { useState } from "react";
import { Modal, View, Text, TouchableOpacity, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { type ThemeColors } from "@/constants/theme";
import { DateRangeFilter } from "../utils/dateRange";

type PeriodPickerModalProps = {
  visible: boolean;
  currentDate: Date;
  period: DateRangeFilter;
  colors: ThemeColors;
  onClose: () => void;
  onSelect: (date: Date, period: DateRangeFilter) => void;
};

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

const periodOptions: { label: string; value: DateRangeFilter }[] = [
  { label: "Monthly", value: "month" },
  { label: "Annually", value: "year" },
];

export function PeriodPickerModal({
  visible,
  currentDate,
  period,
  colors,
  onClose,
  onSelect,
}: PeriodPickerModalProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<DateRangeFilter>(period);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  React.useEffect(() => {
    if (visible) {
      setSelectedPeriod(period);
      setSelectedYear(currentDate.getFullYear());
    }
  }, [visible, currentDate, period]);

  const handleYearChange = (direction: "prev" | "next") => {
    setSelectedYear((prev) => (direction === "next" ? prev + 1 : prev - 1));
  };

  const handleMonthSelect = (monthIndex: number) => {
    onSelect(new Date(selectedYear, monthIndex, 1), "month");
    onClose();
  };

  const handleYearSelect = () => {
    onSelect(new Date(selectedYear, 0, 1), "year");
    onClose();
  };

  const handleShortcut = () => {
    const today = new Date();
    if (selectedPeriod === "month") {
      onSelect(today, "month");
    } else {
      onSelect(new Date(today.getFullYear(), 0, 1), "year");
    }
    onClose();
  };

  const isCurrentMonth = (monthIndex: number) => {
    const today = new Date();
    return (
      selectedYear === today.getFullYear() && monthIndex === today.getMonth()
    );
  };

  const isSelectedMonth = (monthIndex: number) => {
    return (
      period === "month" &&
      selectedYear === currentDate.getFullYear() &&
      monthIndex === currentDate.getMonth()
    );
  };

  const isSelectedYear = selectedYear === currentDate.getFullYear();
  const isCurrentYear = selectedYear === new Date().getFullYear();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: colors.overlay }}
        onPress={onClose}
      >
        <Pressable
          style={{
            backgroundColor: colors.card.DEFAULT,
            marginTop: "auto",
            marginBottom: "auto",
            marginHorizontal: 20,
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: colors.border,
          }}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: colors.foreground,
              }}
            >
              Date
            </Text>
            <TouchableOpacity
              onPress={handleShortcut}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  color: colors.foreground,
                }}
              >
                {selectedPeriod === "month" ? "THIS MONTH" : "THIS YEAR"}
              </Text>
              <MaterialIcons name="close" size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          {/* Period Toggle */}
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              marginBottom: 20,
              padding: 4,
              borderRadius: 8,
              backgroundColor: colors.background.subtle,
            }}
          >
            {periodOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => setSelectedPeriod(option.value)}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 6,
                  alignItems: "center",
                  backgroundColor:
                    selectedPeriod === option.value
                      ? colors.primary.DEFAULT
                      : "transparent",
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color:
                      selectedPeriod === option.value
                        ? colors.primary.foreground
                        : colors.muted.foreground,
                  }}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Year Navigation */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: selectedPeriod === "month" ? 24 : 8,
              gap: 16,
            }}
          >
            <TouchableOpacity onPress={() => handleYearChange("prev")}>
              <MaterialIcons
                name="chevron-left"
                size={28}
                color={colors.foreground}
              />
            </TouchableOpacity>
            {selectedPeriod === "year" ? (
              <TouchableOpacity onPress={handleYearSelect}>
                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: "bold",
                    color: isSelectedYear
                      ? colors.primary.DEFAULT
                      : colors.foreground,
                    minWidth: 100,
                    textAlign: "center",
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    backgroundColor: isCurrentYear
                      ? colors.primary.soft
                      : "transparent",
                  }}
                >
                  {selectedYear}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "bold",
                  color: colors.foreground,
                  minWidth: 80,
                  textAlign: "center",
                }}
              >
                {selectedYear}
              </Text>
            )}
            <TouchableOpacity onPress={() => handleYearChange("next")}>
              <MaterialIcons
                name="chevron-right"
                size={28}
                color={colors.foreground}
              />
            </TouchableOpacity>
          </View>

          {selectedPeriod === "year" && (
            <Text
              style={{
                textAlign: "center",
                fontSize: 13,
                color: colors.muted.foreground,
                marginBottom: 8,
              }}
            >
              Tap the year to select
            </Text>
          )}

          {/* Month Grid */}
          {selectedPeriod === "month" && (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "space-between",
              }}
            >
              {MONTHS.map((month, index) => {
                const isSelected = isSelectedMonth(index);
                const isCurrent = isCurrentMonth(index);

                return (
                  <TouchableOpacity
                    key={month}
                    onPress={() => handleMonthSelect(index)}
                    style={{
                      width: "23%",
                      aspectRatio: 1,
                      justifyContent: "center",
                      alignItems: "center",
                      borderRadius: 8,
                      marginBottom: 12,
                      backgroundColor: isSelected
                        ? colors.primary.DEFAULT
                        : isCurrent
                          ? colors.primary.soft
                          : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: isSelected ? "bold" : "500",
                        color: isSelected
                          ? colors.primary.foreground
                          : colors.foreground,
                      }}
                    >
                      {month}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
