import { useEffect } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { useAppState } from "../providers/AppProvider";
import { CommunityKind } from "../types/models";
import { palette, radii, spacing } from "../theme";

const communityKinds: CommunityKind[] = ["page", "group", "channel"];

export function CommunitiesScreen({ navigation }: { navigation: any }) {
  const { communities, currentUser, getUserById, refreshCommunities } = useAppState();

  useEffect(() => {
    void refreshCommunities();
    const unsubscribe = navigation.addListener("focus", () => {
      void refreshCommunities();
    });

    return unsubscribe;
  }, [navigation]);

  const ownedCount = currentUser ? communities.filter((item) => item.ownerId === currentUser.id).length : 0;

  return (
    <Screen scrollable>
      <View style={styles.heroCard}>
        <SectionTitle
          title="Pages, groups, and channels"
          subtitle="Create branded spaces, private communities, and broadcast channels inside ViraFlow."
        />
        <View style={styles.heroStats}>
          <HeroStat label="Total spaces" value={communities.length} />
          <HeroStat label="Owned by you" value={ownedCount} />
        </View>
        <PrimaryButton label="Create page, group, or channel" onPress={() => navigation.navigate("CreateCommunity")} />
      </View>

      {communityKinds.map((kind) => {
        const items = communities.filter((item) => item.kind === kind);

        return (
          <View key={kind} style={styles.section}>
            <SectionTitle title={formatKindLabel(kind)} subtitle={`Browse ${kind}s already created in the app.`} />
            {items.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No {kind}s yet</Text>
                <Text style={styles.emptyBody}>Create the first {kind} and start building your community around a topic or brand.</Text>
              </View>
            ) : (
              <View style={styles.list}>
                {items.map((community) => {
                  const owner = getUserById(community.ownerId);

                  return (
                    <Pressable
                      key={community.id}
                      onPress={() => navigation.navigate("CommunityDetails", { communityId: community.id })}
                      style={styles.communityCard}
                    >
                      <Image source={{ uri: community.coverImage }} style={styles.coverImage} />
                      <View style={styles.communityBody}>
                        <View style={styles.row}>
                          <View style={styles.kindBadge}>
                            <Text style={styles.kindBadgeLabel}>{community.kind}</Text>
                          </View>
                          <Text style={styles.memberCount}>{community.memberIds.length} members</Text>
                        </View>
                        <Text style={styles.communityTitle}>{community.name}</Text>
                        <Text numberOfLines={2} style={styles.communityDescription}>
                          {community.description}
                        </Text>
                        <Text style={styles.communityMeta}>
                          {community.category} | {community.visibility}
                        </Text>
                        <Text style={styles.communityOwner}>Owner: {owner?.name ?? "Creator"}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </Screen>
  );
}

function HeroStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroValue}>{value}</Text>
      <Text style={styles.heroLabel}>{label}</Text>
    </View>
  );
}

function formatKindLabel(kind: CommunityKind) {
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: palette.card,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.xl,
  },
  heroStats: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  heroStat: {
    backgroundColor: palette.glass,
    borderColor: palette.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    padding: spacing.md,
  },
  heroValue: {
    color: palette.text,
    fontSize: 22,
    fontWeight: "900",
  },
  heroLabel: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  section: {
    gap: spacing.md,
  },
  list: {
    gap: spacing.md,
  },
  communityCard: {
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: "hidden",
  },
  coverImage: {
    width: "100%",
    height: 180,
  },
  communityBody: {
    gap: spacing.sm,
    padding: spacing.xl,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  kindBadge: {
    backgroundColor: "rgba(54,224,161,0.14)",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  kindBadgeLabel: {
    color: palette.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  memberCount: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  communityTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: "900",
  },
  communityDescription: {
    color: palette.textSoft,
    fontSize: 14,
    lineHeight: 22,
  },
  communityMeta: {
    color: palette.accentSoft,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  communityOwner: {
    color: palette.muted,
    fontSize: 13,
  },
  emptyCard: {
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  emptyTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "900",
  },
  emptyBody: {
    color: palette.textSoft,
    fontSize: 14,
    lineHeight: 22,
  },
});
