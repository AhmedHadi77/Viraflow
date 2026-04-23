import { Router } from "express";
import { getMediaStatus, postCloudinarySignature, postMediaModerationCheck } from "../controllers/mediaController";
import { requireAuth } from "../middleware/auth";

export const mediaRouter = Router();

mediaRouter.get("/status", getMediaStatus);
mediaRouter.post("/cloudinary/signature", requireAuth, postCloudinarySignature);
mediaRouter.post("/moderation/check", requireAuth, postMediaModerationCheck);
