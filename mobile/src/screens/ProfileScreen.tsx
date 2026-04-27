import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { StatPill } from "../components/StatPill";
import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { Product, Reel, Story } from "../types/models";
import { palette, radii, spacing } from "../theme";

type ProfileSection = "reels" | "shop" | "spaces" | "saved";

export function ProfileScreen({ navigation, route }: { navigation: any; route?: { params?: { userId?: string } } }) {
  const {
    language,
    currentUser,
    stories,
    reels,
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
  const rootNavigation = navigation.getParent?.() ?? navigation;
  const userId = route?.params?.userId ?? currentUser?.id;
  const profileUser = userId ? getUserById(userId) : null;
  const [activeSection, setActiveSection] = useState<ProfileSection>("reels");

  if (!profileUser) {
    return (
      <Screen contentContainerStyle={styles.emptyContent}>
        <Text style={styles.emptyText}>Profile not found.</Text>
      </Screen>
    );
  }

  const activeProfileUser = profileUser;
  const isOwnProfile = activeProfileUser.id === currentUser?.id;
  const userReels = reels.filter((item) => item.userId === activeProfileUser.id);
  const userProducts = products.filter((item) => item.userId === activeProfileUser.id);
  const userCommunities = communities.filter((item) => item.ownerId === activeProfileUser.id);
  const profileStories = getLatestStoriesForUser(stories, activeProfileUser.id);
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

  const sectionItems = useMemo(() => {
    switch (activeSection) {
      case "shop":
        return userProducts.map((product) => ({
          id: `product-${product.id}`,
          title: product.title,
          subtitle: `$${product.price}`,
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
          badge: community.kind,
          onPress: () => rootNavigation.navigate("CommunityDetails", { communityId: community.id }),
        }));
      case "saved":
        return [
          ...savedReels.map((reel) => ({
            id: `saved-reel-${reel.id}`,
            title: reel.caption,
            subtitle: `${reel.viewCount} views`,
            imageUrl: reel.thumbnailUrl,
            badge: "saved reel",
            onPress: () => rootNavigation.navigate("ReelViewer", { reelId: reel.id }),
          })),
          ...savedProducts.map((product) => ({
            id: `saved-product-${product.id}`,
            title: product.title,
            subtitle: `$${product.price}`,
            imageUrl: product.imageUrl,
            badge: "saved product",
            onPress: () => rootNavigation.navigate("ProductDetails", { productId: product.id }),
          })),
        ];
      case "reels":
      default:
        return userReels.map((reel) => ({
          id: `reel-${reel.id}`,
          title: reel.caption,
          subtitle: `${reel.viewCount} views`,
          imageUrl: reel.thumbnailUrl,
          badge: getBoostForReel(reel.id)?.status === "active" ? "boost live" : "reel",
          onPress: () => rootNavigation.navigate("ReelViewer", { reelId: reel.id }),
        }));
    }
  }, [
    activeSection,
    getBoostForReel,
    rootNavigation,
    savedProducts,
    savedReels,
    userCommunities,
    userProducts,
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
      Alert.alert("Follow unavailable", result.message ?? "This creator could not be followed right now.");
    }
  }

  async function handleChangePhoto() {
    if (!currentUser || !isOwnProfile) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photo access needed", "Allow photo library access so you can update your profile photo.");
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
    if (!asset.base64) {
      Alert.alert("Image issue", "The selected photo could not be prepared. Try another image.");
      return;
    }

    const mimeType = asset.mimeType || "image/jpeg";
    const update = await updateProfile({
      name: currentUser.name,
      username: currentUser.username,
      headline: currentUser.headline,
      bio: currentUser.bio,
      profileImage: `data:${mimeType};base64,${asset.base64}`,
    });

    if (!update.ok) {
      Alert.alert("Photo blocked", update.message ?? "This profile photo could not be updated.");
      return;
    }

    Alert.alert("Profile photo updated");
  }

  async function handleStartDirectChat() {
    const result = await startDirectChat(activeProfileUser.id);
    if (!result.ok || !result.threadId) {
      Alert.alert("Direct chat unavailable", result.message ?? "This chat is locked right now.");
      return;
    }

    rootNavigation.navigate("DirectChat", { threadId: result.threadId });
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
            <Pressable onPress={() => rootNavigation.navigate("Notifications")} style={styles.heroIcon}>
              <Ionicons color={palette.text} name="notifications-outline" size={22} />
            </Pressable>
          ) : null}
        </View>

        <Text style={styles.bio}>{activeProfileUser.bio}</Text>

        <View style={styles.statsRow}>
          <StatPill label={copy.posts} value={activeProfileUser.reelIds.length + activeProfileUser.productIds.length} />
          <StatPill label={copy.followers} value={activeProfileUser.followers.length} />
          <StatPill label={copy.followingCount} value={activeProfileUser.following.length} />
        </View>

        {profileStories.length > 0 ? (
          <View style={styles.highlightBlock}>
            <Text style={styles.highlightTitle}>Highlights</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.highlightRow}>
              {profileStories.map((story) => (
                <View key={story.id} style={styles.highlightCard}>
                  <Image source={{ uri: story.imageUrl }} style={styles.highlightImage} />
                  <Text numberOfLines={1} style={styles.highlightLabel}>
                    {story.caption?.trim() ? story.caption : "Story"}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {isOwnProfile ? (
          <>
            <View style={styles.actionRow}>
              <PrimaryButton label={copy.editProfile} onPress={() => rootNavigation.navigate("EditProfile")} />
              <PrimaryButton label="Communities" onPress={() => rootNavigation.navigate("Communities")} variant="ghost" />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shortcutRow}>
              <ShortcutChip
                icon="paper-plane-outline"
                label={totalDirectUnreadCount > 0 ? `Direct ${totalDirectUnreadCount}` : "Direct"}
                onPress={() => rootNavigation.navigate("DirectInbox")}
              />
              <ShortcutChip
                icon="chatbubbles-outline"
                label={totalMarketplaceUnreadCount > 0 ? `Marketplace ${totalMarketplaceUnreadCount}` : "Marketplace"}
                onPress={() => rootNavigation.navigate("MarketplaceInbox")}
              />
              <ShortcutChip icon="sparkles-outline" label="AI tools" onPress={() => rootNavigation.navigate("AITools")} />
              <ShortcutChip icon="card-outline" label="Subscription" onPress={() => rootNavigation.navigate("Subscription")} />
              <ShortcutChip icon="log-out-outline" label="Logout" onPress={logout} />
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
                label="Message"
                onPress={() => {
                  void handleStartDirectChat();
                }}
                variant="ghost"
              />
            ) : isFollowing ? (
              <View style={styles.messageHintCard}>
                <Text style={styles.messageHintText}>
                  {followsBack ? "Direct chat is syncing right now. Try again." : "Chat unlocks after this creator follows you back."}
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
        <SectionChip active={activeSection === "reels"} label={`Reels ${userReels.length}`} onPress={() => setActiveSection("reels")} />
        <SectionChip active={activeSection === "shop"} label={`Shop ${userProducts.length}`} onPress={() => setActiveSection("shop")} />
        <SectionChip active={activeSection === "spaces"} label={`Spaces ${userCommunities.length}`} onPress={() => setActiveSection("spaces")} />
        {isOwnProfile ? (
          <SectionChip
            active={activeSection === "saved"}
            label={`Saved ${savedReels.length + savedProducts.length}`}
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
            <Text style={styles.emptySectionTitle}>Nothing here yet</Text>
            <Text style={styles.emptySectionBody}>
              {activeSection === "reels"
                ? "Publish a reel and it will appear in this profile grid."
                : activeSection === "shop"
                  ? "Create a marketplace listing and it will show up here."
                  : activeSection === "spaces"
                    ? "Create a page, group, or channel and it will appear here."
                    : "Save a reel or product and it will appear here."}
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
      <Ionicons color={palette.text} name={icon} size={16} />
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

function getLatestStoriesForUser(stories: Story[], userId: string) {
  const now = Date.now();
  return [...stories]
    .filter((story) => story.userId === userId && new Date(story.expiresAt).getTime() > now)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 5);
}

const styles = StyleSheet.create({
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
  highlightImage: {
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 30,
    borderWidth: 2,
    height: 60,
    width: 60,
  },
  highlightLabel: {
    color: palette.textSoft,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  actionRow: {
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
