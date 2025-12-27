import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
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
import { supabase } from "@/lib";
import { useSupabaseSession } from "@/hooks";
import { getErrorMessage } from "@/utils";

type CategoryFormSheetProps = {
  visible: boolean;
  category: Category | null;
  defaultCategoryType?: "income" | "expense"; // Default type when creating new category
  onClose: () => void;
  onSubmit: (data: CategoryFormData) => Promise<void>;
  loading?: boolean;
  allCategories?: Category[]; // All categories to filter parent options
};

export function CategoryFormSheet({
  visible,
  category,
  defaultCategoryType = "expense",
  onClose,
  onSubmit,
  loading = false,
  allCategories = [],
}: CategoryFormSheetProps) {
  const { session } = useSupabaseSession();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["90%"], []);

  const colors = useThemeColors();
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
    parent_id: null,
  });
  const nameInputRef = useRef<TextInput>(null);
  const nameValueRef = useRef("");
  const [nameInputKey, setNameInputKey] = useState(0);
  const [errors, setErrors] = useState<
    Partial<Record<keyof CategoryFormData, string>>
  >({});
  const [showEmojiMenu, setShowEmojiMenu] = useState(false);
  const [showParentPicker, setShowParentPicker] = useState(false);
  const [showCreateParent, setShowCreateParent] = useState(false);
  const [newParentName, setNewParentName] = useState("");
  const [newParentEmoji, setNewParentEmoji] = useState("📁");
  const [creatingParent, setCreatingParent] = useState(false);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  // Get available parent categories (only parent categories of the same type)
  const availableParents = useMemo(() => {
    const categoryType = category?.category_type || defaultCategoryType;
    return allCategories.filter(
      (cat) =>
        cat.is_parent_category === true &&
        cat.category_type === categoryType &&
        cat.id !== category?.id &&
        !cat.is_archived
    );
  }, [allCategories, category, defaultCategoryType]);

  useEffect(() => {
    if (category) {
      const newFormData = {
        name: category.name,
        emoji: category.emoji,
        background_color: defaultBgColor,
        category_type: category.category_type,
        parent_id: category.parent_id || null,
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
        parent_id: null,
      };
      setFormData(newFormData);
      nameValueRef.current = "";
      setNameInputKey((prev) => prev + 1);
    }
    setErrors({});
    setShowEmojiMenu(false);
    setShowParentPicker(false);
    setShowCreateParent(false);
    setNewParentName("");
    setNewParentEmoji("📁");
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

  const handleCreateParent = async () => {
    if (!session?.user) return;
    
    const trimmedName = newParentName.trim();
    if (!trimmedName) {
      Alert.alert("Error", "Parent category name is required");
      return;
    }

    setCreatingParent(true);
    try {
      const categoryType = category?.category_type || defaultCategoryType;
      
      // Check for duplicate
      const { data: existing, error: checkError } = await supabase
        .from("categories")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("category_type", categoryType)
        .eq("is_archived", false)
        .ilike("name", trimmedName);

      if (checkError) throw checkError;

      if (existing && existing.length > 0) {
        Alert.alert("Error", "A category with this name already exists");
        setCreatingParent(false);
        return;
      }

      // Create parent category
      const { data: newParent, error: createError } = await supabase
        .from("categories")
        .insert({
          user_id: session.user.id,
          name: trimmedName,
          emoji: newParentEmoji,
          background_color: defaultBgColor,
          category_type: categoryType,
          is_parent_category: true,
          parent_id: null,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Set the new parent as selected
      setFormData({ ...formData, parent_id: newParent.id });
      setShowCreateParent(false);
      setNewParentName("");
      setNewParentEmoji("📁");
    } catch (error: any) {
      const errorMessage = getErrorMessage(error, "Failed to create parent category");
      Alert.alert("Error", errorMessage);
    } finally {
      setCreatingParent(false);
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await onSubmit({
      ...formData,
      background_color: defaultBgColor,
      name: nameValueRef.current,
    });
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
            <Text
              className="text-xl font-semibold"
              style={{ color: colors.foreground }}
            >
              {category ? "Edit Category" : "New Category"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons
                name="close"
                size={24}
                color={colors.muted.foreground}
              />
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
            <Text
              className="text-sm mb-6"
              style={{ color: colors.destructive.DEFAULT }}
            >
              {errors.emoji}
            </Text>
          )}

          <Text
            className="text-sm mb-2"
            style={{ color: colors.muted.foreground }}
          >
            Name
          </Text>
          <TextInput
            key={nameInputKey}
            ref={nameInputRef}
            defaultValue={nameValueRef.current}
            onChangeText={(text) => {
              nameValueRef.current = text;
            }}
            placeholder="e.g., Groceries, Travel"
            placeholderTextColor={colors.muted.foreground}
            className="rounded-2xl px-4 py-3 text-base mb-4"
            style={{
              backgroundColor: colors.background.subtle,
              color: colors.foreground,
            }}
          />
          {errors.name && (
            <Text
              className="text-sm mb-6"
              style={{ color: colors.destructive.DEFAULT }}
            >
              {errors.name}
            </Text>
          )}
          {!category && (
            <>
              <Text
                className="text-sm mb-3"
                style={{ color: colors.muted.foreground }}
              >
                Type
              </Text>
              <View className="flex-row mb-6">
                <TouchableOpacity
                  onPress={() =>
                    setFormData({ ...formData, category_type: "income", parent_id: null })
                  }
                  className="flex-1 px-4 py-3 rounded-xl mr-2"
                  style={{
                    backgroundColor:
                      formData.category_type === "income"
                        ? colors.primary.DEFAULT
                        : colors.background.subtle,
                  }}
                  disabled={category !== null} // Don't allow changing type when editing
                >
                  <Text
                    className="text-sm font-medium text-center"
                    style={{ color: colors.white }}
                  >
                    Income
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    setFormData({ ...formData, category_type: "expense", parent_id: null })
                  }
                  className="flex-1 px-4 py-3 rounded-xl"
                  style={{
                    backgroundColor:
                      formData.category_type === "expense"
                        ? colors.primary.DEFAULT
                        : colors.background.subtle,
                  }}
                  disabled={category !== null} // Don't allow changing type when editing
                >
                  <Text
                    className="text-sm font-medium text-center"
                    style={{ color: colors.white }}
                  >
                    Expense
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Parent Category Selection */}
          <Text
            className="text-sm mb-3"
            style={{ color: colors.muted.foreground }}
          >
            Parent Category (Optional)
          </Text>
          {!showCreateParent ? (
            <>
              <TouchableOpacity
                onPress={() => setShowParentPicker(!showParentPicker)}
                className="rounded-2xl px-4 py-3 mb-3 flex-row items-center justify-between"
                style={{ backgroundColor: colors.background.subtle }}
              >
                <View className="flex-row items-center flex-1">
                  <MaterialIcons
                    name="folder"
                    size={20}
                    color={
                      formData.parent_id
                        ? colors.primary.DEFAULT
                        : colors.muted.foreground
                    }
                  />
                  <Text
                    className="text-base ml-3"
                    style={{
                      color: formData.parent_id
                        ? colors.foreground
                        : colors.muted.foreground,
                    }}
                  >
                    {formData.parent_id
                      ? availableParents.find((p) => p.id === formData.parent_id)?.name ||
                        "Select parent"
                      : "No parent (Top level)"}
                  </Text>
                </View>
                <MaterialIcons
                  name={showParentPicker ? "expand-less" : "keyboard-arrow-down"}
                  size={24}
                  color={colors.muted.foreground}
                />
              </TouchableOpacity>

              {showParentPicker && (
                <View
                  className="rounded-xl p-3 mb-3 max-h-48"
                  style={{ backgroundColor: colors.card.DEFAULT }}
                >
                  <TouchableOpacity
                    onPress={() => {
                      setFormData({ ...formData, parent_id: null });
                      setShowParentPicker(false);
                    }}
                    className="flex-row items-center px-3 py-2 rounded-lg mb-2"
                    style={{
                      backgroundColor:
                        formData.parent_id === null
                          ? colors.primary.soft
                          : "transparent",
                      borderWidth: formData.parent_id === null ? 1 : 0,
                      borderColor: colors.primary.DEFAULT,
                    }}
                  >
                    <MaterialIcons
                      name="folder"
                      size={20}
                      color={
                        formData.parent_id === null
                          ? colors.primary.DEFAULT
                          : colors.muted.foreground
                      }
                    />
                    <Text
                      className="text-sm ml-3"
                      style={{
                        color:
                          formData.parent_id === null
                            ? colors.primary.DEFAULT
                            : colors.muted.foreground,
                      }}
                    >
                      No parent (Top level)
                    </Text>
                  </TouchableOpacity>

                  {availableParents.map((parent) => (
                    <TouchableOpacity
                      key={parent.id}
                      onPress={() => {
                        setFormData({ ...formData, parent_id: parent.id });
                        setShowParentPicker(false);
                      }}
                      className="flex-row items-center px-3 py-2 rounded-lg mb-2"
                      style={{
                        backgroundColor:
                          formData.parent_id === parent.id
                            ? colors.primary.soft
                            : "transparent",
                        borderWidth: formData.parent_id === parent.id ? 1 : 0,
                        borderColor: colors.primary.DEFAULT,
                      }}
                    >
                      <View
                        className="w-8 h-8 rounded-full items-center justify-center mr-2"
                        style={{ backgroundColor: defaultBgColor }}
                      >
                        <Text style={{ fontSize: 16 }}>{parent.emoji}</Text>
                      </View>
                      <Text
                        className="text-sm flex-1"
                        style={{
                          color:
                            formData.parent_id === parent.id
                              ? colors.primary.DEFAULT
                              : colors.muted.foreground,
                        }}
                      >
                        {parent.name}
                      </Text>
                    </TouchableOpacity>
                  ))}

                  <TouchableOpacity
                    onPress={() => {
                      setShowCreateParent(true);
                      setShowParentPicker(false);
                    }}
                    className="flex-row items-center px-3 py-2 rounded-lg mt-2 border"
                    style={{ borderColor: colors.primary.border }}
                  >
                    <MaterialIcons
                      name="add-circle-outline"
                      size={20}
                      color={colors.primary.DEFAULT}
                    />
                    <Text
                      className="text-sm ml-3"
                      style={{ color: colors.primary.DEFAULT }}
                    >
                      Create New Parent Category
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : (
            <>
              <View
                className="rounded-2xl p-4 mb-3"
                style={{ backgroundColor: colors.background.subtle }}
              >
                <Text
                  className="text-sm mb-3"
                  style={{ color: colors.muted.foreground }}
                >
                  Create Parent Category
                </Text>

                <View className="items-center mb-4">
                  <TouchableOpacity
                    onPress={() => setShowEmojiMenu(true)}
                    className="size-16 rounded-full items-center justify-center"
                    style={{ backgroundColor: defaultBgColor }}
                  >
                    <Text style={{ fontSize: 32 }}>{newParentEmoji}</Text>
                  </TouchableOpacity>
                </View>

                <Text
                  className="text-xs mb-2"
                  style={{ color: colors.muted.foreground }}
                >
                  Parent Name
                </Text>
                <TextInput
                  value={newParentName}
                  onChangeText={setNewParentName}
                  placeholder="e.g., Food, Transportation"
                  placeholderTextColor={colors.muted.foreground}
                  className="rounded-xl px-4 py-3 text-sm mb-3"
                  style={{
                    backgroundColor: colors.card.DEFAULT,
                    color: colors.foreground,
                  }}
                  autoFocus
                />

                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => {
                      setShowCreateParent(false);
                      setNewParentName("");
                      setNewParentEmoji("📁");
                    }}
                    className="flex-1 rounded-xl py-2"
                    style={{ backgroundColor: colors.muted.DEFAULT }}
                  >
                    <Text
                      className="text-sm font-medium text-center"
                      style={{ color: colors.foreground }}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleCreateParent}
                    className="flex-1 rounded-xl py-2"
                    style={{
                      backgroundColor: colors.primary.DEFAULT,
                      opacity:
                        creatingParent || !newParentName.trim() ? 0.5 : 1,
                    }}
                    disabled={creatingParent || !newParentName.trim()}
                  >
                    <Text
                      className="text-sm font-medium text-center"
                      style={{ color: colors.white }}
                    >
                      {creatingParent ? "Creating..." : "Create"}
                    </Text>
                  </TouchableOpacity>
                </View>
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
        enableSearchBar
        defaultHeight={450}
      />
    </>
  );
}
