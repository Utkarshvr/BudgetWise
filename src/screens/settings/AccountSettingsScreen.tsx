import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useSupabaseSession } from "@/hooks";
import { useThemeColors } from "@/constants/theme";
import { supabase } from "@/lib";
import { getErrorMessage } from "@/utils";

export default function AccountSettingsScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { session } = useSupabaseSession();
  const insets = useSafeAreaInsets();

  const user = session?.user;
  const currentName =
    (user?.user_metadata as any)?.full_name || user?.user_metadata?.name || "";
  const email = user?.email ?? "";

  const avatarUrl =
    (user?.user_metadata as any)?.avatar_url ||
    (user?.user_metadata as any)?.picture ||
    null;

  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);

  const isNameDirty = name.trim() !== currentName.trim();

  useEffect(() => {
    if (currentName) {
      setName(currentName);
    }
  }, [currentName]);

  const handleSave = async () => {
    if (!name.trim() || !isNameDirty) {
      Alert.alert("Nothing to update", "Change your name first.");
      return;
    }

    try {
      setSaving(true);
      const updates: any = {
        data: { ...(user?.user_metadata ?? {}), full_name: name.trim() },
      };

      const { error } = await supabase.auth.updateUser(updates);
      setSaving(false);

      if (error) {
        Alert.alert("Update failed", error.message);
        return;
      }

      Alert.alert("Saved", "Your profile has been updated.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      setSaving(false);
      const errorMessage = getErrorMessage(err, "Something went wrong.");
      Alert.alert("Error", errorMessage);
    }
  };

  const handleChangePhoto = () => {
    // TODO: Implement photo picker
    Alert.alert("Coming soon", "Profile photo upload will be available soon.");
  };

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: colors.background.DEFAULT }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <View className="flex-1">
          <ScrollView
            className="flex-1 px-4 pt-4"
            contentContainerStyle={{ paddingBottom: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View className="mb-6 flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => router.back()}
                className="px-2 py-1 -ml-2"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialIcons
                  name="arrow-back"
                  size={24}
                  color={colors.foreground}
                />
              </TouchableOpacity>
              <Text
                className="text-lg font-semibold"
                style={{ color: colors.foreground }}
              >
                Edit Profile
              </Text>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving || !isNameDirty}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text
                  className="text-base font-medium"
                  style={{
                    color:
                      saving || !isNameDirty
                        ? colors.muted.foreground
                        : colors.primary.DEFAULT,
                  }}
                >
                  {saving ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Profile Picture Section */}
            <View className="items-center mb-8">
              <View className="relative">
                <View
                  className="w-32 h-32 rounded-full items-center justify-center overflow-hidden"
                  style={{
                    backgroundColor: colors.card.DEFAULT,
                    borderWidth: 2,
                    borderColor: colors.border,
                  }}
                >
                  {avatarUrl ? (
                    <Image
                      source={{ uri: avatarUrl }}
                      style={{ width: 128, height: 128 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="items-center justify-center w-full h-full">
                      <MaterialIcons
                        name="person"
                        size={64}
                        color={colors.primary.DEFAULT}
                      />
                    </View>
                  )}
                </View>
                {/* Camera Icon Overlay */}
                <TouchableOpacity
                  onPress={handleChangePhoto}
                  className="absolute bottom-0 right-0 w-10 h-10 rounded-full items-center justify-center"
                  style={{ backgroundColor: colors.primary.DEFAULT }}
                >
                  <MaterialIcons
                    name="camera-alt"
                    size={20}
                    color={colors.primary.foreground}
                  />
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={handleChangePhoto} className="mt-3">
                <Text
                  className="text-base font-medium"
                  style={{ color: colors.primary.DEFAULT }}
                >
                  Change Profile Photo
                </Text>
              </TouchableOpacity>
            </View>

            {/* Name Field */}
            <View className="mb-4">
              <View
                className="rounded-2xl px-4 py-4 flex-row items-center gap-3"
                style={{ backgroundColor: colors.card.DEFAULT }}
              >
                <View
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{ backgroundColor: colors.muted.DEFAULT }}
                >
                  <MaterialIcons
                    name="person-outline"
                    size={20}
                    color={colors.foreground}
                  />
                </View>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor={colors.muted.foreground}
                  className="flex-1 text-base"
                  style={{ color: colors.foreground }}
                />
              </View>
            </View>

            {/* Email Field */}
            <View className="mb-6">
              <View
                className="rounded-2xl px-4 py-4 flex-row items-center gap-3"
                style={{ backgroundColor: colors.card.DEFAULT }}
              >
                <View
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{ backgroundColor: colors.muted.DEFAULT }}
                >
                  <MaterialIcons
                    name="mail-outline"
                    size={20}
                    color={colors.foreground}
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className="text-xs mb-1"
                    style={{ color: colors.muted.foreground }}
                  >
                    Email
                  </Text>
                  <Text
                    className="text-base"
                    style={{ color: colors.foreground }}
                  >
                    {email}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Save Changes Button - Fixed at bottom, moves with keyboard */}
          <View 
            className="px-4"
            style={{ 
              paddingBottom: insets.bottom || 16,
              backgroundColor: colors.background.DEFAULT,
            }}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSave}
              disabled={saving || !isNameDirty}
              className="w-full rounded-2xl items-center justify-center px-4 py-4"
              style={{
                backgroundColor: isNameDirty
                  ? colors.primary.DEFAULT
                  : colors.muted.DEFAULT,
                opacity: saving || !isNameDirty ? 0.6 : 1,
              }}
            >
              <Text
                className="text-base font-semibold"
                style={{
                  color: isNameDirty
                    ? colors.primary.foreground
                    : colors.foreground,
                }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
