import admin from "firebase-admin";
import { env } from "../config/env";

let firebaseInitFailedAt = 0;
let firebaseInitError = "";
const INIT_RETRY_MS = 60_000;

/**
 * Turns whatever was pasted into FIREBASE_PRIVATE_KEY into a valid PEM key. Hosting dashboards often
 * keep the quotes, store the line breaks as "\\n", or turn them into spaces when the key is pasted into
 * a one-line field; any of those used to stop Firebase Admin from starting.
 */
function getPrivateKey() {
  let raw = env.firebasePrivateKey.trim().replace(/^["']|["']$/g, "").replace(/\\n/g, "\n").replace(/\r/g, "");
  if (!raw.includes("BEGIN") && /^[A-Za-z0-9+/=\s]+$/.test(raw) && raw.length > 200) {
    // A base64-encoded copy of the whole key.
    try {
      const decoded = Buffer.from(raw.replace(/\s+/g, ""), "base64").toString("utf8");
      if (decoded.includes("BEGIN")) {
        raw = decoded;
      }
    } catch {
      // Not base64; use as is.
    }
  }
  const match = raw.match(/-----BEGIN ([A-Z ]+)-----([\s\S]*?)-----END \1-----/);
  if (!match) {
    return raw;
  }
  const label = match[1];
  const body = match[2].replace(/\s+/g, "");
  const lines = body.match(/.{1,64}/g) ?? [];
  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----\n`;
}

export function isFirebaseAdminConfigured() {
  return Boolean(env.firebaseProjectId && env.firebaseClientEmail && env.firebasePrivateKey);
}

/** Whether Firebase Admin actually started, and why not (for the health check). Never includes secrets. */
export function getFirebaseAdminStatus() {
  const ready = Boolean(getFirebaseAdminApp());
  return { ready, error: ready ? undefined : firebaseInitError || (isFirebaseAdminConfigured() ? "unknown" : "missing settings") };
}

export function getFirebaseAdminApp() {
  if (!isFirebaseAdminConfigured()) {
    return undefined;
  }

  const existingApp = admin.apps[0];
  if (existingApp) {
    return existingApp;
  }

  if (firebaseInitFailedAt && Date.now() - firebaseInitFailedAt < INIT_RETRY_MS) {
    return undefined;
  }

  try {
    const app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.firebaseProjectId.trim(),
        clientEmail: env.firebaseClientEmail.trim().replace(/^["']|["']$/g, ""),
        privateKey: getPrivateKey(),
      }),
      storageBucket: env.firebaseStorageBucket || undefined,
    });
    firebaseInitFailedAt = 0;
    firebaseInitError = "";
    return app;
  } catch (error) {
    firebaseInitFailedAt = Date.now();
    firebaseInitError = (error instanceof Error ? error.message : String(error)).slice(0, 200);
    console.error("Firebase Admin initialization failed.", firebaseInitError);
    return undefined;
  }
}

export function getFirebaseAuth() {
  const app = getFirebaseAdminApp();
  return app ? admin.auth(app) : undefined;
}

let firestoreConfigured = false;

export function getFirestore() {
  const app = getFirebaseAdminApp();
  if (!app) {
    return undefined;
  }
  const db = admin.firestore(app);
  if (!firestoreConfigured) {
    firestoreConfigured = true;
    try {
      // Optional fields (e.g. a notification without an actor photo) are simply left out instead of
      // making the whole write fail with "Cannot use undefined as a Firestore value".
      db.settings({ ignoreUndefinedProperties: true });
    } catch {
      // Settings can only be applied before first use; if already used, keep going.
    }
  }
  return db;
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
  website: string;
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
  if (auth) {
    try {
      const decoded = await auth.verifyIdToken(token);
      return {
        id: decoded.uid,
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
        token: decoded,
      };
    } catch (error) {
      console.warn("Firebase Admin token verification failed. Falling back to accounts:lookup.", readErrorMessage(error));
    }
  }

  const fallbackUser = await lookupFirebaseUserByIdToken(token);
  if (!fallbackUser) {
    return undefined;
  }

  return {
    id: fallbackUser.id,
    email: fallbackUser.email,
    name: fallbackUser.name,
    picture: fallbackUser.picture,
    token: {
      uid: fallbackUser.id,
      email: fallbackUser.email,
      name: fallbackUser.name,
      picture: fallbackUser.picture,
      aud: env.firebaseProjectId || "viraflow-ad4b2",
      auth_time: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      firebase: {
        identities: {},
        sign_in_provider: fallbackUser.provider ?? "password",
      },
      iat: Math.floor(Date.now() / 1000),
      iss: `https://securetoken.google.com/${env.firebaseProjectId || "viraflow-ad4b2"}`,
      sub: fallbackUser.id,
    } as admin.auth.DecodedIdToken,
  };
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
    name: readString(data.name, "Sohba Creator"),
    username: readString(data.username, userId.trim().slice(0, 12).toLowerCase()),
    email: readString(data.email, ""),
    profileImage: readString(data.profileImage, ""),
    bio: readString(data.bio, ""),
    headline: readString(data.headline, ""),
    website: readString(data.website, ""),
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

interface LookupFirebaseUser {
  id: string;
  email?: string;
  name?: string;
  picture?: string;
  provider?: string;
}

async function lookupFirebaseUserByIdToken(token: string): Promise<LookupFirebaseUser | undefined> {
  if (!env.firebaseWebApiKey) {
    return undefined;
  }

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(env.firebaseWebApiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idToken: token,
        }),
      }
    );

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
      console.warn("Firebase accounts:lookup token verification failed.", payload.error?.message ?? response.statusText);
      return undefined;
    }

    const payload = (await response.json()) as {
      users?: Array<{
        localId?: string;
        email?: string;
        displayName?: string;
        photoUrl?: string;
        providerUserInfo?: Array<{ providerId?: string }>;
      }>;
    };

    const user = payload.users?.[0];
    if (!user?.localId) {
      return undefined;
    }

    return {
      id: user.localId,
      email: user.email,
      name: user.displayName,
      picture: user.photoUrl,
      provider: user.providerUserInfo?.[0]?.providerId,
    };
  } catch (error) {
    console.warn("Firebase accounts:lookup request failed.", readErrorMessage(error));
    return undefined;
  }
}

function readErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
