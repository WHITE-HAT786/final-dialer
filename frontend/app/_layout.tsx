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
import { ThemeProvider, useTheme } from "@/src/theme";

LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync();

/** Inside ThemeProvider, so chrome colours follow the active palette. */
function Shell() {
  const c = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar
        barStyle={c.mode === "dark" ? "light-content" : "dark-content"}
        backgroundColor={c.bg}
      />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}
      />
      <IncomingCallOverlay />
    </View>
  );
}

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <SipEngineProvider>
              <Shell />
            </SipEngineProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
