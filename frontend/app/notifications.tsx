import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Screen from "@/src/components/Screen";
import { cardShadow, useTheme, useThemedStyles, type Palette } from "@/src/theme";
import { apiGet } from "@/src/api";

const TABS = ["All", "Unread", "System", "Account", "Billing", "Security"];

const MC_ICONS = ["voicemail", "shield-check", "cog", "card-plus", "call-missed"];

export default function Notifications() {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [data, setData] = useState<any>(null);
  const [active, setActive] = useState("All");
  useEffect(() => {
    apiGet("/notifications").then(setData).catch(() => {});
  }, []);

  const items = data
    ? data.items.filter((n: any) =>
        active === "All" ? true : active === "Unread" ? n.unread : n.category === active,
      )
    : [];

  const tabStrip = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabStrip}
    >
      {TABS.map((t) => {
        const on = active === t;
        return (
          <TouchableOpacity key={t} style={styles.tab} onPress={() => setActive(t)} testID={`notif-tab-${t}`}>
            <Text style={[styles.tabLabel, on && styles.tabLabelActive]}>{t}</Text>
            <View style={[styles.tabUnderline, on && styles.tabUnderlineActive]} />
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  return (
    <Screen
      title="Notifications"
      activeKey="notifications"
      showSip={false}
      showBell={false}
      hairline={false}
      belowHeader={tabStrip}
      right={
        <TouchableOpacity testID="notif-settings">
          <Ionicons name="settings-outline" size={20} color={c.text} />
        </TouchableOpacity>
      }
    >
      {!data ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          <View style={styles.banner}>
            <View style={styles.bannerIcon}>
              <Ionicons name="notifications-outline" size={20} color={c.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.bannerTitle}>Stay updated</Text>
              <Text style={styles.bannerBody}>Important alerts and account updates land here.</Text>
            </View>
            <TouchableOpacity style={styles.filterChip} testID="notif-filter">
              <Ionicons name="funnel-outline" size={12} color={c.muted} />
              <Text style={styles.filterText}>Filter</Text>
            </TouchableOpacity>
          </View>

          {items.map((n: any) => (
            <View
              key={n.id}
              style={[styles.row, { borderColor: n.unread ? c.borderStrong : c.border }]}
              testID={`notif-${n.id}`}
            >
              <View style={[styles.rowIcon, { backgroundColor: (n.color || c.primary) + "26" }]}>
                {MC_ICONS.includes(n.icon) ? (
                  <MaterialCommunityIcons name={n.icon} size={18} color={n.color || c.primary} />
                ) : (
                  <Ionicons name={n.icon as any} size={18} color={n.color || c.primary} />
                )}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.rowTitle}>{n.title}</Text>
                <Text style={styles.rowBody}>{n.body}</Text>
              </View>
              <View style={styles.rowMeta}>
                <Text style={[styles.rowTime, { color: n.unread ? c.text : c.muted }]}>{n.time}</Text>
                <View style={[styles.dot, { backgroundColor: n.unread ? c.primary : c.dim }]} />
              </View>
            </View>
          ))}

          {items.length === 0 && <Text style={styles.empty}>Nothing here right now.</Text>}
        </>
      )}
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    tabStrip: { gap: 16, paddingHorizontal: 16, paddingTop: 6 },
    tab: { paddingBottom: 6 },
    tabLabel: { color: c.muted, fontSize: 13.5, fontWeight: "500" },
    tabLabelActive: { color: c.primary, fontWeight: "700" },
    tabUnderline: { height: 2, borderRadius: 1, marginTop: 6, backgroundColor: "transparent" },
    tabUnderlineActive: { backgroundColor: c.primary },

    banner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginTop: 12,
      padding: 12,
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      ...cardShadow(c),
    },
    bannerIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    bannerTitle: { color: c.text, fontSize: 14.5, fontWeight: "700" },
    bannerBody: { color: c.muted, fontSize: 11.5, marginTop: 2, lineHeight: 16 },
    filterChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: 9,
      borderRadius: 8,
      backgroundColor: c.bgElev,
      borderWidth: 1,
      borderColor: c.border,
    },
    filterText: { color: c.muted, fontSize: 11.5 },

    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginTop: 8,
      padding: 12,
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      ...cardShadow(c),
    },
    rowIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
    rowTitle: { color: c.text, fontSize: 13.5, fontWeight: "700" },
    rowBody: { color: c.muted, fontSize: 11.5, marginTop: 2, lineHeight: 16 },
    rowMeta: { alignItems: "flex-end", gap: 6 },
    rowTime: { fontSize: 11 },
    dot: { width: 8, height: 8, borderRadius: 4 },

    empty: { color: c.dim, fontSize: 13, textAlign: "center", marginTop: 40 },
  });
