// SIP Account — READ-ONLY view of the identity WebDialer provisioned.
//
// The customer never creates or types a SIP account. Their calling identity is
// resolved server-side from the authenticated bearer token:
//
//   login -> app token -> GET /backend/api/app/sip-config.php
//         -> WebDialer resolves THIS customer's enabled extension
//         -> NativeSipEngine / CallEngine
//
// There is deliberately no add / edit / delete here and no way to point the app
// at an arbitrary SIP server: an external registration target is not something a
// managed customer identity should be able to acquire from the handset.
//
// The SIP password is never displayed, logged, or persisted.
import React from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Screen from "@/src/components/Screen";
import { radius, spacing, type Palette } from "@/src/theme";
import { useTheme } from "@/src/theme/ThemeContext";
import { makeThemedStyles } from "@/src/theme/useThemedStyles";
import { useMultiSip } from "@/src/sip/MultiSipContext";
import { sipBootstrapLabel, isRetryable } from "@/src/sip/sipBootstrap";

/** Visual treatment per real bootstrap state — never invents "Registered". */
function tone(state: string, colors: Palette): { color: string; icon: string } {
  switch (state) {
    case "registered": return { color: colors.green, icon: "checkmark-circle" };
    case "registering":
    case "loading": return { color: colors.yellow, icon: "time-outline" };
    case "registration_failed":
    case "error": return { color: colors.red, icon: "close-circle" };
    case "no_extension":
    case "needs_provision": return { color: colors.orange, icon: "alert-circle-outline" };
    default: return { color: colors.textMuted, icon: "remove-circle-outline" };
  }
}

export default function SipAccounts() {
  const { colors } = useTheme();
  const styles = useStyles();
  const { bootstrap, retryBootstrap, selectedAccount } = useMultiSip();
  const t = tone(bootstrap, colors);
  const label = sipBootstrapLabel(bootstrap as any);
  const acct = selectedAccount ?? null;

  const busy = bootstrap === "loading" || bootstrap === "registering";
  const noExtension = bootstrap === "no_extension";

  return (
    <Screen title="SIP Account" activeKey="sip" showSip={false} showBell={false}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.huge }}>
        {/* ---- Managed identity notice ---- */}
        <View style={styles.notice} testID="sip-managed-notice">
          <MaterialCommunityIcons name="shield-check-outline" size={16} color={colors.primary} />
          <Text style={styles.noticeText}>
            Your calling identity is provisioned by Depth Route and loaded automatically after sign-in.
          </Text>
        </View>

        {/* ---- Status ---- */}
        <View style={styles.card} testID="sip-status-card">
          <View style={styles.statusRow}>
            {busy
              ? <ActivityIndicator color={colors.yellow} />
              : <Ionicons name={t.icon as any} size={20} color={t.color} />}
            <View style={{ flex: 1 }}>
              <Text style={styles.statusLabel}>Status</Text>
              <Text style={[styles.statusValue, { color: t.color }]} testID="sip-status-value">
                {label}
              </Text>
            </View>
            {isRetryable(bootstrap as any) && (
              <TouchableOpacity style={styles.retry} onPress={retryBootstrap} testID="sip-retry">
                <Ionicons name="refresh" size={14} color="#fff" />
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ---- Provisioned identity, or an honest "none" ---- */}
        {noExtension || !acct ? (
          <View style={styles.empty} testID="sip-no-extension">
            <View style={styles.emptyIcon}>
              <MaterialCommunityIcons name="phone-off-outline" size={28} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>
              {noExtension ? "No SIP extension is provisioned" : "No SIP identity loaded"}
            </Text>
            <Text style={styles.emptySub}>
              {noExtension
                ? "This account has no enabled extension yet. Contact support to have one provisioned."
                : "Your extension will appear here once it has been loaded from Depth Route."}
            </Text>
          </View>
        ) : (
          <View style={styles.card} testID="sip-identity-card">
            <Row label="Extension" value={acct.callerId || acct.username || "—"} />
            <Row label="Username" value={acct.username || "—"} />
            <Row label="Transport" value={acct.transport ? String(acct.transport) : "UDP"} />
            <Row label="Server" value={acct.host || acct.domain || "—"} />
            <Row label="Port" value={acct.port ? String(acct.port) : "—"} />
            {/* The SIP password is intentionally absent — it is never shown. */}
            <View style={styles.secretRow}>
              <Ionicons name="lock-closed" size={13} color={colors.textDim} />
              <Text style={styles.secretText}>
                Credentials are managed by Depth Route and are never shown here.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const useStyles = makeThemedStyles((colors) => StyleSheet.create({
  notice: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.primaryDim, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginTop: spacing.md,
  },
  noticeText: { color: colors.text, fontSize: 12, flex: 1, lineHeight: 17 },

  card: {
    backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1,
    borderColor: colors.border, padding: spacing.lg, marginTop: spacing.md,
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  statusLabel: { color: colors.textMuted, fontSize: 11 },
  statusValue: { fontSize: 15, fontWeight: "700", marginTop: 2 },
  retry: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: radius.pill,
  },
  retryText: { color: colors.onPrimary, fontSize: 12, fontWeight: "700" },

  row: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderSoft,
  },
  rowLabel: { color: colors.textMuted, fontSize: 13 },
  rowValue: { color: colors.text, fontSize: 13, fontWeight: "600", maxWidth: "62%" },
  secretRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.md },
  secretText: { color: colors.textDim, fontSize: 11, flex: 1 },

  empty: { alignItems: "center", paddingVertical: 40, paddingHorizontal: spacing.xl, gap: 6 },
  emptyIcon: {
    width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.border, marginBottom: 4,
  },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "700", textAlign: "center" },
  emptySub: { color: colors.textMuted, fontSize: 13, textAlign: "center", lineHeight: 19 },
}));
