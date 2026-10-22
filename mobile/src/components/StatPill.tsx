import { Pressable, Text, View } from "react-native";
import { palette, spacing, createThemedStyles } from "../theme";

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
    flex: 1,
    gap: 2,
    paddingVertical: spacing.xs,
  },
  value: {
    color: palette.text,
    fontSize: 20,
    fontWeight: "700",
  },
  label: {
    color: palette.muted,
    fontSize: 13,
  },
});
