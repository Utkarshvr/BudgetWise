import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra ?? {};

export const SUPABASE_URL = extra.SUPABASE_URL;
export const SUPABASE_ANON_KEY = extra.SUPABASE_ANON_KEY;
