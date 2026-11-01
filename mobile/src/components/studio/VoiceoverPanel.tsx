import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { CopyStrings } from "../../data/locales/en";
import type { StudioVoiceover } from "../../types/models";
import { StudioSlider } from "./StudioSlider";

type ExpoAudioModule = typeof import("expo-audio");
type AudioPlayer = ReturnType<ExpoAudioModule["createAudioPlayer"]>;

let cachedAudio: ExpoAudioModule | null | undefined;
function getExpoAudio() {
  if (cachedAudio !== undefined) {
    return cachedAudio;
  }
  try {
    cachedAudio = require("expo-audio") as ExpoAudioModule;
  } catch {
    cachedAudio = null;
  }
  return cachedAudio;
}

export function isVoiceoverAvailable() {
  return Boolean(getExpoAudio());
}

function clock(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

/**
 * Narration: record your voice while the video plays from the start (recording stops by itself at the
 * end), listen back with the video, set its volume, or record again.
 */
export function VoiceoverPanel(props: {
  voiceover?: StudioVoiceover;
  originalVolume: number;
  copy: CopyStrings;
  /** Changes when the video reaches its end (recording stops there). */
  endSignal: number;
  onRecordingChange: (recording: boolean) => void;
  onRecorded: (voiceover: StudioVoiceover) => void;
  onVolume: (volume: number) => void;
  onOriginalVolume: (volume: number) => void;
  onRemove: () => void;
  onError: (message: string) => void;
}) {
  const audio = getExpoAudio();
  if (!audio) {
    return <Text style={styles.hint}>{props.copy.edVoiceUnavailable}</Text>;
  }
  return <VoiceRecorder audio={audio} {...props} />;
}

function VoiceRecorder({
  audio,
  voiceover,
  originalVolume,
  copy,
  endSignal,
  onRecordingChange,
  onRecorded,
  onVolume,
  onOriginalVolume,
  onRemove,
  onError,
}: {
  audio: ExpoAudioModule;
  voiceover?: StudioVoiceover;
  originalVolume: number;
  copy: CopyStrings;
  endSignal: number;
  onRecordingChange: (recording: boolean) => void;
  onRecorded: (voiceover: StudioVoiceover) => void;
  onVolume: (volume: number) => void;
  onOriginalVolume: (volume: number) => void;
  onRemove: () => void;
  onError: (message: string) => void;
}) {
  const recorder = audio.useAudioRecorder(audio.RecordingPresets.HIGH_QUALITY);
  const state = audio.useAudioRecorderState(recorder, 250);
  const [recording, setRecording] = useState(false);
  const recordingRef = useRef(false);
  const startedAt = useRef(0);
  const [elapsed, setElapsed] = useState(0);

  async function start() {
    try {
      const permission = await audio.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        onError(copy.edVoiceNeedMic);
        return;
      }
      await audio.setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      recordingRef.current = true;
      startedAt.current = Date.now();
      setElapsed(0);
      setRecording(true);
      onRecordingChange(true);
    } catch {
      onError(copy.edVoiceFailed);
      recordingRef.current = false;
      setRecording(false);
      onRecordingChange(false);
    }
  }

  async function stop() {
    if (!recordingRef.current) {
      return;
    }
    recordingRef.current = false;
    setRecording(false);
    onRecordingChange(false);
    try {
      await recorder.stop();
      await audio.setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const uri = recorder.uri;
      const seconds = Math.max(0.5, (Date.now() - startedAt.current) / 1000);
      if (uri && seconds >= 0.8) {
        onRecorded({ uri, volume: voiceover?.volume ?? 1, durationSeconds: Math.round(seconds * 10) / 10 });
      }
    } catch {
      onError(copy.edVoiceFailed);
    }
  }

  // The video reached its end: recording stops there.
  const firstSignal = useRef(endSignal);
  useEffect(() => {
    if (endSignal !== firstSignal.current) {
      void stop();
    }
    // Only when the signal changes.
  }, [endSignal]);

  useEffect(() => {
    if (!recording) {
      return;
    }
    const timer = setInterval(() => setElapsed((Date.now() - startedAt.current) / 1000), 250);
    return () => clearInterval(timer);
  }, [recording]);

  // Stop a recording left running when the panel closes.
  useEffect(
    () => () => {
      if (recordingRef.current) {
        recordingRef.current = false;
        onRecordingChange(false);
        void recorder.stop().catch(() => undefined);
      }
    },
    []
  );

  return (
    <View style={styles.block}>
      <View style={styles.row}>
        <Pressable
          accessibilityLabel={recording ? copy.edVoiceStop : copy.edVoiceRecord}
          accessibilityRole="button"
          onPress={() => void (recording ? stop() : start())}
          style={[styles.recordButton, recording ? styles.recordButtonOn : null]}
        >
          <View style={recording ? styles.stopGlyph : styles.recordGlyph} />
        </Pressable>
        <View style={styles.info}>
          <Text style={styles.title}>
            {recording ? `${copy.edVoiceRecording} ${clock(state.durationMillis ? state.durationMillis / 1000 : elapsed)}` : voiceover ? copy.edVoiceReady : copy.edVoiceRecord}
          </Text>
          <Text style={styles.hint}>{recording ? copy.edVoiceStopHint : voiceover ? copy.edVoiceReadyHint : copy.edVoiceHint}</Text>
        </View>
        {voiceover && !recording ? (
          <Pressable accessibilityLabel={copy.delete} hitSlop={8} onPress={onRemove} style={styles.iconButton}>
            <Ionicons color="#ff8a9b" name="trash-outline" size={18} />
          </Pressable>
        ) : null}
      </View>
      {voiceover && !recording ? (
        <StudioSlider
          accent="#e5294f"
          formatValue={(value) => `${Math.round(value * 100)}%`}
          label={copy.edVoiceVolume}
          max={1.5}
          min={0.1}
          onChange={onVolume}
          value={voiceover.volume}
        />
      ) : null}
      {!recording ? (
        <StudioSlider
          formatValue={(value) => `${Math.round(value * 100)}%`}
          label={copy.edOriginalSound}
          max={1}
          min={0}
          onChange={onOriginalVolume}
          value={originalVolume}
        />
      ) : null}
    </View>
  );
}

/** Plays the recorded narration along with the editor's preview, starting again whenever the video does. */
export function useVoiceoverPreview(voiceover: StudioVoiceover | undefined, playing: boolean, restartKey: number) {
  const playerRef = useRef<AudioPlayer | null>(null);
  const uri = voiceover?.uri || voiceover?.url;
  const volume = voiceover?.volume ?? 1;

  useEffect(() => {
    const audio = getExpoAudio();
    if (!audio || !uri) {
      return;
    }
    let player: AudioPlayer | null = null;
    try {
      player = audio.createAudioPlayer({ uri });
      playerRef.current = player;
    } catch {
      playerRef.current = null;
    }
    return () => {
      try {
        player?.pause();
        player?.remove();
      } catch {
        // Already released.
      }
      if (playerRef.current === player) {
        playerRef.current = null;
      }
    };
  }, [uri]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) {
      return;
    }
    try {
      player.volume = Math.min(1, volume);
    } catch {
      // Not ready.
    }
  }, [volume, uri]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) {
      return;
    }
    try {
      if (playing) {
        void player.seekTo(0);
        player.play();
      } else {
        player.pause();
      }
    } catch {
      // Not ready.
    }
  }, [playing, restartKey, uri]);
}

const styles = StyleSheet.create({
  block: {
    gap: 10,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  recordButton: {
    alignItems: "center",
    borderColor: "#ffffff",
    borderRadius: 28,
    borderWidth: 3,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  recordButtonOn: {
    borderColor: "#e5294f",
  },
  recordGlyph: {
    backgroundColor: "#e5294f",
    borderRadius: 20,
    height: 40,
    width: 40,
  },
  stopGlyph: {
    backgroundColor: "#e5294f",
    borderRadius: 6,
    height: 22,
    width: 22,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: "#ffffff",
    fontSize: 15,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
  },
  hint: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12.5,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
});
