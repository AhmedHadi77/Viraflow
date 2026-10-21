import { AppNotification } from "../types/models";

export interface NotificationNavigationTarget {
  name: string;
  params?: Record<string, string | boolean>;
}

export function buildNotificationNavigationData(notification: Pick<
  AppNotification,
  "conversationId" | "conversationType" | "entityType" | "entityId" | "actorId" | "type" | "userId"
>) {
  return compactNotificationFields({
    userId: notification.userId,
    type: notification.type,
    conversationId: notification.conversationId,
    conversationType: notification.conversationType,
    entityType: notification.entityType,
    entityId: notification.entityId,
    actorId: notification.actorId,
  });
}

export function getNotificationNavigationTarget(input: Partial<AppNotification> | Record<string, unknown>) {
  const payload = normalizeNotificationNavigationPayload(input);

  if (payload.type === "call" && payload.entityId) {
    return {
      name: "Call",
      params: {
        callId: payload.entityId,
      },
    } satisfies NotificationNavigationTarget;
  }

  if (payload.type === "new_story" && payload.actorId) {
    return {
      name: "StoryViewer",
      params: {
        userId: payload.actorId,
        ...(payload.entityId ? { storyId: payload.entityId } : {}),
      },
    } satisfies NotificationNavigationTarget;
  }

  if (payload.type === "new_reel" && payload.entityId) {
    return { name: "ReelDetails", params: { reelId: payload.entityId } } satisfies NotificationNavigationTarget;
  }

  if (payload.type === "new_post" && payload.entityId) {
    return { name: "PostDetails", params: { postId: payload.entityId } } satisfies NotificationNavigationTarget;
  }

  if (payload.type === "story_view" && payload.entityId && payload.userId) {
    return {
      name: "StoryViewer",
      params: {
        storyId: payload.entityId,
        userId: payload.userId,
      },
    } satisfies NotificationNavigationTarget;
  }

  if (payload.conversationId && payload.conversationType === "direct") {
    return {
      name: "DirectChat",
      params: {
        threadId: payload.conversationId,
      },
    } satisfies NotificationNavigationTarget;
  }

  if (payload.conversationId) {
    return {
      name: "MarketplaceChat",
      params: {
        threadId: payload.conversationId,
      },
    } satisfies NotificationNavigationTarget;
  }

  if (payload.entityType === "reel" && payload.entityId) {
    return {
      name: "ReelDetails",
      params: {
        reelId: payload.entityId,
      },
    } satisfies NotificationNavigationTarget;
  }

  if (payload.entityType === "product" && payload.entityId) {
    return {
      name: "ProductDetails",
      params: {
        productId: payload.entityId,
      },
    } satisfies NotificationNavigationTarget;
  }

  if (payload.entityType === "post" && payload.entityId) {
    return {
      name: "PostDetails",
      params: {
        postId: payload.entityId,
        openComments:
          payload.type === "post_comment" ||
          payload.type === "mention" ||
          payload.type === "comment",
      },
    } satisfies NotificationNavigationTarget;
  }

  if (payload.actorId) {
    return {
      name: "PublicProfile",
      params: {
        userId: payload.actorId,
      },
    } satisfies NotificationNavigationTarget;
  }

  return null;
}

function normalizeNotificationNavigationPayload(input: Partial<AppNotification> | Record<string, unknown>) {
  return {
    userId: readOptionalString(input.userId),
    type: normalizeNotificationType(input.type),
    conversationId: readOptionalString(input.conversationId),
    conversationType: normalizeConversationType(input.conversationType),
    entityType: normalizeEntityType(input.entityType),
    entityId: readOptionalString(input.entityId),
    actorId: readOptionalString(input.actorId),
  };
}

function compactNotificationFields(input: Record<string, string | undefined>) {
  return Object.fromEntries(Object.entries(input).filter((entry): entry is [string, string] => Boolean(entry[1])));
}

function readOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeConversationType(value: unknown) {
  return value === "direct" || value === "marketplace" ? value : undefined;
}

function normalizeEntityType(value: unknown) {
  return value === "reel" || value === "product" || value === "post" ? value : undefined;
}

function normalizeNotificationType(value: unknown) {
  if (
    value === "post_like" ||
    value === "post_comment" ||
    value === "reel_like" ||
    value === "reel_comment" ||
    value === "story_view" ||
    value === "mention" ||
    value === "like" ||
    value === "comment" ||
    value === "follow" ||
    value === "repost" ||
    value === "boost" ||
    value === "save" ||
    value === "message" ||
    value === "order" ||
    value === "call" ||
    value === "system" ||
    value === "new_post" ||
    value === "new_reel" ||
    value === "new_story"
  ) {
    return value;
  }

  return undefined;
}
