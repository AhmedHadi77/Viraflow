import { Router } from "express";
import { getMediaStatus, postCloudinarySignature, postMediaModerationCheck } from "../controllers/mediaController";

export const mediaRouter = Router();

mediaRouter.get("/status", getMediaStatus);
mediaRouter.post("/cloudinary/signature", postCloudinarySignature);
mediaRouter.post("/moderation/check", postMediaModerationCheck);
