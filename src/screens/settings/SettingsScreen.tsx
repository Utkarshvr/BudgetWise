import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  Image,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useSupabaseSession } from "@/hooks";
import { useThemeColors } from "@/constants/theme";
import { supabase } from "@/lib";
import { useColorScheme } from "nativewind";
import { getThemePreference, setThemePreference, type ThemePreference } from "@/utils/themeStorage";

type ThemeOption = "system" | "light" | "dark";

export default function SettingsScreen() {
  const colors = useThemeColors();
  const { session } = useSupabaseSession();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const user = session?.user;

  const { colorScheme, setColorScheme } = useColorScheme();
  
  // Get the current theme preference (system, light, or dark)
  const currentTheme: ThemeOption = (colorScheme as ThemeOption) || "system";

  // Load theme preference on mount
  useEffect(() => {
    const loadThemePreference = async () => {
      const savedPreference = await getThemePreference();
      if (savedPreference && savedPreference !== colorScheme) {
        setColorScheme(savedPreference);
      }
    };
    loadThemePreference();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle theme change
  const handleThemeChange = async (theme: ThemeOption) => {
    await setThemePreference(theme);
    setColorScheme(theme);
    setShowThemeModal(false);
  };

  const displayName =
    (user?.user_metadata as any)?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    "Guest";

  const email = user?.email ?? "";
  const avatarUrl =
    (user?.user_metadata as any)?.avatar_url ||
    (user?.user_metadata as any)?.picture ||
    null;

  const handleAccountSettings = () => {
    router.push("/(auth)/account-settings");
  };

  const handleHelpCenter = () => {
    router.push("/(auth)/help-center");
  };

  const handleLogout = async () => {
    try {
      setShowLogoutConfirm(false);
      console.log("🚪 [LOGOUT] Starting logout process...");

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("🚪 [LOGOUT] Sign out error:", error);
        // Still try to navigate even if there's an error
      } else {
        console.log("🚪 [LOGOUT] Sign out successful");
      }

      // Explicitly navigate to sign-in screen after logout
      // This ensures navigation happens even if auth state change is delayed on Android
      router.replace("/(public)/sign-in");
    } catch (err) {
      console.error("🚪 [LOGOUT] Unexpected error during logout:", err);
      // Still navigate to sign-in screen
      router.replace("/(public)/sign-in");
    }
  };

  const handleTermsService = async () => {
    try {
      await WebBrowser.openBrowserAsync("https://uv-budget-tracker.vercel.app");
    } catch (error) {
      console.error("Error opening Terms & Service:", error);
    }
  };

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: colors.background.DEFAULT }}
    >
      <ScrollView
        className="flex-1 p-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <View className="gap-4" style={{ flex: 1 }}>
          {/* Profile header */}
          <View className="items-center mb-8">
            <View
              className="w-24 h-24 rounded-full items-center justify-center overflow-hidden"
              style={{
                backgroundColor: colors.card.DEFAULT,
                borderColor: colors.primary.soft,
                borderWidth: 2,
              }}
            >
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={{ width: 96, height: 96 }}
                  resizeMode="cover"
                />
              ) : (
                <View className="items-center justify-center w-full h-full">
                  <MaterialIcons
                    name="person"
                    size={48}
                    color={colors.primary.DEFAULT}
                  />
                </View>
              )}
            </View>
            <Text
              className="mt-4 text-lg font-semibold text-center"
              style={{ color: colors.foreground }}
            >
              {displayName}
            </Text>
            {email ? (
              <Text
                className="mt-1 text-sm text-center"
                style={{ color: colors.muted.foreground }}
              >
                {email}
              </Text>
            ) : null}

            {/* Upgrade pill – visually similar to reference, non-blocking */}
            {/* <TouchableOpacity
              activeOpacity={0.9}
              className="mt-4 px-6 py-3 rounded-full flex-row items-center gap-2"
              style={{ backgroundColor: colors.primary.DEFAULT }}
            >
              <Text
                className="text-sm font-semibold"
                style={{ color: colors.primary.foreground }}
              >
                Upgrade to Premium
              </Text>
              <MaterialIcons
                name="workspace-premium"
                size={18}
                color={colors.primary.foreground}
              />
            </TouchableOpacity> */}
          </View>

          {/* Settings section */}
          <View className="mb-6">
            <Text
              className="mb-3 text-xs font-semibold uppercase tracking-wide"
              style={{ color: colors.muted.foreground }}
            >
              Settings
            </Text>

            <View
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: colors.card.DEFAULT }}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleAccountSettings}
                className="flex-row items-center justify-between px-4 py-4"
              >
                <View className="flex-row items-center gap-3">
                  <View
                    className="w-9 h-9 items-center justify-center rounded-full"
                    style={{ backgroundColor: colors.muted.DEFAULT }}
                  >
                    <MaterialIcons
                      name="person-outline"
                      size={20}
                      style={{ color: colors.foreground }}
                    />
                  </View>
                  <View>
                    <Text
                      className="text-base font-medium"
                      style={{ color: colors.foreground }}
                    >
                      Account Settings
                    </Text>
                    <Text
                      className="text-xs mt-0.5"
                      style={{ color: colors.muted.foreground }}
                    >
                      Manage your personal information
                    </Text>
                  </View>
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={22}
                  color={colors.muted.foreground}
                />
              </TouchableOpacity>

              <View className="h-px" style={{ backgroundColor: colors.border }} />

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowThemeModal(true)}
                className="flex-row items-center justify-between px-4 py-4"
              >
                <View className="flex-row items-center gap-3 flex-1">
                  <View
                    className="w-9 h-9 items-center justify-center rounded-full"
                    style={{ backgroundColor: colors.muted.DEFAULT }}
                  >
                    <MaterialIcons
                      name="palette"
                      size={20}
                      style={{ color: colors.foreground }}
                    />
                  </View>
                  <View className="flex-1" style={{ minWidth: 0 }}>
                    <Text
                      className="text-base font-medium"
                      style={{ color: colors.foreground }}
                      numberOfLines={1}
                    >
                      Theme
                    </Text>
                    <Text
                      className="text-xs mt-0.5"
                      style={{ color: colors.muted.foreground }}
                      numberOfLines={1}
                    >
                      {currentTheme === "system"
                        ? "System Default"
                        : currentTheme === "light"
                        ? "Light Mode"
                        : "Dark Mode"}
                    </Text>
                  </View>
                </View>
                <View style={{ marginLeft: 8 }}>
                  <MaterialIcons
                    name="chevron-right"
                    size={22}
                    color={colors.muted.foreground}
                  />
                </View>
              </TouchableOpacity>

              {/* <View className="h-px" style={{ backgroundColor: colors.border }} />

            <TouchableOpacity
              activeOpacity={0.7}
              className="flex-row items-center justify-between px-4 py-4"
            >
              <View className="flex-row items-center gap-3">
                <View
                  className="w-9 h-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: colors.muted.DEFAULT }}
                >
                  <MaterialIcons
                    name="star-border"
                    size={20}
                    color={colors.foreground}
                  />
                </View>
                <View>
                  <Text
                    className="text-base font-medium"
                    style={{ color: colors.foreground }}
                  >
                    Subscription
                  </Text>
                  <Text
                    className="text-xs mt-0.5"
                    style={{ color: colors.muted.foreground }}
                  >
                    Upgrade to premium
                  </Text>
                </View>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={22}
                color={colors.muted.foreground}
              />
            </TouchableOpacity>

            <View className="h-px" style={{ backgroundColor: colors.border }} />

            <TouchableOpacity
              activeOpacity={0.7}
              className="flex-row items-center justify-between px-4 py-4"
            >
              <View className="flex-row items-center gap-3">
                <View
                  className="w-9 h-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: colors.muted.DEFAULT }}
                >
                  <MaterialIcons
                    name="card-giftcard"
                    size={20}
                    color={colors.foreground}
                  />
                </View>
                <View>
                  <Text
                    className="text-base font-medium"
                    style={{ color: colors.foreground }}
                  >
                    Referral Program
                  </Text>
                  <Text
                    className="text-xs mt-0.5"
                    style={{ color: colors.muted.foreground }}
                  >
                    Invite friends and earn rewards
                  </Text>
                </View>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={22}
                color={colors.muted.foreground}
              />
            </TouchableOpacity> */}
            </View>
          </View>

          {/* Support section */}
          <View className="mb-8">
            <Text
              className="mb-3 text-xs font-semibold uppercase tracking-wide"
              style={{ color: colors.muted.foreground }}
            >
              Support
            </Text>

            <View
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: colors.card.DEFAULT }}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleHelpCenter}
                className="flex-row items-center justify-between px-4 py-4"
              >
                <View className="flex-row items-center gap-3">
                  <View
                    className="w-9 h-9 items-center justify-center rounded-full"
                    style={{ backgroundColor: colors.muted.DEFAULT }}
                  >
                    <MaterialIcons
                      name="help-outline"
                      size={20}
                      color={colors.foreground}
                    />
                  </View>
                  <View>
                    <Text
                      className="text-base font-medium"
                      style={{ color: colors.foreground }}
                    >
                      Help Center
                    </Text>
                    <Text
                      className="text-xs mt-0.5"
                      style={{ color: colors.muted.foreground }}
                    >
                      Frequently asked questions and guides
                    </Text>
                  </View>
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={22}
                  color={colors.muted.foreground}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View className="gap-4">
          <View className="gap-2">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowLogoutConfirm(true)}
              className="w-full rounded-full flex-row items-center justify-center gap-2 px-4 py-3"
              style={{
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <MaterialIcons
                name="logout"
                size={20}
                color={colors.foreground}
              />
              <Text
                className="text-base font-semibold"
                style={{ color: colors.foreground }}
              >
                Log out
              </Text>
            </TouchableOpacity>

            {/* <TouchableOpacity
              activeOpacity={0.8}
              className="w-full rounded-full flex-row items-center justify-center gap-2 px-4 py-3"
              style={{ backgroundColor: colors.destructive.DEFAULT }}
            >
              <MaterialIcons
                name="delete-forever"
                size={20}
                color={colors.destructive.foreground}
              />
              <Text
                className="text-base font-semibold"
                style={{ color: colors.destructive.foreground }}
              >
                Delete Account
              </Text>
            </TouchableOpacity> */}
          </View>

          {/* Terms & Service */}
          <View>
            <Text
              className="text-xs text-center"
              style={{ color: colors.muted.foreground }}
            >
              By using BudgetWise, you agree to our{" "}
              <Text
                onPress={handleTermsService}
                style={{
                  color: colors.primary.DEFAULT,
                  textDecorationLine: "underline",
                }}
              >
                Terms&Service
              </Text>
              .
            </Text>
          </View>
        </View>

        {/* Theme Selection Modal */}
        <Modal
          visible={showThemeModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowThemeModal(false)}
        >
          <Pressable
            className="flex-1 items-center justify-center px-6"
            style={{ backgroundColor: colors.overlay }}
            onPress={() => setShowThemeModal(false)}
          >
            <Pressable
              className="w-full rounded-2xl p-6"
              style={{ backgroundColor: colors.card.DEFAULT }}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <View className="mb-6">
                <Text
                  className="text-xl font-bold"
                  style={{ color: colors.foreground }}
                >
                  Select Theme
                </Text>
                <Text
                  className="text-sm mt-1"
                  style={{ color: colors.muted.foreground }}
                >
                  Choose your preferred appearance
                </Text>
              </View>

              {/* Theme Options */}
              <View className="gap-2">
                {(["system", "light", "dark"] as ThemeOption[]).map(
                  (theme) => {
                    const isSelected = currentTheme === theme;
                    return (
                      <TouchableOpacity
                        key={theme}
                        activeOpacity={0.7}
                        onPress={() => handleThemeChange(theme)}
                        className="flex-row items-center justify-between px-4 py-4 rounded-xl"
                        style={{
                          backgroundColor: isSelected
                            ? colors.primary.soft
                            : colors.background.subtle,
                          borderWidth: isSelected ? 1 : 0,
                          borderColor: isSelected
                            ? colors.primary.DEFAULT
                            : "transparent",
                        }}
                      >
                        <View className="flex-row items-center gap-3">
                          <MaterialIcons
                            name={
                              theme === "system"
                                ? "settings-brightness"
                                : theme === "light"
                                ? "light-mode"
                                : "dark-mode"
                            }
                            size={22}
                            color={
                              isSelected
                                ? colors.primary.DEFAULT
                                : colors.foreground
                            }
                          />
                          <View>
                            <Text
                              className="text-base font-medium"
                              style={{
                                color: isSelected
                                  ? colors.primary.DEFAULT
                                  : colors.foreground,
                              }}
                            >
                              {theme === "system"
                                ? "System Default"
                                : theme === "light"
                                ? "Light Mode"
                                : "Dark Mode"}
                            </Text>
                            <Text
                              className="text-xs mt-0.5"
                              style={{ color: colors.muted.foreground }}
                            >
                              {theme === "system"
                                ? "Follow device settings"
                                : theme === "light"
                                ? "Light appearance"
                                : "Dark appearance"}
                            </Text>
                          </View>
                        </View>
                        {isSelected && (
                          <MaterialIcons
                            name="check-circle"
                            size={22}
                            color={colors.primary.DEFAULT}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  }
                )}
              </View>

              {/* Close Button */}
              <TouchableOpacity
                onPress={() => setShowThemeModal(false)}
                className="mt-6 rounded-xl items-center justify-center py-3"
                style={{
                  backgroundColor: colors.muted.DEFAULT,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text
                  className="text-base font-semibold"
                  style={{ color: colors.foreground }}
                >
                  Close
                </Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal
          visible={showLogoutConfirm}
          transparent
          animationType="fade"
          onRequestClose={() => setShowLogoutConfirm(false)}
        >
          <Pressable
            className="flex-1 items-center justify-center px-6"
            style={{ backgroundColor: colors.overlay }}
            onPress={() => setShowLogoutConfirm(false)}
          >
            <Pressable
              className="w-full rounded-2xl p-6"
              style={{ backgroundColor: colors.card.DEFAULT }}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Icon */}
              <View className="items-center mb-4">
                <View
                  className="w-12 h-12 rounded-xl items-center justify-center"
                  style={{ backgroundColor: colors.primary.soft }}
                >
                  <MaterialIcons
                    name="logout"
                    size={24}
                    color={colors.primary.DEFAULT}
                  />
                </View>
              </View>

              {/* Title */}
              <Text
                className="text-xl font-bold text-center mb-2"
                style={{ color: colors.foreground }}
              >
                Sign Out
              </Text>

              {/* Confirmation Message */}
              <Text
                className="text-sm text-center mb-6"
                style={{ color: colors.muted.foreground }}
              >
                Are you sure you want to sign out from your account?
              </Text>

              {/* Buttons */}
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setShowLogoutConfirm(false)}
                  className="flex-1 rounded-xl items-center justify-center py-3"
                  style={{
                    backgroundColor: colors.muted.DEFAULT,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text
                    className="text-base font-semibold"
                    style={{ color: colors.foreground }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleLogout}
                  className="flex-1 rounded-xl items-center justify-center py-3"
                  style={{ backgroundColor: colors.primary.DEFAULT }}
                >
                  <Text
                    className="text-base font-semibold"
                    style={{ color: colors.primary.foreground }}
                  >
                    Sign Out
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}
