import { Ionicons } from "@expo/vector-icons";
import { listingStatusLabel } from "../utils/labels";
import { rtlFlipStyle } from "../utils/layoutDirection";
import { useProductPriceFormatter } from "../utils/priceFormatting";
import { useEffect, useRef, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { ChatComposer } from "../components/ChatComposer";
import { Screen } from "../components/Screen";
import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { palette, radii, spacing, createThemedStyles } from "../theme";
import { formatLocaleDateTime, formatRelativeTime } from "../utils/timeFormatting";

export function MarketplaceChatScreen({ navigation, route }: { navigation: any; route: { params: { threadId: string } } }) {
  const {
    language,
    currentUser,
    marketplaceThreads,
    products,
    getUserById,
    getMarketplaceMessagesForThread,
    getMarketplaceTypingUsers,
    getUserPresence,
    openMarketplaceThread,
    markMarketplaceThreadRead,
    sendMarketplaceMessage,
    setMarketplaceTyping,
  } = useAppState();
  const copy = getCopy(language);
  const formatProductPrice = useProductPriceFormatter();
  const [draft, setDraft] = useState("");
  const messagesScrollRef = useRef<ScrollView>(null);
  const thread = marketplaceThreads.find((item) => item.id === route.params.threadId);

  useEffect(() => {
    void openMarketplaceThread(route.params.threadId);
  }, [route.params.threadId]);

  if (!thread || !currentUser) {
    return (
      <Screen contentContainerStyle={styles.emptyWrap}>
        <Text style={styles.emptyText}>{copy.conversationNotFound}</Text>
      </Screen>
    );
  }

  const activeThread = thread;
  const product = products.find((item) => item.id === activeThread.productId);
  const counterpartId = currentUser.id === activeThread.buyerId ? activeThread.sellerId : activeThread.buyerId;
  const counterpart = getUserById(counterpartId);
  const counterpartPresence = getUserPresence(counterpartId);
  const messages = getMarketplaceMessagesForThread(activeThread.id);
  const typingUsers = getMarketplaceTypingUsers(activeThread.id);
  const lastOwnMessage = [...messages].reverse().find((message) => message.senderId === currentUser.id);

  useEffect(() => {
    if (!currentUser || messages.length === 0) {
      return;
    }

    markMarketplaceThreadRead(activeThread.id);
  }, [activeThread.id, currentUser.id, messages.length]);

  useEffect(() => {
    const trimmedDraft = draft.trim();
    if (!trimmedDraft) {
      setMarketplaceTyping(activeThread.id, false);
      return;
    }

    setMarketplaceTyping(activeThread.id, true);
    const timeout = setTimeout(() => {
      setMarketplaceTyping(activeThread.id, false);
    }, 1200);

    return () => {
      clearTimeout(timeout);
    };
  }, [activeThread.id, draft]);

  useEffect(() => {
    return () => {
      setMarketplaceTyping(route.params.threadId, false);
    };
  }, [route.params.threadId]);

  async function handleSend() {
    const result = await sendMarketplaceMessage(activeThread.id, draft);
    if (!result.ok) {
      Alert.alert(copy.messageUnavailableTitle, result.message ?? copy.messageUnavailableBody);
      return;
    }

    setMarketplaceTyping(activeThread.id, false);
    setDraft("");
  }

  return (
    <Screen contentContainerStyle={styles.chatScreen}>
      <Pressable
        disabled={!product}
        onPress={() => product && navigation.navigate("ProductDetails", { productId: product.id })}
        style={styles.chatHeader}
      >
        <Image source={{ uri: product?.imageUrl || counterpart?.profileImage }} style={styles.chatHeaderImage} />
        <View style={styles.chatHeaderCopy}>
          <Text numberOfLines={1} style={styles.chatHeaderTitle}>
            {product?.title || copy.listing}
          </Text>
          <Text numberOfLines={1} style={styles.chatHeaderMeta}>
            {product ? `${formatProductPrice(product)} · ${listingStatusLabel(product.listingStatus, copy)}` : ""}
            {counterpart ? `${product ? "  ·  " : ""}${counterpart.name}` : ""}
          </Text>
          <Text numberOfLines={1} style={styles.chatHeaderStatus}>
            {typingUsers.length > 0
              ? `${counterpart?.name ?? copy.buyerLabel}...`
              : formatPresenceLabel(counterpartPresence, language, copy.onlineNow, copy.offline)}
          </Text>
        </View>
        {product ? <Ionicons color={palette.muted} name="chevron-forward" size={18} style={rtlFlipStyle} /> : null}
      </Pressable>

      <ScrollView
        contentContainerStyle={styles.chatList}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => messagesScrollRef.current?.scrollToEnd({ animated: false })}
        ref={messagesScrollRef}
        style={styles.chatScroll}
      >
        {messages.map((message) => {
          const ownMessage = message.senderId === currentUser.id;
          const deliveryStatus = getOneToOneDeliveryStatus(message, counterpartId, copy);
          return (
            <View key={message.id} style={[styles.messageRow, ownMessage ? styles.messageRowOwn : null]}>
              {!ownMessage ? <Image source={{ uri: message.senderAvatar }} style={styles.messageAvatar} /> : null}
              <View style={[styles.messageBubble, ownMessage ? styles.messageBubbleOwn : null]}>
                <Text style={[styles.messageText, ownMessage ? styles.messageTextOwn : null]}>{message.text}</Text>
                <Text style={[styles.messageTime, ownMessage ? styles.messageTimeOwn : null]}>
                  {formatLocaleDateTime(message.createdAt, language)}
                  {ownMessage && message.id === lastOwnMessage?.id && deliveryStatus ? `  ·  ${deliveryStatus}` : ""}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <ChatComposer
        canSend={draft.trim().length > 0}
        onChangeText={setDraft}
        onSend={() => {
          void handleSend();
        }}
        placeholder={copy.noteToSellerPlaceholder}
        value={draft}
      />
    </Screen>
  );
}

const styles = createThemedStyles({
  chatScreen: {
    paddingBottom: 0,
    paddingHorizontal: 0,
  },
  chatHeader: {
    alignItems: "center",
    borderBottomColor: palette.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  chatHeaderImage: {
    backgroundColor: palette.surfaceRaised,
    borderRadius: 10,
    height: 48,
    width: 48,
  },
  chatHeaderCopy: {
    flex: 1,
    gap: 1,
  },
  chatHeaderTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "800",
  },
  chatHeaderMeta: {
    color: palette.textSoft,
    fontSize: 12,
  },
  chatHeaderStatus: {
    color: palette.muted,
    fontSize: 11,
  },
  chatScroll: {
    flex: 1,
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: palette.muted,
    fontSize: 15,
  },
  headerCard: {
    backgroundColor: palette.card,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
  },
  productSnippet: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  productImage: {
    width: 82,
    height: 82,
    borderRadius: radii.lg,
  },
  productCopy: {
    flex: 1,
    gap: 4,
  },
  productTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "900",
  },
  productMeta: {
    color: palette.textSoft,
    fontSize: 13,
  },
  productStatus: {
    color: palette.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  statusText: {
    color: palette.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  chatList: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  messageRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: spacing.sm,
  },
  messageRowOwn: {
    justifyContent: "flex-end",
  },
  messageAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  messageBubble: {
    backgroundColor: palette.surfaceRaised,
    borderRadius: 18,
    gap: 4,
    maxWidth: "78%",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  messageBubbleOwn: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  messageName: {
    color: palette.accentSoft,
    fontSize: 12,
    fontWeight: "800",
  },
  messageText: {
    color: palette.text,
    fontSize: 14,
    lineHeight: 21,
  },
  messageTextOwn: {
    color: "#ffffff",
  },
  messageTime: {
    color: palette.muted,
    fontSize: 11,
  },
  messageTimeOwn: {
    color: "#234436",
  },
  readReceipt: {
    color: "#234436",
    fontSize: 11,
    fontWeight: "800",
  },
  composeCard: {
    backgroundColor: palette.card,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
  },
});

function getOneToOneDeliveryStatus(
  message: { deliveredToUserIds: string[]; seenByUserIds: string[] },
  counterpartId: string,
  copy: ReturnType<typeof getCopy>
) {
  if (message.seenByUserIds.includes(counterpartId)) {
    return copy.seen;
  }

  if (message.deliveredToUserIds.includes(counterpartId)) {
    return copy.delivered;
  }

  return copy.sent;
}

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
