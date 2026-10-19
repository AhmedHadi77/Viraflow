import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleProp, Text, View, ViewStyle } from "react-native";
import { createThemedStyles, palette } from "../theme";

/** The Sohba brand gradient, the same colours as the "your story" ring. */
export const BRAND_GRADIENT = ["#7ce7ff", "#36e0a1", "#ff7a2f"] as const;
/** The ring used on other people's stories. */
export const STORY_GRADIENT = ["#ff8a3d", "#ff4d67", "#a855f7"] as const;

/** Icon tints taken from the gradients, deep enough to read on light and dark backgrounds. */
export const brandTints = {
  cyan: "#14a9d6",
  green: "#12b47a",
  orange: "#f26a1b",
  pink: "#ff4d67",
  purple: "#a855f7",
} as const;

export type BrandTint = keyof typeof brandTints;

/**
 * Round icon button with a gradient ring, matching the story ring. Used for the header actions
 * (search, messages, notifications) and other quick actions.
 */
export function GradientIconButton({
  icon,
  tint = "green",
  onPress,
  badge,
  size = 40,
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
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [pressed ? styles.pressed : null, style]}
    >
      <LinearGradient
        colors={[...BRAND_GRADIENT]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={[styles.ring, { borderRadius: size / 2, height: size, width: size }]}
      >
        <View style={[styles.inner, { borderRadius: (size - 4) / 2 }]}>
          <Ionicons color={brandTints[tint]} name={icon} size={Math.round(size * 0.5)} />
        </View>
      </LinearGradient>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>{badge}</Text>
        </View>
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
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  badge: {
    alignItems: "center",
    backgroundColor: "#ff4d67",
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
