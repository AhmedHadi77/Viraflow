import { Response } from "express";
import { z } from "zod";
import { rejectIfSexualMedia } from "./contentSafety";
import { AuthenticatedRequest } from "../middleware/auth";
import {
  CaptionsSourceError,
  CaptionsUnavailableError,
  isAllowedCaptionSource,
  isCaptionsConfigured,
  transcribeCaptions,
} from "../services/captionService";
import {
  buildCloudinaryDeliveryUrl,
  createCloudinaryUploadSignature,
  isCloudinaryConfigured,
  normalizeCloudinaryResourceType,
} from "../services/cloudinaryService";

const signatureSchema = z.object({
  folder: z.enum(["profile", "stories", "reels", "products", "posts", "ai", "communities", "messages", "sounds"]).default("reels"),
  publicIdPrefix: z.string().max(60).optional(),
  resourceType: z.enum(["image", "video", "raw"]).default("image"),
});

const moderationCheckSchema = z.object({
  type: z.enum(["image", "video"]),
  url: z.string().url(),
  label: z.string().max(80).optional(),
  seconds: z.number().min(1).max(300).optional(),
});

const captionsSchema = z.object({
  url: z.string().url().max(4000),
  language: z
    .string()
    .regex(/^[a-z]{2}$/)
    .optional(),
});

// A creator can ask for captions a few times a minute (each call runs speech recognition).
const captionRequests = new Map<string, number[]>();
function allowCaptionRequest(userId: string) {
  const now = Date.now();
  const recent = (captionRequests.get(userId) ?? []).filter((time) => now - time < 60_000);
  if (recent.length >= 4) {
    captionRequests.set(userId, recent);
    return false;
  }
  recent.push(now);
  captionRequests.set(userId, recent);
  return true;
}

export function getMediaStatus(_req: AuthenticatedRequest, res: Response) {
  res.json({
    cloudinaryConfigured: isCloudinaryConfigured(),
    captionsConfigured: isCaptionsConfigured(),
    firebaseReady: true,
    delivery: {
      defaultVideoTransform: "q_auto,f_auto",
      lowConnectionTransform: "q_auto:eco,f_auto,w_480",
      highConnectionTransform: "q_auto:good,f_auto,w_1080",
    },
  });
}

export function postCloudinarySignature(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  const parsed = signatureSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(parsed.error.flatten());
    return;
  }

  const resourceType = normalizeCloudinaryResourceType(parsed.data.resourceType);
  const signature = createCloudinaryUploadSignature({
    folder: `${parsed.data.folder}/${userId}`,
    publicIdPrefix: parsed.data.publicIdPrefix,
    resourceType,
  });

  if (!signature) {
    res.status(503).json({
      message: "Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
    });
    return;
  }

  res.json({
    ...signature,
    optimizedUrlExample: signature.publicId
      ? buildCloudinaryDeliveryUrl(`${signature.folder}/${signature.publicId}`, resourceType)
    : undefined,
  });
}

export async function postMediaModerationCheck(req: AuthenticatedRequest, res: Response) {
  const parsed = moderationCheckSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(parsed.error.flatten());
    return;
  }

  const blocked = await rejectIfSexualMedia(res, [
    parsed.data.type === "image"
      ? { type: "image", url: parsed.data.url, label: parsed.data.label ?? "uploaded image" }
      : {
          type: "video",
          url: parsed.data.url,
          label: parsed.data.label ?? "uploaded video",
          seconds: parsed.data.seconds,
        },
  ]);

  if (blocked) {
    return;
  }

  res.json({
    allowed: true,
  });
}

/** Automatic captions: speech in a finished video (its sound from Cloudinary) to timed lines. */
export async function postMediaCaptions(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }
  const parsed = captionsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(parsed.error.flatten());
    return;
  }
  if (!isAllowedCaptionSource(parsed.data.url)) {
    res.status(400).json({ message: "Captions can only be made for videos uploaded to Sohba." });
    return;
  }
  if (!allowCaptionRequest(userId)) {
    res.status(429).json({ message: "Please wait a minute before making captions again." });
    return;
  }
  try {
    const result = await transcribeCaptions(parsed.data.url, parsed.data.language);
    res.json(result);
  } catch (error) {
    if (error instanceof CaptionsUnavailableError) {
      res.status(503).json({ message: error.message });
      return;
    }
    if (error instanceof CaptionsSourceError) {
      res.status(422).json({ message: error.message });
      return;
    }
    console.error("Captions failed", error);
    res.status(502).json({ message: "Captions could not be made right now. Please try again." });
  }
}
