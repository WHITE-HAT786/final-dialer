// Sign up — real WebDialer customer registration.
//
// REAL endpoint: POST /backend/auth/signup.php (the same registration the web
// dialer uses). It creates the account only; the customer then signs in through
// the normal login.php path, so there is no separate identity system here and
// no SIP credential is ever entered by hand — the extension is provisioned by
// WebDialer and resolved from the authenticated token afterwards.
import React, { useState, useMemo } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { radius, spacing, type Palette } from "@/src/theme";
import { useTheme } from "@/src/theme/ThemeContext";
import { signupApi } from "@/src/api";
import { BrandMark } from "@/src/components/BrandMark";
import GoogleButton from "@/src/components/GoogleButton";

type Fields = Record<string, string[]>;

export default function Signup() {
  const { colors, isDark } = useTheme();
  const s = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [terms, setTerms] = useState(false);
  // Resolved from the device; signup.php accepts it and falls back server-side.
  const [timezone] = useState(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; }
    catch { return "UTC"; }
  });
  const [showPw, setShowPw] = useState(false);

  const [busy, setBusy] = useState(false);
  const [fields, setFields] = useState<Fields>({});
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const fieldError = (k: string) => fields[k]?.[0] ?? "";

  async function submit() {
    setErr("");
    setFields({});
    setBusy(true);
    try {
      const r = await signupApi.register({
        fullname: fullname.trim(),
        email: email.trim(),
        username: username.trim(),
        phone: phone.trim() || undefined,
        password,
        confirm_password: confirm,
        timezone,
        accept_terms: terms,
      });
      if (r.status === "ok") {
        setDone(true);
      } else if (r.status === "invalid") {
        setFields(r.fields);
        setErr(r.message);
      } else {
        setErr(r.message);
      }
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <View style={s.screen}>
        <View style={s.doneWrap}>
          <View style={s.doneIcon}>
            <Ionicons name="checkmark" size={30} color={colors.green} />
          </View>
          <Text style={s.doneTitle}>Account created</Text>
          <Text style={s.doneSub}>
            Sign in with your new Depth Route Dialer account. Your calling
            extension is provisioned by WebDialer automatically.
          </Text>
          <TouchableOpacity
            style={s.primaryBtn}
            onPress={() => router.replace("/login")}
            testID="signup-goto-login"
          >
            <Text style={s.primaryBtnText}>Go to sign in</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={s.back} onPress={() => router.back()} testID="signup-back">
          <Ionicons name="chevron-back" size={20} color={colors.textMuted} />
          <Text style={s.backText}>Back</Text>
        </TouchableOpacity>

        <BrandMark size={44} theme="dark" style={{ marginBottom: 8 }} />
        <Text style={s.title}>Create your account</Text>
        <Text style={s.subtitle}>Join DepthRoute and start your journey today.</Text>

        <View style={s.card}>
          <Field label="Full name" error={fieldError("fullname")}>
            <TextInput
              style={s.input} value={fullname} onChangeText={setFullname}
              placeholder="Your name" placeholderTextColor={colors.textDim}
              testID="signup-fullname"
            />
          </Field>

          <Field label="Email" error={fieldError("email")}>
            <TextInput
              style={s.input} value={email} onChangeText={setEmail}
              autoCapitalize="none" keyboardType="email-address"
              placeholder="you@example.com" placeholderTextColor={colors.textDim}
              testID="signup-email"
            />
          </Field>

          <Field label="Username" error={fieldError("username")}>
            <TextInput
              style={s.input} value={username} onChangeText={setUsername}
              autoCapitalize="none"
              placeholder="3–40 characters" placeholderTextColor={colors.textDim}
              testID="signup-username"
            />
          </Field>

          <Field label="Phone (optional)" error={fieldError("phone")}>
            <TextInput
              style={s.input} value={phone} onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="Contact number" placeholderTextColor={colors.textDim}
              testID="signup-phone"
            />
          </Field>

          <Field label="Password" error={fieldError("password")}>
            <View style={s.pwRow}>
              <TextInput
                style={[s.input, { flex: 1 }]} value={password} onChangeText={setPassword}
                secureTextEntry={!showPw} autoCapitalize="none" autoCorrect={false}
                placeholder="At least 8 characters" placeholderTextColor={colors.textDim}
                testID="signup-password"
              />
              <TouchableOpacity onPress={() => setShowPw((v) => !v)} testID="signup-toggle-pw">
                <Ionicons
                  name={showPw ? "eye-off-outline" : "eye-outline"}
                  size={18} color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </Field>

          <Text style={s.hint}>At least 8 characters, including a letter and a number.</Text>

          <Field label="Confirm password" error={fieldError("confirm_password")}>
            <TextInput
              style={s.input} value={confirm} onChangeText={setConfirm}
              secureTextEntry={!showPw} autoCapitalize="none" autoCorrect={false}
              placeholder="Repeat your password" placeholderTextColor={colors.textDim}
              testID="signup-confirm"
            />
          </Field>

          <View style={{ marginTop: spacing.md }}>
            <Text style={s.label}>Timezone</Text>
            <View style={[s.input, s.tzRow]}>
              <Text style={s.tzText} numberOfLines={1}>{timezone}</Text>
              <Ionicons name="time-outline" size={16} color={colors.textMuted} />
            </View>
          </View>

          <TouchableOpacity
            style={s.termsRow}
            onPress={() => setTerms((v) => !v)}
            testID="signup-terms"
          >
            <View style={[s.checkbox, terms && s.checkboxOn]}>
              {terms && <Ionicons name="checkmark" size={13} color="#fff" />}
            </View>
            <Text style={s.termsText}>I accept the Terms and Privacy Policy</Text>
          </TouchableOpacity>
          {!!fieldError("accept_terms") && (
            <Text style={s.fieldErr}>{fieldError("accept_terms")}</Text>
          )}

          {!!err && <Text style={s.error} testID="signup-error">{err}</Text>}

          <TouchableOpacity
            style={[s.primaryBtn, busy && { opacity: 0.7 }]}
            onPress={submit}
            disabled={busy}
            testID="signup-submit"
          >
            {busy
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.primaryBtnText}>Create account</Text>}
          </TouchableOpacity>

          {/* Same Google frame as sign in — visible, and honest about being off. */}
          <GoogleButton
            label="Sign up with Google"
            dividerLabel="or sign up with"
            onUnavailable={setErr}
            testID="signup-google"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, error, children }: { label: string; error: string; children: React.ReactNode }) {
  // Its own theme read — Field renders outside the screen component's closure.
  const { colors } = useTheme();
  return (
    <View style={{ marginTop: spacing.md }}>
      <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 6 }}>{label}</Text>
      {children}
      {!!error && <Text style={{ color: colors.red, fontSize: 11, marginTop: 4 }}>{error}</Text>}
    </View>
  );
}

function makeStyles(c: Palette, dark: boolean) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  scroll: { padding: spacing.xl, paddingBottom: spacing.huge },
  back: { flexDirection: "row", alignItems: "center", gap: 2, marginBottom: spacing.lg },
  backText: { color: c.textMuted, fontSize: 14 },
  title: { color: c.text, fontSize: 24, fontWeight: "700" },
  subtitle: { color: c.textMuted, fontSize: 13, marginTop: 2 },
  card: {
    backgroundColor: c.card, borderRadius: radius.lg, borderWidth: 1,
    borderColor: c.border, padding: spacing.lg, marginTop: spacing.lg,
  },
  label: { color: c.textMuted, fontSize: 12, marginBottom: 6 },
  input: {
    backgroundColor: c.bgAlt, borderRadius: radius.md, borderWidth: 1,
    borderColor: c.border, color: c.text, fontSize: 15,
    paddingHorizontal: spacing.md, paddingVertical: 11,
  },
  pwRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: c.bgAlt, borderRadius: radius.md, borderWidth: 1,
    borderColor: c.border, paddingRight: spacing.md,
  },
  hint: { color: c.textMuted, fontSize: 12, marginTop: 6 },
  tzRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tzText: { color: c.text, fontSize: 15, flex: 1 },
  fieldErr: { color: c.red, fontSize: 11, marginTop: 4 },
  termsRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: spacing.lg },
  checkbox: {
    width: 20, height: 20, borderRadius: 5, borderWidth: 1, borderColor: c.border,
    alignItems: "center", justifyContent: "center", backgroundColor: c.bgAlt,
  },
  checkboxOn: { backgroundColor: c.primary, borderColor: c.primary },
  termsText: { color: c.textMuted, fontSize: 12, flex: 1 },
  error: { color: c.red, fontSize: 13, marginTop: spacing.md },
  primaryBtn: {
    backgroundColor: c.primary, borderRadius: radius.pill,
    paddingVertical: 14, alignItems: "center", marginTop: spacing.lg,
  },
  primaryBtnText: { color: c.onPrimary, fontSize: 15, fontWeight: "700" },

  doneWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: 8 },
  doneIcon: {
    width: 66, height: 66, borderRadius: 33, backgroundColor: c.greenDim,
    alignItems: "center", justifyContent: "center", marginBottom: 6,
  },
  doneTitle: { color: c.text, fontSize: 19, fontWeight: "700" },
  doneSub: { color: c.textMuted, fontSize: 13, textAlign: "center", lineHeight: 20 },
  });
}
