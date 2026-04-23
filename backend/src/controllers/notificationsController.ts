import { Response } from "express";
import { listNotificationsByUser, markAllNotificationsRead } from "../data/mockDb";
import { AuthenticatedRequest } from "../middleware/auth";
import { buildNotificationPayload } from "./helpers";

export function getMyNotifications(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  res.json({
    notifications: listNotificationsByUser(userId).map(buildNotificationPayload),
  });
}

export function markMyNotificationsRead(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  res.json({
    notifications: markAllNotificationsRead(userId).map(buildNotificationPayload),
  });
}
