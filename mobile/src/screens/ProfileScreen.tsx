import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { StatPill } from "../components/StatPill";
import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { palette, radii, spacing } from "../theme";

export function ProfileScreen({ navigation, route }: { navigation: any; route?: { params?: { userId?: string } } }) {
  const {
    language,
    currentUser,
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
  const isFollowing = currentUser ? activeProfileUser.followers.includes(currentUser.id) : false;
  const followsBack = currentUser ? activeProfileUser.following.includes(currentUser.id) : false;
  const chatUnlocked = currentUser ? canDirectMessageUser(activeProfileUser.id) : false;
  const savedByCurrentUser = currentUser ? savedPosts.filter((item) => item.userId === currentUser.id) : [];
  const savedReels = savedByCurrentUser
    .filter((item) => item.entityType === "reel")
    .map((item) => reels.find((reel) => reel.id === item.entityId))
    .filter((item): item is (typeof reels)[number] => Boolean(item));
  const savedProducts = savedByCurrentUser
    .filter((item) => item.entityType === "product")
    .map((item) => products.find((product) => product.id === item.entityId))
    .filter((item): item is (typeof products)[number] => Boolean(item));
  const totalDirectUnreadCount = getTotalDirectUnreadCount();
  const totalMarketplaceUnreadCount = getTotalMarketplaceUnreadCount();

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
    <Screen scrollable>
      <LinearGradient colors={["rgba(255,122,47,0.18)", "rgba(54,224,161,0.12)", "rgba(255,255,255,0.02)"]} style={styles.headerCard}>
        <View style={styles.profileRow}>
          <Image source={{ uri: activeProfileUser.profileImage }} style={styles.avatar} />
          <View style={styles.profileCopy}>
            <View style={styles.planBadge}>
              <Text style={styles.planLabel}>{activeProfileUser.planType}</Text>
            </View>
            <Text style={styles.name}>{activeProfileUser.name}</Text>
            <Text style={styles.handle}>@{activeProfileUser.username}</Text>
            <Text style={styles.headline}>{activeProfileUser.headline}</Text>
          </View>
        </View>
        <Text style={styles.bio}>{activeProfileUser.bio}</Text>
        <View style={styles.statsRow}>
          <StatPill label={copy.posts} value={activeProfileUser.reelIds.length + activeProfileUser.productIds.length} />
          <StatPill label={copy.followers} value={activeProfileUser.followers.length} />
          <StatPill label={copy.followingCount} value={activeProfileUser.following.length} />
        </View>

        {isOwnProfile ? (
          <View style={styles.actions}>
            <PrimaryButton
              label="Change photo"
              onPress={() => {
                void handleChangePhoto();
              }}
              variant="ghost"
            />
            <PrimaryButton label={copy.editProfile} onPress={() => rootNavigation.navigate("EditProfile")} />
            <PrimaryButton label={copy.subscription} onPress={() => rootNavigation.navigate("Subscription")} variant="ghost" />
            <PrimaryButton label={copy.aiTools} onPress={() => rootNavigation.navigate("AITools")} variant="ghost" />
            <PrimaryButton label="Pages, groups, channels" onPress={() => rootNavigation.navigate("Communities")} variant="ghost" />
            <PrimaryButton
              label={totalDirectUnreadCount > 0 ? `Direct messages (${totalDirectUnreadCount})` : "Direct messages"}
              onPress={() => rootNavigation.navigate("DirectInbox")}
              variant="ghost"
            />
            <PrimaryButton
              label={
                totalMarketplaceUnreadCount > 0 ? `Marketplace inbox (${totalMarketplaceUnreadCount})` : "Marketplace inbox"
              }
              onPress={() => rootNavigation.navigate("MarketplaceInbox")}
              variant="ghost"
            />
            <PrimaryButton label={copy.notifications} onPress={() => rootNavigation.navigate("Notifications")} variant="ghost" />
            <PrimaryButton label={copy.logout} onPress={logout} variant="ghost" />
          </View>
        ) : (
          <View style={styles.actions}>
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
              <Text style={styles.chatHint}>
                {followsBack
                  ? "Direct chat is syncing right now. Try again."
                  : "Chat unlocks after this creator follows you back."}
              </Text>
            ) : null}
          </View>
        )}
      </LinearGradient>

      <SectionTitle title={copy.recommendedReels} />
      <View style={styles.grid}>
        {userReels.map((reel) => (
          <Pressable key={reel.id} onPress={() => rootNavigation.navigate("ReelDetails", { reelId: reel.id })} style={styles.tile}>
            <Image source={{ uri: reel.thumbnailUrl }} style={styles.tileImage} />
            {getBoostForReel(reel.id)?.status === "active" ? (
              <View style={styles.tileBadge}>
                <Text style={styles.tileBadgeLabel}>Boost live</Text>
              </View>
            ) : null}
            <Text numberOfLines={2} style={styles.tileTitle}>
              {reel.caption}
            </Text>
          </Pressable>
        ))}
      </View>

      <SectionTitle title={copy.suggestedProducts} />
      <View style={styles.grid}>
        {userProducts.map((product) => (
          <Pressable
            key={product.id}
            onPress={() => rootNavigation.navigate("ProductDetails", { productId: product.id })}
            style={styles.tile}
          >
            <Image source={{ uri: product.imageUrl }} style={styles.tileImage} />
            <Text numberOfLines={2} style={styles.tileTitle}>
              {product.title}
            </Text>
          </Pressable>
        ))}
      </View>

      <SectionTitle title="Pages, groups and channels" subtitle="Community spaces created by this profile." />
      {userCommunities.length === 0 ? (
        <View style={styles.emptySavedCard}>
          <Text style={styles.emptySavedTitle}>No spaces created yet</Text>
          <Text style={styles.emptySavedBody}>Create a page, group, or channel and it will show up here.</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {userCommunities.map((community) => (
            <Pressable
              key={community.id}
              onPress={() => rootNavigation.navigate("CommunityDetails", { communityId: community.id })}
              style={styles.tile}
            >
              <Image source={{ uri: community.coverImage }} style={styles.tileImage} />
              <View style={styles.savedBadge}>
                <Text style={styles.savedBadgeLabel}>{community.kind}</Text>
              </View>
              <Text numberOfLines={2} style={styles.tileTitle}>
                {community.name}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {isOwnProfile ? (
        <>
          <SectionTitle title="Saved posts" subtitle="Reels and marketplace items you kept for later." />
          {savedReels.length === 0 && savedProducts.length === 0 ? (
            <View style={styles.emptySavedCard}>
              <Text style={styles.emptySavedTitle}>No saved content yet</Text>
              <Text style={styles.emptySavedBody}>Save a reel or product from its details screen and it will appear here.</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {savedReels.map((reel) => (
                <Pressable
                  key={`saved-reel-${reel.id}`}
                  onPress={() => rootNavigation.navigate("ReelDetails", { reelId: reel.id })}
                  style={styles.tile}
                >
                  <Image source={{ uri: reel.thumbnailUrl }} style={styles.tileImage} />
                  <View style={styles.savedBadge}>
                    <Text style={styles.savedBadgeLabel}>Saved reel</Text>
                  </View>
                  <Text numberOfLines={2} style={styles.tileTitle}>
                    {reel.caption}
                  </Text>
                </Pressable>
              ))}
              {savedProducts.map((product) => (
                <Pressable
                  key={`saved-product-${product.id}`}
                  onPress={() => rootNavigation.navigate("ProductDetails", { productId: product.id })}
                  style={styles.tile}
                >
                  <Image source={{ uri: product.imageUrl }} style={styles.tileImage} />
                  <View style={styles.savedBadge}>
                    <Text style={styles.savedBadgeLabel}>Saved product</Text>
                  </View>
                  <Text numberOfLines={2} style={styles.tileTitle}>
                    {product.title}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: palette.muted,
    fontSize: 15,
  },
  headerCard: {
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.xl,
  },
  profileRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderColor: "rgba(255,255,255,0.32)",
    borderWidth: 2,
  },
  profileCopy: {
    flex: 1,
    gap: 4,
  },
  planBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderColor: "rgba(255,255,255,0.16)",
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  planLabel: {
    color: palette.textSoft,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  name: {
    color: palette.text,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  handle: {
    color: palette.accentSoft,
    fontSize: 14,
    fontWeight: "700",
  },
  headline: {
    color: palette.textSoft,
    fontSize: 14,
  },
  bio: {
    color: palette.text,
    fontSize: 15,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actions: {
    gap: spacing.sm,
  },
  grid: {
    gap: spacing.md,
  },
  tile: {
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: "hidden",
  },
  tileBadge: {
    position: "absolute",
    right: spacing.md,
    top: spacing.md,
    zIndex: 1,
    backgroundColor: "rgba(54,224,161,0.88)",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  tileBadgeLabel: {
    color: "#071118",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  tileImage: {
    width: "100%",
    height: 190,
  },
  savedBadge: {
    position: "absolute",
    left: spacing.md,
    top: spacing.md,
    zIndex: 1,
    backgroundColor: "rgba(255,122,47,0.92)",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  savedBadgeLabel: {
    color: "#071118",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  tileTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 22,
    padding: spacing.lg,
  },
  emptySavedCard: {
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  emptySavedTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "900",
  },
  emptySavedBody: {
    color: palette.textSoft,
    fontSize: 14,
    lineHeight: 22,
  },
  chatHint: {
    color: palette.textSoft,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
});
