import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  ScrollView,
  Switch,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Screen from "@/src/components/Screen";
import { colors } from "@/src/theme";
import { useMultiSip, SipAccount, DEFAULT_ACCOUNT } from "@/src/sip/MultiSipContext";

const STATUS_UI = (status: string) => {
  switch (status) {
    case "registered": return { label: "Registered", color: colors.green };
    case "connecting": return { label: "Connecting…", color: colors.yellow };
    case "registration_failed": return { label: "Registration Failed", color: colors.red };
    case "unsupported": return { label: "Unsupported", color: colors.yellow };
    case "error": return { label: "Error", color: colors.red };
    case "unregistered": return { label: "Unregistered", color: colors.textMuted };
    default: return { label: "Disconnected", color: colors.textMuted };
  }
};

export default function SipAccountsScreen() {
  const {
    runtimes,
    selectedId,
    setSelected,
    addAccount,
    updateAccount,
    removeAccount,
    connect,
    disconnect,
    aggregateLogs,
  } = useMultiSip();
  const [form, setForm] = useState<null | { id?: string } & Omit<SipAccount, "id" | "color">>(null);
  const [showLog, setShowLog] = useState(false);

  const stats = useMemo(() => {
    const total = runtimes.length;
    const active = runtimes.filter((r) => r.status === "registered").length;
    const connecting = runtimes.filter((r) => r.status === "connecting").length;
    const failed = runtimes.filter((r) => r.status === "registration_failed" || r.status === "error").length;
    return { total, active, connecting, failed };
  }, [runtimes]);

  const startAdd = () => setForm({
    ...DEFAULT_ACCOUNT,
    // pre-fill only when list is empty; otherwise blank for a fresh account
    ...(runtimes.length === 0 ? DEFAULT_ACCOUNT : { displayName: "", username: "", password: "", domain: "", wssUrl: "wss://", callerId: "", authUser: "", enabled: true }),
  });

  const startEdit = (r: any) => setForm({
    id: r.account.id,
    displayName: r.account.displayName,
    username: r.account.username,
    password: r.account.password,
    domain: r.account.domain,
    wssUrl: r.account.wssUrl,
    callerId: r.account.callerId || "",
    authUser: r.account.authUser || "",
    enabled: r.account.enabled,
  });

  const doSave = async () => {
    if (!form) return;
    if (form.id) {
      await updateAccount(form.id, {
        displayName: form.displayName,
        username: form.username,
        password: form.password,
        domain: form.domain,
        wssUrl: form.wssUrl,
        callerId: form.callerId,
        authUser: form.authUser,
        enabled: form.enabled,
      });
    } else {
      await addAccount({
        displayName: form.displayName,
        username: form.username,
        password: form.password,
        domain: form.domain,
        wssUrl: form.wssUrl,
        callerId: form.callerId,
        authUser: form.authUser,
        enabled: form.enabled,
      });
    }
    setForm(null);
  };

  return (
    <Screen
      title="SIP Accounts"
      activeKey="sip"
      showSip={false}
      showBell={false}
      right={
        <>
          <TouchableOpacity onPress={() => setShowLog((s) => !s)} testID="sip-log-toggle">
            <Ionicons name="terminal-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addTop} onPress={startAdd} testID="sip-add-top">
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.addTopText}>Add</Text>
          </TouchableOpacity>
        </>
      }
    >
      {/* Stat strip */}
      <View style={styles.stats}>
        <Stat label="Total" value={stats.total} color={colors.primary} />
        <Stat label="Registered" value={stats.active} color={colors.green} />
        <Stat label="Connecting" value={stats.connecting} color={colors.yellow} />
        <Stat label="Failed" value={stats.failed} color={colors.red} />
      </View>

      {runtimes.length === 0 && (
        <View style={styles.empty} testID="sip-empty-state">
          <MaterialCommunityIcons name="server-network-off" size={54} color={colors.textDim} />
          <Text style={styles.emptyTitle}>No SIP accounts yet</Text>
          <Text style={styles.emptySub}>Add your first account to start making real calls.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={startAdd} testID="sip-empty-add">
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.emptyBtnText}>Add SIP Account</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.emptyBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.primary, marginTop: 8 }]}
            onPress={async () => {
              await addAccount({ ...DEFAULT_ACCOUNT });
            }}
            testID="sip-empty-add-demo"
          >
            <Ionicons name="flash" size={16} color={colors.primary} />
            <Text style={[styles.emptyBtnText, { color: colors.primary }]}>Add Demo Account (568244)</Text>
          </TouchableOpacity>
        </View>
      )}

      {runtimes.map((r) => {
        const s = STATUS_UI(r.status);
        const isSelected = r.account.id === selectedId;
        return (
          <View key={r.account.id} style={[styles.card, isSelected && styles.cardSelected]} testID={`sip-account-${r.account.id}`}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={[styles.avatar, { backgroundColor: (r.account.color || colors.primary) + "30" }]}>
                <MaterialCommunityIcons name="server-network" size={22} color={r.account.color || colors.primary} />
                <View style={[styles.dot, { backgroundColor: s.color }]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{r.account.displayName || r.account.username}</Text>
                <Text style={styles.sub} numberOfLines={1}>{r.account.username}@{r.account.domain}</Text>
                {r.account.callerId ? (
                  <Text style={styles.sub} numberOfLines={1}>CLID: <Text style={{ color: colors.primary }}>{r.account.callerId}</Text></Text>
                ) : null}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <View style={[styles.statusPill, { backgroundColor: s.color + "22" }]}>
                    <View style={[styles.statusPillDot, { backgroundColor: s.color }]} />
                    <Text style={[styles.statusPillText, { color: s.color }]}>{s.label}</Text>
                  </View>
                  {isSelected && (
                    <View style={styles.selPill}>
                      <Ionicons name="checkmark" size={11} color="#fff" />
                      <Text style={styles.selPillText}>Selected</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.actionsRow}>
              {!isSelected && (
                <TouchableOpacity style={styles.actBtn} onPress={() => setSelected(r.account.id)} testID={`sip-select-${r.account.id}`}>
                  <Ionicons name="radio-button-on" size={14} color={colors.primary} />
                  <Text style={styles.actBtnText}>Select</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.actBtn}
                onPress={() => (r.status === "registered" || r.status === "connecting" ? disconnect(r.account.id) : connect(r.account.id))}
                testID={`sip-toggle-${r.account.id}`}
              >
                <Ionicons
                  name={r.status === "registered" ? "flash-off" : "flash"}
                  size={14}
                  color={r.status === "registered" ? colors.yellow : colors.green}
                />
                <Text style={styles.actBtnText}>{r.status === "registered" || r.status === "connecting" ? "Disconnect" : "Connect"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actBtn} onPress={() => startEdit(r)} testID={`sip-edit-${r.account.id}`}>
                <Ionicons name="create-outline" size={14} color={colors.textMuted} />
                <Text style={styles.actBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actBtnDanger} onPress={() => removeAccount(r.account.id)} testID={`sip-remove-${r.account.id}`}>
                <Ionicons name="trash-outline" size={14} color={colors.red} />
                <Text style={[styles.actBtnText, { color: colors.red }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {/* Log panel */}
      {showLog && (
        <View style={styles.logCard} testID="sip-log-panel">
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={styles.name}>SIP Log</Text>
            <Text style={{ color: colors.textMuted, fontSize: 11 }}>{aggregateLogs.length} events</Text>
          </View>
          <ScrollView style={{ maxHeight: 260, marginTop: 8 }}>
            {aggregateLogs.length === 0 && <Text style={{ color: colors.textMuted, textAlign: "center", padding: 12 }}>No events yet.</Text>}
            {aggregateLogs.map((e, i) => (
              <View key={i} style={styles.logRow}>
                <Text style={[styles.logLvl, { color: e.level === "error" ? colors.red : e.level === "warn" ? colors.yellow : colors.primary }]}>
                  [{e.level.toUpperCase()}]
                </Text>
                <Text style={styles.logTs}>{new Date(e.ts).toLocaleTimeString()}</Text>
                <Text style={styles.logMsg}>{e.msg}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <AccountFormModal
        form={form}
        onChange={setForm}
        onSave={doSave}
        onCancel={() => setForm(null)}
      />
    </Screen>
  );
}

function Stat({ label, value, color }: any) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function AccountFormModal({ form, onChange, onSave, onCancel }: any) {
  const insets = useSafeAreaInsets();
  if (!form) return null;
  const setF = (patch: any) => onChange({ ...form, ...patch });
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.mBackdrop} onPress={onCancel} />
      <View style={[styles.mSheet, { paddingBottom: insets.bottom + 12 }]} testID="sip-form-sheet">
        <View style={styles.mHandle} />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.mHeader}>
            <Text style={styles.mTitle}>{form.id ? "Edit SIP Account" : "Add SIP Account"}</Text>
            <TouchableOpacity onPress={onCancel} testID="sip-form-close"><Ionicons name="close" size={22} color={colors.textMuted} /></TouchableOpacity>
          </View>

          <Field label="Display Name">
            <TextInput style={styles.input} value={form.displayName} onChangeText={(t) => setF({ displayName: t })} placeholder="e.g. Office" placeholderTextColor={colors.textDim} testID="form-displayName" />
          </Field>
          <Field label="Username / Extension">
            <TextInput style={styles.input} value={form.username} onChangeText={(t) => setF({ username: t })} autoCapitalize="none" placeholder="568244" placeholderTextColor={colors.textDim} testID="form-username" />
          </Field>
          <Field label="Password">
            <TextInput style={styles.input} value={form.password} onChangeText={(t) => setF({ password: t })} secureTextEntry placeholder="••••••" placeholderTextColor={colors.textDim} testID="form-password" />
          </Field>
          <Field label="Domain / Realm">
            <TextInput style={styles.input} value={form.domain} onChangeText={(t) => setF({ domain: t })} autoCapitalize="none" placeholder="webdialer.depthroute.com" placeholderTextColor={colors.textDim} testID="form-domain" />
          </Field>
          <Field label="WSS URL">
            <TextInput style={styles.input} value={form.wssUrl} onChangeText={(t) => setF({ wssUrl: t })} autoCapitalize="none" placeholder="wss://host:8089/ws" placeholderTextColor={colors.textDim} testID="form-wss" />
          </Field>
          <Field label="Caller ID (optional)">
            <TextInput style={styles.input} value={form.callerId} onChangeText={(t) => setF({ callerId: t })} placeholder="+1 555-000-0000" placeholderTextColor={colors.textDim} testID="form-callerId" />
          </Field>
          <Field label="Auth Username (optional, if different)">
            <TextInput style={styles.input} value={form.authUser} onChangeText={(t) => setF({ authUser: t })} autoCapitalize="none" placeholder="Leave blank to reuse username" placeholderTextColor={colors.textDim} testID="form-authUser" />
          </Field>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>Auto-register on start</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>Enable to connect automatically when the app loads.</Text>
            </View>
            <Switch value={form.enabled} onValueChange={(v) => setF({ enabled: v })} testID="form-enabled" />
          </View>
          <TouchableOpacity style={styles.saveBtn} onPress={onSave} testID="form-save">
            <Ionicons name="save" size={16} color="#fff" />
            <Text style={styles.saveBtnText}>{form.id ? "Save Changes" : "Add & Connect"}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

function Field({ label, children }: any) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 6 }}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  addTop: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.primary, borderRadius: 999 },
  addTopText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  stats: { flexDirection: "row", gap: 8, marginTop: 8 },
  stat: { flex: 1, alignItems: "center", padding: 10, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  statValue: { fontSize: 22, fontWeight: "700" },
  statLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  empty: { alignItems: "center", padding: 40, marginTop: 12, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  emptyTitle: { color: "#fff", fontSize: 16, fontWeight: "700", marginTop: 14 },
  emptySub: { color: colors.textMuted, fontSize: 13, marginTop: 4, textAlign: "center" },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 20, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.primary },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  card: { padding: 14, backgroundColor: colors.card, borderRadius: 14, marginTop: 12, borderWidth: 1, borderColor: colors.border },
  cardSelected: { borderColor: colors.primary },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", position: "relative" },
  dot: { position: "absolute", right: -2, bottom: -2, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.card },
  name: { color: "#fff", fontWeight: "700", fontSize: 15 },
  sub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusPillDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 10, fontWeight: "700" },
  selPill: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, backgroundColor: colors.primary },
  selPillText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  actionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  actBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.border },
  actBtnDanger: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.redDim + "70", borderWidth: 1, borderColor: colors.red + "40" },
  actBtnText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  logCard: { padding: 14, backgroundColor: colors.card, borderRadius: 14, marginTop: 14, borderWidth: 1, borderColor: colors.border },
  logRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  logLvl: { fontSize: 10, fontWeight: "700", width: 55 },
  logTs: { color: colors.textDim, fontSize: 10, width: 70 },
  logMsg: { color: "#fff", fontSize: 11, flex: 1 },
  mBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  mSheet: { position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "90%", backgroundColor: "#0C1526", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 8, borderWidth: 1, borderColor: colors.border },
  mHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 8 },
  mHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  mTitle: { color: "#fff", fontWeight: "700", fontSize: 17 },
  input: { backgroundColor: colors.bgAlt, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: "#fff", fontSize: 14, borderWidth: 1, borderColor: colors.border },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 16, paddingVertical: 10 },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.primary, marginTop: 18 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
