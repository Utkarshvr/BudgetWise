import { TouchableOpacity, Text, StyleSheet, Platform } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "@/constants/theme";

interface FloatingActionButtonProps {
  onPress: () => void;
  label: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  bottomOffset?: number;
}

export function FloatingActionButton({
  onPress,
  label,
  icon = "add",
  bottomOffset = 20,
}: FloatingActionButtonProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      style={[
        styles.fab,
        {
          bottom: 60 + insets.bottom + bottomOffset,
          backgroundColor: colors.primary.strong,
          ...Platform.select({
            ios: {
              shadowColor: colors.shadow,
              shadowOffset: {
                width: 0,
                height: 4,
              },
              shadowOpacity: 0.3,
              shadowRadius: 4.65,
            },
            android: {
              elevation: 8,
            },
          }),
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <MaterialIcons name={icon} size={28} color={colors.white} />
      <Text
        style={{
          color: colors.white,
          fontSize: 16,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
});

