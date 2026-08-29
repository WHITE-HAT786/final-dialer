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
import { useTheme, useThemedStyles, type Palette } from "@/src/theme";
import { useMultiSip, SipAccount, DEFAULT_ACCOUNT } from "@/src/sip/MultiSipContext";

const STATUS_UI = (status: string, c: Palette) => {
  switch (status) {
    case "registered": return { label: "Registered", color: c.success };
    case "connecting": return { label: "Connecting…", color: c.warn };
    case "registration_failed": return { label: "Registration Failed", color: c.danger };
    case "unsupported": return { label: "Unsupported", color: c.warn };
    case "error": return { label: "Error", color: c.danger };
    case "unregistered": return { label: "Unregistered", color: c.muted };
    default: return { label: "Disconnected", color: c.muted };
  }
};

export default function SipAccountsScreen() {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
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
    ...(runtimes.length === 0 ? { ...DEFAULT_ACCOUNT } : { displayName: "", username: "", password: "", domain: "", host: "", port: 5060, transport: "UDP" as any, wssUrl: "", callerId: "", authUser: "", enabled: true }),
  });

  const startEdit = (r: any) => setForm({
    id: r.account.id,
    displayName: r.account.displayName,
    username: r.account.username,
    password: r.account.password,
    domain: r.account.domain,
    host: r.account.host || r.account.domain || "",
    port: r.account.port || 5060,
    transport: r.account.transport || "WSS",
    wssUrl: r.account.wssUrl || "",
    callerId: r.account.callerId || "",
    authUser: r.account.authUser || "",
    enabled: r.account.enabled,
  });

  const doSave = async () => {
    if (!form) return;
    const patch = {
      displayName: form.displayName,
      username: form.username,
      password: form.password,
      domain: form.domain,
      host: form.host,
      port: Number(form.port) || 5060,
      transport: form.transport,
      wssUrl: form.wssUrl,
      callerId: form.callerId,
      authUser: form.authUser,
      enabled: form.enabled,
    };
    if (form.id) await updateAccount(form.id, patch);
    else await addAccount(patch);
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
            <Ionicons name="terminal-outline" size={22} color={c.primary} />
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
        <Stat label="Total" value={stats.total} color={c.primary} />
        <Stat label="Registered" value={stats.active} color={c.green} />
        <Stat label="Connecting" value={stats.connecting} color={c.yellow} />
        <Stat label="Failed" value={stats.failed} color={c.red} />
      </View>

      {runtimes.length === 0 && (
        <View style={styles.empty} testID="sip-empty-state">
          <MaterialCommunityIcons name="server-network-off" size={54} color={c.textDim} />
          <Text style={styles.emptyTitle}>No SIP accounts yet</Text>
          <Text style={styles.emptySub}>Add your first account to start making real calls.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={startAdd} testID="sip-empty-add">
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.emptyBtnText}>Add SIP Account</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.emptyBtn, { backgroundColor: c.card, borderWidth: 1, borderColor: c.primary, marginTop: 8 }]}
            onPress={async () => {
              await addAccount({ ...DEFAULT_ACCOUNT });
            }}
            testID="sip-empty-add-demo"
          >
            <Ionicons name="flash" size={16} color={c.primary} />
            <Text style={[styles.emptyBtnText, { color: c.primary }]}>Add Demo Account (568244)</Text>
          </TouchableOpacity>
        </View>
      )}

      {runtimes.map((r) => {
        const s = STATUS_UI(r.status, c);
        const isSelected = r.account.id === selectedId;
        return (
          <View key={r.account.id} style={[styles.card, isSelected && styles.cardSelected]} testID={`sip-account-${r.account.id}`}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={[styles.avatar, { backgroundColor: (r.account.color || c.primary) + "30" }]}>
                <MaterialCommunityIcons name="server-network" size={22} color={r.account.color || c.primary} />
                <View style={[styles.dot, { backgroundColor: s.color }]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{r.account.displayName || r.account.username}</Text>
                <Text style={styles.sub} numberOfLines={1}>{r.account.username}@{r.account.host || r.account.domain}{r.account.port ? `:${r.account.port}` : ""} <Text style={{ color: c.primary, fontWeight: "700" }}>{r.account.transport || "WSS"}</Text></Text>
                {r.account.callerId ? (
                  <Text style={styles.sub} numberOfLines={1}>CLID: <Text style={{ color: c.primary }}>{r.account.callerId}</Text></Text>
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
                  <Ionicons name="radio-button-on" size={14} color={c.primary} />
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
                  color={r.status === "registered" ? c.yellow : c.green}
                />
                <Text style={styles.actBtnText}>{r.status === "registered" || r.status === "connecting" ? "Disconnect" : "Connect"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actBtn} onPress={() => startEdit(r)} testID={`sip-edit-${r.account.id}`}>
                <Ionicons name="create-outline" size={14} color={c.textMuted} />
                <Text style={styles.actBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actBtnDanger} onPress={() => removeAccount(r.account.id)} testID={`sip-remove-${r.account.id}`}>
                <Ionicons name="trash-outline" size={14} color={c.red} />
                <Text style={[styles.actBtnText, { color: c.red }]}>Remove</Text>
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
            <Text style={{ color: c.textMuted, fontSize: 11 }}>{aggregateLogs.length} events</Text>
          </View>
          <ScrollView style={{ maxHeight: 260, marginTop: 8 }}>
            {aggregateLogs.length === 0 && <Text style={{ color: c.textMuted, textAlign: "center", padding: 12 }}>No events yet.</Text>}
            {aggregateLogs.map((e, i) => (
              <View key={i} style={styles.logRow}>
                <Text style={[styles.logLvl, { color: e.level === "error" ? c.red : e.level === "warn" ? c.yellow : c.primary }]}>
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
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function AccountFormModal({ form, onChange, onSave, onCancel }: any) {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
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
            <TouchableOpacity onPress={onCancel} testID="sip-form-close"><Ionicons name="close" size={22} color={c.textMuted} /></TouchableOpacity>
          </View>

          <Field label="Display Name">
            <TextInput style={styles.input} value={form.displayName} onChangeText={(t) => setF({ displayName: t })} placeholder="e.g. Office" placeholderTextColor={c.textDim} testID="form-displayName" />
          </Field>
          <Field label="Username / Extension">
            <TextInput style={styles.input} value={form.username} onChangeText={(t) => setF({ username: t })} autoCapitalize="none" placeholder="568244" placeholderTextColor={c.textDim} testID="form-username" />
          </Field>
          <Field label="Password">
            <TextInput style={styles.input} value={form.password} onChangeText={(t) => setF({ password: t })} secureTextEntry placeholder="••••••" placeholderTextColor={c.textDim} testID="form-password" />
          </Field>
          <Field label="Domain / Realm">
            <TextInput style={styles.input} value={form.domain} onChangeText={(t) => setF({ domain: t })} autoCapitalize="none" placeholder="sip.depthroute.com" placeholderTextColor={c.textDim} testID="form-domain" />
          </Field>
          <Field label="SIP Host (server address)">
            <TextInput style={styles.input} value={form.host || ""} onChangeText={(t) => setF({ host: t })} autoCapitalize="none" placeholder="sip.depthroute.com" placeholderTextColor={c.textDim} testID="form-host" />
          </Field>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.textMuted, fontSize: 12, marginBottom: 6 }}>Port</Text>
              <TextInput style={styles.input} value={String(form.port || "")} onChangeText={(t) => setF({ port: t.replace(/[^0-9]/g, "") })} keyboardType="numeric" placeholder="5060" placeholderTextColor={c.textDim} testID="form-port" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.textMuted, fontSize: 12, marginBottom: 6 }}>Transport</Text>
              <View style={styles.transportRow}>
                {(["UDP", "TCP", "TLS", "WSS"] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.transportChip, form.transport === t && styles.transportChipActive]}
                    onPress={() => {
                      const defaultPort = t === "TLS" ? 5061 : t === "WSS" ? 8089 : 5060;
                      setF({ transport: t, port: form.port || defaultPort });
                    }}
                    testID={`form-transport-${t}`}
                  >
                    <Text style={[styles.transportText, form.transport === t && { color: "#fff" }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
          {form.transport && form.transport !== "WSS" && (form.transport as any) !== "WS" && (
            <View style={styles.warn} testID="form-transport-warn">
              <Ionicons name="warning" size={14} color={c.yellow} />
              <Text style={styles.warnText}>{form.transport} transport can&apos;t register from a browser preview. Only WSS works here. UDP/TCP/TLS registers in a native build (react-native-pjsip).</Text>
            </View>
          )}
          {form.transport === "WSS" && (
            <Field label="Custom WSS URL (optional)">
              <TextInput style={styles.input} value={form.wssUrl || ""} onChangeText={(t) => setF({ wssUrl: t })} autoCapitalize="none" placeholder="Auto: wss://host:port/ws" placeholderTextColor={c.textDim} testID="form-wss" />
            </Field>
          )}
          <Field label="Caller ID (optional)">
            <TextInput style={styles.input} value={form.callerId} onChangeText={(t) => setF({ callerId: t })} placeholder="+1 555-000-0000" placeholderTextColor={c.textDim} testID="form-callerId" />
          </Field>
          <Field label="Auth Username (optional, if different)">
            <TextInput style={styles.input} value={form.authUser} onChangeText={(t) => setF({ authUser: t })} autoCapitalize="none" placeholder="Leave blank to reuse username" placeholderTextColor={c.textDim} testID="form-authUser" />
          </Field>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.text, fontWeight: "600", fontSize: 14 }}>Auto-register on start</Text>
              <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>Enable to connect automatically when the app loads.</Text>
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
  const c = useTheme();
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={{ color: c.muted, fontSize: 12, marginBottom: 6 }}>{label}</Text>
      {children}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    addTop: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: c.primary, borderRadius: 999 },
    addTopText: { color: c.text, fontSize: 12, fontWeight: "700" },
    stats: { flexDirection: "row", gap: 8, marginTop: 8 },
    stat: { flex: 1, alignItems: "center", padding: 10, backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.border },
    statValue: { fontSize: 22, fontWeight: "700" },
    statLabel: { color: c.textMuted, fontSize: 11, marginTop: 2 },
    empty: { alignItems: "center", padding: 40, marginTop: 12, backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border },
    emptyTitle: { color: c.text, fontSize: 16, fontWeight: "700", marginTop: 14 },
    emptySub: { color: c.textMuted, fontSize: 13, marginTop: 4, textAlign: "center" },
    emptyBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 20, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10, backgroundColor: c.primary },
    emptyBtnText: { color: c.text, fontWeight: "700", fontSize: 13 },
    card: { padding: 14, backgroundColor: c.card, borderRadius: 14, marginTop: 12, borderWidth: 1, borderColor: c.border },
    cardSelected: { borderColor: c.primary },
    avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", position: "relative" },
    dot: { position: "absolute", right: -2, bottom: -2, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: c.card },
    name: { color: c.text, fontWeight: "700", fontSize: 15 },
    sub: { color: c.textMuted, fontSize: 12, marginTop: 2 },
    statusPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    statusPillDot: { width: 6, height: 6, borderRadius: 3 },
    statusPillText: { fontSize: 10, fontWeight: "700" },
    selPill: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, backgroundColor: c.primary },
    selPillText: { color: c.text, fontSize: 10, fontWeight: "700" },
    actionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.borderSoft },
    actBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: c.bgAlt, borderWidth: 1, borderColor: c.border },
    actBtnDanger: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: c.redDim + "70", borderWidth: 1, borderColor: c.red + "40" },
    actBtnText: { color: c.text, fontSize: 12, fontWeight: "600" },
    logCard: { padding: 14, backgroundColor: c.card, borderRadius: 14, marginTop: 14, borderWidth: 1, borderColor: c.border },
    logRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: c.borderSoft },
    logLvl: { fontSize: 10, fontWeight: "700", width: 55 },
    logTs: { color: c.textDim, fontSize: 10, width: 70 },
    logMsg: { color: c.text, fontSize: 11, flex: 1 },
    mBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: c.overlay },
    mSheet: { position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "90%", backgroundColor: c.bgElev, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 8, borderWidth: 1, borderColor: c.border },
    mHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: "center", marginBottom: 8 },
    mHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    mTitle: { color: c.text, fontWeight: "700", fontSize: 17 },
    input: { backgroundColor: c.bgAlt, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: c.text, fontSize: 14, borderWidth: 1, borderColor: c.border },
    transportRow: { flexDirection: "row", gap: 4 },
    transportChip: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: c.border, alignItems: "center", backgroundColor: c.bgAlt },
    transportChipActive: { backgroundColor: c.primary, borderColor: c.primary },
    transportText: { color: c.textMuted, fontSize: 11, fontWeight: "700" },
    warn: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 10, borderRadius: 10, backgroundColor: c.yellowDim + "80", borderWidth: 1, borderColor: c.yellow + "40", marginTop: 10 },
    warnText: { flex: 1, color: c.yellow, fontSize: 11, fontWeight: "600" },
    switchRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 16, paddingVertical: 10 },
    saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: c.primary, marginTop: 18 },
    saveBtnText: { color: c.text, fontWeight: "700", fontSize: 14 },
  });
