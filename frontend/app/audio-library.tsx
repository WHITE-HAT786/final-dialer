// Audio Library — the customer's managed audio assets (greetings / prompts / MOH).
//
// REAL data source: GET /backend/api/app/audio-library.php — the app-token
// bridge over the same WebDialer AudioService data (table pkg_ivr_audio) the
// web dialer uses; preview streams from
// /backend/api/app/audio-stream.php?id=<id>.
//
// The backend returns a FORMAT string and never a filesystem path, and the
// stream endpoint accepts an id only — never a filename or directory. Identity
// comes from the bearer token, so the client cannot name another customer.
//
// This page is distinct from Call Recordings, which stay bound to the CDR /
// recording APIs and are not touched here.
//
// When the backend cannot serve this client, the page says so plainly. It never
// substitutes demo audio.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text,
  TouchableOpacity, View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import Screen from "@/src/components/Screen";
import { radius, spacing } from "@/src/theme";
import { useTheme } from "@/src/theme/ThemeContext";
import { makeThemedStyles } from "@/src/theme/useThemedStyles";
import { SearchRow } from "@/src/components/ListUI";
import {
  audioLibraryApi, formatBytes, formatDuration,
  type AudioLibraryItem, type AudioLibraryResult,
} from "@/src/api";

type Load =
  | { phase: "loading" }
  | { phase: "ready"; data: Extract<AudioLibraryResult, { status: "ok" }> }
  | { phase: "unavailable"; reason: string; detail: string };

export default function AudioLibrary() {
  const { colors } = useTheme();
  const styles = useStyles();
  const [load, setLoad] = useState<Load>({ phase: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState("");
  const [playingId, setPlayingId] = useState<number | null>(null);

  // One player instance, re-pointed at whichever prompt is previewed.
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);

  const fetchLibrary = useCallback(async () => {
    const r = await audioLibraryApi.list();
    setLoad(r.status === "ok"
      ? { phase: "ready", data: r }
      : { phase: "unavailable", reason: r.reason, detail: r.detail });
  }, []);

  useEffect(() => { void fetchLibrary(); }, [fetchLibrary]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLibrary();
    setRefreshing(false);
  }, [fetchLibrary]);

  // Stop playback when the screen unmounts so audio never outlives the page.
  useEffect(() => () => { try { player.pause(); } catch { /* already released */ } }, [player]);

  const filtered = useMemo(() => {
    const items: AudioLibraryItem[] = load.phase === "ready" ? load.data.items : [];
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((a) =>
      String(a.name ?? "").toLowerCase().includes(needle) ||
      String(a.description ?? "").toLowerCase().includes(needle) ||
      String(a.original_name ?? "").toLowerCase().includes(needle));
  }, [load, q]);

  const toggle = useCallback(async (a: AudioLibraryItem) => {
    if (playingId === a.id) {
      if (status.playing) player.pause(); else player.play();
      return;
    }
    try {
      // The bearer token rides as a header, never in the query string.
      const source = await audioLibraryApi.streamSource(a.id);
      player.replace(source);
      player.play();
      setPlayingId(a.id);
    } catch {
      setPlayingId(null);
    }
  }, [player, playingId, status.playing]);

  const stop = useCallback(() => {
    try { player.pause(); player.seekTo(0); } catch { /* nothing loaded */ }
    setPlayingId(null);
  }, [player]);

  return (
    <Screen title="Audio Library" activeKey="audio-library" showSip={false} showBell={false}>
      {load.phase === "loading" ? (
        <View style={styles.centre} testID="audio-loading">
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.centreSub}>Loading audio library…</Text>
        </View>
      ) : load.phase === "unavailable" ? (
        <View style={styles.centre} testID="audio-unavailable">
          <View style={styles.unavailIcon}>
            <MaterialCommunityIcons name="music-note-off" size={30} color={colors.textMuted} />
          </View>
          <Text style={styles.unavailTitle}>Audio Library unavailable</Text>
          <Text style={styles.centreSub}>{load.detail}</Text>
          <Text style={styles.reason}>{load.reason}</Text>
          <TouchableOpacity
            style={styles.retry}
            onPress={() => { setLoad({ phase: "loading" }); void fetchLibrary(); }}
            testID="audio-retry"
          >
            <Ionicons name="refresh" size={15} color="#fff" />
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          contentContainerStyle={{ paddingBottom: spacing.huge }}
        >
          {load.data.usage && (
            <View style={styles.usageCard} testID="audio-usage">
              <View style={styles.usageCell}>
                <Text style={styles.usageValue}>{load.data.usage.files}</Text>
                <Text style={styles.usageLabel}>Your files</Text>
              </View>
              <View style={styles.usageDivider} />
              <View style={styles.usageCell}>
                <Text style={styles.usageValue}>{load.data.usage.mb_used} MB</Text>
                <Text style={styles.usageLabel}>
                  {load.data.usage.mb_limit != null ? `of ${load.data.usage.mb_limit} MB` : "used"}
                </Text>
              </View>
            </View>
          )}

          <SearchRow placeholder="Search audio by name or description…" value={q} onChange={setQ} />

          {filtered.length === 0 ? (
            <View style={styles.centre} testID="audio-empty">
              <View style={styles.unavailIcon}>
                <MaterialCommunityIcons name="playlist-music-outline" size={30} color={colors.textMuted} />
              </View>
              <Text style={styles.unavailTitle}>{q ? "No matching audio" : "No audio yet"}</Text>
              <Text style={styles.centreSub}>
                {q
                  ? "Try a different search term."
                  : "Prompts and greetings added to your account will appear here."}
              </Text>
            </View>
          ) : filtered.map((a) => {
            const active = playingId === a.id;
            const pos = active && status.duration > 0 ? status.currentTime / status.duration : 0;
            return (
              <View key={a.id} style={styles.row} testID={`audio-item-${a.id}`}>
                <TouchableOpacity
                  style={[styles.playBtn, active && styles.playBtnActive]}
                  onPress={() => { void toggle(a); }}
                  testID={`audio-play-${a.id}`}
                >
                  <Ionicons
                    name={active && status.playing ? "pause" : "play"}
                    size={17}
                    color={active ? "#fff" : colors.primary}
                  />
                </TouchableOpacity>

                <View style={{ flex: 1 }}>
                  <View style={styles.titleLine}>
                    <Text style={styles.name} numberOfLines={1}>{a.name}</Text>
                    {a.is_shared && (
                      <View style={styles.tag}><Text style={styles.tagText}>Shared</Text></View>
                    )}
                    {a.in_use && (
                      <View style={[styles.tag, styles.tagUse]}>
                        <Text style={[styles.tagText, { color: colors.green }]}>In use</Text>
                      </View>
                    )}
                  </View>

                  {!!a.description && (
                    <Text style={styles.desc} numberOfLines={1}>{a.description}</Text>
                  )}

                  <Text style={styles.meta} numberOfLines={1}>
                    {formatDuration(a.duration_ms)} · {a.format} · {formatBytes(a.bytes)}
                    {a.created_at ? ` · ${String(a.created_at).slice(0, 10)}` : ""}
                  </Text>

                  {active && (
                    <View style={styles.progressWrap} testID={`audio-progress-${a.id}`}>
                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${Math.min(100, Math.max(0, pos * 100))}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.time}>
                        {formatDuration((status.currentTime ?? 0) * 1000)} / {formatDuration(a.duration_ms)}
                      </Text>
                      <TouchableOpacity onPress={stop} testID={`audio-stop-${a.id}`} style={styles.stopBtn}>
                        <Ionicons name="stop" size={13} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}

const useStyles = makeThemedStyles((colors) => StyleSheet.create({
  centre: {
    alignItems: "center", justifyContent: "center",
    paddingVertical: 48, paddingHorizontal: spacing.xl, gap: 6,
  },
  centreSub: { color: colors.textMuted, fontSize: 13, textAlign: "center", lineHeight: 19 },
  unavailIcon: {
    width: 62, height: 62, borderRadius: 31, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.border, marginBottom: 6,
  },
  unavailTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  reason: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  retry: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14,
    backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: radius.pill,
  },
  retryText: { color: colors.onPrimary, fontWeight: "700", fontSize: 13 },

  usageCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: colors.card,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    paddingVertical: spacing.lg, marginTop: spacing.md,
  },
  usageCell: { flex: 1, alignItems: "center" },
  usageDivider: { width: 1, height: 30, backgroundColor: colors.border },
  usageValue: { color: colors.text, fontSize: 18, fontWeight: "700" },
  usageLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },

  row: {
    flexDirection: "row", alignItems: "flex-start", gap: spacing.md,
    backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md, marginTop: spacing.sm,
  },
  playBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.primaryDim, borderWidth: 1, borderColor: colors.border,
  },
  playBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  titleLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { color: colors.text, fontSize: 14, fontWeight: "700", flexShrink: 1 },
  tag: {
    backgroundColor: colors.cardAlt, borderRadius: radius.sm,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  tagUse: { backgroundColor: colors.greenDim },
  tagText: { color: colors.textMuted, fontSize: 10, fontWeight: "700" },
  desc: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  meta: { color: colors.textDim, fontSize: 11, marginTop: 4 },

  progressWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  progressTrack: {
    flex: 1, height: 4, borderRadius: 2,
    backgroundColor: colors.borderSoft, overflow: "hidden",
  },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: colors.primary },
  time: { color: colors.textDim, fontSize: 10, minWidth: 74, textAlign: "right" },
  stopBtn: { padding: 2 },
}));
