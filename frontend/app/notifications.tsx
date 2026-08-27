import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Screen from "@/src/components/Screen";
import { useTheme } from "@/src/theme/ThemeContext";
import { makeThemedStyles } from "@/src/theme/useThemedStyles";
import { apiGet } from "@/src/api";

const TABS = ["All", "Unread", "System", "Account", "Billing", "Security"];

const MC_ICONS = ["voicemail", "shield-check", "cog", "card-plus", "call-missed"];

export default function Notifications() {
  const { colors } = useTheme();
  const styles = useStyles();
  const [data, setData] = useState<any>(null);
  const [active, setActive] = useState("All");
  useEffect(() => { apiGet("/notifications").then(setData); }, []);

  const items = data ? data.items.filter((n: any) => active === "All" ? true : active === "Unread" ? n.unread : n.category === active) : [];

  return (
    <Screen title="Notifications" activeKey="notifications" showSip={false} showBell={false}
      right={<TouchableOpacity><Ionicons name="settings-outline" size={22} color="#fff" /></TouchableOpacity>}
    >
      {!data ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingVertical: 6 }}>
            {TABS.map(t => (
              <TouchableOpacity key={t} onPress={() => setActive(t)} style={{ paddingBottom: 6 }}>
                <Text style={[styles.tabLabel, active === t && { color: colors.primary, fontWeight: "700" }]}>{t}</Text>
                {active === t && <View style={styles.underline} />}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.banner}>
            <View style={[styles.bannerIcon, { backgroundColor: colors.primaryDim }]}>
              <Ionicons name="notifications" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>Stay updated!</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>Here you will see all the important updates and alerts.</Text>
            </View>
            <TouchableOpacity style={styles.filter}>
              <Ionicons name="funnel-outline" size={14} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>Filter</Text>
              <Ionicons name="chevron-down" size={12} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {items.map((n: any) => (
            <View key={n.id} style={styles.row} testID={`notif-${n.id}`}>
              <View style={[styles.icon, { backgroundColor: n.color + "22" }]}>
                {MC_ICONS.includes(n.icon) ? (
                  <MaterialCommunityIcons name={n.icon} size={18} color={n.color} />
                ) : (
                  <Ionicons name={n.icon as any} size={18} color={n.color} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: "700", fontSize: 14 }}>{n.title}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{n.body}</Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 6 }}>
                <Text style={{ color: n.unread ? "#fff" : colors.textMuted, fontSize: 11 }}>{n.time}</Text>
                <View style={[styles.dot, { backgroundColor: n.unread ? colors.primary : colors.textDim }]} />
              </View>
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}

const useStyles = makeThemedStyles((colors) => StyleSheet.create({
  tabLabel: { color: colors.textMuted, fontSize: 14 },
  underline: { height: 2, backgroundColor: colors.primary, borderRadius: 1, marginTop: 6 },
  banner: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, backgroundColor: colors.card, borderRadius: 14, marginTop: 12, borderWidth: 1, borderColor: colors.border },
  bannerIcon: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  filter: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.bgAlt, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, backgroundColor: colors.card, borderRadius: 12, marginTop: 8, borderWidth: 1, borderColor: colors.border },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  dot: { width: 8, height: 8, borderRadius: 4 },
}));
