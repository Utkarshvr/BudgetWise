import { useState, useRef } from "react";
import { Link, router } from "expo-router";
import { Text, View, TextInput, Alert } from "react-native";
import { supabase } from "@/lib/supabase";
import { getAuthRedirectUrl } from "@/lib/auth-redirect";
import { signInWithGoogle } from "@/lib/google-auth";
import { AuthScaffold } from "./components/AuthScaffold";
import { FormField } from "./components/FormField";
import { PrimaryButton } from "./components/PrimaryButton";
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
      </View>
    </AuthScaffold>
  );
}


