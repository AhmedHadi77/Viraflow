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
import { getFirestore, verifyFirebaseUserToken } from "../services/firebaseService";
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

function listPresenceUserIds() {
  return [...new Set([...listUsers().map((user) => user.id), ...lastSeenByUserId.keys(), ...activeConnectionCounts.keys()])];
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
    void verifyFirebaseUserToken(normalizedToken)
      .then((user) => {
        if (!user) {
          next(new Error("Unauthorized"));
          return;
        }

        socket.data.userId = user.id;
        next();
      })
      .catch(() => {
        next(new Error("Unauthorized"));
      });
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string | undefined;
    if (!userId) {
      socket.disconnect();
      return;
    }

    socket.join(getUserRoom(userId));
    activeConnectionCounts.set(userId, (activeConnectionCounts.get(userId) ?? 0) + 1);
    lastSeenByUserId.set(userId, lastSeenByUserId.get(userId) ?? new Date().toISOString());
    socket.emit("presence:snapshot", listPresenceUserIds().map((id) => buildPresencePayload(id)));
    emitPresenceUpdate(userId);

    socket.on("chat:typing", async (payload: TypingEventPayload) => {
      const participantIds = await resolveTypingParticipants(userId, payload);
      if (!participantIds || participantIds.length === 0) {
        return;
      }

      emitTypingIndicatorRealtime(participantIds, userId, { ...payload, userId });
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

async function resolveTypingParticipants(userId: string, payload: TypingEventPayload) {
  if (payload.conversationType === "direct") {
    return (await readParticipantIdsFromFirestore("directThreads", payload.threadId, userId)) ?? readDirectParticipantsFromMockDb(payload.threadId, userId);
  }

  if (payload.conversationType === "marketplace") {
    return (
      (await readMarketplaceParticipantsFromFirestore(payload.threadId, userId)) ??
      readMarketplaceParticipantsFromMockDb(payload.threadId, userId)
    );
  }

  return (await readCommunityParticipantsFromFirestore(payload.communityId, userId)) ?? readCommunityParticipantsFromMockDb(payload.communityId, userId);
}

async function readParticipantIdsFromFirestore(collectionName: string, docId: string, userId: string) {
  const db = getFirestore();
  if (!db) {
    return undefined;
  }

  const snapshot = await db.collection(collectionName).doc(docId).get();
  if (!snapshot.exists) {
    return undefined;
  }

  const participantIds = uniqueIds(readStringArray(snapshot.data()?.participantIds));
  if (!participantIds.includes(userId)) {
    return undefined;
  }

  return participantIds;
}

async function readMarketplaceParticipantsFromFirestore(threadId: string, userId: string) {
  const db = getFirestore();
  if (!db) {
    return undefined;
  }

  const snapshot = await db.collection("marketplaceThreads").doc(threadId).get();
  if (!snapshot.exists) {
    return undefined;
  }

  const data = snapshot.data() ?? {};
  const participantIds = uniqueIds([
    ...readStringArray(data.participantIds),
    readString(data.buyerId),
    readString(data.sellerId),
  ]);
  if (!participantIds.includes(userId)) {
    return undefined;
  }

  return participantIds;
}

async function readCommunityParticipantsFromFirestore(communityId: string, userId: string) {
  const db = getFirestore();
  if (!db) {
    return undefined;
  }

  const snapshot = await db.collection("communities").doc(communityId).get();
  if (!snapshot.exists) {
    return undefined;
  }

  const data = snapshot.data() ?? {};
  const kind = readString(data.kind);
  const participantIds = uniqueIds([readString(data.ownerId), ...readStringArray(data.memberIds)]);
  if (kind !== "group" || !participantIds.includes(userId)) {
    return undefined;
  }

  return participantIds;
}

function readDirectParticipantsFromMockDb(threadId: string, userId: string) {
  const thread = getDirectThreadById(threadId);
  if (!thread || !thread.participantIds.includes(userId)) {
    return undefined;
  }

  return thread.participantIds;
}

function readMarketplaceParticipantsFromMockDb(threadId: string, userId: string) {
  const thread = getMarketplaceThreadById(threadId);
  if (!thread || (thread.buyerId !== userId && thread.sellerId !== userId)) {
    return undefined;
  }

  return [thread.buyerId, thread.sellerId];
}

function readCommunityParticipantsFromMockDb(communityId: string, userId: string) {
  const community = getCommunityById(communityId);
  if (!community || community.kind !== "group" || !canContributeToCommunity(userId, community)) {
    return undefined;
  }

  return uniqueIds([community.ownerId, ...community.memberIds]);
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function uniqueIds(values: Array<string | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
}
