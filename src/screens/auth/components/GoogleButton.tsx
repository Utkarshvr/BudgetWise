import {
  ActivityIndicator,
  Pressable,
  Text,
  useColorScheme,
} from "react-native";
import { GoogleIcon } from "@/components/icons/GoogleIcon";

type GoogleButtonProps = {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

export function GoogleButton({
  onPress,
  loading,
  disabled,
}: GoogleButtonProps) {
  const scheme = useColorScheme();

  return (
    <Pressable
      disabled={loading || disabled}
      onPress={onPress}
      className={`h-12 flex-row items-center justify-center gap-3 rounded-2xl border ${
        disabled
          ? "border-neutral-300 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800"
          : "border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900"
      } shadow-sm`}
    >
      {loading ? (
        <ActivityIndicator color={scheme === "dark" ? "#f8fafc" : "#0f172a"} />
      ) : (
        <>
          <GoogleIcon size={20} />
          <Text className="text-base font-semibold text-neutral-900 dark:text-white">
            Continue with Google
          </Text>
        </>
      )}
    </Pressable>
  );
}
