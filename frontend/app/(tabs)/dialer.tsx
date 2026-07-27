import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Screen from "@/src/components/Screen";
import { colors, spacing } from "@/src/theme";
import { useSip } from "@/src/SipContext";
import SipPickerSheet from "@/src/components/SipPickerSheet";

const KEYS = [
  ["1", "voicemail"],
  ["2", "ABC"],
  ["3", "DEF"],
  ["4", "GHI"],
  ["5", "JKL"],
  ["6", "MNO"],
  ["7", "PQRS"],
  ["8", "TUV"],
  ["9", "WXYZ"],
  ["*", ""],
  ["0", "+"],
  ["#", ""],
];

export default function Dialer() {
  const router = useRouter();
  const { selected } = useSip();
  const [num, setNum] = useState("");
  const [sipPicker, setSipPicker] = useState(false);

  const press = (k: string) => {
    Haptics.selectionAsync().catch(() => {});
    setNum((n) => (n + k).slice(0, 20));
  };

  const back = () => {
    Haptics.selectionAsync().catch(() => {});
    setNum((n) => n.slice(0, -1));
  };

  const startCall = () => {
    if (!num.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.push({ pathname: "/call", params: { number: num, name: "Unknown" } });
  };

  return (
    <Screen title="Dialer" activeKey="dialer">
      {/* Active SIP account */}
      <TouchableOpacity
        style={styles.sipCard}
        onPress={() => setSipPicker(true)}
        testID="dialer-sip-card"
      >
        <View style={[styles.sipIcon, { backgroundColor: selected.color + "22" }]}>
          <MaterialCommunityIcons name="server-network" size={22} color={selected.color} />
          <View style={styles.sipCheck}>
            <Ionicons name="checkmark" size={9} color="#fff" />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.sipLabel}>Active SIP Account · Tap to change</Text>
          <Text style={styles.sipName} numberOfLines={1}>{selected.name}</Text>
          <Text style={styles.sipHost} numberOfLines={1}>{selected.host}</Text>
          <Text style={styles.sipHost} numberOfLines={1}>{selected.did}</Text>
        </View>
        <Ionicons name="swap-horizontal" size={20} color={colors.primary} />
      </TouchableOpacity>

      {/* Tabs (Keypad/Contacts/Recents/More) */}
      <View style={styles.tabRow}>
        {[
          { label: "Keypad", icon: "call", active: true },
          { label: "Contacts", icon: "person-outline" },
          { label: "Recents", icon: "time-outline" },
          { label: "More", icon: "ellipsis-horizontal" },
        ].map((t, i) => (
          <View key={i} style={[styles.tab, t.active && styles.tabActive]}>
            <Ionicons name={t.icon as any} size={20} color={t.active ? colors.green : colors.textMuted} />
            <Text style={[styles.tabLabel, t.active && { color: colors.green }]}>{t.label}</Text>
            {t.active && <View style={styles.tabUnderline} />}
          </View>
        ))}
      </View>

      {/* Number input */}
      <View style={styles.numberRow} testID="dialer-number-row">
        <View style={styles.flag}>
          <Text style={{ fontSize: 16 }}>🇺🇸</Text>
          <Text style={{ color: "#fff", fontWeight: "600" }}>+1</Text>
          <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
        </View>
        <TextInput
          style={styles.numberInput}
          value={num}
          onChangeText={setNum}
          placeholder="Enter number or contact"
          placeholderTextColor={colors.textDim}
          showSoftInputOnFocus={false}
          testID="dialer-input"
        />
        <TouchableOpacity onPress={back} testID="dialer-backspace">
          <Ionicons name="backspace-outline" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Keypad */}
      <View style={styles.keypad}>
        {KEYS.map(([k, sub], i) => (
          <TouchableOpacity
            key={k}
            style={styles.key}
            onPress={() => press(k)}
            testID={`dialer-key-${k}`}
          >
            <Text style={styles.keyMain}>{k}</Text>
            {!!sub && sub !== "voicemail" && <Text style={styles.keySub}>{sub}</Text>}
            {sub === "voicemail" && <MaterialCommunityIcons name="voicemail" size={12} color={colors.textMuted} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Action row */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.sideAction} testID="dialer-video">
          <Ionicons name="videocam" size={22} color={colors.green} />
          <Text style={styles.sideActionLabel}>Video Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.callBtn} onPress={startCall} testID="dialer-call">
          <Ionicons name="call" size={30} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.sideAction} testID="dialer-dtmf">
          <Ionicons name="keypad" size={22} color={colors.textMuted} />
          <Text style={styles.sideActionLabel}>DTMF</Text>
        </TouchableOpacity>
      </View>

      {/* Balance / talk time / credit */}
      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Balance</Text>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
            <Text style={[styles.metricValue, { color: colors.green }]}>$125.45</Text>
            <Text style={styles.metricSuffix}>USD</Text>
          </View>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Talk Time</Text>
          <Text style={styles.metricValue}>05:42:18</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Credit Limit</Text>
          <Text style={[styles.metricValue, { color: colors.primary }]}>$200.00</Text>
        </View>
      </View>

      {/* Quick actions */}
      <View style={styles.qaCard}>
        <Text style={styles.qaHeader}>Quick Actions</Text>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
          <QA icon="swap-horizontal" bg={colors.greenDim} color={colors.green} label="Call Transfer" mci />
          <QA icon="pause-circle-outline" bg={colors.yellowDim} color={colors.yellow} label="Call Hold" />
          <QA icon="mic-off" bg={colors.purpleDim} color={colors.purple} label="Mute" />
          <QA icon="call" bg={colors.redDim} color={colors.red} label="Hangup" rotate />
        </View>
      </View>
      <SipPickerSheet visible={sipPicker} onClose={() => setSipPicker(false)} />
    </Screen>
  );
}

function QA({ icon, bg, color, label, rotate, mci }: any) {
  return (
    <TouchableOpacity style={qaStyles.item}>
      <View style={[qaStyles.icon, { backgroundColor: bg }]}>
        {mci ? (
          <MaterialCommunityIcons name={icon} size={22} color={color} />
        ) : (
          <Ionicons
            name={icon}
            size={22}
            color={color}
            style={rotate ? { transform: [{ rotate: "135deg" }] } : undefined}
          />
        )}
      </View>
      <Text style={qaStyles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const qaStyles = StyleSheet.create({
  item: { flex: 1, alignItems: "center", gap: 6 },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { color: "#fff", fontSize: 11, textAlign: "center" },
});

const styles = StyleSheet.create({
  sipCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sipIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  sipCheck: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.green,
    borderWidth: 2,
    borderColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  sipLabel: { color: colors.textMuted, fontSize: 12 },
  sipName: { color: "#fff", fontSize: 16, fontWeight: "700", marginTop: 2 },
  sipHost: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  tabRow: {
    flexDirection: "row",
    marginTop: spacing.md,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
    position: "relative",
  },
  tabActive: { backgroundColor: colors.greenDim, borderColor: colors.green + "40" },
  tabLabel: { color: colors.textMuted, fontSize: 12 },
  tabUnderline: {
    position: "absolute",
    bottom: 6,
    width: 30,
    height: 2,
    backgroundColor: colors.green,
    borderRadius: 1,
  },
  numberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 10,
  },
  flag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.card,
    borderRadius: 10,
  },
  numberInput: { flex: 1, color: "#fff", fontSize: 16 },
  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  key: {
    width: "30%",
    aspectRatio: 1.6,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    gap: 2,
  },
  keyMain: { color: "#fff", fontSize: 28, fontWeight: "400" },
  keySub: { color: colors.textMuted, fontSize: 10, letterSpacing: 2, fontWeight: "600" },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 8,
  },
  sideAction: { alignItems: "center", gap: 4, width: 70 },
  sideActionLabel: { color: colors.textMuted, fontSize: 12 },
  callBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  metricsRow: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metric: { flex: 1, alignItems: "center" },
  metricLabel: { color: colors.textMuted, fontSize: 12 },
  metricValue: { color: "#fff", fontSize: 17, fontWeight: "700", marginTop: 4 },
  metricSuffix: { color: colors.textMuted, fontSize: 11 },
  metricDivider: { width: 1, backgroundColor: colors.border },
  qaCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qaHeader: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
