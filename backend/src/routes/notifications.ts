import { Router } from "express";
import { deliverNotificationToUser, getMyNotifications, markMyNotificationsRead } from "../controllers/notificationsController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/me", requireAuth, getMyNotifications);
router.post("/read-all", requireAuth, markMyNotificationsRead);
router.post("/deliver", requireAuth, deliverNotificationToUser);

export { router as notificationsRouter };
