import { Ionicons } from "@expo/vector-icons";
import { ComponentProps, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CopyStrings } from "../../data/locales/en";
import type { StudioStickerKind, StudioStickerLayer } from "../../types/models";

const EMOJI_GROUPS: string[][] = [
  ["😀", "😂", "🥹", "😍", "🥰", "😎", "🤩", "😇", "🤔", "😴", "😭", "😡", "🥳", "🤯", "😱", "🤗"],
  ["❤️", "🧡", "💚", "💙", "💜", "🖤", "🤍", "💖", "💯", "✨", "🔥", "⚡", "🌟", "💫", "🎉", "🎊"],
  ["👍", "👏", "🙌", "🙏", "💪", "🤝", "👋", "✌️", "🤞", "👌", "☝️", "🫶", "👀", "💥", "🎯", "✅"],
  ["☀️", "🌙", "🌈", "🌊", "🌴", "🌸", "🌹", "🍀", "❄️", "☁️", "⛰️", "🏝️", "🌍", "🌺", "🌻", "🍁"],
  ["☕", "🍕", "🍔", "🍩", "🍓", "🍉", "🥤", "🍰", "🎂", "🍫", "🍿", "🧁", "🥗", "🍜", "🍣", "🥐"],
  ["🎵", "🎧", "📸", "🎬", "📍", "✈️", "🚗", "⚽", "🏀", "🎮", "📚", "💻", "🛍️", "🏆", "🎁", "🕌"],
];

export type StickerDraft = Pick<StudioStickerLayer, "kind" | "value" | "options" | "targetAt" | "url">;

type Asking = "location" | "mention" | "hashtag" | "poll" | "question" | "countdown" | "link";

const INFO_STICKERS: Array<{ kind: Asking | "time"; icon: ComponentProps<typeof Ionicons>["name"]; labelKey: keyof CopyStrings }> = [
  { kind: "location", icon: "location", labelKey: "edStickerLocation" },
  { kind: "mention", icon: "at", labelKey: "edStickerMention" },
  { kind: "hashtag", icon: "pricetag", labelKey: "edStickerHashtag" },
  { kind: "time", icon: "time", labelKey: "edStickerTime" },
  { kind: "countdown", icon: "timer-outline", labelKey: "edStickerCountdown" },
];

const STORY_STICKERS: Array<{ kind: Asking; icon: ComponentProps<typeof Ionicons>["name"]; labelKey: keyof CopyStrings }> = [
  { kind: "poll", icon: "stats-chart", labelKey: "edStickerPoll" },
  { kind: "question", icon: "help-circle", labelKey: "edStickerQuestion" },
  { kind: "link", icon: "link", labelKey: "edStickerLink" },
];

function normalizeLink(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed.replace(/^http:\/\//i, "https://") : `https://${trimmed}`;
  return /^https:\/\/[^\s/]+\.[^\s]+/.test(withScheme) ? withScheme : null;
}

/**
 * Stickers: emoji, info stickers (location, mention, hashtag, time, countdown) and — on stories —
 * interactive ones people can tap: a poll, a question box and a link.
 */
export function StickerSheet({
  visible,
  copy,
  timeLabel,
  interactive,
  onPick,
  onClose,
}: {
  visible: boolean;
  copy: CopyStrings;
  timeLabel: string;
  /** Show the poll, question and link stickers (stories). */
  interactive?: boolean;
  onPick: (sticker: StickerDraft) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [asking, setAsking] = useState<Asking | null>(null);
  const [input, setInput] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [countdown, setCountdown] = useState({ days: 1, hours: 0 });
  const [error, setError] = useState<string | null>(null);

  function startAsking(kind: Asking) {
    setAsking(kind);
    setError(null);
    setInput(kind === "question" ? copy.edQuestionDefault : "");
    setOptionA(kind === "poll" ? copy.edPollYes : "");
    setOptionB(kind === "poll" ? copy.edPollNo : "");
    setLinkLabel("");
    setCountdown({ days: 1, hours: 0 });
  }

  function reset() {
    setAsking(null);
    setInput("");
    setError(null);
  }

  function submit() {
    if (!asking) {
      return;
    }
    const value = input.trim();
    if (asking === "poll") {
      if (!value || !optionA.trim() || !optionB.trim()) {
        setError(copy.edStickerFillAll);
        return;
      }
      onPick({ kind: "poll", value: value.slice(0, 80), options: [optionA.trim().slice(0, 40), optionB.trim().slice(0, 40)] });
      reset();
      return;
    }
    if (asking === "countdown") {
      const ms = (countdown.days * 24 + countdown.hours) * 60 * 60 * 1000;
      if (!value || ms <= 0) {
        setError(copy.edStickerFillAll);
        return;
      }
      onPick({ kind: "countdown", value: value.slice(0, 40), targetAt: new Date(Date.now() + ms).toISOString() });
      reset();
      return;
    }
    if (asking === "link") {
      const url = normalizeLink(value);
      if (!url) {
        setError(copy.edStickerLinkInvalid);
        return;
      }
      const label = linkLabel.trim() || url.replace(/^https:\/\//, "").replace(/\/$/, "");
      onPick({ kind: "link", value: label.slice(0, 40), url });
      reset();
      return;
    }
    const cleaned = value.replace(asking === "mention" ? /^@+/ : asking === "hashtag" ? /^#+/ : /^$/, "");
    if (!cleaned) {
      setError(copy.edStickerFillAll);
      return;
    }
    onPick({ kind: asking as StudioStickerKind, value: cleaned.slice(0, 80) });
    reset();
  }

  const placeholder =
    asking === "location"
      ? copy.edStickerLocationPh
      : asking === "mention"
        ? copy.edStickerMentionPh
        : asking === "hashtag"
          ? copy.edStickerHashtagPh
          : asking === "poll"
            ? copy.edPollQuestionPh
            : asking === "question"
              ? copy.edQuestionPh
              : asking === "countdown"
                ? copy.edCountdownPh
                : copy.edLinkPh;

  return (
    <Modal
      animationType="slide"
      onRequestClose={() => {
        reset();
        onClose();
      }}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            reset();
            onClose();
          }}
          style={styles.dismissArea}
        />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
          <View style={styles.handle} />
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {interactive ? (
              <View style={styles.specialRow}>
                {STORY_STICKERS.map((item) => (
                  <Pressable
                    key={item.kind}
                    onPress={() => startAsking(item.kind)}
                    style={[styles.specialChip, styles.storyChip, asking === item.kind ? styles.specialChipActive : null]}
                  >
                    <Ionicons color="#ffffff" name={item.icon} size={16} />
                    <Text style={[styles.specialLabel, styles.storyChipLabel]}>{copy[item.labelKey] as string}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <View style={styles.specialRow}>
              {INFO_STICKERS.map((item) => (
                <Pressable
                  key={item.kind}
                  onPress={() => {
                    if (item.kind === "time") {
                      onPick({ kind: "time", value: timeLabel });
                      return;
                    }
                    startAsking(item.kind);
                  }}
                  style={[styles.specialChip, asking === item.kind ? styles.specialChipActive : null]}
                >
                  <Ionicons color="#e5294f" name={item.icon} size={16} />
                  <Text style={styles.specialLabel}>{copy[item.labelKey] as string}</Text>
                </Pressable>
              ))}
            </View>

            {asking ? (
              <View style={styles.form}>
                <TextInput
                  autoCapitalize={asking === "link" || asking === "mention" ? "none" : "sentences"}
                  autoFocus
                  keyboardType={asking === "link" ? "url" : "default"}
                  maxLength={asking === "link" ? 300 : 80}
                  onChangeText={(text) => {
                    setInput(text);
                    setError(null);
                  }}
                  onSubmitEditing={asking === "poll" || asking === "link" || asking === "countdown" ? undefined : submit}
                  placeholder={placeholder}
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  returnKeyType={asking === "poll" ? "next" : "done"}
                  style={styles.askInput}
                  value={input}
                />
                {asking === "poll" ? (
                  <View style={styles.optionRow}>
                    <TextInput
                      maxLength={40}
                      onChangeText={setOptionA}
                      placeholder={copy.edPollOptionPh}
                      placeholderTextColor="rgba(255,255,255,0.45)"
                      style={[styles.askInput, styles.optionInput]}
                      value={optionA}
                    />
                    <TextInput
                      maxLength={40}
                      onChangeText={setOptionB}
                      placeholder={copy.edPollOptionPh}
                      placeholderTextColor="rgba(255,255,255,0.45)"
                      style={[styles.askInput, styles.optionInput]}
                      value={optionB}
                    />
                  </View>
                ) : null}
                {asking === "link" ? (
                  <TextInput
                    maxLength={40}
                    onChangeText={setLinkLabel}
                    placeholder={copy.edLinkLabelPh}
                    placeholderTextColor="rgba(255,255,255,0.45)"
                    style={styles.askInput}
                    value={linkLabel}
                  />
                ) : null}
                {asking === "countdown" ? (
                  <View style={styles.optionRow}>
                    <Stepper
                      label={copy.edCountdownDays}
                      max={30}
                      onChange={(days) => setCountdown((current) => ({ ...current, days }))}
                      value={countdown.days}
                    />
                    <Stepper
                      label={copy.edCountdownHours}
                      max={23}
                      onChange={(hours) => setCountdown((current) => ({ ...current, hours }))}
                      value={countdown.hours}
                    />
                  </View>
                ) : null}
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <View style={styles.formActions}>
                  <Pressable onPress={reset} style={styles.cancelButton}>
                    <Text style={styles.cancelLabel}>{copy.cancel}</Text>
                  </Pressable>
                  <Pressable onPress={submit} style={styles.addButton}>
                    <Text style={styles.addLabel}>{copy.edAdd}</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            <View style={styles.grid}>
              {EMOJI_GROUPS.flat().map((emoji, index) => (
                <Pressable
                  accessibilityLabel={emoji}
                  key={`${emoji}-${index}`}
                  onPress={() => onPick({ kind: "emoji", value: emoji })}
                  style={styles.emojiCell}
                >
                  <Text style={styles.emoji}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Stepper({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (value: number) => void }) {
  return (
    <View style={styles.stepper}>
      <Pressable accessibilityLabel={`${label} −`} hitSlop={6} onPress={() => onChange(Math.max(0, value - 1))} style={styles.stepButton}>
        <Ionicons color="#ffffff" name="remove" size={18} />
      </Pressable>
      <View style={styles.stepValue}>
        <Text style={styles.stepNumber}>{value}</Text>
        <Text style={styles.stepLabel}>{label}</Text>
      </View>
      <Pressable accessibilityLabel={`${label} +`} hitSlop={6} onPress={() => onChange(Math.min(max, value + 1))} style={styles.stepButton}>
        <Ionicons color="#ffffff" name="add" size={18} />
      </Pressable>
    </View>
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
    maxHeight: "72%",
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
    borderColor: "transparent",
    borderRadius: 14,
    borderWidth: 2,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  storyChip: {
    backgroundColor: "#1f5bff",
  },
  storyChipLabel: {
    color: "#ffffff",
  },
  specialChipActive: {
    borderColor: "#7aa2ff",
  },
  specialLabel: {
    color: "#151922",
    fontSize: 13,
    fontWeight: "800",
  },
  form: {
    gap: 8,
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: "row",
    gap: 8,
  },
  optionInput: {
    flex: 1,
  },
  askInput: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    color: "#ffffff",
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  error: {
    color: "#ff8a9b",
    fontSize: 13,
    fontWeight: "700",
  },
  formActions: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
  },
  cancelButton: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  cancelLabel: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
    fontWeight: "700",
  },
  addButton: {
    backgroundColor: "#1f5bff",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  addLabel: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  stepper: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 6,
  },
  stepButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  stepValue: {
    alignItems: "center",
  },
  stepNumber: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
  },
  stepLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    fontWeight: "700",
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
