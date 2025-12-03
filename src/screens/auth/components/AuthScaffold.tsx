import { LinearGradient } from "expo-linear-gradient";
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ReactNode } from "react";

type AuthScaffoldProps = {
  title: string;
  subtitle?: string;
  footer?: ReactNode;
  children: ReactNode;
};

export function AuthScaffold({
  title,
  subtitle,
  footer,
  children,
}: AuthScaffoldProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-neutral-50 dark:bg-neutral-950"
      style={{ paddingTop: insets.top }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.select({
          ios: insets.top,
          android: -20,
        })}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentInsetAdjustmentBehavior="automatic"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: 24,
              paddingTop: 16,
              paddingBottom: Math.max(insets.bottom, 16),
            }}
            bounces={false}
          >
            <View
              className="gap-8"
              style={{
                flexGrow: 1,
                alignItems: "center",
                justifyContent: "flex-start",
              }}
            >
              <Image
                source={require("@/assets/brand/icon-nobg.png")}
                style={{ width: 160, height: 160 }}
                resizeMode="contain"
              />

              <View className="w-full gap-6">
                {children}
              </View>
            </View>
            {footer ? (
              <View className="mt-8 items-center pb-6">{footer}</View>
            ) : null}
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}
