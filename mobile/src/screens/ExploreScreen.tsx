import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../components/Avatar";
import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { PostPreviewSheet } from "../components/PostPreviewSheet";
import { Screen } from "../components/Screen";
import { getCopy } from "../data/copy";
import {
  buildPopularReels,
  buildRecentPosts,
  buildSuggestedUsers,
  buildTrendingExploreGrid,
  searchExploreEntities,
  splitExploreGridItems,
} from "../services/explore";
import { useAppState } from "../providers/AppProvider";
import { palette, radii, spacing, createThemedStyles } from "../theme";

export function ExploreScreen({
  navigation,
  route,
}: {
  navigation: any;
  route?: { params?: { initialQuery?: string } };
}) {
  const { language, region, currentUser, users, posts, reels, getUserById, getPostById } = useAppState();
  const copy = getCopy(language);
  const rootNavigation = navigation.getParent?.() ?? navigation;
  const [query, setQuery] = useState(route?.params?.initialQuery ?? "");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const { width } = useWindowDimensions();

  useEffect(() => {
    if (route?.params?.initialQuery && route.params.initialQuery !== query) {
      setQuery(route.params.initialQuery);
    }
  }, [query, route?.params?.initialQuery]);

  const suggestedUsers = useMemo(() => buildSuggestedUsers(users, currentUser, 8, region), [currentUser, users, region]);
  const localCreatorIds = useMemo(
    () => new Set(users.filter((user) => user.region === region).map((user) => user.id)),
    [region, users]
  );
  const popularReels = useMemo(() => buildPopularReels(reels, localCreatorIds), [reels, localCreatorIds]);
  const recentPosts = useMemo(() => buildRecentPosts(posts), [posts]);
  const trendingGrid = useMemo(() => buildTrendingExploreGrid(posts, reels, users), [posts, reels, users]);
  const searchResults = useMemo(
    () =>
      searchExploreEntities(
        {
          currentUser,
          users,
          posts,
          reels,
        },
        query
      ),
    [currentUser, posts, query, reels, users]
  );
  const columnCount = width >= 980 ? 4 : width >= 720 ? 3 : 2;
  const gridColumns = useMemo(() => splitExploreGridItems(trendingGrid, columnCount), [columnCount, trendingGrid]);
  const selectedPost = selectedPostId ? getPostById(selectedPostId) ?? null : null;
  const selectedPostAuthor = selectedPost ? getUserById(selectedPost.userId) : undefined;
  const hasQuery = query.trim().length > 0;

  return (
    <Screen scrollable contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>{copy.exploreTitle}</Text>
        <Text style={styles.title}>{copy.exploreHeroTitle}</Text>
        <Text style={styles.body}>{copy.exploreHeroBody}</Text>

        <View style={styles.searchShell}>
          <Ionicons color={palette.muted} name="search" size={18} />
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setQuery}
            placeholder={copy.exploreSearchPlaceholder}
            placeholderTextColor={palette.muted}
            style={styles.searchInput}
            value={query}
          />
          {query.trim() ? (
            <Pressable onPress={() => setQuery("")} style={styles.clearButton}>
              <Ionicons color={palette.text} name="close" size={16} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {hasQuery ? (
        <View style={styles.resultsStack}>
          <SectionHeader subtitle={copy.usersSubtitle} title={copy.usersTitle} />
          {searchResults.users.length > 0 ? (
            <View style={styles.resultList}>
              {searchResults.users.map((user) => (
                <Pressable
                  key={user.id}
                  onPress={() => rootNavigation.navigate("PublicProfile", { userId: user.id })}
                  style={styles.userResultCard}
                >
                  <Avatar name={user.name} style={styles.userAvatar} uri={user.profileImage} />
                  <View style={styles.userCopy}>
                    <Text style={styles.userName}>{user.name}</Text>
                    <Text style={styles.userMeta}>@{user.username}</Text>
                    <Text numberOfLines={1} style={styles.userHeadline}>
                      {user.headline || copy.creatorStudio}
                    </Text>
                  </View>
                  <View style={styles.userStatsPill}>
                    <Text style={styles.userStatsLabel}>{user.followers.length} {copy.followers.toLowerCase()}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <EmptyBlock body={copy.noUsersMatchedExploreBody} title={copy.noUsersMatchedShort} />
          )}

          <SectionHeader subtitle={copy.hashtagsSubtitle} title={copy.hashtagsTitle} />
          {searchResults.hashtags.length > 0 ? (
            <View style={styles.hashtagWrap}>
              {searchResults.hashtags.map((entry) => (
                <Pressable
                  key={entry.tag}
                  onPress={() => rootNavigation.navigate("HashtagFeed", { tag: entry.tag })}
                  style={styles.hashtagChip}
                >
                  <Text style={styles.hashtagChipTitle}>#{entry.tag}</Text>
                    <Text style={styles.hashtagChipMeta}>{entry.count} {copy.posts.toLowerCase()} + {copy.reels.toLowerCase()}</Text>
                  </Pressable>
                ))}
              </View>
          ) : (
            <EmptyBlock body={copy.noHashtagsMatchedBody} title={copy.noHashtagsMatchedTitle} />
          )}

          <SectionHeader subtitle={copy.postsSubtitle} title={copy.postsTitle} />
          {searchResults.posts.length > 0 ? (
            <View style={styles.resultList}>
              {searchResults.posts.map((entry) => (
                <Pressable
                  key={entry.post.id}
                  onPress={() => setSelectedPostId(entry.post.id)}
                  style={styles.postResultCard}
                >
                  <Image source={{ uri: entry.imageUrl }} style={styles.postResultImage} />
                  <View style={styles.postResultCopy}>
                    <Text style={styles.postResultBadge}>{entry.badge}</Text>
                    <Text numberOfLines={1} style={styles.postResultAuthor}>
                      @{entry.author?.username ?? "pulseora.creator"}
                    </Text>
                    <Text numberOfLines={2} style={styles.postResultCaption}>
                      {entry.post.caption}
                    </Text>
                    {entry.post.hashtags.length > 0 ? (
                      <Text numberOfLines={1} style={styles.postResultHashtags}>
                        {entry.post.hashtags.map((tag) => `#${tag}`).join(" ")}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <EmptyBlock body={copy.noPostsMatchedBody} title={copy.noPostsMatchedTitle} />
          )}
        </View>
      ) : (
        <>
          <View style={styles.sectionBlock}>
            <SectionHeader subtitle={copy.suggestedUsersBody} title={copy.suggestedUsersTitle} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
              {suggestedUsers.map((user) => (
                <Pressable
                  key={user.id}
                  onPress={() => rootNavigation.navigate("PublicProfile", { userId: user.id })}
                  style={styles.suggestedCard}
                >
                  <Avatar name={user.name} style={styles.suggestedAvatar} uri={user.profileImage} />
                  <Text numberOfLines={1} style={styles.suggestedName}>
                    {user.name}
                  </Text>
                  <Text numberOfLines={1} style={styles.suggestedMeta}>
                    @{user.username}
                  </Text>
                  <Text style={styles.suggestedFollowers}>{user.followers.length} {copy.followers.toLowerCase()}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={styles.sectionBlock}>
            <SectionHeader subtitle={copy.popularReelsBody} title={copy.popularReelsTitle} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
              {popularReels.map((reel) => {
                const author = getUserById(reel.userId);
                return (
                  <Pressable
                    key={reel.id}
                    onPress={() => rootNavigation.navigate("ReelViewer", { reelId: reel.id })}
                    style={styles.reelCard}
                  >
                    <Image source={{ uri: reel.thumbnailUrl }} style={styles.reelCardImage} />
                    <View style={styles.reelOverlay} />
                    <View style={styles.reelCardFooter}>
                      <Text numberOfLines={1} style={styles.reelCardMeta}>
                        @{author?.username ?? "pulseora"}
                      </Text>
                      <Text numberOfLines={2} style={styles.reelCardTitle}>
                        {reel.caption}
                      </Text>
                      <Text style={styles.reelCardStats}>{reel.viewCount} {copy.views}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.sectionBlock}>
            <SectionHeader subtitle={copy.recentPostsBody} title={copy.recentPostsTitle} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
              {recentPosts.map((post) => {
                const author = getUserById(post.userId);
                const imageUrl = post.media[0]?.thumbnailUrl || post.media[0]?.url || author?.profileImage;
                return (
                  <Pressable key={post.id} onPress={() => setSelectedPostId(post.id)} style={styles.recentPostCard}>
                    {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.recentPostImage} /> : null}
                    <View style={styles.recentPostBody}>
                      <Text numberOfLines={1} style={styles.recentPostMeta}>
                        @{author?.username ?? "pulseora.creator"}
                      </Text>
                      <Text numberOfLines={2} style={styles.recentPostTitle}>
                        {post.caption}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.sectionBlock}>
            <SectionHeader subtitle={copy.trendingGridBody} title={copy.trendingGridTitle} />
            <View style={styles.masonryRow}>
              {gridColumns.map((column, columnIndex) => (
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
                      style={styles.masonryTile}
                    >
                      <Image source={{ uri: item.imageUrl }} style={[styles.masonryImage, { aspectRatio: item.aspectRatio }]} />
                      <View style={styles.tileShade} />
                      <View style={styles.tileBadge}>
                        <Text style={styles.tileBadgeLabel}>{item.badge}</Text>
                      </View>
                      <View style={styles.tileFooter}>
                        <Text numberOfLines={1} style={styles.tileTitle}>
                          {item.title}
                        </Text>
                        <Text numberOfLines={2} style={styles.tileSubtitle}>
                          {item.subtitle}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              ))}
            </View>
          </View>
        </>
      )}

      <PostPreviewSheet
        author={selectedPostAuthor}
        onAuthorPress={
          selectedPostAuthor
            ? () => {
                setSelectedPostId(null);
                rootNavigation.navigate("PublicProfile", { userId: selectedPostAuthor.id });
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

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  );
}

function EmptyBlock({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

const styles = createThemedStyles({
  content: {
    gap: spacing.lg,
    paddingBottom: 120,
  },
  hero: {
    backgroundColor: "#081018",
    borderColor: "rgba(255,255,255,0.08)",
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
  title: {
    color: palette.text,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  body: {
    color: palette.textSoft,
    fontSize: 14,
    lineHeight: 22,
  },
  searchShell: {
    alignItems: "center",
    backgroundColor: "#0f1a24",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    color: palette.text,
    flex: 1,
    fontSize: 15,
    paddingVertical: 4,
  },
  clearButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.pill,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  resultsStack: {
    gap: spacing.lg,
  },
  sectionBlock: {
    gap: spacing.md,
  },
  sectionHeader: {
    gap: 6,
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "900",
  },
  sectionSubtitle: {
    color: palette.textSoft,
    fontSize: 13,
    lineHeight: 20,
  },
  resultList: {
    gap: spacing.sm,
  },
  userResultCard: {
    alignItems: "center",
    backgroundColor: "#0c151d",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.xl,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  userAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  userCopy: {
    flex: 1,
    gap: 2,
  },
  userName: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "800",
  },
  userMeta: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  userHeadline: {
    color: palette.textSoft,
    fontSize: 12,
  },
  userStatsPill: {
    backgroundColor: "rgba(54,224,161,0.12)",
    borderColor: "rgba(54,224,161,0.22)",
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  userStatsLabel: {
    color: palette.text,
    fontSize: 11,
    fontWeight: "800",
  },
  hashtagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  hashtagChip: {
    backgroundColor: "#0c151d",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.lg,
    borderWidth: 1,
    minWidth: "46%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  hashtagChipTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "800",
  },
  hashtagChipMeta: {
    color: palette.muted,
    fontSize: 12,
    marginTop: 4,
  },
  postResultCard: {
    alignItems: "center",
    backgroundColor: "#0c151d",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.xl,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    overflow: "hidden",
    paddingRight: spacing.md,
  },
  postResultImage: {
    width: 108,
    height: 108,
  },
  postResultCopy: {
    flex: 1,
    gap: 4,
    paddingVertical: spacing.md,
  },
  postResultBadge: {
    color: palette.accentSoft,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  postResultAuthor: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "800",
  },
  postResultCaption: {
    color: palette.textSoft,
    fontSize: 13,
    lineHeight: 19,
  },
  postResultHashtags: {
    color: palette.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  emptyCard: {
    backgroundColor: "#0b1219",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.xl,
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
  },
  horizontalRow: {
    gap: spacing.md,
    paddingRight: spacing.md,
  },
  suggestedCard: {
    alignItems: "center",
    backgroundColor: "#0c151d",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.md,
    width: 132,
  },
  suggestedAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: spacing.sm,
  },
  suggestedName: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "800",
  },
  suggestedMeta: {
    color: palette.muted,
    fontSize: 12,
    marginTop: 2,
  },
  suggestedFollowers: {
    color: palette.accentSoft,
    fontSize: 11,
    fontWeight: "800",
    marginTop: spacing.xs,
  },
  reelCard: {
    backgroundColor: "#09131b",
    borderRadius: radii.xl,
    overflow: "hidden",
    width: 182,
  },
  reelCardImage: {
    width: 182,
    height: 290,
  },
  reelOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2,6,10,0.16)",
  },
  reelCardFooter: {
    bottom: 0,
    left: 0,
    padding: spacing.md,
    position: "absolute",
    right: 0,
  },
  reelCardMeta: {
    color: palette.text,
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 4,
  },
  reelCardTitle: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 18,
  },
  reelCardStats: {
    color: palette.accentSoft,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 6,
  },
  recentPostCard: {
    backgroundColor: "#0b1219",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: "hidden",
    width: 208,
  },
  recentPostImage: {
    width: 208,
    height: 180,
  },
  recentPostBody: {
    gap: 4,
    padding: spacing.md,
  },
  recentPostMeta: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  recentPostTitle: {
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
  masonryTile: {
    borderRadius: radii.xl,
    overflow: "hidden",
    position: "relative",
  },
  masonryImage: {
    width: "100%",
  },
  tileShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(4,8,13,0.12)",
  },
  tileBadge: {
    backgroundColor: "rgba(4,8,13,0.72)",
    borderRadius: radii.pill,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    position: "absolute",
    top: 10,
  },
  tileBadgeLabel: {
    color: palette.text,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  tileFooter: {
    bottom: 0,
    left: 0,
    padding: spacing.sm,
    position: "absolute",
    right: 0,
  },
  tileTitle: {
    color: palette.text,
    fontSize: 12,
    fontWeight: "800",
  },
  tileSubtitle: {
    color: "rgba(255,255,255,0.86)",
    fontSize: 11,
    marginTop: 3,
  },
});
