import { Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "@/constants/theme";
import { PrimaryButton } from "@/components/ui";

type CategoriesEmptyStateProps = {
  activeTab: "income" | "expense";
  onCreateCategory: () => void;
};

export function CategoriesEmptyState({
  activeTab,
  onCreateCategory,
}: CategoriesEmptyStateProps) {
  const colors = useThemeColors();
  
  return (
    <View
      className="rounded-2xl p-6 items-center"
      style={{ backgroundColor: colors.muted.DEFAULT }}
    >
      <MaterialIcons
        name="category"
        size={48}
        color={colors.muted.foreground}
      />
      <Text
        className="text-lg font-semibold mt-4"
        style={{ color: colors.foreground }}
      >
        No {activeTab} categories yet
      </Text>
      <Text
        className="text-sm text-center mt-2"
        style={{ color: colors.muted.foreground }}
      >
        Create your first {activeTab} category to start organizing
        transactions.
      </Text>
      <View className="w-full mt-4">
        <PrimaryButton label="Create Category" onPress={onCreateCategory} />
      </View>
    </View>
  );
}

