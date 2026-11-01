import type {
  MediaEditConfig,
  StudioAspect,
  StudioCanvas,
  StudioClip,
  StudioPhotoEffect,
  StudioTransition,
  StudioVideoEffects,
} from "../types/models";

/**
 * Builds the Cloudinary transformation steps for the Sohba editor's "processed when shared" edits:
 * the frame (shape, fit, background, turn, mirror), photo looks, video effects, joined clips with
 * transitions and a recorded voiceover. Every step here was checked against Cloudinary with real media.
 */

export const STUDIO_ASPECT_RATIOS: Record<Exclude<StudioAspect, "original">, number> = {
  "9:16": 9 / 16,
  "4:5": 4 / 5,
  "1:1": 1,
  "16:9": 16 / 9,
};

export const DEFAULT_CANVAS: StudioCanvas = { aspect: "original", fit: "fill", background: "blur", rotate: 0, mirror: false };

/** Transitions between joined clips (each one checked with the media service). */
export const STUDIO_TRANSITIONS: StudioTransition[] = [
  "none",
  "fade",
  "fadefast",
  "fadeslow",
  "fadeblack",
  "fadewhite",
  "fadegrays",
  "dissolve",
  "distance",
  "hblur",
  "wipeleft",
  "wiperight",
  "wipeup",
  "wipedown",
  "slideleft",
  "slideright",
  "slideup",
  "slidedown",
  "smoothleft",
  "smoothright",
  "smoothup",
  "smoothdown",
  "circleopen",
  "circleclose",
  "circlecrop",
  "rectcrop",
  "vertopen",
  "horzopen",
  "diagtl",
  "diagbr",
  "hlslice",
  "vuslice",
  "squeezeh",
  "squeezev",
  "zoomin",
  "radial",
  "pixelize",
];

export const STUDIO_PHOTO_EFFECTS: StudioPhotoEffect[] = [
  "none",
  "enhance",
  "autocolor",
  "warm",
  "sepia",
  "cartoon",
  "oil",
  "zorro",
  "aurora",
  "sonnet",
  "pixelate",
];

const PHOTO_EFFECT_STEPS: Record<Exclude<StudioPhotoEffect, "none">, string> = {
  enhance: "e_improve",
  autocolor: "e_auto_color",
  cartoon: "e_cartoonify",
  oil: "e_oil_paint:40",
  sepia: "e_sepia:60",
  zorro: "e_art:zorro",
  aurora: "e_art:aurora",
  sonnet: "e_art:sonnet",
  warm: "e_tint:25:orange",
  pixelate: "e_pixelate:12",
};

const MAX_CLIPS = 10;

export function isCanvasChanged(canvas?: StudioCanvas | null) {
  return Boolean(canvas && (canvas.aspect !== "original" || canvas.rotate !== 0 || canvas.mirror));
}

/** Pixel size of the finished frame. Joined clips use a lighter 720p frame so they render quickly. */
export function canvasDimensions(aspect: Exclude<StudioAspect, "original">, shortSide: 1080 | 720) {
  const longSide = Math.round((shortSide * 16) / 9);
  switch (aspect) {
    case "9:16":
      return { width: shortSide, height: longSide };
    case "4:5":
      return { width: shortSide, height: Math.round((shortSide * 5) / 4) };
    case "1:1":
      return { width: shortSide, height: shortSide };
    case "16:9":
    default:
      return { width: longSide, height: shortSide };
  }
}

/** The media service's id of an uploaded file, read from its link. */
export function cloudinaryPublicIdFromUrl(url: string | undefined | null) {
  if (!url) {
    return null;
  }
  const match = url.split("?")[0].match(/\/(image|video)\/upload\/(.+)$/);
  if (!match) {
    return null;
  }
  const segments = match[2].split("/");
  const versionIndex = segments.findIndex((segment) => /^v\d+$/.test(segment));
  if (versionIndex < 0) {
    return null;
  }
  const file = segments.slice(versionIndex + 1).join("/");
  return file ? file.replace(/\.[a-zA-Z0-9]+$/, "") : null;
}

export function cloudinaryLayerId(publicId: string) {
  return publicId.replace(/\//g, ":");
}

export function orientationSteps(canvas?: StudioCanvas | null): string[] {
  if (!canvas) {
    return [];
  }
  const steps: string[] = [];
  if (canvas.mirror) {
    steps.push("a_hflip");
  }
  if (canvas.rotate) {
    steps.push(`a_${canvas.rotate}`);
  }
  return steps;
}

function videoFrameStep(canvas: StudioCanvas, size: { width: number; height: number }) {
  const box = `w_${size.width},h_${size.height}`;
  if (canvas.fit === "fit") {
    const background = canvas.background === "blur" ? "blurred:400:15" : canvas.background;
    return `${box},c_pad,b_${background}`;
  }
  return `${box},c_fill,g_center`;
}

/**
 * Frame steps for a photo. Cloudinary has no blurred padding for photos, so the blurred background is
 * made from the same photo: a blurred, filled copy underneath and the whole photo fitted on top.
 */
export function imageCanvasSteps(canvas: StudioCanvas | undefined | null, publicId: string | null): string[] {
  if (!canvas || !isCanvasChanged(canvas)) {
    return [];
  }
  const steps = orientationSteps(canvas);
  if (canvas.aspect === "original") {
    return steps;
  }
  const size = canvasDimensions(canvas.aspect, 1080);
  const box = `w_${size.width},h_${size.height}`;
  if (canvas.fit === "fill") {
    return [...steps, `${box},c_fill,g_auto`];
  }
  if (canvas.background === "blur" && publicId && steps.length === 0) {
    return [`${box},c_fill,g_auto,e_blur:1500`, `l_${cloudinaryLayerId(publicId)},${box},c_fit`, "fl_layer_apply"];
  }
  return [...steps, `${box},c_pad,b_${canvas.background === "white" ? "white" : "black"}`];
}

export function photoEffectStep(effect?: StudioPhotoEffect | null) {
  return effect && effect !== "none" ? PHOTO_EFFECT_STEPS[effect] ?? null : null;
}

function seconds(value: number) {
  return Number.isFinite(value) ? Math.max(0, Number(value.toFixed(2))) : 0;
}

/** Start and end of a clip's trimmed part (seconds when the length is known, otherwise a percentage). */
function trimStep(clip: Pick<StudioClip, "trimStartRatio" | "trimEndRatio" | "durationSeconds">) {
  const start = Math.min(Math.max(0, clip.trimStartRatio ?? 0), 0.98);
  const end = Math.max(Math.min(1, clip.trimEndRatio ?? 1), start + 0.02);
  if (start <= 0.001 && end >= 0.999) {
    return null;
  }
  const duration = clip.durationSeconds ?? 0;
  if (duration > 0) {
    return `so_${seconds(start * duration)},eo_${seconds(end * duration)}`;
  }
  return `so_${Math.round(start * 100)}p,eo_${Math.round(end * 100)}p`;
}

function transitionPart(transition?: StudioTransition) {
  return transition && transition !== "none" ? `:transition_(name_${transition};du_1)` : "";
}

/**
 * One clip joined to the main video, sized to the shared frame. Clips after the main video are added at
 * the end (with their transition); clips before it are put at the start.
 */
function clipSteps(clip: StudioClip, frame: string, orientation: string[], position: "after" | "before") {
  if (!clip.publicId) {
    return [];
  }
  const layer = cloudinaryLayerId(clip.publicId);
  const transition = position === "after" ? transitionPart(clip.transition) : "";
  const apply = position === "after" ? "fl_layer_apply" : "fl_layer_apply,so_0";
  if (clip.type === "image" && clip.renderedAs !== "video") {
    const duration = Math.min(10, Math.max(1, Math.round(clip.imageSeconds ?? 3)));
    // Photos can't use the blurred padding, so they fill the frame (centred: smart cropping of a photo
    // inside a video is refused by the media service).
    const photoFrame = frame.includes("b_blurred") ? frame.replace(/c_pad,b_blurred:[^,/]+/, "c_fill,g_center") : frame;
    return [`fl_splice${transition},du_${duration},l_${layer}`, ...orientation, photoFrame, apply];
  }
  // A photo made into a video plays whole.
  const trim = clip.type === "image" ? null : trimStep(clip);
  return [`fl_splice${transition},l_video:${layer}`, ...(trim ? [trim] : []), ...orientation, frame, apply];
}

export function joinedClips(editConfig?: MediaEditConfig) {
  return (editConfig?.clips ?? []).filter((clip) => Boolean(clip.publicId)).slice(0, MAX_CLIPS - 1);
}

function splitAroundBase(editConfig?: MediaEditConfig) {
  const clips = joinedClips(editConfig);
  const baseIndex = Math.min(clips.length, Math.max(0, Math.round(editConfig?.baseClipIndex ?? 0)));
  return { before: clips.slice(0, baseIndex), after: clips.slice(baseIndex) };
}

/**
 * Frame and joined-clip steps for a video, placed right after the main clip's trim. Returns the steps
 * and whether the main clip is already sized (so later steps don't resize it again).
 */
export function videoStructureSteps(editConfig?: MediaEditConfig, mode: "story" | "reel" | "post" = "reel") {
  const canvas = editConfig?.canvas;
  const clips = joinedClips(editConfig);
  const orientation = orientationSteps(canvas);
  if (clips.length === 0) {
    if (!canvas || !isCanvasChanged(canvas)) {
      return [];
    }
    if (canvas.aspect === "original") {
      return orientation;
    }
    return [...orientation, videoFrameStep(canvas, canvasDimensions(canvas.aspect, 1080))];
  }
  const aspect = canvas && canvas.aspect !== "original" ? canvas.aspect : mode === "post" ? "4:5" : "9:16";
  const frameCanvas: StudioCanvas = canvas ?? { ...DEFAULT_CANVAS, aspect };
  const frame = videoFrameStep({ ...frameCanvas, aspect }, canvasDimensions(aspect, 720));
  const { before, after } = splitAroundBase(editConfig);
  // Each clip put "at the start" goes in front of everything so far, so they are added last-first.
  return [
    ...orientation,
    frame,
    ...after.flatMap((clip) => clipSteps(clip, frame, orientation, "after")),
    ...[...before].reverse().flatMap((clip) => clipSteps(clip, frame, orientation, "before")),
  ];
}

/**
 * Effects for the whole finished video (after clips are joined). Fades come last. Stabilizing only works
 * on a single clip (on joined clips the media service returns an empty video), so it is skipped there.
 */
export function videoEffectSteps(effects?: StudioVideoEffects | null, hasJoinedClips = false) {
  if (!effects) {
    return { middle: [] as string[], fades: [] as string[] };
  }
  const middle: string[] = [];
  if (effects.boomerang) {
    middle.push("e_boomerang");
  } else if (effects.reverse) {
    middle.push("e_reverse");
  }
  if (effects.stabilize && !hasJoinedClips) {
    middle.push("e_deshake");
  }
  const loops = Math.round(effects.loop ?? 0);
  if (loops > 0) {
    middle.push(`e_loop:${Math.min(3, loops)}`);
  }
  const fades: string[] = [];
  if (effects.fadeIn) {
    fades.push("e_fade:600");
  }
  if (effects.fadeOut) {
    fades.push("e_fade:-600");
  }
  return { middle, fades };
}

/** Lowers the video's own sound and mixes in the creator's recorded voiceover. */
export function voiceoverSteps(editConfig?: MediaEditConfig) {
  const voice = editConfig?.voiceover;
  if (!voice?.publicId) {
    return [];
  }
  const steps: string[] = [];
  const original = Math.min(1, Math.max(0, voice.originalVolume ?? editConfig?.studio?.originalVolume ?? 1));
  if (original <= 0.01) {
    steps.push("e_volume:mute");
  } else if (original < 0.99) {
    steps.push(`e_volume:${Math.round((original - 1) * 100)}`);
  }
  const voiceVolume = Math.min(1.5, Math.max(0.1, voice.volume ?? 1));
  const layer = `l_audio:${cloudinaryLayerId(voice.publicId)}`;
  if (Math.abs(voiceVolume - 1) > 0.01) {
    steps.push(layer, `e_volume:${Math.round((voiceVolume - 1) * 100)}`, "fl_layer_apply");
  } else {
    steps.push(layer, "fl_layer_apply");
  }
  return steps;
}

/** Edits that only show up after the media service processes the video (used to warn about rendering time). */
export function hasProcessedVideoEdits(editConfig?: MediaEditConfig) {
  if (!editConfig) {
    return false;
  }
  const effects = editConfig.effects;
  return Boolean(
    joinedClips(editConfig).length > 0 ||
      isCanvasChanged(editConfig.canvas) ||
      editConfig.voiceover?.publicId ||
      (effects && (effects.reverse || effects.boomerang || effects.stabilize || effects.loop || effects.fadeIn || effects.fadeOut))
  );
}
