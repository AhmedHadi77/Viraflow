import { Ionicons } from "@expo/vector-icons";
import { rtlFlipStyle } from "../utils/layoutDirection";
import { useIsFocused } from "@react-navigation/native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
  ViewToken,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ReelCard } from "../components/ReelCard";
import { ReelCommentsSheet } from "../components/ReelCommentsSheet";
import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { shareReelToApps } from "../services/reelSharing";
import { darkPalette as palette, createDarkStyles } from "../theme";
import { isReelBoostActive, Reel } from "../types/models";

export function ReelViewerScreen({
  navigation,
  route,
}: {
  navigation: any;
  route: { params: { reelId: string; openComments?: boolean } };
}) {
  const {
    language,
    currentUser,
    reels,
    getUserById,
    getCommentsForReel,
    getBoostForReel,
    isReelSaved,
    toggleSaveReel,
    toggleLike,
    repostReel,
    toggleFollow,
    addComment,
    deleteReel,
  } = useAppState();
  const copy = getCopy(language);
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const isFocused = useIsFocused();
  const flatListRef = useRef<FlatList<Reel>>(null);
  const initialIndex = Math.max(
    0,
    reels.findIndex((item) => item.id === route.params.reelId)
  );
  const [activeReelId, setActiveReelId] = useState(reels[initialIndex]?.id ?? route.params.reelId);
  const [commentsOpen, setCommentsOpen] = useState(Boolean(route.params.openComments));
  const [commentDraft, setCommentDraft] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [muted, setMuted] = useState(false);
  const viewerHeight = Math.max(520, height);
  const topInset = insets.top + 82;
  const bottomInset = Math.max(insets.bottom, 16) + 18;

  const activeReel = useMemo(() => reels.find((item) => item.id === activeReelId) ?? reels[initialIndex], [activeReelId, initialIndex, reels]);
  const activeCreator = activeReel ? getUserById(activeReel.userId) : null;

  useEffect(() => {
    setActiveReelId(reels[initialIndex]?.id ?? route.params.reelId);
  }, [initialIndex, reels, route.params.reelId]);

  useEffect(() => {
    if (route.params.openComments) {
      setCommentsOpen(true);
      navigation.setParams?.({ openComments: undefined });
    }
  }, [navigation, route.params.openComments]);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 70,
  }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
    const nextVisible = viewableItems.find((item) => item.isViewable && item.item && typeof item.item.id === "string");
    if (nextVisible?.item?.id) {
      setActiveReelId(nextVisible.item.id);
    }
  }).current;

  async function handleLike(reelId: string) {
    const result = await toggleLike(reelId);
    if (!result.ok) {
      Alert.alert(copy.likeUnavailableTitle, result.message ?? copy.likeUnavailableBody);
    }
  }

  async function handleShare(reelId: string) {
    const reel = reels.find((item) => item.id === reelId);
    const creator = reel ? getUserById(reel.userId) : null;
    if (!reel || !creator) {
      Alert.alert(copy.shareUnavailableTitle, copy.shareUnavailableBody);
      return;
    }

    const result = await repostReel(reelId);
    if (!result.ok) {
      Alert.alert(copy.shareUnavailableTitle, result.message ?? copy.shareUnavailableBody);
      return;
    }

    try {
      await shareReelToApps(reel, creator);
    } catch (error) {
      Alert.alert(copy.shareUnavailableTitle, error instanceof Error ? error.message : copy.shareUnavailableBody);
    }
  }

  async function handleFollow(userId: string) {
    const result = await toggleFollow(userId);
    if (!result.ok) {
      Alert.alert(copy.followUnavailableTitle, result.message ?? copy.followUnavailableBody);
    }
  }

  async function handleSave(reelId: string) {
    const result = await toggleSaveReel(reelId);
    if (!result.ok) {
      Alert.alert(copy.saveUnavailableTitle, result.message ?? copy.saveUnavailableBody);
    }
  }

  async function handleDelete(reelId: string) {
    Alert.alert(copy.rdDeleteReel, copy.rvDeleteBody, [
      { text: copy.cancel, style: "cancel" },
      {
        text: copy.delete,
        style: "destructive",
        onPress: () => {
          void (async () => {
            const result = await deleteReel(reelId);
            if (!result.ok) {
              Alert.alert(copy.deleteUnavailableTitle, result.message ?? copy.deleteUnavailableBody);
              return;
            }

            if (reels.length <= 1) {
              navigation.goBack();
            }
          })();
        },
      },
    ]);
  }

  async function submitComment() {
    const nextComment = commentDraft.trim();
    if (!activeReel || !nextComment) {
      Alert.alert(copy.commentEmptyTitle, copy.commentEmptyBody);
      return;
    }

    setIsPostingComment(true);
    try {
      const result = await addComment(activeReel.id, nextComment);
      if (!result.ok) {
        Alert.alert(copy.commentUnavailableTitle, result.message ?? copy.commentUnavailableBody);
        return;
      }

      setCommentDraft("");
    } finally {
      setIsPostingComment(false);
    }
  }

  if (!reels.length) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>{copy.reelsEmptyTitle}</Text>
      </View>
    );
  }

  const activeComments = activeReel ? getCommentsForReel(activeReel.id) : [];

  return (
    <View style={styles.container}>
      <FlatList
        bounces={false}
        data={reels}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({
          index,
          length: viewerHeight,
          offset: viewerHeight * index,
        })}
        initialNumToRender={1}
        initialScrollIndex={initialIndex}
        keyExtractor={(item) => item.id}
        maxToRenderPerBatch={1}
        onScrollToIndexFailed={({ index }) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index, animated: false });
          }, 150);
        }}
        onViewableItemsChanged={onViewableItemsChanged}
        pagingEnabled
        removeClippedSubviews
        ref={flatListRef}
        renderItem={({ item }) => {
          const creator = getUserById(item.userId);
          const boost = getBoostForReel(item.id);
          if (!creator) {
            return null;
          }

          return (
            <View style={{ height: viewerHeight, width }}>
              <ReelCard
                boostLabel={boost?.status === "active" ? copy.boostLive : isReelBoostActive(item) ? "Sponsored" : undefined}
                bottomInset={bottomInset}
                commentCount={getCommentsForReel(item.id).length}
                creator={creator}
                currentUserId={currentUser?.id}
                fullScreen
                immersive
                immersiveHeight={viewerHeight}
                onComment={() => setCommentsOpen(true)}
                onLike={() => {
                  void handleLike(item.id);
                }}
                onOpen={() => undefined}
                onRepost={() => {
                  void handleShare(item.id);
                }}
                onSave={() => {
                  void handleSave(item.id);
                }}
                onDelete={
                  item.userId === currentUser?.id
                    ? () => {
                        void handleDelete(item.id);
                      }
                    : undefined
                }
                onToggleMuted={() => setMuted((currentValue) => !currentValue)}
                onToggleFollow={
                  creator.id === currentUser?.id
                    ? undefined
                    : () => {
                        void handleFollow(creator.id);
                      }
                }
                playVideo={isFocused && activeReelId === item.id}
                reel={item}
                muted={muted}
                saved={isReelSaved(item.id)}
                topInset={topInset}
                viewerMode
              />
            </View>
          );
        }}
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
        snapToInterval={viewerHeight}
        viewabilityConfig={viewabilityConfig}
        windowSize={3}
      />

      <View pointerEvents="box-none" style={[styles.overlayHeader, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.overlayButton}>
          <Ionicons color={palette.text} name="chevron-back" size={24} style={rtlFlipStyle} />
        </Pressable>

        <View style={styles.overlayCenter}>
          <Text style={styles.overlayTitle}>{copy.reels}</Text>
          {activeCreator ? <Text style={styles.overlaySubtitle}>@{activeCreator.username}</Text> : null}
        </View>

        <Pressable onPress={() => navigation.navigate("Create", { initialMode: "reel" })} style={styles.overlayButton}>
          <Ionicons color={palette.text} name="add" size={24} />
        </Pressable>
      </View>

      <ReelCommentsSheet
        bottomInset={Math.max(insets.bottom, 16)}
        comments={activeComments}
        draft={commentDraft}
        isPosting={isPostingComment}
        onChangeDraft={setCommentDraft}
        onClose={() => setCommentsOpen(false)}
        onSubmit={() => {
          void submitComment();
        }}
        visible={commentsOpen && Boolean(activeReel)}
      />
    </View>
  );
}

const styles = createDarkStyles({
  container: {
    backgroundColor: "#020406",
    flex: 1,
  },
  overlayHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    left: 0,
    paddingHorizontal: 16,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 5,
  },
  overlayButton: {
    alignItems: "center",
    backgroundColor: "rgba(6,9,13,0.46)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  overlayCenter: {
    alignItems: "center",
    flex: 1,
    paddingHorizontal: 12,
  },
  overlayTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "900",
  },
  overlaySubtitle: {
    color: palette.textSoft,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: "#020406",
    flex: 1,
    justifyContent: "center",
  },
  emptyText: {
    color: palette.muted,
    fontSize: 15,
  },
});
