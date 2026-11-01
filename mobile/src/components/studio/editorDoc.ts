import { useCallback, useRef, useState } from "react";
import { getStudioFilter } from "../../data/studioFilters";
import { DEFAULT_CANVAS } from "../../services/studioRender";
import type {
  MediaEditFilters,
  StudioCanvas,
  StudioCaption,
  StudioCaptionStyle,
  StudioClip,
  StudioMusic,
  StudioPhotoEffect,
  StudioPlaybackRate,
  StudioStickerLayer,
  StudioStroke,
  StudioTextLayer,
  StudioVideoEffects,
  StudioVoiceover,
} from "../../types/models";
import { EditorMedia, EditorMode, EditorResult, emptyEditorResult } from "./editorSession";
import { mainClipOf, MAIN_CLIP_ID } from "./studioPlan";

export interface EditorAdjust {
  brightness: number;
  contrast: number;
  saturation: number;
  vignette: number;
  grain: number;
  sharpen: number;
}

export const NO_ADJUST: EditorAdjust = { brightness: 0, contrast: 0, saturation: 0, vignette: 0, grain: 0, sharpen: 0 };

/** Everything the creator can change in the editor (one snapshot = one undo step). */
export interface EditorDoc {
  timeline: StudioClip[];
  texts: StudioTextLayer[];
  stickers: StudioStickerLayer[];
  drawings: StudioStroke[];
  captions: StudioCaption[];
  captionStyle: StudioCaptionStyle;
  music?: StudioMusic;
  originalVolume: number;
  voiceover?: StudioVoiceover;
  filterId: string;
  adjust: EditorAdjust;
  speed: StudioPlaybackRate;
  effects: StudioVideoEffects;
  photoEffect: StudioPhotoEffect;
  canvas: StudioCanvas;
  coverRatio: number;
  /** A single photo shared as a short video (reels always; stories when chosen). */
  photoVideo: boolean;
  photoVideoRemote?: { clipId: string; seconds: number; url: string };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function combineFilters(filterId: string, adjust: EditorAdjust): Required<MediaEditFilters> {
  const preset = getStudioFilter(filterId).filters;
  return {
    brightness: clamp(preset.brightness + adjust.brightness, -2, 2),
    contrast: clamp(preset.contrast + adjust.contrast, -2, 2),
    saturation: clamp(preset.saturation + adjust.saturation, -2, 2),
    grayscale: preset.grayscale,
    vignette: clamp(preset.vignette + adjust.vignette, 0, 100),
    grain: clamp(preset.grain + adjust.grain, 0, 100),
    sharpen: clamp(preset.sharpen + adjust.sharpen, 0, 100),
  };
}

/** The creator's own adjustments from a saved result (saved filters = preset + adjustments). */
function splitAdjust(result: EditorResult): EditorAdjust {
  const preset = getStudioFilter(result.filterId).filters;
  return {
    brightness: result.filters.brightness - preset.brightness,
    contrast: result.filters.contrast - preset.contrast,
    saturation: result.filters.saturation - preset.saturation,
    vignette: result.filters.vignette - preset.vignette,
    grain: result.filters.grain - preset.grain,
    sharpen: (result.filters.sharpen ?? 0) - preset.sharpen,
  };
}

export function docFromResult(media: EditorMedia, mode: EditorMode, initial?: EditorResult): EditorDoc {
  const result = initial ?? emptyEditorResult();
  const timeline = result.timeline && result.timeline.length > 0 ? result.timeline : [mainClipOf(media, result)];
  return {
    timeline,
    texts: result.studio.texts ?? [],
    stickers: result.studio.stickers ?? [],
    drawings: result.studio.drawings ?? [],
    captions: result.studio.captions ?? [],
    captionStyle: result.studio.captionStyle ?? "clean",
    music: result.studio.music,
    originalVolume: result.studio.originalVolume ?? 1,
    voiceover: result.voiceover,
    filterId: result.filterId,
    adjust: splitAdjust(result),
    speed: result.speed,
    effects: result.effects ?? {},
    photoEffect: result.photoEffect ?? "none",
    canvas: result.canvas ?? DEFAULT_CANVAS,
    coverRatio: result.trimStartRatio,
    // Reels are always videos, so a photo picked for a reel is made into one.
    photoVideo: Boolean(result.photoVideo) || (mode === "reel" && media.type === "image"),
    photoVideoRemote: result.photoVideoRemote,
  };
}

/** True when the finished result is a video (any video clip, several clips, or a photo made into a video). */
export function isVideoDoc(doc: EditorDoc) {
  return doc.timeline.length > 1 || doc.photoVideo || doc.timeline.some((clip) => clip.type === "video");
}

export function resultFromDoc(doc: EditorDoc, posterUri: string | undefined): EditorResult {
  const main = doc.timeline.find((clip) => clip.id === MAIN_CLIP_ID);
  const singleMain = doc.timeline.length === 1 && main && !doc.photoVideo;
  const isVideo = isVideoDoc(doc);
  const effects = isVideo ? doc.effects : {};
  return {
    filterId: doc.filterId,
    filters: combineFilters(doc.filterId, doc.adjust),
    trimStartRatio: main?.trimStartRatio ?? 0,
    trimEndRatio: main?.trimEndRatio ?? 1,
    speed: isVideo ? doc.speed : 1,
    posterUri,
    studio: {
      ...(doc.texts.length ? { texts: doc.texts } : {}),
      ...(doc.stickers.length ? { stickers: doc.stickers } : {}),
      ...(doc.drawings.length ? { drawings: doc.drawings } : {}),
      ...(isVideo && doc.captions.length ? { captions: doc.captions, ...(doc.captionStyle !== "clean" ? { captionStyle: doc.captionStyle } : {}) } : {}),
      ...(doc.music ? { music: doc.music } : {}),
      ...(isVideo && doc.originalVolume !== 1 ? { originalVolume: doc.originalVolume } : {}),
      ...(doc.filterId !== "normal" ? { filterName: doc.filterId } : {}),
    },
    ...(Object.values(effects).some(Boolean) ? { effects } : {}),
    ...(!isVideo && doc.photoEffect !== "none" ? { photoEffect: doc.photoEffect } : {}),
    canvas: doc.canvas,
    ...(singleMain ? {} : { timeline: doc.timeline }),
    ...(doc.photoVideo && doc.timeline.length === 1 && doc.timeline[0].type === "image"
      ? { photoVideo: { seconds: doc.timeline[0].imageSeconds ?? 4, motion: doc.timeline[0].motion !== false } }
      : {}),
    ...(isVideo && doc.voiceover ? { voiceover: doc.voiceover } : {}),
    ...(main?.remoteUrl ? { remoteUrl: main.remoteUrl } : {}),
    ...(doc.photoVideoRemote ? { photoVideoRemote: doc.photoVideoRemote } : {}),
  };
}

interface HistoryState {
  past: EditorDoc[];
  present: EditorDoc;
  future: EditorDoc[];
}

/**
 * Undo and redo for the editor. Quick runs of the same change (dragging a sticker, moving a slider)
 * become one step when they share a key.
 */
export function useEditorHistory(initial: () => EditorDoc) {
  const [state, setState] = useState<HistoryState>(() => ({ past: [], present: initial(), future: [] }));
  const lastChange = useRef<{ key: string; at: number } | null>(null);

  const update = useCallback((updater: (doc: EditorDoc) => EditorDoc, key?: string) => {
    const now = Date.now();
    const coalesce = Boolean(key && lastChange.current && lastChange.current.key === key && now - lastChange.current.at < 1500);
    lastChange.current = key ? { key, at: now } : null;
    setState((current) => {
      const next = updater(current.present);
      if (next === current.present) {
        return current;
      }
      if (coalesce) {
        return { ...current, present: next, future: [] };
      }
      return { past: [...current.past.slice(-59), current.present], present: next, future: [] };
    });
  }, []);

  /** Changes that aren't creative edits (e.g. remembering uploaded files): no undo step. */
  const replace = useCallback((updater: (doc: EditorDoc) => EditorDoc) => {
    setState((current) => ({ ...current, present: updater(current.present) }));
  }, []);

  const undo = useCallback(() => {
    lastChange.current = null;
    setState((current) =>
      current.past.length === 0
        ? current
        : { past: current.past.slice(0, -1), present: current.past[current.past.length - 1], future: [current.present, ...current.future] }
    );
  }, []);

  const redo = useCallback(() => {
    lastChange.current = null;
    setState((current) =>
      current.future.length === 0
        ? current
        : { past: [...current.past, current.present], present: current.future[0], future: current.future.slice(1) }
    );
  }, []);

  return {
    doc: state.present,
    update,
    replace,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    changed: state.past.length > 0,
  };
}
