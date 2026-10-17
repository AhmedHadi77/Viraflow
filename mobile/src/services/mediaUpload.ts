import { getPublicApiBaseUrl } from "./publicEnv";
import type { MediaEditConfig, MediaEditFilters } from "../types/models";

const API_BASE_URL = getPublicApiBaseUrl();

export type MediaResourceType = "image" | "video" | "raw";
export type MediaFolder = "profile" | "stories" | "reels" | "products" | "posts" | "ai" | "communities" | "messages";

export interface CloudinarySignaturePayload {
  folder: MediaFolder;
  publicIdPrefix?: string;
  resourceType: MediaResourceType;
}

export interface CloudinarySignatureResult {
  apiKey: string;
  cloudName: string;
  folder: string;
  publicId?: string;
  resourceType: MediaResourceType;
  signature: string;
  timestamp: number;
  uploadUrl: string;
}

export interface UploadMediaInput extends CloudinarySignaturePayload {
  token: string;
  uri: string;
  mimeType: string;
  fileName: string;
}

export interface UploadDataUrlInput extends CloudinarySignaturePayload {
  token: string;
  dataUrl: string;
}

export interface UploadMediaResult {
  publicId: string;
  secureUrl: string;
  adaptiveUrl: string;
  width?: number;
  height?: number;
  duration?: number;
  bytes?: number;
  resourceType: MediaResourceType;
}

export interface MediaModerationCheckInput {
  token: string;
  type: Exclude<MediaResourceType, "raw">;
  url: string;
  label?: string;
  seconds?: number;
}

export function isMediaApiConfigured() {
  return Boolean(API_BASE_URL);
}

export async function createCloudinaryUploadSignature(token: string, payload: CloudinarySignaturePayload) {
  const response = await fetch(`${API_BASE_URL}/media/cloudinary/signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const fallback = "Cloudinary upload signing failed.";
    const error = (await response.json().catch(() => ({ message: fallback }))) as { message?: string };
    throw new Error(error.message ?? fallback);
  }

  return (await response.json()) as CloudinarySignatureResult;
}

export async function uploadMediaToCloudinary(input: UploadMediaInput): Promise<UploadMediaResult> {
  const signature = await createCloudinaryUploadSignature(input.token, {
    folder: input.folder,
    publicIdPrefix: input.publicIdPrefix,
    resourceType: input.resourceType,
  });
  const formData = new FormData();

  formData.append("file", {
    uri: input.uri,
    name: input.fileName,
    type: input.mimeType,
  } as unknown as Blob);
  formData.append("api_key", signature.apiKey);
  formData.append("folder", signature.folder);
  formData.append("timestamp", String(signature.timestamp));
  formData.append("signature", signature.signature);

  if (signature.publicId) {
    formData.append("public_id", signature.publicId);
  }

  return uploadSignedFormData(signature, formData, input.resourceType);
}

export async function uploadDataUrlToCloudinary(input: UploadDataUrlInput): Promise<UploadMediaResult> {
  const signature = await createCloudinaryUploadSignature(input.token, {
    folder: input.folder,
    publicIdPrefix: input.publicIdPrefix,
    resourceType: input.resourceType,
  });
  const formData = new FormData();

  formData.append("file", input.dataUrl);
  formData.append("api_key", signature.apiKey);
  formData.append("folder", signature.folder);
  formData.append("timestamp", String(signature.timestamp));
  formData.append("signature", signature.signature);

  if (signature.publicId) {
    formData.append("public_id", signature.publicId);
  }

  return uploadSignedFormData(signature, formData, input.resourceType);
}

export async function checkUploadedMediaSafety(input: MediaModerationCheckInput) {
  const response = await fetch(`${API_BASE_URL}/media/moderation/check`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: input.type,
      url: input.url,
      label: input.label,
      seconds: input.seconds,
    }),
  });

  if (!response.ok) {
    const fallback = "Uploaded media was blocked or could not be checked.";
    const error = (await response.json().catch(() => ({ message: fallback }))) as { message?: string };
    throw new Error(error.message ?? fallback);
  }

  return (await response.json()) as { allowed: true };
}

async function uploadSignedFormData(
  signature: CloudinarySignatureResult,
  formData: FormData,
  resourceType: MediaResourceType
): Promise<UploadMediaResult> {
  const response = await fetch(signature.uploadUrl, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const fallback = "Cloudinary upload failed.";
    const error = (await response.json().catch(() => ({ error: { message: fallback } }))) as {
      error?: { message?: string };
    };
    throw new Error(error.error?.message ?? fallback);
  }

  const payload = (await response.json()) as {
    public_id: string;
    secure_url: string;
    width?: number;
    height?: number;
    duration?: number;
    bytes?: number;
    resource_type?: MediaResourceType;
  };

  return {
    publicId: payload.public_id,
    secureUrl: payload.secure_url,
    adaptiveUrl: buildCloudinaryAdaptiveUrl(payload.secure_url, resourceType),
    width: payload.width,
    height: payload.height,
    duration: payload.duration,
    bytes: payload.bytes,
    resourceType: payload.resource_type ?? resourceType,
  };
}

export function buildCloudinaryAdaptiveUrl(url: string, resourceType: MediaResourceType, quality: "auto" | "eco" | "good" = "auto") {
  if (!url.includes("/upload/")) {
    return url;
  }

  const transform = resourceType === "video" ? `q_auto:${quality},f_mp4,vc_auto,ac_aac` : `q_auto:${quality},f_auto`;
  return url.replace("/upload/", `/upload/${transform}/`);
}

export function buildCloudinaryPlayableVideoUrl(url: string, quality: "eco" | "good" | "best" = "good") {
  if (!url.includes("/video/upload/")) {
    return url;
  }

  const transform =
    quality === "best"
      ? "q_auto:best,f_mp4,vc_auto,ac_aac"
      : quality === "eco"
        ? "q_auto:eco,f_mp4,vc_auto,ac_aac"
        : "q_auto:good,f_mp4,vc_auto,ac_aac";
  return injectCloudinaryTransformations(url, "video", [transform]);
}

export function buildCloudinaryEditedImageUrl(url: string, editConfig?: MediaEditConfig, quality: "auto" | "eco" | "good" = "good") {
  const transformationComponents = [
    ...buildFilterComponents(editConfig?.filters),
    ...buildOverlayComponents(editConfig),
    `q_auto:${quality},f_auto`,
  ];
  return injectCloudinaryTransformations(url, "image", transformationComponents);
}

export function buildCloudinaryEditedVideoUrl(
  url: string,
  editConfig?: MediaEditConfig,
  options?: { durationSeconds?: number; quality?: "eco" | "good" | "best" }
) {
  const trimComponent = buildVideoTrimComponent(editConfig, options?.durationSeconds);
  const playbackComponent = buildVideoPlaybackComponent(editConfig);
  const qualityComponent =
    options?.quality === "best"
      ? "q_auto:best,f_mp4,vc_auto,ac_aac"
      : options?.quality === "eco"
        ? "q_auto:eco,f_mp4,vc_auto,ac_aac"
        : "q_auto:good,f_mp4,vc_auto,ac_aac";
  const transformationComponents = [
    trimComponent,
    playbackComponent,
    ...buildFilterComponents(editConfig?.filters),
    ...buildOverlayComponents(editConfig),
    qualityComponent,
  ];
  return injectCloudinaryTransformations(url, "video", transformationComponents);
}

export function buildCloudinaryVideoThumbnailUrl(
  url: string,
  options?: { editConfig?: MediaEditConfig; durationSeconds?: number; startOffsetSeconds?: number }
) {
  if (!url.includes("/video/upload/")) {
    return url;
  }

  const withoutQuery = url.split("?")[0];
  const thumbnailUrl = withoutQuery.replace(/\.[a-zA-Z0-9]+$/, ".jpg");
  const trimStart = getVideoTrimWindow(options?.editConfig, options?.durationSeconds).startSeconds;
  const startOffset = typeof options?.startOffsetSeconds === "number" ? options.startOffsetSeconds : trimStart;
  return injectCloudinaryTransformations(thumbnailUrl, "video", [
    `so_${roundCloudinaryTime(startOffset)}`,
    ...buildFilterComponents(options?.editConfig?.filters),
    ...buildOverlayComponents(options?.editConfig),
    "w_900,h_1600,c_fill,q_auto,f_jpg",
  ]);
}

export function getRecommendedVideoUploadSettings() {
  return {
    maxRawSizeMb: 50,
    targetSizeMb: 5,
    targetWidth: 1080,
    targetFps: 30,
    note: "Compress locally before upload when a native compressor is added; Cloudinary q_auto/f_auto handles adaptive delivery after upload.",
  };
}

function injectCloudinaryTransformations(url: string, resourceType: "image" | "video", components: Array<string | null | undefined>) {
  const marker = `/${resourceType}/upload/`;
  if (!url.includes(marker)) {
    return url;
  }

  const normalizedComponents = components.map((item) => item?.trim()).filter((item): item is string => Boolean(item));
  if (normalizedComponents.length === 0) {
    return url;
  }

  const [prefix, rawSuffix] = url.split(marker);
  if (!rawSuffix) {
    return url;
  }

  const [pathPart, queryPart] = rawSuffix.split("?");
  const segments = pathPart.split("/").filter(Boolean);
  if (segments.length === 0) {
    return url;
  }

  let existingTransformations: string[] = [];
  let remainingSegments = segments;

  if (!/^v\d+$/.test(segments[0])) {
    existingTransformations = [segments[0]];
    remainingSegments = segments.slice(1);
  }

  const rebuiltPath = `${[...normalizedComponents, ...existingTransformations].join("/")}/${remainingSegments.join("/")}`;
  const rebuiltUrl = `${prefix}${marker}${rebuiltPath}`;
  return queryPart ? `${rebuiltUrl}?${queryPart}` : rebuiltUrl;
}

function buildFilterComponents(filters?: MediaEditFilters) {
  if (!filters) {
    return [];
  }

  const components: string[] = [];
  const brightnessValue = normalizeFilterLevel(filters.brightness, 18);
  const contrastValue = normalizeFilterLevel(filters.contrast, 16);
  const saturationValue = clampNumber(normalizeFilterLevel(filters.saturation, 18) - clampNumber(filters.grayscale ?? 0, 0, 100), -100, 100);

  if (brightnessValue !== 0) {
    components.push(`e_brightness:${brightnessValue}`);
  }

  if (contrastValue !== 0) {
    components.push(`e_contrast:${contrastValue}`);
  }

  if (saturationValue !== 0) {
    components.push(`e_saturation:${saturationValue}`);
  }

  return components;
}

function buildOverlayComponents(editConfig?: MediaEditConfig) {
  if (!editConfig) {
    return [];
  }

  const components: string[] = [];
  const overlayText = editConfig.overlayText?.trim();
  if (overlayText) {
    const textPosition = normalizeCloudinaryOverlayPosition(
      editConfig.overlayTextPosition,
      { x: 0.14, y: 0.34 }
    );
    components.push(
      `co_rgb:ffffff,l_text:Arial_64_bold:${encodeCloudinaryText(overlayText)}`,
      `fl_layer_apply,g_north_west,x_${toCloudinaryOffset(textPosition.x, 1080)},y_${toCloudinaryOffset(textPosition.y, 1920)}`
    );
  }

  (editConfig.stickers ?? []).slice(0, 4).forEach((sticker, index) => {
    const normalizedSticker = sticker.value.trim();
    if (!normalizedSticker) {
      return;
    }

    const placement = normalizeCloudinaryOverlayPosition(sticker, {
      x: index % 2 === 0 ? 0.08 : 0.66,
      y: index < 2 ? 0.14 : 0.56,
    });
    components.push(
      `co_rgb:ffffff,l_text:Arial_74_bold:${encodeCloudinaryText(normalizedSticker)}`,
      `fl_layer_apply,g_north_west,x_${toCloudinaryOffset(placement.x, 1080)},y_${toCloudinaryOffset(placement.y, 1920)}`
    );
  });

  return components;
}

function buildVideoTrimComponent(editConfig?: MediaEditConfig, durationSeconds?: number) {
  const trimWindow = getVideoTrimWindow(editConfig, durationSeconds);
  if (!trimWindow.hasTrim) {
    return null;
  }

  const params = [`so_${roundCloudinaryTime(trimWindow.startSeconds)}`];
  if (trimWindow.endSeconds > trimWindow.startSeconds) {
    params.push(`eo_${roundCloudinaryTime(trimWindow.endSeconds)}`);
  }
  return params.join(",");
}

function buildVideoPlaybackComponent(editConfig?: MediaEditConfig) {
  const playbackRate = editConfig?.playbackRate ?? 1;
  const accelerateValue = Math.round((playbackRate - 1) * 100);
  if (accelerateValue === 0) {
    return null;
  }

  return `e_accelerate:${accelerateValue}`;
}

function getVideoTrimWindow(editConfig?: MediaEditConfig, durationSeconds?: number) {
  const safeDuration = Number.isFinite(durationSeconds) ? Math.max(0, durationSeconds ?? 0) : 0;
  const startRatio = clampNumber(editConfig?.trimStartRatio ?? 0, 0, 1);
  const endRatio = clampNumber(editConfig?.trimEndRatio ?? 1, 0, 1);
  const normalizedStartRatio = Math.min(startRatio, Math.max(0, endRatio - 0.05));
  const normalizedEndRatio = Math.max(endRatio, Math.min(1, normalizedStartRatio + 0.05));
  const hasTrim =
    safeDuration > 0 &&
    (Math.abs(normalizedStartRatio) > 0.001 || Math.abs(normalizedEndRatio - 1) > 0.001);

  return {
    hasTrim,
    startSeconds: safeDuration > 0 ? safeDuration * normalizedStartRatio : 0,
    endSeconds: safeDuration > 0 ? safeDuration * normalizedEndRatio : safeDuration,
  };
}

function normalizeFilterLevel(value: number | undefined, multiplier: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return clampNumber(Math.round((value ?? 0) * multiplier), -100, 100);
}

function encodeCloudinaryText(value: string) {
  return encodeURIComponent(value).replace(/\(/g, "%28").replace(/\)/g, "%29");
}

function roundCloudinaryTime(value: number) {
  return Number.isFinite(value) ? Math.max(0, Number(value.toFixed(2))) : 0;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeCloudinaryOverlayPosition(
  position: { x?: number; y?: number } | undefined,
  fallback: { x: number; y: number }
) {
  return {
    x: clampNumber(position?.x ?? fallback.x, 0.02, 0.9),
    y: clampNumber(position?.y ?? fallback.y, 0.02, 0.9),
  };
}

function toCloudinaryOffset(value: number, dimension: number) {
  return Math.round(clampNumber(value, 0, 1) * dimension);
}
