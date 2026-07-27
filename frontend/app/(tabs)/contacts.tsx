import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Screen from "@/src/components/Screen";
import { colors, spacing } from "@/src/theme";
import { apiGet } from "@/src/api";

const ALPHABET = "#ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function Contacts() {
  const [data, setData] = useState<any>(null);
  const [q, setQ] = useState("");
  const router = useRouter();

  useEffect(() => {
    apiGet("/contacts").then(setData).catch(() => {});
  }, []);

  const grouped = useMemo(() => {
    if (!data) return {};
    const filtered = data.items.filter((c: any) =>
      c.name.toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q),
    );
    const g: Record<string, any[]> = {};
    filtered.forEach((c: any) => {
      const l = c.name[0].toUpperCase();
      if (!g[l]) g[l] = [];
      g[l].push(c);
    });
    return g;
  }, [data, q]);

  return (
    <Screen title="Contacts" activeKey="contacts" contentPadding={false}>
      <View style={{ paddingHorizontal: 16 }}>
        {/* Search + Add */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
          <View style={styles.search} testID="contacts-search">
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search contacts..."
              placeholderTextColor={colors.textDim}
              value={q}
              onChangeText={setQ}
            />
            <Ionicons name="mic-outline" size={18} color={colors.textMuted} />
          </View>
          <TouchableOpacity style={styles.addBtn} testID="contacts-add">
            <Ionicons name="person-add" size={16} color="#fff" />
            <Text style={styles.addText}>Add Contact</Text>
          </TouchableOpacity>
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, paddingVertical: spacing.md }}
        >
          <FilterChip
            icon="person"
            color={colors.green}
            label="All Contacts"
            value={data?.stats.all}
          />
          <FilterChip
            icon="star"
            color={colors.yellow}
            label="Favorites"
            value={data?.stats.favorites}
            mci
          />
          <FilterChip
            icon="people"
            color={colors.primary}
            label="Groups"
            value={data?.stats.groups}
          />
          <FilterChip icon="download-outline" color={colors.purple} label="Import" />
          <FilterChip icon="cloud-upload-outline" color={colors.teal} label="Export" />
        </ScrollView>
      </View>

      {!data ? (
        <View style={{ alignItems: "center", marginTop: 40 }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <View style={{ flexDirection: "row", flex: 1 }}>
          <View style={{ flex: 1, paddingLeft: 16 }}>
            {Object.keys(grouped)
              .sort()
              .map((letter) => (
                <View key={letter}>
                  <Text style={styles.sectionHeader}>{letter}</Text>
                  {grouped[letter].map((c: any) => (
                    <View key={c.id} style={styles.contactRow} testID={`contact-${c.id}`}>
                      <View style={[styles.avatarSm, { backgroundColor: c.avatar_color + "30" }]}>
                        <Text style={{ color: c.avatar_color, fontWeight: "700", fontSize: 13 }}>
                          {c.name
                            .split(" ")
                            .map((s: string) => s[0])
                            .slice(0, 2)
                            .join("")}
                        </Text>
                        {c.favorite && (
                          <View style={styles.favBadge}>
                            <Ionicons name="star" size={9} color="#fff" />
                          </View>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.contactName}>{c.name}</Text>
                        <Text style={styles.contactPhone}>{c.phone}</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.callBtn, { backgroundColor: colors.greenDim }]}
                        onPress={() => router.push({ pathname: "/call", params: { number: c.phone, name: c.name } })}
                        testID={`contact-call-${c.id}`}
                      >
                        <Ionicons name="call" size={18} color={colors.green} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.moreBtn}>
                        <Ionicons name="ellipsis-vertical" size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ))}
          </View>
          {/* Alphabet index */}
          <View style={styles.alphaCol}>
            {ALPHABET.map((l) => (
              <Text
                key={l}
                style={[
                  styles.alphaLetter,
                  grouped[l] ? { color: colors.primary } : undefined,
                ]}
              >
                {l}
              </Text>
            ))}
          </View>
        </View>
      )}
    </Screen>
  );
}

function FilterChip({ icon, color, label, value, mci }: any) {
  return (
    <View style={filterStyles.chip} testID={`contacts-filter-${label}`}>
      <View style={[filterStyles.icon, { backgroundColor: color + "20" }]}>
        {mci ? (
          <MaterialCommunityIcons name={icon} size={18} color={color} />
        ) : (
          <Ionicons name={icon} size={18} color={color} />
        )}
      </View>
      <Text style={filterStyles.label}>{label}</Text>
      {value !== undefined && (
        <Text style={[filterStyles.value, { color }]}>{value}</Text>
      )}
    </View>
  );
}

const filterStyles = StyleSheet.create({
  chip: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    gap: 4,
    minWidth: 90,
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  label: { color: "#fff", fontSize: 12, fontWeight: "600" },
  value: { fontSize: 13, fontWeight: "700", marginTop: 2 },
});

const styles = StyleSheet.create({
  search: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, color: "#fff", fontSize: 14 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  addText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  sectionHeader: { color: colors.textMuted, fontSize: 13, marginTop: 12, marginBottom: 8 },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  avatarSm: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  favBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  contactName: { color: "#fff", fontSize: 15, fontWeight: "600" },
  contactPhone: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  moreBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  alphaCol: {
    width: 20,
    alignItems: "center",
    paddingVertical: 12,
    paddingRight: 4,
  },
  alphaLetter: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: "600",
    marginVertical: 1,
  },
});
