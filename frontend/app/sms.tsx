import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "@/src/components/Screen";
import { useTheme } from "@/src/theme/ThemeContext";
import { makeThemedStyles } from "@/src/theme/useThemedStyles";
import { screensApi } from "@/src/api";

const TABS = ["Compose", "History", "Templates", "Schedule"];

export default function SMS() {
  const { colors } = useTheme();
  const styles = useStyles();
  const [data, setData] = useState<any>(null);
  const [active, setActive] = useState("Compose");
  const [to, setTo] = useState("");
  const [msg, setMsg] = useState("");
  useEffect(() => { screensApi.sms().then(setData).catch(() => setData([])); }, []);

  return (
    <Screen title="SMS" activeKey="sms" showSip={false}>
      {!data ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : (
        <>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={[styles.icon, { backgroundColor: colors.primaryDim }]}>
                <Ionicons name="chatbubble" size={16} color={colors.primary} />
              </View>
              <Text style={styles.statLabel}>Total Sent</Text>
              <Text style={styles.statValue}>{(Array.isArray(data) ? data : []).length.toLocaleString()}</Text>
              <Text style={styles.statSub}>This Month</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.icon, { backgroundColor: colors.greenDim }]}>
                <Ionicons name="checkmark-circle" size={16} color={colors.green} />
              </View>
              <Text style={styles.statLabel}>Delivered</Text>
              <Text style={styles.statValue}>{"—"}</Text>
              <Text style={[styles.statSub, { color: colors.green }]}>Delivery rate unavailable</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.icon, { backgroundColor: colors.purpleDim }]}>
                <Ionicons name="wallet" size={16} color={colors.purple} />
              </View>
              <Text style={styles.statLabel}>SMS Balance</Text>
              <Text style={styles.statValue}>{"—"}</Text>
              <Text style={[styles.statSub, { color: colors.purple }]}>Credits</Text>
            </View>
          </View>

          <View style={styles.tabsRow}>
            {TABS.map((t) => (
              <TouchableOpacity key={t} onPress={() => setActive(t)} style={styles.tab}>
                <Text style={[styles.tabLabel, active === t && { color: colors.primary, fontWeight: "700" }]}>{t}</Text>
                {active === t && <View style={styles.underline} />}
              </TouchableOpacity>
            ))}
          </View>

          {active === "Compose" && (
            <View style={styles.composeCard}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={styles.label}>To</Text>
                <Text style={styles.charCount}>{to.length} / 1000</Text>
              </View>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.inputFlex}
                  placeholder="Enter number(s)"
                  placeholderTextColor={colors.textDim}
                  value={to}
                  onChangeText={setTo}
                  testID="sms-to"
                />
                <TouchableOpacity><Ionicons name="people" size={20} color={colors.textMuted} /></TouchableOpacity>
              </View>

              <Text style={[styles.label, { marginTop: 12 }]}>From (Sender ID)</Text>
              <View style={styles.selectRow}>
                <Text style={{ color: colors.text }}>Depth Route</Text>
                <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
                <Text style={styles.label}>Message</Text>
                <Text style={styles.charCount}>{msg.length} / 160 | 1 SMS</Text>
              </View>
              <TextInput
                style={[styles.inputFlex, { minHeight: 80, textAlignVertical: "top", padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 10 }]}
                placeholder="Type your message..."
                placeholderTextColor={colors.textDim}
                value={msg}
                onChangeText={setMsg}
                multiline
                testID="sms-message"
              />

              <View style={styles.actionsRow}>
                <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="attach" size={16} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontSize: 13 }}>Attach</Text>
                </TouchableOpacity>
                <View style={{ flex: 1 }} />
                <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="code" size={16} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontSize: 13 }}>Insert Template</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.sendBtn} testID="sms-send">
                <Ionicons name="paper-plane" size={16} color="#fff" />
                <Text style={{ color: colors.text, fontWeight: "700" }}>Send SMS</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.recentCard}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: colors.text, fontWeight: "700", fontSize: 16 }}>Recent Messages</Text>
              <Text style={{ color: colors.primary, fontSize: 13 }}>View All</Text>
            </View>
            {(Array.isArray(data) ? data : []).map((m: any, i: number) => (
              <View key={m.id} style={[styles.msgRow, i !== (Array.isArray(data) ? data : []).length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderSoft }]}>
                <View style={[styles.msgAvatar, { backgroundColor: m.color + "40" }]}>
                  <Text style={{ color: m.color, fontWeight: "700", fontSize: 12 }}>+1</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600" }}>{m.number}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>{m.message}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text style={{ color: colors.textMuted, fontSize: 11 }}>{m.time}</Text>
                  <View style={[styles.statusPill, { backgroundColor: m.status === "Delivered" ? colors.greenDim : colors.yellowDim }]}>
                    <Text style={{ color: m.status === "Delivered" ? colors.green : colors.yellow, fontSize: 10, fontWeight: "700" }}>{m.status}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.fab} testID="sms-fab">
            <Ionicons name="add" size={26} color="#fff" />
          </TouchableOpacity>
        </>
      )}
    </Screen>
  );
}

const useStyles = makeThemedStyles((colors) => StyleSheet.create({
  statsRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  statCard: { flex: 1, padding: 10, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  icon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  statLabel: { color: colors.textMuted, fontSize: 11, marginTop: 6 },
  statValue: { color: colors.text, fontSize: 18, fontWeight: "700", marginTop: 2 },
  statSub: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  tabsRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border, marginTop: 14 },
  tab: { paddingVertical: 12, paddingHorizontal: 16, position: "relative" },
  tabLabel: { color: colors.textMuted, fontSize: 14 },
  underline: { position: "absolute", bottom: -1, left: 16, right: 16, height: 2, backgroundColor: colors.primary },
  composeCard: { padding: 14, backgroundColor: colors.card, borderRadius: 14, marginTop: 14, borderWidth: 1, borderColor: colors.border },
  label: { color: colors.textMuted, fontSize: 12 },
  charCount: { color: colors.textDim, fontSize: 11 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 8 },
  inputFlex: { flex: 1, color: colors.text, fontSize: 14 },
  selectRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 10, marginTop: 6 },
  actionsRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  sendBtn: { alignSelf: "flex-end", flexDirection: "row", gap: 8, backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, marginTop: 12, alignItems: "center" },
  recentCard: { padding: 14, backgroundColor: colors.card, borderRadius: 14, marginTop: 14, borderWidth: 1, borderColor: colors.border },
  msgRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  msgAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  statusPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  fab: { position: "absolute", bottom: 90, right: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
}));
