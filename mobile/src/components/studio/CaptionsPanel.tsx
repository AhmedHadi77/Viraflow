import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { CopyStrings } from "../../data/locales/en";
import type { StudioCaption, StudioCaptionStyle } from "../../types/models";

const CAPTION_STYLES: Array<{ id: StudioCaptionStyle; labelKey: keyof CopyStrings }> = [
  { id: "clean", labelKey: "edCapClean" },
  { id: "box", labelKey: "edCapBox" },
  { id: "bold", labelKey: "edCapBold" },
  { id: "highlight", labelKey: "edCapHighlight" },
];

function stamp(seconds: number) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  return `${minutes}:${(safe - minutes * 60).toFixed(1).padStart(4, "0")}`;
}

/**
 * Captions: made automatically from the speech (the server listens to the finished video) or typed in at
 * the current moment, with a choice of look. Each line can be edited or removed.
 */
export function CaptionsPanel({
  captions,
  captionStyle,
  playheadSeconds,
  totalSeconds,
  copy,
  busy,
  status,
  onAuto,
  onChange,
  onStyle,
}: {
  captions: StudioCaption[];
  captionStyle: StudioCaptionStyle;
  playheadSeconds: number;
  totalSeconds: number;
  copy: CopyStrings;
  busy: boolean;
  status?: string | null;
  onAuto: () => void;
  onChange: (captions: StudioCaption[]) => void;
  onStyle: (style: StudioCaptionStyle) => void;
}) {
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<number | null>(null);

  function save() {
    const text = draft.trim();
    if (!text) {
      return;
    }
    if (editing !== null) {
      onChange(captions.map((caption, index) => (index === editing ? { ...caption, text } : caption)));
    } else {
      const start = Math.min(Math.max(0, playheadSeconds), Math.max(0, totalSeconds - 0.5));
      const next = captions.find((caption) => caption.start > start + 0.2);
      const end = Math.min(totalSeconds || start + 2.5, next ? next.start : start + 2.5, start + 6);
      onChange([...captions, { start, end: Math.max(start + 0.5, end), text }].sort((left, right) => left.start - right.start));
    }
    setDraft("");
    setEditing(null);
  }

  return (
    <View style={styles.block}>
      <View style={styles.topRow}>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onAuto}
          style={[styles.autoButton, busy ? styles.disabled : null]}
        >
          {busy ? <ActivityIndicator color="#ffffff" size="small" /> : <Ionicons color="#ffffff" name="sparkles" size={16} />}
          <Text style={styles.autoLabel}>{captions.length ? copy.edCapRedo : copy.edCapAuto}</Text>
        </Pressable>
        <ScrollView contentContainerStyle={styles.styleRow} horizontal showsHorizontalScrollIndicator={false}>
          {CAPTION_STYLES.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => onStyle(item.id)}
              style={[styles.styleChip, captionStyle === item.id ? styles.styleChipActive : null]}
            >
              <Text style={[styles.styleLabel, captionStyle === item.id ? styles.styleLabelActive : null]}>{copy[item.labelKey] as string}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      {status ? <Text style={styles.status}>{status}</Text> : null}

      <View style={styles.inputRow}>
        <TextInput
          maxLength={160}
          onChangeText={setDraft}
          onSubmitEditing={save}
          placeholder={editing !== null ? copy.edCapEditPh : `${copy.edCapAddPh} ${stamp(playheadSeconds)}`}
          placeholderTextColor="rgba(255,255,255,0.45)"
          returnKeyType="done"
          style={styles.input}
          value={draft}
        />
        <Pressable accessibilityLabel={copy.edAdd} onPress={save} style={styles.addButton}>
          <Ionicons color="#ffffff" name={editing !== null ? "checkmark" : "add"} size={20} />
        </Pressable>
      </View>

      {captions.length ? (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent} nestedScrollEnabled>
          {captions.map((caption, index) => (
            <View key={`${caption.start}-${index}`} style={[styles.line, editing === index ? styles.lineEditing : null]}>
              <Text style={styles.lineTime}>{stamp(caption.start)}</Text>
              <Pressable
                onPress={() => {
                  setEditing(index);
                  setDraft(caption.text);
                }}
                style={styles.lineTextWrap}
              >
                <Text numberOfLines={2} style={styles.lineText}>
                  {caption.text}
                </Text>
              </Pressable>
              <Pressable
                accessibilityLabel={copy.delete}
                hitSlop={8}
                onPress={() => {
                  onChange(captions.filter((_, position) => position !== index));
                  if (editing === index) {
                    setEditing(null);
                    setDraft("");
                  }
                }}
              >
                <Ionicons color="#ff8a9b" name="close-circle" size={18} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.hint}>{copy.edCapHint}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: 8,
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  autoButton: {
    alignItems: "center",
    backgroundColor: "#1f5bff",
    borderRadius: 16,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  autoLabel: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  disabled: {
    opacity: 0.6,
  },
  styleRow: {
    gap: 6,
  },
  styleChip: {
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  styleChipActive: {
    backgroundColor: "#ffffff",
    borderColor: "#ffffff",
  },
  styleLabel: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  styleLabelActive: {
    color: "#000000",
  },
  status: {
    color: "#c8ccd4",
    fontSize: 12.5,
    fontWeight: "600",
  },
  inputRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    color: "#ffffff",
    flex: 1,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  addButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 14,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  list: {
    maxHeight: 96,
  },
  listContent: {
    gap: 4,
  },
  line: {
    alignItems: "center",
    borderRadius: 10,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  lineEditing: {
    backgroundColor: "rgba(31,91,255,0.25)",
  },
  lineTime: {
    color: "#7aa2ff",
    fontSize: 11.5,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
    width: 42,
  },
  lineTextWrap: {
    flex: 1,
  },
  lineText: {
    color: "#ffffff",
    fontSize: 13,
  },
  hint: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12.5,
  },
});
