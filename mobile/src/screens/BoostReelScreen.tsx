import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { useAppState } from "../providers/AppProvider";
import { ReelBoostPlanId } from "../types/models";
import { palette, radii, spacing } from "../theme";

export function BoostReelScreen({ navigation, route }: { navigation: any; route: { params: { reelId: string } } }) {
  const { currentUser, reels, boostPlans, getBoostForReel, boostReel } = useAppState();
  const reel = reels.find((item) => item.id === route.params.reelId);
  const [selectedPlanId, setSelectedPlanId] = useState<ReelBoostPlanId>(boostPlans[1]?.id ?? boostPlans[0]?.id ?? "starter");

  const selectedPlan = useMemo(
    () => boostPlans.find((item) => item.id === selectedPlanId) ?? boostPlans[0],
    [boostPlans, selectedPlanId]
  );

  if (!reel || !selectedPlan) {
    return (
      <Screen contentContainerStyle={styles.emptyWrap}>
        <Text style={styles.emptyText}>Reel not found.</Text>
      </Screen>
    );
  }

  const activeReel = reel;
  const boost = getBoostForReel(activeReel.id);
  const isOwnReel = activeReel.userId === currentUser?.id;

  async function handleBoostCheckout() {
    if (!isOwnReel) {
      Alert.alert("Only for your reels", "You can only boost reels that belong to your own profile.");
      return;
    }

    const result = await boostReel({ reelId: activeReel.id, planId: selectedPlan.id });

    if (!result.ok) {
      Alert.alert("Boost unavailable", result.message ?? "This reel could not be boosted right now.");
      return;
    }

    Alert.alert(
      result.boost ? "Boost is live" : "Checkout opened",
      result.message ??
        (result.boost
          ? `${selectedPlan.title} is now running. Your reel is getting more reach and more views.`
          : `${selectedPlan.title} checkout opened. This boost will go live after payment is confirmed.`)
    );
    navigation.replace("ReelViewer", { reelId: activeReel.id });
  }

  return (
    <Screen scrollable>
      <LinearGradient colors={["rgba(255,122,47,0.18)", "rgba(54,224,161,0.12)", "rgba(255,255,255,0.02)"]} style={styles.hero}>
        <Text style={styles.kicker}>Pulseora Ads</Text>
        <SectionTitle
          title="Boost System"
          subtitle="Put paid reach behind your best reel, buy more views, and turn strong content into a growth engine."
        />
      </LinearGradient>

      <View style={styles.previewCard}>
        <Image resizeMode="cover" source={{ uri: activeReel.thumbnailUrl }} style={styles.previewImage} />
        <View style={styles.previewBody}>
          <Text style={styles.previewTitle}>Reel selected for boost</Text>
          <Text style={styles.previewCaption}>{activeReel.caption}</Text>
          <View style={styles.metricRow}>
            <Metric label="Views" value={formatCompact(activeReel.viewCount)} />
            <Metric label="Reach" value={formatCompact(activeReel.reachCount)} />
          </View>
        </View>
      </View>

      {boost?.status === "active" ? (
        <View style={styles.activeCard}>
          <Text style={styles.activeLabel}>Boost already live</Text>
          <Text style={styles.activeTitle}>{boost.planTitle}</Text>
          <Text style={styles.body}>This reel already has an active ad push running, so the app is protecting you from duplicate spend.</Text>
          <Text style={styles.note}>Campaign ends: {new Date(boost.endsAt).toLocaleString()}</Text>
          <Text style={styles.note}>Audience: {boost.targetAudience}</Text>
          <PrimaryButton label="Back to reel" onPress={() => navigation.replace("ReelViewer", { reelId: activeReel.id })} variant="ghost" />
        </View>
      ) : null}

      <View style={styles.panel}>
        <SectionTitle title="Choose a boost package" subtitle="These packages are ready for real Stripe checkout so paid reach can go live after verified payment." />
        <View style={styles.planList}>
          {boostPlans.map((plan) => (
            <Pressable
              key={plan.id}
              onPress={() => setSelectedPlanId(plan.id)}
              style={[styles.planCard, selectedPlanId === plan.id ? styles.planCardActive : null]}
            >
              <View style={styles.planTop}>
                <View>
                  <Text style={styles.planBadge}>{plan.badge}</Text>
                  <Text style={styles.planTitle}>{plan.title}</Text>
                </View>
                <Text style={styles.planPrice}>{plan.priceLabel}</Text>
              </View>
              <Text style={styles.body}>{plan.description}</Text>
              <View style={styles.metricRow}>
                <Metric label="Extra views" value={`+${formatCompact(plan.estimatedViews)}`} />
                <Metric label="Extra reach" value={`+${formatCompact(plan.estimatedReach)}`} />
              </View>
              <Text style={styles.note}>Run time: {plan.durationDays} days</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.checkoutCard}>
        <Text style={styles.checkoutTitle}>Secure checkout</Text>
        <Text style={styles.body}>Selected package: {selectedPlan.title}</Text>
        <Text style={styles.body}>Spend: {selectedPlan.priceLabel}</Text>
        <Text style={styles.body}>You get: more reach and more views on this reel</Text>
        <Text style={styles.note}>Payment method: hosted Stripe checkout</Text>
        <PrimaryButton
          label={`Boost my reel for ${selectedPlan.priceLabel}`}
          onPress={() => {
            void handleBoostCheckout();
          }}
          disabled={!isOwnReel || boost?.status === "active"}
        />
      </View>
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function formatCompact(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  return String(value);
}

const styles = StyleSheet.create({
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: palette.muted,
    fontSize: 15,
  },
  hero: {
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
  },
  kicker: {
    color: palette.accentSoft,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  previewCard: {
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: "hidden",
  },
  previewImage: {
    height: 220,
    width: "100%",
  },
  previewBody: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  previewTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "900",
  },
  previewCaption: {
    color: palette.textSoft,
    fontSize: 15,
    lineHeight: 22,
  },
  panel: {
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.xl,
  },
  planList: {
    gap: spacing.md,
  },
  planCard: {
    backgroundColor: palette.cardAlt,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  planCardActive: {
    borderColor: palette.primary,
    backgroundColor: "rgba(54,224,161,0.09)",
  },
  planTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  planBadge: {
    color: palette.accentSoft,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  planTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: "900",
  },
  planPrice: {
    color: palette.primary,
    fontSize: 28,
    fontWeight: "900",
  },
  metricRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  metric: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: palette.borderStrong,
    borderRadius: radii.lg,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    padding: spacing.md,
  },
  metricValue: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "900",
  },
  metricLabel: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  activeCard: {
    backgroundColor: "rgba(54,224,161,0.10)",
    borderColor: "rgba(54,224,161,0.24)",
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
  },
  activeLabel: {
    color: palette.primary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  activeTitle: {
    color: palette.text,
    fontSize: 22,
    fontWeight: "900",
  },
  checkoutCard: {
    backgroundColor: palette.cardAlt,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
  },
  checkoutTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: "900",
  },
  body: {
    color: palette.textSoft,
    fontSize: 14,
    lineHeight: 22,
  },
  note: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
  },
});
