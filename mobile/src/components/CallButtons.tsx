import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { CallType } from "../services/calls";
import { palette, createThemedStyles } from "../theme";
import { brandTints } from "./GradientIcon";
import { isCallConnection } from "../utils/callConnection";

/** Voice and video call icons for a profile or chat header. */
export function CallButtons({
  userId,
  navigation,
  size = 22,
  compact = false,
}: {
  userId: string;
  navigation: any;
  size?: number;
  /** Smaller buttons for list rows. */
  compact?: boolean;
}) {
  const { language, currentUser, getUserById, placeCall } = useAppState();
  const copy = getCopy(language);
  const [busy, setBusy] = useState(false);

  if (!currentUser || currentUser.id === userId) {
    return null;
  }

  // Calls are for people you're connected with: someone you follow, or someone who follows you.
  if (!isCallConnection(currentUser, userId, getUserById(userId))) {
    return null;
  }

  async function handleCall(type: CallType) {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      const result = await placeCall(userId, type);
      if (result.ok && result.callId) {
        const rootNavigation = navigation.getParent?.() ?? navigation;
        rootNavigation.navigate("Call", { callId: result.callId });
      } else {
        Alert.alert(copy.callUnavailable, result.message ?? copy.callFailed);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityLabel={copy.callVoice}
        accessibilityRole="button"
        disabled={busy}
        hitSlop={8}
        onPress={() => void handleCall("audio")}
        style={({ pressed }) => [styles.button, compact ? styles.compact : null, pressed || busy ? styles.pressed : null]}
      >
        <Ionicons color={brandTints.green} name="call" size={compact ? size - 2 : size} />
      </Pressable>
      <Pressable
        accessibilityLabel={copy.callVideo}
        accessibilityRole="button"
        disabled={busy}
        hitSlop={8}
        onPress={() => void handleCall("video")}
        style={({ pressed }) => [styles.button, compact ? styles.compact : null, pressed || busy ? styles.pressed : null]}
      >
        <Ionicons color={brandTints.cyan} name="videocam" size={compact ? size : size + 2} />
      </Pressable>
    </View>
  );
}

const styles = createThemedStyles({
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  button: {
    alignItems: "center",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  compact: {
    backgroundColor: palette.surfaceMuted,
    height: 34,
    width: 34,
  },
  pressed: {
    opacity: 0.5,
  },
});

