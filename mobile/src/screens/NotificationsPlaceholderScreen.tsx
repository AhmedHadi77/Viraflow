import { useEffect } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { getNotificationNavigationTarget } from "../services/notificationRouting";
import { palette, radii, spacing } from "../theme";

export function NotificationsPlaceholderScreen({ navigation }: { navigation: any }) {
  const { language, notifications, pushNotificationsStatus, refreshNotifications, markAllNotificationsRead } = useAppState();
  const copy = getCopy(language);
  const unreadCount = notifications.filter((item) => !item.readAt).length;

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
      Alert.alert("Could not update notifications", result.message ?? "Please try again.");
    }
  }

  function openNotification(notification: (typeof notifications)[number]) {
    const target = getNotificationNavigationTarget(notification);
    if (target) {
      navigation.navigate(target.name, target.params);
    }
  }

  return (
    <Screen scrollable>
      <View style={styles.heroCard}>
        <SectionTitle
          title={copy.notifications}
          subtitle={unreadCount > 0 ? `${unreadCount} unread updates across your creator activity.` : "Your inbox is caught up right now."}
        />
        <View style={styles.heroActions}>
          <View style={styles.heroStat}>
            <Text style={styles.heroValue}>{notifications.length}</Text>
            <Text style={styles.heroLabel}>Total</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroValue}>{unreadCount}</Text>
            <Text style={styles.heroLabel}>Unread</Text>
          </View>
        </View>
        <PrimaryButton
          label={unreadCount > 0 ? "Mark all as read" : "All caught up"}
          onPress={() => {
            void handleMarkAllRead();
          }}
          variant="ghost"
          disabled={unreadCount === 0}
        />
      </View>

      <View style={styles.pushCard}>
        <Text style={styles.pushLabel}>{pushNotificationsStatus.mode === "remote" ? "Remote push connected" : "Notification mode"}</Text>
        <Text style={styles.pushTitle}>
          {pushNotificationsStatus.mode === "remote"
            ? "This device can receive real push notifications."
            : pushNotificationsStatus.mode === "local"
              ? "This device is using local notification testing."
              : "Notifications need one more setup step."}
        </Text>
        <Text style={styles.pushBody}>{pushNotificationsStatus.message}</Text>
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptyBody}>
            Likes, follows, comments, reposts, and boost updates will appear here once your account starts moving.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {notifications.map((notification) => (
            <Pressable
              key={notification.id}
              onPress={() => openNotification(notification)}
              style={[styles.card, !notification.readAt ? styles.cardUnread : null]}
            >
              {notification.actorAvatar ? (
                <Image source={{ uri: notification.actorAvatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackLabel}>{notification.title.slice(0, 1).toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle}>{notification.title}</Text>
                  <Text style={styles.cardTime}>{new Date(notification.createdAt).toLocaleString()}</Text>
                </View>
                <Text style={styles.cardText}>{notification.body}</Text>
                {!notification.readAt ? <Text style={styles.unreadBadge}>Unread</Text> : null}
              </View>
            </Pressable>
          ))}
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
  heroActions: {
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
  list: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
  },
  cardUnread: {
    backgroundColor: palette.cardAlt,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarFallback: {
    alignItems: "center",
    backgroundColor: "rgba(54,224,161,0.15)",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  avatarFallbackLabel: {
    color: palette.primary,
    fontSize: 18,
    fontWeight: "900",
  },
  cardBody: {
    flex: 1,
    gap: spacing.xs,
  },
  cardTop: {
    alignItems: "flex-start",
    gap: spacing.xs,
  },
  cardTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "900",
  },
  cardTime: {
    color: palette.muted,
    fontSize: 12,
  },
  cardText: {
    color: palette.textSoft,
    fontSize: 14,
    lineHeight: 21,
  },
  unreadBadge: {
    alignSelf: "flex-start",
    color: palette.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    marginTop: spacing.xs,
    textTransform: "uppercase",
  },
});
