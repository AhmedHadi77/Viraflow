import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { getFirebaseClientFirestore, isFirebaseClientConfigured } from "./firebaseClient";
import {
  CreateProductPayload,
  CreateReelPayload,
  CreateStoryPayload,
  LanguageOption,
  PlanType,
  Product,
  ProductCondition,
  ProductListingStatus,
  Reel,
  Story,
  User,
  isLanguageOption,
} from "../types/models";
import { DEFAULT_PROFILE_IMAGE, MEDIA_UNAVAILABLE_IMAGE } from "../data/defaultMedia";

const USERS_COLLECTION = "users";
const STORIES_COLLECTION = "stories";
const REELS_COLLECTION = "reels";
const PRODUCTS_COLLECTION = "products";
const SAVED_POSTS_COLLECTION = "savedPosts";
const NOTIFICATIONS_COLLECTION = "notifications";


export function isFirebaseContentConfigured() {
  return isFirebaseClientConfigured();
}

export async function fetchFirebaseCatalogFromFirestore() {
  const db = getRequiredFirestore();
  const [usersSnapshot, storiesSnapshot, reelsSnapshot, productsSnapshot] = await Promise.all([
    getDocs(collection(db, USERS_COLLECTION)),
    getDocs(query(collection(db, STORIES_COLLECTION), orderBy("createdAt", "desc"), limit(80))),
    getDocs(query(collection(db, REELS_COLLECTION), orderBy("createdAt", "desc"), limit(80))),
    getDocs(query(collection(db, PRODUCTS_COLLECTION), orderBy("createdAt", "desc"), limit(120))),
  ]);

  return {
    users: usersSnapshot.docs.map((item) => normalizeUserDoc(item.id, item.data())),
    stories: storiesSnapshot.docs.map((item) => normalizeStoryDoc(item.id, item.data())),
    reels: reelsSnapshot.docs.map((item) => normalizeReelDoc(item.id, item.data())),
    products: productsSnapshot.docs.map((item) => normalizeProductDoc(item.id, item.data())),
  };
}

export async function createFirebaseStory(userId: string, payload: CreateStoryPayload): Promise<Story> {
  const db = getRequiredFirestore();
  const storyRef = doc(collection(db, STORIES_COLLECTION));
  const now = new Date();
  const mediaType = payload.mediaType ?? (payload.videoUrl?.trim() ? "video" : "image");
  const highlightLabel = payload.highlightLabel?.trim() || payload.caption?.trim() || undefined;
  const story: Story = {
    id: storyRef.id,
    userId,
    imageUrl: payload.imageUrl.trim(),
    mediaType,
    videoUrl: mediaType === "video" ? payload.videoUrl?.trim() || undefined : undefined,
    videoDurationSeconds: mediaType === "video" ? payload.videoDurationSeconds : undefined,
    caption: payload.caption?.trim() || undefined,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    viewerIds: [],
    highlightedAt: payload.saveToHighlights ? now.toISOString() : undefined,
    highlightLabel: payload.saveToHighlights ? highlightLabel : undefined,
  };

  await setDoc(storyRef, compactFirestoreData(story));
  return story;
}

export async function markFirebaseStoryViewed(userId: string, storyId: string, existing?: Story): Promise<Story> {
  const db = getRequiredFirestore();
  const storyRef = doc(db, STORIES_COLLECTION, storyId);
  const snapshot = existing ? null : await getDoc(storyRef);
  const story = existing ?? (snapshot?.exists() ? normalizeStoryDoc(storyId, snapshot.data()) : null);

  if (!story) {
    throw new Error("Story not found.");
  }

  if (story.userId === userId || story.viewerIds.includes(userId)) {
    return story;
  }

  await updateDoc(storyRef, {
    viewerIds: arrayUnion(userId),
  });

  return {
    ...story,
    viewerIds: [...story.viewerIds, userId],
  };
}

export async function updateFirebaseStoryHighlight(
  userId: string,
  storyId: string,
  input: { highlighted: boolean; highlightLabel?: string },
  existing?: Story
): Promise<Story> {
  const db = getRequiredFirestore();
  const storyRef = doc(db, STORIES_COLLECTION, storyId);
  const snapshot = existing ? null : await getDoc(storyRef);
  const story = existing ?? (snapshot?.exists() ? normalizeStoryDoc(storyId, snapshot.data()) : null);

  if (!story) {
    throw new Error("Story not found.");
  }

  if (story.userId !== userId) {
    throw new Error("You can only manage your own story.");
  }

  const nextHighlightedAt = input.highlighted ? new Date().toISOString() : undefined;
  const nextHighlightLabel = input.highlighted
    ? input.highlightLabel?.trim() || story.highlightLabel || story.caption || "Highlight"
    : undefined;

  await setDoc(
    storyRef,
    {
      highlightedAt: nextHighlightedAt ?? null,
      highlightLabel: nextHighlightLabel ?? null,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  return {
    ...story,
    highlightedAt: nextHighlightedAt,
    highlightLabel: nextHighlightLabel,
  };
}

export async function deleteFirebaseStory(userId: string, storyId: string, existing?: Story) {
  await deleteFirebaseStoryDocument(storyId, userId, existing);
}

export async function deleteFirebaseStoryAsAdmin(storyId: string, existing?: Story) {
  await deleteFirebaseStoryDocument(storyId, undefined, existing);
}

async function deleteFirebaseStoryDocument(storyId: string, ownerId?: string, existing?: Story) {
  const db = getRequiredFirestore();
  const storyRef = doc(db, STORIES_COLLECTION, storyId);
  const snapshot = existing ? null : await getDoc(storyRef);
  const story = existing ?? (snapshot?.exists() ? normalizeStoryDoc(storyId, snapshot.data()) : null);

  if (!story) {
    throw new Error("Story not found.");
  }

  if (ownerId && story.userId !== ownerId) {
    throw new Error("You can only delete your own story.");
  }

  await deleteDoc(storyRef);
}

export async function createFirebaseReel(userId: string, payload: CreateReelPayload): Promise<Reel> {
  const db = getRequiredFirestore();
  const reelRef = doc(collection(db, REELS_COLLECTION));
  const normalizedCaption = payload.caption.trim();
  const reel: Reel = {
    id: reelRef.id,
    userId,
    videoUrl: payload.videoUrl.trim(),
    caption: normalizedCaption,
    thumbnailUrl: payload.thumbnailUrl.trim() || MEDIA_UNAVAILABLE_IMAGE,
    createdAt: new Date().toISOString(),
    tags: buildTagsFromCaption(normalizedCaption, payload.hashtags),
    likedBy: [],
    repostCount: 0,
    viewCount: 0,
    reachCount: 0,
  };

  await setDoc(reelRef, reel);
  await setDoc(
    doc(db, USERS_COLLECTION, userId),
    {
      reelIds: arrayUnion(reel.id),
      updatedAt: reel.createdAt,
    },
    { merge: true }
  );
  return reel;
}

export async function deleteFirebaseReel(userId: string, reelId: string, existing?: Reel) {
  await deleteFirebaseReelDocument(reelId, userId, existing);
}

export async function deleteFirebaseReelAsAdmin(reelId: string, existing?: Reel) {
  await deleteFirebaseReelDocument(reelId, undefined, existing);
}

async function deleteFirebaseReelDocument(reelId: string, ownerId?: string, existing?: Reel) {
  const db = getRequiredFirestore();
  const reelRef = doc(db, REELS_COLLECTION, reelId);
  const snapshot = existing ? null : await getDoc(reelRef);
  const reel = existing ?? (snapshot?.exists() ? normalizeReelDoc(reelId, snapshot.data()) : null);

  if (!reel) {
    throw new Error("Reel not found.");
  }

  if (ownerId && reel.userId !== ownerId) {
    throw new Error("You can only delete your own reel.");
  }

  await deleteDoc(reelRef);
}

export async function createFirebaseProduct(userId: string, payload: CreateProductPayload): Promise<Product> {
  const db = getRequiredFirestore();
  const productRef = doc(collection(db, PRODUCTS_COLLECTION));
  const imageUrls = payload.imageUrls.map((item) => item.trim()).filter(Boolean);
  const product: Product = {
    id: productRef.id,
    userId,
    title: payload.title.trim(),
    description: payload.description.trim(),
    price: Number(payload.price) || 0,
    imageUrl: imageUrls[0] || MEDIA_UNAVAILABLE_IMAGE,
    imageUrls: imageUrls.length > 0 ? imageUrls : [MEDIA_UNAVAILABLE_IMAGE],
    category: payload.category.trim() || "Home Goods",
    condition: normalizeCondition(payload.condition),
    location: payload.location.trim(),
    listingStatus: "available",
    ...(payload.currency ? { currency: payload.currency.toUpperCase() } : {}),
    ...(payload.region ? { region: payload.region.toUpperCase() } : {}),
    createdAt: new Date().toISOString(),
  };

  await setDoc(productRef, product);
  await setDoc(
    doc(db, USERS_COLLECTION, userId),
    {
      productIds: arrayUnion(product.id),
      updatedAt: product.createdAt,
    },
    { merge: true }
  );
  return product;
}

export async function updateFirebaseProductListingStatus(
  userId: string,
  productId: string,
  listingStatus: ProductListingStatus
) {
  const db = getRequiredFirestore();
  const productRef = doc(db, PRODUCTS_COLLECTION, productId);
  const snapshot = await getDoc(productRef);

  if (!snapshot.exists()) {
    throw new Error("Product not found.");
  }

  const product = normalizeProductDoc(productId, snapshot.data());
  if (product.userId !== userId) {
    throw new Error("You can only manage your own listing.");
  }

  const nextProduct: Product = {
    ...product,
    listingStatus,
  };

  await setDoc(
    productRef,
    {
      listingStatus,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  return nextProduct;
}

export async function deleteFirebaseProduct(userId: string, productId: string, existing?: Product) {
  await deleteFirebaseProductDocument(productId, userId, existing);
}

export async function deleteFirebaseProductAsAdmin(productId: string, existing?: Product) {
  await deleteFirebaseProductDocument(productId, undefined, existing);
}

async function deleteFirebaseProductDocument(productId: string, ownerId?: string, existing?: Product) {
  const db = getRequiredFirestore();
  const productRef = doc(db, PRODUCTS_COLLECTION, productId);
  const snapshot = existing ? null : await getDoc(productRef);
  const product = existing ?? (snapshot?.exists() ? normalizeProductDoc(productId, snapshot.data()) : null);

  if (!product) {
    throw new Error("Product not found.");
  }

  if (ownerId && product.userId !== ownerId) {
    throw new Error("You can only delete your own listing.");
  }

  const [savedSnapshot, notificationsSnapshot] = await Promise.all([
    getDocs(query(collection(db, SAVED_POSTS_COLLECTION), where("entityId", "==", productId), limit(500))),
    getDocs(query(collection(db, NOTIFICATIONS_COLLECTION), where("entityId", "==", productId), limit(500))),
  ]);
  const batch = writeBatch(db);

  batch.delete(productRef);
  savedSnapshot.docs.forEach((item) => {
    if (item.data().entityType === "product") {
      batch.delete(item.ref);
    }
  });
  notificationsSnapshot.docs.forEach((item) => {
    if (item.data().entityType === "product") {
      batch.delete(item.ref);
    }
  });
  await batch.commit();
}

export function getFirebaseContentErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Content could not be saved to Firebase. Please try again.";
}

function getRequiredFirestore() {
  const db = getFirebaseClientFirestore();
  if (!db) {
    throw new Error("Firestore is not configured. Add the EXPO_PUBLIC_FIREBASE_* values to mobile/.env.");
  }

  return db;
}

function normalizeStoryDoc(id: string, data: Record<string, unknown>): Story {
  const createdAt = readString(data.createdAt, new Date().toISOString());

  return {
    id,
    userId: readString(data.userId, "unknown-user"),
    imageUrl: readString(data.imageUrl, DEFAULT_PROFILE_IMAGE),
    mediaType: readString(data.mediaType, readOptionalString(data.videoUrl) ? "video" : "image") === "video" ? "video" : "image",
    videoUrl: readOptionalString(data.videoUrl),
    videoDurationSeconds: readOptionalNumber(data.videoDurationSeconds),
    caption: readOptionalString(data.caption),
    createdAt,
    expiresAt: readString(data.expiresAt, new Date(new Date(createdAt).getTime() + 24 * 60 * 60 * 1000).toISOString()),
    viewerIds: readStringArray(data.viewerIds),
    highlightedAt: readOptionalString(data.highlightedAt),
    highlightLabel: readOptionalString(data.highlightLabel),
  };
}

function normalizeReelDoc(id: string, data: Record<string, unknown>): Reel {
  const caption = readString(data.caption, "New Sohba reel");
  const likedBy = readStringArray(data.likedBy);

  return {
    id,
    userId: readString(data.userId, "unknown-user"),
    videoUrl: readString(data.videoUrl, ""),
    caption,
    thumbnailUrl: readString(data.thumbnailUrl, MEDIA_UNAVAILABLE_IMAGE),
    createdAt: readString(data.createdAt, new Date().toISOString()),
    tags: readStringArray(data.tags, buildTagsFromCaption(caption)),
    likedBy,
    repostCount: readNumber(data.repostCount, 0),
    viewCount: readNumber(data.viewCount, 0),
    reachCount: readNumber(data.reachCount, 0),
    boostedUntil: typeof data.boostedUntil === "string" && data.boostedUntil.trim() ? data.boostedUntil.trim() : undefined,
  };
}

function normalizeProductDoc(id: string, data: Record<string, unknown>): Product {
  const imageUrls = readStringArray(data.imageUrls);
  const imageUrl = readString(data.imageUrl, imageUrls[0] || MEDIA_UNAVAILABLE_IMAGE);

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
    location: readString(data.location, ""),
    listingStatus: normalizeListingStatus(readString(data.listingStatus, "available")),
    currency: readString(data.currency, "").toUpperCase() || undefined,
    region: readString(data.region, "").toUpperCase() || undefined,
    createdAt: readString(data.createdAt, new Date().toISOString()),
  };
}

function normalizeUserDoc(id: string, data: Record<string, unknown>): User {
  const username = readString(data.username, id).trim().replace(/\s+/g, "").toLowerCase();

  return {
    id,
    name: readString(data.name, "Sohba Creator"),
    username,
    email: readString(data.email, `${username}@pulseora.app`),
    profileImage: readString(data.profileImage, DEFAULT_PROFILE_IMAGE),
    bio: readString(data.bio, "New creator on Sohba."),
    headline: readString(data.headline, "Creator in progress"),
    language: normalizeLanguage(readString(data.language, "en")),
    region: readString(data.region, "").toUpperCase() || undefined,
    planType: normalizePlan(readString(data.planType, "free")),
    followers: readStringArray(data.followers),
    following: readStringArray(data.following),
    reelIds: readStringArray(data.reelIds),
    productIds: readStringArray(data.productIds),
  };
}

function buildTagsFromCaption(caption: string, explicitTags: string[] = []) {
  const hashtags = caption.match(/#[a-zA-Z0-9_]+/g)?.map((tag) => tag.replace("#", "").toLowerCase()) ?? [];
  const normalizedExplicit = explicitTags.map((tag) => tag.trim().replace(/^#+/, "").toLowerCase()).filter(Boolean);
  const mergedHashtags = [...new Set([...normalizedExplicit, ...hashtags])];
  if (mergedHashtags.length > 0) {
    return mergedHashtags.slice(0, 6);
  }

  const words = caption
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !["this", "that", "with", "from"].includes(word));

  return [...new Set(words)].slice(0, 4).length > 0 ? [...new Set(words)].slice(0, 4) : ["creator", "reel"];
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readStringArray(value: unknown, fallback: string[] = []) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function compactFirestoreData<T extends object>(input: T) {
  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>).filter(([, value]) => value !== undefined)
  ) as T;
}

function normalizeLanguage(language: string): LanguageOption {
  if (isLanguageOption(language)) {
    return language;
  }

  return "en";
}

function normalizePlan(planType: string): PlanType {
  if (planType === "free" || planType === "weekly" || planType === "monthly" || planType === "yearly") {
    return planType;
  }

  return "free";
}

function normalizeCondition(condition: string): ProductCondition {
  if (condition === "New" || condition === "Like New" || condition === "Good" || condition === "Fair") {
    return condition;
  }

  return "Good";
}

function normalizeListingStatus(listingStatus: string): ProductListingStatus {
  if (listingStatus === "available" || listingStatus === "pending" || listingStatus === "sold") {
    return listingStatus;
  }

  return "available";
}
