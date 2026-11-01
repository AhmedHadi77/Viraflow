import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
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
  Platform,
  Pressable,
  Switch,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CaptionsPanel } from "../components/studio/CaptionsPanel";
import { ClipActions, ClipStrip, formatClock, TransitionPicker } from "../components/studio/ClipsPanel";
import { CloudPreviewSheet, CloudPreviewState } from "../components/studio/CloudPreviewSheet";
import { BRUSH_SIZES, Brush, DrawCapture, DrawPanel } from "../components/studio/DrawTools";
import { CanvasPanel, PhotoEffectsPanel, VideoEffectsPanel } from "../components/studio/EffectsPanels";
import { combineFilters, docFromResult, isVideoDoc, NO_ADJUST, resultFromDoc, useEditorHistory } from "../components/studio/editorDoc";
import { closeEditorSession, EditorMedia, getEditorSession } from "../components/studio/editorSession";
import { FilterPreview } from "../components/studio/FilterPreview";
import { MusicSheet } from "../components/studio/MusicSheet";
import { StickerDraft, StickerSheet } from "../components/studio/StickerSheet";
import {
  AnimatedSticker,
  AnimatedStudioText,
  captionAt,
  isTextVisibleAt,
  STUDIO_STICKER_ANIMATIONS,
  StudioCaptionView,
  StudioDrawingView,
  StudioStickerView,
} from "../components/studio/StudioLayers";
import { StudioSlider } from "../components/studio/StudioSlider";
import { buildPublishMedia, clipSeconds, timelineSeconds } from "../components/studio/studioPlan";
import { TextComposer } from "../components/studio/TextComposer";
import { CanvasFrame, SeekRequest, TimelinePlayer, TimelineTime } from "../components/studio/TimelinePlayer";
import { TrimPanel } from "../components/studio/TrimPanel";
import { isVoiceoverAvailable, useVoiceoverPreview, VoiceoverPanel } from "../components/studio/VoiceoverPanel";
import { getCopy } from "../data/copy";
import { fill } from "../utils/labels";
import { STUDIO_FILTERS } from "../data/studioFilters";
import { useAppState } from "../providers/AppProvider";
import { buildCloudinaryEditedAudioUrl } from "../services/mediaUpload";
import { STUDIO_ASPECT_RATIOS } from "../services/studioRender";
import { useStudioMusic } from "../services/studioMusic";
import type { CopyStrings } from "../data/locales/en";
import type { StudioClip, StudioPlaybackRate, StudioStickerAnimation, StudioStickerLayer, StudioTextLayer } from "../types/models";
import { formatDate } from "../utils/timeFormatting";

type Tool =
  | "clips"
  | "draw"
  | "captions"
  | "voice"
  | "effects"
  | "filters"
  | "adjust"
  | "canvas"
  | "speed"
  | "trim"
  | "volume"
  | "cover"
  | "sticker";

const SPEEDS: StudioPlaybackRate[] = [0.5, 0.75, 1, 1.25, 1.5, 2];
const STICKER_ANIMATION_LABELS: Record<StudioStickerAnimation, keyof CopyStrings> = {
  none: "edAnimNone",
  pop: "edAnimPop",
  pulse: "edAnimPulse",
  bounce: "edAnimBounce",
  float: "edAnimFloat",
  swing: "edAnimSwing",
  wiggle: "edAnimWiggle",
  heartbeat: "edAnimHeartbeat",
  rotate: "edAnimRotate",
};
const MAX_CLIPS = 10;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const TOP_BAR = 52;
const TOOLBAR = 70;
const STRIP = 62;
const PANEL = 196;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const FALLBACK_MEDIA: EditorMedia = { uri: "", type: "image" };

/**
 * Sohba Studio: a full-screen editor for stories, reels and posts. Join several clips and photos with
 * transitions, split, reorder and trim them; add text (styles, animations, timing), stickers (polls,
 * questions, countdowns, links), drawings, automatic captions, music and a recorded voiceover; apply
 * filters, adjustments, video effects (reverse, boomerang, loop, fades, stabilize), photo looks, speed
 * and the frame (shape, fit, background, turn, mirror). Everything can be undone, and the finished
 * result can be previewed exactly as it will be shared.
 */
export function MediaEditorScreen({ navigation, route }: { navigation: any; route: { params: { sessionId: string } } }) {
  const session = getEditorSession(route.params.sessionId);
  const { language, renderStudioPreview, transcribeStudioCaptions } = useAppState();
  const copy = getCopy(language);
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const media = session?.media ?? FALLBACK_MEDIA;
  const mode = session?.mode ?? "post";

  const { doc, update, replace, undo, redo, canUndo, canRedo, changed } = useEditorHistory(() =>
    docFromResult(media, mode, session?.initial)
  );
  const [tool, setTool] = useState<Tool | null>(null);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(doc.timeline[0]?.id ?? null);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [transitionFor, setTransitionFor] = useState<string | null>(null);
  const [textEditing, setTextEditing] = useState<{ open: boolean; layer: StudioTextLayer | null }>({ open: false, layer: null });
  const [stickerSheet, setStickerSheet] = useState(false);
  const [musicSheet, setMusicSheet] = useState(false);
  const [dragging, setDragging] = useState<{ id: string; overTrash: boolean } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [paused, setPaused] = useState(false);
  const [playhead, setPlayhead] = useState<TimelineTime>({ clipIndex: 0, localSeconds: 0, globalSeconds: 0 });
  const [seek, setSeek] = useState<SeekRequest | null>(null);
  const [loopKey, setLoopKey] = useState(0);
  const [recording, setRecording] = useState(false);
  const [brush, setBrush] = useState<Brush>({ color: "#ffffff", width: BRUSH_SIZES[1], glow: false });
  const [captionBusy, setCaptionBusy] = useState(false);
  const [captionStatus, setCaptionStatus] = useState<string | null>(null);
  const [cloud, setCloud] = useState<CloudPreviewState | null>(null);
  const [photoFx, setPhotoFx] = useState<{ key: string; url: string } | null>(null);
  const [photoFxLoading, setPhotoFxLoading] = useState(false);
  const [photoFxNote, setPhotoFxNote] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | undefined>(session?.initial?.posterUri ?? media.posterUri);
  const lastPlayheadUpdate = useRef(0);

  const isVideo = isVideoDoc(doc);
  const timeline = doc.timeline;
  const selectedIndex = Math.max(0, timeline.findIndex((clip) => clip.id === selectedClipId));
  const selectedClip = timeline[selectedIndex];
  const totalSeconds = isVideo ? timelineSeconds(timeline, doc.speed) : 0;
  const filters = useMemo(() => combineFilters(doc.filterId, doc.adjust), [doc.adjust, doc.filterId]);
  const baseVideoClip = timeline.find((clip) => clip.type === "video");
  const overlaysOpen = textEditing.open || stickerSheet || musicSheet || Boolean(cloud);
  const previewPaused = paused || overlaysOpen || finishing;

  // Frame shape: the chosen shape, otherwise 9:16 for stories and reels and 4:5 for posts.
  const aspect = doc.canvas.aspect !== "original" ? STUDIO_ASPECT_RATIOS[doc.canvas.aspect] : mode === "post" ? 4 / 5 : 9 / 16;
  const showStrip = isVideo || tool === "clips";
  const panelOpen = Boolean(tool);
  const availableHeight =
    window.height - insets.top - insets.bottom - TOP_BAR - TOOLBAR - (showStrip ? STRIP : 0) - (panelOpen ? PANEL : 0) - 8;
  const frameWidth = Math.max(120, Math.min(window.width - 16, availableHeight * aspect));
  const frameHeight = frameWidth / aspect;

  // Music plays with the preview (not while recording a voiceover, so the microphone doesn't pick it up).
  const musicDuration = useStudioMusic(doc.music, Boolean(session) && !overlaysOpen && !previewPaused && !recording);
  useVoiceoverPreview(isVideo && !recording ? doc.voiceover : undefined, !previewPaused, loopKey);

  const showToast = useCallback((message: string) => setToast(message), []);
  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(timer);
  }, [toast]);

  const finishSession = useCallback(() => {
    closeEditorSession(route.params.sessionId);
  }, [route.params.sessionId]);

  const requestClose = useCallback(() => {
    if (tool) {
      setTool(null);
      setTransitionFor(null);
      return true;
    }
    if (!changed) {
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
  }, [changed, copy, finishSession, navigation, session, tool]);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }
    const subscription = BackHandler.addEventListener("hardwareBackPress", requestClose);
    return () => subscription.remove();
  }, [requestClose]);

  const handleTime = useCallback((time: TimelineTime) => {
    const now = Date.now();
    if (now - lastPlayheadUpdate.current < 140) {
      return;
    }
    lastPlayheadUpdate.current = now;
    setPlayhead(time);
  }, []);

  const handleLoop = useCallback(() => setLoopKey((value) => value + 1), []);

  function seekTo(clipIndex: number, offsetSeconds = 0) {
    setSeek({ clipIndex, offsetSeconds, token: Date.now() });
  }

  // ---- Layers -------------------------------------------------------------------------------------

  const cycleFilter = useCallback(
    (direction: 1 | -1) => {
      const index = STUDIO_FILTERS.findIndex((item) => item.id === doc.filterId);
      const next = STUDIO_FILTERS[(index + direction + STUDIO_FILTERS.length) % STUDIO_FILTERS.length];
      update((current) => ({ ...current, filterId: next.id }));
      setToast(copy[next.labelKey]);
    },
    [copy, doc.filterId, update]
  );

  // Frame background: tap to add text, swipe sideways to change filter (like Instagram).
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
              setTransitionFor(null);
              return;
            }
            setTextEditing({ open: true, layer: null });
          }
        },
      }),
    [cycleFilter, tool]
  );

  // The frame sits centred in the space between the top bar and the tools.
  const frameTop = insets.top + TOP_BAR + Math.max(0, (availableHeight + 8 - frameHeight) / 2);
  const trashCenterY = frameTop + frameHeight - 50;

  const updateLayer = useCallback(
    (id: string, patch: Partial<StudioTextLayer & StudioStickerLayer>) => {
      update(
        (current) => ({
          ...current,
          texts: current.texts.map((item) => (item.id === id ? { ...item, ...patch } : item)),
          stickers: current.stickers.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        }),
        `layer-${id}`
      );
    },
    [update]
  );

  const removeLayer = useCallback(
    (id: string) => {
      update((current) => ({
        ...current,
        texts: current.texts.filter((item) => item.id !== id),
        stickers: current.stickers.filter((item) => item.id !== id),
      }));
    },
    [update]
  );

  function addSticker(sticker: StickerDraft) {
    setStickerSheet(false);
    update((current) => ({
      ...current,
      stickers: [
        ...current.stickers,
        {
          id: `sticker-${Date.now()}`,
          ...sticker,
          x: 0.5,
          y: 0.45 + (current.stickers.length % 4) * 0.04,
          scale: sticker.kind === "emoji" ? 1.2 : 1,
          rotation: sticker.kind === "emoji" || sticker.kind === "poll" || sticker.kind === "question" ? 0 : -4,
        },
      ].slice(-20),
    }));
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
    update((current) => {
      const exists = current.texts.some((item) => item.id === layer.id);
      return {
        ...current,
        texts: exists ? current.texts.map((item) => (item.id === layer.id ? layer : item)) : [...current.texts, layer].slice(-12),
      };
    });
  }

  // ---- Clips --------------------------------------------------------------------------------------

  /** Changes one clip. A photo's length or motion change makes its earlier "photo video" upload stale. */
  function updateClip(id: string, patch: Partial<StudioClip>, key?: string) {
    update((current) => ({
      ...current,
      timeline: current.timeline.map((clip) => {
        if (clip.id !== id) {
          return clip;
        }
        const next = { ...clip, ...patch };
        if (("imageSeconds" in patch || "motion" in patch) && clip.renderedAs === "video") {
          delete next.publicId;
          delete next.renderedAs;
        }
        return next;
      }),
      photoVideoRemote:
        current.photoVideoRemote?.clipId === id && ("imageSeconds" in patch || "motion" in patch) ? undefined : current.photoVideoRemote,
    }), key);
  }

  async function pickClips() {
    if (timeline.length >= MAX_CLIPS) {
      showToast(fill(copy.edMaxClips, { count: MAX_CLIPS }));
      return;
    }
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(copy.mediaAccessNeededTitle, copy.csMediaAccessStudio);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        allowsMultipleSelection: true,
        selectionLimit: MAX_CLIPS - timeline.length,
        quality: 0.85,
      });
      if (result.canceled) {
        return;
      }
      const fitting = result.assets.filter(
        (asset) => !(typeof asset.fileSize === "number" && asset.fileSize > (asset.type === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES))
      );
      if (fitting.length < result.assets.length) {
        showToast(copy.csFileTooBig);
      }
      const added: StudioClip[] = [];
      for (let index = 0; index < fitting.length; index += 1) {
        const asset = fitting[index];
        const isClipVideo = asset.type === "video";
        let posterUri: string | undefined;
        if (isClipVideo) {
          try {
            posterUri = (await VideoThumbnails.getThumbnailAsync(asset.uri, { time: 500, quality: 0.5 })).uri;
          } catch {
            posterUri = undefined;
          }
        }
        added.push({
          id: `clip-${Date.now().toString(36)}-${index}`,
          uri: asset.uri,
          type: isClipVideo ? "video" : "image",
          durationSeconds: isClipVideo && typeof asset.duration === "number" ? Math.max(1, asset.duration / 1000) : undefined,
          trimStartRatio: 0,
          trimEndRatio: 1,
          ...(isClipVideo ? {} : { imageSeconds: 3, motion: true }),
          posterUri,
          mimeType: asset.mimeType ?? undefined,
          fileName: asset.fileName ?? undefined,
        });
      }
      if (added.length === 0) {
        return;
      }
      update((current) => {
        const nextTimeline = [...current.timeline, ...added].slice(0, MAX_CLIPS);
        // Joined clips need a fixed frame shape.
        const canvas =
          current.canvas.aspect === "original" ? { ...current.canvas, aspect: mode === "post" ? ("4:5" as const) : ("9:16" as const) } : current.canvas;
        return { ...current, timeline: nextTimeline, canvas };
      });
      setSelectedClipId(added[0].id);
      setTool("clips");
    } catch {
      showToast(copy.csPickerUnavailable);
    }
  }

  function splitSelected() {
    const clip = selectedClip;
    if (!clip || clip.type !== "video" || !clip.durationSeconds) {
      return;
    }
    if (playhead.clipIndex !== selectedIndex) {
      showToast(copy.edSplitHint);
      return;
    }
    const ratio = clip.trimStartRatio + playhead.localSeconds / clip.durationSeconds;
    const minGap = 0.4 / clip.durationSeconds;
    if (ratio - clip.trimStartRatio < minGap || clip.trimEndRatio - ratio < minGap) {
      showToast(copy.edSplitHint);
      return;
    }
    const second: StudioClip = { ...clip, id: `clip-${Date.now().toString(36)}-s`, trimStartRatio: ratio, transition: "none" };
    update((current) => {
      const index = current.timeline.findIndex((item) => item.id === clip.id);
      const next = [...current.timeline];
      next.splice(index, 1, { ...clip, trimEndRatio: ratio }, second);
      return { ...current, timeline: next.slice(0, MAX_CLIPS) };
    });
    setSelectedClipId(second.id);
  }

  function duplicateSelected() {
    if (!selectedClip || timeline.length >= MAX_CLIPS) {
      return;
    }
    const copyClip: StudioClip = { ...selectedClip, id: `clip-${Date.now().toString(36)}-d` };
    update((current) => {
      const next = [...current.timeline];
      next.splice(selectedIndex + 1, 0, copyClip);
      return { ...current, timeline: next };
    });
    setSelectedClipId(copyClip.id);
  }

  function moveSelected(direction: -1 | 1) {
    const target = selectedIndex + direction;
    if (target < 0 || target >= timeline.length) {
      return;
    }
    update((current) => {
      const next = [...current.timeline];
      const [moved] = next.splice(selectedIndex, 1);
      next.splice(target, 0, moved);
      return { ...current, timeline: next };
    });
  }

  function deleteSelected() {
    if (timeline.length <= 1 || !selectedClip) {
      return;
    }
    const nextSelected = timeline[selectedIndex + 1]?.id ?? timeline[selectedIndex - 1]?.id ?? null;
    update((current) => ({ ...current, timeline: current.timeline.filter((clip) => clip.id !== selectedClip.id) }));
    setSelectedClipId(nextSelected);
    seekTo(0);
  }

  // ---- Cloud (preview, captions, photo looks) -------------------------------------------------------

  function progressMessage(progress: { stage: "uploading" | "rendering"; done?: number; total?: number }) {
    if (progress.stage === "uploading" && progress.total && progress.total > 1) {
      return fill(copy.edPreviewUploadingCount, { done: Math.min(progress.total, (progress.done ?? 0) + 1), total: progress.total });
    }
    return progress.stage === "uploading" ? copy.edPreviewUploading : copy.edPreviewRendering;
  }

  /** Remembers what the cloud preview uploaded, so sharing reuses it instead of uploading again. */
  function rememberUploads(plan: ReturnType<typeof buildPublishMedia>, response: Extract<Awaited<ReturnType<typeof renderStudioPreview>>, { ok: true }>) {
    replace((current) => {
      let nextTimeline = current.timeline;
      let photoVideoRemote = current.photoVideoRemote;
      if (plan.type === "image") {
        const only = current.timeline[0];
        if (only && !only.remoteUrl) {
          nextTimeline = [{ ...only, remoteUrl: response.baseUrl }];
        }
      } else if (plan.editConfig?.photoVideo) {
        photoVideoRemote = { clipId: current.timeline[0].id, seconds: plan.editConfig.photoVideo.seconds, url: response.baseUrl };
      } else {
        const baseId = current.timeline.find((clip) => clip.type === "video")?.id;
        nextTimeline = current.timeline.map((clip) => (clip.id === baseId && !clip.remoteUrl ? { ...clip, remoteUrl: response.baseUrl } : clip));
      }
      const prepared = new Map((response.editConfig?.clips ?? []).map((clip) => [clip.id, clip]));
      nextTimeline = nextTimeline.map((clip) => {
        const uploaded = prepared.get(clip.id);
        return uploaded?.publicId
          ? { ...clip, publicId: uploaded.publicId, remoteUrl: uploaded.remoteUrl ?? clip.remoteUrl, ...(uploaded.renderedAs ? { renderedAs: uploaded.renderedAs } : {}) }
          : clip;
      });
      const voice = response.editConfig?.voiceover;
      const voiceover =
        current.voiceover && voice?.publicId && !current.voiceover.publicId ? { ...current.voiceover, publicId: voice.publicId, url: voice.url } : current.voiceover;
      return { ...current, timeline: nextTimeline, photoVideoRemote, voiceover };
    });
  }

  /** Turns a technical failure into words people understand. */
  function friendlyError(message: string | undefined) {
    if (!message || /failed to fetch|network request failed|network error|timed? ?out/i.test(message)) {
      return copy.netOffline;
    }
    return message;
  }

  async function renderInCloud(onMessage: (message: string) => void) {
    const result = resultFromDoc(doc, coverPreview);
    const plan = buildPublishMedia(media, result, mode);
    const response = await renderStudioPreview({
      uri: plan.uri,
      type: plan.type,
      mimeType: plan.mimeType,
      fileName: plan.fileName,
      durationSeconds: plan.durationSeconds,
      editConfig: plan.editConfig,
      mode,
      onProgress: (progress) => onMessage(progressMessage(progress)),
    });
    if (response.ok) {
      rememberUploads(plan, response);
    }
    return { response, plan };
  }

  async function openCloudPreview() {
    setPaused(true);
    setCloud({ status: "working", message: copy.edPreviewUploading });
    const { response } = await renderInCloud((message) => setCloud({ status: "working", message }));
    setCloud(response.ok ? { status: "ready", kind: response.kind, url: response.url } : { status: "error", message: friendlyError(response.message) });
  }

  async function makeAutoCaptions() {
    if (captionBusy) {
      return;
    }
    setCaptionBusy(true);
    setCaptionStatus(copy.edPreviewUploading);
    try {
      const { response } = await renderInCloud(setCaptionStatus);
      if (!response.ok || response.kind !== "video") {
        setCaptionStatus(response.ok ? copy.edCapFailed : friendlyError(response.message));
        return;
      }
      setCaptionStatus(copy.edCapListening);
      const audioUrl = buildCloudinaryEditedAudioUrl(response.baseUrl, response.editConfig, { mode });
      const captions = await transcribeStudioCaptions(audioUrl);
      if (!captions.ok) {
        setCaptionStatus(captions.unavailable ? copy.edCapUnavailable : friendlyError(captions.message ?? copy.edCapFailed));
        return;
      }
      if (!captions.captions?.length) {
        setCaptionStatus(copy.edCapNone);
        return;
      }
      update((current) => ({ ...current, captions: captions.captions ?? [] }));
      setCaptionStatus(fill(copy.edCapDone, { count: captions.captions.length }));
    } finally {
      setCaptionBusy(false);
    }
  }

  // Photo looks are made by the media service, so the photo is shown as it will be shared.
  const photoClip = !isVideo ? timeline[0] : undefined;
  const photoFxKey = photoClip && doc.photoEffect !== "none" ? `${photoClip.id}:${doc.photoEffect}` : null;
  useEffect(() => {
    if (!photoFxKey || !photoClip || photoFx?.key === photoFxKey) {
      return;
    }
    let cancelled = false;
    setPhotoFxLoading(true);
    setPhotoFxNote(null);
    void renderStudioPreview({
      uri: photoClip.remoteUrl || photoClip.uri,
      type: "image",
      mimeType: photoClip.mimeType,
      fileName: photoClip.fileName,
      editConfig: { photoEffect: doc.photoEffect },
      mode,
    }).then((response) => {
      if (cancelled) {
        return;
      }
      setPhotoFxLoading(false);
      if (!response.ok) {
        setPhotoFxNote(copy.edFxPreviewFailed);
        return;
      }
      setPhotoFx({ key: photoFxKey, url: response.url });
      if (!photoClip.remoteUrl) {
        replace((current) => ({
          ...current,
          timeline: current.timeline.map((clip) => (clip.id === photoClip.id ? { ...clip, remoteUrl: response.baseUrl } : clip)),
        }));
      }
    });
    return () => {
      cancelled = true;
      setPhotoFxLoading(false);
    };
    // Only when the chosen look changes.
  }, [photoFxKey]);

  // ---- Finish -------------------------------------------------------------------------------------

  async function finish() {
    if (!session || finishing || recording) {
      return;
    }
    setFinishing(true);
    try {
      let posterUri = coverPreview;
      if (baseVideoClip?.durationSeconds) {
        try {
          const ratio = clamp(doc.coverRatio, baseVideoClip.trimStartRatio, baseVideoClip.trimEndRatio);
          const frame = await VideoThumbnails.getThumbnailAsync(baseVideoClip.uri, {
            time: Math.round(ratio * baseVideoClip.durationSeconds * 1000),
            quality: 0.8,
          });
          posterUri = frame.uri;
        } catch {
          posterUri = baseVideoClip.posterUri ?? posterUri;
        }
      } else if (isVideo && timeline[0]?.type === "image") {
        posterUri = timeline[0].uri;
      }
      await session.onDone(resultFromDoc(doc, posterUri));
      finishSession();
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } finally {
      setFinishing(false);
    }
  }

  useEffect(() => {
    if (tool !== "cover" || !baseVideoClip?.durationSeconds) {
      return;
    }
    const timer = setTimeout(() => {
      void VideoThumbnails.getThumbnailAsync(baseVideoClip.uri, {
        time: Math.round(doc.coverRatio * (baseVideoClip.durationSeconds ?? 0) * 1000),
        quality: 0.4,
      })
        .then((frame) => setCoverPreview(frame.uri))
        .catch(() => undefined);
    }, 180);
    return () => clearTimeout(timer);
  }, [baseVideoClip?.durationSeconds, baseVideoClip?.uri, doc.coverRatio, tool]);

  if (!session || !media.uri) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.missing}>{copy.edSessionExpired}</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.doneButton}>
          <Text style={styles.doneLabel}>{copy.actionClose}</Text>
        </Pressable>
      </View>
    );
  }

  const tools: Array<{ id: Tool | "text" | "stickers" | "music"; icon: ComponentProps<typeof Ionicons>["name"]; label: string; hidden?: boolean }> = [
    { id: "clips", icon: "film-outline", label: copy.edToolClips },
    { id: "text", icon: "text", label: copy.edText },
    { id: "stickers", icon: "happy-outline", label: copy.edStickers },
    // Music is for stories and reels (posts scroll by in the feed, where sound would play unasked).
    { id: "music", icon: "musical-notes-outline", label: copy.edMusic, hidden: mode === "post" },
    { id: "effects", icon: "sparkles-outline", label: copy.edEffects },
    { id: "filters", icon: "color-filter-outline", label: copy.edFilters },
    { id: "adjust", icon: "options-outline", label: copy.edAdjust },
    { id: "canvas", icon: "crop-outline", label: copy.edCanvas },
    { id: "draw", icon: "brush-outline", label: copy.edDraw },
    { id: "captions", icon: "chatbox-ellipses-outline", label: copy.edCaptions, hidden: !isVideo },
    { id: "voice", icon: "mic-outline", label: copy.edVoice, hidden: !isVideo || !isVoiceoverAvailable() },
    { id: "speed", icon: "speedometer-outline", label: copy.edSpeed, hidden: !isVideo },
    { id: "trim", icon: "cut-outline", label: copy.edTrim, hidden: !isVideo },
    { id: "volume", icon: "volume-high-outline", label: copy.edVolume, hidden: !isVideo && !doc.music },
    { id: "cover", icon: "image-outline", label: copy.edCover, hidden: mode !== "reel" || !baseVideoClip },
  ];

  function pressTool(id: (typeof tools)[number]["id"]) {
    setTransitionFor(null);
    if (id === "text") {
      setTextEditing({ open: true, layer: null });
      return;
    }
    if (id === "stickers") {
      setStickerSheet(true);
      return;
    }
    if (id === "music") {
      setMusicSheet(true);
      return;
    }
    if (id === "trim" && selectedClip?.type !== "video") {
      const firstVideo = timeline.find((clip) => clip.type === "video");
      if (firstVideo) {
        setSelectedClipId(firstVideo.id);
      } else if (selectedClip) {
        // A photo's "trim" is how long it shows.
        setTool("clips");
        return;
      }
    }
    setTool((current) => (current === id ? null : id));
  }

  const caption = isVideo ? captionAt(doc.captions, playhead.globalSeconds) : null;
  const loopTrimIndex = tool === "trim" && selectedClip?.type === "video" ? selectedIndex : null;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.topBar, { marginTop: insets.top }]}>
        <Pressable accessibilityLabel={copy.cancel} hitSlop={10} onPress={requestClose} style={styles.roundButton}>
          <Ionicons color="#ffffff" name="close" size={24} />
        </Pressable>
        <Pressable accessibilityLabel={copy.edUndo} disabled={!canUndo} hitSlop={6} onPress={undo} style={[styles.roundButton, !canUndo ? styles.dim : null]}>
          <Ionicons color="#ffffff" name="arrow-undo-outline" size={20} />
        </Pressable>
        <Pressable accessibilityLabel={copy.edRedo} disabled={!canRedo} hitSlop={6} onPress={redo} style={[styles.roundButton, !canRedo ? styles.dim : null]}>
          <Ionicons color="#ffffff" name="arrow-redo-outline" size={20} />
        </Pressable>
        <View style={styles.flexSpacer}>
          {doc.music ? (
            <Pressable onPress={() => setMusicSheet(true)} style={styles.musicChip}>
              <Ionicons color="#ffffff" name="musical-note" size={13} />
              <Text numberOfLines={1} style={styles.musicChipLabel}>
                {doc.music.title}
              </Text>
              <Pressable accessibilityLabel={copy.edRemoveMusic} hitSlop={8} onPress={() => update((current) => ({ ...current, music: undefined }))}>
                <Ionicons color="rgba(255,255,255,0.8)" name="close-circle" size={15} />
              </Pressable>
            </Pressable>
          ) : null}
        </View>
        <Pressable accessibilityLabel={copy.edPreview} disabled={recording} onPress={() => void openCloudPreview()} style={styles.previewButton}>
          <Ionicons color="#ffffff" name="eye-outline" size={18} />
        </Pressable>
        <Pressable disabled={finishing || recording} onPress={() => void finish()} style={[styles.doneButton, recording ? styles.dim : null]}>
          {finishing ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.doneLabel}>{session.doneLabel ?? copy.edNext}</Text>}
        </Pressable>
      </View>

      <View style={styles.stage}>
      <View style={[styles.frame, { height: frameHeight, width: frameWidth }]}>
        <View style={StyleSheet.absoluteFill} {...backgroundGestures.panHandlers}>
          {isVideo ? (
            <TimelinePlayer
              canvas={doc.canvas}
              clips={timeline}
              frameHeight={frameHeight}
              frameWidth={frameWidth}
              loopClipIndex={loopTrimIndex}
              onClipDuration={(clipId, seconds) =>
                replace((current) => ({
                  ...current,
                  timeline: current.timeline.map((clip) => (clip.id === clipId ? { ...clip, durationSeconds: Math.round(seconds * 100) / 100 } : clip)),
                }))
              }
              onLoop={handleLoop}
              onTime={handleTime}
              paused={previewPaused}
              seek={seek}
              speed={doc.speed}
              volume={recording ? 0 : doc.originalVolume}
            />
          ) : (
            <CanvasFrame canvas={doc.canvas} frameHeight={frameHeight} frameWidth={frameWidth} posterUri={timeline[0]?.uri}>
              {(fit) => (
                <Image
                  resizeMode={fit}
                  source={{ uri: photoFx && photoFx.key === photoFxKey ? photoFx.url : timeline[0]?.uri }}
                  style={StyleSheet.absoluteFill}
                />
              )}
            </CanvasFrame>
          )}
          <FilterPreview filters={filters} />
        </View>

        {tool !== "draw" ? <StudioDrawingView height={frameHeight} strokes={doc.drawings} width={frameWidth} /> : null}

        {doc.stickers.map((layer) => (
          <EditableLayer
            frameHeight={frameHeight}
            frameWidth={frameWidth}
            key={layer.id}
            layer={layer}
            onDragState={setDragging}
            onRemove={removeLayer}
            onTap={() => {
              setSelectedStickerId(layer.id);
              setTool("sticker");
            }}
            onUpdate={updateLayer}
            trashCenterY={trashCenterY}
            windowWidth={window.width}
          >
            <AnimatedSticker animation={layer.animation} frameWidth={frameWidth} playKey={loopKey}>
              <StudioStickerView
                countdownLabels={{ d: copy.cdDaysShort, h: copy.cdHoursShort, m: copy.cdMinutesShort, done: copy.cdNow }}
                frameWidth={frameWidth}
                layer={layer}
                poll={layer.kind === "poll" ? { counts: [0, 0], showResults: false } : undefined}
                questionPlaceholder={copy.sqTypeAnswer}
              />
            </AnimatedSticker>
          </EditableLayer>
        ))}
        {doc.texts.map((layer) => (
          <EditableLayer
            dimmed={isVideo && !isTextVisibleAt(layer, playhead.globalSeconds)}
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
            <AnimatedStudioText frameWidth={frameWidth} layer={layer} playKey={loopKey} />
          </EditableLayer>
        ))}

        {caption ? <StudioCaptionView bottom={frameHeight * 0.1} frameWidth={frameWidth} style={doc.captionStyle} text={caption.text} /> : null}

        {tool === "draw" ? (
          <DrawCapture
            brush={brush}
            height={frameHeight}
            onStroke={(stroke) => update((current) => ({ ...current, drawings: [...current.drawings, stroke].slice(-40) }))}
            strokes={doc.drawings}
            width={frameWidth}
          />
        ) : null}

        {isVideo && tool !== "draw" ? (
          <View pointerEvents="box-none" style={styles.playRow}>
            <Pressable accessibilityLabel={previewPaused ? copy.edPlay : copy.edPause} hitSlop={8} onPress={() => setPaused((value) => !value)} style={styles.playButton}>
              <Ionicons color="#ffffff" name={previewPaused ? "play" : "pause"} size={16} />
            </Pressable>
            <View style={styles.timePill}>
              <Text style={styles.timeLabel}>
                {formatClock(Math.min(totalSeconds, playhead.globalSeconds))} / {formatClock(totalSeconds)}
              </Text>
            </View>
            {recording ? (
              <View style={styles.recPill}>
                <View style={styles.recDot} />
                <Text style={styles.timeLabel}>REC</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {toast ? (
          <View pointerEvents="none" style={styles.toast}>
            <Text style={styles.toastLabel}>{toast}</Text>
          </View>
        ) : null}

        {dragging ? (
          <View pointerEvents="none" style={[styles.trash, dragging.overTrash ? styles.trashActive : null]}>
            <Ionicons color="#ffffff" name="trash-outline" size={24} />
          </View>
        ) : null}
      </View>
      </View>

      {showStrip ? (
        <View style={styles.stripArea}>
          <ClipStrip
            activeIndex={playhead.clipIndex}
            canAdd={timeline.length < MAX_CLIPS}
            clips={timeline}
            copy={copy}
            onAdd={() => void pickClips()}
            onPickTransition={(clipId) => {
              setSelectedClipId(clipId);
              setTransitionFor(clipId);
              setTool("clips");
            }}
            onSelect={(id) => {
              setSelectedClipId(id);
              setTransitionFor(null);
              const index = timeline.findIndex((clip) => clip.id === id);
              if (isVideo && index >= 0) {
                seekTo(index);
              }
              if (!tool) {
                setTool("clips");
              }
            }}
            selectedId={tool === "clips" || tool === "trim" ? selectedClip?.id ?? null : null}
          />
        </View>
      ) : null}

      {tool ? (
        <View style={styles.panel}>
          <ScrollView bounces={false} contentContainerStyle={styles.panelContent} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            {tool === "clips" && timeline.length === 1 && timeline[0].type === "image" && mode !== "reel" ? (
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: doc.photoVideo }}
                onPress={() => update((current) => ({ ...current, photoVideo: !current.photoVideo }))}
                style={styles.switchRow}
              >
                <View style={styles.flexSpacer}>
                  <Text style={styles.switchLabel}>{copy.edPhotoToVideo}</Text>
                  <Text style={styles.switchBody}>{copy.edPhotoToVideoBody}</Text>
                </View>
                <Switch
                  onValueChange={(value) => update((current) => ({ ...current, photoVideo: value }))}
                  thumbColor="#ffffff"
                  trackColor={{ false: "rgba(255,255,255,0.25)", true: "#1f5bff" }}
                  value={doc.photoVideo}
                />
              </Pressable>
            ) : null}
            {tool === "clips" && selectedClip ? (
              transitionFor && transitionFor === selectedClip.id && selectedIndex > 0 ? (
                <TransitionPicker
                  copy={copy}
                  onApplyAll={() => {
                    const value = selectedClip.transition ?? "none";
                    update((current) => ({
                      ...current,
                      timeline: current.timeline.map((clip, index) => (index === 0 ? clip : { ...clip, transition: value })),
                    }));
                    showToast(copy.edApplied);
                  }}
                  onChange={(transition) => updateClip(selectedClip.id, { transition })}
                  value={selectedClip.transition ?? "none"}
                />
              ) : (
                <ClipActions
                  canSplit={selectedClip.type === "video" && Boolean(selectedClip.durationSeconds)}
                  clip={selectedClip}
                  copy={copy}
                  count={timeline.length}
                  index={selectedIndex}
                  onDelete={deleteSelected}
                  onDuplicate={duplicateSelected}
                  onMotion={(motion) => updateClip(selectedClip.id, { motion })}
                  onMove={moveSelected}
                  onPhotoSeconds={(seconds) => updateClip(selectedClip.id, { imageSeconds: seconds }, `seconds-${selectedClip.id}`)}
                  onSplit={splitSelected}
                  onTrim={() => setTool("trim")}
                />
              )
            ) : null}

            {tool === "sticker" ? (
              (() => {
                const sticker = doc.stickers.find((item) => item.id === selectedStickerId);
                if (!sticker) {
                  return <Text style={styles.switchBody}>{copy.edStickerTapHint}</Text>;
                }
                return (
                  <View style={styles.sliders}>
                    <Text style={styles.switchLabel}>{copy.edStickerAnimation}</Text>
                    <ScrollView contentContainerStyle={styles.chipRow} horizontal showsHorizontalScrollIndicator={false}>
                      {STUDIO_STICKER_ANIMATIONS.map((item) => {
                        const active = (sticker.animation ?? "none") === item;
                        return (
                          <Pressable
                            accessibilityState={{ selected: active }}
                            key={item}
                            onPress={() =>
                              update((current) => ({
                                ...current,
                                stickers: current.stickers.map((entry) =>
                                  entry.id === sticker.id ? { ...entry, animation: item === "none" ? undefined : item } : entry
                                ),
                              }))
                            }
                            style={[styles.animChip, active ? styles.animChipActive : null]}
                          >
                            <Text style={[styles.animChipLabel, active ? styles.animChipLabelActive : null]}>{copy[STICKER_ANIMATION_LABELS[item]] as string}</Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                    <Pressable
                      onPress={() => {
                        removeLayer(sticker.id);
                        setSelectedStickerId(null);
                        setTool(null);
                      }}
                      style={styles.resetButton}
                    >
                      <Text style={styles.resetLabel}>{copy.delete}</Text>
                    </Pressable>
                  </View>
                );
              })()
            ) : null}

            {tool === "trim" && selectedClip?.type === "video" ? (
              <TrimPanel
                durationSeconds={selectedClip.durationSeconds ?? 0}
                endRatio={selectedClip.trimEndRatio}
                label={`${copy.edTrim} · ${formatClock(clipSeconds(selectedClip))}`}
                onChange={(start, end) => updateClip(selectedClip.id, { trimStartRatio: start, trimEndRatio: end }, `trim-${selectedClip.id}`)}
                startRatio={selectedClip.trimStartRatio}
                uri={selectedClip.uri}
              />
            ) : null}

            {tool === "draw" ? (
              <DrawPanel
                brush={brush}
                canUndo={doc.drawings.length > 0}
                copy={copy}
                onBrush={setBrush}
                onClear={() => update((current) => ({ ...current, drawings: [] }))}
                onUndoStroke={() => update((current) => ({ ...current, drawings: current.drawings.slice(0, -1) }))}
              />
            ) : null}

            {tool === "captions" ? (
              <CaptionsPanel
                busy={captionBusy}
                captionStyle={doc.captionStyle}
                captions={doc.captions}
                copy={copy}
                onAuto={() => void makeAutoCaptions()}
                onChange={(captions) => update((current) => ({ ...current, captions }))}
                onStyle={(captionStyle) => update((current) => ({ ...current, captionStyle }))}
                playheadSeconds={playhead.globalSeconds}
                status={captionStatus}
                totalSeconds={totalSeconds}
              />
            ) : null}

            {tool === "voice" ? (
              <VoiceoverPanel
                copy={copy}
                endSignal={loopKey}
                onError={showToast}
                onOriginalVolume={(originalVolume) => update((current) => ({ ...current, originalVolume }), "original-volume")}
                onRecorded={(voiceover) => update((current) => ({ ...current, voiceover }))}
                onRecordingChange={(on) => {
                  setRecording(on);
                  if (on) {
                    setPaused(false);
                    seekTo(0);
                  }
                }}
                onRemove={() => update((current) => ({ ...current, voiceover: undefined }))}
                onVolume={(volume) =>
                  update((current) => ({ ...current, voiceover: current.voiceover ? { ...current.voiceover, volume } : undefined }), "voice-volume")
                }
                originalVolume={doc.originalVolume}
                voiceover={doc.voiceover}
              />
            ) : null}

            {tool === "effects" ? (
              isVideo ? (
                <VideoEffectsPanel
                  copy={copy}
                  effects={doc.effects}
                  joinedClips={timeline.length > 1}
                  onChange={(effects) => update((current) => ({ ...current, effects }))}
                />
              ) : (
                <PhotoEffectsPanel
                  copy={copy}
                  loading={photoFxLoading}
                  note={photoFxNote}
                  onChange={(photoEffect) => update((current) => ({ ...current, photoEffect }))}
                  value={doc.photoEffect}
                />
              )
            ) : null}

            {tool === "canvas" ? (
              <CanvasPanel
                canvas={doc.canvas}
                copy={copy}
                needsShape={timeline.length > 1}
                onChange={(canvas) => update((current) => ({ ...current, canvas }))}
              />
            ) : null}

            {tool === "filters" ? (
              <ScrollView contentContainerStyle={styles.filterRow} horizontal showsHorizontalScrollIndicator={false}>
                {STUDIO_FILTERS.map((item) => {
                  const active = item.id === doc.filterId;
                  const thumb = timeline[0]?.type === "image" ? timeline[0].uri : coverPreview || timeline[0]?.posterUri || media.posterUri || media.uri;
                  return (
                    <Pressable key={item.id} onPress={() => update((current) => ({ ...current, filterId: item.id }))} style={styles.filterItem}>
                      <View style={[styles.filterThumbWrap, active ? styles.filterThumbActive : null]}>
                        <Image source={{ uri: thumb }} style={styles.filterThumb} />
                        <FilterPreview filters={item.filters} />
                      </View>
                      <Text style={[styles.filterLabel, active ? styles.filterLabelActive : null]}>{copy[item.labelKey]}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}

            {tool === "adjust" ? (
              <View style={styles.sliders}>
                {(
                  [
                    ["brightness", copy.csBrightness, -1, 1, (value: number) => `${Math.round(value * 50)}`],
                    ["contrast", copy.csContrast, -1, 1, (value: number) => `${Math.round(value * 50)}`],
                    ["saturation", copy.csSaturation, -1, 1, (value: number) => `${Math.round(value * 50)}`],
                    ["sharpen", copy.edSharpen, 0, 60, (value: number) => `${Math.round(value)}`],
                    ["vignette", copy.edVignette, 0, 60, (value: number) => `${Math.round(value)}`],
                    ["grain", copy.edGrain, 0, 40, (value: number) => `${Math.round(value)}`],
                  ] as const
                ).map(([key, label, min, max, format]) => (
                  <StudioSlider
                    formatValue={format}
                    key={key}
                    label={label}
                    max={max}
                    min={min}
                    onChange={(value) => update((current) => ({ ...current, adjust: { ...current.adjust, [key]: value } }), `adjust-${key}`)}
                    value={doc.adjust[key]}
                  />
                ))}
                <Pressable onPress={() => update((current) => ({ ...current, adjust: NO_ADJUST }))} style={styles.resetButton}>
                  <Text style={styles.resetLabel}>{copy.edReset}</Text>
                </Pressable>
              </View>
            ) : null}

            {tool === "speed" ? (
              <View style={styles.speedRow}>
                {SPEEDS.map((item) => (
                  <Pressable
                    accessibilityState={{ selected: doc.speed === item }}
                    key={item}
                    onPress={() => update((current) => ({ ...current, speed: item }))}
                    style={[styles.speedChip, doc.speed === item ? styles.speedChipActive : null]}
                  >
                    <Text style={styles.speedLabel}>{item}x</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {tool === "volume" ? (
              <View style={styles.sliders}>
                {isVideo ? (
                  <StudioSlider
                    formatValue={(value) => `${Math.round(value * 100)}%`}
                    label={copy.edOriginalSound}
                    max={1}
                    min={0}
                    onChange={(originalVolume) => update((current) => ({ ...current, originalVolume }), "original-volume")}
                    value={doc.originalVolume}
                  />
                ) : null}
                {doc.voiceover ? (
                  <StudioSlider
                    accent="#e5294f"
                    formatValue={(value) => `${Math.round(value * 100)}%`}
                    label={copy.edVoiceVolume}
                    max={1.5}
                    min={0.1}
                    onChange={(volume) =>
                      update((current) => ({ ...current, voiceover: current.voiceover ? { ...current.voiceover, volume } : undefined }), "voice-volume")
                    }
                    value={doc.voiceover.volume}
                  />
                ) : null}
                {doc.music ? (
                  <>
                    <StudioSlider
                      accent="#e5294f"
                      formatValue={(value) => `${Math.round(value * 100)}%`}
                      label={copy.edMusicVolume}
                      max={1}
                      min={0}
                      onChange={(value) =>
                        update((current) => ({ ...current, music: current.music ? { ...current.music, volume: value } : current.music }), "music-volume")
                      }
                      value={doc.music.volume}
                    />
                    <StudioSlider
                      accent="#e5294f"
                      formatValue={(value) => formatClock(value)}
                      label={copy.edMusicStart}
                      max={Math.max(1, (musicDuration || doc.music.durationSeconds || 30) - 5)}
                      min={0}
                      onChange={(value) =>
                        update(
                          (current) => ({ ...current, music: current.music ? { ...current.music, startSeconds: Math.round(value) } : current.music }),
                          "music-start"
                        )
                      }
                      value={doc.music.startSeconds}
                    />
                  </>
                ) : null}
              </View>
            ) : null}

            {tool === "cover" && baseVideoClip ? (
              <View style={styles.coverRow}>
                {coverPreview ? <Image source={{ uri: coverPreview }} style={styles.coverThumb} /> : <View style={styles.coverThumb} />}
                <View style={styles.flexSpacer}>
                  <StudioSlider
                    label={copy.edCoverPick}
                    max={baseVideoClip.trimEndRatio}
                    min={baseVideoClip.trimStartRatio}
                    onChange={(coverRatio) => update((current) => ({ ...current, coverRatio }), "cover")}
                    value={clamp(doc.coverRatio, baseVideoClip.trimStartRatio, baseVideoClip.trimEndRatio)}
                  />
                </View>
              </View>
            ) : null}
          </ScrollView>
        </View>
      ) : null}

      <View style={[styles.toolbar, { paddingBottom: insets.bottom + 6 }]}>
        <ScrollView contentContainerStyle={styles.toolbarRow} horizontal showsHorizontalScrollIndicator={false}>
          {tools
            .filter((item) => !item.hidden)
            .map((item) => {
              const active = item.id === tool || (item.id === "music" && Boolean(doc.music));
              return (
                <Pressable accessibilityLabel={item.label} accessibilityState={{ selected: active }} key={item.id} onPress={() => pressTool(item.id)} style={styles.toolItem}>
                  <View style={[styles.toolIcon, active ? styles.toolIconActive : null]}>
                    {item.id === "text" ? <Text style={styles.toolAa}>Aa</Text> : <Ionicons color="#ffffff" name={item.icon} size={21} />}
                  </View>
                  <Text numberOfLines={1} style={[styles.toolLabel, active ? styles.toolLabelActive : null]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
        </ScrollView>
      </View>

      <TextComposer
        copy={copy}
        layer={textEditing.layer}
        onCancel={() => setTextEditing({ open: false, layer: null })}
        onDone={saveText}
        playheadSeconds={playhead.globalSeconds}
        videoDurationSeconds={isVideo ? totalSeconds : undefined}
        visible={textEditing.open}
      />
      <StickerSheet
        copy={copy}
        interactive={mode === "story"}
        onClose={() => setStickerSheet(false)}
        onPick={addSticker}
        timeLabel={formatDate(Date.now(), { hour: "2-digit", minute: "2-digit" })}
        visible={stickerSheet}
      />
      <MusicSheet
        copy={copy}
        current={doc.music}
        onClose={() => setMusicSheet(false)}
        onPick={(picked) => {
          update((current) => ({ ...current, music: picked }));
          setMusicSheet(false);
          setTool("volume");
        }}
        visible={musicSheet}
      />
      <CloudPreviewSheet
        aspect={aspect}
        copy={copy}
        onClose={() => {
          setCloud(null);
          setPaused(false);
        }}
        onRetry={() => void openCloudPreview()}
        state={cloud}
        studio={resultFromDoc(doc, coverPreview).studio}
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
  dimmed,
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
  /** Shown faded (a timed text outside its moment). */
  dimmed?: boolean;
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
          const overTrash = Math.abs(state.moveY - latest.current.trashCenterY) < 46 && Math.abs(state.moveX - latest.current.windowWidth / 2) < 60;
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
        style={{
          alignItems: "center",
          maxWidth: frameWidth * 0.95,
          opacity: dimmed ? 0.35 : 1,
          padding: 6,
          transform: [{ rotate: `${layer.rotation}deg` }],
        }}
      >
        {children}
      </View>
    </View>
  );
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
    gap: 8,
    height: TOP_BAR,
    paddingHorizontal: 10,
  },
  flexSpacer: {
    flex: 1,
  },
  dim: {
    opacity: 0.35,
  },
  roundButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 19,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  musicChip: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 16,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  musicChipLabel: {
    color: "#ffffff",
    flex: 1,
    fontSize: 12.5,
    fontWeight: "700",
  },
  previewButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 19,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  doneButton: {
    alignItems: "center",
    backgroundColor: "#1f5bff",
    borderRadius: 19,
    justifyContent: "center",
    minHeight: 38,
    minWidth: 76,
    paddingHorizontal: 16,
  },
  doneLabel: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  stage: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  frame: {
    backgroundColor: "#151922",
    borderRadius: 16,
    overflow: "hidden",
  },
  playRow: {
    alignItems: "center",
    bottom: 10,
    flexDirection: "row",
    gap: 6,
    left: 10,
    position: "absolute",
  },
  playButton: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  timePill: {
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  timeLabel: {
    color: "#ffffff",
    fontSize: 11.5,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
  },
  recPill: {
    alignItems: "center",
    backgroundColor: "rgba(229,41,79,0.85)",
    borderRadius: 12,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  recDot: {
    backgroundColor: "#ffffff",
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  toast: {
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 16,
    maxWidth: "86%",
    paddingHorizontal: 16,
    paddingVertical: 8,
    position: "absolute",
    top: "44%",
  },
  toastLabel: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
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
    backgroundColor: "#ff5c5c",
    borderColor: "#ff5c5c",
    transform: [{ scale: 1.15 }],
  },
  stripArea: {
    height: STRIP,
    justifyContent: "center",
  },
  panel: {
    backgroundColor: "#0d1117",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    height: PANEL,
  },
  panelContent: {
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  toolbar: {
    backgroundColor: "#0d1117",
    borderTopColor: "rgba(255,255,255,0.08)",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
  },
  toolbarRow: {
    gap: 2,
    paddingHorizontal: 8,
  },
  toolItem: {
    alignItems: "center",
    width: 62,
  },
  toolIcon: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 44,
  },
  toolIconActive: {
    backgroundColor: "#1f5bff",
  },
  toolAa: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "900",
  },
  toolLabel: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 10.5,
    fontWeight: "700",
    marginTop: 2,
  },
  toolLabelActive: {
    color: "#ffffff",
  },
  sliders: {
    gap: 8,
  },
  chipRow: {
    gap: 8,
  },
  animChip: {
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  animChipActive: {
    backgroundColor: "#ffffff",
    borderColor: "#ffffff",
  },
  animChipLabel: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  animChipLabelActive: {
    color: "#000000",
  },
  switchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  switchLabel: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  switchBody: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    marginTop: 2,
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
    borderColor: "#1f5bff",
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
    color: "#e5294f",
    fontSize: 13,
    fontWeight: "800",
  },
  speedRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  speedChip: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 18,
    minWidth: 64,
    paddingVertical: 12,
  },
  speedChipActive: {
    backgroundColor: "#1f5bff",
  },
  speedLabel: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  coverRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  coverThumb: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderColor: "#1f5bff",
    borderRadius: 10,
    borderWidth: 2,
    height: 84,
    width: 48,
  },
});
