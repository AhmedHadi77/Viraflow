import { Ionicons } from "@expo/vector-icons";
import { useCopy } from "../utils/useCopy";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  KeyboardEvent,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DEFAULT_PROFILE_IMAGE } from "../data/defaultMedia";
import { palette, spacing, createThemedStyles } from "../theme";
import { formatRelativeTime } from "../utils/timeFormatting";
import { LanguageOption } from "../types/models";

export interface CommentsSheetItem {
  id: string;
  userName: string;
  userAvatar?: string;
  text: string;
  createdAt?: string;
}

interface CommentsSheetProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  comments: CommentsSheetItem[];
  emptyText: string;
  draft: string;
  placeholder: string;
  sendLabel: string;
  isPosting?: boolean;
  currentUserAvatar?: string;
  language?: LanguageOption | null;
  onChangeDraft: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

function useKeyboardHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (event: KeyboardEvent) => setHeight(event.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return height;
}

// A bottom sheet like the comment panels in Instagram/TikTok: list on top, composer pinned to the
// bottom that always stays above the keyboard and the system navigation bar.
export function CommentsSheet({
  visible,
  title,
  subtitle,
  comments,
  emptyText,
  draft,
  placeholder,
  sendLabel,
  isPosting = false,
  currentUserAvatar,
  language,
  onChangeDraft,
  onSubmit,
  onClose,
}: CommentsSheetProps) {
  const copy = useCopy();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const keyboardHeight = useKeyboardHeight();
  const listRef = useRef<FlatList<CommentsSheetItem>>(null);
  const canSend = draft.trim().length > 0 && !isPosting;
  const bottomSpace = keyboardHeight > 0 ? keyboardHeight : insets.bottom;
  const sheetMaxHeight = Math.max(280, windowHeight - insets.top - bottomSpace - 48);

  useEffect(() => {
    if (visible && comments.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [comments.length, visible]);

  return (
    <Modal
      animationType="slide"
      navigationBarTranslucent
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.layer}>
        <Pressable accessibilityLabel={copy.closeComments} onPress={onClose} style={styles.backdrop} />

        <View style={[styles.sheet, { maxHeight: Math.min(windowHeight * 0.75, sheetMaxHeight), marginBottom: bottomSpace }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <View style={styles.headerCenter}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? (
                <Text numberOfLines={1} style={styles.subtitle}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <Pressable accessibilityLabel={copy.actionClose} hitSlop={10} onPress={onClose} style={styles.closeButton}>
              <Ionicons color={palette.text} name="close" size={22} />
            </Pressable>
          </View>

          <FlatList
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons color={palette.muted} name="chatbubbles-outline" size={34} />
                <Text style={styles.emptyText}>{emptyText}</Text>
              </View>
            }
            contentContainerStyle={comments.length === 0 ? styles.listEmpty : styles.list}
            data={comments}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            ref={listRef}
            renderItem={({ item }) => (
              <View style={styles.commentRow}>
                <Image source={{ uri: item.userAvatar || DEFAULT_PROFILE_IMAGE }} style={styles.avatar} />
                <View style={styles.commentBody}>
                  <Text style={styles.commentMeta}>
                    <Text style={styles.commentAuthor}>{item.userName}</Text>
                    {item.createdAt ? `  ${formatRelativeTime(item.createdAt, language ?? "en", { style: "short" })}` : ""}
                  </Text>
                  <Text style={styles.commentText}>{item.text}</Text>
                </View>
              </View>
            )}
            style={styles.listView}
          />

          <View style={styles.composer}>
            <Image source={{ uri: currentUserAvatar || DEFAULT_PROFILE_IMAGE }} style={styles.composerAvatar} />
            <View style={styles.inputShell}>
              <TextInput
                maxLength={500}
                multiline
                onChangeText={onChangeDraft}
                placeholder={placeholder}
                placeholderTextColor={palette.muted}
                selectionColor={palette.primary}
                style={styles.input}
                value={draft}
              />
            </View>
            <Pressable
              accessibilityLabel={sendLabel}
              disabled={!canSend}
              hitSlop={8}
              onPress={onSubmit}
              style={[styles.sendButton, !canSend ? styles.sendButtonDisabled : null]}
            >
              {isPosting ? <ActivityIndicator color="#ffffff" size="small" /> : <Ionicons color="#ffffff" name="arrow-up" size={20} />}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = createThemedStyles({
  layer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
    width: "100%",
  },
  handle: {
    alignSelf: "center",
    backgroundColor: palette.borderStrong,
    borderRadius: 3,
    height: 4,
    marginTop: 8,
    width: 40,
  },
  header: {
    alignItems: "center",
    borderBottomColor: palette.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  headerSpacer: {
    width: 32,
  },
  headerCenter: {
    alignItems: "center",
    flex: 1,
    gap: 2,
  },
  title: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "800",
  },
  subtitle: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  closeButton: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  listView: {
    flexGrow: 0,
  },
  list: {
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  listEmpty: {
    paddingVertical: spacing.xl,
  },
  emptyWrap: {
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  commentRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  avatar: {
    backgroundColor: palette.surfaceRaised,
    borderRadius: 17,
    height: 34,
    width: 34,
  },
  commentBody: {
    flex: 1,
    gap: 2,
  },
  commentMeta: {
    color: palette.muted,
    fontSize: 12,
  },
  commentAuthor: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "700",
  },
  commentText: {
    color: palette.text,
    fontSize: 15,
    lineHeight: 21,
  },
  composer: {
    alignItems: "flex-end",
    backgroundColor: palette.surface,
    borderTopColor: palette.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  composerAvatar: {
    backgroundColor: palette.surfaceRaised,
    borderRadius: 18,
    height: 36,
    marginBottom: 2,
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
    maxHeight: 110,
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
