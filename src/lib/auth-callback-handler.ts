import { router } from "expo-router";
import { supabase } from "./supabase";

/**
 * Processes an auth callback URL and sets the session if tokens are present
 * This is used both for deep link handling and direct URL processing from WebBrowser result
 * After setting the session, it navigates to the appropriate screen
 */
export async function processAuthCallback(url: string, source: string = 'direct'): Promise<void> {
  try {
    console.log('🔗 [AUTH CALLBACK] Processing URL:', {
      source,
      fullUrl: url,
      scheme: url.split('://')[0],
      includesAuthCallback: url.includes('auth-callback'),
      includesSupabase: url.includes('supabase.co'),
    });

    // Check if this is a Supabase verification URL that was intercepted
    if (url.includes('supabase.co/auth/v1/verify')) {
      console.log('🔗 [AUTH CALLBACK] Detected Supabase verification URL');
      try {
        const urlObj = new URL(url);
        const token = urlObj.searchParams.get('token');
        const type = urlObj.searchParams.get('type');
        const redirectTo = urlObj.searchParams.get('redirect_to');
        
        console.log('🔗 [AUTH CALLBACK] Extracted from Supabase URL:', {
          hasToken: !!token,
          tokenPreview: token ? token.substring(0, 20) + '...' : null,
          type,
          redirectTo,
        });
        
        if (token && type === 'signup') {
          console.log('🔗 [AUTH CALLBACK] Verifying token with Supabase...');
          // Verify the token using verifyOtp
          const { data, error } = await supabase.auth.verifyOtp({
            token: token,
            type: 'signup',
          });

          if (error) {
            console.error('🔗 [AUTH CALLBACK] Verify OTP error:', error);
          } else if (data.session) {
            console.log('🔗 [AUTH CALLBACK] Session created successfully from Supabase URL');
            // Session created successfully, navigation will be handled by auth state
            return;
          }
        }
      } catch (urlError) {
        console.error('🔗 [AUTH CALLBACK] Error parsing Supabase URL:', urlError);
      }
    }
    
    // Handle both exp:// and budgetwise:// schemes for auth-callback
    // For exp:// URLs, we need to manually parse since URL constructor might not work
    // Supabase uses hash fragments (#) instead of query strings (?) for security
    if (url.includes('auth-callback')) {
      console.log('🔗 [AUTH CALLBACK] Detected auth-callback URL');
      // Extract tokens from URL - check both query string (?) and hash fragment (#)
      let fragmentOrQuery = '';
      
      // Try hash fragment first (Supabase uses this)
      if (url.includes('#')) {
        const hashParts = url.split('#');
        if (hashParts.length > 1) {
          fragmentOrQuery = hashParts[1];
          console.log('🔗 [AUTH CALLBACK] Found hash fragment');
        }
      }
      // Fallback to query string
      else if (url.includes('?')) {
        const queryParts = url.split('?');
        if (queryParts.length > 1) {
          fragmentOrQuery = queryParts[1];
          console.log('🔗 [AUTH CALLBACK] Found query string');
        }
      }
      
      if (fragmentOrQuery) {
        const params = new URLSearchParams(fragmentOrQuery);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const token = params.get('token');
        const type = params.get('type');
        
        console.log('🔗 [AUTH CALLBACK] Extracted parameters:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          hasToken: !!token,
          type,
          allParams: Array.from(params.keys()),
        });
        
        if (accessToken && refreshToken) {
          console.log('🔗 [AUTH CALLBACK] Setting session with access_token and refresh_token...');
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('🔗 [AUTH CALLBACK] Session error:', sessionError);
            throw sessionError;
          } else {
            console.log('🔗 [AUTH CALLBACK] Session set successfully');
            
            // Get the session to check user metadata and navigate
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              console.log('🔗 [AUTH CALLBACK] Navigating after session set...');
              // Check if user has completed profile
              const hasName = Boolean(session.user?.user_metadata?.full_name);
              
              if (hasName) {
                console.log('🔗 [AUTH CALLBACK] User has name, navigating to tabs');
                router.replace("/(auth)/(tabs)");
              } else {
                console.log('🔗 [AUTH CALLBACK] User needs to complete profile');
                router.replace("/(public)/complete-profile");
              }
            }
          }
        } else if (token) {
          console.log('🔗 [AUTH CALLBACK] Found token parameter, will be handled by auth-callback screen');
        } else {
          console.warn('🔗 [AUTH CALLBACK] No tokens found in auth-callback URL');
        }
      } else {
        console.warn('🔗 [AUTH CALLBACK] No query string or hash fragment in auth-callback URL');
      }
    } else {
      console.log('🔗 [AUTH CALLBACK] URL does not match auth-callback or Supabase verify pattern');
    }
  } catch (err) {
    console.error('🔗 [AUTH CALLBACK] Error handling auth callback:', err);
    throw err;
  }
}

