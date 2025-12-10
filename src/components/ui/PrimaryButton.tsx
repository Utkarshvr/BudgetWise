import {
  ActivityIndicator,
  Pressable,
  Text,
  useColorScheme,
} from "react-native";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "solid" | "ghost";
};

/**
 * Primary button component with loading and disabled states
 * Supports solid and ghost variants with theme-aware styling
 */
export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  variant = "solid",
}: PrimaryButtonProps) {
  const scheme = useColorScheme();

  if (variant === "ghost") {
    return (
      <Pressable
        disabled={loading || disabled}
        onPress={onPress}
        className="h-12 items-center justify-center rounded-2xl border border-transparent bg-transparent"
      >
        {loading ? (
          <ActivityIndicator
            color={scheme === "dark" ? "#f8fafc" : "#0f172a"}
          />
        ) : (
          <Text className="text-base font-semibold text-neutral-900 dark:text-white">
            {label}
          </Text>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      disabled={loading || disabled}
      onPress={onPress}
      className={`h-12 items-center justify-center rounded-2xl ${
        disabled
          ? "bg-neutral-400/40 dark:bg-neutral-700/40"
          : "bg-neutral-900 dark:bg-white"
      } shadow-lg shadow-neutral-900/40 dark:shadow-black/30`}
    >
      {loading ? (
        <ActivityIndicator color={scheme === "dark" ? "#0f172a" : "#f8fafc"} />
      ) : (
        <Text
          className={`text-base font-semibold ${
            disabled
              ? "text-neutral-400 dark:text-neutral-400"
              : " text-white dark:text-neutral-900"
          }`}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

