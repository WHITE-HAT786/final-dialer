import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Screen from "@/src/components/Screen";
import { spacing } from "@/src/theme";
import { useTheme } from "@/src/theme/ThemeContext";
import { makeThemedStyles } from "@/src/theme/useThemedStyles";
import { screensApi } from "@/src/api";

export default function Voicemails() {
  const { colors } = useTheme();
  const styles = useStyles();
  const [data, setData] = useState<any>(null);
  const [active, setActive] = useState("Voice Messages");
  useEffect(() => { screensApi.voicemails().then(setData).catch(() => setData([])); }, []);

  return (
    <Screen title="Voicemails" activeKey="voicemails" showBack showSip={false} showBell={false}
      right={
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity><Ionicons name="search" size={22} color="#fff" /></TouchableOpacity>
          <TouchableOpacity><Ionicons name="ellipsis-vertical" size={22} color="#fff" /></TouchableOpacity>
        </View>
      }
    >
      <View style={styles.tabs}>
        {["Voice Messages", "Greetings"].map(t => (
          <TouchableOpacity key={t} style={styles.tab} onPress={() => setActive(t)}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={[styles.tabLabel, active === t && { color: colors.primary, fontWeight: "700" }]}>{t}</Text>
              {t === "Voice Messages" && (
                <View style={styles.pillBadge}><Text style={{ color: colors.text, fontSize: 10, fontWeight: "700" }}>{(Array.isArray(data) ? data : []).length}</Text></View>
              )}
            </View>
            {active === t && <View style={styles.underline} />}
          </TouchableOpacity>
        ))}
      </View>

      {!data ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : (
        <>
          {/* Stats */}
          <View style={styles.statsCard}>
            {[
              { icon: "voicemail", family: "mc", color: colors.purple, label: "All Messages", value: (Array.isArray(data) ? data : []).length },
              { icon: "headset", family: "ion", color: colors.primary, label: "New Messages", value: (Array.isArray(data) ? data : []).filter((v: any) => v.is_new ?? v.unread).length },
              { icon: "mic", family: "ion", color: colors.green, label: "Saved Messages", value: (Array.isArray(data) ? data : []).filter((v: any) => v.saved).length },
              { icon: "trash", family: "ion", color: colors.red, label: "Deleted", value: (Array.isArray(data) ? data : []).filter((v: any) => v.deleted).length },
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

          {(Array.isArray(data) ? data : []).map((v: any) => (
            <View key={v.id} style={styles.card} testID={`vm-${v.id}`}>
              <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                <View style={[styles.avatar, { backgroundColor: v.color + "40" }]}>
                  <Text style={{ color: v.color, fontWeight: "700", fontSize: 16 }}>{v.name[0]}</Text>
                  {v.new && <View style={styles.newDot} />}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>{v.name}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 13 }}>{v.ext}</Text>
                    {v.new && <View style={styles.newPill}><Text style={{ color: colors.purple, fontSize: 10, fontWeight: "700" }}>New</Text></View>}
                  </View>
                  <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>📅 {v.date}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>🕒 {v.duration}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.playBtn}><Ionicons name="play" size={16} color={colors.primary} /></TouchableOpacity>
                <TouchableOpacity><Ionicons name="ellipsis-vertical" size={18} color={colors.textMuted} /></TouchableOpacity>
              </View>
              {v.new && (
                <>
                  <View style={styles.waveRow}>
                    <Text style={styles.waveTime}>00:00</Text>
                    <View style={styles.wave}>
                      {Array.from({ length: 40 }).map((_, i) => (
                        <View key={i} style={{ width: 2, height: Math.random() * 20 + 4, backgroundColor: i < 15 ? colors.purple : colors.textDim, borderRadius: 1 }} />
                      ))}
                    </View>
                    <Text style={styles.waveTime}>{v.duration}</Text>
                  </View>
                  <View style={styles.actions}>
                    {[
                      { icon: "volume-high", label: "Speaker", color: colors.text },
                      { icon: "call", label: "Call Back", color: colors.text },
                      { icon: "download", label: "Save", color: colors.text },
                      { icon: "trash", label: "Delete", color: colors.red },
                    ].map((a, i) => (
                      <TouchableOpacity key={i} style={{ alignItems: "center", gap: 4 }}>
                        <Ionicons name={a.icon as any} size={20} color={a.color} />
                        <Text style={{ color: a.color, fontSize: 11 }}>{a.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </View>
          ))}

          <View style={styles.storageCard}>
            <View style={[styles.miniIcon, { backgroundColor: colors.purpleDim }]}>
              <MaterialCommunityIcons name="voicemail" size={18} color={colors.purple} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: "700", fontSize: 14 }}>Voicemail Storage</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>Storage usage unavailable</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: "0%", backgroundColor: colors.purple }]} />
              </View>
            </View>
            <Text style={{ color: colors.purple, fontWeight: "700", fontSize: 13 }}>{"—"}</Text>
          </View>
        </>
      )}
    </Screen>
  );
}

const useStyles = makeThemedStyles((colors) => StyleSheet.create({
  tabs: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border, marginTop: 4 },
  tab: { paddingVertical: 12, paddingHorizontal: 16, position: "relative" },
  tabLabel: { color: colors.textMuted, fontSize: 14 },
  underline: { position: "absolute", bottom: -1, left: 16, right: 16, height: 2, backgroundColor: colors.primary },
  pillBadge: { backgroundColor: colors.primary, paddingHorizontal: 8, borderRadius: 10, height: 20, alignItems: "center", justifyContent: "center" },
  statsCard: { flexDirection: "row", backgroundColor: colors.card, borderRadius: 14, padding: 12, marginTop: 12, borderWidth: 1, borderColor: colors.border },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  statLabel: { color: colors.textMuted, fontSize: 10, textAlign: "center" },
  statValue: { color: colors.text, fontSize: 18, fontWeight: "700" },
  sortRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14, marginBottom: 8 },
  card: { padding: 12, backgroundColor: colors.card, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", position: "relative" },
  newDot: { position: "absolute", right: -2, top: -2, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  newPill: { backgroundColor: colors.purpleDim, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  playBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" },
  waveRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  waveTime: { color: colors.textMuted, fontSize: 11 },
  wave: { flex: 1, height: 30, flexDirection: "row", alignItems: "center", gap: 2 },
  actions: { flexDirection: "row", justifyContent: "space-around", marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  storageCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, backgroundColor: colors.card, borderRadius: 14, marginTop: 8, borderWidth: 1, borderColor: colors.border },
  miniIcon: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  progressTrack: { height: 4, backgroundColor: colors.border, borderRadius: 2, marginTop: 6 },
  progressFill: { height: 4, borderRadius: 2 },
}));
