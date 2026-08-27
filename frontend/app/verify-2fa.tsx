// Two-factor — implements the design's "Verify it's you" frame.
//
// Reached only when login.php answers with a 2FA challenge. The six cells are a
// presentation of one hidden input, so paste and hardware keyboards behave, and
// the code is submitted through the existing verify2fa() -> two-factor.php path.
// Nothing here weakens the challenge: without a valid code there is no token.
import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { spacing, type Palette } from "@/src/theme";
import { useTheme } from "@/src/theme/ThemeContext";
import { useAuth } from "@/src/AuthContext";

const LEN = 6;

export default function Verify2FA() {
  const { challenge, method, account } = useLocalSearchParams<{
    challenge?: string; method?: string; account?: string;
  }>();
  const { colors, isDark } = useTheme();
  const s = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const { verify2fa } = useAuth();
  const inputRef = useRef<TextInput>(null);

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, []);

  const submit = async (value: string) => {
    if (!challenge) {
      setErr("This verification session has expired. Please sign in again.");
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      await verify2fa(String(challenge), value);
      router.replace("/(tabs)/dashboard");
    } catch (e: any) {
      setErr(e?.message || "Verification failed");
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  const onChange = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, "").slice(0, LEN);
    setCode(digits);
    if (digits.length === LEN) void submit(digits);
  };

  const cells = Array.from({ length: LEN }, (_, i) => ({
    char: code[i] ?? "",
    active: i === code.length,
  }));

  return (
    <SafeAreaView style={s.wrap} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={s.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.backRow}>
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()} testID="tfa-back">
              <Ionicons name="chevron-back" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={s.head}>
            <View style={s.shield}>
              <MaterialCommunityIcons name="shield-check-outline" size={34} color={colors.primary} />
            </View>
            <Text style={s.title}>Verify it&apos;s you</Text>
            <Text style={s.sub}>
              {method === "email"
                ? "Enter the 6-digit code we emailed you to finish signing in."
                : "Enter the 6-digit code from your authenticator app to finish signing in."}
            </Text>
          </View>

          <View style={s.card}>
            {/* One hidden input drives six cells — paste and autofill still work. */}
            <TextInput
              ref={inputRef}
              value={code}
              onChangeText={onChange}
              keyboardType="number-pad"
              maxLength={LEN}
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              style={s.hiddenInput}
              testID="login-2fa-code"
            />

            <Pressable style={s.cells} onPress={() => inputRef.current?.focus()}>
              {cells.map((cell, i) => (
                <View
                  key={i}
                  style={[s.cell, (cell.char || cell.active) && s.cellOn]}
                  testID={`tfa-cell-${i}`}
                >
                  <Text style={s.cellText}>{cell.char}</Text>
                </View>
              ))}
            </Pressable>

            {!!err && <Text style={s.error} testID="tfa-error">{err}</Text>}

            <TouchableOpacity
              style={[s.primaryBtn, (busy || code.length < LEN) && { opacity: 0.6 }]}
              onPress={() => void submit(code)}
              disabled={busy || code.length < LEN}
              testID="tfa-verify"
            >
              {busy
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.primaryText}>Verify</Text>}
            </TouchableOpacity>

            <View style={s.resendRow}>
              <Text style={s.resendMuted}>Didn&apos;t get a code? </Text>
              <Text style={s.resendLink}>Resend</Text>
            </View>
          </View>

          <View style={{ flex: 1, minHeight: 24 }} />
          {!!account && (
            <Text style={s.footer} testID="tfa-account">Signed in as {account}</Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(c: Palette, dark: boolean) {
  return StyleSheet.create({
  wrap: { flex: 1, backgroundColor: c.bg },
  container: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32 },

  backRow: { height: 44, justifyContent: "center", marginBottom: 20 },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: c.border,
    backgroundColor: c.card, alignItems: "center", justifyContent: "center",
  },

  head: { alignItems: "center", gap: 18, marginBottom: 30 },
  shield: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: dark ? "rgba(31,58,107,0.45)" : "rgba(47,128,237,0.09)", borderWidth: 1,
    borderColor: dark ? "rgba(47,128,237,0.4)" : "rgba(47,128,237,0.30)", alignItems: "center", justifyContent: "center",
  },
  title: { color: c.text, fontSize: 24, fontWeight: "700", letterSpacing: -0.3 },
  sub: {
    color: c.textMuted, fontSize: 14, textAlign: "center",
    lineHeight: 21, maxWidth: 280,
  },

  card: {
    backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
    borderRadius: 20, padding: 20,
    ...(dark ? null : {
      shadowColor: "#0F1A30", shadowOpacity: 0.07, shadowRadius: 30,
      shadowOffset: { width: 0, height: 10 }, elevation: 3,
    }),
  },
  hiddenInput: { position: "absolute", opacity: 0, height: 1, width: 1 },
  cells: { flexDirection: "row", gap: 8 },
  cell: {
    flex: 1, height: 56, borderRadius: 12, backgroundColor: c.bgAlt,
    borderWidth: 1, borderColor: c.border,
    alignItems: "center", justifyContent: "center",
  },
  cellOn: { borderColor: c.primary },
  cellText: { color: c.text, fontSize: 22, fontWeight: "700" },

  error: { color: c.red, fontSize: 13, marginTop: 14 },

  primaryBtn: {
    height: 52, borderRadius: 12, backgroundColor: c.primary,
    alignItems: "center", justifyContent: "center", marginTop: 20,
  },
  primaryText: { color: c.onPrimary, fontSize: 16, fontWeight: "700" },

  resendRow: { flexDirection: "row", justifyContent: "center", marginTop: 18 },
  resendMuted: { color: c.textMuted, fontSize: 13 },
  resendLink: { color: c.primary, fontSize: 13, fontWeight: "600" },

  footer: { textAlign: "center", color: c.textDim, fontSize: 12, marginTop: spacing.lg },
  });
}
