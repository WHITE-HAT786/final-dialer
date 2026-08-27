import React, { useState } from "react";
import { View, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { useTheme } from "@/src/theme/ThemeContext";

type Props = {
  title: string;
  activeKey?: string;
  children: React.ReactNode;
  showBack?: boolean;
  showMenu?: boolean;
  scroll?: boolean;
  onRefresh?: () => Promise<void> | void;
  refreshing?: boolean;
  right?: React.ReactNode;
  showBell?: boolean;
  showSip?: boolean;
  contentPadding?: boolean;
  tabBarSpace?: number;
};

export default function Screen({
  title,
  activeKey,
  children,
  showBack,
  showMenu = true,
  scroll = true,
  onRefresh,
  refreshing = false,
  right,
  showBell = true,
  showSip = true,
  contentPadding = true,
  tabBarSpace = 100,
}: Props) {
  const [drawer, setDrawer] = useState(false);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const content = (
    <View style={contentPadding ? { paddingHorizontal: 16, paddingBottom: tabBarSpace + insets.bottom } : { paddingBottom: tabBarSpace + insets.bottom }}>
      {children}
    </View>
  );

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
      <Header
        title={title}
        onMenu={() => setDrawer(true)}
        showBack={showBack}
        showMenu={showMenu}
        right={right}
        showBell={showBell}
        showSip={showSip}
      />
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            ) : undefined
          }
        >
          {content}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{content}</View>
      )}
      <Sidebar visible={drawer} onClose={() => setDrawer(false)} active={activeKey} />
    </View>
  );
}

// Only the layout is static here; the page colour follows the active theme.
const styles = StyleSheet.create({
  wrap: { flex: 1 },
});
