import { execFile as execFileCallback } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { Response } from "express";
import ffmpegPath from "ffmpeg-static";
import OpenAI from "openai";
import { env } from "../config/env";

const execFile = promisify(execFileCallback);
const moderationClient = env.openAiApiKey ? new OpenAI({ apiKey: env.openAiApiKey }) : null;

const sexualContentPatterns = [
  /\bsex(?:ual|y)?\b/i,
  /\bnudes?\b/i,
  /\bnudity\b/i,
  /\bnaked\b/i,
  /\bnsfw\b/i,
  /\bporn(?:ography|ographic)?\b/i,
  /\bxxx\b/i,
  /\berotic\b/i,
  /\bfetish\b/i,
  /\bonlyfans\b/i,
  /\badult content\b/i,
  /\bblowjob\b/i,
  /\bhandjob\b/i,
  /\bstrip(?:per|tease)?\b/i,
];

export const blockedUserContentMessage =
  "Sexual content is not allowed on ViraFlow. Please remove sexual text, images, or video references before posting.";

export const blockedAiContentMessage =
  "AI tools cannot create sexual videos, images, or sexual content on ViraFlow.";

const dataImagePattern = /^data:image\/[a-zA-Z0-9.+-]+;base64,/i;

type MediaModerationInput =
  | { type: "image"; url: string; label?: string }
  | { type: "video"; url?: string; buffer?: Buffer; fileName?: string; mimeType?: string; seconds?: number; label?: string };

export function containsSexualContent(values: Array<string | undefined | null>) {
  return values.some((value) => {
    if (!value) {
      return false;
    }

    const normalized = value.trim().toLowerCase();
    if (!normalized || normalized.startsWith("data:")) {
      return false;
    }

    return sexualContentPatterns.some((pattern) => pattern.test(normalized));
  });
}

export function isSupportedImageSource(value: string | undefined | null) {
  if (!value) {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  if (dataImagePattern.test(trimmed)) {
    return true;
  }

  try {
    const parsed = new URL(trimmed);
    return Boolean(parsed.protocol === "http:" || parsed.protocol === "https:");
  } catch {
    return false;
  }
}

export function rejectIfSexualContent(
  res: Response,
  values: Array<string | undefined | null>,
  message = blockedUserContentMessage
) {
  if (!containsSexualContent(values)) {
    return false;
  }

  res.status(400).json({
    code: "CONTENT_POLICY_VIOLATION",
    message,
  });
  return true;
}

export async function rejectIfSexualMedia(
  res: Response,
  mediaItems: Array<MediaModerationInput | undefined>,
  message = blockedUserContentMessage
) {
  const violation = await findSexualMediaViolation(mediaItems);
  if (!violation) {
    return false;
  }

  res.status(400).json({
    code: "CONTENT_POLICY_VIOLATION",
    message,
    source: violation.source,
  });
  return true;
}

async function findSexualMediaViolation(mediaItems: Array<MediaModerationInput | undefined>) {
  if (!moderationClient) {
    return null;
  }

  for (const item of mediaItems) {
    if (!item) {
      continue;
    }

    try {
      if (item.type === "image") {
        const flagged = await isSexualImage(item.url);
        if (flagged) {
          return {
            source: item.label || "image",
          };
        }
        continue;
      }

      const flagged = await isSexualVideo(item);
      if (flagged) {
        return {
          source: item.label || "video",
        };
      }
    } catch {
      continue;
    }
  }

  return null;
}

async function isSexualImage(url: string) {
  const trimmed = url.trim();
  if (!trimmed) {
    return false;
  }

  const client = moderationClient;
  if (!client) {
    return false;
  }

  const response = await client.moderations.create({
    model: env.openAiModerationModel,
    input: [
      {
        type: "image_url",
        image_url: {
          url: trimmed,
        },
      },
    ],
  });

  return isSexualModerationResult(response.results[0]);
}

async function isSexualVideo(input: Extract<MediaModerationInput, { type: "video" }>) {
  const client = moderationClient;
  const ffmpegBinary = ffmpegPath;

  if (!client || !ffmpegBinary) {
    return false;
  }

  const frames = await extractVideoFrames(input, ffmpegBinary);
  if (frames.length === 0) {
    return false;
  }

  const response = await client.moderations.create({
    model: env.openAiModerationModel,
    input: frames.map((frame) => ({
      type: "image_url" as const,
      image_url: {
        url: frame.dataUrl,
      },
    })),
  });

  return response.results.some((result) => isSexualModerationResult(result));
}

function isSexualModerationResult(result: any) {
  const categories = result?.categories;
  return Boolean(categories?.sexual || categories?.["sexual/minors"]);
}

async function extractVideoFrames(
  input: Extract<MediaModerationInput, { type: "video" }>,
  ffmpegBinary: string
) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "viraflow-moderation-"));
  const times = buildVideoFrameTimes(input.seconds);
  const frames: Array<{ dataUrl: string }> = [];

  try {
    const videoInput = input.buffer
      ? path.join(tempDir, sanitizeFileName(input.fileName || "media-upload.mp4"))
      : input.url;

    if (!videoInput) {
      return frames;
    }

    if (input.buffer) {
      await writeFile(videoInput, input.buffer);
    }

    for (let index = 0; index < times.length; index += 1) {
      const outputPath = path.join(tempDir, `frame-${index}.jpg`);

      try {
        await execFile(ffmpegBinary, [
          "-hide_banner",
          "-loglevel",
          "error",
          "-y",
          "-ss",
          String(times[index]),
          "-i",
          videoInput,
          "-frames:v",
          "1",
          "-q:v",
          "3",
          outputPath,
        ], {
          timeout: 20000,
          windowsHide: true,
        });

        const buffer = await readFile(outputPath);
        frames.push({
          dataUrl: `data:image/jpeg;base64,${buffer.toString("base64")}`,
        });
      } catch {
        continue;
      }
    }

    return frames;
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

function buildVideoFrameTimes(seconds?: number) {
  const duration = Math.max(6, Math.round(seconds ?? 12));
  const candidates = [0.4, duration * 0.2, duration * 0.5, Math.max(1, duration * 0.82)];

  return [...new Set(candidates.map((time) => Number(time.toFixed(2))))];
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}
