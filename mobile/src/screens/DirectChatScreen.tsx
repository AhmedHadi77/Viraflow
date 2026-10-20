import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../components/Avatar";
import { CallButtons } from "../components/CallButtons";
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { ChatComposer } from "../components/ChatComposer";
import { Screen } from "../components/Screen";
import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { type CreateDirectMessagePayload, type DirectChatMessage } from "../types/models";
import { palette, radii, spacing, createThemedStyles } from "../theme";
import { formatLocaleDateTime, formatRelativeTime } from "../utils/timeFormatting";

interface PendingDirectAttachment {
  uri: string;
  type: "image" | "video";
  mimeType?: string;
  fileName?: string;
  durationSeconds?: number;
  thumbnailUri?: string;
}

export function DirectChatScreen({ navigation, route }: { navigation: any; route: { params: { threadId: string } } }) {
  const {
    language,
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
  const copy = getCopy(language);
  const [draft, setDraft] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<PendingDirectAttachment | null>(null);
  const [isSending, setIsSending] = useState(false);
  const messagesScrollRef = useRef<ScrollView>(null);
  const thread = directThreads.find((item) => item.id === route.params.threadId);

  useEffect(() => {
    void (async () => {
      const result = await openDirectThread(route.params.threadId);
      if (!result.ok && result.message) {
        Alert.alert(copy.directChatUnavailableTitle, result.message);
      }
    })();
  }, [copy.directChatUnavailableTitle, route.params.threadId]);

  if (!thread || !currentUser) {
    return (
      <Screen contentContainerStyle={styles.emptyWrap}>
        <Text style={styles.emptyText}>{copy.conversationNotFound}</Text>
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
  const canSend = chatUnlocked && (draft.trim().length > 0 || Boolean(pendingAttachment)) && !isSending;
  const typingLabel = useMemo(() => {
    if (typingUsers.length === 0) {
      return formatPresenceLabel(counterpartPresence, language, copy.onlineNow, copy.offline);
    }

    return copy.typingNow;
  }, [copy.offline, copy.onlineNow, copy.typingNow, counterpartPresence, language, typingUsers.length]);

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

  async function handlePickAttachment() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(copy.mediaAccessNeededTitle, copy.mediaAccessNeededBody);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: false,
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    const isVideo = asset.type === "video";
    let thumbnailUri: string | undefined;

    if (isVideo) {
      try {
        const thumbnail = await VideoThumbnails.getThumbnailAsync(asset.uri, {
          time: 700,
          quality: 0.65,
        });
        thumbnailUri = thumbnail.uri;
      } catch {
        thumbnailUri = undefined;
      }
    }

    setPendingAttachment({
      uri: asset.uri,
      type: isVideo ? "video" : "image",
      mimeType: asset.mimeType,
      fileName: asset.fileName || asset.uri.split("/").pop(),
      durationSeconds: typeof asset.duration === "number" ? Math.max(1, Math.round(asset.duration / 1000)) : undefined,
      thumbnailUri,
    });
  }

  async function handleSend() {
    if (!canSend) {
      return;
    }

    const payload: CreateDirectMessagePayload = {
      text: draft,
      mediaUri: pendingAttachment?.uri,
      mediaType: pendingAttachment?.type,
      mediaMimeType: pendingAttachment?.mimeType,
      mediaFileName: pendingAttachment?.fileName,
      mediaDurationSeconds: pendingAttachment?.durationSeconds,
      mediaThumbnailUri: pendingAttachment?.thumbnailUri,
    };

    setIsSending(true);
    try {
      const result = await sendDirectMessage(activeThread.id, payload);
      if (!result.ok) {
        Alert.alert(copy.messageUnavailableTitle, result.message ?? copy.messageUnavailableBody);
        return;
      }

      setDirectTyping(activeThread.id, false);
      setDraft("");
      setPendingAttachment(null);
    } finally {
      setIsSending(false);
    }
  }

  async function openMediaMessage(message: DirectChatMessage) {
    const mediaUrl = message.mediaUrl?.trim();
    if (!mediaUrl) {
      return;
    }

    const supported = await Linking.canOpenURL(mediaUrl);
    if (!supported) {
      Alert.alert(copy.previewUnavailableTitle, copy.previewUnavailableBody);
      return;
    }

    await Linking.openURL(mediaUrl);
  }

  return (
    <Screen contentContainerStyle={styles.chatScreen}>
      <Pressable
        disabled={!counterpart}
        onPress={() => counterpart && navigation.navigate("PublicProfile", { userId: counterpart.id })}
        style={styles.chatHeader}
      >
        <Avatar name={counterpart?.name} style={styles.chatHeaderAvatar} uri={counterpart?.profileImage} />
        <View style={styles.chatHeaderCopy}>
          <Text numberOfLines={1} style={styles.chatHeaderName}>
            {counterpart?.name ?? copy.directChatTitle}
          </Text>
          <Text numberOfLines={1} style={styles.chatHeaderStatus}>
            {typingLabel || (counterpart ? `@${counterpart.username}` : "")}
          </Text>
        </View>
        {counterpart ? <CallButtons navigation={navigation} userId={counterpart.id} /> : null}
      </Pressable>

      <ScrollView
        contentContainerStyle={styles.chatList}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => messagesScrollRef.current?.scrollToEnd({ animated: false })}
        ref={messagesScrollRef}
        style={styles.chatScroll}
      >
        {messages.length === 0 ? (
          <Text style={styles.chatEmpty}>{chatUnlocked ? copy.directChatUnlockedBody : copy.directChatLockedBody}</Text>
        ) : null}
        {messages.map((message) => {
          const ownMessage = message.senderId === currentUser.id;
          const deliveryStatus = counterpartId ? getOneToOneDeliveryStatus(message, counterpartId, copy) : null;
          return (
            <View key={message.id} style={[styles.messageRow, ownMessage ? styles.messageRowOwn : null]}>
              {!ownMessage ? <Image source={{ uri: message.senderAvatar }} style={styles.messageAvatar} /> : null}
              <View style={[styles.messageBubble, ownMessage ? styles.messageBubbleOwn : null]}>
                {message.mediaUrl ? (
                  <Pressable onPress={() => void openMediaMessage(message)} style={styles.mediaPreviewCard}>
                    <Image source={{ uri: message.thumbnailUrl || message.mediaUrl }} style={styles.mediaPreviewImage} />
                    {message.mediaType === "video" ? (
                      <View style={styles.videoBadge}>
                        <Ionicons color="#ffffff" name="play" size={14} />
                        <Text style={styles.videoBadgeLabel}>
                          {message.durationSeconds ? formatDuration(message.durationSeconds) : copy.video}
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                ) : null}
                {message.text.trim() ? (
                  <Text style={[styles.messageText, ownMessage ? styles.messageTextOwn : null]}>{message.text}</Text>
                ) : null}
                <Text style={[styles.messageTime, ownMessage ? styles.messageTimeOwn : null]}>
                  {formatLocaleDateTime(message.createdAt, language)}
                  {ownMessage && message.id === lastOwnMessage?.id && deliveryStatus ? `  ·  ${deliveryStatus}` : ""}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {pendingAttachment ? (
        <View style={styles.pendingAttachmentCard}>
          <Image source={{ uri: pendingAttachment.thumbnailUri || pendingAttachment.uri }} style={styles.pendingAttachmentPreview} />
          <View style={styles.pendingAttachmentBody}>
            <Text style={styles.pendingAttachmentTitle}>
              {pendingAttachment.type === "video" ? copy.videoReadyToSend : copy.photoReadyToSend}
            </Text>
            <Text style={styles.pendingAttachmentMeta}>
              {pendingAttachment.type === "video" && pendingAttachment.durationSeconds
                ? formatDuration(pendingAttachment.durationSeconds)
                : copy.tapSendWhenReady}
            </Text>
          </View>
          <Pressable hitSlop={8} onPress={() => setPendingAttachment(null)} style={styles.pendingRemoveButton}>
            <Ionicons color={palette.text} name="close" size={16} />
          </Pressable>
        </View>
      ) : null}

      <ChatComposer
        attachActive={Boolean(pendingAttachment)}
        canSend={canSend}
        editable={chatUnlocked}
        isSending={isSending}
        onAttach={
          chatUnlocked
            ? () => {
                void handlePickAttachment();
              }
            : undefined
        }
        onChangeText={setDraft}
        onSend={() => {
          void handleSend();
        }}
        placeholder={chatUnlocked ? copy.directMessagePlaceholder : copy.directLockedPlaceholder}
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
  chatHeaderAvatar: {
    backgroundColor: palette.surfaceRaised,
    borderRadius: 20,
    height: 40,
    width: 40,
  },
  chatHeaderCopy: {
    flex: 1,
    gap: 2,
  },
  chatHeaderName: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "800",
  },
  chatHeaderStatus: {
    color: palette.muted,
    fontSize: 12,
  },
  chatScroll: {
    flex: 1,
  },
  chatEmpty: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: spacing.xl,
    textAlign: "center",
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
    backgroundColor: palette.surfaceRaised,
    width: 28,
    height: 28,
    borderRadius: 14,
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
    color: "#071118",
  },
  messageTime: {
    color: palette.muted,
    fontSize: 10,
  },
  messageTimeOwn: {
    color: "#234436",
  },
  readReceipt: {
    color: "#234436",
    fontSize: 11,
    fontWeight: "800",
  },
  mediaPreviewCard: {
    backgroundColor: "rgba(7,16,24,0.08)",
    borderRadius: radii.lg,
    overflow: "hidden",
    position: "relative",
  },
  mediaPreviewImage: {
    width: 220,
    height: 260,
    backgroundColor: palette.cardAlt,
  },
  videoBadge: {
    alignItems: "center",
    backgroundColor: "rgba(7,16,24,0.78)",
    borderRadius: radii.pill,
    bottom: 10,
    flexDirection: "row",
    gap: 6,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    position: "absolute",
  },
  imageBadge: {
    alignItems: "center",
    backgroundColor: "rgba(7,16,24,0.7)",
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: 6,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    position: "absolute",
    top: 10,
  },
  videoBadgeLabel: {
    color: palette.text,
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
  pendingAttachmentCard: {
    alignItems: "center",
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  pendingAttachmentPreview: {
    width: 72,
    height: 72,
    borderRadius: radii.lg,
    backgroundColor: palette.cardAlt,
  },
  pendingAttachmentBody: {
    flex: 1,
    gap: 4,
  },
  pendingAttachmentTitle: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "800",
  },
  pendingAttachmentMeta: {
    color: palette.textSoft,
    fontSize: 12,
  },
  pendingRemoveButton: {
    alignItems: "center",
    backgroundColor: palette.glass,
    borderRadius: radii.pill,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  composeActions: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
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

  return formatRelativeTime(presence.lastSeenAt, language, {
    style: "short",
    fallbackToDateAfterDays: 14,
  });
}

function formatDuration(value: number) {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  const minutes = Math.floor(safeValue / 60);
  const seconds = Math.floor(safeValue % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
