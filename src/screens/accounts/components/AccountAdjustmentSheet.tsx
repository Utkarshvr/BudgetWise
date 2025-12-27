import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { MaterialIcons } from "@expo/vector-icons";
import { Account } from "@/types/account";
import { PrimaryButton } from "@/components/ui";
import { useThemeColors } from "@/constants/theme";
import { formatBalance } from "../utils/formatting";

type AccountAdjustmentSheetProps = {
  visible: boolean;
  account: Account | null;
  spendableAmount: number; // Current spendable amount (balance - reserved)
  onClose: () => void;
  onSubmit: (newSpendable: number) => Promise<void>;
  loading?: boolean;
};

export function AccountAdjustmentSheet({
  visible,
  account,
  spendableAmount,
  onClose,
  onSubmit,
  loading = false,
}: AccountAdjustmentSheetProps) {
  const colors = useThemeColors();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["70%", "95%"], []);

  const [newSpendable, setNewSpendable] = useState("");
  const [showInfo, setShowInfo] = useState(true);
  const newSpendableInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
      if (account) {
        const spendableInMainUnit = spendableAmount / 100;
        setNewSpendable(spendableInMainUnit.toString());
      }
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible, account, spendableAmount]);

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

  const formatBalanceInput = (value: string): string => {
    const cleaned = value.replace(/[^\d.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) {
      return parts[0] + "." + parts.slice(1).join("");
    }
    return cleaned;
  };

  const calculateAdjustment = (): number => {
    if (!account || !newSpendable) return 0;
    const currentSpendable = spendableAmount / 100;
    const newSpendableNum = parseFloat(newSpendable);
    if (isNaN(newSpendableNum)) return 0;
    return newSpendableNum - currentSpendable;
  };

  const adjustmentAmount = calculateAdjustment();
  const adjustmentInSmallestUnit = Math.round(adjustmentAmount * 100);
  const isAdjustmentZero = adjustmentInSmallestUnit === 0;
  const isNewSpendableValid = newSpendable !== "" && !isNaN(parseFloat(newSpendable));

  const handleSubmit = async () => {
    if (!account) return;

    const newSpendableNum = parseFloat(newSpendable);
    if (isNaN(newSpendableNum)) {
      Alert.alert("Error", "Please enter a valid spendable balance");
      return;
    }

    // Validate: Can't subtract more than current spendable
    if (newSpendableNum < 0) {
      Alert.alert("Error", "Spendable balance cannot be negative");
      return;
    }

    // Validate: Adjustment amount cannot be 0
    if (adjustmentInSmallestUnit === 0) {
      Alert.alert("Error", "Adjustment amount cannot be zero. Please enter a different value.");
      return;
    }

    await onSubmit(newSpendableNum);
  };

  if (!account) return null;

  const currentSpendableDisplay = (spendableAmount / 100).toFixed(2);
  const isPositive = adjustmentAmount >= 0;

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      onDismiss={handleDismiss}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: colors.card.DEFAULT }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
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
          <Text
            style={{
              fontSize: 24,
              fontWeight: "bold",
              color: colors.foreground,
            }}
          >
            Add Adjustment
          </Text>
          <TouchableOpacity onPress={onClose}>
            <MaterialIcons
              name="close"
              size={24}
              color={colors.foreground}
            />
          </TouchableOpacity>
        </View>

        {/* What are adjustments? Section */}
        <TouchableOpacity
          onPress={() => setShowInfo(!showInfo)}
          style={{
            backgroundColor: colors.background.subtle,
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              <Text style={{ fontSize: 18, marginRight: 8 }}>🤔</Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.foreground,
                  flex: 1,
                }}
              >
                What are adjustments?
              </Text>
            </View>
            <MaterialIcons
              name={showInfo ? "keyboard-arrow-up" : "keyboard-arrow-down"}
              size={24}
              color={colors.muted.foreground}
            />
          </View>
          {showInfo && (
            <Text
              style={{
                fontSize: 14,
                color: colors.muted.foreground,
                marginTop: 12,
                lineHeight: 20,
              }}
            >
              Adjustments let you reset your balance without having to enter past
              transactions. It's a quick way to get back on track if you've fallen
              behind on logging your spending.
            </Text>
          )}
        </TouchableOpacity>

        {/* Current Spendable Balance */}
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "500",
              color: colors.muted.foreground,
              marginBottom: 8,
            }}
          >
            Current Spendable Balance
          </Text>
          <View
            style={{
              backgroundColor: colors.background.subtle,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          >
            <Text style={{ color: colors.foreground, fontSize: 16 }}>
              {formatBalance(spendableAmount, account.currency)}
            </Text>
          </View>
        </View>

        {/* New Spendable Balance */}
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "500",
              color: colors.muted.foreground,
              marginBottom: 8,
            }}
          >
            What is the new spendable balance?
          </Text>
          <TextInput
            ref={newSpendableInputRef}
            value={newSpendable}
            onChangeText={(text) => {
              setNewSpendable(formatBalanceInput(text));
            }}
            placeholder="0.00"
            placeholderTextColor={colors.muted.foreground}
            keyboardType="decimal-pad"
            style={{
              backgroundColor: colors.background.subtle,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              color: colors.foreground,
              fontSize: 16,
            }}
          />
        </View>

        {/* Adjustment Amount */}
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "500",
              color: colors.muted.foreground,
              marginBottom: 8,
            }}
          >
            Adjustment Amount
          </Text>
          <View
            style={{
              backgroundColor: colors.background.subtle,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          >
            <Text
              style={{
                color: isPositive
                  ? colors.primary.DEFAULT
                  : colors.destructive.DEFAULT,
                fontSize: 16,
                fontWeight: "600",
              }}
            >
              {isPositive ? "+" : ""}
              {formatBalance(adjustmentInSmallestUnit, account.currency)}
            </Text>
          </View>
        </View>

        {/* Submit Button */}
        <PrimaryButton
          label="Add adjustment"
          onPress={handleSubmit}
          loading={loading}
          disabled={isAdjustmentZero || !isNewSpendableValid}
        />
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

