import { Ionicons } from "@expo/vector-icons";
import { communityKindLabel } from "../utils/labels";
import { openReportSheet } from "../components/ReportSheet";
import { CallButtons } from "../components/CallButtons";
import { useProductPriceFormatter } from "../utils/priceFormatting";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useState } from "react";
import { Alert, Image, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { StatPill } from "../components/StatPill";
import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { Post, Product, Reel, Story } from "../types/models";
import { palette, radii, spacing, createThemedStyles } from "../theme";
import { PAYMENTS_ENABLED } from "../data/catalog";
import { brandTints, GradientIconButton } from "../components/GradientIcon";

type ProfileSection = "posts" | "reels" | "shop" | "spaces" | "saved";

export function ProfileScreen({ navigation, route }: { navigation: any; route?: { params?: { userId?: string } } }) {
  const {
    language,
    currentUser,
    stories,
    reels,
    posts,
    products,
    communities,
    savedPosts,
    getUserById,
    getTotalDirectUnreadCount,
    getTotalMarketplaceUnreadCount,
    getBoostForReel,
    canDirectMessageUser,
    refreshDirectInbox,
    refreshMarketplaceInbox,
    startDirectChat,
    toggleFollow,
    updateProfile,
    logout,
  } = useAppState();
  const copy = getCopy(language);
  const formatProductPrice = useProductPriceFormatter();
  const rootNavigation = navigation.getParent?.() ?? navigation;
  const userId = route?.params?.userId ?? currentUser?.id;
  const profileUser = userId ? getUserById(userId) : null;
  const [activeSection, setActiveSection] = useState<ProfileSection>("reels");

  if (!profileUser) {
    return (
      <Screen contentContainerStyle={styles.emptyContent}>
        <Text style={styles.emptyText}>{copy.profileNotFound}</Text>
      </Screen>
    );
  }

  const activeProfileUser = profileUser;
  const isOwnProfile = activeProfileUser.id === currentUser?.id;
  const userReels = reels.filter((item) => item.userId === activeProfileUser.id);
  const userPosts = posts.filter((item) => item.userId === activeProfileUser.id);
  const userProducts = products.filter((item) => item.userId === activeProfileUser.id);
  const userCommunities = communities.filter((item) => item.ownerId === activeProfileUser.id);
  const profileStories = getHighlightedStoriesForUser(stories, activeProfileUser.id);
  const isFollowing = currentUser ? activeProfileUser.followers.includes(currentUser.id) : false;
  const followsBack = currentUser ? activeProfileUser.following.includes(currentUser.id) : false;
  const chatUnlocked = currentUser ? canDirectMessageUser(activeProfileUser.id) : false;
  const savedByCurrentUser = currentUser ? savedPosts.filter((item) => item.userId === currentUser.id) : [];
  const totalDirectUnreadCount = getTotalDirectUnreadCount();
  const totalMarketplaceUnreadCount = getTotalMarketplaceUnreadCount();

  const savedReels = savedByCurrentUser
    .filter((item) => item.entityType === "reel")
    .map((item) => reels.find((reel) => reel.id === item.entityId))
    .filter((item): item is Reel => Boolean(item));
  const savedProducts = savedByCurrentUser
    .filter((item) => item.entityType === "product")
    .map((item) => products.find((product) => product.id === item.entityId))
    .filter((item): item is Product => Boolean(item));
  const savedProfilePosts = savedByCurrentUser
    .filter((item) => item.entityType === "post")
    .map((item) => posts.find((post) => post.id === item.entityId))
    .filter((item): item is Post => Boolean(item));

  const sectionItems = useMemo(() => {
    switch (activeSection) {
      case "posts":
        return userPosts.map((post) => ({
          id: `post-${post.id}`,
          title: post.caption || copy.post,
          subtitle: `${post.likedBy.length} likes`,
          imageUrl: post.media[0]?.thumbnailUrl || post.media[0]?.url || activeProfileUser.profileImage,
          badge: copy.post,
          onPress: () => rootNavigation.navigate("PostDetails", { postId: post.id }),
        }));
      case "shop":
        return userProducts.map((product) => ({
          id: `product-${product.id}`,
          title: product.title,
          subtitle: formatProductPrice(product),
          imageUrl: product.imageUrl,
          badge: product.category,
          onPress: () => rootNavigation.navigate("ProductDetails", { productId: product.id }),
        }));
      case "spaces":
        return userCommunities.map((community) => ({
          id: `community-${community.id}`,
          title: community.name,
          subtitle: community.category,
          imageUrl: community.coverImage,
          badge: communityKindLabel(community.kind, copy),
          onPress: () => rootNavigation.navigate("CommunityDetails", { communityId: community.id }),
        }));
      case "saved":
        return [
          ...savedProfilePosts.map((post) => ({
            id: `saved-post-${post.id}`,
            title: post.caption || copy.post,
            subtitle: `${post.commentCount} ${copy.commentsTitle.toLowerCase()}`,
            imageUrl: post.media[0]?.thumbnailUrl || post.media[0]?.url || activeProfileUser.profileImage,
            badge: copy.post,
            onPress: () => rootNavigation.navigate("PostDetails", { postId: post.id }),
          })),
          ...savedReels.map((reel) => ({
            id: `saved-reel-${reel.id}`,
            title: reel.caption,
            subtitle: `${reel.viewCount} ${copy.views}`,
            imageUrl: reel.thumbnailUrl,
            badge: copy.savedReelBadge,
            onPress: () => rootNavigation.navigate("ReelViewer", { reelId: reel.id }),
          })),
          ...savedProducts.map((product) => ({
            id: `saved-product-${product.id}`,
            title: product.title,
            subtitle: formatProductPrice(product),
            imageUrl: product.imageUrl,
            badge: copy.savedProductBadge,
            onPress: () => rootNavigation.navigate("ProductDetails", { productId: product.id }),
          })),
        ];
      case "reels":
      default:
        return userReels.map((reel) => ({
          id: `reel-${reel.id}`,
          title: reel.caption,
          subtitle: `${reel.viewCount} ${copy.views}`,
          imageUrl: reel.thumbnailUrl,
          badge: getBoostForReel(reel.id)?.status === "active" ? copy.boostLiveBadge : copy.reelBadge,
          onPress: () => rootNavigation.navigate("ReelViewer", { reelId: reel.id }),
        }));
    }
  }, [
    activeSection,
    activeProfileUser.profileImage,
    copy,
    getBoostForReel,
    rootNavigation,
    savedProducts,
    savedProfilePosts,
    savedReels,
    userCommunities,
    userProducts,
    userPosts,
    userReels,
  ]);

  useEffect(() => {
    if (!isOwnProfile) {
      return;
    }

    void refreshDirectInbox();
    void refreshMarketplaceInbox();
    const unsubscribe = navigation.addListener("focus", () => {
      void refreshDirectInbox();
      void refreshMarketplaceInbox();
    });

    return unsubscribe;
  }, [isOwnProfile, navigation]);

  useEffect(() => {
    if (!isOwnProfile && activeSection === "saved") {
      setActiveSection("reels");
    }
  }, [activeSection, isOwnProfile]);

  async function handleFollow() {
    const result = await toggleFollow(activeProfileUser.id);
    if (!result.ok) {
      Alert.alert(copy.followUnavailableTitle, result.message ?? copy.followUnavailableBody);
    }
  }

  async function handleChangePhoto() {
    if (!currentUser || !isOwnProfile) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(copy.profilePhotoAccessTitle, copy.profilePhotoAccessBody);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.45,
      base64: true,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    const mimeType = asset.mimeType || "image/jpeg";
    const update = await updateProfile({
      name: currentUser.name,
      username: currentUser.username,
      headline: currentUser.headline,
      bio: currentUser.bio,
      website: currentUser.website ?? "",
      profileImage: asset.base64 ? `data:${mimeType};base64,${asset.base64}` : asset.uri,
    });

    if (!update.ok) {
      Alert.alert(copy.photoUnavailableTitle, update.message ?? copy.photoUnavailableBody);
      return;
    }

    Alert.alert(copy.profilePhotoUpdated);
  }

  async function handleStartDirectChat() {
    const result = await startDirectChat(activeProfileUser.id);
    if (!result.ok || !result.threadId) {
      Alert.alert(copy.directChatUnavailableTitle, result.message ?? copy.directChatUnavailableBody);
      return;
    }

    rootNavigation.navigate("DirectChat", { threadId: result.threadId });
  }

  async function handleOpenWebsite() {
    const website = activeProfileUser.website?.trim();
    if (!website) {
      return;
    }

    const canOpen = await Linking.canOpenURL(website);
    if (!canOpen) {
      Alert.alert(copy.websiteUnavailableTitle, copy.websiteUnavailableBody);
      return;
    }

    await Linking.openURL(website);
  }

  return (
    <Screen scrollable contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroIdentity}>
            <Pressable
              disabled={!isOwnProfile}
              onPress={() => {
                void handleChangePhoto();
              }}
              style={styles.avatarWrap}
            >
              <Image source={{ uri: activeProfileUser.profileImage }} style={styles.avatar} />
              {isOwnProfile ? (
                <View style={styles.avatarEditBadge}>
                  <Ionicons color="#04070b" name="camera-outline" size={13} />
                </View>
              ) : null}
            </Pressable>

            <View style={styles.nameBlock}>
              <Text style={styles.name}>{activeProfileUser.name}</Text>
              <Text style={styles.handle}>@{activeProfileUser.username}</Text>
              <Text style={styles.headline}>{activeProfileUser.headline}</Text>
            </View>
          </View>

          {isOwnProfile ? (
            <GradientIconButton
              accessibilityLabel={copy.notifications}
              icon="notifications-outline"
              onPress={() => rootNavigation.navigate("Notifications")}
              size={44}
              tint="orange"
            />
          ) : null}
        </View>

        <Text style={styles.bio}>{activeProfileUser.bio}</Text>
        {activeProfileUser.website ? (
          <Pressable onPress={() => void handleOpenWebsite()} style={styles.websiteChip}>
            <Ionicons color={palette.accentSoft} name="link-outline" size={15} />
            <Text numberOfLines={1} style={styles.websiteLabel}>
              {activeProfileUser.website.replace(/^https?:\/\//i, "")}
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.statsRow}>
          <StatPill label={copy.posts} value={userPosts.length} />
          <StatPill
            label={copy.followers}
            onPress={() => rootNavigation.navigate("FollowList", { userId: activeProfileUser.id, mode: "followers" })}
            value={activeProfileUser.followers.length}
          />
          <StatPill
            label={copy.followingCount}
            onPress={() => rootNavigation.navigate("FollowList", { userId: activeProfileUser.id, mode: "following" })}
            value={activeProfileUser.following.length}
          />
        </View>

        {profileStories.length > 0 ? (
          <View style={styles.highlightBlock}>
            <Text style={styles.highlightTitle}>{copy.highlights}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.highlightRow}>
              {profileStories.map((story) => (
                <Pressable
                  key={story.id}
                  onPress={() => rootNavigation.navigate("StoryViewer", { userId: activeProfileUser.id, storyId: story.id })}
                  style={styles.highlightCard}
                >
                  <LinearGradient colors={["#ff8a3d", "#ff4d67", "#a855f7"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.highlightRing}>
                    <View style={styles.highlightRingInner}>
                      <Image source={{ uri: story.imageUrl }} style={styles.highlightImage} />
                    </View>
                  </LinearGradient>
                  <Text numberOfLines={1} style={styles.highlightLabel}>
                    {story.highlightLabel?.trim() || story.caption?.trim() || copy.storyFallbackLabel}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {isOwnProfile ? (
          <>
            <View style={styles.actionRow}>
              <PrimaryButton label={copy.editProfile} onPress={() => rootNavigation.navigate("EditProfile")} />
              <PrimaryButton label={copy.communities} onPress={() => rootNavigation.navigate("Communities")} variant="ghost" />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shortcutRow}>
              <ShortcutChip
                icon="paper-plane-outline"
                label={totalDirectUnreadCount > 0 ? `${copy.direct} ${totalDirectUnreadCount}` : copy.direct}
                onPress={() => rootNavigation.navigate("DirectInbox")}
              />
              <ShortcutChip
                icon="chatbubbles-outline"
                label={totalMarketplaceUnreadCount > 0 ? `${copy.marketplace} ${totalMarketplaceUnreadCount}` : copy.marketplace}
                onPress={() => rootNavigation.navigate("MarketplaceInbox")}
              />
              {currentUser?.role === "admin" ? (
                <ShortcutChip icon="shield-checkmark-outline" label={copy.adminTitle} onPress={() => rootNavigation.navigate("Admin")} />
              ) : null}
              <ShortcutChip icon="sparkles-outline" label={copy.aiTools} onPress={() => rootNavigation.navigate("AITools")} />
              <ShortcutChip icon="settings-outline" label={copy.settingsTitle} onPress={() => rootNavigation.navigate("Settings")} />
              {PAYMENTS_ENABLED ? (
                <ShortcutChip icon="card-outline" label={copy.subscription} onPress={() => rootNavigation.navigate("Subscription")} />
              ) : null}
              <ShortcutChip icon="log-out-outline" label={copy.logout} onPress={logout} />
            </ScrollView>
          </>
        ) : (
          <View style={styles.actionRow}>
            <PrimaryButton
              label={isFollowing ? copy.following : copy.follow}
              onPress={() => {
                void handleFollow();
              }}
              variant={isFollowing ? "ghost" : "solid"}
            />
            {chatUnlocked ? (
              <PrimaryButton
                label={copy.message}
                onPress={() => {
                  void handleStartDirectChat();
                }}
                variant="ghost"
              />
            ) : isFollowing ? (
              <View style={styles.messageHintCard}>
                <Text style={styles.messageHintText}>
                  {followsBack ? copy.directChatSyncing : copy.directChatNeedsFollowBack}
                </Text>
              </View>
            ) : null}
            <CallButtons navigation={navigation} userId={activeProfileUser.id} />
            <Pressable
              accessibilityLabel={copy.reportAction}
              hitSlop={8}
              onPress={() => openReportSheet({ entityType: "user", entityId: activeProfileUser.id, ownerId: activeProfileUser.id })}
              style={styles.reportButton}
            >
              <Ionicons color={palette.muted} name="flag-outline" size={20} />
            </Pressable>
          </View>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
        <SectionChip active={activeSection === "posts"} label={`${copy.posts} ${userPosts.length}`} onPress={() => setActiveSection("posts")} />
        <SectionChip active={activeSection === "reels"} label={`${copy.reels} ${userReels.length}`} onPress={() => setActiveSection("reels")} />
        <SectionChip active={activeSection === "shop"} label={`${copy.shop} ${userProducts.length}`} onPress={() => setActiveSection("shop")} />
        <SectionChip active={activeSection === "spaces"} label={`${copy.spaces} ${userCommunities.length}`} onPress={() => setActiveSection("spaces")} />
        {isOwnProfile ? (
          <SectionChip
            active={activeSection === "saved"}
            label={`${copy.saved} ${savedProfilePosts.length + savedReels.length + savedProducts.length}`}
            onPress={() => setActiveSection("saved")}
          />
        ) : null}
      </ScrollView>

      <View style={styles.grid}>
        {sectionItems.length > 0 ? (
          sectionItems.map((item) => (
            <Pressable key={item.id} onPress={item.onPress} style={styles.tile}>
              <Image source={{ uri: item.imageUrl }} style={styles.tileImage} />
              <View style={styles.tileBadge}>
                <Text style={styles.tileBadgeLabel}>{item.badge}</Text>
              </View>
              <View style={styles.tileOverlay}>
                <Text numberOfLines={2} style={styles.tileTitle}>
                  {item.title}
                </Text>
                <Text numberOfLines={1} style={styles.tileSubtitle}>
                  {item.subtitle}
                </Text>
              </View>
            </Pressable>
          ))
        ) : (
          <View style={styles.emptySection}>
            <Ionicons color={palette.muted} name="grid-outline" size={30} />
            <Text style={styles.emptySectionTitle}>{copy.nothingHereYet}</Text>
            <Text style={styles.emptySectionBody}>
              {activeSection === "posts"
                ? copy.homeFeedReadyBody
                : activeSection === "reels"
                  ? copy.emptyReelsBody
                  : activeSection === "shop"
                  ? copy.emptyShopBody
                  : activeSection === "spaces"
                    ? copy.emptySpacesBody
                    : copy.emptySavedBody}
            </Text>
          </View>
        )}
      </View>
    </Screen>
  );
}

function ShortcutChip({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.shortcutChip}>
      <Ionicons color={brandTints.green} name={icon} size={16} />
      <Text style={styles.shortcutLabel}>{label}</Text>
    </Pressable>
  );
}

function SectionChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.sectionChip, active ? styles.sectionChipActive : null]}>
      <Text style={[styles.sectionChipLabel, active ? styles.sectionChipLabelActive : null]}>{label}</Text>
    </Pressable>
  );
}

function getHighlightedStoriesForUser(stories: Story[], userId: string) {
  return [...stories]
    .filter((story) => story.userId === userId && Boolean(story.highlightedAt))
    .sort((left, right) => {
      const leftRank = left.highlightedAt ?? left.createdAt;
      const rightRank = right.highlightedAt ?? right.createdAt;
      return rightRank.localeCompare(leftRank);
    })
    .slice(0, 8);
}

const styles = createThemedStyles({
  content: {
    paddingBottom: 96,
  },
  emptyContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: palette.muted,
    fontSize: 15,
  },
  hero: {
    backgroundColor: "#081018",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.xl,
  },
  heroTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  heroIdentity: {
    flex: 1,
    flexDirection: "row",
    gap: spacing.md,
  },
  avatarWrap: {
    position: "relative",
  },
  avatar: {
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: 44,
    borderWidth: 2,
    height: 88,
    width: 88,
  },
  avatarEditBadge: {
    alignItems: "center",
    backgroundColor: palette.text,
    borderColor: "#081018",
    borderRadius: 12,
    borderWidth: 2,
    bottom: 0,
    height: 24,
    justifyContent: "center",
    position: "absolute",
    right: 0,
    width: 24,
  },
  nameBlock: {
    flex: 1,
    gap: 4,
    paddingTop: 6,
  },
  name: {
    color: palette.text,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  handle: {
    color: palette.textSoft,
    fontSize: 14,
    fontWeight: "700",
  },
  headline: {
    color: palette.accentSoft,
    fontSize: 13,
    fontWeight: "700",
  },
  heroIcon: {
    alignItems: "center",
    backgroundColor: "#101820",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  bio: {
    color: palette.text,
    fontSize: 14,
    lineHeight: 22,
  },
  websiteChip: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(54,224,161,0.08)",
    borderColor: "rgba(54,224,161,0.2)",
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    maxWidth: "100%",
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  websiteLabel: {
    color: palette.accentSoft,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  highlightBlock: {
    gap: spacing.sm,
  },
  highlightTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "800",
  },
  highlightRow: {
    gap: spacing.md,
    paddingRight: spacing.sm,
  },
  highlightCard: {
    alignItems: "center",
    gap: spacing.xs,
    width: 80,
  },
  highlightRing: {
    borderRadius: 32,
    padding: 2.5,
  },
  highlightRingInner: {
    backgroundColor: "#081018",
    borderRadius: 30,
    padding: 2.5,
  },
  highlightImage: {
    borderRadius: 27,
    height: 60,
    width: 60,
  },
  highlightLabel: {
    color: palette.textSoft,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  reportButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 32,
  },
  actionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  shortcutRow: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  shortcutChip: {
    alignItems: "center",
    backgroundColor: "#101820",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
  },
  shortcutLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "700",
  },
  messageHintCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.lg,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  messageHintText: {
    color: palette.textSoft,
    fontSize: 12,
    lineHeight: 18,
  },
  tabRow: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  sectionChip: {
    backgroundColor: "#0c151d",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
  },
  sectionChipActive: {
    backgroundColor: palette.text,
    borderColor: palette.text,
  },
  sectionChipLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "800",
  },
  sectionChipLabelActive: {
    color: "#04070b",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  tile: {
    backgroundColor: "#081018",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: "hidden",
    width: "47.8%",
  },
  tileImage: {
    height: 176,
    width: "100%",
  },
  tileBadge: {
    backgroundColor: "rgba(4,7,11,0.72)",
    borderRadius: radii.pill,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    position: "absolute",
    top: spacing.sm,
  },
  tileBadgeLabel: {
    color: palette.text,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  tileOverlay: {
    gap: 4,
    padding: spacing.md,
  },
  tileTitle: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
  },
  tileSubtitle: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  emptySection: {
    alignItems: "center",
    backgroundColor: "#09131b",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xl,
    width: "100%",
  },
  emptySectionTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  emptySectionBody: {
    color: palette.textSoft,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
});
