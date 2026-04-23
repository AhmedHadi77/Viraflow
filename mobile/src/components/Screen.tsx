import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { palette, radii, spacing } from "../theme";

interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export function Screen({ children, scrollable = false, contentContainerStyle }: ScreenProps) {
  const inner = scrollable ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, contentContainerStyle]}>{children}</View>
  );

  return (
    <LinearGradient colors={[palette.backgroundDeep, palette.background, palette.backgroundSoft]} style={styles.gradient}>
      <View pointerEvents="none" style={[styles.glow, styles.glowTop]} />
      <View pointerEvents="none" style={[styles.glow, styles.glowBottom]} />
      <SafeAreaView style={styles.safeArea}>{inner}</SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
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
