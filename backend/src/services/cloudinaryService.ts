import crypto from "crypto";
import { env } from "../config/env";

export type CloudinaryResourceType = "image" | "video" | "raw";

export interface CloudinarySignatureInput {
  folder: string;
  publicIdPrefix?: string;
  resourceType: CloudinaryResourceType;
}

const allowedResourceTypes: CloudinaryResourceType[] = ["image", "video", "raw"];

export function isCloudinaryConfigured() {
  return Boolean(env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret);
}

export function normalizeCloudinaryResourceType(resourceType: string): CloudinaryResourceType {
  return allowedResourceTypes.includes(resourceType as CloudinaryResourceType)
    ? (resourceType as CloudinaryResourceType)
    : "image";
}

export function createCloudinaryUploadSignature(input: CloudinarySignatureInput) {
  if (!isCloudinaryConfigured()) {
    return undefined;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = normalizeFolder(input.folder);
  const publicId = input.publicIdPrefix
    ? `${normalizePublicIdPrefix(input.publicIdPrefix)}-${timestamp}`
    : undefined;
  const paramsToSign: Record<string, string | number> = {
    folder,
    timestamp,
  };

  if (publicId) {
    paramsToSign.public_id = publicId;
  }

  const signature = signCloudinaryParams(paramsToSign);

  return {
    apiKey: env.cloudinaryApiKey,
    cloudName: env.cloudinaryCloudName,
    folder,
    publicId,
    resourceType: input.resourceType,
    signature,
    timestamp,
    uploadUrl: getCloudinaryUploadUrl(input.resourceType),
  };
}

export function buildCloudinaryDeliveryUrl(publicId: string, resourceType: CloudinaryResourceType, transformations = "q_auto,f_auto") {
  if (!env.cloudinaryCloudName) {
    return "";
  }

  return `https://res.cloudinary.com/${env.cloudinaryCloudName}/${resourceType}/upload/${transformations}/${publicId}`;
}

function getCloudinaryUploadUrl(resourceType: CloudinaryResourceType) {
  return `https://api.cloudinary.com/v1_1/${env.cloudinaryCloudName}/${resourceType}/upload`;
}

function signCloudinaryParams(params: Record<string, string | number>) {
  const signatureBase = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return crypto.createHash("sha1").update(`${signatureBase}${env.cloudinaryApiSecret}`).digest("hex");
}

function normalizeFolder(folder: string) {
  const safeFolder = folder
    .split("/")
    .map((part) => part.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-"))
    .filter(Boolean)
    .join("/");

  return safeFolder ? `${env.cloudinaryUploadFolder}/${safeFolder}` : env.cloudinaryUploadFolder;
}

function normalizePublicIdPrefix(publicIdPrefix: string) {
  return publicIdPrefix.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 60);
}

const USER_MEDIA_FOLDERS = ["profile", "stories", "reels", "products", "posts", "ai", "communities", "messages", "sounds"];

/**
 * Deletes every photo, video and sound a person uploaded. Uploads are stored under
 * <upload folder>/<kind>/<user id>, so each kind is cleared by prefix with the Cloudinary Admin API.
 */
export async function deleteCloudinaryMediaForUser(userId: string) {
  if (!isCloudinaryConfigured()) {
    return 0;
  }
  const uid = userId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  if (!uid) {
    return 0;
  }
  const authorization = `Basic ${Buffer.from(`${env.cloudinaryApiKey}:${env.cloudinaryApiSecret}`).toString("base64")}`;
  let removed = 0;
  for (const resourceType of ["image", "video", "raw"]) {
    for (const folder of USER_MEDIA_FOLDERS) {
      const prefix = `${env.cloudinaryUploadFolder}/${folder}/${uid}`;
      try {
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${env.cloudinaryCloudName}/resources/${resourceType}/upload?prefix=${encodeURIComponent(prefix)}`,
          { method: "DELETE", headers: { Authorization: authorization } }
        );
        if (response.ok) {
          const body = (await response.json()) as { deleted?: Record<string, string> };
          removed += Object.keys(body.deleted ?? {}).length;
        }
      } catch {
        // Media clean-up is best effort; the account itself is still removed.
      }
    }
  }
  return removed;
}
