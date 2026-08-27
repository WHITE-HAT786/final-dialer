// Recharge — add funds to the PORTAL wallet.
//
// Flow:
//   POST /backend/api/app/topup.php { amount, gateway }
//     -> WebDialer PaymentService.createTopup(uid from bearer token)
//     -> hosted Stripe Checkout / Cryptomus invoice URL
//     -> customer pays on the provider's page (opened in a browser tab)
//     -> provider webhook -> backend RE-READS the payment from the provider
//     -> only then is the portal wallet credited
//
// The app never holds a Stripe secret, a Cryptomus API key, or a webhook
// secret, and it cannot credit anything: returning from the browser proves
// nothing, so this screen refreshes from the server rather than declaring
// success. A pending payment stays "pending" until the backend says otherwise.
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import Screen from "@/src/components/Screen";
import { radius, spacing, type Palette } from "@/src/theme";
import { useTheme } from "@/src/theme/ThemeContext";
import { makeThemedStyles } from "@/src/theme/useThemedStyles";
import { rechargeApi, type TopupOptions, type TopupPayment } from "@/src/api";
import { useBalance } from "@/src/hooks/useBalance";

const PRESETS = ["10", "25", "50", "100"];

type Phase =
  | { k: "loading" }
  | { k: "ready" }
  | { k: "starting" }
  | { k: "opened"; order: string; provider: string }
  | { k: "problem"; message: string };

function statusTone(s: string, colors: Palette) {
  const v = s.toLowerCase();
  if (v.includes("credit") || v === "paid" || v === "confirmed") return colors.green;
  if (v.includes("fail") || v.includes("reject") || v.includes("cancel")) return colors.red;
  return colors.yellow;
}

export default function Recharge() {
  const { colors } = useTheme();
  const styles = useStyles();
  const [phase, setPhase] = useState<Phase>({ k: "loading" });
  const [opts, setOpts] = useState<TopupOptions | null>(null);
  const [amount, setAmount] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const { state: balance, reload: reloadBalance } = useBalance();

  const load = useCallback(async () => {
    try {
      setOpts(await rechargeApi.options());
      setPhase({ k: "ready" });
    } catch (e: any) {
      setPhase({ k: "problem", message: e?.message ?? "Recharge is unavailable right now." });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    reloadBalance();
    await load();
    setRefreshing(false);
  }, [load, reloadBalance]);

  const start = useCallback(async (gateway: string) => {
    setPhase({ k: "starting" });
    const r = await rechargeApi.start(amount.trim(), gateway);
    if (r.status !== "ok") {
      setPhase({ k: "problem", message: r.message });
      return;
    }
    if (!r.url) {
      setPhase({ k: "problem", message: "The payment provider did not return a checkout page." });
      return;
    }
    // Hosted page — card details never touch this app.
    await WebBrowser.openBrowserAsync(r.url);
    // Returning proves nothing about payment; re-read from the server.
    setPhase({ k: "opened", order: r.order_id, provider: r.provider });
    reloadBalance();
    void load();
  }, [amount, load, reloadBalance]);

  const gateways = opts?.gateways ?? [];
  const canPay = gateways.length > 0 && amount.trim().length > 0 && phase.k !== "starting";
  const portalOk = balance.status === "ok";

  return (
    <Screen title="Recharge" activeKey="recharge" showSip={false} showBell={false}>
      {phase.k === "loading" ? (
        <View style={styles.centre}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.sub}>Loading recharge options…</Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          contentContainerStyle={{ paddingBottom: spacing.huge }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ---- Current balance (portal authoritative) ---- */}
          <View style={styles.balanceCard} testID="recharge-balance">
            <Text style={styles.balanceLabel}>Current Balance</Text>
            {portalOk ? (
              <Text style={styles.balanceValue}>
                {Number(balance.balance).toLocaleString("en-US", {
                  minimumFractionDigits: 2, maximumFractionDigits: 2,
                })}
                <Text style={styles.balanceCurrency}> {balance.currency}</Text>
              </Text>
            ) : balance.status === "loading" ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />
            ) : (
              // Never $0.00 — an unreachable portal is not an empty wallet.
              <Text style={styles.balanceUnavailable}>Balance unavailable</Text>
            )}
          </View>

          {/* ---- No provider configured ---- */}
          {gateways.length === 0 ? (
            <View style={styles.centre} testID="recharge-no-gateway">
              <View style={styles.bigIcon}>
                <MaterialCommunityIcons name="credit-card-off-outline" size={28} color={colors.textMuted} />
              </View>
              <Text style={styles.title}>Recharge unavailable</Text>
              <Text style={styles.sub}>
                No payment method is configured for this environment yet.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.section}>Recharge Account</Text>

              <View style={styles.amountBox}>
                <Text style={styles.amountCurrency}>{opts?.currency ?? "USD"}</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ""))}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.textDim}
                  testID="recharge-amount"
                />
              </View>
              <Text style={styles.limits}>
                Min {opts?.min} · Max {opts?.max} {opts?.currency}
              </Text>

              <View style={styles.presets}>
                {PRESETS.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.preset, amount === p && styles.presetOn]}
                    onPress={() => setAmount(p)}
                    testID={`recharge-preset-${p}`}
                  >
                    <Text style={[styles.presetText, amount === p && { color: colors.text }]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {gateways.includes("stripe") && (
                <TouchableOpacity
                  style={[styles.payBtn, !canPay && styles.payBtnOff]}
                  disabled={!canPay}
                  onPress={() => start("stripe")}
                  testID="recharge-stripe"
                >
                  <Ionicons name="card" size={18} color="#fff" />
                  <Text style={styles.payText}>Pay with Card (Stripe)</Text>
                </TouchableOpacity>
              )}

              {gateways.includes("cryptomus") && (
                <TouchableOpacity
                  style={[styles.payBtn, styles.payBtnAlt, !canPay && styles.payBtnOff]}
                  disabled={!canPay}
                  onPress={() => start("cryptomus")}
                  testID="recharge-cryptomus"
                >
                  <MaterialCommunityIcons name="bitcoin" size={18} color="#fff" />
                  <Text style={styles.payText}>Pay with Crypto (Cryptomus)</Text>
                </TouchableOpacity>
              )}

              {phase.k === "starting" && (
                <View style={styles.inlineNote} testID="recharge-processing">
                  <ActivityIndicator color={colors.primary} size="small" />
                  <Text style={styles.sub}>Creating payment…</Text>
                </View>
              )}

              {phase.k === "opened" && (
                <View style={styles.inlineNote} testID="recharge-pending">
                  <Ionicons name="time-outline" size={16} color={colors.yellow} />
                  <Text style={styles.sub}>
                    Payment {phase.order} opened with {phase.provider}. Your balance updates once
                    the payment is confirmed by the provider.
                  </Text>
                </View>
              )}

              {phase.k === "problem" && (
                <View style={styles.inlineNote} testID="recharge-error">
                  <Ionicons name="warning-outline" size={16} color={colors.red} />
                  <Text style={[styles.sub, { color: colors.red }]}>{phase.message}</Text>
                </View>
              )}
            </>
          )}

          {/* ---- Real payment history ---- */}
          <Text style={styles.section}>Recharge History</Text>
          {(opts?.history ?? []).length === 0 ? (
            <View style={styles.centre} testID="recharge-history-empty">
              <Text style={styles.sub}>No recharge payments yet.</Text>
            </View>
          ) : (opts?.history ?? []).map((p: TopupPayment) => (
            <View key={p.id} style={styles.histRow} testID={`recharge-payment-${p.id}`}>
              <View style={{ flex: 1 }}>
                <Text style={styles.histAmount}>
                  {p.amount} {p.currency}
                  <Text style={styles.histProvider}>  · {p.provider}</Text>
                </Text>
                <Text style={styles.histMeta} numberOfLines={1}>
                  {String(p.created_at ?? "").slice(0, 16)} · {p.order_id}
                </Text>
              </View>
              <Text style={[styles.histStatus, { color: statusTone(p.status, colors) }]}>
                {p.status}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

const useStyles = makeThemedStyles((colors) => StyleSheet.create({
  centre: { alignItems: "center", justifyContent: "center", paddingVertical: 34, gap: 6 },
  title: { color: colors.text, fontSize: 15, fontWeight: "700" },
  sub: { color: colors.textMuted, fontSize: 13, textAlign: "center", lineHeight: 19, flexShrink: 1 },
  bigIcon: {
    width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.border, marginBottom: 4,
  },

  balanceCard: {
    backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1,
    borderColor: colors.border, padding: spacing.lg, marginTop: spacing.md,
  },
  balanceLabel: { color: colors.textMuted, fontSize: 12 },
  balanceValue: { color: colors.text, fontSize: 28, fontWeight: "700", marginTop: 6 },
  balanceCurrency: { color: colors.textMuted, fontSize: 14, fontWeight: "600" },
  balanceUnavailable: { color: colors.yellow, fontSize: 18, fontWeight: "700", marginTop: 6 },

  section: { color: colors.text, fontSize: 15, fontWeight: "700", marginTop: spacing.xl },

  amountBox: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1,
    borderColor: colors.border, paddingHorizontal: spacing.lg, marginTop: spacing.sm,
  },
  amountCurrency: { color: colors.textMuted, fontSize: 15, fontWeight: "700" },
  amountInput: { flex: 1, color: colors.text, fontSize: 26, fontWeight: "700", paddingVertical: 12 },
  limits: { color: colors.textDim, fontSize: 11, marginTop: 6 },

  presets: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  preset: {
    flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: radius.md,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  presetOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  presetText: { color: colors.textMuted, fontSize: 14, fontWeight: "700" },

  payBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: colors.primary, borderRadius: radius.pill,
    paddingVertical: 14, marginTop: spacing.md,
  },
  payBtnAlt: { backgroundColor: colors.orange },
  payBtnOff: { opacity: 0.45 },
  payText: { color: colors.onPrimary, fontSize: 15, fontWeight: "700" },

  inlineNote: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md, marginTop: spacing.md,
  },

  histRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md, marginTop: spacing.xs,
  },
  histAmount: { color: colors.text, fontSize: 14, fontWeight: "700" },
  histProvider: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  histMeta: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  histStatus: { fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
}));
