import { useEffect, useState } from "react";
import { Alert, Image, StyleSheet, Text, View } from "react-native";
import { InputField } from "../components/InputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { useAppState } from "../providers/AppProvider";
import { palette, radii, spacing } from "../theme";

export function MarketplaceChatScreen({ navigation, route }: { navigation: any; route: { params: { threadId: string } } }) {
  const {
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
  const [draft, setDraft] = useState("");
  const thread = marketplaceThreads.find((item) => item.id === route.params.threadId);

  useEffect(() => {
    void openMarketplaceThread(route.params.threadId);
  }, [route.params.threadId]);

  if (!thread || !currentUser) {
    return (
      <Screen contentContainerStyle={styles.emptyWrap}>
        <Text style={styles.emptyText}>Conversation not found.</Text>
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
      Alert.alert("Message unavailable", result.message ?? "This message could not be sent.");
      return;
    }

    setMarketplaceTyping(activeThread.id, false);
    setDraft("");
  }

  return (
    <Screen scrollable>
      <View style={styles.headerCard}>
        <SectionTitle
          title={counterpart ? counterpart.name : "Marketplace chat"}
          subtitle={product ? product.title : "Listing conversation"}
        />
        <View style={styles.productSnippet}>
          <Image source={{ uri: product?.imageUrl || counterpart?.profileImage }} style={styles.productImage} />
          <View style={styles.productCopy}>
            <Text style={styles.productTitle}>{product?.title || "Marketplace listing"}</Text>
            <Text style={styles.productMeta}>
              ${product?.price ?? 0} | {product?.location ?? "Seller location"}
            </Text>
            <Text style={styles.productStatus}>{product?.listingStatus || "available"}</Text>
          </View>
        </View>
        {product ? (
          <PrimaryButton label="Open listing" onPress={() => navigation.navigate("ProductDetails", { productId: product.id })} variant="ghost" />
        ) : null}
        <Text style={styles.statusText}>
          {typingUsers.length > 0 ? `${counterpart?.name ?? "Buyer"} is typing...` : formatPresenceLabel(counterpartPresence)}
        </Text>
      </View>

      <View style={styles.chatList}>
        {messages.map((message) => {
          const ownMessage = message.senderId === currentUser.id;
          const deliveryStatus = getOneToOneDeliveryStatus(message, counterpartId);
          return (
            <View key={message.id} style={[styles.messageRow, ownMessage ? styles.messageRowOwn : null]}>
              {!ownMessage ? <Image source={{ uri: message.senderAvatar }} style={styles.messageAvatar} /> : null}
              <View style={[styles.messageBubble, ownMessage ? styles.messageBubbleOwn : null]}>
                {!ownMessage ? <Text style={styles.messageName}>{message.senderName}</Text> : null}
                <Text style={[styles.messageText, ownMessage ? styles.messageTextOwn : null]}>{message.text}</Text>
                <Text style={[styles.messageTime, ownMessage ? styles.messageTimeOwn : null]}>
                  {new Date(message.createdAt).toLocaleString()}
                </Text>
                {ownMessage && message.id === lastOwnMessage?.id ? (
                  <Text style={styles.readReceipt}>{deliveryStatus}</Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.composeCard}>
        <InputField label="Message" onChangeText={setDraft} placeholder="Ask if it is still available, delivery details, price..." value={draft} multiline />
        <PrimaryButton
          label="Send message"
          onPress={() => {
            void handleSend();
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
    gap: spacing.md,
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
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: 6,
    maxWidth: "82%",
    padding: spacing.md,
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
    color: "#071118",
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
  counterpartId: string
) {
  if (message.seenByUserIds.includes(counterpartId)) {
    return "Seen";
  }

  if (message.deliveredToUserIds.includes(counterpartId)) {
    return "Delivered";
  }

  return "Sent";
}

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
