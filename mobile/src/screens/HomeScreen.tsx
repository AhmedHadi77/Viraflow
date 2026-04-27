import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ProductCard } from "../components/ProductCard";
import { ReelCard } from "../components/ReelCard";
import { Screen } from "../components/Screen";
import { useAppState } from "../providers/AppProvider";
import { Story } from "../types/models";
import { palette, radii, spacing } from "../theme";

export function HomeScreen({ navigation }: { navigation: any }) {
  const {
    currentUser,
    notifications,
    users,
    stories,
    reels,
    products,
    communities,
    getUserById,
    getCommentsForReel,
    isReelSaved,
    toggleSaveReel,
    getBoostForReel,
    getTotalDirectUnreadCount,
    toggleLike,
    repostReel,
    toggleFollow,
    createStory,
  } = useAppState();
  const rootNavigation = navigation.getParent?.() ?? navigation;
  const creators = users.filter((item) => item.id !== currentUser?.id).slice(0, 8);
  const latestStories = getLatestStories(stories);
  const currentUserStory = currentUser ? latestStories.find((story) => story.userId === currentUser.id) : undefined;
  const otherStories = latestStories.filter((story) => story.userId !== currentUser?.id);
  const sortedReels = [...reels].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const featuredProducts = [...products].sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 3);
  const unreadNotifications = notifications.filter((item) => item.userId === currentUser?.id && !item.readAt).length;
  const totalDirectUnreadCount = getTotalDirectUnreadCount();

  async function handleLike(reelId: string) {
    const result = await toggleLike(reelId);
    if (!result.ok) {
      Alert.alert("Like unavailable", result.message ?? "This reel could not be liked right now.");
    }
  }

  async function handleRepost(reelId: string) {
    const result = await repostReel(reelId);
    if (!result.ok) {
      Alert.alert("Repost unavailable", result.message ?? "This reel could not be reposted right now.");
    }
  }

  async function handleFollow(userId: string) {
    const result = await toggleFollow(userId);
    if (!result.ok) {
      Alert.alert("Follow unavailable", result.message ?? "This creator could not be followed right now.");
    }
  }

  async function handleSave(reelId: string) {
    const result = await toggleSaveReel(reelId);
    if (!result.ok) {
      Alert.alert("Save unavailable", result.message ?? "This reel could not be saved right now.");
    }
  }

  async function handleAddStory() {
    if (!currentUser) {
      Alert.alert("Login required", "You need to be logged in to post a story.");
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photo access needed", "Allow photo library access so you can post a story from your phone.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.55,
      base64: true,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    const mimeType = asset.mimeType || "image/jpeg";
    const imageUrl = asset.base64 ? `data:${mimeType};base64,${asset.base64}` : asset.uri;
    const creation = await createStory({
      imageUrl,
      caption: "",
    });

    if (!creation.ok) {
      Alert.alert("Story unavailable", creation.message ?? "This story could not be posted right now.");
      return;
    }

    Alert.alert("Story posted", "Your story is now live on the home screen.");
  }

  return (
    <Screen scrollable contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <Text style={styles.brand}>Pulseora</Text>
        <View style={styles.topActions}>
          <IconBubble
            badge={totalDirectUnreadCount > 0 ? String(totalDirectUnreadCount) : undefined}
            icon="paper-plane-outline"
            onPress={() => rootNavigation.navigate("DirectInbox")}
          />
          <IconBubble
            badge={unreadNotifications > 0 ? String(unreadNotifications) : undefined}
            icon="heart-outline"
            onPress={() => rootNavigation.navigate("Notifications")}
          />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storyRow}>
        {currentUser ? (
          <Pressable
            onPress={() => {
              void handleAddStory();
            }}
            style={styles.storyCard}
          >
            <View style={styles.storyAvatarWrap}>
              <Image source={{ uri: currentUserStory?.imageUrl || currentUser.profileImage }} style={styles.storyAvatar} />
              <View style={styles.storyAddBadge}>
                <Ionicons color="#05080d" name="add" size={14} />
              </View>
            </View>
            <Text numberOfLines={1} style={styles.storyLabel}>
              Your story
            </Text>
          </Pressable>
        ) : null}

        {otherStories.map((story) => {
          const creator = getUserById(story.userId);
          if (!creator) {
            return null;
          }

          return (
            <Pressable
              key={story.id}
              onPress={() => rootNavigation.navigate("PublicProfile", { userId: creator.id })}
              style={styles.storyCard}
            >
              <View style={styles.storyRing}>
                <Image source={{ uri: story.imageUrl }} style={styles.storyAvatar} />
              </View>
              <Text numberOfLines={1} style={styles.storyLabel}>
                {creator.username}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.quickComposer}>
        <Image source={{ uri: currentUser?.profileImage }} style={styles.quickComposerAvatar} />
        <Pressable onPress={() => navigation.navigate("Create", { initialMode: "reel" })} style={styles.quickComposerInput}>
          <Text style={styles.quickComposerText}>Start a reel, share a drop, or post to your audience...</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate("Create", { initialMode: "reel" })} style={styles.quickComposerAction}>
          <Ionicons color={palette.text} name="play-circle-outline" size={20} />
        </Pressable>
        <Pressable onPress={() => navigation.navigate("Create", { initialMode: "product" })} style={styles.quickComposerAction}>
          <Ionicons color={palette.text} name="bag-handle-outline" size={19} />
        </Pressable>
      </View>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Creators to watch</Text>
        <Pressable onPress={() => rootNavigation.navigate("Communities")}>
          <Text style={styles.sectionLink}>Spaces</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.creatorRow}>
        {creators.map((creator) => (
          <Pressable
            key={creator.id}
            onPress={() => rootNavigation.navigate("PublicProfile", { userId: creator.id })}
            style={styles.creatorChip}
          >
            <Image source={{ uri: creator.profileImage }} style={styles.creatorChipAvatar} />
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

      <View style={styles.feed}>
        {sortedReels.map((reel, index) => {
          const creator = getUserById(reel.userId);
          const boost = getBoostForReel(reel.id);
          if (!creator) {
            return null;
          }

          return (
            <View key={reel.id} style={styles.feedBlock}>
              <ReelCard
                boostLabel={boost?.status === "active" ? "Boost live" : undefined}
                commentCount={getCommentsForReel(reel.id).length}
                creator={creator}
                currentUserId={currentUser?.id}
                onComment={() => rootNavigation.navigate("ReelDetails", { reelId: reel.id })}
                onLike={() => {
                  void handleLike(reel.id);
                }}
                onOpen={() => rootNavigation.navigate("ReelViewer", { reelId: reel.id })}
                onRepost={() => {
                  void handleRepost(reel.id);
                }}
                onSave={() => {
                  void handleSave(reel.id);
                }}
                onToggleFollow={
                  creator.id === currentUser?.id
                    ? undefined
                    : () => {
                        void handleFollow(creator.id);
                      }
                }
                playVideo={index === 0}
                reel={reel}
                saved={isReelSaved(reel.id)}
              />

              {index === 1 && featuredProducts.length > 0 ? (
                <View style={styles.inlineStrip}>
                  <View style={styles.sectionRow}>
                    <Text style={styles.sectionTitle}>Marketplace picks</Text>
                    <Pressable onPress={() => navigation.navigate("Marketplace")}>
                      <Text style={styles.sectionLink}>See all</Text>
                    </Pressable>
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productRow}>
                    {featuredProducts.map((product) => {
                      const seller = getUserById(product.userId);
                      if (!seller) {
                        return null;
                      }

                      return (
                        <View key={product.id} style={styles.productCardWrap}>
                          <ProductCard
                            onPress={() => rootNavigation.navigate("ProductDetails", { productId: product.id })}
                            onSellerPress={() => rootNavigation.navigate("PublicProfile", { userId: seller.id })}
                            product={product}
                            seller={seller}
                          />
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}

              {index === 2 && communities[0] ? (
                <Pressable
                  onPress={() => rootNavigation.navigate("CommunityDetails", { communityId: communities[0].id })}
                  style={styles.communitySpotlight}
                >
                  <Image source={{ uri: communities[0].coverImage }} style={styles.communitySpotlightImage} />
                  <View style={styles.communitySpotlightOverlay}>
                    <Text style={styles.communitySpotlightKicker}>{communities[0].kind}</Text>
                    <Text style={styles.communitySpotlightTitle}>{communities[0].name}</Text>
                    <Text numberOfLines={2} style={styles.communitySpotlightBody}>
                      {communities[0].description}
                    </Text>
                  </View>
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>
    </Screen>
  );
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

function IconBubble({
  icon,
  badge,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  badge?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.iconBubble}>
      <Ionicons color={palette.text} name={icon} size={22} />
      {badge ? (
        <View style={styles.iconBadge}>
          <Text style={styles.iconBadgeLabel}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 96,
    paddingTop: spacing.sm,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  brand: {
    color: palette.text,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.7,
  },
  topActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  iconBubble: {
    alignItems: "center",
    backgroundColor: "#0b1218",
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
    backgroundColor: "#ff4d67",
    borderColor: "#05080d",
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
    borderColor: "rgba(255,122,47,0.85)",
    borderRadius: 38,
    borderWidth: 2.5,
    padding: 3,
  },
  storyAvatar: {
    backgroundColor: "#111820",
    borderRadius: 34,
    height: 68,
    width: 68,
  },
  storyAddBadge: {
    alignItems: "center",
    backgroundColor: palette.text,
    borderColor: "#05080d",
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
    fontWeight: "700",
    textAlign: "center",
  },
  quickComposer: {
    alignItems: "center",
    backgroundColor: "#0a1117",
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
    backgroundColor: "#101820",
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
    backgroundColor: "#101820",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  sectionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "900",
  },
  sectionLink: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "800",
  },
  creatorRow: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  creatorChip: {
    alignItems: "center",
    backgroundColor: "#0a1117",
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
  feed: {
    gap: spacing.xl,
  },
  feedBlock: {
    gap: spacing.md,
  },
  inlineStrip: {
    gap: spacing.sm,
  },
  productRow: {
    gap: spacing.md,
    paddingRight: spacing.sm,
  },
  productCardWrap: {
    width: 286,
  },
  communitySpotlight: {
    borderRadius: 28,
    overflow: "hidden",
  },
  communitySpotlightImage: {
    height: 220,
    width: "100%",
  },
  communitySpotlightOverlay: {
    backgroundColor: "rgba(4,7,11,0.72)",
    bottom: 0,
    gap: spacing.xs,
    left: 0,
    padding: spacing.lg,
    position: "absolute",
    right: 0,
  },
  communitySpotlightKicker: {
    color: palette.accentSoft,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  communitySpotlightTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: "900",
  },
  communitySpotlightBody: {
    color: palette.textSoft,
    fontSize: 14,
    lineHeight: 20,
  },
});
