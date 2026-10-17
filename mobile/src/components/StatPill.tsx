import { Pressable, Text, View } from "react-native";
import { palette, radii, spacing, createThemedStyles } from "../theme";

interface StatPillProps {
  label: string;
  value: string | number;
  onPress?: () => void;
}

export function StatPill({ label, value, onPress }: StatPillProps) {
  const content = (
    <>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </>
  );
  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.container, pressed ? { opacity: 0.7 } : null]}>
        {content}
      </Pressable>
    );
  }
  return <View style={styles.container}>{content}</View>;
}

const styles = createThemedStyles({
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
