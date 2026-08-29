import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

import { useTheme, useThemedStyles, type Palette } from "@/src/theme";
import { useAuth } from "@/src/AuthContext";
import DepthGlobe from "@/src/components/DepthGlobe";
import {
  AUTH_SHOW_GOOGLE,
  AuthCard,
  AuthScreen,
  BrandMark,
  Divider,
  ErrorText,
  Field,
  FooterPrompt,
  GoogleButton,
  Note,
  PrimaryButton,
  RevealToggle,
  Spacer,
  useAuthText,
} from "@/src/components/AuthUI";

const APP_VERSION = "v2.5.0";

/** The globe's fade-into-background wash, per the design's 180deg gradient. */
function scrimFor(c: Palette): {
  colors: [string, string, string];
  stops: [number, number, number];
} {
  return c.mode === "light"
    ? {
        colors: ["rgba(245,247,251,0.10)", "rgba(245,247,251,0.80)", c.bg],
        stops: [0, 0.42, 0.66],
      }
    : {
        colors: ["rgba(5,11,26,0.15)", "rgba(5,11,26,0.72)", c.bg],
        stops: [0, 0.42, 0.68],
      };
}

export default function Login() {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const T = useAuthText();
  const router = useRouter();
  const { loginEmail, loginGoogleSession, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (user) router.replace("/(tabs)/dashboard");
  }, [user]);

  // Cold-start deep link carrying a Google session_id. Only meaningful while
  // AUTH_SHOW_GOOGLE is on — loginGoogleSession throws otherwise.
  useEffect(() => {
    if (!AUTH_SHOW_GOOGLE) return;
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

  const onSignIn = async () => {
    setErr(null);
    if (!email.trim() || !password.trim()) {
      setErr("Please enter email and password");
      return;
    }
    setBusy(true);
    try {
      const res = await loginEmail(email.trim(), password);
      if (res.status === "2fa") {
        setPassword("");
        router.push("/verify-2fa");
      } else {
        router.replace("/(tabs)/dashboard");
      }
    } catch (e: any) {
      setErr(e.message || "Login failed");
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
          ? typeof window !== "undefined"
            ? window.location.origin + "/"
            : "/"
          : Linking.createURL("");
      const authUrl =
        "https://auth.emergentagent.com/?redirect=" + encodeURIComponent(redirect);
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

  const scrim = scrimFor(c);

  return (
    <AuthScreen
      behind={
        <View style={styles.globe} pointerEvents="none">
          <DepthGlobe size={540} theme={c.mode} accent={c.primary} />
        </View>
      }
      scrim={
        <LinearGradient
          colors={scrim.colors}
          locations={scrim.stops}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      }
    >
      <View style={styles.brandCol}>
        <BrandMark size={64} />
        <Text style={T.h1}>Depth Route Dialer</Text>
        <Text style={styles.tagline}>VoIP • SIP • SMS • Reports</Text>
      </View>

      <AuthCard>
        <Text style={T.cardTitle}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to continue to your dashboard</Text>

        <View style={styles.fields}>
          <Field
            icon="mail-outline"
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            returnKeyType="next"
            testID="login-email-input"
          />
          <Field
            icon="lock-closed-outline"
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPw}
            autoCapitalize="none"
            autoComplete="password"
            returnKeyType="go"
            onSubmitEditing={onSignIn}
            testID="login-password-input"
            trailing={
              <RevealToggle
                shown={showPw}
                onPress={() => setShowPw((s) => !s)}
                testID="login-toggle-password"
              />
            }
          />
        </View>

        <TouchableOpacity
          style={styles.forgotRow}
          onPress={() => router.push("/forgot-password")}
          testID="login-forgot-password-link"
          accessibilityRole="link"
        >
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        {err ? (
          <View style={styles.errorSlot}>
            <ErrorText testID="login-error">{err}</ErrorText>
          </View>
        ) : null}

        <PrimaryButton
          label="Sign In"
          onPress={onSignIn}
          busy={busy}
          testID="login-submit-button"
          style={styles.signInButton}
        />

        {AUTH_SHOW_GOOGLE ? (
          <>
            <Divider />
            <GoogleButton
              label="Continue with Google"
              onPress={onGoogle}
              disabled={busy}
              testID="login-google-button"
            />
          </>
        ) : null}

        <View style={styles.noteSlot}>
          <Note>Sign in with your Depth Route Dialer account</Note>
        </View>
      </AuthCard>

      <Spacer />

      <FooterPrompt
        prompt="New here?"
        action="Create an account"
        onPress={() => router.push("/signup")}
        testID="login-register-link"
      />
      <Text style={[T.caption, T.center, styles.version]}>
        {APP_VERSION} • © Depth Route
      </Text>
    </AuthScreen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    globe: { position: "absolute", top: -40, left: -70, width: 540, height: 540 },
    brandCol: { alignItems: "center", gap: 14, marginTop: 48, marginBottom: 34 },
    tagline: { color: c.dim, fontSize: 12, letterSpacing: 0.4 },
    subtitle: { color: c.muted, fontSize: 13, marginTop: 6, marginBottom: 20 },
    fields: { gap: 12 },
    forgotRow: { alignSelf: "flex-end", marginTop: 12 },
    forgotText: { color: c.primary, fontSize: 13, fontWeight: "600" },
    errorSlot: { marginTop: 12 },
    signInButton: { marginTop: 16 },
    noteSlot: { marginTop: 20 },
    version: { marginTop: 18 },
  });
