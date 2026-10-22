import * as ImagePicker from "expo-image-picker";
import { useCopy } from "../utils/useCopy";
import { communityKindLabel, fill, visibilityLabel } from "../utils/labels";
import { formatDateTime } from "../utils/timeFormatting";
import { useEffect, useState } from "react";
import { Alert, Image, Pressable, Text, View } from "react-native";
import { InputField } from "../components/InputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { useAppState } from "../providers/AppProvider";
import { palette, radii, spacing, createThemedStyles } from "../theme";

export function CommunityDetailsScreen({ navigation, route }: { navigation: any; route: { params: { communityId: string } } }) {
  const copy = useCopy();
  const {
    currentUser,
    getCommunityById,
    getUserById,
    getCommunityPosts,
    getCommunityChatMessages,
    getCommunityTypingUsers,
    openCommunityActivity,
    createCommunityPost,
    deleteCommunityPost,
    markCommunityChatRead,
    sendCommunityChatMessage,
    setCommunityTyping,
  } = useAppState();
  const [postText, setPostText] = useState("");
  const [postImage, setPostImage] = useState("");
  const [chatDraft, setChatDraft] = useState("");
  const community = getCommunityById(route.params.communityId);
  const activeCommunity = community;
  const chatMessages = activeCommunity ? getCommunityChatMessages(activeCommunity.id) : [];

  useEffect(() => {
    void (async () => {
      const result = await openCommunityActivity(route.params.communityId);
      if (!result.ok) {
        Alert.alert(copy.cdUnavailable, result.message ?? copy.cdLoadFailed);
      }
    })();
  }, [route.params.communityId]);

  useEffect(() => {
    if (!currentUser || !activeCommunity || activeCommunity.kind !== "group" || chatMessages.length === 0) {
      return;
    }

    markCommunityChatRead(activeCommunity.id);
  }, [activeCommunity, chatMessages.length, currentUser?.id]);

  useEffect(() => {
    if (!activeCommunity || activeCommunity.kind !== "group") {
      return;
    }

    const trimmedDraft = chatDraft.trim();
    if (!trimmedDraft) {
      setCommunityTyping(activeCommunity.id, false);
      return;
    }

    setCommunityTyping(activeCommunity.id, true);
    const timeout = setTimeout(() => {
      setCommunityTyping(activeCommunity.id, false);
    }, 1200);

    return () => {
      clearTimeout(timeout);
    };
  }, [activeCommunity, chatDraft]);

  useEffect(() => {
    return () => {
      setCommunityTyping(route.params.communityId, false);
    };
  }, [route.params.communityId]);

  if (!activeCommunity) {
    return (
      <Screen contentContainerStyle={styles.emptyWrap}>
        <Text style={styles.emptyText}>{copy.cdNotFound}</Text>
      </Screen>
    );
  }

  const resolvedCommunity = activeCommunity;
  const owner = getUserById(activeCommunity.ownerId);
  const isOwner = currentUser?.id === activeCommunity.ownerId;
  const posts = getCommunityPosts(activeCommunity.id);
  const typingUsers =
    activeCommunity.kind === "group"
      ? getCommunityTypingUsers(activeCommunity.id).filter((user) => user.id !== currentUser?.id)
      : [];
  const lastOwnChatMessage = currentUser
    ? [...chatMessages].reverse().find((message) => message.senderId === currentUser.id)
    : undefined;

  async function handlePickPostImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(copy.photoAccessTitle, copy.cdPhotoAccessBody);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.45,
      base64: true,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    if (!asset.base64) {
      Alert.alert(copy.imageIssueTitle, copy.imageIssueBody);
      return;
    }

    const mimeType = asset.mimeType || "image/jpeg";
    setPostImage(`data:${mimeType};base64,${asset.base64}`);
  }

  async function handleCreatePost() {
    const result = await createCommunityPost({
      communityId: resolvedCommunity.id,
      text: postText,
      imageUrl: postImage || undefined,
    });

    if (!result.ok) {
      Alert.alert(copy.csPostUnavailable, result.message ?? copy.cdPostFailed);
      return;
    }

    setPostText("");
    setPostImage("");
    Alert.alert(copy.csPostPublished, fill(copy.cdPostLive, { name: resolvedCommunity.name }));
  }

  async function handleDeleteCommunityPost(postId: string) {
    Alert.alert(copy.deletePostTitle, copy.cdDeleteBody, [
      { text: copy.cancel, style: "cancel" },
      {
        text: copy.delete,
        style: "destructive",
        onPress: () => {
          void (async () => {
            const result = await deleteCommunityPost(resolvedCommunity.id, postId);
            if (!result.ok) {
              Alert.alert(copy.deleteUnavailableTitle, result.message ?? copy.cdDeleteFailed);
            }
          })();
        },
      },
    ]);
  }

  async function handleSendChat() {
    const result = await sendCommunityChatMessage(resolvedCommunity.id, chatDraft);
    if (!result.ok) {
      Alert.alert(copy.cdChatUnavailable, result.message ?? copy.messageUnavailableBody);
      return;
    }

    setCommunityTyping(resolvedCommunity.id, false);
    setChatDraft("");
  }

  return (
    <Screen scrollable>
      <Image source={{ uri: activeCommunity.coverImage }} style={styles.coverImage} />
      <SectionTitle title={activeCommunity.name} subtitle={communityKindLabel(activeCommunity.kind, copy)} />

      <View style={styles.metaRow}>
        <MetaCard label={copy.category} value={activeCommunity.category} />
        <MetaCard label={copy.visibility} value={visibilityLabel(activeCommunity.visibility, copy)} />
        <MetaCard label={copy.members} value={String(activeCommunity.memberIds.length)} />
      </View>

      <View style={styles.descriptionCard}>
        <Text style={styles.descriptionText}>{activeCommunity.description}</Text>
      </View>

      <View style={styles.ownerCard}>
        <Text style={styles.ownerLabel}>{copy.owner}</Text>
        <Text style={styles.ownerName}>{owner?.name ?? copy.creatorFallback}</Text>
        <Text style={styles.ownerHandle}>@{owner?.username ?? "pulseora"}</Text>
      </View>

      <View style={styles.composeCard}>
        <SectionTitle title={copy.cdCreatePost} subtitle={fill(copy.cdPublishInside, { kind: communityKindLabel(activeCommunity.kind, copy).toLowerCase() })} />
        <InputField
          label={copy.cdPostText}
          onChangeText={setPostText}
          placeholder={copy.cdPostPh}
          value={postText}
          multiline
        />
        <PrimaryButton
          label={postImage ? copy.cdChangeImage : copy.cdAddImage}
          onPress={() => {
            void handlePickPostImage();
          }}
          variant="ghost"
        />
        {postImage ? <Image source={{ uri: postImage }} style={styles.postImagePreview} /> : null}
        <PrimaryButton
          label={copy.csPublishPost}
          onPress={() => {
            void handleCreatePost();
          }}
        />
      </View>

      <SectionTitle title={copy.posts} subtitle={fill(copy.cdUpdatesInside, { name: activeCommunity.name })} />
      {posts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{copy.cdNoPosts}</Text>
          <Text style={styles.emptyBody}>{copy.cdNoPostsBody}</Text>
        </View>
      ) : (
        <View style={styles.postList}>
          {posts.map((post) => (
            <View key={post.id} style={styles.postCard}>
              <View style={styles.postHeader}>
                <Image source={{ uri: post.authorAvatar }} style={styles.postAvatar} />
                <View style={styles.postMeta}>
                  <Text style={styles.postAuthor}>{post.authorName}</Text>
                  <Text style={styles.postTime}>{formatDateTime(post.createdAt)}</Text>
                </View>
                {post.authorId === currentUser?.id ? (
                  <Pressable onPress={() => void handleDeleteCommunityPost(post.id)} style={styles.postDeleteButton}>
                    <Text style={styles.postDeleteLabel}>{copy.delete}</Text>
                  </Pressable>
                ) : null}
              </View>
              <Text style={styles.postText}>{post.text}</Text>
              {post.imageUrl ? <Image source={{ uri: post.imageUrl }} style={styles.postImage} /> : null}
            </View>
          ))}
        </View>
      )}

      {activeCommunity.kind === "group" ? (
        <>
          <SectionTitle title={copy.cdGroupChat} subtitle={copy.cdGroupChatBody} />
          <View style={styles.chatComposerCard}>
            <InputField
              label={copy.message}
              onChangeText={setChatDraft}
              placeholder={copy.cdGroupPh}
              value={chatDraft}
              multiline
            />
            <PrimaryButton
              label={copy.cdSendGroup}
              onPress={() => {
                void handleSendChat();
              }}
            />
          </View>
          {typingUsers.length > 0 ? <Text style={styles.statusText}>{formatTypingUsers(typingUsers.map((user) => user.name))}</Text> : null}
          {chatMessages.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>{copy.cdNoChat}</Text>
              <Text style={styles.emptyBody}>{copy.cdNoChatBody}</Text>
            </View>
          ) : (
            <View style={styles.chatList}>
              {chatMessages.map((message) => {
                const ownMessage = message.senderId === currentUser?.id;
                const seenByNames = message.seenByUserIds
                  .filter((userId) => userId !== currentUser?.id)
                  .map((userId) => getUserById(userId)?.name)
                  .filter((name): name is string => Boolean(name));
                const deliveredByNames = message.deliveredToUserIds
                  .filter((userId) => userId !== currentUser?.id && !message.seenByUserIds.includes(userId))
                  .map((userId) => getUserById(userId)?.name)
                  .filter((name): name is string => Boolean(name));
                const deliveryStatus = formatGroupDeliveryStatus(seenByNames, deliveredByNames);

                return (
                  <View key={message.id} style={[styles.chatRow, ownMessage ? styles.chatRowOwn : null]}>
                    {!ownMessage ? <Image source={{ uri: message.senderAvatar }} style={styles.chatAvatar} /> : null}
                    <View style={[styles.chatBubble, ownMessage ? styles.chatBubbleOwn : null]}>
                      {!ownMessage ? <Text style={styles.chatSender}>{message.senderName}</Text> : null}
                      <Text style={[styles.chatText, ownMessage ? styles.chatTextOwn : null]}>{message.text}</Text>
                      <Text style={[styles.chatTime, ownMessage ? styles.chatTimeOwn : null]}>
                        {formatDateTime(message.createdAt)}
                      </Text>
                      {ownMessage && message.id === lastOwnChatMessage?.id ? (
                        <Text style={styles.chatReadReceipt}>{deliveryStatus}</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </>
      ) : null}

      <PrimaryButton
        label={isOwner ? copy.cdCreateAnother : copy.cdOpenOwner}
        onPress={() =>
          isOwner ? navigation.navigate("CreateCommunity") : navigation.navigate("PublicProfile", { userId: activeCommunity.ownerId })
        }
        variant="ghost"
      />
    </Screen>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaCard}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = createThemedStyles({
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: palette.muted,
    fontSize: 15,
  },
  coverImage: {
    width: "100%",
    height: 240,
    borderRadius: radii.lg,
  },
  metaRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  metaCard: {
    backgroundColor: palette.cardAlt,
    borderColor: palette.borderStrong,
    borderRadius: radii.lg,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    padding: spacing.md,
  },
  metaLabel: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  metaValue: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "800",
  },
  descriptionCard: {
    backgroundColor: palette.card,
    borderColor: palette.borderStrong,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  descriptionText: {
    color: palette.text,
    fontSize: 15,
    lineHeight: 24,
  },
  ownerCard: {
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: 4,
    padding: spacing.lg,
  },
  ownerLabel: {
    color: palette.primary,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  ownerName: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "900",
  },
  ownerHandle: {
    color: palette.muted,
    fontSize: 13,
  },
  statusText: {
    color: palette.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  composeCard: {
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
  },
  postImagePreview: {
    width: "100%",
    height: 180,
    borderRadius: radii.lg,
  },
  postList: {
    gap: spacing.md,
  },
  postCard: {
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  postHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  postAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  postMeta: {
    flex: 1,
    gap: 2,
  },
  postAuthor: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "800",
  },
  postTime: {
    color: palette.muted,
    fontSize: 12,
  },
  postDeleteButton: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: palette.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  postDeleteLabel: {
    color: palette.danger,
    fontSize: 12,
    fontWeight: "800",
  },
  postText: {
    color: palette.text,
    fontSize: 14,
    lineHeight: 22,
  },
  postImage: {
    width: "100%",
    height: 220,
    borderRadius: radii.lg,
  },
  chatComposerCard: {
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
  },
  chatList: {
    gap: spacing.md,
  },
  chatRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: spacing.sm,
  },
  chatRowOwn: {
    justifyContent: "flex-end",
  },
  chatAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  chatBubble: {
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: 6,
    maxWidth: "82%",
    padding: spacing.md,
  },
  chatBubbleOwn: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  chatSender: {
    color: palette.accentSoft,
    fontSize: 12,
    fontWeight: "800",
  },
  chatText: {
    color: palette.text,
    fontSize: 14,
    lineHeight: 21,
  },
  chatTextOwn: {
    color: "#ffffff",
  },
  chatTime: {
    color: palette.muted,
    fontSize: 11,
  },
  chatTimeOwn: {
    color: "#234436",
  },
  chatReadReceipt: {
    color: "#234436",
    fontSize: 11,
    fontWeight: "800",
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

function formatTypingUsers(names: string[]) {
  if (names.length === 1) {
    return `${names[0]} is typing...`;
  }

  if (names.length === 2) {
    return `${names[0]} and ${names[1]} are typing...`;
  }

  return `${names[0]}, ${names[1]}, and ${names.length - 2} others are typing...`;
}

function formatSeenUsers(names: string[]) {
  if (names.length === 1) {
    return `Seen by ${names[0]}`;
  }

  if (names.length === 2) {
    return `Seen by ${names[0]} and ${names[1]}`;
  }

  return `Seen by ${names[0]}, ${names[1]}, and ${names.length - 2} others`;
}

function formatDeliveredUsers(names: string[]) {
  if (names.length === 0) {
    return "Sent";
  }

  if (names.length === 1) {
    return `Delivered to ${names[0]}`;
  }

  if (names.length === 2) {
    return `Delivered to ${names[0]} and ${names[1]}`;
  }

  return `Delivered to ${names[0]}, ${names[1]}, and ${names.length - 2} others`;
}

function formatGroupDeliveryStatus(seenNames: string[], deliveredNames: string[]) {
  if (seenNames.length > 0 && deliveredNames.length > 0) {
    return `${formatSeenUsers(seenNames)} · ${formatDeliveredUsers(deliveredNames)}`;
  }

  if (seenNames.length > 0) {
    return formatSeenUsers(seenNames);
  }

  return formatDeliveredUsers(deliveredNames);
}
