import { Ionicons } from "@expo/vector-icons";
import { Image, ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";
import { Reel, User } from "../types/models";
import { palette, radii, shadows, spacing } from "../theme";

interface ReelCardProps {
  reel: Reel;
  creator: User;
  currentUserId?: string;
  commentCount: number;
  immersive?: boolean;
  boostLabel?: string;
  onLike: () => void;
  onComment: () => void;
  onRepost: () => void;
  onOpen: () => void;
  onToggleFollow?: () => void;
}

export function ReelCard({
  reel,
  creator,
  currentUserId,
  commentCount,
  immersive = false,
  boostLabel,
  onLike,
  onComment,
  onRepost,
  onOpen,
  onToggleFollow,
}: ReelCardProps) {
  const isLiked = currentUserId ? reel.likedBy.includes(currentUserId) : false;
  const isFollowing = currentUserId ? creator.followers.includes(currentUserId) : false;

  return (
    <Pressable onPress={onOpen} style={[styles.card, immersive ? styles.immersiveCard : null]}>
      <ImageBackground source={{ uri: reel.thumbnailUrl }} imageStyle={styles.image} style={styles.media}>
        <View style={styles.overlay}>
          <View style={styles.topRow}>
            <View style={styles.creatorWrap}>
              <Image source={{ uri: creator.profileImage }} style={styles.avatar} />
              <View style={styles.creatorMeta}>
                <View style={styles.badgeRow}>
                  <View style={styles.liveBadge}>
                    <Text style={styles.liveLabel}>Trending</Text>
                  </View>
                  {boostLabel ? (
                    <View style={styles.boostBadge}>
                      <Ionicons color={palette.text} name="rocket-outline" size={12} />
                      <Text style={styles.liveLabel}>{boostLabel}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.creatorName}>{creator.name}</Text>
                <Text style={styles.creatorUsername}>@{creator.username}</Text>
              </View>
            </View>
            {onToggleFollow ? (
              <Pressable onPress={onToggleFollow} style={[styles.followButton, isFollowing ? styles.following : null]}>
                <Text style={[styles.followLabel, isFollowing ? styles.followingLabel : null]}>
                  {isFollowing ? "Following" : "Follow"}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.bottomSection}>
            <View style={styles.tagsRow}>
              {reel.tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagLabel}>#{tag}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.caption}>{reel.caption}</Text>
            <View style={styles.footerRow}>
              <View style={styles.metricsMetaRow}>
                <View style={styles.metaPill}>
                  <Ionicons color={palette.accentSoft} name="flash-outline" size={16} />
                  <Text style={styles.metaPillLabel}>Viral momentum</Text>
                </View>
                <View style={styles.metaPill}>
                  <Ionicons color={palette.primary} name="eye-outline" size={16} />
                  <Text style={styles.metaPillLabel}>{formatCompact(reel.viewCount)} views</Text>
                </View>
                <View style={styles.metaPill}>
                  <Ionicons color={palette.text} name="radio-outline" size={16} />
                  <Text style={styles.metaPillLabel}>{formatCompact(reel.reachCount)} reach</Text>
                </View>
              </View>
              <View style={styles.metricsRow}>
                <Action icon={isLiked ? "heart" : "heart-outline"} label={`${reel.likedBy.length}`} active={isLiked} onPress={onLike} />
                <Action icon="chatbubble-ellipses-outline" label={`${commentCount}`} onPress={onComment} />
                <Action icon="repeat-outline" label={`${reel.repostCount}`} onPress={onRepost} />
              </View>
            </View>
          </View>
        </View>
      </ImageBackground>
    </Pressable>
  );
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

function Action({
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
    <Pressable onPress={onPress} style={styles.action}>
      <Ionicons color={active ? palette.danger : palette.text} name={icon} size={20} />
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.card,
    borderRadius: radii.xl,
    overflow: "hidden",
    borderColor: palette.borderStrong,
    borderWidth: 1,
    ...shadows.floating,
  },
  immersiveCard: {
    minHeight: 600,
  },
  media: {
    minHeight: 440,
    justifyContent: "space-between",
  },
  image: {
    borderRadius: radii.xl,
  },
  overlay: {
    flex: 1,
    justifyContent: "space-between",
    padding: spacing.lg,
    backgroundColor: palette.overlay,
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  creatorWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderColor: "rgba(255,255,255,0.45)",
    borderWidth: 1.5,
  },
  creatorMeta: {
    gap: 2,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  liveBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,122,47,0.22)",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  boostBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(54,224,161,0.18)",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  liveLabel: {
    color: palette.text,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  creatorName: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "800",
  },
  creatorUsername: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 13,
  },
  followButton: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.25)",
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: 10,
  },
  following: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  followLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "700",
  },
  followingLabel: {
    color: "#071118",
  },
  bottomSection: {
    gap: spacing.md,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  tag: {
    backgroundColor: "rgba(255,255,255,0.13)",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  tagLabel: {
    color: palette.text,
    fontSize: 12,
    fontWeight: "700",
  },
  caption: {
    color: palette.text,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.4,
    lineHeight: 31,
    maxWidth: "88%",
  },
  footerRow: {
    gap: spacing.sm,
  },
  metricsMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metaPill: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(10,20,31,0.55)",
    borderColor: "rgba(255,255,255,0.16)",
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  metaPillLabel: {
    color: palette.textSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  metricsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  action: {
    alignItems: "center",
    backgroundColor: "rgba(8,16,24,0.55)",
    borderColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  actionLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "700",
  },
});
