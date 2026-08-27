import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/AuthContext";
import { useTheme } from "@/src/theme/ThemeContext";

export default function Index() {
  const { colors } = useTheme();
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) router.replace("/(tabs)/dashboard");
    else router.replace("/login");
  }, [loading, user]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}
