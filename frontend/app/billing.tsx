import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, TextInput } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Screen from "@/src/components/Screen";
import { useTheme, useThemedStyles, type Palette } from "@/src/theme";
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
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [data, setData] = useState<any>(null);
  const [active, setActive] = useState("invoices");
  const [sipPicker, setSipPicker] = useState(false);
  const { selectedAccount } = useMultiSip();
  const selected = {
    name: selectedAccount?.displayName || selectedAccount?.username || "No SIP Account",
    host: selectedAccount?.wssUrl?.replace(/^wss?:\/\//, "").split("/")[0] || "",
    did: selectedAccount?.callerId || (selectedAccount ? `${selectedAccount.username}@${selectedAccount.domain}` : ""),
    color: (selectedAccount?.color as string) || c.primary,
  };
  useEffect(() => { apiGet("/billing").then(setData); }, []);

  return (
    <Screen title="Billing" activeKey="billing" showSip={false} showBell={false}
      right={<TouchableOpacity style={styles.iconBtn}><Ionicons name="calendar" size={18} color={c.text} /></TouchableOpacity>}
    >
      {!data ? <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} /> : (
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
              <Ionicons name="swap-horizontal" size={14} color={c.primary} />
              <Text style={styles.changeBtnText}>Change</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.statsRow}>
            <StatCard color={c.primary} icon="wallet" label="Total Balance" value={`$${money(data.stats.total_balance)}`} sub="This Month" change={data.stats.total_change} positive />
            <StatCard color={c.green} icon="card" label="Paid Amount" value={`$${money(data.stats.paid)}`} sub="This Month" change={data.stats.paid_change} positive />
          </View>
          <View style={styles.statsRow}>
            <StatCard color={c.yellow} icon="document-text" label="Unpaid Amount" value={`$${money(data.stats.unpaid)}`} sub="This Month" change={data.stats.unpaid_change} positive />
            <StatCard color={c.red} icon="alert-circle" label="Overdue Amount" value={`$${money(data.stats.overdue)}`} sub="This Month" change={data.stats.overdue_change} positive={false} />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 14 }}>
            {TABS.map(t => (
              <TouchableOpacity key={t.key} onPress={() => setActive(t.key)} style={[styles.tab, active === t.key && styles.tabActive]}>
                <Ionicons name={t.icon as any} size={16} color={active === t.key ? c.primary : c.textMuted} />
                <Text style={[styles.tabLabel, active === t.key && { color: c.primary, fontWeight: "700" }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={styles.search}>
              <Ionicons name="search" size={16} color={c.textMuted} />
              <TextInput style={styles.searchInput} placeholder="Search invoices..." placeholderTextColor={c.textDim} />
            </View>
            <TouchableOpacity style={styles.filterBtn}>
              <Ionicons name="funnel-outline" size={14} color={c.textMuted} />
              <Text style={{ color: c.textMuted, fontSize: 12 }}>Filter</Text>
              <Ionicons name="chevron-down" size={12} color={c.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Recent Invoices</Text>
              <Text style={{ color: c.primary, fontSize: 12 }}>View All</Text>
            </View>
            {data.invoices.map((inv: any, i: number) => (
              <View key={inv.id} style={[styles.invRow, i !== data.invoices.length - 1 && styles.divider]}>
                <View style={[styles.invIcon, { backgroundColor: inv.status === "Paid" ? c.primaryDim : inv.status === "Unpaid" ? c.yellowDim : c.redDim }]}>
                  <Ionicons name="document-text" size={16} color={inv.status === "Paid" ? c.primary : inv.status === "Unpaid" ? c.yellow : c.red} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.primary, fontSize: 12, fontWeight: "700" }} numberOfLines={1}>{inv.id}</Text>
                  <Text style={styles.client} numberOfLines={1}>{inv.client}</Text>
                  <Text style={styles.date} numberOfLines={1}>{inv.date} · Due {inv.due}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text style={{ color: c.text, fontWeight: "700", fontSize: 14 }}>${money(inv.amount)}</Text>
                  <StatusPill status={inv.status} />
                </View>
                <Ionicons name="chevron-forward" size={14} color={c.textMuted} />
              </View>
            ))}
            <TouchableOpacity style={styles.viewAll}>
              <MaterialCommunityIcons name="file-document-outline" size={16} color={c.primary} />
              <Text style={{ color: c.primary, fontSize: 13, fontWeight: "600" }}>View All Invoices</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Quick Actions</Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              {[
                { icon: "document-text", color: c.primary, label: "Create Invoice" },
                { icon: "card", color: c.green, label: "Add Payment" },
                { icon: "download", color: c.purple, label: "Download Report" },
                { icon: "pie-chart", color: c.yellow, label: "View Reports" },
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
                <Ionicons name="calendar-outline" size={12} color={c.textMuted} />
                <Text style={{ color: c.textMuted, fontSize: 11 }}>May 01 - May 31, 2024</Text>
                <Ionicons name="chevron-down" size={12} color={c.textMuted} />
              </View>
            </View>
            <View style={{ flexDirection: "row", marginTop: 14 }}>
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={styles.subLabel}>Invoice Summary</Text>
                <View style={styles.donut}>
                  <Text style={{ color: c.textMuted, fontSize: 11 }}>Total</Text>
                  <Text style={{ color: c.text, fontWeight: "700", fontSize: 22 }}>{data.summary.total}</Text>
                </View>
                <View style={{ marginTop: 8, gap: 4 }}>
                  <LegendRow color={c.primary} label="Paid" value={`${data.summary.paid} (66.2%)`} />
                  <LegendRow color={c.yellow} label="Unpaid" value={`${data.summary.unpaid} (23.4%)`} />
                  <LegendRow color={c.red} label="Overdue" value={`${data.summary.overdue} (10.4%)`} />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.subLabel}>Payment Methods</Text>
                {data.payment_methods.map((m: any, i: number) => (
                  <View key={i} style={styles.methodRow}>
                    <MaterialCommunityIcons name="bank" size={14} color={c.textMuted} />
                    <Text style={{ color: c.text, fontSize: 12, flex: 1 }}>{m.method}</Text>
                    <Text style={{ color: c.textMuted, fontSize: 12, fontWeight: "600" }}>{m.percent}%</Text>
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
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.statCard}>
      <View style={[styles.icon, { backgroundColor: color + "22" }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <View style={{ flexDirection: "row", gap: 4, marginTop: 2 }}>
        <Text style={styles.statSub}>{sub}</Text>
        <Text style={{ color: positive ? c.green : c.red, fontSize: 10, fontWeight: "700" }}>{change}</Text>
      </View>
    </View>
  );
}

function LegendRow({ color, label, value }: any) {
  const c = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ color: c.muted, fontSize: 11 }}>{label}</Text>
      <Text style={{ color: c.text, fontSize: 11, marginLeft: "auto" }}>{value}</Text>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    iconBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: c.card, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.border },
    trunkCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, backgroundColor: c.card, borderRadius: 14, marginTop: 8, borderWidth: 1, borderColor: c.border },
    trunkIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
    trunkLabel: { color: c.textMuted, fontSize: 11 },
    trunkName: { color: c.text, fontSize: 14, fontWeight: "700", marginTop: 2 },
    trunkMeta: { color: c.textMuted, fontSize: 11, marginTop: 2 },
    changeBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: c.primary },
    changeBtnText: { color: c.primary, fontSize: 12, fontWeight: "700" },
    statsRow: { flexDirection: "row", gap: 8, marginTop: 8 },
    statCard: { flex: 1, padding: 12, backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.border },
    icon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    statLabel: { color: c.textMuted, fontSize: 11, marginTop: 6 },
    statValue: { color: c.text, fontSize: 18, fontWeight: "700", marginTop: 2 },
    statSub: { color: c.textMuted, fontSize: 10 },
    tab: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: c.card, borderWidth: 1, borderColor: c.border },
    tabActive: { borderColor: c.primary, backgroundColor: c.primaryDim + "40" },
    tabLabel: { color: c.textMuted, fontSize: 12 },
    search: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: c.card, borderRadius: 10, paddingHorizontal: 12, height: 40, borderWidth: 1, borderColor: c.border },
    searchInput: { flex: 1, color: c.text, fontSize: 13 },
    filterBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, backgroundColor: c.card, borderRadius: 10, borderWidth: 1, borderColor: c.border },
    card: { padding: 14, backgroundColor: c.card, borderRadius: 14, marginTop: 14, borderWidth: 1, borderColor: c.border },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    cardTitle: { color: c.text, fontWeight: "700", fontSize: 15 },
    invRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
    divider: { borderBottomWidth: 1, borderBottomColor: c.borderSoft },
    invIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    client: { color: c.textMuted, fontSize: 11, marginTop: 2 },
    date: { color: c.textMuted, fontSize: 11 },
    viewAll: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10, padding: 12, backgroundColor: c.primaryDim + "40", borderRadius: 10 },
    qa: { flex: 1, alignItems: "center", gap: 8, padding: 10, backgroundColor: c.bgAlt, borderRadius: 10 },
    qaIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
    qaLabel: { color: c.text, fontSize: 11, textAlign: "center" },
    datePill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: c.bgAlt, borderRadius: 8, borderWidth: 1, borderColor: c.border },
    subLabel: { color: c.textMuted, fontSize: 12, marginBottom: 8 },
    donut: { width: 100, height: 100, borderRadius: 50, borderWidth: 10, borderColor: c.primary, alignItems: "center", justifyContent: "center" },
    methodRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.borderSoft },
  });
