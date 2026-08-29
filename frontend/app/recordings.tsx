import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Screen from "@/src/components/Screen";
import Waveform from "@/src/components/Waveform";
import { cardShadow, useTheme, useThemedStyles, type Palette } from "@/src/theme";
import { apiGet } from "@/src/api";

const TABS = [
  { key: "all", label: "All Recordings", field: "all" },
  { key: "call", label: "Call Recordings", field: "calls" },
  { key: "vm", label: "Voicemail Recordings", field: "voicemails" },
];

export default function Recordings() {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [data, setData] = useState<any>(null);
  const [active, setActive] = useState("all");
  useEffect(() => {
    apiGet("/recordings").then(setData).catch(() => {});
  }, []);

  const items = data
    ? data.items.filter((r: any) =>
        active === "all" ? true : active === "vm" ? r.type === "Voicemail" : r.type !== "Voicemail",
      )
    : [];

  const stats = data
    ? [
        { label: "Total", value: data.stats.all, fg: c.primary, bg: c.primarySoft, icon: "waveform", family: "mc" },
        { label: "Call", value: data.stats.calls, fg: c.success, bg: c.successSoft, icon: "call-outline", family: "ion" },
        { label: "Voicemail", value: data.stats.voicemails, fg: c.purple, bg: c.purpleSoft, icon: "voicemail", family: "mc" },
        { label: "Duration", value: data.stats.total_duration, fg: c.warn, bg: c.warnSoft, icon: "time-outline", family: "ion" },
      ]
    : [];

  const tabStrip = (
    <View style={styles.tabStrip}>
      {TABS.map((t) => {
        const on = active === t.key;
        return (
          <TouchableOpacity key={t.key} style={styles.tab} onPress={() => setActive(t.key)} testID={`rec-tab-${t.key}`}>
            <Text style={[styles.tabLabel, on && styles.tabLabelActive]} numberOfLines={1}>
              {t.label}
            </Text>
            {data && (
              <View style={styles.tabCount}>
                <Text style={styles.tabCountText}>{data.stats[t.field]}</Text>
              </View>
            )}
            <View style={[styles.tabUnderline, on && styles.tabUnderlineActive]} />
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <Screen
      title="Recordings"
      activeKey="recordings"
      showBack
      showSip={false}
      showBell={false}
      hairline={false}
      belowHeader={tabStrip}
      right={
        <View style={styles.headerActions}>
          <TouchableOpacity testID="rec-search">
            <Ionicons name="search" size={20} color={c.text} />
          </TouchableOpacity>
          <TouchableOpacity testID="rec-overflow">
            <Ionicons name="ellipsis-vertical" size={18} color={c.text} />
          </TouchableOpacity>
        </View>
      }
    >
      {!data ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* Stat strip */}
          <View style={styles.statStrip}>
            {stats.map((s) => (
              <View key={s.label} style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: s.bg }]}>
                  {s.family === "mc" ? (
                    <MaterialCommunityIcons name={s.icon as any} size={17} color={s.fg} />
                  ) : (
                    <Ionicons name={s.icon as any} size={17} color={s.fg} />
                  )}
                </View>
                <Text style={styles.statLabel}>{s.label}</Text>
                <Text style={styles.statValue}>{s.value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.sortRow}>
            <Text style={styles.sortText}>
              Sort by: <Text style={styles.sortValue}>Newest ▾</Text>
            </Text>
            <TouchableOpacity style={styles.filterRow} testID="rec-filter">
              <Ionicons name="funnel-outline" size={13} color={c.muted} />
              <Text style={styles.sortText}>Filter</Text>
            </TouchableOpacity>
          </View>

          {items.map((r: any) => {
            const isVm = r.type === "Voicemail";
            const pillFg = isVm ? c.purple : c.success;
            const pillBg = isVm ? c.purpleSoft : c.successSoft;
            return (
              <View key={r.id} style={styles.card} testID={`rec-${r.id}`}>
                <View style={styles.cardHead}>
                  <View style={[styles.avatar, { backgroundColor: (r.color || c.primary) + "26" }]}>
                    {isVm ? (
                      <MaterialCommunityIcons name="voicemail" size={19} color={r.color || c.purple} />
                    ) : (
                      <Text style={[styles.avatarText, { color: r.color || c.primary }]}>{r.name[0]}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.name} numberOfLines={1}>{r.name}</Text>
                      <View style={[styles.typePill, { backgroundColor: pillBg }]}>
                        <Text style={[styles.typePillText, { color: pillFg }]}>{r.type}</Text>
                      </View>
                    </View>
                    {!!r.ext && (
                      <Text style={styles.metaLine} numberOfLines={1}>
                        {r.ext} {r.direction}
                      </Text>
                    )}
                    <View style={styles.metaRow}>
                      <Text style={styles.meta}>{r.date}</Text>
                      <Text style={styles.meta}>{r.duration}</Text>
                    </View>
                  </View>
                  <TouchableOpacity testID={`rec-download-${r.id}`}>
                    <Ionicons name="download-outline" size={17} color={c.muted} />
                  </TouchableOpacity>
                  <TouchableOpacity testID={`rec-more-${r.id}`}>
                    <Ionicons name="ellipsis-vertical" size={16} color={c.muted} />
                  </TouchableOpacity>
                </View>

                <View style={styles.waveRow}>
                  <TouchableOpacity style={styles.playBtn} testID={`rec-play-${r.id}`}>
                    <Ionicons name="play" size={12} color={c.primary} />
                  </TouchableOpacity>
                  <Text style={styles.waveTime}>00:00</Text>
                  <Waveform tone={r.wave || c.primary} height={24} />
                  <Text style={styles.waveTime}>{r.duration}</Text>
                </View>
              </View>
            );
          })}

          <View style={styles.storageCard}>
            <View style={[styles.storageIcon, { backgroundColor: c.primarySoft }]}>
              <Ionicons name="mic-outline" size={18} color={c.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.storageTitle}>Recording Storage</Text>
              <Text style={styles.storageSub}>
                {data.storage.used_gb} GB of {data.storage.total_gb} GB used
              </Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${data.storage.percent}%`, backgroundColor: c.primary }]} />
              </View>
            </View>
            <Text style={[styles.storagePct, { color: c.primary }]}>{data.storage.percent}%</Text>
          </View>
        </>
      )}
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },

    tabStrip: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: c.border },
    tab: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 12,
      paddingHorizontal: 4,
    },
    tabLabel: { color: c.muted, fontSize: 11.5, fontWeight: "500", flexShrink: 1, textAlign: "center" },
    tabLabelActive: { color: c.primary, fontWeight: "700" },
    tabCount: {
      minWidth: 22,
      height: 18,
      paddingHorizontal: 6,
      borderRadius: 9,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
    },
    tabCountText: { color: c.muted, fontSize: 10, fontWeight: "700" },
    tabUnderline: {
      position: "absolute",
      bottom: -1,
      left: 8,
      right: 8,
      height: 2,
      borderRadius: 1,
      backgroundColor: "transparent",
    },
    tabUnderlineActive: { backgroundColor: c.primary },

    statStrip: {
      flexDirection: "row",
      marginTop: 12,
      padding: 12,
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      ...cardShadow(c),
    },
    statItem: { flex: 1, alignItems: "center", gap: 5 },
    statIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    statLabel: { color: c.muted, fontSize: 10, textAlign: "center", lineHeight: 13 },
    statValue: { color: c.text, fontSize: 15, fontWeight: "700" },

    sortRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14, marginBottom: 8 },
    sortText: { color: c.muted, fontSize: 12.5 },
    sortValue: { color: c.primary, fontWeight: "700" },
    filterRow: { flexDirection: "row", alignItems: "center", gap: 5 },

    card: {
      marginBottom: 10,
      padding: 12,
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      ...cardShadow(c),
    },
    cardHead: { flexDirection: "row", alignItems: "center", gap: 12 },
    avatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 15, fontWeight: "700" },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    name: { color: c.text, fontSize: 13.5, fontWeight: "700", flexShrink: 1 },
    typePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
    typePillText: { fontSize: 10, fontWeight: "700" },
    metaLine: { color: c.muted, fontSize: 11.5, marginTop: 3 },
    metaRow: { flexDirection: "row", gap: 12, marginTop: 4 },
    meta: { color: c.muted, fontSize: 11 },

    waveRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
    playBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: c.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    waveTime: { color: c.muted, fontSize: 10 },

    storageCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginTop: 2,
      padding: 12,
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      ...cardShadow(c),
    },
    storageIcon: { width: 42, height: 42, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    storageTitle: { color: c.text, fontSize: 13.5, fontWeight: "700" },
    storageSub: { color: c.muted, fontSize: 11.5, marginTop: 2 },
    track: { height: 4, borderRadius: 2, backgroundColor: c.border, marginTop: 7, overflow: "hidden" },
    fill: { height: 4, borderRadius: 2 },
    storagePct: { fontSize: 12.5, fontWeight: "700" },
  });
