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
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Screen from "@/src/components/Screen";
import { CONTROL_H, useTheme, useThemedStyles, type Palette } from "@/src/theme";
import { apiGet } from "@/src/api";

const ALPHABET = "#ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const initialsOf = (name: string) =>
  name
    .replace(/[^A-Za-z ]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

export default function Contacts() {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [data, setData] = useState<any>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All Contacts");
  const router = useRouter();

  useEffect(() => {
    apiGet("/contacts").then(setData).catch(() => {});
  }, []);

  const grouped = useMemo(() => {
    if (!data) return {} as Record<string, any[]>;
    const filtered = data.items.filter((p: any) => {
      const matchQ = p.name.toLowerCase().includes(q.toLowerCase()) || p.phone.includes(q);
      const matchFilter = filter !== "Favorites" || p.favorite;
      return matchQ && matchFilter;
    });
    const g: Record<string, any[]> = {};
    filtered.forEach((p: any) => {
      const l = p.name[0].toUpperCase();
      if (!g[l]) g[l] = [];
      g[l].push(p);
    });
    return g;
  }, [data, q, filter]);

  const chips = [
    { label: "All Contacts", value: data ? String(data.stats.all) : "" },
    { label: "Favorites", value: data ? String(data.stats.favorites) : "" },
    { label: "Groups", value: data ? String(data.stats.groups) : "" },
    { label: "Import", value: "" },
    { label: "Export", value: "" },
  ];

  return (
    <Screen title="Contacts" activeKey="contacts" contentPadding={false}>
      {/* Search + add */}
      <View style={styles.searchRow}>
        <View style={styles.search} testID="contacts-search">
          <Ionicons name="search" size={17} color={c.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name or number"
            placeholderTextColor={c.dim}
            value={q}
            onChangeText={setQ}
          />
        </View>
        <TouchableOpacity style={styles.addBtn} testID="contacts-add">
          <Ionicons name="person-add-outline" size={19} color={c.onPrimary} />
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {chips.map((chip) => {
          const active = chip.label === filter;
          return (
            <TouchableOpacity
              key={chip.label}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setFilter(chip.label)}
              testID={`contacts-filter-${chip.label}`}
            >
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{chip.label}</Text>
              {!!chip.value && (
                <Text style={[styles.chipValue, active && styles.chipValueActive]}>{chip.value}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {!data ? (
        <View style={{ alignItems: "center", marginTop: 40 }}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : (
        <View style={styles.listWrap}>
          <View style={styles.list}>
            {Object.keys(grouped)
              .sort()
              .map((letter) => (
                <View key={letter}>
                  <Text style={styles.groupLetter}>{letter}</Text>
                  {grouped[letter].map((p: any, i: number) => (
                    <View
                      key={p.id}
                      style={[styles.row, i !== grouped[letter].length - 1 && styles.rowDivider]}
                      testID={`contact-${p.id}`}
                    >
                      <View style={[styles.avatar, { backgroundColor: (p.avatar_color || c.primary) + "26" }]}>
                        <Text style={[styles.avatarText, { color: p.avatar_color || c.primary }]}>
                          {initialsOf(p.name)}
                        </Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={styles.nameRow}>
                          <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
                          {p.favorite && <Text style={styles.fav}>★</Text>}
                        </View>
                        <Text style={styles.phone} numberOfLines={1}>{p.phone}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.callBtn}
                        onPress={() =>
                          router.push({ pathname: "/call", params: { number: p.phone, name: p.name } })
                        }
                        testID={`contact-call-${p.id}`}
                      >
                        <Ionicons name="call" size={16} color={c.success} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.kebab} testID={`contact-more-${p.id}`}>
                        <Ionicons name="ellipsis-vertical" size={17} color={c.dim} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ))}
          </View>

          {/* Alphabet index */}
          <View style={styles.alphaCol}>
            {ALPHABET.map((l) => (
              <Text key={l} style={[styles.alphaLetter, grouped[l] && styles.alphaLetterOn]}>
                {l}
              </Text>
            ))}
          </View>
        </View>
      )}
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    searchRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginTop: 16 },
    search: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      height: CONTROL_H,
      paddingHorizontal: 13,
      borderRadius: 10,
      backgroundColor: c.input,
      borderWidth: 1,
      borderColor: c.border,
    },
    searchInput: { flex: 1, color: c.text, fontSize: 14, padding: 0 },
    addBtn: {
      width: CONTROL_H,
      height: CONTROL_H,
      borderRadius: 10,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
    },

    chipsRow: { gap: 7, paddingHorizontal: 16, paddingTop: 14 },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      height: 32,
      paddingHorizontal: 11,
      borderRadius: 999,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    chipActive: { backgroundColor: c.primarySoft, borderColor: c.primary },
    chipLabel: { color: c.text, fontSize: 12.5, fontWeight: "600" },
    chipLabelActive: { color: c.primary },
    chipValue: { color: c.dim, fontSize: 11.5, fontWeight: "700" },
    chipValueActive: { color: c.primary },

    listWrap: { flexDirection: "row", marginTop: 6 },
    list: { flex: 1, minWidth: 0, paddingLeft: 16 },
    groupLetter: {
      color: c.dim,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 1.2,
      marginTop: 16,
      marginBottom: 6,
    },
    row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9 },
    rowDivider: { borderBottomWidth: 1, borderBottomColor: c.borderSoft },
    avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 13, fontWeight: "700" },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    name: { color: c.text, fontSize: 14.5, fontWeight: "600", flexShrink: 1 },
    fav: { color: c.warn, fontSize: 11 },
    phone: { color: c.muted, fontSize: 12, marginTop: 2 },
    callBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: c.successSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    kebab: { paddingHorizontal: 2 },

    alphaCol: { width: 22, alignItems: "center", paddingTop: 20, paddingRight: 6, paddingBottom: 12, gap: 2 },
    alphaLetter: { color: c.dim, fontSize: 9.5, fontWeight: "600" },
    alphaLetterOn: { color: c.primary },
  });
