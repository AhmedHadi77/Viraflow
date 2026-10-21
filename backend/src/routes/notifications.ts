import { Router } from "express";
import {
  deliverNotificationToUser,
  getMyNotifications,
  markMyNotificationRead,
  markMyNotificationsRead,
  notifyFollowers,
} from "../controllers/notificationsController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/me", requireAuth, getMyNotifications);
router.post("/read-all", requireAuth, markMyNotificationsRead);
router.post("/read/:notificationId", requireAuth, markMyNotificationRead);
router.post("/deliver", requireAuth, deliverNotificationToUser);
router.post("/followers", requireAuth, notifyFollowers);

export { router as notificationsRouter };
