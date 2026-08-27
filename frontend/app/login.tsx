// Sign in — implements the "DepthRoute Mobile Auth" design in BOTH themes.
//
// The rotating dot-globe sits behind the header and is faded out by a gradient
// so the card stays legible. Auth itself is unchanged: loginEmail() -> app
// token -> SipAuthBridge -> automatic extension bootstrap. A 2FA challenge
// hands off to the dedicated verify screen rather than swapping this form out.
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { spacing, type Palette } from "@/src/theme";
import { useTheme } from "@/src/theme/ThemeContext";
import { useAuth } from "@/src/AuthContext";
import { BrandMark } from "@/src/components/BrandMark";
import DepthGlobe from "@/src/components/DepthGlobe";
import GoogleButton from "@/src/components/GoogleButton";

export default function Login() {
  const router = useRouter();
  const { colors, theme, isDark, toggle } = useTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const { loginEmail, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (user) router.replace("/(tabs)/dashboard");
  }, [user, router]);

  const onSubmit = async () => {
    setErr(null);
    if (!email.trim() || !password.trim()) {
      setErr("Please enter email and password");
      return;
    }
    setBusy(true);
    try {
      const res = await loginEmail(email.trim(), password);
      if (res.status === "2fa") {
        router.push({
          pathname: "/verify-2fa",
          params: { challenge: res.challenge, method: res.method, account: email.trim() },
        });
      } else {
        router.replace("/(tabs)/dashboard");
      }
    } catch (e: any) {
      setErr(e?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  // The gradient dissolves the globe into the page, matching each theme's bg.
  const fade: [string, string, string] = isDark
    ? ["rgba(5,11,26,0.15)", "rgba(5,11,26,0.72)", colors.bg]
    : ["rgba(244,246,251,0.10)", "rgba(244,246,251,0.80)", colors.bg];

  return (
    <SafeAreaView style={s.wrap} edges={["top", "bottom"]}>
      <View style={s.globeWrap} pointerEvents="none">
        <DepthGlobe size={540} theme={theme} accent={colors.primary} dots={320} />
      </View>
      <LinearGradient
        colors={fade}
        locations={[0, 0.42, isDark ? 0.68 : 0.66]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Theme switch — the design ships dark and light; let people pick. */}
      <TouchableOpacity
        style={[s.themeBtn, { top: insets.top + 8 }]}
        onPress={toggle}
        testID="login-theme-toggle"
        accessibilityRole="button"
        accessibilityLabel="Switch theme"
        hitSlop={10}
      >
        <Ionicons
          name={isDark ? "sunny-outline" : "moon-outline"}
          size={18}
          color={colors.textMuted}
        />
      </TouchableOpacity>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={s.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.brandCol}>
            <BrandMark size={64} theme={theme} />
            <Text style={s.brand}>Depth Route Dialer</Text>
            <Text style={s.tagline}>VoIP • SIP • SMS • Reports</Text>
          </View>

          <View style={s.card} testID="login-card">
            <Text style={s.title}>Welcome back</Text>
            <Text style={s.help}>Sign in to continue to your dashboard</Text>

            <View style={s.fields}>
              <View style={s.field}>
                <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
                <TextInput
                  style={s.input}
                  placeholder="Email"
                  placeholderTextColor={colors.textDim}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  testID="login-email"
                />
              </View>

              <View style={[s.field, s.fieldFocus]}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
                <TextInput
                  style={s.input}
                  placeholder="Password"
                  placeholderTextColor={colors.textDim}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPw}
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="login-password"
                />
                <TouchableOpacity onPress={() => setShowPw((v) => !v)} testID="login-toggle-pw" hitSlop={8}>
                  <Ionicons
                    name={showPw ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={s.forgotRow}
              onPress={() => router.push("/forgot-password")}
              testID="login-forgot"
            >
              <Text style={s.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            {!!err && <Text style={s.error} testID="login-error">{err}</Text>}

            <TouchableOpacity
              style={[s.primaryBtn, busy && { opacity: 0.7 }]}
              onPress={onSubmit}
              disabled={busy}
              testID="login-submit-button"
            >
              {busy
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.primaryText}>Sign In</Text>}
            </TouchableOpacity>

            {/* Design's Google frame. No OAuth client exists yet, so it says
                so when tapped rather than faking a sign-in. */}
            <GoogleButton onUnavailable={setErr} testID="login-google" />

            <View style={s.notice}>
              <Ionicons name="information-circle" size={16} color={colors.primary} />
              <Text style={s.noticeText}>Sign in with your Depth Route Dialer account</Text>
            </View>
          </View>

          <View style={{ flex: 1, minHeight: 24 }} />

          <TouchableOpacity
            style={s.signupRow}
            onPress={() => router.push("/signup")}
            testID="login-goto-signup"
          >
            <Text style={s.signupMuted}>New here? </Text>
            <Text style={s.signupLink}>Create an account</Text>
          </TouchableOpacity>

          <Text style={s.version}>v2.5.0 • © Depth Route</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(c: Palette, dark: boolean) {
  return StyleSheet.create({
    wrap: { flex: 1, backgroundColor: c.bg },
    globeWrap: { position: "absolute", top: -40, left: -70, width: 540, height: 540 },
    container: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 48, paddingBottom: 32 },

    themeBtn: {
      position: "absolute", right: 18, zIndex: 10,
      width: 38, height: 38, borderRadius: 19,
      alignItems: "center", justifyContent: "center",
      backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
    },

    brandCol: { alignItems: "center", gap: 14, marginBottom: 34 },
    brand: { color: c.text, fontSize: 26, fontWeight: "700", letterSpacing: -0.4 },
    tagline: { color: c.textDim, fontSize: 12, letterSpacing: 0.4 },

    card: {
      backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
      borderRadius: 20, padding: 20,
      // The light frames carry a soft lift; the dark ones are flat.
      ...(dark ? null : {
        shadowColor: "#0F1A30", shadowOpacity: 0.07,
        shadowRadius: 30, shadowOffset: { width: 0, height: 10 }, elevation: 3,
      }),
    },
    title: { color: c.text, fontSize: 22, fontWeight: "700" },
    help: { color: c.textMuted, fontSize: 13, marginTop: 6, marginBottom: 20 },

    fields: { gap: 12 },
    field: {
      flexDirection: "row", alignItems: "center", gap: 10, height: 52,
      backgroundColor: c.bgAlt, borderWidth: 1, borderColor: c.border,
      borderRadius: 12, paddingHorizontal: 14,
    },
    fieldFocus: { borderColor: c.primary },
    input: { flex: 1, color: c.text, fontSize: 15, padding: 0 },

    forgotRow: { alignSelf: "flex-end", marginTop: 12 },
    forgotText: { color: c.primary, fontSize: 13, fontWeight: "600" },

    error: { color: c.red, fontSize: 13, marginTop: 12 },

    primaryBtn: {
      height: 52, borderRadius: 12, backgroundColor: c.primary,
      alignItems: "center", justifyContent: "center", marginTop: 16,
    },
    primaryText: { color: c.onPrimary, fontSize: 16, fontWeight: "700" },

    notice: {
      flexDirection: "row", alignItems: "center", gap: 8, marginTop: 20,
      padding: 12, borderRadius: 10,
      backgroundColor: dark ? "rgba(31,58,107,0.31)" : "rgba(47,128,237,0.07)",
      borderWidth: 1,
      borderColor: dark ? "rgba(47,128,237,0.25)" : "rgba(47,128,237,0.28)",
    },
    noticeText: { color: c.primary, fontSize: 12, fontWeight: "600", flex: 1 },

    signupRow: { flexDirection: "row", justifyContent: "center", marginTop: spacing.lg },
    signupMuted: { color: c.textDim, fontSize: 13 },
    signupLink: { color: c.primary, fontSize: 13, fontWeight: "600" },
    version: { textAlign: "center", color: c.textDim, fontSize: 12, marginTop: 18 },
  });
}
