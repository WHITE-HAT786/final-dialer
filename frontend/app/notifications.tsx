import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "@/src/components/Screen";
import { colors } from "@/src/theme";
import { apiGet } from "@/src/api";
import { useApiData } from "@/src/hooks/useApiData";
import { LoadingBlock, ErrorBlock, EmptyBlock } from "@/src/components/DataStates";
import { relTime } from "@/src/utils/format";

// Real shape of GET /backend/api/app/notifications.
type Notification = {
  id: number;
  type: string | null;
  title: string | null;
  message: string | null;
  is_read: boolean;
  created_at: string | null;
};
type NotificationsResponse = { items: Notification[]; unread: number };

const TABS = ["All", "Unread"];

function iconFor(type?: string | null): { name: keyof typeof Ionicons.glyphMap; color: string } {
  switch ((type || "").toLowerCase()) {
    case "billing": return { name: "card", color: colors.yellow };
    case "security": return { name: "shield-checkmark", color: colors.green };
    case "account": return { name: "person-circle", color: colors.primary };
    case "call": return { name: "call", color: colors.primary };
    case "voicemail": return { name: "mic", color: colors.purple };
    case "system": return { name: "cog", color: colors.textMuted };
    default: return { name: "notifications", color: colors.primary };
  }
}

export default function Notifications() {
  const { data, loading, error, refresh, refreshing } = useApiData<NotificationsResponse>(() => apiGet("/notifications"));
  const [active, setActive] = useState("All");

  const items = useMemo(() => {
    const list = data?.items ?? [];
    return active === "Unread" ? list.filter((n) => !n.is_read) : list;
  }, [data, active]);

  return (
    <Screen title="Notifications" activeKey="notifications" showSip={false} showBell={false} onRefresh={refresh} refreshing={refreshing}>
      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={error} onRetry={refresh} />
      ) : (data?.items.length ?? 0) === 0 ? (
        <EmptyBlock icon="notifications-off-outline" title="No notifications" subtitle="Account alerts and updates will show up here." />
      ) : (
        <>
          <View style={styles.tabsRow}>
            {TABS.map((t) => (
              <TouchableOpacity key={t} onPress={() => setActive(t)} style={{ paddingBottom: 6, marginRight: 20 }}>
                <Text style={[styles.tabLabel, active === t && { color: colors.primary, fontWeight: "700" }]}>
                  {t}{t === "Unread" && data ? ` (${data.unread})` : ""}
                </Text>
                {active === t && <View style={styles.underline} />}
              </TouchableOpacity>
            ))}
          </View>

          {items.length === 0 ? (
            <EmptyBlock icon="checkmark-done-outline" title="You're all caught up" subtitle="No unread notifications." />
          ) : (
            items.map((n) => {
              const ic = iconFor(n.type);
              return (
                <View key={n.id} style={styles.row} testID={`notif-${n.id}`}>
                  <View style={[styles.icon, { backgroundColor: ic.color + "22" }]}>
                    <Ionicons name={ic.name} size={18} color={ic.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>{n.title || "Notification"}</Text>
                    {n.message ? <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{n.message}</Text> : null}
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 6 }}>
                    <Text style={{ color: n.is_read ? colors.textMuted : "#fff", fontSize: 11 }}>{relTime(n.created_at)}</Text>
                    <View style={[styles.dot, { backgroundColor: n.is_read ? colors.textDim : colors.primary }]} />
                  </View>
                </View>
              );
            })
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabsRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border, marginTop: 4, paddingTop: 6 },
  tabLabel: { color: colors.textMuted, fontSize: 14 },
  underline: { height: 2, backgroundColor: colors.primary, borderRadius: 1, marginTop: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, backgroundColor: colors.card, borderRadius: 12, marginTop: 10, borderWidth: 1, borderColor: colors.border },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
