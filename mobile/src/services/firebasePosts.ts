import { normalizeStudioData } from "../utils/studioData";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { getFirebaseClientFirestore, isFirebaseClientConfigured } from "./firebaseClient";
import { Post, PostComment, PostMediaItem, User } from "../types/models";
import { DEFAULT_PROFILE_IMAGE, MEDIA_UNAVAILABLE_IMAGE } from "../data/defaultMedia";

const POSTS_COLLECTION = "posts";
const POST_COMMENTS_COLLECTION = "postComments";


export function isFirebasePostsConfigured() {
  return isFirebaseClientConfigured();
}

export async function fetchFirebasePostsSnapshot() {
  const db = getRequiredFirestore();
  const [postsSnapshot, commentsSnapshot] = await Promise.all([
    getDocs(query(collection(db, POSTS_COLLECTION), orderBy("createdAt", "desc"), limit(160))),
    getDocs(query(collection(db, POST_COMMENTS_COLLECTION), orderBy("createdAt", "desc"), limit(500))),
  ]);

  return {
    posts: postsSnapshot.docs.map((item) => normalizePostDoc(item.id, item.data())),
    comments: commentsSnapshot.docs.map((item) => normalizePostCommentDoc(item.id, item.data())),
  };
}

export function subscribeToFirebasePosts(input: {
  onPosts: (posts: Post[]) => void;
  onComments: (comments: PostComment[]) => void;
}) {
  const db = getFirebaseClientFirestore();
  if (!db) {
    return () => undefined;
  }

  const unsubscribers = [
    onSnapshot(
      query(collection(db, POSTS_COLLECTION), orderBy("createdAt", "desc"), limit(160)),
      (snapshot) => {
        input.onPosts(snapshot.docs.map((item) => normalizePostDoc(item.id, item.data())));
      },
      () => undefined
    ),
    onSnapshot(
      query(collection(db, POST_COMMENTS_COLLECTION), orderBy("createdAt", "desc"), limit(500)),
      (snapshot) => {
        input.onComments(snapshot.docs.map((item) => normalizePostCommentDoc(item.id, item.data())));
      },
      () => undefined
    ),
  ];

  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
}

export async function createFirebasePost(
  userId: string,
  input: {
    caption: string;
    hashtags: string[];
    location?: string;
    media: PostMediaItem[];
  }
) {
  const db = getRequiredFirestore();
  const postRef = doc(collection(db, POSTS_COLLECTION));
  const normalizedLocation = input.location?.trim();
  const post: Post = {
    id: postRef.id,
    userId,
    caption: input.caption.trim(),
    hashtags: normalizeHashtags(input.hashtags, input.caption),
    ...(normalizedLocation ? { location: normalizedLocation } : {}),
    media: input.media.map((item, index) => normalizePostMediaItemForWrite(item, `${postRef.id}-media-${index + 1}`)),
    likedBy: [],
    commentCount: 0,
    createdAt: new Date().toISOString(),
  };

  await setDoc(postRef, post);
  return post;
}

function normalizePostMediaItemForWrite(item: PostMediaItem, fallbackId: string): PostMediaItem {
  const thumbnailUrl = item.thumbnailUrl?.trim();
  const mimeType = item.mimeType?.trim();
  const durationSeconds =
    typeof item.durationSeconds === "number" && Number.isFinite(item.durationSeconds)
      ? item.durationSeconds
      : undefined;

  return {
    id: item.id || fallbackId,
    type: item.type,
    url: item.url.trim(),
    ...(thumbnailUrl ? { thumbnailUrl } : {}),
    ...(mimeType ? { mimeType } : {}),
    ...(durationSeconds !== undefined ? { durationSeconds } : {}),
    ...(normalizeStudioData(item.studio) ? { studio: normalizeStudioData(item.studio) } : {}),
  };
}

export async function toggleFirebasePostLike(userId: string, postId: string, fallbackPost?: Post) {
  const db = getRequiredFirestore();
  const postRef = doc(db, POSTS_COLLECTION, postId);

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(postRef);
    if (!snapshot.exists() && !fallbackPost) {
      throw new Error("Post not found.");
    }

    const currentPost = snapshot.exists() ? normalizePostDoc(postId, snapshot.data()) : fallbackPost!;
    const hasLiked = currentPost.likedBy.includes(userId);
    const likedBy = hasLiked ? currentPost.likedBy.filter((item) => item !== userId) : [userId, ...currentPost.likedBy];
    const nextPost: Post = {
      ...currentPost,
      likedBy,
    };

    transaction.set(
      postRef,
      {
        likedBy,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return nextPost;
  });
}

export async function addFirebasePostComment(postId: string, user: User, text: string, fallbackPost?: Post) {
  const db = getRequiredFirestore();
  const postRef = doc(db, POSTS_COLLECTION, postId);
  const commentRef = doc(collection(db, POST_COMMENTS_COLLECTION));
  const now = new Date().toISOString();

  return runTransaction(db, async (transaction) => {
    const postSnapshot = await transaction.get(postRef);
    if (!postSnapshot.exists() && !fallbackPost) {
      throw new Error("Post not found.");
    }

    const currentPost = postSnapshot.exists() ? normalizePostDoc(postId, postSnapshot.data()) : fallbackPost!;
    const comment: PostComment = {
      id: commentRef.id,
      postId,
      userId: user.id,
      userName: user.name,
      userAvatar: user.profileImage,
      text: text.trim(),
      createdAt: now,
    };

    transaction.set(commentRef, comment);
    transaction.set(
      postRef,
      {
        commentCount: currentPost.commentCount + 1,
        updatedAt: now,
      },
      { merge: true }
    );

    return {
      comment,
      post: {
        ...currentPost,
        commentCount: currentPost.commentCount + 1,
      },
    };
  });
}

export async function deleteFirebasePost(userId: string, postId: string) {
  return deleteFirebasePostDocument(postId, userId);
}

export async function deleteFirebasePostAsAdmin(postId: string) {
  return deleteFirebasePostDocument(postId);
}

async function deleteFirebasePostDocument(postId: string, ownerId?: string) {
  const db = getRequiredFirestore();
  const postRef = doc(db, POSTS_COLLECTION, postId);
  const postSnapshot = await getDoc(postRef);

  if (!postSnapshot.exists()) {
    throw new Error("Post not found.");
  }

  const post = normalizePostDoc(postId, postSnapshot.data());
  if (ownerId && post.userId !== ownerId) {
    throw new Error("You can only delete your own post.");
  }

  const commentsSnapshot = await getDocs(query(collection(db, POST_COMMENTS_COLLECTION), where("postId", "==", postId), limit(500)));
  const batch = writeBatch(db);
  batch.delete(postRef);
  commentsSnapshot.docs.forEach((item) => {
    batch.delete(item.ref);
  });
  await batch.commit();

  return {
    deletedPostId: postId,
    deletedCommentIds: commentsSnapshot.docs.map((item) => item.id),
  };
}

export function getFirebasePostsErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Posts could not be updated right now.";
}

function getRequiredFirestore() {
  const db = getFirebaseClientFirestore();
  if (!db) {
    throw new Error("Firestore is not configured. Add the EXPO_PUBLIC_FIREBASE_* values to mobile/.env.");
  }

  return db;
}

function normalizePostDoc(id: string, data: Record<string, unknown>): Post {
  return {
    id,
    userId: readString(data.userId, "unknown-user"),
    caption: readString(data.caption, ""),
    hashtags: normalizeHashtags(readStringArray(data.hashtags), readString(data.caption, "")),
    location: readOptionalString(data.location),
    media: normalizePostMedia(data.media),
    likedBy: readStringArray(data.likedBy),
    commentCount: readNumber(data.commentCount, 0),
    createdAt: readString(data.createdAt, new Date().toISOString()),
  };
}

function normalizePostCommentDoc(id: string, data: Record<string, unknown>): PostComment {
  return {
    id,
    postId: readString(data.postId, ""),
    userId: readString(data.userId, "unknown-user"),
    userName: readString(data.userName, "Sohba Creator"),
    userAvatar: readString(data.userAvatar, DEFAULT_PROFILE_IMAGE),
    text: readString(data.text, ""),
    createdAt: readString(data.createdAt, new Date().toISOString()),
  };
}

function normalizePostMedia(value: unknown): PostMediaItem[] {
  if (!Array.isArray(value)) {
    return [
      {
        id: "fallback-media",
        type: "image",
        url: MEDIA_UNAVAILABLE_IMAGE,
      },
    ];
  }

  const items = value
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const url = readString(record.url, "");
      if (!url) {
        return null;
      }

      return {
        id: readString(record.id, `media-${index + 1}`),
        type: record.type === "video" ? "video" : "image",
        url,
        thumbnailUrl: readOptionalString(record.thumbnailUrl),
        mimeType: readOptionalString(record.mimeType),
        durationSeconds: readOptionalNumber(record.durationSeconds),
        studio: normalizeStudioData(record.studio),
      } satisfies PostMediaItem;
    })
    .filter(Boolean) as PostMediaItem[];

  return items.length > 0
    ? items
    : [
        {
          id: "fallback-media",
          type: "image",
          url: MEDIA_UNAVAILABLE_IMAGE,
        },
      ];
}

function normalizeHashtags(values: string[], caption: string) {
  const fromCaption = caption.match(/#[a-zA-Z0-9_]+/g)?.map((tag) => tag.replace("#", "").toLowerCase()) ?? [];
  const normalized = [...values, ...fromCaption]
    .map((item) => item.trim().replace(/^#+/, "").toLowerCase())
    .filter(Boolean);

  return [...new Set(normalized)].slice(0, 8);
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" ? value.trim() || fallback : fallback;
}

function readOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
