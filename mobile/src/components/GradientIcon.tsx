import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleProp, Text, View, ViewStyle } from "react-native";
import { createThemedStyles, palette } from "../theme";

/** Daylight: the brand "gradient" is solid cobalt (unseen story rings, the Create key). */
export const BRAND_GRADIENT = ["#1f5bff", "#1f5bff"] as const;
/** Unseen stories use the same cobalt ring. */
export const STORY_GRADIENT = ["#1f5bff", "#1f5bff"] as const;

/** Icons use one of the two brand colours: green (primary) for most, orange (accent) to draw attention. */
export type BrandTint = "primary" | "accent";

export function brandColor(tint: BrandTint = "primary") {
  return tint === "accent" ? palette.accent : palette.primary;
}

/**
 * Quiet 44 px icon button used in top bars (search, activity, messages). The icon is plain text colour;
 * the brand colours are kept for meaning: an ember badge for new activity.
 */
export function GradientIconButton({
  icon,
  tint,
  onPress,
  badge,
  size = 44,
  accessibilityLabel,
  style,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint?: BrandTint;
  onPress: () => void;
  badge?: string;
  size?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  // Only the "-outline" icon set is used in bars, for one consistent stroke.
  const name = (icon.endsWith("-outline") || !(`${icon}-outline` in Ionicons.glyphMap) ? icon : `${icon}-outline`) as keyof typeof Ionicons.glyphMap;
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [styles.plain, { height: size, width: size, borderRadius: size / 2 }, pressed ? styles.pressed : null, style]}
    >
      <Ionicons color={tint === "accent" ? palette.accent : palette.text} name={name} size={20} />
      {badge ? (
        badge === "•" || badge === "" ? (
          <View style={styles.dot} />
        ) : (
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>{badge}</Text>
          </View>
        )
      ) : null}
    </Pressable>
  );
}

/** A filled gradient circle with a white icon, used for the selected tab and primary actions. */
export function GradientIconFill({
  icon,
  size = 40,
  iconSize,
  colors = BRAND_GRADIENT,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  size?: number;
  iconSize?: number;
  colors?: readonly [string, string, ...string[]];
}) {
  return (
    <LinearGradient
      colors={[...colors] as [string, string, ...string[]]}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={[styles.fill, { borderRadius: size / 2, height: size, width: size }]}
    >
      <Ionicons color="#ffffff" name={icon} size={iconSize ?? Math.round(size * 0.55)} />
    </LinearGradient>
  );
}

const styles = createThemedStyles({
  plain: {
    alignItems: "center",
    backgroundColor: palette.surfaceMuted,
    justifyContent: "center",
  },
  dot: {
    backgroundColor: palette.accent,
    borderColor: palette.background,
    borderRadius: 6,
    borderWidth: 2,
    height: 12,
    position: "absolute",
    right: 1,
    top: 1,
    width: 12,
  },
  ring: {
    alignItems: "center",
    justifyContent: "center",
    padding: 2,
  },
  inner: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: palette.surface,
    flex: 1,
    justifyContent: "center",
  },
  fill: {
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.6,
  },
  badge: {
    alignItems: "center",
    backgroundColor: palette.primary,
    borderColor: palette.background,
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: "center",
    minWidth: 20,
    paddingHorizontal: 4,
    position: "absolute",
    right: -4,
    top: -4,
  },
  badgeLabel: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
  },
});
