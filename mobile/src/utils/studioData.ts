import type {
  MediaStudioData,
  StudioMusic,
  StudioStickerKind,
  StudioStickerLayer,
  StudioTextBackground,
  StudioTextLayer,
  StudioTextStyle,
} from "../types/models";

const TEXT_STYLES: StudioTextStyle[] = ["classic", "modern", "neon", "typewriter", "strong"];
const TEXT_BACKGROUNDS: StudioTextBackground[] = ["none", "solid", "soft"];
const STICKER_KINDS: StudioStickerKind[] = ["emoji", "location", "mention", "hashtag", "time"];

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
    color: /^#[0-9a-fA-F]{6}$/.test(str(item.color, 7)) ? str(item.color, 7) : "#ffffff",
    style: pick(item.style, TEXT_STYLES, "classic"),
    background: pick(item.background, TEXT_BACKGROUNDS, "none"),
    align: pick(item.align, ["left", "center", "right"], "center"),
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
  return {
    id: str(item.id, 60) || `sticker-${index}`,
    kind: pick(item.kind, STICKER_KINDS, "emoji"),
    value,
    x: num(item.x, 0.5, 0, 1),
    y: num(item.y, 0.5, 0, 1),
    scale: num(item.scale, 1, 0.3, 4),
    rotation: num(item.rotation, 0, -180, 180),
  };
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
  const music = normalizeMusic(data.music);
  const originalVolume =
    typeof data.originalVolume === "number" && Number.isFinite(data.originalVolume)
      ? num(data.originalVolume, 1, 0, 1)
      : undefined;
  const filterName = str(data.filterName, 40).trim();

  const result: MediaStudioData = {
    ...(texts.length > 0 ? { texts } : {}),
    ...(stickers.length > 0 ? { stickers } : {}),
    ...(music ? { music } : {}),
    ...(originalVolume !== undefined && originalVolume !== 1 ? { originalVolume } : {}),
    ...(filterName ? { filterName } : {}),
  };
  return Object.keys(result).length > 0 ? result : undefined;
}
