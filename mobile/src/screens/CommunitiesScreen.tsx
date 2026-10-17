import { useEffect } from "react";
import { communityKindLabel, visibilityLabel } from "../utils/labels";
import { Image, Pressable, Text, View } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { CommunityKind } from "../types/models";
import { palette, radii, spacing, createThemedStyles } from "../theme";

const communityKinds: CommunityKind[] = ["page", "group", "channel"];

export function CommunitiesScreen({ navigation }: { navigation: any }) {
  const { language, communities, currentUser, getUserById, refreshCommunities } = useAppState();
  const copy = getCopy(language);

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
          title={copy.communitiesTitle}
          subtitle={copy.pagesGroupsChannelsBody}
        />
        <View style={styles.heroStats}>
          <HeroStat label={copy.totalSpaces} value={communities.length} />
          <HeroStat label={copy.ownedByYou} value={ownedCount} />
        </View>
        <PrimaryButton label={copy.createCommunityButton} onPress={() => navigation.navigate("CreateCommunity")} />
      </View>

      {communityKinds.map((kind) => {
        const items = communities.filter((item) => item.kind === kind);

        return (
          <View key={kind} style={styles.section}>
            <SectionTitle title={formatKindLabel(kind)} subtitle={copy.browseKindInApp} />
            {items.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>{copy.noSpacesYetTitle}</Text>
                <Text style={styles.emptyBody}>{copy.noSpacesYetBody}</Text>
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
                            <Text style={styles.kindBadgeLabel}>{communityKindLabel(community.kind, copy)}</Text>
                          </View>
                          <Text style={styles.memberCount}>{community.memberIds.length} {copy.members}</Text>
                        </View>
                        <Text style={styles.communityTitle}>{community.name}</Text>
                        <Text numberOfLines={2} style={styles.communityDescription}>
                          {community.description}
                        </Text>
                        <Text style={styles.communityMeta}>
                          {community.category} · {visibilityLabel(community.visibility, copy)}
                        </Text>
                        <Text style={styles.communityOwner}>{copy.owner}: {owner?.name ?? copy.creatorStudio}</Text>
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

const styles = createThemedStyles({
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
