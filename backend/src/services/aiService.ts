import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { env } from "../config/env";
import { getVoiceAsset, saveVoiceAsset } from "../data/aiAssetStore";
import { createDemoVideoJob, getDemoVideoJob } from "../data/aiDemoStore";
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
  source: "auto" | "demo";
  durationSeconds: number;
  segments: FailureAuditTranscriptSegment[];
}

const client = env.openAiApiKey ? new OpenAI({ apiKey: env.openAiApiKey }) : null;
const trendFeed: AITrendFeedItem[] = [
  {
    id: "trend-gym-proof-stack",
    title: "Proof Stack Cut",
    trendHook: "Quick 3-shot proof reveal with impact text in the first second.",
    niche: "Fitness",
    musicStyle: "hard-hitting drill beat with gym stomp energy",
    motionStyle: "fast zoom cuts, rep close-ups, sweat texture overlays",
    momentumScore: 91,
    captionSeed: "Show proof first, explanation second, CTA last.",
    thumbnailUrl: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80",
    demoMode: true,
  },
  {
    id: "trend-fashion-flash-switch",
    title: "Flash Switch Transition",
    trendHook: "One-frame flash cuts between before and after looks.",
    niche: "Fashion",
    musicStyle: "sleek electro-pop with runway pulse",
    motionStyle: "flash cuts, mirror reveals, silhouette swaps",
    momentumScore: 88,
    captionSeed: "Build around the transformation and keep the text minimal.",
    thumbnailUrl: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80",
    demoMode: true,
  },
  {
    id: "trend-productivity-overlay-loop",
    title: "Overlay Loop Breakdown",
    trendHook: "Loop a tiny workflow while text overlays reveal the hack step-by-step.",
    niche: "Productivity",
    musicStyle: "clean lo-fi bounce with subtle tech percussion",
    motionStyle: "screen recording loops, cursor snaps, clean text overlays",
    momentumScore: 84,
    captionSeed: "Keep the edit loop seamless so viewers rewatch automatically.",
    thumbnailUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
    demoMode: true,
  },
];

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
    return buildDemoTextResult(input);
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

  const rawText = response.output_text?.trim() || "No output returned.";
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
    return {
      id: `ai-image-${Date.now()}`,
      prompt: buildImagePrompt(input),
      imageDataUrl: buildDemoImagePreview(input.prompt),
      revisedPrompt: "Demo mode image preview",
      model: env.openAiImageModel,
      createdAt: new Date().toISOString(),
      demoMode: true,
    };
  }

  const response = await client.images.generate({
    model: env.openAiImageModel,
    prompt: buildImagePrompt(input),
    size: mapAspectRatioToImageSize(input.aspectRatio),
  });

  const imageResult = response.data?.[0];
  const imageBase64 = imageResult?.b64_json ?? "";
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
    return createDemoVideoJob(input);
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
    return getDemoVideoJob(videoId);
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

export function listTrendFeed(): AITrendFeedItem[] {
  return trendFeed.map((trend) => ({
    ...trend,
    demoMode: !client,
  }));
}

export async function generateTrendHijackTool(input: AITrendHijackRequest): Promise<AITrendHijackResult> {
  const trend = getTrendById(input.trendId);

  if (!trend) {
    throw new Error("Trend not found.");
  }

  if (!client) {
    return buildDemoTrendHijackResult(trend, input);
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

  const blueprint = parseTrendHijackBlueprint(response.output_text ?? "", trend, input);
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
  } catch {
    video = createDemoVideoJob({
      prompt: blueprint.similarVideoPrompt,
      style: `${trend.musicStyle}; ${trend.motionStyle}`,
      shotType: "trend-led vertical pacing with creator-safe differentiation",
      size: input.size,
      seconds: input.seconds,
      quality: input.quality,
    });
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
    demoMode: video.demoMode,
  };
}

export async function generateAvatarCreatorTool(input: AIAvatarCreatorRequest): Promise<AIAvatarCreatorResult> {
  if (!client) {
    return buildDemoAvatarCreatorResult(input);
  }

  const styles: AIAvatarStyle[] = ["anime", "cartoon", "influencer"];
  const variants = await Promise.all(
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
        const imageDataUrl = imageResult?.b64_json
          ? `data:image/png;base64,${imageResult.b64_json}`
          : input.sourceImageDataUrl;

        return {
          id: `avatar-${style}-${Date.now()}`,
          style,
          title: getAvatarStyleTitle(style),
          imageDataUrl,
          prompt,
          demoMode: false,
        } satisfies AIAvatarVariant;
      } catch {
        return buildDemoAvatarVariant(style, input.sourceImageDataUrl);
      }
    })
  );

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
  } catch {
    talkingAvatar = createDemoVideoJob({
      prompt: buildTalkingAvatarPrompt(input),
      style: "talking avatar, creator-friendly facial motion, polished lighting",
      shotType: "tight portrait talking to camera with clean blinking and lip movement",
      size: input.size,
      seconds: input.seconds,
      quality: input.quality,
    });
  }

  return {
    id: `avatar-creator-${Date.now()}`,
    sourceImagePreview: input.sourceImageDataUrl,
    variants,
    talkingAvatar,
    monetization: {
      payPerAvatarLabel: "$2 per avatar",
      premiumLabel: "Included in Premium Creator and Yearly Growth",
    },
    createdAt: new Date().toISOString(),
    demoMode: talkingAvatar.demoMode || variants.some((variant) => variant.demoMode),
  };
}

export async function generateGrowthCoachTool(input: AIGrowthCoachRequest): Promise<AIGrowthCoachResult> {
  if (!client) {
    return buildDemoGrowthCoachResult(input);
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

  const blueprint = parseGrowthCoachBlueprint(response.output_text ?? "", input);

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
  const fallbackTranscript = buildFailureAuditTranscript(input);

  if (!client || !upload) {
    return buildDemoFailureAuditResult(input, fallbackTranscript);
  }

  const transcript = await transcribeFailureAuditVideo(upload, input).catch(() => fallbackTranscript);
  const analysisInput: AIFailureAuditRequest = {
    ...input,
    durationSeconds: input.durationSeconds ?? transcript.durationSeconds,
  };

  try {
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

    const blueprint = parseFailureAuditBlueprint(response.output_text ?? "", analysisInput, transcript);

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
      demoMode: transcript.source !== "auto",
    };
  } catch {
    return buildDemoFailureAuditResult(analysisInput, transcript);
  }
}

export async function generateViralEngineTool(input: AIViralEngineRequest): Promise<AIViralEngineResult> {
  if (!client) {
    return buildDemoViralEngineResult(input);
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

  const blueprint = parseViralBlueprint(blueprintResponse.output_text ?? "", input);
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
  } catch {
    const fallbackVideo = createDemoVideoJob({
      prompt: blueprint.videoPrompt,
      style: input.tone,
      shotType: "social-first gym creator pacing with fast visual proof",
      size: input.size,
      seconds: input.seconds,
      quality: input.quality,
    });

    video = {
      ...fallbackVideo,
      note: "Video fell back to demo mode while the viral strategy package generated successfully.",
    };
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
    demoMode: video.demoMode || !audioPath,
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
    `Language: ${input.language || "English"}`,
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
    `Language: ${input.language || "English"}`,
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
    `Language: ${input.language || "English"}`,
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
    `Language: ${input.language || "English"}`,
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
    `Language: ${input.language || "English"}`,
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
    return buildFailureAuditTranscript(input);
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
  const durationSeconds = Math.max(5, Math.round(input.durationSeconds ?? 12));
  const text =
    input.caption?.trim() ||
    ((input.niche || "").toLowerCase().includes("fitness")
      ? "Watch this before you post your next gym reel. Lead with the transformation, show the training proof, then ask viewers to save the routine."
      : "This is the demo transcript for the underperforming reel. The creator sets up the idea slowly, explains the value late, and closes with a weak call to action.");

  return {
    text,
    source: "demo",
    durationSeconds,
    segments: buildFailureAuditSegmentsFromText(text, durationSeconds),
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

function normalizeTranscriptionLanguage(language?: string) {
  const value = language?.trim().toLowerCase();

  if (value === "en" || value === "ar" || value === "fr" || value === "es") {
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

function buildDemoTextResult(input: AITextRequest): AITextResult {
  const base = input.prompt.trim();
  const outputs =
    input.mode === "captions"
      ? [
          `POV: ${base} but this time it actually converts. Save this for your next viral drop.`,
          `${base}. Clean hook, strong payoff, and a CTA that makes people click.`,
          `This is how creators turn ${base.toLowerCase()} into reach, trust, and sales in one post.`,
        ]
      : input.mode === "script"
        ? [
            `Hook: Stop scrolling if you want ${base.toLowerCase()}.\nBody: Show the before, reveal the shift, and explain the one move that changed the result.\nCTA: Follow for the next build.`,
            `Hook: I tested ${base.toLowerCase()} so you don't have to.\nBody: Start with the pain point, drop the result, then walk through the exact workflow.\nCTA: Comment READY for the template.`,
            `Hook: Here's the fastest way to improve ${base.toLowerCase()}.\nBody: Use three beats: problem, proof, payoff.\nCTA: Save this before your next post.`,
          ]
        : [
            `${base}\nA premium creator-ready offer designed to feel high-value, fast to understand, and easy to buy.`,
            `Turn attention into revenue with ${base.toLowerCase()}.\nBuilt for fast decision-making and clean buyer confidence.`,
            `${base}\nClear outcome. Strong positioning. A polished marketplace listing that feels worth paying for.`,
          ];

  return {
    id: `ai-text-${Date.now()}`,
    mode: input.mode,
    outputs,
    summary: `${buildSummary(input.mode)} in demo mode`,
    model: env.openAiTextModel,
    createdAt: new Date().toISOString(),
    demoMode: true,
  };
}

function buildDemoTrendHijackResult(trend: AITrendFeedItem, input: AITrendHijackRequest): AITrendHijackResult {
  const angle =
    trend.niche === "Fitness"
      ? "Use the proof-stack format to show a visible gym win in the first second, then sell the routine behind it."
      : `Use ${trend.title.toLowerCase()} pacing but shift the payoff toward your offer and audience.`;
  const similarVideoPrompt = [
    `Create a vertical short-form reel inspired by the "${trend.title}" trend.`,
    `Hook with ${trend.trendHook}`,
    `Match the energy of ${trend.motionStyle}.`,
    `Keep the soundtrack vibe similar to ${trend.musicStyle}.`,
    `Creator goal: ${input.userGoal || "drive saves, shares, and profile visits"}.`,
  ].join(" ");
  const video = createDemoVideoJob({
    prompt: similarVideoPrompt,
    style: `${trend.musicStyle}; ${trend.motionStyle}`,
    shotType: "trend-led vertical pacing with creator-safe differentiation",
    size: input.size,
    seconds: input.seconds,
    quality: input.quality,
  });

  return {
    id: `trend-demo-${Date.now()}`,
    trend,
    angle,
    similarVideoPrompt,
    musicStyle: trend.musicStyle,
    optimizedCaptions: [
      `${trend.captionSeed} This is the version built for ${input.offer || "your offer"} and today's audience.`,
      `Same addictive energy, sharper positioning, and a caption built to push saves.`,
      `Trend-hijacked the smart way: familiar rhythm, new payoff, stronger conversion.`,
    ],
    video,
    createdAt: new Date().toISOString(),
    demoMode: true,
  };
}

function buildDemoAvatarCreatorResult(input: AIAvatarCreatorRequest): AIAvatarCreatorResult {
  const styles: AIAvatarStyle[] = ["anime", "cartoon", "influencer"];
  const variants: AIAvatarVariant[] = styles.map((style) =>
    buildDemoAvatarVariant(style, input.sourceImageDataUrl)
  );

  return {
    id: `avatar-demo-${Date.now()}`,
    sourceImagePreview: input.sourceImageDataUrl,
    variants,
    talkingAvatar: createDemoVideoJob({
      prompt: buildTalkingAvatarPrompt(input),
      style: "talking avatar, creator-friendly facial motion, polished lighting",
      shotType: "tight portrait talking to camera with clean blinking and lip movement",
      size: input.size,
      seconds: input.seconds,
      quality: input.quality,
    }),
    monetization: {
      payPerAvatarLabel: "$2 per avatar",
      premiumLabel: "Included in Premium Creator and Yearly Growth",
    },
    createdAt: new Date().toISOString(),
    demoMode: true,
  };
}

function buildDemoGrowthCoachResult(input: AIGrowthCoachRequest): AIGrowthCoachResult {
  const topic = input.recentPostTopic.trim();
  const loweredTopic = topic.toLowerCase();
  const niche = input.niche || "creator growth";
  const audience = input.targetAudience || "short-form viewers who save useful content";
  const goal = input.postGoal || "more saves, comments, and profile visits";
  const views = input.views ?? 1200;
  const likes = input.likes ?? 24;
  const comments = input.comments ?? 3;
  const shares = input.shares ?? 2;

  return {
    id: `growth-coach-demo-${Date.now()}`,
    headline: loweredTopic.includes("gym")
      ? "Your post had gym energy, but the value was not obvious fast enough."
      : `Your "${topic}" post likely asked for attention before it earned curiosity.`,
    diagnosis: [
      `The hook was probably too generic for a ${niche} audience, especially with ${views.toLocaleString()} views only turning into ${likes} likes.`,
      `The post goal of ${goal.toLowerCase()} was not built into the first seconds, so the viewer had little reason to stay.`,
      `Weak community signals (${comments} comments and ${shares} shares) suggest the post felt broad instead of specific and useful.`,
    ],
    improvements: [
      "Lead with proof, tension, or a visible outcome before teaching anything.",
      `Write the caption for ${audience.toLowerCase()} with one promise, one proof point, and one CTA to save or comment.`,
      `Fix the weak spot directly: ${input.retentionNote || "tighten the first 3 seconds and make the payoff clearer sooner"}.`,
    ],
    nextPosts: [
      {
        title: loweredTopic.includes("gym") ? "Proof-first gym reel" : `${niche} proof-first reel`,
        hook: loweredTopic.includes("gym")
          ? "If your gym content gets ignored, steal this opening."
          : `If your ${niche.toLowerCase()} content keeps flopping, start with this angle.`,
        format: "Vertical reel that opens with a result shot, then moves into 3 fast teaching beats.",
        reason: "This format earns attention quickly because the viewer sees the payoff before the explanation.",
      },
      {
        title: "Mistake breakdown post",
        hook: "This one posting mistake is quietly killing your reach.",
        format: "Talking-head reel or carousel that shows one mistake, one fix, and one example.",
        reason: "It positions you as the coach and gives viewers a reason to comment or save the post.",
      },
      {
        title: "Comment magnet comparison",
        hook: `Would you choose fast views or real ${goal.toLowerCase()}?`,
        format: "Question-led reel with two options on screen and a direct CTA to comment.",
        reason: "It is designed to trigger engagement and teach the algorithm who should see your next post.",
      },
    ],
    coachSummary:
      input.painPoint ||
      "You are likely close, but the content needs a sharper promise, faster proof, and a more specific ask to the audience.",
    premium: {
      lockedTo: "monthly",
      label: "Premium-only Growth Coach for monthly and yearly plans",
    },
    createdAt: new Date().toISOString(),
    demoMode: true,
  };
}

function buildDemoFailureAuditResult(
  input: AIFailureAuditRequest,
  transcript = buildFailureAuditTranscript(input)
): AIFailureAuditResult {
  const caption = input.caption?.trim() || "No caption provided.";
  const loweredCaption = caption.toLowerCase();
  const isGymContent =
    loweredCaption.includes("gym") || (input.niche || "").toLowerCase().includes("fitness");
  const views = input.views ?? 980;
  const durationSeconds = input.durationSeconds ?? transcript.durationSeconds ?? 12;

  return {
    id: `failure-audit-demo-${Date.now()}`,
    headline: isGymContent
      ? "Your fitness reel likely lost attention before the proof shot or payoff became obvious."
      : `Your "${input.sourceVideoName}" reel likely did not prove its value early enough.`,
    hook: {
      score: isGymContent ? 44 : 48,
      verdict: "Weak opening",
      issue: `The first second likely was not strong enough to convert the initial ${views.toLocaleString()} views into watch time.`,
      fix: "Start with a visible result, a strong pain point, or a surprising statement before any setup.",
    },
    retention: {
      score: durationSeconds > 15 ? 41 : 53,
      verdict: durationSeconds > 15 ? "Viewer drop-off too early" : "Pacing needs tightening",
      issue: input.retentionNote || "The middle of the edit probably slows down before the payoff lands.",
      fix: "Trim dead space, move the best proof shot earlier, and keep each beat visually different.",
    },
    captions: {
      score: caption === "No caption provided." ? 38 : 57,
      verdict: caption === "No caption provided." ? "Caption layer missing" : "Caption not adding enough pull",
      issue:
        caption === "No caption provided."
          ? "The reel misses a second chance to explain value and ask for a save or comment."
          : `"${caption}" likely describes the post, but it does not sharpen the hook or create enough urgency.`,
      fix: "Write one line that makes the promise clearer, then add a CTA for saves, comments, or profile visits.",
    },
    transcript: {
      text: transcript.text,
      source: transcript.source,
    },
    retentionGraph: buildFailureAuditRetentionGraph(input, transcript),
    quickWins: [
      "Swap the first shot for your most visual proof or strongest emotional beat.",
      "Cut anything that delays the payoff in the first half of the video.",
      "Rewrite the caption so it strengthens the hook instead of repeating the same idea.",
    ],
    nextMove: isGymContent
      ? "Recut the fitness reel so the transformation or proof shot appears first and the explanation comes second."
      : "Post a tighter version with a stronger first second, faster proof, and a caption written for saves.",
    createdAt: new Date().toISOString(),
    demoMode: true,
  };
}

function buildDemoAvatarVariant(style: AIAvatarStyle, sourceImageDataUrl: string): AIAvatarVariant {
  return {
    id: `avatar-variant-${style}-${Date.now()}`,
    style,
    title: getAvatarStyleTitle(style),
    imageDataUrl: sourceImageDataUrl,
    prompt: `${getAvatarStyleTitle(style)} demo preview`,
    demoMode: true,
  };
}

function buildDemoViralEngineResult(input: AIViralEngineRequest): AIViralEngineResult {
  const prompt = input.prompt.trim();
  const lowered = prompt.toLowerCase();
  const conceptTitle = lowered.includes("gym") ? "Gym glow-up reel" : "Creator growth reel";
  const hook = lowered.includes("gym")
    ? "If your gym content feels flat, this is the reel that wakes your audience up."
    : `If you want ${prompt.toLowerCase()}, start with this angle.`;
  const body = lowered.includes("gym")
    ? "Open with a hard before-and-after lift shot, cut into a fast training sequence, then flash the exact habit that changed the physique."
    : "Open on the pain point, reveal a visible transformation, and stack quick proof moments so the payoff feels undeniable.";
  const cta = "Follow for the next viral build and save this before your next post.";
  const fullScript = [hook, body, cta].join("\n\n");
  const voice = normalizeVoiceOption(input.voice);
  const video = createDemoVideoJob({
    prompt: `${prompt}. Vertical reel with rapid cuts, proof-driven pacing, and creator-style captions.`,
    style: input.tone || "energetic premium creator ad",
    shotType: "rapid hook, social proof, payoff finish",
    size: input.size,
    seconds: input.seconds,
    quality: input.quality,
  });

  return {
    id: `viral-demo-${Date.now()}`,
    prompt,
    conceptTitle,
    script: {
      hook,
      body,
      cta,
      fullScript,
    },
    captions: [
      "From average gym clips to content people actually save. This is the switch.",
      "The fastest way to make your gym reel feel premium, sharp, and worth rewatching.",
      "If your fitness content deserves more reach, start here and build from this format.",
    ],
    voice: {
      script: fullScript,
      voice,
      model: env.openAiVoiceModel,
      disclosure: "Demo mode only. Connect OPENAI_API_KEY to generate an actual AI voice preview.",
    },
    video,
    insights: {
      viralScore: 82,
      bestPostingTime: "7:00 PM local time",
      targetAudience: input.audience || "males 18-25 into gym motivation and physique content",
      reasons: [
        "The hook creates instant tension in the first second.",
        "Transformation visuals fit high-retention fitness content.",
        "The CTA naturally encourages saves and follows.",
      ],
    },
    createdAt: new Date().toISOString(),
    demoMode: true,
  };
}

function buildDemoImagePreview(prompt: string) {
  const normalized = prompt.toLowerCase();

  if (normalized.includes("fashion")) {
    return "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80";
  }

  if (normalized.includes("product")) {
    return "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=900&q=80";
  }

  if (normalized.includes("gym") || normalized.includes("fitness")) {
    return "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80";
  }

  return "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=900&q=80";
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

function getTrendById(id: string) {
  return trendFeed.find((trend) => trend.id === id);
}

function parseTrendHijackBlueprint(rawText: string, trend: AITrendFeedItem, input: AITrendHijackRequest): TrendHijackBlueprint {
  const fallback = buildDemoTrendHijackResult(trend, input);
  const match = rawText.match(/\{[\s\S]*\}/);

  if (!match) {
    return {
      angle: fallback.angle,
      musicStyle: fallback.musicStyle,
      captions: fallback.optimizedCaptions,
      similarVideoPrompt: fallback.similarVideoPrompt,
    };
  }

  try {
    const parsed = JSON.parse(match[0]) as Partial<TrendHijackBlueprint>;

    return {
      angle: parsed.angle?.trim() || fallback.angle,
      musicStyle: parsed.musicStyle?.trim() || fallback.musicStyle,
      captions:
        Array.isArray(parsed.captions) && parsed.captions.length > 0
          ? parsed.captions.map((item) => String(item).trim()).filter(Boolean).slice(0, 3)
          : fallback.optimizedCaptions,
      similarVideoPrompt: parsed.similarVideoPrompt?.trim() || fallback.similarVideoPrompt,
    };
  } catch {
    return {
      angle: fallback.angle,
      musicStyle: fallback.musicStyle,
      captions: fallback.optimizedCaptions,
      similarVideoPrompt: fallback.similarVideoPrompt,
    };
  }
}

function parseGrowthCoachBlueprint(rawText: string, input: AIGrowthCoachRequest): GrowthCoachBlueprint {
  const fallback = buildDemoGrowthCoachResult(input);
  const match = rawText.match(/\{[\s\S]*\}/);

  if (!match) {
    return {
      headline: fallback.headline,
      diagnosis: fallback.diagnosis,
      improvements: fallback.improvements,
      nextPosts: fallback.nextPosts,
      coachSummary: fallback.coachSummary,
    };
  }

  try {
    const parsed = JSON.parse(match[0]) as Partial<GrowthCoachBlueprint>;

    const nextPosts =
      Array.isArray(parsed.nextPosts) && parsed.nextPosts.length > 0
        ? parsed.nextPosts
            .map((idea) => ({
              title: String(idea?.title ?? "").trim(),
              hook: String(idea?.hook ?? "").trim(),
              format: String(idea?.format ?? "").trim(),
              reason: String(idea?.reason ?? "").trim(),
            }))
            .filter((idea) => idea.title && idea.hook && idea.format && idea.reason)
            .slice(0, 3)
        : fallback.nextPosts;

    return {
      headline: parsed.headline?.trim() || fallback.headline,
      diagnosis:
        Array.isArray(parsed.diagnosis) && parsed.diagnosis.length > 0
          ? parsed.diagnosis.map((item) => String(item).trim()).filter(Boolean).slice(0, 3)
          : fallback.diagnosis,
      improvements:
        Array.isArray(parsed.improvements) && parsed.improvements.length > 0
          ? parsed.improvements.map((item) => String(item).trim()).filter(Boolean).slice(0, 3)
          : fallback.improvements,
      nextPosts: nextPosts.length === 3 ? nextPosts : fallback.nextPosts,
      coachSummary: parsed.coachSummary?.trim() || fallback.coachSummary,
    };
  } catch {
    return {
      headline: fallback.headline,
      diagnosis: fallback.diagnosis,
      improvements: fallback.improvements,
      nextPosts: fallback.nextPosts,
      coachSummary: fallback.coachSummary,
    };
  }
}

function parseFailureAuditBlueprint(
  rawText: string,
  input: AIFailureAuditRequest,
  transcript: FailureAuditTranscriptPayload
): FailureAuditBlueprint {
  const fallback = buildDemoFailureAuditResult(input, transcript);
  const match = rawText.match(/\{[\s\S]*\}/);

  if (!match) {
    return {
      headline: fallback.headline,
      hook: fallback.hook,
      retention: fallback.retention,
      captions: fallback.captions,
      retentionGraph: fallback.retentionGraph,
      quickWins: fallback.quickWins,
      nextMove: fallback.nextMove,
    };
  }

  try {
    const parsed = JSON.parse(match[0]) as Partial<FailureAuditBlueprint>;

    return {
      headline: parsed.headline?.trim() || fallback.headline,
      hook: normalizeFailureAuditSection(parsed.hook, fallback.hook),
      retention: normalizeFailureAuditSection(parsed.retention, fallback.retention),
      captions: normalizeFailureAuditSection(parsed.captions, fallback.captions),
      retentionGraph: normalizeFailureRetentionGraph(parsed.retentionGraph, fallback.retentionGraph),
      quickWins:
        Array.isArray(parsed.quickWins) && parsed.quickWins.length > 0
          ? parsed.quickWins.map((item) => String(item).trim()).filter(Boolean).slice(0, 3)
          : fallback.quickWins,
      nextMove: parsed.nextMove?.trim() || fallback.nextMove,
    };
  } catch {
    return {
      headline: fallback.headline,
      hook: fallback.hook,
      retention: fallback.retention,
      captions: fallback.captions,
      retentionGraph: fallback.retentionGraph,
      quickWins: fallback.quickWins,
      nextMove: fallback.nextMove,
    };
  }
}

function normalizeFailureAuditSection(
  section: Partial<AIFailureAuditSection> | undefined,
  fallback: AIFailureAuditSection
): AIFailureAuditSection {
  return {
    score:
      typeof section?.score === "number" && Number.isFinite(section.score)
        ? Math.max(0, Math.min(100, Math.round(section.score)))
        : fallback.score,
    verdict: section?.verdict?.trim() || fallback.verdict,
    issue: section?.issue?.trim() || fallback.issue,
    fix: section?.fix?.trim() || fallback.fix,
  };
}

function normalizeFailureRetentionGraph(
  graph: AIFailureAuditRetentionPoint[] | undefined,
  fallback: AIFailureAuditRetentionPoint[]
) {
  if (!Array.isArray(graph) || graph.length !== 5) {
    return fallback;
  }

  const normalized = graph
    .map((point) => ({
      second:
        typeof point?.second === "number" && Number.isFinite(point.second)
          ? Math.max(0, Math.round(point.second))
          : NaN,
      retention:
        typeof point?.retention === "number" && Number.isFinite(point.retention)
          ? Math.max(0, Math.min(100, Math.round(point.retention)))
          : NaN,
      label: String(point?.label ?? "").trim(),
      note: String(point?.note ?? "").trim(),
    }))
    .filter((point) => Number.isFinite(point.second) && Number.isFinite(point.retention) && point.label && point.note)
    .sort((left, right) => left.second - right.second);

  return normalized.length === 5 ? normalized : fallback;
}

function buildFailureAuditRetentionGraph(
  input: AIFailureAuditRequest,
  transcript: FailureAuditTranscriptPayload
): AIFailureAuditRetentionPoint[] {
  const durationSeconds = Math.max(5, Math.round(input.durationSeconds ?? transcript.durationSeconds ?? 12));
  const hasEarlyDropNote = /first|opening|start|early/i.test(input.retentionNote || "");
  const retentionCurve = hasEarlyDropNote ? [100, 64, 46, 31, 18] : [100, 76, 58, 41, 24];
  const checkpoints = [0, Math.max(1, Math.round(durationSeconds * 0.14)), Math.max(2, Math.round(durationSeconds * 0.34)), Math.max(3, Math.round(durationSeconds * 0.62)), durationSeconds];
  const labels = ["Start", "Hook", "Setup", "Value", "CTA"];

  return checkpoints.map((second, index) => ({
    second,
    retention: retentionCurve[index],
    label: labels[index],
    note: buildFailureRetentionNote(index, second, transcript, input),
  }));
}

function buildFailureRetentionNote(
  index: number,
  second: number,
  transcript: FailureAuditTranscriptPayload,
  input: AIFailureAuditRequest
) {
  const snippet = getFailureTranscriptSnippet(transcript.segments, second);

  if (index === 0) {
    return "Initial impressions land here before the viewer decides whether the clip is worth staying for.";
  }

  if (index === 1) {
    return snippet
      ? `Around ${second}s viewers hit "${snippet}", so the opening needs a clearer curiosity gap or faster proof.`
      : "This is the hook decision point where weak proof or slow setup can trigger the first big drop.";
  }

  if (index === 2) {
    return snippet
      ? `At ${second}s the video is still covering "${snippet}", which likely stretches the setup longer than needed.`
      : "If the value is still being explained instead of shown here, retention usually softens fast.";
  }

  if (index === 3) {
    return snippet
      ? `Around ${second}s the viewer reaches "${snippet}", so the value reveal should feel sharper and more visual.`
      : "This is where the strongest proof or transformation should already be obvious.";
  }

  return input.retentionNote
    ? `The closing suffers because ${input.retentionNote.toLowerCase()}`
    : "Most viewers are gone by the CTA when the payoff arrives too late or the ask feels generic.";
}

function getFailureTranscriptSnippet(segments: FailureAuditTranscriptSegment[], second: number) {
  const segment =
    segments.find((candidate) => second >= candidate.start && second <= candidate.end) ||
    segments.find((candidate) => candidate.start >= second) ||
    segments[segments.length - 1];

  return segment ? truncateFailureAuditText(segment.text.replace(/\s+/g, " ").trim(), 72) : "";
}

function parseViralBlueprint(rawText: string, input: AIViralEngineRequest): ViralBlueprint {
  const match = rawText.match(/\{[\s\S]*\}/);
  const fallback = buildDemoViralEngineResult(input);

  if (!match) {
    return {
      conceptTitle: fallback.conceptTitle,
      hook: fallback.script.hook,
      body: fallback.script.body,
      cta: fallback.script.cta,
      voiceover: fallback.voice.script,
      captions: fallback.captions,
      videoPrompt: fallback.video.prompt,
      viralScore: fallback.insights.viralScore,
      bestPostingTime: fallback.insights.bestPostingTime,
      targetAudience: fallback.insights.targetAudience,
      reasons: fallback.insights.reasons,
    };
  }

  try {
    const parsed = JSON.parse(match[0]) as Partial<ViralBlueprint>;

    return {
      conceptTitle: parsed.conceptTitle?.trim() || fallback.conceptTitle,
      hook: parsed.hook?.trim() || fallback.script.hook,
      body: parsed.body?.trim() || fallback.script.body,
      cta: parsed.cta?.trim() || fallback.script.cta,
      voiceover: parsed.voiceover?.trim() || fallback.voice.script,
      captions:
        Array.isArray(parsed.captions) && parsed.captions.length > 0
          ? parsed.captions.map((item) => String(item).trim()).filter(Boolean).slice(0, 3)
          : fallback.captions,
      videoPrompt: parsed.videoPrompt?.trim() || fallback.video.prompt,
      viralScore: typeof parsed.viralScore === "number" ? parsed.viralScore : fallback.insights.viralScore,
      bestPostingTime: parsed.bestPostingTime?.trim() || fallback.insights.bestPostingTime,
      targetAudience: parsed.targetAudience?.trim() || fallback.insights.targetAudience,
      reasons:
        Array.isArray(parsed.reasons) && parsed.reasons.length > 0
          ? parsed.reasons.map((item) => String(item).trim()).filter(Boolean).slice(0, 3)
          : fallback.insights.reasons,
    };
  } catch {
    return {
      conceptTitle: fallback.conceptTitle,
      hook: fallback.script.hook,
      body: fallback.script.body,
      cta: fallback.script.cta,
      voiceover: fallback.voice.script,
      captions: fallback.captions,
      videoPrompt: fallback.video.prompt,
      viralScore: fallback.insights.viralScore,
      bestPostingTime: fallback.insights.bestPostingTime,
      targetAudience: fallback.insights.targetAudience,
      reasons: fallback.insights.reasons,
    };
  }
}

function clampScore(score: number) {
  if (Number.isNaN(score)) {
    return 80;
  }

  return Math.max(55, Math.min(99, Math.round(score)));
}
