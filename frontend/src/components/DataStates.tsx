import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme";

/**
 * The three honest, shared presentational states used across every data screen.
 * They never fabricate a value: an error says "unavailable", an empty result says
 * so plainly. Keeping them in one place makes "no mock data" auditable.
 */

export function LoadingBlock({ label }: { label?: string }) {
  return (
    <View style={styles.center} testID="state-loading">
      <ActivityIndicator color={colors.primary} />
      {label ? <Text style={styles.sub}>{label}</Text> : null}
    </View>
  );
}

export function ErrorBlock({ message, onRetry }: { message?: string | null; onRetry?: () => void }) {
  return (
    <View style={styles.center} testID="state-error">
      <View style={[styles.iconWrap, { backgroundColor: colors.redDim }]}>
        <Ionicons name="cloud-offline-outline" size={26} color={colors.red} />
      </View>
      <Text style={styles.title}>Data unavailable</Text>
      <Text style={styles.sub}>{message || "We couldn't reach the server. Please try again."}</Text>
      {onRetry ? (
        <TouchableOpacity style={styles.retry} onPress={onRetry} testID="state-error-retry">
          <Ionicons name="refresh" size={16} color="#fff" />
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function EmptyBlock({
  icon = "file-tray-outline",
  title,
  subtitle,
}: {
  icon?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.center} testID="state-empty">
      <View style={[styles.iconWrap, { backgroundColor: colors.card }]}>
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={26} color={colors.textMuted} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center", paddingVertical: 48, paddingHorizontal: 24, gap: 8 },
  iconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title: { color: "#fff", fontSize: 16, fontWeight: "700" },
  sub: { color: colors.textMuted, fontSize: 13, textAlign: "center", lineHeight: 18 },
  retry: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.primary },
  retryText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
