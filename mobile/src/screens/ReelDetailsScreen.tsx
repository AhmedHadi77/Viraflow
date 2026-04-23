import { useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { InputField } from "../components/InputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { ReelCard } from "../components/ReelCard";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { palette, radii, spacing } from "../theme";

export function ReelDetailsScreen({ navigation, route }: { navigation: any; route: { params: { reelId: string } } }) {
  const {
    language,
    currentUser,
    getUserById,
    getCommentsForReel,
    getBoostForReel,
    isReelSaved,
    reels,
    toggleLike,
    repostReel,
    toggleSaveReel,
    toggleFollow,
    addComment,
  } = useAppState();
  const copy = getCopy(language);
  const [commentText, setCommentText] = useState("");
  const reel = reels.find((item) => item.id === route.params.reelId);

  if (!reel) {
    return (
      <Screen contentContainerStyle={styles.missingWrap}>
        <Text style={styles.missingText}>Reel not found.</Text>
      </Screen>
    );
  }

  const activeReel = reel;
  const creator = getUserById(activeReel.userId);
  const comments = getCommentsForReel(activeReel.id);
  const boost = getBoostForReel(activeReel.id);
  const isOwnReel = activeReel.userId === currentUser?.id;
  const saved = isReelSaved(activeReel.id);

  if (!creator) {
    return null;
  }

  const reelCreator = creator;

  async function handleLike() {
    const result = await toggleLike(activeReel.id);
    if (!result.ok) {
      Alert.alert("Like unavailable", result.message ?? "This reel could not be liked right now.");
    }
  }

  async function handleRepost() {
    const result = await repostReel(activeReel.id);
    if (!result.ok) {
      Alert.alert("Repost unavailable", result.message ?? "This reel could not be reposted right now.");
    }
  }

  async function handleFollow() {
    const result = await toggleFollow(reelCreator.id);
    if (!result.ok) {
      Alert.alert("Follow unavailable", result.message ?? "This creator could not be followed right now.");
    }
  }

  async function handleSave() {
    const result = await toggleSaveReel(activeReel.id);
    if (!result.ok) {
      Alert.alert("Save unavailable", result.message ?? "This reel could not be saved right now.");
    }
  }

  async function submitComment() {
    if (!commentText.trim()) {
      Alert.alert("Comment is empty", "Write something before posting.");
      return;
    }

    const result = await addComment(activeReel.id, commentText);
    if (!result.ok) {
      Alert.alert("Content blocked", result.message ?? "This comment was blocked.");
      return;
    }

    setCommentText("");
  }

  return (
    <Screen scrollable>
      <ReelCard
        commentCount={comments.length}
        creator={reelCreator}
        currentUserId={currentUser?.id}
        boostLabel={boost?.status === "active" ? "Boost live" : undefined}
        onComment={() => undefined}
        onLike={() => {
          void handleLike();
        }}
        onOpen={() => undefined}
        onRepost={() => {
          void handleRepost();
        }}
        onToggleFollow={
          reelCreator.id === currentUser?.id
            ? undefined
            : () => {
                void handleFollow();
              }
        }
        reel={activeReel}
      />

      {isOwnReel ? (
        <View style={styles.boostCard}>
          <Text style={styles.boostKicker}>Ads monetization</Text>
          <Text style={styles.boostTitle}>Boost this reel</Text>
          <Text style={styles.boostBody}>
            Put ad spend behind this reel to buy more reach and more views directly inside the app.
          </Text>
          <View style={styles.analyticsRow}>
            <View style={styles.analyticsPill}>
              <Text style={styles.analyticsValue}>{formatCompact(activeReel.viewCount)}</Text>
              <Text style={styles.analyticsLabel}>Views</Text>
            </View>
            <View style={styles.analyticsPill}>
              <Text style={styles.analyticsValue}>{formatCompact(activeReel.reachCount)}</Text>
              <Text style={styles.analyticsLabel}>Reach</Text>
            </View>
          </View>
          {boost?.status === "active" ? (
            <View style={styles.boostStatus}>
              <Text style={styles.boostStatusTitle}>{boost.planTitle} is live</Text>
              <Text style={styles.commentBody}>Spend: ${boost.amountUsd}</Text>
              <Text style={styles.commentBody}>Estimated bonus reach: +{formatCompact(boost.estimatedReach)}</Text>
              <Text style={styles.commentBody}>Estimated bonus views: +{formatCompact(boost.estimatedViews)}</Text>
              <Text style={styles.boostNote}>Campaign ends {new Date(boost.endsAt).toLocaleString()}</Text>
              <PrimaryButton label="Open boost details" onPress={() => navigation.navigate("BoostReel", { reelId: activeReel.id })} variant="ghost" />
            </View>
          ) : (
            <PrimaryButton label="Boost my reel" onPress={() => navigation.navigate("BoostReel", { reelId: activeReel.id })} />
          )}
        </View>
      ) : (
        <PrimaryButton
          label={saved ? "Saved reel" : "Save reel"}
          onPress={() => {
            void handleSave();
          }}
          variant="ghost"
        />
      )}

      <SectionTitle title={copy.reelDetails} subtitle={copy.commentPlaceholder} />
      <InputField label={copy.comment} onChangeText={setCommentText} placeholder={copy.commentPlaceholder} value={commentText} multiline />
      <PrimaryButton label={copy.postComment} onPress={submitComment} />

      <View style={styles.commentList}>
        {comments.map((comment) => (
          <View key={comment.id} style={styles.commentCard}>
            <View style={styles.commentHeader}>
              <Pressable onPress={() => navigation.navigate("PublicProfile", { userId: comment.userId })} style={styles.commentUser}>
                <Image source={{ uri: comment.userAvatar }} style={styles.commentAvatar} />
                <Text style={styles.commentName}>{comment.userName}</Text>
              </Pressable>
              <Text style={styles.commentDate}>{new Date(comment.createdAt).toLocaleDateString()}</Text>
            </View>
            <Text style={styles.commentBody}>{comment.text}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  missingWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  missingText: {
    color: palette.muted,
    fontSize: 15,
  },
  commentList: {
    gap: spacing.md,
  },
  boostCard: {
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
  },
  boostKicker: {
    color: palette.accentSoft,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  boostTitle: {
    color: palette.text,
    fontSize: 22,
    fontWeight: "900",
  },
  boostBody: {
    color: palette.textSoft,
    fontSize: 14,
    lineHeight: 22,
  },
  analyticsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  analyticsPill: {
    backgroundColor: palette.cardAlt,
    borderColor: palette.borderStrong,
    borderRadius: radii.lg,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    padding: spacing.md,
  },
  analyticsValue: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "900",
  },
  analyticsLabel: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  boostStatus: {
    backgroundColor: "rgba(54,224,161,0.10)",
    borderColor: "rgba(54,224,161,0.24)",
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  boostStatusTitle: {
    color: palette.primary,
    fontSize: 18,
    fontWeight: "900",
  },
  boostNote: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  commentCard: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  commentHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  commentUser: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  commentName: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "700",
  },
  commentDate: {
    color: palette.muted,
    fontSize: 12,
  },
  commentBody: {
    color: palette.text,
    fontSize: 15,
    lineHeight: 22,
  },
});

function formatCompact(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  return String(value);
}
