import { Response } from "express";
import { listNotificationsByUser, markAllNotificationsRead } from "../data/mockDb";
import { AuthenticatedRequest } from "../middleware/auth";
import { buildNotificationPayload } from "./helpers";
import { deliverNotification, notificationDeliverySchema } from "../services/notificationDeliveryService";

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

export async function deliverNotificationToUser(req: AuthenticatedRequest, res: Response) {
  if (!req.user?.id) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  const parsed = notificationDeliverySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(parsed.error.flatten());
    return;
  }

  try {
    const result = await deliverNotification({
      ...parsed.data,
      actor: {
        id: req.user.id,
        name: req.user.name,
        picture: req.user.picture,
      },
    });

    res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Notification delivery failed.";
    res.status(500).json({ message });
  }
}
