import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { getFirebaseClientFirestore, isFirebaseClientConfigured } from "./firebaseClient";
import {
  CommunityChatMessage,
  CommunitySpace,
  DirectChatMessage,
  DirectChatThread,
  MarketplaceChatMessage,
  MarketplaceChatThread,
  Product,
  User,
} from "../types/models";

const DIRECT_THREADS_COLLECTION = "directThreads";
const DIRECT_MESSAGES_COLLECTION = "directMessages";
const MARKETPLACE_THREADS_COLLECTION = "marketplaceThreads";
const MARKETPLACE_MESSAGES_COLLECTION = "marketplaceMessages";
const COMMUNITY_MESSAGES_COLLECTION = "communityChatMessages";
const FALLBACK_PROFILE_IMAGE =
  "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=400&q=80";

export function isFirebaseChatConfigured() {
  return isFirebaseClientConfigured();
}

export async function fetchFirebaseChatSnapshot(userId: string) {
  const db = getRequiredFirestore();
  const [directThreadsSnapshot, directMessagesSnapshot, marketplaceThreadsSnapshot, marketplaceMessagesSnapshot, communityMessagesSnapshot] =
    await Promise.all([
      getDocs(query(collection(db, DIRECT_THREADS_COLLECTION), where("participantIds", "array-contains", userId), limit(120))),
      getDocs(query(collection(db, DIRECT_MESSAGES_COLLECTION), where("participantIds", "array-contains", userId), limit(500))),
      getDocs(query(collection(db, MARKETPLACE_THREADS_COLLECTION), where("participantIds", "array-contains", userId), limit(120))),
      getDocs(query(collection(db, MARKETPLACE_MESSAGES_COLLECTION), where("participantIds", "array-contains", userId), limit(500))),
      getDocs(query(collection(db, COMMUNITY_MESSAGES_COLLECTION), where("participantIds", "array-contains", userId), limit(500))),
    ]);

  return {
    directThreads: sortDirectThreads(directThreadsSnapshot.docs.map((item) => normalizeDirectThreadDoc(item.id, item.data()))),
    directMessages: sortChatMessages(directMessagesSnapshot.docs.map((item) => normalizeDirectMessageDoc(item.id, item.data()))),
    marketplaceThreads: sortMarketplaceThreads(
      marketplaceThreadsSnapshot.docs.map((item) => normalizeMarketplaceThreadDoc(item.id, item.data()))
    ),
    marketplaceMessages: sortChatMessages(
      marketplaceMessagesSnapshot.docs.map((item) => normalizeMarketplaceMessageDoc(item.id, item.data()))
    ),
    communityChatMessages: sortChatMessages(
      communityMessagesSnapshot.docs.map((item) => normalizeCommunityChatMessageDoc(item.id, item.data()))
    ),
  };
}

export function subscribeToFirebaseChat(
  userId: string,
  input: {
    onDirectThreads: (threads: DirectChatThread[]) => void;
    onDirectMessages: (messages: DirectChatMessage[]) => void;
    onMarketplaceThreads: (threads: MarketplaceChatThread[]) => void;
    onMarketplaceMessages: (messages: MarketplaceChatMessage[]) => void;
    onCommunityMessages: (messages: CommunityChatMessage[]) => void;
  }
) {
  const db = getFirebaseClientFirestore();
  if (!db) {
    return () => undefined;
  }

  const unsubscribers = [
    onSnapshot(
      query(collection(db, DIRECT_THREADS_COLLECTION), where("participantIds", "array-contains", userId), limit(120)),
      (snapshot) => {
        input.onDirectThreads(sortDirectThreads(snapshot.docs.map((item) => normalizeDirectThreadDoc(item.id, item.data()))));
      },
      () => undefined
    ),
    onSnapshot(
      query(collection(db, DIRECT_MESSAGES_COLLECTION), where("participantIds", "array-contains", userId), limit(500)),
      (snapshot) => {
        input.onDirectMessages(sortChatMessages(snapshot.docs.map((item) => normalizeDirectMessageDoc(item.id, item.data()))));
      },
      () => undefined
    ),
    onSnapshot(
      query(collection(db, MARKETPLACE_THREADS_COLLECTION), where("participantIds", "array-contains", userId), limit(120)),
      (snapshot) => {
        input.onMarketplaceThreads(sortMarketplaceThreads(snapshot.docs.map((item) => normalizeMarketplaceThreadDoc(item.id, item.data()))));
      },
      () => undefined
    ),
    onSnapshot(
      query(collection(db, MARKETPLACE_MESSAGES_COLLECTION), where("participantIds", "array-contains", userId), limit(500)),
      (snapshot) => {
        input.onMarketplaceMessages(sortChatMessages(snapshot.docs.map((item) => normalizeMarketplaceMessageDoc(item.id, item.data()))));
      },
      () => undefined
    ),
    onSnapshot(
      query(collection(db, COMMUNITY_MESSAGES_COLLECTION), where("participantIds", "array-contains", userId), limit(500)),
      (snapshot) => {
        input.onCommunityMessages(sortChatMessages(snapshot.docs.map((item) => normalizeCommunityChatMessageDoc(item.id, item.data()))));
      },
      () => undefined
    ),
  ];

  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
}

export async function startFirebaseDirectChat(currentUser: User, targetUser: User) {
  const db = getRequiredFirestore();
  const participantIds = sortIds([currentUser.id, targetUser.id]);
  const threadRef = doc(db, DIRECT_THREADS_COLLECTION, buildDirectThreadId(participantIds));
  const snapshot = await getDoc(threadRef);
  const createdAt = new Date().toISOString();
  const thread: DirectChatThread = snapshot.exists()
    ? normalizeDirectThreadDoc(threadRef.id, snapshot.data())
    : {
        id: threadRef.id,
        participantIds,
        createdAt,
        updatedAt: createdAt,
        lastMessagePreview: "Conversation started",
        lastMessageAt: createdAt,
      };

  await setDoc(
    threadRef,
    {
      ...thread,
      participantIds,
    },
    { merge: true }
  );

  return {
    thread,
    messages: await fetchFirebaseDirectMessagesForUserThread(currentUser.id, thread.id),
  };
}

export async function fetchFirebaseDirectThread(userId: string, threadId: string) {
  const db = getRequiredFirestore();
  const threadSnapshot = await getDoc(doc(db, DIRECT_THREADS_COLLECTION, threadId));

  if (!threadSnapshot.exists()) {
    throw new Error("Conversation not found.");
  }

  const thread = normalizeDirectThreadDoc(threadSnapshot.id, threadSnapshot.data());
  if (!thread.participantIds.includes(userId)) {
    throw new Error("You do not have access to this conversation.");
  }

  return {
    thread,
    messages: await fetchFirebaseDirectMessagesForUserThread(userId, thread.id),
  };
}

export async function sendFirebaseDirectMessage(thread: DirectChatThread, currentUser: User, text: string) {
  if (!thread.participantIds.includes(currentUser.id)) {
    throw new Error("You do not have access to this conversation.");
  }

  const db = getRequiredFirestore();
  const createdAt = new Date().toISOString();
  const messageRef = doc(collection(db, DIRECT_MESSAGES_COLLECTION));
  const message: DirectChatMessage = {
    id: messageRef.id,
    threadId: thread.id,
    senderId: currentUser.id,
    senderName: currentUser.name,
    senderAvatar: currentUser.profileImage || FALLBACK_PROFILE_IMAGE,
    text: text.trim(),
    createdAt,
    deliveredToUserIds: [currentUser.id],
    seenByUserIds: [currentUser.id],
  };
  const nextThread: DirectChatThread = {
    ...thread,
    updatedAt: createdAt,
    lastMessageAt: createdAt,
    lastMessagePreview: message.text,
  };
  const batch = writeBatch(db);

  batch.set(doc(db, DIRECT_THREADS_COLLECTION, thread.id), nextThread, { merge: true });
  batch.set(messageRef, {
    ...message,
    participantIds: thread.participantIds,
  });
  await batch.commit();

  return {
    thread: nextThread,
    message,
  };
}

export async function startFirebaseMarketplaceChat(currentUser: User, product: Product) {
  const db = getRequiredFirestore();
  const participantIds = sortIds([currentUser.id, product.userId]);
  const threadRef = doc(db, MARKETPLACE_THREADS_COLLECTION, buildMarketplaceThreadId(product.id, currentUser.id, product.userId));
  const snapshot = await getDoc(threadRef);
  const createdAt = new Date().toISOString();
  const thread: MarketplaceChatThread = snapshot.exists()
    ? normalizeMarketplaceThreadDoc(threadRef.id, snapshot.data())
    : {
        id: threadRef.id,
        productId: product.id,
        buyerId: currentUser.id,
        sellerId: product.userId,
        createdAt,
        updatedAt: createdAt,
        lastMessagePreview: "Conversation started",
        lastMessageAt: createdAt,
      };

  await setDoc(
    threadRef,
    {
      ...thread,
      participantIds,
    },
    { merge: true }
  );

  return {
    thread,
    messages: await fetchFirebaseMarketplaceMessagesForUserThread(currentUser.id, thread.id),
  };
}

export async function fetchFirebaseMarketplaceThread(userId: string, threadId: string) {
  const db = getRequiredFirestore();
  const threadSnapshot = await getDoc(doc(db, MARKETPLACE_THREADS_COLLECTION, threadId));

  if (!threadSnapshot.exists()) {
    throw new Error("Conversation not found.");
  }

  const thread = normalizeMarketplaceThreadDoc(threadSnapshot.id, threadSnapshot.data());
  if (thread.buyerId !== userId && thread.sellerId !== userId) {
    throw new Error("You do not have access to this marketplace conversation.");
  }

  return {
    thread,
    messages: await fetchFirebaseMarketplaceMessagesForUserThread(userId, thread.id),
  };
}

export async function sendFirebaseMarketplaceMessage(thread: MarketplaceChatThread, currentUser: User, text: string) {
  if (thread.buyerId !== currentUser.id && thread.sellerId !== currentUser.id) {
    throw new Error("You do not have access to this marketplace conversation.");
  }

  const db = getRequiredFirestore();
  const participantIds = sortIds([thread.buyerId, thread.sellerId]);
  const createdAt = new Date().toISOString();
  const messageRef = doc(collection(db, MARKETPLACE_MESSAGES_COLLECTION));
  const message: MarketplaceChatMessage = {
    id: messageRef.id,
    threadId: thread.id,
    senderId: currentUser.id,
    senderName: currentUser.name,
    senderAvatar: currentUser.profileImage || FALLBACK_PROFILE_IMAGE,
    text: text.trim(),
    createdAt,
    deliveredToUserIds: [currentUser.id],
    seenByUserIds: [currentUser.id],
  };
  const nextThread: MarketplaceChatThread = {
    ...thread,
    updatedAt: createdAt,
    lastMessageAt: createdAt,
    lastMessagePreview: message.text,
  };
  const batch = writeBatch(db);

  batch.set(doc(db, MARKETPLACE_THREADS_COLLECTION, thread.id), {
    ...nextThread,
    participantIds,
  }, { merge: true });
  batch.set(messageRef, {
    ...message,
    participantIds,
  });
  await batch.commit();

  return {
    thread: nextThread,
    message,
  };
}

export async function fetchFirebaseCommunityChatForUser(userId: string, communityId: string) {
  const messages = await fetchFirebaseCommunityMessagesForUser(userId);
  return messages.filter((message) => message.communityId === communityId);
}

export async function sendFirebaseCommunityChatMessage(community: CommunitySpace, currentUser: User, text: string) {
  if (!community.memberIds.includes(currentUser.id)) {
    throw new Error("Join this group before sending a message.");
  }

  const db = getRequiredFirestore();
  const messageRef = doc(collection(db, COMMUNITY_MESSAGES_COLLECTION));
  const message: CommunityChatMessage = {
    id: messageRef.id,
    communityId: community.id,
    senderId: currentUser.id,
    senderName: currentUser.name,
    senderAvatar: currentUser.profileImage || FALLBACK_PROFILE_IMAGE,
    text: text.trim(),
    createdAt: new Date().toISOString(),
    deliveredToUserIds: [currentUser.id],
    seenByUserIds: [currentUser.id],
  };

  await setDoc(messageRef, {
    ...message,
    participantIds: community.memberIds,
  });

  return message;
}

export async function markFirebaseDirectMessagesDelivered(userId: string, messageIds: string[]) {
  await markFirebaseMessagesReceipt(DIRECT_MESSAGES_COLLECTION, userId, messageIds, "delivered");
}

export async function markFirebaseDirectMessagesRead(userId: string, messageIds: string[]) {
  await markFirebaseMessagesReceipt(DIRECT_MESSAGES_COLLECTION, userId, messageIds, "seen");
}

export async function markFirebaseMarketplaceMessagesDelivered(userId: string, messageIds: string[]) {
  await markFirebaseMessagesReceipt(MARKETPLACE_MESSAGES_COLLECTION, userId, messageIds, "delivered");
}

export async function markFirebaseMarketplaceMessagesRead(userId: string, messageIds: string[]) {
  await markFirebaseMessagesReceipt(MARKETPLACE_MESSAGES_COLLECTION, userId, messageIds, "seen");
}

export async function markFirebaseCommunityMessagesDelivered(userId: string, messageIds: string[]) {
  await markFirebaseMessagesReceipt(COMMUNITY_MESSAGES_COLLECTION, userId, messageIds, "delivered");
}

export async function markFirebaseCommunityMessagesRead(userId: string, messageIds: string[]) {
  await markFirebaseMessagesReceipt(COMMUNITY_MESSAGES_COLLECTION, userId, messageIds, "seen");
}

export function getFirebaseChatErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Chat could not be saved to Firestore. Please try again.";
}

async function fetchFirebaseDirectMessagesForUserThread(userId: string, threadId: string) {
  const messages = await fetchFirebaseDirectMessagesForUser(userId);
  return messages.filter((message) => message.threadId === threadId);
}

async function fetchFirebaseMarketplaceMessagesForUserThread(userId: string, threadId: string) {
  const messages = await fetchFirebaseMarketplaceMessagesForUser(userId);
  return messages.filter((message) => message.threadId === threadId);
}

async function fetchFirebaseDirectMessagesForUser(userId: string) {
  const db = getRequiredFirestore();
  const snapshot = await getDocs(
    query(collection(db, DIRECT_MESSAGES_COLLECTION), where("participantIds", "array-contains", userId), limit(500))
  );
  return sortChatMessages(snapshot.docs.map((item) => normalizeDirectMessageDoc(item.id, item.data())));
}

async function fetchFirebaseMarketplaceMessagesForUser(userId: string) {
  const db = getRequiredFirestore();
  const snapshot = await getDocs(
    query(collection(db, MARKETPLACE_MESSAGES_COLLECTION), where("participantIds", "array-contains", userId), limit(500))
  );
  return sortChatMessages(snapshot.docs.map((item) => normalizeMarketplaceMessageDoc(item.id, item.data())));
}

async function fetchFirebaseCommunityMessagesForUser(userId: string) {
  const db = getRequiredFirestore();
  const snapshot = await getDocs(
    query(collection(db, COMMUNITY_MESSAGES_COLLECTION), where("participantIds", "array-contains", userId), limit(500))
  );
  return sortChatMessages(snapshot.docs.map((item) => normalizeCommunityChatMessageDoc(item.id, item.data())));
}

async function markFirebaseMessagesReceipt(
  collectionName: string,
  userId: string,
  messageIds: string[],
  receiptType: "delivered" | "seen"
) {
  const uniqueMessageIds = [...new Set(messageIds.filter(Boolean))];
  if (uniqueMessageIds.length === 0) {
    return;
  }

  const db = getRequiredFirestore();
  const batch = writeBatch(db);
  const fieldName = receiptType === "seen" ? "seenByUserIds" : "deliveredToUserIds";

  uniqueMessageIds.forEach((messageId) => {
    batch.set(
      doc(db, collectionName, messageId),
      {
        [fieldName]: arrayUnion(userId),
        deliveredToUserIds: arrayUnion(userId),
      },
      { merge: true }
    );
  });

  await batch.commit();
}

function getRequiredFirestore() {
  const db = getFirebaseClientFirestore();
  if (!db) {
    throw new Error("Firestore is not configured. Add the EXPO_PUBLIC_FIREBASE_* values to mobile/.env.");
  }

  return db;
}

function normalizeDirectThreadDoc(id: string, data: Record<string, unknown>): DirectChatThread {
  const createdAt = readString(data.createdAt, new Date().toISOString());
  return {
    id,
    participantIds: readStringArray(data.participantIds),
    createdAt,
    updatedAt: readString(data.updatedAt, createdAt),
    lastMessagePreview: readString(data.lastMessagePreview, "Conversation started"),
    lastMessageAt: readString(data.lastMessageAt, createdAt),
  };
}

function normalizeDirectMessageDoc(id: string, data: Record<string, unknown>): DirectChatMessage {
  return {
    id,
    threadId: readString(data.threadId, ""),
    senderId: readString(data.senderId, ""),
    senderName: readString(data.senderName, "Creator"),
    senderAvatar: readString(data.senderAvatar, FALLBACK_PROFILE_IMAGE),
    text: readString(data.text, ""),
    createdAt: readString(data.createdAt, new Date().toISOString()),
    deliveredToUserIds: readStringArray(data.deliveredToUserIds),
    seenByUserIds: readStringArray(data.seenByUserIds),
  };
}

function normalizeMarketplaceThreadDoc(id: string, data: Record<string, unknown>): MarketplaceChatThread {
  const createdAt = readString(data.createdAt, new Date().toISOString());
  return {
    id,
    productId: readString(data.productId, ""),
    buyerId: readString(data.buyerId, ""),
    sellerId: readString(data.sellerId, ""),
    createdAt,
    updatedAt: readString(data.updatedAt, createdAt),
    lastMessagePreview: readString(data.lastMessagePreview, "Conversation started"),
    lastMessageAt: readString(data.lastMessageAt, createdAt),
  };
}

function normalizeMarketplaceMessageDoc(id: string, data: Record<string, unknown>): MarketplaceChatMessage {
  return {
    id,
    threadId: readString(data.threadId, ""),
    senderId: readString(data.senderId, ""),
    senderName: readString(data.senderName, "Marketplace user"),
    senderAvatar: readString(data.senderAvatar, FALLBACK_PROFILE_IMAGE),
    text: readString(data.text, ""),
    createdAt: readString(data.createdAt, new Date().toISOString()),
    deliveredToUserIds: readStringArray(data.deliveredToUserIds),
    seenByUserIds: readStringArray(data.seenByUserIds),
  };
}

function normalizeCommunityChatMessageDoc(id: string, data: Record<string, unknown>): CommunityChatMessage {
  return {
    id,
    communityId: readString(data.communityId, ""),
    senderId: readString(data.senderId, ""),
    senderName: readString(data.senderName, "Community member"),
    senderAvatar: readString(data.senderAvatar, FALLBACK_PROFILE_IMAGE),
    text: readString(data.text, ""),
    createdAt: readString(data.createdAt, new Date().toISOString()),
    deliveredToUserIds: readStringArray(data.deliveredToUserIds),
    seenByUserIds: readStringArray(data.seenByUserIds),
  };
}

function buildDirectThreadId(participantIds: string[]) {
  return normalizeDocId(`direct-${participantIds.join("-")}`);
}

function buildMarketplaceThreadId(productId: string, buyerId: string, sellerId: string) {
  return normalizeDocId(`marketplace-${productId}-${buyerId}-${sellerId}`);
}

function normalizeDocId(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-").slice(0, 150);
}

function sortIds(ids: string[]) {
  return [...new Set(ids.filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function sortDirectThreads(threads: DirectChatThread[]) {
  return [...threads].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function sortMarketplaceThreads(threads: MarketplaceChatThread[]) {
  return [...threads].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function sortChatMessages<T extends { createdAt: string }>(messages: T[]) {
  return [...messages].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
}
