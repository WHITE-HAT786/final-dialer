// Bottom tab bar — the chrome strip from every DepthRoute App v2 frame.
//
// It sits on `bgElev` rather than the page background so it reads as chrome
// above the content, and it follows the active theme at runtime.
import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type Palette } from "@/src/theme";
import { useTheme } from "@/src/theme/ThemeContext";

const TABS: {
  name: string;
  label: string;
  icon: any;
  family: "ion" | "mc";
}[] = [
  { name: "dashboard", label: "Dashboard", icon: "home", family: "ion" },
  { name: "dialer", label: "Dialer", icon: "keypad", family: "ion" },
  { name: "contacts", label: "Contacts", icon: "person-add", family: "ion" },
  { name: "call-logs", label: "Call Logs", icon: "time-outline", family: "ion" },
  { name: "more", label: "More", icon: "ellipsis-horizontal", family: "ion" },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      {TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} />
      ))}
    </Tabs>
  );
}

function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}
      testID="bottom-tabbar"
    >
      {state.routes.map((route: any, index: number) => {
        const focused = state.index === index;
        const config = TABS.find((t) => t.name === route.name);
        if (!config) return null;
        const color = focused ? colors.primary : colors.textMuted;
        return (
          <TouchableOpacity
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            style={styles.tab}
            testID={`tab-${config.name}`}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : undefined}
          >
            {config.family === "mc" ? (
              <MaterialCommunityIcons name={config.icon as any} size={21} color={color} />
            ) : (
              <Ionicons name={config.icon as any} size={21} color={color} />
            )}
            <Text style={[styles.tabLabel, { color }]}>{config.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    bar: {
      flexDirection: "row",
      backgroundColor: c.bgElev,
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingTop: 8,
    },
    tab: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      paddingVertical: 3,
    },
    tabLabel: { fontSize: 10.5, fontWeight: "600" },
  });
}
