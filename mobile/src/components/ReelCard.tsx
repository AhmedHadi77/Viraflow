import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { Image, ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { Reel, User } from "../types/models";
import { palette, radii, shadows, spacing } from "../theme";

interface ReelCardProps {
  reel: Reel;
  creator: User;
  currentUserId?: string;
  commentCount: number;
  immersive?: boolean;
  fullScreen?: boolean;
  playVideo?: boolean;
  boostLabel?: string;
  saved?: boolean;
  immersiveHeight?: number;
  topInset?: number;
  bottomInset?: number;
  onLike: () => void;
  onComment: () => void;
  onRepost: () => void;
  onOpen: () => void;
  onSave?: () => void;
  onToggleFollow?: () => void;
}

export function ReelCard({
  reel,
  creator,
  currentUserId,
  commentCount,
  immersive = false,
  fullScreen = false,
  playVideo = false,
  boostLabel,
  saved = false,
  immersiveHeight,
  topInset = spacing.lg,
  bottomInset = spacing.xl,
  onLike,
  onComment,
  onRepost,
  onOpen,
  onSave,
  onToggleFollow,
}: ReelCardProps) {
  const isLiked = currentUserId ? reel.likedBy.includes(currentUserId) : false;
  const isFollowing = currentUserId ? creator.followers.includes(currentUserId) : false;

  if (immersive) {
    return (
      <Pressable
        onPress={onOpen}
        style={[
          styles.immersiveCard,
          immersiveHeight ? { height: immersiveHeight } : null,
          fullScreen ? styles.fullScreenCard : null,
        ]}
      >
        <View style={styles.immersiveMediaShell}>
          <ReelMedia playVideo={playVideo} reel={reel} rounded={false} />
          <LinearGradient colors={["rgba(0,0,0,0.06)", "rgba(0,0,0,0.26)", "rgba(0,0,0,0.82)"]} style={StyleSheet.absoluteFillObject} />

          <View style={[styles.immersiveBadges, fullScreen ? { top: topInset } : null]}>
            <View style={styles.reelBadge}>
              <Text style={styles.reelBadgeLabel}>Reel</Text>
            </View>
            {boostLabel ? (
              <View style={[styles.reelBadge, styles.boostBadge]}>
                <Ionicons color={palette.text} name="sparkles-outline" size={12} />
                <Text style={styles.reelBadgeLabel}>{boostLabel}</Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.immersiveFooter, fullScreen ? { paddingBottom: bottomInset } : null]}>
            <View style={styles.actionRail}>
              <RailAction
                active={isLiked}
                icon={isLiked ? "heart" : "heart-outline"}
                label={formatCompact(reel.likedBy.length)}
                onPress={onLike}
              />
              <RailAction icon="chatbubble-outline" label={formatCompact(commentCount)} onPress={onComment} />
              <RailAction icon="paper-plane-outline" label={formatCompact(reel.repostCount)} onPress={onRepost} />
              {onSave ? <RailAction active={saved} icon={saved ? "bookmark" : "bookmark-outline"} label="Save" onPress={onSave} /> : null}
            </View>

            <View style={styles.immersiveInfo}>
              <View style={styles.immersiveCreatorRow}>
                <Image source={{ uri: creator.profileImage }} style={styles.avatar} />
                <View style={styles.creatorTextWrap}>
                  <Text style={styles.immersiveHandle}>@{creator.username}</Text>
                  <Text style={styles.immersiveName}>{creator.name}</Text>
                </View>
                {onToggleFollow ? (
                  <Pressable onPress={onToggleFollow} style={[styles.followButton, isFollowing ? styles.followingButton : null]}>
                    <Text style={[styles.followButtonLabel, isFollowing ? styles.followingButtonLabel : null]}>
                      {isFollowing ? "Following" : "Follow"}
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              <Text numberOfLines={3} style={styles.immersiveCaption}>
                {reel.caption}
              </Text>

              <View style={styles.immersiveMetaRow}>
                <Text style={styles.immersiveMetaText}>{formatCompact(reel.viewCount)} views</Text>
                <Text style={styles.immersiveMetaText}>{formatCompact(reel.reachCount)} reach</Text>
                <Text style={styles.immersiveMetaText}>{commentCount} comments</Text>
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onOpen} style={styles.feedCard}>
      <View style={styles.feedHeader}>
        <View style={styles.feedCreatorRow}>
          <Image source={{ uri: creator.profileImage }} style={styles.feedAvatar} />
          <View style={styles.feedCreatorMeta}>
            <Text style={styles.feedHandle}>@{creator.username}</Text>
            <Text style={styles.feedDate}>{formatRelativeDate(reel.createdAt)}</Text>
          </View>
        </View>
        <View style={styles.feedHeaderActions}>
          {boostLabel ? (
            <View style={[styles.reelBadge, styles.boostBadge]}>
              <Ionicons color={palette.text} name="sparkles-outline" size={12} />
              <Text style={styles.reelBadgeLabel}>{boostLabel}</Text>
            </View>
          ) : null}
          {onToggleFollow ? (
            <Pressable onPress={onToggleFollow} style={[styles.followButton, isFollowing ? styles.followingButton : null]}>
              <Text style={[styles.followButtonLabel, isFollowing ? styles.followingButtonLabel : null]}>
                {isFollowing ? "Following" : "Follow"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.feedMediaShell}>
        <ReelMedia playVideo={playVideo} reel={reel} rounded />
      </View>

      <View style={styles.feedActionsRow}>
        <View style={styles.feedPrimaryActions}>
          <FeedAction active={isLiked} icon={isLiked ? "heart" : "heart-outline"} onPress={onLike} />
          <FeedAction icon="chatbubble-outline" onPress={onComment} />
          <FeedAction icon="paper-plane-outline" onPress={onRepost} />
        </View>
        {onSave ? <FeedAction active={saved} icon={saved ? "bookmark" : "bookmark-outline"} onPress={onSave} /> : null}
      </View>

      <Text style={styles.feedMetrics}>{formatCompact(reel.likedBy.length)} likes | {formatCompact(reel.viewCount)} views</Text>
      <Text numberOfLines={2} style={styles.feedCaption}>
        <Text style={styles.feedCaptionHandle}>@{creator.username}</Text> {reel.caption}
      </Text>
      {reel.tags.length > 0 ? (
        <Text numberOfLines={1} style={styles.feedTags}>
          {reel.tags.map((tag) => `#${tag}`).join("  ")}
        </Text>
      ) : null}
    </Pressable>
  );
}

function ReelMedia({
  reel,
  playVideo,
  rounded,
}: {
  reel: Reel;
  playVideo: boolean;
  rounded: boolean;
}) {
  const canPlayVideo = playVideo && isPlayableVideoSource(reel.videoUrl);

  if (canPlayVideo) {
    return <PlayableReelMedia rounded={rounded} uri={reel.videoUrl} />;
  }

  return (
    <ImageBackground
      imageStyle={rounded ? styles.roundedMediaImage : undefined}
      resizeMode="cover"
      source={{ uri: reel.thumbnailUrl }}
      style={styles.imageFallback}
    >
      <LinearGradient colors={["rgba(0,0,0,0.08)", "rgba(0,0,0,0.35)"]} style={StyleSheet.absoluteFillObject} />
    </ImageBackground>
  );
}

function PlayableReelMedia({
  uri,
  rounded,
}: {
  uri: string;
  rounded: boolean;
}) {
  const player = useVideoPlayer(uri, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
    videoPlayer.play();
  });

  useEffect(() => {
    player.loop = true;
    player.muted = true;
    player.play();

    return () => {
      player.pause();
    };
  }, [player]);

  return (
    <VideoView
      allowsPictureInPicture={false}
      contentFit="cover"
      fullscreenOptions={{ enable: false }}
      nativeControls={false}
      player={player}
      style={[styles.videoView, rounded ? styles.roundedVideoView : null]}
    />
  );
}

function FeedAction({
  icon,
  onPress,
  active = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={styles.feedActionButton}>
      <Ionicons color={active ? palette.danger : palette.text} name={icon} size={28} />
    </Pressable>
  );
}

function RailAction({
  icon,
  label,
  onPress,
  active = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={styles.railAction}>
      <View style={styles.railActionRow}>
        <View style={styles.railActionIconShell}>
          <Ionicons color={active ? palette.danger : palette.text} name={icon} size={24} />
        </View>
        <View style={[styles.railActionLabelPill, active ? styles.railActionLabelPillActive : null]}>
          <Text style={styles.railActionLabel}>{label}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function isPlayableVideoSource(source: string) {
  if (!source.trim()) {
    return false;
  }

  return !source.includes("example.com");
}

function formatCompact(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  return String(value);
}

function formatRelativeDate(value: string) {
  const createdAt = new Date(value).getTime();
  const diffHours = Math.max(1, Math.floor((Date.now() - createdAt) / (1000 * 60 * 60)));

  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

const styles = StyleSheet.create({
  feedCard: {
    backgroundColor: "#05080d",
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.md,
    overflow: "hidden",
    padding: spacing.md,
  },
  feedHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  feedCreatorRow: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
    gap: spacing.sm,
  },
  feedAvatar: {
    borderColor: "rgba(255,255,255,0.16)",
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    width: 36,
  },
  feedCreatorMeta: {
    gap: 2,
  },
  feedHandle: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "800",
  },
  feedDate: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  feedHeaderActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  feedMediaShell: {
    borderRadius: 28,
    height: 460,
    overflow: "hidden",
  },
  videoView: {
    flex: 1,
  },
  roundedVideoView: {
    borderRadius: 28,
  },
  imageFallback: {
    flex: 1,
    justifyContent: "flex-end",
  },
  roundedMediaImage: {
    borderRadius: 28,
  },
  feedActionsRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  feedPrimaryActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  feedActionButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  feedMetrics: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "800",
  },
  feedCaption: {
    color: palette.text,
    fontSize: 14,
    lineHeight: 21,
  },
  feedCaptionHandle: {
    color: palette.text,
    fontWeight: "900",
  },
  feedTags: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  immersiveCard: {
    backgroundColor: "#030508",
    borderRadius: 36,
    overflow: "hidden",
    ...shadows.floating,
  },
  fullScreenCard: {
    borderRadius: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  immersiveMediaShell: {
    flex: 1,
    justifyContent: "space-between",
  },
  immersiveBadges: {
    flexDirection: "row",
    gap: spacing.sm,
    left: spacing.lg,
    position: "absolute",
    top: spacing.lg,
    zIndex: 2,
  },
  reelBadge: {
    alignItems: "center",
    backgroundColor: "rgba(10,13,18,0.52)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  boostBadge: {
    backgroundColor: "rgba(20,34,52,0.65)",
  },
  reelBadgeLabel: {
    color: palette.text,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  immersiveFooter: {
    alignItems: "flex-end",
    flex: 1,
    flexDirection: "row",
    gap: spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  immersiveInfo: {
    alignSelf: "flex-end",
    flex: 1,
    gap: spacing.sm,
    paddingLeft: spacing.sm,
  },
  immersiveCreatorRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  avatar: {
    borderColor: "rgba(255,255,255,0.28)",
    borderRadius: 24,
    borderWidth: 1,
    height: 48,
    width: 48,
  },
  creatorTextWrap: {
    flex: 1,
    gap: 2,
  },
  immersiveHandle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "900",
  },
  immersiveName: {
    color: palette.textSoft,
    fontSize: 13,
    fontWeight: "600",
  },
  followButton: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  followingButton: {
    backgroundColor: palette.text,
    borderColor: palette.text,
  },
  followButtonLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "800",
  },
  followingButtonLabel: {
    color: "#05080d",
  },
  immersiveCaption: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 26,
  },
  immersiveMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  immersiveMetaText: {
    color: palette.textSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  actionRail: {
    alignItems: "flex-start",
    alignSelf: "flex-end",
    backgroundColor: "rgba(6,9,13,0.28)",
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 24,
    borderWidth: 1,
    gap: spacing.md,
    paddingHorizontal: 10,
    paddingVertical: 12,
    width: 94,
  },
  railAction: {
    width: "100%",
  },
  railActionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  railActionIconShell: {
    alignItems: "center",
    backgroundColor: "rgba(6,9,13,0.45)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  railActionLabelPill: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  railActionLabelPillActive: {
    backgroundColor: "rgba(255,77,103,0.18)",
    borderColor: "rgba(255,77,103,0.28)",
  },
  railActionLabel: {
    color: palette.text,
    fontSize: 11,
    fontWeight: "700",
  },
});
