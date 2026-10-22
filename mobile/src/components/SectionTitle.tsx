import { Text, View } from "react-native";
import { palette, createThemedStyles } from "../theme";

interface SectionTitleProps {
  title: string;
  subtitle?: string;
}

export function SectionTitle({ title, subtitle }: SectionTitleProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = createThemedStyles({
  container: {
    gap: 6,
  },
  title: {
    color: palette.text,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  subtitle: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 21,
    maxWidth: "92%",
  },
});
