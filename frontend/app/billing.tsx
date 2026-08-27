// Billing — the customer's PORTAL wallet state and its real transaction ledger.
//
// Data path:
//   GET /backend/api/app/balance.php      -> WalletService::balanceState(uid)
//   GET /backend/api/app/transactions.php -> WalletService::transactions(uid)
//                                            -> portal->getTransactions()
//
// The portal is the single authoritative wallet. This screen never reads
// pkg_wallet, never uses balance_cached, never computes a balance locally, and
// never renders $0.00 as a stand-in for a portal failure — an unavailable
// portal is a different fact from a zero balance, and is shown as such.
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text,
  TouchableOpacity, View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Screen from "@/src/components/Screen";
import { radius, spacing } from "@/src/theme";
import { useTheme } from "@/src/theme/ThemeContext";
import { makeThemedStyles } from "@/src/theme/useThemedStyles";
import { screensApi, type BillingData, type Paged } from "@/src/api";

type Load = { phase: "loading" } | { phase: "ready" } | { phase: "error"; detail: string };

/** Signed amount -> credit/debit presentation, driven only by the real value. */
function amountParts(raw: string) {
  const n = Number(raw);
  const known = Number.isFinite(n);
  const credit = known && n >= 0;
  const abs = known ? Math.abs(n) : 0;
  return {
    known,
    credit,
    text: known
      ? `${credit ? "+" : "-"}${abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : String(raw ?? "—"),
  };
}

function when(ts: string | null) {
  if (!ts) return "—";
  // The portal returns "YYYY-MM-DD HH:MM:SS"; shown as-is rather than
  // re-interpreted into an unknown local timezone.
  return String(ts).replace("T", " ").slice(0, 16);
}

export default function Billing() {
  const { colors } = useTheme();
  const styles = useStyles();
  const [load, setLoad] = useState<Load>({ phase: "loading" });
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [ledger, setLedger] = useState<Paged<any> | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      // Both come from the portal via the app API; neither is derived locally.
      const [b, t] = await Promise.all([
        screensApi.billing(),
        screensApi.transactions().catch(() => ({ items: [], page: 1, limit: 25 } as Paged<any>)),
      ]);
      setBilling(b);
      setLedger(t);
      setLoad({ phase: "ready" });
    } catch (e: any) {
      setLoad({ phase: "error", detail: e?.message ?? "Billing could not be loaded." });
    }
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  const bal = billing?.balance ?? null;
  const portalOk = !!bal?.available && bal?.status === "ok" && bal?.balance != null;
  const items = ledger?.items ?? [];

  return (
    <Screen title="Billing" activeKey="billing" showSip={false} showBell={false}>
      {load.phase === "loading" ? (
        <View style={styles.centre}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.centreSub}>Loading wallet…</Text>
        </View>
      ) : load.phase === "error" ? (
        <View style={styles.centre} testID="billing-error">
          <View style={styles.bigIcon}>
            <Ionicons name="warning-outline" size={28} color={colors.yellow} />
          </View>
          <Text style={styles.centreTitle}>Billing unavailable</Text>
          <Text style={styles.centreSub}>{load.detail}</Text>
          <TouchableOpacity
            style={styles.retry}
            onPress={() => { setLoad({ phase: "loading" }); void fetchAll(); }}
          >
            <Ionicons name="refresh" size={15} color="#fff" />
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          contentContainerStyle={{ paddingBottom: spacing.huge }}
        >
          {/* ---- Portal balance ---- */}
          <View style={styles.balanceCard} testID="billing-balance">
            <View style={styles.balanceHead}>
              <View style={styles.walletIcon}>
                <Ionicons name="wallet" size={17} color={colors.green} />
              </View>
              <Text style={styles.balanceLabel}>Account Balance</Text>
              <View style={[styles.srcPill, portalOk ? styles.srcOk : styles.srcOff]}>
                <Text style={[styles.srcText, { color: portalOk ? colors.green : colors.textMuted }]}>
                  {bal?.source ? String(bal.source).toUpperCase() : "PORTAL"}
                </Text>
              </View>
            </View>

            {portalOk ? (
              <>
                <Text style={styles.balanceValue} testID="billing-balance-value">
                  {Number(bal!.balance).toLocaleString("en-US", {
                    minimumFractionDigits: 2, maximumFractionDigits: 2,
                  })}
                  <Text style={styles.balanceCurrency}> {bal!.currency}</Text>
                </Text>
                <Text style={styles.balanceSub}>Live portal wallet balance</Text>
              </>
            ) : (
              <>
                {/* Deliberately NOT $0.00 — an unavailable portal is not zero money. */}
                <Text style={styles.balanceUnavailable} testID="billing-balance-unavailable">
                  Balance unavailable
                </Text>
                <Text style={styles.balanceSub}>
                  The portal wallet could not be reached. This is not a zero balance.
                </Text>
              </>
            )}
          </View>

          {/* ---- Subscription, only when the API actually returns one ---- */}
          {!!billing?.subscription && (
            <View style={styles.subCard} testID="billing-subscription">
              <MaterialCommunityIcons name="card-account-details-outline" size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.subLabel}>Subscription</Text>
                <Text style={styles.subValue}>{billing.subscription.name ?? "Active"}</Text>
              </View>
            </View>
          )}

          {/* ---- Portal transaction ledger ---- */}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Transaction History</Text>
            <Text style={styles.sectionMeta}>
              {ledger?.source ? String(ledger.source).toUpperCase() : "PORTAL"} LEDGER
            </Text>
          </View>

          {items.length === 0 ? (
            <View style={styles.centre} testID="billing-ledger-empty">
              <View style={styles.bigIcon}>
                <MaterialCommunityIcons name="receipt-text-outline" size={28} color={colors.textMuted} />
              </View>
              <Text style={styles.centreTitle}>No transactions yet</Text>
              <Text style={styles.centreSub}>
                Portal wallet activity for this account will appear here.
              </Text>
            </View>
          ) : items.map((t: any, i: number) => {
            const amt = amountParts(String(t.amount ?? ""));
            return (
              <View key={t.id ?? i} style={styles.txnRow} testID={`billing-txn-${i}`}>
                <View
                  style={[
                    styles.txnIcon,
                    { backgroundColor: amt.credit ? colors.greenDim : colors.redDim },
                  ]}
                >
                  <Ionicons
                    name={amt.credit ? "arrow-down" : "arrow-up"}
                    size={14}
                    color={amt.credit ? colors.green : colors.red}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.txnDesc} numberOfLines={1}>
                    {t.description || t.type || "Transaction"}
                  </Text>
                  <Text style={styles.txnMeta} numberOfLines={1}>
                    {when(t.created_at)}
                    {t.type ? ` · ${t.type}` : ""}
                    {t.id != null ? ` · #${t.id}` : ""}
                  </Text>
                </View>

                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[styles.txnAmount, { color: amt.credit ? colors.green : colors.red }]}>
                    {amt.text}
                  </Text>
                  {t.balance_after != null && (
                    <Text style={styles.txnBalance}>bal {String(t.balance_after)}</Text>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}

const useStyles = makeThemedStyles((colors) => StyleSheet.create({
  centre: {
    alignItems: "center", justifyContent: "center",
    paddingVertical: 40, paddingHorizontal: spacing.xl, gap: 6,
  },
  centreTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  centreSub: { color: colors.textMuted, fontSize: 13, textAlign: "center", lineHeight: 19 },
  bigIcon: {
    width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.border, marginBottom: 4,
  },
  retry: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12,
    backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: radius.pill,
  },
  retryText: { color: colors.onPrimary, fontWeight: "700", fontSize: 13 },

  balanceCard: {
    backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1,
    borderColor: colors.border, padding: spacing.lg, marginTop: spacing.md,
  },
  balanceHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  walletIcon: {
    width: 30, height: 30, borderRadius: 15, alignItems: "center",
    justifyContent: "center", backgroundColor: colors.greenDim,
  },
  balanceLabel: { color: colors.textMuted, fontSize: 12, flex: 1 },
  srcPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  srcOk: { backgroundColor: colors.greenDim },
  srcOff: { backgroundColor: colors.cardAlt },
  srcText: { fontSize: 10, fontWeight: "700" },
  balanceValue: { color: colors.text, fontSize: 30, fontWeight: "700", marginTop: 10 },
  balanceCurrency: { color: colors.textMuted, fontSize: 15, fontWeight: "600" },
  balanceUnavailable: { color: colors.yellow, fontSize: 20, fontWeight: "700", marginTop: 10 },
  balanceSub: { color: colors.textDim, fontSize: 11, marginTop: 4 },

  subCard: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md, marginTop: spacing.sm,
  },
  subLabel: { color: colors.textMuted, fontSize: 11 },
  subValue: { color: colors.text, fontSize: 14, fontWeight: "700", marginTop: 2 },

  sectionHead: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: spacing.xl, marginBottom: spacing.xs,
  },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  sectionMeta: { color: colors.textDim, fontSize: 10, fontWeight: "700" },

  txnRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.card, paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, marginTop: spacing.xs,
  },
  txnIcon: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  txnDesc: { color: colors.text, fontSize: 13, fontWeight: "600" },
  txnMeta: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  txnAmount: { fontSize: 14, fontWeight: "700" },
  txnBalance: { color: colors.textDim, fontSize: 10, marginTop: 2 },
}));
