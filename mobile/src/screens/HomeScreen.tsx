import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ProductCard } from "../components/ProductCard";
import { ReelCard } from "../components/ReelCard";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { Story } from "../types/models";
import { palette, radii, spacing } from "../theme";

export function HomeScreen({ navigation }: { navigation: any }) {
  const {
    language,
    currentUser,
    users,
    stories,
    reels,
    products,
    communities,
    getUserById,
    getCommentsForReel,
    getBoostForReel,
    toggleLike,
    repostReel,
    toggleFollow,
    createStory,
  } = useAppState();
  const copy = getCopy(language);
  const rootNavigation = navigation.getParent?.() ?? navigation;
  const creators = users.filter((item) => item.id !== currentUser?.id).slice(0, 3);
  const latestStories = getLatestStories(stories);
  const currentUserStory = currentUser ? latestStories.find((story) => story.userId === currentUser.id) : undefined;
  const otherStories = latestStories.filter((story) => story.userId !== currentUser?.id);

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
      quality: 0.5,
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
    <Screen scrollable>
      <LinearGradient colors={["rgba(255,122,47,0.18)", "rgba(54,224,161,0.12)", "rgba(255,255,255,0.02)"]} style={styles.heroCard}>
        <Text style={styles.eyebrow}>Welcome back, {currentUser?.name?.split(" ")[0] ?? "Creator"}</Text>
        <Text style={styles.heroTitle}>{copy.mixedFeedTitle}</Text>
        <Text style={styles.heroBody}>{copy.mixedFeedBody}</Text>
        <View style={styles.heroStats}>
          <Badge label={copy.creatorStudio} value={`${reels.length} reels`} />
          <Badge label={copy.marketplaceBoost} value={`${products.length} offers`} />
          <Badge label={copy.recommendedForYou} value={`${creators.length} creators`} />
        </View>
      </LinearGradient>

      <SectionTitle title="Stories" subtitle="Post a quick update and keep your audience warm between reels." />
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
              <View style={styles.addBadge}>
                <Text style={styles.addBadgeLabel}>+</Text>
              </View>
            </View>
            <Text numberOfLines={1} style={styles.storyName}>
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
              <View style={styles.storyAvatarRing}>
                <Image source={{ uri: story.imageUrl }} style={styles.storyAvatar} />
              </View>
              <Text numberOfLines={1} style={styles.storyName}>
                {creator.name.split(" ")[0]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <SectionTitle title={copy.trendingCreators} subtitle={copy.tagline} />
      <View style={styles.creatorList}>
        {creators.map((creator) => (
          <Pressable
            key={creator.id}
            onPress={() => rootNavigation.navigate("PublicProfile", { userId: creator.id })}
            style={styles.creatorCard}
          >
            <Image source={{ uri: creator.profileImage }} style={styles.creatorAvatar} />
            <View style={styles.creatorCopy}>
              <Text style={styles.creatorName}>{creator.name}</Text>
              <Text style={styles.creatorMeta}>@{creator.username}</Text>
              <Text style={styles.creatorMeta}>{creator.headline}</Text>
            </View>
            <View style={styles.creatorSignal}>
              <Text style={styles.creatorSignalValue}>{creator.followers.length}</Text>
              <Text style={styles.creatorSignalLabel}>fans</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <SectionTitle title="Pages, groups and channels" subtitle="Community spaces creators are building right now." />
      <View style={styles.stack}>
        {communities.slice(0, 3).map((community) => {
          const owner = getUserById(community.ownerId);

          return (
            <Pressable
              key={community.id}
              onPress={() => rootNavigation.navigate("CommunityDetails", { communityId: community.id })}
              style={styles.communityCard}
            >
              <Image source={{ uri: community.coverImage }} style={styles.communityCover} />
              <View style={styles.communityBody}>
                <View style={styles.communityBadge}>
                  <Text style={styles.communityBadgeLabel}>{community.kind}</Text>
                </View>
                <Text style={styles.communityTitle}>{community.name}</Text>
                <Text numberOfLines={2} style={styles.communityDescription}>
                  {community.description}
                </Text>
                <Text style={styles.communityMeta}>
                  {community.category} | {owner?.name ?? "Creator"}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <SectionTitle title={copy.recommendedReels} />
      <View style={styles.stack}>
        {reels.slice(0, 2).map((reel) => {
          const creator = getUserById(reel.userId);
          const boost = getBoostForReel(reel.id);
          if (!creator) {
            return null;
          }

          return (
            <ReelCard
              key={reel.id}
              commentCount={getCommentsForReel(reel.id).length}
              creator={creator}
              currentUserId={currentUser?.id}
              boostLabel={boost?.status === "active" ? "Boost live" : undefined}
              onComment={() => rootNavigation.navigate("ReelDetails", { reelId: reel.id })}
              onLike={() => {
                void handleLike(reel.id);
              }}
              onOpen={() => rootNavigation.navigate("ReelDetails", { reelId: reel.id })}
              onRepost={() => {
                void handleRepost(reel.id);
              }}
              onToggleFollow={
                creator.id === currentUser?.id
                  ? undefined
                  : () => {
                      void handleFollow(creator.id);
                    }
              }
              reel={reel}
            />
          );
        })}
      </View>

      <SectionTitle title={copy.suggestedProducts} />
      <View style={styles.stack}>
        {products.slice(0, 2).map((product) => {
          const seller = getUserById(product.userId);
          if (!seller) {
            return null;
          }

          return (
            <ProductCard
              key={product.id}
              onPress={() => rootNavigation.navigate("ProductDetails", { productId: product.id })}
              onSellerPress={() => rootNavigation.navigate("PublicProfile", { userId: seller.id })}
              product={product}
              seller={seller}
            />
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

function Badge({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeValue}>{value}</Text>
      <Text style={styles.badgeLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
  },
  eyebrow: {
    color: palette.accentSoft,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: palette.text,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  heroBody: {
    color: palette.textSoft,
    fontSize: 15,
    lineHeight: 23,
  },
  heroStats: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  badge: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: radii.lg,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    padding: spacing.md,
  },
  badgeValue: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "900",
  },
  badgeLabel: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  creatorList: {
    gap: spacing.md,
  },
  storyRow: {
    gap: spacing.md,
    paddingRight: spacing.md,
  },
  storyCard: {
    alignItems: "center",
    gap: spacing.sm,
    width: 88,
  },
  storyAvatarWrap: {
    position: "relative",
  },
  storyAvatarRing: {
    borderColor: palette.accentSoft,
    borderRadius: 40,
    borderWidth: 2,
    padding: 3,
  },
  storyAvatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: palette.surface,
  },
  addBadge: {
    alignItems: "center",
    backgroundColor: palette.primary,
    borderColor: palette.background,
    borderRadius: 12,
    borderWidth: 2,
    bottom: 0,
    height: 24,
    justifyContent: "center",
    position: "absolute",
    right: 0,
    width: 24,
  },
  addBadgeLabel: {
    color: "#071118",
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 18,
  },
  storyName: {
    color: palette.text,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  creatorCard: {
    alignItems: "center",
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
  },
  creatorAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  creatorCopy: {
    flex: 1,
    gap: 2,
  },
  creatorName: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "900",
  },
  creatorMeta: {
    color: palette.muted,
    fontSize: 13,
  },
  creatorSignal: {
    alignItems: "center",
    backgroundColor: palette.glass,
    borderColor: palette.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  creatorSignalValue: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "900",
  },
  creatorSignalLabel: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  stack: {
    gap: spacing.lg,
  },
  communityCard: {
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: "hidden",
  },
  communityCover: {
    width: "100%",
    height: 170,
  },
  communityBody: {
    gap: spacing.sm,
    padding: spacing.lg,
  },
  communityBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(54,224,161,0.14)",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  communityBadgeLabel: {
    color: palette.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  communityTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "900",
  },
  communityDescription: {
    color: palette.textSoft,
    fontSize: 14,
    lineHeight: 22,
  },
  communityMeta: {
    color: palette.muted,
    fontSize: 13,
  },
});
