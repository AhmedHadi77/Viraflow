import { StyleSheet, Text, View } from "react-native";
import { palette, radii, spacing } from "../theme";

interface StatPillProps {
  label: string;
  value: string | number;
}

export function StatPill({ label, value }: StatPillProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.borderStrong,
    borderRadius: radii.lg,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    paddingVertical: spacing.md + 2,
  },
  value: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "900",
  },
  label: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
