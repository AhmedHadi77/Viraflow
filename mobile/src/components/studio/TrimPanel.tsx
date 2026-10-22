import * as VideoThumbnails from "expo-video-thumbnails";
import { useEffect, useMemo, useRef, useState } from "react";
import { Image, LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from "react-native";

const FRAME_COUNT = 8;
const MIN_GAP_SECONDS = 1;

const frameCache = new Map<string, string[]>();

function formatClock(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

/** Video frames strip with two handles to choose where the clip starts and ends. */
export function TrimPanel({
  uri,
  durationSeconds,
  startRatio,
  endRatio,
  onChange,
  label,
}: {
  uri: string;
  durationSeconds: number;
  startRatio: number;
  endRatio: number;
  onChange: (start: number, end: number) => void;
  label: string;
}) {
  const [frames, setFrames] = useState<string[]>(frameCache.get(uri) ?? []);
  const [width, setWidth] = useState(0);
  const dragRef = useRef({ start: startRatio, end: endRatio });
  dragRef.current = { start: startRatio, end: endRatio };
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const minGap = durationSeconds > 0 ? Math.min(0.5, MIN_GAP_SECONDS / durationSeconds) : 0.05;

  useEffect(() => {
    if (frameCache.has(uri) || durationSeconds <= 0) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const results: string[] = [];
      for (let index = 0; index < FRAME_COUNT; index += 1) {
        try {
          const time = Math.round(((index + 0.5) / FRAME_COUNT) * durationSeconds * 1000);
          const frame = await VideoThumbnails.getThumbnailAsync(uri, { time, quality: 0.35 });
          results.push(frame.uri);
        } catch {
          results.push("");
        }
        if (cancelled) {
          return;
        }
      }
      frameCache.set(uri, results);
      setFrames(results);
    })();
    return () => {
      cancelled = true;
    };
  }, [durationSeconds, uri]);

  const makeResponder = (handle: "start" | "end") =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        origin.current = handle === "start" ? dragRef.current.start : dragRef.current.end;
      },
      onPanResponderMove: (_, gesture) => {
        if (width <= 0) {
          return;
        }
        const next = origin.current + gesture.dx / width;
        if (handle === "start") {
          onChangeRef.current(Math.min(Math.max(0, next), dragRef.current.end - minGap), dragRef.current.end);
        } else {
          onChangeRef.current(dragRef.current.start, Math.max(Math.min(1, next), dragRef.current.start + minGap));
        }
      },
    });
  const origin = useRef(0);
  const startResponder = useMemo(() => makeResponder("start"), [width, minGap]);
  const endResponder = useMemo(() => makeResponder("end"), [width, minGap]);

  const startSeconds = startRatio * durationSeconds;
  const endSeconds = endRatio * durationSeconds;

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {formatClock(startSeconds)} – {formatClock(endSeconds)} · {Math.max(0, endSeconds - startSeconds).toFixed(1)}s
        </Text>
      </View>
      <View onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)} style={styles.strip}>
        <View style={styles.frames}>
          {Array.from({ length: FRAME_COUNT }).map((_, index) =>
            frames[index] ? (
              <Image key={index} source={{ uri: frames[index] }} style={styles.frame} />
            ) : (
              <View key={index} style={[styles.frame, styles.framePlaceholder]} />
            )
          )}
        </View>
        <View pointerEvents="none" style={[styles.shade, { left: 0, width: startRatio * width }]} />
        <View pointerEvents="none" style={[styles.shade, { right: 0, width: (1 - endRatio) * width }]} />
        <View
          pointerEvents="none"
          style={[styles.window, { left: startRatio * width, width: Math.max(0, (endRatio - startRatio) * width) }]}
        />
        <View {...startResponder.panHandlers} hitSlop={{ left: 16, right: 16, top: 10, bottom: 10 }} style={[styles.handle, { left: startRatio * width - 8 }]}>
          <View style={styles.grip} />
        </View>
        <View {...endResponder.panHandlers} hitSlop={{ left: 16, right: 16, top: 10, bottom: 10 }} style={[styles.handle, { left: endRatio * width - 8 }]}>
          <View style={styles.grip} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  value: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    fontWeight: "700",
  },
  strip: {
    height: 56,
    justifyContent: "center",
  },
  frames: {
    borderRadius: 10,
    flexDirection: "row",
    height: 56,
    overflow: "hidden",
  },
  frame: {
    flex: 1,
    height: 56,
  },
  framePlaceholder: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(0,0,0,0.3)",
    borderRightWidth: 1,
  },
  shade: {
    backgroundColor: "rgba(0,0,0,0.6)",
    height: 56,
    position: "absolute",
    top: 0,
  },
  window: {
    borderColor: "#1f5bff",
    borderRadius: 8,
    borderWidth: 3,
    height: 56,
    position: "absolute",
    top: 0,
  },
  handle: {
    alignItems: "center",
    backgroundColor: "#1f5bff",
    borderRadius: 6,
    height: 64,
    justifyContent: "center",
    position: "absolute",
    top: -4,
    width: 16,
  },
  grip: {
    backgroundColor: "#ffffff",
    borderRadius: 2,
    height: 22,
    width: 3,
  },
});
