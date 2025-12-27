import { useRef, useEffect, useMemo, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { MaterialIcons } from "@expo/vector-icons";
import { TransactionType } from "@/types/transaction";
import { useThemeColors } from "@/constants/theme";

type TransactionTypeSheetProps = {
  visible: boolean;
  selectedType: TransactionType;
  onClose: () => void;
  onSelect: (type: TransactionType) => void;
};

const TRANSACTION_TYPES: {
  value: TransactionType;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}[] = [
  { value: "expense", label: "Expense", icon: "inbox" },
  { value: "income", label: "Income", icon: "add-circle-outline" },
  { value: "transfer", label: "Transfer", icon: "sync-alt" },
];

export function TransactionTypeSheet({
  visible,
  selectedType,
  onClose,
  onSelect,
}: TransactionTypeSheetProps) {
  const colors = useThemeColors();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["60%"], []);

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
    (type: TransactionType) => {
      onSelect(type);
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
      <BottomSheetView style={styles.container}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Transaction type
        </Text>

        {TRANSACTION_TYPES.map((type) => (
          <TouchableOpacity
            key={type.value}
            onPress={() => handleSelect(type.value)}
            style={styles.typeOption}
          >
            <Text style={[styles.typeLabel, { color: colors.foreground }]}>
              {type.label}
            </Text>
            {selectedType === type.value && (
              <MaterialIcons
                name="check-circle"
                size={24}
                color={colors.primary.DEFAULT}
              />
            )}
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          onPress={onClose}
          style={[
            styles.saveButton,
            { backgroundColor: colors.primary.DEFAULT },
          ]}
        >
          <Text style={[styles.saveButtonText, { color: colors.white }]}>
            Save and close
          </Text>
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 24,
  },
  typeOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  typeLabel: {
    fontSize: 18,
  },
  saveButton: {
    marginTop: 24,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

