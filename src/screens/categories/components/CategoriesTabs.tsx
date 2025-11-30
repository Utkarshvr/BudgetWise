import { Text, TouchableOpacity, View } from "react-native";
import { theme } from "@/constants/theme";

type CategoriesTabsProps = {
  activeTab: "income" | "expense";
  onChangeTab: (tab: "income" | "expense") => void;
};

export function CategoriesTabs({ activeTab, onChangeTab }: CategoriesTabsProps) {
  return (
    <View className="flex-row mb-6 bg-muted rounded-2xl p-1">
      <TouchableOpacity
        onPress={() => onChangeTab("expense")}
        className="flex-1 py-3 rounded-xl"
        style={{
          backgroundColor:
            activeTab === "expense"
              ? theme.colors.tabActive.expense
              : "transparent",
        }}
      >
        <Text
          className={`text-center font-semibold ${
            activeTab === "expense" ? "text-foreground" : "text-muted-foreground"
          }`}
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
              ? theme.colors.tabActive.income
              : "transparent",
        }}
      >
        <Text
          className={`text-center font-semibold ${
            activeTab === "income" ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          Income
        </Text>
      </TouchableOpacity>
    </View>
  );
}

