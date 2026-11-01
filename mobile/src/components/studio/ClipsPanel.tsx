import { Ionicons } from "@expo/vector-icons";
import { ComponentProps } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { CopyStrings } from "../../data/locales/en";
import { STUDIO_TRANSITIONS } from "../../services/studioRender";
import type { StudioClip, StudioTransition } from "../../types/models";
import { StudioSlider } from "./StudioSlider";
import { clipSeconds } from "./studioPlan";

export const TRANSITION_LABEL_KEYS: Record<StudioTransition, keyof CopyStrings> = {
  none: "edTrNone",
  fade: "edTrFade",
  fadefast: "edTrFadeFast",
  fadeslow: "edTrFadeSlow",
  fadeblack: "edTrFadeBlack",
  fadewhite: "edTrFadeWhite",
  fadegrays: "edTrFadeGray",
  dissolve: "edTrDissolve",
  distance: "edTrMorph",
  hblur: "edTrBlur",
  wipeleft: "edTrWipe",
  wiperight: "edTrWipeRight",
  wipeup: "edTrWipeUp",
  wipedown: "edTrWipeDown",
  slideleft: "edTrSlide",
  slideright: "edTrSlideRight",
  slideup: "edTrSlideUp",
  slidedown: "edTrSlideDown",
  smoothleft: "edTrSmoothLeft",
  smoothright: "edTrSmoothRight",
  smoothup: "edTrSmoothUp",
  smoothdown: "edTrSmoothDown",
  circleopen: "edTrCircle",
  circleclose: "edTrCircleClose",
  circlecrop: "edTrCircleCrop",
  rectcrop: "edTrBox",
  vertopen: "edTrDoors",
  horzopen: "edTrBlinds",
  diagtl: "edTrDiagonal",
  diagbr: "edTrDiagonal2",
  hlslice: "edTrSlices",
  vuslice: "edTrSlicesUp",
  squeezeh: "edTrSqueeze",
  squeezev: "edTrSqueezeUp",
  zoomin: "edTrZoom",
  radial: "edTrRadial",
  pixelize: "edTrPixel",
};

const TRANSITION_ICONS: Record<StudioTransition, ComponentProps<typeof Ionicons>["name"]> = {
  none: "remove-outline",
  fade: "contrast-outline",
  fadefast: "flash-outline",
  fadeslow: "hourglass-outline",
  fadeblack: "moon-outline",
  fadewhite: "sunny-outline",
  fadegrays: "cloudy-outline",
  dissolve: "water-outline",
  distance: "git-merge-outline",
  hblur: "eye-off-outline",
  wipeleft: "arrow-back-outline",
  wiperight: "arrow-forward-outline",
  wipeup: "arrow-up-outline",
  wipedown: "arrow-down-outline",
  slideleft: "play-back-outline",
  slideright: "play-forward-outline",
  slideup: "chevron-up-outline",
  slidedown: "chevron-down-outline",
  smoothleft: "caret-back-outline",
  smoothright: "caret-forward-outline",
  smoothup: "caret-up-outline",
  smoothdown: "caret-down-outline",
  circleopen: "radio-button-on-outline",
  circleclose: "radio-button-off-outline",
  circlecrop: "ellipse-outline",
  rectcrop: "square-outline",
  vertopen: "pause-outline",
  horzopen: "reorder-two-outline",
  diagtl: "resize-outline",
  diagbr: "expand-outline",
  hlslice: "menu-outline",
  vuslice: "barcode-outline",
  squeezeh: "contract-outline",
  squeezev: "chevron-collapse-outline",
  zoomin: "scan-outline",
  radial: "aperture-outline",
  pixelize: "grid-outline",
};

export function formatClock(seconds: number) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const rest = Math.floor(safe % 60);
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

/** The row of clips under the preview (CapCut style): tap to select, + to add more, tap between to pick a transition. */
export function ClipStrip({
  clips,
  selectedId,
  activeIndex,
  copy,
  onSelect,
  onAdd,
  onPickTransition,
  canAdd,
}: {
  clips: StudioClip[];
  selectedId: string | null;
  activeIndex: number;
  copy: CopyStrings;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onPickTransition: (clipId: string) => void;
  canAdd: boolean;
}) {
  return (
    <ScrollView contentContainerStyle={styles.strip} horizontal showsHorizontalScrollIndicator={false}>
      {clips.map((clip, index) => {
        const selected = clip.id === selectedId;
        const width = Math.round(Math.min(120, Math.max(56, clipSeconds(clip) * 9)));
        return (
          <View key={clip.id} style={styles.stripItem}>
            {index > 0 ? (
              <Pressable
                accessibilityLabel={`${copy.edTransition}: ${copy[TRANSITION_LABEL_KEYS[clip.transition ?? "none"]] as string}`}
                hitSlop={6}
                onPress={() => onPickTransition(clip.id)}
                style={[styles.transitionDot, clip.transition && clip.transition !== "none" ? styles.transitionDotActive : null]}
              >
                <Ionicons color={clip.transition && clip.transition !== "none" ? "#ffffff" : "#c8ccd4"} name={TRANSITION_ICONS[clip.transition ?? "none"]} size={12} />
              </Pressable>
            ) : null}
            <Pressable
              accessibilityLabel={`${clip.type === "video" ? copy.edClipVideo : copy.edClipPhoto} ${index + 1}`}
              accessibilityState={{ selected }}
              onPress={() => onSelect(clip.id)}
              style={[styles.thumbWrap, { width }, selected ? styles.thumbSelected : null, index === activeIndex ? styles.thumbPlaying : null]}
            >
              {clip.type === "image" || clip.posterUri ? (
                <Image source={{ uri: clip.type === "image" ? clip.uri : clip.posterUri }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbVideo]}>
                  <Ionicons color="rgba(255,255,255,0.7)" name="film-outline" size={18} />
                </View>
              )}
              <View style={styles.thumbBadge}>
                <Ionicons color="#ffffff" name={clip.type === "video" ? "videocam" : "image"} size={10} />
                <Text style={styles.thumbTime}>{formatClock(clipSeconds(clip))}</Text>
              </View>
            </Pressable>
          </View>
        );
      })}
      {canAdd ? (
        <Pressable accessibilityLabel={copy.edAddClip} onPress={onAdd} style={styles.addTile}>
          <Ionicons color="#0d1117" name="add" size={24} />
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

/** Actions for the selected clip: split, duplicate, move, delete, photo length and motion. */
export function ClipActions({
  clip,
  index,
  count,
  copy,
  canSplit,
  onSplit,
  onDuplicate,
  onMove,
  onDelete,
  onTrim,
  onPhotoSeconds,
  onMotion,
}: {
  clip: StudioClip;
  index: number;
  count: number;
  copy: CopyStrings;
  canSplit: boolean;
  onSplit: () => void;
  onDuplicate: () => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
  onTrim: () => void;
  onPhotoSeconds: (seconds: number) => void;
  onMotion: (motion: boolean) => void;
}) {
  const actions: Array<{ id: string; icon: ComponentProps<typeof Ionicons>["name"]; label: string; onPress: () => void; disabled?: boolean }> = [
    ...(clip.type === "video"
      ? [
          { id: "trim", icon: "cut-outline" as const, label: copy.edTrim, onPress: onTrim },
          { id: "split", icon: "git-compare-outline" as const, label: copy.edSplit, onPress: onSplit, disabled: !canSplit },
        ]
      : []),
    { id: "duplicate", icon: "copy-outline", label: copy.edDuplicate, onPress: onDuplicate, disabled: count >= 10 },
    { id: "left", icon: "arrow-back", label: copy.edMoveLeft, onPress: () => onMove(-1), disabled: index === 0 },
    { id: "right", icon: "arrow-forward", label: copy.edMoveRight, onPress: () => onMove(1), disabled: index >= count - 1 },
    { id: "delete", icon: "trash-outline", label: copy.delete, onPress: onDelete, disabled: count <= 1 },
  ];
  return (
    <View style={styles.actionsBlock}>
      <ScrollView contentContainerStyle={styles.actionsRow} horizontal showsHorizontalScrollIndicator={false}>
        {actions.map((action) => (
          <Pressable
            accessibilityLabel={action.label}
            accessibilityState={{ disabled: action.disabled }}
            disabled={action.disabled}
            key={action.id}
            onPress={action.onPress}
            style={[styles.action, action.disabled ? styles.actionDisabled : null]}
          >
            <Ionicons color={action.id === "delete" ? "#ff8a9b" : "#ffffff"} name={action.icon} size={20} />
            <Text style={styles.actionLabel}>{action.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {clip.type === "image" ? (
        <View style={styles.photoRow}>
          <View style={styles.photoSlider}>
            <StudioSlider
              formatValue={(value) => `${Math.round(value)}s`}
              label={copy.edPhotoLength}
              max={10}
              min={1}
              onChange={(value) => onPhotoSeconds(Math.round(value))}
              value={clip.imageSeconds ?? 3}
            />
          </View>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: clip.motion !== false }}
            onPress={() => onMotion(clip.motion === false)}
            style={[styles.motionChip, clip.motion !== false ? styles.motionChipOn : null]}
          >
            <Ionicons color={clip.motion !== false ? "#ffffff" : "#c8ccd4"} name="expand-outline" size={16} />
            <Text style={styles.motionLabel}>{copy.edMotion}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

/** Picks how one clip changes into the next. */
export function TransitionPicker({
  value,
  copy,
  onChange,
  onApplyAll,
}: {
  value: StudioTransition;
  copy: CopyStrings;
  onChange: (transition: StudioTransition) => void;
  onApplyAll: () => void;
}) {
  return (
    <View style={styles.actionsBlock}>
      <ScrollView contentContainerStyle={styles.actionsRow} horizontal showsHorizontalScrollIndicator={false}>
        {STUDIO_TRANSITIONS.map((item) => (
          <Pressable
            accessibilityLabel={copy[TRANSITION_LABEL_KEYS[item]] as string}
            accessibilityState={{ selected: value === item }}
            key={item}
            onPress={() => onChange(item)}
            style={[styles.transitionChip, value === item ? styles.transitionChipActive : null]}
          >
            <Ionicons color="#ffffff" name={TRANSITION_ICONS[item]} size={20} />
            <Text style={styles.actionLabel}>{copy[TRANSITION_LABEL_KEYS[item]] as string}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Pressable onPress={onApplyAll} style={styles.applyAll}>
        <Ionicons color="#7aa2ff" name="checkmark-done-outline" size={16} />
        <Text style={styles.applyAllLabel}>{copy.edApplyAll}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
  },
  stripItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  transitionDot: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 9,
    height: 18,
    justifyContent: "center",
    width: 18,
  },
  transitionDotActive: {
    backgroundColor: "#1f5bff",
  },
  thumbWrap: {
    borderColor: "transparent",
    borderRadius: 10,
    borderWidth: 2,
    height: 52,
    overflow: "hidden",
  },
  thumbSelected: {
    borderColor: "#ffffff",
  },
  thumbPlaying: {
    opacity: 1,
  },
  thumb: {
    height: "100%",
    width: "100%",
  },
  thumbVideo: {
    alignItems: "center",
    backgroundColor: "#262c38",
    justifyContent: "center",
  },
  thumbBadge: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 6,
    bottom: 3,
    flexDirection: "row",
    gap: 2,
    left: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
    position: "absolute",
  },
  thumbTime: {
    color: "#ffffff",
    fontSize: 9.5,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
  },
  addTile: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    height: 52,
    justifyContent: "center",
    marginLeft: 6,
    width: 44,
  },
  actionsBlock: {
    gap: 10,
  },
  actionsRow: {
    gap: 6,
  },
  action: {
    alignItems: "center",
    borderRadius: 14,
    gap: 4,
    minWidth: 64,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  actionDisabled: {
    opacity: 0.35,
  },
  actionLabel: {
    color: "#ffffff",
    fontSize: 11.5,
    fontWeight: "700",
  },
  photoRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  photoSlider: {
    flex: 1,
  },
  motionChip: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  motionChipOn: {
    backgroundColor: "#1f5bff",
    borderColor: "#1f5bff",
  },
  motionLabel: {
    color: "#ffffff",
    fontSize: 12.5,
    fontWeight: "800",
  },
  transitionChip: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "transparent",
    borderRadius: 14,
    borderWidth: 2,
    gap: 4,
    minWidth: 70,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  transitionChipActive: {
    borderColor: "#1f5bff",
  },
  applyAll: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 6,
    paddingVertical: 4,
  },
  applyAllLabel: {
    color: "#7aa2ff",
    fontSize: 13,
    fontWeight: "800",
  },
});
