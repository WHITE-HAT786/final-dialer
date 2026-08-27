// "Continue with Google" — the divider + button frame from the DepthRoute
// Mobile Auth design, themed for dark and light.
//
// THIS COMPONENT CONTAINS NO AUTHENTICATION LOGIC, BY DESIGN.
//
// The project has no Android OAuth client yet: EXPO_PUBLIC_GOOGLE_CLIENT_ID is
// empty and the backend has no app-token exchange for a Google identity. Rather
// than ship a placeholder sign-in that appears to work, the control renders in
// a clearly unavailable state and explains itself when tapped.
//
// To turn it on later: set EXPO_PUBLIC_GOOGLE_CLIENT_ID and pass a real
// `onPress` that performs the OAuth flow and exchanges the result for an app
// token. Nothing else here needs to change.
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Palette } from "@/src/theme";
import { useTheme } from "@/src/theme/ThemeContext";

/** True only when a real Google client id is configured for this build. */
export const GOOGLE_OAUTH_ENABLED =
  (process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "").trim().length > 0;

const UNAVAILABLE =
  "Google sign-in isn't enabled for this app yet. Please use your email and password.";

type Props = {
  label?: string;
  /** Supply once a real OAuth flow exists; ignored while OAuth is unconfigured. */
  onPress?: () => void;
  /** Called instead, with an explanation, while OAuth is unconfigured. */
  onUnavailable?: (message: string) => void;
  dividerLabel?: string;
  testID?: string;
};

export default function GoogleButton({
  label = "Continue with Google",
  onPress,
  onUnavailable,
  dividerLabel = "or continue with",
  testID = "google-button",
}: Props) {
  const { colors, isDark } = useTheme();
  const s = React.useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const ready = GOOGLE_OAUTH_ENABLED && !!onPress;

  return (
    <View style={s.wrap}>
      <View style={s.dividerRow}>
        <View style={s.rule} />
        <Text style={s.dividerText}>{dividerLabel}</Text>
        <View style={s.rule} />
      </View>

      <TouchableOpacity
        style={[s.btn, !ready && s.btnOff]}
        onPress={() => (ready ? onPress!() : onUnavailable?.(UNAVAILABLE))}
        activeOpacity={0.8}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        // Deliberately NOT accessibilityState.disabled: RN feeds that into
        // Pressability and the button would stop responding, leaving a dead
        // control. It is tappable — the hint says what tapping will tell you.
        accessibilityHint={ready ? undefined : UNAVAILABLE}
      >
        <Ionicons name="logo-google" size={18} color={ready ? colors.text : colors.textDim} />
        <Text style={[s.btnText, !ready && s.btnTextOff]}>{label}</Text>
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(c: Palette, dark: boolean) {
  return StyleSheet.create({
    wrap: { marginTop: 18 },

    dividerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    rule: { flex: 1, height: 1, backgroundColor: c.border },
    dividerText: { color: c.textDim, fontSize: 12 },

    btn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
      height: 52, borderRadius: 12, marginTop: 14,
      backgroundColor: dark ? c.bgAlt : c.card,
      borderWidth: 1, borderColor: c.border,
    },
    // Unavailable, not hidden: the affordance is visible but reads as inactive.
    btnOff: { opacity: 0.55 },
    btnText: { color: c.text, fontSize: 15, fontWeight: "600" },
    btnTextOff: { color: c.textDim },
  });
}
