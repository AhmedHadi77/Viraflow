import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";
import type { MediaEditFilters } from "../../types/models";

/**
 * On-screen approximation of a filter while editing. The exact look is processed on the uploaded file
 * when the post is shared; this keeps the preview close to it.
 */
export function FilterPreview({ filters }: { filters: MediaEditFilters }) {
  const brightness = filters.brightness ?? 0;
  const contrast = filters.contrast ?? 0;
  const saturation = filters.saturation ?? 0;
  const grayscale = filters.grayscale ?? 0;
  const vignette = filters.vignette ?? 0;
  const desaturate = Math.max(grayscale / 100, saturation < 0 ? Math.min(1, -saturation / 2) : 0);
  const layers: React.ReactNode[] = [];

  if (desaturate > 0) {
    layers.push(<View key="gray" style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(128,128,128,${desaturate * 0.55})` }]} />);
  }
  if (saturation > 0) {
    layers.push(<View key="sat" style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(255,140,60,${Math.min(0.12, saturation * 0.05)})` }]} />);
  }
  if (brightness !== 0) {
    layers.push(
      <View
        key="bright"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: brightness > 0 ? `rgba(255,255,255,${brightness * 0.12})` : `rgba(0,0,0,${-brightness * 0.22})` },
        ]}
      />
    );
  }
  if (contrast < 0) {
    layers.push(<View key="fade" style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(200,200,200,${-contrast * 0.14})` }]} />);
  }
  const edge = Math.min(0.85, vignette / 100 + Math.max(0, contrast) * 0.08);
  if (edge > 0.02) {
    const dark = `rgba(0,0,0,${edge})`;
    layers.push(
      <LinearGradient colors={[dark, "rgba(0,0,0,0)"]} end={{ x: 0, y: 0.3 }} key="vt" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />,
      <LinearGradient colors={["rgba(0,0,0,0)", dark]} end={{ x: 0, y: 1 }} key="vb" start={{ x: 0, y: 0.7 }} style={StyleSheet.absoluteFill} />,
      <LinearGradient colors={[dark, "rgba(0,0,0,0)"]} end={{ x: 0.3, y: 0 }} key="vl" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />,
      <LinearGradient colors={["rgba(0,0,0,0)", dark]} end={{ x: 1, y: 0 }} key="vr" start={{ x: 0.7, y: 0 }} style={StyleSheet.absoluteFill} />
    );
  }
  if (layers.length === 0) {
    return null;
  }
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {layers}
    </View>
  );
}
