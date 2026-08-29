import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { colors } from "@/src/theme";
import { useAuth } from "@/src/AuthContext";
import { BrandMark } from "@/src/components/BrandMark";
import { GoogleSignInButton, googleNativeConfigured } from "@/src/components/GoogleSignInButton";

// The web password-reset lives on the portal; the app opens it in a browser
// rather than duplicating a reset flow the app API does not expose.
const FORGOT_PASSWORD_URL = "https://depthroute.com/login";

export default function Login() {
  const router = useRouter();
  const { loginEmail, verify2fa, loginGoogle, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // 2FA: set once the password step reports a challenge.
  const [twoFA, setTwoFA] = useState<{ challenge: string; method: string } | null>(null);
  const [code, setCode] = useState("");

  useEffect(() => {
    if (user) router.replace("/(tabs)/dashboard");
  }, [user]);

  // --- Google sign-in ---
  // The Google OAuth hook lives in <GoogleSignInButton>, which is only mounted
  // when a native Android client id is configured (expo-auth-session throws on
  // Android otherwise). This callback receives the verified id token + nonce.
  const handleGoogleToken = (idToken: string, nonce: string) => {
    setErr(null);
    setBusy(true);
    loginGoogle(idToken, nonce)
      .then(() => router.replace("/(tabs)/dashboard"))
      .catch((e: any) => setErr(e?.message || "Google sign-in failed."))
      .finally(() => setBusy(false));
  };

  const onEmailLogin = async () => {
    setErr(null);
    if (!email.trim() || !password.trim()) {
      setErr("Please enter email and password");
      return;
    }
    setBusy(true);
    try {
      const res = await loginEmail(email.trim(), password);
      if (res.status === "2fa") {
        setTwoFA({ challenge: res.challenge, method: res.method });
      } else {
        router.replace("/(tabs)/dashboard");
      }
    } catch (e: any) {
      setErr(e.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  const onVerify2fa = async () => {
    setErr(null);
    if (!twoFA || !code.trim()) {
      setErr("Enter the verification code");
      return;
    }
    setBusy(true);
    try {
      await verify2fa(twoFA.challenge, code.trim());
      router.replace("/(tabs)/dashboard");
    } catch (e: any) {
      setErr(e.message || "Verification failed");
    } finally {
      setBusy(false);
    }
  };

  const onForgot = () => { WebBrowser.openBrowserAsync(FORGOT_PASSWORD_URL).catch(() => {}); };
  // Honest fallback when this build has no native Android Google client id:
  // show the button but say so instead of faking a session or crashing.
  // Real flow (when configured): <GoogleSignInButton> -> Google ID token
  // (+nonce) -> POST /backend/api/app/google.php -> app session.
  const onGoogleUnavailable = () => {
    setErr("Google sign-in isn't configured for this build yet.");
  };

  return (
    <SafeAreaView style={styles.wrap} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.brandCol}>
            <BrandMark size={72} theme="dark" style={{ marginBottom: 16 }} />
            <Text style={styles.brand}>Depth Route Dialer</Text>
            <Text style={styles.sub}>VoIP • SIP • SMS • Reports</Text>
          </View>

          {/* Card */}
          <View style={styles.card} testID="login-card">
            <Text style={styles.h1}>Welcome back</Text>
            <Text style={styles.help}>Sign in to continue to your dashboard</Text>

            <View style={styles.field}>
              <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={colors.textDim}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                testID="login-email"
              />
            </View>

            <View style={styles.field}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.textDim}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
                testID="login-password"
              />
              <TouchableOpacity onPress={() => setShowPw((s) => !s)} testID="login-toggle-pw">
                <Ionicons
                  name={showPw ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            {!twoFA && (
              <TouchableOpacity onPress={onForgot} style={{ alignSelf: "flex-end", marginBottom: 8 }} testID="login-forgot">
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            {twoFA && (
              <View style={styles.field}>
                <Ionicons name="shield-checkmark-outline" size={18} color={colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder={twoFA.method === "email" ? "Email code" : "Authenticator code"}
                  placeholderTextColor={colors.textDim}
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  autoFocus
                  testID="login-2fa-code"
                />
              </View>
            )}

            {err && (
              <Text style={styles.error} testID="login-error">
                {err}
              </Text>
            )}

            <TouchableOpacity
              style={[styles.primary, busy && { opacity: 0.7 }]}
              onPress={twoFA ? onVerify2fa : onEmailLogin}
              disabled={busy}
              testID="login-submit-button"
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryText}>{twoFA ? "Verify" : "Sign In"}</Text>
              )}
            </TouchableOpacity>

            {!twoFA && (
              <>
                <View style={styles.dividerRow}>
                  <View style={styles.hair} />
                  <Text style={styles.orText}>or</Text>
                  <View style={styles.hair} />
                </View>
                {googleNativeConfigured ? (
                  <GoogleSignInButton onToken={handleGoogleToken} onError={setErr} disabled={busy} />
                ) : (
                  <TouchableOpacity style={styles.google} onPress={onGoogleUnavailable} testID="login-google">
                    <Ionicons name="logo-google" size={18} color="#0F1A30" />
                    <Text style={styles.googleText}>Continue with Google</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          <Text style={styles.footer}>v2.5.0 • © Depth Route</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  container: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 40 },
  brandCol: { alignItems: "center", marginBottom: 32 },
  logo: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  brand: { color: "#fff", fontSize: 26, fontWeight: "700" },
  tagline: { color: colors.textMuted, fontSize: 14, marginTop: 4 },
  sub: { color: colors.textDim, fontSize: 12, marginTop: 6 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  h1: { color: "#fff", fontSize: 22, fontWeight: "700" },
  help: { color: colors.textMuted, fontSize: 13, marginTop: 4, marginBottom: 20 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.bgAlt,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { flex: 1, color: "#fff", fontSize: 15 },
  primary: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 20 },
  hair: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: { color: colors.textMuted, fontSize: 12 },
  google: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  googleText: { color: "#0F1A30", fontSize: 15, fontWeight: "600" },
  error: { color: colors.red, fontSize: 13, marginBottom: 4 },
  demoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.primaryDim + "50",
    borderWidth: 1,
    borderColor: colors.primary + "40",
  },
  demoText: { color: colors.primary, fontSize: 12, fontWeight: "600" },
  footer: { textAlign: "center", color: colors.textDim, fontSize: 12, marginTop: 24 },
});
