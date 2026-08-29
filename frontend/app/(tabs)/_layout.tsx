import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, useThemedStyles, type Palette } from "@/src/theme";

const TABS: { name: string; label: string; icon: any }[] = [
  { name: "dashboard", label: "Dashboard", icon: "home-outline" },
  { name: "dialer", label: "Dialer", icon: "keypad-outline" },
  { name: "contacts", label: "Contacts", icon: "person-add-outline" },
  { name: "call-logs", label: "Call Logs", icon: "time-outline" },
  { name: "more", label: "More", icon: "ellipsis-horizontal" },
];

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <CustomTabBar {...props} />}>
      {TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} />
      ))}
    </Tabs>
  );
}

function CustomTabBar({ state, navigation }: any) {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]} testID="bottom-tabbar">
      {state.routes.map((route: any, index: number) => {
        const focused = state.index === index;
        const config = TABS.find((t) => t.name === route.name);
        if (!config) return null;
        const color = focused ? c.primary : c.muted;
        return (
          <TouchableOpacity
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            style={styles.tab}
            testID={`tab-${config.name}`}
          >
            <Ionicons name={config.icon} size={21} color={color} />
            <Text style={[styles.tabLabel, { color }]}>{config.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    bar: {
      flexDirection: "row",
      backgroundColor: c.bgElev,
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingTop: 8,
    },
    tab: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 3 },
    tabLabel: { fontSize: 10.5, fontWeight: "600" },
  });
