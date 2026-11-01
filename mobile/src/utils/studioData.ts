import type {
  MediaStudioData,
  StudioCaption,
  StudioCaptionStyle,
  StudioMusic,
  StudioStickerAnimation,
  StudioStickerKind,
  StudioStickerLayer,
  StudioStroke,
  StudioTextAnimation,
  StudioTextBackground,
  StudioTextLayer,
  StudioTextStyle,
} from "../types/models";

const TEXT_STYLES: StudioTextStyle[] = ["classic", "modern", "neon", "typewriter", "strong", "headline", "script", "elegant"];
const TEXT_BACKGROUNDS: StudioTextBackground[] = ["none", "solid", "soft"];
const TEXT_ANIMATIONS: StudioTextAnimation[] = [
  "none",
  "fade",
  "pop",
  "slide",
  "zoom",
  "drop",
  "spin",
  "typewriter",
  "bounce",
  "pulse",
  "float",
  "swing",
  "shake",
  "flicker",
  "heartbeat",
];
const STICKER_ANIMATIONS: StudioStickerAnimation[] = ["none", "pop", "pulse", "bounce", "float", "swing", "wiggle", "heartbeat", "rotate"];
const STICKER_KINDS: StudioStickerKind[] = ["emoji", "location", "mention", "hashtag", "time", "poll", "countdown", "link", "question"];
const CAPTION_STYLES: StudioCaptionStyle[] = ["clean", "box", "bold", "highlight"];
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function num(value: unknown, fallback: number, min: number, max: number) {
  const parsed = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, parsed));
}

function str(value: unknown, max: number) {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function pick<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function normalizeText(raw: unknown, index: number): StudioTextLayer | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const item = raw as Record<string, unknown>;
  const text = str(item.text, 280).trim();
  if (!text) {
    return null;
  }
  return {
    id: str(item.id, 60) || `text-${index}`,
    text,
    x: num(item.x, 0.5, 0, 1),
    y: num(item.y, 0.4, 0, 1),
    scale: num(item.scale, 1, 0.3, 4),
    rotation: num(item.rotation, 0, -180, 180),
    color: HEX_COLOR.test(str(item.color, 7)) ? str(item.color, 7) : "#ffffff",
    style: pick(item.style, TEXT_STYLES, "classic"),
    background: pick(item.background, TEXT_BACKGROUNDS, "none"),
    align: pick(item.align, ["left", "center", "right"], "center"),
    ...optionalTextTiming(item),
  };
}

function optionalTextTiming(item: Record<string, unknown>): Pick<StudioTextLayer, "animation" | "startSeconds" | "endSeconds"> {
  const animation = pick(item.animation, TEXT_ANIMATIONS, "none");
  const start = typeof item.startSeconds === "number" && Number.isFinite(item.startSeconds) ? num(item.startSeconds, 0, 0, 600) : undefined;
  const end = typeof item.endSeconds === "number" && Number.isFinite(item.endSeconds) ? num(item.endSeconds, 0, 0, 600) : undefined;
  const validWindow = start === undefined || end === undefined || end > start;
  return {
    ...(animation !== "none" ? { animation } : {}),
    ...(validWindow && start !== undefined && start > 0 ? { startSeconds: Math.round(start * 10) / 10 } : {}),
    ...(validWindow && end !== undefined ? { endSeconds: Math.round(end * 10) / 10 } : {}),
  };
}

function normalizeSticker(raw: unknown, index: number): StudioStickerLayer | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const item = raw as Record<string, unknown>;
  const value = str(item.value, 80).trim();
  if (!value) {
    return null;
  }
  const kind = pick(item.kind, STICKER_KINDS, "emoji");
  const extra: Pick<StudioStickerLayer, "options" | "targetAt" | "url"> = {};
  if (kind === "poll") {
    const options = Array.isArray(item.options)
      ? item.options.slice(0, 2).map((option) => str(option, 40).trim()).filter(Boolean)
      : [];
    if (options.length < 2) {
      return null;
    }
    extra.options = options;
  }
  if (kind === "countdown") {
    const targetAt = str(item.targetAt, 40);
    if (!Number.isFinite(new Date(targetAt).getTime())) {
      return null;
    }
    extra.targetAt = new Date(targetAt).toISOString();
  }
  if (kind === "link") {
    const url = str(item.url, 500).trim();
    if (!/^https:\/\/[^\s]+\.[^\s]+/.test(url)) {
      return null;
    }
    extra.url = url;
  }
  return {
    id: str(item.id, 60) || `sticker-${index}`,
    kind,
    value,
    x: num(item.x, 0.5, 0, 1),
    y: num(item.y, 0.5, 0, 1),
    scale: num(item.scale, 1, 0.3, 4),
    rotation: num(item.rotation, 0, -180, 180),
    ...extra,
    ...(pick(item.animation, STICKER_ANIMATIONS, "none") !== "none" ? { animation: pick(item.animation, STICKER_ANIMATIONS, "none") } : {}),
  };
}

function normalizeStroke(raw: unknown, index: number): StudioStroke | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const item = raw as Record<string, unknown>;
  if (!Array.isArray(item.points)) {
    return null;
  }
  // Keep at most 240 points per stroke, rounded to 3 decimals so documents stay small.
  const raw2 = item.points.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const pairs = Math.floor(raw2.length / 2);
  const step = Math.max(1, Math.ceil(pairs / 240));
  const points: number[] = [];
  for (let pair = 0; pair < pairs; pair += step) {
    points.push(Math.round(num(raw2[pair * 2], 0, 0, 1) * 1000) / 1000, Math.round(num(raw2[pair * 2 + 1], 0, 0, 1) * 1000) / 1000);
  }
  if (points.length < 2) {
    return null;
  }
  return {
    id: str(item.id, 60) || `stroke-${index}`,
    color: HEX_COLOR.test(str(item.color, 7)) ? str(item.color, 7) : "#ffffff",
    width: num(item.width, 0.012, 0.002, 0.08),
    points,
    ...(item.glow === true ? { glow: true } : {}),
  };
}

function normalizeCaption(raw: unknown): StudioCaption | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const item = raw as Record<string, unknown>;
  const text = str(item.text, 160).trim();
  const start = num(item.start, -1, -1, 900);
  const end = num(item.end, -1, -1, 900);
  if (!text || start < 0 || end <= start) {
    return null;
  }
  return { start: Math.round(start * 100) / 100, end: Math.round(end * 100) / 100, text };
}

function normalizeMusic(raw: unknown): StudioMusic | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const item = raw as Record<string, unknown>;
  const trackId = str(item.trackId, 60).trim();
  const url = str(item.url, 600).trim();
  if (!trackId && !/^https:\/\//.test(url)) {
    return undefined;
  }
  return {
    ...(trackId ? { trackId } : {}),
    ...(url && /^https:\/\//.test(url) ? { url } : {}),
    title: str(item.title, 80) || "Original sound",
    artist: str(item.artist, 80),
    startSeconds: num(item.startSeconds, 0, 0, 600),
    volume: num(item.volume, 1, 0, 1),
  };
}

/**
 * Cleans editor data before it is saved or after it is read: keeps only known fields, clamps numbers,
 * caps the number of layers and leaves out empty values (Firestore rejects undefined).
 */
export function normalizeStudioData(raw: unknown): MediaStudioData | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const data = raw as Record<string, unknown>;
  const texts = Array.isArray(data.texts)
    ? data.texts.slice(0, 12).map(normalizeText).filter((item): item is StudioTextLayer => Boolean(item))
    : [];
  const stickers = Array.isArray(data.stickers)
    ? data.stickers.slice(0, 20).map(normalizeSticker).filter((item): item is StudioStickerLayer => Boolean(item))
    : [];
  const drawings = Array.isArray(data.drawings)
    ? data.drawings.slice(0, 40).map(normalizeStroke).filter((item): item is StudioStroke => Boolean(item))
    : [];
  const captions = Array.isArray(data.captions)
    ? data.captions
        .slice(0, 300)
        .map(normalizeCaption)
        .filter((item): item is StudioCaption => Boolean(item))
        .sort((left, right) => left.start - right.start)
    : [];
  const captionStyle = pick(data.captionStyle, CAPTION_STYLES, "clean");
  const music = normalizeMusic(data.music);
  const originalVolume =
    typeof data.originalVolume === "number" && Number.isFinite(data.originalVolume)
      ? num(data.originalVolume, 1, 0, 1)
      : undefined;
  const filterName = str(data.filterName, 40).trim();

  const result: MediaStudioData = {
    ...(texts.length > 0 ? { texts } : {}),
    ...(stickers.length > 0 ? { stickers } : {}),
    ...(drawings.length > 0 ? { drawings } : {}),
    ...(captions.length > 0 ? { captions, ...(captionStyle !== "clean" ? { captionStyle } : {}) } : {}),
    ...(music ? { music } : {}),
    ...(originalVolume !== undefined && originalVolume !== 1 ? { originalVolume } : {}),
    ...(filterName ? { filterName } : {}),
  };
  return Object.keys(result).length > 0 ? result : undefined;
}
