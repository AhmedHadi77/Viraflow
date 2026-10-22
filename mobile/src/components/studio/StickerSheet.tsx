import { Ionicons } from "@expo/vector-icons";
import { ComponentProps, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CopyStrings } from "../../data/locales/en";
import type { StudioStickerKind } from "../../types/models";

const EMOJI_GROUPS: string[][] = [
  ["😀", "😂", "🥹", "😍", "🥰", "😎", "🤩", "😇", "🤔", "😴", "😭", "😡", "🥳", "🤯", "😱", "🤗"],
  ["❤️", "🧡", "💚", "💙", "💜", "🖤", "🤍", "💖", "💯", "✨", "🔥", "⚡", "🌟", "💫", "🎉", "🎊"],
  ["👍", "👏", "🙌", "🙏", "💪", "🤝", "👋", "✌️", "🤞", "👌", "☝️", "🫶"],
  ["☀️", "🌙", "🌈", "🌊", "🌴", "🌸", "🌹", "🍀", "❄️", "☁️", "⛰️", "🏝️"],
  ["☕", "🍕", "🍔", "🍩", "🍓", "🍉", "🥤", "🍰", "🎂", "🍫", "🍿", "🧁"],
  ["🎵", "🎧", "📸", "🎬", "📍", "✈️", "🚗", "⚽", "🏀", "🎮", "📚", "💻", "🛍️", "🏆", "🎁", "🕌"],
];

type SpecialKind = Exclude<StudioStickerKind, "emoji" | "time">;

const SPECIALS: Array<{ kind: SpecialKind | "time"; icon: ComponentProps<typeof Ionicons>["name"]; labelKey: keyof CopyStrings }> = [
  { kind: "location", icon: "location", labelKey: "edStickerLocation" },
  { kind: "mention", icon: "at", labelKey: "edStickerMention" },
  { kind: "hashtag", icon: "pricetag", labelKey: "edStickerHashtag" },
  { kind: "time", icon: "time", labelKey: "edStickerTime" },
];

/** Emoji and Instagram-style info stickers (location, mention, hashtag, time). */
export function StickerSheet({
  visible,
  copy,
  timeLabel,
  onPick,
  onClose,
}: {
  visible: boolean;
  copy: CopyStrings;
  timeLabel: string;
  onPick: (kind: StudioStickerKind, value: string) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [asking, setAsking] = useState<SpecialKind | null>(null);
  const [input, setInput] = useState("");

  function submitSpecial() {
    const value = input.trim().replace(asking === "mention" ? /^@+/ : asking === "hashtag" ? /^#+/ : /^$/, "");
    if (!asking || !value) {
      return;
    }
    onPick(asking, value);
    setAsking(null);
    setInput("");
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} statusBarTranslucent transparent visible={visible}>
      <View style={styles.backdrop}>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.dismissArea} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
          <View style={styles.handle} />
          <View style={styles.specialRow}>
            {SPECIALS.map((item) => (
              <Pressable
                key={item.kind}
                onPress={() => {
                  if (item.kind === "time") {
                    onPick("time", timeLabel);
                    return;
                  }
                  setInput("");
                  setAsking(item.kind);
                }}
                style={[styles.specialChip, asking === item.kind ? styles.specialChipActive : null]}
              >
                <Ionicons color="#e5294f" name={item.icon} size={16} />
                <Text style={styles.specialLabel}>{copy[item.labelKey] as string}</Text>
              </Pressable>
            ))}
          </View>

          {asking ? (
            <View style={styles.askRow}>
              <TextInput
                autoCapitalize="none"
                autoFocus
                onChangeText={setInput}
                onSubmitEditing={submitSpecial}
                placeholder={
                  asking === "location" ? copy.edStickerLocationPh : asking === "mention" ? copy.edStickerMentionPh : copy.edStickerHashtagPh
                }
                placeholderTextColor="rgba(255,255,255,0.45)"
                returnKeyType="done"
                style={styles.askInput}
                value={input}
              />
              <Pressable onPress={submitSpecial} style={styles.addButton}>
                <Text style={styles.addLabel}>{copy.edAdd}</Text>
              </Pressable>
            </View>
          ) : null}

          <ScrollView contentContainerStyle={styles.grid} keyboardShouldPersistTaps="handled">
            {EMOJI_GROUPS.flat().map((emoji, index) => (
              <Pressable accessibilityLabel={emoji} key={`${emoji}-${index}`} onPress={() => onPick("emoji", emoji)} style={styles.emojiCell}>
                <Text style={styles.emoji}>{emoji}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.35)",
    flex: 1,
    justifyContent: "flex-end",
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    backgroundColor: "#151922",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "62%",
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  handle: {
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 3,
    height: 5,
    marginBottom: 12,
    width: 40,
  },
  specialRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  specialChip: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  specialChipActive: {
    borderColor: "#1f5bff",
    borderWidth: 2,
  },
  specialLabel: {
    color: "#151922",
    fontSize: 13,
    fontWeight: "800",
  },
  askRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  askInput: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    color: "#ffffff",
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addButton: {
    backgroundColor: "#1f5bff",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  addLabel: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingBottom: 10,
  },
  emojiCell: {
    alignItems: "center",
    height: 52,
    justifyContent: "center",
    width: "12.5%",
  },
  emoji: {
    fontSize: 30,
  },
});
