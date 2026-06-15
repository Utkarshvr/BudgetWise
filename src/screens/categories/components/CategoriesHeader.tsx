import { Text, View, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "@/constants/theme";

type CategoriesHeaderProps = {
  onAddCategory: () => void;
  onAddGroup: () => void;
};

export function CategoriesHeader({
  onAddCategory,
  onAddGroup,
}: CategoriesHeaderProps) {
  const colors = useThemeColors();
  
  return (
    <View className="mb-6">
      <View className="flex-row items-center justify-between">
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
          Create groups, then add child categories inside them
        </Text>
      </View>
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={onAddGroup}
            className="px-3 h-12 rounded-2xl items-center justify-center flex-row"
            style={{ backgroundColor: colors.background.subtle }}
          >
            <MaterialIcons name="folder" size={18} color={colors.foreground} />
            <Text className="ml-1.5 text-sm font-semibold" style={{ color: colors.foreground }}>
              Group
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onAddCategory}
            className="px-3 h-12 rounded-2xl items-center justify-center flex-row"
            style={{ backgroundColor: colors.primary.strong }}
          >
            <MaterialIcons name="add" size={18} color={colors.white} />
            <Text className="ml-1.5 text-sm font-semibold" style={{ color: colors.white }}>
              Category
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

