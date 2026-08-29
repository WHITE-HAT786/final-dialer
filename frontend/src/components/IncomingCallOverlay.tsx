import React, { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSipEngine } from "@/src/sip/SipEngineContext";
import { useTheme, useThemedStyles, type Palette } from "@/src/theme";

/**
 * Full-screen modal that appears when a NEW incoming SIP call arrives (state=ringing, direction=incoming).
 * Answer -> navigates to /call, Decline -> hangs up.
 */
export default function IncomingCallOverlay() {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const engine = useSipEngine();
  const router = useRouter();
  const incoming = engine.calls.find(
    (call) => call.direction === "incoming" && (call.state === "ringing" || call.state === "connecting"),
  );

  const pulse = React.useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!incoming) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.2, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [incoming, pulse]);

  if (!incoming) return null;

  const remote = (incoming.remote || "").replace(/^sip:/, "").split("@")[0] || "Unknown";
  const name = incoming.remoteName || remote;
  const initials = (name || "?").split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";

  const answer = () => {
    engine.answer(incoming.id);
    router.push({ pathname: "/call", params: { callId: incoming.id, number: remote, name } });
  };
  const decline = () => engine.hangup(incoming.id);

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.wrap} testID="incoming-call-overlay">
        <Text style={styles.tag}>Incoming call</Text>
        <Animated.View style={[styles.avatar, { transform: [{ scale: pulse }] }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </Animated.View>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.number}>{remote}</Text>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, { backgroundColor: c.red }]} onPress={decline} testID="incoming-decline">
            <Ionicons name="call" size={28} color="#fff" style={{ transform: [{ rotate: "135deg" }] }} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: c.green }]} onPress={answer} testID="incoming-answer">
            <Ionicons name="call" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    wrap: { flex: 1, backgroundColor: c.bg, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
    tag: { color: c.textMuted, textTransform: "uppercase", letterSpacing: 2, fontSize: 12, marginBottom: 30 },
    avatar: { width: 140, height: 140, borderRadius: 70, backgroundColor: c.primaryDim, alignItems: "center", justifyContent: "center" },
    avatarText: { color: c.text, fontSize: 46, fontWeight: "700" },
    name: { color: c.text, fontSize: 28, fontWeight: "700", marginTop: 24 },
    number: { color: c.textMuted, fontSize: 15, marginTop: 4 },
    actions: { flexDirection: "row", gap: 60, marginTop: 80 },
    btn: { width: 74, height: 74, borderRadius: 37, alignItems: "center", justifyContent: "center" },
  });
