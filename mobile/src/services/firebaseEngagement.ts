import { normalizeStudioData } from "../utils/studioData";
import { repairMediaUrl } from "./mediaUpload";
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import {
  combineUnsubscribers,
  friendlyFirebaseError,
  getFirebaseClientFirestore,
  handleFirestoreListenError,
  isFirebaseClientConfigured,
} from "./firebaseClient";
import { isLanguageOption, LanguageOption, PlanType, Reel, ReelComment, User } from "../types/models";
import { DEFAULT_PROFILE_IMAGE, MEDIA_UNAVAILABLE_IMAGE } from "../data/defaultMedia";

const USERS_COLLECTION = "users";
const REELS_COLLECTION = "reels";
const COMMENTS_COLLECTION = "comments";


export function isFirebaseEngagementConfigured() {
  return isFirebaseClientConfigured();
}

export async function fetchFirebaseEngagementSnapshot() {
  const db = getRequiredFirestore();
  const commentsSnapshot = await getDocs(query(collection(db, COMMENTS_COLLECTION), orderBy("createdAt", "desc"), limit(300)));

  return {
    comments: commentsSnapshot.docs.map((item) => normalizeCommentDoc(item.id, item.data())),
  };
}

export function subscribeToFirebaseEngagement(input: {
  onUsers: (users: User[]) => void;
  onReels: (reels: Reel[]) => void;
  onComments: (comments: ReelComment[]) => void;
}) {
  const db = getFirebaseClientFirestore();
  if (!db) {
    return () => undefined;
  }

  const unsubscribers = [
    onSnapshot(
      collection(db, USERS_COLLECTION),
      (snapshot) => {
        input.onUsers(snapshot.docs.map((item) => normalizeUserDoc(item.id, item.data())));
      },
      handleFirestoreListenError
    ),
    onSnapshot(
      query(collection(db, REELS_COLLECTION), orderBy("createdAt", "desc"), limit(120)),
      (snapshot) => {
        input.onReels(snapshot.docs.map((item) => normalizeReelDoc(item.id, item.data())));
      },
      handleFirestoreListenError
    ),
    onSnapshot(
      query(collection(db, COMMENTS_COLLECTION), orderBy("createdAt", "desc"), limit(300)),
      (snapshot) => {
        input.onComments(snapshot.docs.map((item) => normalizeCommentDoc(item.id, item.data())));
      },
      handleFirestoreListenError
    ),
  ];

  return combineUnsubscribers(unsubscribers);
}

/**
 * Likes or unlikes a reel. Uses an atomic "add me / remove me" change instead of read-then-write, so two
 * people liking at the same moment never conflict (that conflict used to fail with "stored version" errors).
 */
export async function toggleFirebaseReelLike(userId: string, reelId: string, fallbackReel?: Reel) {
  const db = getRequiredFirestore();
  const reelRef = doc(db, REELS_COLLECTION, reelId);
  let currentReel = fallbackReel;
  if (!currentReel) {
    const snapshot = await getDoc(reelRef);
    if (!snapshot.exists()) {
      throw new Error("Reel not found.");
    }
    currentReel = normalizeReelDoc(reelId, snapshot.data());
  }
  const hasLiked = currentReel.likedBy.includes(userId);
  await updateDoc(reelRef, {
    likedBy: hasLiked ? arrayRemove(userId) : arrayUnion(userId),
    updatedAt: new Date().toISOString(),
  });
  const likedBy = hasLiked ? currentReel.likedBy.filter((item) => item !== userId) : [userId, ...currentReel.likedBy.filter((item) => item !== userId)];
  return { ...currentReel, likedBy } as Reel;
}

export async function recordFirebaseReelView(reelId: string, input: { countReach: boolean }) {
  const db = getRequiredFirestore();
  await updateDoc(doc(db, REELS_COLLECTION, reelId), {
    viewCount: increment(1),
    ...(input.countReach ? { reachCount: increment(1) } : {}),
  });
}

export async function repostFirebaseReel(_userId: string, reelId: string, fallbackReel?: Reel) {
  const db = getRequiredFirestore();
  const reelRef = doc(db, REELS_COLLECTION, reelId);
  let currentReel = fallbackReel;
  if (!currentReel) {
    const snapshot = await getDoc(reelRef);
    if (!snapshot.exists()) {
      throw new Error("Reel not found.");
    }
    currentReel = normalizeReelDoc(reelId, snapshot.data());
  }
  await updateDoc(reelRef, {
    repostCount: increment(1),
    updatedAt: new Date().toISOString(),
  });
  return { ...currentReel, repostCount: currentReel.repostCount + 1 } as Reel;
}

export async function addFirebaseReelComment(reelId: string, user: User, text: string) {
  const db = getRequiredFirestore();
  const commentRef = doc(collection(db, COMMENTS_COLLECTION));
  const comment: ReelComment = {
    id: commentRef.id,
    reelId,
    userId: user.id,
    userName: user.name,
    userAvatar: user.profileImage,
    text: text.trim(),
    createdAt: new Date().toISOString(),
  };

  await setDoc(commentRef, comment);
  return comment;
}

/**
 * Follows or unfollows someone. Both lists change in one atomic batch of "add me / remove me" changes, so
 * it never fails because one of the two profiles changed at the same moment (the old read-then-write
 * transaction failed with "the stored version does not match the required base version").
 */
export async function toggleFirebaseFollow(viewerInput: User, targetInput: User) {
  const db = getRequiredFirestore();
  const viewerRef = doc(db, USERS_COLLECTION, viewerInput.id);
  const targetRef = doc(db, USERS_COLLECTION, targetInput.id);
  const isFollowing = viewerInput.following.includes(targetInput.id);
  const now = new Date().toISOString();

  const batch = writeBatch(db);
  batch.set(
    viewerRef,
    {
      following: isFollowing ? arrayRemove(targetInput.id) : arrayUnion(targetInput.id),
      updatedAt: now,
    },
    { merge: true }
  );
  batch.update(targetRef, {
    followers: isFollowing ? arrayRemove(viewerInput.id) : arrayUnion(viewerInput.id),
    updatedAt: now,
  });
  await batch.commit();

  const nextViewer: User = {
    ...viewerInput,
    following: isFollowing
      ? viewerInput.following.filter((item) => item !== targetInput.id)
      : [targetInput.id, ...viewerInput.following.filter((item) => item !== targetInput.id)],
  };
  const nextTarget: User = {
    ...targetInput,
    followers: isFollowing
      ? targetInput.followers.filter((item) => item !== viewerInput.id)
      : [viewerInput.id, ...targetInput.followers.filter((item) => item !== viewerInput.id)],
  };
  return {
    following: !isFollowing,
    viewer: nextViewer,
    target: nextTarget,
  };
}

export function getFirebaseEngagementErrorMessage(error: unknown) {
  const friendly = friendlyFirebaseError(error);
  if (friendly) {
    return friendly;
  }
  if (error instanceof Error) {
    return error.message;
  }

  return "Engagement action could not be saved. Please try again.";
}

function getRequiredFirestore() {
  const db = getFirebaseClientFirestore();
  if (!db) {
    throw new Error("Firestore is not configured. Add the EXPO_PUBLIC_FIREBASE_* values to mobile/.env.");
  }

  return db;
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
    studio: normalizeStudioData(data.studio),
  };
}

function normalizeCommentDoc(id: string, data: Record<string, unknown>): ReelComment {
  return {
    id,
    reelId: readString(data.reelId, ""),
    userId: readString(data.userId, "unknown-user"),
    userName: readString(data.userName, "Sohba Creator"),
    userAvatar: readString(data.userAvatar, DEFAULT_PROFILE_IMAGE),
    text: readString(data.text, ""),
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
    profileImage: repairMediaUrl(readString(data.profileImage, DEFAULT_PROFILE_IMAGE)),
    bio: readString(data.bio, "New creator on Sohba.").replace(/^New creator on Pulseora\.?$/, "New creator on Sohba."),
    headline: readString(data.headline, "Creator in progress"),
    language: normalizeLanguage(readString(data.language, "en")),
    region: readString(data.region, "").toUpperCase() || undefined,
    planType: normalizePlan(readString(data.planType, "free")),
    followers: readStringArray(data.followers),
    following: readStringArray(data.following),
    reelIds: readStringArray(data.reelIds),
    productIds: readStringArray(data.productIds),
    website: typeof data.website === "string" && data.website.trim() ? data.website.trim() : undefined,
    // Keep the account's role and ban state, otherwise admins lose their Admin button after a refresh.
    role: data.role === "admin" ? "admin" : "user",
    isBanned: data.isBanned === true,
    bannedAt: typeof data.bannedAt === "string" && data.bannedAt ? data.bannedAt : undefined,
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
