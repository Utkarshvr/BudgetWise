import { Text, TouchableOpacity, View } from "react-native";
import { useThemeColors } from "@/constants/theme";

type CategoriesTabsProps = {
  activeTab: "income" | "expense";
  onChangeTab: (tab: "income" | "expense") => void;
};

export function CategoriesTabs({ activeTab, onChangeTab }: CategoriesTabsProps) {
  const colors = useThemeColors();
  
  return (
    <View
      className="flex-row mb-6 rounded-2xl p-1"
      style={{ backgroundColor: colors.background.subtle }}
    >
      <TouchableOpacity
        onPress={() => onChangeTab("expense")}
        className="flex-1 py-3 rounded-xl"
        style={{
          backgroundColor:
            activeTab === "expense"
              ? colors.card.DEFAULT
              : "transparent",
        }}
      >
        <Text
          className="text-center font-semibold"
          style={{
            color:
              activeTab === "expense"
                ? colors.foreground
                : colors.muted.foreground,
          }}
        >
          Expense
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => onChangeTab("income")}
        className="flex-1 py-3 rounded-xl"
        style={{
          backgroundColor:
            activeTab === "income"
              ? colors.card.DEFAULT
              : "transparent",
        }}
      >
        <Text
          className="text-center font-semibold"
          style={{
            color:
              activeTab === "income"
                ? colors.foreground
                : colors.muted.foreground,
          }}
        >
          Income
        </Text>
      </TouchableOpacity>
    </View>
  );
}

