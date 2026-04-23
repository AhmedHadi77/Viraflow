import {
  AIAvatarCreatorRequest,
  AIAvatarCreatorResult,
  AIFailureAuditRequest,
  AIFailureAuditResult,
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
} from "../types/models";
import { assertSafeAiContent } from "../utils/contentSafety";

const API_BASE_URL =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.EXPO_PUBLIC_API_BASE_URL?.replace(
    /\/$/,
    ""
  );
const demoVideoJobs = new Map<string, { createdAt: number; request: AIVideoRequest }>();

export async function fetchAiStatus(token?: string) {
  try {
    const response = await request<{ status: AIStatusPayload }>("/ai/status", {
      method: "GET",
      token,
    });
    return response.status;
  } catch {
    return {
      demoMode: true,
      textModel: "gpt-5.4",
      imageModel: "gpt-image-1.5",
      videoModel: "sora-2",
      voiceModel: "gpt-4o-mini-tts",
    } satisfies AIStatusPayload;
  }
}

export async function generateAiText(token: string | undefined, payload: AITextRequest) {
  assertSafeAiContent([payload.prompt, payload.tone, payload.audience, payload.goal]);
  try {
    const response = await request<{ result: AITextResult }>("/ai/text", {
      method: "POST",
      token,
      body: payload,
    });
    return response.result;
  } catch {
    return buildDemoTextResult(payload);
  }
}

export async function generateAiImage(token: string | undefined, payload: AIImageRequest) {
  assertSafeAiContent([payload.prompt, payload.style]);
  try {
    const response = await request<{ result: AIImageResult }>("/ai/image", {
      method: "POST",
      token,
      body: payload,
    });
    return response.result;
  } catch {
    return {
      id: `mobile-ai-image-${Date.now()}`,
      prompt: payload.prompt,
      imageDataUrl: buildDemoImagePreview(payload.prompt),
      revisedPrompt: "Demo mode image preview",
      model: "gpt-image-1.5",
      createdAt: new Date().toISOString(),
      demoMode: true,
    } satisfies AIImageResult;
  }
}

export async function generateAiVideo(token: string | undefined, payload: AIVideoRequest) {
  assertSafeAiContent([payload.prompt, payload.style, payload.shotType]);
  try {
    const response = await request<{ result: AIVideoJob }>("/ai/video", {
      method: "POST",
      token,
      body: payload,
    });
    return response.result;
  } catch {
    const id = `mobile-demo-video-${Date.now()}`;
    demoVideoJobs.set(id, { createdAt: Date.now(), request: payload });
    return hydrateDemoVideoJob(id, payload, Date.now());
  }
}

export async function refreshAiVideo(token: string | undefined, videoId: string) {
  try {
    const response = await request<{ result: AIVideoJob }>(`/ai/video/${videoId}`, {
      method: "GET",
      token,
    });
    return response.result;
  } catch {
    const demo = demoVideoJobs.get(videoId);
    if (!demo) {
      return undefined;
    }

    return hydrateDemoVideoJob(videoId, demo.request, demo.createdAt);
  }
}

export async function generateAiViralEngine(token: string | undefined, payload: AIViralEngineRequest) {
  assertSafeAiContent([payload.prompt, payload.niche, payload.audience, payload.offer, payload.tone]);
  try {
    const response = await request<{ result: AIViralEngineResult }>("/ai/viral-engine", {
      method: "POST",
      token,
      body: payload,
    });
    return response.result;
  } catch {
    return buildDemoViralEngineResult(token, payload);
  }
}

export async function fetchAiTrends(token: string | undefined) {
  try {
    const response = await request<{ trends: AITrendFeedItem[] }>("/ai/trends", {
      method: "GET",
      token,
    });
    return response.trends;
  } catch {
    return buildDemoTrendFeed();
  }
}

export async function generateAiTrendHijack(token: string | undefined, payload: AITrendHijackRequest) {
  assertSafeAiContent([payload.userGoal, payload.audience, payload.offer]);
  try {
    const response = await request<{ result: AITrendHijackResult }>("/ai/trends/hijack", {
      method: "POST",
      token,
      body: payload,
    });
    return response.result;
  } catch {
    return buildDemoTrendHijackResult(token, payload);
  }
}

export async function generateAiAvatarCreator(token: string | undefined, payload: AIAvatarCreatorRequest) {
  assertSafeAiContent([payload.avatarMessage, payload.niche]);
  try {
    const response = await request<{ result: AIAvatarCreatorResult }>("/ai/avatars/create", {
      method: "POST",
      token,
      body: payload,
    });
    return response.result;
  } catch {
    return buildDemoAvatarCreatorResult(token, payload);
  }
}

export async function generateAiGrowthCoach(token: string | undefined, payload: AIGrowthCoachRequest) {
  assertSafeAiContent([
    payload.niche,
    payload.targetAudience,
    payload.recentPostTopic,
    payload.recentCaption,
    payload.postGoal,
    payload.retentionNote,
    payload.painPoint,
  ]);
  try {
    const response = await request<{ result: AIGrowthCoachResult }>("/ai/growth-coach", {
      method: "POST",
      token,
      body: payload,
    });
    return response.result;
  } catch {
    return buildDemoGrowthCoachResult(payload);
  }
}

export async function generateAiFailureAudit(
  token: string | undefined,
  payload: AIFailureAuditRequest,
  upload: { uri: string; name: string; mimeType?: string }
) {
  assertSafeAiContent([
    payload.sourceVideoName,
    payload.caption,
    payload.retentionNote,
    payload.niche,
    payload.targetAudience,
  ]);

  try {
    const formData = new FormData();
    formData.append("video", {
      uri: upload.uri,
      name: upload.name,
      type: upload.mimeType || "video/mp4",
    } as any);
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }

      formData.append(key, String(value));
    });

    const response = await requestFormData<{ result: AIFailureAuditResult }>("/ai/failure-audit", {
      token,
      body: formData,
    });
    return response.result;
  } catch {
    return buildDemoFailureAuditResult(payload);
  }
}

export function getAiAssetSource(path: string | undefined, token: string | undefined, name?: string) {
  if (!path || !API_BASE_URL) {
    return null;
  }

  return {
    uri: buildAiAssetUrl(path),
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    name,
  };
}

function buildAiAssetUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  if (!API_BASE_URL) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

function hydrateDemoVideoJob(id: string, request: AIVideoRequest, createdAt: number): AIVideoJob {
  const elapsed = Date.now() - createdAt;

  if (elapsed < 2500) {
    return {
      id,
      status: "queued",
      progress: 10,
      model: request.quality === "quality" ? "sora-2-pro" : "sora-2",
      prompt: request.prompt,
      size: request.size ?? "720x1280",
      seconds: String(request.seconds ?? 8),
      createdAt: new Date(createdAt).toISOString(),
      demoMode: true,
      note: "Demo mode: queued locally until the backend is reachable.",
    };
  }

  if (elapsed < 6500) {
    return {
      id,
      status: "in_progress",
      progress: 64,
      model: request.quality === "quality" ? "sora-2-pro" : "sora-2",
      prompt: request.prompt,
      size: request.size ?? "720x1280",
      seconds: String(request.seconds ?? 8),
      createdAt: new Date(createdAt).toISOString(),
      demoMode: true,
      note: "Demo mode: rendering preview frames and motion pacing.",
    };
  }

  return {
    id,
    status: "completed",
    progress: 100,
    model: request.quality === "quality" ? "sora-2-pro" : "sora-2",
    prompt: request.prompt,
    size: request.size ?? "720x1280",
    seconds: String(request.seconds ?? 8),
    createdAt: new Date(createdAt).toISOString(),
    demoMode: true,
    thumbnailDataUrl: buildDemoImagePreview(request.prompt),
    note: "Demo mode: live Sora rendering will activate when the backend and API key are configured.",
  };
}

async function request<T>(
  path: string,
  options: { method: "GET" | "POST"; token?: string; body?: unknown }
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("Missing EXPO_PUBLIC_API_BASE_URL");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method,
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let errorMessage = `AI request failed with status ${response.status}`;
    try {
      const errorBody = (await response.json()) as { message?: string };
      if (errorBody.message) {
        errorMessage = errorBody.message;
      }
    } catch {
      // Fall back to the generic status message when the response body is not JSON.
    }

    throw new Error(errorMessage);
  }

  return (await response.json()) as T;
}

async function requestFormData<T>(
  path: string,
  options: { token?: string; body: FormData }
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("Missing EXPO_PUBLIC_API_BASE_URL");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body,
  });

  if (!response.ok) {
    let errorMessage = `AI request failed with status ${response.status}`;
    try {
      const errorBody = (await response.json()) as { message?: string };
      if (errorBody.message) {
        errorMessage = errorBody.message;
      }
    } catch {
      // Fall back to the generic status message when the response body is not JSON.
    }

    throw new Error(errorMessage);
  }

  return (await response.json()) as T;
}

function buildDemoTextResult(payload: AITextRequest): AITextResult {
  const base = payload.prompt.trim();
  const outputs =
    payload.mode === "captions"
      ? [
          `The glow-up for ${base.toLowerCase()} starts here. Save this before your next post.`,
          `${base}. Cleaner story, stronger hook, better conversion.`,
          `This is how creators turn ${base.toLowerCase()} into reach and revenue in one move.`,
        ]
      : payload.mode === "script"
        ? [
            `Hook: If you want ${base.toLowerCase()}, watch this.\nBody: Show the old way, reveal the shift, then land the proof.\nCTA: Follow for the full breakdown.`,
            `Hook: I stopped guessing and used this for ${base.toLowerCase()}.\nBody: One problem, one framework, one clear payoff.\nCTA: Comment START if you want the template.`,
            `Hook: ${base} is easier than most creators think.\nBody: Start with tension, show the win, close with the offer.\nCTA: Save this for later.`,
          ]
        : [
            `${base}\nA premium creator offer with a clear outcome and a fast trust-building angle.`,
            `Turn interest into purchase intent with ${base.toLowerCase()}.\nPolished, direct, and easy to buy.`,
            `${base}\nPositioned like a premium offer instead of a generic listing.`,
          ];

  return {
    id: `mobile-ai-text-${Date.now()}`,
    mode: payload.mode,
    outputs,
    summary: "Demo mode AI text results",
    model: "gpt-5.4",
    createdAt: new Date().toISOString(),
    demoMode: true,
  };
}

async function buildDemoViralEngineResult(
  token: string | undefined,
  payload: AIViralEngineRequest
): Promise<AIViralEngineResult> {
  const conceptTitle = payload.prompt.toLowerCase().includes("gym") ? "Gym reel engine" : "Viral content engine";
  const hook = payload.prompt.toLowerCase().includes("gym")
    ? "This is how you make a gym reel feel addictive instead of average."
    : `This is how you turn "${payload.prompt}" into a reel that stops the scroll.`;
  const body =
    "Start with a visual proof shot, move fast through the transformation or process, and land the value so the viewer understands the payoff instantly.";
  const cta = "Save this format, post it tonight, and follow for the next build.";
  const video = await generateAiVideo(token, {
    prompt: `${payload.prompt}. Vertical social reel with premium creator pacing, kinetic captions, and proof-driven visuals.`,
    style: payload.tone ?? "bold premium creator ad",
    shotType: "fast hook, visual proof, result reveal",
    size: payload.size,
    seconds: payload.seconds,
    quality: payload.quality,
  });
  const audience =
    payload.audience ??
    (payload.prompt.toLowerCase().includes("gym")
      ? "males 18-25 into gym motivation and transformation content"
      : "short-form viewers likely to save and share creator-led advice");

  return {
    id: `mobile-viral-${Date.now()}`,
    prompt: payload.prompt,
    conceptTitle,
    script: {
      hook,
      body,
      cta,
      fullScript: [hook, body, cta].join("\n\n"),
    },
    captions: [
      "The exact reel format that makes content feel sharper, faster, and more viral.",
      "If your next post needs more saves and shares, build it like this.",
      "Simple structure. Strong payoff. Better odds of stopping the scroll.",
    ],
    voice: {
      script: [hook, body, cta].join("\n\n"),
      voice: payload.voice ?? "coral",
      model: "gpt-4o-mini-tts",
      disclosure: "Demo mode: connect the backend to generate an AI voice preview you can play.",
    },
    video,
    insights: {
      viralScore: payload.prompt.toLowerCase().includes("gym") ? 82 : 79,
      bestPostingTime: "7:00 PM local time",
      targetAudience: audience,
      reasons: [
        "The hook creates tension immediately.",
        "The structure is built for quick retention and rewatches.",
        "The CTA supports saves, shares, and profile clicks.",
      ],
    },
    createdAt: new Date().toISOString(),
    demoMode: true,
  };
}

function buildDemoTrendFeed(): AITrendFeedItem[] {
  return [
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
}

async function buildDemoTrendHijackResult(
  token: string | undefined,
  payload: AITrendHijackRequest
): Promise<AITrendHijackResult> {
  const trend = buildDemoTrendFeed().find((item) => item.id === payload.trendId) ?? buildDemoTrendFeed()[0];
  const similarVideoPrompt = [
    `Create a vertical reel inspired by ${trend.title}.`,
    `Keep the pace similar to ${trend.motionStyle}.`,
    `Match the soundtrack vibe of ${trend.musicStyle}.`,
    `Goal: ${payload.userGoal || "drive saves and profile visits"}.`,
  ].join(" ");
  const video = await generateAiVideo(token, {
    prompt: similarVideoPrompt,
    style: `${trend.musicStyle}; ${trend.motionStyle}`,
    shotType: "trend-led creator pacing",
    size: payload.size,
    seconds: payload.seconds,
    quality: payload.quality,
  });

  return {
    id: `trend-hijack-demo-${Date.now()}`,
    trend,
    angle:
      trend.niche === "Fitness"
        ? "Hook with instant physical proof, then explain the habit or offer behind the change."
        : `Use ${trend.title.toLowerCase()} energy but point the payoff directly at your offer.`,
    similarVideoPrompt,
    musicStyle: trend.musicStyle,
    optimizedCaptions: [
      `${trend.captionSeed} This version is optimized for ${payload.offer || "your offer"}.`,
      "Use the same momentum, but tighten the message so the viewer understands the payoff instantly.",
      "Trend hijack the smart way: familiar rhythm, different hook, stronger CTA.",
    ],
    video,
    createdAt: new Date().toISOString(),
    demoMode: true,
  };
}

async function buildDemoAvatarCreatorResult(
  token: string | undefined,
  payload: AIAvatarCreatorRequest
): Promise<AIAvatarCreatorResult> {
  const talkingAvatar = await generateAiVideo(token, {
    prompt: [
      "Create a talking avatar video from this portrait.",
      `Message: ${payload.avatarMessage || "Follow for more creator content and fresh ideas."}`,
      `Niche: ${payload.niche || "creator brand"}.`,
    ].join(" "),
    style: "talking avatar, premium creator lighting, calm expressive motion",
    shotType: "portrait to camera with subtle blinking and mouth movement",
    size: payload.size,
    seconds: payload.seconds,
    quality: payload.quality,
  });

  return {
    id: `avatar-demo-${Date.now()}`,
    sourceImagePreview: payload.sourceImageDataUrl,
    variants: [
      buildDemoAvatarVariant("anime", payload.sourceImageDataUrl),
      buildDemoAvatarVariant("cartoon", payload.sourceImageDataUrl),
      buildDemoAvatarVariant("influencer", payload.sourceImageDataUrl),
    ],
    talkingAvatar,
    monetization: {
      payPerAvatarLabel: "$2 per avatar",
      premiumLabel: "Included in Premium Creator and Yearly Growth",
    },
    createdAt: new Date().toISOString(),
    demoMode: true,
  };
}

function buildDemoGrowthCoachResult(payload: AIGrowthCoachRequest): AIGrowthCoachResult {
  const topic = payload.recentPostTopic.trim();
  const loweredTopic = topic.toLowerCase();
  const niche = payload.niche || "creator growth";
  const audience = payload.targetAudience || "short-form viewers who save useful content";
  const postGoal = payload.postGoal || "more saves, shares, and profile visits";
  const views = payload.views ?? 1200;
  const likes = payload.likes ?? 24;
  const shares = payload.shares ?? 2;
  const comments = payload.comments ?? 3;

  return {
    id: `growth-coach-demo-${Date.now()}`,
    headline: loweredTopic.includes("gym")
      ? "Your gym post had visual potential, but the payoff arrived too late."
      : `Your "${topic}" post likely lost people before the value felt obvious.`,
    diagnosis: [
      `The hook was probably too soft for a ${niche} audience, especially with ${views.toLocaleString()} views turning into only ${likes} likes.`,
      `The post goal of ${postGoal.toLowerCase()} was not reflected early enough, so viewers had little reason to stop and stay.`,
      `Low conversation and sharing signals (${comments} comments, ${shares} shares) suggest the angle felt informative but not urgent or specific.`,
    ],
    improvements: [
      `Open the next post with a visible result in the first second, then explain the method after attention is already won.`,
      `Write captions for ${audience.toLowerCase()} using one promise, one proof point, and one direct CTA to save or comment.`,
      `Tighten pacing around the retention issue: ${payload.retentionNote || "the first 3 seconds need a stronger curiosity gap and faster payoff"}.`,
    ],
    nextPosts: [
      {
        title: loweredTopic.includes("gym") ? "3-second physique proof reel" : `${niche} proof-first reel`,
        hook: loweredTopic.includes("gym")
          ? "If your gym reels feel dead, steal this opening shot."
          : `If your ${niche.toLowerCase()} posts keep flopping, start here.`,
        format: "Vertical reel with a proof shot first, then 3 fast teaching beats.",
        reason: "This format increases retention because the result is clear before the explanation begins.",
      },
      {
        title: "Mistake-to-fix breakdown",
        hook: "This one content mistake is why people scroll past.",
        format: "Talking-head or screen-text breakdown with one painful mistake and one clean fix.",
        reason: "It creates curiosity and positions you as the coach, not just the poster.",
      },
      {
        title: "Audience comment bait post",
        hook: `Would you rather get ${postGoal.toLowerCase()} from one post or 10 average ones?`,
        format: "Question-led reel or carousel with a polarizing choice and CTA to comment.",
        reason: "It is designed to lift comments and teach the algorithm who should see your content next.",
      },
    ],
    coachSummary:
      payload.painPoint ||
      "Your content likely needs a clearer promise, faster proof, and a more specific next action for the viewer.",
    premium: {
      lockedTo: "monthly",
      label: "Premium-only Growth Coach for monthly and yearly plans",
    },
    createdAt: new Date().toISOString(),
    demoMode: true,
  };
}

function buildDemoFailureAuditResult(payload: AIFailureAuditRequest): AIFailureAuditResult {
  const caption = payload.caption?.trim() || "No caption provided.";
  const lowerCaption = caption.toLowerCase();
  const isGymContent = lowerCaption.includes("gym") || (payload.niche || "").toLowerCase().includes("fitness");
  const views = payload.views ?? 980;
  const durationSeconds = payload.durationSeconds ?? 12;

  return {
    id: `failure-audit-demo-${Date.now()}`,
    headline: isGymContent
      ? "Your reel likely lost the viewer before the gym payoff became obvious."
      : `Your "${payload.sourceVideoName}" video likely asked for attention before proving its value.`,
    hook: {
      score: isGymContent ? 44 : 48,
      verdict: "Weak opening",
      issue: `The first 1 to 2 seconds probably did not create enough curiosity for viewers who were part of the initial ${views.toLocaleString()} impressions.`,
      fix: "Open with the strongest visual result first, then explain what the viewer is about to learn or get.",
    },
    retention: {
      score: durationSeconds > 15 ? 41 : 53,
      verdict: durationSeconds > 15 ? "Drop-off too early" : "Pacing needs tightening",
      issue: payload.retentionNote || "The middle of the video likely slows down before the payoff lands, which hurts completion rate.",
      fix: "Cut dead space, shorten setup, and place the biggest proof or transformation before the halfway mark.",
    },
    captions: {
      score: caption === "No caption provided." ? 38 : 57,
      verdict: caption === "No caption provided." ? "Missing conversion layer" : "Caption not pulling enough weight",
      issue:
        caption === "No caption provided."
          ? "Without a caption, the reel loses a chance to reinforce the promise and push saves or comments."
          : `"${caption}" is readable, but it likely does not sharpen the hook or create enough urgency to save.`,
      fix: "Write one line that promises a clear payoff, then close with a CTA to save, comment, or visit the profile.",
    },
    transcript: {
      text:
        payload.caption?.trim() ||
        (isGymContent
          ? "This is the gym reel demo transcript. Hook the transformation instantly, then explain the habit, then land the CTA."
          : "This is the demo transcript for the failed video audit. The creator introduces the topic slowly, adds the value too late, and closes without a strong CTA."),
      source: "demo",
    },
    retentionGraph: [
      { second: 0, retention: 100, label: "Start", note: "Initial impressions are strong before the viewer decides whether to stay." },
      { second: Math.max(1, Math.round(durationSeconds * 0.15)), retention: 71, label: "Hook risk", note: "Viewers drop here if the first second does not prove value fast enough." },
      { second: Math.max(2, Math.round(durationSeconds * 0.35)), retention: 54, label: "Setup drag", note: "Too much setup or repeated footage likely weakens momentum in this zone." },
      { second: Math.max(3, Math.round(durationSeconds * 0.6)), retention: 39, label: "Midpoint", note: "The payoff probably arrives too late, so only the most curious viewers remain." },
      { second: Math.max(4, durationSeconds), retention: 24, label: "CTA", note: "Most viewers are gone by the time the CTA lands, which hurts saves and clicks." },
    ],
    quickWins: [
      "Replace the first shot with proof, tension, or the final result.",
      "Trim the edit until every second either builds curiosity or delivers payoff.",
      "Use captions that make the value clearer than the visuals alone.",
    ],
    nextMove: isGymContent
      ? "Recut this as a proof-first fitness reel with the transformation shot first and the training explanation second."
      : "Repost a tighter version with a stronger first second, a faster midpoint payoff, and a caption built for saves.",
    createdAt: new Date().toISOString(),
    demoMode: true,
  };
}

function buildDemoAvatarVariant(style: "anime" | "cartoon" | "influencer", sourceImageDataUrl: string) {
  return {
    id: `avatar-variant-${style}-${Date.now()}`,
    style,
    title: style === "anime" ? "Anime version" : style === "cartoon" ? "Cartoon version" : "Influencer style",
    imageDataUrl: sourceImageDataUrl,
    prompt: `${style} avatar demo preview`,
    demoMode: true,
  };
}

function buildDemoImagePreview(prompt: string) {
  const normalized = prompt.toLowerCase();

  if (normalized.includes("fashion")) {
    return "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80";
  }

  if (normalized.includes("market") || normalized.includes("product")) {
    return "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=900&q=80";
  }

  if (normalized.includes("gym") || normalized.includes("fitness")) {
    return "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80";
  }

  return "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=900&q=80";
}
