import { useEffect, useMemo, useState } from "react";
import { Avatar } from "../components/Avatar";
import { Alert, Image, Pressable, Text, View } from "react-native";
import { InputField } from "../components/InputField";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { palette, radii, spacing, createThemedStyles } from "../theme";
import { formatRelativeTime, formatLocaleDate } from "../utils/timeFormatting";
import { DEFAULT_PROFILE_IMAGE } from "../data/defaultMedia";

export function DirectInboxScreen({ navigation }: { navigation: any }) {
  const {
    language,
    currentUser,
    directThreads,
    users,
    canDirectMessageUser,
    getUserById,
    getDirectUnreadCount,
    getTotalDirectUnreadCount,
    getUserPresence,
    refreshDirectInbox,
    startDirectChat,
  } =
    useAppState();
  const copy = getCopy(language);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    void refreshDirectInbox();
    const unsubscribe = navigation.addListener("focus", () => {
      void refreshDirectInbox();
    });

    return unsubscribe;
  }, [navigation]);

  const userThreads = useMemo(() => {
    if (!currentUser) {
      return [];
    }

    return directThreads
      .filter((thread) => thread.participantIds.includes(currentUser.id))
      .sort((left, right) => new Date(right.lastMessageAt).getTime() - new Date(left.lastMessageAt).getTime());
  }, [currentUser, directThreads]);
  const totalUnreadCount = getTotalDirectUnreadCount();
  const searchResults = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery || !currentUser) {
      return [];
    }

    return users
      .filter((user) => user.id !== currentUser.id)
      .filter(
        (user) =>
          user.name.toLowerCase().includes(normalizedQuery) ||
          user.username.toLowerCase().includes(normalizedQuery) ||
          user.headline.toLowerCase().includes(normalizedQuery)
      )
      .slice(0, 8);
  }, [currentUser, searchQuery, users]);

  async function handleStartChat(targetUserId: string) {
    const result = await startDirectChat(targetUserId);
    if (!result.ok) {
      Alert.alert(copy.directChatUnavailableTitle, result.message ?? copy.directChatUnavailableBody);
      return;
    }

    if (result.threadId) {
      navigation.navigate("DirectChat", { threadId: result.threadId });
    }
  }

  return (
    <Screen scrollable>
      <View style={styles.heroCard}>
        <SectionTitle
          title={copy.directInboxTitle}
          subtitle={
            userThreads.length > 0
              ? `${userThreads.length} ${copy.directInboxSubtitleActive} ${totalUnreadCount} ${copy.unreadMessages.toLowerCase()}.`
              : copy.directInboxSubtitleEmpty
          }
        />
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroValue}>{userThreads.length}</Text>
            <Text style={styles.heroLabel}>{copy.unlockedChats}</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroValue}>{totalUnreadCount}</Text>
            <Text style={styles.heroLabel}>{copy.unreadMessages}</Text>
          </View>
        </View>
      </View>

      <View style={styles.searchCard}>
        <SectionTitle
          title={copy.startNewChat}
          subtitle={copy.directSearchSubtitle}
        />
        <InputField
          label={copy.searchUsersLabel}
          onChangeText={setSearchQuery}
          placeholder={copy.searchUsersPlaceholder}
          value={searchQuery}
        />
        {searchResults.length > 0 ? (
          <View style={styles.searchResults}>
            {searchResults.map((user) => {
              const unlocked = canDirectMessageUser(user.id);
              return (
                <Pressable
                  key={user.id}
                  onPress={() => {
                    void handleStartChat(user.id);
                  }}
                  style={styles.searchResultCard}
                >
                  <Avatar name={user.name} style={styles.searchAvatar} uri={user.profileImage} />
                  <View style={styles.searchBody}>
                    <Text style={styles.searchName}>{user.name}</Text>
                    <Text style={styles.searchMeta}>@{user.username}</Text>
                    <Text numberOfLines={1} style={styles.searchHeadline}>
                      {user.headline || copy.creatorStudio}
                    </Text>
                  </View>
                  <View style={[styles.searchActionPill, unlocked ? styles.searchActionPillActive : null]}>
                    <Text style={[styles.searchActionLabel, unlocked ? styles.searchActionLabelActive : null]}>
                      {unlocked ? copy.message : copy.locked}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : searchQuery.trim() ? (
          <View style={styles.emptySearchCard}>
            <Text style={styles.emptySearchTitle}>{copy.noUsersMatchedTitle}</Text>
            <Text style={styles.emptySearchBody}>{copy.noUsersMatchedBody}</Text>
          </View>
        ) : null}
      </View>

      {userThreads.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{copy.noDirectChatsTitle}</Text>
          <Text style={styles.emptyBody}>{copy.noDirectChatsBody}</Text>
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
                      DEFAULT_PROFILE_IMAGE,
                  }}
                  style={styles.avatar}
                />
                <View style={styles.threadBody}>
                  <View style={styles.threadTop}>
                    <Text numberOfLines={1} style={styles.threadTitle}>
                      {counterpart?.name ?? copy.creatorStudio}
                    </Text>
                    <View style={styles.threadTopRight}>
                      {unreadCount > 0 ? (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadBadgeLabel}>{unreadCount}</Text>
                        </View>
                      ) : null}
                      <Text style={styles.threadTime}>{formatLocaleDate(thread.lastMessageAt, language)}</Text>
                    </View>
                  </View>
                  <Text style={styles.threadMeta}>@{counterpart?.username ?? "mutual.follow"}</Text>
                  <Text style={styles.presenceText}>{formatPresenceLabel(presence, language, copy.onlineNow, copy.offline)}</Text>
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

const styles = createThemedStyles({
  heroCard: {
    gap: spacing.lg,
    paddingTop: spacing.sm,
  },
  heroStats: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  heroStat: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.md,
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
  searchCard: {
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  searchResults: {
    gap: spacing.sm,
  },
  searchResultCard: {
    alignItems: "center",
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  searchAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: palette.cardAlt,
  },
  searchBody: {
    flex: 1,
    gap: 2,
  },
  searchName: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "800",
  },
  searchMeta: {
    color: palette.accentSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  searchHeadline: {
    color: palette.textSoft,
    fontSize: 12,
  },
  searchActionPill: {
    backgroundColor: palette.glass,
    borderColor: palette.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  searchActionPillActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  searchActionLabel: {
    color: palette.text,
    fontSize: 12,
    fontWeight: "900",
  },
  searchActionLabelActive: {
    color: "#ffffff",
  },
  emptySearchCard: {
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: 4,
    padding: spacing.md,
  },
  emptySearchTitle: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "800",
  },
  emptySearchBody: {
    color: palette.textSoft,
    fontSize: 12,
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
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
  },
  emptyCard: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.lg,
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

function formatPresenceLabel(
  presence: { isOnline: boolean; lastSeenAt?: string } | undefined,
  language: Parameters<typeof getCopy>[0],
  onlineLabel: string,
  offlineLabel: string
) {
  if (presence?.isOnline) {
    return onlineLabel;
  }

  if (!presence?.lastSeenAt) {
    return offlineLabel;
  }

  return formatRelativeTime(presence.lastSeenAt, language, {
    style: "short",
    fallbackToDateAfterDays: 14,
  });
}
