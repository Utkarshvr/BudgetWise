import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, Dimensions, Modal, Alert } from "react-native";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetFlatList,
} from "@gorhom/bottom-sheet";
import { MaterialIcons } from "@expo/vector-icons";
import { Category, CategoryFormData, CategoryType } from "@/types/category";
import { PrimaryButton } from "@/screens/auth/components/PrimaryButton";
import { CATEGORY_COLORS } from "@/constants/categoryColors";
import { EMOJI_CATEGORIES } from "@/constants/emojis";
import { Account } from "@/types/account";

type CategoryFormSheetProps = {
  visible: boolean;
  category: Category | null;
  onClose: () => void;
  onSubmit: (data: CategoryFormData) => Promise<void>;
  loading?: boolean;
  accounts: Account[];
  accountFundTotals: Record<string, number>;
};

export function CategoryFormSheet({
  visible,
  category,
  onClose,
  onSubmit,
  loading = false,
  accounts,
  accountFundTotals,
}: CategoryFormSheetProps) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["80%", "95%"], []);

  const [formData, setFormData] = useState<CategoryFormData>({
    name: "",
    emoji: "📁",
    background_color: CATEGORY_COLORS[0],
    category_type: "regular",
    fund_account_id: null,
    initial_fund_amount: "",
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof CategoryFormData, string>>
  >({});
  const [showEmojiMenu, setShowEmojiMenu] = useState(false);
  const [selectedEmojiCategory, setSelectedEmojiCategory] = useState<keyof typeof EMOJI_CATEGORIES>("common");
  
  const screenWidth = Dimensions.get("window").width;
  const emojiSize = (screenWidth - 64) / 8; // 8 emojis per row with padding
  const formatAvailableDisplay = useCallback(
    (amount: number, currency: string | undefined | null) => {
      const mainUnit = amount / 100;
      return `${currency || "INR"} ${mainUnit.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    },
    []
  );

  const getAvailableForAccount = useCallback(
    (accountId: string | null) => {
      if (!accountId) return 0;
      const account = accounts.find((acc) => acc.id === accountId);
      if (!account) return 0;
      const allocated = accountFundTotals[accountId] || 0;
      return Math.max(account.balance - allocated, 0);
    },
    [accounts, accountFundTotals]
  );

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

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

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        emoji: category.emoji,
        background_color: category.background_color,
        category_type: category.category_type,
        fund_account_id: category.fund_account_id,
        initial_fund_amount: "",
      });
    } else {
      setFormData({
        name: "",
        emoji: "📁",
        background_color: CATEGORY_COLORS[0],
        category_type: "regular",
        fund_account_id: accounts[0]?.id || null,
        initial_fund_amount: "",
      });
    }
    setErrors({});
    setShowEmojiMenu(false);
  }, [category, visible, accounts]);


  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof CategoryFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Category name is required";
    }

    if (!formData.emoji.trim()) {
      newErrors.emoji = "Emoji is required";
    }

    if (formData.category_type === "fund") {
      if (!formData.fund_account_id) {
        newErrors.fund_account_id = "Select an account for this fund";
      }

      if (!category && formData.initial_fund_amount.trim()) {
        const amountNum = parseFloat(formData.initial_fund_amount);
        if (isNaN(amountNum) || amountNum < 0) {
          newErrors.initial_fund_amount = "Enter a valid amount";
        } else {
          const amountSmallest = Math.round(amountNum * 100);
          const available = getAvailableForAccount(formData.fund_account_id);
          if (amountSmallest > available) {
            newErrors.initial_fund_amount = "Amount exceeds unallocated balance";
          }
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await onSubmit(formData);
  };

  return (
    <>
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        onDismiss={handleDismiss}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: "#171717" }}
      handleIndicatorStyle={{ backgroundColor: "#525252" }}
      backdropComponent={renderBackdrop}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      enableHandlePanningGesture={true}
      enableContentPanningGesture={true}
      >
        <BottomSheetScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <Text style={{ fontSize: 24, fontWeight: "bold", color: "#ffffff" }}>
            {category ? "Edit Category" : "Add Category"}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <MaterialIcons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Emoji Selection */}
        <View style={{ marginBottom: 16 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "500",
              color: "#d4d4d4",
              marginBottom: 12,
            }}
          >
            Emoji Icon
          </Text>
          <View style={{ alignItems: "center", marginBottom: 8 }}>
            <TouchableOpacity
              onPress={() => {
                // Prevent main sheet from closing
                setShowEmojiMenu(true);
              }}
              activeOpacity={0.8}
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: formData.background_color,
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <Text style={{ fontSize: 48 }}>{formData.emoji || "📁"}</Text>
              {/* Pencil Icon at bottom left */}
              <View
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: "rgba(0, 0, 0, 0.3)",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: "#ffffff",
                }}
              >
                <MaterialIcons name="edit" size={16} color="#ffffff" />
              </View>
            </TouchableOpacity>
          </View>
          {errors.emoji && (
            <Text style={{ color: "#ef4444", fontSize: 14, marginTop: 4 }}>
              {errors.emoji}
            </Text>
          )}
        </View>

        {/* Category Name */}
        <View style={{ marginBottom: 16 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "500",
              color: "#d4d4d4",
              marginBottom: 8,
            }}
          >
            Category Name
          </Text>
          <TextInput
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            placeholder="e.g., Groceries, Salary"
            placeholderTextColor="#6b7280"
            style={{
              backgroundColor: "#262626",
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              color: "#ffffff",
              fontSize: 16,
            }}
          />
          {errors.name && (
            <Text style={{ color: "#ef4444", fontSize: 14, marginTop: 4 }}>
              {errors.name}
            </Text>
          )}
        </View>

        {/* Category Type */}
        <View style={{ marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "500",
              color: "#d4d4d4",
              marginBottom: 12,
            }}
          >
            Category Type
          </Text>
          <View style={{ flexDirection: "row" }}>
            {(["regular", "fund"] as CategoryType[]).map((type) => (
              <TouchableOpacity
                key={type}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  marginRight: type === "regular" ? 8 : 0,
                  backgroundColor:
                    formData.category_type === type ? "#22c55e" : "#262626",
                  alignItems: "center",
                }}
                onPress={() => {
                  if (category && category.fund_balance > 0 && type === "regular") {
                    Alert.alert(
                      "Cannot convert",
                      "Withdraw remaining funds before converting to a regular category."
                    );
                    return;
                  }
                  setFormData((prev) => ({
                    ...prev,
                    category_type: type,
                  }));
                }}
              >
                <Text
                  style={{
                    color: "#ffffff",
                    fontWeight: "600",
                    fontSize: 14,
                  }}
                >
                  {type === "regular" ? "Regular" : "Fund"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Background Color */}
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "500",
              color: "#d4d4d4",
              marginBottom: 8,
            }}
          >
            Background Color
          </Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {CATEGORY_COLORS.map((color, index) => (
              <TouchableOpacity
                key={index}
                onPress={() =>
                  setFormData({ ...formData, background_color: color })
                }
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 999,
                  backgroundColor: color,
                  borderWidth: formData.background_color === color ? 3 : 0,
                  borderColor: "#ffffff",
                }}
              >
                {formData.background_color === color && (
                  <View
                    style={{
                      flex: 1,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MaterialIcons name="check" size={24} color="white" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {formData.category_type === "fund" && (
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "500",
                color: "#d4d4d4",
                marginBottom: 8,
              }}
            >
              Fund Account
            </Text>

            {accounts.length === 0 ? (
              <View
                style={{
                  backgroundColor: "#262626",
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <Text style={{ color: "#f87171", fontSize: 14 }}>
                  You need at least one account to create a fund category.
                </Text>
              </View>
            ) : (
              <>
                {category && category.fund_account_id ? (
                  <View
                    style={{
                      backgroundColor: "#262626",
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <Text style={{ color: "#ffffff", fontWeight: "600" }}>
                      {
                        accounts.find(
                          (acc) => acc.id === category.fund_account_id
                        )?.name
                      }
                    </Text>
                    <Text style={{ color: "#9ca3af", fontSize: 12, marginTop: 4 }}>
                      Account is locked while funds remain in this category.
                    </Text>
                    <Text style={{ color: "#86efac", fontSize: 12, marginTop: 4 }}>
                      Available ·{" "}
                      {formatAvailableDisplay(
                        getAvailableForAccount(category.fund_account_id),
                        accounts.find((acc) => acc.id === category.fund_account_id)
                          ?.currency
                      )}
                    </Text>
                  </View>
                ) : (
                  <View style={{ backgroundColor: "#262626", borderRadius: 12 }}>
                    {accounts.map((account) => (
                      <TouchableOpacity
                        key={account.id}
                        onPress={() =>
                          setFormData((prev) => ({
                            ...prev,
                            fund_account_id: account.id,
                          }))
                        }
                        style={{
                          padding: 16,
                          borderBottomWidth:
                            account.id ===
                            accounts[accounts.length - 1]?.id
                              ? 0
                              : 1,
                          borderBottomColor: "#1f1f1f",
                          backgroundColor:
                            formData.fund_account_id === account.id
                              ? "rgba(34,197,94,0.15)"
                              : "transparent",
                        }}
                      >
                        <Text
                          style={{ color: "#ffffff", fontWeight: "600" }}
                        >
                          {account.name}
                        </Text>
                        <Text style={{ color: "#9ca3af", fontSize: 12, marginTop: 2 }}>
                          Currency · {account.currency}
                        </Text>
                        <Text style={{ color: "#86efac", fontSize: 12, marginTop: 2 }}>
                          Available ·{" "}
                          {formatAvailableDisplay(
                            getAvailableForAccount(account.id),
                            account.currency
                          )}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}
            {errors.fund_account_id && (
              <Text style={{ color: "#ef4444", fontSize: 14, marginTop: 4 }}>
                {errors.fund_account_id}
              </Text>
            )}

            {!category && (
              <View style={{ marginTop: 16 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "500",
                    color: "#d4d4d4",
                    marginBottom: 8,
                  }}
                >
                  Initial Allocation (optional)
                </Text>
                <TextInput
                  value={formData.initial_fund_amount}
                  onChangeText={(text) =>
                    setFormData({ ...formData, initial_fund_amount: text })
                  }
                  placeholder="0.00"
                  placeholderTextColor="#6b7280"
                  keyboardType="decimal-pad"
                  style={{
                    backgroundColor: "#262626",
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    color: "#ffffff",
                    fontSize: 16,
                  }}
                />
                {errors.initial_fund_amount && (
                  <Text style={{ color: "#ef4444", fontSize: 14, marginTop: 4 }}>
                    {errors.initial_fund_amount}
                  </Text>
                )}
                {formData.fund_account_id && (
                  <Text style={{ color: "#9ca3af", fontSize: 12, marginTop: 4 }}>
                    Available to allocate ·{" "}
                    {formatAvailableDisplay(
                      getAvailableForAccount(formData.fund_account_id),
                      accounts.find((acc) => acc.id === formData.fund_account_id)
                        ?.currency
                    )}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Submit Button */}
        <PrimaryButton
          label={category ? "Update Category" : "Create Category"}
          onPress={handleSubmit}
          loading={loading}
        />
      </BottomSheetScrollView>
    </BottomSheetModal>
    
    {/* Emoji Selector Modal - Using Modal to avoid conflicts with main BottomSheet */}
    <Modal
      visible={showEmojiMenu}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowEmojiMenu(false)}
      statusBarTranslucent={true}
    >
      <View style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "flex-end" }}>
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={() => setShowEmojiMenu(false)}
        />
        <View
          style={{
            backgroundColor: "#171717",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: "70%",
            minHeight: "50%",
          }}
        >
          <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "bold", color: "#ffffff" }}>
                Select Emoji
              </Text>
              <TouchableOpacity onPress={() => setShowEmojiMenu(false)}>
                <MaterialIcons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
            
            {/* Category Tabs */}
            <View
              style={{
                flexDirection: "row",
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: "#262626",
                marginBottom: 12,
              }}
            >
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={Object.keys(EMOJI_CATEGORIES) as Array<keyof typeof EMOJI_CATEGORIES>}
                keyExtractor={(item) => item}
                renderItem={({ item: categoryKey }) => (
                  <TouchableOpacity
                    onPress={() => setSelectedEmojiCategory(categoryKey)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: selectedEmojiCategory === categoryKey ? "#22c55e" : "#262626",
                      marginRight: 8,
                    }}
                  >
                    <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "500" }}>
                      {EMOJI_CATEGORIES[categoryKey].name}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>

          {/* Emoji Grid */}
          <FlatList
            data={EMOJI_CATEGORIES[selectedEmojiCategory].emojis}
            numColumns={8}
            keyExtractor={(item, index) => `${item}-${index}`}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  setFormData((prev) => ({ ...prev, emoji: item }));
                  setShowEmojiMenu(false);
                }}
                style={{
                  width: emojiSize,
                  height: emojiSize,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: emojiSize * 0.6 }}>{item}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={{ padding: 20, alignItems: "center" }}>
                <Text style={{ color: "#9ca3af" }}>No emojis found</Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
    </>
  );
}

