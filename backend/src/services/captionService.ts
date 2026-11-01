import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { env } from "../config/env";

const client = env.openAiApiKey ? new OpenAI({ apiKey: env.openAiApiKey }) : null;
const MAX_AUDIO_BYTES = 24 * 1024 * 1024;
const MAX_WORDS_PER_LINE = 7;

export class CaptionsUnavailableError extends Error {}
export class CaptionsSourceError extends Error {}

export interface CaptionLine {
  start: number;
  end: number;
  text: string;
}

export function isCaptionsConfigured() {
  return Boolean(client);
}

/** Only sound from this app's own media storage is transcribed (never an arbitrary web address). */
export function isAllowedCaptionSource(url: string) {
  const cloud = env.cloudinaryCloudName;
  if (!cloud) {
    return false;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === "res.cloudinary.com" && parsed.pathname.startsWith(`/${cloud}/video/upload/`);
  } catch {
    return false;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Downloads the finished video's sound, waiting while the media service is still making it. */
async function downloadAudio(url: string) {
  for (let attempt = 0; attempt < 14; attempt += 1) {
    const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
    if (response.status === 423) {
      await response.arrayBuffer().catch(() => undefined);
      await sleep(5000);
      continue;
    }
    if (!response.ok) {
      throw new CaptionsSourceError(`The video's sound could not be read (${response.status}).`);
    }
    const declared = Number(response.headers.get("content-length") || 0);
    if (declared > MAX_AUDIO_BYTES) {
      throw new CaptionsSourceError("This video is too long for automatic captions.");
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_AUDIO_BYTES) {
      throw new CaptionsSourceError("This video is too long for automatic captions.");
    }
    return buffer;
  }
  throw new CaptionsSourceError("The video is still being prepared. Try again in a minute.");
}

/** Splits long speech segments into short subtitle lines, sharing the time by word count. */
export function splitIntoCaptionLines(segments: CaptionLine[]): CaptionLine[] {
  const lines: CaptionLine[] = [];
  for (const segment of segments) {
    const words = segment.text.split(/\s+/).filter(Boolean);
    if (words.length === 0 || segment.end <= segment.start) {
      continue;
    }
    const chunks = Math.ceil(words.length / MAX_WORDS_PER_LINE);
    const perWord = (segment.end - segment.start) / words.length;
    let cursor = 0;
    for (let chunk = 0; chunk < chunks; chunk += 1) {
      const size = Math.ceil((words.length - cursor) / (chunks - chunk));
      const start = segment.start + cursor * perWord;
      const end = chunk === chunks - 1 ? segment.end : segment.start + (cursor + size) * perWord;
      lines.push({
        start: Math.round(start * 100) / 100,
        end: Math.round(end * 100) / 100,
        text: words.slice(cursor, cursor + size).join(" "),
      });
      cursor += size;
    }
  }
  return lines.slice(0, 300);
}

/** Speech to timed captions for a finished video's sound (an audio link from the media service). */
export async function transcribeCaptions(url: string, language?: string) {
  if (!client) {
    throw new CaptionsUnavailableError("Automatic captions are not set up on this server.");
  }
  const buffer = await downloadAudio(url);
  if (buffer.length < 2000) {
    return { captions: [] as CaptionLine[], language: language ?? null, durationSeconds: 0 };
  }
  // Speech recognition reads the format from the file name.
  const extension = (new URL(url).pathname.match(/\.(mp3|mp4|m4a|wav|webm)$/i)?.[1] ?? "mp4").toLowerCase();
  const mimeTypes: Record<string, string> = { mp3: "audio/mpeg", mp4: "audio/mp4", m4a: "audio/mp4", wav: "audio/wav", webm: "audio/webm" };
  const file = await toFile(buffer, `sound.${extension}`, { type: mimeTypes[extension] });
  // whisper-1 is the transcription model that returns timestamps for each spoken segment.
  const transcription = (await client.audio.transcriptions.create({
    file,
    model: "whisper-1",
    response_format: "verbose_json",
    timestamp_granularities: ["segment"],
    ...(language ? { language } : {}),
  } as any)) as any;
  const segments: CaptionLine[] = Array.isArray(transcription?.segments)
    ? transcription.segments
        .map((segment: any) => ({
          start: Math.max(0, Number(segment?.start) || 0),
          end: Math.max(0, Number(segment?.end) || 0),
          text: String(segment?.text ?? "").trim(),
        }))
        .filter((segment: CaptionLine) => segment.text && segment.end > segment.start)
    : [];
  return {
    captions: splitIntoCaptionLines(segments),
    language: typeof transcription?.language === "string" ? transcription.language : language ?? null,
    durationSeconds: Number(transcription?.duration) || 0,
  };
}
