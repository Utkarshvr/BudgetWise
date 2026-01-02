import AsyncStorage from "@react-native-async-storage/async-storage";

const LAST_SELECTED_ACCOUNT_KEY = "@budgetwise:last_selected_account_id";

/**
 * Get the last selected account ID from storage
 * @returns The stored account ID, or null if not set
 */
export async function getLastSelectedAccountId(): Promise<string | null> {
  try {
    const value = await AsyncStorage.getItem(LAST_SELECTED_ACCOUNT_KEY);
    return value;
  } catch (error) {
    console.error("Error reading last selected account:", error);
    return null;
  }
}

/**
 * Set the last selected account ID in storage
 * @param accountId - The account ID to store
 */
export async function setLastSelectedAccountId(
  accountId: string
): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_SELECTED_ACCOUNT_KEY, accountId);
  } catch (error) {
    console.error("Error saving last selected account:", error);
  }
}

