import { Ionicons } from "@expo/vector-icons";
import { ComponentProps, ReactNode, useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from "react-native";
import { useAppState } from "../../providers/AppProvider";
import { AdminBroadcastRow, AdminCallRow, AdminOverview, adminApi } from "../../services/adminApi";
import { palette, radii, spacing, createThemedStyles } from "../../theme";
import { formatDate, formatDateTime } from "../../utils/timeFormatting";

type IconName = ComponentProps<typeof Ionicons>["name"];

function useAdminLoader<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    loader()
      .then(setData)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load admin data."))
      .finally(() => setLoading(false));
  }, [loader]);
  useEffect(() => {
    reload();
  }, [reload]);
  return { data, error, loading, reload };
}

function PanelState({ loading, error, onRetry }: { loading: boolean; error: string | null; onRetry: () => void }) {
  if (loading) {
    return <ActivityIndicator color={palette.primary} style={{ marginVertical: spacing.xl }} />;
  }
  if (error) {
    return (
      <View style={styles.errorCard}>
        <Ionicons color={palette.danger} name="alert-circle-outline" size={22} />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable onPress={onRetry} style={styles.retry}>
          <Text style={styles.retryLabel}>Retry</Text>
        </Pressable>
      </View>
    );
  }
  return null;
}

function StatTile({ icon, label, value, hint }: { icon: IconName; label: string; value: number | string; hint?: string }) {
  return (
    <View style={styles.tile}>
      <Ionicons color={palette.muted} name={icon} size={16} />
      <Text style={styles.tileValue}>{typeof value === "number" ? value.toLocaleString() : value}</Text>
      <Text numberOfLines={1} style={styles.tileLabel}>
        {label}
      </Text>
      {hint ? (
        <Text numberOfLines={1} style={styles.tileHint}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

function StatGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.tileGrid}>{children}</View>
    </View>
  );
}

/** One-series, 14-day bar chart. Tap a bar to read its exact value. */
function DailyBars({ title, days, values }: { title: string; days: string[]; values: number[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const max = Math.max(1, ...values);
  const total = values.reduce((sum, value) => sum + value, 0);
  const focus = selected ?? values.length - 1;
  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>{title}</Text>
        <Text style={styles.chartTotal}>{total.toLocaleString()} · 14d</Text>
      </View>
      <Text style={styles.chartFocus}>
        {formatDate(days[focus], { month: "short", day: "numeric" })}: {values[focus]?.toLocaleString() ?? 0}
      </Text>
      <View style={styles.chartPlot}>
        <View style={styles.chartGridLine} />
        {values.map((value, index) => (
          <Pressable
            accessibilityLabel={`${days[index]}: ${value}`}
            hitSlop={{ top: 8, bottom: 8 }}
            key={days[index]}
            onPress={() => setSelected(index)}
            style={styles.barSlot}
          >
            <View
              style={[
                styles.bar,
                { height: `${Math.max(value > 0 ? 4 : 0, (value / max) * 100)}%` },
                index === focus ? styles.barFocus : null,
              ]}
            />
          </Pressable>
        ))}
      </View>
      <View style={styles.chartAxis}>
        <Text style={styles.axisLabel}>{formatDate(days[0], { month: "short", day: "numeric" })}</Text>
        <Text style={styles.axisLabel}>max {max.toLocaleString()}</Text>
        <Text style={styles.axisLabel}>{formatDate(days[days.length - 1], { month: "short", day: "numeric" })}</Text>
      </View>
    </View>
  );
}

export function AdminOverviewPanel() {
  const { data, error, loading, reload } = useAdminLoader<AdminOverview>(adminApi.overview);
  if (!data) {
    return <PanelState error={error} loading={loading} onRetry={reload} />;
  }
  const { totals, series } = data;
  return (
    <View style={styles.stack}>
      <View style={styles.refreshRow}>
        <Text style={styles.updated}>Updated {formatDateTime(data.generatedAt)}</Text>
        <Pressable hitSlop={8} onPress={reload}>
          <Ionicons color={palette.primary} name="refresh" size={20} />
        </Pressable>
      </View>

      <StatGroup title="Accounts">
        <StatTile icon="people-outline" label="Accounts" value={totals.users} hint={`+${totals.newUsers7d} this week`} />
        <StatTile icon="shield-checkmark-outline" label="Admins" value={totals.admins} />
        <StatTile icon="ban-outline" label="Banned" value={totals.banned} />
        <StatTile icon="phone-portrait-outline" label="Phones with push" value={totals.pushDevices} />
      </StatGroup>

      <StatGroup title="Chats & calls">
        <StatTile icon="chatbubbles-outline" label="Chats" value={totals.chats} hint={`${totals.directThreads} direct · ${totals.marketplaceThreads} shop`} />
        <StatTile icon="mail-outline" label="Messages" value={totals.messages} hint={`${totals.messages24h} in 24h`} />
        <StatTile icon="call-outline" label="Calls" value={totals.calls} hint={`${totals.calls7d} this week`} />
        <StatTile icon="videocam-outline" label="Video / voice" value={`${totals.videoCalls} / ${totals.voiceCalls}`} hint={`${totals.completedCalls} completed`} />
      </StatGroup>

      <StatGroup title="Content">
        <StatTile icon="images-outline" label="Posts" value={totals.posts} />
        <StatTile icon="play-circle-outline" label="Reels" value={totals.reels} />
        <StatTile icon="timer-outline" label="Stories" value={totals.stories} />
        <StatTile icon="chatbox-outline" label="Comments" value={totals.comments} />
        <StatTile icon="pricetag-outline" label="Listings" value={totals.products} hint={`${totals.orders} orders`} />
        <StatTile icon="people-circle-outline" label="Communities" value={totals.communities} />
      </StatGroup>

      <StatGroup title="Safety">
        <StatTile icon="flag-outline" label="Open reports" value={totals.reportsOpen} hint={`${totals.reportsTotal} total`} />
      </StatGroup>

      <DailyBars days={series.days} title="New accounts" values={series.signups} />
      <DailyBars days={series.days} title="Posts & reels" values={series.posts} />
      <DailyBars days={series.days} title="Direct messages" values={series.messages} />
      <DailyBars days={series.days} title="Calls" values={series.calls} />
      <DailyBars days={series.days} title="Reports" values={series.reports} />
    </View>
  );
}

const callStatusLabel: Record<string, string> = {
  ended: "Completed",
  accepted: "In progress",
  ringing: "Ringing",
  declined: "Declined",
  missed: "No answer",
  cancelled: "Cancelled",
  failed: "Failed",
};

export function AdminCallsPanel({ onOpenProfile }: { onOpenProfile: (userId: string) => void }) {
  const { getUserById } = useAppState();
  const { data, error, loading, reload } = useAdminLoader<AdminCallRow[]>(adminApi.calls);
  if (!data) {
    return <PanelState error={error} loading={loading} onRetry={reload} />;
  }
  if (data.length === 0) {
    return <Text style={styles.emptyText}>No calls yet.</Text>;
  }
  return (
    <View style={styles.stack}>
      {data.map((call) => {
        const caller = getUserById(call.callerId);
        const callee = getUserById(call.calleeId);
        const duration =
          typeof call.durationSeconds === "number"
            ? `${Math.floor(call.durationSeconds / 60)}:${String(call.durationSeconds % 60).padStart(2, "0")}`
            : "—";
        return (
          <View key={call.id} style={styles.row}>
            <Ionicons color={palette.muted} name={call.type === "video" ? "videocam-outline" : "call-outline"} size={20} />
            <View style={styles.rowText}>
              <Text numberOfLines={1} style={styles.rowTitle}>
                <Text onPress={() => onOpenProfile(call.callerId)}>{caller?.name ?? "Deleted user"}</Text>
                {"  →  "}
                <Text onPress={() => onOpenProfile(call.calleeId)}>{callee?.name ?? "Deleted user"}</Text>
              </Text>
              <Text style={styles.rowMeta}>
                {callStatusLabel[call.status] ?? call.status} · {duration} · {formatDateTime(call.createdAt)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function AdminBroadcastPanel() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const history = useAdminLoader<AdminBroadcastRow[]>(adminApi.broadcasts);

  function confirmSend() {
    if (!title.trim() || !body.trim()) {
      Alert.alert("Message incomplete", "Add a title and a message first.");
      return;
    }
    Alert.alert("Send to everyone?", "Every account gets this as a notification and a push message on their phone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Send", onPress: () => void send() },
    ]);
  }

  async function send() {
    setSending(true);
    try {
      const result = await adminApi.broadcast(title.trim(), body.trim());
      setTitle("");
      setBody("");
      history.reload();
      Alert.alert("Sent", `Delivered to ${result.recipients.toLocaleString()} accounts (${result.pushed.toLocaleString()} phones notified).`);
    } catch (error) {
      Alert.alert("Not sent", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.stack}>
      <View style={styles.composeCard}>
        <Text style={styles.groupTitle}>Message all users</Text>
        <TextInput
          maxLength={120}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor={palette.mutedSoft}
          style={styles.input}
          value={title}
        />
        <TextInput
          maxLength={240}
          multiline
          onChangeText={setBody}
          placeholder="Write your announcement…"
          placeholderTextColor={palette.mutedSoft}
          style={[styles.input, styles.inputMultiline]}
          value={body}
        />
        <Text style={styles.counter}>{body.length}/240</Text>
        <Pressable disabled={sending} onPress={confirmSend} style={[styles.sendButton, sending ? { opacity: 0.6 } : null]}>
          {sending ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons color="#FFFFFF" name="megaphone-outline" size={18} />}
          <Text style={styles.sendLabel}>Send to everyone</Text>
        </Pressable>
      </View>

      <Text style={styles.groupTitle}>Sent announcements</Text>
      {history.data ? (
        history.data.length === 0 ? (
          <Text style={styles.emptyText}>Nothing sent yet.</Text>
        ) : (
          history.data.map((item) => (
            <View key={item.id} style={styles.row}>
              <Ionicons color={palette.muted} name="megaphone-outline" size={18} />
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowBody}>{item.body}</Text>
                <Text style={styles.rowMeta}>
                  {formatDateTime(item.createdAt)} · {item.recipients} accounts · {item.pushed} phones
                </Text>
              </View>
            </View>
          ))
        )
      ) : (
        <PanelState error={history.error} loading={history.loading} onRetry={history.reload} />
      )}
    </View>
  );
}

const styles = createThemedStyles({
  stack: {
    gap: spacing.md,
  },
  refreshRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  updated: {
    color: palette.muted,
    fontSize: 12,
  },
  group: {
    gap: spacing.sm,
  },
  groupTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "800",
  },
  tileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tile: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    gap: 2,
    padding: spacing.md,
  },
  tileValue: {
    color: palette.text,
    fontSize: 22,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
    marginTop: 4,
  },
  tileLabel: {
    color: palette.textSoft,
    fontSize: 13,
    fontWeight: "600",
  },
  tileHint: {
    color: palette.muted,
    fontSize: 11,
  },
  chartCard: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: 6,
    padding: spacing.md,
  },
  chartHeader: {
    alignItems: "baseline",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  chartTitle: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "800",
  },
  chartTotal: {
    color: palette.muted,
    fontSize: 12,
    fontVariant: ["tabular-nums"],
  },
  chartFocus: {
    color: palette.textSoft,
    fontSize: 12,
    fontVariant: ["tabular-nums"],
  },
  chartPlot: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 2,
    height: 96,
    marginTop: 4,
  },
  chartGridLine: {
    backgroundColor: palette.border,
    bottom: 0,
    height: 1,
    left: 0,
    position: "absolute",
    right: 0,
  },
  barSlot: {
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
  },
  bar: {
    backgroundColor: palette.primaryDeep,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    opacity: 0.55,
  },
  barFocus: {
    opacity: 1,
  },
  chartAxis: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  axisLabel: {
    color: palette.muted,
    fontSize: 11,
  },
  row: {
    alignItems: "flex-start",
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "700",
  },
  rowBody: {
    color: palette.textSoft,
    fontSize: 13,
  },
  rowMeta: {
    color: palette.muted,
    fontSize: 12,
  },
  emptyText: {
    color: palette.muted,
    fontSize: 14,
    marginVertical: spacing.lg,
    textAlign: "center",
  },
  errorCard: {
    alignItems: "center",
    backgroundColor: palette.surface,
    borderRadius: radii.sm,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  errorText: {
    color: palette.textSoft,
    fontSize: 14,
    textAlign: "center",
  },
  retry: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
  },
  retryLabel: {
    color: palette.text,
    fontWeight: "700",
  },
  composeCard: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  input: {
    backgroundColor: palette.input,
    borderRadius: radii.sm,
    color: palette.text,
    fontSize: 15,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  counter: {
    alignSelf: "flex-end",
    color: palette.muted,
    fontSize: 11,
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: palette.primaryDeep,
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 12,
  },
  sendLabel: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
