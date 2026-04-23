import { AppNotification } from "../types/models";

export interface NotificationNavigationTarget {
  name: string;
  params?: Record<string, string>;
}

export function buildNotificationNavigationData(notification: Pick<
  AppNotification,
  "conversationId" | "conversationType" | "entityType" | "entityId" | "actorId"
>) {
  return compactNotificationFields({
    conversationId: notification.conversationId,
    conversationType: notification.conversationType,
    entityType: notification.entityType,
    entityId: notification.entityId,
    actorId: notification.actorId,
  });
}

export function getNotificationNavigationTarget(input: Partial<AppNotification> | Record<string, unknown>) {
  const payload = normalizeNotificationNavigationPayload(input);

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
  return value === "reel" || value === "product" ? value : undefined;
}
