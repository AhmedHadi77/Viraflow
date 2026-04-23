import { Router } from "express";
import { getMyNotifications, markMyNotificationsRead } from "../controllers/notificationsController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/me", requireAuth, getMyNotifications);
router.post("/read-all", requireAuth, markMyNotificationsRead);

export { router as notificationsRouter };
