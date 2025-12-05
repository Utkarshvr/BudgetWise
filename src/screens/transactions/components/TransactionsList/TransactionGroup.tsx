import { Text, View } from "react-native";
import { Transaction } from "@/types/transaction";
import { type ThemeColors } from "@/constants/theme";
import { type TransactionTypeMeta } from "../../utils/typeMeta";
import { formatDateHeader, formatAmount } from "../../utils/formatting";
import { TransactionItem } from "./TransactionItem";

type TransactionGroupProps = {
  group: {
    date: string;
    transactions: Transaction[];
  };
  colors: ThemeColors;
  typeMeta: {
    DEFAULT_TYPE_META: TransactionTypeMeta;
    TRANSACTION_TYPE_META: Record<string, TransactionTypeMeta>;
  };
  isLastGroup: boolean;
  onTransactionPress?: (transaction: Transaction) => void;
};

export function TransactionGroup({
  group,
  colors,
  typeMeta,
  isLastGroup,
  onTransactionPress,
}: TransactionGroupProps) {
  // Calculate total income and expense for this date
  const totalIncome = group.transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = group.transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  // Get currency from first transaction (assuming all transactions in a group have same currency)
  const currency = group.transactions[0]?.currency || "INR";

  return (
    <View>
      {/* Date Header with totals */}
      <View
        className="px-6 py-3 flex-row justify-between items-center"
        style={{ backgroundColor: colors.background.subtle }}
      >
        <Text
          className="text-base font-bold"
          style={{ color: colors.muted.foreground }}
        >
          {formatDateHeader(group.date)}
        </Text>
        <View className="flex-row items-center gap-8">
          {true && (
            <View className="items-end">
              {/* <Text
                className="text-xs"
                style={{ color: colors.muted.foreground }}
              >
                Income
              </Text> */}
              <Text
                className="text-sm font-semibold"
                style={{ color: colors.transaction.income.badgeIcon }}
              >
                {formatAmount(totalIncome, currency)}
              </Text>
            </View>
          )}
          {true && (
            <View className="items-end">
              {/* <Text
                className="text-xs"
                style={{ color: colors.muted.foreground }}
              >
                Expense
              </Text> */}
              <Text
                className="text-sm font-semibold"
                style={{ color: colors.transaction.expense.badgeIcon }}
              >
                {formatAmount(totalExpense, currency)}
              </Text>
            </View>
          )}
        </View>
      </View>
      {/* Transactions for this date */}
      {group.transactions.map((transaction, index) => (
        <TransactionItem
          key={transaction.id}
          transaction={transaction}
          isLastInGroup={index === group.transactions.length - 1}
          colors={colors}
          DEFAULT_TYPE_META={typeMeta.DEFAULT_TYPE_META}
          TRANSACTION_TYPE_META={typeMeta.TRANSACTION_TYPE_META}
          onPress={onTransactionPress}
        />
      ))}
      {/* Separator between date groups */}
      {/* {!isLastGroup && <View className="h-2" />} */}
    </View>
  );
}

