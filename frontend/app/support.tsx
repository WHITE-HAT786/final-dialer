import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Screen from "@/src/components/Screen";
import { type Palette } from "@/src/theme";
import { useTheme } from "@/src/theme/ThemeContext";
import { makeThemedStyles } from "@/src/theme/useThemedStyles";
import { screensApi } from "@/src/api";

const statusC = (colors: Palette): Record<string, { bg: string; fg: string }> => ({
  Open: { bg: colors.greenDim, fg: colors.green },
  "In Progress": { bg: colors.yellowDim, fg: colors.yellow },
  Closed: { bg: colors.card, fg: colors.textMuted },
});

export default function Support() {
  const { colors } = useTheme();
  const styles = useStyles();
  const [data, setData] = useState<any>(null);
  useEffect(() => { screensApi.support().then(setData).catch(() => setData([])); }, []);

  return (
    <Screen title="Help & Support" activeKey="help" showSip={false} showBell={false}
      right={<TouchableOpacity style={styles.iconBtn}><Ionicons name="headset" size={18} color={colors.primary} /></TouchableOpacity>}
    >
      {!data ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : (
        <>
          <View style={styles.heroCard}>
            <View style={[styles.heroIcon, { backgroundColor: colors.primaryDim }]}>
              <Ionicons name="headset" size={26} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>How can we help you?</Text>
              <Text style={styles.heroSub}>Search our knowledge base or reach out to our support team.</Text>
            </View>
          </View>

          <View style={styles.search}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for articles, topics or questions..."
              placeholderTextColor={colors.textDim}
              testID="support-search"
            />
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Popular Topics</Text>
              <Text style={{ color: colors.primary, fontSize: 12 }}>View All</Text>
            </View>
            {[].map((t: any, i: number) => (
              <TouchableOpacity key={t.id} style={[styles.topicRow, false && { borderBottomWidth: 1, borderBottomColor: colors.borderSoft }]}>
                <View style={[styles.topicIcon, { backgroundColor: t.color + "22" }]}>
                  <Ionicons name={t.icon} size={18} color={t.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>{t.title}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{t.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <View style={[styles.card, { flex: 1, marginTop: 0 }]}>
              <Text style={styles.cardTitle}>Contact Support</Text>
              <View style={styles.contactRow}>
                <View style={[styles.smIcon, { backgroundColor: colors.primaryDim }]}>
                  <Ionicons name="mail" size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 12, fontWeight: "600" }}>Email Support</Text>
                  <Text style={{ color: colors.primary, fontSize: 11, marginTop: 2 }}>support@depthroute.com</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </View>
              <View style={styles.contactRow}>
                <View style={[styles.smIcon, { backgroundColor: colors.greenDim }]}>
                  <Ionicons name="chatbubbles" size={16} color={colors.green} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 12, fontWeight: "600" }}>Live Chat</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>Chat with our support team</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </View>
              <View style={[styles.contactRow, { borderBottomWidth: 0 }]}>
                <View style={[styles.smIcon, { backgroundColor: colors.purpleDim }]}>
                  <Ionicons name="time" size={16} color={colors.purple} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 12, fontWeight: "600" }}>Support Hours</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>Mon - Fri | 9:00 AM - 6:00 PM (IST)</Text>
                </View>
              </View>
            </View>

            <View style={[styles.card, { flex: 1, marginTop: 0 }]}>
              <Text style={styles.cardTitle}>Support Information</Text>
              {[
                { icon: "help-circle", color: colors.primary, label: "FAQs", sub: "Find quick answers to common questions" },
                { icon: "book", color: colors.orange, label: "Knowledge Base", sub: "Browse our detailed articles", mci: true },
                { icon: "cloud-download", color: colors.green, label: "Downloads", sub: "User guides and documentation" },
                { icon: "megaphone", color: colors.purple, label: "System Status", sub: "Check system status and uptime" },
              ].map((r, i) => (
                <View key={i} style={styles.contactRow}>
                  <View style={[styles.smIcon, { backgroundColor: r.color + "22" }]}>
                    {r.mci ? (
                      <MaterialCommunityIcons name="book-open-variant" size={16} color={r.color} />
                    ) : (
                      <Ionicons name={r.icon as any} size={16} color={r.color} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 12, fontWeight: "600" }}>{r.label}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 2 }} numberOfLines={2}>{r.sub}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                </View>
              ))}
            </View>
          </View>

          <View style={styles.ticketBanner}>
            <View style={[styles.smIcon, { backgroundColor: colors.primaryDim }]}>
              <MaterialCommunityIcons name="ticket-confirmation" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: "700", fontSize: 14 }}>Submit a Ticket</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{"Can't find what you're looking for? Submit a ticket and we'll get back to you."}</Text>
            </View>
            <TouchableOpacity style={styles.newTicket}>
              <Ionicons name="add" size={14} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>New Ticket</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Recent Tickets</Text>
              <Text style={{ color: colors.primary, fontSize: 12 }}>View All</Text>
            </View>
            {(Array.isArray(data) ? data : []).map((t: any, i: number) => {
              const SC = statusC(colors);
              const c = SC[t.status] || SC.Closed;
              return (
                <View key={i} style={[styles.ticketRow, i !== (Array.isArray(data) ? data : []).length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderSoft }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "700" }}>{t.id}</Text>
                    <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600", marginTop: 2 }}>{t.title}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>Created: {t.created}  •  Updated: {t.updated}</Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: c.bg }]}>
                    <Text style={{ color: c.fg, fontSize: 10, fontWeight: "700" }}>{t.status}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                </View>
              );
            })}
          </View>
        </>
      )}
    </Screen>
  );
}

const useStyles = makeThemedStyles((colors) => StyleSheet.create({
  iconBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: colors.card, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  heroCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, backgroundColor: colors.card, borderRadius: 14, marginTop: 8, borderWidth: 1, borderColor: colors.border },
  heroIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  heroTitle: { color: colors.text, fontWeight: "700", fontSize: 16 },
  heroSub: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  search: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 12, height: 46, marginTop: 12, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, color: colors.text, fontSize: 14 },
  card: { padding: 14, backgroundColor: colors.card, borderRadius: 14, marginTop: 14, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  cardTitle: { color: colors.text, fontWeight: "700", fontSize: 14 },
  topicRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  topicIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  smIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  ticketBanner: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, backgroundColor: colors.card, borderRadius: 14, marginTop: 14, borderWidth: 1, borderColor: colors.border },
  newTicket: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.primary },
  ticketRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
}));
