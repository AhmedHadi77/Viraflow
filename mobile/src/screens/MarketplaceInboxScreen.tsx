import { useEffect } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { palette, radii, spacing, createThemedStyles } from "../theme";
import { formatLocaleDate, formatRelativeTime } from "../utils/timeFormatting";

export function MarketplaceInboxScreen({ navigation }: { navigation: any }) {
  const {
    language,
    currentUser,
    marketplaceThreads,
    marketplaceOrders,
    products,
    getMarketplaceUnreadCount,
    getTotalMarketplaceUnreadCount,
    getUserById,
    getUserPresence,
    refreshMarketplaceInbox,
  } = useAppState();
  const copy = getCopy(language);

  useEffect(() => {
    void refreshMarketplaceInbox();
    const unsubscribe = navigation.addListener("focus", () => {
      void refreshMarketplaceInbox();
    });

    return unsubscribe;
  }, [navigation]);

  const userThreads = currentUser
    ? marketplaceThreads.filter((thread) => thread.buyerId === currentUser.id || thread.sellerId === currentUser.id)
    : [];
  const userOrders = currentUser
    ? marketplaceOrders.filter((order) => order.buyerId === currentUser.id || order.sellerId === currentUser.id)
    : [];
  const totalUnreadCount = getTotalMarketplaceUnreadCount();

  return (
    <Screen scrollable>
      <View style={styles.heroCard}>
        <SectionTitle
          title={copy.marketplaceInboxTitle}
          subtitle={
            userThreads.length > 0
              ? `${userThreads.length} ${copy.conversations.toLowerCase()}, ${userOrders.length} ${copy.orders.toLowerCase()}, ${totalUnreadCount} ${copy.unreadMessages.toLowerCase()}.`
              : copy.marketplaceInboxSubtitleEmpty
          }
        />
        <View style={styles.heroStats}>
          <InboxStat label={copy.chats} value={userThreads.length} />
          <InboxStat label={copy.orders} value={userOrders.length} />
          <InboxStat label={copy.unreadMessages} value={totalUnreadCount} />
        </View>
      </View>

      <SectionTitle title={copy.conversations} />
      {userThreads.length === 0 ? (
        <EmptyCard title={copy.noConversationsTitle} body={copy.noConversationsBody} />
      ) : (
        <View style={styles.list}>
          {userThreads.map((thread) => {
            const product = products.find((item) => item.id === thread.productId);
            const counterpartId = currentUser?.id === thread.buyerId ? thread.sellerId : thread.buyerId;
            const counterpart = counterpartId ? getUserById(counterpartId) : undefined;
            const unreadCount = getMarketplaceUnreadCount(thread.id);
            const presence = counterpartId ? getUserPresence(counterpartId) : undefined;

            return (
              <Pressable
                key={thread.id}
                onPress={() => navigation.navigate("MarketplaceChat", { threadId: thread.id })}
                style={styles.threadCard}
              >
                <Image source={{ uri: product?.imageUrl || counterpart?.profileImage }} style={styles.threadImage} />
                <View style={styles.threadBody}>
                  <View style={styles.threadTop}>
                    <Text numberOfLines={1} style={styles.threadTitle}>
                      {product?.title || copy.miListingFallback}
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
                  <Text style={styles.threadSeller}>{counterpart ? counterpart.name : copy.marketplaceUser}</Text>
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

      <SectionTitle title={copy.orders} subtitle={copy.ordersSectionBody} />
      {userOrders.length === 0 ? (
        <EmptyCard title={copy.noOrdersTitle} body={copy.noOrdersBody} />
      ) : (
        <View style={styles.list}>
          {userOrders.map((order) => {
            const product = products.find((item) => item.id === order.productId);
            const counterpartyId = currentUser?.id === order.buyerId ? order.sellerId : order.buyerId;
            const counterparty = counterpartyId ? getUserById(counterpartyId) : undefined;

            return (
              <View key={order.id} style={styles.orderCard}>
                <Image source={{ uri: product?.imageUrl || counterparty?.profileImage }} style={styles.orderImage} />
                <View style={styles.orderBody}>
                  <Text numberOfLines={1} style={styles.orderTitle}>
                    {product?.title || copy.miOrderFallback}
                  </Text>
                  <Text style={styles.orderMeta}>
                    ${order.amountUsd} | {order.deliveryMethod} | {order.paymentMethod}
                  </Text>
                  <Text style={styles.orderMeta}>{currentUser?.id === order.buyerId ? `${copy.sellerLabel}: ${counterparty?.name}` : `${copy.buyerLabel}: ${counterparty?.name}`}</Text>
                  <Text style={styles.orderStatus}>{order.status}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

function InboxStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroValue}>{value}</Text>
      <Text style={styles.heroLabel}>{label}</Text>
    </View>
  );
}

function EmptyCard({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
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
  threadImage: {
    width: 72,
    height: 72,
    borderRadius: radii.md,
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
    fontSize: 15,
    fontWeight: "900",
  },
  threadTime: {
    color: palette.muted,
    fontSize: 11,
  },
  threadSeller: {
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
  orderCard: {
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  orderImage: {
    width: 72,
    height: 72,
    borderRadius: radii.md,
  },
  orderBody: {
    flex: 1,
    gap: 4,
    justifyContent: "center",
  },
  orderTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "900",
  },
  orderMeta: {
    color: palette.textSoft,
    fontSize: 13,
  },
  orderStatus: {
    alignSelf: "flex-start",
    color: palette.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
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

  return formatRelativeTime(presence.lastSeenAt, language, { style: "short", fallbackToDateAfterDays: 14 });
}
