import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../components/Avatar";
import type { CopyStrings } from "../data/locales/en";
import { BRAND_GRADIENT, BrandTint, GradientIconButton } from "../components/GradientIcon";
import { openReportSheet } from "../components/ReportSheet";
import { useIsFocused } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getCopy } from "../data/copy";
import { PostCard } from "../components/PostCard";
import { SafeLinearGradient } from "../components/SafeLinearGradient";
import { useAppState } from "../providers/AppProvider";
import { triggerFeedback } from "../services/feedback";
import { getNotificationNavigationTarget } from "../services/notificationRouting";
import {
  buildNotificationStacks,
  formatNotificationTime,
  getNotificationMeta,
  getNotificationStackPreviewUri,
  getNotificationStackSummary,
} from "../services/notificationPresentation";
import { AppNotification, Post, Story, User } from "../types/models";
import { palette, radii, spacing, createThemedStyles } from "../theme";
import { CommentsSheet } from "../components/CommentsSheet";

const PAGE_SIZE = 5;
type FeedRowItem = Post | { kind: "skeleton"; id: string };

export function HomeScreen({ navigation }: { navigation: any }) {
  const {
    currentUser,
    isBootstrapping,
    language,
    notifications,
    users,
    stories,
    posts,
    reels,
    getUserById,
    getPostById,
    getCommentsForPost,
    getTotalDirectUnreadCount,
    togglePostLike,
    addPostComment,
    deletePost,
    toggleSavePost,
    isPostSaved,
    markAllNotificationsRead,
    markNotificationRead,
  } = useAppState();
  const copy = getCopy(language);
  const rootNavigation = navigation.getParent?.() ?? navigation;
  const isFocused = useIsFocused();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [showNotificationsTray, setShowNotificationsTray] = useState(false);
  const [activeFeedPostId, setActiveFeedPostId] = useState<string | null>(null);

  const creators = users.filter((item) => item.id !== currentUser?.id).slice(0, 8);
  const latestStories = getLatestStories(stories);
  const currentUserStory = currentUser ? latestStories.find((story) => story.userId === currentUser.id) : undefined;
  const otherStories = latestStories.filter((story) => story.userId !== currentUser?.id);
  const unreadNotifications = notifications.filter((item) => item.userId === currentUser?.id && !item.readAt).length;
  const latestNotifications = notifications
    .filter((item) => item.userId === currentUser?.id)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 6);
  const latestNotificationStacks = useMemo(() => buildNotificationStacks(latestNotifications), [latestNotifications]);
  const totalDirectUnreadCount = getTotalDirectUnreadCount();

  const { items: feedPosts, mode: feedMode } = useMemo(
    () => buildHomePostFeed(posts, currentUser),
    [currentUser, posts]
  );

  const visiblePosts = useMemo<FeedRowItem[]>(
    () => (isBootstrapping && feedPosts.length === 0 ? createSkeletonItems() : feedPosts.slice(0, visibleCount)),
    [feedPosts, isBootstrapping, visibleCount]
  );
  const activeCommentPost = commentPostId ? getPostById(commentPostId) : undefined;
  const activeCommentAuthor = activeCommentPost ? getUserById(activeCommentPost.userId) : undefined;
  const activeComments = activeCommentPost ? getCommentsForPost(activeCommentPost.id) : [];

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [feedPosts.length, currentUser?.id]);

  useEffect(() => {
    if (!feedPosts.length) {
      setActiveFeedPostId(null);
      return;
    }

    setActiveFeedPostId((current) => (current && feedPosts.some((post) => post.id === current) ? current : feedPosts[0].id));
  }, [feedPosts]);

  const feedViewabilityConfig = useRef({
    itemVisiblePercentThreshold: 65,
  }).current;

  const onFeedViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
    const nextVisible = viewableItems.find((entry) => {
      const item = entry.item as FeedRowItem | undefined;
      return entry.isViewable && item && "media" in item;
    });

    const item = nextVisible?.item as FeedRowItem | undefined;
    if (item && "media" in item) {
      setActiveFeedPostId(item.id);
    }
  }).current;

  async function handleLike(postId: string) {
    const result = await togglePostLike(postId);
    if (!result.ok) {
      Alert.alert(copy.likeUnavailableTitle, result.message ?? copy.likeUnavailableBody);
    }
  }

  async function handleSave(postId: string) {
    const result = await toggleSavePost(postId);
    if (!result.ok) {
      Alert.alert(copy.saveUnavailableTitle, result.message ?? copy.saveUnavailableBody);
    }
  }

  async function handleDelete(post: Post) {
    Alert.alert(copy.deletePostTitle, copy.deletePostBody, [
      { text: copy.cancel, style: "cancel" },
      {
        text: copy.delete,
        style: "destructive",
        onPress: () => {
          void (async () => {
            const result = await deletePost(post.id);
            if (!result.ok) {
              Alert.alert(copy.deleteUnavailableTitle, result.message ?? copy.deleteUnavailableBody);
            }
          })();
        },
      },
    ]);
  }

  async function handleSubmitComment() {
    if (!activeCommentPost || !commentDraft.trim() || isPostingComment) {
      return;
    }

    setIsPostingComment(true);
    try {
      const result = await addPostComment(activeCommentPost.id, commentDraft);
      if (!result.ok) {
        Alert.alert(copy.commentUnavailableTitle, result.message ?? copy.commentUnavailableBody);
        return;
      }

      setCommentDraft("");
    } finally {
      setIsPostingComment(false);
    }
  }

  async function handleAddStory() {
    if (!currentUser) {
      Alert.alert(copy.loginRequiredTitle, copy.storyLoginRequiredBody);
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(copy.profilePhotoAccessTitle, copy.storyPhotoAccessBody);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.55,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      if (!asset?.uri) {
        Alert.alert(copy.storyUnavailableTitle, copy.hmMediaOpenFailed);
        return;
      }

      const mediaType = asset.type === "video" ? "video" : "image";
      navigation.navigate("Create", {
        initialMode: "story",
        prefillAsset: {
          uri: asset.uri,
          type: mediaType,
          mimeType: asset.mimeType,
          fileName: asset.fileName,
          durationSeconds: typeof asset.duration === "number" ? Math.max(1, Math.round(asset.duration / 1000)) : undefined,
        },
      });
    } catch (error) {
      console.warn("Sohba story picker failed.", error);
      Alert.alert(copy.storyUnavailableTitle, getStoryPickerErrorMessage(error, copy));
    }
  }

  async function handleOpenNotification(notification: AppNotification) {
    if (!notification.readAt) {
      const result = await markNotificationRead(notification.id);
      if (!result.ok) {
        Alert.alert(copy.notificationUnavailableTitle, result.message ?? copy.notificationUnavailableBody);
        return;
      }
    }

    setShowNotificationsTray(false);
    triggerFeedback("open");
    const target = getNotificationNavigationTarget(notification);
    if (target) {
      rootNavigation.navigate(target.name, target.params);
      return;
    }

    rootNavigation.navigate("Notifications");
  }

  async function handleMarkAllNotificationsFromTray() {
    const result = await markAllNotificationsRead();
    if (!result.ok) {
      Alert.alert(copy.notificationsUnavailableTitle, result.message ?? copy.notificationsUnavailableBody);
      return;
    }

    setShowNotificationsTray(false);
  }

  return (
    <SafeLinearGradient colors={[palette.background, palette.background]} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <FlatList<FeedRowItem>
          contentContainerStyle={styles.listContent}
          data={visiblePosts}
          keyExtractor={(item, index) => item.id || `skeleton-${index}`}
          ListHeaderComponent={
            <View style={styles.headerStack}>
              <View style={styles.topBar}>
                <Text style={styles.brand}>{copy.appName}</Text>
                <View style={styles.topActions}>
                  <IconBubble label={copy.search} icon="search-outline" onPress={() => rootNavigation.navigate("Explore")} />
                  <IconBubble
                    badge={totalDirectUnreadCount > 0 ? String(totalDirectUnreadCount) : undefined}
                    icon="paper-plane-outline"
                    label={copy.messages}
                    onPress={() => rootNavigation.navigate("DirectInbox")}
                  />
                  <IconBubble
                    badge={unreadNotifications > 0 ? String(unreadNotifications) : undefined}
                    icon="heart-outline"
                    label={copy.notifications}
                    onPress={() => setShowNotificationsTray(true)}
                  />
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storyRow}>
                {currentUser ? (
                  <Pressable
                    onPress={() => {
                      if (currentUserStory) {
                        rootNavigation.navigate("StoryViewer", {
                          userId: currentUser.id,
                          storyId: currentUserStory.id,
                        });
                        return;
                      }

                      void handleAddStory();
                    }}
                    style={styles.storyCard}
                  >
                    <View style={styles.storyAvatarWrap}>
                      <StoryRing imageUrl={currentUserStory?.imageUrl || currentUser.profileImage} name={currentUser.name} ownStory={!currentUserStory} />
                      <View style={styles.storyAddBadge}>
                        <Ionicons color="#ffffff" name={currentUserStory ? "play" : "add"} size={14} />
                      </View>
                    </View>
                    <Text numberOfLines={1} style={styles.storyLabel}>
                      {copy.yourStory}
                    </Text>
                  </Pressable>
                ) : null}

                {otherStories.map((story) => {
                  const creator = getUserById(story.userId);
                  if (!creator) {
                    return null;
                  }

                  const viewedByCurrentUser = currentUser ? story.viewerIds.includes(currentUser.id) : false;
                  return (
                    <Pressable
                      key={story.id}
                      onPress={() => rootNavigation.navigate("StoryViewer", { userId: creator.id, storyId: story.id })}
                      style={styles.storyCard}
                    >
                      <StoryRing imageUrl={story.imageUrl} name={creator.name} viewed={viewedByCurrentUser} />
                      <Text numberOfLines={1} style={styles.storyLabel}>
                        {creator.username}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={styles.quickComposer}>
                <Avatar name={currentUser?.name} style={styles.quickComposerAvatar} uri={currentUser?.profileImage} />
                <Pressable onPress={() => navigation.navigate("Create", { initialMode: "post" })} style={styles.quickComposerInput}>
                  <Text style={styles.quickComposerText}>{copy.quickComposerPrompt}</Text>
                </Pressable>
                <GradientIconButton icon="images-outline" onPress={() => navigation.navigate("Create", { initialMode: "post" })} size={38} />
                <GradientIconButton icon="play-circle-outline" onPress={() => navigation.navigate("Create", { initialMode: "reel" })} size={38} />
              </View>

              <View style={styles.sectionRow}>
                <View style={styles.sectionCopy}>
                  <Text style={styles.sectionTitle}>{feedMode === "following" ? copy.followingFeedTitle : copy.suggestedFeedTitle}</Text>
                  <Text style={styles.sectionBody}>
                    {feedMode === "following"
                      ? copy.followingFeedBody
                      : copy.suggestedFeedBody}
                  </Text>
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.creatorRow}>
                {creators.map((creator) => (
                  <Pressable
                    key={creator.id}
                    onPress={() => rootNavigation.navigate("PublicProfile", { userId: creator.id })}
                    style={styles.creatorChip}
                  >
                    <Avatar name={creator.name} style={styles.creatorChipAvatar} uri={creator.profileImage} />
                    <View style={styles.creatorChipCopy}>
                      <Text numberOfLines={1} style={styles.creatorChipName}>
                        {creator.name}
                      </Text>
                      <Text numberOfLines={1} style={styles.creatorChipMeta}>
                        @{creator.username}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          }
          ListEmptyComponent={
            !isBootstrapping ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>{copy.homeFeedReadyTitle}</Text>
                <Text style={styles.emptyStateBody}>
                  {copy.homeFeedReadyBody}
                </Text>
                <Pressable onPress={() => navigation.navigate("Create", { initialMode: "post" })} style={styles.emptyStateAction}>
                  <Text style={styles.emptyStateActionLabel}>{copy.createFirstPost}</Text>
                </Pressable>
              </View>
            ) : null
          }
          onEndReached={() => {
            if (visibleCount < feedPosts.length) {
              setVisibleCount((current) => Math.min(feedPosts.length, current + PAGE_SIZE));
            }
          }}
          onEndReachedThreshold={0.4}
          onViewableItemsChanged={onFeedViewableItemsChanged}
          renderItem={({ item }) => {
            if (!("media" in item)) {
              return <FeedSkeletonCard />;
            }

            const author = getUserById(item.userId);
            if (!author) {
              return null;
            }

            return (
              <PostCard
                author={author}
                currentUserId={currentUser?.id}
                mediaPlaybackEnabled={isFocused && activeFeedPostId === item.id}
                onAuthorPress={() => rootNavigation.navigate("PublicProfile", { userId: author.id })}
                onComment={() => setCommentPostId(item.id)}
                onDelete={item.userId === currentUser?.id ? () => handleDelete(item) : undefined}
                onReport={
                  item.userId !== currentUser?.id
                    ? () => openReportSheet({ entityType: "post", entityId: item.id, ownerId: item.userId })
                    : undefined
                }
                onLike={() => {
                  void handleLike(item.id);
                }}
                onSave={() => {
                  void handleSave(item.id);
                }}
                post={item}
                saved={isPostSaved(item.id)}
              />
            );
          }}
          showsVerticalScrollIndicator={false}
          viewabilityConfig={feedViewabilityConfig}
        />

        <Modal animationType="fade" onRequestClose={() => setShowNotificationsTray(false)} transparent visible={showNotificationsTray}>
          <View style={styles.notificationTrayBackdrop}>
            <Pressable onPress={() => setShowNotificationsTray(false)} style={styles.notificationTrayTapAway} />
            <View style={styles.notificationTray}>
              <View style={styles.notificationTrayHeader}>
                <View style={styles.notificationTrayHeaderTop}>
                  <View>
                    <Text style={styles.notificationTrayTitle}>{copy.notificationsTrayTitle}</Text>
                    <Text style={styles.notificationTraySubtitle}>
                      {unreadNotifications > 0
                        ? `${unreadNotifications} ${copy.notificationsUnreadNow}`
                        : copy.notificationsTrayCaughtUp}
                    </Text>
                  </View>
                  <View style={styles.notificationTrayBadge}>
                    <Ionicons color={palette.primary} name="flash-outline" size={14} />
                    <Text style={styles.notificationTrayBadgeLabel}>{copy.live}</Text>
                  </View>
                </View>
                <View style={styles.notificationTrayActions}>
                  <Pressable onPress={() => void handleMarkAllNotificationsFromTray()} style={styles.notificationTrayGhost}>
                    <Text style={styles.notificationTrayGhostLabel}>{copy.markAll}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setShowNotificationsTray(false);
                      rootNavigation.navigate("Notifications");
                    }}
                    style={styles.notificationTrayPrimary}
                  >
                    <Text style={styles.notificationTrayPrimaryLabel}>{copy.seeAll}</Text>
                  </Pressable>
                </View>
              </View>

              {latestNotificationStacks.length === 0 ? (
                <View style={styles.notificationTrayEmpty}>
                  <Ionicons color={palette.muted} name="notifications-outline" size={22} />
                  <Text style={styles.notificationTrayEmptyTitle}>{copy.noNotificationsYet}</Text>
                  <Text style={styles.notificationTrayEmptyBody}>
                    {copy.notificationsTrayEmptyBody}
                  </Text>
                </View>
              ) : (
                <View style={styles.notificationTrayList}>
                  {latestNotificationStacks.map((stack) => {
                    const summary = getNotificationStackSummary(stack, copy);
                    const meta = getNotificationMeta(stack.primary.type, copy);
                    const previewUri = getNotificationStackPreviewUri(stack, posts, reels, stories);
                    const avatars = Array.from(
                      new Set(
                        stack.items
                          .map((item) => item.actorAvatar?.trim())
                          .filter((value): value is string => Boolean(value))
                      )
                    ).slice(0, 2);

                    return (
                      <Pressable
                        key={stack.id}
                        onPress={() => {
                          void (async () => {
                            if (stack.unreadCount > 1) {
                              await Promise.all(
                                stack.items
                                  .filter((item) => !item.readAt)
                                  .map((item) => markNotificationRead(item.id))
                              );
                            }

                            await handleOpenNotification(stack.primary);
                          })();
                        }}
                        style={[styles.notificationTrayItem, stack.unreadCount > 0 ? styles.notificationTrayItemUnread : null]}
                      >
                        <View style={styles.notificationTrayAvatarWrap}>
                          {avatars.length > 0 ? (
                            <View style={styles.notificationTrayAvatarStack}>
                              {avatars.map((avatarUri, avatarIndex) => (
                                <Image
                                  key={`${stack.id}-${avatarUri}-${avatarIndex}`}
                                  source={{ uri: avatarUri }}
                                  style={[
                                    styles.notificationTrayAvatar,
                                    styles.notificationTrayStackAvatar,
                                    avatarIndex > 0 ? { marginLeft: -10 } : null,
                                  ]}
                                />
                              ))}
                            </View>
                          ) : (
                            <View style={styles.notificationTrayAvatarFallback}>
                              <Ionicons color={palette.primary} name={meta.icon} size={15} />
                            </View>
                          )}
                          <View style={styles.notificationTrayMiniIcon}>
                            <Ionicons color="#ffffff" name={meta.icon} size={10} />
                          </View>
                        </View>
                        <View style={styles.notificationTrayCopy}>
                          <View style={styles.notificationTrayMetaRow}>
                            <Text numberOfLines={1} style={styles.notificationTrayItemTitle}>
                              {summary.title}
                            </Text>
                            <Text style={styles.notificationTrayItemTime}>{formatNotificationTime(stack.primary.createdAt, copy)}</Text>
                          </View>
                          <Text numberOfLines={2} style={styles.notificationTrayItemBody}>
                            {summary.body}
                          </Text>
                          {stack.items.length > 1 ? (
                            <Text style={styles.notificationTrayStackHint}>
                              {stack.items.length} updates grouped together
                            </Text>
                          ) : null}
                        </View>
                        {previewUri ? (
                          <Image source={{ uri: previewUri }} style={styles.notificationTrayMediaPreview} />
                        ) : null}
                        {stack.unreadCount > 0 ? <View style={styles.notificationTrayUnreadDot} /> : null}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        </Modal>

        <CommentsSheet
          comments={activeComments}
          currentUserAvatar={currentUser?.profileImage}
          draft={commentDraft}
          emptyText={copy.emptyPostCommentBody}
          isPosting={isPostingComment}
          language={language}
          onChangeDraft={setCommentDraft}
          onClose={() => setCommentPostId(null)}
          onSubmit={() => void handleSubmitComment()}
          placeholder={`${copy.commentPlaceholder}...`}
          sendLabel={copy.postComment}
          subtitle={activeCommentAuthor ? `@${activeCommentAuthor.username}` : undefined}
          title={copy.commentsTitle}
          visible={Boolean(commentPostId)}
        />
      </SafeAreaView>
    </SafeLinearGradient>
  );
}

function buildHomePostFeed(posts: Post[], currentUser: User | null) {
  const sorted = [...posts].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  if (!currentUser) {
    return { items: sorted, mode: "suggested" as const };
  }

  const ownPosts = sorted.filter((item) => item.userId === currentUser.id);
  const followedIds = new Set(currentUser.following);
  const followingPosts = sorted.filter((item) => followedIds.has(item.userId));
  if (currentUser.following.length > 0 && followingPosts.length > 0) {
    return { items: mergeFeedPosts([...ownPosts, ...followingPosts]), mode: "following" as const };
  }

  return {
    items: mergeFeedPosts([...ownPosts, ...sorted.filter((item) => item.userId !== currentUser.id)]),
    mode: "suggested" as const,
  };
}

function mergeFeedPosts(posts: Post[]) {
  const byId = new Map<string, Post>();
  posts.forEach((post) => {
    byId.set(post.id, post);
  });
  return [...byId.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function createSkeletonItems() {
  return Array.from({ length: 3 }, (_item, index) => ({ kind: "skeleton" as const, id: `skeleton-${index}` }));
}

function getLatestStories(stories: Story[]) {
  const now = Date.now();
  const ordered = [...stories]
    .filter((story) => new Date(story.expiresAt).getTime() > now)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const seen = new Set<string>();

  return ordered.filter((story) => {
    if (seen.has(story.userId)) {
      return false;
    }

    seen.add(story.userId);
    return true;
  });
}

function getStoryPickerErrorMessage(error: unknown, copy: CopyStrings) {
  const message = error instanceof Error ? error.message : "";
  if (message.toLowerCase().includes("permission")) {
    return copy.hmStoryAccess;
  }

  return copy.hmStoryPickerFailed;
}

function IconBubble({
  icon,
  badge,
  tint,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  badge?: string;
  tint?: BrandTint;
  label?: string;
  onPress: () => void;
}) {
  return <GradientIconButton accessibilityLabel={label} badge={badge} icon={icon} onPress={onPress} tint={tint} />;
}

function StoryRing({
  imageUrl,
  name,
  viewed,
  ownStory,
}: {
  imageUrl: string;
  name?: string;
  viewed?: boolean;
  ownStory?: boolean;
}) {
  // Only unseen stories get the brand gradient; seen ones and "add your story" stay quiet grey.
  const colors: readonly [string, string, ...string[]] =
    viewed || ownStory ? [palette.borderStrong, palette.borderStrong] : [...BRAND_GRADIENT];
  return (
    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.storyRing}>
      <View style={styles.storyRingInner}>
        <Avatar name={name} style={styles.storyAvatar} uri={imageUrl} />
      </View>
    </LinearGradient>
  );
}

function FeedSkeletonCard() {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 850, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 850, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.skeletonCard, { opacity }]}>
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonAvatar} />
        <View style={styles.skeletonCopy}>
          <View style={styles.skeletonLinePrimary} />
          <View style={styles.skeletonLineSecondary} />
        </View>
      </View>
      <View style={styles.skeletonMedia} />
      <View style={styles.skeletonActionRow}>
        <View style={styles.skeletonIcon} />
        <View style={styles.skeletonIcon} />
        <View style={styles.skeletonIcon} />
      </View>
      <View style={styles.skeletonLinePrimary} />
      <View style={[styles.skeletonLineSecondary, { width: "58%" }]} />
    </Animated.View>
  );
}

const styles = createThemedStyles({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  listContent: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.md,
  },
  headerStack: {
    gap: spacing.lg,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  brand: {
    color: palette.text,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  topActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
  },
  discoverSearchBar: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.xl,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  discoverSearchIcon: {
    alignItems: "center",
    backgroundColor: "rgba(31,91,255,0.12)",
    borderRadius: radii.pill,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  discoverSearchCopy: {
    flex: 1,
    gap: 2,
  },
  discoverSearchTitle: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "800",
  },
  discoverSearchHint: {
    color: palette.textSoft,
    fontSize: 12,
  },
  iconBubble: {
    alignItems: "center",
    backgroundColor: "#151922",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    position: "relative",
    width: 40,
  },
  iconBadge: {
    alignItems: "center",
    backgroundColor: palette.accent,
    borderColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: "center",
    minWidth: 20,
    paddingHorizontal: 5,
    position: "absolute",
    right: -4,
    top: -4,
  },
  iconBadgeLabel: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
  storyRow: {
    gap: spacing.md,
    paddingRight: spacing.md,
  },
  storyCard: {
    alignItems: "center",
    gap: spacing.xs,
    width: 84,
  },
  storyAvatarWrap: {
    position: "relative",
  },
  storyRing: {
    borderRadius: 38,
    padding: 2.5,
  },
  storyRingInner: {
    backgroundColor: palette.background,
    borderRadius: 36,
    padding: 2.5,
  },
  storyAvatar: {
    backgroundColor: "#151922",
    borderRadius: 34,
    height: 68,
    width: 68,
  },
  storyAddBadge: {
    alignItems: "center",
    backgroundColor: palette.primary,
    borderColor: palette.background,
    borderRadius: 11,
    borderWidth: 2,
    bottom: -2,
    height: 22,
    justifyContent: "center",
    position: "absolute",
    right: -2,
    width: 22,
  },
  storyLabel: {
    color: palette.text,
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  quickComposer: {
    alignItems: "center",
    backgroundColor: "#0b0d12",
    borderColor: "rgba(255,255,255,0.07)",
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  quickComposerAvatar: {
    borderRadius: 20,
    height: 40,
    width: 40,
  },
  quickComposerInput: {
    backgroundColor: "#151922",
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: radii.pill,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  quickComposerText: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  quickComposerAction: {
    alignItems: "center",
    backgroundColor: "#151922",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  sectionRow: {
    gap: spacing.xs,
  },
  sectionCopy: {
    gap: 4,
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "900",
  },
  sectionBody: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  creatorRow: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  creatorChip: {
    alignItems: "center",
    backgroundColor: "#0b0d12",
    borderColor: "rgba(255,255,255,0.07)",
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    width: 188,
  },
  creatorChipAvatar: {
    borderRadius: 22,
    height: 44,
    width: 44,
  },
  creatorChipCopy: {
    flex: 1,
    gap: 2,
  },
  creatorChipName: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "800",
  },
  creatorChipMeta: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  notificationTrayBackdrop: {
    backgroundColor: "rgba(0,0,0,0.48)",
    flex: 1,
    paddingTop: 76,
  },
  notificationTrayTapAway: {
    ...StyleSheet.absoluteFillObject,
  },
  notificationTray: {
    backgroundColor: "#0b0d12",
    borderColor: palette.borderStrong,
    borderRadius: 24,
    borderWidth: 1,
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
  },
  notificationTrayHeader: {
    gap: spacing.md,
  },
  notificationTrayHeaderTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  notificationTrayTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "900",
  },
  notificationTraySubtitle: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  notificationTrayBadge: {
    alignItems: "center",
    backgroundColor: "rgba(31,91,255,0.12)",
    borderColor: "rgba(31,91,255,0.24)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  notificationTrayBadgeLabel: {
    color: palette.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.35,
    textTransform: "uppercase",
  },
  notificationTrayActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  notificationTrayGhost: {
    alignItems: "center",
    backgroundColor: palette.glass,
    borderColor: palette.border,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  notificationTrayGhostLabel: {
    color: palette.text,
    fontSize: 12,
    fontWeight: "800",
  },
  notificationTrayPrimary: {
    alignItems: "center",
    backgroundColor: palette.primary,
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  notificationTrayPrimaryLabel: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900",
  },
  notificationTrayEmpty: {
    alignItems: "center",
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  notificationTrayEmptyTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "900",
  },
  notificationTrayEmptyBody: {
    color: palette.textSoft,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  notificationTrayList: {
    gap: spacing.sm,
  },
  notificationTrayItem: {
    alignItems: "center",
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  notificationTrayItemUnread: {
    backgroundColor: palette.cardAlt,
  },
  notificationTrayAvatarWrap: {
    position: "relative",
  },
  notificationTrayAvatarStack: {
    alignItems: "center",
    flexDirection: "row",
  },
  notificationTrayAvatar: {
    borderRadius: 20,
    height: 40,
    width: 40,
  },
  notificationTrayStackAvatar: {
    borderColor: "#151922",
    borderWidth: 2,
  },
  notificationTrayAvatarFallback: {
    alignItems: "center",
    backgroundColor: "rgba(31,91,255,0.12)",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  notificationTrayMiniIcon: {
    alignItems: "center",
    backgroundColor: palette.primary,
    borderColor: "#0b0d12",
    borderRadius: 9,
    borderWidth: 2,
    bottom: -3,
    height: 18,
    justifyContent: "center",
    position: "absolute",
    right: -3,
    width: 18,
  },
  notificationTrayCopy: {
    flex: 1,
    gap: 2,
  },
  notificationTrayMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  notificationTrayItemTitle: {
    color: palette.text,
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
  },
  notificationTrayItemTime: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: "700",
  },
  notificationTrayItemBody: {
    color: palette.textSoft,
    fontSize: 12,
    lineHeight: 18,
  },
  notificationTrayStackHint: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
  notificationTrayMediaPreview: {
    borderRadius: 14,
    height: 42,
    marginLeft: spacing.xs,
    width: 42,
  },
  notificationTrayUnreadDot: {
    backgroundColor: palette.primary,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  modalBackdrop: {
    backgroundColor: "rgba(0,0,0,0.48)",
    flex: 1,
    justifyContent: "flex-end",
  },
  modalTapAway: {
    flex: 1,
  },
  commentSheet: {
    backgroundColor: "#151922",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "72%",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  commentSheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  commentSheetTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "900",
  },
  commentSheetSubtitle: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: palette.glass,
    borderRadius: radii.pill,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  commentList: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  emptyCommentText: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  commentRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  commentAvatar: {
    borderRadius: 16,
    height: 32,
    width: 32,
  },
  commentBubble: {
    backgroundColor: "#151922",
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  commentAuthor: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "800",
  },
  commentBody: {
    color: palette.textSoft,
    fontSize: 14,
    lineHeight: 20,
  },
  commentComposer: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  commentInput: {
    backgroundColor: "#151922",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.pill,
    borderWidth: 1,
    color: palette.text,
    flex: 1,
    fontSize: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  commentSend: {
    alignItems: "center",
    backgroundColor: palette.primary,
    borderRadius: radii.pill,
    justifyContent: "center",
    minWidth: 72,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  commentSendLabel: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
  },
  skeletonCard: {
    backgroundColor: "#151922",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 28,
    borderWidth: 1,
    gap: spacing.md,
    overflow: "hidden",
    padding: spacing.md,
  },
  skeletonHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  skeletonAvatar: {
    backgroundColor: "#1e2330",
    borderRadius: 20,
    height: 40,
    width: 40,
  },
  skeletonCopy: {
    flex: 1,
    gap: 8,
  },
  skeletonLinePrimary: {
    backgroundColor: "#1e2330",
    borderRadius: radii.pill,
    height: 12,
    width: "72%",
  },
  skeletonLineSecondary: {
    backgroundColor: "#1e2330",
    borderRadius: radii.pill,
    height: 10,
    width: "42%",
  },
  skeletonMedia: {
    backgroundColor: "#1e2330",
    borderRadius: radii.lg,
    height: 360,
  },
  skeletonActionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  skeletonIcon: {
    backgroundColor: "#1e2330",
    borderRadius: radii.pill,
    height: 28,
    width: 28,
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: "#151922",
    borderColor: palette.border,
    borderRadius: 28,
    borderWidth: 1,
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  emptyStateTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  emptyStateBody: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  emptyStateAction: {
    alignItems: "center",
    backgroundColor: palette.primary,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  emptyStateActionLabel: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
  },
});
