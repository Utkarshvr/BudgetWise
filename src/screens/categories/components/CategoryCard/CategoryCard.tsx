import { Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Category, CategoryReservation } from "@/types/category";
import { Account } from "@/types/account";
import { formatBalance, formatDate } from "../../utils";
import { CategoryDetails } from "./CategoryDetails";
import { theme, useThemeColors, getCategoryBackgroundColor } from "@/constants/theme";

type CategoryCardProps = {
  category: Category;
  categoryReservations: CategoryReservation[];
  totalReserved: number;
  isExpanded: boolean;
  onToggle: () => void;
  onShowActions: () => void;
  onEditCategory: () => void;
  accounts: Account[];
  onManageReservations: () => void;
  children?: Category[];
  getReservationsForCategory?: (id: string) => CategoryReservation[];
  getTotalReserved?: (id: string) => number;
  onToggleChild?: (child: Category) => void;
  onShowChildActions?: (child: Category) => void;
  onEditChildCategory?: (child: Category) => void;
  onManageChildReservations?: (child: Category) => void;
  expandedChildren?: Record<string, boolean>;
};

export function CategoryCard({
  category,
  categoryReservations,
  totalReserved,
  isExpanded,
  onToggle,
  onShowActions,
  onEditCategory,
  accounts,
  onManageReservations,
  children = [],
  getReservationsForCategory,
  getTotalReserved,
  onToggleChild,
  onShowChildActions,
  onEditChildCategory,
  onManageChildReservations,
  expandedChildren = {},
}: CategoryCardProps) {
  const colors = useThemeColors();
  const categoryBgColor = getCategoryBackgroundColor(colors);
  const isParent = category.is_parent_category === true;
  const isReserved = categoryReservations.length > 0 || totalReserved > 0;
  // For parent categories, get currency from children's reservations
  // For regular categories, get from their own reservations
  const fundCurrency = categoryReservations.length > 0
    ? categoryReservations[0]?.currency || "INR"
    : "INR";

  return (
    <View
      className="rounded-xl mb-3 overflow-hidden bg-background-subtle"
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onToggle}
        className="flex-row items-center px-4 py-2"
      >
        <View
          className="w-14 h-14 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: categoryBgColor }}
        >
          <Text style={{ fontSize: 28 }}>{category.emoji}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-foreground text-base font-semibold mb-1">
            {category.name}
          </Text>
          {/* Show fund status below the name for both parent and non-parent categories */}
          <View className="flex-row items-center">
            {isReserved ? (
              <View className="flex-row items-center">
                <View className="w-1.5 h-1.5 rounded-full bg-primary mr-1.5" />
                <Text className="text-primary text-xs font-medium">
                  {formatBalance(totalReserved, fundCurrency)}
                </Text>
              </View>
            ) : (
              <View className="flex-row items-center">
                <View className="w-1.5 h-1.5 rounded-full bg-muted-foreground mr-1.5" />
                <Text className="text-muted-foreground text-xs font-medium">
                  {isParent ? "No funds in children" : "No fund"}
                </Text>
              </View>
            )}
          </View>
        </View>
        <View className="flex-row items-center ml-2">
          {/* Expand/collapse arrow - show for parents or expense categories */}
          {(isParent || category.category_type === "expense") && (
            <View className="w-9 h-9 rounded-full items-center justify-center mr-1.5">
              <MaterialIcons
                name={
                  isExpanded ? "expand-less" : "keyboard-arrow-down"
                }
                size={24}
                color={theme.colors.muted.foreground}
              />
            </View>
          )}
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onShowActions();
            }}
            className="w-9 h-9 rounded-full items-center justify-center"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons
              name="more-vert"
              size={20}
              color={theme.colors.muted.foreground}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <>
          <View className="h-px bg-border mx-4" />
          <View className="px-4 pt-3 pb-4">
            {isParent ? (
              // Show children categories
              <View>
                <Text className="text-muted-foreground text-xs mb-3">
                  {children.length} categor{children.length === 1 ? "y" : "ies"}
                </Text>
                {children.map((child, index) => {
                  const childReservations = getReservationsForCategory
                    ? getReservationsForCategory(child.id)
                    : [];
                  const childTotalReserved = getTotalReserved
                    ? getTotalReserved(child.id)
                    : 0;
                  const isChildExpanded = !!expandedChildren[child.id];
                  const childIsReserved = childReservations.length > 0;
                  const childCurrency = childReservations[0]?.currency || "INR";

                  return (
                    <View key={child.id} className={index > 0 ? "mt-3" : ""}>
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => onToggleChild?.(child)}
                        className="flex-row items-center py-2"
                      >
                        <View
                          className="w-10 h-10 rounded-full items-center justify-center mr-3"
                          style={{ backgroundColor: categoryBgColor }}
                        >
                          <Text style={{ fontSize: 20 }}>{child.emoji}</Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-foreground text-sm font-medium mb-1">
                            {child.name}
                          </Text>
                          <View className="flex-row items-center">
                            {childIsReserved ? (
                              <View className="flex-row items-center">
                                <View className="w-1.5 h-1.5 rounded-full bg-primary mr-1.5" />
                                <Text className="text-primary text-xs font-medium">
                                  {formatBalance(childTotalReserved, childCurrency)}
                                </Text>
                              </View>
                            ) : (
                              <View className="flex-row items-center">
                                <View className="w-1.5 h-1.5 rounded-full bg-muted-foreground mr-1.5" />
                                <Text className="text-muted-foreground text-xs font-medium">
                                  No fund
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <View className="flex-row items-center ml-2">
                          {child.category_type === "expense" && (
                            <View className="w-8 h-8 rounded-full items-center justify-center mr-1.5">
                              <MaterialIcons
                                name={
                                  isChildExpanded
                                    ? "expand-less"
                                    : "keyboard-arrow-down"
                                }
                                size={20}
                                color={theme.colors.muted.foreground}
                              />
                            </View>
                          )}
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              onShowChildActions?.(child);
                            }}
                            className="w-8 h-8 rounded-full items-center justify-center"
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <MaterialIcons
                              name="more-vert"
                              size={18}
                              color={theme.colors.muted.foreground}
                            />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>

                      {isChildExpanded && child.category_type === "expense" && (
                        <>
                          <View className="h-px bg-border ml-13 mt-2 mb-2" />
                          <View className="ml-13">
                            <Text className="text-muted-foreground text-xs mb-2">
                              Updated {formatDate(child.updated_at)}
                            </Text>
                            <CategoryDetails
                              category={child}
                              categoryReservations={childReservations}
                              totalReserved={childTotalReserved}
                              accounts={accounts}
                              onManageReservations={() =>
                                onManageChildReservations?.(child)
                              }
                              onEditCategory={() => onEditChildCategory?.(child)}
                              isParent={false}
                            />
                          </View>
                        </>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : (
              // Show category details for non-parent categories
              <>
                <Text className="text-muted-foreground text-xs mb-3">
                  Updated {formatDate(category.updated_at)}
                </Text>
                <CategoryDetails
                  category={category}
                  categoryReservations={categoryReservations}
                  totalReserved={totalReserved}
                  accounts={accounts}
                  onManageReservations={onManageReservations}
                  onEditCategory={onEditCategory}
                  isParent={isParent}
                />
              </>
            )}
          </View>
        </>
      )}
    </View>
  );
}

