import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox, StatusBar, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { AuthProvider } from "@/src/AuthContext";
import { SipEngineProvider } from "@/src/sip/SipEngineContext";
import IncomingCallOverlay from "@/src/components/IncomingCallOverlay";

LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#050B1A" }}>
      <SafeAreaProvider>
        <AuthProvider>
          <SipEngineProvider>
            <StatusBar barStyle="light-content" backgroundColor="#050B1A" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#050B1A" } }} />
            <IncomingCallOverlay />
          </SipEngineProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
