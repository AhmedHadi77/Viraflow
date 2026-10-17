import { LinearGradient } from "expo-linear-gradient";
import { formatDateTime } from "../utils/timeFormatting";
import { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { PlanType } from "../types/models";
import { palette, radii, spacing, createThemedStyles } from "../theme";

export function SubscriptionScreen() {
  const { activeSubscription, language, plans, subscribeToPlan } = useAppState();
  const copy = getCopy(language);
  const [selected, setSelected] = useState<PlanType>(activeSubscription?.planType !== "free" ? activeSubscription?.planType ?? "weekly" : "weekly");

  useEffect(() => {
    if (activeSubscription?.planType && activeSubscription.planType !== "free") {
      setSelected(activeSubscription.planType);
    }
  }, [activeSubscription?.planType]);

  async function handleUpgrade() {
    const result = await subscribeToPlan(selected);

    if (!result.ok) {
      Alert.alert(copy.checkoutUnavailableTitle, result.message ?? copy.checkoutUnavailableTitle);
      return;
    }

    Alert.alert(
      result.subscription ? copy.premiumActivatedTitle : copy.checkoutOpenedTitle,
      result.message ??
        (result.subscription
          ? `${selected} ${copy.subscription.toLowerCase()} ${copy.live.toLowerCase()}.`
          : `${copy.checkoutOpenedTitle} - ${selected}`)
    );
  }

  return (
    <Screen scrollable>
      <LinearGradient colors={["rgba(255,122,47,0.18)", "rgba(54,224,161,0.10)", "rgba(255,255,255,0.02)"]} style={styles.hero}>
        <SectionTitle title={copy.premiumTitle} subtitle={copy.premiumBody} />
      </LinearGradient>
      <View style={styles.list}>
        {plans.map((plan) => {
          const active = plan.id === selected;
          return (
            <Pressable key={plan.id} onPress={() => setSelected(plan.id)} style={[styles.card, active ? styles.cardActive : null]}>
              <Text style={styles.planTitle}>{plan.title}</Text>
              <Text style={styles.planPrice}>
                {plan.priceLabel} <Text style={styles.planCadence}>{plan.cadence}</Text>
              </Text>
              <Text style={styles.planDescription}>{plan.description}</Text>
              <Text style={styles.benefitsTitle}>{copy.planBenefits}</Text>
              <View style={styles.benefitsList}>
                {plan.benefits.map((benefit) => (
                  <Text key={benefit} style={styles.benefitItem}>
                    - {benefit}
                  </Text>
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>{copy.currentSubscription}</Text>
        <Text style={styles.statusTitle}>
          {activeSubscription?.status === "active" ? `${activeSubscription.planType} ${copy.live.toLowerCase()}` : copy.freePlan}
        </Text>
        <Text style={styles.statusBody}>
          {activeSubscription?.status === "active" && activeSubscription.endsAt
            ? `${copy.premiumActiveUntil} ${formatDateTime(activeSubscription.endsAt)}.`
            : copy.premiumUpgradeBody}
        </Text>
      </View>
      <PrimaryButton
        label={activeSubscription?.status === "active" && activeSubscription.planType === selected ? copy.currentPlanActive : `${copy.activatePlan} ${selected}`}
        onPress={() => {
          void handleUpgrade();
        }}
        disabled={activeSubscription?.status === "active" && activeSubscription.planType === selected}
      />
    </Screen>
  );
}

const styles = createThemedStyles({
  hero: {
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.xl,
  },
  list: {
    gap: spacing.lg,
  },
  card: {
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  cardActive: {
    borderColor: palette.primary,
    backgroundColor: palette.cardAlt,
  },
  planTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: "900",
  },
  planPrice: {
    color: palette.accentSoft,
    fontSize: 30,
    fontWeight: "900",
  },
  planCadence: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: "600",
  },
  planDescription: {
    color: palette.textSoft,
    fontSize: 15,
    lineHeight: 22,
  },
  benefitsTitle: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "800",
  },
  benefitsList: {
    gap: 8,
  },
  benefitItem: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  exportCard: {
    backgroundColor: palette.cardAlt,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  statusCard: {
    backgroundColor: "rgba(54,224,161,0.08)",
    borderColor: "rgba(54,224,161,0.22)",
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  statusLabel: {
    color: palette.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  statusTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: "900",
  },
  statusBody: {
    color: palette.textSoft,
    fontSize: 14,
    lineHeight: 22,
  },
  exportTitle: {
    color: palette.accentSoft,
    fontSize: 18,
    fontWeight: "900",
  },
  exportBody: {
    color: palette.textSoft,
    fontSize: 14,
    lineHeight: 22,
  },
});
