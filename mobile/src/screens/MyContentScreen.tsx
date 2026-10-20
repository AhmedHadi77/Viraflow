import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, Pressable, Text, View } from "react-native";
import { Screen } from "../components/Screen";
import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { palette, radii, spacing, createThemedStyles } from "../theme";
import { fill } from "../utils/labels";
import { formatRelativeTime } from "../utils/timeFormatting";

type ContentKind = "posts" | "reels" | "stories" | "products";

interface ContentRow {
  id: string;
  kind: ContentKind;
  title: string;
  imageUrl?: string;
  createdAt: string;
  open: () => void;
}

/** Everything the signed-in person has published, in one place, each item deletable. */
export function MyContentScreen({ navigation }: { navigation: any }) {
  const { language, currentUser, posts, reels, stories, products, deletePost, deleteReel, deleteStory, deleteProduct } =
    useAppState();
  const copy = getCopy(language);
  const [kind, setKind] = useState<ContentKind>("posts");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const rows = useMemo<Record<ContentKind, ContentRow[]>>(() => {
    const me = currentUser?.id;
    if (!me) {
      return { posts: [], reels: [], stories: [], products: [] };
    }
    const byNewest = (a: ContentRow, b: ContentRow) => b.createdAt.localeCompare(a.createdAt);
    return {
      posts: posts
        .filter((item) => item.userId === me)
        .map((item) => ({
          id: item.id,
          kind: "posts" as const,
          title: item.caption || copy.post,
          imageUrl: item.media[0]?.thumbnailUrl || item.media[0]?.url,
          createdAt: item.createdAt,
          open: () => navigation.navigate("PostDetails", { postId: item.id }),
        }))
        .sort(byNewest),
      reels: reels
        .filter((item) => item.userId === me)
        .map((item) => ({
          id: item.id,
          kind: "reels" as const,
          title: item.caption || copy.reels,
          imageUrl: item.thumbnailUrl,
          createdAt: item.createdAt,
          open: () => navigation.navigate("ReelViewer", { reelId: item.id }),
        }))
        .sort(byNewest),
      stories: stories
        .filter((item) => item.userId === me)
        .map((item) => ({
          id: item.id,
          kind: "stories" as const,
          title: item.caption || copy.storyFallbackLabel,
          imageUrl: item.imageUrl,
          createdAt: item.createdAt,
          open: () => navigation.navigate("StoryViewer", { userId: me, storyId: item.id }),
        }))
        .sort(byNewest),
      products: products
        .filter((item) => item.userId === me)
        .map((item) => ({
          id: item.id,
          kind: "products" as const,
          title: item.title,
          imageUrl: item.imageUrl,
          createdAt: item.createdAt,
          open: () => navigation.navigate("ProductDetails", { productId: item.id }),
        }))
        .sort(byNewest),
    };
  }, [copy, currentUser?.id, navigation, posts, products, reels, stories]);

  const tabs: Array<{ kind: ContentKind; label: string }> = [
    { kind: "posts", label: copy.posts },
    { kind: "reels", label: copy.reels },
    { kind: "stories", label: copy.mcStories },
    { kind: "products", label: copy.shop },
  ];

  function confirmDelete(row: ContentRow) {
    Alert.alert(copy.mcDeleteTitle, copy.mcDeleteBody, [
      { text: copy.cancel, style: "cancel" },
      {
        text: copy.delete,
        style: "destructive",
        onPress: () => void runDelete(row),
      },
    ]);
  }

  async function runDelete(row: ContentRow) {
    setDeletingId(row.id);
    try {
      const result =
        row.kind === "posts"
          ? await deletePost(row.id)
          : row.kind === "reels"
            ? await deleteReel(row.id)
            : row.kind === "stories"
              ? await deleteStory(row.id)
              : await deleteProduct(row.id);
      if (!result.ok) {
        Alert.alert(copy.mcDeleteFailed, result.message ?? copy.authErrGeneric);
      }
    } finally {
      setDeletingId(null);
    }
  }

  const data = rows[kind];

  return (
    <Screen>
      <Text style={styles.title}>{copy.mcTitle}</Text>
      <Text style={styles.subtitle}>{copy.mcSubtitle}</Text>
      <View style={styles.tabs}>
        {tabs.map((tab) => {
          const active = tab.kind === kind;
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              key={tab.kind}
              onPress={() => setKind(tab.kind)}
              style={[styles.tab, active ? styles.tabActive : null]}
            >
              <Text numberOfLines={1} style={[styles.tabLabel, active ? styles.tabLabelActive : null]}>
                {tab.label} {rows[tab.kind].length}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <FlatList
        contentContainerStyle={styles.list}
        data={data}
        keyExtractor={(item) => `${item.kind}-${item.id}`}
        ListEmptyComponent={<Text style={styles.empty}>{copy.mcEmpty}</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={item.open} style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.thumbEmpty]}>
                <Ionicons color={palette.muted} name="document-text-outline" size={22} />
              </View>
            )}
            <View style={styles.rowText}>
              <Text numberOfLines={2} style={styles.rowTitle}>
                {item.title}
              </Text>
              <Text style={styles.rowMeta}>{formatRelativeTime(item.createdAt, language)}</Text>
            </View>
            {deletingId === item.id ? (
              <ActivityIndicator color={palette.accent} />
            ) : (
              <Pressable
                accessibilityLabel={fill(copy.mcDeleteItem, { name: item.title })}
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => confirmDelete(item)}
                style={styles.deleteButton}
              >
                <Ionicons color={palette.danger} name="trash-outline" size={20} />
              </Pressable>
            )}
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = createThemedStyles({
  title: {
    color: palette.text,
    fontSize: 24,
    fontWeight: "900",
    marginTop: spacing.sm,
  },
  subtitle: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  tabs: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.pill,
    flexDirection: "row",
    marginBottom: spacing.md,
    padding: 4,
  },
  tab: {
    alignItems: "center",
    borderRadius: radii.pill,
    flex: 1,
    paddingVertical: 9,
  },
  tabActive: {
    backgroundColor: palette.primary,
  },
  tabLabel: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  tabLabelActive: {
    color: "#ffffff",
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  row: {
    alignItems: "center",
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.sm,
  },
  pressed: {
    opacity: 0.75,
  },
  thumb: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.sm,
    height: 56,
    width: 56,
  },
  thumbEmpty: {
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "700",
  },
  rowMeta: {
    color: palette.muted,
    fontSize: 12,
  },
  deleteButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  empty: {
    color: palette.muted,
    fontSize: 14,
    marginTop: spacing.xl,
    textAlign: "center",
  },
});
