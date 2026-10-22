import { useMemo, useRef, useState } from "react";
import { LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from "react-native";

/** A draggable slider (React Native has no built-in one). Works horizontally or vertically. */
export function StudioSlider({
  value,
  min,
  max,
  onChange,
  onRelease,
  vertical = false,
  label,
  formatValue,
  accent = "#1f5bff",
  length,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  onRelease?: (value: number) => void;
  vertical?: boolean;
  label?: string;
  formatValue?: (value: number) => string;
  accent?: string;
  length?: number;
}) {
  const [trackLength, setTrackLength] = useState(length ?? 0);
  const startRef = useRef(0);
  const valueRef = useRef(value);
  valueRef.current = value;
  // Keep the latest callbacks without rebuilding the gesture handler mid-drag.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onReleaseRef = useRef(onRelease);
  onReleaseRef.current = onRelease;
  const ratio = max > min ? (Math.min(max, Math.max(min, value)) - min) / (max - min) : 0;

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => {
          if (trackLength <= 0) {
            return;
          }
          const offset = vertical ? trackLength - event.nativeEvent.locationY : event.nativeEvent.locationX;
          startRef.current = Math.min(trackLength, Math.max(0, offset));
          onChangeRef.current(min + (startRef.current / trackLength) * (max - min));
        },
        onPanResponderMove: (_, gesture) => {
          if (trackLength <= 0) {
            return;
          }
          const position = Math.min(trackLength, Math.max(0, startRef.current + (vertical ? -gesture.dy : gesture.dx)));
          onChangeRef.current(min + (position / trackLength) * (max - min));
        },
        onPanResponderRelease: () => onReleaseRef.current?.(valueRef.current),
        onPanResponderTerminate: () => onReleaseRef.current?.(valueRef.current),
      }),
    [max, min, trackLength, vertical]
  );

  const onLayout = (event: LayoutChangeEvent) => {
    const size = vertical ? event.nativeEvent.layout.height : event.nativeEvent.layout.width;
    if (Math.abs(size - trackLength) > 1) {
      setTrackLength(size);
    }
  };

  return (
    <View style={vertical ? styles.verticalWrap : styles.horizontalWrap}>
      {label ? (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {formatValue ? <Text style={styles.value}>{formatValue(value)}</Text> : null}
        </View>
      ) : null}
      <View
        hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        onLayout={onLayout}
        style={vertical ? [styles.verticalTrack, length ? { height: length } : null] : styles.horizontalTrack}
        {...responder.panHandlers}
      >
        <View pointerEvents="none" style={vertical ? styles.verticalRail : styles.horizontalRail} />
        <View
          pointerEvents="none"
          style={
            vertical
              ? [styles.verticalFill, { backgroundColor: accent, height: `${ratio * 100}%` }]
              : [styles.horizontalFill, { backgroundColor: accent, width: `${ratio * 100}%` }]
          }
        />
        <View
          pointerEvents="none"
          style={
            vertical
              ? [styles.thumb, { bottom: Math.max(0, ratio * trackLength - 11), left: 2 }]
              : [styles.thumb, { left: Math.max(0, ratio * trackLength - 11), top: 2 }]
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  horizontalWrap: {
    gap: 6,
  },
  verticalWrap: {
    alignItems: "center",
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
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "700",
  },
  horizontalTrack: {
    height: 26,
    justifyContent: "center",
  },
  verticalTrack: {
    alignItems: "center",
    height: 200,
    width: 26,
  },
  horizontalRail: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 3,
    height: 4,
  },
  horizontalFill: {
    borderRadius: 3,
    height: 4,
    left: 0,
    position: "absolute",
  },
  verticalRail: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 3,
    height: "100%",
    width: 4,
  },
  verticalFill: {
    borderRadius: 3,
    bottom: 0,
    position: "absolute",
    width: 4,
  },
  thumb: {
    backgroundColor: "#ffffff",
    borderRadius: 11,
    elevation: 3,
    height: 22,
    position: "absolute",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    width: 22,
  },
});
