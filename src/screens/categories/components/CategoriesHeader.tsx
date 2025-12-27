import { Text, View, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "@/constants/theme";

type CategoriesHeaderProps = {
  onAddCategory: () => void;
};

export function CategoriesHeader({ onAddCategory }: CategoriesHeaderProps) {
  const colors = useThemeColors();
  
  return (
    <View className="flex-row items-center justify-between mb-6">
      <View>
        <Text
          className="text-3xl font-bold"
          style={{ color: colors.foreground }}
        >
          Categories
        </Text>
        <Text
          className="text-sm mt-1"
          style={{ color: colors.muted.foreground }}
        >
          Organize your income and expenses
        </Text>
      </View>
      <TouchableOpacity
        onPress={onAddCategory}
        className="w-12 h-12 rounded-2xl items-center justify-center"
        style={{ backgroundColor: colors.primary.strong }}
      >
        <MaterialIcons name="add" size={24} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}

