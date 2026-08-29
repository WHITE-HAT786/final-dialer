import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Screen from "@/src/components/Screen";
import { colors } from "@/src/theme";
import { apiGet } from "@/src/api";
import { useApiData } from "@/src/hooks/useApiData";
import { LoadingBlock, ErrorBlock, EmptyBlock } from "@/src/components/DataStates";
import { initials } from "@/src/utils/format";

const ALPHABET = "#ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

// Real shape of GET /backend/api/app/contacts (a bare array; tenant-scoped).
type Contact = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  phone: string | null;
  phone_type: string | null;
  email: string | null;
  group_name: string | null;
  avatar_color: string | null;
};

const fullName = (c: Contact) =>
  [c.first_name, c.last_name].filter(Boolean).join(" ").trim() || c.company || c.phone || "Unknown";

export default function Contacts() {
  const { data, loading, error, refresh, refreshing } = useApiData<Contact[]>(() => apiGet("/contacts"));
  const [q, setQ] = useState("");
  const router = useRouter();

  const grouped = useMemo(() => {
    const list = data ?? [];
    const filtered = list.filter((c) => {
      const s = q.toLowerCase();
      return !q || fullName(c).toLowerCase().includes(s) || (c.phone || "").includes(q);
    });
    const g: Record<string, Contact[]> = {};
    filtered.forEach((c) => {
      const l = fullName(c)[0]?.toUpperCase() || "#";
      const key = /[A-Z]/.test(l) ? l : "#";
      (g[key] ||= []).push(c);
    });
    return g;
  }, [data, q]);

  const hasResults = Object.keys(grouped).length > 0;

  return (
    <Screen title="Contacts" activeKey="contacts" contentPadding={false} onRefresh={refresh} refreshing={refreshing}>
      <View style={{ paddingHorizontal: 16 }}>
        <View style={styles.search} testID="contacts-search">
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts..."
            placeholderTextColor={colors.textDim}
            value={q}
            onChangeText={setQ}
          />
        </View>
      </View>

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={error} onRetry={refresh} />
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyBlock icon="person-outline" title="No contacts yet" subtitle="Contacts saved to your account will appear here." />
      ) : !hasResults ? (
        <EmptyBlock icon="search-outline" title="No matches" subtitle={`No contact matches "${q}".`} />
      ) : (
        <View style={{ flexDirection: "row", flex: 1 }}>
          <View style={{ flex: 1, paddingLeft: 16 }}>
            {Object.keys(grouped).sort().map((letter) => (
              <View key={letter}>
                <Text style={styles.sectionHeader}>{letter}</Text>
                {grouped[letter].map((c) => {
                  const name = fullName(c);
                  const color = c.avatar_color || colors.primary;
                  return (
                    <View key={c.id} style={styles.contactRow} testID={`contact-${c.id}`}>
                      <View style={[styles.avatarSm, { backgroundColor: color + "30" }]}>
                        <Text style={{ color, fontWeight: "700", fontSize: 13 }}>{initials(name)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.contactName}>{name}</Text>
                        {c.phone ? <Text style={styles.contactPhone}>{c.phone}</Text> : null}
                      </View>
                      {c.phone ? (
                        <TouchableOpacity
                          style={[styles.callBtn, { backgroundColor: colors.greenDim }]}
                          onPress={() => router.push({ pathname: "/call", params: { number: c.phone!, name } })}
                          testID={`contact-call-${c.id}`}
                        >
                          <Ionicons name="call" size={18} color={colors.green} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
          <View style={styles.alphaCol}>
            {ALPHABET.map((l) => (
              <Text key={l} style={[styles.alphaLetter, grouped[l] ? { color: colors.primary } : undefined]}>{l}</Text>
            ))}
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: colors.border, marginTop: 8 },
  searchInput: { flex: 1, color: "#fff", fontSize: 14 },
  sectionHeader: { color: colors.textMuted, fontSize: 13, marginTop: 12, marginBottom: 8 },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  avatarSm: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  contactName: { color: "#fff", fontSize: 15, fontWeight: "600" },
  contactPhone: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  callBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  alphaCol: { width: 20, alignItems: "center", paddingVertical: 12, paddingRight: 4 },
  alphaLetter: { color: colors.textDim, fontSize: 10, fontWeight: "600", marginVertical: 1 },
});
