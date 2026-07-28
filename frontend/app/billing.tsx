import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, TextInput } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Screen from "@/src/components/Screen";
import { colors } from "@/src/theme";
import { apiGet } from "@/src/api";
import { StatusPill } from "@/src/components/ListUI";
import { useMultiSip } from "@/src/sip/MultiSipContext";
import SipPickerSheet from "@/src/components/SipPickerSheet";

const TABS = [
  { key: "invoices", label: "Invoices", icon: "document-text" },
  { key: "payments", label: "Payments", icon: "card" },
  { key: "transactions", label: "Transactions", icon: "swap-horizontal" },
  { key: "clients", label: "Clients", icon: "people" },
  { key: "reports", label: "Reports", icon: "bar-chart" },
];

function money(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Billing() {
  const [data, setData] = useState<any>(null);
  const [active, setActive] = useState("invoices");
  const [sipPicker, setSipPicker] = useState(false);
  const { selectedAccount } = useMultiSip();
  const selected = {
    name: selectedAccount?.displayName || selectedAccount?.username || "No SIP Account",
    host: selectedAccount?.wssUrl?.replace(/^wss?:\/\//, "").split("/")[0] || "",
    did: selectedAccount?.callerId || (selectedAccount ? `${selectedAccount.username}@${selectedAccount.domain}` : ""),
    color: (selectedAccount?.color as string) || colors.primary,
  };
  useEffect(() => { apiGet("/billing").then(setData); }, []);

  return (
    <Screen title="Billing" activeKey="billing" showSip={false} showBell={false}
      right={<TouchableOpacity style={styles.iconBtn}><Ionicons name="calendar" size={18} color="#fff" /></TouchableOpacity>}
    >
      {!data ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : (
        <>
          {/* SIP Trunk selector */}
          <TouchableOpacity
            style={styles.trunkCard}
            onPress={() => setSipPicker(true)}
            testID="billing-trunk-switcher"
          >
            <View style={[styles.trunkIcon, { backgroundColor: selected.color + "22" }]}>
              <MaterialCommunityIcons name="server-network" size={20} color={selected.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.trunkLabel}>SIP Trunk</Text>
              <Text style={styles.trunkName} numberOfLines={1}>{selected.name}</Text>
              <Text style={styles.trunkMeta} numberOfLines={1}>{selected.host} · {selected.did}</Text>
            </View>
            <View style={styles.changeBtn}>
              <Ionicons name="swap-horizontal" size={14} color={colors.primary} />
              <Text style={styles.changeBtnText}>Change</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.statsRow}>
            <StatCard color={colors.primary} icon="wallet" label="Total Balance" value={`$${money(data.stats.total_balance)}`} sub="This Month" change={data.stats.total_change} positive />
            <StatCard color={colors.green} icon="card" label="Paid Amount" value={`$${money(data.stats.paid)}`} sub="This Month" change={data.stats.paid_change} positive />
          </View>
          <View style={styles.statsRow}>
            <StatCard color={colors.yellow} icon="document-text" label="Unpaid Amount" value={`$${money(data.stats.unpaid)}`} sub="This Month" change={data.stats.unpaid_change} positive />
            <StatCard color={colors.red} icon="alert-circle" label="Overdue Amount" value={`$${money(data.stats.overdue)}`} sub="This Month" change={data.stats.overdue_change} positive={false} />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 14 }}>
            {TABS.map(t => (
              <TouchableOpacity key={t.key} onPress={() => setActive(t.key)} style={[styles.tab, active === t.key && styles.tabActive]}>
                <Ionicons name={t.icon as any} size={16} color={active === t.key ? colors.primary : colors.textMuted} />
                <Text style={[styles.tabLabel, active === t.key && { color: colors.primary, fontWeight: "700" }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={styles.search}>
              <Ionicons name="search" size={16} color={colors.textMuted} />
              <TextInput style={styles.searchInput} placeholder="Search invoices..." placeholderTextColor={colors.textDim} />
            </View>
            <TouchableOpacity style={styles.filterBtn}>
              <Ionicons name="funnel-outline" size={14} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>Filter</Text>
              <Ionicons name="chevron-down" size={12} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Recent Invoices</Text>
              <Text style={{ color: colors.primary, fontSize: 12 }}>View All</Text>
            </View>
            {data.invoices.map((inv: any, i: number) => (
              <View key={inv.id} style={[styles.invRow, i !== data.invoices.length - 1 && styles.divider]}>
                <View style={[styles.invIcon, { backgroundColor: inv.status === "Paid" ? colors.primaryDim : inv.status === "Unpaid" ? colors.yellowDim : colors.redDim }]}>
                  <Ionicons name="document-text" size={16} color={inv.status === "Paid" ? colors.primary : inv.status === "Unpaid" ? colors.yellow : colors.red} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "700" }} numberOfLines={1}>{inv.id}</Text>
                  <Text style={styles.client} numberOfLines={1}>{inv.client}</Text>
                  <Text style={styles.date} numberOfLines={1}>{inv.date} · Due {inv.due}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>${money(inv.amount)}</Text>
                  <StatusPill status={inv.status} />
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </View>
            ))}
            <TouchableOpacity style={styles.viewAll}>
              <MaterialCommunityIcons name="file-document-outline" size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}>View All Invoices</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Quick Actions</Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              {[
                { icon: "document-text", color: colors.primary, label: "Create Invoice" },
                { icon: "card", color: colors.green, label: "Add Payment" },
                { icon: "download", color: colors.purple, label: "Download Report" },
                { icon: "pie-chart", color: colors.yellow, label: "View Reports" },
              ].map((a, i) => (
                <TouchableOpacity key={i} style={styles.qa}>
                  <View style={[styles.qaIcon, { backgroundColor: a.color + "22" }]}>
                    <Ionicons name={a.icon as any} size={20} color={a.color} />
                  </View>
                  <Text style={styles.qaLabel}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Summary</Text>
              <View style={styles.datePill}>
                <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, fontSize: 11 }}>May 01 - May 31, 2024</Text>
                <Ionicons name="chevron-down" size={12} color={colors.textMuted} />
              </View>
            </View>
            <View style={{ flexDirection: "row", marginTop: 14 }}>
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={styles.subLabel}>Invoice Summary</Text>
                <View style={styles.donut}>
                  <Text style={{ color: colors.textMuted, fontSize: 11 }}>Total</Text>
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 22 }}>{data.summary.total}</Text>
                </View>
                <View style={{ marginTop: 8, gap: 4 }}>
                  <LegendRow color={colors.primary} label="Paid" value={`${data.summary.paid} (66.2%)`} />
                  <LegendRow color={colors.yellow} label="Unpaid" value={`${data.summary.unpaid} (23.4%)`} />
                  <LegendRow color={colors.red} label="Overdue" value={`${data.summary.overdue} (10.4%)`} />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.subLabel}>Payment Methods</Text>
                {data.payment_methods.map((m: any, i: number) => (
                  <View key={i} style={styles.methodRow}>
                    <MaterialCommunityIcons name="bank" size={14} color={colors.textMuted} />
                    <Text style={{ color: "#fff", fontSize: 12, flex: 1 }}>{m.method}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: "600" }}>{m.percent}%</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
          <SipPickerSheet visible={sipPicker} onClose={() => setSipPicker(false)} title="Select SIP Trunk" />
        </>
      )}
    </Screen>
  );
}

function StatCard({ color, icon, label, value, sub, change, positive }: any) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.icon, { backgroundColor: color + "22" }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <View style={{ flexDirection: "row", gap: 4, marginTop: 2 }}>
        <Text style={styles.statSub}>{sub}</Text>
        <Text style={{ color: positive ? colors.green : colors.red, fontSize: 10, fontWeight: "700" }}>{change}</Text>
      </View>
    </View>
  );
}

function LegendRow({ color, label, value }: any) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ color: colors.textMuted, fontSize: 11 }}>{label}</Text>
      <Text style={{ color: "#fff", fontSize: 11, marginLeft: "auto" }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  iconBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: colors.card, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  trunkCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, backgroundColor: colors.card, borderRadius: 14, marginTop: 8, borderWidth: 1, borderColor: colors.border },
  trunkIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  trunkLabel: { color: colors.textMuted, fontSize: 11 },
  trunkName: { color: "#fff", fontSize: 14, fontWeight: "700", marginTop: 2 },
  trunkMeta: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  changeBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.primary },
  changeBtnText: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  statsRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  statCard: { flex: 1, padding: 12, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  icon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  statLabel: { color: colors.textMuted, fontSize: 11, marginTop: 6 },
  statValue: { color: "#fff", fontSize: 18, fontWeight: "700", marginTop: 2 },
  statSub: { color: colors.textMuted, fontSize: 10 },
  tab: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  tabActive: { borderColor: colors.primary, backgroundColor: colors.primaryDim + "40" },
  tabLabel: { color: colors.textMuted, fontSize: 12 },
  search: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 12, height: 40, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, color: "#fff", fontSize: 13 },
  filterBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  card: { padding: 14, backgroundColor: colors.card, borderRadius: 14, marginTop: 14, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { color: "#fff", fontWeight: "700", fontSize: 15 },
  invRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  invIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  client: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  date: { color: colors.textMuted, fontSize: 11 },
  viewAll: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10, padding: 12, backgroundColor: colors.primaryDim + "40", borderRadius: 10 },
  qa: { flex: 1, alignItems: "center", gap: 8, padding: 10, backgroundColor: colors.bgAlt, borderRadius: 10 },
  qaIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  qaLabel: { color: "#fff", fontSize: 11, textAlign: "center" },
  datePill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.bgAlt, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  subLabel: { color: colors.textMuted, fontSize: 12, marginBottom: 8 },
  donut: { width: 100, height: 100, borderRadius: 50, borderWidth: 10, borderColor: colors.primary, alignItems: "center", justifyContent: "center" },
  methodRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
});
