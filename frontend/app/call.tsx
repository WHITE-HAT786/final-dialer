import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Modal, Pressable, TextInput } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useMultiSip } from "@/src/sip/MultiSipContext";
import { colors } from "@/src/theme";

function fmt(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function CallScreen() {
  const params = useLocalSearchParams<{ number?: string; name?: string; callId?: string; accountId?: string }>();
  const router = useRouter();
  const multi = useMultiSip();

  const [callId, setCallId] = useState<string | null>(params.callId || null);
  const [ownerAccountId, setOwnerAccountId] = useState<string | null>(params.accountId || null);
  const [keypadOpen, setKeypadOpen] = useState(false);
  const [dtmf, setDtmf] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState("");
  const [transferInfo, setTransferInfo] = useState<string | null>(null);

  // Simulation state (used when no real call is placed)
  const [simSeconds, setSimSeconds] = useState(0);
  const [simState, setSimState] = useState<"dialing" | "ringing" | "connected" | "ended" | "failed">("dialing");

  const pulse = useRef(new Animated.Value(1)).current;
  const dialingRef = useRef(false);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.3, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  // Place a call if we weren't handed a callId (e.g. from Contacts or Recent Calls).
  useEffect(() => {
    (async () => {
      if (callId || dialingRef.current) return;
      const number = params.number || "";
      if (!number) return;
      dialingRef.current = true;

      const sel = multi.selectedAccount;
      if (!sel) {
        setSimState("failed");
        setError("No SIP account selected — add one in SIP Accounts.");
        return;
      }
      const res = await multi.call(number, sel.id);
      if (res.error) {
        setError(res.error);
        // Kick off simulation as visual fallback
        const t1 = setTimeout(() => setSimState("ringing"), 900);
        const t2 = setTimeout(() => setSimState("failed"), 2500);
        return () => { clearTimeout(t1); clearTimeout(t2); };
      }
      setCallId(res.callId);
      setOwnerAccountId(res.accountId);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Simulation timer
  useEffect(() => {
    if (callId) return;
    if (simState !== "connected") return;
    const iv = setInterval(() => setSimSeconds((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, [simState, callId]);

  // Find live call across engines
  const owner = useMemo(() => {
    if (!callId) return null;
    return multi.findCallOwner(callId);
  }, [callId, multi]);
  const liveCall = useMemo(() => owner?.calls.find((c) => c.id === callId) || null, [owner, callId]);

  const isReal = !!liveCall;
  const state = isReal ? liveCall!.state : simState;
  const durationSec = isReal ? liveCall!.durationSec : simSeconds;
  const muted = isReal ? liveCall!.muted : false;
  const held = isReal ? liveCall!.onHold : false;

  // Latch the failure cause into error so it stays visible
  useEffect(() => {
    if (isReal && liveCall && liveCall.state === "failed" && liveCall.cause) {
      setError(`Call failed: ${liveCall.cause}`);
    }
  }, [isReal, liveCall]);

  const account = ownerAccountId
    ? multi.accounts.find((a) => a.id === ownerAccountId)
    : multi.selectedAccount;

  const number = params.number || (liveCall?.remote || "").replace(/^sip:/, "").split("@")[0] || "Unknown";
  const name = params.name || liveCall?.remoteName || "Unknown";
  const initials = ((name && name !== "Unknown" ? name : number) || "?")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

  const stateLabel =
    state === "dialing" ? "Dialing…" :
    state === "ringing" ? "Ringing…" :
    state === "connecting" ? "Connecting…" :
    state === "connected" ? (held ? "On Hold" : fmt(durationSec)) :
    state === "held" ? "On Hold" :
    state === "ended" ? "Call Ended" :
    state === "failed" ? `Failed${liveCall?.cause ? ` (${liveCall.cause})` : ""}` :
    "Idle";

  useEffect(() => {
    if (["ended", "failed"].includes(state)) {
      const t = setTimeout(() => router.back(), 1600);
      return () => clearTimeout(t);
    }
  }, [state, router]);

  const hangup = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    if (callId) multi.hangup(callId);
    else setSimState("ended");
  };
  const toggleMute = () => { if (callId) multi.setMute(callId, !muted); };
  const toggleHold = () => { if (callId) multi.setHold(callId, !held); };
  const sendDtmf = (t: string) => {
    Haptics.selectionAsync().catch(() => {});
    setDtmf((d) => (d + t).slice(-16));
    if (callId) multi.sendDTMF(callId, t);
  };

  const viaName = account?.displayName || account?.username || "No SIP account";
  const viaId = account?.callerId || (account ? `${account.username}@${account.domain}` : "");
  const viaColor = owner?.status === "registered" ? colors.green : (account?.color as string) || colors.textMuted;

  return (
    <SafeAreaView style={styles.wrap} edges={["top", "bottom"]}>
      <View style={styles.headerRow}>
        <View style={styles.sipChip}>
          <View style={[styles.sipDot, { backgroundColor: viaColor }]} />
          <Text style={styles.sipChipText} numberOfLines={1}>{viaName}</Text>
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
              { transform: [{ scale: pulse }], opacity: state === "connected" || state === "held" ? 0 : 0.4 },
            ]}
          />
          <View style={styles.avatar} testID="call-avatar">
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>
        <Text style={styles.name} testID="call-name">{name}</Text>
        <Text style={styles.number} testID="call-number">{number}</Text>
        <View style={styles.stateRow}>
          <View style={[styles.stateDot, {
            backgroundColor: state === "connected" ? colors.green : state === "failed" ? colors.red : colors.yellow,
          }]} />
          <Text style={styles.state} testID="call-state">{stateLabel}</Text>
        </View>

        <View style={styles.viaCard} testID="call-via-card">
          <MaterialCommunityIcons name="server-network" size={18} color={viaColor} />
          <View style={{ flex: 1 }}>
            <Text style={styles.viaLabel}>
              {isReal ? "Calling via SIP" : owner ? "Placing call…" : (error ? "Call not placed" : "Placing call…")}
            </Text>
            <Text style={styles.viaName} numberOfLines={1}>{viaName}</Text>
          </View>
          <Text style={styles.viaDid} numberOfLines={1}>{viaId}</Text>
        </View>

        {error && (
          <View style={styles.errorBanner} testID="call-error-banner">
            <Ionicons name="alert-circle" size={18} color={colors.red} />
            <Text style={styles.errorText} numberOfLines={5}>{error}</Text>
          </View>
        )}

        {keypadOpen && (
          <View style={styles.dtmfBox}>
            <Text style={styles.dtmfDigits}>{dtmf || " "}</Text>
            <View style={styles.dtmfGrid}>
              {["1","2","3","4","5","6","7","8","9","*","0","#"].map((k) => (
                <TouchableOpacity key={k} style={styles.dtmfKey} onPress={() => sendDtmf(k)} testID={`call-dtmf-${k}`}>
                  <Text style={styles.dtmfText}>{k}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      <View style={styles.actionsGrid}>
        <ActionBtn active={muted} icon="mic-off" label="Mute" onPress={toggleMute} testID="call-btn-mute" />
        <ActionBtn active={keypadOpen} icon="keypad" label="Keypad" onPress={() => setKeypadOpen((k) => !k)} testID="call-btn-keypad" />
        <ActionBtn icon="volume-high" label="Speaker" onPress={() => {}} testID="call-btn-speaker" />
        <ActionBtn icon="swap-horizontal" label="Transfer" onPress={() => setTransferOpen(true)} testID="call-btn-transfer" />
        <ActionBtn active={held} icon="pause" label={held ? "Resume" : "Hold"} onPress={toggleHold} testID="call-btn-hold" />
        <ActionBtn icon="videocam" label="Video" onPress={() => {}} testID="call-btn-video" />
      </View>

      <TouchableOpacity style={styles.hangup} onPress={hangup} testID="call-hangup">
        <Ionicons name="call" size={30} color="#fff" style={{ transform: [{ rotate: "135deg" }] }} />
      </TouchableOpacity>

      {/* Transfer modal */}
      <Modal visible={transferOpen} transparent animationType="slide" onRequestClose={() => setTransferOpen(false)}>
        <Pressable style={styles.tBackdrop} onPress={() => setTransferOpen(false)} />
        <View style={styles.tSheet} testID="transfer-sheet">
          <View style={styles.tHandle} />
          <Text style={styles.tTitle}>Blind Transfer</Text>
          <Text style={styles.tHelp}>Send the current call to another extension or number.</Text>
          <TextInput
            style={styles.tInput}
            value={transferTarget}
            onChangeText={setTransferTarget}
            placeholder="Extension or number"
            placeholderTextColor={colors.textDim}
            autoCapitalize="none"
            keyboardType="phone-pad"
            testID="transfer-input"
          />
          {transferInfo && <Text style={styles.tInfo}>{transferInfo}</Text>}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <TouchableOpacity style={styles.tCancel} onPress={() => { setTransferOpen(false); setTransferInfo(null); }} testID="transfer-cancel">
              <Text style={{ color: "#fff", fontWeight: "600" }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tGo}
              onPress={() => {
                setTransferInfo(null);
                if (!transferTarget.trim()) { setTransferInfo("Enter a target first"); return; }
                if (!callId) { setTransferInfo("Transfer requires a live SIP call"); return; }
                const ok = multi.transfer(callId, transferTarget.trim());
                if (ok) {
                  setTransferInfo(`REFER sent to ${transferTarget.trim()}`);
                  setTimeout(() => { setTransferOpen(false); setTransferInfo(null); setTransferTarget(""); }, 1200);
                } else {
                  setTransferInfo("Transfer failed — see SIP log");
                }
              }}
              testID="transfer-go"
            >
              <Ionicons name="swap-horizontal" size={16} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "700" }}>Transfer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  viaCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, borderRadius: 12, padding: 12, marginTop: 20, borderWidth: 1, borderColor: colors.border, width: "100%" },
  viaLabel: { color: colors.textMuted, fontSize: 11 },
  viaName: { color: "#fff", fontSize: 14, fontWeight: "700", marginTop: 2 },
  viaDid: { color: colors.primary, fontSize: 12, fontWeight: "600", maxWidth: 130 },
  errorBanner: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: colors.redDim + "90", borderWidth: 1, borderColor: colors.red + "60", borderRadius: 12, padding: 12, marginTop: 12, width: "100%" },
  errorText: { flex: 1, color: colors.red, fontSize: 12, fontWeight: "600" },
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
  tBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  tSheet: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#0C1526", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 30, borderWidth: 1, borderColor: colors.border },
  tHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 12 },
  tTitle: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 4 },
  tHelp: { color: colors.textMuted, fontSize: 12, marginBottom: 14 },
  tInput: { backgroundColor: colors.bgAlt, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, color: "#fff", fontSize: 15, borderWidth: 1, borderColor: colors.border },
  tInfo: { color: colors.yellow, fontSize: 12, marginTop: 10 },
  tCancel: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.card, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  tGo: { flex: 1.2, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.primary, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 },
});
