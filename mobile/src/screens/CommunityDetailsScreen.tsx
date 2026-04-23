import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { Alert, Image, StyleSheet, Text, View } from "react-native";
import { InputField } from "../components/InputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { useAppState } from "../providers/AppProvider";
import { palette, radii, spacing } from "../theme";

export function CommunityDetailsScreen({ navigation, route }: { navigation: any; route: { params: { communityId: string } } }) {
  const {
    currentUser,
    getCommunityById,
    getUserById,
    getCommunityPosts,
    getCommunityChatMessages,
    getCommunityTypingUsers,
    openCommunityActivity,
    createCommunityPost,
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
        Alert.alert("Community unavailable", result.message ?? "This community could not be loaded right now.");
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
        <Text style={styles.emptyText}>Community not found.</Text>
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
      Alert.alert("Photo access needed", "Allow photo library access so you can attach an image to your post.");
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
      Alert.alert("Image issue", "The selected image could not be prepared. Try another image.");
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
      Alert.alert("Post unavailable", result.message ?? "This post could not be published right now.");
      return;
    }

    setPostText("");
    setPostImage("");
    Alert.alert("Post published", `Your post is now live inside ${resolvedCommunity.name}.`);
  }

  async function handleSendChat() {
    const result = await sendCommunityChatMessage(resolvedCommunity.id, chatDraft);
    if (!result.ok) {
      Alert.alert("Group chat unavailable", result.message ?? "This message could not be sent right now.");
      return;
    }

    setCommunityTyping(resolvedCommunity.id, false);
    setChatDraft("");
  }

  return (
    <Screen scrollable>
      <Image source={{ uri: activeCommunity.coverImage }} style={styles.coverImage} />
      <SectionTitle title={activeCommunity.name} subtitle={activeCommunity.kind} />

      <View style={styles.metaRow}>
        <MetaCard label="Category" value={activeCommunity.category} />
        <MetaCard label="Visibility" value={activeCommunity.visibility} />
        <MetaCard label="Members" value={String(activeCommunity.memberIds.length)} />
      </View>

      <View style={styles.descriptionCard}>
        <Text style={styles.descriptionText}>{activeCommunity.description}</Text>
      </View>

      <View style={styles.ownerCard}>
        <Text style={styles.ownerLabel}>Owner</Text>
        <Text style={styles.ownerName}>{owner?.name ?? "Creator"}</Text>
        <Text style={styles.ownerHandle}>@{owner?.username ?? "viraflow"}</Text>
      </View>

      <View style={styles.composeCard}>
        <SectionTitle title="Create post" subtitle={`Publish updates directly inside this ${activeCommunity.kind}.`} />
        <InputField
          label="Post text"
          onChangeText={setPostText}
          placeholder="Share an update, ask a question, or publish a quick announcement..."
          value={postText}
          multiline
        />
        <PrimaryButton
          label={postImage ? "Change post image" : "Add image"}
          onPress={() => {
            void handlePickPostImage();
          }}
          variant="ghost"
        />
        {postImage ? <Image source={{ uri: postImage }} style={styles.postImagePreview} /> : null}
        <PrimaryButton
          label="Publish post"
          onPress={() => {
            void handleCreatePost();
          }}
        />
      </View>

      <SectionTitle title="Posts" subtitle={`Updates published inside ${activeCommunity.name}.`} />
      {posts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No posts yet</Text>
          <Text style={styles.emptyBody}>Be the first person to publish inside this community.</Text>
        </View>
      ) : (
        <View style={styles.postList}>
          {posts.map((post) => (
            <View key={post.id} style={styles.postCard}>
              <View style={styles.postHeader}>
                <Image source={{ uri: post.authorAvatar }} style={styles.postAvatar} />
                <View style={styles.postMeta}>
                  <Text style={styles.postAuthor}>{post.authorName}</Text>
                  <Text style={styles.postTime}>{new Date(post.createdAt).toLocaleString()}</Text>
                </View>
              </View>
              <Text style={styles.postText}>{post.text}</Text>
              {post.imageUrl ? <Image source={{ uri: post.imageUrl }} style={styles.postImage} /> : null}
            </View>
          ))}
        </View>
      )}

      {activeCommunity.kind === "group" ? (
        <>
          <SectionTitle title="Group chat" subtitle="Real-time style discussion space for group members." />
          <View style={styles.chatComposerCard}>
            <InputField
              label="Message"
              onChangeText={setChatDraft}
              placeholder="Ask the group something or share fast feedback..."
              value={chatDraft}
              multiline
            />
            <PrimaryButton
              label="Send group message"
              onPress={() => {
                void handleSendChat();
              }}
            />
          </View>
          {typingUsers.length > 0 ? <Text style={styles.statusText}>{formatTypingUsers(typingUsers.map((user) => user.name))}</Text> : null}
          {chatMessages.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No group chat messages yet</Text>
              <Text style={styles.emptyBody}>Start the discussion and bring the group to life.</Text>
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
                        {new Date(message.createdAt).toLocaleString()}
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
        label={isOwner ? "Create another space" : "Open owner profile"}
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

const styles = StyleSheet.create({
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
    color: "#071118",
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
