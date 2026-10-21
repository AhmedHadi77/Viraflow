import { z } from "zod";
import { getFirestore } from "./firebaseService";
import { localizePushText } from "./notificationText";
import { readPushTargets, sendPush } from "./pushSender";

const DEVICE_PUSH_TOKENS_COLLECTION = "devicePushTokens";
const NOTIFICATIONS_COLLECTION = "notifications";

const notificationTypeSchema = z.enum([
  "post_like",
  "post_comment",
  "reel_like",
  "reel_comment",
  "story_view",
  "mention",
  "like",
  "comment",
  "follow",
  "repost",
  "boost",
  "save",
  "message",
  "order",
  "call",
  "system",
  "new_post",
  "new_reel",
  "new_story",
]);
const savedEntityTypeSchema = z.enum(["reel", "product", "post", "story"]);
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

  if (!input.actor.name || !input.actor.picture) {
    const actorDoc = await db.collection("users").doc(input.actor.id).get().catch(() => null);
    input = {
      ...input,
      actor: {
        id: input.actor.id,
        name: input.actor.name || (actorDoc?.get("name") as string | undefined) || undefined,
        picture: input.actor.picture || (actorDoc?.get("profileImage") as string | undefined) || undefined,
      },
    };
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
  const targets = readPushTargets(snapshot.docs);
  if (targets.length === 0) {
    return 0;
  }

  // Write the banner in the recipient's language.
  const recipient = await db.collection("users").doc(userId).get().catch(() => null);
  const pushText = localizePushText(
    {
      type: notification.type,
      actorName: notification.actorName,
      entityType: notification.entityType,
      conversationType: notification.conversationType,
      title: notification.title,
      body: notification.body,
    },
    typeof recipient?.get("language") === "string" ? recipient.get("language") : undefined
  );

  return sendPush(db, targets, {
    title: pushText.title,
    body: pushText.body || undefined,
    urgent: notification.type === "call",
    data: {
      notificationId: notification.id,
      type: notification.type,
      entityType: notification.entityType,
      entityId: notification.entityId,
      conversationId: notification.conversationId,
      conversationType: notification.conversationType,
      actorId: notification.actorId,
    },
  });
}

function normalizeDocId(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-").slice(0, 150);
}


export const followerFanoutSchema = z.object({
  type: z.enum(["new_post", "new_reel", "new_story"]),
  entityId: z.string().min(1).max(160),
  preview: z.string().max(240).optional(),
});

const FANOUT_LIMIT = 5000;

/**
 * Tells everyone who follows the author about a new post, reel or story: one in-app notification each,
 * plus a phone notification in each follower's language.
 */
export async function notifyFollowersOfNewContent(authorId: string, input: z.infer<typeof followerFanoutSchema>) {
  const db = getFirestore();
  if (!db) {
    throw new Error("Firebase Admin is not configured on the backend.");
  }
  const authorDoc = await db.collection("users").doc(authorId).get();
  if (!authorDoc.exists) {
    return { notified: 0, pushed: 0 };
  }
  const followers = ((authorDoc.get("followers") as unknown[]) ?? [])
    .filter((id): id is string => typeof id === "string" && id.length > 0 && id !== authorId)
    .slice(0, FANOUT_LIMIT);
  if (followers.length === 0) {
    return { notified: 0, pushed: 0 };
  }
  const actorName = (authorDoc.get("name") as string | undefined)?.trim() || "Sohba";
  const actorAvatar = (authorDoc.get("profileImage") as string | undefined) || undefined;
  const entityType = input.type === "new_reel" ? "reel" : input.type === "new_story" ? "story" : "post";
  const body = input.type === "new_story" ? "" : (input.preview ?? "").trim().slice(0, 240);
  const createdAt = new Date().toISOString();

  for (let index = 0; index < followers.length; index += 400) {
    const batch = db.batch();
    followers.slice(index, index + 400).forEach((userId) => {
      const ref = db.collection(NOTIFICATIONS_COLLECTION).doc(normalizeDocId(`${input.type}-${input.entityId}-${userId}`));
      batch.set(
        ref,
        {
          id: ref.id,
          userId,
          type: input.type,
          title: `${actorName} shared something new`,
          body: body || " ",
          actorId: authorId,
          actorName,
          ...(actorAvatar ? { actorAvatar } : {}),
          entityType,
          entityId: input.entityId,
          createdAt,
        },
        { merge: true }
      );
    });
    await batch.commit();
  }

  // Phone notifications, written in each follower's own language.
  let pushed = 0;
  for (let index = 0; index < followers.length; index += 30) {
    const chunk = followers.slice(index, index + 30);
    const [tokenSnapshot, userDocs] = await Promise.all([
      db.collection(DEVICE_PUSH_TOKENS_COLLECTION).where("userId", "in", chunk).get(),
      db.getAll(...chunk.map((id) => db.collection("users").doc(id))),
    ]);
    const languageByUser = new Map(userDocs.map((doc) => [doc.id, doc.get("language") as string | undefined]));
    const docsByLanguage = new Map<string, typeof tokenSnapshot.docs>();
    tokenSnapshot.docs.forEach((doc) => {
      const language = languageByUser.get(String(doc.get("userId"))) ?? "en";
      docsByLanguage.set(language, [...(docsByLanguage.get(language) ?? []), doc]);
    });
    for (const [language, docs] of docsByLanguage) {
      const text = localizePushText({ type: input.type, actorName, entityType, title: actorName, body }, language);
      pushed += await sendPush(db, readPushTargets(docs), {
        title: text.title,
        body: text.body || undefined,
        data: { type: input.type, entityType, entityId: input.entityId, actorId: authorId, userId: authorId },
      });
    }
  }
  return { notified: followers.length, pushed };
}
