// Forgot password — implements the design's "Reset your password" frame.
//
// REAL endpoint: POST /backend/auth/forgot-password.php. It deliberately
// answers the same way whether or not the address has an account, so this
// screen shows one neutral confirmation and never reveals which emails exist.
//
// The link lifetime shown here matches what the backend actually sets
// (DATE_ADD(NOW(), INTERVAL 1 HOUR)) rather than the placeholder in the mock.
import React, { useState, useMemo } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { type Palette } from "@/src/theme";
import { useTheme } from "@/src/theme/ThemeContext";
import { passwordResetApi } from "@/src/api";

export default function ForgotPassword() {
  const { colors, isDark } = useTheme();
  const s = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (!email.trim()) {
      setErr("Please enter your email address");
      return;
    }
    setBusy(true);
    const r = await passwordResetApi.request(email.trim());
    setBusy(false);
    if (r.ok) setSent(true);
    else setErr(r.message);
  };

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
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()} testID="fp-back">
              <Ionicons name="chevron-back" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={s.head}>
            <View style={s.lockBox}>
              <Ionicons name="lock-open-outline" size={30} color={colors.yellow} />
            </View>
            <Text style={s.title}>Reset your password</Text>
            <Text style={s.sub}>
              Enter the email on your Depth Route account and we&apos;ll send a reset
              link. The link expires in 1 hour.
            </Text>
          </View>

          <View style={s.card}>
            <View style={[s.field, !!email && s.fieldFocus]}>
              <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
              <TextInput
                style={s.input}
                placeholder="Email address"
                placeholderTextColor={colors.textDim}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!sent}
                testID="fp-email"
              />
            </View>

            {!!err && <Text style={s.error} testID="fp-error">{err}</Text>}

            <TouchableOpacity
              style={[s.primaryBtn, (busy || sent) && { opacity: 0.6 }]}
              onPress={submit}
              disabled={busy || sent}
              testID="fp-submit"
            >
              {busy
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.primaryText}>Send reset link</Text>}
            </TouchableOpacity>
          </View>

          {sent && (
            <View style={s.successBox} testID="fp-sent">
              <Ionicons name="checkmark-circle-outline" size={18} color={colors.green} />
              <Text style={s.successText}>
                If an account exists for that address, the link is on its way.
              </Text>
            </View>
          )}

          <View style={{ flex: 1, minHeight: 24 }} />

          <TouchableOpacity
            style={s.ghostBtn}
            onPress={() => router.replace("/login")}
            testID="fp-back-to-signin"
          >
            <Text style={s.ghostText}>Back to sign in</Text>
          </TouchableOpacity>
          <Text style={s.footer}>Need help? support@depthroute.com</Text>
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

  head: { gap: 14, marginBottom: 28 },
  lockBox: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: c.card,
    borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center",
  },
  title: { color: c.text, fontSize: 26, fontWeight: "700", letterSpacing: -0.4 },
  sub: { color: c.textMuted, fontSize: 14, lineHeight: 21 },

  card: {
    backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
    borderRadius: 20, padding: 20,
    ...(dark ? null : {
      shadowColor: "#0F1A30", shadowOpacity: 0.07, shadowRadius: 30,
      shadowOffset: { width: 0, height: 10 }, elevation: 3,
    }),
  },
  field: {
    flexDirection: "row", alignItems: "center", gap: 10, height: 52,
    backgroundColor: c.bgAlt, borderWidth: 1, borderColor: c.border,
    borderRadius: 12, paddingHorizontal: 14,
  },
  fieldFocus: { borderColor: c.primary },
  input: { flex: 1, color: c.text, fontSize: 15, padding: 0 },
  error: { color: c.red, fontSize: 13, marginTop: 12 },

  primaryBtn: {
    height: 52, borderRadius: 12, backgroundColor: c.primary,
    alignItems: "center", justifyContent: "center", marginTop: 16,
  },
  primaryText: { color: c.onPrimary, fontSize: 16, fontWeight: "700" },

  successBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 16,
    padding: 14, borderRadius: 14,
    backgroundColor: dark ? "rgba(15,59,34,0.55)" : "rgba(22,163,74,0.07)", borderWidth: 1,
    borderColor: dark ? "rgba(34,197,94,0.3)" : "rgba(22,163,74,0.30)",
  },
  successText: { color: c.green, fontSize: 12.5, lineHeight: 19, flex: 1 },

  ghostBtn: {
    height: 52, borderRadius: 12, borderWidth: 1, borderColor: c.border,
    backgroundColor: c.card, alignItems: "center", justifyContent: "center",
  },
  ghostText: { color: c.text, fontSize: 15, fontWeight: "600" },
  footer: { textAlign: "center", color: c.textDim, fontSize: 12, marginTop: 18 },
  });
}
