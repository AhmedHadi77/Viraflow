import multer from "multer";
import { Router } from "express";
import {
  aiAvatarCreator,
  aiFailureAudit,
  aiGrowthCoach,
  aiImage,
  aiStatus,
  aiText,
  aiTrendFeed,
  aiTrendHijack,
  aiViralEngine,
  aiViralVoice,
  aiVideoContent,
  aiVideoCreate,
  aiVideoRetrieve,
} from "../controllers/aiController";
import { requireAuth } from "../middleware/auth";

const router = Router();
const auditUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 40 * 1024 * 1024,
  },
});

router.get("/status", requireAuth, aiStatus);
router.post("/text", requireAuth, aiText);
router.post("/image", requireAuth, aiImage);
router.post("/video", requireAuth, aiVideoCreate);
router.post("/avatars/create", requireAuth, aiAvatarCreator);
router.post("/failure-audit", requireAuth, auditUpload.single("video"), aiFailureAudit);
router.post("/growth-coach", requireAuth, aiGrowthCoach);
router.get("/video/:id", requireAuth, aiVideoRetrieve);
router.get("/video/:id/content", requireAuth, aiVideoContent);
router.get("/trends", requireAuth, aiTrendFeed);
router.post("/trends/hijack", requireAuth, aiTrendHijack);
router.post("/viral-engine", requireAuth, aiViralEngine);
router.get("/viral-engine/:id/voice", requireAuth, aiViralVoice);

export { router as aiRouter };
