import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useSip } from "@/src/SipContext";
import { colors } from "@/src/theme";

type CallState = "dialing" | "ringing" | "connected" | "ended";

function fmt(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function CallScreen() {
  const params = useLocalSearchParams<{ number?: string; name?: string }>();
  const router = useRouter();
  const { selected } = useSip();

  const [state, setState] = useState<CallState>("dialing");
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [held, setHeld] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const [keypadOpen, setKeypadOpen] = useState(false);
  const [dtmf, setDtmf] = useState("");

  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.3, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => setState("ringing"), 900);
    const t2 = setTimeout(() => setState("connected"), 2800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    if (state !== "connected" || held) return;
    const iv = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, [state, held]);

  const hangup = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    setState("ended");
    setTimeout(() => router.back(), 900);
  };

  const number = params.number || "+1 555-000-0000";
  const name = params.name || "Unknown";
  const initials = (name || number).split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";

  const stateLabel = state === "dialing" ? "Dialing…" : state === "ringing" ? "Ringing…" : state === "connected" ? (held ? "On Hold" : fmt(seconds)) : "Call Ended";

  return (
    <SafeAreaView style={styles.wrap} edges={["top", "bottom"]}>
      <View style={styles.headerRow}>
        <View style={styles.sipChip}>
          <View style={[styles.sipDot, { backgroundColor: selected.color }]} />
          <Text style={styles.sipChipText} numberOfLines={1}>{selected.name}</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} testID="call-minimize">
          <Ionicons name="chevron-down" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.centerCol}>
        <View style={{ alignItems: "center", position: "relative" }}>
          <Animated.View
            style={[
              styles.pulseRing,
              { transform: [{ scale: pulse }], opacity: state === "connected" ? 0 : 0.4 },
            ]}
          />
          <View style={styles.avatar} testID="call-avatar">
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>
        <Text style={styles.name} testID="call-name">{name}</Text>
        <Text style={styles.number} testID="call-number">{number}</Text>
        <View style={styles.stateRow}>
          <View style={[styles.stateDot, { backgroundColor: state === "connected" ? colors.green : colors.yellow }]} />
          <Text style={styles.state} testID="call-state">{stateLabel}</Text>
        </View>

        <View style={styles.viaCard} testID="call-via-card">
          <MaterialCommunityIcons name="server-network" size={18} color={selected.color} />
          <View style={{ flex: 1 }}>
            <Text style={styles.viaLabel}>Calling via</Text>
            <Text style={styles.viaName}>{selected.name}</Text>
          </View>
          <Text style={styles.viaDid}>{selected.did}</Text>
        </View>

        {keypadOpen && (
          <View style={styles.dtmfBox}>
            <Text style={styles.dtmfDigits}>{dtmf || " "}</Text>
            <View style={styles.dtmfGrid}>
              {["1","2","3","4","5","6","7","8","9","*","0","#"].map((k) => (
                <TouchableOpacity
                  key={k}
                  style={styles.dtmfKey}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setDtmf((d) => (d + k).slice(-16));
                  }}
                  testID={`call-dtmf-${k}`}
                >
                  <Text style={styles.dtmfText}>{k}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      <View style={styles.actionsGrid}>
        <ActionBtn active={muted} icon="mic-off" label="Mute" onPress={() => setMuted((m) => !m)} testID="call-btn-mute" />
        <ActionBtn active={keypadOpen} icon="keypad" label="Keypad" onPress={() => setKeypadOpen((k) => !k)} testID="call-btn-keypad" />
        <ActionBtn active={speaker} icon="volume-high" label="Speaker" onPress={() => setSpeaker((s) => !s)} testID="call-btn-speaker" />
        <ActionBtn icon="person-add" label="Add" onPress={() => {}} testID="call-btn-add" />
        <ActionBtn active={held} icon="pause" label={held ? "Resume" : "Hold"} onPress={() => setHeld((h) => !h)} testID="call-btn-hold" />
        <ActionBtn icon="videocam" label="Video" onPress={() => {}} testID="call-btn-video" />
      </View>

      <TouchableOpacity style={styles.hangup} onPress={hangup} testID="call-hangup">
        <Ionicons name="call" size={30} color="#fff" style={{ transform: [{ rotate: "135deg" }] }} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function ActionBtn({ active, icon, label, onPress, testID }: any) {
  return (
    <TouchableOpacity style={styles.actionItem} onPress={onPress} testID={testID}>
      <View style={[styles.actionBtn, active && styles.actionBtnActive]}>
        <Ionicons name={icon} size={22} color={active ? colors.bg : "#fff"} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  sipChip: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.card, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, flex: 1, marginRight: 12 },
  sipDot: { width: 8, height: 8, borderRadius: 4 },
  sipChipText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  centerCol: { flex: 1, alignItems: "center", justifyContent: "center" },
  pulseRing: { position: "absolute", width: 140, height: 140, borderRadius: 70, borderWidth: 2, borderColor: colors.primary },
  avatar: { width: 130, height: 130, borderRadius: 65, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 42, fontWeight: "700" },
  name: { color: "#fff", fontSize: 24, fontWeight: "700", marginTop: 24 },
  number: { color: colors.textMuted, fontSize: 15, marginTop: 4 },
  stateRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  stateDot: { width: 8, height: 8, borderRadius: 4 },
  state: { color: colors.textMuted, fontSize: 14 },
  viaCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, borderRadius: 12, padding: 12, marginTop: 24, borderWidth: 1, borderColor: colors.border, width: "100%" },
  viaLabel: { color: colors.textMuted, fontSize: 11 },
  viaName: { color: "#fff", fontSize: 14, fontWeight: "700", marginTop: 2 },
  viaDid: { color: colors.primary, fontSize: 12, fontWeight: "600" },
  dtmfBox: { marginTop: 20, width: "100%", padding: 12, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  dtmfDigits: { color: "#fff", fontSize: 22, textAlign: "center", letterSpacing: 4, minHeight: 30 },
  dtmfGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 8 },
  dtmfKey: { width: "30%", aspectRatio: 2.2, alignItems: "center", justifyContent: "center", backgroundColor: colors.bgAlt, borderRadius: 10, marginBottom: 8 },
  dtmfText: { color: "#fff", fontSize: 22, fontWeight: "600" },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingHorizontal: 8 },
  actionItem: { width: "31%", alignItems: "center", marginBottom: 18, gap: 6 },
  actionBtn: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.card, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  actionBtnActive: { backgroundColor: "#fff", borderColor: "#fff" },
  actionLabel: { color: "#fff", fontSize: 12 },
  hangup: { alignSelf: "center", width: 72, height: 72, borderRadius: 36, backgroundColor: colors.red, alignItems: "center", justifyContent: "center", marginBottom: 20 },
});
