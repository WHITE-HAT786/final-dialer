import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Screen from "@/src/components/Screen";
import { cardShadow, useTheme, useThemedStyles, type Palette } from "@/src/theme";
import { apiGet } from "@/src/api";
import { useBalance } from "@/src/hooks/useBalance";
import { useMultiSip } from "@/src/sip/MultiSipContext";
import SipPickerSheet from "@/src/components/SipPickerSheet";

/** Call direction -> the palette accent + glyph used across v2. */
const callTone = (c: Palette, type: string) => {
  if (type === "outgoing") return { fg: c.success, bg: c.successSoft, icon: "arrow-up" as const, label: "Outgoing Call" };
  if (type === "incoming") return { fg: c.primary, bg: c.primarySoft, icon: "arrow-down" as const, label: "Incoming Call" };
  return { fg: c.danger, bg: c.dangerSoft, icon: "close" as const, label: "Missed Call" };
};

const statTone = (c: Palette, icon: string) => {
  switch (icon) {
    case "outgoing": return { fg: c.success, bg: c.successSoft, name: "arrow-up" as const };
    case "incoming": return { fg: c.primary, bg: c.primarySoft, name: "arrow-down" as const };
    case "missed": return { fg: c.danger, bg: c.dangerSoft, name: "close" as const };
    default: return { fg: c.purple, bg: c.purpleSoft, name: "time-outline" as const };
  }
};

const quickStatTone = (c: Palette, icon: string) => {
  if (icon === "voicemail") return { fg: c.purple, bg: c.purpleSoft };
  if (icon === "mic" || icon === "recording") return { fg: c.teal, bg: c.tealSoft };
  return { fg: c.primary, bg: c.primarySoft };
};

export default function Dashboard() {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { state: balance } = useBalance();   // PORTAL-authoritative, honest-degrading
  const { selectedAccount, selectedRuntime, runtimes } = useMultiSip();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sipPicker, setSipPicker] = useState(false);

  const status = selectedRuntime?.status;
  const sipStatus = (() => {
    switch (status) {
      case "registered": return { label: "SIP Registered", color: c.success };
      case "connecting": return { label: "Connecting…", color: c.warn };
      case "registration_failed": return { label: "Registration Failed", color: c.danger };
      case "unsupported": return { label: "SIP Unsupported", color: c.warn };
      case "error": return { label: "SIP Error", color: c.danger };
      case "unregistered": return { label: "Unregistered", color: c.muted };
      case "disconnected": return { label: "SIP Disconnected", color: c.muted };
      default: return { label: runtimes.length === 0 ? "No SIP account" : "SIP Disconnected", color: c.muted };
    }
  })();

  const selected = {
    name: selectedAccount?.displayName || selectedAccount?.username || "No account",
    did:
      selectedAccount?.callerId ||
      (selectedAccount ? `${selectedAccount.username}@${selectedAccount.domain}` : "Tap to add"),
  };

  const load = async () => {
    try {
      const d = await apiGet("/dashboard");
      setData(d);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
  };

  if (loading || !data) {
    return (
      <Screen title="Depth Route" activeKey="dashboard" brand showBell={false} showSip={false}>
        <View style={{ marginTop: 60, alignItems: "center" }}>
          <ActivityIndicator color={c.primary} />
        </View>
      </Screen>
    );
  }

  const initials = (data.profile.name || "AD")
    .split(" ")
    .map((s: string) => s[0])
    .slice(0, 2)
    .join("");

  return (
    <Screen title="" activeKey="dashboard" brand onRefresh={onRefresh} refreshing={refreshing}>
      {/* Profile */}
      <View style={styles.profileRow} testID="dashboard-profile-row">
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.profileName} numberOfLines={1}>{data.profile.name}</Text>
          <Text style={styles.profileExt} numberOfLines={1}>
            <Text style={styles.profileExtNum}>{data.profile.ext}</Text>{" "}
            <Text style={styles.profileExtName}>({data.profile.name})</Text>
          </Text>
          <View style={styles.sipRow}>
            <View style={[styles.sipDot, { backgroundColor: sipStatus.color }]} />
            <Text style={[styles.sipText, { color: sipStatus.color }]}>{sipStatus.label}</Text>
            <TouchableOpacity
              onPress={() => router.push("/sip-accounts")}
              testID="dashboard-sip-settings"
              style={styles.sipCog}
            >
              <Ionicons name="settings-outline" size={13} color={c.muted} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Calling as */}
      <TouchableOpacity style={styles.callingAs} onPress={() => setSipPicker(true)} testID="dashboard-sip-switcher">
        <View style={[styles.tile38, { backgroundColor: c.primarySoft }]}>
          <MaterialCommunityIcons name="server-network" size={18} color={c.primary} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.tinyLabel}>Calling as</Text>
          <Text style={styles.callingAsName} numberOfLines={1}>{selected.name}</Text>
        </View>
        <Text style={styles.callingAsDid} numberOfLines={1}>{selected.did}</Text>
        <Ionicons name="swap-horizontal" size={18} color={c.muted} />
      </TouchableOpacity>

      {/* Balance + plan */}
      <View style={styles.pairRow}>
        <TouchableOpacity style={styles.card} onPress={() => router.push("/billing")} testID="dashboard-balance">
          <View style={[styles.round32, { backgroundColor: c.successSoft }]}>
            <Ionicons name="card-outline" size={16} color={c.success} />
          </View>
          <Text style={styles.tinyLabel}>Account Balance</Text>
          {/* PORTAL balance only. loading -> placeholder, ok -> amount,
              unavailable -> a distinct message that is NEVER $0.00. */}
          {balance.status === "loading" ? (
            <Text style={styles.balanceValue} numberOfLines={1}>…</Text>
          ) : balance.status === "ok" ? (
            <Text style={styles.balanceValue} numberOfLines={1} adjustsFontSizeToFit>
              ${Number(balance.balance).toFixed(2)}
            </Text>
          ) : (
            <Text style={[styles.balanceValue, styles.balanceUnavailable]} numberOfLines={2}>
              Balance unavailable
            </Text>
          )}
          <Text style={styles.dimSub}>Tap to recharge</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push("/plans")} testID="dashboard-plan">
          <View style={[styles.round32, { backgroundColor: c.purpleSoft }]}>
            <Ionicons name="ribbon-outline" size={16} color={c.purple} />
          </View>
          <Text style={styles.tinyLabel}>Current Plan</Text>
          <Text style={styles.planName} numberOfLines={1}>{data.plan.name}</Text>
          <Text style={styles.dimSub}>Valid till {data.plan.valid_till}</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingRight: 8 }}
        style={{ marginTop: 12 }}
      >
        {data.stats.map((s: any, i: number) => {
          const t = statTone(c, s.icon);
          const up = !!s.positive;
          return (
            <View key={i} style={[styles.card, styles.statCard]} testID={`dashboard-stat-${i}`}>
              <View style={[styles.round32, { backgroundColor: t.bg }]}>
                <Ionicons name={t.name} size={16} color={t.fg} />
              </View>
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
              <View style={styles.changeRow}>
                <Text style={[styles.change, { color: up ? c.success : c.danger }]}>
                  {up ? "↑" : "↓"} {s.change}
                </Text>
                <Text style={styles.changeSub}>vs last 7 days</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Quick actions */}
      <View style={[styles.card, styles.actionsCard]}>
        <QuickAction icon="person-add-outline" fg={c.success} bg={c.successSoft} label="Add Contact" onPress={() => router.push("/(tabs)/contacts")} testID="qa-add-contact" />
        <QuickAction icon="keypad-outline" fg={c.primary} bg={c.primarySoft} label="Dial Pad" onPress={() => router.push("/(tabs)/dialer")} testID="qa-dial-pad" />
        <QuickAction icon="people-outline" fg={c.purple} bg={c.purpleSoft} label="Contacts" onPress={() => router.push("/(tabs)/contacts")} testID="qa-contacts" />
        <QuickAction icon="time-outline" fg={c.warn} bg={c.warnSoft} label="Call Logs" onPress={() => router.push("/(tabs)/call-logs")} testID="qa-call-logs" />
        <QuickAction mci="voicemail" fg={c.teal} bg={c.tealSoft} label="Voicemails" onPress={() => router.push("/voicemails")} testID="qa-voicemails" />
      </View>

      {/* Recent calls */}
      <View style={[styles.card, styles.section]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Calls</Text>
          <TouchableOpacity
            style={styles.viewAllRow}
            onPress={() => router.push("/(tabs)/call-logs")}
            testID="dashboard-view-all-calls"
          >
            <Text style={styles.viewAll}>View All</Text>
            <Ionicons name="chevron-forward" size={14} color={c.muted} />
          </TouchableOpacity>
        </View>

        {data.recent_calls.map((call: any, i: number) => {
          const t = callTone(c, call.type);
          const last = i === data.recent_calls.length - 1;
          return (
            <View key={call.id} style={[styles.callRow, !last && styles.callRowDivider]} testID={`recent-call-${i}`}>
              <View style={[styles.round40, { backgroundColor: t.bg }]}>
                <Ionicons name={t.icon} size={16} color={t.fg} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.callName} numberOfLines={1}>{call.name}</Text>
                <Text style={[styles.callType, { color: t.fg }]}>
                  {call.ext ? `${call.ext} ` : ""}
                  {t.label}
                </Text>
              </View>
              <View style={styles.callMeta}>
                <Text style={styles.callTime}>{call.time}</Text>
                <Text style={[styles.callDur, { color: call.type === "missed" ? c.danger : c.success }]}>
                  {call.duration}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.callBtn}
                onPress={() =>
                  router.push({ pathname: "/call", params: { number: call.ext || call.name, name: call.name } })
                }
                testID={`recent-call-btn-${i}`}
              >
                <Ionicons name="call" size={16} color={c.primary} />
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* Quick stats */}
      <View style={styles.tripleRow}>
        {data.quick_stats.map((q: any, i: number) => {
          const t = quickStatTone(c, q.icon);
          return (
            <View key={i} style={[styles.card, { flex: 1 }]} testID={`quick-stat-${i}`}>
              <View style={[styles.round30, { backgroundColor: t.bg }]}>
                {q.icon === "voicemail" ? (
                  <MaterialCommunityIcons name="voicemail" size={15} color={t.fg} />
                ) : (
                  <Ionicons name={q.icon} size={15} color={t.fg} />
                )}
              </View>
              <Text style={styles.quickLabel}>{q.label}</Text>
              <Text style={styles.quickValue}>{q.value}</Text>
              <Text style={[styles.quickSub, { color: t.fg }]}>{q.sub}</Text>
            </View>
          );
        })}
      </View>

      <SipPickerSheet visible={sipPicker} onClose={() => setSipPicker(false)} />
    </Screen>
  );
}

function QuickAction({ icon, mci, fg, bg, label, onPress, testID }: any) {
  const styles = useThemedStyles(makeStyles);
  return (
    <TouchableOpacity style={styles.qa} onPress={onPress} testID={testID}>
      <View style={[styles.round44, { backgroundColor: bg }]}>
        {mci ? (
          <MaterialCommunityIcons name={mci} size={19} color={fg} />
        ) : (
          <Ionicons name={icon} size={19} color={fg} />
        )}
      </View>
      <Text style={styles.qaLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      padding: 12,
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      ...cardShadow(c),
    },

    profileRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 16 },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { color: c.primary, fontSize: 19, fontWeight: "700" },
    profileName: { color: c.text, fontSize: 17, fontWeight: "700", letterSpacing: -0.2 },
    profileExt: { fontSize: 12.5, marginTop: 2 },
    profileExtNum: { color: c.primary, fontWeight: "600" },
    profileExtName: { color: c.muted },
    sipRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 5 },
    sipDot: { width: 7, height: 7, borderRadius: 4 },
    sipText: { fontSize: 12, fontWeight: "600" },
    sipCog: { paddingHorizontal: 2 },

    callingAs: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 14,
      padding: 12,
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      ...cardShadow(c),
    },
    tile38: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    tinyLabel: { color: c.muted, fontSize: 11 },
    callingAsName: { color: c.text, fontSize: 14, fontWeight: "700", marginTop: 2 },
    callingAsDid: { color: c.primary, fontSize: 12, fontWeight: "600", maxWidth: 120 },

    pairRow: { flexDirection: "row", gap: 10, marginTop: 12 },
    round32: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    round30: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", marginBottom: 8 },
    round40: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    round44: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
    balanceValue: { color: c.success, fontSize: 22, fontWeight: "700", letterSpacing: -0.4, marginTop: 2 },
    balanceUnavailable: { fontSize: 15, color: c.muted },
    planName: { color: c.text, fontSize: 15, fontWeight: "700", marginTop: 4 },
    dimSub: { color: c.dim, fontSize: 11, marginTop: 2 },

    statCard: { width: 132 },
    statLabel: { color: c.muted, fontSize: 12, marginTop: 8 },
    statValue: { color: c.text, fontSize: 21, fontWeight: "700", letterSpacing: -0.4, marginTop: 2 },
    changeRow: { flexDirection: "row", alignItems: "baseline", gap: 4, marginTop: 4 },
    change: { fontSize: 11, fontWeight: "700" },
    changeSub: { color: c.dim, fontSize: 10 },

    actionsCard: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 6,
      marginTop: 12,
      paddingVertical: 14,
      paddingHorizontal: 10,
    },
    qa: { flex: 1, alignItems: "center", gap: 8 },
    qaLabel: { color: c.text, fontSize: 10.5, fontWeight: "500", textAlign: "center", lineHeight: 14 },

    section: { marginTop: 12, paddingHorizontal: 14, paddingVertical: 14 },
    sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
    sectionTitle: { color: c.text, fontSize: 16, fontWeight: "700" },
    viewAllRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    viewAll: { color: c.muted, fontSize: 12.5 },
    callRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
    callRowDivider: { borderBottomWidth: 1, borderBottomColor: c.borderSoft },
    callName: { color: c.text, fontSize: 14.5, fontWeight: "600" },
    callType: { fontSize: 12, fontWeight: "500", marginTop: 2 },
    callMeta: { alignItems: "flex-end", gap: 2 },
    callTime: { color: c.muted, fontSize: 11.5 },
    callDur: { fontSize: 12.5, fontWeight: "600" },
    callBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: c.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },

    tripleRow: { flexDirection: "row", gap: 8, marginTop: 12 },
    quickLabel: { color: c.muted, fontSize: 11.5 },
    quickValue: { color: c.text, fontSize: 21, fontWeight: "700", letterSpacing: -0.4, marginTop: 2 },
    quickSub: { fontSize: 11, marginTop: 2 },
  });
