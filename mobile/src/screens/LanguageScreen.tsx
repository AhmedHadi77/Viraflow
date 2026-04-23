import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { LanguageOption } from "../types/models";
import { palette, radii, spacing } from "../theme";

const languageOptions: Array<{ value: LanguageOption; label: string; helper: string }> = [
  { value: "en", label: "English", helper: "Global creator mode" },
  { value: "ar", label: "العربية", helper: "Arabic experience" },
  { value: "fr", label: "Francais", helper: "French creator mode" },
  { value: "es", label: "Espanol", helper: "Spanish experience" },
];

export function LanguageScreen() {
  const { setLanguage } = useAppState();
  const [selected, setSelected] = useState<LanguageOption>("en");
  const copy = getCopy(selected);

  async function handleContinue() {
    await setLanguage(selected);
    Alert.alert(copy.languageSaved);
  }

  return (
    <Screen scrollable contentContainerStyle={styles.content}>
      <LinearGradient colors={["rgba(255,122,47,0.16)", "rgba(54,224,161,0.10)", "rgba(255,255,255,0.02)"]} style={styles.hero}>
        <Text style={styles.brand}>ViraFlow</Text>
        <Text style={styles.kicker}>Creator commerce, designed to move fast.</Text>
        <SectionTitle title={copy.chooseLanguage} subtitle={copy.chooseLanguageBody} />
        <View style={styles.heroStats}>
          <ValueChip label="Reels" value="Social" />
          <ValueChip label="Store" value="Commerce" />
          <ValueChip label="AI" value="Next" />
        </View>
      </LinearGradient>

      <View style={styles.grid}>
        {languageOptions.map((option) => {
          const isSelected = option.value === selected;
          return (
            <Pressable
              key={option.value}
              onPress={() => setSelected(option.value)}
              style={[styles.card, isSelected ? styles.cardActive : null]}
            >
              <Text style={styles.cardTitle}>{option.label}</Text>
              <Text style={styles.cardSubtitle}>{option.helper}</Text>
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

const styles = StyleSheet.create({
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
    gap: spacing.md,
  },
  card: {
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: 8,
    padding: spacing.xl,
  },
  cardActive: {
    borderColor: palette.primary,
    backgroundColor: palette.cardAlt,
  },
  cardTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "900",
  },
  cardSubtitle: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
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

const stylesChip = StyleSheet.create({
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
