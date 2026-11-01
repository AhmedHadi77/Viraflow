import { Ionicons } from "@expo/vector-icons";
import { sizedImageUrl } from "../services/mediaUpload";
import { Avatar } from "../components/Avatar";
import { communityKindLabel, fill } from "../utils/labels";
import { rtlFlipStyle } from "../utils/layoutDirection";
import { SOHBA_SHARE_LINK } from "../data/links";
import { openReportSheet } from "../components/ReportSheet";
import { CallButtons } from "../components/CallButtons";
import { useProductPriceFormatter } from "../utils/priceFormatting";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Linking, Modal, Pressable, ScrollView, Share, Text, View } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { StatPill } from "../components/StatPill";
import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { Post, Product, Reel, Story, User } from "../types/models";
import { palette, radii, spacing, createThemedStyles } from "../theme";
import { PAYMENTS_ENABLED } from "../data/catalog";
import { GradientIconButton } from "../components/GradientIcon";

type ProfileSection = "posts" | "reels" | "shop" | "spaces" | "saved";

// The text new accounts start with; shown in the reader's language instead.
const DEFAULT_BIO_TEXT = "New creator on Sohba.";
const DEFAULT_HEADLINE_TEXT = "Creator in progress";

export function ProfileScreen({ navigation, route }: { navigation: any; route?: { params?: { userId?: string } } }) {
  const { language, currentUser, getUserById, loadUserProfile } = useAppState();
  const copy = getCopy(language);
  const userId = route?.params?.userId ?? currentUser?.id;
  const profileUser = userId ? getUserById(userId) : null;
  const [lookupDone, setLookupDone] = useState(false);

  // Profiles opened from a list, notification or link may not be loaded yet: fetch them.
  useEffect(() => {
    if (!userId || profileUser) {
      return;
    }
    let active = true;
    setLookupDone(false);
    void loadUserProfile(userId).finally(() => {
      if (active) {
        setLookupDone(true);
      }
    });
    return () => {
      active = false;
    };
    // loadUserProfile changes identity every render; only re-run when the profile being looked up changes.
  }, [Boolean(profileUser), userId]);

  if (!profileUser) {
    return (
      <Screen contentContainerStyle={styles.emptyContent}>
        {lookupDone || !userId ? (
          <Text style={styles.emptyText}>{copy.profileNotFound}</Text>
        ) : (
          <ActivityIndicator color={palette.primary} size="large" />
        )}
      </Screen>
    );
  }

  return <ProfileContent key={profileUser.id} navigation={navigation} profileUser={profileUser} />;
}

function ProfileContent({ navigation, profileUser }: { navigation: any; profileUser: User }) {
  const {
    language,
    currentUser,
    stories,
    reels,
    posts,
    products,
    communities,
    savedPosts,
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
  const [activeSection, setActiveSection] = useState<ProfileSection>("posts");
  const [menuOpen, setMenuOpen] = useState(false);

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

  function openFromMenu(routeName: string) {
    setMenuOpen(false);
    rootNavigation.navigate(routeName);
  }

  async function handleShareProfile() {
    try {
      await Share.share({
        message: fill(copy.shareProfileMessage, { name: activeProfileUser.name, username: activeProfileUser.username, link: SOHBA_SHARE_LINK }),
      });
    } catch {
      // Closing the share sheet is not an error.
    }
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
      {isOwnProfile ? (
        <View style={styles.topBar}>
          <Text numberOfLines={1} style={styles.topBarHandle}>
            @{activeProfileUser.username}
          </Text>
          <View style={styles.topBarActions}>
            <GradientIconButton accessibilityLabel={copy.shareProfile} icon="share-outline" onPress={() => void handleShareProfile()} />
            <GradientIconButton
              accessibilityLabel={copy.menu}
              badge={totalDirectUnreadCount + totalMarketplaceUnreadCount > 0 ? "•" : undefined}
              icon="menu-outline"
              onPress={() => setMenuOpen(true)}
            />
          </View>
        </View>
      ) : null}
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
              <Avatar name={activeProfileUser.name} style={styles.avatar} uri={activeProfileUser.profileImage} />
              {isOwnProfile ? (
                <View style={styles.avatarEditBadge}>
                  <Ionicons color="#ffffff" name="camera-outline" size={14} />
                </View>
              ) : null}
            </Pressable>

            <View style={styles.nameBlock}>
              <Text style={styles.name}>{activeProfileUser.name}</Text>
              <Text style={styles.handle}>@{activeProfileUser.username}</Text>
              {activeProfileUser.headline ? (
                <Text style={styles.headline}>
                  {activeProfileUser.headline === DEFAULT_HEADLINE_TEXT ? copy.defaultHeadline : activeProfileUser.headline}
                </Text>
              ) : null}
            </View>
          </View>

        </View>

        <Text style={styles.bio}>{activeProfileUser.bio === DEFAULT_BIO_TEXT || activeProfileUser.bio === "New creator on Pulseora." ? copy.defaultBio : activeProfileUser.bio}</Text>
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
                  <LinearGradient colors={[palette.borderStrong, palette.borderStrong]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.highlightRing}>
                    <View style={styles.highlightRingInner}>
                      <Image source={{ uri: sizedImageUrl(story.imageUrl, 240) }} style={styles.highlightImage} />
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
              <PrimaryButton label={copy.editProfile} onPress={() => rootNavigation.navigate("EditProfile")} style={styles.actionFlex} variant="contrast" />
              <PrimaryButton label={copy.communities} onPress={() => rootNavigation.navigate("Communities")} style={styles.actionFlex} variant="outline" />
            </View>

          </>
        ) : (
          <View style={styles.publicActions}>
            <View style={styles.actionRow}>
              <View style={styles.actionFlex}>
                <PrimaryButton
                  label={isFollowing ? copy.following : followsBack ? copy.followBack : copy.follow}
                  onPress={() => {
                    void handleFollow();
                  }}
                  variant={isFollowing ? "ghost" : "solid"}
                />
              </View>
              {chatUnlocked ? (
                <View style={styles.actionFlex}>
                  <PrimaryButton
                    label={copy.message}
                    onPress={() => {
                      void handleStartDirectChat();
                    }}
                    variant="ghost"
                  />
                </View>
              ) : null}
            </View>
            <View style={styles.secondaryActionRow}>
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
            {!chatUnlocked ? <Text style={styles.messageHintText}>{copy.chatFollowToMessage}</Text> : null}
          </View>
        )}
      </View>

      <View accessibilityRole="tablist" style={styles.tabRow}>
        <SectionChip active={activeSection === "posts"} label={copy.posts} onPress={() => setActiveSection("posts")} />
        <SectionChip active={activeSection === "reels"} label={copy.reels} onPress={() => setActiveSection("reels")} />
        <SectionChip active={activeSection === "shop"} label={copy.shop} onPress={() => setActiveSection("shop")} />
        <SectionChip active={activeSection === "spaces"} label={copy.spaces} onPress={() => setActiveSection("spaces")} />
        {isOwnProfile ? (
          <SectionChip
            active={activeSection === "saved"}
            label={copy.saved}
            onPress={() => setActiveSection("saved")}
          />
        ) : null}
      </View>

      <View style={styles.grid}>
        {sectionItems.length > 0 ? (
          sectionItems.map((item) => (
            <Pressable key={item.id} onPress={item.onPress} style={styles.tile}>
              <Image source={{ uri: sizedImageUrl(item.imageUrl, 420) }} style={styles.tileImage} />
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
      <Modal animationType="slide" onRequestClose={() => setMenuOpen(false)} transparent visible={menuOpen}>
        <Pressable onPress={() => setMenuOpen(false)} style={styles.sheetBackdrop}>
          <Pressable onPress={() => undefined} style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <MenuRow icon="notifications-outline" label={copy.notifications} onPress={() => openFromMenu("Notifications")} />
            <MenuRow count={totalDirectUnreadCount} icon="paper-plane-outline" label={copy.messages} onPress={() => openFromMenu("DirectInbox")} />
            <MenuRow count={totalMarketplaceUnreadCount} icon="storefront-outline" label={copy.marketplaceInbox} onPress={() => openFromMenu("MarketplaceInbox")} />
            <MenuRow icon="bookmark-outline" label={copy.saved} onPress={() => { setMenuOpen(false); setActiveSection("saved"); }} />
            <MenuRow icon="sparkles-outline" label={copy.aiTools} onPress={() => openFromMenu("AITools")} />
            {PAYMENTS_ENABLED ? <MenuRow icon="card-outline" label={copy.subscription} onPress={() => openFromMenu("Subscription")} /> : null}
            {currentUser?.role === "admin" ? (
              <MenuRow icon="shield-checkmark-outline" label={copy.adminTitle} onPress={() => openFromMenu("Admin")} />
            ) : null}
            <MenuRow icon="settings-outline" label={copy.settingsTitle} onPress={() => openFromMenu("Settings")} />
            <MenuRow
              danger
              icon="log-out-outline"
              label={copy.logout}
              onPress={() => {
                setMenuOpen(false);
                logout();
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
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
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.sectionChip, active ? styles.sectionChipActive : null]}
    >
      <Text adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={1} style={[styles.sectionChipLabel, active ? styles.sectionChipLabelActive : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  count,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  count?: number;
  danger?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.menuRow, pressed ? styles.menuRowPressed : null]}>
      <View style={[styles.menuIcon, danger ? styles.menuIconDanger : null]}>
        <Ionicons color={danger ? palette.danger : palette.text} name={icon} size={19} />
      </View>
      <Text style={[styles.menuLabel, danger ? styles.menuLabelDanger : null]}>{label}</Text>
      {count ? (
        <View style={styles.menuCount}>
          <Text style={styles.menuCountLabel}>{count}</Text>
        </View>
      ) : danger ? null : (
        <Ionicons color={palette.mutedSoft} name="chevron-forward" size={18} style={rtlFlipStyle} />
      )}
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
    gap: spacing.lg,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.sm,
  },
  heroTopRow: {
    alignItems: "center",
    position: "relative",
  },
  heroIdentity: {
    alignItems: "center",
    gap: spacing.md,
  },
  avatarWrap: {
    position: "relative",
  },
  avatar: {
    borderRadius: 48,
    height: 96,
    width: 96,
  },
  avatarEditBadge: {
    alignItems: "center",
    backgroundColor: palette.primary,
    borderColor: palette.background,
    borderRadius: 14,
    borderWidth: 3,
    bottom: 0,
    height: 28,
    justifyContent: "center",
    position: "absolute",
    right: 0,
    width: 28,
  },
  nameBlock: {
    alignItems: "center",
    gap: 4,
  },
  name: {
    color: palette.text,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  handle: {
    color: palette.muted,
    fontSize: 14,
    textAlign: "center",
  },
  headline: {
    color: palette.textSoft,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  heroIcon: {
    alignItems: "center",
    backgroundColor: "#151922",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  bio: {
    color: palette.textSoft,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  websiteChip: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(31,91,255,0.08)",
    borderColor: "rgba(31,91,255,0.2)",
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
    backgroundColor: palette.surface,
    borderRadius: 18,
    flexDirection: "row",
    paddingVertical: spacing.sm,
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
    backgroundColor: "#151922",
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
  actionFlex: {
    flex: 1,
  },
  publicActions: {
    gap: spacing.sm,
  },
  secondaryActionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: spacing.xs,
  },
  topBarHandle: {
    color: palette.text,
    flex: 1,
    fontSize: 17,
    fontWeight: "800",
  },
  topBarActions: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  sheetBackdrop: {
    backgroundColor: palette.overlay,
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: palette.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: 2,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  sheetHandle: {
    alignSelf: "center",
    backgroundColor: palette.borderStrong,
    borderRadius: 3,
    height: 5,
    marginBottom: spacing.sm,
    width: 40,
  },
  menuRow: {
    alignItems: "center",
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 54,
    paddingHorizontal: spacing.sm,
  },
  menuRowPressed: {
    backgroundColor: palette.surface,
  },
  menuIcon: {
    alignItems: "center",
    backgroundColor: palette.surfaceMuted,
    borderRadius: 19,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  menuIconDanger: {
    backgroundColor: "rgba(255,92,92,0.12)",
  },
  menuLabel: {
    color: palette.text,
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  menuLabelDanger: {
    color: palette.danger,
  },
  menuCount: {
    alignItems: "center",
    backgroundColor: palette.primary,
    borderRadius: 11,
    height: 22,
    justifyContent: "center",
    minWidth: 22,
    paddingHorizontal: 6,
  },
  menuCountLabel: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  notifyButton: {
    position: "absolute",
    right: 0,
    top: 0,
  },
  shortcutRow: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  shortcutChip: {
    alignItems: "center",
    backgroundColor: "#151922",
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
    backgroundColor: palette.surfaceMuted,
    borderRadius: 16,
    flexDirection: "row",
    gap: 4,
    padding: 4,
  },
  tabScroller: {
    flexGrow: 0,
  },
  sectionChip: {
    alignItems: "center",
    borderRadius: 12,
    flex: 1,
    height: 38,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  sectionChipActive: {
    backgroundColor: palette.background,
    elevation: 1,
    shadowColor: "#0d1117",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  sectionChipLabel: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  sectionChipLabelActive: {
    color: palette.text,
    fontWeight: "800",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  tile: {
    backgroundColor: "#151922",
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
    backgroundColor: "#151922",
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
