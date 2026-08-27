// Contacts — implements the "Contacts" frame of DepthRoute App v2.
//
// Design changes: the search sits on the `input` fill at 46px beside a square
// 46px primary action rather than a wide labelled button; the filters become
// compact 32px pills instead of large icon cards; and favourite is a mark
// beside the name rather than a badge clipped to the avatar.
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
import { useTheme } from "@/src/theme/ThemeContext";
import { makeThemedStyles } from "@/src/theme/useThemedStyles";
import { screensApi } from "@/src/api";

const ALPHABET = "#ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function Contacts() {
  const { colors } = useTheme();
  const styles = useStyles();
  const [data, setData] = useState<any>(null);
  const [q, setQ] = useState("");
  const router = useRouter();

  useEffect(() => {
    screensApi.contacts().then(setData).catch(() => setData([]));
  }, []);

  const grouped = useMemo(() => {
    if (!data) return {};
    const filtered = (Array.isArray(data) ? data : []).filter((c: any) =>
      String(c.name ?? "").toLowerCase().includes(q.toLowerCase()) ||
      String(c.phone ?? "").includes(q),
    );
    const g: Record<string, any[]> = {};
    filtered.forEach((c: any) => {
      const l = String(c.name ?? "#").charAt(0).toUpperCase() || "#";
      if (!g[l]) g[l] = [];
      g[l].push(c);
    });
    return g;
  }, [data, q]);

  const all = Array.isArray(data) ? data : [];

  return (
    <Screen title="Contacts" activeKey="contacts" contentPadding={false}>
      <View style={{ paddingHorizontal: 16 }}>
        {/* Search + Add */}
        <View style={styles.searchRow}>
          <View style={styles.search} testID="contacts-search">
            <Ionicons name="search" size={17} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search name or number"
              placeholderTextColor={colors.textDim}
              value={q}
              onChangeText={setQ}
            />
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            testID="contacts-add"
            accessibilityRole="button"
            accessibilityLabel="Add contact"
          >
            <Ionicons name="person-add" size={19} color={colors.onPrimary} />
          </TouchableOpacity>
        </View>

        {/* Filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillScroll}
        >
          <FilterChip color={colors.green} label="All Contacts" value={all.length} />
          <FilterChip color={colors.yellow} label="Favorites" value={all.filter((c: any) => c.favorite).length} />
          <FilterChip color={colors.primary} label="Groups" />
          <FilterChip color={colors.purple} label="Import" />
          <FilterChip color={colors.teal} label="Export" />
        </ScrollView>
      </View>

      {!data ? (
        <View style={{ alignItems: "center", marginTop: 40 }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <View style={{ flexDirection: "row", flex: 1 }}>
          <View style={{ flex: 1, minWidth: 0, paddingLeft: 16 }}>
            {Object.keys(grouped)
              .sort()
              .map((letter) => (
                <View key={letter}>
                  <Text style={styles.sectionHeader}>{letter}</Text>
                  {grouped[letter].map((c: any) => (
                    <View key={c.id} style={styles.contactRow} testID={`contact-${c.id}`}>
                      <View style={[styles.avatarSm, { backgroundColor: c.avatar_color + "26" }]}>
                        <Text style={[styles.avatarText, { color: c.avatar_color }]}>
                          {c.name
                            .split(" ")
                            .map((s: string) => s[0])
                            .slice(0, 2)
                            .join("")}
                        </Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={styles.nameRow}>
                          <Text style={styles.contactName} numberOfLines={1}>{c.name}</Text>
                          {c.favorite && <Ionicons name="star" size={11} color={colors.yellow} />}
                        </View>
                        <Text style={styles.contactPhone}>{c.phone}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.callBtn}
                        onPress={() => router.push({ pathname: "/call", params: { number: c.phone, name: c.name } })}
                        testID={`contact-call-${c.id}`}
                        accessibilityRole="button"
                        accessibilityLabel={`Call ${c.name}`}
                      >
                        <Ionicons name="call" size={16} color={colors.green} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.moreBtn}>
                        <Ionicons name="ellipsis-vertical" size={17} color={colors.textDim} />
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
                style={[styles.alphaLetter, grouped[l] ? { color: colors.primary } : undefined]}
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

function FilterChip({ color, label, value }: { color: string; label: string; value?: number }) {
  const filterStyles = useFilterStyles();
  return (
    <View
      style={[filterStyles.chip, { backgroundColor: color + "1A", borderColor: color + "40" }]}
      testID={`contacts-filter-${label}`}
    >
      <Text style={[filterStyles.label, { color }]}>{label}</Text>
      {value !== undefined && <Text style={[filterStyles.value, { color }]}>{value}</Text>}
    </View>
  );
}

const useFilterStyles = makeThemedStyles(() => StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    height: 32,
    paddingHorizontal: 11,
    borderRadius: 999,
    borderWidth: 1,
  },
  label: { fontSize: 12.5, fontWeight: "600" },
  value: { fontSize: 11.5, fontWeight: "700" },
}));

const useStyles = makeThemedStyles((colors) => StyleSheet.create({
  searchRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  search: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: colors.input,
    borderRadius: 10,
    paddingHorizontal: 13,
    height: 46,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 14 },
  addBtn: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  pillScroll: { gap: 7, paddingTop: 14, paddingBottom: 2, paddingRight: 8 },

  sectionHeader: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginTop: 16,
    marginBottom: 6,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  avatarSm: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontWeight: "700", fontSize: 13 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  contactName: { color: colors.text, fontSize: 14.5, fontWeight: "600", flexShrink: 1 },
  contactPhone: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  callBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.greenSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  moreBtn: { width: 24, alignItems: "center", justifyContent: "center" },
  alphaCol: {
    width: 22,
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 12,
    paddingRight: 6,
    gap: 2,
  },
  alphaLetter: { color: colors.textDim, fontSize: 9.5, fontWeight: "600" },
}));
