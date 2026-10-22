import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";
import { PostCard } from "../components/PostCard";
import { Screen } from "../components/Screen";
import { useAppState } from "../providers/AppProvider";
import { palette, radii, spacing, createThemedStyles } from "../theme";
import { CommentsSheet } from "../components/CommentsSheet";
import { getCopy } from "../data/copy";

export function PostDetailsScreen({
  navigation,
  route,
}: {
  navigation: any;
  route: { params: { postId: string; openComments?: boolean } };
}) {
  const {
    currentUser,
    getCommentsForPost,
    getPostById,
    getUserById,
    togglePostLike,
    addPostComment,
    deletePost,
    toggleSavePost,
    isPostSaved,
    language,
  } = useAppState();
  const copy = getCopy(language);
  const { postId, openComments } = route.params;
  const isFocused = useIsFocused();
  const post = getPostById(postId);
  const author = post ? getUserById(post.userId) : undefined;
  const comments = post ? getCommentsForPost(post.id) : [];
  const [showComments, setShowComments] = useState(Boolean(openComments));
  const [commentDraft, setCommentDraft] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);

  useEffect(() => {
    if (openComments) {
      setShowComments(true);
    }
  }, [openComments, postId]);

  const headerMeta = useMemo(() => {
    if (!post) {
      return null;
    }

    return `${post.likedBy.length} likes · ${post.commentCount} comments`;
  }, [post]);

  async function handleLike() {
    if (!post) {
      return;
    }

    const result = await togglePostLike(post.id);
    if (!result.ok) {
      Alert.alert(copy.likeUnavailableTitle, result.message ?? copy.pdLikeFailed);
    }
  }

  async function handleSave() {
    if (!post) {
      return;
    }

    const result = await toggleSavePost(post.id);
    if (!result.ok) {
      Alert.alert(copy.saveUnavailableTitle, result.message ?? copy.pdSaveFailed);
    }
  }

  async function handleDelete() {
    if (!post) {
      return;
    }

    Alert.alert(copy.deletePostTitle, copy.deletePostBody, [
      { text: copy.cancel, style: "cancel" },
      {
        text: copy.delete,
        style: "destructive",
        onPress: () => {
          void (async () => {
            const result = await deletePost(post.id);
            if (!result.ok) {
              Alert.alert(copy.deleteUnavailableTitle, result.message ?? copy.pdDeleteFailed);
              return;
            }

            navigation.goBack();
          })();
        },
      },
    ]);
  }

  async function handleSubmitComment() {
    if (!post || !commentDraft.trim() || isPostingComment) {
      return;
    }

    setIsPostingComment(true);
    try {
      const result = await addPostComment(post.id, commentDraft);
      if (!result.ok) {
        Alert.alert(copy.commentUnavailableTitle, result.message ?? copy.commentUnavailableBody);
        return;
      }

      setCommentDraft("");
    } finally {
      setIsPostingComment(false);
    }
  }

  if (!post || !author) {
    return (
      <Screen contentContainerStyle={styles.emptyScreen}>
        <View style={styles.emptyCard}>
          <Ionicons color={palette.muted} name="images-outline" size={26} />
          <Text style={styles.emptyTitle}>{copy.postNotFoundTitle}</Text>
          <Text style={styles.emptyBody}>
            This post is no longer available or has not loaded into your feed yet.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollable contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>{copy.postDetailKicker}</Text>
          <Text style={styles.title}>{copy.postDetailTitle}</Text>
          {headerMeta ? <Text style={styles.subtitle}>{headerMeta}</Text> : null}
        </View>
        <Pressable onPress={() => setShowComments(true)} style={styles.headerAction}>
          <Ionicons color={palette.text} name="chatbubble-ellipses-outline" size={18} />
          <Text style={styles.headerActionLabel}>{copy.reelCommentsTitle}</Text>
        </Pressable>
      </View>

      <PostCard
        author={author}
        currentUserId={currentUser?.id}
        mediaPlaybackEnabled={isFocused}
        onAuthorPress={() => navigation.navigate("PublicProfile", { userId: author.id })}
        onComment={() => setShowComments(true)}
        onDelete={post.userId === currentUser?.id ? handleDelete : undefined}
        onLike={() => {
          void handleLike();
        }}
        onSave={() => {
          void handleSave();
        }}
        post={post}
        saved={isPostSaved(post.id)}
      />

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>{copy.recentComments}</Text>
        {comments.length === 0 ? (
          <Text style={styles.summaryEmpty}>{copy.startConversationOnPost}</Text>
        ) : (
          comments.slice(0, 4).map((comment) => (
            <View key={comment.id} style={styles.previewCommentRow}>
              <Image source={{ uri: comment.userAvatar }} style={styles.previewCommentAvatar} />
              <View style={styles.previewCommentBody}>
                <Text style={styles.previewCommentAuthor}>{comment.userName}</Text>
                <Text numberOfLines={2} style={styles.previewCommentText}>
                  {comment.text}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      <CommentsSheet
        comments={comments}
        currentUserAvatar={currentUser?.profileImage}
        draft={commentDraft}
        emptyText={copy.emptyPostCommentBody}
        isPosting={isPostingComment}
        language={language}
        onChangeDraft={setCommentDraft}
        onClose={() => setShowComments(false)}
        onSubmit={() => void handleSubmitComment()}
        placeholder={`${copy.commentPlaceholder}...`}
        sendLabel={copy.postComment}
        subtitle={`@${author.username}`}
        title={copy.commentsTitle}
        visible={showComments}
      />
    </Screen>
  );
}

const styles = createThemedStyles({
  content: {
    gap: spacing.lg,
  },
  emptyScreen: {
    justifyContent: "center",
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: "#151922",
    borderColor: palette.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
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
    textAlign: "center",
  },
  headerCard: {
    alignItems: "center",
    backgroundColor: "#151922",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.xl,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.lg,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  kicker: {
    color: palette.accentSoft,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  title: {
    color: palette.text,
    fontSize: 20,
    fontWeight: "900",
  },
  subtitle: {
    color: palette.textSoft,
    fontSize: 13,
    fontWeight: "600",
  },
  headerAction: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: 6,
    justifyContent: "center",
    minWidth: 86,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerActionLabel: {
    color: palette.text,
    fontSize: 12,
    fontWeight: "800",
  },
  summaryCard: {
    backgroundColor: "#151922",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  summaryTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "900",
  },
  summaryEmpty: {
    color: palette.textSoft,
    fontSize: 13,
    lineHeight: 20,
  },
  previewCommentRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
  },
  previewCommentAvatar: {
    borderRadius: 16,
    height: 32,
    width: 32,
  },
  previewCommentBody: {
    flex: 1,
    gap: 2,
  },
  previewCommentAuthor: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "800",
  },
  previewCommentText: {
    color: palette.textSoft,
    fontSize: 13,
    lineHeight: 18,
  },
  modalBackdrop: {
    backgroundColor: "rgba(1,4,7,0.56)",
    flex: 1,
    justifyContent: "flex-end",
  },
  modalTapAway: {
    flex: 1,
  },
  commentSheet: {
    backgroundColor: "#151922",
    borderColor: "rgba(255,255,255,0.08)",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    maxHeight: "82%",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  commentSheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  commentSheetTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "900",
  },
  commentSheetSubtitle: {
    color: palette.textSoft,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: radii.pill,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  commentList: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  emptyCommentText: {
    color: palette.textSoft,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  commentRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
  },
  commentAvatar: {
    borderRadius: 18,
    height: 36,
    width: 36,
  },
  commentBubble: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.lg,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  commentAuthor: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "800",
  },
  commentBody: {
    color: palette.textSoft,
    fontSize: 13,
    lineHeight: 19,
  },
  commentComposer: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  commentInput: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.pill,
    borderWidth: 1,
    color: palette.text,
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  commentSend: {
    alignItems: "center",
    backgroundColor: palette.primary,
    borderRadius: radii.pill,
    justifyContent: "center",
    minWidth: 80,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  commentSendLabel: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
  },
});
