import type { MediaEditConfig, StudioClip, StudioVoiceover } from "../types/models";
import {
  buildCloudinaryEditedImageUrl,
  buildCloudinaryEditedVideoUrl,
  buildCloudinaryVideoThumbnailUrl,
  buildPhotoVideoSourceUrl,
  checkUploadedMediaSafety,
  MediaFolder,
  uploadMediaToCloudinary,
  uploadRemoteUrlToCloudinary,
  waitForCloudinaryRender,
} from "./mediaUpload";
import { canvasDimensions, cloudinaryPublicIdFromUrl, hasProcessedVideoEdits } from "./studioRender";

export type StudioMode = "story" | "reel" | "post";

export interface StudioProgressUpdate {
  stage: "uploading" | "rendering";
  done?: number;
  total?: number;
}

export interface StudioUploadContext {
  token: string;
  folder: MediaFolder;
  publicIdPrefix: string;
  mode: StudioMode;
  onProgress?: (update: StudioProgressUpdate) => void;
}

interface UploadedFile {
  secureUrl: string;
  publicId: string;
  duration?: number;
}

function isLocalUri(value: string) {
  return /^(file|content|ph|assets-library):\/\//i.test(value) || /^blob:/i.test(value) || /^data:/i.test(value);
}

function isCloudinaryUrl(value: string, kind: "image" | "video") {
  return /^https:\/\/res\.cloudinary\.com\//i.test(value) && value.includes(`/${kind}/upload/`);
}

function fileNameFor(uri: string, fallback: string) {
  const name = uri.split("?")[0].split("/").filter(Boolean).pop() ?? "";
  return name.includes(".") ? name.replace(/[^a-zA-Z0-9._-]/g, "_") : fallback;
}

function moderationSeconds(value?: number) {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(300, Math.max(1, Math.round(value))) : undefined;
}

/** Uploads one photo, video or sound (or reuses one already uploaded) and checks photos and videos are allowed. */
export async function uploadStudioFile(
  context: StudioUploadContext,
  input: {
    uri: string;
    type: "image" | "video" | "audio";
    suffix: string;
    label: string;
    mimeType?: string;
    fileName?: string;
    durationSeconds?: number;
    /** Already checked (uploaded earlier in this editing session). */
    skipSafetyCheck?: boolean;
  }
): Promise<UploadedFile> {
  const uri = input.uri.trim();
  const resourceType = input.type === "image" ? "image" : "video";
  let uploaded: UploadedFile;
  if (isLocalUri(uri)) {
    const result = await uploadMediaToCloudinary({
      token: context.token,
      uri,
      mimeType: input.mimeType || (input.type === "image" ? "image/jpeg" : input.type === "audio" ? "audio/m4a" : "video/mp4"),
      fileName: input.fileName || fileNameFor(uri, input.type === "image" ? "photo.jpg" : input.type === "audio" ? "voice.m4a" : "clip.mp4"),
      folder: context.folder,
      publicIdPrefix: `${context.publicIdPrefix}-${input.suffix}`.slice(0, 60),
      resourceType,
    });
    uploaded = { secureUrl: result.secureUrl, publicId: result.publicId, duration: result.duration };
  } else if (isCloudinaryUrl(uri, resourceType)) {
    const publicId = cloudinaryPublicIdFromUrl(uri);
    if (!publicId) {
      throw new Error("This media link can't be used. Please pick the file again.");
    }
    uploaded = { secureUrl: uri, publicId, duration: input.durationSeconds };
  } else {
    throw new Error("Use a photo or video from your phone.");
  }
  if (input.type !== "audio" && !input.skipSafetyCheck) {
    await checkUploadedMediaSafety({
      token: context.token,
      type: input.type,
      url: uploaded.secureUrl,
      label: input.label,
      seconds: input.type === "video" ? moderationSeconds(input.durationSeconds ?? uploaded.duration) : undefined,
    });
  }
  return uploaded;
}

/** Turns an uploaded photo into a short video with a gentle zoom, uploaded as its own video. */
export async function makeStudioPhotoVideo(
  context: StudioUploadContext,
  input: { imageUrl: string; seconds: number; aspect?: "9:16" | "4:5" | "1:1" | "16:9"; suffix: string }
): Promise<UploadedFile> {
  const aspect = input.aspect ?? (context.mode === "post" ? "4:5" : "9:16");
  const size = canvasDimensions(aspect, 720);
  const source = buildPhotoVideoSourceUrl(input.imageUrl, { seconds: input.seconds, ...size });
  if (!source) {
    throw new Error("This photo couldn't be made into a video.");
  }
  // Let the media service finish making it before copying it into a new upload.
  await waitForCloudinaryRender(source, { timeoutMs: 60_000 });
  const uploaded = await uploadRemoteUrlToCloudinary({
    token: context.token,
    url: source,
    folder: context.folder,
    publicIdPrefix: `${context.publicIdPrefix}-${input.suffix}`.slice(0, 60),
    resourceType: "video",
  });
  return { secureUrl: uploaded.secureUrl, publicId: uploaded.publicId, duration: uploaded.duration ?? input.seconds };
}

function frameAspect(editConfig: MediaEditConfig | undefined) {
  const aspect = editConfig?.canvas?.aspect;
  return aspect && aspect !== "original" ? aspect : undefined;
}

/**
 * Uploads the clips joined to a video and the recorded voiceover (skipping what is already uploaded),
 * so the finished video can be put together by the media service.
 */
export async function prepareStudioClips(context: StudioUploadContext, editConfig: MediaEditConfig | undefined) {
  if (!editConfig) {
    return editConfig;
  }
  const clips = editConfig.clips ?? [];
  const voiceover = editConfig.voiceover;
  const pending = clips.filter((clip) => !clip.publicId).length + (voiceover?.uri && !voiceover.publicId ? 1 : 0);
  let done = 0;
  const report = () => context.onProgress?.({ stage: "uploading", done, total: pending });
  if (pending > 0) {
    report();
  }

  const preparedClips: StudioClip[] = [];
  for (let index = 0; index < clips.length; index += 1) {
    const clip = clips[index];
    if (clip.publicId) {
      preparedClips.push(clip);
      continue;
    }
    if (clip.type === "video") {
      const uploaded = await uploadStudioFile(context, {
        uri: clip.remoteUrl || clip.uri,
        type: "video",
        suffix: `clip-${index + 1}`,
        label: `clip ${index + 1}`,
        mimeType: clip.mimeType,
        fileName: clip.fileName,
        durationSeconds: clip.durationSeconds,
      });
      preparedClips.push({
        ...clip,
        publicId: uploaded.publicId,
        remoteUrl: uploaded.secureUrl,
        durationSeconds: clip.durationSeconds ?? uploaded.duration,
      });
    } else {
      const photo = await uploadStudioFile(context, {
        uri: clip.remoteUrl || clip.uri,
        type: "image",
        suffix: `photo-${index + 1}`,
        label: `photo ${index + 1}`,
        mimeType: clip.mimeType,
        fileName: clip.fileName,
      });
      if (clip.motion) {
        const video = await makeStudioPhotoVideo(context, {
          imageUrl: photo.secureUrl,
          seconds: clip.imageSeconds ?? 3,
          aspect: frameAspect(editConfig),
          suffix: `photo-${index + 1}-motion`,
        });
        preparedClips.push({ ...clip, publicId: video.publicId, remoteUrl: photo.secureUrl, renderedAs: "video" });
      } else {
        preparedClips.push({ ...clip, publicId: photo.publicId, remoteUrl: photo.secureUrl });
      }
    }
    done += 1;
    report();
  }

  let preparedVoiceover: StudioVoiceover | undefined = voiceover;
  if (voiceover?.uri && !voiceover.publicId) {
    const uploaded = await uploadStudioFile(context, {
      uri: voiceover.uri,
      type: "audio",
      suffix: "voice",
      label: "voiceover",
      mimeType: voiceover.uri.endsWith(".caf") ? "audio/x-caf" : "audio/m4a",
    });
    const { uri: _localUri, ...rest } = voiceover;
    preparedVoiceover = { ...rest, publicId: uploaded.publicId, url: uploaded.secureUrl };
    done += 1;
    report();
  }

  return {
    ...editConfig,
    ...(clips.length > 0 ? { clips: preparedClips } : {}),
    ...(preparedVoiceover ? { voiceover: preparedVoiceover } : {}),
  };
}

/**
 * Builds the finished video's link and, when it has processed edits, waits until the media service has
 * made it. If a combination of edits is refused, a simpler version is used so sharing never fails:
 * first without effects and voiceover, then with only trim, speed and filters.
 */
export async function finalizeStudioVideoUrl(
  baseUrl: string,
  editConfig: MediaEditConfig | undefined,
  options: { durationSeconds?: number; mode: StudioMode; onProgress?: (update: StudioProgressUpdate) => void }
) {
  const build = (level: "full" | "basic" | "simple") =>
    buildCloudinaryEditedVideoUrl(baseUrl, editConfig, { durationSeconds: options.durationSeconds, mode: options.mode, level });
  if (!hasProcessedVideoEdits(editConfig)) {
    return build("full");
  }
  const levels: Array<"full" | "basic" | "simple"> = ["full", "basic", "simple"];
  for (const level of levels) {
    const url = build(level);
    options.onProgress?.({ stage: "rendering" });
    const check = await waitForCloudinaryRender(url, { timeoutMs: 150_000, minimumBytes: 6000 });
    if (check.ready || !check.failed) {
      return url;
    }
    console.warn(`Sohba: the media service refused the ${level} video edit (${check.status} ${check.error ?? ""}); trying a simpler one.`);
  }
  return build("simple");
}

export interface StudioVideoPublishInput {
  source: string;
  label: string;
  mimeType?: string;
  fileName?: string;
  durationSeconds?: number;
  editConfig?: MediaEditConfig;
}

/**
 * Everything needed to publish an edited video: uploads the main video (or makes a photo into one),
 * uploads joined clips and the voiceover, and returns the finished video's link, its cover image and the
 * uploaded state (so an editor preview can be reused when sharing).
 */
export async function publishStudioVideo(context: StudioUploadContext, input: StudioVideoPublishInput) {
  const source = input.source.trim();
  if (!source) {
    throw new Error(`Pick a ${input.label} first.`);
  }
  let editConfig = input.editConfig;
  let baseUrl: string;
  let durationSeconds = input.durationSeconds;

  if (editConfig?.photoVideo) {
    const seconds = Math.min(10, Math.max(1, Math.round(editConfig.photoVideo.seconds || 4)));
    if (isCloudinaryUrl(source, "video")) {
      // Made into a video already (in the editor's preview).
      baseUrl = source;
    } else {
      context.onProgress?.({ stage: "uploading", done: 0, total: 1 });
      const photo = await uploadStudioFile(context, {
        uri: source,
        type: "image",
        suffix: "photo",
        label: input.label,
        mimeType: input.mimeType,
        fileName: input.fileName,
      });
      const video = await makeStudioPhotoVideo(context, { imageUrl: photo.secureUrl, seconds, aspect: frameAspect(editConfig), suffix: "photo-video" });
      baseUrl = video.secureUrl;
    }
    durationSeconds = seconds;
    const { photoVideo: _photoVideo, trimStartRatio: _start, trimEndRatio: _end, ...rest } = editConfig;
    editConfig = rest;
  } else {
    if (isLocalUri(source)) {
      context.onProgress?.({ stage: "uploading", done: 0, total: 1 });
    }
    const uploaded = await uploadStudioFile(context, {
      uri: source,
      type: "video",
      suffix: "video",
      label: input.label,
      mimeType: input.mimeType,
      fileName: input.fileName,
      durationSeconds: input.durationSeconds,
    });
    baseUrl = uploaded.secureUrl;
    durationSeconds = input.durationSeconds ?? uploaded.duration;
  }

  editConfig = await prepareStudioClips(context, editConfig);
  const videoUrl = await finalizeStudioVideoUrl(baseUrl, editConfig, { durationSeconds, mode: context.mode, onProgress: context.onProgress });
  const thumbnailUrl = buildCloudinaryVideoThumbnailUrl(baseUrl, { editConfig, durationSeconds });
  return { videoUrl, thumbnailUrl, baseUrl, editConfig, durationSeconds };
}

/** A photo with its processed look (effects and frame), ready to show; waits while it is being made. */
export async function publishStudioPhoto(context: StudioUploadContext, input: { source: string; label: string; mimeType?: string; fileName?: string; editConfig?: MediaEditConfig }) {
  const uploaded = await uploadStudioFile(context, {
    uri: input.source,
    type: "image",
    suffix: "photo",
    label: input.label,
    mimeType: input.mimeType,
    fileName: input.fileName,
  });
  const imageUrl = buildCloudinaryEditedImageUrl(uploaded.secureUrl, input.editConfig);
  return { imageUrl, baseUrl: uploaded.secureUrl };
}

export interface StudioPreviewInput {
  uri: string;
  type: "image" | "video";
  mimeType?: string;
  fileName?: string;
  durationSeconds?: number;
  editConfig?: MediaEditConfig;
  mode: StudioMode;
  onProgress?: (update: StudioProgressUpdate) => void;
}

export type StudioPreviewResult =
  | { ok: true; kind: "image" | "video"; url: string; baseUrl: string; editConfig?: MediaEditConfig }
  | { ok: false; message: string };

/** Folder for a creation's uploads (stories keep photos and videos apart, as before). */
export function studioUploadFolder(mode: StudioMode, type: "image" | "video"): MediaFolder {
  if (mode === "post") {
    return "posts";
  }
  if (mode === "story") {
    return type === "image" ? "stories" : "reels";
  }
  return "reels";
}

/** Makes the finished photo or video in the cloud (uploading what's needed) so the creator can watch it. */
export async function renderStudioPreviewWith(token: string, publicIdPrefix: string, input: StudioPreviewInput): Promise<StudioPreviewResult> {
  const context: StudioUploadContext = {
    token,
    folder: studioUploadFolder(input.mode, input.type),
    publicIdPrefix,
    mode: input.mode,
    onProgress: input.onProgress,
  };
  try {
    if (input.type === "image") {
      input.onProgress?.({ stage: "uploading", done: 0, total: 1 });
      const photo = await publishStudioPhoto(context, {
        source: input.uri,
        label: "photo",
        mimeType: input.mimeType,
        fileName: input.fileName,
        editConfig: input.editConfig,
      });
      input.onProgress?.({ stage: "rendering" });
      await waitForCloudinaryRender(photo.imageUrl, { timeoutMs: 45_000 });
      return { ok: true, kind: "image", url: photo.imageUrl, baseUrl: photo.baseUrl, editConfig: input.editConfig };
    }
    const video = await publishStudioVideo(context, {
      source: input.uri,
      label: "video",
      mimeType: input.mimeType,
      fileName: input.fileName,
      durationSeconds: input.durationSeconds,
      editConfig: input.editConfig,
    });
    return { ok: true, kind: "video", url: video.videoUrl, baseUrl: video.baseUrl, editConfig: video.editConfig };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "The preview couldn't be made. Please try again." };
  }
}
