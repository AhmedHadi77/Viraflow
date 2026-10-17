import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { CallType } from "../services/calls";
import { palette, createThemedStyles } from "../theme";

/** Voice and video call icons for a profile or chat header. */
export function CallButtons({ userId, navigation, size = 22 }: { userId: string; navigation: any; size?: number }) {
  const { language, currentUser, placeCall } = useAppState();
  const copy = getCopy(language);
  const [busy, setBusy] = useState(false);

  if (!currentUser || currentUser.id === userId) {
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
        style={({ pressed }) => [styles.button, pressed || busy ? styles.pressed : null]}
      >
        <Ionicons color={palette.text} name="call-outline" size={size} />
      </Pressable>
      <Pressable
        accessibilityLabel={copy.callVideo}
        accessibilityRole="button"
        disabled={busy}
        hitSlop={8}
        onPress={() => void handleCall("video")}
        style={({ pressed }) => [styles.button, pressed || busy ? styles.pressed : null]}
      >
        <Ionicons color={palette.text} name="videocam-outline" size={size + 2} />
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
  pressed: {
    opacity: 0.5,
  },
});
