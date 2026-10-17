import { Ionicons } from "@expo/vector-icons";
import { useCopy } from "../utils/useCopy";
import { rtlFlipStyle } from "../utils/layoutDirection";
import { ActivityIndicator, Platform, Pressable, TextInput, View } from "react-native";
import { createThemedStyles, palette, spacing } from "../theme";

interface ChatComposerProps {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  placeholder: string;
  canSend: boolean;
  isSending?: boolean;
  editable?: boolean;
  onAttach?: () => void;
  attachActive?: boolean;
}

// Messenger-style composer: attach button, growing rounded input and a round send button,
// pinned to the bottom of chat screens.
export function ChatComposer({
  value,
  onChangeText,
  onSend,
  placeholder,
  canSend,
  isSending = false,
  editable = true,
  onAttach,
  attachActive = false,
}: ChatComposerProps) {
  const copy = useCopy();
  return (
    <View style={styles.bar}>
      {onAttach ? (
        <Pressable accessibilityLabel={copy.addPhotoOrVideo} hitSlop={8} onPress={onAttach} style={styles.iconButton}>
          <Ionicons color={attachActive ? palette.primary : palette.muted} name="image-outline" size={24} />
        </Pressable>
      ) : null}
      <View style={styles.inputShell}>
        <TextInput
          editable={editable}
          maxLength={2000}
          multiline
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={palette.muted}
          selectionColor={palette.primary}
          style={styles.input}
          value={value}
        />
      </View>
      <Pressable
        accessibilityLabel={copy.actionSend}
        disabled={!canSend || isSending}
        hitSlop={8}
        onPress={onSend}
        style={[styles.sendButton, !canSend || isSending ? styles.sendButtonDisabled : null]}
      >
        {isSending ? <ActivityIndicator color="#04110b" size="small" /> : <Ionicons color="#04110b" name="send" size={18} style={rtlFlipStyle} />}
      </Pressable>
    </View>
  );
}

const styles = createThemedStyles({
  bar: {
    alignItems: "flex-end",
    backgroundColor: palette.surface,
    borderTopColor: palette.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  iconButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 36,
  },
  inputShell: {
    backgroundColor: palette.input,
    borderColor: palette.borderStrong,
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 14,
  },
  input: {
    color: palette.text,
    fontSize: 15,
    maxHeight: 120,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    textAlignVertical: "center",
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: palette.primary,
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  sendButtonDisabled: {
    opacity: 0.35,
  },
});
