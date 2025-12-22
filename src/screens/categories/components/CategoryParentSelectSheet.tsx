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
import { Category } from "@/types/category";
import { PrimaryButton } from "@/components/ui";
import { useThemeColors, getCategoryBackgroundColor } from "@/constants/theme";
import { supabase } from "@/lib";
import { useSupabaseSession } from "@/hooks";
import { getErrorMessage } from "@/utils";

type CategoryParentSelectSheetProps = {
  visible: boolean;
  category: Category | null;
  categories: Category[];
  onClose: () => void;
  onMove: (parentId: string | null) => Promise<void>;
  loading?: boolean;
};

export function CategoryParentSelectSheet({
  visible,
  category,
  categories,
  onClose,
  onMove,
  loading = false,
}: CategoryParentSelectSheetProps) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["80%"], []);
  const { session } = useSupabaseSession();
  const colors = useThemeColors();
  const defaultBgColor = getCategoryBackgroundColor(colors);
  const colorScheme = useColorScheme();

  const [selectedParentId, setSelectedParentId] = useState<string | null | "new">(null);
  const [showCreateParent, setShowCreateParent] = useState(false);
  const [newParentName, setNewParentName] = useState("");
  const [newParentEmoji, setNewParentEmoji] = useState("📁");
  const [showEmojiMenu, setShowEmojiMenu] = useState(false);
  const [creatingParent, setCreatingParent] = useState(false);

  // Only show categories marked as parent categories (is_parent_category = true)
  // Filter out the current category and its children from parent options
  const availableParents = useMemo(() => {
    if (!category) {
      // Only return categories that are marked as parent categories
      return categories.filter((cat) => cat.is_parent_category === true && !cat.is_archived);
    }
    
    // Get all descendants of the current category (to prevent circular references)
    const getDescendants = (catId: string): string[] => {
      const children = categories.filter((c) => c.parent_id === catId);
      const descendantIds = [catId];
      children.forEach((child) => {
        descendantIds.push(...getDescendants(child.id));
      });
      return descendantIds;
    };

    const descendants = getDescendants(category.id);
    
    // Only return categories that are marked as parent categories
    return categories.filter(
      (cat) =>
        cat.is_parent_category === true &&
        cat.category_type === category.category_type &&
        cat.id !== category.id &&
        !descendants.includes(cat.id) &&
        !cat.is_archived
    );
  }, [categories, category]);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
      setSelectedParentId(category?.parent_id || null);
      setShowCreateParent(false);
      setNewParentName("");
      setNewParentEmoji("📁");
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible, category]);

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

  const handleCreateParent = async () => {
    if (!session?.user || !category) return;
    
    const trimmedName = newParentName.trim();
    if (!trimmedName) {
      Alert.alert("Error", "Parent category name is required");
      return;
    }

    setCreatingParent(true);
    try {
      // Check for duplicate
      const { data: existing, error: checkError } = await supabase
        .from("categories")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("category_type", category.category_type)
        .eq("is_archived", false)
        .ilike("name", trimmedName);

      if (checkError) throw checkError;

      if (existing && existing.length > 0) {
        Alert.alert("Error", "A category with this name already exists");
        setCreatingParent(false);
        return;
      }

      // Create parent category (marked as is_parent_category = true)
      const { data: newParent, error: createError } = await supabase
        .from("categories")
        .insert({
          user_id: session.user.id,
          name: trimmedName,
          emoji: newParentEmoji,
          background_color: defaultBgColor,
          category_type: category.category_type,
          is_parent_category: true, // Mark as parent category
          parent_id: null, // Parent categories are always top-level
        })
        .select()
        .single();

      if (createError) throw createError;

      // Move the category to the new parent
      await onMove(newParent.id);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error, "Failed to create parent category");
      Alert.alert("Error", errorMessage);
    } finally {
      setCreatingParent(false);
    }
  };

  const handleMove = async () => {
    if (showCreateParent) {
      await handleCreateParent();
    } else {
      await onMove(selectedParentId === "new" ? null : selectedParentId);
    }
  };

  if (!category) return null;

  // Prevent moving parent categories (they're organizational containers)
  if (category.is_parent_category === true) {
    return (
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        onDismiss={onClose}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: colors.background.DEFAULT }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
        backdropComponent={renderBackdrop}
      >
        <BottomSheetScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-white text-xl font-semibold">
              Cannot Move Parent Category
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#9ca3af" />
            </TouchableOpacity>
          </View>
          <Text className="text-neutral-300 text-base mb-6">
            Parent categories are organizational containers and cannot be moved. 
            You can move individual child categories instead.
          </Text>
          <PrimaryButton
            label="Close"
            onPress={onClose}
            loading={false}
          />
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  }

  return (
    <>
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        onDismiss={onClose}
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
              Move "{category.name}"
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {!showCreateParent ? (
            <>
              <Text className="text-neutral-300 text-sm mb-4">
                Select a parent category or move to top level
              </Text>

              {/* Move to top level option */}
              <TouchableOpacity
                onPress={() => setSelectedParentId(null)}
                className={`flex-row items-center px-4 py-3 rounded-xl mb-3 ${
                  selectedParentId === null
                    ? "bg-primary border-2 border-primary"
                    : "bg-neutral-800 border-2 border-transparent"
                }`}
              >
                <MaterialIcons
                  name="folder"
                  size={24}
                  color={selectedParentId === null ? "#ffffff" : colors.muted.foreground}
                />
                <Text
                  className={`text-base font-medium ml-3 ${
                    selectedParentId === null ? "text-white" : "text-neutral-300"
                  }`}
                >
                  Top Level (No Parent)
                </Text>
              </TouchableOpacity>

              {/* Available parent categories */}
              {availableParents.length > 0 && (
                <>
                  <Text className="text-neutral-300 text-sm mb-3 mt-2">
                    Existing Parent Categories
                  </Text>
                  {availableParents.map((parent) => (
                    <TouchableOpacity
                      key={parent.id}
                      onPress={() => setSelectedParentId(parent.id)}
                      className={`flex-row items-center px-4 py-3 rounded-xl mb-2 ${
                        selectedParentId === parent.id
                          ? "bg-primary border-2 border-primary"
                          : "bg-neutral-800 border-2 border-transparent"
                      }`}
                    >
                      <View
                        className="w-10 h-10 rounded-full items-center justify-center mr-3"
                        style={{ backgroundColor: defaultBgColor }}
                      >
                        <Text style={{ fontSize: 20 }}>{parent.emoji}</Text>
                      </View>
                      <Text
                        className={`text-base font-medium flex-1 ${
                          selectedParentId === parent.id
                            ? "text-white"
                            : "text-neutral-300"
                        }`}
                      >
                        {parent.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* Create new parent option */}
              <TouchableOpacity
                onPress={() => {
                  setShowCreateParent(true);
                  setSelectedParentId("new");
                }}
                className={`flex-row items-center px-4 py-3 rounded-xl mt-3 border-2 ${
                  selectedParentId === "new"
                    ? "bg-primary border-primary"
                    : "bg-neutral-800 border-primary/50"
                }`}
              >
                <MaterialIcons
                  name="add-circle-outline"
                  size={24}
                  color={selectedParentId === "new" ? "#ffffff" : colors.primary.DEFAULT}
                />
                <Text
                  className={`text-base font-medium ml-3 ${
                    selectedParentId === "new" ? "text-white" : "text-primary"
                  }`}
                >
                  Create New Parent Category
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text className="text-neutral-300 text-sm mb-4">
                Create a new parent category
              </Text>

              <View className="items-center mb-6">
                <TouchableOpacity
                  onPress={() => setShowEmojiMenu(true)}
                  className="size-20 rounded-full items-center justify-center"
                  style={{ backgroundColor: defaultBgColor }}
                >
                  <Text style={{ fontSize: 40 }}>{newParentEmoji}</Text>
                </TouchableOpacity>
              </View>

              <Text className="text-neutral-300 text-sm mb-2">Parent Category Name</Text>
              <TextInput
                value={newParentName}
                onChangeText={setNewParentName}
                placeholder="e.g., Food, Transportation"
                placeholderTextColor="#6b7280"
                className="bg-neutral-800 rounded-2xl px-4 py-3 text-white text-base mb-6"
                autoFocus
              />

              <TouchableOpacity
                onPress={() => setShowCreateParent(false)}
                className="mb-4"
              >
                <Text className="text-primary text-sm font-medium">
                  ← Back to select existing parent
                </Text>
              </TouchableOpacity>
            </>
          )}

          <PrimaryButton
            label={
              showCreateParent
                ? creatingParent
                  ? "Creating..."
                  : "Create Parent & Move"
                : loading
                ? "Moving..."
                : "Move Category"
            }
            onPress={handleMove}
            loading={loading || creatingParent}
          />
        </BottomSheetScrollView>
      </BottomSheetModal>

      <EmojiPicker
        open={showEmojiMenu}
        onClose={() => setShowEmojiMenu(false)}
        onEmojiSelected={(emoji) => {
          setNewParentEmoji(emoji.emoji);
          setShowEmojiMenu(false);
        }}
        theme={emojiPickerTheme}
        enableSearchBar
        defaultHeight={450}
      />
    </>
  );
}

