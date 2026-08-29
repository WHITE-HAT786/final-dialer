import React, { useState } from "react";
import { View, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { useTheme } from "@/src/theme";

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
  brand?: boolean;
  /** Drop the header hairline when the screen draws its own tab strip. */
  hairline?: boolean;
  contentPadding?: boolean;
  tabBarSpace?: number;
  /** Rendered flush under the header, outside the scroll area. */
  belowHeader?: React.ReactNode;
  /** Pinned above the content — a FAB, a toast. Does not scroll. */
  overlay?: React.ReactNode;
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
  brand = false,
  hairline = true,
  contentPadding = true,
  tabBarSpace = 100,
  belowHeader,
  overlay,
}: Props) {
  const [drawer, setDrawer] = useState(false);
  const c = useTheme();
  const insets = useSafeAreaInsets();

  const content = (
    <View
      style={
        contentPadding
          ? { paddingHorizontal: 16, paddingBottom: tabBarSpace + insets.bottom }
          : { paddingBottom: tabBarSpace + insets.bottom }
      }
    >
      {children}
    </View>
  );

  return (
    <View style={[styles.wrap, { backgroundColor: c.bg }]}>
      <Header
        title={title}
        onMenu={() => setDrawer(true)}
        showBack={showBack}
        showMenu={showMenu}
        right={right}
        showBell={showBell}
        showSip={showSip}
        brand={brand}
        hairline={hairline}
      />
      {belowHeader}
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />
            ) : undefined
          }
        >
          {content}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{content}</View>
      )}
      {overlay}
      <Sidebar visible={drawer} onClose={() => setDrawer(false)} active={activeKey} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
});
