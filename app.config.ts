import { ExpoConfig } from "expo/config";

export default ({ config }: { config: ExpoConfig }) => ({
  ...config,
  extra: {
    ...config.extra,
    SUPABASE_URL: process.env.SUPABASE_URL,
    // Use the anon key from EAS env vars
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  },
});
