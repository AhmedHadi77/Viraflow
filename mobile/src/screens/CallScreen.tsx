import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../components/Avatar";
import { ComponentProps, useEffect, useState } from "react";
import { Image, Pressable, StatusBar, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import {
  acceptCall,
  clearEndedCall,
  declineCall,
  getCall,
  hangUp,
  loadWebRtc,
  presentIncomingCall,
  switchCamera,
  toggleCamera,
  toggleMute,
  toggleSpeaker,
  useCallState,
} from "../services/calls";
import { createDarkStyles } from "../theme";

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function CallScreen({ navigation, route }: { navigation: any; route: { params: { callId: string } } }) {
  const RTCView = loadWebRtc().RTCView;
  const { language, currentUser, getUserById } = useAppState();
  const copy = getCopy(language);
  const call = useCallState();
  const [now, setNow] = useState(Date.now());
  const [loadError, setLoadError] = useState<string | null>(null);
  const callId = route.params.callId;
  const isThisCall = call.callId === callId;
  const peer = call.peerId ? getUserById(call.peerId) : undefined;

  // Opened from a notification: load the call and show it as incoming if it is still ringing.
  useEffect(() => {
    if (isThisCall) {
      return;
    }
    let active = true;
    getCall(callId)
      .then((record) => {
        if (!active) {
          return;
        }
        if (record && record.status === "ringing" && record.calleeId === currentUser?.id) {
          presentIncomingCall(record);
        } else {
          setLoadError(record?.status === "missed" || record?.status === "cancelled" ? copy.callMissed : copy.callEnded);
        }
      })
      .catch(() => active && setLoadError(copy.callUnavailable));
    return () => {
      active = false;
    };
  }, [callId, isThisCall]);

  useEffect(() => {
    if (call.phase !== "connected") {
      return;
    }
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [call.phase]);

  // Close the screen shortly after the call ends so the user sees why.
  const ended = (isThisCall && call.phase === "ended") || Boolean(loadError);
  useEffect(() => {
    if (!ended) {
      return;
    }
    const timer = setTimeout(() => {
      clearEndedCall();
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    }, 1600);
    return () => clearTimeout(timer);
  }, [ended]);

  const isVideo = call.type === "video";
  const statusText = (() => {
    if (loadError) return loadError;
    if (!isThisCall) return copy.callConnecting;
    switch (call.phase) {
      case "outgoing":
        return copy.callCalling;
      case "incoming":
        return isVideo ? copy.callIncomingVideo : copy.callIncomingVoice;
      case "connecting":
        return copy.callConnecting;
      case "connected":
        return formatDuration(Math.max(0, Math.floor((now - (call.connectedAt ?? now)) / 1000)));
      case "ended":
        return call.endReason === "declined"
          ? copy.callDeclined
          : call.endReason === "missed" || call.endReason === "cancelled"
            ? copy.callMissed
            : call.endReason === "failed"
              ? copy.callFailed
              : copy.callEnded;
      default:
        return "";
    }
  })();

  const showRemoteVideo = isVideo && call.remoteStreamUrl && call.phase === "connected";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {showRemoteVideo ? (
        <RTCView objectFit="cover" streamURL={call.remoteStreamUrl ?? undefined} style={styles.remoteVideo} zOrder={0} />
      ) : peer?.profileImage ? (
        <Image blurRadius={28} source={{ uri: peer.profileImage }} style={styles.backdrop} />
      ) : null}
      <View style={styles.scrim} />

      <SafeAreaView style={styles.safe}>
        <View style={styles.privatePill}>
          <Ionicons color="#7aa2ff" name="lock-closed" size={12} />
          <Text style={styles.privateText}>{copy.callPrivate}</Text>
        </View>
        <View style={styles.header}>
          {!showRemoteVideo ? (
            peer?.profileImage ? <Avatar name={peer.name} style={styles.avatar} uri={peer.profileImage} /> : <View style={styles.avatar} />
          ) : null}
          <Text numberOfLines={1} style={styles.name}>
            {peer?.name ?? ""}
          </Text>
          <Text style={styles.status}>{statusText}</Text>
          {call.error ? <Text style={styles.error}>{call.error}</Text> : null}
        </View>

        {isVideo && call.localStreamUrl && !call.cameraOff && call.phase !== "ended" ? (
          <RTCView mirror objectFit="cover" streamURL={call.localStreamUrl} style={styles.localVideo} zOrder={1} />
        ) : null}

        <View style={styles.controls}>
          {isThisCall && call.phase === "incoming" ? (
            <View style={styles.incomingRow}>
              <CallButton color="#ff5c5c" icon="call" label={copy.callDecline} onPress={() => void declineCall()} rotate />
              {isVideo ? (
                <CallButton color="#1e2330" icon="mic" label={copy.callAnswerAsVoice} onPress={() => void acceptCall({ asAudio: true })} />
              ) : null}
              <CallButton
                color="#12a26b"
                icon={isVideo ? "videocam" : "call"}
                label={copy.callAccept}
                onPress={() => void acceptCall()}
              />
            </View>
          ) : isThisCall && call.phase !== "ended" ? (
            <View style={styles.activeRow}>
              <CallButton
                active={call.micMuted}
                color="#1e2330"
                icon={call.micMuted ? "mic-off" : "mic"}
                label={call.micMuted ? copy.callUnmute : copy.callMute}
                onPress={toggleMute}
              />
              <CallButton
                active={call.speakerOn}
                color="#1e2330"
                icon={call.speakerOn ? "volume-high" : "volume-medium"}
                label={copy.callSpeaker}
                onPress={toggleSpeaker}
              />
              {isVideo ? (
                <>
                  <CallButton
                    active={call.cameraOff}
                    color="#1e2330"
                    icon={call.cameraOff ? "videocam-off" : "videocam"}
                    label={call.cameraOff ? copy.callCameraOn : copy.callCameraOff}
                    onPress={toggleCamera}
                  />
                  <CallButton color="#1e2330" icon="camera-reverse" label={copy.callFlip} onPress={switchCamera} />
                </>
              ) : null}
            </View>
          ) : null}
          {isThisCall && call.phase !== "ended" && call.phase !== "incoming" ? (
            <Pressable
              accessibilityLabel={copy.callEnd}
              accessibilityRole="button"
              onPress={() => void hangUp()}
              style={({ pressed }) => [styles.endButton, pressed ? styles.buttonPressed : null]}
            >
              <Ionicons color="#FFFFFF" name="call" size={32} style={{ transform: [{ rotate: "135deg" }] }} />
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

function CallButton({
  icon,
  label,
  color,
  onPress,
  rotate,
  active,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  color: string;
  onPress: () => void;
  rotate?: boolean;
  active?: boolean;
}) {
  return (
    <View style={styles.buttonWrap}>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: active ? "#FFFFFF" : color },
          pressed ? styles.buttonPressed : null,
        ]}
      >
        <Ionicons
          color={active ? "#151922" : "#FFFFFF"}
          name={icon}
          size={28}
          style={rotate ? { transform: [{ rotate: "135deg" }] } : undefined}
        />
      </Pressable>
      <Text numberOfLines={1} style={styles.buttonLabel}>
        {label}
      </Text>
    </View>
  );
}

const styles = createDarkStyles({
  container: {
    backgroundColor: "#0b0d12",
    flex: 1,
  },
  remoteVideo: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  backdrop: {
    bottom: 0,
    left: 0,
    opacity: 0.55,
    position: "absolute",
    right: 0,
    top: 0,
  },
  scrim: {
    backgroundColor: "rgba(5,10,20,0.35)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  safe: {
    flex: 1,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  avatar: {
    backgroundColor: "#1e2330",
    borderColor: "rgba(122,162,255,0.55)",
    borderRadius: 70,
    borderWidth: 3,
    height: 140,
    marginBottom: 14,
    width: 140,
  },
  name: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },
  status: {
    color: "#7aa2ff",
    fontSize: 17,
    fontWeight: "500",
  },
  error: {
    color: "#fca5a5",
    fontSize: 14,
    textAlign: "center",
  },
  localVideo: {
    borderRadius: 16,
    height: 180,
    overflow: "hidden",
    position: "absolute",
    right: 16,
    top: 56,
    width: 120,
  },
  controls: {
    paddingBottom: 36,
    paddingHorizontal: 16,
  },
  incomingRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  activeRow: {
    backgroundColor: "#151922",
    borderColor: "#262c39",
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-evenly",
    paddingVertical: 16,
    rowGap: 14,
  },
  privatePill: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(17,27,35,0.9)",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    height: 28,
    marginTop: 8,
    paddingHorizontal: 12,
  },
  privateText: {
    color: "#a0a6b2",
    fontSize: 12,
    fontWeight: "500",
  },
  endButton: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#ff5c5c",
    borderRadius: 38,
    height: 76,
    justifyContent: "center",
    marginTop: 22,
    width: 76,
  },
  buttonWrap: {
    alignItems: "center",
    gap: 8,
    width: 76,
  },
  button: {
    alignItems: "center",
    borderRadius: 32,
    height: 62,
    justifyContent: "center",
    width: 62,
  },
  buttonPressed: {
    opacity: 0.75,
  },
  buttonLabel: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
});
