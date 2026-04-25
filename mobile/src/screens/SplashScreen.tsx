import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Screen } from "../components/Screen";
import { palette, spacing } from "../theme";

export function SplashScreen() {
  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>P</Text>
      </View>
      <View style={styles.copyWrap}>
        <Text style={styles.title}>Pulseora</Text>
        <Text style={styles.subtitle}>Create. Go viral. Make money.</Text>
      </View>
      <ActivityIndicator color={palette.primary} size="large" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    gap: spacing.xl,
  },
  badge: {
    alignItems: "center",
    backgroundColor: palette.primary,
    borderRadius: 36,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  badgeText: {
    color: "#071118",
    fontSize: 28,
    fontWeight: "800",
  },
  copyWrap: {
    alignItems: "center",
    gap: 8,
  },
  title: {
    color: palette.text,
    fontSize: 34,
    fontWeight: "900",
  },
  subtitle: {
    color: palette.muted,
    fontSize: 16,
  },
});
