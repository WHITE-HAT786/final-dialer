import React from "react";
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSip, SipAccount } from "@/src/SipContext";
import { colors } from "@/src/theme";

export default function SipPickerSheet({
  visible,
  onClose,
  title = "Select SIP Account",
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
}) {
  const { selected, setSelected, accounts } = useSip();
  const insets = useSafeAreaInsets();

  const pick = async (a: SipAccount) => {
    await setSelected(a.id);
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
        <Text style={styles.help}>Calls will be placed using the selected account.</Text>
        <ScrollView style={{ maxHeight: 420 }}>
          {accounts.map((a) => {
            const isActive = a.id === selected.id;
            return (
              <TouchableOpacity
                key={a.id}
                style={[styles.row, isActive && styles.rowActive]}
                onPress={() => pick(a)}
                testID={`sip-picker-item-${a.id}`}
              >
                <View style={[styles.iconWrap, { backgroundColor: a.color + "22" }]}>
                  <MaterialCommunityIcons name="server-network" size={22} color={a.color} />
                  <View style={[styles.dot, { backgroundColor: colors.green }]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{a.name}</Text>
                  <Text style={styles.meta}>{a.host}</Text>
                  <Text style={styles.did}>{a.did}</Text>
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
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#0C1526",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: 12,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: "#fff", fontSize: 18, fontWeight: "700" },
  help: { color: colors.textMuted, fontSize: 12, marginTop: 4, marginBottom: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
    backgroundColor: colors.card,
  },
  rowActive: { borderColor: colors.primary },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  dot: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.card,
  },
  name: { color: "#fff", fontWeight: "700", fontSize: 15 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  did: { color: colors.primary, fontSize: 12, marginTop: 2 },
  checkBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
