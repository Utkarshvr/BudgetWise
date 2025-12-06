import * as WebBrowser from "expo-web-browser";
import { supabase } from "./supabase";
import { getAuthRedirectUrl } from "./auth-redirect";

// Complete the OAuth session in the browser
WebBrowser.maybeCompleteAuthSession();

/**
 * Initiates Google OAuth sign-in/sign-up flow
 */
export async function signInWithGoogle() {
  try {
    // Get the correct redirect URL based on environment
    const redirectUrl = await getAuthRedirectUrl();
    
    console.log('🔐 [GOOGLE AUTH] Starting Google OAuth with redirect:', redirectUrl);
    
    // Start the OAuth flow
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      console.error('🔐 [GOOGLE AUTH] OAuth error:', error);
      throw error;
    }

    if (data.url) {
      console.log('🔐 [GOOGLE AUTH] Opening OAuth URL in browser...');
      // Open the OAuth URL in the browser
      // The browser will redirect to our deep link, which will be handled by the root layout
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl
      );

      console.log('🔐 [GOOGLE AUTH] OAuth result:', result.type);

      if (result.type === "cancel") {
        console.log('🔐 [GOOGLE AUTH] User cancelled OAuth');
        throw new Error("Sign in cancelled");
      }

      // If success or dismiss, the deep link handler in root layout will handle the redirect
      // The session will be set automatically when the app receives the deep link
      return { success: true };
    }

    throw new Error("No OAuth URL returned");
  } catch (error) {
    console.error('🔐 [GOOGLE AUTH] Error:', error);
    throw error;
  }
}

