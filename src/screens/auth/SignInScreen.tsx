import { useState, useRef } from "react";
import { Link, router } from "expo-router";
import { Text, View, TextInput, Alert } from "react-native";
import { supabase } from "@/lib/supabase";
import { signInWithGoogle } from "@/lib/google-auth";
import { AuthScaffold } from "./components/AuthScaffold";
import { FormField } from "./components/FormField";
import { PrimaryButton } from "./components/PrimaryButton";
import { GoogleButton } from "./components/GoogleButton";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const handleSignIn = async () => {
    setError(null);
    if (!email || !password) {
      setError("Please provide both email and password.");
      return;
    }

    setLoading(true);
    const { error: authError, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    const hasName = Boolean(data.user?.user_metadata?.full_name);
    if (hasName) {
      router.replace("/(auth)/(tabs)");
    } else {
      router.replace("/(public)/complete-profile");
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      // Navigation will be handled by auth state change or auth-callback screen
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      setError(err.message || "Failed to sign in with Google");
      setGoogleLoading(false);
    }
  };

  return (
    <AuthScaffold
      title="Welcome back"
      subtitle="Sign in to BudgetWise to manage your finances."
      footer={
        <Text className="text-base text-neutral-500 dark:text-neutral-400">
          New here?{" "}
          <Link
            href="/(public)/sign-up"
            className="font-semibold text-neutral-900 dark:text-white"
          >
            Create an account
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
          returnKeyType="go"
          onSubmitEditing={handleSignIn}
          onChangeText={setPassword}
          placeholder="••••••••"
        />

        <View className="items-end">
          <Link
            href="/(public)/forgot-password"
            className="text-sm font-semibold text-neutral-900 dark:text-white"
          >
            Forgot password?
          </Link>
        </View>

        <PrimaryButton
          label={loading ? "Signing in..." : "Sign in"}
          loading={loading}
          onPress={handleSignIn}
        />

        <View className="flex-row items-center gap-3">
          <View className="flex-1 border-t border-neutral-300 dark:border-neutral-700" />
          <Text className="text-sm text-neutral-500 dark:text-neutral-400">
            OR
          </Text>
          <View className="flex-1 border-t border-neutral-300 dark:border-neutral-700" />
        </View>

        <GoogleButton
          onPress={handleGoogleSignIn}
          loading={googleLoading}
          disabled={loading || googleLoading}
        />
      </View>
    </AuthScaffold>
  );
}


