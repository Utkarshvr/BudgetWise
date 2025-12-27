import { Text, View, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "@/constants/theme";

type AddAccountCardProps = {
  onPress: () => void;
};

export function AddAccountCard({ onPress }: AddAccountCardProps) {
  const colors = useThemeColors();
  
  return (
    <TouchableOpacity
      className="border-2 border-dashed rounded-2xl p-4 mb-6"
      style={{ borderColor: colors.primary.border }}
      onPress={onPress}
    >
      <View className="flex-row items-center">
        <View
          className="size-10 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: colors.primary.strong }}
        >
          <MaterialIcons
            name="add"
            size={24}
            color={colors.primary.foreground}
          />
        </View>
        <Text
          className="text-base font-semibold"
          style={{ color: colors.primary.DEFAULT }}
        >
          Add Account
        </Text>
      </View>
    </TouchableOpacity>
  );
}
