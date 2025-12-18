import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { MaterialIcons } from "@expo/vector-icons";
import EmojiPicker from "rn-emoji-keyboard";
import { useColorScheme } from "react-native";
import { Category, CategoryFormData } from "@/types/category";
import { PrimaryButton } from "@/components/ui";
import { useThemeColors, getCategoryBackgroundColor } from "@/constants/theme";

type CategoryFormSheetProps = {
  visible: boolean;
  category: Category | null;
  defaultCategoryType?: "income" | "expense"; // Default type when creating new category
  onClose: () => void;
  onSubmit: (data: CategoryFormData) => Promise<void>;
  loading?: boolean;
};

export function CategoryFormSheet({
  visible,
  category,
  defaultCategoryType = "expense",
  onClose,
  onSubmit,
  loading = false,
}: CategoryFormSheetProps) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["90%"], []);

  const colors = useThemeColors()
  const defaultBgColor = getCategoryBackgroundColor(colors);
  const colorScheme = useColorScheme();
  
  // Create dynamic theme for emoji picker based on app theme
  const emojiPickerTheme = useMemo(() => {
    const isDark = colorScheme === "dark";
    if (isDark) {
      return {
        backdrop: "#00000088",
        knob: colors.primary.DEFAULT,
        container: colors.background.DEFAULT,
        header: colors.foreground,
        skinTonesContainer: colors.background.subtle,
        category: {
          icon: colors.primary.DEFAULT,
          iconActive: colors.foreground,
          container: colors.background.subtle,
          containerActive: colors.primary.DEFAULT,
        },
        search: {
          text: colors.foreground,
          placeholder: colors.muted.foreground,
          icon: colors.muted.foreground,
          background: colors.background.subtle,
        },
      };
    } else {
      return {
        backdrop: "#00000055",
        knob: "#ffffff",
        container: colors.card.DEFAULT,
        header: "#00000099",
        skinTonesContainer: colors.muted.DEFAULT,
        category: {
          icon: "#000000",
          iconActive: colors.foreground,
          container: colors.muted.DEFAULT,
          containerActive: colors.primary.DEFAULT,
        },
        search: {
          text: "#000000cc",
          placeholder: "#00000055",
          icon: "#00000055",
          background: "#00000011",
        },
      };
    }
  }, [colorScheme, colors]);

  const [formData, setFormData] = useState<CategoryFormData>({
    name: "",
    emoji: "📁",
    background_color: defaultBgColor,
    category_type: defaultCategoryType,
  });
  const nameInputRef = useRef<TextInput>(null);
  const nameValueRef = useRef("");
  const [nameInputKey, setNameInputKey] = useState(0);
  const [errors, setErrors] = useState<
    Partial<Record<keyof CategoryFormData, string>>
  >({});
  const [showEmojiMenu, setShowEmojiMenu] = useState(false);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  useEffect(() => {
    if (category) {
      const newFormData = {
        name: category.name,
        emoji: category.emoji,
        background_color: defaultBgColor,
        category_type: category.category_type,
      };
      setFormData(newFormData);
      nameValueRef.current = category.name;
      setNameInputKey((prev) => prev + 1);
    } else {
      const newFormData = {
        name: "",
        emoji: "📁",
        background_color: defaultBgColor,
        category_type: defaultCategoryType,
      };
      setFormData(newFormData);
      nameValueRef.current = "";
      setNameInputKey((prev) => prev + 1);
    }
    setErrors({});
    setShowEmojiMenu(false);
  }, [category, defaultCategoryType, defaultBgColor]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose]
  );

  const handleDismiss = useCallback(() => {
    onClose();
  }, [onClose]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof CategoryFormData, string>> = {};
    const currentName = nameValueRef.current.trim();

    if (!currentName) {
      newErrors.name = "Category name is required";
    }

    if (!formData.emoji.trim()) {
      newErrors.emoji = "Emoji is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await onSubmit({ ...formData, background_color: defaultBgColor, name: nameValueRef.current });
  };

  return (
    <>
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        onDismiss={handleDismiss}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: colors.background.DEFAULT }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
        backdropComponent={renderBackdrop}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
      >
        <BottomSheetScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-white text-xl font-semibold">
              {category ? "Edit Category" : "New Category"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          <View className="items-center mb-6">
            <TouchableOpacity
              onPress={() => setShowEmojiMenu(true)}
              className="size-24 rounded-full items-center justify-center"
              style={{ backgroundColor: defaultBgColor }}
            >
              <Text style={{ fontSize: 48 }}>{formData.emoji}</Text>
            </TouchableOpacity>
          </View>
          {errors.emoji && (
            <Text className="text-red-500 text-sm mb-6">{errors.emoji}</Text>
          )}

          <Text className="text-neutral-300 text-sm mb-2">Name</Text>
          <TextInput
            key={nameInputKey}
            ref={nameInputRef}
            defaultValue={nameValueRef.current}
            onChangeText={(text) => {
              nameValueRef.current = text;
            }}
            placeholder="e.g., Groceries, Travel"
            placeholderTextColor="#6b7280"
            className="bg-neutral-800 rounded-2xl px-4 py-3 text-white text-base mb-4"
          />
          {errors.name && (
            <Text className="text-red-500 text-sm mb-6">{errors.name}</Text>
          )}
          {!category && (
            <>
              <Text className="text-neutral-300 text-sm mb-3">Type</Text>
              <View className="flex-row mb-6">
                <TouchableOpacity
                  onPress={() =>
                    setFormData({ ...formData, category_type: "income" })
                  }
                  className={`flex-1 px-4 py-3 rounded-xl mr-2 ${
                    formData.category_type === "income"
                      ? "bg-green-600"
                      : "bg-neutral-800"
                  }`}
                  disabled={category !== null} // Don't allow changing type when editing
                >
                  <Text className="text-white text-sm font-medium text-center">
                    Income
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    setFormData({ ...formData, category_type: "expense" })
                  }
                  className={`flex-1 px-4 py-3 rounded-xl ${
                    formData.category_type === "expense"
                      ? "bg-green-600"
                      : "bg-neutral-800"
                  }`}
                  disabled={category !== null} // Don't allow changing type when editing
                >
                  <Text className="text-white text-sm font-medium text-center">
                    Expense
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <PrimaryButton
            label={category ? "Save Changes" : "Create Category"}
            onPress={handleSubmit}
            loading={loading}
          />
        </BottomSheetScrollView>
      </BottomSheetModal>

      <EmojiPicker
        open={showEmojiMenu}
        onClose={() => setShowEmojiMenu(false)}
        onEmojiSelected={(emoji) => {
          setFormData({ ...formData, emoji: emoji.emoji });
          setShowEmojiMenu(false);
        }}
        theme={emojiPickerTheme}
        defaultHeight={600}
      />
    </>
  );
}
