import { ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemeColors } from "@/constants/theme";

type FullScreenLoaderProps = {
  colors?: ReturnType<typeof useThemeColors>;
};

/**
 * Full-screen loading indicator component
 * Displays a centered activity indicator with theme-aware styling
 */
export function FullScreenLoader({ colors: colorsProp }: FullScreenLoaderProps = {}) {
  const themeColors = useThemeColors();
  const colors = colorsProp ?? themeColors;

  return (
    <SafeAreaView
      className="flex-1 items-center justify-center"
      style={{ backgroundColor: colors.background.DEFAULT }}
    >
      <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
    </SafeAreaView>
  );
}

