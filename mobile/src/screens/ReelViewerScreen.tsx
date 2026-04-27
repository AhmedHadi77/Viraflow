import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ReelCard } from "../components/ReelCard";
import { useAppState } from "../providers/AppProvider";
import { palette } from "../theme";
import { Reel } from "../types/models";

export function ReelViewerScreen({ navigation, route }: { navigation: any; route: { params: { reelId: string } } }) {
  const {
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
  } = useAppState();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const flatListRef = useRef<FlatList<Reel>>(null);
  const initialIndex = Math.max(
    0,
    reels.findIndex((item) => item.id === route.params.reelId)
  );
  const [activeReelId, setActiveReelId] = useState(reels[initialIndex]?.id ?? route.params.reelId);
  const viewerHeight = Math.max(520, height);
  const topInset = insets.top + 18;
  const bottomInset = Math.max(insets.bottom, 16) + 18;

  const activeReel = useMemo(() => reels.find((item) => item.id === activeReelId) ?? reels[initialIndex], [activeReelId, initialIndex, reels]);
  const activeCreator = activeReel ? getUserById(activeReel.userId) : null;

  useEffect(() => {
    setActiveReelId(reels[initialIndex]?.id ?? route.params.reelId);
  }, [initialIndex, reels, route.params.reelId]);

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
      Alert.alert("Like unavailable", result.message ?? "This reel could not be liked right now.");
    }
  }

  async function handleRepost(reelId: string) {
    const result = await repostReel(reelId);
    if (!result.ok) {
      Alert.alert("Repost unavailable", result.message ?? "This reel could not be reposted right now.");
    }
  }

  async function handleFollow(userId: string) {
    const result = await toggleFollow(userId);
    if (!result.ok) {
      Alert.alert("Follow unavailable", result.message ?? "This creator could not be followed right now.");
    }
  }

  async function handleSave(reelId: string) {
    const result = await toggleSaveReel(reelId);
    if (!result.ok) {
      Alert.alert("Save unavailable", result.message ?? "This reel could not be saved right now.");
    }
  }

  if (!reels.length) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>No reels yet.</Text>
      </View>
    );
  }

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
        initialNumToRender={3}
        initialScrollIndex={initialIndex}
        keyExtractor={(item) => item.id}
        onScrollToIndexFailed={({ index }) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index, animated: false });
          }, 150);
        }}
        onViewableItemsChanged={onViewableItemsChanged}
        pagingEnabled
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
                boostLabel={boost?.status === "active" ? "Boost live" : undefined}
                bottomInset={bottomInset}
                commentCount={getCommentsForReel(item.id).length}
                creator={creator}
                currentUserId={currentUser?.id}
                fullScreen
                immersive
                immersiveHeight={viewerHeight}
                onComment={() => navigation.navigate("ReelDetails", { reelId: item.id })}
                onLike={() => {
                  void handleLike(item.id);
                }}
                onOpen={() => undefined}
                onRepost={() => {
                  void handleRepost(item.id);
                }}
                onSave={() => {
                  void handleSave(item.id);
                }}
                onToggleFollow={
                  creator.id === currentUser?.id
                    ? undefined
                    : () => {
                        void handleFollow(creator.id);
                      }
                }
                playVideo={activeReelId === item.id}
                reel={item}
                saved={isReelSaved(item.id)}
                topInset={topInset}
              />
            </View>
          );
        }}
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
        snapToInterval={viewerHeight}
        viewabilityConfig={viewabilityConfig}
      />

      <View pointerEvents="box-none" style={[styles.overlayHeader, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.overlayButton}>
          <Ionicons color={palette.text} name="chevron-back" size={24} />
        </Pressable>

        <View style={styles.overlayCenter}>
          <Text style={styles.overlayTitle}>Reels</Text>
          {activeCreator ? <Text style={styles.overlaySubtitle}>@{activeCreator.username}</Text> : null}
        </View>

        <Pressable onPress={() => navigation.navigate("Create", { initialMode: "reel" })} style={styles.overlayButton}>
          <Ionicons color={palette.text} name="add" size={24} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
