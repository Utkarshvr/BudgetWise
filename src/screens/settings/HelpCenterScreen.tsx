import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useThemeColors } from "@/constants/theme";

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

const faqs: FAQ[] = [
  {
    id: "1",
    question: "How does money reservation work?",
    answer: "Money reservation allows you to set aside funds from your accounts for specific expense categories. For example, you can reserve ₹10,000 from your Bank Account for the 'GYM' category. This helps you track how much money is allocated for each expense category. You can reserve funds from multiple accounts for the same category, and the app will track the total reserved amount across all accounts.",
  },
  {
    id: "2",
    question: "What are the different types of categories?",
    answer: "There are two types of categories: Income and Expense. Income categories are used to label your income sources (like Salary, Freelance, etc.). Expense categories can have money reserved from your accounts to help you budget and track spending. You can create, edit, and manage categories from the Categories screen.",
  },
  {
    id: "3",
    question: "How do I view my spending statistics?",
    answer: "The Stats screen provides detailed insights into your income and expenses. You can view statistics by month or year, switch between income and expense views, and see a breakdown by category with visual pie charts. Use the navigation arrows to move between different time periods and toggle between monthly and annual views.",
  },
  {
    id: "4",
    question: "Can I reserve money from multiple accounts for one category?",
    answer: "Yes! You can reserve funds from multiple accounts for the same expense category. For example, you might reserve ₹10,000 from your Bank Account and ₹4,500 from Cash for the 'GYM' category, giving you a total of ₹14,500 reserved. The app tracks each reservation separately and shows you the total reserved amount.",
  },
  {
    id: "5",
    question: "What happens when I spend from a reserved category?",
    answer: "When you create an expense transaction using a category that has reserved funds, the app will automatically deduct the amount from the reserved balance. If you try to spend more than what's reserved, the app will notify you. This helps you stay within your budget and track how much of your reserved funds you've used.",
  },
];

export default function HelpCenterScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: colors.background.DEFAULT }}
    >
      {/* Header */}
      <View
        className="flex-row items-center px-4 py-3"
        style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-4"
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={colors.foreground}
          />
        </TouchableOpacity>
        <Text
          className="text-xl font-bold flex-1"
          style={{ color: colors.foreground }}
        >
          Help Center
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Introduction */}
        <View className="mb-6">
          <View
            className="rounded-2xl p-4 mb-4"
            style={{ backgroundColor: colors.primary.soft }}
          >
            <View className="flex-row items-center gap-3 mb-2">
              <MaterialIcons
                name="help-outline"
                size={24}
                color={colors.primary.DEFAULT}
              />
              <Text
                className="text-lg font-semibold"
                style={{ color: colors.foreground }}
              >
                Frequently Asked Questions
              </Text>
            </View>
            <Text
              className="text-sm mt-2"
              style={{ color: colors.muted.foreground }}
            >
              Find answers to common questions about BudgetWise features and
              how to use them effectively.
            </Text>
          </View>
        </View>

        {/* FAQs */}
        <View className="gap-3">
          {faqs.map((faq, index) => (
            <View
              key={faq.id}
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: colors.card.DEFAULT }}
            >
              <TouchableOpacity
                onPress={() => toggleFAQ(faq.id)}
                activeOpacity={0.7}
                className="flex-row items-center justify-between px-4 py-4"
              >
                <View className="flex-1 pr-3">
                  <View className="flex-row items-center gap-2 mb-1">
                    <View
                      className="w-6 h-6 rounded-full items-center justify-center"
                      style={{ backgroundColor: colors.primary.soft }}
                    >
                      <Text
                        className="text-xs font-bold"
                        style={{ color: colors.primary.DEFAULT }}
                      >
                        {index + 1}
                      </Text>
                    </View>
                    <Text
                      className="text-base font-semibold flex-1"
                      style={{ color: colors.foreground }}
                      numberOfLines={2}
                    >
                      {faq.question}
                    </Text>
                  </View>
                </View>
                <MaterialIcons
                  name={
                    expandedFAQ === faq.id
                      ? "keyboard-arrow-up"
                      : "keyboard-arrow-down"
                  }
                  size={24}
                  color={colors.muted.foreground}
                />
              </TouchableOpacity>

              {expandedFAQ === faq.id && (
                <View
                  className="px-4 pb-4"
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                  }}
                >
                  <Text
                    className="text-sm mt-3 leading-6"
                    style={{ color: colors.muted.foreground }}
                  >
                    {faq.answer}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Additional Help */}
        <View className="mt-6">
          <View
            className="rounded-2xl p-4"
            style={{ backgroundColor: colors.card.DEFAULT }}
          >
            <View className="flex-row items-center gap-3 mb-2">
              <MaterialIcons
                name="support-agent"
                size={20}
                color={colors.primary.DEFAULT}
              />
              <Text
                className="text-base font-semibold"
                style={{ color: colors.foreground }}
              >
                Need More Help?
              </Text>
            </View>
            <Text
              className="text-sm mt-1"
              style={{ color: colors.muted.foreground }}
            >
              If you have additional questions or need assistance, please contact
              our support team through the app settings.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

