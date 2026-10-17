import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { Screen } from "../components/Screen";
import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { palette, radii, spacing, createThemedStyles } from "../theme";

export function SplashScreen() {
  const { language, startupDiagnostics } = useAppState();
  const copy = getCopy(language);

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.top}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>P</Text>
        </View>
        <View style={styles.copyWrap}>
          <Text style={styles.title}>{copy.appName}</Text>
          <Text style={styles.subtitle}>{copy.tagline}</Text>
        </View>
        <ActivityIndicator color={palette.primary} size="large" style={styles.loader} />
      </View>

      {__DEV__ ? (
        <View style={styles.diagnosticsContainer}>
          <Text style={styles.diagnosticsHeader}>{copy.startupStatus}</Text>
          <ScrollView contentContainerStyle={styles.diagnosticsScroll} showsVerticalScrollIndicator={false}>
            {startupDiagnostics.map((line, index) => (
              <Text key={index} style={styles.diagnosticLine}>
                {line}
              </Text>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = createThemedStyles({
  content: {
    alignItems: "center",
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: spacing.xxl,
  },
  top: {
    alignItems: "center",
    gap: spacing.xl,
    marginTop: spacing.xxl,
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
  loader: {
    marginTop: spacing.md,
  },
  diagnosticsContainer: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderColor: palette.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    height: 200,
    marginHorizontal: spacing.xl,
    padding: spacing.md,
    width: "88%",
  },
  diagnosticsHeader: {
    color: palette.accentSoft,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
  },
  diagnosticsScroll: {
    gap: 4,
  },
  diagnosticLine: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
  },
});
