import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "./Avatar";
import { formatDate } from "../utils/timeFormatting";
import { Modal, Image, Pressable, ScrollView, Text, View } from "react-native";
import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { Post, User } from "../types/models";
import { palette, radii, spacing, createThemedStyles } from "../theme";

interface PostPreviewSheetProps {
  post: Post | null;
  author?: User;
  visible: boolean;
  onClose: () => void;
  onAuthorPress?: () => void;
}

export function PostPreviewSheet({ post, author, visible, onClose, onAuthorPress }: PostPreviewSheetProps) {
  const { language } = useAppState();
  const copy = getCopy(language);
  const primaryMedia = post?.media[0];

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <Pressable onPress={onClose} style={styles.tapAway} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.kicker}>{copy.postPreview}</Text>
              <Text style={styles.title}>{author ? `@${author.username}` : `${copy.appName} ${copy.post.toLowerCase()}`}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons color={palette.text} name="close" size={20} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {author ? (
              <Pressable disabled={!onAuthorPress} onPress={onAuthorPress} style={styles.authorRow}>
                <Avatar name={author.name} style={styles.avatar} uri={author.profileImage} />
                <View style={styles.authorCopy}>
                  <Text style={styles.authorName}>{author.name}</Text>
                  <Text style={styles.authorMeta}>@{author.username}</Text>
                </View>
              </Pressable>
            ) : null}

            {primaryMedia ? (
              <View style={styles.mediaFrame}>
                <Image
                  resizeMode="cover"
                  source={{ uri: primaryMedia.thumbnailUrl || primaryMedia.url }}
                  style={styles.mediaImage}
                />
                {primaryMedia.type === "video" ? (
                  <View style={styles.videoBadge}>
                    <Ionicons color={palette.text} name="play" size={15} />
                    <Text style={styles.videoBadgeLabel}>
                      {primaryMedia.durationSeconds ? formatDuration(primaryMedia.durationSeconds) : copy.video}
                    </Text>
                  </View>
                ) : null}
                {post && post.media.length > 1 ? (
                  <View style={styles.carouselBadge}>
                    <Ionicons color={palette.text} name="albums-outline" size={14} />
                    <Text style={styles.carouselBadgeLabel}>{post.media.length} {copy.mediaCountLabel}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {post?.location?.trim() ? <Text style={styles.location}>{post.location.trim()}</Text> : null}
            {post?.caption?.trim() ? <Text style={styles.caption}>{post.caption}</Text> : null}
            {post?.hashtags?.length ? (
              <Text style={styles.hashtags}>{post.hashtags.map((tag) => `#${tag}`).join(" ")}</Text>
            ) : null}

            {post ? (
              <View style={styles.statsRow}>
                <StatPill icon="heart-outline" label={`${post.likedBy.length} ${copy.like.toLowerCase()}`} />
                <StatPill icon="chatbubble-outline" label={`${post.commentCount} ${copy.comment.toLowerCase()}`} />
                <StatPill icon="time-outline" label={formatRelativeDate(post.createdAt)} />
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function StatPill({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.statPill}>
      <Ionicons color={palette.text} name={icon} size={14} />
      <Text style={styles.statPillLabel}>{label}</Text>
    </View>
  );
}

function formatDuration(value: number) {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  const minutes = Math.floor(safeValue / 60);
  const seconds = Math.floor(safeValue % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatRelativeDate(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffHours = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60)));
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return formatDate(iso, { month: "short", day: "numeric" });
}

const styles = createThemedStyles({
  backdrop: {
    backgroundColor: "rgba(1,4,7,0.56)",
    flex: 1,
    justifyContent: "flex-end",
  },
  tapAway: {
    flex: 1,
  },
  sheet: {
    backgroundColor: "#081018",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    maxHeight: "88%",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  kicker: {
    color: palette.accentSoft,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  title: {
    color: palette.text,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 4,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: radii.pill,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  content: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  authorRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  authorCopy: {
    gap: 2,
  },
  authorName: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "800",
  },
  authorMeta: {
    color: palette.muted,
    fontSize: 12,
  },
  mediaFrame: {
    backgroundColor: "#04080d",
    borderRadius: radii.xl,
    overflow: "hidden",
    position: "relative",
  },
  mediaImage: {
    width: "100%",
    aspectRatio: 1,
  },
  videoBadge: {
    alignItems: "center",
    backgroundColor: "rgba(3,10,16,0.76)",
    borderRadius: radii.pill,
    bottom: 12,
    flexDirection: "row",
    gap: 6,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    position: "absolute",
  },
  videoBadgeLabel: {
    color: palette.text,
    fontSize: 11,
    fontWeight: "800",
  },
  carouselBadge: {
    alignItems: "center",
    backgroundColor: "rgba(3,10,16,0.76)",
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    position: "absolute",
    right: 12,
    top: 12,
  },
  carouselBadgeLabel: {
    color: palette.text,
    fontSize: 11,
    fontWeight: "800",
  },
  location: {
    color: palette.accentSoft,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  caption: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
  },
  hashtags: {
    color: palette.primary,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  statPill: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  statPillLabel: {
    color: palette.text,
    fontSize: 12,
    fontWeight: "700",
  },
});
