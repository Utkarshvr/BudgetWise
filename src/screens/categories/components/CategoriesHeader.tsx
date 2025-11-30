import { Text, View, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "@/constants/theme";

type CategoriesHeaderProps = {
  onAddCategory: () => void;
};

export function CategoriesHeader({ onAddCategory }: CategoriesHeaderProps) {
  return (
    <View className="flex-row items-center justify-between mb-6">
      <View>
        <Text className="text-3xl font-bold text-foreground">Categories</Text>
        <Text className="text-muted-foreground text-sm mt-1">
          Organize your income and expenses
        </Text>
      </View>
      <TouchableOpacity
        onPress={onAddCategory}
        className="w-12 h-12 rounded-2xl bg-primary-strong items-center justify-center"
      >
        <MaterialIcons name="add" size={24} color={theme.colors.white} />
      </TouchableOpacity>
    </View>
  );
}

