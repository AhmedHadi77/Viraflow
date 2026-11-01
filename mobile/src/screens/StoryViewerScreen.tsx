import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../components/Avatar";
import { StudioLayersOverlay } from "../components/studio/StudioLayers";
import { useStudioMusic } from "../services/studioMusic";
import { useEventListener } from "expo";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  Keyboard,
  KeyboardEvent,
  Linking,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { buildCloudinaryPlayableVideoUrl, sizedImageUrl } from "../services/mediaUpload";
import { darkPalette as palette, radii, spacing, createDarkStyles } from "../theme";
import { Story, StudioStickerLayer, User } from "../types/models";
import { fill } from "../utils/labels";
import { formatRelativeTime } from "../utils/timeFormatting";

type ExpoVideoModule = typeof import("expo-video");
let cachedExpoVideoModule: ExpoVideoModule | null | undefined;

const IMAGE_STORY_DURATION_MS = 5500;
const QUICK_REACTIONS = ["😂", "😮", "😍", "😢", "👏", "🔥"];

function useKeyboardHeight() {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, (event: KeyboardEvent) => setHeight(event.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}

export function StoryViewerScreen({
  navigation,
  route,
}: {
  navigation: any;
  route: { params: { userId: string; storyId?: string } };
}) {
  const {
    language,
    stories,
    currentUser,
    getUserById,
    markStoryViewed,
    deleteStory,
    toggleStoryHighlight,
    voteStoryPoll,
    canDirectMessageUser,
    startDirectChat,
    sendDirectMessage,
  } = useAppState();
  const copy = getCopy(language);
  const insets = useSafeAreaInsets();
  const userStories = useMemo(
    () =>
      [...stories]
        .filter(
          (story) =>
            story.userId === route.params.userId &&
            (new Date(story.expiresAt).getTime() > Date.now() || Boolean(story.highlightedAt))
        )
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    [route.params.userId, stories]
  );
  const initialIndex = Math.max(
    0,
    route.params.storyId ? userStories.findIndex((story) => story.id === route.params.storyId) : 0
  );
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [viewerSheetOpen, setViewerSheetOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [videoDurationSeconds, setVideoDurationSeconds] = useState(0);
  const [videoCurrentTimeSeconds, setVideoCurrentTimeSeconds] = useState(0);
  const translateY = useRef(new Animated.Value(0)).current;
  const imageProgress = useRef(new Animated.Value(0)).current;
  const mediaOpacity = useRef(new Animated.Value(1)).current;
  const [imageProgressValue, setImageProgressValue] = useState(0);
  const imageProgressRef = useRef(0);
  const [replyText, setReplyText] = useState("");
  const [replyFocused, setReplyFocused] = useState(false);
  const [questionLayer, setQuestionLayer] = useState<StudioStickerLayer | null>(null);
  const [sendingReply, setSendingReply] = useState(false);
  const [replyNotice, setReplyNotice] = useState<string | null>(null);
  const keyboardHeight = useKeyboardHeight();
  const activeStory = userStories[activeIndex];
  const creator = activeStory ? getUserById(activeStory.userId) : null;
  const [mediaSize, setMediaSize] = useState({ width: 0, height: 0 });
  // The story's soundtrack plays while it's on screen (and stops when muted or the viewers list is open).
  useStudioMusic(activeStory?.studio?.music, Boolean(activeStory) && !isMuted && !viewerSheetOpen);
  const isOwnStory = activeStory?.userId === currentUser?.id;
  const viewerUsers = useMemo(
    () =>
      (activeStory?.viewerIds ?? [])
        .map((viewerId) => getUserById(viewerId))
        .filter((viewer): viewer is User => Boolean(viewer)),
    [activeStory?.viewerIds, getUserById]
  );

  useEffect(() => {
    const listenerId = imageProgress.addListener(({ value }) => {
      imageProgressRef.current = value;
      setImageProgressValue(value);
    });

    return () => {
      imageProgress.removeListener(listenerId);
    };
  }, [imageProgress]);

  useEffect(() => {
    setActiveIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    if (userStories.length === 0) {
      navigation.goBack();
    }
  }, [navigation, userStories.length]);

  // Replying, answering a question or looking at viewers holds the story still.
  const holdStory = viewerSheetOpen || replyFocused || Boolean(questionLayer) || sendingReply;

  useEffect(() => {
    setViewerSheetOpen(false);
    setVideoDurationSeconds(0);
    setVideoCurrentTimeSeconds(0);
    setQuestionLayer(null);
    imageProgress.stopAnimation();
    imageProgress.setValue(0);
    imageProgressRef.current = 0;

    if (activeStory) {
      void markStoryViewed(activeStory.id);
    }
  }, [activeIndex, activeStory?.id, imageProgress]);

  useEffect(() => {
    if (!activeStory || activeStory.mediaType === "video" || holdStory) {
      return;
    }
    const remaining = Math.max(0, 1 - imageProgressRef.current) * IMAGE_STORY_DURATION_MS;
    const animation = Animated.timing(imageProgress, {
      toValue: 1,
      duration: remaining,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (finished) {
        goNext();
      }
    });

    return () => {
      animation.stop();
    };
  }, [activeIndex, activeStory?.id, activeStory?.mediaType, holdStory, imageProgress]);

  useEffect(() => {
    if (!replyNotice) {
      return;
    }
    const timer = setTimeout(() => setReplyNotice(null), 2200);
    return () => clearTimeout(timer);
  }, [replyNotice]);

  useEffect(() => {
    mediaOpacity.setValue(0.88);
    Animated.timing(mediaOpacity, {
      toValue: 1,
      duration: 170,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [activeStory?.id, mediaOpacity]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && gestureState.dy > 10,
        onPanResponderMove: (_event, gestureState) => {
          translateY.setValue(Math.max(0, gestureState.dy));
        },
        onPanResponderRelease: (_event, gestureState) => {
          if (gestureState.dy > 120 || gestureState.vy > 1.2) {
            Animated.timing(translateY, {
              toValue: 520,
              duration: 170,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }).start(() => navigation.goBack());
            return;
          }

          Animated.spring(translateY, {
            toValue: 0,
            damping: 18,
            stiffness: 180,
            mass: 0.8,
            useNativeDriver: true,
          }).start();
        },
      }),
    [navigation, translateY]
  );

  if (!activeStory || !creator) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>{copy.storyUnavailableShort}</Text>
      </View>
    );
  }

  const activeProgress =
    activeStory.mediaType === "video"
      ? videoDurationSeconds > 0
        ? Math.min(1, Math.max(0, videoCurrentTimeSeconds / videoDurationSeconds))
        : 0
      : imageProgressValue;

  const pollSticker = activeStory.studio?.stickers?.find((sticker) => sticker.kind === "poll");
  const votes = activeStory.pollVotes ?? {};
  const myVote = currentUser ? votes[currentUser.id] : undefined;
  const pollCounts = [0, 1].map((option) => Object.values(votes).filter((choice) => choice === option).length);

  function openStickerLink(url: string) {
    Alert.alert(copy.svOpenLink, url, [
      { text: copy.cancel, style: "cancel" },
      { text: copy.svOpen, onPress: () => void Linking.openURL(url).catch(() => undefined) },
    ]);
  }

  async function sendStoryMessage(text: string) {
    if (!creator || isOwnStory || sendingReply) {
      return false;
    }
    if (!canDirectMessageUser(creator.id)) {
      Alert.alert(copy.chatFollowToMessage);
      return false;
    }
    setSendingReply(true);
    try {
      const thread = await startDirectChat(creator.id);
      if (!thread.ok || !thread.threadId) {
        Alert.alert(thread.message ?? copy.svReplyFailed);
        return false;
      }
      const sent = await sendDirectMessage(thread.threadId, { text });
      if (!sent.ok) {
        Alert.alert(sent.message ?? copy.svReplyFailed);
        return false;
      }
      setReplyNotice(copy.svReplySent);
      return true;
    } finally {
      setSendingReply(false);
    }
  }

  async function submitReply() {
    const text = replyText.trim();
    if (!text) {
      return;
    }
    const message = questionLayer ? `❓ ${questionLayer.value}\n💬 ${text}` : `↩️ ${copy.svRepliedToStory}\n${text}`;
    const ok = await sendStoryMessage(message);
    if (ok) {
      setReplyText("");
      setQuestionLayer(null);
      Keyboard.dismiss();
    }
  }

  async function sendReaction(emoji: string) {
    const ok = await sendStoryMessage(`${emoji} ${copy.svReactedToStory}`);
    if (ok) {
      Keyboard.dismiss();
    }
  }

  async function handleDelete() {
    Alert.alert(copy.deleteStoryTitle, copy.deleteStoryBody, [
      { text: copy.cancel, style: "cancel" },
      {
        text: copy.delete,
        style: "destructive",
        onPress: () => {
          void (async () => {
            const result = await deleteStory(activeStory.id);
            if (!result.ok) {
              Alert.alert(copy.deleteUnavailableTitle, result.message ?? copy.deleteStoryUnavailableBody);
              return;
            }

            if (userStories.length <= 1) {
              navigation.goBack();
              return;
            }

            setActiveIndex((current) => Math.max(0, Math.min(current, userStories.length - 2)));
          })();
        },
      },
    ]);
  }

  async function handleHighlightToggle() {
    const result = await toggleStoryHighlight(activeStory.id, {
      highlighted: !activeStory.highlightedAt,
      highlightLabel: activeStory.highlightLabel ?? activeStory.caption ?? copy.highlights,
    });

    if (!result.ok) {
      Alert.alert(
        activeStory.highlightedAt ? copy.storyUnavailableTitle : copy.saveUnavailableTitle,
        result.message ?? copy.storyHighlightBody
      );
    }
  }

  function goNext() {
    setActiveIndex((current) => {
      if (current >= userStories.length - 1) {
        navigation.goBack();
        return current;
      }

      return current + 1;
    });
  }

  function goPrevious() {
    setActiveIndex((current) => Math.max(0, current - 1));
  }

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY }] }]}
      {...panResponder.panHandlers}
    >
      <Animated.View
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setMediaSize((current) => (current.width === width && current.height === height ? current : { width, height }));
        }}
        style={[styles.mediaLayer, { opacity: mediaOpacity }]}
      >
        <StoryMedia
          key={activeStory.id}
          isMuted={isMuted}
          onComplete={goNext}
          onProgress={(currentTime, duration) => {
            setVideoCurrentTimeSeconds(currentTime);
            setVideoDurationSeconds(duration);
          }}
          paused={holdStory}
          story={activeStory}
        />
      </Animated.View>

      <View style={[styles.topOverlay, { paddingTop: insets.top + 10 }]}>
        <View style={styles.progressRow}>
          {userStories.map((story, index) => {
            const width: `${number}%` =
              index < activeIndex ? "100%" : index > activeIndex ? "0%" : `${Math.min(1, Math.max(0, activeProgress)) * 100}%`;

            return (
              <View key={story.id} style={styles.progressTrack}>
                <Animated.View style={[styles.progressFill, { width }]} />
              </View>
            );
          })}
        </View>

        <View style={styles.headerRow}>
          <View style={styles.headerIdentity}>
            <Avatar name={creator.name} style={styles.headerAvatar} uri={creator.profileImage} />
            <View>
              <Text style={styles.headerName}>{creator.name}</Text>
              <Text style={styles.headerMeta}>
                @{creator.username} - {formatElapsed(activeStory.createdAt, language)}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            {activeStory.mediaType === "video" || activeStory.studio?.music ? (
              <Pressable onPress={() => setIsMuted((current) => !current)} style={styles.controlButton}>
                <Ionicons
                  color={palette.text}
                  name={isMuted ? "volume-mute-outline" : "volume-high-outline"}
                  size={18}
                />
              </Pressable>
            ) : null}

            {isOwnStory ? (
              <>
                <Pressable onPress={() => setViewerSheetOpen(true)} style={styles.controlButton}>
                  <Ionicons color={palette.text} name="eye-outline" size={18} />
                  <Text style={styles.controlCount}>{viewerUsers.length}</Text>
                </Pressable>
                <Pressable onPress={() => void handleHighlightToggle()} style={styles.controlButton}>
                  <Ionicons
                    color={palette.text}
                    name={activeStory.highlightedAt ? "star" : "star-outline"}
                    size={18}
                  />
                </Pressable>
                <Pressable onPress={() => void handleDelete()} style={styles.controlButton}>
                  <Ionicons color={palette.text} name="trash-outline" size={18} />
                </Pressable>
              </>
            ) : null}

            <Pressable onPress={() => navigation.goBack()} style={styles.closeButton}>
              <Ionicons color={palette.text} name="close" size={22} />
            </Pressable>
          </View>
        </View>
      </View>

      <View pointerEvents="box-none" style={styles.tapLayer}>
        <Pressable onPress={goPrevious} style={styles.tapZone} />
        <Pressable onPress={goNext} style={styles.tapZone} />
      </View>

      {/* Above the tap zones so polls, questions and links can be tapped. */}
      <View pointerEvents="box-none" style={styles.layersLayer}>
        <StudioLayersOverlay
          captionBottom={mediaSize.height * 0.2}
          countdownLabels={{ d: copy.cdDaysShort, h: copy.cdHoursShort, m: copy.cdMinutesShort, done: copy.cdNow }}
          currentTime={activeStory.mediaType === "video" ? videoCurrentTimeSeconds : undefined}
          height={mediaSize.height}
          onLinkPress={openStickerLink}
          onQuestionPress={isOwnStory ? undefined : (layer) => setQuestionLayer(layer)}
          poll={
            pollSticker
              ? {
                  counts: pollCounts,
                  myVote,
                  showResults: isOwnStory || myVote !== undefined,
                  onVote: isOwnStory
                    ? undefined
                    : (option) => {
                        void voteStoryPoll(activeStory.id, option).then((result) => {
                          if (!result.ok) {
                            Alert.alert(result.message ?? copy.svReplyFailed);
                          }
                        });
                      },
                }
              : undefined
          }
          questionPlaceholder={copy.sqTypeAnswer}
          studio={activeStory.studio}
          width={mediaSize.width}
        />
      </View>

      <View
        style={[
          styles.bottomOverlay,
          { paddingBottom: (Platform.OS === "ios" && keyboardHeight ? keyboardHeight : Math.max(insets.bottom, 20)) + 8 },
        ]}
      >
        {activeStory.highlightedAt ? (
          <View style={styles.highlightPill}>
            <Ionicons color="#151922" name="sparkles" size={12} />
            <Text style={styles.highlightPillLabel}>{activeStory.highlightLabel || copy.highlights}</Text>
          </View>
        ) : null}
        {!replyFocused ? (
          <Text numberOfLines={3} style={styles.caption}>
            {activeStory.caption?.trim() || copy.pulseoraStory}
          </Text>
        ) : null}
        {replyNotice ? <Text style={styles.replyNotice}>{replyNotice}</Text> : null}
        {!isOwnStory ? (
          <>
            {replyFocused || questionLayer ? (
              <View style={styles.reactionRow}>
                {QUICK_REACTIONS.map((emoji) => (
                  <Pressable accessibilityLabel={emoji} disabled={sendingReply} key={emoji} onPress={() => void sendReaction(emoji)} style={styles.reaction}>
                    <Text style={styles.reactionEmoji}>{emoji}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            {questionLayer ? (
              <View style={styles.questionBanner}>
                <Ionicons color="#ffffff" name="help-circle" size={16} />
                <Text numberOfLines={2} style={styles.questionBannerLabel}>
                  {questionLayer.value}
                </Text>
                <Pressable accessibilityLabel={copy.cancel} hitSlop={8} onPress={() => setQuestionLayer(null)}>
                  <Ionicons color="rgba(255,255,255,0.8)" name="close" size={16} />
                </Pressable>
              </View>
            ) : null}
            <View style={styles.replyRow}>
              <TextInput
                autoFocus={Boolean(questionLayer)}
                key={questionLayer?.id ?? "reply"}
                maxLength={500}
                onBlur={() => setReplyFocused(false)}
                onChangeText={setReplyText}
                onFocus={() => setReplyFocused(true)}
                onSubmitEditing={() => void submitReply()}
                placeholder={questionLayer ? copy.sqTypeAnswer : fill(copy.svReplyTo, { name: creator.name.split(" ")[0] })}
                placeholderTextColor="rgba(255,255,255,0.7)"
                returnKeyType="send"
                style={styles.replyInput}
                value={replyText}
              />
              <Pressable
                accessibilityLabel={copy.svSend}
                disabled={!replyText.trim() || sendingReply}
                onPress={() => void submitReply()}
                style={[styles.replySend, !replyText.trim() ? styles.replySendIdle : null]}
              >
                {sendingReply ? <ActivityIndicator color="#ffffff" size="small" /> : <Ionicons color="#ffffff" name="paper-plane" size={18} />}
              </Pressable>
            </View>
          </>
        ) : null}
      </View>

      <Modal
        animationType="slide"
        onRequestClose={() => setViewerSheetOpen(false)}
        transparent
        visible={viewerSheetOpen}
      >
        <View style={styles.sheetBackdrop}>
          <Pressable onPress={() => setViewerSheetOpen(false)} style={styles.sheetTapAway} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>{copy.storyViewers}</Text>
                <Text style={styles.sheetSubtitle}>{viewerUsers.length} {copy.peopleWatchedStory}</Text>
              </View>
              <Pressable onPress={() => setViewerSheetOpen(false)} style={styles.sheetClose}>
                <Ionicons color={palette.text} name="close" size={18} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.viewerList} showsVerticalScrollIndicator={false}>
              {viewerUsers.length === 0 ? (
                <Text style={styles.emptyViewerText}>{copy.noViewersYetBody}</Text>
              ) : (
                viewerUsers.map((viewer) => (
                  <View key={viewer.id} style={styles.viewerRow}>
                    <Avatar name={viewer.name} style={styles.viewerAvatar} uri={viewer.profileImage} />
                    <View style={styles.viewerCopy}>
                      <Text style={styles.viewerName}>{viewer.name}</Text>
                      <Text style={styles.viewerMeta}>@{viewer.username}</Text>
                    </View>
                    {pollSticker && votes[viewer.id] !== undefined ? (
                      <View style={styles.voteChip}>
                        <Ionicons color="#ffffff" name="stats-chart" size={11} />
                        <Text numberOfLines={1} style={styles.voteChipLabel}>
                          {pollSticker.options?.[votes[viewer.id]] ?? ""}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

function StoryMedia({
  story,
  isMuted,
  paused,
  onProgress,
  onComplete,
}: {
  story: Story;
  isMuted: boolean;
  paused: boolean;
  onProgress: (currentTime: number, duration: number) => void;
  onComplete: () => void;
}) {
  if (story.mediaType === "video" && story.videoUrl) {
    const expoVideo = getExpoVideoModule();
    if (expoVideo) {
      return (
        <StoryVideoPlayer
          expoVideo={expoVideo}
          isMuted={isMuted}
          onComplete={onComplete}
          onProgress={onProgress}
          paused={paused}
          story={story}
        />
      );
    }
  }

  return <Image resizeMode="cover" source={{ uri: sizedImageUrl(story.imageUrl, 1080) }} style={styles.media} />;
}

function StoryVideoPlayer({
  expoVideo,
  story,
  isMuted,
  paused,
  onProgress,
  onComplete,
}: {
  expoVideo: ExpoVideoModule;
  story: Story;
  isMuted: boolean;
  paused: boolean;
  onProgress: (currentTime: number, duration: number) => void;
  onComplete: () => void;
}) {
  const { VideoView, useVideoPlayer } = expoVideo;
  const completedRef = useRef(false);
  const playableVideoUrl = normalizeStoryVideoUrl(story.videoUrl!);
  const player = useVideoPlayer(playableVideoUrl, (videoPlayer) => {
    videoPlayer.loop = false;
    videoPlayer.muted = isMuted;
    videoPlayer.volume = story.studio?.originalVolume ?? 1;
    videoPlayer.timeUpdateEventInterval = 0.2;
    videoPlayer.play();
  });

  useEventListener(player, "sourceLoad", ({ duration }) => {
    completedRef.current = false;
    onProgress(0, duration || story.videoDurationSeconds || 0);
  });

  useEventListener(player, "timeUpdate", ({ currentTime }) => {
    const duration = player.duration || story.videoDurationSeconds || 0;
    onProgress(currentTime, duration);
    if (!completedRef.current && duration > 0 && currentTime >= Math.max(0, duration - 0.18)) {
      completedRef.current = true;
      onComplete();
    }
  });

  useEffect(() => {
    try {
      player.loop = false;
      player.muted = isMuted || (story.studio?.originalVolume ?? 1) <= 0.001;
      player.volume = story.studio?.originalVolume ?? 1;
      player.timeUpdateEventInterval = 0.2;
      if (paused) {
        player.pause();
      } else {
        player.play();
      }
    } catch {
      // ignore viewer startup issues
    }

    return () => {
      try {
        player.pause();
      } catch {
        // ignore teardown issues
      }
    };
  }, [isMuted, paused, player]);

  return (
    <VideoView
      allowsPictureInPicture={false}
      contentFit="cover"
      nativeControls={false}
      player={player}
      style={styles.media}
    />
  );
}

function getExpoVideoModule() {
  if (cachedExpoVideoModule !== undefined) {
    return cachedExpoVideoModule;
  }

  try {
    cachedExpoVideoModule = require("expo-video") as ExpoVideoModule;
  } catch {
    cachedExpoVideoModule = null;
  }

  return cachedExpoVideoModule;
}

function normalizeStoryVideoUrl(url: string) {
  return url.includes("res.cloudinary.com") ? buildCloudinaryPlayableVideoUrl(url) : url;
}

function formatElapsed(createdAt: string, language: Parameters<typeof getCopy>[0]) {
  return formatRelativeTime(createdAt, language, { style: "narrow", fallbackToDateAfterDays: 2 });
}

const styles = createDarkStyles({
  container: {
    backgroundColor: "#000",
    flex: 1,
  },
  media: {
    flex: 1,
    height: "100%",
    width: "100%",
  },
  mediaLayer: {
    flex: 1,
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: "#000",
    flex: 1,
    justifyContent: "center",
  },
  emptyText: {
    color: palette.textSoft,
    fontSize: 15,
  },
  topOverlay: {
    left: 0,
    paddingHorizontal: spacing.md,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 4,
  },
  progressRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: spacing.md,
  },
  progressTrack: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 999,
    flex: 1,
    height: 4,
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: palette.text,
    height: "100%",
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerIdentity: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
    gap: spacing.sm,
  },
  headerAvatar: {
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    width: 36,
  },
  headerName: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "800",
  },
  headerMeta: {
    color: palette.textSoft,
    fontSize: 12,
    fontWeight: "600",
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginLeft: spacing.sm,
  },
  controlButton: {
    alignItems: "center",
    backgroundColor: "rgba(6,9,13,0.48)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    height: 40,
    justifyContent: "center",
    minWidth: 40,
    paddingHorizontal: 12,
  },
  controlCount: {
    color: palette.text,
    fontSize: 12,
    fontWeight: "800",
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: "rgba(6,9,13,0.58)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  tapLayer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    zIndex: 2,
  },
  tapZone: {
    flex: 1,
  },
  layersLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3,
  },
  replyNotice: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(31,91,255,0.9)",
    borderRadius: radii.pill,
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  reactionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  reaction: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  reactionEmoji: {
    fontSize: 30,
  },
  questionBanner: {
    alignItems: "center",
    backgroundColor: "#1f5bff",
    borderRadius: radii.md,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  questionBannerLabel: {
    color: "#ffffff",
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
  },
  replyRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  replyInput: {
    borderColor: "rgba(255,255,255,0.55)",
    borderRadius: radii.pill,
    borderWidth: 1,
    color: "#ffffff",
    flex: 1,
    fontSize: 15,
    minHeight: 46,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  replySend: {
    alignItems: "center",
    backgroundColor: "#1f5bff",
    borderRadius: 23,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  replySendIdle: {
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  voteChip: {
    alignItems: "center",
    backgroundColor: "#1f5bff",
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: 4,
    maxWidth: 120,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  voteChipLabel: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
  },
  bottomOverlay: {
    bottom: 0,
    gap: spacing.sm,
    left: 0,
    paddingHorizontal: spacing.lg,
    position: "absolute",
    right: 0,
    zIndex: 4,
  },
  highlightPill: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#f6f3ee",
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  highlightPillLabel: {
    color: "#151922",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  caption: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24,
  },
  sheetBackdrop: {
    backgroundColor: "rgba(0,0,0,0.52)",
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetTapAway: {
    flex: 1,
  },
  sheet: {
    backgroundColor: "#151922",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "62%",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  sheetHandle: {
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: radii.pill,
    height: 4,
    marginBottom: spacing.md,
    width: 52,
  },
  sheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  sheetTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "900",
  },
  sheetSubtitle: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  sheetClose: {
    alignItems: "center",
    backgroundColor: palette.glass,
    borderRadius: radii.pill,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  viewerList: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  emptyViewerText: {
    color: palette.textSoft,
    fontSize: 14,
    lineHeight: 21,
  },
  viewerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  viewerAvatar: {
    borderRadius: 22,
    height: 44,
    width: 44,
  },
  viewerCopy: {
    flex: 1,
    gap: 2,
  },
  viewerName: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "800",
  },
  viewerMeta: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "600",
  },
});

