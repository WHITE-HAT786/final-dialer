import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "@/src/components/Screen";
import { colors } from "@/src/theme";
import { apiGet } from "@/src/api";
import { useApiData } from "@/src/hooks/useApiData";
import { LoadingBlock, ErrorBlock, EmptyBlock } from "@/src/components/DataStates";
import { StatusPill } from "@/src/components/ListUI";
import { fmtDate, fmtMoney } from "@/src/utils/format";

// Real shape of GET /backend/api/app/plans.
type Plan = {
  code: string;
  name: string;
  tagline: string | null;
  price_monthly: string;
  price_yearly: string;
  max_sip_accounts: number | null;
  max_extensions: number | null;
  max_numbers: number | null;
  minute_limit: number | null;
  sms_limit: number | null;
  is_popular: boolean;
  status: string;
};
type CurrentSub = {
  plan_name: string;
  price: string;
  billing_cycle: string | null;
  status: string | null;
  next_billing: string | null;
};
type PlansResponse = { plans: Plan[]; current: CurrentSub | null };

function features(p: Plan): string[] {
  const f: string[] = [];
  if (p.minute_limit != null) f.push(`${p.minute_limit.toLocaleString()} min`);
  if (p.max_extensions != null) f.push(`${p.max_extensions} ext`);
  if (p.max_sip_accounts != null) f.push(`${p.max_sip_accounts} SIP`);
  if (p.max_numbers != null) f.push(`${p.max_numbers} numbers`);
  if (p.sms_limit != null) f.push(`${p.sms_limit.toLocaleString()} SMS`);
  return f;
}

export default function Plans() {
  const { data, loading, error, refresh, refreshing } = useApiData<PlansResponse>(() => apiGet("/plans"));

  return (
    <Screen title="Plans" activeKey="plans" showSip={false} showBell={false} onRefresh={refresh} refreshing={refreshing}>
      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={error} onRetry={refresh} />
      ) : (
        <>
          {/* Current subscription (real) */}
          <Text style={styles.sectionTitle}>Your Plan</Text>
          {data?.current ? (
            <View style={styles.currentCard} testID="plan-current">
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={styles.currentIcon}><Ionicons name="ribbon" size={22} color={colors.primary} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.currentName}>{data.current.plan_name}</Text>
                  <Text style={styles.meta}>
                    {fmtMoney(data.current.price)}{data.current.billing_cycle ? ` / ${data.current.billing_cycle}` : ""}
                  </Text>
                </View>
                {data.current.status ? <StatusPill status={data.current.status[0].toUpperCase() + data.current.status.slice(1)} /> : null}
              </View>
              {data.current.next_billing ? (
                <Text style={[styles.meta, { marginTop: 8 }]}>Next billing: {fmtDate(data.current.next_billing)}</Text>
              ) : null}
            </View>
          ) : (
            <View style={styles.noPlan}><Text style={styles.meta}>No plan assigned.</Text></View>
          )}

          {/* Catalog (real, platform-wide) */}
          <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Available Plans</Text>
          {(data?.plans.length ?? 0) === 0 ? (
            <EmptyBlock icon="pricetags-outline" title="No plans available" />
          ) : (
            data!.plans.map((p) => (
              <View key={p.code} style={styles.row} testID={`plan-${p.code}`}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <Text style={styles.name}>{p.name}</Text>
                    {p.is_popular ? (
                      <View style={styles.popular}><Text style={styles.popularText}>Popular</Text></View>
                    ) : null}
                  </View>
                  {p.tagline ? <Text style={styles.meta}>{p.tagline}</Text> : null}
                  <Text style={styles.meta}>{features(p).join(" · ") || "—"}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.price}>{fmtMoney(p.price_monthly)}</Text>
                  <Text style={styles.meta}>monthly</Text>
                </View>
              </View>
            ))
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { color: colors.textDim, fontSize: 11, fontWeight: "700", letterSpacing: 1.2, marginTop: 8, marginBottom: 8, marginLeft: 4 },
  currentCard: { padding: 14, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.primary + "60" },
  currentIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" },
  currentName: { color: "#fff", fontWeight: "700", fontSize: 16 },
  noPlan: { padding: 16, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, backgroundColor: colors.card, borderRadius: 12, marginTop: 10, borderWidth: 1, borderColor: colors.border },
  name: { color: "#fff", fontWeight: "700", fontSize: 14 },
  meta: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  price: { color: "#fff", fontWeight: "700", fontSize: 16 },
  popular: { backgroundColor: colors.primaryDim, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  popularText: { color: colors.primary, fontSize: 10, fontWeight: "700" },
});
