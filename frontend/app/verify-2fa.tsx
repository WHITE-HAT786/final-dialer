import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useTheme, useThemedStyles, type Palette } from "@/src/theme";
import { useAuth } from "@/src/AuthContext";
import {
  AuthCard,
  AuthScreen,
  BackButton,
  ErrorText,
  IconBadge,
  PrimaryButton,
  Spacer,
  useAuthText,
} from "@/src/components/AuthUI";

const CODE_LENGTH = 6;

export default function VerifyTwoFactor() {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const T = useAuthText();
  const router = useRouter();
  const { pending2fa, clearPending2fa, verify2fa, user } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  const byEmail = pending2fa?.method === "email";

  useEffect(() => {
    if (user) router.replace("/(tabs)/dashboard");
  }, [user]);

  // Landing here without a live challenge (deep link, reload) has nothing to
  // verify — send them back rather than showing a dead form.
  useEffect(() => {
    if (!pending2fa && !user) router.replace("/login");
  }, [pending2fa, user]);

  const onVerify = async (value?: string) => {
    const entered = (value ?? code).trim();
    setErr(null);
    setNote(null);
    if (entered.length !== CODE_LENGTH) {
      setErr("Enter the " + CODE_LENGTH + "-digit code");
      return;
    }
    setBusy(true);
    try {
      await verify2fa(entered);
      router.replace("/(tabs)/dashboard");
    } catch (e: any) {
      setErr(e.message || "Verification failed");
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  const onChangeCode = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(digits);
    if (err) setErr(null);
    if (digits.length === CODE_LENGTH) onVerify(digits);
  };

  const onBack = () => {
    clearPending2fa();
    router.replace("/login");
  };

  const cells = Array.from({ length: CODE_LENGTH }, (_, i) => ({
    char: code[i] ?? "",
    // Filled cells and the caret position take the accent border.
    active: i <= code.length,
  }));

  return (
    <AuthScreen>
      <BackButton onPress={onBack} testID="two-factor-back-button" />

      <View style={styles.head}>
        <IconBadge name="shield-checkmark-outline" size={72} />
        <Text style={T.h2}>Verify it&apos;s you</Text>
        <Text style={[T.body, T.center, styles.blurb]}>
          {byEmail
            ? "Enter the 6-digit code we emailed you to finish signing in."
            : "Enter the 6-digit code from your authenticator app to finish signing in."}
        </Text>
      </View>

      <AuthCard>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => inputRef.current?.focus()}
          accessibilityLabel="6-digit verification code"
        >
          <View style={styles.cells}>
            {cells.map((cell, i) => (
              <View
                key={i}
                style={[styles.cell, { borderColor: cell.active ? c.primary : c.border }]}
              >
                <Text style={styles.cellText}>{cell.char}</Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>

        {/* One real input drives all six cells. */}
        <TextInput
          ref={inputRef}
          style={styles.hiddenInput}
          value={code}
          onChangeText={onChangeCode}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={CODE_LENGTH}
          autoFocus
          caretHidden
          testID="two-factor-code-input"
        />

        {err ? (
          <View style={styles.slot}>
            <ErrorText testID="two-factor-error">{err}</ErrorText>
          </View>
        ) : null}
        {note ? (
          <View style={styles.slot}>
            <Text style={T.help} accessibilityLiveRegion="polite">
              {note}
            </Text>
          </View>
        ) : null}

        <PrimaryButton
          label="Verify"
          onPress={() => onVerify()}
          busy={busy}
          testID="two-factor-submit-button"
          style={styles.verifyButton}
        />

        <View style={styles.resendRow}>
          <Text style={styles.resendText}>Didn&apos;t get a code?</Text>
          <TouchableOpacity
            onPress={() =>
              // There is no resend endpoint; a new code is issued by repeating
              // the password step. Say so rather than pretending to resend.
              setNote("Sign in again to have a new code issued.")
            }
            testID="two-factor-resend-link"
            accessibilityRole="button"
          >
            <Text style={styles.resendAction}>Resend</Text>
          </TouchableOpacity>
        </View>
      </AuthCard>

      {!byEmail ? (
        <TouchableOpacity
          style={styles.altRow}
          onPress={() =>
            setNote(
              "This account verifies with its authenticator app. Ask your administrator to switch it to email codes.",
            )
          }
          testID="two-factor-email-fallback"
          accessibilityRole="button"
        >
          <Ionicons name="mail-outline" size={18} color={c.muted} />
          <Text style={styles.altText}>Send the code by email instead</Text>
          <Ionicons name="chevron-forward" size={16} color={c.dim} />
        </TouchableOpacity>
      ) : null}

      <Spacer />

      {pending2fa?.identifier ? (
        <Text style={[T.caption, T.center]}>Signing in as {pending2fa.identifier}</Text>
      ) : null}
    </AuthScreen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    head: { alignItems: "center", gap: 18, marginBottom: 30 },
    blurb: { maxWidth: 280 },

    cells: { flexDirection: "row", gap: 8 },
    cell: {
      flex: 1,
      height: 56,
      borderRadius: 12,
      backgroundColor: c.mode === "dark" ? c.input : c.cardAlt,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    cellText: { color: c.text, fontSize: 22, fontWeight: "700" },
    hiddenInput: { position: "absolute", opacity: 0, height: 1, width: 1 },

    slot: { marginTop: 14 },
    verifyButton: { marginTop: 20 },

    resendRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 18 },
    resendText: { color: c.muted, fontSize: 13 },
    resendAction: { color: c.primary, fontSize: 13, fontWeight: "600" },

    altRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 16,
      padding: 14,
      borderRadius: 14,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    altText: { flex: 1, color: c.muted, fontSize: 13 },
  });
