import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { SafeLinearGradient } from "../components/SafeLinearGradient";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { getCopy, supportedLanguages } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { isLanguageOption, LanguageOption } from "../types/models";
import { palette, radii, spacing, createThemedStyles } from "../theme";

export function LanguageScreen() {
  const { setLanguage } = useAppState();
  const [selected, setSelected] = useState<LanguageOption>(() => {
    // Start on the phone's language when we ship it.
    try {
      const deviceLanguage = Intl.DateTimeFormat().resolvedOptions().locale.split("-")[0];
      return isLanguageOption(deviceLanguage) ? deviceLanguage : "en";
    } catch {
      return "en";
    }
  });
  const copy = getCopy(selected);

  async function handleContinue() {
    await setLanguage(selected);
    Alert.alert(copy.languageSaved);
  }

  return (
    <Screen scrollable contentContainerStyle={styles.content}>
      <SafeLinearGradient colors={["rgba(255,122,47,0.16)", "rgba(54,224,161,0.10)", "rgba(255,255,255,0.02)"]} style={styles.hero}>
        <Text style={styles.brand}>{copy.appName}</Text>
        <Text style={styles.kicker}>{copy.languageKicker}</Text>
        <SectionTitle title={copy.chooseLanguage} subtitle={copy.chooseLanguageBody} />
        <View style={styles.heroStats}>
          <ValueChip label={copy.languageChipReelsLabel} value={copy.languageChipReelsValue} />
          <ValueChip label={copy.languageChipStoreLabel} value={copy.languageChipStoreValue} />
          <ValueChip label={copy.languageChipAiLabel} value={copy.languageChipAiValue} />
        </View>
      </SafeLinearGradient>

      <View style={styles.grid}>
        {supportedLanguages.map((option) => {
          const isSelected = option.code === selected;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={option.code}
              onPress={() => setSelected(option.code)}
              style={[styles.card, isSelected ? styles.cardActive : null]}
            >
              <Text style={styles.cardTitle}>{option.nativeName}</Text>
              <Text style={styles.cardSubtitle}>{option.englishName}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Text style={styles.tagline}>{copy.tagline}</Text>
        <PrimaryButton label={copy.continue} onPress={handleContinue} />
      </View>
    </Screen>
  );
}

const styles = createThemedStyles({
  content: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingTop: spacing.xxl,
  },
  hero: {
    gap: spacing.lg,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.xl,
  },
  brand: {
    color: palette.text,
    fontSize: 40,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  kicker: {
    color: palette.accentSoft,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  heroStats: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginVertical: spacing.lg,
  },
  card: {
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    gap: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  cardActive: {
    borderColor: palette.primary,
    backgroundColor: palette.cardAlt,
  },
  cardTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "900",
  },
  cardSubtitle: {
    color: palette.muted,
    fontSize: 12,
  },
  footer: {
    gap: spacing.md,
  },
  tagline: {
    color: palette.textSoft,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
});

function ValueChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={stylesChip.container}>
      <Text style={stylesChip.value}>{value}</Text>
      <Text style={stylesChip.label}>{label}</Text>
    </View>
  );
}

const stylesChip = createThemedStyles({
  container: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: radii.lg,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    padding: spacing.md,
  },
  value: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "800",
  },
  label: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
  },
});
