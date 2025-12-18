import { useState, useRef, useEffect } from "react";
import { Link, router } from "expo-router";
import { Text, View, TextInput, Alert } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { supabase, getAuthRedirectUrl, signInWithGoogle } from "@/lib";
import { AuthScaffold } from "./components/AuthScaffold";
import { FormField, PrimaryButton } from "@/components/ui";
import { GoogleButton } from "./components/GoogleButton";

export default function SignUpScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  // Listen for auth state changes to reset loading state
  useEffect(() => {
    let isMounted = true;
    let subscription: any;
    let timeoutId: any;

    // If Google loading is active, listen for auth completion
    if (googleLoading) {
      // Check current session first (in case auth completed before listener was set up)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!isMounted) return;
        if (session) {
          console.log('🔐 [SIGN UP] Session already exists, resetting Google loading');
          setGoogleLoading(false);
          return;
        }
      });

      // Set up listener for future auth state changes
      const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (!isMounted) return;
        
        // Reset loading when user successfully signs in
        if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          console.log('🔐 [SIGN UP] Auth state changed, resetting Google loading');
          setGoogleLoading(false);
          if (timeoutId) clearTimeout(timeoutId);
        }
      });

      subscription = authSubscription;

      // Safety timeout: reset loading after 30 seconds if nothing happens
      timeoutId = setTimeout(() => {
        if (isMounted) {
          console.warn('🔐 [SIGN UP] Google auth timeout, resetting loading state');
          setGoogleLoading(false);
        }
      }, 30000);
    }

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [googleLoading]);

  const handleSignUp = async () => {
    setError(null);

    if (!email || !password || !confirmPassword) {
      setError("Please fill in every field.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    
    try {
      // Get the correct redirect URL based on environment
      const redirectUrl = await getAuthRedirectUrl();
      
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      // Don't auto-login, redirect to verification screen
      setLoading(false);
      router.replace({
        pathname: "/(public)/verify-email",
        params: { email },
      });
    } catch (err: any) {
      console.error("Sign-up error:", err);
      setError(err.message || "Failed to create account. Please check your network connection and try again.");
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      // Navigation will be handled by auth state change or auth-callback screen
    } catch (err: any) {
      console.error("Google sign-up error:", err);
      setError(err.message || "Failed to sign up with Google");
      setGoogleLoading(false);
    }
  };

  const handleTermsService = async () => {
    try {
      await WebBrowser.openBrowserAsync("https://uv-budget-tracker.vercel.app");
    } catch (error) {
      console.error("Error opening Terms & Service:", error);
    }
  };

  return (
    <AuthScaffold
      title="Create your account"
      subtitle="Track budgets, stay accountable, and hit financial goals."
      footer={
        <Text className="text-base text-neutral-500 dark:text-neutral-400">
          Already have an account?{" "}
          <Link
            href="/(public)/sign-in"
            className="font-semibold text-neutral-900 dark:text-white"
          >
            Sign in
          </Link>
        </Text>
      }
    >
      <View className="gap-4">
        {error ? (
          <Text className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-600 dark:border-rose-700/50 dark:bg-rose-500/10 dark:text-rose-200">
            {error}
          </Text>
        ) : null}
        <FormField
          label="Email"
          value={email}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          onChangeText={setEmail}
          placeholder="you@email.com"
        />
        <FormField
          ref={passwordRef}
          label="Password"
          value={password}
          secureTextEntry
          autoCapitalize="none"
          returnKeyType="next"
          onSubmitEditing={() => confirmPasswordRef.current?.focus()}
          onChangeText={setPassword}
          placeholder="Create a password"
        />
        <FormField
          ref={confirmPasswordRef}
          label="Confirm password"
          value={confirmPassword}
          secureTextEntry
          autoCapitalize="none"
          returnKeyType="go"
          onSubmitEditing={handleSignUp}
          onChangeText={setConfirmPassword}
          placeholder="Re-enter password"
        />

        <PrimaryButton
          label={loading ? "Creating..." : "Create account"}
          loading={loading}
          onPress={handleSignUp}
        />

        <View className="flex-row items-center gap-3">
          <View className="flex-1 border-t border-neutral-300 dark:border-neutral-700" />
          <Text className="text-sm text-neutral-500 dark:text-neutral-400">
            OR
          </Text>
          <View className="flex-1 border-t border-neutral-300 dark:border-neutral-700" />
        </View>

        <GoogleButton
          onPress={handleGoogleSignUp}
          loading={googleLoading}
          disabled={loading || googleLoading}
        />

        <Text className="text-xs text-center text-neutral-500 dark:text-neutral-400 mt-2">
          By continuing, you agree to our{" "}
          <Text
            onPress={handleTermsService}
            className="font-semibold text-neutral-900 dark:text-white underline"
          >
            Terms&Services
          </Text>
        </Text>
      </View>
    </AuthScaffold>
  );
}


