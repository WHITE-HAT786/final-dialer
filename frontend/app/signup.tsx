import React, { useState } from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { cardShadow, useTheme, useThemedStyles, type Palette } from "@/src/theme";
import { useAuth } from "@/src/AuthContext";
import { deviceTimezone, TIMEZONES, type Timezone } from "@/src/data/timezones";
import {
  AUTH_SHOW_GOOGLE,
  AuthCard,
  AuthScreen,
  BackButton,
  BrandMark,
  Checkbox,
  Divider,
  ErrorText,
  Field,
  FooterPrompt,
  GoogleButton,
  PrimaryButton,
  RevealToggle,
  SelectField,
  Spacer,
  useAuthText,
} from "@/src/components/AuthUI";

const PASSWORD_HINT = "At least 8 characters, including a letter and a number.";

export default function SignUp() {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const T = useAuthText();
  const router = useRouter();
  const { registerEmail, loginGoogleSession } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [timezone, setTimezone] = useState<Timezone>(() => deviceTimezone());
  const [agreed, setAgreed] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const backToSignIn = () => router.replace("/login");

  const validate = (): string | null => {
    if (!name.trim()) return "Enter your full name";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return "Enter a valid email address";
    if (username.trim().length < 3) return "Choose a username of at least 3 characters";
    if (!phone.trim()) return "Enter a phone number";
    if (password.length < 8) return PASSWORD_HINT;
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return PASSWORD_HINT;
    if (password !== confirm) return "Passwords do not match";
    if (!agreed) return "Accept the Terms of Service and Privacy Policy to continue";
    return null;
  };

  const onSubmit = async () => {
    const problem = validate();
    if (problem) {
      setErr(problem);
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      await registerEmail({
        name: name.trim(),
        email: email.trim(),
        username: username.trim(),
        phone: phone.trim(),
        password,
        timezone: timezone.id,
      });
      router.replace("/(tabs)/dashboard");
    } catch (e: any) {
      setErr(e.message || "Could not create the account");
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setErr(null);
    try {
      await loginGoogleSession("");
    } catch (e: any) {
      setErr(e.message || "Google sign-up failed");
    }
  };

  return (
    <AuthScreen>
      <BackButton onPress={backToSignIn} testID="register-back-button" />

      <View style={styles.head}>
        <BrandMark size={44} />
        <Text style={[T.h1, styles.title]}>Create your account</Text>
        <Text style={T.body}>Join DepthRoute and start your journey today.</Text>
      </View>

      <AuthCard style={styles.card}>
        <Field
          label="Full Name"
          placeholder="Enter your full name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          testID="register-name-input"
        />
        <Field
          label="Email Address"
          placeholder="Enter your email address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          testID="register-email-input"
        />
        <Field
          label="Username"
          placeholder="Choose a username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          testID="register-username-input"
        />
        <Field
          label="Phone Number"
          placeholder="Enter phone number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
          testID="register-phone-input"
        />
        <Field
          label="Password"
          placeholder="Create a password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPw}
          autoCapitalize="none"
          autoComplete="new-password"
          testID="register-password-input"
          trailing={
            <RevealToggle
              shown={showPw}
              onPress={() => setShowPw((s) => !s)}
              testID="register-toggle-password"
            />
          }
        />
        <Field
          label="Confirm Password"
          placeholder="Confirm your password"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry={!showConfirm}
          autoCapitalize="none"
          autoComplete="new-password"
          testID="register-password-confirm-input"
          trailing={
            <RevealToggle
              shown={showConfirm}
              onPress={() => setShowConfirm((s) => !s)}
              testID="register-toggle-password-confirm"
            />
          }
        />
        <Text style={styles.hint}>{PASSWORD_HINT}</Text>

        <SelectField
          label="Timezone"
          value={timezone.label}
          onPress={() => setPickerOpen(true)}
          testID="register-timezone-select"
        />

        <Checkbox
          checked={agreed}
          onPress={() => setAgreed((v) => !v)}
          testID="register-terms-checkbox"
        >
          I agree to the <Text style={styles.link}>Terms of Service</Text> and{" "}
          <Text style={styles.link}>Privacy Policy</Text>
        </Checkbox>

        {err ? <ErrorText testID="register-error">{err}</ErrorText> : null}

        <PrimaryButton
          label="Create Account"
          onPress={onSubmit}
          busy={busy}
          testID="register-submit-button"
        />

        {AUTH_SHOW_GOOGLE ? (
          <>
            <Divider />
            <GoogleButton
              label="Sign up with Google"
              onPress={onGoogle}
              disabled={busy}
              testID="register-google-button"
            />
          </>
        ) : null}
      </AuthCard>

      <Spacer />

      <FooterPrompt
        prompt="Already have an account?"
        action="Sign in"
        onPress={backToSignIn}
        testID="register-login-link"
      />

      <Modal
        visible={pickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={styles.modalScrim}>
          <SafeAreaView style={styles.sheetWrap} edges={["bottom"]}>
            <View style={[styles.sheet, cardShadow(c)]}>
              <View style={styles.sheetHead}>
                <Text style={styles.sheetTitle}>Timezone</Text>
                <TouchableOpacity
                  onPress={() => setPickerOpen(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={22} color={c.muted} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={TIMEZONES}
                keyExtractor={(t) => t.id}
                initialScrollIndex={Math.max(
                  0,
                  TIMEZONES.findIndex((t) => t.id === timezone.id),
                )}
                getItemLayout={(_, index) => ({ length: 52, offset: 52 * index, index })}
                renderItem={({ item }) => {
                  const active = item.id === timezone.id;
                  return (
                    <TouchableOpacity
                      style={styles.zoneRow}
                      onPress={() => {
                        setTimezone(item);
                        setPickerOpen(false);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={[styles.zoneText, active && styles.zoneTextActive]}>
                        {item.label}
                      </Text>
                      {active ? (
                        <Ionicons name="checkmark" size={18} color={c.primary} />
                      ) : null}
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </AuthScreen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    head: { gap: 8, marginBottom: 26 },
    title: { marginTop: 8 },
    card: { gap: 14 },
    hint: { color: c.muted, fontSize: 12, marginTop: -6 },
    link: { color: c.primary, fontWeight: "600" },

    modalScrim: { flex: 1, backgroundColor: c.overlay, justifyContent: "flex-end" },
    sheetWrap: { maxHeight: "75%" },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: c.border,
      overflow: "hidden",
    },
    sheetHead: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    sheetTitle: { color: c.text, fontSize: 17, fontWeight: "700" },
    zoneRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      height: 52,
      paddingHorizontal: 20,
    },
    zoneText: { flex: 1, color: c.muted, fontSize: 14 },
    zoneTextActive: { color: c.text, fontWeight: "600" },
  });
