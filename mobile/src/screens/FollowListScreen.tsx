import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { FlatList, Image, Pressable, Text, TextInput, View } from "react-native";
import { Screen } from "../components/Screen";
import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { User } from "../types/models";
import { palette, radii, spacing, createThemedStyles } from "../theme";

export type FollowListMode = "followers" | "following";

/** Instagram-style followers / following lists for any profile, with search and follow buttons. */
export function FollowListScreen({
  navigation,
  route,
}: {
  navigation: any;
  route: { params: { userId: string; mode: FollowListMode } };
}) {
  const { language, currentUser, getUserById, toggleFollow } = useAppState();
  const copy = getCopy(language);
  const [mode, setMode] = useState<FollowListMode>(route.params.mode);
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const profileUser = getUserById(route.params.userId);

  const people = useMemo(() => {
    if (!profileUser) {
      return [] as User[];
    }
    const ids = mode === "followers" ? profileUser.followers : profileUser.following;
    const normalized = query.trim().toLowerCase().replace(/^@/, "");
    return [...new Set(ids)]
      .map((id) => getUserById(id))
      .filter((user): user is User => Boolean(user))
      .filter(
        (user) =>
          !normalized || user.name.toLowerCase().includes(normalized) || user.username.toLowerCase().includes(normalized)
      )
      // People you follow back and mutuals first, like Instagram.
      .sort((left, right) => {
        const leftScore = Number(currentUser?.following.includes(left.id) ?? false);
        const rightScore = Number(currentUser?.following.includes(right.id) ?? false);
        return rightScore - leftScore || left.name.localeCompare(right.name);
      });
  }, [currentUser?.following, getUserById, mode, profileUser, query]);

  async function handleFollow(userId: string) {
    setPendingId(userId);
    try {
      await toggleFollow(userId);
    } finally {
      setPendingId(null);
    }
  }

  if (!profileUser) {
    return (
      <Screen>
        <Text style={styles.empty}>{copy.noUsersMatchedTitle}</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text numberOfLines={1} style={styles.handle}>
        @{profileUser.username}
      </Text>
      <View style={styles.tabs}>
        {(["followers", "following"] as const).map((item) => {
          const active = mode === item;
          const count = item === "followers" ? profileUser.followers.length : profileUser.following.length;
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              key={item}
              onPress={() => setMode(item)}
              style={[styles.tab, active ? styles.tabActive : null]}
            >
              <Text style={[styles.tabLabel, active ? styles.tabLabelActive : null]}>
                {count} {item === "followers" ? copy.followers : copy.followingCount}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.searchBox}>
        <Ionicons color={palette.muted} name="search" size={18} />
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setQuery}
          placeholder={copy.searchUsersPlaceholder}
          placeholderTextColor={palette.mutedSoft}
          style={styles.searchInput}
          value={query}
        />
      </View>

      <FlatList
        contentContainerStyle={styles.list}
        data={people}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.empty}>{mode === "followers" ? copy.noFollowersYet : copy.noFollowingYet}</Text>
        }
        renderItem={({ item }) => {
          const isMe = item.id === currentUser?.id;
          const iFollow = currentUser?.following.includes(item.id) ?? false;
          const followsMe = currentUser ? item.following.includes(currentUser.id) : false;
          const label = iFollow ? copy.following : followsMe ? copy.followBack : copy.follow;
          return (
            <Pressable
              onPress={() => navigation.navigate("PublicProfile", { userId: item.id })}
              style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
            >
              <Image source={{ uri: item.profileImage }} style={styles.avatar} />
              <View style={styles.rowText}>
                <Text numberOfLines={1} style={styles.name}>
                  {item.name}
                </Text>
                <Text numberOfLines={1} style={styles.username}>
                  @{item.username}
                  {followsMe && !isMe ? ` · ${copy.followsYou}` : ""}
                </Text>
              </View>
              {!isMe && currentUser ? (
                <Pressable
                  disabled={pendingId === item.id}
                  onPress={() => void handleFollow(item.id)}
                  style={[styles.followButton, iFollow ? styles.followButtonMuted : null, pendingId === item.id ? styles.disabled : null]}
                >
                  <Text style={[styles.followLabel, iFollow ? styles.followLabelMuted : null]}>{label}</Text>
                </Pressable>
              ) : null}
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = createThemedStyles({
  handle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  tabs: {
    borderBottomColor: palette.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    marginBottom: spacing.md,
  },
  tab: {
    alignItems: "center",
    borderBottomColor: "transparent",
    borderBottomWidth: 2,
    flex: 1,
    paddingVertical: spacing.sm,
  },
  tabActive: {
    borderBottomColor: palette.text,
  },
  tabLabel: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: "700",
  },
  tabLabelActive: {
    color: palette.text,
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
    paddingBottom: spacing.xxl,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: 10,
  },
  rowPressed: {
    opacity: 0.6,
  },
  avatar: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: 26,
    height: 52,
    width: 52,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "700",
  },
  username: {
    color: palette.muted,
    fontSize: 13,
  },
  followButton: {
    backgroundColor: palette.primaryDeep,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  followButtonMuted: {
    backgroundColor: palette.surfaceMuted,
  },
  followLabel: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  followLabelMuted: {
    color: palette.text,
  },
  disabled: {
    opacity: 0.5,
  },
  empty: {
    color: palette.muted,
    fontSize: 14,
    marginTop: spacing.xl,
    textAlign: "center",
  },
});
