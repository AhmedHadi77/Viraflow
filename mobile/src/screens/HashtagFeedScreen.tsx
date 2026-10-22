import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../components/Avatar";
import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { PostPreviewSheet } from "../components/PostPreviewSheet";
import { Screen } from "../components/Screen";
import { getCopy } from "../data/copy";
import { buildHashtagFeed, splitExploreGridItems } from "../services/explore";
import { useAppState } from "../providers/AppProvider";
import { palette, radii, spacing, createThemedStyles } from "../theme";

export function HashtagFeedScreen({
  navigation,
  route,
}: {
  navigation: any;
  route: { params: { tag: string } };
}) {
  const { language, users, posts, reels, getUserById, getPostById } = useAppState();
  const copy = getCopy(language);
  const rootNavigation = navigation.getParent?.() ?? navigation;
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const { width } = useWindowDimensions();

  const feed = useMemo(
    () =>
      buildHashtagFeed(route.params.tag, {
        posts,
        reels,
        users,
      }),
    [posts, reels, route.params.tag, users]
  );

  const columnCount = width >= 980 ? 4 : width >= 720 ? 3 : 2;
  const columns = useMemo(() => splitExploreGridItems(feed.gridItems, columnCount), [columnCount, feed.gridItems]);
  const selectedPost = selectedPostId ? getPostById(selectedPostId) ?? null : null;
  const selectedAuthor = selectedPost ? getUserById(selectedPost.userId) : undefined;

  return (
    <Screen scrollable contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>{copy.hashtagPage}</Text>
        <Text style={styles.title}>#{feed.tag}</Text>
        <Text style={styles.body}>
          {feed.posts.length} {copy.posts.toLowerCase()} - {feed.reels.length} {copy.reels.toLowerCase()} - #{feed.tag}
        </Text>

        <View style={styles.heroStats}>
          <StatCard label={copy.usersTitle} value={feed.creators.length} />
          <StatCard label={copy.posts} value={feed.posts.length} />
          <StatCard label={copy.reels} value={feed.reels.length} />
        </View>
      </View>

      {feed.relatedHashtags.length > 0 ? (
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>{copy.relatedHashtags}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
            {feed.relatedHashtags.map((entry) => (
              <Pressable
                key={entry.tag}
                onPress={() => navigation.push("HashtagFeed", { tag: entry.tag })}
                style={styles.relatedChip}
              >
                <Text style={styles.relatedChipTitle}>#{entry.tag}</Text>
                <Text style={styles.relatedChipMeta}>{entry.count} {copy.items}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {feed.creators.length > 0 ? (
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>{copy.creatorsUsingTag}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
            {feed.creators.map((creator) => (
              <Pressable
                key={creator.id}
                onPress={() => rootNavigation.navigate("PublicProfile", { userId: creator.id })}
                style={styles.creatorCard}
              >
                <Avatar name={creator.name} style={styles.creatorAvatar} uri={creator.profileImage} />
                <Text numberOfLines={1} style={styles.creatorName}>
                  {creator.name}
                </Text>
                <Text numberOfLines={1} style={styles.creatorMeta}>
                  @{creator.username}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {feed.reels.length > 0 ? (
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>{copy.topReels}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
            {feed.reels.map((reel) => {
              const author = getUserById(reel.userId);
              return (
                <Pressable
                  key={reel.id}
                  onPress={() => rootNavigation.navigate("ReelViewer", { reelId: reel.id })}
                  style={styles.reelCard}
                >
                  <Image source={{ uri: reel.thumbnailUrl }} style={styles.reelImage} />
                  <View style={styles.reelShade} />
                  <View style={styles.reelFooter}>
                    <Text numberOfLines={1} style={styles.reelMeta}>
                      @{author?.username ?? "pulseora"}
                    </Text>
                    <Text numberOfLines={2} style={styles.reelCaption}>
                      {reel.caption}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>{copy.exploreGrid}</Text>
        {feed.gridItems.length > 0 ? (
          <View style={styles.masonryRow}>
            {columns.map((column, columnIndex) => (
              <View key={`column-${columnIndex}`} style={styles.masonryColumn}>
                {column.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      if (item.kind === "reel") {
                        rootNavigation.navigate("ReelViewer", { reelId: item.entityId });
                        return;
                      }

                      setSelectedPostId(item.entityId);
                    }}
                    style={styles.tile}
                  >
                    <Image source={{ uri: item.imageUrl }} style={[styles.tileImage, { aspectRatio: item.aspectRatio }]} />
                    <View style={styles.tileShade} />
                    <View style={styles.tileFooter}>
                      <Text style={styles.tileBadge}>{item.badge}</Text>
                      <Text numberOfLines={2} style={styles.tileTitle}>
                        {item.title}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons color={palette.muted} name="pricetag-outline" size={26} />
            <Text style={styles.emptyTitle}>{copy.noContentForTagTitle}</Text>
            <Text style={styles.emptyBody}>{copy.noContentForTagBody}</Text>
          </View>
        )}
      </View>

      <PostPreviewSheet
        author={selectedAuthor}
        onAuthorPress={
          selectedAuthor
            ? () => {
                setSelectedPostId(null);
                rootNavigation.navigate("PublicProfile", { userId: selectedAuthor.id });
              }
            : undefined
        }
        onClose={() => setSelectedPostId(null)}
        post={selectedPost}
        visible={Boolean(selectedPost)}
      />
    </Screen>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = createThemedStyles({
  content: {
    gap: spacing.lg,
    paddingBottom: 120,
  },
  hero: {
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  kicker: {
    color: palette.accentSoft,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  title: {
    color: palette.text,
    fontSize: 30,
    fontWeight: "900",
  },
  body: {
    color: palette.textSoft,
    fontSize: 14,
    lineHeight: 22,
  },
  heroStats: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  statCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    padding: spacing.md,
  },
  statValue: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "900",
  },
  statLabel: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  sectionBlock: {
    gap: spacing.md,
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "900",
  },
  horizontalRow: {
    gap: spacing.md,
    paddingRight: spacing.md,
  },
  relatedChip: {
    backgroundColor: "#151922",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  relatedChipTitle: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "800",
  },
  relatedChipMeta: {
    color: palette.muted,
    fontSize: 12,
    marginTop: 4,
  },
  creatorCard: {
    alignItems: "center",
    backgroundColor: "#151922",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.md,
    width: 132,
  },
  creatorAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: spacing.sm,
  },
  creatorName: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "800",
  },
  creatorMeta: {
    color: palette.muted,
    fontSize: 12,
    marginTop: 2,
  },
  reelCard: {
    borderRadius: radii.xl,
    overflow: "hidden",
    width: 176,
  },
  reelImage: {
    width: 176,
    height: 288,
  },
  reelShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(4,8,13,0.18)",
  },
  reelFooter: {
    bottom: 0,
    left: 0,
    padding: spacing.md,
    position: "absolute",
    right: 0,
  },
  reelMeta: {
    color: palette.text,
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 4,
  },
  reelCaption: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 18,
  },
  masonryRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  masonryColumn: {
    flex: 1,
    gap: spacing.sm,
  },
  tile: {
    borderRadius: radii.xl,
    overflow: "hidden",
    position: "relative",
  },
  tileImage: {
    width: "100%",
  },
  tileShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(4,8,13,0.12)",
  },
  tileFooter: {
    bottom: 0,
    left: 0,
    padding: spacing.sm,
    position: "absolute",
    right: 0,
  },
  tileBadge: {
    color: palette.accentSoft,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  tileTitle: {
    color: palette.text,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: "#151922",
    borderColor: palette.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.xl,
  },
  emptyTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "800",
  },
  emptyBody: {
    color: palette.textSoft,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
});
