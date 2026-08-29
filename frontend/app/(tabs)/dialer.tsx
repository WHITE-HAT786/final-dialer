import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  FlatList,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Screen from "@/src/components/Screen";
import { cardShadow, CONTROL_H, useTheme, useThemedStyles, type Palette } from "@/src/theme";
import { useMultiSip } from "@/src/sip/MultiSipContext";
import SipPickerSheet from "@/src/components/SipPickerSheet";
import { COUNTRIES, DEFAULT_COUNTRY } from "@/src/data/countries";

const KEYS: [string, string][] = [
  ["1", ""],
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

const TABS = [
  { label: "Keypad", route: null },
  { label: "Contacts", route: "/(tabs)/contacts" },
  { label: "Recents", route: "/(tabs)/call-logs" },
  { label: "More", route: "/(tabs)/more" },
];

export default function Dialer() {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { selectedAccount, selectedRuntime, runtimes, call } = useMultiSip();
  const [num, setNum] = useState("");
  const [sipPicker, setSipPicker] = useState(false);
  const [countryPicker, setCountryPicker] = useState(false);
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [countrySearch, setCountrySearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const registered = selectedRuntime?.status === "registered";
  const selName = selectedAccount?.displayName || selectedAccount?.username || "No SIP account";
  const selDid =
    selectedAccount?.callerId ||
    (selectedAccount ? `${selectedAccount.username}@${selectedAccount.domain}` : "Tap to add");
  const selHost = selectedAccount?.domain || selectedAccount?.wssUrl || "—";

  const lineTone = registered
    ? { fg: c.success, bg: c.successSoft }
    : selectedRuntime?.status === "registration_failed"
      ? { fg: c.danger, bg: c.dangerSoft }
      : { fg: c.muted, bg: c.card };

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
    if (!num.trim()) {
      setError("Enter a number first");
      return;
    }
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
    router.push({
      pathname: "/call",
      params: {
        number: fullNumber,
        name: "Unknown",
        callId: res.callId || "",
        accountId: res.accountId || "",
      },
    });
  };

  const inCallActions = [
    { label: "Transfer", icon: "swap-horizontal" as const, fg: c.success, bg: c.successSoft },
    { label: "Hold", icon: "pause" as const, fg: c.warn, bg: c.warnSoft },
    { label: "Mute", icon: "mic-off" as const, fg: c.purple, bg: c.purpleSoft },
    { label: "Hang up", icon: "close" as const, fg: c.danger, bg: c.dangerSoft },
  ];

  return (
    <Screen title="Dialer" activeKey="dialer">
      {/* Active line */}
      <TouchableOpacity style={styles.lineCard} onPress={() => setSipPicker(true)} testID="dialer-sip-card">
        <View style={[styles.tile38, { backgroundColor: lineTone.bg }]}>
          <MaterialCommunityIcons name="server-network" size={19} color={lineTone.fg} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.lineLabel}>
            {runtimes.length === 0 ? "NO SIP ACCOUNT" : "ACTIVE LINE"}
          </Text>
          <Text style={styles.lineName} numberOfLines={1}>
            {selName}
            {selectedAccount ? ` · ${selDid}` : ""}
          </Text>
          <Text style={styles.lineHost} numberOfLines={1}>{selHost}</Text>
        </View>
        <Ionicons name="swap-horizontal" size={18} color={c.primary} />
      </TouchableOpacity>

      {error && (
        <View style={styles.errorBanner} testID="dialer-error-banner">
          <Ionicons name="alert-circle" size={18} color={c.danger} />
          <Text style={styles.errorText} numberOfLines={4}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)} testID="dialer-error-close">
            <Ionicons name="close" size={18} color={c.danger} />
          </TouchableOpacity>
        </View>
      )}

      {/* Segmented tabs */}
      <View style={styles.segment}>
        {TABS.map((t) => {
          const active = t.route === null;
          return (
            <TouchableOpacity
              key={t.label}
              style={[styles.segmentItem, active && styles.segmentItemActive]}
              onPress={() => t.route && router.push(t.route as any)}
              testID={`dialer-tab-${t.label.toLowerCase()}`}
            >
              <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Number */}
      <View style={styles.numberRow} testID="dialer-number-row">
        <TouchableOpacity style={styles.ccChip} onPress={() => setCountryPicker(true)} testID="dialer-country-picker">
          <Text style={styles.ccText}>{country.code}</Text>
          <Ionicons name="chevron-down" size={12} color={c.muted} />
        </TouchableOpacity>
        <TextInput
          style={styles.numberInput}
          value={num}
          onChangeText={setNum}
          placeholder="Enter number"
          placeholderTextColor={c.dim}
          showSoftInputOnFocus={false}
          testID="dialer-input"
        />
        <TouchableOpacity onPress={back} testID="dialer-backspace">
          <Ionicons name="backspace-outline" size={21} color={c.muted} />
        </TouchableOpacity>
      </View>
      <View style={styles.hairline} />

      {/* Keypad */}
      <View style={styles.keypad}>
        {KEYS.map(([k, sub]) => (
          <TouchableOpacity key={k} style={styles.key} onPress={() => press(k)} testID={`dialer-key-${k}`}>
            <Text style={styles.keyMain}>{k}</Text>
            <Text style={styles.keySub}>{sub}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Call row */}
      <View style={styles.callRow}>
        <TouchableOpacity style={styles.sideAction} testID="dialer-video">
          <View style={styles.sideTile}>
            <Ionicons name="videocam-outline" size={20} color={c.muted} />
          </View>
          <Text style={styles.sideLabel}>Video</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.callBtn} onPress={startCall} testID="dialer-call">
          <Ionicons name="call" size={28} color={c.onPrimary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.sideAction} testID="dialer-dtmf">
          <View style={styles.sideTile}>
            <Ionicons name="keypad-outline" size={20} color={c.muted} />
          </View>
          <Text style={styles.sideLabel}>DTMF</Text>
        </TouchableOpacity>
      </View>

      {/* In-call controls (inert until a call connects) */}
      <Text style={styles.sectionCaps}>IN-CALL CONTROLS</Text>
      <View style={styles.inCallRow}>
        {inCallActions.map((a) => (
          <View key={a.label} style={styles.inCallTile} testID={`dialer-incall-${a.label.toLowerCase()}`}>
            <View style={[styles.tile34, { backgroundColor: a.bg }]}>
              <Ionicons name={a.icon} size={16} color={a.fg} />
            </View>
            <Text style={styles.inCallLabel}>{a.label}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.inCallNote}>Available once a call connects.</Text>

      <SipPickerSheet visible={sipPicker} onClose={() => setSipPicker(false)} />

      {/* Country code picker */}
      <Modal visible={countryPicker} transparent animationType="slide" onRequestClose={() => setCountryPicker(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setCountryPicker(false)} />
        <View style={styles.sheet} testID="country-picker-sheet">
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Select Country Code</Text>
            <TouchableOpacity onPress={() => setCountryPicker(false)} testID="country-picker-close">
              <Ionicons name="close" size={22} color={c.muted} />
            </TouchableOpacity>
          </View>
          <View style={styles.sheetSearch}>
            <Ionicons name="search" size={16} color={c.muted} />
            <TextInput
              style={styles.sheetSearchInput}
              placeholder="Search country or code…"
              placeholderTextColor={c.dim}
              value={countrySearch}
              onChangeText={setCountrySearch}
              testID="country-picker-search"
            />
          </View>
          <FlatList
            data={COUNTRIES.filter(
              (x) =>
                !countrySearch ||
                x.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
                x.code.includes(countrySearch),
            )}
            keyExtractor={(item, i) => `${item.name}-${i}`}
            style={{ maxHeight: 380 }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.sheetRow}
                onPress={() => {
                  setCountry(item);
                  setCountryPicker(false);
                  setCountrySearch("");
                }}
                testID={`country-item-${item.code}`}
              >
                <Text style={{ fontSize: 22 }}>{item.flag}</Text>
                <Text style={styles.sheetRowName}>{item.name}</Text>
                <Text style={styles.sheetRowCode}>{item.code}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    lineCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginTop: 16,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      ...cardShadow(c),
    },
    tile38: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    lineLabel: { color: c.dim, fontSize: 11, fontWeight: "600", letterSpacing: 0.6 },
    lineName: { color: c.text, fontSize: 15, fontWeight: "600", marginTop: 3 },
    lineHost: { color: c.muted, fontSize: 12, marginTop: 2 },

    errorBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 10,
      padding: 12,
      borderRadius: 12,
      backgroundColor: c.dangerSoft,
      borderWidth: 1,
      borderColor: c.dangerBorder,
    },
    errorText: { flex: 1, color: c.danger, fontSize: 12, fontWeight: "600" },

    segment: {
      flexDirection: "row",
      gap: 4,
      marginTop: 14,
      padding: 4,
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    segmentItem: { flex: 1, height: 36, borderRadius: 9, alignItems: "center", justifyContent: "center" },
    segmentItemActive: { backgroundColor: c.primary },
    segmentLabel: { color: c.muted, fontSize: 12.5, fontWeight: "600" },
    segmentLabelActive: { color: c.onPrimary },

    numberRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 20 },
    ccChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 9,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    ccText: { color: c.text, fontSize: 13.5, fontWeight: "600" },
    numberInput: { flex: 1, color: c.text, fontSize: 24, fontWeight: "500", letterSpacing: 1, padding: 0 },
    hairline: { height: 1, backgroundColor: c.border, marginTop: 10 },

    keypad: { flexDirection: "row", flexWrap: "wrap", marginTop: 10 },
    key: {
      width: "33.33%",
      aspectRatio: 1.7,
      alignItems: "center",
      justifyContent: "center",
      gap: 1,
    },
    keyMain: { color: c.text, fontSize: 27, fontWeight: "400", lineHeight: 30 },
    keySub: { color: c.dim, fontSize: 9.5, letterSpacing: 1.8, fontWeight: "600", height: 12 },

    callRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 24,
      marginTop: 6,
    },
    sideAction: { width: 64, alignItems: "center", gap: 5 },
    sideTile: {
      width: CONTROL_H - 2,
      height: CONTROL_H - 2,
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    sideLabel: { color: c.muted, fontSize: 11 },
    callBtn: {
      width: 66,
      height: 66,
      borderRadius: 33,
      backgroundColor: c.success,
      alignItems: "center",
      justifyContent: "center",
    },

    sectionCaps: {
      color: c.dim,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 1.3,
      marginTop: 20,
      marginBottom: 10,
    },
    inCallRow: { flexDirection: "row", gap: 8 },
    inCallTile: {
      flex: 1,
      alignItems: "center",
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 6,
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      opacity: 0.55,
    },
    tile34: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    inCallLabel: { color: c.muted, fontSize: 11, textAlign: "center" },
    inCallNote: { color: c.dim, fontSize: 11.5, marginTop: 8 },

    sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: c.overlay },
    sheet: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      maxHeight: "85%",
      backgroundColor: c.bgElev,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 20,
      borderWidth: 1,
      borderColor: c.border,
    },
    sheetHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.borderStrong,
      alignSelf: "center",
      marginBottom: 12,
    },
    sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    sheetTitle: { color: c.text, fontSize: 18, fontWeight: "700" },
    sheetSearch: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      height: CONTROL_H,
      marginTop: 12,
      paddingHorizontal: 13,
      borderRadius: 10,
      backgroundColor: c.input,
      borderWidth: 1,
      borderColor: c.border,
    },
    sheetSearchInput: { flex: 1, color: c.text, fontSize: 14 },
    sheetRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.borderSoft,
    },
    sheetRowName: { flex: 1, color: c.text, fontSize: 14 },
    sheetRowCode: { color: c.primary, fontSize: 14, fontWeight: "700" },
  });
