import { Response } from "express";
import { z } from "zod";
import { rejectIfSexualMedia } from "./contentSafety";
import { AuthenticatedRequest } from "../middleware/auth";
import {
  buildCloudinaryDeliveryUrl,
  createCloudinaryUploadSignature,
  isCloudinaryConfigured,
  normalizeCloudinaryResourceType,
} from "../services/cloudinaryService";

const signatureSchema = z.object({
  folder: z.enum(["profile", "stories", "reels", "products", "ai", "communities"]).default("reels"),
  publicIdPrefix: z.string().max(60).optional(),
  resourceType: z.enum(["image", "video", "raw"]).default("image"),
});

const moderationCheckSchema = z.object({
  type: z.enum(["image", "video"]),
  url: z.string().url(),
  label: z.string().max(80).optional(),
  seconds: z.number().min(1).max(300).optional(),
});

export function getMediaStatus(_req: AuthenticatedRequest, res: Response) {
  res.json({
    cloudinaryConfigured: isCloudinaryConfigured(),
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
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

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
