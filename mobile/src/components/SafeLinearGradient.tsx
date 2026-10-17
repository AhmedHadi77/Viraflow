import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";

type LinearGradientComponent = React.ComponentType<{
  colors: string[];
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  pointerEvents?: "box-none" | "none" | "box-only" | "auto";
}>;

let cachedLinearGradient: LinearGradientComponent | null | undefined;

function getLinearGradientComponent() {
  if (cachedLinearGradient !== undefined) {
    return cachedLinearGradient;
  }

  try {
    cachedLinearGradient = require("expo-linear-gradient").LinearGradient as LinearGradientComponent;
  } catch (error) {
    console.warn("Sohba linear gradient module is unavailable in this build.", error);
    cachedLinearGradient = null;
  }

  return cachedLinearGradient;
}

export function SafeLinearGradient({
  colors,
  style,
  children,
  pointerEvents,
}: {
  colors: string[];
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  pointerEvents?: "box-none" | "none" | "box-only" | "auto";
}) {
  const LinearGradient = getLinearGradientComponent();

  if (!LinearGradient) {
    const fallbackBackground = colors[0] ?? "transparent";
    return (
      <View pointerEvents={pointerEvents} style={[style, { backgroundColor: fallbackBackground }]}>
        {children}
      </View>
    );
  }

  return (
    <LinearGradient colors={colors} pointerEvents={pointerEvents} style={style}>
      {children}
    </LinearGradient>
  );
}
