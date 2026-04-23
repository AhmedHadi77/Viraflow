import { Pressable, StyleSheet, Text } from "react-native";
import { palette, radii, shadows, spacing } from "../theme";

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  variant?: "solid" | "ghost";
  disabled?: boolean;
}

export function PrimaryButton({
  label,
  onPress,
  variant = "solid",
  disabled = false,
}: PrimaryButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === "ghost" ? styles.ghost : styles.solid,
        disabled && styles.disabled,
        pressed && !disabled ? styles.pressed : null,
      ]}
    >
      <Text style={[styles.label, variant === "ghost" ? styles.ghostLabel : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  solid: {
    backgroundColor: palette.primary,
    borderColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    ...shadows.floating,
  },
  ghost: {
    backgroundColor: palette.glass,
    borderColor: palette.borderStrong,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    color: "#071118",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  ghostLabel: {
    color: palette.text,
  },
});
