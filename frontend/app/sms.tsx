import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "@/src/components/Screen";
import { cardShadow, useTheme, useThemedStyles, type Palette } from "@/src/theme";
import { apiGet } from "@/src/api";

const TABS = ["Compose", "History", "Templates", "Schedule"];

export default function SMS() {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [data, setData] = useState<any>(null);
  const [active, setActive] = useState("Compose");
  const [to, setTo] = useState("");
  const [msg, setMsg] = useState("");
  const [msgFocused, setMsgFocused] = useState(false);
  useEffect(() => {
    apiGet("/sms").then(setData).catch(() => {});
  }, []);

  // A GSM-7 segment is 160 chars; the counter mirrors what the gateway bills.
  const segments = Math.max(1, Math.ceil(msg.length / 160));

  return (
    <Screen
      title="SMS"
      activeKey="sms"
      showSip={false}
      hairline={false}
      overlay={
        <TouchableOpacity style={styles.fab} testID="sms-fab">
          <Ionicons name="add" size={24} color={c.onPrimary} />
        </TouchableOpacity>
      }
    >
      {!data ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: c.primarySoft }]}>
                <Ionicons name="chatbubble-outline" size={16} color={c.primary} />
              </View>
              <Text style={styles.statLabel}>Total Sent</Text>
              <Text style={styles.statValue}>{data.stats.total_sent.toLocaleString()}</Text>
              <Text style={styles.statSub}>This Month</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: c.successSoft }]}>
                <Ionicons name="checkmark-circle-outline" size={16} color={c.success} />
              </View>
              <Text style={styles.statLabel}>Delivered</Text>
              <Text style={styles.statValue}>{data.stats.delivered.toLocaleString()}</Text>
              <Text style={[styles.statSub, { color: c.success }]}>
                {data.stats.delivery_rate}% delivery rate
              </Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: c.purpleSoft }]}>
                <Ionicons name="card-outline" size={16} color={c.purple} />
              </View>
              <Text style={styles.statLabel}>SMS Balance</Text>
              <Text style={styles.statValue}>{data.stats.sms_balance.toLocaleString()}</Text>
              <Text style={[styles.statSub, { color: c.purple }]}>Credits</Text>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabStrip}>
            {TABS.map((t) => {
              const on = active === t;
              return (
                <TouchableOpacity key={t} style={styles.tab} onPress={() => setActive(t)} testID={`sms-tab-${t}`}>
                  <Text style={[styles.tabLabel, on && styles.tabLabelActive]}>{t}</Text>
                  <View style={[styles.tabUnderline, on && styles.tabUnderlineActive]} />
                </TouchableOpacity>
              );
            })}
          </View>

          {active === "Compose" && (
            <View style={styles.composeCard}>
              <View style={styles.fieldHead}>
                <Text style={styles.fieldLabel}>To</Text>
                <Text style={styles.counter}>{to.length} / 1000</Text>
              </View>
              <View style={styles.field}>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Enter number(s)"
                  placeholderTextColor={c.dim}
                  value={to}
                  onChangeText={setTo}
                  testID="sms-to"
                />
                <TouchableOpacity testID="sms-pick-contact">
                  <Ionicons name="people-outline" size={18} color={c.muted} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>From (Sender ID)</Text>
              <TouchableOpacity style={styles.field} testID="sms-sender">
                <Text style={styles.fieldValue}>Depth Route</Text>
                <Ionicons name="chevron-down" size={14} color={c.muted} />
              </TouchableOpacity>

              <View style={[styles.fieldHead, { marginTop: 14 }]}>
                <Text style={styles.fieldLabel}>Message</Text>
                <Text style={styles.counter}>
                  {msg.length} / 160 · {segments} SMS
                </Text>
              </View>
              <View style={[styles.ringWrap, msgFocused && styles.ringWrapOn]}>
                <TextInput
                  style={[styles.textarea, msgFocused && styles.textareaOn]}
                  placeholder="Type your message…"
                  placeholderTextColor={c.dim}
                  value={msg}
                  onChangeText={setMsg}
                  onFocus={() => setMsgFocused(true)}
                  onBlur={() => setMsgFocused(false)}
                  multiline
                  testID="sms-message"
                />
              </View>

              <View style={styles.composeActions}>
                <TouchableOpacity style={styles.linkBtn} testID="sms-attach">
                  <Ionicons name="attach" size={15} color={c.primary} />
                  <Text style={styles.linkText}>Attach</Text>
                </TouchableOpacity>
                <View style={{ flex: 1 }} />
                <TouchableOpacity style={styles.linkBtn} testID="sms-template">
                  <Ionicons name="code-slash" size={15} color={c.primary} />
                  <Text style={styles.linkText}>Insert Template</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.sendBtn} testID="sms-send">
                <Ionicons name="paper-plane" size={16} color={c.onPrimary} />
                <Text style={styles.sendText}>Send SMS</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Recent */}
          <View style={styles.recentCard}>
            <View style={styles.recentHead}>
              <Text style={styles.recentTitle}>Recent Messages</Text>
              <TouchableOpacity testID="sms-view-all">
                <Text style={styles.viewAll}>View All</Text>
              </TouchableOpacity>
            </View>
            {data.recent.map((m: any, i: number) => {
              const delivered = m.status === "Delivered";
              const last = i === data.recent.length - 1;
              return (
                <View key={m.id} style={[styles.msgRow, !last && styles.msgRowDivider]} testID={`sms-recent-${i}`}>
                  <View style={[styles.msgAvatar, { backgroundColor: (m.color || c.primary) + "26" }]}>
                    <Text style={[styles.msgAvatarText, { color: m.color || c.primary }]}>+1</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.msgNumber} numberOfLines={1}>{m.number}</Text>
                    <Text style={styles.msgBody} numberOfLines={1}>{m.message}</Text>
                  </View>
                  <View style={styles.msgMeta}>
                    <Text style={styles.msgTime}>{m.time}</Text>
                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: delivered ? c.successSoft : c.warnSoft },
                      ]}
                    >
                      <Text style={[styles.statusText, { color: delivered ? c.success : c.warn }]}>
                        {m.status}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    statsRow: { flexDirection: "row", gap: 8, marginTop: 8 },
    statCard: {
      flex: 1,
      padding: 10,
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      ...cardShadow(c),
    },
    statIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    statLabel: { color: c.muted, fontSize: 11, marginTop: 6 },
    statValue: { color: c.text, fontSize: 18, fontWeight: "700", marginTop: 2 },
    statSub: { color: c.muted, fontSize: 10, marginTop: 2 },

    tabStrip: { flexDirection: "row", marginTop: 14, borderBottomWidth: 1, borderBottomColor: c.border },
    tab: { paddingVertical: 12, paddingHorizontal: 13 },
    tabLabel: { color: c.muted, fontSize: 13.5, fontWeight: "500" },
    tabLabelActive: { color: c.primary, fontWeight: "700" },
    tabUnderline: {
      position: "absolute",
      bottom: -1,
      left: 13,
      right: 13,
      height: 2,
      borderRadius: 1,
      backgroundColor: "transparent",
    },
    tabUnderlineActive: { backgroundColor: c.primary },

    composeCard: {
      marginTop: 14,
      padding: 14,
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      ...cardShadow(c),
    },
    fieldHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
    fieldLabel: { color: c.text, fontSize: 13, fontWeight: "500" },
    counter: { color: c.dim, fontSize: 11 },
    field: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      height: 44,
      marginTop: 7,
      paddingHorizontal: 13,
      borderRadius: 10,
      backgroundColor: c.input,
      borderWidth: 1,
      borderColor: c.border,
    },
    fieldInput: { flex: 1, color: c.text, fontSize: 14, padding: 0 },
    fieldValue: { flex: 1, color: c.text, fontSize: 14 },

    // The design's 3px focus ring, drawn as a padded wrapper behind the input.
    // Geometry stays constant whether focused or not — only the fill changes —
    // so the field never shifts as the ring appears.
    ringWrap: {
      marginTop: 4,
      marginHorizontal: -3,
      marginBottom: -3,
      padding: 3,
      borderRadius: 13,
      backgroundColor: "transparent",
    },
    ringWrapOn: { backgroundColor: c.ring },
    textarea: {
      minHeight: 84,
      paddingHorizontal: 13,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: c.input,
      borderWidth: 1,
      borderColor: c.border,
      color: c.text,
      fontSize: 14,
      lineHeight: 21,
      textAlignVertical: "top",
    },
    textareaOn: { borderColor: c.primary },

    composeActions: { flexDirection: "row", alignItems: "center", marginTop: 12 },
    linkBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
    linkText: { color: c.primary, fontSize: 12.5 },
    sendBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      height: 44,
      marginTop: 14,
      borderRadius: 10,
      backgroundColor: c.primary,
    },
    sendText: { color: c.onPrimary, fontSize: 14.5, fontWeight: "600" },

    recentCard: {
      marginTop: 14,
      padding: 14,
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      ...cardShadow(c),
    },
    recentHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    recentTitle: { color: c.text, fontSize: 15.5, fontWeight: "700" },
    viewAll: { color: c.primary, fontSize: 12.5, fontWeight: "600" },
    msgRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11 },
    msgRowDivider: { borderBottomWidth: 1, borderBottomColor: c.borderSoft },
    msgAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
    msgAvatarText: { fontSize: 11.5, fontWeight: "700" },
    msgNumber: { color: c.text, fontSize: 13, fontWeight: "600" },
    msgBody: { color: c.muted, fontSize: 12, marginTop: 2 },
    msgMeta: { alignItems: "flex-end", gap: 4 },
    msgTime: { color: c.muted, fontSize: 11 },
    statusPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    statusText: { fontSize: 10, fontWeight: "700" },

    fab: {
      position: "absolute",
      right: 20,
      bottom: 56,
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#2F80ED",
      shadowOpacity: 0.35,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
  });
