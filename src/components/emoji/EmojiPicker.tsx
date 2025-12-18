import { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
} from "react-native";
import emojiData from "emoji-datasource/emoji.json";

type EmojiPickerProps = {
  onEmojiSelected: (emoji: string) => void;
  theme?: string;
};

type EmojiCategory = {
  name: string;
  emojis: string[];
};

// Organize emojis by category - memoized at module level for performance
let cachedCategories: EmojiCategory[] | null = null;

const getEmojiCategories = (): EmojiCategory[] => {
  if (cachedCategories) return cachedCategories;

  const categories: Record<string, string[]> = {
    "Smileys & People": [],
    "Animals & Nature": [],
    "Food & Drink": [],
    "Travel & Places": [],
    "Activities": [],
    "Objects": [],
    "Symbols": [],
    "Flags": [],
  };

  emojiData.forEach((emoji) => {
    try {
      const category = emoji.category || "Symbols";
      // Filter out variation selectors and combining characters for cleaner display
      const codePoints = emoji.unified
        .split("-")
        .map((hex) => parseInt(hex, 16))
        .filter((code) => code !== 0xfe0f && code !== 0x20e3); // Remove VS16 and combining keycap
      
      if (codePoints.length === 0) return;
      
      const emojiChar = String.fromCodePoint(...codePoints);

      // Map emoji categories to our categories
      let targetCategory = "Symbols";
      if (category.includes("Smileys") || category.includes("People")) {
        targetCategory = "Smileys & People";
      } else if (category.includes("Animals") || category.includes("Nature")) {
        targetCategory = "Animals & Nature";
      } else if (category.includes("Food") || category.includes("Drink")) {
        targetCategory = "Food & Drink";
      } else if (category.includes("Travel") || category.includes("Places")) {
        targetCategory = "Travel & Places";
      } else if (category.includes("Activity")) {
        targetCategory = "Activities";
      } else if (category.includes("Objects")) {
        targetCategory = "Objects";
      } else if (category.includes("Flags")) {
        targetCategory = "Flags";
      } else if (category.includes("Symbols")) {
        targetCategory = "Symbols";
      }

      if (categories[targetCategory] && !categories[targetCategory].includes(emojiChar)) {
        categories[targetCategory].push(emojiChar);
      }
    } catch (e) {
      // Skip invalid emojis
    }
  });

  cachedCategories = Object.entries(categories).map(([name, emojis]) => ({
    name,
    emojis: emojis.slice(0, 100), // Limit to first 100 per category for performance
  }));

  return cachedCategories;
};

export function EmojiPicker({ onEmojiSelected, theme = "#22c55e" }: EmojiPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const categories = useMemo(() => getEmojiCategories(), []);

  const filteredEmojis = useMemo(() => {
    if (!searchQuery.trim()) {
      return categories[selectedCategory]?.emojis || [];
    }

    // Simple search - filter emojis that might match
    const query = searchQuery.toLowerCase();
    const results: string[] = [];
    
    emojiData.forEach((e) => {
      try {
        const codePoints = e.unified
          .split("-")
          .map((hex) => parseInt(hex, 16))
          .filter((code) => code !== 0xfe0f && code !== 0x20e3);
        
        if (codePoints.length === 0) return;
        
        const emojiChar = String.fromCodePoint(...codePoints);
        
        if (
          e.short_name?.toLowerCase().includes(query) ||
          e.short_names?.some((name) => name.toLowerCase().includes(query))
        ) {
          if (!results.includes(emojiChar)) {
            results.push(emojiChar);
          }
        }
      } catch (err) {
        // Skip invalid emojis
      }
    });
    
    return results.slice(0, 200); // Limit search results
  }, [searchQuery, selectedCategory, categories]);

  const displayEmojis = searchQuery.trim()
    ? filteredEmojis
    : categories[selectedCategory]?.emojis || [];

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search emojis..."
          placeholderTextColor="#6b7280"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Category Tabs */}
      {!searchQuery.trim() && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsContainer}
          contentContainerStyle={styles.tabsContent}
        >
          {categories.map((category, index) => (
            <TouchableOpacity
              key={category.name}
              onPress={() => setSelectedCategory(index)}
              style={[
                styles.tab,
                selectedCategory === index && {
                  backgroundColor: `${theme}30`,
                  borderBottomColor: theme,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedCategory === index && { color: theme },
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Emoji Grid */}
      <ScrollView style={styles.emojiContainer}>
        <View style={styles.emojiGrid}>
          {displayEmojis.map((emoji, index) => (
            <TouchableOpacity
              key={`${emoji}-${index}`}
              onPress={() => onEmojiSelected(emoji)}
              style={styles.emojiButton}
            >
              <Text style={styles.emoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#171717",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#262626",
  },
  searchInput: {
    backgroundColor: "#262626",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: "#ffffff",
    fontSize: 16,
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: "#262626",
  },
  tabsContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 8,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: {
    color: "#9ca3af",
    fontSize: 14,
    fontWeight: "500",
  },
  emojiContainer: {
    flex: 1,
  },
  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 8,
  },
  emojiButton: {
    width: "12.5%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  emoji: {
    fontSize: 28,
  },
});

