import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { getFirebaseClientFirestore, isFirebaseClientConfigured } from "./firebaseClient";
import {
  AppNotification,
  ConversationType,
  NotificationType,
  SavedEntityType,
  SavedPost,
  User,
} from "../types/models";

const SAVED_POSTS_COLLECTION = "savedPosts";
const NOTIFICATIONS_COLLECTION = "notifications";

export function isFirebaseInboxConfigured() {
  return isFirebaseClientConfigured();
}

export async function fetchFirebaseInboxSnapshot(userId: string) {
  const db = getRequiredFirestore();
  const [savedSnapshot, notificationsSnapshot] = await Promise.all([
    getDocs(query(collection(db, SAVED_POSTS_COLLECTION), where("userId", "==", userId), orderBy("createdAt", "desc"), limit(300))),
    getDocs(
      query(collection(db, NOTIFICATIONS_COLLECTION), where("userId", "==", userId), orderBy("createdAt", "desc"), limit(200))
    ),
  ]);

  return {
    savedPosts: savedSnapshot.docs.map((item) => normalizeSavedPostDoc(item.id, item.data())),
    notifications: notificationsSnapshot.docs.map((item) => normalizeNotificationDoc(item.id, item.data())),
  };
}

export function subscribeToFirebaseInbox(
  userId: string,
  input: {
    onSavedPosts: (savedPosts: SavedPost[]) => void;
    onNotifications: (notifications: AppNotification[]) => void;
  }
) {
  const db = getFirebaseClientFirestore();
  if (!db) {
    return () => undefined;
  }

  const unsubscribers = [
    onSnapshot(
      query(collection(db, SAVED_POSTS_COLLECTION), where("userId", "==", userId), orderBy("createdAt", "desc"), limit(300)),
      (snapshot) => {
        input.onSavedPosts(snapshot.docs.map((item) => normalizeSavedPostDoc(item.id, item.data())));
      },
      () => undefined
    ),
    onSnapshot(
      query(collection(db, NOTIFICATIONS_COLLECTION), where("userId", "==", userId), orderBy("createdAt", "desc"), limit(200)),
      (snapshot) => {
        input.onNotifications(snapshot.docs.map((item) => normalizeNotificationDoc(item.id, item.data())));
      },
      () => undefined
    ),
  ];

  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
}

export async function toggleFirebaseSavedPost(userId: string, entityType: SavedEntityType, entityId: string) {
  const db = getRequiredFirestore();
  const savedRef = doc(db, SAVED_POSTS_COLLECTION, buildSavedPostId(userId, entityType, entityId));
  const snapshot = await getDoc(savedRef);

  if (snapshot.exists()) {
    await deleteDoc(savedRef);
    return {
      saved: false,
      savedPost: null,
    };
  }

  const savedPost: SavedPost = {
    id: savedRef.id,
    userId,
    entityType,
    entityId,
    createdAt: new Date().toISOString(),
  };

  await setDoc(savedRef, savedPost);

  return {
    saved: true,
    savedPost,
  };
}

export async function createFirebaseNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  actor?: User;
  entityType?: SavedEntityType;
  entityId?: string;
  conversationId?: string;
  conversationType?: ConversationType;
  dedupeId?: string;
}) {
  if (input.actor?.id === input.userId) {
    return null;
  }

  const db = getRequiredFirestore();
  const notificationRef = input.dedupeId
    ? doc(db, NOTIFICATIONS_COLLECTION, normalizeNotificationId(input.dedupeId))
    : doc(collection(db, NOTIFICATIONS_COLLECTION));
  const notification: AppNotification = {
    id: notificationRef.id,
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    actorId: input.actor?.id,
    actorName: input.actor?.name,
    actorAvatar: input.actor?.profileImage,
    entityType: input.entityType,
    entityId: input.entityId,
    conversationId: input.conversationId,
    conversationType: input.conversationType,
    createdAt: new Date().toISOString(),
  };

  await setDoc(notificationRef, notification, { merge: true });
  return notification;
}

export async function markAllFirebaseNotificationsRead(userId: string) {
  const db = getRequiredFirestore();
  const snapshot = await getDocs(
    query(collection(db, NOTIFICATIONS_COLLECTION), where("userId", "==", userId), orderBy("createdAt", "desc"), limit(200))
  );
  const readAt = new Date().toISOString();
  const batch = writeBatch(db);
  let hasUnreadNotifications = false;
  const notifications = snapshot.docs.map((item) => {
    const notification = normalizeNotificationDoc(item.id, item.data());

    if (!notification.readAt) {
      hasUnreadNotifications = true;
      batch.set(
        item.ref,
        {
          readAt,
        },
        { merge: true }
      );
    }

    return {
      ...notification,
      readAt: notification.readAt ?? readAt,
    };
  });

  if (hasUnreadNotifications) {
    await batch.commit();
  }

  return notifications;
}

export function getFirebaseInboxErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Inbox action could not be saved. Please try again.";
}

function getRequiredFirestore() {
  const db = getFirebaseClientFirestore();
  if (!db) {
    throw new Error("Firestore is not configured. Add the EXPO_PUBLIC_FIREBASE_* values to mobile/.env.");
  }

  return db;
}

function normalizeSavedPostDoc(id: string, data: Record<string, unknown>): SavedPost {
  return {
    id,
    userId: readString(data.userId, ""),
    entityType: normalizeSavedEntityType(readString(data.entityType, "reel")),
    entityId: readString(data.entityId, ""),
    createdAt: readString(data.createdAt, new Date().toISOString()),
  };
}

function normalizeNotificationDoc(id: string, data: Record<string, unknown>): AppNotification {
  return {
    id,
    userId: readString(data.userId, ""),
    type: normalizeNotificationType(readString(data.type, "system")),
    title: readString(data.title, "Pulseora update"),
    body: readString(data.body, ""),
    actorId: readOptionalString(data.actorId),
    actorName: readOptionalString(data.actorName),
    actorAvatar: readOptionalString(data.actorAvatar),
    entityType: normalizeOptionalSavedEntityType(data.entityType),
    entityId: readOptionalString(data.entityId),
    conversationId: readOptionalString(data.conversationId),
    conversationType: normalizeOptionalConversationType(data.conversationType),
    createdAt: readString(data.createdAt, new Date().toISOString()),
    readAt: readOptionalString(data.readAt),
  };
}

function buildSavedPostId(userId: string, entityType: SavedEntityType, entityId: string) {
  return normalizeNotificationId(`${userId}-${entityType}-${entityId}`);
}

function normalizeNotificationId(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 120);
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeSavedEntityType(value: string): SavedEntityType {
  return value === "product" ? "product" : "reel";
}

function normalizeOptionalSavedEntityType(value: unknown) {
  if (value === "reel" || value === "product") {
    return value;
  }

  return undefined;
}

function normalizeOptionalConversationType(value: unknown) {
  if (value === "direct" || value === "marketplace") {
    return value;
  }

  return undefined;
}

function normalizeNotificationType(value: string): NotificationType {
  if (
    value === "like" ||
    value === "comment" ||
    value === "follow" ||
    value === "repost" ||
    value === "boost" ||
    value === "save" ||
    value === "message" ||
    value === "order" ||
    value === "system"
  ) {
    return value;
  }

  return "system";
}
