import { isCanvasChanged } from "../../services/studioRender";
import type { MediaEditConfig, StudioClip, StudioVideoEffects } from "../../types/models";
import { EditorMedia, EditorMode, EditorResult, hasFilterChanges } from "./editorSession";

/** One photo or video ready to publish: the file to upload and the edits to apply. */
export interface PublishMedia {
  uri: string;
  type: "image" | "video";
  mimeType?: string;
  fileName?: string;
  durationSeconds?: number;
  posterUri?: string;
  editConfig?: MediaEditConfig;
}

export const MAIN_CLIP_ID = "main";

/** The edited media itself as a timeline clip. */
export function mainClipOf(media: EditorMedia, result?: EditorResult): StudioClip {
  return {
    id: MAIN_CLIP_ID,
    uri: media.uri,
    type: media.type,
    durationSeconds: media.durationSeconds,
    trimStartRatio: result?.trimStartRatio ?? 0,
    trimEndRatio: result?.trimEndRatio ?? 1,
    posterUri: result?.posterUri ?? media.posterUri,
    mimeType: media.mimeType,
    fileName: media.fileName,
    ...(result?.remoteUrl ? { remoteUrl: result.remoteUrl } : {}),
    ...(media.type === "image" ? { imageSeconds: 4, motion: true } : {}),
  };
}

function activeEffects(effects?: StudioVideoEffects): StudioVideoEffects | undefined {
  if (!effects) {
    return undefined;
  }
  const kept: StudioVideoEffects = {};
  if (effects.reverse) kept.reverse = true;
  if (effects.boomerang) kept.boomerang = true;
  if (effects.stabilize) kept.stabilize = true;
  if (effects.fadeIn) kept.fadeIn = true;
  if (effects.fadeOut) kept.fadeOut = true;
  if (effects.loop && effects.loop > 0) kept.loop = Math.min(3, Math.round(effects.loop));
  return Object.keys(kept).length > 0 ? kept : undefined;
}

/** Seconds a clip adds to the finished video (before speed changes). */
export function clipSeconds(clip: StudioClip) {
  if (clip.type === "image") {
    return Math.min(10, Math.max(1, clip.imageSeconds ?? 3));
  }
  const duration = clip.durationSeconds ?? 0;
  return Math.max(0.3, duration * Math.max(0.02, (clip.trimEndRatio ?? 1) - (clip.trimStartRatio ?? 0)));
}

/** Length of the finished video: clips minus the overlap of each transition, then the speed. */
export function timelineSeconds(clips: StudioClip[], speed = 1) {
  const total = clips.reduce((sum, clip, index) => {
    const overlap = index > 0 && clip.transition && clip.transition !== "none" ? 1 : 0;
    return sum + clipSeconds(clip) - overlap;
  }, 0);
  return Math.max(0, total) / (speed || 1);
}

/** Copies a clip for publishing, without fields only the editor uses. */
function publishClip(clip: StudioClip): StudioClip {
  const { posterUri: _posterUri, ...rest } = clip;
  return rest;
}

/**
 * Turns what the editor produced into what gets published: a single photo, a single video, a video made
 * of several clips (the first video is the main one; the rest are joined around it) or photos made into a
 * video.
 */
export function buildPublishMedia(media: EditorMedia, result: EditorResult | undefined, _mode?: EditorMode): PublishMedia {
  if (!result) {
    return {
      uri: media.uri,
      type: media.type,
      mimeType: media.mimeType,
      fileName: media.fileName,
      durationSeconds: media.durationSeconds,
      posterUri: media.posterUri,
    };
  }
  const filters = hasFilterChanges(result.filters) ? result.filters : undefined;
  const hasVoiceover = Boolean(result.voiceover?.uri || result.voiceover?.publicId);
  // With a voiceover, the video's own volume is mixed into the finished video, so viewers must not lower
  // it again.
  const { originalVolume: studioOriginalVolume, ...studioWithoutVolume } = result.studio;
  const studioData = hasVoiceover ? studioWithoutVolume : result.studio;
  const studio = Object.keys(studioData).length > 0 ? studioData : undefined;
  const canvas = isCanvasChanged(result.canvas) ? result.canvas : undefined;
  const effects = activeEffects(result.effects);
  const voiceover = hasVoiceover && result.voiceover
    ? { ...result.voiceover, ...(studioOriginalVolume !== undefined ? { originalVolume: studioOriginalVolume } : {}) }
    : undefined;
  const speed = result.speed !== 1 ? result.speed : undefined;
  const timeline = result.timeline && result.timeline.length > 0 ? result.timeline : [mainClipOf(media, result)];
  const compact = (config: MediaEditConfig): MediaEditConfig | undefined => {
    const cleaned = Object.fromEntries(Object.entries(config).filter(([, value]) => value !== undefined)) as MediaEditConfig;
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  };

  // A single photo stays a photo unless it was made into a video.
  if (timeline.length === 1 && timeline[0].type === "image" && !result.photoVideo) {
    const photo = timeline[0];
    return {
      uri: photo.remoteUrl || photo.uri,
      type: "image",
      mimeType: photo.mimeType ?? media.mimeType,
      fileName: photo.fileName ?? media.fileName,
      editConfig: compact({
        filters,
        studio,
        canvas,
        photoEffect: result.photoEffect && result.photoEffect !== "none" ? result.photoEffect : undefined,
      }),
    };
  }

  const baseIndex = timeline.findIndex((clip) => clip.type === "video");
  if (baseIndex >= 0) {
    const base = timeline[baseIndex];
    const others = timeline.filter((_, index) => index !== baseIndex).map(publishClip);
    const hasTrim = (base.trimStartRatio ?? 0) > 0.001 || (base.trimEndRatio ?? 1) < 0.999;
    return {
      uri: base.remoteUrl || base.uri,
      type: "video",
      mimeType: base.mimeType,
      fileName: base.fileName,
      durationSeconds: base.durationSeconds,
      posterUri: result.posterUri ?? base.posterUri,
      editConfig: compact({
        filters,
        studio,
        canvas,
        effects,
        voiceover,
        playbackRate: speed,
        trimStartRatio: hasTrim ? base.trimStartRatio : undefined,
        trimEndRatio: hasTrim ? base.trimEndRatio : undefined,
        clips: others.length > 0 ? others : undefined,
        baseClipIndex: others.length > 0 && baseIndex > 0 ? baseIndex : undefined,
      }),
    };
  }

  // Only photos: the first becomes a short video and the others join it.
  const first = timeline[0];
  const seconds = Math.min(10, Math.max(1, Math.round(first.imageSeconds ?? result.photoVideo?.seconds ?? 4)));
  const others = timeline.slice(1).map(publishClip);
  const madeVideo =
    result.photoVideoRemote && result.photoVideoRemote.clipId === first.id && result.photoVideoRemote.seconds === seconds
      ? result.photoVideoRemote.url
      : null;
  return {
    uri: madeVideo || first.remoteUrl || first.uri,
    type: "video",
    mimeType: first.mimeType ?? "image/jpeg",
    fileName: first.fileName,
    durationSeconds: timelineSeconds(timeline),
    posterUri: result.posterUri ?? first.posterUri ?? first.uri,
    editConfig: compact({
      filters,
      studio,
      canvas,
      effects: effects ? { ...effects, stabilize: undefined } : undefined,
      voiceover,
      playbackRate: speed,
      clips: others.length > 0 ? others : undefined,
      photoVideo: { seconds, motion: first.motion !== false },
    }),
  };
}
