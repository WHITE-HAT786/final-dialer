import React, { useEffect } from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";

// Finalize the OAuth browser redirect back into the app.
WebBrowser.maybeCompleteAuthSession();

// PUBLIC OAuth client ids (a client id is never a secret). Supplied via env at
// build time. On Android, expo-auth-session's Google provider REQUIRES an
// androidClientId and throws (`invariantClientId`) during render if it is
// missing — which would crash the login screen. So this component, which calls
// the hook, must only ever be MOUNTED when a native Android client id exists
// (see `googleNativeConfigured` and the guard in login.tsx). That keeps the
// Rules of Hooks intact (the hook is unconditional *within* this component)
// while making the whole app resilient when Google isn't configured yet.
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || "";

/** True only when a native Android Google sign-in is actually possible here. */
export const googleNativeConfigured = ANDROID_CLIENT_ID.length > 0;

export function GoogleSignInButton({
  onToken,
  onError,
  disabled,
}: {
  onToken: (idToken: string, nonce: string) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}) {
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: WEB_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID,
  });

  useEffect(() => {
    if (!response) return;
    if (response.type === "error") {
      onError("Google sign-in failed.");
      return;
    }
    if (response.type !== "success") return; // dismissed/cancelled: no-op
    const idToken =
      response.authentication?.idToken ||
      (response.params as Record<string, string>)?.id_token;
    const nonce = request?.nonce || "";
    if (!idToken || !nonce) {
      onError("Google didn't return a valid token.");
      return;
    }
    onToken(idToken, nonce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  return (
    <TouchableOpacity
      style={styles.google}
      onPress={() => promptAsync()}
      disabled={disabled || !request}
      testID="login-google"
    >
      <Ionicons name="logo-google" size={18} color="#0F1A30" />
      <Text style={styles.googleText}>Continue with Google</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
});
