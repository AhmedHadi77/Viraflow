import { Request, Response } from "express";
import { z } from "zod";
import {
  generateAvatarCreatorTool,
  generateFailureAuditTool,
  generateGrowthCoachTool,
  generateTrendHijackTool,
  createVideoTool,
  generateImageTool,
  generateTextTool,
  generateViralEngineTool,
  getAiStatus,
  getVideoVariantContent,
  getViralVoiceContent,
  listTrendFeed,
  retrieveVideoTool,
} from "../services/aiService";
import { blockedAiContentMessage, rejectIfSexualContent, rejectIfSexualMedia } from "./contentSafety";

const optionalStringField = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}, z.string().optional());

const optionalIntField = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }

  return value;
}, z.number().int().nonnegative().optional());

const textSchema = z.object({
  mode: z.enum(["captions", "script", "product_copy"]),
  prompt: z.string().min(3),
  tone: z.string().optional(),
  audience: z.string().optional(),
  goal: z.string().optional(),
  language: z.string().optional(),
});

const imageSchema = z.object({
  prompt: z.string().min(3),
  style: z.string().optional(),
  aspectRatio: z.enum(["1:1", "9:16", "16:9"]).optional(),
});

const videoSchema = z.object({
  prompt: z.string().min(3),
  style: z.string().optional(),
  shotType: z.string().optional(),
  size: z.enum(["1280x720", "720x1280", "1920x1080", "1080x1920"]).optional(),
  seconds: z.union([z.literal(5), z.literal(8), z.literal(10), z.literal(16), z.literal(20)]).optional(),
  quality: z.enum(["speed", "quality"]).optional(),
});

const viralEngineSchema = z.object({
  prompt: z.string().min(3),
  niche: z.string().optional(),
  audience: z.string().optional(),
  offer: z.string().optional(),
  tone: z.string().optional(),
  language: z.string().optional(),
  voice: z.enum(["alloy", "coral", "marin", "cedar", "sage"]).optional(),
  size: z.enum(["1280x720", "720x1280", "1920x1080", "1080x1920"]).optional(),
  seconds: z.union([z.literal(5), z.literal(8), z.literal(10), z.literal(16), z.literal(20)]).optional(),
  quality: z.enum(["speed", "quality"]).optional(),
});

const trendHijackSchema = z.object({
  trendId: z.string().min(3),
  userGoal: z.string().optional(),
  audience: z.string().optional(),
  offer: z.string().optional(),
  language: z.string().optional(),
  size: z.enum(["1280x720", "720x1280", "1920x1080", "1080x1920"]).optional(),
  seconds: z.union([z.literal(5), z.literal(8), z.literal(10), z.literal(16), z.literal(20)]).optional(),
  quality: z.enum(["speed", "quality"]).optional(),
});

const avatarCreatorSchema = z.object({
  sourceImageDataUrl: z.string().min(20),
  avatarMessage: z.string().optional(),
  niche: z.string().optional(),
  language: z.string().optional(),
  size: z.enum(["1280x720", "720x1280", "1920x1080", "1080x1920"]).optional(),
  seconds: z.union([z.literal(5), z.literal(8), z.literal(10), z.literal(16), z.literal(20)]).optional(),
  quality: z.enum(["speed", "quality"]).optional(),
});

const growthCoachSchema = z.object({
  niche: z.string().optional(),
  targetAudience: z.string().optional(),
  recentPostTopic: z.string().min(3),
  recentCaption: z.string().optional(),
  postGoal: z.string().optional(),
  views: z.number().int().nonnegative().optional(),
  likes: z.number().int().nonnegative().optional(),
  comments: z.number().int().nonnegative().optional(),
  shares: z.number().int().nonnegative().optional(),
  retentionNote: z.string().optional(),
  painPoint: z.string().optional(),
  language: z.string().optional(),
});

const failureAuditSchema = z.object({
  sourceVideoName: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().min(2)
  ),
  durationSeconds: optionalIntField,
  caption: optionalStringField,
  retentionNote: optionalStringField,
  views: optionalIntField,
  niche: optionalStringField,
  targetAudience: optionalStringField,
  language: optionalStringField,
});

export function aiStatus(_req: Request, res: Response) {
  res.json({
    status: getAiStatus(),
  });
}

export async function aiText(req: Request, res: Response) {
  const parsed = textSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(parsed.error.flatten());
    return;
  }

  if (rejectIfSexualContent(res, [parsed.data.prompt, parsed.data.tone, parsed.data.audience, parsed.data.goal], blockedAiContentMessage)) {
    return;
  }

  const result = await generateTextTool(parsed.data);
  res.json({ result });
}

export async function aiImage(req: Request, res: Response) {
  const parsed = imageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(parsed.error.flatten());
    return;
  }

  if (rejectIfSexualContent(res, [parsed.data.prompt, parsed.data.style], blockedAiContentMessage)) {
    return;
  }

  const result = await generateImageTool(parsed.data);
  res.json({ result });
}

export async function aiVideoCreate(req: Request, res: Response) {
  const parsed = videoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(parsed.error.flatten());
    return;
  }

  if (rejectIfSexualContent(res, [parsed.data.prompt, parsed.data.style, parsed.data.shotType], blockedAiContentMessage)) {
    return;
  }

  const result = await createVideoTool(parsed.data);
  res.status(201).json({ result });
}

export async function aiVideoRetrieve(req: Request, res: Response) {
  const result = await retrieveVideoTool(req.params.id);
  if (!result) {
    res.status(404).json({ message: "Video job not found." });
    return;
  }

  res.json({ result });
}

export async function aiVideoContent(req: Request, res: Response) {
  const variant = req.query.variant === "thumbnail" ? "thumbnail" : "video";
  const content = await getVideoVariantContent(req.params.id, variant);

  if (!content) {
    res.status(404).json({ message: "Video content is not available in demo mode." });
    return;
  }

  res.setHeader("Content-Type", content.contentType);
  res.send(content.buffer);
}

export async function aiViralEngine(req: Request, res: Response) {
  const parsed = viralEngineSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(parsed.error.flatten());
    return;
  }

  if (rejectIfSexualContent(
    res,
    [parsed.data.prompt, parsed.data.niche, parsed.data.audience, parsed.data.offer, parsed.data.tone],
    blockedAiContentMessage
  )) {
    return;
  }

  const result = await generateViralEngineTool(parsed.data);
  res.status(201).json({ result });
}

export function aiTrendFeed(_req: Request, res: Response) {
  res.json({
    trends: listTrendFeed(),
  });
}

export async function aiTrendHijack(req: Request, res: Response) {
  const parsed = trendHijackSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(parsed.error.flatten());
    return;
  }

  if (rejectIfSexualContent(res, [parsed.data.userGoal, parsed.data.audience, parsed.data.offer], blockedAiContentMessage)) {
    return;
  }

  try {
    const result = await generateTrendHijackTool(parsed.data);
    res.status(201).json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to hijack trend.";
    res.status(message === "Trend not found." ? 404 : 500).json({ message });
  }
}

export async function aiAvatarCreator(req: Request, res: Response) {
  const parsed = avatarCreatorSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(parsed.error.flatten());
    return;
  }

  if (rejectIfSexualContent(res, [parsed.data.avatarMessage, parsed.data.niche], blockedAiContentMessage)) {
    return;
  }

  if (
    await rejectIfSexualMedia(
      res,
      [{ type: "image", url: parsed.data.sourceImageDataUrl, label: "avatar source image" }],
      blockedAiContentMessage
    )
  ) {
    return;
  }

  try {
    const result = await generateAvatarCreatorTool(parsed.data);
    res.status(201).json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create avatar package.";
    res.status(500).json({ message });
  }
}

export async function aiGrowthCoach(req: Request, res: Response) {
  const parsed = growthCoachSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(parsed.error.flatten());
    return;
  }

  if (
    rejectIfSexualContent(
      res,
      [
        parsed.data.niche,
        parsed.data.targetAudience,
        parsed.data.recentPostTopic,
        parsed.data.recentCaption,
        parsed.data.postGoal,
        parsed.data.retentionNote,
        parsed.data.painPoint,
      ],
      blockedAiContentMessage
    )
  ) {
    return;
  }

  try {
    const result = await generateGrowthCoachTool(parsed.data);
    res.status(201).json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate growth coaching.";
    res.status(500).json({ message });
  }
}

export async function aiFailureAudit(req: Request, res: Response) {
  if (!req.file) {
    res.status(400).json({ message: "Upload a video file first." });
    return;
  }

  if (!req.file.mimetype?.startsWith("video/")) {
    res.status(400).json({ message: "Only video uploads are supported for failure analysis." });
    return;
  }

  const parsed = failureAuditSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(parsed.error.flatten());
    return;
  }

  if (
    rejectIfSexualContent(
      res,
      [
        parsed.data.sourceVideoName,
        parsed.data.caption,
        parsed.data.retentionNote,
        parsed.data.niche,
        parsed.data.targetAudience,
      ],
      blockedAiContentMessage
    )
  ) {
    return;
  }

  if (
    await rejectIfSexualMedia(
      res,
      [
        {
          type: "video",
          buffer: req.file.buffer,
          fileName: req.file.originalname || parsed.data.sourceVideoName,
          mimeType: req.file.mimetype || "video/mp4",
          seconds: parsed.data.durationSeconds,
          label: "failure audit video",
        },
      ],
      blockedAiContentMessage
    )
  ) {
    return;
  }

  try {
    const result = await generateFailureAuditTool(parsed.data, {
      buffer: req.file.buffer,
      fileName: req.file.originalname || parsed.data.sourceVideoName,
      mimeType: req.file.mimetype || "video/mp4",
    });
    res.status(201).json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to analyze the video.";
    res.status(500).json({ message });
  }
}

export function aiViralVoice(req: Request, res: Response) {
  const content = getViralVoiceContent(req.params.id);

  if (!content) {
    res.status(404).json({ message: "Voice preview is not available for this engine run." });
    return;
  }

  res.setHeader("Content-Type", content.contentType);
  res.send(content.buffer);
}
