import React from "react";
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMultiSip } from "@/src/sip/MultiSipContext";
import { type Palette } from "@/src/theme";
import { useTheme } from "@/src/theme/ThemeContext";
import { makeThemedStyles } from "@/src/theme/useThemedStyles";

const STATUS_UI = (status: string, colors: Palette) => {
  switch (status) {
    case "registered": return { label: "Registered", color: colors.green };
    case "connecting": return { label: "Connecting…", color: colors.yellow };
    case "registration_failed": return { label: "Reg. Failed", color: colors.red };
    case "unsupported": return { label: "Unsupported", color: colors.yellow };
    case "error": return { label: "Error", color: colors.red };
    case "unregistered": return { label: "Unregistered", color: colors.textMuted };
    default: return { label: "Disconnected", color: colors.textMuted };
  }
};

export default function SipPickerSheet({
  visible,
  onClose,
  title = "Select SIP Account",
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { runtimes, selectedId, setSelected } = useMultiSip();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const pick = async (id: string) => {
    await setSelected(id);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} testID="sip-picker-backdrop" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]} testID="sip-picker-sheet">
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} testID="sip-picker-close">
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
        <Text style={styles.help}>Outgoing calls will use the selected account.</Text>

        <ScrollView style={{ maxHeight: 420 }}>
          {runtimes.length === 0 && (
            <View style={styles.empty} testID="sip-picker-empty">
              <MaterialCommunityIcons name="server-network-off" size={40} color={colors.textDim} />
              <Text style={styles.emptyTitle}>No SIP accounts</Text>
              <Text style={styles.emptySub}>Your extension is provisioned by Depth Route and loads automatically after sign-in.</Text>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => { onClose(); router.push("/sip-accounts"); }}
                testID="sip-picker-view"
              >
                <Ionicons name="information-circle-outline" size={16} color="#fff" />
                <Text style={styles.addBtnText}>View SIP Account</Text>
              </TouchableOpacity>
            </View>
          )}
          {runtimes.map((r) => {
            const s = STATUS_UI(r.status, colors);
            const isActive = r.account.id === selectedId;
            return (
              <TouchableOpacity
                key={r.account.id}
                style={[styles.row, isActive && styles.rowActive]}
                onPress={() => pick(r.account.id)}
                testID={`sip-picker-item-${r.account.id}`}
              >
                <View style={[styles.iconWrap, { backgroundColor: (r.account.color || colors.primary) + "22" }]}>
                  <MaterialCommunityIcons name="server-network" size={22} color={r.account.color || colors.primary} />
                  <View style={[styles.dot, { backgroundColor: s.color }]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>{r.account.displayName || r.account.username}</Text>
                  <Text style={styles.meta} numberOfLines={1}>{r.account.username}@{r.account.domain}</Text>
                  {r.account.callerId ? (
                    <Text style={styles.did} numberOfLines={1}>CLID {r.account.callerId}</Text>
                  ) : null}
                  <Text style={[styles.status, { color: s.color }]}>{s.label}</Text>
                </View>
                {isActive ? (
                  <View style={styles.checkBadge}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                )}
              </TouchableOpacity>
            );
          })}
          {runtimes.length > 0 && (
            <TouchableOpacity
              style={styles.manageBtn}
              onPress={() => { onClose(); router.push("/sip-accounts"); }}
              testID="sip-picker-manage"
            >
              <Ionicons name="settings-outline" size={16} color={colors.primary} />
              <Text style={styles.manageBtnText}>Manage Accounts</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const useStyles = makeThemedStyles((colors) => StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#0C1526", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 8, borderWidth: 1, borderColor: colors.border },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 12 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: colors.text, fontSize: 18, fontWeight: "700" },
  help: { color: colors.textMuted, fontSize: 12, marginTop: 4, marginBottom: 12 },
  empty: { alignItems: "center", padding: 30 },
  emptyTitle: { color: colors.text, fontWeight: "700", fontSize: 15, marginTop: 10 },
  emptySub: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 16, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.primary },
  addBtnText: { color: colors.onPrimary, fontWeight: "700", fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 8, backgroundColor: colors.card },
  rowActive: { borderColor: colors.primary },
  iconWrap: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", position: "relative" },
  dot: { position: "absolute", right: -2, bottom: -2, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.card },
  name: { color: colors.text, fontWeight: "700", fontSize: 15 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  did: { color: colors.primary, fontSize: 12, marginTop: 2 },
  status: { fontSize: 11, fontWeight: "700", marginTop: 4 },
  checkBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  manageBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, marginTop: 4, borderRadius: 10, borderWidth: 1, borderColor: colors.primary + "40" },
  manageBtnText: { color: colors.primary, fontWeight: "700", fontSize: 13 },
}));
