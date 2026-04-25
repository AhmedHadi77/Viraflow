import admin from "firebase-admin";
import { env } from "../config/env";

let firebaseInitFailed = false;

function getPrivateKey() {
  return env.firebasePrivateKey.replace(/^["']|["']$/g, "").replace(/\\n/g, "\n");
}

export function isFirebaseAdminConfigured() {
  return Boolean(env.firebaseProjectId && env.firebaseClientEmail && env.firebasePrivateKey);
}

export function getFirebaseAdminApp() {
  if (!isFirebaseAdminConfigured()) {
    return undefined;
  }

  const existingApp = admin.apps[0];
  if (existingApp) {
    return existingApp;
  }

  if (firebaseInitFailed) {
    return undefined;
  }

  try {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.firebaseProjectId,
        clientEmail: env.firebaseClientEmail,
        privateKey: getPrivateKey(),
      }),
      storageBucket: env.firebaseStorageBucket || undefined,
    });
  } catch (error) {
    firebaseInitFailed = true;
    console.error("Firebase Admin initialization failed.", error);
    return undefined;
  }
}

export function getFirebaseAuth() {
  const app = getFirebaseAdminApp();
  return app ? admin.auth(app) : undefined;
}

export function getFirestore() {
  const app = getFirebaseAdminApp();
  return app ? admin.firestore(app) : undefined;
}

export interface VerifiedFirebaseUser {
  id: string;
  email?: string;
  name?: string;
  picture?: string;
  token: admin.auth.DecodedIdToken;
}

export interface FirebaseUserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  profileImage: string;
  bio: string;
  headline: string;
  language: string;
  planType: string;
  followers: string[];
  following: string[];
  reelIds: string[];
  productIds: string[];
  createdAt: string;
  updatedAt: string;
}

export async function verifyFirebaseUserToken(token: string | undefined): Promise<VerifiedFirebaseUser | undefined> {
  if (!token) {
    return undefined;
  }

  const auth = getFirebaseAuth();
  if (!auth) {
    return undefined;
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    return {
      id: decoded.uid,
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
      token: decoded,
    };
  } catch {
    return undefined;
  }
}

export async function getUserIdFromFirebaseToken(token: string | undefined) {
  return (await verifyFirebaseUserToken(token))?.id;
}

export async function getFirebaseUserProfileById(userId: string): Promise<FirebaseUserProfile | undefined> {
  const db = getFirestore();
  if (!db || !userId.trim()) {
    return undefined;
  }

  const snapshot = await db.collection("users").doc(userId.trim()).get();
  if (!snapshot.exists) {
    return undefined;
  }

  const data = snapshot.data() ?? {};
  const now = new Date().toISOString();

  return {
    id: userId.trim(),
    name: readString(data.name, "Pulseora Creator"),
    username: readString(data.username, userId.trim().slice(0, 12).toLowerCase()),
    email: readString(data.email, ""),
    profileImage: readString(data.profileImage, ""),
    bio: readString(data.bio, ""),
    headline: readString(data.headline, ""),
    language: readString(data.language, "en"),
    planType: readString(data.planType, "free"),
    followers: readStringArray(data.followers),
    following: readStringArray(data.following),
    reelIds: readStringArray(data.reelIds),
    productIds: readStringArray(data.productIds),
    createdAt: readString(data.createdAt, now),
    updatedAt: readString(data.updatedAt, now),
  };
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}
