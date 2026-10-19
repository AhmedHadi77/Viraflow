import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";
import React from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleProp, View, ViewStyle } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { SafeLinearGradient } from "./SafeLinearGradient";
import { palette, radii, spacing, createThemedStyles } from "../theme";

interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export function Screen({ children, scrollable = false, contentContainerStyle }: ScreenProps) {
  // Android draws behind the navigation bar, so the bottom gap is added explicitly. Without it the last
  // button on a screen can sit underneath the system buttons.
  // Screens inside the tab bar already sit above it, so they only need the normal gap.
  const insets = useSafeAreaInsets();
  const tabBarHeight = React.useContext(BottomTabBarHeightContext);
  const systemBottom = tabBarHeight === undefined ? Math.max(insets.bottom, spacing.sm) : 0;
  const bottomInset = { paddingBottom: systemBottom + spacing.xl };
  const inner = scrollable ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, contentContainerStyle, bottomInset]}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, contentContainerStyle, bottomInset]}>{children}</View>
  );

  return (
    <SafeLinearGradient colors={[palette.backgroundDeep, palette.background, palette.backgroundSoft]} style={styles.gradient}>
      <View pointerEvents="none" style={[styles.glow, styles.glowTop]} />
      <View pointerEvents="none" style={[styles.glow, styles.glowBottom]} />
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
        {/* Android draws edge-to-edge, so the window no longer resizes for the keyboard on its own. */}
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.safeArea}>
          {inner}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeLinearGradient>
  );
}

const styles = createThemedStyles({
  gradient: {
    flex: 1,
  },
  glow: {
    position: "absolute",
    borderRadius: radii.pill,
    opacity: 0.75,
  },
  glowTop: {
    backgroundColor: "rgba(54,224,161,0.12)",
    height: 260,
    width: 260,
    right: -90,
    top: -20,
  },
  glowBottom: {
    backgroundColor: "rgba(255,122,47,0.10)",
    height: 300,
    width: 300,
    left: -130,
    bottom: 120,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
});
