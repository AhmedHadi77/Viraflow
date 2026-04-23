import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import {
  canContributeToCommunity,
  getCommunityById,
  getDirectThreadById,
  getLatestUserActivityAt,
  getMarketplaceThreadById,
  listUsers,
  markCommunityChatDelivered,
  markCommunityChatRead,
  markDirectThreadDelivered,
  markDirectThreadRead,
  markMarketplaceThreadDelivered,
  markMarketplaceThreadRead,
} from "../data/mockDb";
import { getUserIdFromAccessToken } from "../middleware/auth";
import { CommunityChatMessage, DirectChatMessage, DirectChatThread, MarketplaceChatMessage, MarketplaceChatThread } from "../types/models";
import {
  buildCommunityChatMessagePayload,
  buildDirectMessagePayload,
  buildDirectThreadPayload,
  buildMarketplaceMessagePayload,
  buildMarketplaceThreadPayload,
} from "../controllers/helpers";

let io: SocketIOServer | null = null;
const activeConnectionCounts = new Map<string, number>();
const lastSeenByUserId = new Map<string, string>(
  listUsers().map((user) => [user.id, getLatestUserActivityAt(user.id) ?? user.createdAt])
);

type TypingEventPayload =
  | { conversationType: "direct"; threadId: string; isTyping: boolean }
  | { conversationType: "marketplace"; threadId: string; isTyping: boolean }
  | { conversationType: "community"; communityId: string; isTyping: boolean };

type ReadEventPayload =
  | { conversationType: "direct"; threadId: string }
  | { conversationType: "marketplace"; threadId: string }
  | { conversationType: "community"; communityId: string };

type DeliveredEventPayload =
  | { conversationType: "direct"; threadId: string }
  | { conversationType: "marketplace"; threadId: string }
  | { conversationType: "community"; communityId: string };

function getUserRoom(userId: string) {
  return `user:${userId}`;
}

function emitToUsers(userIds: string[], event: string, payload: unknown) {
  if (!io) {
    return;
  }

  [...new Set(userIds)].forEach((userId) => {
    io?.to(getUserRoom(userId)).emit(event, payload);
  });
}

function emitToUsersExcept(userIds: string[], skipUserId: string, event: string, payload: unknown) {
  emitToUsers(
    userIds.filter((userId) => userId !== skipUserId),
    event,
    payload
  );
}

function emitTypingIndicatorRealtime(userIds: string[], skipUserId: string, payload: TypingEventPayload & { userId: string }) {
  emitToUsersExcept(userIds, skipUserId, "chat:typing", payload);
}

function emitReadReceiptRealtime(userIds: string[], skipUserId: string, payload: ReadEventPayload & { userId: string; messageIds: string[] }) {
  emitToUsersExcept(userIds, skipUserId, "chat:read", payload);
}

function emitDeliveredRealtime(
  userIds: string[],
  skipUserId: string,
  payload: DeliveredEventPayload & { userId: string; messageIds: string[] }
) {
  emitToUsersExcept(userIds, skipUserId, "chat:delivered", payload);
}

function buildPresencePayload(userId: string) {
  return {
    userId,
    isOnline: (activeConnectionCounts.get(userId) ?? 0) > 0,
    lastSeenAt: lastSeenByUserId.get(userId),
  };
}

function emitPresenceUpdate(userId: string) {
  io?.emit("presence:update", buildPresencePayload(userId));
}

export function attachSocketServer(server: HttpServer) {
  io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.use((socket, next) => {
    const rawToken =
      typeof socket.handshake.auth?.token === "string"
        ? socket.handshake.auth.token
        : typeof socket.handshake.headers.authorization === "string"
          ? socket.handshake.headers.authorization.replace("Bearer ", "")
          : undefined;

    const normalizedToken = rawToken?.startsWith("Bearer ") ? rawToken.replace("Bearer ", "") : rawToken;
    const userId = getUserIdFromAccessToken(normalizedToken);
    if (!userId) {
      next(new Error("Unauthorized"));
      return;
    }

    socket.data.userId = userId;
    next();
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string | undefined;
    if (!userId) {
      socket.disconnect();
      return;
    }

    socket.join(getUserRoom(userId));
    activeConnectionCounts.set(userId, (activeConnectionCounts.get(userId) ?? 0) + 1);
    socket.emit("presence:snapshot", listUsers().map((user) => buildPresencePayload(user.id)));
    emitPresenceUpdate(userId);

    socket.on("chat:typing", (payload: TypingEventPayload) => {
      if (payload.conversationType === "direct") {
        const thread = getDirectThreadById(payload.threadId);
        if (!thread || !thread.participantIds.includes(userId)) {
          return;
        }

        emitTypingIndicatorRealtime(thread.participantIds, userId, { ...payload, userId });
        return;
      }

      if (payload.conversationType === "marketplace") {
        const thread = getMarketplaceThreadById(payload.threadId);
        if (!thread || (thread.buyerId !== userId && thread.sellerId !== userId)) {
          return;
        }

        emitTypingIndicatorRealtime([thread.buyerId, thread.sellerId], userId, { ...payload, userId });
        return;
      }

      const community = getCommunityById(payload.communityId);
      if (!community || community.kind !== "group" || !canContributeToCommunity(userId, community)) {
        return;
      }

      emitTypingIndicatorRealtime([community.ownerId, ...community.memberIds], userId, { ...payload, userId });
    });

    socket.on("chat:delivered", (payload: DeliveredEventPayload) => {
      if (payload.conversationType === "direct") {
        const result = markDirectThreadDelivered(userId, payload.threadId);
        if (!result || result.updatedMessageIds.length === 0) {
          return;
        }

        emitDeliveredRealtime(result.thread.participantIds, userId, {
          ...payload,
          userId,
          messageIds: result.updatedMessageIds,
        });
        return;
      }

      if (payload.conversationType === "marketplace") {
        const result = markMarketplaceThreadDelivered(userId, payload.threadId);
        if (!result || result.updatedMessageIds.length === 0) {
          return;
        }

        emitDeliveredRealtime([result.thread.buyerId, result.thread.sellerId], userId, {
          ...payload,
          userId,
          messageIds: result.updatedMessageIds,
        });
        return;
      }

      const result = markCommunityChatDelivered(userId, payload.communityId);
      if (!result || result.updatedMessageIds.length === 0) {
        return;
      }

      emitDeliveredRealtime([result.community.ownerId, ...result.community.memberIds], userId, {
        ...payload,
        userId,
        messageIds: result.updatedMessageIds,
      });
    });

    socket.on("chat:read", (payload: ReadEventPayload) => {
      if (payload.conversationType === "direct") {
        const result = markDirectThreadRead(userId, payload.threadId);
        if (!result || result.updatedMessageIds.length === 0) {
          return;
        }

        emitReadReceiptRealtime(result.thread.participantIds, userId, {
          ...payload,
          userId,
          messageIds: result.updatedMessageIds,
        });
        return;
      }

      if (payload.conversationType === "marketplace") {
        const result = markMarketplaceThreadRead(userId, payload.threadId);
        if (!result || result.updatedMessageIds.length === 0) {
          return;
        }

        emitReadReceiptRealtime([result.thread.buyerId, result.thread.sellerId], userId, {
          ...payload,
          userId,
          messageIds: result.updatedMessageIds,
        });
        return;
      }

      const result = markCommunityChatRead(userId, payload.communityId);
      if (!result || result.updatedMessageIds.length === 0) {
        return;
      }

      emitReadReceiptRealtime([result.community.ownerId, ...result.community.memberIds], userId, {
        ...payload,
        userId,
        messageIds: result.updatedMessageIds,
      });
    });

    socket.on("disconnect", () => {
      const nextCount = Math.max((activeConnectionCounts.get(userId) ?? 1) - 1, 0);
      if (nextCount === 0) {
        activeConnectionCounts.delete(userId);
        lastSeenByUserId.set(userId, new Date().toISOString());
      } else {
        activeConnectionCounts.set(userId, nextCount);
      }

      emitPresenceUpdate(userId);
    });
  });

  return io;
}

export function emitDirectMessageRealtime(thread: DirectChatThread, message: DirectChatMessage) {
  emitToUsers(thread.participantIds, "chat:direct-message", {
    thread: buildDirectThreadPayload(thread),
    message: buildDirectMessagePayload(message),
  });
}

export function emitMarketplaceMessageRealtime(thread: MarketplaceChatThread, message: MarketplaceChatMessage) {
  emitToUsers([thread.buyerId, thread.sellerId], "chat:marketplace-message", {
    thread: buildMarketplaceThreadPayload(thread),
    message: buildMarketplaceMessagePayload(message),
  });
}

export function emitCommunityMessageRealtime(communityId: string, message: CommunityChatMessage) {
  const community = getCommunityById(communityId);
  if (!community) {
    return;
  }

  emitToUsers([community.ownerId, ...community.memberIds], "chat:community-message", {
    communityId,
    message: buildCommunityChatMessagePayload(message),
  });
}
