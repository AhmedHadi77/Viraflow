import { Ionicons } from "@expo/vector-icons";
import { useCopy } from "../utils/useCopy";
import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { palette, radii, spacing, createThemedStyles } from "../theme";

export interface SelectionOption {
  value: string;
  title: string;
  subtitle?: string;
  leading?: string;
  /** Extra words the search box should match (English name, currency code...). */
  keywords?: string;
}

interface SelectionSheetProps {
  visible: boolean;
  title: string;
  options: SelectionOption[];
  selectedValue: string | null | undefined;
  searchPlaceholder?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

/** Bottom sheet list with an optional search box, used for the language and region pickers. */
export function SelectionSheet({
  visible,
  title,
  options,
  selectedValue,
  searchPlaceholder,
  onSelect,
  onClose,
}: SelectionSheetProps) {
  const copy = useCopy();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return options;
    }
    return options.filter((option) =>
      [option.title, option.subtitle ?? "", option.keywords ?? "", option.value]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [options, query]);

  function close() {
    setQuery("");
    onClose();
  }

  return (
    <Modal animationType="slide" onRequestClose={close} statusBarTranslucent transparent visible={visible}>
      <View style={styles.backdrop}>
        <Pressable accessibilityRole="button" onPress={close} style={styles.backdropTouch} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable accessibilityLabel={copy.actionClose} hitSlop={12} onPress={close}>
              <Ionicons color={palette.muted} name="close" size={24} />
            </Pressable>
          </View>
          {searchPlaceholder ? (
            <View style={styles.searchBox}>
              <Ionicons color={palette.muted} name="search" size={18} />
              <TextInput
                autoCorrect={false}
                onChangeText={setQuery}
                placeholder={searchPlaceholder}
                placeholderTextColor={palette.mutedSoft}
                selectionColor={palette.primary}
                style={styles.searchInput}
                value={query}
              />
            </View>
          ) : null}
          <FlatList
            data={filtered}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => {
              const active = item.value === selectedValue;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    setQuery("");
                    onSelect(item.value);
                  }}
                  style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
                >
                  {item.leading ? <Text style={styles.leading}>{item.leading}</Text> : null}
                  <View style={styles.rowText}>
                    <Text numberOfLines={1} style={[styles.rowTitle, active ? styles.rowTitleActive : null]}>
                      {item.title}
                    </Text>
                    {item.subtitle ? (
                      <Text numberOfLines={1} style={styles.rowSubtitle}>
                        {item.subtitle}
                      </Text>
                    ) : null}
                  </View>
                  {active ? <Ionicons color={palette.primary} name="checkmark-circle" size={22} /> : null}
                </Pressable>
              );
            }}
            style={styles.list}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = createThemedStyles({
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.5)",
    flex: 1,
    justifyContent: "flex-end",
  },
  backdropTouch: {
    flex: 1,
  },
  sheet: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: "82%",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  handle: {
    alignSelf: "center",
    backgroundColor: palette.borderStrong,
    borderRadius: 3,
    height: 5,
    marginBottom: spacing.sm,
    width: 40,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  title: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "800",
  },
  searchBox: {
    alignItems: "center",
    backgroundColor: palette.input,
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    color: palette.text,
    flex: 1,
    fontSize: 15,
    paddingVertical: 10,
  },
  list: {
    flexGrow: 0,
  },
  row: {
    alignItems: "center",
    borderBottomColor: palette.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: 14,
  },
  rowPressed: {
    opacity: 0.6,
  },
  leading: {
    fontSize: 24,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "600",
  },
  rowTitleActive: {
    color: palette.primary,
    fontWeight: "800",
  },
  rowSubtitle: {
    color: palette.muted,
    fontSize: 13,
  },
});
