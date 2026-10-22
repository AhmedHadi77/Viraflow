import { ActivityIndicator, Pressable, StyleProp, Text, ViewStyle } from "react-native";
import { palette, radii, createThemedStyles } from "../theme";

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  /** solid: the main action (cobalt). ghost: a second action (grey fill). outline: a quiet action. danger: delete/end. */
  variant?: "solid" | "contrast" | "ghost" | "outline" | "danger";
  size?: "regular" | "compact";
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({
  label,
  onPress,
  variant = "solid",
  size = "regular",
  disabled = false,
  loading = false,
  style,
}: PrimaryButtonProps) {
  const labelStyle =
    variant === "solid"
      ? styles.solidLabel
      : variant === "contrast"
        ? { color: palette.background }
        : variant === "danger"
          ? styles.dangerLabel
          : styles.ghostLabel;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        size === "compact" ? styles.compact : null,
        variant === "solid" ? styles.solid : variant === "contrast" ? styles.contrast : variant === "outline" ? styles.outline : variant === "danger" ? styles.danger : styles.ghost,
        disabled ? styles.disabled : null,
        pressed && !disabled ? styles.pressed : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "solid" ? "#ffffff" : variant === "contrast" ? palette.background : palette.text} />
      ) : (
        <Text numberOfLines={1} style={[styles.label, size === "compact" ? styles.compactLabel : null, labelStyle]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = createThemedStyles({
  base: {
    alignItems: "center",
    borderRadius: radii.pill,
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 20,
  },
  compact: {
    borderRadius: radii.pill,
    minHeight: 36,
    paddingHorizontal: 14,
  },
  solid: {
    backgroundColor: palette.primary,
  },
  contrast: {
    backgroundColor: palette.text,
  },
  ghost: {
    backgroundColor: palette.surfaceMuted,
  },
  outline: {
    backgroundColor: "transparent",
    borderColor: palette.borderStrong,
    borderWidth: 1.5,
  },
  danger: {
    backgroundColor: "rgba(255,92,92,0.14)",
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
  },
  compactLabel: {
    fontSize: 13,
  },
  solidLabel: {
    color: "#ffffff",
  },
  ghostLabel: {
    color: palette.text,
  },
  dangerLabel: {
    color: palette.danger,
  },
});
