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
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { colors, spacing } from "@/src/theme";
import { useAuth } from "@/src/AuthContext";

export default function Login() {
  const router = useRouter();
  const { loginEmail, verify2fa, loginGoogleSession, user } = useAuth();
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

  // Handle cold-start deep link on mobile (session_id)
  useEffect(() => {
    (async () => {
      if (Platform.OS === "web") {
        const hash = (typeof window !== "undefined" && window.location.hash) || "";
        const query = (typeof window !== "undefined" && window.location.search) || "";
        const sid = parseSessionId(hash) || parseSessionId(query);
        if (sid) {
          try {
            await loginGoogleSession(sid);
            if (typeof window !== "undefined") {
              window.history.replaceState(null, "", window.location.pathname);
            }
          } catch (e: any) {
            setErr(e.message || "Google login failed");
          }
        }
        return;
      }
      const initial = await Linking.getInitialURL();
      const sid = initial ? parseSessionId(initial) : null;
      if (sid) {
        try {
          await loginGoogleSession(sid);
        } catch (e: any) {
          setErr(e.message || "Google login failed");
        }
      }
    })();
  }, []);

  function parseSessionId(url: string): string | null {
    try {
      const hashMatch = url.match(/session_id=([^&]+)/);
      if (hashMatch) return decodeURIComponent(hashMatch[1]);
    } catch {}
    return null;
  }

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

  const onGoogle = async () => {
    setErr(null);
    setBusy(true);
    try {
      const redirect =
        Platform.OS === "web"
          ? (typeof window !== "undefined" ? window.location.origin + "/" : "/")
          : Linking.createURL("");
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirect)}`;
      if (Platform.OS === "web") {
        if (typeof window !== "undefined") window.location.href = authUrl;
        return;
      }
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirect);
      if (result.type !== "success" || !result.url) {
        setBusy(false);
        return;
      }
      const sid = parseSessionId(result.url);
      if (!sid) {
        setErr("Could not obtain session");
        setBusy(false);
        return;
      }
      await loginGoogleSession(sid);
      router.replace("/(tabs)/dashboard");
    } catch (e: any) {
      setErr(e.message || "Google login failed");
    } finally {
      setBusy(false);
    }
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
            <View style={styles.logo}>
              <MaterialCommunityIcons name="waveform" size={38} color="#fff" />
            </View>
            <Text style={styles.brand}>Depth Route</Text>
            <Text style={styles.tagline}>Dialer</Text>
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
                  <Text style={styles.orText}>or continue with</Text>
                  <View style={styles.hair} />
                </View>

                <TouchableOpacity
                  style={styles.google}
                  onPress={onGoogle}
                  disabled={busy}
                  testID="login-google-button"
                >
                  <Image
                    source={{ uri: "https://developers.google.com/identity/images/g-logo.png" }}
                    style={{ width: 20, height: 20 }}
                  />
                  <Text style={styles.googleText}>Continue with Google</Text>
                </TouchableOpacity>

                <View style={styles.demoBox}>
                  <Ionicons name="information-circle" size={16} color={colors.primary} />
                  <Text style={styles.demoText}>
                    Sign in with your Depth Route account
                  </Text>
                </View>
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
