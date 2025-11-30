import { Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "@/constants/theme";
import { PrimaryButton } from "@/screens/auth/components/PrimaryButton";

type CategoriesEmptyStateProps = {
  activeTab: "income" | "expense";
  onCreateCategory: () => void;
};

export function CategoriesEmptyState({
  activeTab,
  onCreateCategory,
}: CategoriesEmptyStateProps) {
  return (
    <View className="bg-muted rounded-2xl p-6 items-center">
      <MaterialIcons
        name="category"
        size={48}
        color={theme.colors.muted.foreground}
      />
      <Text className="text-foreground text-lg font-semibold mt-4">
        No {activeTab} categories yet
      </Text>
      <Text className="text-muted-foreground text-sm text-center mt-2">
        Create your first {activeTab} category to start organizing
        transactions.
      </Text>
      <View className="w-full mt-4">
        <PrimaryButton label="Create Category" onPress={onCreateCategory} />
      </View>
    </View>
  );
}

