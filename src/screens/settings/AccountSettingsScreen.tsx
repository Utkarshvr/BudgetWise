import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { useThemeColors } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/utils/errorHandler";

export default function AccountSettingsScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { session } = useSupabaseSession();

  const currentName =
    (session?.user.user_metadata as any)?.full_name ||
    session?.user.user_metadata?.name ||
    "";

  const [name, setName] = useState(currentName);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() && !password.trim()) {
      Alert.alert("Nothing to update", "Change your name or password first.");
      return;
    }

    try {
      setSaving(true);
      const updates: any = {};

      if (name.trim() && name.trim() !== currentName) {
        updates.data = { ...(session?.user.user_metadata ?? {}), full_name: name.trim() };
      }
      if (password.trim()) {
        updates.password = password.trim();
      }

      if (Object.keys(updates).length === 0) {
        setSaving(false);
        return;
      }

      const { error } = await supabase.auth.updateUser(updates);
      setSaving(false);

      if (error) {
        Alert.alert("Update failed", error.message);
        return;
      }

      Alert.alert("Saved", "Your account settings have been updated.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      setSaving(false);
      const errorMessage = getErrorMessage(err, "Something went wrong.");
      Alert.alert("Error", errorMessage);
    }
  };

  return (
    <SafeAreaView
      className="flex-1 px-4 pt-4"
      style={{ backgroundColor: colors.background.DEFAULT }}
    >
      <View className="mb-4 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => router.back()}
          className="px-2 py-1 -ml-2"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={{ color: colors.primary.DEFAULT }} className="text-sm font-medium">
            Back
          </Text>
        </TouchableOpacity>
        <Text
          className="text-base font-semibold"
          style={{ color: colors.foreground }}
        >
          Account Settings
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View className="mt-2 gap-6">
        <View className="gap-2">
          <Text
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: colors.muted.foreground }}
          >
            Name
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={colors.muted.foreground}
            className="rounded-xl px-4 py-3 text-sm"
            style={{
              backgroundColor: colors.card.DEFAULT,
              color: colors.foreground,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          />
        </View>

        <View className="gap-2">
          <Text
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: colors.muted.foreground }}
          >
            New password
          </Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Leave blank to keep current password"
            placeholderTextColor={colors.muted.foreground}
            secureTextEntry
            className="rounded-xl px-4 py-3 text-sm"
            style={{
              backgroundColor: colors.card.DEFAULT,
              color: colors.foreground,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          />
        </View>
      </View>

      <View className="mt-auto mb-4">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSave}
          disabled={saving}
          className="w-full rounded-xl items-center justify-center px-4 py-3"
          style={{ backgroundColor: colors.primary.strong, opacity: saving ? 0.8 : 1 }}
        >
          <Text
            className="text-base font-semibold"
            style={{ color: colors.primary.foreground }}
          >
            {saving ? "Saving..." : "Save changes"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}


