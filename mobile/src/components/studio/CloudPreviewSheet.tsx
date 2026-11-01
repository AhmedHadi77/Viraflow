import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CopyStrings } from "../../data/locales/en";
import { useStudioMusic } from "../../services/studioMusic";
import type { MediaStudioData } from "../../types/models";
import { StudioLayersOverlay } from "./StudioLayers";

type ExpoVideoModule = typeof import("expo-video");
let cachedExpoVideo: ExpoVideoModule | null | undefined;
function getExpoVideo() {
  if (cachedExpoVideo !== undefined) {
    return cachedExpoVideo;
  }
  try {
    cachedExpoVideo = require("expo-video") as ExpoVideoModule;
  } catch {
    cachedExpoVideo = null;
  }
  return cachedExpoVideo;
}

export type CloudPreviewState =
  | { status: "working"; message: string }
  | { status: "ready"; kind: "image" | "video"; url: string }
  | { status: "error"; message: string };

/** Shows the finished photo or video exactly as people will see it, made by the media service. */
export function CloudPreviewSheet({
  state,
  studio,
  aspect,
  copy,
  onClose,
  onRetry,
}: {
  state: CloudPreviewState | null;
  studio: MediaStudioData;
  aspect: number;
  copy: CopyStrings;
  onClose: () => void;
  onRetry: () => void;
}) {
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const [time, setTime] = useState(0);
  const visible = Boolean(state);
  const ready = state?.status === "ready";
  useStudioMusic(studio.music, ready);
  const available = window.height - insets.top - insets.bottom - 140;
  const width = Math.min(window.width - 24, available * aspect);
  const height = width / aspect;

  return (
    <Modal animationType="fade" onRequestClose={onClose} statusBarTranslucent transparent visible={visible}>
      <View style={[styles.backdrop, { paddingBottom: insets.bottom + 16, paddingTop: insets.top + 12 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>{copy.edPreviewTitle}</Text>
          <Pressable accessibilityLabel={copy.actionClose} hitSlop={10} onPress={onClose} style={styles.close}>
            <Ionicons color="#ffffff" name="close" size={22} />
          </Pressable>
        </View>
        <View style={[styles.frame, { height, width }]}>
          {state?.status === "ready" ? (
            <>
              {state.kind === "video" ? (
                <PreviewVideo onTime={setTime} url={state.url} />
              ) : (
                <Image resizeMode="contain" source={{ uri: state.url }} style={StyleSheet.absoluteFill} />
              )}
              <StudioLayersOverlay currentTime={state.kind === "video" ? time : undefined} height={height} studio={studio} width={width} />
            </>
          ) : state?.status === "error" ? (
            <View style={styles.center}>
              <Ionicons color="#ff8a9b" name="alert-circle-outline" size={34} />
              <Text style={styles.message}>{state.message}</Text>
              <Pressable onPress={onRetry} style={styles.retry}>
                <Text style={styles.retryLabel}>{copy.edTryAgain}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.center}>
              <ActivityIndicator color="#ffffff" size="large" />
              <Text style={styles.message}>{state?.status === "working" ? state.message : ""}</Text>
              <Text style={styles.sub}>{copy.edPreviewWait}</Text>
            </View>
          )}
        </View>
        <Text style={styles.footnote}>{copy.edPreviewNote}</Text>
      </View>
    </Modal>
  );
}

function PreviewVideo({ url, onTime }: { url: string; onTime: (seconds: number) => void }) {
  const ExpoVideo = getExpoVideo();
  if (!ExpoVideo) {
    return null;
  }
  return <PreviewVideoPlayer ExpoVideo={ExpoVideo} onTime={onTime} url={url} />;
}

function PreviewVideoPlayer({ ExpoVideo, url, onTime }: { ExpoVideo: ExpoVideoModule; url: string; onTime: (seconds: number) => void }) {
  const player = ExpoVideo.useVideoPlayer(url, (instance) => {
    instance.loop = true;
    instance.play();
  });
  useEffect(() => {
    const timer = setInterval(() => {
      try {
        onTime(player.currentTime);
      } catch {
        // Loading.
      }
    }, 200);
    return () => clearInterval(timer);
  }, [onTime, player]);
  return <ExpoVideo.VideoView contentFit="contain" nativeControls={false} player={player} style={StyleSheet.absoluteFill} />;
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.94)",
    flex: 1,
    gap: 12,
  },
  header: {
    alignItems: "center",
    alignSelf: "stretch",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  title: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "800",
  },
  close: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  frame: {
    backgroundColor: "#151922",
    borderRadius: 18,
    overflow: "hidden",
  },
  center: {
    alignItems: "center",
    flex: 1,
    gap: 12,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  message: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  sub: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    textAlign: "center",
  },
  retry: {
    backgroundColor: "#1f5bff",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryLabel: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  footnote: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    paddingHorizontal: 24,
    textAlign: "center",
  },
});
