import { useEffect, useRef, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import type { StudioCanvas, StudioClip } from "../../types/models";
import { clipSeconds } from "./studioPlan";

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

export interface TimelineTime {
  clipIndex: number;
  /** Seconds into the clip's trimmed part (media time). */
  localSeconds: number;
  /** Seconds into the finished video (after speed). */
  globalSeconds: number;
}

export interface SeekRequest {
  clipIndex: number;
  /** Seconds into the clip's trimmed part. */
  offsetSeconds: number;
  token: number;
}

/** Seconds before a clip starts in the finished video (media time, before speed). */
export function clipStartSeconds(clips: StudioClip[], index: number) {
  let total = 0;
  for (let position = 0; position < index && position < clips.length; position += 1) {
    total += clipSeconds(clips[position]);
    if (position + 1 < clips.length && clips[position + 1].transition && clips[position + 1].transition !== "none") {
      total -= 1;
    }
  }
  return Math.max(0, total);
}

/** Which clip plays at a time of the finished video, and how far into it. */
export function locateTime(clips: StudioClip[], globalSeconds: number, speed: number) {
  const media = globalSeconds * (speed || 1);
  for (let index = clips.length - 1; index >= 0; index -= 1) {
    const start = clipStartSeconds(clips, index);
    if (media >= start) {
      return { clipIndex: index, offsetSeconds: Math.min(clipSeconds(clips[index]), media - start) };
    }
  }
  return { clipIndex: 0, offsetSeconds: 0 };
}

/**
 * The editor's preview: plays the clips one after another (trimmed, at the chosen speed and volume),
 * framed like the finished video (shape, fill or fit with a background, turn and mirror).
 */
export function TimelinePlayer({
  clips,
  speed,
  volume,
  paused,
  canvas,
  frameWidth,
  frameHeight,
  seek,
  loopClipIndex,
  onTime,
  onLoop,
  onClipDuration,
}: {
  clips: StudioClip[];
  speed: number;
  volume: number;
  paused: boolean;
  canvas: StudioCanvas;
  frameWidth: number;
  frameHeight: number;
  seek?: SeekRequest | null;
  /** Repeat only this clip (while trimming it). */
  loopClipIndex?: number | null;
  onTime?: (time: TimelineTime) => void;
  /** The whole video started again from the beginning. */
  onLoop?: () => void;
  /** A clip's real length, once the player knows it (picked files don't always say). */
  onClipDuration?: (clipId: string, seconds: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const [startOffset, setStartOffset] = useState({ seconds: 0, token: 0 });
  const safeIndex = Math.min(index, Math.max(0, clips.length - 1));
  const clip = clips[safeIndex];
  const latest = useRef({ clips, speed, loopClipIndex, onTime, onLoop, index: safeIndex });
  latest.current = { clips, speed, loopClipIndex, onTime, onLoop, index: safeIndex };

  useEffect(() => {
    if (!seek) {
      return;
    }
    setIndex(Math.min(Math.max(0, seek.clipIndex), Math.max(0, clips.length - 1)));
    setStartOffset({ seconds: seek.offsetSeconds, token: seek.token });
    // Only react to a new seek request.
  }, [seek?.token]);

  useEffect(() => {
    if (typeof loopClipIndex === "number" && loopClipIndex >= 0 && loopClipIndex < clips.length) {
      setIndex(loopClipIndex);
      setStartOffset((current) => ({ seconds: 0, token: current.token + 1 }));
    }
  }, [loopClipIndex, clips.length]);

  // A clip that repeats on its own (the only clip, or the one being trimmed) restarts in place.
  const repeatsItself = clips.length === 1 || (typeof loopClipIndex === "number" && loopClipIndex === safeIndex);

  function handleRepeated() {
    const { clips: list, loopClipIndex: loopIndex } = latest.current;
    if (list.length === 1 && !(typeof loopIndex === "number" && loopIndex >= 0)) {
      latest.current.onLoop?.();
    }
  }

  function handleEnded() {
    const { clips: list, index: current } = latest.current;
    if (current + 1 < list.length) {
      setIndex(current + 1);
      setStartOffset((value) => ({ seconds: 0, token: value.token + 1 }));
      return;
    }
    setIndex(0);
    setStartOffset((value) => ({ seconds: 0, token: value.token + 1 }));
    latest.current.onLoop?.();
  }

  function handleLocalTime(localSeconds: number) {
    const { clips: list, speed: rate, index: current } = latest.current;
    latest.current.onTime?.({
      clipIndex: current,
      localSeconds,
      globalSeconds: (clipStartSeconds(list, current) + localSeconds) / (rate || 1),
    });
  }

  if (!clip) {
    return <View style={[StyleSheet.absoluteFill, styles.empty]} />;
  }

  return (
    <CanvasFrame canvas={canvas} frameHeight={frameHeight} frameWidth={frameWidth} posterUri={clip.type === "image" ? clip.uri : clip.posterUri}>
      {(fit) =>
        clip.type === "video" ? (
          <ClipVideo
            clip={clip}
            contentFit={fit}
            key={`${clip.id}-${safeIndex}-${startOffset.token}`}
            onDuration={(seconds) => onClipDuration?.(clip.id, seconds)}
            onEnded={handleEnded}
            onRepeated={handleRepeated}
            onTime={handleLocalTime}
            paused={paused}
            repeat={repeatsItself}
            speed={speed}
            startSeconds={startOffset.seconds}
            volume={volume}
          />
        ) : (
          <ClipPhoto
            clip={clip}
            contentFit={fit}
            key={`${clip.id}-${safeIndex}-${startOffset.token}`}
            onEnded={handleEnded}
            onRepeated={handleRepeated}
            onTime={handleLocalTime}
            paused={paused}
            repeat={repeatsItself}
            speed={speed}
            startSeconds={startOffset.seconds}
          />
        )
      }
    </CanvasFrame>
  );
}

/**
 * Frames media like the finished result: fill (cover) or fit (contain) with a blurred, black or white
 * background, turned in 90° steps and mirrored.
 */
export function CanvasFrame({
  canvas,
  frameWidth,
  frameHeight,
  posterUri,
  children,
}: {
  canvas: StudioCanvas;
  frameWidth: number;
  frameHeight: number;
  posterUri?: string;
  children: (contentFit: "cover" | "contain") => React.ReactNode;
}) {
  const fit = canvas.aspect !== "original" && canvas.fit === "fit";
  const sideways = canvas.rotate === 90 || canvas.rotate === 270;
  const boxWidth = sideways ? frameHeight : frameWidth;
  const boxHeight = sideways ? frameWidth : frameHeight;
  return (
    <View style={[StyleSheet.absoluteFill, styles.frame, fit && canvas.background === "white" ? styles.white : null]}>
      {fit && canvas.background === "blur" && posterUri ? (
        <Image blurRadius={28} resizeMode="cover" source={{ uri: posterUri }} style={StyleSheet.absoluteFill} />
      ) : null}
      <View
        style={{
          height: boxHeight,
          left: (frameWidth - boxWidth) / 2,
          position: "absolute",
          top: (frameHeight - boxHeight) / 2,
          transform: [{ rotate: `${canvas.rotate}deg` }, { scaleX: canvas.mirror ? -1 : 1 }],
          width: boxWidth,
        }}
      >
        {children(fit ? "contain" : "cover")}
      </View>
    </View>
  );
}

function ClipPhoto({
  clip,
  contentFit,
  speed,
  paused,
  startSeconds,
  repeat,
  onEnded,
  onRepeated,
  onTime,
}: {
  clip: StudioClip;
  contentFit: "cover" | "contain";
  speed: number;
  paused: boolean;
  startSeconds: number;
  repeat: boolean;
  onEnded: () => void;
  onRepeated: () => void;
  onTime: (seconds: number) => void;
}) {
  const elapsed = useRef(startSeconds);
  const callbacks = useRef({ onEnded, onTime, onRepeated, repeat });
  callbacks.current = { onEnded, onTime, onRepeated, repeat };
  const length = clipSeconds(clip);

  useEffect(() => {
    if (paused) {
      return;
    }
    let last = Date.now();
    let ended = false;
    const timer = setInterval(() => {
      const now = Date.now();
      elapsed.current += ((now - last) / 1000) * (speed || 1);
      last = now;
      callbacks.current.onTime(Math.min(length, elapsed.current));
      if (!ended && elapsed.current >= length) {
        if (callbacks.current.repeat) {
          elapsed.current = 0;
          callbacks.current.onRepeated();
          return;
        }
        ended = true;
        callbacks.current.onEnded();
      }
    }, 100);
    return () => clearInterval(timer);
  }, [length, paused, speed]);

  return <Image resizeMode={contentFit} source={{ uri: clip.uri }} style={StyleSheet.absoluteFill} />;
}

function ClipVideo(props: {
  clip: StudioClip;
  contentFit: "cover" | "contain";
  speed: number;
  volume: number;
  paused: boolean;
  startSeconds: number;
  repeat: boolean;
  onEnded: () => void;
  onRepeated: () => void;
  onTime: (seconds: number) => void;
  onDuration?: (seconds: number) => void;
}) {
  const ExpoVideo = getExpoVideo();
  if (!ExpoVideo) {
    return <ClipPhoto {...props} clip={{ ...props.clip, uri: props.clip.posterUri ?? props.clip.uri, imageSeconds: clipSeconds(props.clip) }} />;
  }
  return <ClipVideoPlayer ExpoVideo={ExpoVideo} {...props} />;
}

function ClipVideoPlayer({
  ExpoVideo,
  clip,
  contentFit,
  speed,
  volume,
  paused,
  startSeconds,
  repeat,
  onEnded,
  onRepeated,
  onTime,
  onDuration,
}: {
  ExpoVideo: ExpoVideoModule;
  clip: StudioClip;
  contentFit: "cover" | "contain";
  speed: number;
  volume: number;
  paused: boolean;
  startSeconds: number;
  repeat: boolean;
  onEnded: () => void;
  onRepeated: () => void;
  onTime: (seconds: number) => void;
  onDuration?: (seconds: number) => void;
}) {
  const player = ExpoVideo.useVideoPlayer(clip.uri, (instance) => {
    instance.loop = false;
  });
  const callbacks = useRef({ onEnded, onTime, onRepeated, repeat, paused, onDuration });
  callbacks.current = { onEnded, onTime, onRepeated, repeat, paused, onDuration };
  const reportedDuration = useRef(false);
  const trim = useRef({ start: clip.trimStartRatio ?? 0, end: clip.trimEndRatio ?? 1, known: clip.durationSeconds ?? 0 });
  trim.current = { start: clip.trimStartRatio ?? 0, end: clip.trimEndRatio ?? 1, known: clip.durationSeconds ?? 0 };
  const started = useRef(false);

  useEffect(() => {
    try {
      player.playbackRate = speed;
      player.volume = volume;
      player.muted = volume <= 0.001;
    } catch {
      // Not ready yet.
    }
  }, [player, speed, volume]);

  useEffect(() => {
    try {
      if (paused) {
        player.pause();
      } else {
        player.play();
      }
    } catch {
      // Not ready yet.
    }
  }, [paused, player]);

  useEffect(() => {
    let ended = false;
    const timer = setInterval(() => {
      try {
        const duration = player.duration || trim.current.known;
        if (!duration || duration <= 0) {
          return;
        }
        if (!reportedDuration.current && player.duration > 0 && Math.abs(player.duration - trim.current.known) > 0.4) {
          reportedDuration.current = true;
          callbacks.current.onDuration?.(player.duration);
        }
        const start = trim.current.start * duration;
        const end = trim.current.end * duration;
        if (!started.current) {
          started.current = true;
          player.currentTime = Math.min(end - 0.05, start + startSeconds);
          return;
        }
        const now = player.currentTime;
        if (now < start - 0.25) {
          player.currentTime = start;
          return;
        }
        callbacks.current.onTime(Math.max(0, now - start));
        // The end of the trimmed part, or the file itself stopping a little before its stated length.
        const stoppedAtEnd = !player.playing && !callbacks.current.paused && now >= end - 0.4 && now > start + 0.2;
        if (!ended && (now >= end - 0.06 || stoppedAtEnd)) {
          if (callbacks.current.repeat) {
            player.currentTime = start;
            if (!callbacks.current.paused) {
              player.play();
            }
            callbacks.current.onRepeated();
            return;
          }
          ended = true;
          callbacks.current.onEnded();
        }
      } catch {
        // Loading.
      }
    }, 100);
    return () => clearInterval(timer);
  }, [player, startSeconds]);

  return <ExpoVideo.VideoView contentFit={contentFit} nativeControls={false} player={player} style={StyleSheet.absoluteFill} />;
}

const styles = StyleSheet.create({
  empty: {
    backgroundColor: "#151922",
  },
  frame: {
    backgroundColor: "#000000",
    overflow: "hidden",
  },
  white: {
    backgroundColor: "#ffffff",
  },
});
