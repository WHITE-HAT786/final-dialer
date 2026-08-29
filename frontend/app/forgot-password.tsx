import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { useThemedStyles, type Palette } from "@/src/theme";
import { useAuth } from "@/src/AuthContext";
import {
  AuthCard,
  AuthScreen,
  BackButton,
  ErrorText,
  Field,
  IconBadge,
  Note,
  PrimaryButton,
  SecondaryButton,
  Spacer,
  useAuthText,
} from "@/src/components/AuthUI";

const SUPPORT_EMAIL = "support@depthroute.com";

export default function ForgotPassword() {
  const styles = useThemedStyles(makeStyles);
  const T = useAuthText();
  const router = useRouter();
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const onSubmit = async () => {
    setErr(null);
    const value = email.trim();
    if (!value) {
      setErr("Enter the email on your account");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
      setErr("Enter a valid email address");
      return;
    }
    setBusy(true);
    try {
      await requestPasswordReset(value);
      // Only shown once the backend actually accepted the request. The copy is
      // deliberately non-committal so it never confirms whether an account exists.
      setSent(true);
    } catch (e: any) {
      setErr(e.message || "Could not send the reset link");
    } finally {
      setBusy(false);
    }
  };

  const backToSignIn = () => router.replace("/login");

  return (
    <AuthScreen>
      <BackButton onPress={backToSignIn} testID="forgot-password-back-button" />

      <View style={styles.head}>
        <IconBadge name="lock-open-outline" size={64} tone="warn" />
        <Text style={T.h1}>Reset your password</Text>
        <Text style={T.body}>
          Enter the email on your Depth Route account and we&apos;ll send a reset link. The
          link expires in 30 minutes.
        </Text>
      </View>

      <AuthCard>
        <Field
          icon="mail-outline"
          placeholder="Email"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            if (err) setErr(null);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          returnKeyType="send"
          onSubmitEditing={onSubmit}
          editable={!sent}
          testID="forgot-password-email-input"
        />

        {err ? (
          <View style={styles.slot}>
            <ErrorText testID="forgot-password-error">{err}</ErrorText>
          </View>
        ) : null}

        <PrimaryButton
          label="Send reset link"
          onPress={onSubmit}
          busy={busy}
          disabled={sent}
          testID="forgot-password-submit-button"
          style={styles.submit}
        />
      </AuthCard>

      {sent ? (
        <View style={styles.slot}>
          <Note tone="success" testID="forgot-password-sent">
            If an account exists for that address, the link is on its way.
          </Note>
        </View>
      ) : null}

      <Spacer />

      <SecondaryButton
        label="Back to sign in"
        onPress={backToSignIn}
        testID="forgot-password-back-link"
      />
      <Text style={[T.caption, T.center, styles.help]}>Need help? {SUPPORT_EMAIL}</Text>
    </AuthScreen>
  );
}

const makeStyles = (_c: Palette) =>
  StyleSheet.create({
    head: { gap: 14, marginBottom: 28 },
    slot: { marginTop: 16 },
    submit: { marginTop: 16 },
    help: { marginTop: 18 },
  });
