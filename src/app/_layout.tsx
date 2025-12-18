import { useEffect } from "react";
import { Stack } from "expo-router";
import * as Linking from "expo-linking";
import { processAuthCallback } from "@/lib";
import "../global.css";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { useFonts } from "expo-font";
import { Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold } from "@expo-google-fonts/montserrat";
import * as SplashScreen from "expo-splash-screen";

// Prevent the splash screen from auto-hiding before asset loading is complete
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  useEffect(() => {
    if (fontError) {
      console.warn('Font loading error:', fontError);
    }
    
    async function hideSplashScreen() {
      if (fontsLoaded || fontError) {
        try {
          await SplashScreen.hideAsync();
        } catch (e) {
          console.warn('Failed to hide splash screen:', e);
        }
      }
    }
    hideSplashScreen();
    
    // Fallback: hide splash screen after 3 seconds even if fonts haven't loaded
    // This prevents getting stuck on splash screen (common in Expo Go)
    const timeout = setTimeout(async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        console.warn('Failed to hide splash screen (timeout):', e);
      }
    }, 3000);
    
    return () => clearTimeout(timeout);
  }, [fontsLoaded, fontError]);

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

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
