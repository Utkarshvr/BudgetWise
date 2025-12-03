import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

const { width: screenWidth } = Dimensions.get("window");
const CONTAINER_PADDING = 24; // px-6 = 24px on each side
const itemWidth = screenWidth - CONTAINER_PADDING * 2;

type OnboardingSlide = {
  title: string;
  subtitle: string;
  illustration: React.ReactNode;
};

type PlaceholderIllustrationProps = {
  variant?: "wallet" | "categories" | "shield";
};

function PlaceholderIllustration({
  variant = "wallet",
}: PlaceholderIllustrationProps) {
  const iconProps = {
    size: 72,
    color: "#22c55e",
  };

  let iconName: keyof typeof MaterialIcons.glyphMap = "account-balance-wallet";
  if (variant === "categories") iconName = "pie-chart";
  if (variant === "shield") iconName = "shield";

  return (
    <View className="items-center justify-center">
      <MaterialIcons name={iconName} {...iconProps} />
    </View>
  );
}

const SLIDES: OnboardingSlide[] = [
  {
    title: "Track your spending effortlessly",
    subtitle:
      "See every expense in one place so you always know where your money goes.",
    illustration: <PlaceholderIllustration variant="wallet" />,
  },
  {
    title: "Categorize finances with clarity",
    subtitle:
      "Group your transactions into smart categories that match your real life.",
    illustration: <PlaceholderIllustration variant="categories" />,
  },
  {
    title: "Control your money, build confidence",
    subtitle:
      "Set simple goals, stay on top of bills, and grow healthier money habits.",
    illustration: <PlaceholderIllustration variant="shield" />,
  },
];

export function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const listRef = useRef<FlatList<OnboardingSlide> | null>(null);

  const handleContinue = () => {
    const isLastSlide = currentIndex === SLIDES.length - 1;

    if (isLastSlide) {
      router.replace("/(public)/sign-in");
      return;
    }

    const nextIndex = currentIndex + 1;
    // Use scrollToOffset for precise centering
    const offset = nextIndex * itemWidth;
    listRef.current?.scrollToOffset({ offset, animated: true });
    setCurrentIndex(nextIndex);
  };

  const handleSkip = () => {
    router.replace("/(public)/sign-in");
  };

  const handleMomentumEnd = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const nextIndex = Math.round(offsetX / itemWidth);
    if (nextIndex !== currentIndex && nextIndex >= 0 && nextIndex < SLIDES.length) {
      setCurrentIndex(nextIndex);
      // Ensure proper alignment after manual scroll
      const targetOffset = nextIndex * itemWidth;
      listRef.current?.scrollToOffset({ offset: targetOffset, animated: true });
    }
  };

  return (
    <View className="flex-1 bg-neutral-950">
      <View className="flex-1 px-6 py-20">
        <View className="flex-1 justify-between">
          {/* Top: logo + skip */}
          <View className="self-end">
            <TouchableOpacity onPress={handleSkip} hitSlop={8}>
              <Text className="text-sm font-medium text-neutral-400">Skip</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-1 justify-between">
            {/* Logo */}
            <Image
              source={require("@/assets/brand/logo.png")}
              style={{ width: 120, height: 120, borderRadius: 999 }}
              resizeMode="contain"
              className="self-center"
            />

            {/* Middle: illustration + text + dots */}
            <View className="justify-center">
              <FlatList
                ref={listRef}
                data={SLIDES}
                keyExtractor={(item) => item.title}
                horizontal
                pagingEnabled={false}
                snapToInterval={itemWidth}
                snapToAlignment="start"
                decelerationRate="fast"
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleMomentumEnd}
                contentContainerStyle={{ paddingHorizontal: 0 }}
                getItemLayout={(_, index) => ({
                  length: itemWidth,
                  offset: itemWidth * index,
                  index,
                })}
                renderItem={({ item }) => (
                  <View style={{ width: itemWidth }} className="items-center">
                    <View className="items-center">{item.illustration}</View>

                    <View className="mt-8 items-center px-6">
                      <Text className="text-center text-2xl font-semibold text-neutral-50">
                        {item.title}
                      </Text>
                      <Text className="mt-3 text-center text-base font-normal text-neutral-400">
                        {item.subtitle}
                      </Text>
                    </View>
                  </View>
                )}
              />
            </View>

            {/* Bottom: primary button */}
            <View>
              <View className="mb-6 items-center">
                <View className="flex-row items-center justify-center gap-2">
                  {SLIDES.map((_, index) => {
                    const isActive = index === currentIndex;
                    return (
                      // eslint-disable-next-line react/no-array-index-key
                      <View
                        key={index}
                        className={`h-2 rounded-full ${
                          isActive
                            ? "w-5 bg-emerald-400"
                            : "w-2.5 bg-neutral-700"
                        }`}
                      />
                    );
                  })}
                </View>
              </View>
              <TouchableOpacity
                onPress={handleContinue}
                className="w-full items-center justify-center rounded-2xl bg-emerald-500 py-4"
                activeOpacity={0.9}
              >
                <Text className="text-base font-semibold text-white">
                  Continue
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export { SLIDES as ONBOARDING_SLIDES, PlaceholderIllustration };
