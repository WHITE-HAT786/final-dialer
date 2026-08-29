import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "@/src/components/Screen";
import { colors } from "@/src/theme";
import { apiGet } from "@/src/api";
import { useApiData } from "@/src/hooks/useApiData";
import { LoadingBlock, ErrorBlock, EmptyBlock } from "@/src/components/DataStates";
import { StatusPill } from "@/src/components/ListUI";
import { fmtDate } from "@/src/utils/format";

// Real shape of GET /backend/api/app/support.
type Ticket = {
  id: number;
  reference: string | null;
  subject: string | null;
  category: string | null;
  priority: string | null;
  status: string | null;
  last_reply_at: string | null;
  created_at: string | null;
};
type SupportResponse = { items: Ticket[] };

const cap = (s?: string | null) => (s ? s[0].toUpperCase() + s.slice(1) : "");

export default function Support() {
  const { data, loading, error, refresh, refreshing } = useApiData<SupportResponse>(() => apiGet("/support"));

  return (
    <Screen title="Help & Support" activeKey="help" showSip={false} showBell={false} onRefresh={refresh} refreshing={refreshing}>
      {/* Real, static contact detail (not fabricated data). */}
      <View style={styles.contactCard}>
        <View style={styles.contactIcon}><Ionicons name="mail" size={18} color={colors.primary} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.contactLabel}>Email Support</Text>
          <Text style={styles.contactValue}>support@depthroute.com</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Your Tickets</Text>
      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={error} onRetry={refresh} />
      ) : (data?.items.length ?? 0) === 0 ? (
        <EmptyBlock icon="ticket-outline" title="No support tickets" subtitle="Tickets you open will appear here." />
      ) : (
        data!.items.map((t) => (
          <View key={t.id} style={styles.row} testID={`ticket-${t.id}`}>
            <View style={{ flex: 1 }}>
              {t.reference ? <Text style={styles.ref}>{t.reference}</Text> : null}
              <Text style={styles.subject}>{t.subject || "(no subject)"}</Text>
              <Text style={styles.meta}>
                {[cap(t.category), cap(t.priority)].filter(Boolean).join(" · ")}
                {t.created_at ? `  •  ${fmtDate(t.created_at)}` : ""}
              </Text>
            </View>
            {t.status ? <StatusPill status={cap(t.status)} /> : null}
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  contactCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: colors.card, borderRadius: 14, marginTop: 8, borderWidth: 1, borderColor: colors.border },
  contactIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" },
  contactLabel: { color: colors.textMuted, fontSize: 12 },
  contactValue: { color: colors.primary, fontSize: 13, fontWeight: "600", marginTop: 2 },
  sectionTitle: { color: colors.textDim, fontSize: 11, fontWeight: "700", letterSpacing: 1.2, marginTop: 18, marginBottom: 8, marginLeft: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, backgroundColor: colors.card, borderRadius: 12, marginTop: 10, borderWidth: 1, borderColor: colors.border },
  ref: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  subject: { color: "#fff", fontSize: 14, fontWeight: "600", marginTop: 2 },
  meta: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
});
