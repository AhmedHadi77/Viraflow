import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CopyStrings } from "../../data/locales/en";
import { LibrarySound, SOUND_LIBRARY, SoundGenre } from "../../data/soundLibrary";
import { useStudioMusic } from "../../services/studioMusic";
import type { StudioMusic } from "../../types/models";

const GENRE_KEYS: Record<SoundGenre, keyof CopyStrings> = {
  upbeat: "edGenreUpbeat",
  lofi: "edGenreLofi",
  acoustic: "edGenreAcoustic",
  hiphop: "edGenreHiphop",
  cinematic: "edGenreCinematic",
  electronic: "edGenreElectronic",
  arabic: "edGenreArabic",
  happy: "edGenreHappy",
  ambient: "edGenreAmbient",
};

type DocumentPickerModule = typeof import("expo-document-picker");

function getDocumentPicker(): DocumentPickerModule | null {
  try {
    return require("expo-document-picker") as DocumentPickerModule;
  } catch {
    return null;
  }
}

/** Pick a soundtrack: browse the Sohba library by mood, preview tracks, or add your own sound. */
export function MusicSheet({
  visible,
  copy,
  current,
  onPick,
  onClose,
}: {
  visible: boolean;
  copy: CopyStrings;
  current?: StudioMusic;
  onPick: (music: StudioMusic) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [genre, setGenre] = useState<SoundGenre | "all">("all");
  const [query, setQuery] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);

  const previewMusic = useMemo<StudioMusic | undefined>(() => {
    const track = SOUND_LIBRARY.find((item) => item.id === previewId);
    return track ? { trackId: track.id, title: track.title, artist: track.artist, startSeconds: 0, volume: 1 } : undefined;
  }, [previewId]);
  useStudioMusic(previewMusic, visible && Boolean(previewMusic));

  const tracks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return SOUND_LIBRARY.filter((item) => genre === "all" || item.genre === genre).filter((item) => {
      if (!normalized) {
        return true;
      }
      const genreLabel = String(copy[GENRE_KEYS[item.genre]]).toLowerCase();
      return item.title.toLowerCase().includes(normalized) || genreLabel.includes(normalized) || item.genre.includes(normalized);
    });
  }, [copy, genre, query]);

  function close() {
    setPreviewId(null);
    onClose();
  }

  function pickTrack(track: LibrarySound) {
    setPreviewId(null);
    onPick({ trackId: track.id, title: track.title, artist: track.artist, startSeconds: 0, volume: 1 });
  }

  async function pickOwnSound() {
    const picker = getDocumentPicker();
    if (!picker) {
      Alert.alert(copy.edOwnSoundUnavailable);
      return;
    }
    try {
      const result = await picker.getDocumentAsync({ type: "audio/*", copyToCacheDirectory: true, multiple: false });
      if (result.canceled || !result.assets?.[0]) {
        return;
      }
      const asset = result.assets[0];
      if (typeof asset.size === "number" && asset.size > 25 * 1024 * 1024) {
        Alert.alert(copy.edOwnSoundTooBig);
        return;
      }
      setPreviewId(null);
      onPick({
        localUri: asset.uri,
        mimeType: asset.mimeType ?? "audio/mpeg",
        title: asset.name.replace(/\.[a-z0-9]+$/i, "").slice(0, 60) || copy.edYourSound,
        artist: copy.edYourSound,
        startSeconds: 0,
        volume: 1,
      });
    } catch {
      Alert.alert(copy.edOwnSoundUnavailable);
    }
  }

  return (
    <Modal animationType="slide" onRequestClose={close} statusBarTranslucent transparent visible={visible}>
      <View style={styles.backdrop}>
        <Pressable accessibilityRole="button" onPress={close} style={styles.dismissArea} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 6 }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>{copy.edMusic}</Text>
          <View style={styles.searchBox}>
            <Ionicons color="rgba(255,255,255,0.6)" name="search" size={18} />
            <TextInput
              onChangeText={setQuery}
              placeholder={copy.edMusicSearch}
              placeholderTextColor="rgba(255,255,255,0.45)"
              style={styles.searchInput}
              value={query}
            />
          </View>
          <ScrollView contentContainerStyle={styles.genreRow} horizontal showsHorizontalScrollIndicator={false}>
            {(["all", ...Object.keys(GENRE_KEYS)] as Array<SoundGenre | "all">).map((item) => (
              <Pressable key={item} onPress={() => setGenre(item)} style={[styles.genreChip, genre === item ? styles.genreChipActive : null]}>
                <Text style={[styles.genreLabel, genre === item ? styles.genreLabelActive : null]}>
                  {item === "all" ? copy.edGenreAll : (copy[GENRE_KEYS[item]] as string)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Pressable onPress={() => void pickOwnSound()} style={styles.ownRow}>
            <View style={styles.ownIcon}>
              <Ionicons color="#04110b" name="folder-open" size={20} />
            </View>
            <View style={styles.trackText}>
              <Text style={styles.trackTitle}>{copy.edOwnSound}</Text>
              <Text style={styles.trackMeta}>{copy.edOwnSoundBody}</Text>
            </View>
            <Ionicons color="rgba(255,255,255,0.6)" name="chevron-forward" size={18} />
          </Pressable>

          <FlatList
            data={tracks}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const playing = previewId === item.id;
              const selected = current?.trackId === item.id;
              return (
                <Pressable onPress={() => pickTrack(item)} style={[styles.trackRow, selected ? styles.trackRowSelected : null]}>
                  <Pressable
                    accessibilityLabel={playing ? copy.edPausePreview : copy.edPlayPreview}
                    hitSlop={8}
                    onPress={() => setPreviewId(playing ? null : item.id)}
                    style={styles.playButton}
                  >
                    <Ionicons color="#ffffff" name={playing ? "pause" : "play"} size={18} />
                  </Pressable>
                  <View style={styles.trackText}>
                    <Text numberOfLines={1} style={styles.trackTitle}>
                      {item.title}
                    </Text>
                    <Text numberOfLines={1} style={styles.trackMeta}>
                      {copy[GENRE_KEYS[item.genre]] as string} · {item.artist} · 0:{String(item.durationSeconds).padStart(2, "0")}
                    </Text>
                  </View>
                  {selected ? (
                    <Ionicons color="#36e0a1" name="checkmark-circle" size={22} />
                  ) : (
                    <Text style={styles.useLabel}>{copy.edUse}</Text>
                  )}
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

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.35)",
    flex: 1,
    justifyContent: "flex-end",
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    backgroundColor: "#121a22",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "78%",
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  handle: {
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 3,
    height: 5,
    marginBottom: 10,
    width: 40,
  },
  title: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 10,
  },
  searchBox: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
  },
  searchInput: {
    color: "#ffffff",
    flex: 1,
    fontSize: 15,
    paddingVertical: 10,
  },
  genreRow: {
    gap: 8,
    paddingVertical: 12,
  },
  genreChip: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  genreChipActive: {
    backgroundColor: "#36e0a1",
  },
  genreLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "700",
  },
  genreLabelActive: {
    color: "#04110b",
  },
  ownRow: {
    alignItems: "center",
    backgroundColor: "rgba(54,224,161,0.12)",
    borderColor: "rgba(54,224,161,0.4)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
    padding: 12,
  },
  ownIcon: {
    alignItems: "center",
    backgroundColor: "#36e0a1",
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  list: {
    flexGrow: 0,
  },
  trackRow: {
    alignItems: "center",
    borderRadius: 14,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
  trackRowSelected: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  playButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,122,47,0.9)",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  trackText: {
    flex: 1,
    gap: 2,
  },
  trackTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  trackMeta: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
  },
  useLabel: {
    color: "#36e0a1",
    fontSize: 14,
    fontWeight: "800",
  },
});
