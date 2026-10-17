import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  PanResponder,
  Pressable,
  Text,
  View,
} from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { triggerFeedback } from "../services/feedback";
import { getNotificationNavigationTarget } from "../services/notificationRouting";
import {
  buildNotificationStacks,
  formatNotificationTime,
  getNotificationMeta,
  getNotificationStackPreviewUri,
  getNotificationStackSummary,
  NotificationStack,
} from "../services/notificationPresentation";
import { AppNotification } from "../types/models";
import { palette, radii, spacing, createThemedStyles } from "../theme";

export function NotificationsPlaceholderScreen({ navigation }: { navigation: any }) {
  const {
    currentUser,
    language,
    notifications,
    posts,
    pushNotificationsStatus,
    refreshNotifications,
    reels,
    stories,
    markAllNotificationsRead,
    markNotificationRead,
  } = useAppState();
  const copy = getCopy(language);
  const myNotifications = notifications.filter((item) => item.userId === currentUser?.id);
  const unreadNotifications = myNotifications.filter((item) => !item.readAt);
  const readNotifications = myNotifications.filter((item) => item.readAt);
  const [activeFilter, setActiveFilter] = useState<"all" | "activity" | "messages">("all");

  const filteredUnreadNotifications = useMemo(
    () => applyNotificationFilter(unreadNotifications, activeFilter),
    [activeFilter, unreadNotifications]
  );
  const filteredReadNotifications = useMemo(
    () => applyNotificationFilter(readNotifications, activeFilter),
    [activeFilter, readNotifications]
  );
  const timelineSections = useMemo(
    () => buildNotificationTimelineSections(filteredReadNotifications, copy),
    [copy, filteredReadNotifications]
  );

  useEffect(() => {
    void refreshNotifications();
    const unsubscribe = navigation.addListener("focus", () => {
      void refreshNotifications();
    });

    return unsubscribe;
  }, [navigation]);

  async function handleMarkAllRead() {
    const result = await markAllNotificationsRead();
    if (!result.ok) {
      Alert.alert(copy.notificationsUnavailableTitle, result.message ?? copy.notificationsUnavailableBody);
    }
  }

  async function handleOpenNotification(notification: AppNotification) {
    if (!notification.readAt) {
      const result = await markNotificationRead(notification.id);
      if (!result.ok) {
        Alert.alert(copy.notificationUnavailableTitle, result.message ?? copy.notificationUnavailableBody);
        return;
      }
    }

    const target = getNotificationNavigationTarget(notification);
    if (target) {
      navigation.navigate(target.name, target.params);
    }
  }

  async function handleMarkOneRead(notification: AppNotification) {
    const result = await markNotificationRead(notification.id);
    if (!result.ok) {
      Alert.alert(copy.notificationsUnavailableTitle, result.message ?? copy.notificationsUnavailableBody);
    }
  }

  return (
    <Screen scrollable>
      <View style={styles.heroCard}>
        <View style={styles.heroBadgeRow}>
          <View style={styles.heroBadge}>
            <Ionicons color={palette.primary} name="sparkles-outline" size={14} />
            <Text style={styles.heroBadgeLabel}>{copy.realtimeInbox}</Text>
          </View>
        </View>
        <SectionTitle
          title={copy.notifications}
          subtitle={
            unreadNotifications.length > 0
              ? `${unreadNotifications.length} ${copy.notificationsUnreadUpdatesBody}`
              : copy.notificationsCaughtUpBody
          }
        />
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroValue}>{myNotifications.length}</Text>
            <Text style={styles.heroLabel}>{copy.total}</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroValue}>{unreadNotifications.length}</Text>
            <Text style={styles.heroLabel}>{copy.unread}</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroValue}>{copy.live}</Text>
            <Text style={styles.heroLabel}>{copy.realtime}</Text>
          </View>
        </View>
        <PrimaryButton
          label={unreadNotifications.length > 0 ? copy.markAllAsRead : copy.allCaughtUp}
          onPress={() => {
            void handleMarkAllRead();
          }}
          variant="ghost"
          disabled={unreadNotifications.length === 0}
        />
      </View>

      <View style={styles.filterRow}>
        <NotificationFilterChip
          active={activeFilter === "all"}
          icon="apps-outline"
          label={copy.all}
          onPress={() => setActiveFilter("all")}
        />
        <NotificationFilterChip
          active={activeFilter === "activity"}
          icon="heart-outline"
          label={copy.activity}
          onPress={() => setActiveFilter("activity")}
        />
        <NotificationFilterChip
          active={activeFilter === "messages"}
          icon="paper-plane-outline"
          label={copy.messages}
          onPress={() => setActiveFilter("messages")}
        />
      </View>

      <View style={styles.pushCard}>
        <Text style={styles.pushLabel}>{pushNotificationsStatus.mode === "remote" ? copy.remotePushConnected : copy.notificationMode}</Text>
        <Text style={styles.pushTitle}>
          {pushNotificationsStatus.mode === "remote"
            ? copy.remotePushBody
            : pushNotificationsStatus.mode === "local"
              ? copy.localPushBody
              : copy.pushSetupBody}
        </Text>
        <Text style={styles.pushBody}>{pushNotificationsStatus.message}</Text>
      </View>

      {myNotifications.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{copy.noNotificationsYet}</Text>
          <Text style={styles.emptyBody}>
            {copy.notificationsEmptyBody}
          </Text>
        </View>
      ) : (
        <View style={styles.sectionStack}>
          <NotificationSection
            copy={copy}
            items={filteredUnreadNotifications}
            onMarkRead={handleMarkOneRead}
            onOpen={handleOpenNotification}
            posts={posts}
            reels={reels}
            stories={stories}
            title={copy.unreadSection}
          />
          {timelineSections.map((section) => (
            <NotificationSection
              copy={copy}
              key={section.title}
              items={section.items}
              onMarkRead={handleMarkOneRead}
              onOpen={handleOpenNotification}
              posts={posts}
              reels={reels}
              stories={stories}
              title={section.title}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

function NotificationFilterChip({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.filterChip, active ? styles.filterChipActive : null]}>
      <Ionicons color={active ? "#031018" : palette.textSoft} name={icon} size={14} />
      <Text style={[styles.filterChipLabel, active ? styles.filterChipLabelActive : null]}>{label}</Text>
    </Pressable>
  );
}

function NotificationSection({
  copy,
  title,
  items,
  onOpen,
  onMarkRead,
  posts,
  reels,
  stories,
}: {
  copy: ReturnType<typeof getCopy>;
  title: string;
  items: AppNotification[];
  onOpen: (notification: AppNotification) => void | Promise<void>;
  onMarkRead: (notification: AppNotification) => void | Promise<void>;
  posts: typeof useAppState extends () => infer T ? T extends { posts: infer P } ? P : never : never;
  reels: typeof useAppState extends () => infer T ? T extends { reels: infer R } ? R : never : never;
  stories: typeof useAppState extends () => infer T ? T extends { stories: infer S } ? S : never : never;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
      <View style={styles.sectionCard}>
      <Text style={styles.sectionHeading}>{title}</Text>
      <View style={styles.list}>
        {buildNotificationStacks(items).map((stack, index) => (
          <NotificationStackRow
            copy={copy}
            key={stack.id}
            index={index}
            stack={stack}
            onMarkRead={onMarkRead}
            onOpen={onOpen}
            previewUri={getNotificationStackPreviewUri(stack, posts, reels, stories)}
          />
        ))}
      </View>
    </View>
  );
}

function NotificationStackRow({
  copy,
  index,
  stack,
  onOpen,
  onMarkRead,
  previewUri,
}: {
  copy: ReturnType<typeof getCopy>;
  index: number;
  stack: NotificationStack;
  onOpen: (notification: AppNotification) => void | Promise<void>;
  onMarkRead: (notification: AppNotification) => void | Promise<void>;
  previewUri?: string;
}) {
  const meta = getNotificationMeta(stack.primary.type, copy);
  const summary = getNotificationStackSummary(stack, copy);
  const avatars = Array.from(
    new Set(
      stack.items
        .map((item) => item.actorAvatar?.trim())
        .filter((value): value is string => Boolean(value))
    )
  ).slice(0, 3);
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  const hasUnread = stack.unreadCount > 0;
  const maxSwipe = 94;
  const hasTriggeredSwipeFeedback = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        delay: Math.min(index * 35, 180),
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        damping: 18,
        stiffness: 180,
        mass: 0.9,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacity, translateY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) => hasUnread && Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_event, gesture) => {
          if (!hasUnread) {
            return;
          }
          const nextX = Math.max(-maxSwipe, Math.min(0, gesture.dx));
          if (nextX <= -56 && !hasTriggeredSwipeFeedback.current) {
            triggerFeedback("selection");
            hasTriggeredSwipeFeedback.current = true;
          } else if (nextX > -30) {
            hasTriggeredSwipeFeedback.current = false;
          }
          translateX.setValue(nextX);
        },
        onPanResponderRelease: (_event, gesture) => {
          if (!hasUnread) {
            return;
          }
          const toValue = gesture.dx < -52 ? -maxSwipe : 0;
          Animated.spring(translateX, {
            toValue,
            damping: 20,
            stiffness: 220,
            mass: 0.9,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateX, {
            toValue: 0,
            damping: 20,
            stiffness: 220,
            mass: 0.9,
            useNativeDriver: true,
          }).start();
        },
        }),
    [hasUnread, translateX]
  );

  async function handleMarkReadPress() {
    triggerFeedback("confirm");
    await Promise.all(
      stack.items
        .filter((item) => !item.readAt)
        .map((item) => onMarkRead(item))
    );
    Animated.spring(translateX, {
      toValue: 0,
      damping: 20,
      stiffness: 220,
      mass: 0.9,
      useNativeDriver: true,
    }).start();
  }

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <View style={styles.swipeRow}>
        {hasUnread ? (
          <Pressable onPress={() => void handleMarkReadPress()} style={styles.swipeAction}>
            <Ionicons color="#031018" name="checkmark-done-outline" size={18} />
            <Text style={styles.swipeActionLabel}>{stack.unreadCount > 1 ? copy.readAll : copy.readOne}</Text>
          </Pressable>
        ) : null}

        <Animated.View
          {...(hasUnread ? panResponder.panHandlers : {})}
          style={[
            styles.card,
            hasUnread ? styles.cardUnread : null,
            {
              transform: [{ translateX }],
            },
          ]}
        >
          <Pressable
            onPress={() => {
              triggerFeedback("open");
              void (async () => {
                if (stack.unreadCount > 1) {
                  await Promise.all(
                    stack.items
                      .filter((item) => !item.readAt)
                      .map((item) => onMarkRead(item))
                  );
                }

                await onOpen(stack.primary);
              })();
            }}
            style={styles.cardPressable}
          >
            <View style={[styles.iconWrap, { backgroundColor: meta.tint }]}>
              <Ionicons color={meta.color} name={meta.icon} size={18} />
            </View>

            {avatars.length > 0 ? (
              <View style={styles.avatarStack}>
                {avatars.map((avatarUri, avatarIndex) => (
                  <Image
                    key={`${stack.id}-${avatarUri}-${avatarIndex}`}
                    source={{ uri: avatarUri }}
                    style={[
                      styles.avatar,
                      styles.stackAvatar,
                      avatarIndex > 0 ? { marginLeft: -12 } : null,
                    ]}
                  />
                ))}
                {stack.items.length > avatars.length ? (
                  <View style={[styles.avatarFallback, styles.avatarOverflow]}>
                    <Text style={styles.avatarFallbackLabel}>+{stack.items.length - avatars.length}</Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackLabel}>{summary.title.slice(0, 1).toUpperCase()}</Text>
              </View>
            )}

            <View style={styles.cardBody}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{summary.title}</Text>
                <Text style={styles.cardTime}>{formatNotificationTime(stack.primary.createdAt, copy)}</Text>
              </View>
              <Text style={styles.cardText}>{summary.body}</Text>
              {stack.items.length > 1 ? (
                <View style={styles.stackHintRow}>
                  <Text style={styles.stackHintText}>{stack.items.length} {copy.updatesInStack}</Text>
                </View>
              ) : null}
              <View style={styles.cardMetaRow}>
                <View style={styles.cardMetaTag}>
                  <Text style={styles.cardMetaLabel}>
                    {stack.items.length > 1 ? `${meta.label} - ${stack.items.length}` : meta.label}
                  </Text>
                </View>
                {hasUnread ? (
                  <Pressable onPress={() => void handleMarkReadPress()} style={styles.markReadButton}>
                    <Text style={styles.markReadLabel}>{stack.unreadCount > 1 ? copy.markAllAsRead : copy.markRead}</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.readLabel}>{copy.read}</Text>
                )}
              </View>
            </View>

            {previewUri ? <Image source={{ uri: previewUri }} style={styles.mediaPreview} /> : null}
          </Pressable>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

function applyNotificationFilter(
  items: AppNotification[],
  filter: "all" | "activity" | "messages"
) {
  if (filter === "messages") {
    return items.filter((item) => item.type === "message");
  }

  if (filter === "activity") {
    return items.filter((item) => item.type !== "message" && item.type !== "system");
  }

  return items;
}

function buildNotificationTimelineSections(items: AppNotification[], copy: ReturnType<typeof getCopy>) {
  const groups = new Map<string, AppNotification[]>();

  items.forEach((item) => {
    const group = getNotificationTimeGroup(item.createdAt, copy);
    const current = groups.get(group) ?? [];
    current.push(item);
    groups.set(group, current);
  });

  return Array.from(groups.entries()).map(([title, groupedItems]) => ({
    title,
    items: groupedItems,
  }));
}

function getNotificationTimeGroup(value: string, copy: ReturnType<typeof getCopy>) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return copy.earlier;
  }

  const diffHours = Math.max(1, Math.round((Date.now() - timestamp) / 3600000));
  if (diffHours < 24) {
    return copy.today;
  }

  if (diffHours < 24 * 7) {
    return copy.thisWeek;
  }

  return copy.earlier;
}

const styles = createThemedStyles({
  heroCard: {
    backgroundColor: palette.card,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.xl,
  },
  heroBadgeRow: {
    flexDirection: "row",
  },
  heroBadge: {
    alignItems: "center",
    backgroundColor: "rgba(54,224,161,0.12)",
    borderColor: "rgba(54,224,161,0.24)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  heroBadgeLabel: {
    color: palette.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.35,
    textTransform: "uppercase",
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
    fontSize: 20,
    fontWeight: "900",
  },
  heroLabel: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  pushCard: {
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  pushLabel: {
    color: palette.accentSoft,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  pushTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "900",
  },
  pushBody: {
    color: palette.textSoft,
    fontSize: 14,
    lineHeight: 22,
  },
  filterRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  filterChip: {
    alignItems: "center",
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  filterChipLabel: {
    color: palette.textSoft,
    fontSize: 12,
    fontWeight: "800",
  },
  filterChipLabelActive: {
    color: "#031018",
  },
  emptyCard: {
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
  },
  emptyTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: "900",
  },
  emptyBody: {
    color: palette.textSoft,
    fontSize: 14,
    lineHeight: 22,
  },
  sectionStack: {
    gap: spacing.lg,
  },
  sectionCard: {
    gap: spacing.md,
  },
  sectionHeading: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "900",
  },
  list: {
    gap: spacing.md,
  },
  swipeRow: {
    position: "relative",
  },
  swipeAction: {
    alignItems: "center",
    backgroundColor: palette.primary,
    borderRadius: radii.xl,
    bottom: 0,
    gap: 6,
    justifyContent: "center",
    position: "absolute",
    right: 0,
    top: 0,
    width: 88,
  },
  swipeActionLabel: {
    color: "#031018",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardUnread: {
    backgroundColor: palette.cardAlt,
  },
  cardPressable: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    marginTop: 6,
    width: 36,
  },
  avatar: {
    borderRadius: 22,
    height: 44,
    width: 44,
  },
  avatarStack: {
    alignItems: "center",
    flexDirection: "row",
    minWidth: 44,
  },
  stackAvatar: {
    borderColor: "#081018",
    borderWidth: 2,
  },
  avatarFallback: {
    alignItems: "center",
    backgroundColor: "rgba(54,224,161,0.15)",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  avatarOverflow: {
    marginLeft: -12,
  },
  avatarFallbackLabel: {
    color: palette.primary,
    fontSize: 16,
    fontWeight: "900",
  },
  cardBody: {
    flex: 1,
    gap: spacing.xs,
  },
  cardTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  cardTitle: {
    color: palette.text,
    flex: 1,
    fontSize: 15,
    fontWeight: "900",
  },
  cardTime: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  cardText: {
    color: palette.textSoft,
    fontSize: 14,
    lineHeight: 21,
  },
  stackHintRow: {
    marginTop: 2,
  },
  stackHintText: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: "700",
  },
  cardMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  cardMetaTag: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  cardMetaLabel: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  markReadButton: {
    backgroundColor: palette.glass,
    borderColor: palette.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  markReadLabel: {
    color: palette.text,
    fontSize: 11,
    fontWeight: "800",
  },
  readLabel: {
    color: palette.primary,
    fontSize: 11,
    fontWeight: "800",
  },
  mediaPreview: {
    borderRadius: 16,
    height: 58,
    marginLeft: spacing.xs,
    width: 58,
  },
});
