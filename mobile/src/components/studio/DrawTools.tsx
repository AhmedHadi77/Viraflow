import { Ionicons } from "@expo/vector-icons";
import { useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { CopyStrings } from "../../data/locales/en";
import type { StudioStroke } from "../../types/models";
import { STUDIO_TEXT_COLORS, StudioDrawingView } from "./StudioLayers";

export interface Brush {
  color: string;
  /** Share of the frame width. */
  width: number;
  glow: boolean;
}

export const BRUSH_SIZES = [0.008, 0.016, 0.03];

/** Draws with a finger over the frame. Each finished stroke is handed back as 0..1 points. */
export function DrawCapture({
  width,
  height,
  brush,
  strokes,
  onStroke,
}: {
  width: number;
  height: number;
  brush: Brush;
  strokes: StudioStroke[];
  onStroke: (stroke: StudioStroke) => void;
}) {
  const [live, setLive] = useState<number[] | null>(null);
  const points = useRef<number[]>([]);
  const latest = useRef({ width, height, brush, onStroke });
  latest.current = { width, height, brush, onStroke };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => {
          const { width: w, height: h } = latest.current;
          const x = event.nativeEvent.locationX / Math.max(1, w);
          const y = event.nativeEvent.locationY / Math.max(1, h);
          points.current = [x, y];
          setLive([x, y]);
        },
        onPanResponderMove: (event) => {
          const { width: w, height: h } = latest.current;
          const x = Math.min(1, Math.max(0, event.nativeEvent.locationX / Math.max(1, w)));
          const y = Math.min(1, Math.max(0, event.nativeEvent.locationY / Math.max(1, h)));
          const list = points.current;
          const lastX = list[list.length - 2];
          const lastY = list[list.length - 1];
          // Skip tiny moves so strokes stay light.
          if (Math.hypot((x - lastX) * w, (y - lastY) * h) < 3) {
            return;
          }
          list.push(x, y);
          setLive([...list]);
        },
        onPanResponderRelease: () => {
          const { brush: current, onStroke: done } = latest.current;
          const list = points.current;
          points.current = [];
          setLive(null);
          if (list.length >= 2) {
            done({
              id: `stroke-${Date.now()}`,
              color: current.color,
              width: current.width,
              points: list.map((value) => Math.round(value * 1000) / 1000),
              ...(current.glow ? { glow: true } : {}),
            });
          }
        },
        onPanResponderTerminate: () => {
          points.current = [];
          setLive(null);
        },
      }),
    []
  );

  const liveStroke: StudioStroke[] = live ? [{ id: "live", color: brush.color, width: brush.width, points: live, glow: brush.glow }] : [];
  return (
    <View {...responder.panHandlers} style={StyleSheet.absoluteFill}>
      <StudioDrawingView height={height} strokes={[...strokes, ...liveStroke]} width={width} />
    </View>
  );
}

export function DrawPanel({
  brush,
  copy,
  canUndo,
  onBrush,
  onUndoStroke,
  onClear,
}: {
  brush: Brush;
  copy: CopyStrings;
  canUndo: boolean;
  onBrush: (brush: Brush) => void;
  onUndoStroke: () => void;
  onClear: () => void;
}) {
  return (
    <View style={styles.block}>
      <ScrollView contentContainerStyle={styles.row} horizontal showsHorizontalScrollIndicator={false}>
        {STUDIO_TEXT_COLORS.map((color) => (
          <Pressable
            accessibilityLabel={color}
            key={color}
            onPress={() => onBrush({ ...brush, color })}
            style={[styles.color, { backgroundColor: color }, brush.color === color ? styles.colorActive : null]}
          />
        ))}
      </ScrollView>
      <View style={styles.row}>
        {BRUSH_SIZES.map((size, index) => (
          <Pressable
            accessibilityLabel={`${copy.edBrush} ${index + 1}`}
            key={size}
            onPress={() => onBrush({ ...brush, width: size })}
            style={[styles.sizeButton, brush.width === size ? styles.sizeButtonActive : null]}
          >
            <View style={{ backgroundColor: "#ffffff", borderRadius: 10, height: 4 + index * 5, width: 4 + index * 5 }} />
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: brush.glow }}
          onPress={() => onBrush({ ...brush, glow: !brush.glow })}
          style={[styles.chip, brush.glow ? styles.chipActive : null]}
        >
          <Ionicons color="#ffffff" name="flash-outline" size={15} />
          <Text style={styles.chipLabel}>{copy.edNeonBrush}</Text>
        </Pressable>
        <View style={styles.spacer} />
        <Pressable accessibilityLabel={copy.edUndo} disabled={!canUndo} onPress={onUndoStroke} style={[styles.iconButton, !canUndo ? styles.disabled : null]}>
          <Ionicons color="#ffffff" name="arrow-undo-outline" size={18} />
        </Pressable>
        <Pressable accessibilityLabel={copy.edClearDrawing} disabled={!canUndo} onPress={onClear} style={[styles.iconButton, !canUndo ? styles.disabled : null]}>
          <Ionicons color="#ff8a9b" name="trash-outline" size={18} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: 12,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  color: {
    borderColor: "rgba(255,255,255,0.85)",
    borderRadius: 14,
    borderWidth: 2,
    height: 28,
    width: 28,
  },
  colorActive: {
    borderColor: "#1f5bff",
    borderWidth: 3,
    transform: [{ scale: 1.15 }],
  },
  sizeButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderColor: "transparent",
    borderRadius: 18,
    borderWidth: 2,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  sizeButtonActive: {
    borderColor: "#1f5bff",
  },
  chip: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: "#1f5bff",
    borderColor: "#1f5bff",
  },
  chipLabel: {
    color: "#ffffff",
    fontSize: 12.5,
    fontWeight: "800",
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
  disabled: {
    opacity: 0.35,
  },
});
