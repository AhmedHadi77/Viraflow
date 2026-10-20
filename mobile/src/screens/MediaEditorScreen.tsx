import { Ionicons } from "@expo/vector-icons";
import * as VideoThumbnails from "expo-video-thumbnails";
import { ComponentProps, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  GestureResponderEvent,
  Image,
  PanResponder,
  PanResponderGestureState,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FilterPreview } from "../components/studio/FilterPreview";
import { MusicSheet } from "../components/studio/MusicSheet";
import { StickerSheet } from "../components/studio/StickerSheet";
import { StudioStickerView, StudioTextView } from "../components/studio/StudioLayers";
import { StudioSlider } from "../components/studio/StudioSlider";
import { TextComposer } from "../components/studio/TextComposer";
import { TrimPanel } from "../components/studio/TrimPanel";
import {
  closeEditorSession,
  EditorResult,
  emptyEditorResult,
  getEditorSession,
} from "../components/studio/editorSession";
import { getCopy } from "../data/copy";
import { getStudioFilter, STUDIO_FILTERS } from "../data/studioFilters";
import { useAppState } from "../providers/AppProvider";
import { useStudioMusic } from "../services/studioMusic";
import type {
  MediaEditFilters,
  StudioMusic,
  StudioPlaybackRate,
  StudioStickerKind,
  StudioStickerLayer,
  StudioTextLayer,
} from "../types/models";
import { formatDate } from "../utils/timeFormatting";

type Tool = "filters" | "adjust" | "trim" | "speed" | "volume" | "cover" | null;
type Adjustments = Required<Pick<MediaEditFilters, "brightness" | "contrast" | "saturation" | "vignette" | "grain">>;
type ExpoVideoModule = typeof import("expo-video");

const SPEEDS: StudioPlaybackRate[] = [0.5, 1, 1.5, 2];
const NO_ADJUSTMENTS: Adjustments = { brightness: 0, contrast: 0, saturation: 0, vignette: 0, grain: 0 };

let cachedExpoVideo: ExpoVideoModule | null | undefined;
function getExpoVideo() {
  if (cachedExpoVideo !== undefined) {
    return cachedExpoVideo;
  }
  try {
    cachedExpoVideo = require("expo-video") as ExpoVideoModule;
  } catch {
    cachedExpoVideo = null;
  }
  return cachedExpoVideo;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function combineFilters(filterId: string, adjust: Adjustments): Required<MediaEditFilters> {
  const preset = getStudioFilter(filterId).filters;
  return {
    brightness: clamp(preset.brightness + adjust.brightness, -2, 2),
    contrast: clamp(preset.contrast + adjust.contrast, -2, 2),
    saturation: clamp(preset.saturation + adjust.saturation, -2, 2),
    grayscale: preset.grayscale,
    vignette: clamp(preset.vignette + adjust.vignette, 0, 100),
    grain: clamp(preset.grain + adjust.grain, 0, 100),
    sharpen: preset.sharpen,
  };
}

/** Recover the user's own adjustments from a saved result (saved filters = preset + adjustments). */
function splitAdjustments(result: EditorResult): Adjustments {
  const preset = getStudioFilter(result.filterId).filters;
  return {
    brightness: result.filters.brightness - preset.brightness,
    contrast: result.filters.contrast - preset.contrast,
    saturation: result.filters.saturation - preset.saturation,
    vignette: result.filters.vignette - preset.vignette,
    grain: result.filters.grain - preset.grain,
  };
}

/**
 * The full-screen photo and video editor for stories, reels and posts: text in several styles,
 * stickers, music from the Sohba library or your own sound, filters, adjustments, trimming, speed,
 * sound mix and cover frame. Layers can be dragged, pinched to resize and twisted to rotate.
 */
export function MediaEditorScreen({ navigation, route }: { navigation: any; route: { params: { sessionId: string } } }) {
  const session = getEditorSession(route.params.sessionId);
  const { language } = useAppState();
  const copy = getCopy(language);
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const initial = session?.initial ?? emptyEditorResult();
  const media = session?.media;
  const isVideo = media?.type === "video";
  const duration = media?.durationSeconds ?? 0;

  const [texts, setTexts] = useState<StudioTextLayer[]>(initial.studio.texts ?? []);
  const [stickers, setStickers] = useState<StudioStickerLayer[]>(initial.studio.stickers ?? []);
  const [music, setMusic] = useState<StudioMusic | undefined>(initial.studio.music);
  const [originalVolume, setOriginalVolume] = useState(initial.studio.originalVolume ?? 1);
  const [filterId, setFilterId] = useState(initial.filterId);
  const [adjust, setAdjust] = useState<Adjustments>(() => splitAdjustments(initial));
  const [trim, setTrim] = useState({ start: initial.trimStartRatio, end: initial.trimEndRatio });
  const [speed, setSpeed] = useState<StudioPlaybackRate>(initial.speed);
  const [coverRatio, setCoverRatio] = useState(initial.trimStartRatio);
  const [coverPreview, setCoverPreview] = useState<string | undefined>(initial.posterUri ?? media?.posterUri);
  const [tool, setTool] = useState<Tool>(null);
  const [textEditing, setTextEditing] = useState<{ open: boolean; layer: StudioTextLayer | null }>({ open: false, layer: null });
  const [stickerSheet, setStickerSheet] = useState(false);
  const [musicSheet, setMusicSheet] = useState(false);
  const [dragging, setDragging] = useState<{ id: string; overTrash: boolean } | null>(null);
  const [filterToast, setFilterToast] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  const filters = useMemo(() => combineFilters(filterId, adjust), [adjust, filterId]);
  const previewFilters = filters;

  // Frame: 9:16 for stories and reels, 4:5 for posts, as large as the screen allows.
  const aspect = session?.mode === "post" ? 4 / 5 : 9 / 16;
  const topBarHeight = 56;
  const bottomArea = tool ? 170 : 92;
  const availableHeight = window.height - insets.top - insets.bottom - topBarHeight - bottomArea;
  const frameWidth = Math.min(window.width, availableHeight * aspect);
  const frameHeight = frameWidth / aspect;

  const overlaysOpen = textEditing.open || stickerSheet || musicSheet;
  const musicDuration = useStudioMusic(music, Boolean(session) && !overlaysOpen);

  const finishSession = useCallback(() => {
    closeEditorSession(route.params.sessionId);
  }, [route.params.sessionId]);

  const hasChanges =
    texts.length > 0 ||
    stickers.length > 0 ||
    Boolean(music) ||
    filterId !== "normal" ||
    Object.values(adjust).some((value) => Math.abs(value) > 0.01) ||
    trim.start > 0.001 ||
    trim.end < 0.999 ||
    speed !== 1 ||
    originalVolume !== 1;

  const requestClose = useCallback(() => {
    if (!hasChanges) {
      session?.onCancel?.();
      finishSession();
      navigation.goBack();
      return true;
    }
    Alert.alert(copy.edDiscardTitle, copy.edDiscardBody, [
      { text: copy.edKeepEditing, style: "cancel" },
      {
        text: copy.edDiscard,
        style: "destructive",
        onPress: () => {
          session?.onCancel?.();
          finishSession();
          navigation.goBack();
        },
      },
    ]);
    return true;
  }, [copy, finishSession, hasChanges, navigation, session]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", requestClose);
    return () => subscription.remove();
  }, [requestClose]);

  useEffect(() => {
    if (!filterToast) {
      return;
    }
    const timer = setTimeout(() => setFilterToast(null), 900);
    return () => clearTimeout(timer);
  }, [filterToast]);

  const cycleFilter = useCallback(
    (direction: 1 | -1) => {
      setFilterId((current) => {
        const index = STUDIO_FILTERS.findIndex((item) => item.id === current);
        const next = STUDIO_FILTERS[(index + direction + STUDIO_FILTERS.length) % STUDIO_FILTERS.length];
        setFilterToast(copy[next.labelKey]);
        return next.id;
      });
    },
    [copy]
  );

  // Background of the frame: tap to add text, swipe sideways to change filter (like Instagram).
  const backgroundGestures = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 12,
        onPanResponderRelease: (_, gesture) => {
          if (Math.abs(gesture.dx) > 50 && Math.abs(gesture.dx) > Math.abs(gesture.dy)) {
            cycleFilter(gesture.dx < 0 ? 1 : -1);
            return;
          }
          if (Math.abs(gesture.dx) < 6 && Math.abs(gesture.dy) < 6) {
            if (tool) {
              setTool(null);
              return;
            }
            setTextEditing({ open: true, layer: null });
          }
        },
      }),
    [cycleFilter, tool]
  );

  const trashCenterY = insets.top + topBarHeight + frameHeight - 50;

  const updateLayer = useCallback((id: string, patch: Partial<StudioTextLayer & StudioStickerLayer>) => {
    setTexts((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    setStickers((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const removeLayer = useCallback((id: string) => {
    setTexts((current) => current.filter((item) => item.id !== id));
    setStickers((current) => current.filter((item) => item.id !== id));
  }, []);

  function addSticker(kind: StudioStickerKind, value: string) {
    setStickerSheet(false);
    setStickers((current) =>
      [
        ...current,
        {
          id: `sticker-${Date.now()}`,
          kind,
          value,
          x: 0.5,
          y: 0.45 + (current.length % 4) * 0.04,
          scale: kind === "emoji" ? 1.2 : 1,
          rotation: kind === "emoji" ? 0 : -4,
        },
      ].slice(-20)
    );
  }

  function saveText(layer: StudioTextLayer | null) {
    const editing = textEditing.layer;
    setTextEditing({ open: false, layer: null });
    if (!layer) {
      if (editing) {
        removeLayer(editing.id);
      }
      return;
    }
    setTexts((current) => {
      const exists = current.some((item) => item.id === layer.id);
      return exists ? current.map((item) => (item.id === layer.id ? layer : item)) : [...current, layer].slice(-12);
    });
  }

  async function finish() {
    if (!session || finishing) {
      return;
    }
    setFinishing(true);
    try {
      let posterUri = coverPreview;
      if (isVideo && media && duration > 0) {
        try {
          const frame = await VideoThumbnails.getThumbnailAsync(media.uri, {
            time: Math.round(clamp(coverRatio, trim.start, trim.end) * duration * 1000),
            quality: 0.8,
          });
          posterUri = frame.uri;
        } catch {
          // Keep the existing poster.
        }
      }
      const result: EditorResult = {
        filterId,
        filters,
        trimStartRatio: trim.start,
        trimEndRatio: trim.end,
        speed,
        posterUri,
        studio: {
          ...(texts.length ? { texts } : {}),
          ...(stickers.length ? { stickers } : {}),
          ...(music ? { music } : {}),
          ...(isVideo && originalVolume !== 1 ? { originalVolume } : {}),
          ...(filterId !== "normal" ? { filterName: filterId } : {}),
        },
      };
      await session.onDone(result);
      finishSession();
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } finally {
      setFinishing(false);
    }
  }

  useEffect(() => {
    if (!isVideo || !media || tool !== "cover" || duration <= 0) {
      return;
    }
    const timer = setTimeout(() => {
      void VideoThumbnails.getThumbnailAsync(media.uri, { time: Math.round(coverRatio * duration * 1000), quality: 0.4 })
        .then((frame) => setCoverPreview(frame.uri))
        .catch(() => undefined);
    }, 180);
    return () => clearTimeout(timer);
  }, [coverRatio, duration, isVideo, media, tool]);

  if (!session || !media) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.missing}>{copy.edSessionExpired}</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.doneButton}>
          <Text style={styles.doneLabel}>{copy.actionClose}</Text>
        </Pressable>
      </View>
    );
  }

  const tools: Array<{ id: string; icon: ComponentProps<typeof Ionicons>["name"]; label: string; onPress: () => void; active?: boolean }> = [
    { id: "text", icon: "text", label: copy.edText, onPress: () => setTextEditing({ open: true, layer: null }) },
    { id: "stickers", icon: "happy-outline", label: copy.edStickers, onPress: () => setStickerSheet(true) },
    // Music is for stories and reels (posts scroll by in the feed, where sound would play unasked).
    ...(session.mode !== "post"
      ? [{ id: "music", icon: "musical-notes" as const, label: copy.edMusic, onPress: () => setMusicSheet(true), active: Boolean(music) }]
      : []),
    { id: "filters", icon: "color-filter-outline", label: copy.edFilters, onPress: () => setTool(tool === "filters" ? null : "filters"), active: tool === "filters" },
    { id: "adjust", icon: "options-outline", label: copy.edAdjust, onPress: () => setTool(tool === "adjust" ? null : "adjust"), active: tool === "adjust" },
    ...(isVideo
      ? [
          { id: "trim", icon: "cut-outline" as const, label: copy.edTrim, onPress: () => setTool(tool === "trim" ? null : "trim"), active: tool === "trim" },
          { id: "speed", icon: "speedometer-outline" as const, label: copy.edSpeed, onPress: () => setTool(tool === "speed" ? null : "speed"), active: tool === "speed" },
        ]
      : []),
    ...(isVideo || music
      ? [{ id: "volume", icon: "volume-high-outline" as const, label: copy.edVolume, onPress: () => setTool(tool === "volume" ? null : "volume"), active: tool === "volume" }]
      : []),
    ...(isVideo && session.mode === "reel"
      ? [{ id: "cover", icon: "image-outline" as const, label: copy.edCover, onPress: () => setTool(tool === "cover" ? null : "cover"), active: tool === "cover" }]
      : []),
  ];

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.topBar, { marginTop: insets.top }]}>
        <Pressable accessibilityLabel={copy.cancel} hitSlop={10} onPress={requestClose} style={styles.roundButton}>
          <Ionicons color="#ffffff" name="close" size={24} />
        </Pressable>
        {music ? (
          <Pressable onPress={() => setMusicSheet(true)} style={styles.musicChip}>
            <Ionicons color="#ffffff" name="musical-note" size={14} />
            <Text numberOfLines={1} style={styles.musicChipLabel}>
              {music.title}
            </Text>
            <Pressable accessibilityLabel={copy.edRemoveMusic} hitSlop={8} onPress={() => setMusic(undefined)}>
              <Ionicons color="rgba(255,255,255,0.8)" name="close-circle" size={16} />
            </Pressable>
          </Pressable>
        ) : (
          <View style={styles.flexSpacer} />
        )}
        <Pressable disabled={finishing} onPress={() => void finish()} style={styles.doneButton}>
          {finishing ? <ActivityIndicator color="#04110b" /> : <Text style={styles.doneLabel}>{session.doneLabel ?? copy.edNext}</Text>}
        </Pressable>
      </View>

      <View style={[styles.frame, { height: frameHeight, width: frameWidth }]}>
        <View style={StyleSheet.absoluteFill} {...backgroundGestures.panHandlers}>
          {isVideo ? (
            <EditorVideo
              originalVolume={originalVolume}
              paused={overlaysOpen}
              speed={speed}
              trimEnd={trim.end}
              trimStart={trim.start}
              uri={media.uri}
            />
          ) : (
            <Image resizeMode="cover" source={{ uri: media.uri }} style={StyleSheet.absoluteFill} />
          )}
          <FilterPreview filters={previewFilters} />
        </View>

        {stickers.map((layer) => (
          <EditableLayer
            frameHeight={frameHeight}
            frameWidth={frameWidth}
            key={layer.id}
            layer={layer}
            onDragState={setDragging}
            onRemove={removeLayer}
            onUpdate={updateLayer}
            trashCenterY={trashCenterY}
            windowWidth={window.width}
          >
            <StudioStickerView frameWidth={frameWidth} layer={layer} />
          </EditableLayer>
        ))}
        {texts.map((layer) => (
          <EditableLayer
            frameHeight={frameHeight}
            frameWidth={frameWidth}
            key={layer.id}
            layer={layer}
            onDragState={setDragging}
            onRemove={removeLayer}
            onTap={() => setTextEditing({ open: true, layer })}
            onUpdate={updateLayer}
            trashCenterY={trashCenterY}
            windowWidth={window.width}
          >
            <StudioTextView frameWidth={frameWidth} layer={layer} />
          </EditableLayer>
        ))}

        {filterToast ? (
          <View pointerEvents="none" style={styles.toast}>
            <Text style={styles.toastLabel}>{filterToast}</Text>
          </View>
        ) : null}

        {dragging ? (
          <View pointerEvents="none" style={[styles.trash, dragging.overTrash ? styles.trashActive : null]}>
            <Ionicons color="#ffffff" name="trash-outline" size={24} />
          </View>
        ) : (
          <View pointerEvents="box-none" style={styles.rail}>
            {tools.map((item) => (
              <Pressable accessibilityLabel={item.label} hitSlop={4} key={item.id} onPress={item.onPress} style={styles.railItem}>
                <View style={[styles.railIcon, item.active ? styles.railIconActive : null]}>
                  {item.id === "text" ? <Text style={styles.railAa}>Aa</Text> : <Ionicons color="#ffffff" name={item.icon} size={21} />}
                </View>
                <Text numberOfLines={1} style={styles.railLabel}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View style={[styles.bottomArea, { paddingBottom: insets.bottom + 10 }]}>
        {tool === "filters" ? (
          <ScrollView contentContainerStyle={styles.filterRow} horizontal showsHorizontalScrollIndicator={false}>
            {STUDIO_FILTERS.map((item) => {
              const active = item.id === filterId;
              return (
                <Pressable key={item.id} onPress={() => setFilterId(item.id)} style={styles.filterItem}>
                  <View style={[styles.filterThumbWrap, active ? styles.filterThumbActive : null]}>
                    <Image source={{ uri: isVideo ? coverPreview || media.posterUri || media.uri : media.uri }} style={styles.filterThumb} />
                    <FilterPreview filters={item.filters} />
                  </View>
                  <Text style={[styles.filterLabel, active ? styles.filterLabelActive : null]}>{copy[item.labelKey]}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {tool === "adjust" ? (
          <ScrollView contentContainerStyle={styles.panel}>
            <StudioSlider
              formatValue={(value) => `${Math.round(value * 50)}`}
              label={copy.csBrightness}
              max={1}
              min={-1}
              onChange={(value) => setAdjust((current) => ({ ...current, brightness: value }))}
              value={adjust.brightness}
            />
            <StudioSlider
              formatValue={(value) => `${Math.round(value * 50)}`}
              label={copy.csContrast}
              max={1}
              min={-1}
              onChange={(value) => setAdjust((current) => ({ ...current, contrast: value }))}
              value={adjust.contrast}
            />
            <StudioSlider
              formatValue={(value) => `${Math.round(value * 50)}`}
              label={copy.csSaturation}
              max={1}
              min={-1}
              onChange={(value) => setAdjust((current) => ({ ...current, saturation: value }))}
              value={adjust.saturation}
            />
            <StudioSlider
              formatValue={(value) => `${Math.round(value)}`}
              label={copy.edVignette}
              max={60}
              min={0}
              onChange={(value) => setAdjust((current) => ({ ...current, vignette: value }))}
              value={adjust.vignette}
            />
            <StudioSlider
              formatValue={(value) => `${Math.round(value)}`}
              label={copy.edGrain}
              max={40}
              min={0}
              onChange={(value) => setAdjust((current) => ({ ...current, grain: value }))}
              value={adjust.grain}
            />
            <Pressable onPress={() => setAdjust(NO_ADJUSTMENTS)} style={styles.resetButton}>
              <Text style={styles.resetLabel}>{copy.edReset}</Text>
            </Pressable>
          </ScrollView>
        ) : null}

        {tool === "trim" && isVideo ? (
          <View style={styles.panel}>
            <TrimPanel
              durationSeconds={duration}
              endRatio={trim.end}
              label={copy.edTrim}
              onChange={(start, end) => setTrim({ start, end })}
              startRatio={trim.start}
              uri={media.uri}
            />
          </View>
        ) : null}

        {tool === "speed" && isVideo ? (
          <View style={[styles.panel, styles.speedRow]}>
            {SPEEDS.map((item) => (
              <Pressable key={item} onPress={() => setSpeed(item)} style={[styles.speedChip, speed === item ? styles.speedChipActive : null]}>
                <Text style={[styles.speedLabel, speed === item ? styles.speedLabelActive : null]}>{item}x</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {tool === "volume" ? (
          <View style={styles.panel}>
            {isVideo ? (
              <StudioSlider
                formatValue={(value) => `${Math.round(value * 100)}%`}
                label={copy.edOriginalSound}
                max={1}
                min={0}
                onChange={setOriginalVolume}
                value={originalVolume}
              />
            ) : null}
            {music ? (
              <>
                <StudioSlider
                  accent="#ff7a2f"
                  formatValue={(value) => `${Math.round(value * 100)}%`}
                  label={copy.edMusicVolume}
                  max={1}
                  min={0}
                  onChange={(value) => setMusic((current) => (current ? { ...current, volume: value } : current))}
                  value={music.volume}
                />
                <StudioSlider
                  accent="#ff7a2f"
                  formatValue={(value) => `0:${String(Math.round(value)).padStart(2, "0")}`}
                  label={copy.edMusicStart}
                  max={Math.max(1, (musicDuration || music.durationSeconds || 30) - 5)}
                  min={0}
                  onChange={(value) => setMusic((current) => (current ? { ...current, startSeconds: Math.round(value) } : current))}
                  value={music.startSeconds}
                />
              </>
            ) : null}
          </View>
        ) : null}

        {tool === "cover" && isVideo ? (
          <View style={[styles.panel, styles.coverRow]}>
            {coverPreview ? <Image source={{ uri: coverPreview }} style={styles.coverThumb} /> : <View style={styles.coverThumb} />}
            <View style={styles.flexSpacer}>
              <StudioSlider label={copy.edCoverPick} max={trim.end} min={trim.start} onChange={setCoverRatio} value={clamp(coverRatio, trim.start, trim.end)} />
            </View>
          </View>
        ) : null}

        {!tool ? (
          <Text numberOfLines={2} style={styles.hint}>
            {copy.edHint}
          </Text>
        ) : null}
      </View>

      <TextComposer
        copy={copy}
        layer={textEditing.layer}
        onCancel={() => setTextEditing({ open: false, layer: null })}
        onDone={saveText}
        visible={textEditing.open}
      />
      <StickerSheet
        copy={copy}
        onClose={() => setStickerSheet(false)}
        onPick={addSticker}
        timeLabel={formatDate(Date.now(), { hour: "2-digit", minute: "2-digit" })}
        visible={stickerSheet}
      />
      <MusicSheet
        copy={copy}
        current={music}
        onClose={() => setMusicSheet(false)}
        onPick={(picked) => {
          setMusic(picked);
          setMusicSheet(false);
          setTool("volume");
        }}
        visible={musicSheet}
      />
    </View>
  );
}

/** One movable layer: drag with one finger, pinch to resize and twist to rotate with two. */
function EditableLayer({
  layer,
  frameWidth,
  frameHeight,
  trashCenterY,
  windowWidth,
  onUpdate,
  onRemove,
  onDragState,
  onTap,
  children,
}: {
  layer: StudioTextLayer | StudioStickerLayer;
  frameWidth: number;
  frameHeight: number;
  trashCenterY: number;
  windowWidth: number;
  onUpdate: (id: string, patch: { x?: number; y?: number; scale?: number; rotation?: number }) => void;
  onRemove: (id: string) => void;
  onDragState: (state: { id: string; overTrash: boolean } | null) => void;
  onTap?: () => void;
  children: React.ReactNode;
}) {
  const latest = useRef({ layer, frameWidth, frameHeight, trashCenterY, windowWidth, onUpdate, onRemove, onDragState, onTap });
  latest.current = { layer, frameWidth, frameHeight, trashCenterY, windowWidth, onUpdate, onRemove, onDragState, onTap };
  const gesture = useRef({ x: 0, y: 0, scale: 1, rotation: 0, distance: 0, angle: 0, pinching: false, moved: false, overTrash: false });

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          const current = latest.current.layer;
          gesture.current = { x: current.x, y: current.y, scale: current.scale, rotation: current.rotation, distance: 0, angle: 0, pinching: false, moved: false, overTrash: false };
        },
        onPanResponderMove: (event: GestureResponderEvent, state: PanResponderGestureState) => {
          const touches = event.nativeEvent.touches;
          const { frameWidth: width, frameHeight: height, layer: current } = latest.current;
          if (touches.length >= 2) {
            const [a, b] = touches;
            const distance = Math.hypot(b.pageX - a.pageX, b.pageY - a.pageY);
            const angle = (Math.atan2(b.pageY - a.pageY, b.pageX - a.pageX) * 180) / Math.PI;
            if (!gesture.current.pinching) {
              gesture.current = { ...gesture.current, pinching: true, distance, angle, scale: current.scale, rotation: current.rotation };
              return;
            }
            gesture.current.moved = true;
            const scale = clamp(gesture.current.scale * (distance / Math.max(1, gesture.current.distance)), 0.3, 4);
            let rotation = gesture.current.rotation + (angle - gesture.current.angle);
            if (rotation > 180) rotation -= 360;
            if (rotation < -180) rotation += 360;
            latest.current.onUpdate(current.id, { scale, rotation: Math.abs(rotation) < 3 ? 0 : rotation });
            return;
          }
          if (gesture.current.pinching) {
            return;
          }
          if (Math.abs(state.dx) > 3 || Math.abs(state.dy) > 3) {
            gesture.current.moved = true;
          }
          const x = clamp(gesture.current.x + state.dx / width, 0.02, 0.98);
          const y = clamp(gesture.current.y + state.dy / height, 0.02, 0.98);
          // Snap to the centre line, like Instagram's guide.
          latest.current.onUpdate(current.id, { x: Math.abs(x - 0.5) < 0.02 ? 0.5 : x, y });
          const overTrash =
            Math.abs(state.moveY - latest.current.trashCenterY) < 46 && Math.abs(state.moveX - latest.current.windowWidth / 2) < 60;
          if (overTrash !== gesture.current.overTrash || gesture.current.moved) {
            gesture.current.overTrash = overTrash;
            latest.current.onDragState({ id: current.id, overTrash });
          }
        },
        onPanResponderRelease: () => {
          const { layer: current } = latest.current;
          latest.current.onDragState(null);
          if (gesture.current.overTrash) {
            latest.current.onRemove(current.id);
            return;
          }
          if (!gesture.current.moved) {
            latest.current.onTap?.();
          }
        },
        onPanResponderTerminate: () => latest.current.onDragState(null),
      }),
    []
  );

  const boxWidth = frameWidth * 1.6;
  return (
    <View
      pointerEvents="box-none"
      style={{
        alignItems: "center",
        height: 0,
        justifyContent: "center",
        left: layer.x * frameWidth - boxWidth / 2,
        position: "absolute",
        top: layer.y * frameHeight,
        width: boxWidth,
      }}
    >
      <View
        {...responder.panHandlers}
        style={{ alignItems: "center", maxWidth: frameWidth * 0.95, padding: 6, transform: [{ rotate: `${layer.rotation}deg` }] }}
      >
        {children}
      </View>
    </View>
  );
}

/** Looping video preview that follows the trim, speed and sound settings. */
function EditorVideo({
  uri,
  trimStart,
  trimEnd,
  speed,
  originalVolume,
  paused,
}: {
  uri: string;
  trimStart: number;
  trimEnd: number;
  speed: number;
  originalVolume: number;
  paused: boolean;
}) {
  const ExpoVideo = getExpoVideo();
  if (!ExpoVideo) {
    return <View style={[StyleSheet.absoluteFill, styles.videoFallback]} />;
  }
  return (
    <EditorVideoPlayer
      ExpoVideo={ExpoVideo}
      originalVolume={originalVolume}
      paused={paused}
      speed={speed}
      trimEnd={trimEnd}
      trimStart={trimStart}
      uri={uri}
    />
  );
}

function EditorVideoPlayer({
  ExpoVideo,
  uri,
  trimStart,
  trimEnd,
  speed,
  originalVolume,
  paused,
}: {
  ExpoVideo: ExpoVideoModule;
  uri: string;
  trimStart: number;
  trimEnd: number;
  speed: number;
  originalVolume: number;
  paused: boolean;
}) {
  const player = ExpoVideo.useVideoPlayer(uri, (instance) => {
    instance.loop = true;
    instance.play();
  });
  const windowRef = useRef({ trimStart, trimEnd });
  windowRef.current = { trimStart, trimEnd };

  useEffect(() => {
    try {
      player.playbackRate = speed;
      player.volume = originalVolume;
      player.muted = originalVolume <= 0.001;
    } catch {
      // Player not ready yet.
    }
  }, [originalVolume, player, speed]);

  useEffect(() => {
    try {
      if (paused) {
        player.pause();
      } else {
        player.play();
      }
    } catch {
      // Player not ready yet.
    }
  }, [paused, player]);

  // Keep playback inside the trimmed part.
  useEffect(() => {
    const timer = setInterval(() => {
      try {
        const duration = player.duration;
        if (!duration || duration <= 0) {
          return;
        }
        const start = windowRef.current.trimStart * duration;
        const end = windowRef.current.trimEnd * duration;
        if (player.currentTime < start - 0.05 || player.currentTime > end) {
          player.currentTime = start;
        }
      } catch {
        // Ignore while loading.
      }
    }, 150);
    return () => clearInterval(timer);
  }, [player]);

  useEffect(() => {
    try {
      const duration = player.duration;
      if (duration > 0) {
        player.currentTime = trimStart * duration;
      }
    } catch {
      // Ignore while loading.
    }
  }, [player, trimStart]);

  return <ExpoVideo.VideoView contentFit="cover" nativeControls={false} player={player} style={StyleSheet.absoluteFill} />;
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#000000",
    flex: 1,
  },
  center: {
    alignItems: "center",
    gap: 16,
    justifyContent: "center",
  },
  missing: {
    color: "#ffffff",
    fontSize: 16,
    paddingHorizontal: 32,
    textAlign: "center",
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    height: 56,
    paddingHorizontal: 12,
  },
  flexSpacer: {
    flex: 1,
  },
  roundButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  musicChip: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 18,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  musicChipLabel: {
    color: "#ffffff",
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
  },
  doneButton: {
    alignItems: "center",
    backgroundColor: "#36e0a1",
    borderRadius: 20,
    justifyContent: "center",
    minHeight: 40,
    minWidth: 84,
    paddingHorizontal: 18,
  },
  doneLabel: {
    color: "#04110b",
    fontSize: 15,
    fontWeight: "800",
  },
  frame: {
    alignSelf: "center",
    backgroundColor: "#0b0f14",
    borderRadius: 18,
    overflow: "hidden",
  },
  videoFallback: {
    backgroundColor: "#111820",
  },
  rail: {
    gap: 12,
    position: "absolute",
    right: 8,
    top: 12,
  },
  railItem: {
    alignItems: "center",
    width: 56,
  },
  railIcon: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.42)",
    borderRadius: 21,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  railIconActive: {
    backgroundColor: "#36e0a1",
  },
  railAa: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "900",
  },
  railLabel: {
    color: "#ffffff",
    fontSize: 10.5,
    fontWeight: "700",
    marginTop: 3,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  toast: {
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 8,
    position: "absolute",
    top: "45%",
  },
  toastLabel: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
  },
  trash: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderColor: "#ffffff",
    borderRadius: 30,
    borderWidth: 2,
    bottom: 20,
    height: 60,
    justifyContent: "center",
    position: "absolute",
    width: 60,
  },
  trashActive: {
    backgroundColor: "#ef4444",
    borderColor: "#ef4444",
    transform: [{ scale: 1.15 }],
  },
  bottomArea: {
    flex: 1,
    justifyContent: "flex-start",
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  hint: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    textAlign: "center",
  },
  panel: {
    gap: 10,
  },
  filterRow: {
    gap: 10,
  },
  filterItem: {
    alignItems: "center",
    gap: 5,
  },
  filterThumbWrap: {
    borderColor: "transparent",
    borderRadius: 12,
    borderWidth: 2,
    height: 74,
    overflow: "hidden",
    width: 58,
  },
  filterThumbActive: {
    borderColor: "#36e0a1",
  },
  filterThumb: {
    height: "100%",
    width: "100%",
  },
  filterLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11.5,
    fontWeight: "700",
  },
  filterLabelActive: {
    color: "#ffffff",
  },
  resetButton: {
    alignSelf: "flex-start",
    paddingVertical: 6,
  },
  resetLabel: {
    color: "#ff7a2f",
    fontSize: 13,
    fontWeight: "800",
  },
  speedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  speedChip: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 18,
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 12,
  },
  speedChipActive: {
    backgroundColor: "#36e0a1",
  },
  speedLabel: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  speedLabelActive: {
    color: "#04110b",
  },
  coverRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  coverThumb: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderColor: "#36e0a1",
    borderRadius: 10,
    borderWidth: 2,
    height: 84,
    width: 48,
  },
});
