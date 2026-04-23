import { io, Socket } from "socket.io-client";
import {
  ApiCommunityChatMessagePayload,
  ApiDirectChatMessagePayload,
  ApiDirectChatThreadPayload,
  ApiMarketplaceChatMessagePayload,
  ApiMarketplaceChatThreadPayload,
} from "./appApi";

const API_BASE_URL =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.EXPO_PUBLIC_API_BASE_URL?.replace(
    /\/$/,
    ""
  ) ?? "";

function getSocketBaseUrl() {
  if (!API_BASE_URL) {
    return "";
  }

  return API_BASE_URL.replace(/\/api$/, "");
}

let activeSocket: Socket | null = null;
let activeToken: string | null = null;

export interface DirectMessageRealtimeEvent {
  thread: ApiDirectChatThreadPayload;
  message: ApiDirectChatMessagePayload;
}

export interface MarketplaceMessageRealtimeEvent {
  thread: ApiMarketplaceChatThreadPayload;
  message: ApiMarketplaceChatMessagePayload;
}

export interface CommunityMessageRealtimeEvent {
  communityId: string;
  message: ApiCommunityChatMessagePayload;
}

export type TypingRealtimeEvent =
  | { conversationType: "direct"; threadId: string; userId: string; isTyping: boolean }
  | { conversationType: "marketplace"; threadId: string; userId: string; isTyping: boolean }
  | { conversationType: "community"; communityId: string; userId: string; isTyping: boolean };

export type ReadRealtimeEvent =
  | { conversationType: "direct"; threadId: string; userId: string; messageIds: string[] }
  | { conversationType: "marketplace"; threadId: string; userId: string; messageIds: string[] }
  | { conversationType: "community"; communityId: string; userId: string; messageIds: string[] };

export type DeliveredRealtimeEvent =
  | { conversationType: "direct"; threadId: string; userId: string; messageIds: string[] }
  | { conversationType: "marketplace"; threadId: string; userId: string; messageIds: string[] }
  | { conversationType: "community"; communityId: string; userId: string; messageIds: string[] };

export interface PresenceRealtimeEvent {
  userId: string;
  isOnline: boolean;
  lastSeenAt?: string;
}

export function isRealtimeConfigured() {
  return Boolean(getSocketBaseUrl());
}

export function connectRealtime(token: string) {
  const socketBaseUrl = getSocketBaseUrl();
  if (!socketBaseUrl) {
    return null;
  }

  if (activeSocket && activeToken === token) {
    return activeSocket;
  }

  disconnectRealtime();
  activeToken = token;
  activeSocket = io(socketBaseUrl, {
    transports: ["websocket"],
    autoConnect: true,
    auth: {
      token,
    },
  });

  return activeSocket;
}

export function emitTypingRealtime(payload:
  | { conversationType: "direct"; threadId: string; isTyping: boolean }
  | { conversationType: "marketplace"; threadId: string; isTyping: boolean }
  | { conversationType: "community"; communityId: string; isTyping: boolean }) {
  activeSocket?.emit("chat:typing", payload);
}

export function emitReadRealtime(payload:
  | { conversationType: "direct"; threadId: string }
  | { conversationType: "marketplace"; threadId: string }
  | { conversationType: "community"; communityId: string }) {
  activeSocket?.emit("chat:read", payload);
}

export function emitDeliveredRealtime(payload:
  | { conversationType: "direct"; threadId: string }
  | { conversationType: "marketplace"; threadId: string }
  | { conversationType: "community"; communityId: string }) {
  activeSocket?.emit("chat:delivered", payload);
}

export function disconnectRealtime() {
  if (!activeSocket) {
    activeToken = null;
    return;
  }

  activeSocket.removeAllListeners();
  activeSocket.disconnect();
  activeSocket = null;
  activeToken = null;
}
