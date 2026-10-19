import { Ionicons } from "@expo/vector-icons";
import { openReportSheet } from "../components/ReportSheet";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useIsFocused } from "@react-navigation/native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, Pressable, Text, useWindowDimensions, View, ViewToken } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { getCopy } from "../data/copy";
import { ReelCard } from "../components/ReelCard";
import { ReelCommentsSheet } from "../components/ReelCommentsSheet";
import { SafeLinearGradient } from "../components/SafeLinearGradient";
import { useAppState } from "../providers/AppProvider";
import { shareReelToApps } from "../services/reelSharing";
import { darkPalette as palette, radii, shadows, spacing, createDarkStyles } from "../theme";
import { isReelBoostActive, Reel } from "../types/models";
import { GradientIconFill } from "../components/GradientIcon";

type ReelFeedMode = "forYou" | "trending";

export function ReelsScreen({ navigation }: { navigation: any }) {
  const {
    currentUser,
    language,
    reels,
    comments,
    getUserById,
    getCommentsForReel,
    getBoostForReel,
    isReelSaved,
    toggleSaveReel,
    toggleLike,
    repostReel,
    toggleFollow,
    addComment,
    deleteReel,
    recordReelView,
    region,
    users,
  } = useAppState();
  const copy = getCopy(language);
  const rootNavigation = navigation.getParent?.() ?? navigation;
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const tabBarHeight = useBottomTabBarHeight();
  const isFocused = useIsFocused();
  const flatListRef = useRef<FlatList<Reel>>(null);
  const [feedMode, setFeedMode] = useState<ReelFeedMode>("forYou");
  const [activeReelId, setActiveReelId] = useState<string | undefined>(reels[0]?.id);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [muted, setMuted] = useState(false);
  const commentCounts = useMemo(() => {
    const nextMap = new Map<string, number>();
    comments.forEach((comment) => {
      nextMap.set(comment.reelId, (nextMap.get(comment.reelId) ?? 0) + 1);
    });
    return nextMap;
  }, [comments]);
  // Creators in the viewer's region get a ranking lift so the feed and trends feel local.
  const localCreatorIds = useMemo(
    () => new Set(users.filter((user) => user.region && user.region === region).map((user) => user.id)),
    [region, users]
  );
  const reelFeed = useMemo(
    () =>
      buildReelFeed({
        reels,
        commentCounts,
        currentUserId: currentUser?.id,
        followingIds: currentUser?.following ?? [],
        mode: feedMode,
        localCreatorIds,
      }),
    [commentCounts, currentUser?.following, currentUser?.id, feedMode, reels, localCreatorIds]
  );
  const activeReel = useMemo(() => reelFeed.find((item) => item.id === activeReelId) ?? reelFeed[0], [activeReelId, reelFeed]);
  const pageHeight = Math.max(520, height - tabBarHeight);
  const topInset = insets.top + 56;
  const bottomInset = 16;

  useEffect(() => {
    if (!reelFeed.length) {
      setActiveReelId(undefined);
      return;
    }

    if (!activeReelId || !reelFeed.some((item) => item.id === activeReelId)) {
      setActiveReelId(reelFeed[0].id);
    }
  }, [activeReelId, reelFeed]);

  useEffect(() => {
    if (!isFocused || !activeReelId) {
      return;
    }

    const viewTimer = setTimeout(() => recordReelView(activeReelId), 2000);
    return () => clearTimeout(viewTimer);
  }, [activeReelId, isFocused]);

  useEffect(() => {
    setCommentsOpen(false);
    setCommentDraft("");
  }, [activeReelId, feedMode]);

  useEffect(() => {
    flatListRef.current?.scrollToOffset({ animated: false, offset: 0 });
    setActiveReelId((current) => current ?? reelFeed[0]?.id);
  }, [feedMode]);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 72,
  }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
    const nextVisible = viewableItems.find((item) => item.isViewable && item.item && typeof item.item.id === "string");
    if (nextVisible?.item?.id) {
      setActiveReelId(nextVisible.item.id);
    }
  }).current;

  async function handleLike(reelId: string) {
    const result = await toggleLike(reelId);
    if (!result.ok) {
      Alert.alert(copy.likeUnavailableTitle, result.message ?? copy.likeUnavailableBody);
    }
  }

  async function handleShare(reelId: string) {
    const reel = reelFeed.find((item) => item.id === reelId) ?? reels.find((item) => item.id === reelId);
    const creator = reel ? getUserById(reel.userId) : null;
    if (!reel || !creator) {
      Alert.alert(copy.shareUnavailableTitle, copy.shareUnavailableBody);
      return;
    }

    const result = await repostReel(reelId);
    if (!result.ok) {
      Alert.alert(copy.shareUnavailableTitle, result.message ?? copy.shareUnavailableBody);
      return;
    }

    try {
      await shareReelToApps(reel, creator);
    } catch (error) {
      Alert.alert(copy.shareUnavailableTitle, error instanceof Error ? error.message : copy.shareUnavailableBody);
    }
  }

  async function handleFollow(userId: string) {
    const result = await toggleFollow(userId);
    if (!result.ok) {
      Alert.alert(copy.followUnavailableTitle, result.message ?? copy.followUnavailableBody);
    }
  }

  async function handleSave(reelId: string) {
    const result = await toggleSaveReel(reelId);
    if (!result.ok) {
      Alert.alert(copy.saveUnavailableTitle, result.message ?? copy.saveUnavailableBody);
    }
  }

  async function handleDelete(reelId: string) {
    Alert.alert(copy.rdDeleteReel, copy.rvDeleteBody, [
      { text: copy.cancel, style: "cancel" },
      {
        text: copy.delete,
        style: "destructive",
        onPress: () => {
          void (async () => {
            const result = await deleteReel(reelId);
            if (!result.ok) {
              Alert.alert(copy.deleteUnavailableTitle, result.message ?? copy.deleteUnavailableBody);
            }
          })();
        },
      },
    ]);
  }

  async function submitComment() {
    const nextComment = commentDraft.trim();
    if (!activeReel || !nextComment) {
      Alert.alert(copy.commentEmptyTitle, copy.commentEmptyBody);
      return;
    }

    setIsPostingComment(true);
    try {
      const result = await addComment(activeReel.id, nextComment);
      if (!result.ok) {
        Alert.alert(copy.commentUnavailableTitle, result.message ?? copy.commentUnavailableBody);
        return;
      }

      setCommentDraft("");
    } finally {
      setIsPostingComment(false);
    }
  }

  if (!reelFeed.length) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>{copy.reelsEmptyTitle}</Text>
        <Text style={styles.emptyBody}>{copy.reelsEmptyBody}</Text>
        <Pressable onPress={() => navigation.navigate("Create", { initialMode: "reel" })} style={styles.emptyButton}>
          <Ionicons color="#04070b" name="add" size={18} />
          <Text style={styles.emptyButtonLabel}>{copy.uploadReel}</Text>
        </Pressable>
      </View>
    );
  }

  const activeComments = activeReel ? getCommentsForReel(activeReel.id) : [];

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} pointerEvents="box-none" style={styles.headerSafeArea}>
        <SafeLinearGradient
          colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0.18)", "transparent"]}
          pointerEvents="none"
          style={styles.headerScrim}
        />

        <View pointerEvents="box-none" style={styles.headerTopRow}>
          <Pressable
            accessibilityLabel={copy.rsCreateReel}
            hitSlop={10}
            onPress={() => navigation.navigate("Create", { initialMode: "reel" })}
            style={styles.headerIcon}
          >
            <GradientIconFill icon="add" iconSize={24} size={34} />
          </Pressable>

          <View style={styles.segmentShell}>
            <FeedModeChip active={feedMode === "forYou"} label={copy.forYou} onPress={() => setFeedMode("forYou")} />
            <View style={styles.segmentDivider} />
            <FeedModeChip active={feedMode === "trending"} label={copy.trending} onPress={() => setFeedMode("trending")} />
          </View>

          <Pressable
            accessibilityLabel={copy.notifications}
            hitSlop={10}
            onPress={() => rootNavigation.navigate("Notifications")}
            style={styles.headerIcon}
          >
            <Ionicons color="#ffffff" name="notifications-outline" size={22} style={styles.headerIconGlyph} />
          </Pressable>
        </View>
      </SafeAreaView>

      <FlatList
        bounces={false}
        data={reelFeed}
        decelerationRate="fast"
        getItemLayout={(_data, index) => ({
          index,
          length: pageHeight,
          offset: pageHeight * index,
        })}
        initialNumToRender={1}
        keyExtractor={(item) => item.id}
        maxToRenderPerBatch={1}
        onViewableItemsChanged={onViewableItemsChanged}
        pagingEnabled
        ref={flatListRef}
        removeClippedSubviews
        renderItem={({ item }) => {
          const creator = getUserById(item.userId);
          const boost = getBoostForReel(item.id);
          if (!creator) {
            return null;
          }

          return (
            <View style={[styles.page, { height: pageHeight }]}>
              <ReelCard
                boostLabel={boost?.status === "active" ? copy.boostLive : isReelBoostActive(item) ? copy.sponsored : undefined}
                commentCount={commentCounts.get(item.id) ?? 0}
                creator={creator}
                currentUserId={currentUser?.id}
                fullScreen
                immersive
                immersiveHeight={pageHeight}
                onComment={() => setCommentsOpen(true)}
                onLike={() => {
                  void handleLike(item.id);
                }}
                onOpen={() => undefined}
                onOpenCreator={() => rootNavigation.navigate("PublicProfile", { userId: creator.id })}
                onRepost={() => {
                  void handleShare(item.id);
                }}
                onSave={() => {
                  void handleSave(item.id);
                }}
                onDelete={
                  item.userId === currentUser?.id
                    ? () => {
                        void handleDelete(item.id);
                      }
                    : undefined
                }
                onReport={
                  item.userId !== currentUser?.id
                    ? () => openReportSheet({ entityType: "reel", entityId: item.id, ownerId: item.userId })
                    : undefined
                }
                onToggleMuted={() => setMuted((currentValue) => !currentValue)}
                onToggleFollow={
                  creator.id === currentUser?.id
                    ? undefined
                    : () => {
                        void handleFollow(creator.id);
                      }
                }
                playVideo={isFocused && activeReelId === item.id}
                reel={item}
                muted={muted}
                saved={isReelSaved(item.id)}
                topInset={topInset}
                bottomInset={bottomInset}
                viewerMode
              />
            </View>
          );
        }}
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
        snapToInterval={pageHeight}
        updateCellsBatchingPeriod={80}
        viewabilityConfig={viewabilityConfig}
        windowSize={3}
      />

      <ReelCommentsSheet
        bottomInset={Math.max(insets.bottom, 16)}
        comments={activeComments}
        draft={commentDraft}
        isPosting={isPostingComment}
        onChangeDraft={setCommentDraft}
        onClose={() => setCommentsOpen(false)}
        onSubmit={() => {
          void submitComment();
        }}
        visible={commentsOpen}
      />
    </View>
  );
}

function FeedModeChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable hitSlop={8} onPress={onPress} style={styles.segmentChip}>
      <Text style={[styles.segmentChipLabel, active ? styles.segmentChipLabelActive : null]}>{label}</Text>
      <View style={[styles.segmentIndicator, active ? styles.segmentIndicatorActive : null]} />
    </Pressable>
  );
}

function buildReelFeed({
  reels,
  commentCounts,
  currentUserId,
  followingIds,
  mode,
  localCreatorIds,
}: {
  reels: Reel[];
  commentCounts: Map<string, number>;
  currentUserId?: string;
  followingIds: string[];
  mode: ReelFeedMode;
  localCreatorIds: Set<string>;
}) {
  const followingSet = new Set(followingIds);
  const currentUserSet = new Set([...(currentUserId ? [currentUserId] : []), ...followingIds]);

  if (mode === "trending") {
    return promoteBoostedReels(
      [...reels].sort((left, right) => getTrendingScore(right, commentCounts, localCreatorIds) - getTrendingScore(left, commentCounts, localCreatorIds))
    );
  }

  if (followingSet.size === 0) {
    return promoteBoostedReels(
      [...reels].sort((left, right) => getForYouScore(right, commentCounts, localCreatorIds) - getForYouScore(left, commentCounts, localCreatorIds))
    );
  }

  const prioritized = reels.filter((reel) => currentUserSet.has(reel.userId));
  const discovery = reels.filter((reel) => !currentUserSet.has(reel.userId));

  return [
    ...prioritized.sort((left, right) => getForYouScore(right, commentCounts, localCreatorIds) - getForYouScore(left, commentCounts, localCreatorIds)),
    ...promoteBoostedReels(
      discovery.sort((left, right) => getTrendingScore(right, commentCounts, localCreatorIds) - getTrendingScore(left, commentCounts, localCreatorIds))
    ),
  ];
}

// Paid boosts are real distribution: while a boost is active the reel is placed ahead of organic discovery reels.
function promoteBoostedReels(sortedReels: Reel[]) {
  const now = Date.now();
  const boosted = sortedReels.filter((reel) => isReelBoostActive(reel, now));
  if (boosted.length === 0) {
    return sortedReels;
  }

  return [...boosted, ...sortedReels.filter((reel) => !isReelBoostActive(reel, now))];
}

const LOCAL_CREATOR_LIFT = 1.35;

function getForYouScore(reel: Reel, commentCounts: Map<string, number>, localCreatorIds: Set<string>) {
  const ageHours = Math.max(1, Math.floor((Date.now() - new Date(reel.createdAt).getTime()) / (1000 * 60 * 60)));
  const freshness = Math.max(0, 160 - ageHours * 3);
  const score = reel.viewCount * 0.35 + reel.likedBy.length * 95 + (commentCounts.get(reel.id) ?? 0) * 120 + reel.repostCount * 150 + freshness;
  return localCreatorIds.has(reel.userId) ? score * LOCAL_CREATOR_LIFT : score;
}

function getTrendingScore(reel: Reel, commentCounts: Map<string, number>, localCreatorIds: Set<string>) {
  const ageHours = Math.max(1, Math.floor((Date.now() - new Date(reel.createdAt).getTime()) / (1000 * 60 * 60)));
  const freshnessMultiplier = ageHours <= 24 ? 1.18 : ageHours <= 72 ? 1.08 : 1;
  const baseScore =
    reel.viewCount * 0.48 +
    reel.reachCount * 0.08 +
    reel.likedBy.length * 120 +
    (commentCounts.get(reel.id) ?? 0) * 150 +
    reel.repostCount * 220;
  return baseScore * freshnessMultiplier * (localCreatorIds.has(reel.userId) ? LOCAL_CREATOR_LIFT : 1);
}

const styles = createDarkStyles({
  container: {
    backgroundColor: "#020406",
    flex: 1,
  },
  headerSafeArea: {
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 10,
  },
  headerScrim: {
    height: 120,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  headerTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
    paddingTop: 2,
  },
  headerBottomRow: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  headerIcon: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  headerCenter: {
    alignItems: "center",
    backgroundColor: "rgba(7,12,18,0.62)",
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: radii.pill,
    borderWidth: 1,
    gap: 2,
    minWidth: 116,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    ...shadows.floating,
  },
  headerTitle: {
    color: palette.text,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    color: palette.textSoft,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  segmentShell: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  segmentChip: {
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  segmentChipActive: {
    opacity: 1,
  },
  segmentChipLabel: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 16,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  segmentChipLabelActive: {
    color: "#ffffff",
    fontWeight: "800",
  },
  page: {},
  headerIconGlyph: {
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  segmentDivider: {
    backgroundColor: "rgba(255,255,255,0.35)",
    height: 14,
    width: 1,
  },
  segmentIndicator: {
    backgroundColor: "transparent",
    borderRadius: 2,
    height: 3,
    width: 22,
  },
  segmentIndicatorActive: {
    backgroundColor: "#ffffff",
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: "#020406",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    color: palette.text,
    fontSize: 26,
    fontWeight: "900",
    marginBottom: spacing.sm,
  },
  emptyBody: {
    color: palette.textSoft,
    fontSize: 15,
    lineHeight: 24,
    marginBottom: spacing.xl,
    textAlign: "center",
  },
  emptyButton: {
    alignItems: "center",
    backgroundColor: palette.accent,
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  emptyButtonLabel: {
    color: "#04070b",
    fontSize: 14,
    fontWeight: "900",
  },
});
