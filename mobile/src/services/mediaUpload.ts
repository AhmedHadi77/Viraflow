const API_BASE_URL =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.EXPO_PUBLIC_API_BASE_URL?.replace(
    /\/$/,
    ""
  ) ?? "";

export type MediaResourceType = "image" | "video" | "raw";
export type MediaFolder = "profile" | "stories" | "reels" | "products" | "ai" | "communities";

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

  const transform = resourceType === "video" ? `q_auto:${quality},f_auto` : `q_auto:${quality},f_auto`;
  return url.replace("/upload/", `/upload/${transform}/`);
}

export function buildCloudinaryVideoThumbnailUrl(url: string) {
  if (!url.includes("/video/upload/")) {
    return url;
  }

  const withoutQuery = url.split("?")[0];
  const thumbnailUrl = withoutQuery.replace(/\.[a-zA-Z0-9]+$/, ".jpg");
  return thumbnailUrl.replace("/video/upload/", "/video/upload/so_0,w_900,h_1600,c_fill,q_auto,f_jpg/");
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
