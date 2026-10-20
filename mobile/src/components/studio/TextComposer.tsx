import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CopyStrings } from "../../data/locales/en";
import type { StudioTextBackground, StudioTextLayer, StudioTextStyle } from "../../types/models";
import { STUDIO_TEXT_COLORS, STUDIO_TEXT_STYLES, textStyleFor } from "./StudioLayers";
import { StudioSlider } from "./StudioSlider";

const STYLE_LABEL_KEYS: Record<StudioTextStyle, keyof CopyStrings> = {
  classic: "edTextClassic",
  modern: "edTextModern",
  neon: "edTextNeon",
  typewriter: "edTextTypewriter",
  strong: "edTextStrong",
};

const BACKGROUND_ORDER: StudioTextBackground[] = ["none", "solid", "soft"];

/** Full-screen text writing, Instagram style: type, then pick the style, colour, background and size. */
export function TextComposer({
  visible,
  layer,
  copy,
  onDone,
  onCancel,
}: {
  visible: boolean;
  layer: StudioTextLayer | null;
  copy: CopyStrings;
  onDone: (layer: StudioTextLayer | null) => void;
  onCancel: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [color, setColor] = useState("#ffffff");
  const [style, setStyle] = useState<StudioTextStyle>("classic");
  const [background, setBackground] = useState<StudioTextBackground>("none");
  const [align, setAlign] = useState<StudioTextLayer["align"]>("center");
  const [scale, setScale] = useState(1.2);

  useEffect(() => {
    if (!visible) {
      return;
    }
    setText(layer?.text ?? "");
    setColor(layer?.color ?? "#ffffff");
    setStyle(layer?.style ?? "classic");
    setBackground(layer?.background ?? "none");
    setAlign(layer?.align ?? "center");
    setScale(layer?.scale ?? 1.2);
  }, [layer, visible]);

  function finish() {
    const trimmed = text.trim();
    if (!trimmed) {
      onDone(null);
      return;
    }
    onDone({
      id: layer?.id ?? `text-${Date.now()}`,
      text: trimmed,
      x: layer?.x ?? 0.5,
      y: layer?.y ?? 0.42,
      rotation: layer?.rotation ?? 0,
      scale,
      color,
      style,
      background,
      align,
    });
  }

  const previewSize = 30 * scale;
  const hasBox = background !== "none";
  const boxColor = background === "solid" ? color : "rgba(0,0,0,0.55)";
  const textColor = background === "solid" ? (isLight(color) ? "#000000" : "#ffffff") : color;

  return (
    <Modal animationType="fade" onRequestClose={onCancel} statusBarTranslucent transparent visible={visible}>
      <View style={[styles.backdrop, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topRow}>
          <Pressable accessibilityLabel={copy.cancel} hitSlop={10} onPress={onCancel} style={styles.roundButton}>
            <Ionicons color="#ffffff" name="close" size={22} />
          </Pressable>
          <View style={styles.topTools}>
            <Pressable
              accessibilityLabel={copy.edTextAlign}
              hitSlop={8}
              onPress={() => setAlign(align === "center" ? "left" : align === "left" ? "right" : "center")}
              style={styles.roundButton}
            >
              <Ionicons
                color="#ffffff"
                name={align === "center" ? "reorder-three-outline" : align === "left" ? "menu-outline" : "menu-outline"}
                size={22}
                style={align === "right" ? styles.flip : null}
              />
            </Pressable>
            <Pressable
              accessibilityLabel={copy.edTextBackground}
              hitSlop={8}
              onPress={() => setBackground(BACKGROUND_ORDER[(BACKGROUND_ORDER.indexOf(background) + 1) % BACKGROUND_ORDER.length])}
              style={[styles.roundButton, background !== "none" ? styles.roundButtonActive : null]}
            >
              <Text style={[styles.bgGlyph, background === "solid" ? styles.bgGlyphSolid : null]}>A</Text>
            </Pressable>
          </View>
          <Pressable accessibilityRole="button" hitSlop={10} onPress={finish} style={styles.doneButton}>
            <Text style={styles.doneLabel}>{copy.edDone}</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.styleRow} horizontal keyboardShouldPersistTaps="always" showsHorizontalScrollIndicator={false}>
          {STUDIO_TEXT_STYLES.map((item) => (
            <Pressable
              key={item}
              onPress={() => setStyle(item)}
              style={[styles.styleChip, style === item ? styles.styleChipActive : null]}
            >
              <Text style={[textStyleFor(item, style === item ? "#000000" : "#ffffff", 14), styles.styleChipLabel]}>
                {copy[STYLE_LABEL_KEYS[item]] as string}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView contentContainerStyle={styles.colorRow} horizontal keyboardShouldPersistTaps="always" showsHorizontalScrollIndicator={false}>
          {STUDIO_TEXT_COLORS.map((item) => (
            <Pressable
              accessibilityLabel={item}
              key={item}
              onPress={() => setColor(item)}
              style={[styles.colorDot, { backgroundColor: item }, color === item ? styles.colorDotActive : null]}
            />
          ))}
        </ScrollView>

        <View style={styles.editorArea}>
          <View style={styles.sizeSlider}>
            <StudioSlider length={220} max={3} min={0.5} onChange={setScale} value={scale} vertical />
          </View>
          <View style={styles.inputWrap}>
            <View
              style={
                hasBox
                  ? { backgroundColor: boxColor, borderRadius: previewSize * 0.3, paddingHorizontal: previewSize * 0.35, paddingVertical: previewSize * 0.1 }
                  : null
              }
            >
              <TextInput
                autoFocus
                multiline
                onChangeText={setText}
                placeholder={copy.edTextPlaceholder}
                placeholderTextColor="rgba(255,255,255,0.5)"
                selectionColor="#36e0a1"
                style={[textStyleFor(style, textColor, previewSize), styles.input, { textAlign: align }]}
                value={text}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function isLight(color: string) {
  const hex = color.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.72)",
    flex: 1,
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  topTools: {
    flexDirection: "row",
    gap: 10,
  },
  roundButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  roundButtonActive: {
    backgroundColor: "rgba(255,255,255,0.32)",
  },
  flip: {
    transform: [{ scaleX: -1 }],
  },
  bgGlyph: {
    borderColor: "#ffffff",
    borderRadius: 4,
    borderWidth: 1.5,
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
    paddingHorizontal: 4,
  },
  bgGlyphSolid: {
    backgroundColor: "#ffffff",
    color: "#000000",
  },
  doneButton: {
    backgroundColor: "#36e0a1",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  doneLabel: {
    color: "#04110b",
    fontSize: 15,
    fontWeight: "800",
  },
  styleRow: {
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  styleChip: {
    borderColor: "rgba(255,255,255,0.4)",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  styleChipActive: {
    backgroundColor: "#ffffff",
    borderColor: "#ffffff",
  },
  styleChipLabel: {
    textShadowRadius: 0,
  },
  colorRow: {
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  colorDot: {
    borderColor: "rgba(255,255,255,0.85)",
    borderRadius: 14,
    borderWidth: 2,
    height: 28,
    width: 28,
  },
  colorDotActive: {
    borderColor: "#36e0a1",
    borderWidth: 3,
    transform: [{ scale: 1.15 }],
  },
  editorArea: {
    flex: 1,
    flexDirection: "row",
  },
  sizeSlider: {
    justifyContent: "center",
    paddingLeft: 10,
    paddingRight: 6,
  },
  inputWrap: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingRight: 20,
  },
  input: {
    minWidth: 60,
    padding: 0,
  },
});
