import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";
import type { MediaStudioData, StudioStickerLayer, StudioTextLayer, StudioTextStyle } from "../../types/models";

/** Text sizes are designed for a 360pt-wide frame and scale with the real frame width. */
export const STUDIO_BASE_WIDTH = 360;
export const TEXT_BASE_SIZE = 28;
export const STICKER_BASE_SIZE = 56;

export const STUDIO_TEXT_COLORS = [
  "#ffffff",
  "#000000",
  "#36e0a1",
  "#ff7a2f",
  "#ffd166",
  "#ff4d67",
  "#7ce7ff",
  "#3b82f6",
  "#a855f7",
  "#f472b6",
  "#22c55e",
  "#94a3b8",
];

export const STUDIO_TEXT_STYLES: StudioTextStyle[] = ["classic", "modern", "neon", "typewriter", "strong"];

const MONO = Platform.select({ android: "monospace", default: "Courier" });
const SERIF = Platform.select({ android: "serif", default: "Georgia" });

export function textStyleFor(style: StudioTextStyle, color: string, fontSize: number): TextStyle {
  switch (style) {
    case "modern":
      return { color, fontSize, fontFamily: SERIF, fontStyle: "italic", fontWeight: "600" };
    case "neon":
      return {
        color: "#ffffff",
        fontSize,
        fontWeight: "800",
        textShadowColor: color === "#ffffff" ? "#36e0a1" : color,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: Math.max(8, fontSize * 0.45),
      };
    case "typewriter":
      return { color, fontSize: fontSize * 0.9, fontFamily: MONO, fontWeight: "600", letterSpacing: 0.5 };
    case "strong":
      return { color, fontSize: fontSize * 1.08, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5 };
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

export function StudioTextView({ layer, frameWidth }: { layer: StudioTextLayer; frameWidth: number }) {
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
      <Text style={[textStyleFor(layer.style, textColor, fontSize), { textAlign: layer.align }]}>{layer.text}</Text>
    </View>
  );
}

export function StudioStickerView({ layer, frameWidth }: { layer: StudioStickerLayer; frameWidth: number }) {
  const unit = frameWidth / STUDIO_BASE_WIDTH;
  if (layer.kind === "emoji") {
    return <Text style={{ fontSize: STICKER_BASE_SIZE * unit * layer.scale }}>{layer.value}</Text>;
  }
  const fontSize = 17 * unit * layer.scale;
  const icon =
    layer.kind === "location" ? "location" : layer.kind === "mention" ? "at" : layer.kind === "hashtag" ? "pricetag" : "time";
  const label = layer.kind === "mention" ? `@${layer.value.replace(/^@/, "")}` : layer.kind === "hashtag" ? `#${layer.value.replace(/^#/, "")}` : layer.value;
  return (
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
      <Ionicons color="#ff7a2f" name={icon} size={fontSize * 1.05} />
      <Text style={[styles.pillLabel, { fontSize }]}>{label.toUpperCase()}</Text>
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

/**
 * Read-only layers for viewers (stories, reels, posts). Each layer measures itself once so it can be
 * centred on its saved position.
 */
export function StudioLayersOverlay({
  studio,
  width,
  height,
}: {
  studio?: MediaStudioData;
  width: number;
  height: number;
}) {
  if (!studio || width <= 0 || height <= 0 || (!studio.texts?.length && !studio.stickers?.length)) {
    return null;
  }
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {(studio.stickers ?? []).map((layer) => (
        <CenteredLayer frameHeight={height} frameWidth={width} key={layer.id} layer={layer}>
          <StudioStickerView frameWidth={width} layer={layer} />
        </CenteredLayer>
      ))}
      {(studio.texts ?? []).map((layer) => (
        <CenteredLayer frameHeight={height} frameWidth={width} key={layer.id} layer={layer}>
          <StudioTextView frameWidth={width} layer={layer} />
        </CenteredLayer>
      ))}
    </View>
  );
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
      <View style={{ alignItems: "center", maxWidth: frameWidth * 0.95, transform: [{ rotate: `${layer.rotation}deg` }] }}>
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
    color: "#0e1720",
    fontWeight: "900",
  },
});
