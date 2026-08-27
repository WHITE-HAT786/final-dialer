// Dashboard — implements the "Dashboard" frame of DepthRoute App v2.
//
// Data wiring is unchanged: /dashboard for the page, useBalance() for the
// portal-authoritative balance, useMultiSip() for the active line. What changed
// is the surface treatment — soft status tints instead of solid dims, the
// account avatar on a primary-soft chip, and type that resolves from the theme
// rather than a hardcoded white.
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Screen from "@/src/components/Screen";
import { cardShadow, spacing, type Palette } from "@/src/theme";
import { useTheme } from "@/src/theme/ThemeContext";
import { apiGet } from "@/src/api";
import { useAuth } from "@/src/AuthContext";
import { useBalance } from "@/src/hooks/useBalance";
import { useMultiSip } from "@/src/sip/MultiSipContext";
import SipPickerSheet from "@/src/components/SipPickerSheet";

/** Stat chips use the soft tints from the design, not the legacy solid dims. */
const statIcon = (icon: string, c: Palette) => {
  switch (icon) {
    case "outgoing":
      return { color: c.green, bg: c.greenSoft, name: "arrow-forward-circle" };
    case "incoming":
      return { color: c.primary, bg: c.primarySoft, name: "arrow-down-circle" };
    case "missed":
      return { color: c.red, bg: c.redSoft, name: "close-circle" };
    default:
      return { color: c.purple, bg: c.purpleSoft, name: "call" };
  }
};

export default function Dashboard() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const s = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  useAuth();
  const { state: balance } = useBalance(); // PORTAL-authoritative, honest-degrading
  const { selectedAccount, selectedRuntime, runtimes } = useMultiSip();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sipPicker, setSipPicker] = useState(false);

  const status = selectedRuntime?.status;
  const sipStatusLabel = (() => {
    switch (status) {
      case "registered": return { label: "SIP Registered", color: colors.green };
      case "connecting": return { label: "Connecting…", color: colors.yellow };
      case "registration_failed": return { label: "Registration Failed", color: colors.red };
      case "unsupported": return { label: "SIP Unsupported", color: colors.yellow };
      case "error": return { label: "SIP Error", color: colors.red };
      case "unregistered": return { label: "Unregistered", color: colors.textMuted };
      case "disconnected": return { label: "SIP Disconnected", color: colors.textMuted };
      default: return { label: runtimes.length === 0 ? "No SIP account" : "SIP Disconnected", color: colors.textMuted };
    }
  })();
  const selected = {
    name: selectedAccount?.displayName || selectedAccount?.username || "No account",
    color: (selectedAccount?.color as string) || colors.primary,
    did: selectedAccount?.callerId || (selectedAccount ? `${selectedAccount.username}@${selectedAccount.domain}` : "Tap to add"),
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
      <Screen title="Depth Route" activeKey="dashboard" showBell={false} showSip={false}>
        <View style={{ marginTop: 60, alignItems: "center" }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      title=""
      activeKey="dashboard"
      onRefresh={onRefresh}
      refreshing={refreshing}
      right={
        <View style={s.brandInline}>
          <View style={s.brandLogoSmall}>
            <MaterialCommunityIcons name="waveform" size={14} color={colors.onPrimary} />
          </View>
          <Text style={s.brandInlineText}>Depth Route</Text>
        </View>
      }
      showBell
      showSip
    >
      {/* Profile row */}
      <View style={s.profileRow} testID="dashboard-profile-row">
        <View style={s.avatar}>
          <Text style={s.avatarText}>
            {(data.profile.name || "JD")
              .split(" ")
              .map((w: string) => w[0])
              .slice(0, 2)
              .join("")}
          </Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.profileName} numberOfLines={1}>{data.profile.name}</Text>
          <Text style={s.profileExt} numberOfLines={1}>
            <Text style={s.profileExtNum}>{data.profile.ext}</Text>{" "}
            <Text style={s.profileExtName}>({data.profile.name})</Text>
          </Text>
          <View style={s.sipRow}>
            <View style={[s.sipDot, { backgroundColor: sipStatusLabel.color }]} />
            <Text style={[s.sipText, { color: sipStatusLabel.color }]}>{sipStatusLabel.label}</Text>
            <TouchableOpacity onPress={() => router.push("/sip-accounts")} testID="dashboard-sip-settings" style={s.sipCog}>
              <Ionicons name="settings-outline" size={13} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* SIP account switcher */}
      <TouchableOpacity
        style={s.sipChipRow}
        onPress={() => setSipPicker(true)}
        testID="dashboard-sip-switcher"
      >
        <View style={[s.sipChipIcon, { backgroundColor: selected.color + "22" }]}>
          <MaterialCommunityIcons name="server-network" size={18} color={selected.color} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.sipChipLabel}>Calling as</Text>
          <Text style={s.sipChipName} numberOfLines={1}>{selected.name}</Text>
        </View>
        <Text style={s.sipChipDid} numberOfLines={1}>{selected.did}</Text>
        <Ionicons name="swap-horizontal" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Balance + Plan side-by-side */}
      <View style={s.moneyRow}>
        <TouchableOpacity
          style={s.moneyCard}
          onPress={() => router.push("/billing")}
          testID="dashboard-balance"
        >
          <View style={[s.miniIcon, { backgroundColor: colors.greenSoft }]}>
            <Ionicons name="wallet" size={16} color={colors.green} />
          </View>
          <Text style={s.tinyLabel}>Account Balance</Text>
          {/* PORTAL balance only. loading -> placeholder, ok -> amount,
              unavailable -> a distinct message that is NEVER $0.00. */}
          {balance.status === "loading" ? (
            <Text style={s.balanceValue} numberOfLines={1}>…</Text>
          ) : balance.status === "ok" ? (
            <Text style={s.balanceValue} numberOfLines={1} adjustsFontSizeToFit>
              ${Number(balance.balance).toFixed(2)}
            </Text>
          ) : (
            <Text style={s.balanceUnavailable} numberOfLines={2}>
              Balance unavailable
            </Text>
          )}
          <Text style={s.moneySub}>Tap to recharge</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.moneyCard}
          onPress={() => router.push("/plans")}
          testID="dashboard-plan"
        >
          <View style={[s.miniIcon, { backgroundColor: colors.purpleSoft }]}>
            <Ionicons name="ribbon" size={16} color={colors.purple} />
          </View>
          <Text style={s.tinyLabel}>Current Plan</Text>
          <Text style={s.planName} numberOfLines={1}>{data.plan.name}</Text>
          <Text style={s.moneySub}>Valid till {data.plan.valid_till}</Text>
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingRight: 8 }}
        style={{ marginTop: spacing.md }}
      >
        {data.stats.map((stat: any, i: number) => {
          const si = statIcon(stat.icon, colors);
          return (
            <View key={i} style={s.statCard} testID={`dashboard-stat-${i}`}>
              <View style={[s.statIcon, { backgroundColor: si.bg }]}>
                <Ionicons name={si.name as any} size={18} color={si.color} />
              </View>
              <Text style={s.statLabel}>{stat.label}</Text>
              <Text style={s.statValue}>{stat.value}</Text>
              <View style={s.statChangeRow}>
                <Ionicons
                  name={stat.positive ? "arrow-up" : "arrow-down"}
                  size={11}
                  color={stat.positive ? colors.green : colors.red}
                />
                <Text style={[s.statChange, { color: stat.positive ? colors.green : colors.red }]}>
                  {stat.change}
                </Text>
                <Text style={s.statSub}>vs last 7 days</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Quick actions */}
      <View style={s.actionsRow}>
        <QuickAction s={s} icon="person-add" color={colors.green} bg={colors.greenSoft}
          label="Add Contact" onPress={() => router.push("/(tabs)/contacts")} testID="qa-add-contact" />
        <QuickAction s={s} icon="keypad" color={colors.primary} bg={colors.primarySoft}
          label="Dial Pad" onPress={() => router.push("/(tabs)/dialer")} testID="qa-dial-pad" />
        <QuickAction s={s} icon="people" color={colors.purple} bg={colors.purpleSoft}
          label="Contacts" onPress={() => router.push("/(tabs)/contacts")} testID="qa-contacts" />
        <QuickAction s={s} icon="time" color={colors.yellow} bg={colors.yellowSoft}
          label="Call Logs" onPress={() => router.push("/(tabs)/call-logs")} testID="qa-call-logs" />
        <QuickAction s={s} icon="mic" mci="voicemail" color={colors.teal} bg={colors.tealSoft}
          label="Voicemails" onPress={() => router.push("/voicemails")} testID="qa-voicemails" />
      </View>

      {/* Recent calls */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Recent Calls</Text>
          <TouchableOpacity
            style={s.viewAllRow}
            onPress={() => router.push("/(tabs)/call-logs")}
            testID="dashboard-view-all-calls"
          >
            <Text style={s.viewAll}>View All</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {data.recent_calls.map((call: any, i: number) => {
          const isMissed = call.type === "missed";
          const isOutgoing = call.type === "outgoing";
          const iconColor = isMissed ? colors.red : isOutgoing ? colors.green : colors.primary;
          const iconBg = isMissed ? colors.redSoft : isOutgoing ? colors.greenSoft : colors.primarySoft;
          const typeLabel = isMissed ? "Missed Call" : isOutgoing ? "Outgoing Call" : "Incoming Call";
          const durColor = isMissed ? colors.red : colors.green;
          return (
            <View
              key={call.id}
              style={[s.callRow, i !== data.recent_calls.length - 1 && s.callRowDivider]}
              testID={`recent-call-${i}`}
            >
              <View style={[s.callIcon, { backgroundColor: iconBg }]}>
                {isMissed ? (
                  <Ionicons name="close-outline" size={18} color={iconColor} />
                ) : (
                  <Ionicons name={isOutgoing ? "arrow-forward" : "arrow-down"} size={16} color={iconColor} />
                )}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.callName} numberOfLines={1}>{call.name}</Text>
                <Text style={[s.callType, { color: iconColor }]}>
                  {call.ext ? `${call.ext} ` : ""}
                  {typeLabel}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={s.callTime}>{call.time}</Text>
                <Text style={[s.callDur, { color: durColor }]}>{call.duration}</Text>
              </View>
              <TouchableOpacity
                style={s.callBtn}
                onPress={() => router.push({ pathname: "/call", params: { number: call.ext || call.name, name: call.name } })}
                testID={`recent-call-btn-${i}`}
              >
                <Ionicons name="call" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* Quick stats bottom */}
      <View style={s.bottomStatsRow}>
        {data.quick_stats.map((q: any, i: number) => (
          <View key={i} style={s.bottomStat} testID={`quick-stat-${i}`}>
            <View style={[s.miniIcon, { backgroundColor: q.color + "20" }]}>
              {q.icon === "voicemail" ? (
                <MaterialCommunityIcons name="voicemail" size={16} color={q.color} />
              ) : (
                <Ionicons name={q.icon} size={16} color={q.color} />
              )}
            </View>
            <Text style={s.bottomStatLabel}>{q.label}</Text>
            <Text style={s.bottomStatValue}>{q.value}</Text>
            <Text style={[s.bottomStatSub, { color: q.color }]}>{q.sub}</Text>
          </View>
        ))}
      </View>
      <SipPickerSheet visible={sipPicker} onClose={() => setSipPicker(false)} />
    </Screen>
  );
}

function QuickAction({ s, icon, color, bg, label, onPress, testID, mci }: any) {
  return (
    <TouchableOpacity style={s.qa} onPress={onPress} testID={testID}>
      <View style={[s.qaIcon, { backgroundColor: bg }]}>
        {mci ? (
          <MaterialCommunityIcons name={mci} size={21} color={color} />
        ) : (
          <Ionicons name={icon} size={21} color={color} />
        )}
      </View>
      <Text style={s.qaLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function makeStyles(c: Palette, dark: boolean) {
  const lift = cardShadow(dark);
  const card = {
    backgroundColor: c.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    ...(lift ?? null),
  } as const;

  return StyleSheet.create({
    brandInline: { flexDirection: "row", alignItems: "center", gap: 7 },
    brandLogoSmall: {
      width: 24, height: 24, borderRadius: 7, backgroundColor: c.primary,
      alignItems: "center", justifyContent: "center",
    },
    brandInlineText: { color: c.text, fontWeight: "700", fontSize: 14 },

    profileRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 },
    avatar: {
      width: 56, height: 56, borderRadius: 28, backgroundColor: c.primarySoft,
      alignItems: "center", justifyContent: "center",
    },
    avatarText: { color: c.primary, fontSize: 19, fontWeight: "700" },
    profileName: { color: c.text, fontSize: 17, fontWeight: "700", letterSpacing: -0.2 },
    profileExt: { fontSize: 12.5, marginTop: 2 },
    profileExtNum: { color: c.primary, fontWeight: "600" },
    profileExtName: { color: c.textMuted },
    sipRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 5 },
    sipDot: { width: 7, height: 7, borderRadius: 4 },
    sipText: { fontSize: 12, fontWeight: "600" },
    sipCog: { paddingHorizontal: 4, paddingVertical: 2 },

    sipChipRow: { ...card, flexDirection: "row", alignItems: "center", gap: 10, padding: 12, marginTop: 14 },
    sipChipIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    sipChipLabel: { color: c.textMuted, fontSize: 11 },
    sipChipName: { color: c.text, fontSize: 14, fontWeight: "700", marginTop: 2 },
    sipChipDid: { color: c.primary, fontSize: 12, fontWeight: "600", maxWidth: 120 },

    moneyRow: { flexDirection: "row", gap: 10, marginTop: spacing.md },
    moneyCard: { ...card, flex: 1, padding: 12 },
    miniIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    tinyLabel: { color: c.textMuted, fontSize: 11, marginTop: 8 },
    balanceValue: { color: c.green, fontSize: 22, fontWeight: "700", letterSpacing: -0.4, marginTop: 2 },
    balanceUnavailable: { color: c.textMuted, fontSize: 15, fontWeight: "700", marginTop: 2 },
    planName: { color: c.text, fontSize: 15, fontWeight: "700", marginTop: 4 },
    moneySub: { color: c.textDim, fontSize: 11, marginTop: 4 },

    statCard: { ...card, width: 132, padding: 12 },
    statIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    statLabel: { color: c.textMuted, fontSize: 12, marginTop: 8 },
    statValue: { color: c.text, fontSize: 21, fontWeight: "700", letterSpacing: -0.4, marginTop: 2 },
    statChangeRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
    statChange: { fontSize: 11, fontWeight: "700" },
    statSub: { fontSize: 10, color: c.textDim },

    actionsRow: {
      ...card,
      flexDirection: "row", justifyContent: "space-between",
      paddingVertical: 14, paddingHorizontal: 10, marginTop: spacing.md,
    },
    qa: { alignItems: "center", gap: 8, flex: 1 },
    qaIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
    qaLabel: { color: c.text, fontSize: 10.5, textAlign: "center", fontWeight: "500", lineHeight: 14 },

    section: { ...card, padding: 14, marginTop: spacing.md },
    sectionHeader: {
      flexDirection: "row", justifyContent: "space-between",
      alignItems: "center", marginBottom: 4,
    },
    sectionTitle: { color: c.text, fontSize: 16, fontWeight: "700" },
    viewAllRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    viewAll: { color: c.textMuted, fontSize: 12.5 },

    callRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
    callRowDivider: { borderBottomWidth: 1, borderBottomColor: c.borderSoft },
    callIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    callName: { color: c.text, fontSize: 14.5, fontWeight: "600" },
    callType: { fontSize: 12, marginTop: 2, fontWeight: "500" },
    callTime: { color: c.textMuted, fontSize: 11.5 },
    callDur: { fontSize: 12.5, fontWeight: "600", marginTop: 2 },
    callBtn: {
      width: 34, height: 34, borderRadius: 10, backgroundColor: c.primarySoft,
      alignItems: "center", justifyContent: "center",
    },

    bottomStatsRow: { flexDirection: "row", gap: 8, marginTop: spacing.md },
    bottomStat: { ...card, flex: 1, padding: 12 },
    bottomStatLabel: { color: c.textMuted, fontSize: 11.5, marginTop: 8 },
    bottomStatValue: { color: c.text, fontSize: 21, fontWeight: "700", letterSpacing: -0.4, marginTop: 2 },
    bottomStatSub: { fontSize: 11, marginTop: 2 },
  });
}
