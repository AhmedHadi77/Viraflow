import { LinearGradient } from "expo-linear-gradient";
import { Alert, FlatList, StyleSheet, Text } from "react-native";
import { ReelCard } from "../components/ReelCard";
import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { palette, spacing } from "../theme";

export function ReelsScreen({ navigation }: { navigation: any }) {
  const { language, currentUser, reels, getUserById, getCommentsForReel, getBoostForReel, toggleLike, repostReel, toggleFollow } =
    useAppState();
  const copy = getCopy(language);
  const rootNavigation = navigation.getParent?.() ?? navigation;

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

  return (
    <FlatList
      contentContainerStyle={styles.content}
      data={reels}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <LinearGradient colors={["rgba(255,122,47,0.18)", "rgba(54,224,161,0.10)", "rgba(255,255,255,0.02)"]} style={styles.header}>
          <Text style={styles.kicker}>Fullscreen creator stories</Text>
          <Text style={styles.title}>{copy.reelsFeed}</Text>
          <Text style={styles.subtitle}>{copy.tagline}</Text>
        </LinearGradient>
      }
      renderItem={({ item }) => {
        const creator = getUserById(item.userId);
        const boost = getBoostForReel(item.id);
        if (!creator) {
          return null;
        }

        return (
          <ReelCard
            commentCount={getCommentsForReel(item.id).length}
            creator={creator}
            currentUserId={currentUser?.id}
            boostLabel={boost?.status === "active" ? "Boost live" : undefined}
            immersive
            onComment={() => rootNavigation.navigate("ReelDetails", { reelId: item.id })}
            onLike={() => {
              void handleLike(item.id);
            }}
            onOpen={() => rootNavigation.navigate("ReelDetails", { reelId: item.id })}
            onRepost={() => {
              void handleRepost(item.id);
            }}
            onToggleFollow={
              creator.id === currentUser?.id
                ? undefined
                : () => {
                    void handleFollow(creator.id);
                  }
            }
            reel={item}
          />
        );
      }}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: palette.background,
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    borderColor: palette.borderStrong,
    borderRadius: 32,
    borderWidth: 1,
    gap: 6,
    marginBottom: spacing.sm,
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
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: palette.textSoft,
    fontSize: 14,
    lineHeight: 20,
  },
});
