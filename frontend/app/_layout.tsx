import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox, StatusBar, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { AuthProvider } from "@/src/AuthContext";
import { SipEngineProvider } from "@/src/sip/SipEngineContext";
import SipAuthBridge from "@/src/sip/SipAuthBridge";
import IncomingCallOverlay from "@/src/components/IncomingCallOverlay";
import { ThemeProvider, useTheme } from "@/src/theme/ThemeContext";

LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync();

/** The app shell, inside ThemeProvider so chrome follows the active theme. */
function Shell() {
  const { colors, isDark } = useTheme();
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <AuthProvider>
          <SipEngineProvider>
            <StatusBar
              barStyle={isDark ? "light-content" : "dark-content"}
              backgroundColor={colors.bg}
            />
            <SipAuthBridge />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bg },
              }}
            />
            <IncomingCallOverlay />
          </SipEngineProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
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
    <ThemeProvider>
      <Shell />
    </ThemeProvider>
  );
}
