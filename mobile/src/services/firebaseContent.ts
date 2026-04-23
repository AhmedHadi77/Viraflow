import { arrayUnion, collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc } from "firebase/firestore";
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
} from "../types/models";

const USERS_COLLECTION = "users";
const STORIES_COLLECTION = "stories";
const REELS_COLLECTION = "reels";
const PRODUCTS_COLLECTION = "products";

const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=900&q=80";
const FALLBACK_REEL_THUMBNAIL =
  "https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?auto=format&fit=crop&w=1000&q=80";
const FALLBACK_PROFILE_IMAGE =
  "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=400&q=80";

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
  const story: Story = {
    id: storyRef.id,
    userId,
    imageUrl: payload.imageUrl.trim(),
    caption: payload.caption?.trim() || undefined,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
  };

  await setDoc(storyRef, story);
  return story;
}

export async function createFirebaseReel(userId: string, payload: CreateReelPayload): Promise<Reel> {
  const db = getRequiredFirestore();
  const reelRef = doc(collection(db, REELS_COLLECTION));
  const reel: Reel = {
    id: reelRef.id,
    userId,
    videoUrl: payload.videoUrl.trim(),
    caption: payload.caption.trim(),
    thumbnailUrl: payload.thumbnailUrl.trim() || FALLBACK_REEL_THUMBNAIL,
    createdAt: new Date().toISOString(),
    tags: buildTagsFromCaption(payload.caption),
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
    imageUrl: imageUrls[0] || FALLBACK_PRODUCT_IMAGE,
    imageUrls: imageUrls.length > 0 ? imageUrls : [FALLBACK_PRODUCT_IMAGE],
    category: payload.category.trim() || "Home Goods",
    condition: normalizeCondition(payload.condition),
    location: payload.location.trim() || "Kuala Lumpur, Malaysia",
    listingStatus: "available",
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
    imageUrl: readString(data.imageUrl, FALLBACK_PROFILE_IMAGE),
    caption: readOptionalString(data.caption),
    createdAt,
    expiresAt: readString(data.expiresAt, new Date(new Date(createdAt).getTime() + 24 * 60 * 60 * 1000).toISOString()),
  };
}

function normalizeReelDoc(id: string, data: Record<string, unknown>): Reel {
  const caption = readString(data.caption, "New ViraFlow reel");
  const likedBy = readStringArray(data.likedBy);

  return {
    id,
    userId: readString(data.userId, "unknown-user"),
    videoUrl: readString(data.videoUrl, ""),
    caption,
    thumbnailUrl: readString(data.thumbnailUrl, FALLBACK_REEL_THUMBNAIL),
    createdAt: readString(data.createdAt, new Date().toISOString()),
    tags: readStringArray(data.tags, buildTagsFromCaption(caption)),
    likedBy,
    repostCount: readNumber(data.repostCount, 0),
    viewCount: readNumber(data.viewCount, Math.max(120, likedBy.length * 240)),
    reachCount: readNumber(data.reachCount, Math.max(520, likedBy.length * 620)),
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

function normalizeUserDoc(id: string, data: Record<string, unknown>): User {
  const username = readString(data.username, id).trim().replace(/\s+/g, "").toLowerCase();

  return {
    id,
    name: readString(data.name, "ViraFlow Creator"),
    username,
    email: readString(data.email, `${username}@viraflow.app`),
    profileImage: readString(data.profileImage, FALLBACK_PROFILE_IMAGE),
    bio: readString(data.bio, "New creator on ViraFlow."),
    headline: readString(data.headline, "Creator in progress"),
    language: normalizeLanguage(readString(data.language, "en")),
    planType: normalizePlan(readString(data.planType, "free")),
    followers: readStringArray(data.followers),
    following: readStringArray(data.following),
    reelIds: readStringArray(data.reelIds),
    productIds: readStringArray(data.productIds),
  };
}

function buildTagsFromCaption(caption: string) {
  const hashtags = caption.match(/#[a-zA-Z0-9_]+/g)?.map((tag) => tag.replace("#", "").toLowerCase()) ?? [];
  if (hashtags.length > 0) {
    return [...new Set(hashtags)].slice(0, 4);
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

function normalizeLanguage(language: string): LanguageOption {
  if (language === "en" || language === "ar" || language === "fr" || language === "es") {
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
