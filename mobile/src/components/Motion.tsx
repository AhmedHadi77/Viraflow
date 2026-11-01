import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

/**
 * Small shared animations: the heart that bursts on a double-tap like, an icon that pops when it turns
 * on, and a double-tap detector. Everything uses the native animation driver.
 */

const SMALL_HEARTS = [
  { x: -46, y: -70, size: 22, delay: 40 },
  { x: 40, y: -88, size: 18, delay: 90 },
  { x: -18, y: -110, size: 16, delay: 140 },
  { x: 58, y: -40, size: 14, delay: 60 },
  { x: -64, y: -30, size: 15, delay: 120 },
];

/** A big heart that pops in the middle, with small hearts floating up around it. Plays when `trigger` changes. */
export function HeartBurst({ trigger, color = "#ffffff", size = 96 }: { trigger: number; color?: string; size?: number }) {
  const big = useRef(new Animated.Value(0)).current;
  const smalls = useRef(SMALL_HEARTS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (!trigger) {
      return;
    }
    big.setValue(0);
    smalls.forEach((value) => value.setValue(0));
    const animation = Animated.parallel([
      Animated.sequence([
        Animated.spring(big, { friction: 4, tension: 140, toValue: 1, useNativeDriver: true }),
        Animated.delay(260),
        Animated.timing(big, { duration: 240, easing: Easing.in(Easing.quad), toValue: 2, useNativeDriver: true }),
      ]),
      ...smalls.map((value, index) =>
        Animated.sequence([
          Animated.delay(SMALL_HEARTS[index].delay),
          Animated.timing(value, { duration: 900, easing: Easing.out(Easing.cubic), toValue: 1, useNativeDriver: true }),
        ])
      ),
    ]);
    animation.start();
    return () => animation.stop();
  }, [big, smalls, trigger]);

  if (!trigger) {
    return null;
  }
  return (
    <View pointerEvents="none" style={styles.center}>
      {smalls.map((value, index) => {
        const heart = SMALL_HEARTS[index];
        return (
          <Animated.View
            key={index}
            style={[
              styles.small,
              {
                opacity: value.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 0.8, 0] }),
                transform: [
                  { translateX: value.interpolate({ inputRange: [0, 1], outputRange: [0, heart.x] }) },
                  { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [0, heart.y] }) },
                  { scale: value.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.2, 1, 0.8] }) },
                ],
              },
            ]}
          >
            <Ionicons color="#ff4d67" name="heart" size={heart.size} />
          </Animated.View>
        );
      })}
      <Animated.View
        style={{
          opacity: big.interpolate({ inputRange: [0, 0.2, 1, 2], outputRange: [0, 1, 1, 0] }),
          transform: [
            { scale: big.interpolate({ inputRange: [0, 1, 2], outputRange: [0.2, 1, 1.25] }) },
            { translateY: big.interpolate({ inputRange: [0, 1, 2], outputRange: [10, 0, -30] }) },
          ],
        }}
      >
        <Ionicons color={color} name="heart" size={size} style={styles.bigShadow} />
      </Animated.View>
    </View>
  );
}

/** Wraps an icon so it pops (grows and settles) whenever `active` turns on. */
export function PopOnActive({ active, children }: { active: boolean; children: React.ReactNode }) {
  const scale = useRef(new Animated.Value(1)).current;
  const previous = useRef(active);
  useEffect(() => {
    if (active && !previous.current) {
      scale.setValue(0.6);
      Animated.spring(scale, { friction: 3.5, tension: 220, toValue: 1, useNativeDriver: true }).start();
    }
    previous.current = active;
  }, [active, scale]);
  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>;
}

/**
 * Tells a single tap from a double tap: the single-tap action waits a moment in case a second tap
 * follows (Instagram's double-tap to like).
 */
export function useDoubleTap(onSingle: (() => void) | undefined, onDouble: (() => void) | undefined, delay = 260) {
  const lastTap = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlers = useRef({ onSingle, onDouble });
  handlers.current = { onSingle, onDouble };

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    []
  );

  return useMemo(
    () => () => {
      const now = Date.now();
      if (handlers.current.onDouble && now - lastTap.current < delay) {
        lastTap.current = 0;
        if (timer.current) {
          clearTimeout(timer.current);
          timer.current = null;
        }
        handlers.current.onDouble();
        return;
      }
      lastTap.current = now;
      if (!handlers.current.onDouble) {
        handlers.current.onSingle?.();
        return;
      }
      if (timer.current) {
        clearTimeout(timer.current);
      }
      timer.current = setTimeout(() => {
        timer.current = null;
        handlers.current.onSingle?.();
      }, delay);
    },
    [delay]
  );
}

/** Fades content in and lifts it slightly when it first appears. */
export function FadeInView({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: object }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.timing(progress, { delay, duration: 320, easing: Easing.out(Easing.cubic), toValue: 1, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [delay, progress]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  small: {
    position: "absolute",
  },
  bigShadow: {
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
});
