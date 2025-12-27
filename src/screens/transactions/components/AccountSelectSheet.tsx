import { useRef, useEffect, useMemo, useCallback } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { MaterialIcons } from "@expo/vector-icons";
import { Account } from "@/types/account";
import { CategoryReservation } from "@/types/category";
import {
  ACCOUNT_TYPE_ICONS,
  formatBalance,
  getTotalReserved,
} from "@/screens/accounts/utils";
import { useThemeColors } from "@/constants/theme";

type AccountSelectSheetProps = {
  visible: boolean;
  accounts: Account[];
  selectedAccountId: string | null;
  title?: string;
  excludeAccountId?: string | null;
  reservations?: CategoryReservation[];
  onClose: () => void;
  onSelect: (account: Account) => void;
};

export function AccountSelectSheet({
  visible,
  accounts,
  selectedAccountId,
  title = "Select Account",
  excludeAccountId,
  reservations = [],
  onClose,
  onSelect,
}: AccountSelectSheetProps) {
  const colors = useThemeColors();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["50%"], []);

  const filteredAccounts = useMemo(() => {
    if (excludeAccountId) {
      return accounts.filter((account) => account.id !== excludeAccountId);
    }
    return accounts;
  }, [accounts, excludeAccountId]);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
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

  const handleSelect = useCallback(
    (account: Account) => {
      onSelect(account);
      onClose();
    },
    [onSelect, onClose]
  );

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
    >
      <BottomSheetView className="flex-1 px-6 pt-4 pb-8">
        <Text
          className="text-xl font-semibold text-center mb-6"
          style={{ color: colors.foreground }}
        >
          {title}
        </Text>

        <View className="flex-1">
          {filteredAccounts.map((account) => {
            const reservedTotal = getTotalReserved(account.id, reservations);
            const spendable = Math.max(account.balance - reservedTotal, 0);
            const totalBalance = account.balance;

            return (
              <TouchableOpacity
                key={account.id}
                onPress={() => handleSelect(account)}
                className="flex-row justify-between items-center py-4 px-1 border-b"
                style={{ borderBottomColor: colors.border }}
              >
                <View className="flex-row items-center flex-1">
                  <View
                    className="w-11 h-11 rounded-xl items-center justify-center mr-3"
                    style={{ backgroundColor: getAccountTypeColor(account.type) }}
                  >
                    <MaterialIcons
                      name={ACCOUNT_TYPE_ICONS[account.type] as any}
                      size={20}
                      color={colors.white}
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-lg font-semibold mb-2"
                      style={{ color: colors.foreground }}
                    >
                      {account.name}
                    </Text>
                    <View
                      className="px-2 py-1 rounded-lg border self-start"
                      style={{
                        backgroundColor: colors.background.subtle,
                        borderColor: colors.border,
                      }}
                    >
                      <Text className="text-sm font-medium">
                        <Text style={{ color: colors.foreground }}>
                          {formatBalance(totalBalance, account.currency)}
                        </Text>
                        <Text style={{ color: colors.muted.foreground }}> | </Text>
                        <Text style={{ color: colors.primary.DEFAULT }}>
                          {formatBalance(spendable, account.currency)}
                        </Text>
                        {/* {reservedTotal > 0 && (
                          <>
                            <Text style={{ color: colors.muted.foreground }}> | </Text>
                            <Text style={{ color: colors.warning.DEFAULT }}>
                              {formatBalance(reservedTotal, account.currency)}
                            </Text>
                          </>
                        )} */}
                      </Text>
                    </View>
                  </View>
                </View>
                {selectedAccountId === account.id ? (
                  <MaterialIcons
                    name="check-circle"
                    size={24}
                    color={colors.primary.DEFAULT}
                  />
                ) : (
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: colors.border,
                    }}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          onPress={onClose}
          className="mt-6 rounded-3xl py-4 items-center"
          style={{ backgroundColor: colors.primary.DEFAULT }}
        >
          <Text
            className="text-base font-semibold"
            style={{ color: colors.white }}
          >
            Save and close
          </Text>
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const getAccountTypeColor = (type: Account["type"]): string => {
  const colorMap: Record<Account["type"], string> = {
    cash: "#22c55e", // green-500
    checking: "#3b82f6", // blue-500
    savings: "#a855f7", // purple-500
    credit_card: "#f97316", // orange-500
  };
  return colorMap[type] || "#6b7280";
};

