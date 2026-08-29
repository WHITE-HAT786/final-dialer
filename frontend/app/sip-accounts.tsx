import React, { useMemo, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Pressable, ScrollView, Switch,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Screen from "@/src/components/Screen";
import { colors } from "@/src/theme";
import { useMultiSip, SipAccount } from "@/src/sip/MultiSipContext";
import { sipBootstrapLabel, isRetryable } from "@/src/sip/sipBootstrap";

/**
 * SIP Accounts (Phase 20). Two categories:
 *  A) The automatic Depth Route (WebDialer) account — read-only, from sip-config.php
 *     via the authenticated token. Password is NEVER shown ("Managed by Depth Route").
 *  B) Manual SIP accounts — add/edit/delete/register; passwords go to the platform
 *     secure store (expo-secure-store) via MultiSipContext, never plain storage/logs.
 *
 * Transport selector is functional, not cosmetic: UDP drives the native PJSIP engine.
 * WebRTC is surfaced honestly as unavailable in this build (there is no WebRTC/WSS
 * engine linked — see gap analysis), rather than faking a WebRTC registration.
 */
function statusColor(state: string): string {
  switch (state) {
    case "registered": return colors.green;
    case "registering": case "connecting": case "loading": case "unsupported": return colors.yellow;
    case "idle": case "unregistered": return colors.textMuted;
    default: return colors.red;
  }
}
const STATUS_UI = (s: string) => {
  switch (s) {
    case "registered": return { label: "Registered", color: colors.green };
    case "connecting": return { label: "Connecting…", color: colors.yellow };
    case "registration_failed": return { label: "Registration Failed", color: colors.red };
    case "unsupported": return { label: "Unsupported in this build", color: colors.yellow };
    case "error": return { label: "Error", color: colors.red };
    case "unregistered": return { label: "Unregistered", color: colors.textMuted };
    default: return { label: "Disconnected", color: colors.textMuted };
  }
};

type FormState = ({ id?: string } & Omit<SipAccount, "id" | "color">) | null;

// Provider presets: PUBLIC, non-secret configuration ONLY (server/port/transport).
// The customer always supplies their own SIP username + password. "Custom" leaves
// every field editable. Add new providers here as config data — never credentials.
type Provider = { key: string; name: string; website?: string; host?: string; port?: number; transport?: "UDP" | "TCP" | "TLS" | "WSS"; wssUrl?: string };
const PROVIDERS: Provider[] = [
  { key: "anycall", name: "Any Call Agency", website: "anycallagency.org" },
  { key: "custom", name: "Custom Provider" },
];

export default function SipAccountsScreen() {
  const {
    runtimes, bootstrap, bootstrapError, retryBootstrap,
    selectedId, setSelected, addAccount, updateAccount, removeAccount, connect, disconnect,
  } = useMultiSip();
  const [mode, setMode] = useState<"UDP" | "WebRTC">("UDP");
  const [form, setForm] = useState<FormState>(null);

  const primaryRuntime = runtimes.find((r) => r.account.ephemeral) || null;
  const primary = primaryRuntime?.account || null;
  const manual = useMemo(() => runtimes.filter((r) => !r.account.ephemeral), [runtimes]);
  const bLabel = sipBootstrapLabel(bootstrap);
  const bColor = statusColor(bootstrap);
  // The populated card must show the primary engine's LIVE registration status —
  // the same source the Dashboard and Header trust — so all three stay in sync.
  // (The `bootstrap` phase variable can wedge at an early "error"/"unavailable"
  // and never recover, which previously showed "SIP error" here while the line
  // was in fact Registered.) Fall back to bootstrap only before a runtime exists.
  const primaryUI = primaryRuntime
    ? STATUS_UI(primaryRuntime.status)
    : { label: bLabel, color: bColor };

  const startAdd = () => setForm({
    displayName: "", username: "", authUser: "", password: "", domain: "", host: "",
    port: 5060, transport: "UDP", wssUrl: "", outboundProxy: null, callerId: "", enabled: true,
  });
  const startEdit = (a: SipAccount) => setForm({
    id: a.id, displayName: a.displayName, username: a.username, authUser: a.authUser || "",
    password: a.password, domain: a.domain, host: a.host || a.domain || "", port: a.port || 5060,
    transport: (a.transport as any) || "UDP", wssUrl: a.wssUrl || "", outboundProxy: a.outboundProxy ?? null,
    callerId: a.callerId || "", enabled: a.enabled,
  });
  const doSave = async () => {
    if (!form) return;
    const patch = {
      displayName: form.displayName, username: form.username, authUser: form.authUser,
      password: form.password, domain: form.domain, host: form.host, port: Number(form.port) || 5060,
      transport: form.transport, wssUrl: form.wssUrl, outboundProxy: form.outboundProxy ?? null,
      callerId: form.callerId, enabled: form.enabled,
    };
    if (form.id) await updateAccount(form.id, patch);
    else await addAccount(patch);
    setForm(null);
  };

  return (
    <Screen title="SIP Accounts" activeKey="sip" showSip={false} showBell={false}
      right={<TouchableOpacity style={styles.addTop} onPress={startAdd} testID="sip-add"><Ionicons name="add" size={16} color="#fff" /><Text style={styles.addTopText}>Add</Text></TouchableOpacity>}
    >
      <View style={styles.banner}>
        <Ionicons name="lock-closed" size={14} color={colors.textMuted} />
        <Text style={styles.bannerText}>Your Depth Route line is set up automatically. Credentials are managed by Depth Route and never shown.</Text>
      </View>

      {/* ---- Connection mode (functional: UDP native; WebRTC honest-unavailable) ---- */}
      <Text style={styles.section}>CONNECTION MODE</Text>
      <View style={styles.segment}>
        {(["UDP", "WebRTC"] as const).map((m) => (
          <TouchableOpacity key={m} style={[styles.segBtn, mode === m && styles.segBtnActive]} onPress={() => setMode(m)} testID={`sip-mode-${m}`}>
            <Text style={[styles.segText, mode === m && { color: "#fff" }]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {mode === "WebRTC" && (
        <View style={styles.warn}>
          <Ionicons name="warning" size={14} color={colors.yellow} />
          <Text style={styles.warnText}>Your managed Depth Route line registers over native SIP/UDP. WebRTC (SIP-over-WSS) is available for third-party accounts you add below — pick the WebRTC transport when adding one.</Text>
        </View>
      )}

      {/* ---- A) Automatic Depth Route account ---- */}
      <Text style={styles.section}>DEPTH ROUTE ACCOUNT</Text>
      {primary ? (
        <View style={[styles.card, selectedId === primary.id && styles.cardActive]} testID="sip-auto">
          <View style={styles.cardHead}>
            <View style={styles.avatar}><MaterialCommunityIcons name="server-network" size={20} color={colors.primary} /><View style={[styles.dot, { backgroundColor: primaryUI.color }]} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>Depth Route</Text>
              <View style={[styles.pill, { backgroundColor: primaryUI.color + "22" }]}><View style={[styles.pillDot, { backgroundColor: primaryUI.color }]} /><Text style={[styles.pillText, { color: primaryUI.color }]}>{primaryUI.label}</Text></View>
            </View>
            <View style={styles.managedTag}><Text style={styles.managedText}>Automatic</Text></View>
          </View>
          <View style={styles.rows}>
            <Info label="Extension" value={primary.username || primary.displayName || "—"} />
            <Info label="SIP Server" value={primary.host || primary.domain || "—"} />
            <Info label="Port" value={String(primary.port || 5060)} />
            <Info label="Transport" value={primary.transport || "UDP"} />
            <Info label="Authentication" value="Managed by Depth Route" />
            <Info label="Password" value="••••••••" last />
          </View>
        </View>
      ) : (
        <View style={styles.card} testID="sip-auto-none">
          <View style={{ alignItems: "center", paddingVertical: 14, gap: 8 }}>
            <MaterialCommunityIcons name="server-network-off" size={40} color={colors.textDim} />
            <Text style={styles.name}>{bLabel}</Text>
            <Text style={styles.muted}>{bootstrapError || "Your line is set up automatically after sign-in."}</Text>
            {isRetryable(bootstrap) && <TouchableOpacity style={styles.retry} onPress={retryBootstrap} testID="sip-retry"><Ionicons name="refresh" size={16} color="#fff" /><Text style={styles.retryText}>Retry</Text></TouchableOpacity>}
          </View>
        </View>
      )}

      {/* ---- B) Manual SIP accounts ---- */}
      <View style={styles.sectionRow}>
        <Text style={styles.section}>MY SIP ACCOUNTS</Text>
        <TouchableOpacity onPress={startAdd}><Text style={styles.addLink}>+ Add SIP Account</Text></TouchableOpacity>
      </View>
      {manual.length === 0 ? (
        <View style={styles.card}><Text style={styles.muted}>No additional SIP accounts. Add one to register a third-party SIP line (its password is stored in the device secure keystore, never shown).</Text></View>
      ) : manual.map((r) => {
        const s = STATUS_UI(r.status);
        const active = r.account.id === selectedId;
        return (
          <View key={r.account.id} style={[styles.card, active && styles.cardActive]} testID={`sip-manual-${r.account.id}`}>
            <View style={styles.cardHead}>
              <View style={[styles.avatar, { backgroundColor: (r.account.color || colors.primary) + "30" }]}><MaterialCommunityIcons name="account-network" size={20} color={r.account.color || colors.primary} /><View style={[styles.dot, { backgroundColor: s.color }]} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{r.account.displayName || r.account.username}</Text>
                <Text style={styles.sub} numberOfLines={1}>{r.account.username}@{r.account.host || r.account.domain}:{r.account.port || 5060} · {r.account.transport || "UDP"}</Text>
                <View style={[styles.pill, { backgroundColor: s.color + "22", marginTop: 4 }]}><View style={[styles.pillDot, { backgroundColor: s.color }]} /><Text style={[styles.pillText, { color: s.color }]}>{s.label}</Text>{active && <Text style={styles.activeTag}> · Active</Text>}</View>
              </View>
            </View>
            <View style={styles.actions}>
              {!active && <Act icon="radio-button-on" label="Set Active" color={colors.primary} onPress={() => setSelected(r.account.id)} />}
              <Act icon={r.status === "registered" ? "flash-off" : "flash"} label={r.status === "registered" || r.status === "connecting" ? "Unregister" : "Register"} color={r.status === "registered" ? colors.yellow : colors.green} onPress={() => (r.status === "registered" || r.status === "connecting" ? disconnect(r.account.id) : connect(r.account.id))} />
              <Act icon="create-outline" label="Edit" color={colors.textMuted} onPress={() => startEdit(r.account)} />
              <Act icon="trash-outline" label="Delete" color={colors.red} onPress={() => removeAccount(r.account.id)} />
            </View>
          </View>
        );
      })}

      <AccountForm form={form} onChange={setForm} onSave={doSave} onCancel={() => setForm(null)} />
    </Screen>
  );
}

function Info({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.infoRow, !last && { borderBottomWidth: 1, borderBottomColor: colors.borderSoft }]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}
function Act({ icon, label, color, onPress }: { icon: any; label: string; color: string; onPress: () => void }) {
  return <TouchableOpacity style={styles.act} onPress={onPress}><Ionicons name={icon} size={14} color={color} /><Text style={[styles.actText, { color: color === colors.red ? colors.red : "#fff" }]}>{label}</Text></TouchableOpacity>;
}

function AccountForm({ form, onChange, onSave, onCancel }: { form: FormState; onChange: (f: FormState) => void; onSave: () => void; onCancel: () => void }) {
  const insets = useSafeAreaInsets();
  if (!form) return null;
  const setF = (p: Partial<NonNullable<FormState>>) => onChange({ ...form, ...p } as FormState);
  const transports = ["UDP", "TCP", "TLS", "WSS"] as const;
  const applyPreset = (p: Provider) => {
    // Prefill only known, non-secret configuration. Credentials stay user-entered.
    const patch: Partial<NonNullable<FormState>> = { displayName: form.displayName || p.name };
    if (p.host) { patch.host = p.host; patch.domain = p.host; }
    if (p.port) patch.port = p.port;
    if (p.transport) patch.transport = p.transport;
    if (p.wssUrl) patch.wssUrl = p.wssUrl;
    setF(patch);
  };
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.mBackdrop} onPress={onCancel} />
      <View style={[styles.mSheet, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.mHandle} />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.mHead}><Text style={styles.mTitle}>{form.id ? "Edit SIP Account" : "Add SIP Account"}</Text><TouchableOpacity onPress={onCancel}><Ionicons name="close" size={22} color={colors.textMuted} /></TouchableOpacity></View>
          <Text style={styles.fLabel}>Provider</Text>
          <View style={styles.tRow}>
            {PROVIDERS.map((p) => (
              <TouchableOpacity key={p.key} style={[styles.tChip, { flex: 0, paddingHorizontal: 12 }]} onPress={() => applyPreset(p)} testID={`f-provider-${p.key}`}>
                <Text style={styles.tText}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.tNote}>Presets prefill server settings only — enter your own username &amp; password.</Text>
          <Field label="Account Name"><TextInput style={styles.input} value={form.displayName} onChangeText={(t) => setF({ displayName: t })} placeholder="e.g. Office" placeholderTextColor={colors.textDim} testID="f-name" /></Field>
          <Field label="SIP Username"><TextInput style={styles.input} value={form.username} onChangeText={(t) => setF({ username: t })} autoCapitalize="none" placeholder="2001" placeholderTextColor={colors.textDim} testID="f-username" /></Field>
          <Field label="Auth Username (optional)"><TextInput style={styles.input} value={form.authUser} onChangeText={(t) => setF({ authUser: t })} autoCapitalize="none" placeholder="Defaults to SIP username" placeholderTextColor={colors.textDim} testID="f-auth" /></Field>
          <Field label="SIP Password (stored in secure keystore)"><TextInput style={styles.input} value={form.password} onChangeText={(t) => setF({ password: t })} secureTextEntry placeholder="••••••" placeholderTextColor={colors.textDim} testID="f-pass" /></Field>
          <Field label="SIP Server / Domain"><TextInput style={styles.input} value={form.host || ""} onChangeText={(t) => setF({ host: t, domain: t })} autoCapitalize="none" placeholder="sip.example.com" placeholderTextColor={colors.textDim} testID="f-host" /></Field>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <View style={{ width: 110 }}><Text style={styles.fLabel}>Port</Text><TextInput style={styles.input} value={String(form.port || "")} onChangeText={(t) => setF({ port: Number(t.replace(/[^0-9]/g, "")) || 5060 })} keyboardType="numeric" placeholder="5060" placeholderTextColor={colors.textDim} testID="f-port" /></View>
            <View style={{ flex: 1 }}><Text style={styles.fLabel}>Transport</Text>
              <View style={styles.tRow}>
                {transports.map((t) => (
                  <TouchableOpacity key={t} style={[styles.tChip, form.transport === t && styles.tChipActive]} onPress={() => setF({ transport: t })} testID={`f-transport-${t}`}><Text style={[styles.tText, form.transport === t && { color: "#fff" }]}>{t === "WSS" ? "WebRTC" : t}</Text></TouchableOpacity>
                ))}
              </View>
              <Text style={styles.tNote}>UDP/TCP/TLS use native PJSIP; WebRTC uses SIP-over-WSS.</Text>
            </View>
          </View>
          {form.transport === "WSS" && (
            <Field label="WebRTC WSS URL"><TextInput style={styles.input} value={form.wssUrl || ""} onChangeText={(t) => setF({ wssUrl: t })} autoCapitalize="none" placeholder="wss://host:8089/ws" placeholderTextColor={colors.textDim} testID="f-wss" /></Field>
          )}
          <Field label="Outbound Proxy (optional)"><TextInput style={styles.input} value={form.outboundProxy || ""} onChangeText={(t) => setF({ outboundProxy: t || null })} autoCapitalize="none" placeholder="sip:proxy.example.com:5060" placeholderTextColor={colors.textDim} testID="f-proxy" /></Field>
          <View style={styles.switchRow}><View style={{ flex: 1 }}><Text style={styles.swTitle}>Auto-register</Text><Text style={styles.swSub}>Connect automatically when the app loads.</Text></View><Switch value={form.enabled} onValueChange={(v) => setF({ enabled: v })} testID="f-enabled" /></View>
          <TouchableOpacity style={styles.saveBtn} onPress={onSave} testID="f-save"><Ionicons name="save" size={16} color="#fff" /><Text style={styles.saveText}>{form.id ? "Save Changes" : "Add & Register"}</Text></TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <View style={{ marginTop: 12 }}><Text style={styles.fLabel}>{label}</Text>{children}</View>;
}

const styles = StyleSheet.create({
  addTop: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.primary, borderRadius: 999 },
  addTopText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  banner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, backgroundColor: colors.card, borderRadius: 12, marginTop: 8, borderWidth: 1, borderColor: colors.border },
  bannerText: { flex: 1, color: colors.textMuted, fontSize: 12 },
  section: { color: colors.textDim, fontSize: 11, fontWeight: "700", letterSpacing: 1.1, marginTop: 18, marginBottom: 8, marginLeft: 4 },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  addLink: { color: colors.primary, fontSize: 12, fontWeight: "700", marginBottom: 8 },
  segment: { flexDirection: "row", backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 4, gap: 4 },
  segBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: "center" },
  segBtnActive: { backgroundColor: colors.primary },
  segText: { color: colors.textMuted, fontWeight: "700", fontSize: 13 },
  warn: { flexDirection: "row", gap: 8, padding: 10, borderRadius: 10, backgroundColor: colors.yellowDim + "80", borderWidth: 1, borderColor: colors.yellow + "40", marginTop: 10 },
  warnText: { flex: 1, color: colors.yellow, fontSize: 11, fontWeight: "600" },
  card: { padding: 14, backgroundColor: colors.card, borderRadius: 14, marginTop: 10, borderWidth: 1, borderColor: colors.border },
  cardActive: { borderColor: colors.primary },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", position: "relative" },
  dot: { position: "absolute", right: -2, bottom: -2, width: 13, height: 13, borderRadius: 7, borderWidth: 2, borderColor: colors.card },
  name: { color: "#fff", fontWeight: "700", fontSize: 15 },
  sub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  muted: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  pill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: "flex-start" },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 10, fontWeight: "700" },
  activeTag: { color: colors.primary, fontSize: 10, fontWeight: "700" },
  managedTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: colors.primaryDim },
  managedText: { color: colors.primary, fontSize: 10, fontWeight: "700" },
  rows: { marginTop: 12 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 11, gap: 12 },
  infoLabel: { color: colors.textMuted, fontSize: 13 },
  infoValue: { color: "#fff", fontSize: 13, fontWeight: "600", flex: 1, textAlign: "right" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  act: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.border },
  actText: { fontSize: 12, fontWeight: "600" },
  retry: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.primary },
  retryText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  mBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  mSheet: { position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "90%", backgroundColor: "#0C1526", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 8, borderWidth: 1, borderColor: colors.border },
  mHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 8 },
  mHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  mTitle: { color: "#fff", fontWeight: "700", fontSize: 17 },
  input: { backgroundColor: colors.bgAlt, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: "#fff", fontSize: 14, borderWidth: 1, borderColor: colors.border },
  fLabel: { color: colors.textMuted, fontSize: 12, marginBottom: 6 },
  tRow: { flexDirection: "row", gap: 4 },
  tChip: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: "center", backgroundColor: colors.bgAlt },
  tChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tChipDisabled: { opacity: 0.5 },
  tText: { color: colors.textMuted, fontSize: 11, fontWeight: "700" },
  tTextDisabled: { color: colors.textDim, fontSize: 11, fontWeight: "700" },
  tNote: { color: colors.textDim, fontSize: 10, marginTop: 4 },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 16, paddingVertical: 10 },
  swTitle: { color: "#fff", fontWeight: "600", fontSize: 14 },
  swSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.primary, marginTop: 18 },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
