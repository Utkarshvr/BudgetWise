import { useEffect } from "react";
import { Stack } from "expo-router";
import * as Linking from "expo-linking";
import { processAuthCallback } from "@/lib/auth-callback-handler";
import "../global.css";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

export default function RootLayout() {
  useEffect(() => {
    const handleAuthCallback = async (url: string, source: string) => {
      try {
        await processAuthCallback(url, source);
      } catch (err) {
        console.error('🔗 [DEEP LINK] Error handling auth callback:', err);
      }
    };

    // Handle initial URL (when app is opened from a link)
    const handleInitialURL = async () => {
      console.log('🔗 [DEEP LINK] Checking for initial URL...');
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        console.log('🔗 [DEEP LINK] Found initial URL');
        await handleAuthCallback(initialUrl, 'initial');
      } else {
        console.log('🔗 [DEEP LINK] No initial URL found');
      }
    };

    handleInitialURL();

    // Handle deep links when app is already running
    console.log('🔗 [DEEP LINK] Setting up deep link listener...');
    const subscription = Linking.addEventListener('url', (event) => {
      console.log('🔗 [DEEP LINK] Deep link event received');
      handleAuthCallback(event.url, 'event');
    });

    return () => {
      console.log('🔗 [DEEP LINK] Cleaning up deep link listener');
      subscription.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
