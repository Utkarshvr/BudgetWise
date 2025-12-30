import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemePreference = "system" | "light" | "dark";

const THEME_PREFERENCE_KEY = "@budgetwise:theme_preference";

/**
 * Get the stored theme preference
 * @returns The stored theme preference, or "system" if not set
 */
export async function getThemePreference(): Promise<ThemePreference> {
  try {
    const value = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);
    if (value === "light" || value === "dark" || value === "system") {
      return value;
    }
    return "system"; // Default to system
  } catch (error) {
    console.error("Error reading theme preference:", error);
    return "system";
  }
}

/**
 * Set the theme preference in storage
 * @param preference - The theme preference to store
 */
export async function setThemePreference(
  preference: ThemePreference
): Promise<void> {
  try {
    await AsyncStorage.setItem(THEME_PREFERENCE_KEY, preference);
  } catch (error) {
    console.error("Error saving theme preference:", error);
  }
}

