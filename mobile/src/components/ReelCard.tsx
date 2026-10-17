import { Ionicons } from "@expo/vector-icons";
import { useCopy } from "../utils/useCopy";
import { useEventListener } from "expo";
import { useEffect, useState } from "react";
import {
  AppState,
  GestureResponderEvent,
  Image,
  ImageBackground,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { buildCloudinaryPlayableVideoUrl } from "../services/mediaUpload";
import { SafeLinearGradient } from "./SafeLinearGradient";
import { Reel, User } from "../types/models";
import { createThemedStyles, darkPalette, palette, radii, shadows, spacing } from "../theme";

type ExpoVideoModule = typeof import("expo-video");
let cachedExpoVideoModule: ExpoVideoModule | null | undefined;

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
  muted?: boolean;
  immersiveHeight?: number;
  topInset?: number;
  bottomInset?: number;
  viewerMode?: boolean;
  onLike: () => void;
  onComment: () => void;
  onRepost: () => void;
  onOpen: () => void;
  onSave?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
  onToggleMuted?: () => void;
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
  muted,
  immersiveHeight,
  topInset = spacing.lg,
  bottomInset = spacing.xl,
  viewerMode = false,
  onLike,
  onComment,
  onRepost,
  onOpen,
  onSave,
  onDelete,
  onReport,
  onToggleMuted,
  onToggleFollow,
}: ReelCardProps) {
  const copy = useCopy();
  const isLiked = currentUserId ? reel.likedBy.includes(currentUserId) : false;
  const isFollowing = currentUserId ? creator.followers.includes(currentUserId) : false;
  const [localMuted, setLocalMuted] = useState(false);
  const isMuted = muted ?? localMuted;

  function handleToggleMuted(event?: GestureResponderEvent) {
    event?.stopPropagation();

    if (onToggleMuted) {
      onToggleMuted();
      return;
    }

    setLocalMuted((currentValue) => !currentValue);
  }

  if (immersive) {
    return (
      <Pressable
        onPress={viewerMode ? undefined : onOpen}
        style={[
          styles.immersiveCard,
          immersiveHeight ? { height: immersiveHeight } : null,
          fullScreen ? styles.fullScreenCard : null,
        ]}
      >
        <View style={styles.immersiveMediaShell}>
          <View style={styles.mediaFillLayer}>
            <ReelMedia
              controlsBottomOffset={Math.max(0, bottomInset - 16)}
              muted={isMuted}
              playVideo={playVideo}
              reel={reel}
              rounded={false}
              viewerMode={viewerMode}
            />
            <SafeLinearGradient
              colors={["rgba(0,0,0,0.08)", "rgba(0,0,0,0.22)", "rgba(0,0,0,0.72)"]}
              pointerEvents="none"
              style={StyleSheet.absoluteFillObject}
            />
          </View>

          {boostLabel ? (
            <View pointerEvents="none" style={[styles.immersiveBadges, fullScreen ? { top: topInset } : null]}>
              <View style={[styles.reelBadge, styles.boostBadge]}>
                <Ionicons color="#ffffff" name="sparkles-outline" size={11} />
                <Text style={styles.reelBadgeLabel}>{boostLabel}</Text>
              </View>
            </View>
          ) : null}

          <View pointerEvents="box-none" style={[styles.immersiveFooter, fullScreen ? { paddingBottom: bottomInset + 20 } : null]}>
            <View pointerEvents="box-none" style={styles.immersiveInfo}>
              <View style={styles.immersiveCreatorRow}>
                <Image source={{ uri: creator.profileImage }} style={styles.avatar} />
                <Text numberOfLines={1} style={styles.immersiveHandle}>
                  @{creator.username}
                </Text>
                {onToggleFollow ? (
                  <Pressable hitSlop={8} onPress={onToggleFollow} style={[styles.followButton, isFollowing ? styles.followingButton : null]}>
                    <Text style={[styles.followButtonLabel, isFollowing ? styles.followingButtonLabel : null]}>
                      {isFollowing ? copy.following : copy.follow}
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              {reel.caption ? (
                <Text numberOfLines={2} style={styles.immersiveCaption}>
                  {reel.caption}
                </Text>
              ) : null}

              <Text numberOfLines={1} style={styles.immersiveMetaText}>
                {[
                  reel.tags.length > 0 ? reel.tags.slice(0, 3).map((tag) => `#${tag}`).join(" ") : "",
                  `${formatCompact(reel.viewCount)} views`,
                ]
                  .filter(Boolean)
                  .join("  ·  ")}
              </Text>
            </View>

            <View style={styles.actionRail}>
              <RailAction
                active={isLiked}
                icon={isLiked ? "heart" : "heart-outline"}
                label={formatCompact(reel.likedBy.length)}
                onPress={onLike}
              />
              <RailAction icon="chatbubble-ellipses-outline" label={formatCompact(commentCount)} onPress={onComment} />
              <RailAction icon="paper-plane-outline" label={formatCompact(reel.repostCount)} onPress={onRepost} />
              {onSave ? <RailAction active={saved} activeColor={darkPalette.accentSoft} icon={saved ? "bookmark" : "bookmark-outline"} label={saved ? copy.savedState : copy.saveAction} onPress={onSave} /> : null}
              <RailAction icon={isMuted ? "volume-mute-outline" : "volume-high-outline"} label={isMuted ? copy.muted : copy.sound} onPress={() => handleToggleMuted()} />
              {onDelete ? <RailAction icon="trash-outline" label={copy.delete} onPress={onDelete} /> : null}
              {onReport ? <RailAction icon="flag-outline" label="" onPress={onReport} /> : null}
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
              <Ionicons color="#ffffff" name="sparkles-outline" size={12} />
              <Text style={styles.reelBadgeLabel}>{boostLabel}</Text>
            </View>
          ) : null}
          {onDelete ? (
            <Pressable hitSlop={10} onPress={onDelete} style={styles.feedHeaderIconButton}>
              <Ionicons color={palette.muted} name="trash-outline" size={18} />
            </Pressable>
          ) : null}
          {onToggleFollow ? (
            <Pressable onPress={onToggleFollow} style={[styles.feedFollowButton, isFollowing ? styles.feedFollowingButton : null]}>
              <Text style={[styles.feedFollowButtonLabel, isFollowing ? styles.feedFollowingButtonLabel : null]}>
                {isFollowing ? copy.following : copy.follow}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.feedMediaShell}>
        <ReelMedia muted={isMuted} playVideo={playVideo} reel={reel} rounded viewerMode={false} />
        <Pressable hitSlop={12} onPress={handleToggleMuted} style={styles.feedAudioToggle}>
          <Ionicons color="#ffffff" name={isMuted ? "volume-mute" : "volume-high"} size={16} />
        </Pressable>
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
  muted,
  viewerMode,
  controlsBottomOffset = 24,
}: {
  reel: Reel;
  playVideo: boolean;
  rounded: boolean;
  muted: boolean;
  viewerMode?: boolean;
  controlsBottomOffset?: number;
}) {
  const canPlayVideo = playVideo && isPlayableVideoSource(reel.videoUrl);
  const playableVideoUri = canPlayVideo ? normalizePlayableVideoUri(reel.videoUrl) : "";

  if (canPlayVideo) {
    return (
      <PlayableReelMedia
        controlsBottomOffset={controlsBottomOffset}
        fallbackUri={reel.thumbnailUrl}
        muted={muted}
        rounded={rounded}
        uri={playableVideoUri}
        viewerMode={viewerMode}
      />
    );
  }

  return (
    <ImageBackground
      imageStyle={rounded ? styles.roundedMediaImage : undefined}
      resizeMode="cover"
      source={{ uri: reel.thumbnailUrl }}
      style={styles.imageFallback}
    >
      <SafeLinearGradient colors={["rgba(0,0,0,0.08)", "rgba(0,0,0,0.35)"]} style={StyleSheet.absoluteFillObject} />
    </ImageBackground>
  );
}

function PlayableReelMedia({
  uri,
  fallbackUri,
  rounded,
  muted,
  viewerMode = false,
  controlsBottomOffset = 24,
}: {
  uri: string;
  fallbackUri: string;
  rounded: boolean;
  muted: boolean;
  viewerMode?: boolean;
  controlsBottomOffset?: number;
}) {
  const expoVideo = getExpoVideoModule();

  if (!expoVideo) {
    return (
      <ImageBackground
        imageStyle={rounded ? styles.roundedMediaImage : undefined}
        resizeMode="cover"
        source={{ uri: fallbackUri }}
        style={styles.imageFallback}
      >
        <SafeLinearGradient colors={["rgba(0,0,0,0.08)", "rgba(0,0,0,0.35)"]} style={StyleSheet.absoluteFillObject} />
      </ImageBackground>
    );
  }

  return (
    <LoadedPlayableReelMedia
      controlsBottomOffset={controlsBottomOffset}
      expoVideo={expoVideo}
      muted={muted}
      rounded={rounded}
      uri={uri}
      viewerMode={viewerMode}
    />
  );
}

function LoadedPlayableReelMedia({
  expoVideo,
  uri,
  rounded,
  muted,
  viewerMode,
  controlsBottomOffset,
}: {
  expoVideo: ExpoVideoModule;
  uri: string;
  rounded: boolean;
  muted: boolean;
  viewerMode: boolean;
  controlsBottomOffset: number;
}) {
  const { VideoView, useVideoPlayer } = expoVideo;
  const player = useVideoPlayer(uri, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.audioMixingMode = "doNotMix";
    videoPlayer.muted = muted;
    videoPlayer.volume = muted ? 0 : 1;
    videoPlayer.staysActiveInBackground = false;
    videoPlayer.showNowPlayingNotification = false;
    videoPlayer.timeUpdateEventInterval = 0.25;
    videoPlayer.play();
  });
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [currentTimeSeconds, setCurrentTimeSeconds] = useState(0);
  const [progressTrackWidth, setProgressTrackWidth] = useState(0);

  useEventListener(player, "playingChange", ({ isPlaying: nextIsPlaying }) => {
    setIsPlaying(nextIsPlaying);
  });

  useEventListener(player, "sourceLoad", ({ duration }) => {
    setDurationSeconds(duration);
  });

  useEventListener(player, "timeUpdate", ({ currentTime }) => {
    setCurrentTimeSeconds(currentTime);
  });

  useEffect(() => {
    if (!viewerMode) {
      return;
    }

    if (!isPlaying) {
      setShowControls(true);
      return;
    }

    if (!showControls) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setShowControls(false);
    }, 1600);

    return () => clearTimeout(timeoutId);
  }, [isPlaying, showControls, viewerMode]);

  useEffect(() => {
    try {
      player.loop = true;
      player.audioMixingMode = "doNotMix";
      player.muted = muted;
      player.volume = muted ? 0 : 1;
      player.staysActiveInBackground = false;
      player.showNowPlayingNotification = false;
      player.timeUpdateEventInterval = 0.25;
      player.play();
    } catch (error) {
      console.warn("Sohba video player could not start playback.", error);
    }

    const subscription = AppState.addEventListener("change", (nextState) => {
      try {
        if (nextState === "active") {
          player.audioMixingMode = "doNotMix";
          player.muted = muted;
          player.volume = muted ? 0 : 1;
          player.play();
        } else {
          player.pause();
        }
      } catch (error) {
        console.warn("Sohba video player could not update app-state playback.", error);
      }
    });

    return () => {
      subscription.remove();
      try {
        player.pause();
      } catch {
        // Ignore cleanup failures from native player teardown.
      }
    };
  }, [muted, player]);

  const progressRatio = durationSeconds > 0 ? Math.min(1, Math.max(0, currentTimeSeconds / durationSeconds)) : 0;

  function togglePlayback() {
    try {
      if (player.playing) {
        player.pause();
        setShowControls(true);
      } else {
        player.play();
        setShowControls(true);
      }
    } catch (error) {
      console.warn("Sohba video playback toggle failed.", error);
    }
  }

  function handleProgressTrackLayout(event: LayoutChangeEvent) {
    setProgressTrackWidth(event.nativeEvent.layout.width);
  }

  function handleSeekPress(event: GestureResponderEvent) {
    if (!durationSeconds || !progressTrackWidth) {
      return;
    }

    const nextRatio = Math.min(1, Math.max(0, event.nativeEvent.locationX / progressTrackWidth));
    try {
      player.currentTime = durationSeconds * nextRatio;
      setShowControls(true);
    } catch (error) {
      console.warn("Sohba video seek failed.", error);
    }
  }

  return (
    <View style={styles.videoSurface}>
      <VideoView
        allowsPictureInPicture={false}
        contentFit="cover"
        fullscreenOptions={{ enable: false }}
        nativeControls={false}
        player={player}
        style={[styles.videoView, rounded ? styles.roundedVideoView : null]}
      />

      {viewerMode ? (
        <>
          <Pressable onPress={togglePlayback} style={styles.centerPlaybackHotspot}>
            {showControls || !isPlaying ? (
              <View style={styles.centerPlaybackButton}>
                <Ionicons color="#ffffff" name={isPlaying ? "pause" : "play"} size={24} />
              </View>
            ) : null}
          </Pressable>

          {showControls || !isPlaying ? (
            <View style={[styles.playbackTimelineWrap, { bottom: controlsBottomOffset }]}>
              <View style={styles.playbackTimelineHeader}>
                <Text style={styles.playbackTimeLabel}>{formatPlaybackTime(currentTimeSeconds)}</Text>
                <Text style={styles.playbackTimeLabel}>{formatPlaybackTime(durationSeconds)}</Text>
              </View>
              <Pressable onLayout={handleProgressTrackLayout} onPress={handleSeekPress} style={styles.playbackTrack}>
                <View style={styles.playbackTrackBase} />
                <View style={[styles.playbackTrackFill, { width: `${progressRatio * 100}%` }]} />
                <View style={[styles.playbackTrackThumb, { left: `${progressRatio * 100}%` }]} />
              </Pressable>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

function getExpoVideoModule() {
  if (cachedExpoVideoModule !== undefined) {
    return cachedExpoVideoModule;
  }

  try {
    cachedExpoVideoModule = require("expo-video") as ExpoVideoModule;
  } catch (error) {
    console.warn("Sohba video module is unavailable in this build.", error);
    cachedExpoVideoModule = null;
  }

  return cachedExpoVideoModule;
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
  activeColor = darkPalette.danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
  activeColor?: string;
}) {
  return (
    <Pressable hitSlop={6} onPress={onPress} style={styles.railAction}>
      <Ionicons color={active ? activeColor : "#ffffff"} name={icon} size={28} style={styles.railIcon} />
      <Text numberOfLines={1} style={styles.railActionLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

function isPlayableVideoSource(source: string) {
  if (!source.trim()) {
    return false;
  }

  return !source.includes("example.com");
}

function normalizePlayableVideoUri(source: string) {
  return source.includes("res.cloudinary.com") ? buildCloudinaryPlayableVideoUrl(source) : source;
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

function formatPlaybackTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0:00";
  }

  const totalSeconds = Math.floor(value);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
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

const styles = createThemedStyles(
  {
  feedFollowButton: {
    backgroundColor: palette.primary,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  feedFollowingButton: {
    backgroundColor: palette.surfaceRaised,
  },
  feedFollowButtonLabel: {
    color: "#04110b",
    fontSize: 12,
    fontWeight: "800",
  },
  feedFollowingButtonLabel: {
    color: palette.text,
  },
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
  feedHeaderIconButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  feedMediaShell: {
    aspectRatio: 9 / 16,
    borderRadius: 28,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  feedAudioToggle: {
    alignItems: "center",
    backgroundColor: "rgba(7,12,18,0.62)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: radii.pill,
    borderWidth: 1,
    elevation: 24,
    height: 34,
    justifyContent: "center",
    position: "absolute",
    right: spacing.sm,
    top: spacing.sm,
    width: 34,
    zIndex: 24,
  },
  videoSurface: {
    flex: 1,
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
    backgroundColor: "#000",
    flex: 1,
    overflow: "hidden",
  },
  mediaFillLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  immersiveBadges: {
    flexDirection: "row",
    gap: spacing.sm,
    left: spacing.md,
    position: "absolute",
    top: spacing.lg,
    zIndex: 2,
  },
  audioToggle: {
    alignItems: "center",
    backgroundColor: "rgba(7,12,18,0.62)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: radii.pill,
    borderWidth: 1,
    elevation: 24,
    height: 34,
    justifyContent: "center",
    position: "absolute",
    right: spacing.lg,
    top: spacing.lg,
    width: 34,
    zIndex: 24,
  },
  reelBadge: {
    alignItems: "center",
    backgroundColor: "rgba(10,13,18,0.52)",
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  boostBadge: {
    backgroundColor: "rgba(20,34,52,0.65)",
  },
  reelBadgeLabel: {
    color: palette.text,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  immersiveFooter: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: spacing.sm,
    left: spacing.md,
    paddingBottom: spacing.lg,
    position: "absolute",
    right: spacing.sm,
    bottom: 0,
    zIndex: 2,
  },
  immersiveInfo: {
    alignSelf: "flex-end",
    flex: 1,
    gap: 6,
    justifyContent: "flex-end",
    paddingBottom: 4,
  },
  immersiveCreatorRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  avatar: {
    backgroundColor: "#1a2b3d",
    borderColor: "rgba(255,255,255,0.6)",
    borderRadius: 16,
    borderWidth: 1,
    height: 32,
    width: 32,
  },
  creatorTextWrap: {
    flex: 1,
    gap: 2,
  },
  immersiveHandle: {
    color: "#ffffff",
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  immersiveName: {
    color: palette.textSoft,
    fontSize: 12,
    fontWeight: "600",
  },
  followButton: {
    borderColor: "rgba(255,255,255,0.85)",
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  followingButton: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderColor: "rgba(255,255,255,0.3)",
  },
  followButtonLabel: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  followingButtonLabel: {
    color: "rgba(255,255,255,0.85)",
  },
  immersiveCaption: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 19,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  immersiveTags: {
    color: "rgba(138,232,198,0.98)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.1,
    lineHeight: 16,
  },
  immersiveMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  immersiveMetaText: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    fontWeight: "600",
  },
  actionRail: {
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 16,
    paddingBottom: 4,
    width: 52,
  },
  railAction: {
    alignItems: "center",
    gap: 2,
    width: "100%",
  },
  railActionRow: {
    alignItems: "center",
    flexDirection: "column",
    gap: 3,
  },
  railActionIconShell: {
    alignItems: "center",
    backgroundColor: "rgba(6,9,13,0.45)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 12,
    borderWidth: 1,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  railActionLabelPill: {
    minWidth: 24,
    paddingHorizontal: 2,
    paddingVertical: 0,
  },
  railActionLabelPillActive: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  railIcon: {
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  railActionLabel: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  centerPlaybackHotspot: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 1,
  },
  centerPlaybackButton: {
    alignItems: "center",
    backgroundColor: "rgba(6,9,13,0.55)",
    borderColor: "rgba(255,255,255,0.16)",
    borderRadius: 26,
    borderWidth: 1,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  playbackTimelineWrap: {
    left: spacing.lg,
    position: "absolute",
    right: spacing.lg,
    zIndex: 3,
  },
  playbackTimelineHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  playbackTimeLabel: {
    color: palette.text,
    fontSize: 10,
    fontWeight: "700",
  },
  playbackTrack: {
    height: 18,
    justifyContent: "center",
  },
  playbackTrackBase: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 999,
    height: 4,
    width: "100%",
  },
  playbackTrackFill: {
    backgroundColor: palette.text,
    borderRadius: 999,
    height: 4,
    left: 0,
    position: "absolute",
    top: 7,
  },
  playbackTrackThumb: {
    backgroundColor: palette.text,
    borderRadius: 7,
    height: 14,
    marginLeft: -7,
    position: "absolute",
    top: 2,
    width: 14,
  },
  },
  { keepDark: ["videoSurface", "videoView", "roundedVideoView", "imageFallback", "roundedMediaImage", "feedMediaShell", "feedAudioToggle", "immersiveCard", "fullScreenCard", "immersiveMediaShell", "mediaFillLayer", "immersiveBadges", "audioToggle", "reelBadge", "boostBadge", "reelBadgeLabel", "immersiveFooter", "immersiveInfo", "immersiveCreatorRow", "avatar", "creatorTextWrap", "immersiveHandle", "immersiveName", "followButton", "followingButton", "followButtonLabel", "followingButtonLabel", "immersiveCaption", "immersiveTags", "immersiveMetaRow", "immersiveMetaText", "actionRail", "railAction", "railActionRow", "railActionIconShell", "railActionLabelPill", "railActionLabelPillActive", "railIcon", "railActionLabel", "centerPlaybackHotspot", "centerPlaybackButton", "playbackTimelineWrap", "playbackTimelineHeader", "playbackTimeLabel", "playbackTrack", "playbackTrackBase", "playbackTrackFill", "playbackTrackThumb"] }
);
