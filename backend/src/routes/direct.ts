import { Router } from "express";
import { getDirectInbox, getDirectThread, postDirectMessage, postDirectThread } from "../controllers/directController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/inbox/me", requireAuth, getDirectInbox);
router.post("/threads", requireAuth, postDirectThread);
router.get("/threads/:id", requireAuth, getDirectThread);
router.post("/threads/:id/messages", requireAuth, postDirectMessage);

export { router as directRouter };
