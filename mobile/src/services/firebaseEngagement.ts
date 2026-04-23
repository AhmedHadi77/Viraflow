import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
} from "firebase/firestore";
import { getFirebaseClientFirestore, isFirebaseClientConfigured } from "./firebaseClient";
import { LanguageOption, PlanType, Reel, ReelComment, User } from "../types/models";

const USERS_COLLECTION = "users";
const REELS_COLLECTION = "reels";
const COMMENTS_COLLECTION = "comments";

const FALLBACK_PROFILE_IMAGE =
  "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=400&q=80";
const FALLBACK_REEL_THUMBNAIL =
  "https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?auto=format&fit=crop&w=1000&q=80";

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
      () => undefined
    ),
    onSnapshot(
      query(collection(db, REELS_COLLECTION), orderBy("createdAt", "desc"), limit(120)),
      (snapshot) => {
        input.onReels(snapshot.docs.map((item) => normalizeReelDoc(item.id, item.data())));
      },
      () => undefined
    ),
    onSnapshot(
      query(collection(db, COMMENTS_COLLECTION), orderBy("createdAt", "desc"), limit(300)),
      (snapshot) => {
        input.onComments(snapshot.docs.map((item) => normalizeCommentDoc(item.id, item.data())));
      },
      () => undefined
    ),
  ];

  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
}

export async function toggleFirebaseReelLike(userId: string, reelId: string, fallbackReel?: Reel) {
  const db = getRequiredFirestore();
  const reelRef = doc(db, REELS_COLLECTION, reelId);

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reelRef);
    if (!snapshot.exists() && !fallbackReel) {
      throw new Error("Reel not found.");
    }

    const currentReel = snapshot.exists() ? normalizeReelDoc(reelId, snapshot.data()) : fallbackReel!;
    const hasLiked = currentReel.likedBy.includes(userId);
    const likedBy = hasLiked ? currentReel.likedBy.filter((item) => item !== userId) : [userId, ...currentReel.likedBy];
    const nextReel: Reel = {
      ...currentReel,
      likedBy,
    };

    transaction.set(
      reelRef,
      {
        ...nextReel,
        likedBy,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return nextReel;
  });
}

export async function repostFirebaseReel(_userId: string, reelId: string, fallbackReel?: Reel) {
  const db = getRequiredFirestore();
  const reelRef = doc(db, REELS_COLLECTION, reelId);

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reelRef);
    if (!snapshot.exists() && !fallbackReel) {
      throw new Error("Reel not found.");
    }

    const currentReel = snapshot.exists() ? normalizeReelDoc(reelId, snapshot.data()) : fallbackReel!;
    const nextReel: Reel = {
      ...currentReel,
      repostCount: currentReel.repostCount + 1,
    };

    transaction.set(
      reelRef,
      {
        ...nextReel,
        repostCount: nextReel.repostCount,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return nextReel;
  });
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

export async function toggleFirebaseFollow(viewerInput: User, targetInput: User) {
  const db = getRequiredFirestore();
  const viewerRef = doc(db, USERS_COLLECTION, viewerInput.id);
  const targetRef = doc(db, USERS_COLLECTION, targetInput.id);

  return runTransaction(db, async (transaction) => {
    const [viewerSnapshot, targetSnapshot] = await Promise.all([transaction.get(viewerRef), transaction.get(targetRef)]);

    const viewer = viewerSnapshot.exists() ? normalizeUserDoc(viewerInput.id, viewerSnapshot.data()) : viewerInput;
    const target = targetSnapshot.exists() ? normalizeUserDoc(targetInput.id, targetSnapshot.data()) : targetInput;
    const isFollowing = viewer.following.includes(targetInput.id);
    const nextViewer: User = {
      ...viewer,
      following: isFollowing ? viewer.following.filter((item) => item !== targetInput.id) : [targetInput.id, ...viewer.following],
    };
    const nextTarget: User = {
      ...target,
      followers: isFollowing ? target.followers.filter((item) => item !== viewerInput.id) : [viewerInput.id, ...target.followers],
    };
    const now = new Date().toISOString();

    transaction.set(
      viewerRef,
      {
        ...nextViewer,
        following: nextViewer.following,
        updatedAt: now,
      },
      { merge: true }
    );
    transaction.set(
      targetRef,
      {
        ...nextTarget,
        followers: nextTarget.followers,
        updatedAt: now,
      },
      { merge: true }
    );

    return {
      following: !isFollowing,
      viewer: nextViewer,
      target: nextTarget,
    };
  });
}

export function getFirebaseEngagementErrorMessage(error: unknown) {
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

function normalizeCommentDoc(id: string, data: Record<string, unknown>): ReelComment {
  return {
    id,
    reelId: readString(data.reelId, ""),
    userId: readString(data.userId, "unknown-user"),
    userName: readString(data.userName, "ViraFlow Creator"),
    userAvatar: readString(data.userAvatar, FALLBACK_PROFILE_IMAGE),
    text: readString(data.text, ""),
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
