import { z } from "zod";
import { getFirestore } from "./firebaseService";

const DEVICE_PUSH_TOKENS_COLLECTION = "devicePushTokens";
const NOTIFICATIONS_COLLECTION = "notifications";
const EXPO_PUSH_API_URL = "https://exp.host/--/api/v2/push/send";
const ANDROID_CHANNEL_ID = "pulseora-social";

const notificationTypeSchema = z.enum(["like", "comment", "follow", "repost", "boost", "save", "message", "order", "system"]);
const savedEntityTypeSchema = z.enum(["reel", "product"]);
const conversationTypeSchema = z.enum(["marketplace", "direct"]);

export const notificationDeliverySchema = z.object({
  userId: z.string().min(1),
  type: notificationTypeSchema,
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(240),
  entityType: savedEntityTypeSchema.optional(),
  entityId: z.string().min(1).max(160).optional(),
  conversationId: z.string().min(1).max(160).optional(),
  conversationType: conversationTypeSchema.optional(),
  dedupeId: z.string().min(1).max(160).optional(),
});

export type NotificationDeliveryInput = z.infer<typeof notificationDeliverySchema> & {
  actor: {
    id: string;
    name?: string;
    picture?: string;
  };
};

export interface DeliveredNotification {
  id: string;
  userId: string;
  type: z.infer<typeof notificationTypeSchema>;
  title: string;
  body: string;
  actorId?: string;
  actorName?: string;
  actorAvatar?: string;
  entityType?: z.infer<typeof savedEntityTypeSchema>;
  entityId?: string;
  conversationId?: string;
  conversationType?: z.infer<typeof conversationTypeSchema>;
  createdAt: string;
  readAt?: string;
}

export async function deliverNotification(input: NotificationDeliveryInput) {
  if (!input.userId.trim()) {
    throw new Error("Notification target is missing.");
  }

  if (input.actor.id === input.userId && input.type !== "system" && input.type !== "boost") {
    return {
      notification: null,
      deliveredCount: 0,
    };
  }

  const db = getFirestore();
  if (!db) {
    throw new Error("Firebase Admin is not configured on the backend.");
  }

  const notificationRef = input.dedupeId
    ? db.collection(NOTIFICATIONS_COLLECTION).doc(normalizeDocId(input.dedupeId))
    : db.collection(NOTIFICATIONS_COLLECTION).doc();
  const createdAt = new Date().toISOString();
  const notification: DeliveredNotification = {
    id: notificationRef.id,
    userId: input.userId.trim(),
    type: input.type,
    title: input.title.trim(),
    body: input.body.trim(),
    actorId: input.actor.id,
    actorName: input.actor.name?.trim() || undefined,
    actorAvatar: input.actor.picture?.trim() || undefined,
    entityType: input.entityType,
    entityId: input.entityId?.trim() || undefined,
    conversationId: input.conversationId?.trim() || undefined,
    conversationType: input.conversationType,
    createdAt,
  };

  await notificationRef.set(notification, { merge: true });
  const deliveredCount = await sendExpoPushNotificationsForUser(db, notification.userId, notification);

  return {
    notification,
    deliveredCount,
  };
}

async function sendExpoPushNotificationsForUser(
  db: NonNullable<ReturnType<typeof getFirestore>>,
  userId: string,
  notification: DeliveredNotification
) {
  const snapshot = await db.collection(DEVICE_PUSH_TOKENS_COLLECTION).where("userId", "==", userId).limit(12).get();
  const tokens = snapshot.docs
    .map((item) => readPushToken(item.data().token))
    .filter((token): token is string => Boolean(token));

  if (tokens.length === 0) {
    return 0;
  }

  const messages = tokens.map((token) => ({
    to: token,
    sound: "default",
    title: notification.title,
    body: notification.body,
    data: {
      notificationId: notification.id,
      type: notification.type,
      entityType: notification.entityType,
      entityId: notification.entityId,
      conversationId: notification.conversationId,
      conversationType: notification.conversationType,
      actorId: notification.actorId,
    },
    channelId: ANDROID_CHANNEL_ID,
  }));

  const response = await fetch(EXPO_PUSH_API_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    throw new Error("Expo Push API could not deliver this notification.");
  }

  return tokens.length;
}

function normalizeDocId(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-").slice(0, 150);
}

function readPushToken(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
