import { Ionicons } from "@expo/vector-icons";
import { useCopy } from "../utils/useCopy";
import { formatDate } from "../utils/timeFormatting";
import { useEventListener } from "expo";
import { useEffect, useMemo, useState } from "react";
import {
  AppState,
  AppStateStatus,
  Image,
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";
import { buildCloudinaryPlayableVideoUrl } from "../services/mediaUpload";
import { Post, PostMediaItem, User } from "../types/models";
import { palette, radii, shadows, spacing, createThemedStyles } from "../theme";

type ExpoVideoModule = typeof import("expo-video");
let cachedExpoVideoModule: ExpoVideoModule | null | undefined;

interface PostCardProps {
  post: Post;
  author: User;
  currentUserId?: string;
  mediaPlaybackEnabled?: boolean;
  saved?: boolean;
  onLike: () => void;
  onComment: () => void;
  onSave: () => void;
  onAuthorPress: () => void;
  onDelete?: () => void;
  onReport?: () => void;
}

export function PostCard({
  post,
  author,
  currentUserId,
  mediaPlaybackEnabled = true,
  saved = false,
  onLike,
  onComment,
  onSave,
  onAuthorPress,
  onDelete,
  onReport,
}: PostCardProps) {
  const copy = useCopy();
  const [activeIndex, setActiveIndex] = useState(0);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const isLiked = currentUserId ? post.likedBy.includes(currentUserId) : false;
  const activeMedia = post.media[activeIndex] ?? post.media[0];

  function handleCarouselLayout(event: LayoutChangeEvent) {
    setCarouselWidth(event.nativeEvent.layout.width);
  }

  async function handleShare() {
    try {
      await Share.share({
        message: `${author.name} on Sohba\n\n${post.caption}${post.hashtags.length ? `\n\n${post.hashtags.map((tag) => `#${tag}`).join(" ")}` : ""}`,
      });
    } catch {
      // Native share sheet can fail silently on some devices.
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable onPress={onAuthorPress} style={styles.authorRow}>
          <Image source={{ uri: author.profileImage }} style={styles.avatar} />
          <View style={styles.authorCopy}>
            <Text numberOfLines={1} style={styles.username}>
              {author.username}
            </Text>
            <Text numberOfLines={1} style={styles.metaText}>
              {post.location?.trim() || formatRelativeDate(post.createdAt)}
            </Text>
          </View>
        </Pressable>

        <View style={styles.headerActions}>
          {post.media.length > 1 ? (
            <View style={styles.carouselBadge}>
              <Ionicons color={palette.text} name="albums-outline" size={14} />
              <Text style={styles.carouselBadgeLabel}>
                {activeIndex + 1}/{post.media.length}
              </Text>
            </View>
          ) : null}
          {onDelete ? (
            <Pressable hitSlop={10} onPress={onDelete} style={styles.headerIconButton}>
              <Ionicons color={palette.muted} name="trash-outline" size={18} />
            </Pressable>
          ) : null}
          {onReport ? (
            <Pressable accessibilityLabel={copy.reportAction} hitSlop={10} onPress={onReport} style={styles.headerIconButton}>
              <Ionicons color={palette.muted} name="flag-outline" size={17} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View onLayout={handleCarouselLayout} style={styles.mediaViewport}>
        <ScrollView
          horizontal
          style={styles.carouselScroller}
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            if (!carouselWidth) {
              return;
            }

            const nextIndex = Math.round(event.nativeEvent.contentOffset.x / carouselWidth);
            setActiveIndex(nextIndex);
          }}
        >
          {post.media.map((media) => (
            <View
              key={media.id}
              style={[styles.mediaPage, carouselWidth ? { width: carouselWidth } : null]}
            >
              <PostMediaFrame active={mediaPlaybackEnabled && activeMedia?.id === media.id} media={media} />
            </View>
          ))}
        </ScrollView>

        {post.media.length > 1 ? (
          <View style={styles.dotRow}>
            {post.media.map((media, index) => (
              <View
                key={media.id}
                style={[styles.dot, activeIndex === index ? styles.dotActive : null]}
              />
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        <View style={styles.primaryActions}>
          <ActionButton active={isLiked} icon={isLiked ? "heart" : "heart-outline"} onPress={onLike} />
          <ActionButton icon="chatbubble-outline" onPress={onComment} />
          <ActionButton icon="paper-plane-outline" onPress={handleShare} />
        </View>
        <ActionButton active={saved} icon={saved ? "bookmark" : "bookmark-outline"} onPress={onSave} />
      </View>

      <View style={styles.statsRow}>
        <Text style={styles.statsText}>{formatCount(post.likedBy.length)} likes</Text>
        <Text style={styles.statsDivider}>/</Text>
        <Text style={styles.statsText}>{formatCount(post.commentCount)} comments</Text>
      </View>

      {post.caption.trim() ? (
        <Text style={styles.caption}>
          <Text style={styles.captionUsername}>{author.username}</Text> {post.caption}
        </Text>
      ) : null}

      {post.hashtags.length > 0 ? (
        <Text numberOfLines={2} style={styles.hashtags}>
          {post.hashtags.map((tag) => `#${tag}`).join(" ")}
        </Text>
      ) : null}
    </View>
  );
}

function PostMediaFrame({ media, active }: { media: PostMediaItem; active: boolean }) {
  if (media.type === "video") {
    return <InlineVideo media={media} playing={active} />;
  }

  return <Image resizeMode="cover" source={{ uri: media.url }} style={styles.mediaImage} />;
}

function InlineVideo({ media, playing }: { media: PostMediaItem; playing: boolean }) {
  const expoVideo = getExpoVideoModule();
  const [muted, setMuted] = useState(true);

  if (!expoVideo) {
    return <Image resizeMode="cover" source={{ uri: media.thumbnailUrl || media.url }} style={styles.mediaImage} />;
  }

  return <LoadedInlineVideo expoVideo={expoVideo} media={media} muted={muted} onToggleMuted={() => setMuted((current) => !current)} playing={playing} />;
}

function LoadedInlineVideo({
  expoVideo,
  media,
  playing,
  muted,
  onToggleMuted,
}: {
  expoVideo: ExpoVideoModule;
  media: PostMediaItem;
  playing: boolean;
  muted: boolean;
  onToggleMuted: () => void;
}) {
  const source = useMemo(
    () => (media.url.includes("res.cloudinary.com") ? buildCloudinaryPlayableVideoUrl(media.url) : media.url),
    [media.url]
  );
  const { VideoView, useVideoPlayer } = expoVideo;
  const player = useVideoPlayer(source, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.audioMixingMode = "doNotMix";
    videoPlayer.muted = muted;
    videoPlayer.volume = muted ? 0 : 1;
    videoPlayer.staysActiveInBackground = false;
    videoPlayer.showNowPlayingNotification = false;
    videoPlayer.timeUpdateEventInterval = 0.25;
    if (playing) {
      videoPlayer.play();
    }
  });
  const [isPlaying, setIsPlaying] = useState(Boolean(playing));

  useEventListener(player, "playingChange", ({ isPlaying: nextIsPlaying }) => {
    setIsPlaying(nextIsPlaying);
  });

  useEffect(() => {
    try {
      player.audioMixingMode = "doNotMix";
      player.muted = muted;
      player.volume = muted ? 0 : 1;
      player.staysActiveInBackground = false;
      player.showNowPlayingNotification = false;
      if (playing) {
        player.play();
      } else {
        player.pause();
      }
    } catch {
      // Ignore native player timing failures on hydration.
    }
  }, [muted, player, playing]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state: AppStateStatus) => {
      try {
        if (state === "active" && playing) {
          player.audioMixingMode = "doNotMix";
          player.muted = muted;
          player.volume = muted ? 0 : 1;
          player.play();
        } else {
          player.pause();
        }
      } catch {
        // Ignore lifecycle cleanup errors from the native player.
      }
    });

    return () => {
      subscription.remove();
      try {
        player.pause();
      } catch {
        // Ignore cleanup issues.
      }
    };
  }, [muted, player, playing]);

  return (
    <Pressable
      onPress={() => {
        try {
          if (player.playing) {
            player.pause();
          } else {
            player.play();
          }
        } catch {
          // Ignore playback toggle failures on unstable native state.
        }
      }}
      style={styles.videoShell}
    >
      <VideoView
        allowsPictureInPicture={false}
        contentFit="cover"
        fullscreenOptions={{ enable: false }}
        nativeControls={false}
        player={player}
        style={styles.mediaImage}
      />
      <Pressable onPress={onToggleMuted} style={styles.muteButton}>
        <Ionicons color={palette.text} name={muted ? "volume-mute" : "volume-high"} size={16} />
      </Pressable>
      {!isPlaying ? (
        <View style={styles.playOverlay}>
          <Ionicons color={palette.text} name="play" size={28} />
        </View>
      ) : null}
    </Pressable>
  );
}

function ActionButton({
  icon,
  onPress,
  active = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void | Promise<void>;
  active?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={styles.actionButton}>
      <Ionicons color={active ? "#ff5d7d" : palette.text} name={icon} size={22} />
    </Pressable>
  );
}

function getExpoVideoModule() {
  if (cachedExpoVideoModule !== undefined) {
    return cachedExpoVideoModule;
  }

  try {
    cachedExpoVideoModule = require("expo-video") as ExpoVideoModule;
  } catch {
    cachedExpoVideoModule = null;
  }

  return cachedExpoVideoModule;
}

function formatCount(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  return String(value);
}

function formatRelativeDate(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffHours = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60)));
  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d`;
  }

  return formatDate(iso, { month: "short", day: "numeric" });
}

const styles = createThemedStyles({
  card: {
    backgroundColor: "#0b1219",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 28,
    borderWidth: 1,
    overflow: "hidden",
    ...shadows.card,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  authorRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
  },
  avatar: {
    borderRadius: 20,
    height: 40,
    width: 40,
  },
  authorCopy: {
    flex: 1,
    gap: 2,
  },
  username: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "800",
  },
  metaText: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  headerIconButton: {
    alignItems: "center",
    borderRadius: radii.pill,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  carouselBadge: {
    alignItems: "center",
    backgroundColor: "rgba(2,6,10,0.75)",
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  carouselBadgeLabel: {
    color: palette.text,
    fontSize: 11,
    fontWeight: "800",
  },
  mediaViewport: {
    aspectRatio: 4 / 5,
    position: "relative",
    width: "100%",
  },
  carouselScroller: {
    flex: 1,
  },
  mediaPage: {
    height: "100%",
  },
  mediaImage: {
    height: "100%",
    width: "100%",
  },
  videoShell: {
    flex: 1,
  },
  muteButton: {
    alignItems: "center",
    backgroundColor: "rgba(2,6,10,0.72)",
    borderRadius: radii.pill,
    height: 34,
    justifyContent: "center",
    position: "absolute",
    right: spacing.sm,
    top: spacing.sm,
    width: 34,
  },
  playOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(2,6,10,0.42)",
    borderRadius: radii.pill,
    height: 56,
    justifyContent: "center",
    left: "50%",
    marginLeft: -28,
    marginTop: -28,
    position: "absolute",
    top: "50%",
    width: 56,
  },
  dotRow: {
    alignItems: "center",
    bottom: spacing.sm,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
  },
  dot: {
    backgroundColor: "rgba(255,255,255,0.35)",
    borderRadius: radii.pill,
    height: 6,
    width: 6,
  },
  dotActive: {
    backgroundColor: palette.text,
    width: 18,
  },
  actions: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  primaryActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionButton: {
    alignItems: "center",
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  statsRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingTop: 4,
  },
  statsText: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "700",
  },
  statsDivider: {
    color: palette.mutedSoft,
    fontSize: 13,
    fontWeight: "700",
  },
  caption: {
    color: palette.textSoft,
    fontSize: 14,
    lineHeight: 21,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  captionUsername: {
    color: palette.text,
    fontWeight: "800",
  },
  hashtags: {
    color: "#79b8ff",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
    paddingHorizontal: spacing.md,
    paddingTop: 6,
    paddingBottom: spacing.md,
  },
});
