import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Screen from "@/src/components/Screen";
import Waveform from "@/src/components/Waveform";
import { cardShadow, useTheme, useThemedStyles, type Palette } from "@/src/theme";
import { apiGet } from "@/src/api";

const TABS = ["Voice Messages", "Greetings"];

export default function Voicemails() {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [data, setData] = useState<any>(null);
  const [active, setActive] = useState("Voice Messages");
  useEffect(() => {
    apiGet("/voicemails").then(setData).catch(() => {});
  }, []);

  const stats = data
    ? [
        { label: "All Messages", value: data.stats.all, fg: c.purple, bg: c.purpleSoft, icon: "voicemail", family: "mc" },
        { label: "New Messages", value: data.stats.new, fg: c.primary, bg: c.primarySoft, icon: "headset-outline", family: "ion" },
        { label: "Saved", value: data.stats.saved, fg: c.success, bg: c.successSoft, icon: "mic-outline", family: "ion" },
        { label: "Deleted", value: data.stats.deleted, fg: c.danger, bg: c.dangerSoft, icon: "trash-outline", family: "ion" },
      ]
    : [];

  const tabStrip = (
    <View style={styles.tabStrip}>
      {TABS.map((t) => {
        const on = active === t;
        return (
          <TouchableOpacity key={t} style={styles.tab} onPress={() => setActive(t)} testID={`vm-tab-${t}`}>
            <Text style={[styles.tabLabel, on && styles.tabLabelActive]}>{t}</Text>
            {t === "Voice Messages" && data && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{data.stats.new}</Text>
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
      title="Voicemails"
      activeKey="voicemails"
      showBack
      showSip={false}
      showBell={false}
      hairline={false}
      belowHeader={tabStrip}
      right={
        <View style={styles.headerActions}>
          <TouchableOpacity testID="vm-search">
            <Ionicons name="search" size={20} color={c.text} />
          </TouchableOpacity>
          <TouchableOpacity testID="vm-overflow">
            <Ionicons name="ellipsis-vertical" size={18} color={c.text} />
          </TouchableOpacity>
        </View>
      }
    >
      {!data ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />
      ) : active === "Greetings" ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="account-voice" size={28} color={c.dim} />
          <Text style={styles.emptyText}>No greetings recorded yet.</Text>
        </View>
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

          {/* Sort / filter */}
          <View style={styles.sortRow}>
            <Text style={styles.sortText}>
              Sort by: <Text style={styles.sortValue}>Newest ▾</Text>
            </Text>
            <TouchableOpacity style={styles.filterRow} testID="vm-filter">
              <Ionicons name="funnel-outline" size={13} color={c.muted} />
              <Text style={styles.sortText}>Filter</Text>
            </TouchableOpacity>
          </View>

          {data.items.map((v: any) => (
            <View key={v.id} style={styles.card} testID={`vm-${v.id}`}>
              <View style={styles.cardHead}>
                <View style={[styles.avatar, { backgroundColor: (v.color || c.purple) + "26" }]}>
                  <Text style={[styles.avatarText, { color: v.color || c.purple }]}>{v.name[0]}</Text>
                  {v.new && <View style={styles.newDot} />}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>{v.name}</Text>
                    <Text style={styles.ext}>{v.ext}</Text>
                    {v.new && (
                      <View style={styles.newPill}>
                        <Text style={styles.newPillText}>New</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.meta}>{v.date}</Text>
                    <Text style={styles.meta}>{v.duration}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.playBtn} testID={`vm-play-${v.id}`}>
                  <Ionicons name="play" size={14} color={c.primary} />
                </TouchableOpacity>
                {!v.new && (
                  <TouchableOpacity testID={`vm-more-${v.id}`}>
                    <Ionicons name="ellipsis-vertical" size={16} color={c.muted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* The message being played expands with a scrubber and controls */}
              {v.new && (
                <>
                  <View style={styles.waveRow}>
                    <Text style={styles.waveTime}>00:14</Text>
                    <Waveform tone={c.purple} />
                    <Text style={styles.waveTime}>{v.duration}</Text>
                  </View>
                  <View style={styles.actions}>
                    {[
                      { icon: "volume-high-outline", label: "Speaker", color: c.text },
                      { icon: "call-outline", label: "Call Back", color: c.text },
                      { icon: "download-outline", label: "Save", color: c.text },
                      { icon: "trash-outline", label: "Delete", color: c.danger },
                    ].map((a) => (
                      <TouchableOpacity key={a.label} style={styles.action} testID={`vm-action-${a.label}`}>
                        <Ionicons name={a.icon as any} size={19} color={a.color} />
                        <Text style={[styles.actionLabel, { color: a.color }]}>{a.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </View>
          ))}

          {/* Storage */}
          <View style={styles.storageCard}>
            <View style={[styles.storageIcon, { backgroundColor: c.purpleSoft }]}>
              <MaterialCommunityIcons name="voicemail" size={18} color={c.purple} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.storageTitle}>Voicemail Storage</Text>
              <Text style={styles.storageSub}>
                {data.storage.used_mb} MB of {data.storage.total_mb} MB used
              </Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${data.storage.percent}%`, backgroundColor: c.purple }]} />
              </View>
            </View>
            <Text style={[styles.storagePct, { color: c.purple }]}>{data.storage.percent}%</Text>
          </View>
        </>
      )}
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },

    tabStrip: { flexDirection: "row", paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: c.border },
    tab: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, paddingHorizontal: 14 },
    tabLabel: { color: c.muted, fontSize: 13.5, fontWeight: "500" },
    tabLabelActive: { color: c.primary, fontWeight: "700" },
    tabBadge: {
      minWidth: 20,
      height: 20,
      paddingHorizontal: 6,
      borderRadius: 10,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    tabBadgeText: { color: c.onPrimary, fontSize: 10, fontWeight: "700" },
    tabUnderline: {
      position: "absolute",
      bottom: -1,
      left: 14,
      right: 14,
      height: 2,
      borderRadius: 1,
      backgroundColor: "transparent",
    },
    tabUnderlineActive: { backgroundColor: c.primary },

    empty: { alignItems: "center", gap: 10, marginTop: 60 },
    emptyText: { color: c.dim, fontSize: 13 },

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
    statValue: { color: c.text, fontSize: 18, fontWeight: "700" },

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
    avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 16, fontWeight: "700" },
    newDot: {
      position: "absolute",
      right: -2,
      top: -2,
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: c.primary,
      borderWidth: 2,
      borderColor: c.card,
    },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 7 },
    name: { color: c.text, fontSize: 14.5, fontWeight: "700", flexShrink: 1 },
    ext: { color: c.muted, fontSize: 12.5 },
    newPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: c.purpleSoft },
    newPillText: { color: c.purple, fontSize: 10, fontWeight: "700" },
    metaRow: { flexDirection: "row", gap: 14, marginTop: 5 },
    meta: { color: c.muted, fontSize: 11.5 },
    playBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: c.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },

    waveRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
    waveTime: { color: c.muted, fontSize: 10.5 },
    actions: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    action: { alignItems: "center", gap: 5 },
    actionLabel: { fontSize: 10.5 },

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
