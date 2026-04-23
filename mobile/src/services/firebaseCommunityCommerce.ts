import {
  collection,
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
  CommunityPost,
  CommunitySpace,
  CommunityVisibility,
  CreateCommunityPayload,
  CreateCommunityPostPayload,
  CreateMarketplaceOrderPayload,
  MarketplaceDeliveryMethod,
  MarketplaceOrder,
  MarketplaceOrderStatus,
  MarketplacePaymentMethod,
  Product,
  ProductCondition,
  ProductListingStatus,
  User,
} from "../types/models";

const COMMUNITIES_COLLECTION = "communities";
const COMMUNITY_POSTS_COLLECTION = "communityPosts";
const MARKETPLACE_ORDERS_COLLECTION = "marketplaceOrders";
const PRODUCTS_COLLECTION = "products";
const FALLBACK_PROFILE_IMAGE =
  "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=400&q=80";
const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=900&q=80";

export function isFirebaseCommunityCommerceConfigured() {
  return isFirebaseClientConfigured();
}

export async function fetchFirebaseCommunityCommerceSnapshot(userId: string) {
  const db = getRequiredFirestore();
  const [communitiesSnapshot, postsSnapshot, ordersSnapshot] = await Promise.all([
    getDocs(query(collection(db, COMMUNITIES_COLLECTION), orderBy("createdAt", "desc"), limit(160))),
    getDocs(query(collection(db, COMMUNITY_POSTS_COLLECTION), orderBy("createdAt", "desc"), limit(320))),
    getDocs(query(collection(db, MARKETPLACE_ORDERS_COLLECTION), where("participantIds", "array-contains", userId), limit(160))),
  ]);

  return {
    communities: communitiesSnapshot.docs.map((item) => normalizeCommunityDoc(item.id, item.data())),
    communityPosts: sortCommunityPosts(postsSnapshot.docs.map((item) => normalizeCommunityPostDoc(item.id, item.data()))),
    marketplaceOrders: sortMarketplaceOrders(ordersSnapshot.docs.map((item) => normalizeMarketplaceOrderDoc(item.id, item.data()))),
  };
}

export function subscribeToFirebaseCommunityCommerce(
  userId: string,
  input: {
    onCommunities: (communities: CommunitySpace[]) => void;
    onCommunityPosts: (posts: CommunityPost[]) => void;
    onMarketplaceOrders: (orders: MarketplaceOrder[]) => void;
  }
) {
  const db = getFirebaseClientFirestore();
  if (!db) {
    return () => undefined;
  }

  const unsubscribers = [
    onSnapshot(
      query(collection(db, COMMUNITIES_COLLECTION), orderBy("createdAt", "desc"), limit(160)),
      (snapshot) => {
        input.onCommunities(snapshot.docs.map((item) => normalizeCommunityDoc(item.id, item.data())));
      },
      () => undefined
    ),
    onSnapshot(
      query(collection(db, COMMUNITY_POSTS_COLLECTION), orderBy("createdAt", "desc"), limit(320)),
      (snapshot) => {
        input.onCommunityPosts(sortCommunityPosts(snapshot.docs.map((item) => normalizeCommunityPostDoc(item.id, item.data()))));
      },
      () => undefined
    ),
    onSnapshot(
      query(collection(db, MARKETPLACE_ORDERS_COLLECTION), where("participantIds", "array-contains", userId), limit(160)),
      (snapshot) => {
        input.onMarketplaceOrders(
          sortMarketplaceOrders(snapshot.docs.map((item) => normalizeMarketplaceOrderDoc(item.id, item.data())))
        );
      },
      () => undefined
    ),
  ];

  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
}

export async function fetchFirebaseCommunityActivity(communityId: string) {
  const db = getRequiredFirestore();
  const [communitySnapshot, postsSnapshot] = await Promise.all([
    getDoc(doc(db, COMMUNITIES_COLLECTION, communityId)),
    getDocs(query(collection(db, COMMUNITY_POSTS_COLLECTION), where("communityId", "==", communityId), limit(160))),
  ]);

  if (!communitySnapshot.exists()) {
    throw new Error("Community not found.");
  }

  return {
    community: normalizeCommunityDoc(communitySnapshot.id, communitySnapshot.data()),
    posts: sortCommunityPosts(postsSnapshot.docs.map((item) => normalizeCommunityPostDoc(item.id, item.data()))),
  };
}

export async function createFirebaseCommunity(userId: string, payload: CreateCommunityPayload) {
  const db = getRequiredFirestore();
  const communityRef = doc(collection(db, COMMUNITIES_COLLECTION));
  const community: CommunitySpace = {
    id: communityRef.id,
    ownerId: userId,
    kind: normalizeCommunityKind(payload.kind),
    name: payload.name.trim(),
    description: payload.description.trim(),
    category: payload.category.trim(),
    coverImage: payload.coverImage.trim(),
    visibility: normalizeCommunityVisibility(payload.visibility),
    memberIds: [userId],
    createdAt: new Date().toISOString(),
  };

  await setDoc(communityRef, community);
  return community;
}

export async function createFirebaseCommunityPost(currentUser: User, payload: CreateCommunityPostPayload) {
  const db = getRequiredFirestore();
  const communityRef = doc(db, COMMUNITIES_COLLECTION, payload.communityId);
  const communitySnapshot = await getDoc(communityRef);

  if (!communitySnapshot.exists()) {
    throw new Error("Community not found.");
  }

  const community = normalizeCommunityDoc(communitySnapshot.id, communitySnapshot.data());
  const postRef = doc(collection(db, COMMUNITY_POSTS_COLLECTION));
  const post: CommunityPost = {
    id: postRef.id,
    communityId: payload.communityId,
    authorId: currentUser.id,
    authorName: currentUser.name,
    authorAvatar: currentUser.profileImage || FALLBACK_PROFILE_IMAGE,
    text: payload.text.trim(),
    imageUrl: payload.imageUrl?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };

  await setDoc(postRef, post);

  return {
    community,
    post,
  };
}

export async function createFirebaseMarketplaceOrder(
  currentUser: User,
  payload: CreateMarketplaceOrderPayload
): Promise<{ order: MarketplaceOrder; product: Product }> {
  const db = getRequiredFirestore();
  const productRef = doc(db, PRODUCTS_COLLECTION, payload.productId);
  const productSnapshot = await getDoc(productRef);

  if (!productSnapshot.exists()) {
    throw new Error("Product not found.");
  }

  const product = normalizeProductDoc(productSnapshot.id, productSnapshot.data());
  if (product.userId === currentUser.id) {
    throw new Error("You cannot buy your own listing.");
  }

  if (product.listingStatus !== "available") {
    throw new Error("This listing is no longer available for checkout.");
  }

  if (payload.deliveryMethod === "shipping" && !payload.shippingAddress?.trim()) {
    throw new Error("Shipping address is required for shipping orders.");
  }

  const orderRef = doc(collection(db, MARKETPLACE_ORDERS_COLLECTION));
  const createdAt = new Date().toISOString();
  const order: MarketplaceOrder = {
    id: orderRef.id,
    productId: product.id,
    buyerId: currentUser.id,
    sellerId: product.userId,
    amountUsd: product.price,
    deliveryMethod: normalizeDeliveryMethod(payload.deliveryMethod),
    paymentMethod: normalizePaymentMethod(payload.paymentMethod),
    shippingAddress: payload.shippingAddress?.trim() || undefined,
    buyerNote: payload.buyerNote?.trim() || undefined,
    status: normalizeOrderStatus(payload.paymentMethod === "card" ? "paid" : "placed"),
    createdAt,
  };
  const nextProduct: Product = {
    ...product,
    listingStatus: "pending",
  };
  const batch = writeBatch(db);

  batch.set(orderRef, {
    ...order,
    participantIds: buildParticipantIds(order.buyerId, order.sellerId),
  });
  batch.set(
    productRef,
    {
      listingStatus: "pending",
      updatedAt: createdAt,
    },
    { merge: true }
  );
  await batch.commit();

  return {
    order,
    product: nextProduct,
  };
}

export function getFirebaseCommunityCommerceErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Firestore community or marketplace data could not be saved. Please try again.";
}

function getRequiredFirestore() {
  const db = getFirebaseClientFirestore();
  if (!db) {
    throw new Error("Firestore is not configured. Add the EXPO_PUBLIC_FIREBASE_* values to mobile/.env.");
  }

  return db;
}

function normalizeCommunityDoc(id: string, data: Record<string, unknown>): CommunitySpace {
  return {
    id,
    ownerId: readString(data.ownerId, ""),
    kind: normalizeCommunityKind(readString(data.kind, "page")),
    name: readString(data.name, "ViraFlow Community"),
    description: readString(data.description, ""),
    category: readString(data.category, "Community"),
    coverImage: readString(data.coverImage, FALLBACK_PRODUCT_IMAGE),
    visibility: normalizeCommunityVisibility(readString(data.visibility, "public")),
    memberIds: readStringArray(data.memberIds),
    createdAt: readString(data.createdAt, new Date().toISOString()),
  };
}

function normalizeCommunityPostDoc(id: string, data: Record<string, unknown>): CommunityPost {
  return {
    id,
    communityId: readString(data.communityId, ""),
    authorId: readString(data.authorId, ""),
    authorName: readString(data.authorName, "ViraFlow creator"),
    authorAvatar: readString(data.authorAvatar, FALLBACK_PROFILE_IMAGE),
    text: readString(data.text, ""),
    imageUrl: readOptionalString(data.imageUrl),
    createdAt: readString(data.createdAt, new Date().toISOString()),
  };
}

function normalizeMarketplaceOrderDoc(id: string, data: Record<string, unknown>): MarketplaceOrder {
  return {
    id,
    productId: readString(data.productId, ""),
    buyerId: readString(data.buyerId, ""),
    sellerId: readString(data.sellerId, ""),
    amountUsd: readNumber(data.amountUsd, 0),
    deliveryMethod: normalizeDeliveryMethod(readString(data.deliveryMethod, "pickup")),
    paymentMethod: normalizePaymentMethod(readString(data.paymentMethod, "cash")),
    shippingAddress: readOptionalString(data.shippingAddress),
    buyerNote: readOptionalString(data.buyerNote),
    status: normalizeOrderStatus(readString(data.status, "placed")),
    createdAt: readString(data.createdAt, new Date().toISOString()),
  };
}

function normalizeProductDoc(id: string, data: Record<string, unknown>): Product {
  const imageUrls = readStringArray(data.imageUrls);
  const imageUrl = readString(data.imageUrl, imageUrls[0] || FALLBACK_PRODUCT_IMAGE);

  return {
    id,
    userId: readString(data.userId, "unknown-user"),
    title: readString(data.title, "Marketplace listing"),
    description: readString(data.description, ""),
    price: readNumber(data.price, 0),
    imageUrl,
    imageUrls: imageUrls.length > 0 ? imageUrls : [imageUrl],
    category: readString(data.category, "Home Goods"),
    condition: normalizeCondition(readString(data.condition, "Good")),
    location: readString(data.location, "Kuala Lumpur, Malaysia"),
    listingStatus: normalizeListingStatus(readString(data.listingStatus, "available")),
    createdAt: readString(data.createdAt, new Date().toISOString()),
  };
}

function buildParticipantIds(leftId: string, rightId: string) {
  return [...new Set([leftId, rightId].filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function sortCommunityPosts(posts: CommunityPost[]) {
  return [...posts].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function sortMarketplaceOrders(orders: MarketplaceOrder[]) {
  return [...orders].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeCommunityKind(value: string) {
  return value === "group" || value === "channel" ? value : "page";
}

function normalizeCommunityVisibility(value: string): CommunityVisibility {
  return value === "private" ? "private" : "public";
}

function normalizeCondition(value: string): ProductCondition {
  if (value === "New" || value === "Like New" || value === "Good" || value === "Fair") {
    return value;
  }

  return "Good";
}

function normalizeListingStatus(value: string): ProductListingStatus {
  if (value === "pending" || value === "sold") {
    return value;
  }

  return "available";
}

function normalizeDeliveryMethod(value: string): MarketplaceDeliveryMethod {
  return value === "shipping" ? "shipping" : "pickup";
}

function normalizePaymentMethod(value: string): MarketplacePaymentMethod {
  return value === "card" ? "card" : "cash";
}

function normalizeOrderStatus(value: string): MarketplaceOrderStatus {
  return value === "paid" ? "paid" : "placed";
}
