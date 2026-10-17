import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { env } from "../config/env";
import { getVoiceAsset, saveVoiceAsset } from "../data/aiAssetStore";
import { getFirestore } from "./firebaseService";
import { isLanguageOption } from "../types/models";
import {
  AIAvatarCreatorRequest,
  AIAvatarCreatorResult,
  AIAvatarStyle,
  AIAvatarVariant,
  AIFailureAuditRequest,
  AIFailureAuditResult,
  AIFailureAuditRetentionPoint,
  AIFailureAuditSection,
  AIGrowthCoachRequest,
  AIGrowthCoachResult,
  AIImageRequest,
  AIImageResult,
  AIStatusPayload,
  AITextRequest,
  AITextResult,
  AITrendFeedItem,
  AITrendHijackRequest,
  AITrendHijackResult,
  AIViralEngineRequest,
  AIViralEngineResult,
  AIVideoJob,
  AIVideoRequest,
  AIVoiceOption,
} from "../types/ai";

interface ViralBlueprint {
  conceptTitle: string;
  hook: string;
  body: string;
  cta: string;
  voiceover: string;
  captions: string[];
  videoPrompt: string;
  viralScore: number;
  bestPostingTime: string;
  targetAudience: string;
  reasons: string[];
}

interface TrendHijackBlueprint {
  angle: string;
  musicStyle: string;
  captions: string[];
  similarVideoPrompt: string;
}

interface GrowthCoachBlueprint {
  headline: string;
  diagnosis: string[];
  improvements: string[];
  nextPosts: Array<{
    title: string;
    hook: string;
    format: string;
    reason: string;
  }>;
  coachSummary: string;
}

interface FailureAuditBlueprint {
  headline: string;
  hook: AIFailureAuditSection;
  retention: AIFailureAuditSection;
  captions: AIFailureAuditSection;
  retentionGraph: AIFailureAuditRetentionPoint[];
  quickWins: string[];
  nextMove: string;
}

interface FailureAuditUpload {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}

interface FailureAuditTranscriptSegment {
  start: number;
  end: number;
  text: string;
}

interface FailureAuditTranscriptPayload {
  text: string;
  source: "auto" | "caption";
  durationSeconds: number;
  segments: FailureAuditTranscriptSegment[];
}

const client = env.openAiApiKey ? new OpenAI({ apiKey: env.openAiApiKey }) : null;
export function getAiStatus(): AIStatusPayload {
  return {
    demoMode: !client,
    textModel: env.openAiTextModel,
    imageModel: env.openAiImageModel,
    videoModel: env.openAiVideoModel,
    voiceModel: env.openAiVoiceModel,
  };
}

export async function generateTextTool(input: AITextRequest): Promise<AITextResult> {
  if (!client) {
    throw new AIUnavailableError();
  }

  const response = await client.responses.create({
    model: env.openAiTextModel,
    reasoning: { effort: "low" },
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "You are ViraFlow AI. Return exactly 3 strong creator-ready options separated by a blank line. No intro. Keep outputs usable immediately inside a social app.",
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: buildTextPrompt(input),
          },
        ],
      },
    ],
  });

  const rawText = response.output_text?.trim();
  if (!rawText) {
    throw new AIResponseError();
  }
  const outputs = splitOutputs(rawText);

  return {
    id: `ai-text-${Date.now()}`,
    mode: input.mode,
    outputs,
    summary: buildSummary(input.mode),
    model: env.openAiTextModel,
    createdAt: new Date().toISOString(),
    demoMode: false,
  };
}

export async function generateImageTool(input: AIImageRequest): Promise<AIImageResult> {
  if (!client) {
    throw new AIUnavailableError();
  }

  const response = await client.images.generate({
    model: env.openAiImageModel,
    prompt: buildImagePrompt(input),
    size: mapAspectRatioToImageSize(input.aspectRatio),
  });

  const imageResult = response.data?.[0];
  const imageBase64 = imageResult?.b64_json ?? "";
  if (!imageBase64) {
    throw new AIResponseError("The image service did not return an image. Please try again.");
  }
  return {
    id: `ai-image-${Date.now()}`,
    prompt: buildImagePrompt(input),
    imageDataUrl: `data:image/png;base64,${imageBase64}`,
    revisedPrompt: imageResult?.revised_prompt,
    model: env.openAiImageModel,
    createdAt: new Date().toISOString(),
    demoMode: false,
  };
}

export async function createVideoTool(input: AIVideoRequest): Promise<AIVideoJob> {
  if (!client) {
    throw new AIUnavailableError();
  }

  const model = input.quality === "quality" ? "sora-2-pro" : env.openAiVideoModel;
  const videoPrompt = buildVideoPrompt(input);
  const video = await client.videos.create({
    model,
    prompt: videoPrompt,
    size: normalizeRequestedVideoSize(input.size),
    seconds: normalizeRequestedVideoSeconds(input.seconds),
  } as any);

  return {
    id: video.id,
    status: normalizeVideoStatus(video.status),
    progress: video.progress ?? 0,
    model: video.model ?? model,
    prompt: videoPrompt,
    size: String(video.size ?? input.size ?? "720x1280"),
    seconds: String(video.seconds ?? input.seconds ?? 8),
    createdAt: new Date((video.created_at ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    demoMode: false,
    note: "Live video job started. Poll for progress until it reaches completed.",
    downloadPath: `/api/ai/video/${video.id}/content`,
  };
}

export async function retrieveVideoTool(videoId: string): Promise<AIVideoJob | undefined> {
  if (!client) {
    throw new AIUnavailableError();
  }

  const video = await client.videos.retrieve(videoId);
  const normalizedStatus = normalizeVideoStatus(video.status);
  const thumbnailDataUrl =
    normalizedStatus === "completed" ? await getVideoVariantDataUrl(videoId, "thumbnail") : undefined;

  return {
    id: video.id,
    status: normalizedStatus,
    progress: video.progress ?? 0,
    model: String(video.model ?? env.openAiVideoModel),
    prompt: video.prompt ?? "Live render job",
    size: String(video.size ?? ""),
    seconds: String(video.seconds ?? ""),
    createdAt: new Date((video.created_at ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    demoMode: false,
    thumbnailDataUrl,
    downloadPath: normalizedStatus === "completed" ? `/api/ai/video/${video.id}/content` : undefined,
    error: video.error?.message,
  };
}

export async function listTrendFeed(region?: string): Promise<AITrendFeedItem[]> {
  return buildTrendFeedFromPlatform(region);
}

export async function generateTrendHijackTool(input: AITrendHijackRequest): Promise<AITrendHijackResult> {
  if (!client) {
    throw new AIUnavailableError();
  }

  const trend =
    (await buildTrendFeedFromPlatform(input.region)).find((item) => item.id === input.trendId) ??
    (await buildTrendFeedFromPlatform()).find((item) => item.id === input.trendId);

  if (!trend) {
    throw new Error("Trend not found.");
  }

  const response = await client.responses.create({
    model: env.openAiTextModel,
    reasoning: { effort: "medium" },
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "You are ViraFlow Trend Hijacker AI. Return only valid JSON without markdown. The JSON must include: angle, musicStyle, captions, similarVideoPrompt.",
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: buildTrendHijackPrompt(trend, input),
          },
        ],
      },
    ],
  });

  const blueprint = parseTrendHijackBlueprint(response.output_text ?? "");
  let video: AIVideoJob;

  try {
    video = await createVideoTool({
      prompt: blueprint.similarVideoPrompt,
      style: `${trend.musicStyle}; ${trend.motionStyle}`,
      shotType: "trend-led vertical pacing with creator-safe differentiation",
      size: input.size,
      seconds: input.seconds,
      quality: input.quality,
    });
  } catch (error) {
    video = buildFailedVideoJob(
      {
        prompt: blueprint.similarVideoPrompt,
        size: input.size,
        seconds: input.seconds,
        quality: input.quality,
      },
      error
    );
  }

  return {
    id: `trend-hijack-${Date.now()}`,
    trend: {
      ...trend,
      demoMode: false,
    },
    angle: blueprint.angle,
    similarVideoPrompt: blueprint.similarVideoPrompt,
    musicStyle: blueprint.musicStyle,
    optimizedCaptions: blueprint.captions,
    video,
    createdAt: new Date().toISOString(),
    demoMode: false,
  };
}

export async function generateAvatarCreatorTool(input: AIAvatarCreatorRequest): Promise<AIAvatarCreatorResult> {
  if (!client) {
    throw new AIUnavailableError();
  }

  const styles: AIAvatarStyle[] = ["anime", "cartoon", "influencer"];
  const variantResults = await Promise.all(
    styles.map(async (style) => {
      try {
        const prompt = buildAvatarStylePrompt(style, input);
        const file = await imageDataUrlToFile(input.sourceImageDataUrl, `avatar-${style}.jpg`);
        const response = await client.images.edit({
          image: file,
          model: env.openAiImageModel,
          prompt,
          size: "1024x1024",
          quality: "high",
          output_format: "png",
          input_fidelity: "high",
        });

        const imageResult = response.data?.[0];
        if (!imageResult?.b64_json) {
          return null;
        }
        const imageDataUrl = `data:image/png;base64,${imageResult.b64_json}`;

        return {
          id: `avatar-${style}-${Date.now()}`,
          style,
          title: getAvatarStyleTitle(style),
          imageDataUrl,
          prompt,
          demoMode: false,
        } satisfies AIAvatarVariant;
      } catch {
        return null;
      }
    })
  );
  const variants: AIAvatarVariant[] = variantResults.filter((variant) => variant !== null) as AIAvatarVariant[];
  if (variants.length === 0) {
    throw new AIResponseError("The avatar styles could not be generated from this photo. Please try another photo.");
  }

  let talkingAvatar: AIVideoJob;

  try {
    const talkingPrompt = buildTalkingAvatarPrompt(input);
    const model = input.quality === "quality" ? "sora-2-pro" : env.openAiVideoModel;
    const video = await client.videos.create({
      model,
      prompt: talkingPrompt,
      input_reference: {
        image_url: input.sourceImageDataUrl,
      },
      size: normalizeRequestedVideoSize(input.size),
      seconds: normalizeRequestedVideoSeconds(input.seconds),
    } as any);

    talkingAvatar = {
      id: video.id,
      status: normalizeVideoStatus(video.status),
      progress: video.progress ?? 0,
      model: video.model ?? model,
      prompt: talkingPrompt,
      size: String(video.size ?? input.size ?? "720x1280"),
      seconds: String(video.seconds ?? input.seconds ?? 8),
      createdAt: new Date((video.created_at ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
      demoMode: false,
      note: "Talking avatar job started. Poll until the avatar performance is ready.",
      downloadPath: `/api/ai/video/${video.id}/content`,
    };
  } catch (error) {
    talkingAvatar = buildFailedVideoJob(
      {
        prompt: buildTalkingAvatarPrompt(input),
        size: input.size,
        seconds: input.seconds,
        quality: input.quality,
      },
      error
    );
  }

  return {
    id: `avatar-creator-${Date.now()}`,
    sourceImagePreview: input.sourceImageDataUrl,
    variants,
    talkingAvatar,
    monetization: {
      payPerAvatarLabel: "",
      premiumLabel: "Included with Sohba premium plans",
    },
    createdAt: new Date().toISOString(),
    demoMode: false,
  };
}

export async function generateGrowthCoachTool(input: AIGrowthCoachRequest): Promise<AIGrowthCoachResult> {
  if (!client) {
    throw new AIUnavailableError();
  }

  const response = await client.responses.create({
    model: env.openAiTextModel,
    reasoning: { effort: "medium" },
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "You are ViraFlow Growth Coach AI. Return only valid JSON without markdown. The JSON must include: headline, diagnosis, improvements, nextPosts, coachSummary. nextPosts must be an array of 3 objects and each object must include: title, hook, format, reason.",
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: buildGrowthCoachPrompt(input),
          },
        ],
      },
    ],
  });

  const blueprint = parseGrowthCoachBlueprint(response.output_text ?? "");

  return {
    id: `growth-coach-${Date.now()}`,
    headline: blueprint.headline,
    diagnosis: blueprint.diagnosis,
    improvements: blueprint.improvements,
    nextPosts: blueprint.nextPosts,
    coachSummary: blueprint.coachSummary,
    premium: {
      lockedTo: "monthly",
      label: "Premium-only Growth Coach for monthly and yearly plans",
    },
    createdAt: new Date().toISOString(),
    demoMode: false,
  };
}

export async function generateFailureAuditTool(
  input: AIFailureAuditRequest,
  upload?: FailureAuditUpload
): Promise<AIFailureAuditResult> {
  if (!client) {
    throw new AIUnavailableError();
  }

  if (!upload) {
    throw new Error("Upload the video you want analyzed.");
  }

  const transcript = await transcribeFailureAuditVideo(upload, input).catch(() => buildFailureAuditTranscript(input));
  const analysisInput: AIFailureAuditRequest = {
    ...input,
    durationSeconds: input.durationSeconds ?? transcript.durationSeconds,
  };

  {
    const response = await client.responses.create({
      model: env.openAiTextModel,
      reasoning: { effort: "medium" },
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You are ViraFlow Why-Did-This-Fail AI. Return only valid JSON without markdown. The JSON must include: headline, hook, retention, captions, retentionGraph, quickWins, nextMove. hook, retention, and captions must each include: score, verdict, issue, fix. retentionGraph must be an array of exactly 5 objects and each object must include: second, retention, label, note.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: buildFailureAuditPrompt(analysisInput, transcript),
            },
          ],
        },
      ],
    });

    const blueprint = parseFailureAuditBlueprint(response.output_text ?? "");

    return {
      id: `failure-audit-${Date.now()}`,
      headline: blueprint.headline,
      hook: blueprint.hook,
      retention: blueprint.retention,
      captions: blueprint.captions,
      transcript: {
        text: transcript.text,
        source: transcript.source,
      },
      retentionGraph: blueprint.retentionGraph,
      quickWins: blueprint.quickWins,
      nextMove: blueprint.nextMove,
      createdAt: new Date().toISOString(),
      demoMode: false,
    };
  }
}

export async function generateViralEngineTool(input: AIViralEngineRequest): Promise<AIViralEngineResult> {
  if (!client) {
    throw new AIUnavailableError();
  }

  const blueprintResponse = await client.responses.create({
    model: env.openAiTextModel,
    reasoning: { effort: "medium" },
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "You are ViraFlow Viral AI. Return only valid JSON without markdown. The JSON must include: conceptTitle, hook, body, cta, voiceover, captions, videoPrompt, viralScore, bestPostingTime, targetAudience, reasons.",
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: buildViralEnginePrompt(input),
          },
        ],
      },
    ],
  });

  const blueprint = parseViralBlueprint(blueprintResponse.output_text ?? "");
  const engineId = `viral-${Date.now()}`;
  const voice = normalizeVoiceOption(input.voice);

  let audioPath: string | undefined;
  let voiceContentType: string | undefined;

  try {
    const speechResponse = await client.audio.speech.create({
      model: env.openAiVoiceModel,
      voice,
      input: blueprint.voiceover,
      instructions: buildVoiceInstructions(input),
      response_format: "mp3",
    });

    const buffer = Buffer.from(await speechResponse.arrayBuffer());
    voiceContentType = speechResponse.headers.get("content-type") ?? "audio/mpeg";
    saveVoiceAsset({
      id: engineId,
      voice,
      contentType: voiceContentType,
      buffer,
    });
    audioPath = `/api/ai/viral-engine/${engineId}/voice`;
  } catch {
    audioPath = undefined;
  }

  let video: AIVideoJob;

  try {
    video = await createVideoTool({
      prompt: blueprint.videoPrompt,
      style: input.tone,
      shotType: "social-first gym creator pacing with fast visual proof",
      size: input.size,
      seconds: input.seconds,
      quality: input.quality,
    });
  } catch (error) {
    video = buildFailedVideoJob(
      {
        prompt: blueprint.videoPrompt,
        size: input.size,
        seconds: input.seconds,
        quality: input.quality,
      },
      error
    );
  }

  const fullScript = [blueprint.hook, blueprint.body, blueprint.cta].join("\n\n");

  return {
    id: engineId,
    prompt: input.prompt.trim(),
    conceptTitle: blueprint.conceptTitle,
    script: {
      hook: blueprint.hook,
      body: blueprint.body,
      cta: blueprint.cta,
      fullScript,
    },
    captions: blueprint.captions,
    voice: {
      script: blueprint.voiceover,
      voice,
      model: env.openAiVoiceModel,
      audioPath,
      contentType: voiceContentType,
      disclosure: "AI-generated voice preview. Tell users the narration is synthetic before publishing.",
    },
    video,
    insights: {
      viralScore: clampScore(blueprint.viralScore),
      bestPostingTime: blueprint.bestPostingTime,
      targetAudience: blueprint.targetAudience,
      reasons: blueprint.reasons,
    },
    createdAt: new Date().toISOString(),
    demoMode: false,
  };
}

export async function getVideoVariantContent(videoId: string, variant: "video" | "thumbnail") {
  if (!client) {
    return undefined;
  }

  const response = await client.videos.downloadContent(videoId, { variant });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${variant} for video ${videoId}.`);
  }

  return {
    contentType: response.headers.get("content-type") ?? (variant === "thumbnail" ? "image/webp" : "video/mp4"),
    buffer: Buffer.from(await response.arrayBuffer()),
  };
}

export function getViralVoiceContent(id: string) {
  const record = getVoiceAsset(id);
  if (!record) {
    return undefined;
  }

  return {
    contentType: record.contentType,
    buffer: record.buffer,
  };
}

function buildTextPrompt(input: AITextRequest) {
  const common = [
    `Mode: ${input.mode}`,
    `Prompt: ${input.prompt}`,
    `Tone: ${input.tone || "confident and modern"}`,
    `Audience: ${input.audience || "creators and buyers"}`,
    `Goal: ${input.goal || "drive engagement and conversion"}`,
    `Language: ${describeLanguage(input.language)}`,
  ].join("\n");

  switch (input.mode) {
    case "captions":
      return `${common}\nReturn 3 short reel captions with hooks and CTA energy.`;
    case "script":
      return `${common}\nReturn 3 tight short-form video scripts, each with a hook, body, and CTA.`;
    case "product_copy":
      return `${common}\nReturn 3 marketplace-ready product copy options that feel premium and persuasive.`;
  }
}

function buildImagePrompt(input: AIImageRequest) {
  return [
    input.prompt.trim(),
    input.style ? `Style: ${input.style}` : "Style: premium creator ad creative",
    input.aspectRatio ? `Aspect ratio: ${input.aspectRatio}` : "Aspect ratio: 9:16",
  ].join("\n");
}

function buildVideoPrompt(input: AIVideoRequest) {
  return [
    input.prompt.trim(),
    input.style ? `Style: ${input.style}` : "Style: premium social-first motion ad",
    input.shotType ? `Shot type: ${input.shotType}` : "Shot type: dynamic product and creator reveal",
  ].join("\n");
}

function buildViralEnginePrompt(input: AIViralEngineRequest) {
  return [
    `Core request: ${input.prompt.trim()}`,
    `Niche: ${input.niche || "creator growth or social commerce"}`,
    `Audience hint: ${input.audience || "infer the best audience based on the prompt"}`,
    `Offer or angle: ${input.offer || "high-engagement short-form content"}`,
    `Tone: ${input.tone || "bold, fast, premium, social-first"}`,
    `Language: ${describeLanguage(input.language)}`,
    "",
    "Build a single viral reel package for a creator app.",
    "Requirements:",
    "- conceptTitle: short title for the idea.",
    "- hook: one opening line.",
    "- body: 2-4 concise beats for the middle.",
    "- cta: one closing CTA.",
    "- voiceover: a clean narration script that can be spoken naturally.",
    "- captions: array of 3 post-ready captions.",
    "- videoPrompt: detailed visual prompt for a short vertical AI reel.",
    "- viralScore: integer from 55 to 99.",
    "- bestPostingTime: a short answer like '7:00 PM local time'.",
    "- targetAudience: a short audience line like 'males 18-25 into gym motivation'.",
    "- reasons: array of 3 short reasons why it can perform well.",
  ].join("\n");
}

function buildVoiceInstructions(input: AIViralEngineRequest) {
  return [
    `Speak in a ${input.tone || "confident, energetic"} tone.`,
    "Sound like a polished creator ad with clear pacing and strong emphasis on the hook.",
    "Keep the delivery natural, not robotic.",
  ].join(" ");
}

function buildTrendHijackPrompt(trend: AITrendFeedItem, input: AITrendHijackRequest) {
  return [
    `Trend title: ${trend.title}`,
    `Trend hook: ${trend.trendHook}`,
    `Trend niche: ${trend.niche}`,
    `Trend music style: ${trend.musicStyle}`,
    `Trend motion style: ${trend.motionStyle}`,
    `Trend caption seed: ${trend.captionSeed}`,
    `User goal: ${input.userGoal || "use this trend to drive saves and follows"}`,
    `Audience: ${input.audience || "same audience as the original trend but adapted to the creator's offer"}`,
    `Offer: ${input.offer || "creator offer or digital product"}`,
    `Language: ${describeLanguage(input.language)}`,
    ...(input.region ? [`Creator country (ISO code): ${input.region}. Adapt references, slang and timing for this local audience.`] : []),
    "",
    "Generate a trend-hijacked reel package that feels inspired by the trend but not copied directly.",
    "Requirements:",
    "- angle: one short strategic angle line.",
    "- musicStyle: describe the same music vibe in a creator-safe way.",
    "- captions: array with 3 optimized post captions.",
    "- similarVideoPrompt: a detailed vertical reel prompt with similar pacing and energy.",
  ].join("\n");
}

function buildAvatarStylePrompt(style: AIAvatarStyle, input: AIAvatarCreatorRequest) {
  const common = [
    "Preserve the person's identity, facial structure, hairstyle, and camera framing.",
    "Make it clean, polished, and social-media ready.",
    `Niche: ${input.niche || "creator brand"}.`,
  ];

  if (style === "anime") {
    return [
      "Transform this portrait into a premium anime avatar.",
      "Use expressive anime eyes, crisp cel shading, polished lighting, and a high-end streaming-banner feel.",
      ...common,
    ].join(" ");
  }

  if (style === "cartoon") {
    return [
      "Transform this portrait into a modern cartoon avatar.",
      "Use bold shapes, clean outlines, vibrant but tasteful colors, and smooth studio-style lighting.",
      ...common,
    ].join(" ");
  }

  return [
    "Transform this portrait into an influencer-style avatar portrait.",
    "Keep it aspirational, glossy, premium, photogenic, and optimized for creator branding.",
    ...common,
  ].join(" ");
}

function buildTalkingAvatarPrompt(input: AIAvatarCreatorRequest) {
  return [
    "Create a vertical talking avatar video from this portrait.",
    "The person faces camera, blinks naturally, and has subtle realistic mouth movement while speaking.",
    "Keep the body motion calm, premium, and social-first.",
    `Message to speak: ${input.avatarMessage || "Welcome to my page. Follow for more creator tips and fresh drops."}`,
    `Niche: ${input.niche || "creator brand"}.`,
  ].join(" ");
}

function buildGrowthCoachPrompt(input: AIGrowthCoachRequest) {
  return [
    `Niche: ${input.niche || "creator growth"}`,
    `Target audience: ${input.targetAudience || "short-form viewers who save and share helpful content"}`,
    `Recent post topic: ${input.recentPostTopic.trim()}`,
    `Recent caption: ${input.recentCaption || "not provided"}`,
    `Post goal: ${input.postGoal || "drive more saves, profile visits, and comments"}`,
    `Views: ${input.views ?? 0}`,
    `Likes: ${input.likes ?? 0}`,
    `Comments: ${input.comments ?? 0}`,
    `Shares: ${input.shares ?? 0}`,
    `Retention note: ${input.retentionNote || "not provided"}`,
    `Creator pain point: ${input.painPoint || "why the post failed and what to do next"}`,
    `Language: ${describeLanguage(input.language)}`,
    "",
    "Act like a premium growth coach inside a creator app.",
    "Requirements:",
    "- headline: one blunt but supportive diagnosis sentence.",
    "- diagnosis: array of 3 short reasons why the post likely failed.",
    "- improvements: array of 3 concrete changes for the next post.",
    "- nextPosts: array of exactly 3 content ideas. Each idea must have title, hook, format, and reason.",
    "- coachSummary: one short paragraph that motivates the creator and points them toward the next move.",
    "Keep every item practical, social-first, and creator-friendly.",
  ].join("\n");
}

function buildFailureAuditPrompt(input: AIFailureAuditRequest, transcript: FailureAuditTranscriptPayload) {
  return [
    `Video file label: ${input.sourceVideoName}`,
    `Duration seconds: ${input.durationSeconds ?? transcript.durationSeconds ?? 0}`,
    `Caption: ${input.caption || "not provided"}`,
    `Retention note: ${input.retentionNote || "not provided"}`,
    `Views: ${input.views ?? 0}`,
    `Niche: ${input.niche || "creator growth"}`,
    `Target audience: ${input.targetAudience || "short-form viewers who save and share useful content"}`,
    `Language: ${describeLanguage(input.language)}`,
    `Transcript source: ${transcript.source}`,
    `Transcript text: ${truncateFailureAuditText(transcript.text, 1400)}`,
    "Transcript timeline:",
    serializeFailureAuditSegments(transcript.segments),
    "",
    "Analyze why this underperforming short-form video failed.",
    "Requirements:",
    "- headline: one blunt but supportive summary line.",
    "- hook: object with score (0-100), verdict, issue, fix.",
    "- retention: object with score (0-100), verdict, issue, fix.",
    "- captions: object with score (0-100), verdict, issue, fix.",
    "- retentionGraph: array of exactly 5 objects with second, retention, label, note. Use the transcript timing and the actual duration.",
    "- quickWins: array of exactly 3 concrete improvements.",
    "- nextMove: one short sentence telling the creator what to do next.",
    "Make the advice practical, creator-friendly, and optimized for short-form social video.",
  ].join("\n");
}

async function transcribeFailureAuditVideo(
  upload: FailureAuditUpload,
  input: AIFailureAuditRequest
): Promise<FailureAuditTranscriptPayload> {
  if (!client) {
    throw new AIUnavailableError();
  }

  const file = await toFile(upload.buffer, upload.fileName, { type: upload.mimeType });
  const wantsVerboseTimestamps = env.openAiTranscriptionModel === "whisper-1";
  const transcription = (await client.audio.transcriptions.create({
    file,
    model: env.openAiTranscriptionModel,
    language: normalizeTranscriptionLanguage(input.language),
    prompt: buildFailureAuditTranscriptionPrompt(input),
    response_format: wantsVerboseTimestamps ? "verbose_json" : "json",
    ...(wantsVerboseTimestamps ? { timestamp_granularities: ["segment"] } : {}),
  } as any)) as any;

  const text = typeof transcription?.text === "string" ? transcription.text.trim() : "";
  const durationSeconds = normalizeFailureAuditDuration(
    transcription?.duration,
    input.durationSeconds,
    Array.isArray(transcription?.segments) ? transcription.segments : []
  );
  const segments = Array.isArray(transcription?.segments) && transcription.segments.length > 0
    ? transcription.segments
        .map((segment: any) => ({
          start: Math.max(0, Math.round(Number(segment?.start) || 0)),
          end: Math.max(0, Math.round(Number(segment?.end) || 0)),
          text: String(segment?.text ?? "").trim(),
        }))
        .filter((segment: FailureAuditTranscriptSegment) => segment.text)
    : buildFailureAuditSegmentsFromText(text, durationSeconds);

  if (!text) {
    return buildFailureAuditTranscript({
      ...input,
      durationSeconds,
    });
  }

  return {
    text,
    source: "auto",
    durationSeconds,
    segments: segments.length > 0 ? segments : buildFailureAuditSegmentsFromText(text, durationSeconds),
  };
}

function buildFailureAuditTranscriptionPrompt(input: AIFailureAuditRequest) {
  return [
    "Transcribe this short-form creator video clearly.",
    "Preserve spoken hooks, caption-like words, and CTA phrases when possible.",
    `Niche context: ${input.niche || "creator growth"}.`,
    `Audience context: ${input.targetAudience || "short-form viewers who save and share useful content"}.`,
  ].join(" ");
}

function buildFailureAuditTranscript(input: AIFailureAuditRequest): FailureAuditTranscriptPayload {
  // No speech could be transcribed, so the analysis falls back to the creator's own caption text.
  const durationSeconds = Math.max(5, Math.round(input.durationSeconds ?? 12));
  const text = input.caption?.trim() || "";

  return {
    text,
    source: "caption",
    durationSeconds,
    segments: text ? buildFailureAuditSegmentsFromText(text, durationSeconds) : [],
  };
}

function buildFailureAuditSegmentsFromText(text: string, durationSeconds: number): FailureAuditTranscriptSegment[] {
  const normalizedDuration = Math.max(5, Math.round(durationSeconds || 12));
  const phrases = text
    .split(/[.!?]\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 4);

  const chunks = (phrases.length > 0 ? phrases : [text.trim() || "No spoken transcript detected."]).slice(0, 4);
  const sliceLength = Math.max(1, Math.round(normalizedDuration / chunks.length));

  return chunks.map((chunk, index) => {
    const start = index * sliceLength;
    const rawEnd = index === chunks.length - 1 ? normalizedDuration : (index + 1) * sliceLength;
    return {
      start,
      end: Math.max(start + 1, rawEnd),
      text: chunk,
    };
  });
}

function normalizeFailureAuditDuration(
  duration: unknown,
  fallback?: number,
  segments?: Array<{ end?: number }>
) {
  if (typeof duration === "number" && Number.isFinite(duration) && duration > 0) {
    return Math.max(1, Math.round(duration));
  }

  const segmentEnd = Array.isArray(segments)
    ? segments.reduce((max, segment) => {
        const end = Number(segment?.end);
        return Number.isFinite(end) ? Math.max(max, end) : max;
      }, 0)
    : 0;

  if (segmentEnd > 0) {
    return Math.max(1, Math.round(segmentEnd));
  }

  return Math.max(5, Math.round(fallback ?? 12));
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  ar: "Arabic",
  fr: "French",
  es: "Spanish",
  pt: "Portuguese",
  de: "German",
  tr: "Turkish",
  ru: "Russian",
  hi: "Hindi",
  ur: "Urdu",
  ms: "Malay",
  id: "Indonesian",
  zh: "Simplified Chinese",
  ja: "Japanese",
};

/** Turns an app language code ("ms") into a name the model follows reliably ("Malay"). */
function describeLanguage(language?: string) {
  const value = language?.trim();
  if (!value) {
    return "English";
  }
  return LANGUAGE_NAMES[value.toLowerCase()] ?? value;
}

function normalizeTranscriptionLanguage(language?: string) {
  const value = language?.trim().toLowerCase();

  if (isLanguageOption(value)) {
    return value;
  }

  return undefined;
}

function serializeFailureAuditSegments(segments: FailureAuditTranscriptSegment[]) {
  if (segments.length === 0) {
    return "- No transcript segments were detected.";
  }

  return segments
    .slice(0, 8)
    .map((segment) => `- ${segment.start}s-${segment.end}s: ${truncateFailureAuditText(segment.text, 180)}`)
    .join("\n");
}

function truncateFailureAuditText(text: string, maxLength: number) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
}

function splitOutputs(rawText: string) {
  const blocks = rawText
    .split(/\n\s*\n/g)
    .map((block) => block.replace(/^\d+[\).\-\s]*/, "").trim())
    .filter(Boolean);

  if (blocks.length >= 3) {
    return blocks.slice(0, 3);
  }

  const lines = rawText
    .split(/\n/g)
    .map((line) => line.replace(/^\d+[\).\-\s]*/, "").trim())
    .filter(Boolean);

  return lines.slice(0, 3);
}

function buildSummary(mode: AITextRequest["mode"]) {
  if (mode === "captions") {
    return "Fresh reel captions";
  }

  if (mode === "script") {
    return "Short-form video scripts";
  }

  return "Marketplace copy options";
}

function mapAspectRatioToImageSize(aspectRatio: AIImageRequest["aspectRatio"]) {
  if (aspectRatio === "16:9") {
    return "1536x1024";
  }

  if (aspectRatio === "9:16") {
    return "1024x1536";
  }

  return "1024x1024";
}

async function getVideoVariantDataUrl(videoId: string, variant: "thumbnail") {
  const content = await getVideoVariantContent(videoId, variant);
  if (!content) {
    return undefined;
  }

  return `data:${content.contentType};base64,${content.buffer.toString("base64")}`;
}

function normalizeVideoStatus(status: string | undefined): AIVideoJob["status"] {
  if (status === "completed" || status === "failed" || status === "queued" || status === "in_progress") {
    return status;
  }

  return "queued";
}

function normalizeRequestedVideoSize(size: AIVideoRequest["size"]) {
  return size ?? "720x1280";
}

function normalizeRequestedVideoSeconds(seconds: AIVideoRequest["seconds"]) {
  return String(seconds ?? 8);
}

function normalizeVoiceOption(voice?: string): AIVoiceOption {
  const candidate = (voice ?? env.openAiDefaultVoice ?? "coral").toLowerCase();

  if (candidate === "alloy" || candidate === "coral" || candidate === "marin" || candidate === "cedar" || candidate === "sage") {
    return candidate;
  }

  return "coral";
}

function getAvatarStyleTitle(style: AIAvatarStyle) {
  if (style === "anime") {
    return "Anime version";
  }

  if (style === "cartoon") {
    return "Cartoon version";
  }

  return "Influencer style";
}

async function imageDataUrlToFile(dataUrl: string, fileName: string) {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);

  if (!match) {
    throw new Error("Invalid image data URL.");
  }

  const mimeType = match[1];
  const base64 = match[2];
  const buffer = Buffer.from(base64, "base64");
  return toFile(buffer, fileName, { type: mimeType });
}

const TREND_WINDOW_DAYS = 14;
const TREND_CACHE_MS = 5 * 60 * 1000;
const MIN_LOCAL_TRENDS = 4;
const MAX_TRENDS = 12;

interface TrendSourceItem {
  userId: string;
  kind: "reel" | "post";
  tags: string[];
  engagement: number;
  thumbnail: string;
  caption: string;
}

let trendSourceCache: { expiresAt: number; items: TrendSourceItem[]; regionByUser: Map<string, string> } | null = null;
const trendFeedCache = new Map<string, { expiresAt: number; items: AITrendFeedItem[] }>();

export function normalizeRegionCode(value: unknown) {
  return typeof value === "string" && /^[A-Za-z]{2}$/.test(value.trim()) ? value.trim().toUpperCase() : undefined;
}

// Loads the last two weeks of reels and posts plus each creator's region (from their profile).
async function loadTrendSources() {
  if (trendSourceCache && trendSourceCache.expiresAt > Date.now()) {
    return trendSourceCache;
  }

  const firestore = getFirestore();
  if (!firestore) {
    return { items: [] as TrendSourceItem[], regionByUser: new Map<string, string>() };
  }

  const since = new Date(Date.now() - TREND_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const [reelSnapshot, postSnapshot] = await Promise.all([
    firestore.collection("reels").where("createdAt", ">=", since).limit(400).get(),
    firestore.collection("posts").where("createdAt", ">=", since).limit(400).get(),
  ]);

  const readTags = (value: unknown) =>
    Array.isArray(value) ? value.filter((tag: unknown): tag is string => typeof tag === "string") : [];

  const items: TrendSourceItem[] = [];
  reelSnapshot.docs.forEach((item) => {
    const data = item.data() as Record<string, any>;
    items.push({
      userId: String(data.userId ?? ""),
      kind: "reel",
      tags: readTags(data.tags),
      engagement:
        (Array.isArray(data.likedBy) ? data.likedBy.length : 0) * 3 +
        (Number(data.repostCount) || 0) * 4 +
        (Number(data.viewCount) || 0) * 0.1 +
        1,
      thumbnail: typeof data.thumbnailUrl === "string" ? data.thumbnailUrl : "",
      caption: typeof data.caption === "string" ? data.caption : "",
    });
  });
  postSnapshot.docs.forEach((item) => {
    const data = item.data() as Record<string, any>;
    const firstMedia = Array.isArray(data.media) ? data.media[0] : undefined;
    items.push({
      userId: String(data.userId ?? ""),
      kind: "post",
      tags: readTags(data.hashtags),
      engagement: (Array.isArray(data.likedBy) ? data.likedBy.length : 0) * 3 + (Number(data.commentCount) || 0) * 4 + 1,
      thumbnail: String(firstMedia?.thumbnailUrl || firstMedia?.url || ""),
      caption: typeof data.caption === "string" ? data.caption : "",
    });
  });

  const regionByUser = new Map<string, string>();
  const userIds = [...new Set(items.map((item) => item.userId).filter(Boolean))];
  for (let index = 0; index < userIds.length; index += 100) {
    const refs = userIds.slice(index, index + 100).map((userId) => firestore.collection("users").doc(userId));
    const snapshots = refs.length > 0 ? await firestore.getAll(...refs) : [];
    snapshots.forEach((snapshot) => {
      const region = normalizeRegionCode(snapshot.get("region"));
      if (region) {
        regionByUser.set(snapshot.id, region);
      }
    });
  }

  trendSourceCache = { expiresAt: Date.now() + TREND_CACHE_MS, items, regionByUser };
  return trendSourceCache;
}

function rankTrends(items: TrendSourceItem[], scope: "local" | "global", region?: string): AITrendFeedItem[] {
  interface TagStats {
    tag: string;
    reelCount: number;
    postCount: number;
    creators: Set<string>;
    engagement: number;
    topThumbnail: string;
    topCaption: string;
    topEngagement: number;
  }

  const stats = new Map<string, TagStats>();
  items.forEach((input) => {
    input.tags.forEach((rawTag) => {
      const tag = rawTag.trim().replace(/^#+/, "").toLowerCase();
      if (!tag) {
        return;
      }
      const current =
        stats.get(tag) ??
        ({ tag, reelCount: 0, postCount: 0, creators: new Set<string>(), engagement: 0, topThumbnail: "", topCaption: "", topEngagement: -1 } as TagStats);
      if (input.kind === "reel") {
        current.reelCount += 1;
      } else {
        current.postCount += 1;
      }
      current.creators.add(input.userId);
      current.engagement += input.engagement;
      if (input.engagement > current.topEngagement && input.thumbnail) {
        current.topEngagement = input.engagement;
        current.topThumbnail = input.thumbnail;
        current.topCaption = input.caption;
      }
      stats.set(tag, current);
    });
  });

  const ranked = [...stats.values()]
    .filter((item) => item.reelCount + item.postCount >= 2 && item.topThumbnail)
    .sort((left, right) => right.engagement - left.engagement)
    .slice(0, MAX_TRENDS);
  const topEngagement = ranked[0]?.engagement ?? 1;

  return ranked.map((item) => ({
    id: `tag-${item.tag}`,
    title: `#${item.tag}`,
    trendHook: `${item.reelCount} reels and ${item.postCount} posts from ${item.creators.size} creators used #${item.tag} in the last ${TREND_WINDOW_DAYS} days.`,
    niche: item.tag,
    musicStyle: `Audio that matches the top-performing #${item.tag} content`,
    motionStyle: `Vertical short-form pacing similar to the leading #${item.tag} reels`,
    momentumScore: Math.max(1, Math.round((item.engagement / topEngagement) * 100)),
    captionSeed: item.topCaption.slice(0, 220),
    thumbnailUrl: item.topThumbnail,
    demoMode: false,
    scope,
    region: scope === "local" ? region : undefined,
    reelCount: item.reelCount,
    postCount: item.postCount,
    creatorCount: item.creators.size,
    windowDays: TREND_WINDOW_DAYS,
  }));
}

// Trends are computed from what creators actually publish on Sohba: hashtags used on reels and posts
// in the last two weeks, weighted by real likes, comments, reposts and views. With a region, trends from
// creators in that country come first; global trends fill the list when the region is still quiet.
async function buildTrendFeedFromPlatform(regionInput?: string): Promise<AITrendFeedItem[]> {
  const region = normalizeRegionCode(regionInput);
  const cacheKey = region ?? "GLOBAL";
  const cached = trendFeedCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.items;
  }

  const { items, regionByUser } = await loadTrendSources();
  const global = rankTrends(items, "global");
  let result = global;

  if (region) {
    const local = rankTrends(
      items.filter((item) => regionByUser.get(item.userId) === region),
      "local",
      region
    );
    const localIds = new Set(local.map((item) => item.id));
    const fill = local.length >= MIN_LOCAL_TRENDS ? [] : global.filter((item) => !localIds.has(item.id));
    result = [...local, ...fill].slice(0, MAX_TRENDS);
  }

  trendFeedCache.set(cacheKey, { expiresAt: Date.now() + TREND_CACHE_MS, items: result });
  return result;
}

export class AIUnavailableError extends Error {
  statusCode = 503;

  constructor(message = "AI generation is not available on the server right now. Please try again later.") {
    super(message);
    this.name = "AIUnavailableError";
  }
}

export class AIResponseError extends Error {
  statusCode = 502;

  constructor(message = "The AI service returned an incomplete response. Please try again.") {
    super(message);
    this.name = "AIResponseError";
  }
}

function extractJsonObject(rawText: string): Record<string, unknown> {
  const match = rawText.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new AIResponseError();
  }

  try {
    const parsed = JSON.parse(match[0]);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new AIResponseError();
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof AIResponseError) {
      throw error;
    }
    throw new AIResponseError();
  }
}

function requireText(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) {
    throw new AIResponseError();
  }
  return text;
}

function requireTextList(value: unknown, max = 3) {
  const items = Array.isArray(value) ? value.map((item) => String(item ?? "").trim()).filter(Boolean).slice(0, max) : [];
  if (items.length === 0) {
    throw new AIResponseError();
  }
  return items;
}

function parseTrendHijackBlueprint(rawText: string): TrendHijackBlueprint {
  const parsed = extractJsonObject(rawText);

  return {
    angle: requireText(parsed.angle),
    musicStyle: requireText(parsed.musicStyle),
    captions: requireTextList(parsed.captions),
    similarVideoPrompt: requireText(parsed.similarVideoPrompt),
  };
}

function parseGrowthCoachBlueprint(rawText: string): GrowthCoachBlueprint {
  const parsed = extractJsonObject(rawText);
  const nextPosts = (Array.isArray(parsed.nextPosts) ? parsed.nextPosts : [])
    .map((idea: any) => ({
      title: String(idea?.title ?? "").trim(),
      hook: String(idea?.hook ?? "").trim(),
      format: String(idea?.format ?? "").trim(),
      reason: String(idea?.reason ?? "").trim(),
    }))
    .filter((idea) => idea.title && idea.hook && idea.format && idea.reason)
    .slice(0, 3);

  if (nextPosts.length === 0) {
    throw new AIResponseError();
  }

  return {
    headline: requireText(parsed.headline),
    diagnosis: requireTextList(parsed.diagnosis),
    improvements: requireTextList(parsed.improvements),
    nextPosts,
    coachSummary: requireText(parsed.coachSummary),
  };
}

function parseFailureAuditBlueprint(rawText: string): FailureAuditBlueprint {
  const parsed = extractJsonObject(rawText);

  return {
    headline: requireText(parsed.headline),
    hook: normalizeFailureAuditSection(parsed.hook),
    retention: normalizeFailureAuditSection(parsed.retention),
    captions: normalizeFailureAuditSection(parsed.captions),
    retentionGraph: normalizeFailureRetentionGraph(parsed.retentionGraph),
    quickWins: requireTextList(parsed.quickWins),
    nextMove: requireText(parsed.nextMove),
  };
}

function normalizeFailureAuditSection(value: unknown): AIFailureAuditSection {
  const section = (value && typeof value === "object" ? value : {}) as Partial<AIFailureAuditSection>;
  if (typeof section.score !== "number" || !Number.isFinite(section.score)) {
    throw new AIResponseError();
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(section.score))),
    verdict: requireText(section.verdict),
    issue: requireText(section.issue),
    fix: requireText(section.fix),
  };
}

function normalizeFailureRetentionGraph(value: unknown): AIFailureAuditRetentionPoint[] {
  const graph = Array.isArray(value) ? value : [];
  const normalized = graph
    .map((point: any) => ({
      second: typeof point?.second === "number" && Number.isFinite(point.second) ? Math.max(0, Math.round(point.second)) : NaN,
      retention:
        typeof point?.retention === "number" && Number.isFinite(point.retention)
          ? Math.max(0, Math.min(100, Math.round(point.retention)))
          : NaN,
      label: String(point?.label ?? "").trim(),
      note: String(point?.note ?? "").trim(),
    }))
    .filter((point) => Number.isFinite(point.second) && Number.isFinite(point.retention) && point.label && point.note)
    .sort((left, right) => left.second - right.second);

  if (normalized.length === 0) {
    throw new AIResponseError();
  }

  return normalized;
}

function parseViralBlueprint(rawText: string): ViralBlueprint {
  const parsed = extractJsonObject(rawText);
  const viralScore = typeof parsed.viralScore === "number" ? parsed.viralScore : Number(parsed.viralScore);

  if (!Number.isFinite(viralScore)) {
    throw new AIResponseError();
  }

  return {
    conceptTitle: requireText(parsed.conceptTitle),
    hook: requireText(parsed.hook),
    body: requireText(parsed.body),
    cta: requireText(parsed.cta),
    voiceover: requireText(parsed.voiceover),
    captions: requireTextList(parsed.captions),
    videoPrompt: requireText(parsed.videoPrompt),
    viralScore,
    bestPostingTime: requireText(parsed.bestPostingTime),
    targetAudience: requireText(parsed.targetAudience),
    reasons: requireTextList(parsed.reasons),
  };
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function buildFailedVideoJob(input: AIVideoRequest, error: unknown): AIVideoJob {
  return {
    id: `video-failed-${Date.now()}`,
    status: "failed",
    progress: 0,
    model: input.quality === "quality" ? "sora-2-pro" : env.openAiVideoModel,
    prompt: input.prompt,
    size: input.size ?? "720x1280",
    seconds: String(input.seconds ?? 8),
    createdAt: new Date().toISOString(),
    demoMode: false,
    error: error instanceof Error ? error.message : "The video render could not be started.",
    note: "The video render could not be started. The rest of the package was generated normally.",
  };
}
