import React, { ReactNode, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { cardShadow, useTheme, useThemedStyles, type Palette } from "@/src/theme";

/**
 * Shared building blocks for the auth flow, matching "DepthRoute Mobile Auth".
 *
 * Auth is a full-bleed marketing-ish surface and keeps the design's own metrics
 * — 52px controls, 12px control radius, 20px card radius/padding, 20px gutter —
 * rather than the denser in-app scale in `radius`/`CONTROL_H`.
 */

/**
 * Google sign-in is gated because AuthContext.loginGoogleSession throws: the
 * backend has no session-exchange endpoint in this build. The design makes the
 * Google tile an explicit toggle (`showGoogle`), so this mirrors it.
 */
export const AUTH_SHOW_GOOGLE = false;

/** Field fill that stays readable on the card in both palettes. */
function fieldBg(c: Palette): string {
  // Dark: #0A1224 recessed against the #0F1A30 card.
  // Light: #F7F9FC — c.input is #FFFFFF there and would vanish on a white card.
  return c.mode === "dark" ? c.input : c.cardAlt;
}

// ---------------------------------------------------------------------------
// Screen shell
// ---------------------------------------------------------------------------

export function AuthScreen({
  children,
  behind,
  scrim,
}: {
  children: ReactNode;
  /** Rendered underneath the content, unclipped by the scroll view (the globe). */
  behind?: ReactNode;
  /** Overlay drawn between `behind` and the content (the globe's fade-to-bg). */
  scrim?: ReactNode;
}) {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={c.mode === "dark" ? "light-content" : "dark-content"}
        backgroundColor={c.bg}
      />
      {behind ? <View style={StyleSheet.absoluteFill}>{behind}</View> : null}
      {scrim ? <View style={StyleSheet.absoluteFill}>{scrim}</View> : null}
      <SafeAreaView style={styles.flex} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scroll,
              { paddingBottom: 44 + Math.max(insets.bottom, 0) },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

/** Fills the remaining space so the footer sits at the bottom of short screens. */
export function Spacer() {
  const styles = useThemedStyles(makeStyles);
  return <View style={styles.spacer} />;
}

/** Themed text styles shared across the auth screens. */
export function useAuthText() {
  return useThemedStyles(makeText);
}

// ---------------------------------------------------------------------------
// Brand
// ---------------------------------------------------------------------------

/**
 * The DepthRoute mark.
 *
 * The design points at `assets/images/depthroute-mark-dark.png` (dark) and
 * `depthroute-mark.png` (light) — neither is in this repo yet. Once they are
 * checked in, replace the fallback below with:
 *
 *   const src = c.mode === "light"
 *     ? require("@/assets/images/depthroute-mark.png")
 *     : require("@/assets/images/depthroute-mark-dark.png");
 *   return <Image source={src} style={{ width: size, height: size * (193 / 183) }}
 *                 resizeMode="contain" accessibilityLabel="Depth Route" />;
 *
 * (183x193 is the intrinsic size of the artwork in the design project.)
 */
export function BrandMark({ size = 64 }: { size?: number }) {
  const c = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size * (193 / 183),
        borderRadius: size * 0.28,
        backgroundColor: c.primary,
        alignItems: "center",
        justifyContent: "center",
      }}
      accessibilityLabel="Depth Route"
    >
      <MaterialCommunityIcons name="waveform" size={size * 0.58} color={c.onPrimary} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

export function BackButton({ onPress, testID }: { onPress: () => void; testID?: string }) {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.backRow}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onPress}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="chevron-back" size={18} color={c.text} />
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

export function AuthCard({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  return <View style={[styles.card, cardShadow(c), style]}>{children}</View>;
}

/** The rounded-square glyph badge above the 2FA / password-reset headings. */
export function IconBadge({
  name,
  size = 72,
  tone = "primary",
}: {
  name: React.ComponentProps<typeof Ionicons>["name"];
  size?: number;
  tone?: "primary" | "warn";
}) {
  const c = useTheme();
  const primary = tone === "primary";
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: primary ? c.primarySoft : c.card,
        borderWidth: 1,
        borderColor: primary ? c.primaryBorder : c.border,
      }}
    >
      <Ionicons name={name} size={size * 0.47} color={primary ? c.primary : c.warn} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

type FieldProps = TextInputProps & {
  /** Label above the control (sign-up style). Omit for the icon-inline style. */
  label?: string;
  /** Leading glyph (sign-in style). */
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  trailing?: ReactNode;
  containerStyle?: ViewStyle;
};

export function Field({ label, icon, trailing, containerStyle, ...input }: FieldProps) {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [focused, setFocused] = useState(false);

  return (
    <View style={containerStyle}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.field, { borderColor: focused ? c.primary : c.border }]}>
        {icon ? <Ionicons name={icon} size={18} color={c.muted} /> : null}
        <TextInput
          {...input}
          style={styles.input}
          placeholderTextColor={c.dim}
          onFocus={(e) => {
            setFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
        />
        {trailing}
      </View>
    </View>
  );
}

/** A non-editable field that opens a picker (the sign-up timezone row). */
export function SelectField({
  label,
  value,
  onPress,
  testID,
}: {
  label: string;
  value: string;
  onPress: () => void;
  testID?: string;
}) {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.field, { borderColor: c.border }]}
        onPress={onPress}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
      >
        <Text style={styles.selectValue} numberOfLines={1}>
          {value}
        </Text>
        <Ionicons name="chevron-down" size={14} color={c.muted} />
      </TouchableOpacity>
    </View>
  );
}

export function RevealToggle({
  shown,
  onPress,
  testID,
}: {
  shown: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <TouchableOpacity
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={shown ? "Hide password" : "Show password"}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={styles.reveal}
    >
      <Ionicons name={shown ? "eye-off-outline" : "eye-outline"} size={18} color={c.muted} />
    </TouchableOpacity>
  );
}

export function Checkbox({
  checked,
  onPress,
  children,
  testID,
}: {
  checked: boolean;
  onPress: () => void;
  children: ReactNode;
  testID?: string;
}) {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <TouchableOpacity
      style={styles.checkRow}
      onPress={onPress}
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      activeOpacity={0.8}
    >
      <View
        style={[
          styles.checkbox,
          checked && { backgroundColor: c.primary, borderColor: c.primary },
        ]}
      >
        {checked ? <Ionicons name="checkmark" size={13} color={c.onPrimary} /> : null}
      </View>
      <Text style={styles.checkLabel}>{children}</Text>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

export function PrimaryButton({
  label,
  onPress,
  busy,
  disabled,
  testID,
  style,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  testID?: string;
  style?: ViewStyle;
}) {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const off = busy || disabled;
  return (
    <TouchableOpacity
      style={[styles.primary, off && styles.dim, style]}
      onPress={onPress}
      disabled={off}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!busy }}
    >
      {busy ? (
        <ActivityIndicator color={c.onPrimary} />
      ) : (
        <Text style={styles.primaryText}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

export function SecondaryButton({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <TouchableOpacity
      style={styles.secondary}
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
    >
      <Text style={styles.secondaryText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function GoogleButton({
  label,
  onPress,
  disabled,
  testID,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <TouchableOpacity
      style={[styles.google, disabled && styles.dim]}
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
    >
      <Image
        source={{ uri: "https://developers.google.com/identity/images/g-logo.png" }}
        style={styles.googleGlyph}
      />
      <Text style={styles.googleText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Text bits
// ---------------------------------------------------------------------------

export function Divider({ label = "or" }: { label?: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.dividerRow}>
      <View style={styles.hair} />
      <Text style={styles.dividerText}>{label}</Text>
      <View style={styles.hair} />
    </View>
  );
}

export function Note({
  tone = "info",
  children,
  testID,
}: {
  tone?: "info" | "success";
  children: ReactNode;
  testID?: string;
}) {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const success = tone === "success";
  const fg = success ? c.success : c.primary;
  return (
    <View
      style={[
        styles.note,
        {
          backgroundColor: success ? c.successSoft : c.primarySoft,
          borderColor: success ? c.successBorder : c.primaryBorder,
        },
      ]}
      testID={testID}
    >
      <Ionicons
        name={success ? "checkmark-circle" : "information-circle"}
        size={16}
        color={fg}
        style={styles.noteIcon}
      />
      <Text style={[styles.noteText, { color: fg }]}>{children}</Text>
    </View>
  );
}

export function ErrorText({ children, testID }: { children: ReactNode; testID?: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Text style={styles.error} testID={testID} accessibilityLiveRegion="polite">
      {children}
    </Text>
  );
}

/** "New here? Create an account" — muted prompt with an accent action. */
export function FooterPrompt({
  prompt,
  action,
  onPress,
  testID,
}: {
  prompt: string;
  action: string;
  onPress: () => void;
  testID?: string;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.footerRow}>
      <Text style={styles.footerText}>{prompt}</Text>
      <TouchableOpacity onPress={onPress} testID={testID} accessibilityRole="link">
        <Text style={styles.footerAction}>{action}</Text>
      </TouchableOpacity>
    </View>
  );
}

const makeText = (c: Palette) =>
  StyleSheet.create({
    h1: { color: c.text, fontSize: 26, fontWeight: "700", letterSpacing: -0.4 },
    h2: { color: c.text, fontSize: 24, fontWeight: "700", letterSpacing: -0.3 },
    cardTitle: { color: c.text, fontSize: 22, fontWeight: "700" },
    body: { color: c.muted, fontSize: 14, lineHeight: 21 },
    help: { color: c.muted, fontSize: 13 },
    caption: { color: c.dim, fontSize: 12 },
    center: { textAlign: "center" },
  });

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    flex: { flex: 1 },
    scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 12 },
    spacer: { flex: 1, minHeight: 24 },

    backRow: { height: 44, justifyContent: "center", marginBottom: 16 },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
    },

    card: {
      backgroundColor: c.card,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: c.border,
    },

    label: { color: c.text, fontSize: 13, fontWeight: "500", marginBottom: 7 },
    field: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: fieldBg(c),
      borderRadius: 12,
      paddingHorizontal: 14,
      height: 52,
      borderWidth: 1,
    },
    input: { flex: 1, minWidth: 0, color: c.text, fontSize: 15, padding: 0 },
    selectValue: { flex: 1, minWidth: 0, color: c.text, fontSize: 15 },
    reveal: { padding: 4 },

    checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 6,
      backgroundColor: fieldBg(c),
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    checkLabel: { flex: 1, color: c.muted, fontSize: 12.5, lineHeight: 19 },

    primary: {
      backgroundColor: c.primary,
      height: 52,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryText: { color: c.onPrimary, fontSize: 16, fontWeight: "700" },
    dim: { opacity: 0.6 },

    secondary: {
      height: 52,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryText: { color: c.text, fontSize: 15, fontWeight: "600" },

    // Google's brand guidance keeps the white tile in both palettes.
    google: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      height: 52,
      borderRadius: 12,
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor: "#DADCE0",
    },
    googleGlyph: { width: 20, height: 20 },
    googleText: { color: "#0F1A30", fontSize: 15, fontWeight: "600" },

    dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 20 },
    hair: { flex: 1, height: 1, backgroundColor: c.border },
    dividerText: { color: c.muted, fontSize: 12 },

    note: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
    },
    noteIcon: { marginTop: 1 },
    noteText: { flex: 1, fontSize: 12, fontWeight: "600", lineHeight: 18 },

    error: { color: c.danger, fontSize: 13, lineHeight: 19 },

    footerRow: { flexDirection: "row", justifyContent: "center", gap: 6 },
    footerText: { color: c.dim, fontSize: 13 },
    footerAction: { color: c.primary, fontSize: 13, fontWeight: "600" },
  });
