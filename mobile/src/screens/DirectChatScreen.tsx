import { useEffect, useState } from "react";
import { Alert, Image, StyleSheet, Text, View } from "react-native";
import { InputField } from "../components/InputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { useAppState } from "../providers/AppProvider";
import { palette, radii, spacing } from "../theme";

export function DirectChatScreen({ navigation, route }: { navigation: any; route: { params: { threadId: string } } }) {
  const {
    currentUser,
    directThreads,
    getUserById,
    getDirectMessagesForThread,
    getDirectTypingUsers,
    getUserPresence,
    openDirectThread,
    markDirectThreadRead,
    sendDirectMessage,
    setDirectTyping,
    canDirectMessageUser,
  } = useAppState();
  const [draft, setDraft] = useState("");
  const thread = directThreads.find((item) => item.id === route.params.threadId);

  useEffect(() => {
    void (async () => {
      const result = await openDirectThread(route.params.threadId);
      if (!result.ok && result.message) {
        Alert.alert("Direct chat unavailable", result.message);
      }
    })();
  }, [route.params.threadId]);

  if (!thread || !currentUser) {
    return (
      <Screen contentContainerStyle={styles.emptyWrap}>
        <Text style={styles.emptyText}>Conversation not found.</Text>
      </Screen>
    );
  }

  const activeThread = thread;
  const counterpartId = activeThread.participantIds.find((participantId) => participantId !== currentUser.id);
  const counterpart = counterpartId ? getUserById(counterpartId) : undefined;
  const counterpartPresence = counterpartId ? getUserPresence(counterpartId) : undefined;
  const messages = getDirectMessagesForThread(activeThread.id);
  const typingUsers = getDirectTypingUsers(activeThread.id);
  const chatUnlocked = Boolean(counterpartId && canDirectMessageUser(counterpartId));
  const lastOwnMessage = [...messages].reverse().find((message) => message.senderId === currentUser.id);

  useEffect(() => {
    if (!currentUser || messages.length === 0) {
      return;
    }

    markDirectThreadRead(activeThread.id);
  }, [activeThread.id, currentUser.id, messages.length]);

  useEffect(() => {
    if (!chatUnlocked) {
      setDirectTyping(activeThread.id, false);
      return;
    }

    const trimmedDraft = draft.trim();
    if (!trimmedDraft) {
      setDirectTyping(activeThread.id, false);
      return;
    }

    setDirectTyping(activeThread.id, true);
    const timeout = setTimeout(() => {
      setDirectTyping(activeThread.id, false);
    }, 1200);

    return () => {
      clearTimeout(timeout);
    };
  }, [activeThread.id, chatUnlocked, draft]);

  useEffect(() => {
    return () => {
      setDirectTyping(route.params.threadId, false);
    };
  }, [route.params.threadId]);

  async function handleSend() {
    const result = await sendDirectMessage(activeThread.id, draft);
    if (!result.ok) {
      Alert.alert("Message unavailable", result.message ?? "This direct message could not be sent.");
      return;
    }

    setDirectTyping(activeThread.id, false);
    setDraft("");
  }

  return (
    <Screen scrollable>
      <View style={styles.headerCard}>
        <SectionTitle
          title={counterpart?.name ?? "Direct chat"}
          subtitle={
            chatUnlocked
              ? "Chat is unlocked because both of you follow each other."
              : "Chat is locked until both of you follow each other."
          }
        />
        <View style={styles.profileSnippet}>
          <Image
            source={{
              uri:
                counterpart?.profileImage ||
                "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=400&q=80",
            }}
            style={styles.avatar}
          />
          <View style={styles.profileCopy}>
            <Text style={styles.profileTitle}>{counterpart?.name ?? "Creator"}</Text>
            <Text style={styles.profileMeta}>@{counterpart?.username ?? "creator"}</Text>
            <Text style={styles.profileMeta}>{counterpart?.headline ?? "Mutual creator connection"}</Text>
          </View>
        </View>
        {counterpart ? (
          <PrimaryButton label="Open profile" onPress={() => navigation.navigate("PublicProfile", { userId: counterpart.id })} variant="ghost" />
        ) : null}
        <Text style={styles.statusText}>
          {typingUsers.length > 0 ? `${counterpart?.name ?? "Creator"} is typing...` : formatPresenceLabel(counterpartPresence)}
        </Text>
      </View>

      <View style={styles.chatList}>
        {messages.map((message) => {
          const ownMessage = message.senderId === currentUser.id;
          const deliveryStatus = counterpartId ? getOneToOneDeliveryStatus(message, counterpartId) : null;
          return (
            <View key={message.id} style={[styles.messageRow, ownMessage ? styles.messageRowOwn : null]}>
              {!ownMessage ? <Image source={{ uri: message.senderAvatar }} style={styles.messageAvatar} /> : null}
              <View style={[styles.messageBubble, ownMessage ? styles.messageBubbleOwn : null]}>
                {!ownMessage ? <Text style={styles.messageName}>{message.senderName}</Text> : null}
                <Text style={[styles.messageText, ownMessage ? styles.messageTextOwn : null]}>{message.text}</Text>
                <Text style={[styles.messageTime, ownMessage ? styles.messageTimeOwn : null]}>
                  {new Date(message.createdAt).toLocaleString()}
                </Text>
                {ownMessage && message.id === lastOwnMessage?.id && deliveryStatus ? (
                  <Text style={styles.readReceipt}>{deliveryStatus}</Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.composeCard}>
        <InputField
          label="Message"
          onChangeText={setDraft}
          placeholder={chatUnlocked ? "Send a direct message..." : "Follow each other to unlock direct chat"}
          value={draft}
          multiline
        />
        <PrimaryButton
          label="Send message"
          onPress={() => {
            void handleSend();
          }}
          disabled={!chatUnlocked}
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
  profileSnippet: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: palette.cardAlt,
  },
  profileCopy: {
    flex: 1,
    gap: 4,
  },
  profileTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "900",
  },
  profileMeta: {
    color: palette.textSoft,
    fontSize: 13,
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
