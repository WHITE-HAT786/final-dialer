import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Pressable,
  FlatList,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Screen from "@/src/components/Screen";
import { colors, spacing } from "@/src/theme";
import { useMultiSip } from "@/src/sip/MultiSipContext";
import { sipBootstrapLabel, isRetryable, SipBootstrapState } from "@/src/sip/sipBootstrap";
import SipPickerSheet from "@/src/components/SipPickerSheet";
import { COUNTRIES, DEFAULT_COUNTRY } from "@/src/data/countries";

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
  const { selectedAccount, selectedRuntime, runtimes, call, bootstrap, retryBootstrap } = useMultiSip();
  const [num, setNum] = useState("");
  const [sipPicker, setSipPicker] = useState(false);
  const [countryPicker, setCountryPicker] = useState(false);
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [countrySearch, setCountrySearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selName = selectedAccount?.displayName || selectedAccount?.username || "No SIP account";
  const selDid = selectedAccount?.callerId || (selectedAccount ? `${selectedAccount.username}@${selectedAccount.domain}` : "Tap to add");
  const selHost = selectedAccount?.host || selectedAccount?.domain || "";
  // The customer's own backend line (ephemeral/primary) reports the bootstrap
  // state; a manually-added account reports its engine status.
  const usingPrimary = !selectedAccount || !!selectedAccount.ephemeral;
  const bootColor = (s: SipBootstrapState): string => {
    switch (s) {
      case "registered": return colors.green;
      case "loading":
      case "registering": return colors.yellow;
      case "no_extension":
      case "needs_provision": return colors.orange;
      case "unavailable":
      case "registration_failed":
      case "error": return colors.red;
      default: return colors.textMuted;
    }
  };
  // For the primary line, trust the engine's LIVE status once it is actually
  // running (registered/connecting/failed/unregistered) — the same source the
  // Dashboard and Header use — so the three views never disagree. Fall back to
  // the `bootstrap` phase only before the engine reports (loading / no_extension
  // / needs_provision / unavailable), where it carries the real information.
  const engineStatus = selectedRuntime?.status;
  const engineIsLive =
    engineStatus === "registered" || engineStatus === "connecting" ||
    engineStatus === "registration_failed" || engineStatus === "unregistered";
  const useBoot = usingPrimary && !engineIsLive;
  const engineColor = (): string => {
    switch (engineStatus) {
      case "registered": return colors.green;
      case "connecting": return colors.yellow;
      case "registration_failed": return colors.red;
      default: return selectedAccount?.color || colors.textMuted;
    }
  };
  const engineLabel = (): string => {
    switch (engineStatus) {
      case "registered": return "Registered";
      case "connecting": return "Connecting…";
      case "registration_failed": return "Registration Failed";
      case "unsupported": return "Unsupported";
      case "error": return "Error";
      case "unregistered": return "Unregistered";
      default: return runtimes.length === 0 ? "No SIP account" : "Disconnected";
    }
  };
  const selColor = useBoot ? bootColor(bootstrap) : engineColor();
  const selStatusLabel = useBoot ? sipBootstrapLabel(bootstrap) : engineLabel();
  const showRetry = useBoot && isRetryable(bootstrap);

  const press = (k: string) => {
    Haptics.selectionAsync().catch(() => {});
    setError(null);
    setNum((n) => (n + k).slice(0, 20));
  };
  const back = () => {
    Haptics.selectionAsync().catch(() => {});
    setNum((n) => n.slice(0, -1));
  };

  const startCall = async () => {
    setError(null);
    if (!num.trim()) { setError("Enter a number first"); return; }
    if (!selectedAccount) {
      setError("No SIP account selected — add one first");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    // Compose full E.164-ish target with country code stripping leading zeros / duplicate prefix
    const cc = country.code.replace(/[^+\d]/g, "");
    const digits = num.replace(/[^\d*#]/g, "").replace(/^0+/, "");
    const fullNumber = digits.startsWith(cc.replace("+", "")) ? `+${digits}` : `${cc}${digits}`;
    const res = await call(fullNumber, selectedAccount.id);
    if (res.error) {
      setError(res.error);
      return;
    }
    router.push({ pathname: "/call", params: { number: fullNumber, name: "Unknown", callId: res.callId || "", accountId: res.accountId || "" } });
  };

  return (
    <Screen title="Dialer" activeKey="dialer">
      {/* Active SIP account */}
      <TouchableOpacity
        style={styles.sipCard}
        onPress={() => setSipPicker(true)}
        testID="dialer-sip-card"
      >
        <View style={[styles.sipIcon, { backgroundColor: selColor + "22" }]}>
          <MaterialCommunityIcons name="server-network" size={22} color={selColor} />
          <View style={[styles.sipCheck, { backgroundColor: selColor }]}>
            <Ionicons name={selectedRuntime?.status === "registered" ? "checkmark" : "swap-horizontal"} size={9} color="#fff" />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.sipLabel}>{runtimes.length === 0 ? "No SIP account · Tap to add" : "Active SIP Account · Tap to switch"}</Text>
          <Text style={styles.sipName} numberOfLines={1}>{selName}</Text>
          <Text style={styles.sipHost} numberOfLines={1}>{selHost || "—"}</Text>
          <Text style={[styles.sipHost, { color: selColor }]} numberOfLines={1}>{selStatusLabel}{selectedAccount && ` · ${selDid}`}</Text>
          {showRetry && (
            <TouchableOpacity onPress={retryBootstrap} testID="dialer-sip-retry" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.sipHost, { color: colors.primary, marginTop: 2, fontWeight: "700" }]}>Tap to retry</Text>
            </TouchableOpacity>
          )}
        </View>
        <Ionicons name="swap-horizontal" size={20} color={colors.primary} />
      </TouchableOpacity>

      {error && (
        <View style={styles.errorBanner} testID="dialer-error-banner">
          <Ionicons name="alert-circle" size={18} color={colors.red} />
          <Text style={styles.errorText} numberOfLines={4}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)} testID="dialer-error-close">
            <Ionicons name="close" size={18} color={colors.red} />
          </TouchableOpacity>
        </View>
      )}

      {/* Tabs (Keypad/Contacts/Recents/More) — navigate to real screens */}
      <View style={styles.tabRow}>
        {[
          { label: "Keypad", icon: "call", route: null, active: true },
          { label: "Contacts", icon: "person-outline", route: "/(tabs)/contacts" },
          { label: "Recents", icon: "time-outline", route: "/(tabs)/call-logs" },
          { label: "More", icon: "ellipsis-horizontal", route: "/(tabs)/more" },
        ].map((t, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.tab, t.active && styles.tabActive]}
            onPress={() => t.route && router.push(t.route as any)}
            testID={`dialer-tab-${t.label.toLowerCase()}`}
          >
            <Ionicons name={t.icon as any} size={20} color={t.active ? colors.green : colors.textMuted} />
            <Text style={[styles.tabLabel, t.active && { color: colors.green }]}>{t.label}</Text>
            {t.active && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Number input */}
      <View style={styles.numberRow} testID="dialer-number-row">
        <TouchableOpacity
          style={styles.flag}
          onPress={() => setCountryPicker(true)}
          testID="dialer-country-picker"
        >
          <Text style={{ fontSize: 16 }}>{country.flag}</Text>
          <Text style={{ color: "#fff", fontWeight: "600" }}>{country.code}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
        </TouchableOpacity>
        <TextInput
          style={styles.numberInput}
          value={num}
          onChangeText={setNum}
          placeholder="Enter number (e.g. 5551234)"
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

      {/* Country code picker */}
      <Modal visible={countryPicker} transparent animationType="slide" onRequestClose={() => setCountryPicker(false)}>
        <Pressable style={countryStyles.backdrop} onPress={() => setCountryPicker(false)} />
        <View style={countryStyles.sheet} testID="country-picker-sheet">
          <View style={countryStyles.handle} />
          <View style={countryStyles.header}>
            <Text style={countryStyles.title}>Select Country Code</Text>
            <TouchableOpacity onPress={() => setCountryPicker(false)} testID="country-picker-close">
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={countryStyles.searchBox}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              style={countryStyles.searchInput}
              placeholder="Search country or code…"
              placeholderTextColor={colors.textDim}
              value={countrySearch}
              onChangeText={setCountrySearch}
              testID="country-picker-search"
            />
          </View>
          <FlatList
            data={COUNTRIES.filter((c) => !countrySearch || c.name.toLowerCase().includes(countrySearch.toLowerCase()) || c.code.includes(countrySearch))}
            keyExtractor={(item, i) => `${item.name}-${i}`}
            style={{ maxHeight: 380 }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={countryStyles.row}
                onPress={() => { setCountry(item); setCountryPicker(false); setCountrySearch(""); }}
                testID={`country-item-${item.code}`}
              >
                <Text style={{ fontSize: 22 }}>{item.flag}</Text>
                <Text style={countryStyles.name}>{item.name}</Text>
                <Text style={countryStyles.code}>{item.code}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
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
  errorBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, backgroundColor: colors.redDim + "80", borderWidth: 1, borderColor: colors.red + "50", borderRadius: 12, marginTop: 10 },
  errorText: { flex: 1, color: colors.red, fontSize: 12, fontWeight: "600" },
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

const countryStyles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "85%", backgroundColor: "#0C1526", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20, borderWidth: 1, borderColor: colors.border },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: "#fff", fontSize: 18, fontWeight: "700" },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.bgAlt, borderRadius: 10, paddingHorizontal: 12, height: 42, marginTop: 12, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, color: "#fff", fontSize: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  name: { color: "#fff", fontSize: 14, flex: 1 },
  code: { color: colors.primary, fontWeight: "700", fontSize: 14 },
});
