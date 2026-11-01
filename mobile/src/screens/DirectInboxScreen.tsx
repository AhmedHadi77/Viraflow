import { useEffect, useMemo, useState } from "react";
import { Avatar } from "../components/Avatar";
import { Ionicons } from "@expo/vector-icons";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { Screen } from "../components/Screen";
import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { palette, radii, spacing, createThemedStyles } from "../theme";
import { formatRelativeTime } from "../utils/timeFormatting";

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

  const [filter, setFilter] = useState<"all" | "unread">("all");
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleThreads = userThreads.filter((thread) => {
    if (filter === "unread" && getDirectUnreadCount(thread.id) === 0) {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }
    const counterpartId = thread.participantIds.find((participantId) => participantId !== currentUser?.id);
    const counterpart = counterpartId ? getUserById(counterpartId) : undefined;
    return Boolean(
      counterpart &&
        (counterpart.name.toLowerCase().includes(normalizedQuery) || counterpart.username.toLowerCase().includes(normalizedQuery))
    );
  });
  const threadUserIds = new Set(userThreads.flatMap((thread) => thread.participantIds));
  const newPeople = searchResults.filter((user) => !threadUserIds.has(user.id));

  return (
    <Screen scrollable contentContainerStyle={styles.content}>
      <View style={styles.searchField}>
        <Ionicons color={palette.muted} name="search" size={18} />
        <TextInput
          accessibilityLabel={copy.searchUsersLabel}
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setSearchQuery}
          placeholder={copy.searchUsersPlaceholder}
          placeholderTextColor={palette.mutedSoft}
          returnKeyType="search"
          style={styles.searchInput}
          value={searchQuery}
        />
        {searchQuery ? (
          <Pressable accessibilityLabel={copy.cancel} hitSlop={8} onPress={() => setSearchQuery("")}>
            <Ionicons color={palette.muted} name="close-circle" size={18} />
          </Pressable>
        ) : null}
      </View>

      <View accessibilityRole="tablist" style={styles.filterRow}>
        {(["all", "unread"] as const).map((option) => {
          const selected = filter === option;
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              key={option}
              onPress={() => setFilter(option)}
              style={[styles.filterChip, selected ? styles.filterChipActive : null]}
            >
              <Text style={[styles.filterChipLabel, selected ? styles.filterChipLabelActive : null]}>
                {option === "all" ? copy.all : totalUnreadCount > 0 ? `${copy.unread} · ${totalUnreadCount}` : copy.unread}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {visibleThreads.length > 0 ? (
        <View style={styles.list}>
          {visibleThreads.map((thread) => {
            const counterpartId = thread.participantIds.find((participantId) => participantId !== currentUser?.id);
            const counterpart = counterpartId ? getUserById(counterpartId) : undefined;
            const unreadCount = getDirectUnreadCount(thread.id);
            const presence = counterpartId ? getUserPresence(counterpartId) : undefined;
            const hasUnread = unreadCount > 0;

            return (
              <Pressable
                accessibilityRole="button"
                key={thread.id}
                onPress={() => navigation.navigate("DirectChat", { threadId: thread.id })}
                style={({ pressed }) => [styles.threadRow, pressed ? styles.threadRowPressed : null]}
              >
                <View>
                  <Avatar name={counterpart?.name} style={styles.avatar} uri={counterpart?.profileImage} />
                  {presence?.isOnline ? <View style={styles.onlineDot} /> : null}
                </View>
                <View style={styles.threadBody}>
                  <View style={styles.threadTop}>
                    <Text numberOfLines={1} style={[styles.threadTitle, hasUnread ? styles.threadTitleUnread : null]}>
                      {counterpart?.name ?? copy.creatorStudio}
                    </Text>
                    <Text style={[styles.threadTime, hasUnread ? styles.threadTimeUnread : null]}>
                      {formatRelativeTime(thread.lastMessageAt, language)}
                    </Text>
                  </View>
                  <View style={styles.threadBottom}>
                    <Text numberOfLines={1} style={[styles.threadPreview, hasUnread ? styles.threadPreviewUnread : null]}>
                      {thread.lastMessagePreview}
                    </Text>
                    {hasUnread ? (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeLabel}>{unreadCount}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : !normalizedQuery ? (
        <View style={styles.emptyCard}>
          <Ionicons color={palette.primary} name="chatbubbles-outline" size={28} />
          <Text style={styles.emptyTitle}>{filter === "unread" ? copy.allCaughtUp : copy.noDirectChatsTitle}</Text>
          <Text style={styles.emptyBody}>{filter === "unread" ? copy.notificationsCaughtUpBody : copy.noDirectChatsBody}</Text>
        </View>
      ) : null}

      {normalizedQuery ? (
        <View style={styles.peopleSection}>
          <Text style={styles.sectionLabel}>{copy.startNewChat}</Text>
          {newPeople.length > 0 ? (
            newPeople.map((user) => {
              const unlocked = canDirectMessageUser(user.id);
              return (
                <Pressable
                  accessibilityRole="button"
                  key={user.id}
                  onPress={() => {
                    void handleStartChat(user.id);
                  }}
                  style={({ pressed }) => [styles.threadRow, pressed ? styles.threadRowPressed : null]}
                >
                  <Avatar name={user.name} style={styles.avatar} uri={user.profileImage} />
                  <View style={styles.threadBody}>
                    <Text numberOfLines={1} style={styles.threadTitle}>
                      {user.name}
                    </Text>
                    <Text numberOfLines={1} style={styles.threadPreview}>
                      @{user.username}
                    </Text>
                  </View>
                  <View style={[styles.actionPill, unlocked ? styles.actionPillActive : null]}>
                    <Text style={[styles.actionPillLabel, unlocked ? styles.actionPillLabelActive : null]}>
                      {unlocked ? copy.message : copy.locked}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          ) : (
            <Text style={styles.emptyBody}>{copy.noUsersMatchedBody}</Text>
          )}
          <Text style={styles.hintText}>{copy.directSearchSubtitle}</Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = createThemedStyles({
  content: {
    gap: spacing.md,
  },
  searchField: {
    alignItems: "center",
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: 10,
    height: 46,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    color: palette.text,
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    height: 44,
    paddingVertical: 0,
  },
  filterRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  filterChip: {
    alignItems: "center",
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.pill,
    height: 36,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  filterChipActive: {
    backgroundColor: palette.text,
  },
  filterChipLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "600",
  },
  filterChipLabelActive: {
    color: palette.background,
    fontWeight: "700",
  },
  list: {
    marginHorizontal: -spacing.lg,
  },
  threadRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 76,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  threadRowPressed: {
    backgroundColor: palette.surface,
  },
  avatar: {
    borderRadius: 27,
    height: 54,
    width: 54,
  },
  onlineDot: {
    backgroundColor: palette.success,
    borderColor: palette.background,
    borderRadius: 8,
    borderWidth: 3,
    bottom: 0,
    height: 16,
    position: "absolute",
    right: 0,
    width: 16,
  },
  threadBody: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  threadTop: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: spacing.xs,
  },
  threadTitle: {
    color: palette.text,
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
  },
  threadTitleUnread: {
    fontWeight: "800",
  },
  threadTime: {
    color: palette.mutedSoft,
    fontSize: 12,
    fontWeight: "600",
  },
  threadTimeUnread: {
    color: palette.primary,
  },
  threadBottom: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  threadPreview: {
    color: palette.muted,
    flex: 1,
    fontSize: 14,
  },
  threadPreviewUnread: {
    color: palette.text,
    fontWeight: "700",
  },
  unreadBadge: {
    alignItems: "center",
    backgroundColor: palette.primary,
    borderRadius: 10,
    height: 20,
    justifyContent: "center",
    minWidth: 20,
    paddingHorizontal: 6,
  },
  unreadBadgeLabel: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
  },
  peopleSection: {
    gap: 4,
    marginHorizontal: -spacing.lg,
  },
  sectionLabel: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "700",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  actionPill: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  actionPillActive: {
    backgroundColor: palette.primary,
  },
  actionPillLabel: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  actionPillLabelActive: {
    color: "#ffffff",
  },
  hintText: {
    color: palette.mutedSoft,
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    gap: spacing.xs,
    padding: spacing.xl,
  },
  emptyTitle: {
    color: palette.text,
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  emptyBody: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 21,
    paddingHorizontal: spacing.lg,
    textAlign: "center",
  },
});
