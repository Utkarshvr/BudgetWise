import * as WebBrowser from "expo-web-browser";
import { supabase } from "./supabase";
import { getAuthRedirectUrl } from "./auth-redirect";
import { processAuthCallback } from "./auth-callback-handler";

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

      console.log('🔐 [GOOGLE AUTH] OAuth result:', result.type, result.url ? 'has URL' : 'no URL');

      if (result.type === "cancel") {
        console.log('🔐 [GOOGLE AUTH] User cancelled OAuth');
        throw new Error("Sign in cancelled");
      }

      // On iOS, when result.type is "success", the URL is in result.url
      // but the deep link event might not fire, so we need to process it manually
      if (result.type === "success" && result.url) {
        console.log('🔐 [GOOGLE AUTH] Success with URL - processing redirect manually');
        // Process the URL directly since deep link event might not fire on iOS
        await processAuthCallback(result.url, 'webbrowser-result');
        return { success: true };
      }

      // On iOS, result.type can be "dismiss" even when auth succeeds
      // because the redirect happens asynchronously via deep link
      // Also check if result.url exists (sometimes iOS returns dismiss with URL)
      if (result.type === "dismiss") {
        console.log('🔐 [GOOGLE AUTH] Browser dismissed - checking URL and session');
        
        // If URL exists in dismiss result, process it (iOS quirk)
        if (result.url) {
          console.log('🔐 [GOOGLE AUTH] Dismiss with URL - processing redirect manually');
          await processAuthCallback(result.url, 'webbrowser-dismiss');
          return { success: true };
        }
        
        // Check if a session was already created (might happen quickly on iOS)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('🔐 [GOOGLE AUTH] Session already exists after dismiss - auth succeeded');
          return { success: true };
        }
        // If no session, wait a bit for deep link to process (iOS can be slow)
        // The loading state will be reset by the auth state listener in the screen
        // or by timeout if nothing happens
        console.log('🔐 [GOOGLE AUTH] No session yet - waiting for deep link callback');
        return { success: true };
      }

      // If success but no URL, the deep link handler in root layout will handle the redirect
      return { success: true };
    }

    throw new Error("No OAuth URL returned");
  } catch (error) {
    console.error('🔐 [GOOGLE AUTH] Error:', error);
    throw error;
  }
}

