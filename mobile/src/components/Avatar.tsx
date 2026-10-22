import { useEffect, useState } from "react";
import { Image, ImageStyle, StyleProp, StyleSheet, Text, View } from "react-native";
import { repairMediaUrl } from "../services/mediaUpload";
import { fonts, getThemeMode, sheet } from "../theme";

// Soft, distinct tones for people without a photo: pastels on the light theme, deep tones on dark.
const AVATAR_TONES_LIGHT = ["#dbe6ff", "#ffe1cc", "#e6dcff", "#d3f0e2", "#ffd9e2", "#d6eef5"];
const AVATAR_TONES_DARK = ["#28385e", "#5a3d2b", "#3d3160", "#24493c", "#5c2b3a", "#24485a"];

function toneFor(name?: string | null) {
  const text = (name ?? "").trim();
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  const tones = getThemeMode() === "light" ? AVATAR_TONES_LIGHT : AVATAR_TONES_DARK;
  return tones[hash % tones.length];
}

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
        <View style={[styles.fill, { backgroundColor: toneFor(name) }]}>
          <Text style={[styles.initials, { color: getThemeMode() === "light" ? "#1c2333" : "#f2f4f7", fontSize: Math.max(11, Math.round(size * 0.36)) }]}>{initialsFor(name)}</Text>
        </View>
      </View>
    );
  }

  return <Image blurRadius={blurRadius} onError={() => setFailed(true)} source={{ uri: source }} style={style} />;
}

const styles = sheet({
  clip: {
    overflow: "hidden",
  },
  fill: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  initials: {
    color: "#f2f4f7",
    fontFamily: fonts.bold,
  },
});
