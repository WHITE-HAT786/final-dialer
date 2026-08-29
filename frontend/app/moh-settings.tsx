import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Alert,
  Platform,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import Screen from "@/src/components/Screen";
import { spacing, useTheme, useThemedStyles, type Palette } from "@/src/theme";
import {
  loadMohPrefs,
  saveMohPrefs,
  MohPrefs,
  MohSource,
} from "@/src/moh/MohPrefs";
import { isLocalMohSupported, previewMoh } from "@/src/moh/LocalMoh";

function humanBytes(n: number) {
  if (!n) return "0 B";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export default function MohSettings() {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [prefs, setPrefs] = useState<MohPrefs | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const previewRef = useRef<{ stop: () => void } | null>(null);

  const localSupported = isLocalMohSupported();

  useEffect(() => {
    (async () => {
      const p = await loadMohPrefs();
      setPrefs(p);
    })();
  }, []);

  useEffect(() => () => {
    previewRef.current?.stop();
  }, []);

  const update = async (patch: Partial<MohPrefs>) => {
    const next = await saveMohPrefs(patch);
    setPrefs(next);
    setSaveNote("Saved");
    setTimeout(() => setSaveNote(null), 1500);
  };

  const pickFile = async () => {
    setBusy(true);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["audio/wav", "audio/mpeg", "audio/mp3", "audio/ogg", "audio/*"],
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const file = res.assets?.[0];
      if (!file) return;
      // Guard against very large files (browser AudioContext.decodeAudioData chokes above ~30MB)
      if ((file.size || 0) > 15 * 1024 * 1024) {
        Alert.alert(
          "File too large",
          "Please choose a music file under 15 MB. WAV files are big — a 2-3 minute MP3 works best.",
        );
        return;
      }
      await update({
        fileUri: file.uri,
        fileName: file.name || "music.wav",
        fileSize: file.size || 0,
        source: "local",
      });
    } catch (e: any) {
      Alert.alert("Could not open file", e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const clearFile = async () => {
    previewRef.current?.stop();
    previewRef.current = null;
    setPreviewing(false);
    await update({ fileUri: "", fileName: "", fileSize: 0, source: "server" });
  };

  const doPreview = async () => {
    if (!prefs?.fileUri) return;
    if (previewing) {
      previewRef.current?.stop();
      previewRef.current = null;
      setPreviewing(false);
      return;
    }
    const h = await previewMoh(prefs.fileUri);
    if (!h) {
      Alert.alert(
        "Preview not available",
        Platform.OS === "web"
          ? "Could not decode this file. Please try a shorter MP3 or WAV."
          : "Audio preview will play through the app on native builds only. It will still be sent to the caller during hold.",
      );
      return;
    }
    previewRef.current = h;
    setPreviewing(true);
    // Stop preview automatically after 30s
    setTimeout(() => {
      previewRef.current?.stop();
      previewRef.current = null;
      setPreviewing(false);
    }, 30000);
  };

  const setSource = (s: MohSource) => update({ source: s });

  if (!prefs) {
    return (
      <Screen title="Music on Hold" showBack activeKey="more">
        <View style={{ padding: 40, alignItems: "center" }}>
          <ActivityIndicator color={c.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen title="Music on Hold" showBack activeKey="more">
      <View style={styles.headerCard} testID="moh-header">
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons name="music-note-eighth" size={26} color={c.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>What plays when you hold a call?</Text>
          <Text style={styles.headerSub}>
            {"Choose between your Asterisk server's built-in music or your own audio file."}
          </Text>
        </View>
      </View>

      {/* SOURCE SELECTOR */}
      <Text style={styles.sectionLabel}>MOH SOURCE</Text>
      <View style={styles.sectionCard}>
        <SourceRow
          selected={prefs.source === "server"}
          icon="server-network"
          title="Server Music (Asterisk)"
          subtitle="Standard SIP hold — Asterisk streams its configured MOH class to the caller."
          onPress={() => setSource("server")}
          testID="moh-source-server"
        />
        <View style={styles.divider} />
        <SourceRow
          selected={prefs.source === "local"}
          icon="file-music-outline"
          title="My Local File"
          subtitle={
            localSupported
              ? "The app streams your chosen file to the caller instead of your microphone."
              : "Browser preview only — falls back to server MOH on Expo Go / native builds."
          }
          onPress={() => setSource("local")}
          testID="moh-source-local"
          warning={!localSupported}
        />
      </View>

      {/* LOCAL FILE PICKER */}
      {prefs.source === "local" && (
        <>
          <Text style={styles.sectionLabel}>LOCAL FILE</Text>
          <View style={styles.sectionCard}>
            {prefs.fileUri ? (
              <>
                <View style={styles.filePreviewRow}>
                  <View style={styles.fileIcon}>
                    <Ionicons name="musical-notes" size={20} color={c.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fileName} numberOfLines={1}>{prefs.fileName}</Text>
                    <Text style={styles.fileSize}>{humanBytes(prefs.fileSize)}</Text>
                  </View>
                  <TouchableOpacity onPress={doPreview} style={styles.previewBtn} testID="moh-preview">
                    <Ionicons name={previewing ? "stop" : "play"} size={18} color={c.primary} />
                    <Text style={styles.previewText}>{previewing ? "Stop" : "Preview"}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.divider} />
                <View style={styles.rowBetween}>
                  <Text style={styles.rowLabel}>Loop while on hold</Text>
                  <Switch
                    value={prefs.loop}
                    onValueChange={(v) => update({ loop: v })}
                    trackColor={{ true: c.primary + "80", false: c.border }}
                    thumbColor={prefs.loop ? c.primary : "#666"}
                    testID="moh-loop"
                  />
                </View>
                <View style={styles.divider} />
                <TouchableOpacity style={styles.rowBetween} onPress={pickFile} testID="moh-replace">
                  <Text style={[styles.rowLabel, { color: c.primary }]}>Replace file…</Text>
                  <Ionicons name="folder-open" size={18} color={c.primary} />
                </TouchableOpacity>
                <View style={styles.divider} />
                <TouchableOpacity style={styles.rowBetween} onPress={clearFile} testID="moh-clear">
                  <Text style={[styles.rowLabel, { color: c.red }]}>Remove file</Text>
                  <Ionicons name="trash" size={18} color={c.red} />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.pickBtn}
                onPress={pickFile}
                disabled={busy}
                testID="moh-pick"
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={22} color="#fff" />
                    <Text style={styles.pickText}>Choose WAV / MP3 file</Text>
                    <Text style={styles.pickSub}>Max 15 MB • Looped during hold</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      {/* PLATFORM NOTES */}
      <View style={[styles.notice, { borderColor: c.primary + "50", backgroundColor: c.primaryDim + "60" }]}>
        <Ionicons name="information-circle" size={18} color={c.primary} />
        <Text style={styles.noticeText}>
          {prefs.source === "local"
            ? (localSupported
                ? "Local music will play to the caller during hold in this browser preview. Standard SIP hold is not sent — the call stays active."
                : "Local music playback works only in the browser preview. Native builds (APK/IPA) will fall back to Asterisk's server-side MOH automatically.")
            : "Standard SIP hold is used. Your Asterisk server (`musiconhold.conf`) decides the music the caller hears."}
        </Text>
      </View>

      {saveNote && (
        <View style={styles.savedPill}>
          <Ionicons name="checkmark-circle" size={14} color={c.green} />
          <Text style={{ color: c.green, fontSize: 12, fontWeight: "600" }}>{saveNote}</Text>
        </View>
      )}
    </Screen>
  );
}

function SourceRow({
  selected,
  icon,
  title,
  subtitle,
  onPress,
  testID,
  warning,
}: {
  selected: boolean;
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  testID: string;
  warning?: boolean;
}) {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <TouchableOpacity style={styles.sourceRow} onPress={onPress} testID={testID}>
      <View style={[styles.sourceIcon, selected && { backgroundColor: c.primaryDim }]}>
        <MaterialCommunityIcons
          name={icon as any}
          size={22}
          color={selected ? c.primary : c.textMuted}
        />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={styles.sourceTitle}>{title}</Text>
          {warning && (
            <View style={styles.pill}>
              <Text style={styles.pillText}>Web only</Text>
            </View>
          )}
        </View>
        <Text style={styles.sourceSub}>{subtitle}</Text>
      </View>
      <View
        style={[
          styles.radio,
          selected && { borderColor: c.primary },
        ]}
      >
        {selected && <View style={styles.radioDot} />}
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    headerCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      padding: 14,
      marginTop: 8,
      borderRadius: 16,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    headerIcon: {
      width: 46,
      height: 46,
      borderRadius: 12,
      backgroundColor: c.primaryDim,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: { color: c.text, fontSize: 15, fontWeight: "700" },
    headerSub: { color: c.textMuted, fontSize: 12, marginTop: 3 },
    sectionLabel: {
      color: c.textDim,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 1.1,
      marginTop: spacing.lg,
      marginBottom: 8,
      marginLeft: 4,
    },
    sectionCard: {
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
    },
    sourceRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
    },
    sourceIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: c.bgAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    sourceTitle: { color: c.text, fontSize: 15, fontWeight: "600" },
    sourceSub: { color: c.textMuted, fontSize: 12, marginTop: 3, lineHeight: 16 },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: c.primary,
    },
    divider: {
      height: 1,
      backgroundColor: c.borderSoft,
      marginHorizontal: 14,
    },
    pill: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: c.yellow + "30",
    },
    pillText: { color: c.yellow, fontSize: 10, fontWeight: "700" },
    filePreviewRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
    },
    fileIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.primaryDim,
      alignItems: "center",
      justifyContent: "center",
    },
    fileName: { color: c.text, fontSize: 14, fontWeight: "600" },
    fileSize: { color: c.textMuted, fontSize: 11, marginTop: 2 },
    previewBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: c.primaryDim,
      borderWidth: 1,
      borderColor: c.primary + "40",
    },
    previewText: { color: c.primary, fontSize: 13, fontWeight: "700" },
    rowBetween: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 14,
    },
    rowLabel: { color: c.text, fontSize: 14 },
    pickBtn: {
      padding: 24,
      alignItems: "center",
      gap: 8,
      backgroundColor: c.primary,
      borderRadius: 14,
      margin: 4,
    },
    pickText: { color: c.text, fontSize: 15, fontWeight: "700" },
    pickSub: { color: c.text, fontSize: 11, opacity: 0.85 },
    notice: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      marginTop: spacing.lg,
    },
    noticeText: { flex: 1, color: c.primary, fontSize: 12, lineHeight: 16 },
    savedPill: {
      alignSelf: "center",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 12,
      paddingVertical: 6,
      paddingHorizontal: 12,
      backgroundColor: c.greenDim,
      borderRadius: 999,
    },
  });
