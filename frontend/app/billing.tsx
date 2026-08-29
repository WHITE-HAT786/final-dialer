import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "@/src/components/Screen";
import { colors } from "@/src/theme";
import { apiGet } from "@/src/api";
import { useApiData } from "@/src/hooks/useApiData";
import { useBalance } from "@/src/hooks/useBalance";
import { LoadingBlock, ErrorBlock, EmptyBlock } from "@/src/components/DataStates";
import { StatusPill } from "@/src/components/ListUI";
import { WalletTransaction } from "@/src/types";
import { fmtDate, fmtDateTime, fmtMoney } from "@/src/utils/format";

// Real shape of GET /backend/api/app/billing. Balance here is portal-authoritative,
// but the app reads balance from the SINGLE useBalance() source (no duplicate).
type Subscription = {
  plan_name: string;
  price: string;
  billing_cycle: string | null;
  status: string | null;
  next_billing: string | null;
  grace_until: string | null;
} | null;
type BillingResponse = { transactions: WalletTransaction[]; subscription: Subscription };

const cap = (s?: string | null) => (s ? s[0].toUpperCase() + s.slice(1) : "");

export default function Billing() {
  const { state: balance } = useBalance(); // portal-authoritative, honest-degrading
  const { data, loading, error, refresh, refreshing } = useApiData<BillingResponse>(() => apiGet("/billing"));

  return (
    <Screen title="Billing" activeKey="billing" showSip={false} showBell={false} onRefresh={refresh} refreshing={refreshing}>
      {/* Balance — the single portal source; never $0.00 on failure. */}
      <View style={styles.balanceCard} testID="billing-balance">
        <View style={[styles.miniIcon, { backgroundColor: colors.greenDim }]}>
          <Ionicons name="wallet" size={18} color={colors.green} />
        </View>
        <Text style={styles.tinyLabel}>Account Balance</Text>
        {balance.status === "loading" ? (
          <Text style={styles.balanceValue}>…</Text>
        ) : balance.status === "ok" ? (
          <Text style={styles.balanceValue}>{fmtMoney(balance.balance, balance.currency)}</Text>
        ) : (
          <Text style={[styles.balanceValue, { fontSize: 16, color: colors.textMuted }]}>Balance unavailable</Text>
        )}
        <Text style={styles.sourceNote}>Portal wallet</Text>
      </View>

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={error} onRetry={refresh} />
      ) : (
        <>
          {/* Subscription (real) */}
          <Text style={styles.sectionTitle}>Subscription</Text>
          {data?.subscription ? (
            <View style={styles.card} testID="billing-subscription">
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planName}>{data.subscription.plan_name}</Text>
                  <Text style={styles.meta}>
                    {fmtMoney(data.subscription.price)}{data.subscription.billing_cycle ? ` / ${data.subscription.billing_cycle}` : ""}
                  </Text>
                </View>
                {data.subscription.status ? <StatusPill status={cap(data.subscription.status)} /> : null}
              </View>
              {data.subscription.next_billing ? (
                <Text style={[styles.meta, { marginTop: 8 }]}>Next billing: {fmtDate(data.subscription.next_billing)}</Text>
              ) : null}
              {data.subscription.grace_until ? (
                <Text style={[styles.meta, { color: colors.yellow }]}>Grace until: {fmtDate(data.subscription.grace_until)}</Text>
              ) : null}
            </View>
          ) : (
            <View style={styles.card}><Text style={styles.meta}>No active subscription.</Text></View>
          )}

          {/* Transactions (real portal ledger) */}
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {(data?.transactions.length ?? 0) === 0 ? (
            <EmptyBlock icon="receipt-outline" title="No transactions yet" subtitle="Wallet activity will appear here." />
          ) : (
            data!.transactions.map((t, i) => {
              const amt = parseFloat(t.amount);
              const positive = !isNaN(amt) && amt >= 0;
              return (
                <View key={t.id ?? i} style={styles.txRow} testID={`tx-${t.id ?? i}`}>
                  <View style={[styles.txIcon, { backgroundColor: positive ? colors.greenDim : colors.redDim }]}>
                    <Ionicons name={positive ? "arrow-down" : "arrow-up"} size={16} color={positive ? colors.green : colors.red} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txDesc} numberOfLines={1}>{t.description || cap(t.type) || "Transaction"}</Text>
                    <Text style={styles.meta}>{fmtDateTime(t.created_at)}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.txAmt, { color: positive ? colors.green : colors.red }]}>
                      {positive ? "+" : "-"}{fmtMoney(Math.abs(amt))}
                    </Text>
                    {t.balance_after != null ? <Text style={styles.meta}>Bal {fmtMoney(t.balance_after)}</Text> : null}
                  </View>
                </View>
              );
            })
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  balanceCard: { padding: 14, backgroundColor: colors.card, borderRadius: 14, marginTop: 8, borderWidth: 1, borderColor: colors.border, gap: 4 },
  miniIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  tinyLabel: { color: colors.textMuted, fontSize: 12 },
  balanceValue: { color: colors.green, fontSize: 26, fontWeight: "700" },
  sourceNote: { color: colors.textDim, fontSize: 11 },
  sectionTitle: { color: colors.textDim, fontSize: 11, fontWeight: "700", letterSpacing: 1.2, marginTop: 18, marginBottom: 8, marginLeft: 4 },
  card: { padding: 14, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  planName: { color: "#fff", fontWeight: "700", fontSize: 16 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  txRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, backgroundColor: colors.card, borderRadius: 12, marginTop: 10, borderWidth: 1, borderColor: colors.border },
  txIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  txDesc: { color: "#fff", fontSize: 14, fontWeight: "600" },
  txAmt: { fontSize: 14, fontWeight: "700" },
});
