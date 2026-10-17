import { useState } from "react";
import { formatDate, formatDateTime } from "../utils/timeFormatting";
import { Alert, Image, Keyboard, Pressable, Text, View } from "react-native";
import { InputField } from "../components/InputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { ReelCard } from "../components/ReelCard";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { shareReelToApps } from "../services/reelSharing";
import { palette, radii, spacing, createThemedStyles } from "../theme";
import { PAYMENTS_ENABLED } from "../data/catalog";

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
    deleteReel,
  } = useAppState();
  const copy = getCopy(language);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const reel = reels.find((item) => item.id === route.params.reelId);

  if (!reel) {
    return (
      <Screen contentContainerStyle={styles.missingWrap}>
        <Text style={styles.missingText}>{copy.rdNotFound}</Text>
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
      Alert.alert(copy.likeUnavailableTitle, result.message ?? copy.rdLikeFailed);
    }
  }

  async function handleShare() {
    const result = await repostReel(activeReel.id);
    if (!result.ok) {
      Alert.alert(copy.shareUnavailableTitle, result.message ?? copy.rdShareFailed);
      return;
    }

    try {
      await shareReelToApps(activeReel, reelCreator);
    } catch (error) {
      Alert.alert(copy.shareUnavailableTitle, error instanceof Error ? error.message : copy.rdShareFailed);
    }
  }

  async function handleFollow() {
    const result = await toggleFollow(reelCreator.id);
    if (!result.ok) {
      Alert.alert(copy.rdFollowUnavailable, result.message ?? copy.rdFollowFailed);
    }
  }

  async function handleSave() {
    const result = await toggleSaveReel(activeReel.id);
    if (!result.ok) {
      Alert.alert(copy.saveUnavailableTitle, result.message ?? copy.rdSaveFailed);
    }
  }

  async function submitComment() {
    const nextComment = commentText.trim();

    if (!nextComment) {
      Alert.alert(copy.commentEmptyTitle, copy.commentEmptyBody);
      return;
    }

    Keyboard.dismiss();
    setIsSubmittingComment(true);

    try {
      const result = await addComment(activeReel.id, nextComment);
      if (!result.ok) {
        const title =
          result.message === "Comment is empty."
            ? copy.commentEmptyTitle
            : result.message?.toLowerCase().includes("blocked")
              ? copy.csContentBlocked
              : copy.commentUnavailableTitle;
        Alert.alert(title, result.message ?? copy.commentUnavailableBody);
        return;
      }

      setCommentText("");
    } finally {
      setIsSubmittingComment(false);
    }
  }

  return (
    <Screen scrollable>
      <ReelCard
        commentCount={comments.length}
        creator={reelCreator}
        currentUserId={currentUser?.id}
        boostLabel={boost?.status === "active" ? copy.boostLive : undefined}
        playVideo
        onComment={() => undefined}
        onLike={() => {
          void handleLike();
        }}
        onOpen={() => undefined}
        onRepost={() => {
          void handleShare();
        }}
        onSave={() => {
          void handleSave();
        }}
        onToggleFollow={
          reelCreator.id === currentUser?.id
            ? undefined
            : () => {
                void handleFollow();
              }
        }
        reel={activeReel}
        saved={saved}
      />

      {isOwnReel ? (
        <View style={styles.boostCard}>
          <Text style={styles.boostKicker}>{PAYMENTS_ENABLED ? copy.rdAdsMonetization : copy.rdInsights}</Text>
          <Text style={styles.boostTitle}>{PAYMENTS_ENABLED ? copy.rdBoostThis : copy.rdHowDoing}</Text>
          <Text style={styles.boostBody}>
            {PAYMENTS_ENABLED
              ? copy.rdBoostBody
              : copy.rdViewsBody}
          </Text>
          <View style={styles.analyticsRow}>
            <View style={styles.analyticsPill}>
              <Text style={styles.analyticsValue}>{formatCompact(activeReel.viewCount)}</Text>
              <Text style={styles.analyticsLabel}>{copy.rdViews}</Text>
            </View>
            <View style={styles.analyticsPill}>
              <Text style={styles.analyticsValue}>{formatCompact(activeReel.reachCount)}</Text>
              <Text style={styles.analyticsLabel}>{copy.rdReach}</Text>
            </View>
          </View>
          {boost?.status === "active" ? (
            <View style={styles.boostStatus}>
              <Text style={styles.boostStatusTitle}>{boost.planTitle} is live</Text>
              <Text style={styles.commentBody}>Spend: ${boost.amountUsd}</Text>
              <Text style={styles.commentBody}>Priority placement in Reels and Explore until {formatDate(boost.endsAt)}</Text>
              <Text style={styles.boostNote}>Campaign ends {formatDateTime(boost.endsAt)}</Text>
              <PrimaryButton label={copy.rdOpenBoost} onPress={() => navigation.navigate("BoostReel", { reelId: activeReel.id })} variant="ghost" />
            </View>
          ) : PAYMENTS_ENABLED ? (
            <PrimaryButton label={copy.rdBoostMine} onPress={() => navigation.navigate("BoostReel", { reelId: activeReel.id })} />
          ) : null}
          <PrimaryButton 
            label={copy.rdDeleteThis} 
            variant="ghost" 
            onPress={() => {
              Alert.alert(copy.rdDeleteReel, copy.rdDeleteConfirm, [
                { text: copy.cancel, style: "cancel" },
                { 
                  text: copy.delete, 
                  style: "destructive", 
                  onPress: async () => { 
                    const result = await deleteReel(activeReel.id); 
                    if (result.ok) {
                      navigation.goBack();
                    } else {
                      Alert.alert("Error", result.message || copy.rdDeleteFailed);
                    }
                  } 
                }
              ]);
            }} 
          />
        </View>
      ) : null}

      <SectionTitle title={copy.reelDetails} subtitle={copy.commentPlaceholder} />
      <InputField label={copy.comment} onChangeText={setCommentText} placeholder={copy.commentPlaceholder} value={commentText} multiline />
      <PrimaryButton
        disabled={isSubmittingComment || !commentText.trim()}
        label={isSubmittingComment ? "Posting..." : copy.postComment}
        onPress={submitComment}
      />

      <View style={styles.commentList}>
        {comments.map((comment) => (
          <View key={comment.id} style={styles.commentCard}>
            <View style={styles.commentHeader}>
              <Pressable onPress={() => navigation.navigate("PublicProfile", { userId: comment.userId })} style={styles.commentUser}>
                <Image source={{ uri: comment.userAvatar }} style={styles.commentAvatar} />
                <Text style={styles.commentName}>{comment.userName}</Text>
              </Pressable>
              <Text style={styles.commentDate}>{formatDate(comment.createdAt)}</Text>
            </View>
            <Text style={styles.commentBody}>{comment.text}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = createThemedStyles({
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
