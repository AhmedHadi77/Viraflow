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
import { getPublicApiBaseUrl } from "./publicEnv";
import { assertSafeAiContent } from "../utils/contentSafety";

const API_BASE_URL = getPublicApiBaseUrl();

export async function fetchAiStatus(token?: string) {
  try {
    const response = await request<{ status: AIStatusPayload }>("/ai/status", {
      method: "GET",
      token,
    });
    return response.status;
  } catch {
    // The AI backend could not be reached. Report AI as unavailable instead of faking results.
    return {
      demoMode: true,
      textModel: "",
      imageModel: "",
      videoModel: "",
      voiceModel: "",
    } satisfies AIStatusPayload;
  }
}

export async function generateAiText(token: string | undefined, payload: AITextRequest) {
  assertSafeAiContent([payload.prompt, payload.tone, payload.audience, payload.goal]);
  const response = await request<{ result: AITextResult }>("/ai/text", {
    method: "POST",
    token,
    body: payload,
  });
  return response.result;
}

export async function generateAiImage(token: string | undefined, payload: AIImageRequest) {
  assertSafeAiContent([payload.prompt, payload.style]);
  const response = await request<{ result: AIImageResult }>("/ai/image", {
    method: "POST",
    token,
    body: payload,
  });
  return response.result;
}

export async function generateAiVideo(token: string | undefined, payload: AIVideoRequest) {
  assertSafeAiContent([payload.prompt, payload.style, payload.shotType]);
  const response = await request<{ result: AIVideoJob }>("/ai/video", {
    method: "POST",
    token,
    body: payload,
  });
  return response.result;
}

export async function refreshAiVideo(token: string | undefined, videoId: string) {
  const response = await request<{ result: AIVideoJob }>(`/ai/video/${videoId}`, {
    method: "GET",
    token,
  });
  return response.result;
}

export async function generateAiViralEngine(token: string | undefined, payload: AIViralEngineRequest) {
  assertSafeAiContent([payload.prompt, payload.niche, payload.audience, payload.offer, payload.tone]);
  const response = await request<{ result: AIViralEngineResult }>("/ai/viral-engine", {
    method: "POST",
    token,
    body: payload,
  });
  return response.result;
}

export async function fetchAiTrends(token: string | undefined, region?: string) {
  const query = region ? `?region=${encodeURIComponent(region)}` : "";
  const response = await request<{ trends: AITrendFeedItem[] }>(`/ai/trends${query}`, {
    method: "GET",
    token,
  });
  return response.trends;
}

export async function generateAiTrendHijack(token: string | undefined, payload: AITrendHijackRequest) {
  assertSafeAiContent([payload.userGoal, payload.audience, payload.offer]);
  const response = await request<{ result: AITrendHijackResult }>("/ai/trends/hijack", {
    method: "POST",
    token,
    body: payload,
  });
  return response.result;
}

export async function generateAiAvatarCreator(token: string | undefined, payload: AIAvatarCreatorRequest) {
  assertSafeAiContent([payload.avatarMessage, payload.niche]);
  const response = await request<{ result: AIAvatarCreatorResult }>("/ai/avatars/create", {
    method: "POST",
    token,
    body: payload,
  });
  return response.result;
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
  const response = await request<{ result: AIGrowthCoachResult }>("/ai/growth-coach", {
    method: "POST",
    token,
    body: payload,
  });
  return response.result;
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
