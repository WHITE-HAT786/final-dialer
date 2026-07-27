import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Screen from "@/src/components/Screen";
import { colors } from "@/src/theme";
import { useSipEngine } from "@/src/sip/SipEngineContext";
import { DEFAULT_SIP_CONFIG } from "@/src/sip/SipEngineContext";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  unsupported: { label: "Not supported (Expo Go)", color: colors.yellow },
  disconnected: { label: "Disconnected", color: colors.textMuted },
  connecting: { label: "Connecting…", color: colors.yellow },
  registered: { label: "Registered", color: colors.green },
  unregistered: { label: "Unregistered", color: colors.textMuted },
  registration_failed: { label: "Registration Failed", color: colors.red },
  error: { label: "Error", color: colors.red },
};

export default function Settings() {
  const { config, status, saveConfig, clearConfig, connect, disconnect, logs, supported } = useSipEngine();

  const [displayName, setDisplayName] = useState(config?.displayName ?? DEFAULT_SIP_CONFIG.displayName);
  const [username, setUsername] = useState(config?.username ?? DEFAULT_SIP_CONFIG.username);
  const [password, setPassword] = useState(config?.password ?? DEFAULT_SIP_CONFIG.password);
  const [domain, setDomain] = useState(config?.domain ?? DEFAULT_SIP_CONFIG.domain);
  const [wssUrl, setWssUrl] = useState(config?.wssUrl ?? DEFAULT_SIP_CONFIG.wssUrl);
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!config) return;
    setDisplayName(config.displayName);
    setUsername(config.username);
    setPassword(config.password);
    setDomain(config.domain);
    setWssUrl(config.wssUrl);
  }, [config]);

  const s = STATUS_LABEL[status] || STATUS_LABEL.disconnected;

  const requestMicOnWeb = async () => {
    if (Platform.OS !== "web") return;
    try {
      // @ts-ignore
      if (navigator?.mediaDevices?.getUserMedia) {
        // @ts-ignore
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        stream.getTracks().forEach((t: any) => t.stop());
      }
    } catch {
      // user denied — we surface via engine logs
    }
  };

  const onSave = async () => {
    setSaving(true);
    await requestMicOnWeb();
    await saveConfig({
      displayName: displayName.trim(),
      username: username.trim(),
      password,
      domain: domain.trim(),
      wssUrl: wssUrl.trim(),
      registerExpires: 300,
    });
    setSaving(false);
  };

  const onLoadDemo = () => {
    setDisplayName(DEFAULT_SIP_CONFIG.displayName);
    setUsername(DEFAULT_SIP_CONFIG.username);
    setPassword(DEFAULT_SIP_CONFIG.password);
    setDomain(DEFAULT_SIP_CONFIG.domain);
    setWssUrl(DEFAULT_SIP_CONFIG.wssUrl);
  };

  return (
    <Screen title="SIP Settings" activeKey="settings" showBack showSip={false} showBell={false}>
      {/* Status card */}
      <View style={styles.statusCard} testID="sip-status-card">
        <View style={[styles.statusDot, { backgroundColor: s.color }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.statusLabel}>Registration Status</Text>
          <Text style={[styles.statusValue, { color: s.color }]}>{s.label}</Text>
          {config && <Text style={styles.statusMeta}>{config.username}@{config.domain}</Text>}
        </View>
        {config && supported ? (
          <TouchableOpacity
            style={[styles.actionBtn, status === "registered" ? styles.actionBtnDanger : styles.actionBtnPrimary]}
            onPress={() => (status === "registered" ? disconnect() : connect())}
            testID="sip-toggle-connection"
          >
            <Text style={styles.actionBtnText}>{status === "registered" ? "Disconnect" : "Connect"}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {!supported && (
        <View style={styles.warning}>
          <Ionicons name="warning" size={16} color={colors.yellow} />
          <Text style={styles.warningText}>
            Real SIP calling requires a native build (`react-native-webrtc`) or the web preview. In Expo Go it stays in the "unsupported" state.
          </Text>
        </View>
      )}

      {/* Form */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>SIP Account</Text>

        <Field label="Display Name">
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Depth Route"
            placeholderTextColor={colors.textDim}
            testID="sip-display-name"
          />
        </Field>

        <Field label="Username / Extension">
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            placeholder="bman1"
            placeholderTextColor={colors.textDim}
            testID="sip-username"
          />
        </Field>

        <Field label="Password">
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPw}
              placeholder="••••••"
              placeholderTextColor={colors.textDim}
              testID="sip-password"
            />
            <TouchableOpacity onPress={() => setShowPw((v) => !v)} testID="sip-password-toggle">
              <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </Field>

        <Field label="Domain / Realm">
          <TextInput
            style={styles.input}
            value={domain}
            onChangeText={setDomain}
            autoCapitalize="none"
            placeholder="sip.depthroute.com"
            placeholderTextColor={colors.textDim}
            testID="sip-domain"
          />
        </Field>

        <Field label="WSS URL">
          <TextInput
            style={styles.input}
            value={wssUrl}
            onChangeText={setWssUrl}
            autoCapitalize="none"
            placeholder="wss://sip.depthroute.com:8089/ws"
            placeholderTextColor={colors.textDim}
            testID="sip-wss"
          />
          <Text style={styles.hint}>
            SIP over WebSocket Secure. Common Asterisk defaults: {"\n"}
            wss://your-host:8089/ws
          </Text>
        </Field>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
          <TouchableOpacity style={styles.demoBtn} onPress={onLoadDemo} testID="sip-load-demo">
            <Ionicons name="refresh" size={16} color={colors.primary} />
            <Text style={styles.demoBtnText}>Load Demo Creds</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={onSave}
            disabled={saving}
            testID="sip-save"
          >
            <Ionicons name="save" size={16} color="#fff" />
            <Text style={styles.saveBtnText}>{saving ? "Saving…" : "Save & Connect"}</Text>
          </TouchableOpacity>
        </View>
        {config && (
          <TouchableOpacity style={styles.clearBtn} onPress={clearConfig} testID="sip-clear">
            <Ionicons name="trash-outline" size={16} color={colors.red} />
            <Text style={styles.clearBtnText}>Clear stored credentials</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Log viewer */}
      <View style={styles.card} testID="sip-logs-card">
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={styles.cardTitle}>SIP Log</Text>
          <Text style={{ color: colors.textMuted, fontSize: 11 }}>{logs.length} events</Text>
        </View>
        <ScrollView style={{ maxHeight: 280 }} testID="sip-log-scroll">
          {logs.length === 0 && <Text style={styles.emptyLog}>No events yet.</Text>}
          {logs.slice(0, 60).map((e, i) => (
            <View key={i} style={styles.logRow}>
              <Text style={[styles.logLevel, { color: levelColor(e.level) }]}>
                [{e.level.toUpperCase()}]
              </Text>
              <Text style={styles.logTs}>
                {new Date(e.ts).toLocaleTimeString()}
              </Text>
              <Text style={styles.logMsg}>{e.msg}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </Screen>
  );
}

function Field({ label, children }: any) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function levelColor(level: string) {
  if (level === "error") return colors.red;
  if (level === "warn") return colors.yellow;
  if (level === "debug") return colors.textDim;
  return colors.primary;
}

const styles = StyleSheet.create({
  statusCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: colors.card, borderRadius: 14, marginTop: 8, borderWidth: 1, borderColor: colors.border },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusLabel: { color: colors.textMuted, fontSize: 11 },
  statusValue: { fontSize: 16, fontWeight: "700", marginTop: 2 },
  statusMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  actionBtnPrimary: { backgroundColor: colors.primary },
  actionBtnDanger: { backgroundColor: colors.red },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  warning: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 12, backgroundColor: colors.yellowDim, borderWidth: 1, borderColor: colors.yellow + "40", marginTop: 12 },
  warningText: { color: "#fff", fontSize: 12, flex: 1 },
  card: { padding: 14, backgroundColor: colors.card, borderRadius: 14, marginTop: 14, borderWidth: 1, borderColor: colors.border },
  cardTitle: { color: "#fff", fontWeight: "700", fontSize: 15, marginBottom: 8 },
  field: { marginTop: 12 },
  fieldLabel: { color: colors.textMuted, fontSize: 12, marginBottom: 6 },
  input: { backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: "#fff", fontSize: 14 },
  hint: { color: colors.textDim, fontSize: 11, marginTop: 6 },
  demoBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.primary },
  demoBtnText: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  saveBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.primary },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  clearBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10, marginTop: 10, borderWidth: 1, borderColor: colors.red + "60" },
  clearBtnText: { color: colors.red, fontWeight: "700", fontSize: 12 },
  emptyLog: { color: colors.textMuted, fontSize: 12, padding: 12, textAlign: "center" },
  logRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  logLevel: { fontSize: 10, fontWeight: "700", width: 55 },
  logTs: { color: colors.textDim, fontSize: 10, width: 70 },
  logMsg: { color: "#fff", fontSize: 12, flex: 1 },
});
