import { Response } from "express";
import { listNotificationsByUser, markAllNotificationsRead, markNotificationRead } from "../data/mockDb";
import { AuthenticatedRequest } from "../middleware/auth";
import { buildNotificationPayload } from "./helpers";
import { deliverNotification, notificationDeliverySchema } from "../services/notificationDeliveryService";
import {
  emitNotificationPayloadRealtime,
  emitNotificationReadRealtime,
  emitNotificationsReadAllRealtime,
} from "../realtime/socketServer";

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

  const notifications = markAllNotificationsRead(userId);
  emitNotificationsReadAllRealtime(userId, notifications);

  res.json({
    notifications: notifications.map(buildNotificationPayload),
  });
}

export function markMyNotificationRead(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const notificationId = typeof req.params.notificationId === "string" ? req.params.notificationId.trim() : "";
  if (!userId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  if (!notificationId) {
    res.status(400).json({ message: "Notification id is required." });
    return;
  }

  const notification = markNotificationRead(userId, notificationId);
  if (!notification) {
    res.status(404).json({ message: "Notification not found." });
    return;
  }

  emitNotificationReadRealtime(notification);

  res.json({
    notification: buildNotificationPayload(notification),
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

    if (result.notification) {
      emitNotificationPayloadRealtime(result.notification.userId, result.notification);
    }

    res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Notification delivery failed.";
    res.status(500).json({ message });
  }
}
