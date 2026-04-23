import { useEffect } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { useAppState } from "../providers/AppProvider";
import { palette, radii, spacing } from "../theme";

export function DirectInboxScreen({ navigation }: { navigation: any }) {
  const { currentUser, directThreads, getUserById, getDirectUnreadCount, getTotalDirectUnreadCount, getUserPresence, refreshDirectInbox } =
    useAppState();

  useEffect(() => {
    void refreshDirectInbox();
    const unsubscribe = navigation.addListener("focus", () => {
      void refreshDirectInbox();
    });

    return unsubscribe;
  }, [navigation]);

  const userThreads = currentUser ? directThreads.filter((thread) => thread.participantIds.includes(currentUser.id)) : [];
  const totalUnreadCount = getTotalDirectUnreadCount();

  return (
    <Screen scrollable>
      <View style={styles.heroCard}>
        <SectionTitle
          title="Direct messages"
          subtitle={
            userThreads.length > 0
              ? `${userThreads.length} mutual-follow conversations are open right now, with ${totalUnreadCount} unread messages.`
              : "Chat unlocks only after both users follow each other."
          }
        />
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroValue}>{userThreads.length}</Text>
            <Text style={styles.heroLabel}>Unlocked chats</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroValue}>{totalUnreadCount}</Text>
            <Text style={styles.heroLabel}>Unread</Text>
          </View>
        </View>
      </View>

      {userThreads.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No direct chats yet</Text>
          <Text style={styles.emptyBody}>
            Follow a creator and once they follow you back, the Message button will unlock on their profile.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {userThreads.map((thread) => {
            const counterpartId = thread.participantIds.find((participantId) => participantId !== currentUser?.id);
            const counterpart = counterpartId ? getUserById(counterpartId) : undefined;
            const unreadCount = getDirectUnreadCount(thread.id);
            const presence = counterpartId ? getUserPresence(counterpartId) : undefined;

            return (
              <Pressable
                key={thread.id}
                onPress={() => navigation.navigate("DirectChat", { threadId: thread.id })}
                style={styles.threadCard}
              >
                <Image
                  source={{
                    uri:
                      counterpart?.profileImage ||
                      "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=400&q=80",
                  }}
                  style={styles.avatar}
                />
                <View style={styles.threadBody}>
                  <View style={styles.threadTop}>
                    <Text numberOfLines={1} style={styles.threadTitle}>
                      {counterpart?.name ?? "Creator"}
                    </Text>
                    <View style={styles.threadTopRight}>
                      {unreadCount > 0 ? (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadBadgeLabel}>{unreadCount}</Text>
                        </View>
                      ) : null}
                      <Text style={styles.threadTime}>{new Date(thread.lastMessageAt).toLocaleDateString()}</Text>
                    </View>
                  </View>
                  <Text style={styles.threadMeta}>@{counterpart?.username ?? "mutual.follow"}</Text>
                  <Text style={styles.presenceText}>{formatPresenceLabel(presence)}</Text>
                  <Text numberOfLines={2} style={styles.threadPreview}>
                    {thread.lastMessagePreview}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: palette.card,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.xl,
  },
  heroStats: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  heroStat: {
    backgroundColor: palette.glass,
    borderColor: palette.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    padding: spacing.md,
  },
  heroValue: {
    color: palette.text,
    fontSize: 22,
    fontWeight: "900",
  },
  heroLabel: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  list: {
    gap: spacing.md,
  },
  threadCard: {
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: palette.cardAlt,
  },
  threadBody: {
    flex: 1,
    gap: 4,
    justifyContent: "center",
  },
  threadTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  threadTopRight: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  threadTitle: {
    color: palette.text,
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
  },
  threadTime: {
    color: palette.muted,
    fontSize: 11,
  },
  threadMeta: {
    color: palette.accentSoft,
    fontSize: 13,
    fontWeight: "700",
  },
  presenceText: {
    color: palette.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  threadPreview: {
    color: palette.textSoft,
    fontSize: 13,
    lineHeight: 20,
  },
  unreadBadge: {
    alignItems: "center",
    backgroundColor: palette.primary,
    borderRadius: 999,
    justifyContent: "center",
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  unreadBadgeLabel: {
    color: "#071118",
    fontSize: 11,
    fontWeight: "900",
  },
  emptyCard: {
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  emptyTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "900",
  },
  emptyBody: {
    color: palette.textSoft,
    fontSize: 14,
    lineHeight: 22,
  },
});

function formatPresenceLabel(presence?: { isOnline: boolean; lastSeenAt?: string }) {
  if (presence?.isOnline) {
    return "Online now";
  }

  if (!presence?.lastSeenAt) {
    return "Offline";
  }

  return `Last seen ${formatRelativeTime(presence.lastSeenAt)}`;
}

function formatRelativeTime(timestamp: string) {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffMinutes = Math.max(Math.floor(diffMs / 60000), 0);

  if (diffMinutes < 1) {
    return "just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
