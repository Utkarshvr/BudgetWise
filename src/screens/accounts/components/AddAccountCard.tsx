import { Text, View, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "@/constants/theme";

type AddAccountCardProps = {
  onPress: () => void;
};

export function AddAccountCard({ onPress }: AddAccountCardProps) {
  return (
    <TouchableOpacity
      className="border-2 border-dashed border-primary-border rounded-2xl p-4 mb-6"
      onPress={onPress}
    >
      <View className="flex-row items-center">
        <View className="bg-primary-strong size-10 rounded-full items-center justify-center mr-3">
          <MaterialIcons
            name="add"
            size={24}
            color={theme.colors.primary.foreground}
          />
        </View>
        <Text className="text-primary text-base font-semibold">
          Add Account
        </Text>
      </View>
    </TouchableOpacity>
  );
}
