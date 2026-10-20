import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { Image, ImageStyle, StyleProp, StyleSheet, Text, View } from "react-native";
import { repairMediaUrl } from "../services/mediaUpload";
import { BRAND_GRADIENT } from "./GradientIcon";

/** Placeholder avatar links that are generated rather than real photos; drawn locally instead. */
function isGeneratedAvatar(uri: string) {
  return /ui-avatars\.com|placehold\.co/i.test(uri);
}

function initialsFor(name?: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const letters = parts
    .slice(0, 2)
    .map((part) => Array.from(part)[0] ?? "")
    .join("")
    .toUpperCase();
  return letters || "S";
}

/**
 * A person's photo. If they have no photo yet, or the photo cannot be loaded, a brand-gradient circle
 * with their initials is shown instead of an empty circle.
 */
export function Avatar({
  uri,
  name,
  style,
  blurRadius,
}: {
  uri?: string | null;
  name?: string | null;
  style?: StyleProp<ImageStyle>;
  blurRadius?: number;
}) {
  const source = repairMediaUrl(uri?.trim() || "");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [source]);

  if (!source || failed || isGeneratedAvatar(source)) {
    const flat = StyleSheet.flatten(style) ?? {};
    const size = typeof flat.width === "number" ? flat.width : 40;
    return (
      <View style={[style as object, styles.clip]}>
        <LinearGradient colors={[...BRAND_GRADIENT]} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.fill}>
          <Text style={[styles.initials, { fontSize: Math.max(11, Math.round(size * 0.38)) }]}>{initialsFor(name)}</Text>
        </LinearGradient>
      </View>
    );
  }

  return <Image blurRadius={blurRadius} onError={() => setFailed(true)} source={{ uri: source }} style={style} />;
}

const styles = StyleSheet.create({
  clip: {
    overflow: "hidden",
  },
  fill: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  initials: {
    color: "#ffffff",
    fontWeight: "800",
  },
});
