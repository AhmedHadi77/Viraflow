import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";
import type {
  MediaStudioData,
  StudioCaption,
  StudioCaptionStyle,
  StudioStickerAnimation,
  StudioStickerLayer,
  StudioStroke,
  StudioTextAnimation,
  StudioTextLayer,
  StudioTextStyle,
} from "../../types/models";

/** Text sizes are designed for a 360pt-wide frame and scale with the real frame width. */
export const STUDIO_BASE_WIDTH = 360;
export const TEXT_BASE_SIZE = 28;
export const STICKER_BASE_SIZE = 56;

export const STUDIO_TEXT_COLORS = [
  "#ffffff",
  "#000000",
  "#1f5bff",
  "#e5294f",
  "#ffd166",
  "#ff4d67",
  "#7ce7ff",
  "#3b82f6",
  "#a855f7",
  "#f472b6",
  "#22c55e",
  "#f97316",
  "#94a3b8",
];

export const STUDIO_TEXT_STYLES: StudioTextStyle[] = ["classic", "modern", "neon", "typewriter", "strong", "headline", "script", "elegant"];
export const STUDIO_TEXT_ANIMATIONS: StudioTextAnimation[] = [
  "none",
  "fade",
  "pop",
  "slide",
  "zoom",
  "drop",
  "spin",
  "typewriter",
  "bounce",
  "pulse",
  "float",
  "swing",
  "shake",
  "flicker",
  "heartbeat",
];
export const STUDIO_STICKER_ANIMATIONS: StudioStickerAnimation[] = ["none", "pop", "pulse", "bounce", "float", "swing", "wiggle", "heartbeat", "rotate"];

const MONO = Platform.select({ android: "monospace", default: "Courier" });
const SERIF = Platform.select({ android: "serif", default: "Georgia" });

/** Bundled display fonts (loaded in App.tsx). If they are not loaded, the system font is used. */
export const STUDIO_FONTS = {
  headline: "BebasNeue_400Regular",
  script: "Pacifico_400Regular",
  elegant: "PlayfairDisplay_700Bold_Italic",
};

export function textStyleFor(style: StudioTextStyle, color: string, fontSize: number): TextStyle {
  switch (style) {
    case "modern":
      return { color, fontSize, fontFamily: SERIF, fontStyle: "italic", fontWeight: "600" };
    case "neon":
      return {
        color: "#ffffff",
        fontSize,
        fontWeight: "800",
        textShadowColor: color === "#ffffff" ? "#1f5bff" : color,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: Math.max(8, fontSize * 0.45),
      };
    case "typewriter":
      return { color, fontSize: fontSize * 0.9, fontFamily: MONO, fontWeight: "600", letterSpacing: 0.5 };
    case "strong":
      return { color, fontSize: fontSize * 1.08, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5 };
    case "headline":
      return {
        color,
        fontSize: fontSize * 1.25,
        fontFamily: STUDIO_FONTS.headline,
        letterSpacing: 1,
        textTransform: "uppercase",
        textShadowColor: "rgba(0,0,0,0.3)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
      };
    case "script":
      return {
        color,
        fontSize: fontSize * 0.95,
        fontFamily: STUDIO_FONTS.script,
        textShadowColor: "rgba(0,0,0,0.3)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
      };
    case "elegant":
      return { color, fontSize: fontSize * 1.05, fontFamily: STUDIO_FONTS.elegant };
    case "classic":
    default:
      return {
        color,
        fontSize,
        fontWeight: "800",
        textShadowColor: "rgba(0,0,0,0.35)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
      };
  }
}

/** Readable text colour on top of a coloured text background. */
function contrastOn(color: string) {
  const hex = color.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#000000" : "#ffffff";
}

export function StudioTextView({ layer, frameWidth, visibleText }: { layer: StudioTextLayer; frameWidth: number; visibleText?: string }) {
  const unit = frameWidth / STUDIO_BASE_WIDTH;
  const fontSize = TEXT_BASE_SIZE * unit * layer.scale;
  const hasBackground = layer.background !== "none";
  const textColor = hasBackground && layer.background === "solid" ? contrastOn(layer.color) : layer.color;
  const boxStyle: ViewStyle | null = hasBackground
    ? {
        backgroundColor: layer.background === "solid" ? layer.color : "rgba(0,0,0,0.55)",
        borderRadius: fontSize * 0.3,
        paddingHorizontal: fontSize * 0.35,
        paddingVertical: fontSize * 0.12,
      }
    : null;
  return (
    <View style={boxStyle}>
      <Text style={[textStyleFor(layer.style, textColor, fontSize), { textAlign: layer.align }]}>{visibleText ?? layer.text}</Text>
    </View>
  );
}

type Motion = StudioTextAnimation | StudioStickerAnimation;

/** Animations that play once when the layer appears. */
const ENTRANCE_MOTIONS = new Set<Motion>(["fade", "pop", "slide", "zoom", "drop", "spin", "typewriter"]);
/** Animations that keep going while the layer is on screen. */
const LOOP_MOTIONS = new Set<Motion>(["bounce", "pulse", "float", "shake", "swing", "flicker", "heartbeat", "wiggle", "rotate"]);

function entranceTiming(kind: Motion) {
  switch (kind) {
    case "pop":
      return { duration: 420, easing: Easing.out(Easing.back(2.2)) };
    case "drop":
      return { duration: 900, easing: Easing.bounce };
    case "spin":
      return { duration: 650, easing: Easing.out(Easing.back(1.4)) };
    case "zoom":
      return { duration: 520, easing: Easing.out(Easing.cubic) };
    default:
      return { duration: 600, easing: Easing.out(Easing.cubic) };
  }
}

function loopAnimation(kind: Motion, value: Animated.Value): Animated.CompositeAnimation {
  const ease = Easing.inOut(Easing.quad);
  const there = (duration: number) => Animated.timing(value, { duration, easing: ease, toValue: 1, useNativeDriver: true });
  const back = (duration: number) => Animated.timing(value, { duration, easing: ease, toValue: 0, useNativeDriver: true });
  const run = (duration: number, pause = 0) =>
    Animated.sequence([
      Animated.timing(value, { duration, easing: Easing.linear, toValue: 1, useNativeDriver: true }),
      ...(pause ? [Animated.delay(pause)] : []),
      Animated.timing(value, { duration: 0, toValue: 0, useNativeDriver: true }),
    ]);
  switch (kind) {
    case "bounce":
      return Animated.loop(Animated.sequence([there(380), back(380)]));
    case "pulse":
      return Animated.loop(Animated.sequence([there(700), back(700)]));
    case "float":
      return Animated.loop(Animated.sequence([there(1500), back(1500)]));
    case "swing":
      return Animated.loop(Animated.sequence([there(900), back(900)]));
    case "shake":
      return Animated.loop(run(520, 1100));
    case "wiggle":
      return Animated.loop(run(620, 900));
    case "flicker":
      return Animated.loop(run(2400));
    case "heartbeat":
      return Animated.loop(run(1100, 300));
    case "rotate":
    default:
      return Animated.loop(Animated.timing(value, { duration: 3200, easing: Easing.linear, toValue: 1, useNativeDriver: true }));
  }
}

/**
 * The movement of a text or sticker layer: an entrance (fade, pop, slide, zoom, drop, spin) that plays
 * when it appears, or a loop (bounce, pulse, float, shake, swing, flicker, heartbeat, wiggle, rotate).
 * Everything runs on the native animation driver, so it stays smooth while videos play.
 */
export function useStudioMotion(motion: Motion | undefined, unit: number, playKey?: number) {
  const kind: Motion = motion ?? "none";
  const progress = useRef(new Animated.Value(ENTRANCE_MOTIONS.has(kind) ? 0 : 1)).current;
  const loop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let entrance: Animated.CompositeAnimation | null = null;
    let looping: Animated.CompositeAnimation | null = null;
    if (ENTRANCE_MOTIONS.has(kind) && kind !== "typewriter") {
      progress.setValue(0);
      entrance = Animated.timing(progress, { ...entranceTiming(kind), toValue: 1, useNativeDriver: true });
      entrance.start();
    } else {
      progress.setValue(1);
    }
    if (LOOP_MOTIONS.has(kind)) {
      loop.setValue(0);
      looping = loopAnimation(kind, loop);
      looping.start();
    }
    return () => {
      entrance?.stop();
      looping?.stop();
    };
  }, [kind, loop, playKey, progress]);

  return useMemo(() => {
    const transform: Animated.WithAnimatedArray<any> = [];
    let opacity: Animated.AnimatedInterpolation<number> | Animated.Value | number = 1;
    switch (kind) {
      case "fade":
        opacity = progress;
        break;
      case "pop":
        opacity = progress.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] });
        transform.push({ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) });
        break;
      case "slide":
        opacity = progress;
        transform.push({ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [40 * unit, 0] }) });
        break;
      case "zoom":
        opacity = progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] });
        transform.push({ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1.9, 1] }) });
        break;
      case "drop":
        opacity = progress.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 1] });
        transform.push({ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-90 * unit, 0] }) });
        break;
      case "spin":
        opacity = progress.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] });
        transform.push({ rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ["-200deg", "0deg"] }) });
        transform.push({ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) });
        break;
      case "bounce":
        transform.push({ translateY: loop.interpolate({ inputRange: [0, 1], outputRange: [0, -10 * unit] }) });
        break;
      case "pulse":
        transform.push({ scale: loop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) });
        break;
      case "float":
        transform.push({ translateY: loop.interpolate({ inputRange: [0, 1], outputRange: [3 * unit, -5 * unit] }) });
        break;
      case "swing":
        transform.push({ rotate: loop.interpolate({ inputRange: [0, 1], outputRange: ["-8deg", "8deg"] }) });
        break;
      case "shake":
        transform.push({
          translateX: loop.interpolate({ inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1], outputRange: [0, -7 * unit, 7 * unit, -5 * unit, 4 * unit, 0] }),
        });
        break;
      case "wiggle":
        transform.push({ rotate: loop.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: ["0deg", "-12deg", "10deg", "-6deg", "0deg"] }) });
        break;
      case "flicker":
        opacity = loop.interpolate({
          inputRange: [0, 0.08, 0.1, 0.16, 0.18, 0.6, 0.62, 0.66, 1],
          outputRange: [1, 1, 0.25, 1, 0.45, 1, 0.3, 1, 1],
        });
        break;
      case "heartbeat":
        transform.push({ scale: loop.interpolate({ inputRange: [0, 0.14, 0.28, 0.42, 0.56, 1], outputRange: [1, 1.14, 1, 1.09, 1, 1] }) });
        break;
      case "rotate":
        transform.push({ rotate: loop.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) });
        break;
      default:
        break;
    }
    return { opacity, transform };
  }, [kind, loop, progress, unit]);
}

/** A text layer that plays its animation when it appears (and keeps looping for loop animations). */
export function AnimatedStudioText({ layer, frameWidth, playKey }: { layer: StudioTextLayer; frameWidth: number; playKey?: number }) {
  const animation = layer.animation ?? "none";
  const unit = frameWidth / STUDIO_BASE_WIDTH;
  const motionStyle = useStudioMotion(animation, unit, playKey);
  const [typedCount, setTypedCount] = useState(animation === "typewriter" ? 0 : layer.text.length);

  useEffect(() => {
    if (animation !== "typewriter") {
      setTypedCount(layer.text.length);
      return;
    }
    setTypedCount(0);
    const total = layer.text.length;
    const step = Math.max(28, Math.min(90, 1400 / Math.max(1, total)));
    const timer = setInterval(() => {
      setTypedCount((current) => {
        if (current >= total) {
          clearInterval(timer);
          return current;
        }
        return current + 1;
      });
    }, step);
    return () => clearInterval(timer);
  }, [animation, layer.text, playKey]);

  return (
    <Animated.View style={motionStyle}>
      <StudioTextView frameWidth={frameWidth} layer={layer} visibleText={animation === "typewriter" ? layer.text.slice(0, typedCount) : undefined} />
    </Animated.View>
  );
}

/** A sticker that moves (pulse, bounce, float, swing, wiggle, rotate…) when the creator chose an animation. */
export function AnimatedSticker({ animation, frameWidth, playKey, children }: { animation?: StudioStickerAnimation; frameWidth: number; playKey?: number; children: React.ReactNode }) {
  const motionStyle = useStudioMotion(animation, frameWidth / STUDIO_BASE_WIDTH, playKey);
  if (!animation || animation === "none") {
    return <>{children}</>;
  }
  return <Animated.View style={motionStyle}>{children}</Animated.View>;
}

function stickerIcon(kind: StudioStickerLayer["kind"]): React.ComponentProps<typeof Ionicons>["name"] {
  switch (kind) {
    case "location":
      return "location";
    case "mention":
      return "at";
    case "hashtag":
      return "pricetag";
    case "link":
      return "link";
    case "countdown":
      return "timer-outline";
    case "question":
      return "help-circle-outline";
    default:
      return "time";
  }
}

export interface PollState {
  /** Votes for each answer. */
  counts: number[];
  /** The viewer's own answer, if they voted. */
  myVote?: number;
  /** Show results (after voting, or to the author). */
  showResults: boolean;
  onVote?: (option: number) => void;
}

function formatCountdown(targetAt: string | undefined, labels?: CountdownLabels) {
  const target = targetAt ? new Date(targetAt).getTime() : NaN;
  if (!Number.isFinite(target)) {
    return "";
  }
  const remaining = Math.max(0, target - Date.now());
  if (remaining <= 0) {
    return labels?.done ?? "Now";
  }
  const minutes = Math.floor(remaining / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  const d = labels?.d ?? "d";
  const h = labels?.h ?? "h";
  const m = labels?.m ?? "m";
  return days > 0 ? `${days}${d} ${hours}${h} ${mins}${m}` : hours > 0 ? `${hours}${h} ${mins}${m}` : `${mins}${m}`;
}

export interface CountdownLabels {
  d: string;
  h: string;
  m: string;
  done: string;
}

export function StudioStickerView({
  layer,
  frameWidth,
  poll,
  countdownLabels,
  onLinkPress,
  onQuestionPress,
  questionPlaceholder,
}: {
  layer: StudioStickerLayer;
  frameWidth: number;
  poll?: PollState;
  countdownLabels?: CountdownLabels;
  onLinkPress?: (url: string) => void;
  onQuestionPress?: (layer: StudioStickerLayer) => void;
  questionPlaceholder?: string;
}) {
  const unit = frameWidth / STUDIO_BASE_WIDTH;
  const [, setTick] = useState(0);
  useEffect(() => {
    if (layer.kind !== "countdown") {
      return;
    }
    const timer = setInterval(() => setTick((value) => value + 1), 30000);
    return () => clearInterval(timer);
  }, [layer.kind]);

  if (layer.kind === "emoji") {
    return <Text style={{ fontSize: STICKER_BASE_SIZE * unit * layer.scale }}>{layer.value}</Text>;
  }
  const fontSize = 17 * unit * layer.scale;

  if (layer.kind === "poll") {
    const options = (layer.options ?? []).slice(0, 2);
    const counts = poll?.counts ?? [0, 0];
    const total = counts.reduce((sum, value) => sum + value, 0);
    return (
      <View style={[styles.poll, { borderRadius: fontSize * 0.9, padding: fontSize * 0.7, width: 250 * unit * layer.scale, gap: fontSize * 0.5 }]}>
        <Text style={[styles.pollQuestion, { fontSize: fontSize * 1.05 }]}>{layer.value}</Text>
        <View style={{ flexDirection: "row", gap: fontSize * 0.4 }}>
          {options.map((option, index) => {
            const share = total > 0 ? Math.round(((counts[index] ?? 0) / total) * 100) : 0;
            const chosen = poll?.myVote === index;
            return (
              <Pressable
                accessibilityLabel={option}
                accessibilityRole="button"
                disabled={!poll?.onVote || poll.myVote !== undefined}
                key={`${option}-${index}`}
                onPress={() => poll?.onVote?.(index)}
                style={[styles.pollOption, { borderRadius: fontSize * 0.6, paddingVertical: fontSize * 0.55 }, chosen ? styles.pollOptionChosen : null]}
              >
                {poll?.showResults ? (
                  <View pointerEvents="none" style={[styles.pollBar, { width: `${share}%` }, chosen ? styles.pollBarChosen : null]} />
                ) : null}
                <Text numberOfLines={1} style={[styles.pollOptionLabel, { fontSize }, chosen ? styles.pollOptionLabelChosen : null]}>
                  {option}
                </Text>
                {poll?.showResults ? <Text style={[styles.pollShare, { fontSize: fontSize * 0.8 }]}>{share}%</Text> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  if (layer.kind === "question") {
    const box = (
      <View style={[styles.question, { borderRadius: fontSize * 0.9, width: 240 * unit * layer.scale }]}>
        <View style={[styles.questionHead, { paddingHorizontal: fontSize * 0.8, paddingVertical: fontSize * 0.6 }]}>
          <Text style={[styles.questionTitle, { fontSize: fontSize * 1.02 }]}>{layer.value}</Text>
        </View>
        <View style={{ padding: fontSize * 0.55 }}>
          <View style={[styles.questionInput, { borderRadius: fontSize * 0.55, paddingVertical: fontSize * 0.55 }]}>
            <Text style={[styles.questionPlaceholder, { fontSize: fontSize * 0.85 }]}>{questionPlaceholder ?? "…"}</Text>
          </View>
        </View>
      </View>
    );
    return onQuestionPress ? (
      <Pressable accessibilityLabel={layer.value} accessibilityRole="button" onPress={() => onQuestionPress(layer)}>
        {box}
      </Pressable>
    ) : (
      box
    );
  }

  if (layer.kind === "countdown") {
    return (
      <View style={[styles.countdown, { borderRadius: fontSize * 0.8, paddingHorizontal: fontSize * 0.9, paddingVertical: fontSize * 0.6 }]}>
        <Text numberOfLines={1} style={[styles.countdownTitle, { fontSize: fontSize * 0.85 }]}>
          {layer.value.toUpperCase()}
        </Text>
        <Text style={[styles.countdownTime, { fontSize: fontSize * 1.6 }]}>{formatCountdown(layer.targetAt, countdownLabels)}</Text>
      </View>
    );
  }

  const icon = stickerIcon(layer.kind);
  const label =
    layer.kind === "mention" ? `@${layer.value.replace(/^@/, "")}` : layer.kind === "hashtag" ? `#${layer.value.replace(/^#/, "")}` : layer.value;
  const pill = (
    <View
      style={[
        styles.pill,
        {
          borderRadius: fontSize * 0.7,
          gap: fontSize * 0.3,
          paddingHorizontal: fontSize * 0.7,
          paddingVertical: fontSize * 0.42,
        },
      ]}
    >
      <Ionicons color={layer.kind === "link" ? "#1f5bff" : "#e5294f"} name={icon} size={fontSize * 1.05} />
      <Text numberOfLines={1} style={[styles.pillLabel, { fontSize }, layer.kind === "link" ? styles.pillLabelLink : null]}>
        {layer.kind === "link" ? label : label.toUpperCase()}
      </Text>
    </View>
  );
  if (layer.kind === "link" && layer.url && onLinkPress) {
    return (
      <Pressable accessibilityRole="link" onPress={() => onLinkPress(layer.url!)}>
        {pill}
      </Pressable>
    );
  }
  return pill;
}

/** Freehand drawings: each stroke is drawn as rounded segments between its points. */
export function StudioDrawingView({ strokes, width, height }: { strokes?: StudioStroke[]; width: number; height: number }) {
  const segments = useMemo(() => {
    const items: Array<{ key: string; left: number; top: number; length: number; thickness: number; angle: number; color: string; glow?: boolean }> = [];
    (strokes ?? []).forEach((stroke) => {
      const thickness = Math.max(1.5, stroke.width * width);
      const points = stroke.points;
      if (points.length < 2) {
        return;
      }
      if (points.length === 2) {
        items.push({ key: `${stroke.id}-dot`, left: points[0] * width, top: points[1] * height, length: 0, thickness, angle: 0, color: stroke.color, glow: stroke.glow });
        return;
      }
      for (let index = 2; index < points.length; index += 2) {
        const x1 = points[index - 2] * width;
        const y1 = points[index - 1] * height;
        const x2 = points[index] * width;
        const y2 = points[index + 1] * height;
        const length = Math.hypot(x2 - x1, y2 - y1);
        items.push({
          key: `${stroke.id}-${index}`,
          left: (x1 + x2) / 2,
          top: (y1 + y2) / 2,
          length,
          thickness,
          angle: (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI,
          color: stroke.color,
          glow: stroke.glow,
        });
      }
    });
    return items;
  }, [height, strokes, width]);

  if (segments.length === 0) {
    return null;
  }
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {segments.map((segment) => (
        <View
          key={segment.key}
          style={{
            backgroundColor: segment.glow ? "#ffffff" : segment.color,
            borderRadius: segment.thickness / 2,
            height: segment.thickness,
            left: segment.left - (segment.length + segment.thickness) / 2,
            position: "absolute",
            shadowColor: segment.color,
            shadowOpacity: segment.glow ? 1 : 0,
            shadowRadius: segment.glow ? segment.thickness : 0,
            top: segment.top - segment.thickness / 2,
            transform: [{ rotate: `${segment.angle}deg` }],
            width: segment.length + segment.thickness,
          }}
        />
      ))}
    </View>
  );
}

export function captionAt(captions: StudioCaption[] | undefined, time: number | undefined) {
  if (!captions?.length || time === undefined) {
    return null;
  }
  return captions.find((caption) => time >= caption.start && time < caption.end) ?? null;
}

/** One subtitle line near the bottom of the frame. */
export function StudioCaptionView({ text, style, frameWidth, bottom }: { text: string; style?: StudioCaptionStyle; frameWidth: number; bottom: number }) {
  const unit = frameWidth / STUDIO_BASE_WIDTH;
  const fontSize = 17 * unit;
  const variant = style ?? "clean";
  return (
    <View pointerEvents="none" style={[styles.captionWrap, { bottom }]}>
      <Text
        style={[
          styles.captionText,
          { fontSize, lineHeight: fontSize * 1.3 },
          variant === "box" ? [styles.captionBox, { borderRadius: fontSize * 0.35, paddingHorizontal: fontSize * 0.45, paddingVertical: fontSize * 0.15 }] : null,
          variant === "bold" ? [styles.captionBold, { fontSize: fontSize * 1.15 }] : null,
          variant === "highlight" ? [styles.captionHighlight, { borderRadius: fontSize * 0.25, paddingHorizontal: fontSize * 0.4, paddingVertical: fontSize * 0.1 }] : null,
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

/** Positions a layer by its centre point (0..1 of the frame), with its scale and rotation. */
export function layerTransformStyle(
  layer: { x: number; y: number; rotation: number },
  frameWidth: number,
  frameHeight: number,
  size: { width: number; height: number }
): ViewStyle {
  return {
    left: layer.x * frameWidth - size.width / 2,
    position: "absolute",
    top: layer.y * frameHeight - size.height / 2,
    transform: [{ rotate: `${layer.rotation}deg` }],
  };
}

export function isTextVisibleAt(layer: StudioTextLayer, time: number | undefined) {
  if (time === undefined) {
    return true;
  }
  const start = layer.startSeconds ?? 0;
  const end = layer.endSeconds ?? Number.POSITIVE_INFINITY;
  return time >= start && time < end;
}

export function hasTimedStudioContent(studio?: MediaStudioData) {
  return Boolean(
    studio && ((studio.captions?.length ?? 0) > 0 || (studio.texts ?? []).some((layer) => layer.startSeconds !== undefined || layer.endSeconds !== undefined))
  );
}

/**
 * Read-only layers for viewers (stories, reels, posts): drawings, stickers, text (with animations and
 * timing) and captions. Pass `currentTime` (seconds of the finished video) for videos so timed text and
 * captions show at the right moment. Poll and link stickers become tappable when handlers are given.
 */
export function StudioLayersOverlay({
  studio,
  width,
  height,
  currentTime,
  poll,
  onLinkPress,
  onQuestionPress,
  questionPlaceholder,
  countdownLabels,
  captionBottom,
}: {
  studio?: MediaStudioData;
  width: number;
  height: number;
  currentTime?: number;
  poll?: PollState;
  onLinkPress?: (url: string) => void;
  onQuestionPress?: (layer: StudioStickerLayer) => void;
  questionPlaceholder?: string;
  countdownLabels?: CountdownLabels;
  /** Distance of captions from the bottom (to clear on-screen controls). */
  captionBottom?: number;
}) {
  const loopKey = useLoopKey(currentTime);
  if (
    !studio ||
    width <= 0 ||
    height <= 0 ||
    (!studio.texts?.length && !studio.stickers?.length && !studio.drawings?.length && !studio.captions?.length)
  ) {
    return null;
  }
  const interactive = Boolean(poll?.onVote || onLinkPress || onQuestionPress);
  const caption = captionAt(studio.captions, currentTime);
  return (
    <View pointerEvents={interactive ? "box-none" : "none"} style={StyleSheet.absoluteFill}>
      <StudioDrawingView height={height} strokes={studio.drawings} width={width} />
      {(studio.stickers ?? []).map((layer) => (
        <CenteredLayer frameHeight={height} frameWidth={width} key={layer.id} layer={layer}>
          <AnimatedSticker animation={layer.animation} frameWidth={width}>
            <StudioStickerView
              countdownLabels={countdownLabels}
              frameWidth={width}
              layer={layer}
              onLinkPress={onLinkPress}
              onQuestionPress={onQuestionPress}
              poll={layer.kind === "poll" ? poll : undefined}
              questionPlaceholder={questionPlaceholder}
            />
          </AnimatedSticker>
        </CenteredLayer>
      ))}
      {(studio.texts ?? []).map((layer) =>
        isTextVisibleAt(layer, currentTime) ? (
          <CenteredLayer frameHeight={height} frameWidth={width} key={layer.id} layer={layer}>
            <AnimatedStudioText frameWidth={width} layer={layer} playKey={layer.startSeconds !== undefined ? loopKey : 0} />
          </CenteredLayer>
        ) : null
      )}
      {caption ? <StudioCaptionView bottom={captionBottom ?? height * 0.12} frameWidth={width} style={studio.captionStyle} text={caption.text} /> : null}
    </View>
  );
}

/** Changes when a looping video restarts, so timed text replays its animation each loop. */
function useLoopKey(currentTime: number | undefined) {
  const last = useRef(0);
  const key = useRef(0);
  if (currentTime !== undefined) {
    if (currentTime + 0.5 < last.current) {
      key.current += 1;
    }
    last.current = currentTime;
  }
  return key.current;
}

function CenteredLayer({
  layer,
  frameWidth,
  frameHeight,
  children,
}: {
  layer: { x: number; y: number; rotation: number };
  frameWidth: number;
  frameHeight: number;
  children: React.ReactNode;
}) {
  // Centre on the saved point: a zero-height, extra-wide row whose content is centred both ways, so
  // the layer overflows evenly around the point and no measuring pass is needed.
  const boxWidth = frameWidth * 1.6;
  return (
    <View
      pointerEvents="box-none"
      style={{
        alignItems: "center",
        height: 0,
        justifyContent: "center",
        left: layer.x * frameWidth - boxWidth / 2,
        overflow: "visible",
        position: "absolute",
        top: layer.y * frameHeight,
        width: boxWidth,
      }}
    >
      <View pointerEvents="box-none" style={{ alignItems: "center", maxWidth: frameWidth * 0.95, transform: [{ rotate: `${layer.rotation}deg` }] }}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  pillLabel: {
    color: "#151922",
    fontWeight: "900",
  },
  pillLabelLink: {
    color: "#1f5bff",
    fontWeight: "800",
    textDecorationLine: "underline",
  },
  poll: {
    backgroundColor: "#ffffff",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  pollQuestion: {
    color: "#0d1117",
    fontWeight: "800",
    textAlign: "center",
  },
  pollOption: {
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    flex: 1,
    justifyContent: "center",
    overflow: "hidden",
  },
  pollOptionChosen: {
    backgroundColor: "#e8efff",
  },
  pollBar: {
    backgroundColor: "rgba(31,91,255,0.18)",
    bottom: 0,
    left: 0,
    position: "absolute",
    top: 0,
  },
  pollBarChosen: {
    backgroundColor: "rgba(31,91,255,0.32)",
  },
  pollOptionLabel: {
    color: "#0d1117",
    fontWeight: "800",
  },
  pollOptionLabelChosen: {
    color: "#1446d6",
  },
  pollShare: {
    color: "#3b4250",
    fontWeight: "700",
  },
  question: {
    backgroundColor: "#ffffff",
    elevation: 4,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  questionHead: {
    backgroundColor: "#1f5bff",
  },
  questionTitle: {
    color: "#ffffff",
    fontWeight: "800",
    textAlign: "center",
  },
  questionInput: {
    alignItems: "center",
    backgroundColor: "#f3f4f6",
  },
  questionPlaceholder: {
    color: "#5b6270",
    fontWeight: "600",
  },
  countdown: {
    alignItems: "center",
    backgroundColor: "rgba(13,17,23,0.82)",
    gap: 2,
  },
  countdownTitle: {
    color: "#c8ccd4",
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  countdownTime: {
    color: "#ffffff",
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  captionWrap: {
    alignItems: "center",
    left: "8%",
    position: "absolute",
    right: "8%",
  },
  captionText: {
    color: "#ffffff",
    fontWeight: "700",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  captionBox: {
    backgroundColor: "rgba(0,0,0,0.62)",
    overflow: "hidden",
    textShadowRadius: 0,
  },
  captionBold: {
    fontWeight: "900",
    textTransform: "uppercase",
  },
  captionHighlight: {
    backgroundColor: "#ffd166",
    color: "#0d1117",
    overflow: "hidden",
    textShadowRadius: 0,
  },
});
