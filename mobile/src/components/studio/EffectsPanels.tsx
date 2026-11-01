import { Ionicons } from "@expo/vector-icons";
import { ComponentProps } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { CopyStrings } from "../../data/locales/en";
import { STUDIO_PHOTO_EFFECTS } from "../../services/studioRender";
import type { StudioAspect, StudioCanvas, StudioPhotoEffect, StudioVideoEffects } from "../../types/models";

const PHOTO_EFFECT_LABELS: Record<StudioPhotoEffect, keyof CopyStrings> = {
  none: "edFxNone",
  enhance: "edFxEnhance",
  autocolor: "edFxAutoColor",
  warm: "edFxWarm",
  sepia: "edFxSepia",
  cartoon: "edFxCartoon",
  oil: "edFxOil",
  zorro: "edFxZorro",
  aurora: "edFxAurora",
  sonnet: "edFxSonnet",
  pixelate: "edFxPixelate",
};

const PHOTO_EFFECT_ICONS: Record<StudioPhotoEffect, ComponentProps<typeof Ionicons>["name"]> = {
  none: "close-circle-outline",
  enhance: "sparkles-outline",
  autocolor: "color-wand-outline",
  warm: "sunny-outline",
  sepia: "cafe-outline",
  cartoon: "happy-outline",
  oil: "brush-outline",
  zorro: "color-palette-outline",
  aurora: "planet-outline",
  sonnet: "musical-note-outline",
  pixelate: "grid-outline",
};

type VideoEffectId = "reverse" | "boomerang" | "loop" | "fadeIn" | "fadeOut" | "stabilize";

const VIDEO_EFFECTS: Array<{ id: VideoEffectId; icon: ComponentProps<typeof Ionicons>["name"]; labelKey: keyof CopyStrings }> = [
  { id: "reverse", icon: "play-back-outline", labelKey: "edFxReverse" },
  { id: "boomerang", icon: "infinite-outline", labelKey: "edFxBoomerang" },
  { id: "loop", icon: "repeat-outline", labelKey: "edFxLoop" },
  { id: "fadeIn", icon: "log-in-outline", labelKey: "edFxFadeIn" },
  { id: "fadeOut", icon: "log-out-outline", labelKey: "edFxFadeOut" },
  { id: "stabilize", icon: "hand-left-outline", labelKey: "edFxStabilize" },
];

export function PhotoEffectsPanel({
  value,
  copy,
  loading,
  note,
  onChange,
}: {
  value: StudioPhotoEffect;
  copy: CopyStrings;
  loading: boolean;
  note?: string | null;
  onChange: (effect: StudioPhotoEffect) => void;
}) {
  return (
    <View style={styles.block}>
      <ScrollView contentContainerStyle={styles.row} horizontal showsHorizontalScrollIndicator={false}>
        {STUDIO_PHOTO_EFFECTS.map((item) => (
          <Pressable
            accessibilityState={{ selected: value === item }}
            key={item}
            onPress={() => onChange(item)}
            style={[styles.tile, value === item ? styles.tileActive : null]}
          >
            {loading && value === item ? <ActivityIndicator color="#ffffff" size="small" /> : <Ionicons color="#ffffff" name={PHOTO_EFFECT_ICONS[item]} size={22} />}
            <Text numberOfLines={1} style={styles.tileLabel}>
              {copy[PHOTO_EFFECT_LABELS[item]] as string}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text style={styles.note}>{note ?? copy.edFxPhotoNote}</Text>
    </View>
  );
}

export function VideoEffectsPanel({
  effects,
  copy,
  joinedClips,
  onChange,
}: {
  effects: StudioVideoEffects;
  copy: CopyStrings;
  /** Stabilizing isn't available on videos made of several clips. */
  joinedClips: boolean;
  onChange: (effects: StudioVideoEffects) => void;
}) {
  function isOn(id: VideoEffectId) {
    return id === "loop" ? (effects.loop ?? 0) > 0 : Boolean(effects[id]);
  }
  function toggle(id: VideoEffectId) {
    const on = !isOn(id);
    const next: StudioVideoEffects = { ...effects };
    if (id === "loop") {
      next.loop = on ? 1 : undefined;
    } else {
      next[id] = on || undefined;
    }
    // Reverse and boomerang can't be combined.
    if (on && id === "reverse") {
      next.boomerang = undefined;
    }
    if (on && id === "boomerang") {
      next.reverse = undefined;
    }
    onChange(next);
  }
  return (
    <View style={styles.block}>
      <ScrollView contentContainerStyle={styles.row} horizontal showsHorizontalScrollIndicator={false}>
        {VIDEO_EFFECTS.map((item) => {
          const disabled = item.id === "stabilize" && joinedClips;
          return (
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: isOn(item.id), disabled }}
              disabled={disabled}
              key={item.id}
              onPress={() => toggle(item.id)}
              style={[styles.tile, isOn(item.id) && !disabled ? styles.tileActive : null, disabled ? styles.disabled : null]}
            >
              <Ionicons color="#ffffff" name={item.icon} size={22} />
              <Text numberOfLines={1} style={styles.tileLabel}>
                {copy[item.labelKey] as string}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Text style={styles.note}>{effects.boomerang ? copy.edFxBoomerangNote : copy.edFxVideoNote}</Text>
    </View>
  );
}

const ASPECTS: Array<{ id: StudioAspect; labelKey?: keyof CopyStrings; label?: string; icon: ComponentProps<typeof Ionicons>["name"] }> = [
  { id: "original", labelKey: "edCanvasOriginal", icon: "scan-outline" },
  { id: "9:16", label: "9:16", icon: "phone-portrait-outline" },
  { id: "4:5", label: "4:5", icon: "tablet-portrait-outline" },
  { id: "1:1", label: "1:1", icon: "square-outline" },
  { id: "16:9", label: "16:9", icon: "tablet-landscape-outline" },
];

export function CanvasPanel({
  canvas,
  copy,
  needsShape,
  onChange,
}: {
  canvas: StudioCanvas;
  copy: CopyStrings;
  /** Joined clips always use a fixed shape (no "original"). */
  needsShape: boolean;
  onChange: (canvas: StudioCanvas) => void;
}) {
  return (
    <View style={styles.block}>
      <ScrollView contentContainerStyle={styles.row} horizontal showsHorizontalScrollIndicator={false}>
        {ASPECTS.filter((item) => !(needsShape && item.id === "original")).map((item) => (
          <Pressable
            accessibilityState={{ selected: canvas.aspect === item.id }}
            key={item.id}
            onPress={() => onChange({ ...canvas, aspect: item.id })}
            style={[styles.smallTile, canvas.aspect === item.id ? styles.tileActive : null]}
          >
            <Ionicons color="#ffffff" name={item.icon} size={18} />
            <Text style={styles.tileLabel}>{item.labelKey ? (copy[item.labelKey] as string) : item.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.optionsRow}>
        {canvas.aspect !== "original" ? (
          <>
            <Segment active={canvas.fit === "fill"} label={copy.edCanvasFill} onPress={() => onChange({ ...canvas, fit: "fill" })} />
            <Segment active={canvas.fit === "fit"} label={copy.edCanvasFit} onPress={() => onChange({ ...canvas, fit: "fit" })} />
            {canvas.fit === "fit" ? (
              <>
                <View style={styles.divider} />
                <Swatch active={canvas.background === "blur"} label={copy.edCanvasBlur} onPress={() => onChange({ ...canvas, background: "blur" })} tone="blur" />
                <Swatch active={canvas.background === "black"} label={copy.edCanvasBlack} onPress={() => onChange({ ...canvas, background: "black" })} tone="black" />
                <Swatch active={canvas.background === "white"} label={copy.edCanvasWhite} onPress={() => onChange({ ...canvas, background: "white" })} tone="white" />
              </>
            ) : null}
          </>
        ) : null}
        <View style={styles.spacer} />
        <Pressable
          accessibilityLabel={copy.edRotate}
          onPress={() => onChange({ ...canvas, rotate: (((canvas.rotate + 90) % 360) as StudioCanvas["rotate"]) })}
          style={styles.iconButton}
        >
          <Ionicons color="#ffffff" name="refresh-outline" size={18} />
        </Pressable>
        <Pressable
          accessibilityLabel={copy.edMirror}
          accessibilityState={{ checked: canvas.mirror }}
          onPress={() => onChange({ ...canvas, mirror: !canvas.mirror })}
          style={[styles.iconButton, canvas.mirror ? styles.iconButtonOn : null]}
        >
          <Ionicons color="#ffffff" name="swap-horizontal-outline" size={18} />
        </Pressable>
      </View>
    </View>
  );
}

function Segment({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityState={{ selected: active }} onPress={onPress} style={[styles.segment, active ? styles.segmentActive : null]}>
      <Text style={[styles.segmentLabel, active ? styles.segmentLabelActive : null]}>{label}</Text>
    </Pressable>
  );
}

function Swatch({ active, label, tone, onPress }: { active: boolean; label: string; tone: "blur" | "black" | "white"; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.swatch,
        tone === "black" ? styles.swatchBlack : tone === "white" ? styles.swatchWhite : styles.swatchBlur,
        active ? styles.swatchActive : null,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  block: {
    gap: 10,
  },
  row: {
    gap: 8,
  },
  tile: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "transparent",
    borderRadius: 14,
    borderWidth: 2,
    gap: 5,
    height: 70,
    justifyContent: "center",
    width: 76,
  },
  smallTile: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "transparent",
    borderRadius: 12,
    borderWidth: 2,
    gap: 3,
    height: 54,
    justifyContent: "center",
    width: 66,
  },
  tileActive: {
    backgroundColor: "rgba(31,91,255,0.35)",
    borderColor: "#1f5bff",
  },
  disabled: {
    opacity: 0.35,
  },
  tileLabel: {
    color: "#ffffff",
    fontSize: 11.5,
    fontWeight: "700",
  },
  note: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
  },
  optionsRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  segment: {
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  segmentActive: {
    backgroundColor: "#ffffff",
    borderColor: "#ffffff",
  },
  segmentLabel: {
    color: "#ffffff",
    fontSize: 12.5,
    fontWeight: "700",
  },
  segmentLabelActive: {
    color: "#000000",
  },
  divider: {
    backgroundColor: "rgba(255,255,255,0.2)",
    height: 22,
    width: 1,
  },
  swatch: {
    borderColor: "rgba(255,255,255,0.5)",
    borderRadius: 13,
    borderWidth: 2,
    height: 26,
    width: 26,
  },
  swatchBlur: {
    backgroundColor: "#7c8aa5",
  },
  swatchBlack: {
    backgroundColor: "#000000",
  },
  swatchWhite: {
    backgroundColor: "#ffffff",
  },
  swatchActive: {
    borderColor: "#1f5bff",
    borderWidth: 3,
  },
  spacer: {
    flex: 1,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  iconButtonOn: {
    backgroundColor: "#1f5bff",
  },
});
