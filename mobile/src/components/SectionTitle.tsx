import { StyleSheet, Text, View } from "react-native";
import { palette } from "../theme";

interface SectionTitleProps {
  title: string;
  subtitle?: string;
}

export function SectionTitle({ title, subtitle }: SectionTitleProps) {
  return (
    <View style={styles.container}>
      <View style={styles.rule} />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  rule: {
    backgroundColor: palette.accent,
    borderRadius: 999,
    height: 4,
    width: 48,
  },
  title: {
    color: palette.text,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  subtitle: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 21,
    maxWidth: "92%",
  },
});
