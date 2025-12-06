import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { MaterialIcons } from "@expo/vector-icons";
import { Category, CategoryReservation } from "@/types/category";
import { Account } from "@/types/account";
import { getCategoryBackgroundColor } from "@/constants/theme";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type WithdrawFundsSheetProps = {
  visible: boolean;
  account: Account | null;
  categories: Category[];
  reservations: CategoryReservation[];
  requiredAmount: number; // Transaction amount in smallest currency unit
  spendableBalance: number; // Current spendable balance in smallest currency unit
  onClose: () => void;
  onWithdrawComplete: (totalWithdrawn: number) => void;
};

const formatBalance = (amount: number, currency: string) => {
  const mainUnit = amount / 100;
  return `${currency} ${mainUnit.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export function WithdrawFundsSheet({
  visible,
  account,
  categories,
  reservations,
  requiredAmount,
  spendableBalance,
  onClose,
  onWithdrawComplete,
}: WithdrawFundsSheetProps) {
  const categoryBgColor = getCategoryBackgroundColor({} as any);
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["90%"], []);

  const [expandedReservationId, setExpandedReservationId] = useState<string | null>(null);
  const [withdrawAmounts, setWithdrawAmounts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setExpandedReservationId(null);
      setWithdrawAmounts({});
    }
  }, [visible]);

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

  // Get reservations for this account with category info
  const accountReservations = useMemo(() => {
    if (!account) return [];
    
    return reservations
      .filter((r) => r.account_id === account.id && r.reserved_amount > 0)
      .map((reservation) => {
        const category = categories.find((c) => c.id === reservation.category_id);
        return {
          ...reservation,
          category: category || null,
        };
      })
      .filter((r) => r.category !== null); // Only show reservations with valid categories
  }, [account, reservations, categories]);

  const handleWithdrawClick = (reservationId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    if (expandedReservationId === reservationId) {
      // Collapse
      setExpandedReservationId(null);
      setWithdrawAmounts((prev) => {
        const newAmounts = { ...prev };
        delete newAmounts[reservationId];
        return newAmounts;
      });
    } else {
      // Expand
      setExpandedReservationId(reservationId);
    }
  };

  const handleWithdraw = async () => {
    if (!account) return;

    // Validate all withdraw amounts
    const withdrawEntries = Object.entries(withdrawAmounts).filter(
      ([_, amount]) => amount && amount.trim() !== ""
    );

    if (withdrawEntries.length === 0) {
      Alert.alert("Error", "Please enter at least one withdrawal amount");
      return;
    }

    let totalWithdrawn = 0;
    const errors: string[] = [];

    // Validate each amount
    for (const [reservationId, amountStr] of withdrawEntries) {
      const amountNum = parseFloat(amountStr);
      if (isNaN(amountNum) || amountNum <= 0) {
        errors.push("All amounts must be valid positive numbers");
        break;
      }

      const amountSmallest = Math.round(amountNum * 100);
      const reservation = accountReservations.find((r) => r.id === reservationId);
      
      if (!reservation) continue;

      if (amountSmallest > reservation.reserved_amount) {
        errors.push(
          `Cannot withdraw more than ${formatBalance(reservation.reserved_amount, reservation.currency)} from ${reservation.category?.name || "category"}`
        );
        break;
      }

      totalWithdrawn += amountSmallest;
    }

    if (errors.length > 0) {
      Alert.alert("Error", errors[0]);
      return;
    }

    if (totalWithdrawn === 0) {
      Alert.alert("Error", "Total withdrawal amount must be greater than 0");
      return;
    }

    setSubmitting(true);
    try {
      const { supabase } = await import("@/lib/supabase");
      
      // Withdraw from each reservation
      for (const [reservationId, amountStr] of withdrawEntries) {
        const amountNum = parseFloat(amountStr);
        const amountSmallest = Math.round(amountNum * 100);
        const reservation = accountReservations.find((r) => r.id === reservationId);
        
        if (!reservation) continue;

        const { error: rpcError } = await supabase.rpc("adjust_category_reservation", {
          p_category_id: reservation.category_id,
          p_account_id: reservation.account_id,
          p_amount_delta: -amountSmallest,
        });

        if (rpcError) throw rpcError;
      }

      // Success - notify parent with total withdrawn
      onWithdrawComplete(totalWithdrawn);
      onClose();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to withdraw funds");
    } finally {
      setSubmitting(false);
    }
  };

  const updateWithdrawAmount = (reservationId: string, text: string) => {
    const cleaned = text.replace(/[^\d.]/g, "");
    const parts = cleaned.split(".");
    let finalValue = cleaned;
    
    if (parts.length > 2) {
      finalValue = parts[0] + "." + parts.slice(1).join("");
    }

    setWithdrawAmounts((prev) => ({
      ...prev,
      [reservationId]: finalValue,
    }));
  };

  const getTotalWithdrawn = () => {
    return Object.values(withdrawAmounts).reduce((sum, amountStr) => {
      const amountNum = parseFloat(amountStr || "0");
      if (isNaN(amountNum)) return sum;
      return sum + Math.round(amountNum * 100);
    }, 0);
  };

  const totalWithdrawn = getTotalWithdrawn();
  // Calculate the actual amount needed (transaction amount - spendable balance)
  const amountNeeded = Math.max(0, requiredAmount - spendableBalance);
  const transactionAmountFormatted = formatBalance(requiredAmount, account?.currency || "INR");
  const spendableBalanceFormatted = formatBalance(spendableBalance, account?.currency || "INR");
  const amountNeededFormatted = formatBalance(amountNeeded, account?.currency || "INR");
  const totalWithdrawnFormatted = formatBalance(totalWithdrawn, account?.currency || "INR");
  const remainingNeeded = Math.max(0, amountNeeded - totalWithdrawn);
  const remainingNeededFormatted = formatBalance(remainingNeeded, account?.currency || "INR");

  if (!account) return null;

  return (
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
    >
      <BottomSheetScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-1">
            <Text className="text-white text-lg font-semibold mb-1">
              Withdraw Funds
            </Text>
            <Text className="text-neutral-400 text-sm">
              {account.name}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose}>
            <MaterialIcons name="close" size={24} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Alert Message */}
        <View className="bg-orange-500/20 border border-orange-500/50 rounded-xl p-3 mb-6">
          <Text className="text-orange-400 text-sm font-medium mb-1">
            Insufficient Spendable Balance
          </Text>
          <Text className="text-neutral-300 text-xs">
            Your transaction amount exceeds the available spendable balance. Withdraw funds from your category reservations to proceed.
          </Text>
        </View>

        {/* Info Card */}
        <View className="bg-neutral-800 rounded-2xl p-4 mb-6">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-neutral-400 text-xs">Transaction Amount</Text>
            <Text className="text-white text-base font-semibold">
              {transactionAmountFormatted}
            </Text>
          </View>
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-neutral-400 text-xs">Spendable Balance</Text>
            <Text className="text-blue-400 text-base font-semibold">
              {spendableBalanceFormatted}
            </Text>
          </View>
          <View className="h-px bg-neutral-700 my-2" />
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-neutral-400 text-xs">Amount Needed</Text>
            <Text className="text-orange-400 text-base font-semibold">
              {amountNeededFormatted}
            </Text>
          </View>
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-neutral-400 text-xs">Total Withdrawn</Text>
            <Text className="text-green-400 text-base font-semibold">
              {totalWithdrawnFormatted}
            </Text>
          </View>
          <View className="h-px bg-neutral-700 my-2" />
          <View className="flex-row justify-between items-center">
            <Text className="text-neutral-400 text-xs">Remaining Needed</Text>
            <Text className={`text-base font-semibold ${
              remainingNeeded === 0 ? "text-green-400" : "text-orange-400"
            }`}>
              {remainingNeededFormatted}
            </Text>
          </View>
        </View>

        {/* Reservations List */}
        {accountReservations.length > 0 ? (
          <View className="mb-6">
            <Text className="text-neutral-300 text-sm mb-3 font-semibold">
              Available Funds
            </Text>
            {accountReservations.map((reservation) => {
              const isExpanded = expandedReservationId === reservation.id;
              const withdrawAmount = withdrawAmounts[reservation.id] || "";

              return (
                <View
                  key={reservation.id}
                  className="bg-neutral-800 rounded-2xl p-4 mb-3 border-2"
                  style={{
                    borderColor: isExpanded ? "#3b82f6" : "transparent",
                  }}
                >
                  {/* Header */}
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center flex-1">
                      <View
                        className="w-12 h-12 rounded-xl items-center justify-center mr-3"
                        style={{ backgroundColor: categoryBgColor }}
                      >
                        <Text style={{ fontSize: 24 }}>
                          {reservation.category?.emoji || "📁"}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-white text-lg font-semibold">
                          {reservation.category?.name || "Unknown Category"}
                        </Text>
                        <Text className="text-neutral-400 text-sm">
                          Reserved: {formatBalance(reservation.reserved_amount, reservation.currency)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Withdraw Button / Input Section */}
                  {!isExpanded ? (
                    <TouchableOpacity
                      onPress={() => handleWithdrawClick(reservation.id)}
                      className="bg-neutral-700 rounded-xl py-3 items-center"
                    >
                      <Text className="text-white text-sm font-semibold">
                        Withdraw
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View>
                      <Text className="text-neutral-300 text-xs mb-2">
                        Enter Amount to Withdraw
                      </Text>
                      <View className="flex-row gap-2">
                        <TextInput
                          value={withdrawAmount}
                          onChangeText={(text) =>
                            updateWithdrawAmount(reservation.id, text)
                          }
                          placeholder="0.00"
                          placeholderTextColor="#6b7280"
                          keyboardType="decimal-pad"
                          className="flex-1 bg-neutral-700 rounded-xl px-4 py-3 text-white text-base"
                          autoFocus
                        />
                        <TouchableOpacity
                          onPress={() => {
                            // Set max amount
                            const maxAmount = (reservation.reserved_amount / 100).toFixed(2);
                            updateWithdrawAmount(reservation.id, maxAmount);
                          }}
                          className="bg-neutral-600 rounded-xl px-4 items-center justify-center"
                        >
                          <Text className="text-white text-xs font-semibold">
                            Max
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <Text className="text-neutral-500 text-xs mt-1">
                        Max: {formatBalance(reservation.reserved_amount, reservation.currency)}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <View className="bg-neutral-800/50 rounded-2xl p-6 mb-6 items-center">
            <MaterialIcons name="account-balance-wallet" size={48} color="#525252" />
            <Text className="text-neutral-400 text-sm text-center mt-3">
              No reserved funds available in this account.
            </Text>
          </View>
        )}

        {/* Submit Button */}
        {totalWithdrawn > 0 && (
          <TouchableOpacity
            onPress={handleWithdraw}
            disabled={submitting || remainingNeeded > 0}
            className={`rounded-xl py-4 items-center justify-center ${
              remainingNeeded === 0 ? "bg-green-600" : "bg-neutral-700"
            }`}
            style={{ opacity: submitting || remainingNeeded > 0 ? 0.5 : 1 }}
          >
            {submitting ? (
              <Text className="text-white text-base font-semibold">
                Processing...
              </Text>
            ) : (
              <Text className="text-white text-base font-semibold">
                {remainingNeeded === 0
                  ? "Withdraw & Log Transaction"
                  : `Withdraw ${totalWithdrawnFormatted} (Need ${remainingNeededFormatted} more)`}
              </Text>
            )}
          </TouchableOpacity>
        )}

        <View className="bg-neutral-800/50 rounded-xl p-3 mt-4">
          <Text className="text-neutral-400 text-xs text-center">
            💡 Tip: Withdraw funds from your category reservations to make them available for this transaction.
          </Text>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

