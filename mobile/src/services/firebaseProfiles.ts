import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile as updateFirebaseAuthProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebaseClientAuth, getFirebaseClientFirestore, isFirebaseClientConfigured } from "./firebaseClient";
import { LanguageOption, PlanType, RegisterPayload, UpdateProfilePayload, User } from "../types/models";

const USERS_COLLECTION = "users";
const DEFAULT_PROFILE_IMAGE =
  "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=400&q=80";

interface FirestoreUserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  profileImage: string;
  bio: string;
  headline: string;
  language: LanguageOption;
  planType: PlanType;
  followers: string[];
  following: string[];
  reelIds: string[];
  productIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FirebaseProfileSession {
  token: string;
  user: User;
}

export function isFirebaseProfilesConfigured() {
  return isFirebaseClientConfigured();
}

export async function registerWithFirebaseProfile(
  payload: RegisterPayload,
  language: LanguageOption | null
): Promise<FirebaseProfileSession> {
  const auth = getRequiredFirebaseAuth();
  const db = getRequiredFirestore();
  const email = payload.email.trim().toLowerCase();
  const username = normalizeUsername(payload.username);
  const now = new Date().toISOString();

  const credential = await createUserWithEmailAndPassword(auth, email, payload.password);
  await updateFirebaseAuthProfile(credential.user, {
    displayName: payload.name.trim(),
    photoURL: DEFAULT_PROFILE_IMAGE,
  }).catch(() => {
    // Firestore is the app source of truth; Auth display metadata is best-effort.
  });

  const profile: FirestoreUserProfile = {
    id: credential.user.uid,
    name: payload.name.trim(),
    username,
    email,
    profileImage: DEFAULT_PROFILE_IMAGE,
    bio: "New creator on ViraFlow.",
    headline: "Creator in progress",
    language: language ?? "en",
    planType: "free",
    followers: [],
    following: [],
    reelIds: [],
    productIds: [],
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, USERS_COLLECTION, credential.user.uid), profile, { merge: true });
  const token = await credential.user.getIdToken();

  return {
    token,
    user: mapFirestoreProfileToUser(profile),
  };
}

export async function loginWithFirebaseProfile(email: string, password: string): Promise<FirebaseProfileSession> {
  const auth = getRequiredFirebaseAuth();
  const db = getRequiredFirestore();
  const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  const profileRef = doc(db, USERS_COLLECTION, credential.user.uid);
  const snapshot = await getDoc(profileRef);
  let profile: FirestoreUserProfile;

  if (snapshot.exists()) {
    profile = normalizeFirestoreProfile({
      id: credential.user.uid,
      ...snapshot.data(),
    });
  } else {
    profile = buildFallbackProfile({
      id: credential.user.uid,
      email: credential.user.email ?? email.trim().toLowerCase(),
      name: credential.user.displayName ?? "ViraFlow Creator",
      profileImage: credential.user.photoURL ?? DEFAULT_PROFILE_IMAGE,
    });
    await setDoc(profileRef, profile, { merge: true });
  }

  const token = await credential.user.getIdToken();

  return {
    token,
    user: mapFirestoreProfileToUser(profile),
  };
}

export async function getFirebaseProfileById(userId: string) {
  const db = getRequiredFirestore();
  const snapshot = await getDoc(doc(db, USERS_COLLECTION, userId));

  if (!snapshot.exists()) {
    return null;
  }

  return mapFirestoreProfileToUser(
    normalizeFirestoreProfile({
      id: userId,
      ...snapshot.data(),
    })
  );
}

export async function getCurrentFirebaseIdToken() {
  const auth = getFirebaseClientAuth();
  if (!auth?.currentUser) {
    return null;
  }

  return auth.currentUser.getIdToken();
}

export async function updateFirebaseUserProfile(userId: string, payload: UpdateProfilePayload): Promise<User> {
  const db = getRequiredFirestore();
  const auth = getRequiredFirebaseAuth();
  const profileRef = doc(db, USERS_COLLECTION, userId);
  const snapshot = await getDoc(profileRef);
  const existing = snapshot.exists()
    ? normalizeFirestoreProfile({
        id: userId,
        ...snapshot.data(),
      })
    : buildFallbackProfile({
        id: userId,
        email: auth.currentUser?.email ?? `${normalizeUsername(payload.username)}@viraflow.app`,
        name: payload.name,
        profileImage: payload.profileImage,
      });

  const nextProfile: FirestoreUserProfile = {
    ...existing,
    name: payload.name.trim(),
    username: normalizeUsername(payload.username),
    bio: payload.bio.trim(),
    headline: payload.headline.trim(),
    profileImage: payload.profileImage.trim() || existing.profileImage,
    updatedAt: new Date().toISOString(),
  };

  await setDoc(profileRef, nextProfile, { merge: true });

  if (auth.currentUser?.uid === userId) {
    await updateFirebaseAuthProfile(auth.currentUser, {
      displayName: nextProfile.name,
      photoURL: nextProfile.profileImage,
    }).catch(() => {
      // Firestore stays authoritative if Auth profile metadata cannot be updated.
    });
  }

  return mapFirestoreProfileToUser(nextProfile);
}

export async function logoutFromFirebaseProfile() {
  const auth = getFirebaseClientAuth();
  if (!auth) {
    return;
  }

  await signOut(auth);
}

export function getFirebaseProfileErrorMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";

  if (code === "auth/email-already-in-use") {
    return "That email is already registered. Try logging in instead.";
  }

  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
    return "Email or password is incorrect.";
  }

  if (code === "auth/weak-password") {
    return "Choose a stronger password with at least 6 characters.";
  }

  if (code === "auth/invalid-email") {
    return "Enter a valid email address.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Firebase account action failed. Please try again.";
}

function getRequiredFirebaseAuth() {
  const auth = getFirebaseClientAuth();
  if (!auth) {
    throw new Error("Firebase Auth is not configured. Add the EXPO_PUBLIC_FIREBASE_* values to mobile/.env.");
  }

  return auth;
}

function getRequiredFirestore() {
  const db = getFirebaseClientFirestore();
  if (!db) {
    throw new Error("Firestore is not configured. Add the EXPO_PUBLIC_FIREBASE_* values to mobile/.env.");
  }

  return db;
}

function buildFallbackProfile(input: { id: string; email: string; name: string; profileImage?: string }): FirestoreUserProfile {
  const now = new Date().toISOString();
  const usernameSeed = input.email.split("@")[0] || input.name || "creator";

  return {
    id: input.id,
    name: input.name.trim() || "ViraFlow Creator",
    username: normalizeUsername(usernameSeed),
    email: input.email.trim().toLowerCase(),
    profileImage: input.profileImage?.trim() || DEFAULT_PROFILE_IMAGE,
    bio: "New creator on ViraFlow.",
    headline: "Creator in progress",
    language: "en",
    planType: "free",
    followers: [],
    following: [],
    reelIds: [],
    productIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeFirestoreProfile(raw: Partial<FirestoreUserProfile> & { id: string }): FirestoreUserProfile {
  const fallback = buildFallbackProfile({
    id: raw.id,
    email: raw.email || `${raw.username || raw.id}@viraflow.app`,
    name: raw.name || "ViraFlow Creator",
    profileImage: raw.profileImage,
  });

  return {
    ...fallback,
    ...raw,
    name: raw.name?.trim() || fallback.name,
    username: normalizeUsername(raw.username || fallback.username),
    email: raw.email?.trim().toLowerCase() || fallback.email,
    profileImage: raw.profileImage?.trim() || fallback.profileImage,
    bio: raw.bio?.trim() ?? fallback.bio,
    headline: raw.headline?.trim() ?? fallback.headline,
    language: normalizeLanguage(raw.language, fallback.language),
    planType: normalizePlan(raw.planType),
    followers: Array.isArray(raw.followers) ? raw.followers : [],
    following: Array.isArray(raw.following) ? raw.following : [],
    reelIds: Array.isArray(raw.reelIds) ? raw.reelIds : [],
    productIds: Array.isArray(raw.productIds) ? raw.productIds : [],
    createdAt: raw.createdAt || fallback.createdAt,
    updatedAt: raw.updatedAt || fallback.updatedAt,
  };
}

function mapFirestoreProfileToUser(profile: FirestoreUserProfile): User {
  return {
    id: profile.id,
    name: profile.name,
    username: profile.username,
    email: profile.email,
    profileImage: profile.profileImage,
    bio: profile.bio,
    headline: profile.headline,
    language: profile.language,
    planType: profile.planType,
    followers: profile.followers,
    following: profile.following,
    reelIds: profile.reelIds,
    productIds: profile.productIds,
  };
}

function normalizeUsername(username: string) {
  return username.trim().replace(/\s+/g, "").replace(/^@+/, "").toLowerCase() || `creator${Date.now()}`;
}

function normalizeLanguage(language: LanguageOption | undefined, fallback: LanguageOption): LanguageOption {
  if (language === "en" || language === "ar" || language === "fr" || language === "es") {
    return language;
  }

  return fallback;
}

function normalizePlan(planType: PlanType | undefined): PlanType {
  if (planType === "free" || planType === "weekly" || planType === "monthly" || planType === "yearly") {
    return planType;
  }

  return "free";
}
