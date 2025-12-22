import { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

type ToastType = "success" | "error" | "info" | "warning";

type ToastProps = {
  message: string;
  type?: ToastType;
  visible: boolean;
  duration?: number;
  onHide: () => void;
};

export function Toast({
  message,
  type = "info",
  visible,
  duration = 3000,
  onHide,
}: ToastProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      // Reset animations to initial state
      fadeAnim.setValue(0);
      slideAnim.setValue(-100);
      
      // Show animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after duration
      const timer = setTimeout(() => {
        hide();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hide = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  const getTypeStyles = () => {
    switch (type) {
      case "success":
        return {
          bg: "bg-emerald-500",
          border: "border-emerald-400",
          icon: "check-circle" as const,
          iconColor: "#10b981",
        };
      case "error":
        return {
          bg: "bg-rose-500",
          border: "border-rose-400",
          icon: "error" as const,
          iconColor: "#f43f5e",
        };
      case "warning":
        return {
          bg: "bg-amber-500",
          border: "border-amber-400",
          icon: "warning" as const,
          iconColor: "#f59e0b",
        };
      default:
        return {
          bg: "bg-blue-500",
          border: "border-blue-400",
          icon: "info" as const,
          iconColor: "#3b82f6",
        };
    }
  };

  const styles = getTypeStyles();

  // Don't render if not visible
  if (!visible) return null;

  return (
    <Animated.View
      style={[
        stylesheet.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      pointerEvents="none"
    >
      <View
        className={`${styles.bg} ${styles.border} flex-row items-center rounded-2xl border px-4 py-3 shadow-lg`}
      >
        <MaterialIcons
          name={styles.icon}
          size={20}
          color="white"
          style={{ marginRight: 12 }}
        />
        <Text className="flex-1 text-sm font-semibold text-white">
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

const stylesheet = StyleSheet.create({
  container: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
});

