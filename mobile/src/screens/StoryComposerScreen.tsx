import { Ionicons } from "@expo/vector-icons";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
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
import { darkPalette as palette, radii, spacing, createDarkStyles } from "../theme";
import { StoryMediaType } from "../types/models";

type ExpoVideoModule = typeof import("expo-video");
let cachedExpoVideoModule: ExpoVideoModule | null | undefined;

export function StoryComposerScreen({
  navigation,
  route,
}: {
  navigation: any;
  route: {
    params: {
      mediaUri: string;
      mediaType: StoryMediaType;
      mimeType?: string;
      fileName?: string;
      durationSeconds?: number;
    };
  };
}) {
  const { language, createStory } = useAppState();
  const copy = getCopy(language);
  const rootNavigation = navigation.getParent?.() ?? navigation;
  const insets = useSafeAreaInsets();
  const { mediaUri, mediaType, mimeType, fileName, durationSeconds } = route.params;
  const [caption, setCaption] = useState("");
  const [muted, setMuted] = useState(false);
  const [saveToHighlights, setSaveToHighlights] = useState(false);
  const [highlightLabel, setHighlightLabel] = useState("");
  const [posterUri, setPosterUri] = useState(mediaType === "image" ? mediaUri : "");
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function generatePoster() {
      if (mediaType !== "video") {
        setPosterUri(mediaUri);
        return;
      }

      try {
        const result = await VideoThumbnails.getThumbnailAsync(mediaUri, {
          time: 800,
          quality: 0.7,
        });
        if (!cancelled) {
          setPosterUri(result.uri);
        }
      } catch {
        if (!cancelled) {
          setPosterUri("");
        }
      }
    }

    void generatePoster();

    return () => {
      cancelled = true;
    };
  }, [mediaType, mediaUri]);

  async function handlePublish() {
    setIsPublishing(true);
    try {
      const result = await createStory({
        imageUrl: posterUri || mediaUri,
        videoUrl: mediaType === "video" ? mediaUri : undefined,
        mediaType,
        videoMimeType: mediaType === "video" ? mimeType : undefined,
        videoFileName: mediaType === "video" ? fileName : undefined,
        videoDurationSeconds: mediaType === "video" ? durationSeconds : undefined,
        caption,
        saveToHighlights,
        highlightLabel,
      });

      if (!result.ok) {
        Alert.alert(copy.storyUnavailableTitle, result.message ?? copy.storyUnavailableBody);
        return;
      }

      if (result.story) {
        rootNavigation.navigate("StoryViewer", {
          userId: result.story.userId,
          storyId: result.story.id,
        });
        return;
      }

      Alert.alert(copy.storyPostedTitle, copy.storyPostedBody);
      navigation.popToTop?.();
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.topButton}>
          <Ionicons color={palette.text} name="close" size={22} />
        </Pressable>
        <Text style={styles.topTitle}>{copy.storyPreview}</Text>
        <Pressable
          disabled={isPublishing}
          onPress={() => {
            void handlePublish();
          }}
          style={[styles.topButton, styles.publishButton, isPublishing ? styles.disabledButton : null]}
        >
          <Ionicons color="#05080d" name="arrow-up" size={18} />
        </Pressable>
      </View>

      <View style={styles.previewShell}>
        <View style={styles.previewFrame}>
          <StoryPreviewMedia mediaType={mediaType} muted={muted} posterUri={posterUri} uri={mediaUri} />
          <View style={styles.previewCaptionBlock}>
            <Text style={styles.previewCaptionHandle}>{copy.yourStory}</Text>
            <Text numberOfLines={3} style={styles.previewCaptionText}>
              {caption.trim() || copy.addCaptionBeforePost}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.editorPanel, { paddingBottom: Math.max(insets.bottom, 18) + 24 }]}>
        <Text style={styles.sectionLabel}>{copy.storyTools}</Text>
        <View style={styles.toolRow}>
          {mediaType === "video" ? (
            <ToolChip
              active={muted}
              icon={muted ? "volume-mute-outline" : "volume-high-outline"}
              label={muted ? copy.muted : copy.sound}
              onPress={() => setMuted((current) => !current)}
            />
          ) : null}
        </View>

        <Text style={styles.sectionLabel}>{copy.captionLabel}</Text>
        <TextInput
          multiline
          onChangeText={setCaption}
          placeholder={copy.storyCaptionPlaceholder}
          placeholderTextColor={palette.muted}
          style={styles.captionInput}
          value={caption}
        />

        <Text style={styles.sectionLabel}>{copy.profileHighlight}</Text>
        <View style={styles.toolRow}>
          <ToolChip
            active={!saveToHighlights}
            icon="time-outline"
            label={copy.only24h}
            onPress={() => setSaveToHighlights(false)}
          />
          <ToolChip
            active={saveToHighlights}
            icon="star-outline"
            label={copy.saveHighlight}
            onPress={() => setSaveToHighlights(true)}
          />
        </View>

        {saveToHighlights ? (
          <TextInput
            onChangeText={setHighlightLabel}
            placeholder={copy.highlightTitlePlaceholder}
            placeholderTextColor={palette.muted}
            style={styles.highlightInput}
            value={highlightLabel}
          />
        ) : null}

        <Pressable
          disabled={isPublishing}
          onPress={() => {
            void handlePublish();
          }}
          style={[styles.publishCta, isPublishing ? styles.disabledButton : null]}
        >
          <Text style={styles.publishCtaLabel}>{isPublishing ? copy.commentPosting : copy.postStory}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function StoryPreviewMedia({
  uri,
  posterUri,
  mediaType,
  muted,
}: {
  uri: string;
  posterUri: string;
  mediaType: StoryMediaType;
  muted: boolean;
}) {
  if (mediaType === "video") {
    const expoVideo = getExpoVideoModule();
    if (expoVideo) {
      return <StoryPreviewVideo expoVideo={expoVideo} muted={muted} uri={uri} />;
    }
  }

  return (
    <Image
      resizeMode="cover"
      source={{ uri: mediaType === "image" ? uri : posterUri || uri }}
      style={styles.previewMedia}
    />
  );
}

function StoryPreviewVideo({
  expoVideo,
  uri,
  muted,
}: {
  expoVideo: ExpoVideoModule;
  uri: string;
  muted: boolean;
}) {
  const { VideoView, useVideoPlayer } = expoVideo;
  const player = useVideoPlayer(uri, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = muted;
    videoPlayer.play();
  });

  useEffect(() => {
    try {
      player.loop = true;
      player.muted = muted;
      player.play();
    } catch {
      // ignore preview startup issues
    }

    return () => {
      try {
        player.pause();
      } catch {
        // ignore teardown issues
      }
    };
  }, [muted, player]);

  return (
    <VideoView
      allowsPictureInPicture={false}
      contentFit="cover"
      nativeControls={false}
      player={player}
      style={styles.previewMedia}
    />
  );
}

function ToolChip({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.toolChip, active ? styles.toolChipActive : null]}>
      <Ionicons color={active ? "#05080d" : palette.text} name={icon} size={16} />
      <Text style={[styles.toolChipLabel, active ? styles.toolChipLabelActive : null]}>{label}</Text>
    </Pressable>
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

const styles = createDarkStyles({
  container: {
    backgroundColor: "#020406",
    flex: 1,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
  },
  topButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  publishButton: {
    backgroundColor: palette.text,
    borderColor: palette.text,
  },
  disabledButton: {
    opacity: 0.55,
  },
  topTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "900",
  },
  previewShell: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  previewFrame: {
    backgroundColor: "#000",
    borderRadius: 34,
    height: 540,
    overflow: "hidden",
    position: "relative",
  },
  previewMedia: {
    flex: 1,
    height: "100%",
    width: "100%",
  },
  previewContain: {
    backgroundColor: "#000",
  },
  previewNoirBase: {
    opacity: 0.9,
  },
  previewToneOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  previewToneWarm: {
    backgroundColor: "rgba(255,122,47,0.14)",
  },
  previewToneNoir: {
    backgroundColor: "rgba(8,12,16,0.28)",
  },
  previewCaptionBlock: {
    bottom: spacing.lg,
    left: spacing.lg,
    position: "absolute",
    right: spacing.lg,
  },
  previewCaptionHandle: {
    color: palette.textSoft,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  previewCaptionText: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24,
  },
  editorPanel: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  sectionLabel: {
    color: palette.textSoft,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  toolRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  toolChip: {
    alignItems: "center",
    backgroundColor: "#0b1218",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
  },
  toolChipActive: {
    backgroundColor: palette.text,
    borderColor: palette.text,
  },
  toolChipLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "700",
  },
  toolChipLabelActive: {
    color: "#05080d",
  },
  captionInput: {
    backgroundColor: "#0b1218",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.xl,
    borderWidth: 1,
    color: palette.text,
    fontSize: 15,
    minHeight: 110,
    padding: spacing.lg,
    textAlignVertical: "top",
  },
  highlightInput: {
    backgroundColor: "#0b1218",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.lg,
    borderWidth: 1,
    color: palette.text,
    fontSize: 14,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  publishCta: {
    alignItems: "center",
    backgroundColor: palette.primary,
    borderRadius: radii.pill,
    justifyContent: "center",
    marginTop: spacing.sm,
    paddingVertical: 16,
  },
  publishCtaLabel: {
    color: "#061019",
    fontSize: 16,
    fontWeight: "900",
  },
});
