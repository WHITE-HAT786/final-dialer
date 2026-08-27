import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Screen from "@/src/components/Screen";
import { useTheme } from "@/src/theme/ThemeContext";
import { makeThemedStyles } from "@/src/theme/useThemedStyles";


const TABS = [
  { key: "all", label: "All Recordings", field: "all" },
  { key: "call", label: "Call Recordings", field: "calls" },
  { key: "vm", label: "Voicemail Recordings", field: "voicemails" },
];

export default function Recordings() {
  const { colors } = useTheme();
  const styles = useStyles();
  const [data, setData] = useState<any>(null);
  const [active, setActive] = useState("all");
  // No customer-facing recordings endpoint exists on the WebDialer app API
  // (/backend/api/app/recordings.php -> 404; only an admin endpoint exists).
  // Render an honest unavailable state rather than inventing recordings.
  useEffect(() => { setData(null); }, []);

  return (
    <Screen title="Recordings" activeKey="recordings" showBack showSip={false} showBell={false}
      right={
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity><Ionicons name="search" size={22} color="#fff" /></TouchableOpacity>
          <TouchableOpacity><Ionicons name="ellipsis-vertical" size={22} color="#fff" /></TouchableOpacity>
        </View>
      }
    >
      {!data ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : (
        <>
          <View style={styles.tabsRow}>
            {TABS.map(t => (
              <TouchableOpacity key={t.key} style={styles.tab} onPress={() => setActive(t.key)}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={[styles.tabLabel, active === t.key && { color: colors.primary, fontWeight: "700" }]}>{t.label}</Text>
                  <View style={styles.pillBadge}><Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: "700" }}>{data.stats[t.field]}</Text></View>
                </View>
                {active === t.key && <View style={styles.underline} />}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.statsCard}>
            {[
              { icon: "waveform", family: "mc", color: colors.primary, label: "Total Recordings", value: data.stats.all },
              { icon: "call", family: "ion", color: colors.green, label: "Call Recordings", value: data.stats.calls },
              { icon: "voicemail", family: "mc", color: colors.purple, label: "Voicemail Recordings", value: data.stats.voicemails },
              { icon: "time-outline", family: "ion", color: colors.yellow, label: "Total Duration", value: data.stats.total_duration },
            ].map((s, i) => (
              <View key={i} style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: s.color + "22" }]}>
                  {s.family === "mc" ? <MaterialCommunityIcons name={s.icon as any} size={18} color={s.color} /> : <Ionicons name={s.icon as any} size={18} color={s.color} />}
                </View>
                <Text style={styles.statLabel}>{s.label}</Text>
                <Text style={styles.statValue}>{s.value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.sortRow}>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>Sort by: <Text style={{ color: colors.primary, fontWeight: "700" }}>Newest ▾</Text></Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="funnel-outline" size={14} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>Filter</Text>
            </View>
          </View>

          {data.items.map((r: any) => (
            <View key={r.id} style={styles.card}>
              <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                <View style={[styles.avatar, { backgroundColor: r.color + "30" }]}>
                  {r.type === "Voicemail" ? (
                    <MaterialCommunityIcons name="voicemail" size={20} color={r.color} />
                  ) : (
                    <Text style={{ color: r.color, fontWeight: "700", fontSize: 15 }}>{r.name[0]}</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <Text style={{ color: colors.text, fontWeight: "700", fontSize: 14 }}>{r.name}</Text>
                    <View style={[styles.typePill, { backgroundColor: r.type === "Voicemail" ? colors.purpleDim : colors.greenDim }]}>
                      <Text style={{ color: r.type === "Voicemail" ? colors.purple : colors.green, fontSize: 10, fontWeight: "700" }}>{r.type}</Text>
                    </View>
                  </View>
                  {r.ext && <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{r.ext} {r.direction}</Text>}
                  <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 11 }}>📅 {r.date}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11 }}>🕒 {r.duration}</Text>
                  </View>
                </View>
                <TouchableOpacity><Ionicons name="download-outline" size={18} color={colors.textMuted} /></TouchableOpacity>
                <TouchableOpacity><Ionicons name="ellipsis-vertical" size={16} color={colors.textMuted} /></TouchableOpacity>
              </View>
              <View style={styles.waveRow}>
                <TouchableOpacity style={styles.playBtn}><Ionicons name="play" size={14} color={colors.primary} /></TouchableOpacity>
                <Text style={styles.waveTime}>00:00</Text>
                <View style={styles.wave}>
                  {Array.from({ length: 40 }).map((_, i) => (
                    <View key={i} style={{ width: 2, height: Math.random() * 20 + 4, backgroundColor: i < 15 ? r.wave : colors.textDim, borderRadius: 1 }} />
                  ))}
                </View>
                <Text style={styles.waveTime}>{r.duration}</Text>
              </View>
            </View>
          ))}

          <View style={styles.storageCard}>
            <View style={[styles.miniIcon, { backgroundColor: colors.primaryDim }]}>
              <Ionicons name="mic" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: "700", fontSize: 14 }}>Recording Storage</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{data.storage.used_gb} GB of {data.storage.total_gb} GB used</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${data.storage.percent}%`, backgroundColor: colors.primary }]} />
              </View>
            </View>
            <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>{data.storage.percent}% Used</Text>
          </View>
        </>
      )}
    </Screen>
  );
}

const useStyles = makeThemedStyles((colors) => StyleSheet.create({
  tabsRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border, marginTop: 4 },
  tab: { paddingVertical: 12, paddingHorizontal: 8, position: "relative", flex: 1, alignItems: "center" },
  tabLabel: { color: colors.textMuted, fontSize: 12 },
  underline: { position: "absolute", bottom: -1, left: 8, right: 8, height: 2, backgroundColor: colors.primary },
  pillBadge: { backgroundColor: colors.card, paddingHorizontal: 6, borderRadius: 8, height: 18, alignItems: "center", justifyContent: "center", minWidth: 22 },
  statsCard: { flexDirection: "row", backgroundColor: colors.card, borderRadius: 14, padding: 12, marginTop: 12, borderWidth: 1, borderColor: colors.border },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  statLabel: { color: colors.textMuted, fontSize: 10, textAlign: "center" },
  statValue: { color: colors.text, fontSize: 15, fontWeight: "700" },
  sortRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14, marginBottom: 8 },
  card: { padding: 12, backgroundColor: colors.card, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  typePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  waveRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  playBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" },
  waveTime: { color: colors.textMuted, fontSize: 10 },
  wave: { flex: 1, height: 24, flexDirection: "row", alignItems: "center", gap: 2 },
  storageCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, backgroundColor: colors.card, borderRadius: 14, marginTop: 8, borderWidth: 1, borderColor: colors.border },
  miniIcon: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  progressTrack: { height: 4, backgroundColor: colors.border, borderRadius: 2, marginTop: 6 },
  progressFill: { height: 4, borderRadius: 2 },
}));
