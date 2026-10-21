import {
  createUserWithEmailAndPassword,
  deleteUser as deleteFirebaseAuthUser,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithCredential,
  signInWithPopup,
  signOut,
  updateProfile as updateFirebaseAuthProfile,
} from "firebase/auth";
import Constants, { AppOwnership } from "expo-constants";
import { Platform } from "react-native";
import { collection, doc, getDoc, getDocs, limit, query, setDoc, where } from "firebase/firestore";
import { getFirebaseClientAuth, getFirebaseClientFirestore, isFirebaseClientConfigured } from "./firebaseClient";
import { getPublicEnv } from "./publicEnv";
import { isLanguageOption, LanguageOption, PlanType, RegisterPayload, UpdateProfilePayload, User, UserRole } from "../types/models";
import {
  getUsernameValidationMessage,
  getWebsiteValidationMessage,
  normalizeUsernameInput,
  normalizeWebsiteInput,
} from "../utils/profileValidation";
import { DEFAULT_PROFILE_IMAGE } from "../data/defaultMedia";
import { repairMediaUrl } from "./mediaUpload";
import { getCopy } from "../data/copy";
import type { CopyStrings } from "../data/locales/en";

const USERS_COLLECTION = "users";
const GOOGLE_WEB_CLIENT_ID = getPublicEnv("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID");
const GOOGLE_ANDROID_CLIENT_ID = getPublicEnv("EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID");
let googleSignInConfigured = false;
let cachedGoogleSigninModule: GoogleSigninModule | null | undefined;

type GoogleSigninModule = typeof import("@react-native-google-signin/google-signin").GoogleSignin;

interface FirestoreUserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  profileImage: string;
  bio: string;
  headline: string;
  website: string;
  language: LanguageOption;
  region?: string;
  planType: PlanType;
  followers: string[];
  following: string[];
  reelIds: string[];
  productIds: string[];
  createdAt: string;
  updatedAt: string;
  role?: UserRole;
  isBanned?: boolean;
  bannedAt?: string;
}

export interface FirebaseProfileSession {
  token: string;
  user: User;
}

export function isFirebaseProfilesConfigured() {
  return isFirebaseClientConfigured();
}

export function isGoogleSignInConfigured() {
  return getGoogleSignInUnavailableMessage() === null;
}

export function getGoogleSignInUnavailableMessage() {
  if (!isFirebaseProfilesConfigured()) {
    return "Firebase Auth is not configured in this app yet.";
  }

  // The web app signs in with Google's own sign-in window.
  if (Platform.OS === "web") {
    return null;
  }

  if (!GOOGLE_WEB_CLIENT_ID) {
    return "Google sign-in still needs EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in the app config.";
  }

  if (!GOOGLE_ANDROID_CLIENT_ID) {
    return "Google sign-in still needs the Android OAuth client. Add the app SHA-1 in Firebase, then download a fresh google-services.json.";
  }

  if (!isGoogleNativeEnvironmentSupported()) {
    return "Google sign-in works in the installed Android app or development build, not inside Expo Go.";
  }

  if (!getGoogleSigninModule()) {
    return "Google sign-in is unavailable in this build right now. Email and password will still work.";
  }

  return null;
}

export async function registerWithFirebaseProfile(
  payload: RegisterPayload,
  language: LanguageOption | null
): Promise<FirebaseProfileSession> {
  const auth = getRequiredFirebaseAuth();
  const db = getRequiredFirestore();
  const email = payload.email.trim().toLowerCase();
  const username = normalizeUsername(payload.username);
  const usernameValidationMessage = getUsernameValidationMessage(username);
  if (usernameValidationMessage) {
    throw new Error(usernameValidationMessage);
  }
  const now = new Date().toISOString();

  const credential = await createUserWithEmailAndPassword(auth, email, payload.password);
  // Profiles can only be read by signed-in people, so the username check runs right after the
  // account is created. If the name is taken, the new account is removed again so the email stays free.
  try {
    await assertUsernameAvailable(db, username, credential.user.uid);
  } catch (error) {
    await deleteFirebaseAuthUser(credential.user).catch(() => signOut(auth).catch(() => undefined));
    throw error;
  }
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
    bio: "New creator on Sohba.",
    headline: "Creator in progress",
    website: "",
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
  return buildFirebaseProfileSession(credential.user, db, languageOrDefault(null, email.trim().toLowerCase()));
}

export async function continueWithFirebaseGoogleProfile(language: LanguageOption | null): Promise<FirebaseProfileSession> {
  const unavailableMessage = getGoogleSignInUnavailableMessage();
  if (unavailableMessage) {
    throw new Error(unavailableMessage);
  }

  if (Platform.OS === "web") {
    const webAuth = getRequiredFirebaseAuth();
    const webDb = getRequiredFirestore();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const result = await signInWithPopup(webAuth, provider);
    return buildFirebaseProfileSession(result.user, webDb, languageOrDefault(language, result.user.email ?? ""));
  }

  const GoogleSignin = getRequiredGoogleSignin();
  ensureGoogleSignInConfigured(GoogleSignin);
  const auth = getRequiredFirebaseAuth();
  const db = getRequiredFirestore();

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  const googleResult = (await GoogleSignin.signIn()) as {
    idToken?: string | null;
    data?: {
      idToken?: string | null;
    };
  };
  const idToken = googleResult.idToken ?? googleResult.data?.idToken;

  if (!idToken) {
    throw new Error("Google sign-in did not return an ID token.");
  }

  const credential = GoogleAuthProvider.credential(idToken);
  const firebaseCredential = await signInWithCredential(auth, credential);

  return buildFirebaseProfileSession(firebaseCredential.user, db, languageOrDefault(language, firebaseCredential.user.email ?? ""));
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

export async function getCurrentFirebaseIdToken(forceRefresh = true) {
  const auth = getFirebaseClientAuth();
  if (!auth) {
    return null;
  }

  if (!auth.currentUser) {
    const authStateReady = (auth as typeof auth & { authStateReady?: () => Promise<void> }).authStateReady;

    if (typeof authStateReady === "function") {
      await authStateReady.call(auth).catch(() => undefined);
    } else {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  if (!auth.currentUser) {
    return null;
  }

  return auth.currentUser.getIdToken(forceRefresh);
}

export async function updateFirebaseUserProfile(userId: string, payload: UpdateProfilePayload): Promise<User> {
  const db = getRequiredFirestore();
  const auth = getRequiredFirebaseAuth();
  const normalizedUsername = normalizeUsername(payload.username);
  const usernameValidationMessage = getUsernameValidationMessage(normalizedUsername);
  if (usernameValidationMessage) {
    throw new Error(usernameValidationMessage);
  }

  const websiteValidationMessage = getWebsiteValidationMessage(payload.website);
  if (websiteValidationMessage) {
    throw new Error(websiteValidationMessage);
  }

  const profileRef = doc(db, USERS_COLLECTION, userId);
  const snapshot = await getDoc(profileRef);
  const existing = snapshot.exists()
    ? normalizeFirestoreProfile({
        id: userId,
        ...snapshot.data(),
      })
    : buildFallbackProfile({
        id: userId,
        email: auth.currentUser?.email ?? `${normalizedUsername}@pulseora.app`,
        name: payload.name,
        profileImage: payload.profileImage,
      });

  if (existing.username !== normalizedUsername) {
    await assertUsernameAvailable(db, normalizedUsername, userId);
  }

  const nextProfile: FirestoreUserProfile = {
    ...existing,
    name: payload.name.trim(),
    username: normalizedUsername,
    bio: payload.bio.trim(),
    headline: payload.headline.trim(),
    website: normalizeWebsiteInput(payload.website),
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

/** Saves the language and region the user picked in Settings to their profile document. */
export async function updateFirebaseUserPreferences(
  userId: string,
  preferences: { language?: LanguageOption; region?: string }
) {
  const db = getRequiredFirestore();
  const update: Record<string, string> = { updatedAt: new Date().toISOString() };
  if (preferences.language && isLanguageOption(preferences.language)) {
    update.language = preferences.language;
  }
  if (preferences.region) {
    update.region = preferences.region.toUpperCase();
  }
  await setDoc(doc(db, USERS_COLLECTION, userId), update, { merge: true });
}

export async function setFirebaseUserBanStatus(userId: string, banned: boolean): Promise<User> {
  const db = getRequiredFirestore();
  const profileRef = doc(db, USERS_COLLECTION, userId);
  const snapshot = await getDoc(profileRef);
  if (!snapshot.exists()) {
    throw new Error("User not found.");
  }

  const existing = normalizeFirestoreProfile({
    id: userId,
    ...snapshot.data(),
  });
  const nextProfile: FirestoreUserProfile = {
    ...existing,
    isBanned: banned,
    bannedAt: banned ? new Date().toISOString() : undefined,
    updatedAt: new Date().toISOString(),
  };

  await setDoc(
    profileRef,
    {
      isBanned: nextProfile.isBanned,
      bannedAt: nextProfile.bannedAt ?? null,
      updatedAt: nextProfile.updatedAt,
    },
    { merge: true }
  );

  return mapFirestoreProfileToUser(nextProfile);
}

export async function logoutFromFirebaseProfile() {
  const auth = getFirebaseClientAuth();
  if (!auth) {
    return;
  }

  await signOut(auth);
  const GoogleSignin = getGoogleSigninModule();
  if (GoogleSignin && isGoogleSignInConfigured()) {
    await GoogleSignin.signOut().catch(() => undefined);
  }
}

export function getFirebaseProfileErrorMessage(error: unknown, copy: CopyStrings = getCopy(null)) {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
  const rawMessage = error instanceof Error ? error.message : "";

  switch (code) {
    case "auth/email-already-in-use":
      return copy.authErrEmailInUse;
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-login-credentials":
      return copy.authErrWrongCredentials;
    case "auth/weak-password":
      return copy.authErrWeakPassword;
    case "auth/invalid-email":
    case "auth/missing-email":
      return copy.authErrInvalidEmail;
    case "auth/account-exists-with-different-credential":
      return copy.authErrDifferentCredential;
    case "auth/network-request-failed":
    case "unavailable":
      return copy.authErrNetwork;
    case "auth/too-many-requests":
      return copy.authErrTooManyRequests;
    case "auth/user-disabled":
      return copy.authErrDisabled;
    case "sohba/username-taken":
      return copy.authErrUsernameTaken;
    case "permission-denied":
      return copy.authErrPermission;
    case "SIGN_IN_CANCELLED":
    case "12501":
      return copy.authErrGoogleCancelled;
    case "PLAY_SERVICES_NOT_AVAILABLE":
      return copy.authErrPlayServices;
    case "DEVELOPER_ERROR":
    case "10":
      return copy.authErrGoogleSetup;
    default:
      break;
  }

  if (/DEVELOPER_ERROR/i.test(rawMessage)) {
    return copy.authErrGoogleSetup;
  }
  if (/insufficient permissions/i.test(rawMessage)) {
    return copy.authErrPermission;
  }
  if (/network/i.test(rawMessage)) {
    return copy.authErrNetwork;
  }

  return rawMessage || copy.authErrGeneric;
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

async function buildFirebaseProfileSession(
  authUser: { uid: string; email: string | null; displayName: string | null; photoURL: string | null; getIdToken: () => Promise<string> },
  db: ReturnType<typeof getRequiredFirestore>,
  language: LanguageOption
): Promise<FirebaseProfileSession> {
  const profileRef = doc(db, USERS_COLLECTION, authUser.uid);
  const snapshot = await getDoc(profileRef);
  let profile: FirestoreUserProfile;

  if (snapshot.exists()) {
    profile = normalizeFirestoreProfile({
      id: authUser.uid,
      ...snapshot.data(),
    });
  } else {
    const fallbackUsername = await buildAvailableUsername(
      db,
      authUser.email ?? authUser.displayName ?? authUser.uid,
      authUser.uid
    );
    profile = buildFallbackProfile({
      id: authUser.uid,
      email: authUser.email ?? `${authUser.uid}@pulseora.app`,
      name: authUser.displayName ?? "Sohba Creator",
      profileImage: authUser.photoURL ?? DEFAULT_PROFILE_IMAGE,
      language,
      username: fallbackUsername,
    });
    await setDoc(profileRef, profile, { merge: true });
  }

  const token = await authUser.getIdToken();

  return {
    token,
    user: mapFirestoreProfileToUser(profile),
  };
}

function ensureGoogleSignInConfigured(GoogleSignin: GoogleSigninModule) {
  if (googleSignInConfigured) {
    return;
  }

  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    offlineAccess: false,
    profileImageSize: 160,
  });
  googleSignInConfigured = true;
}

function getGoogleSigninModule() {
  if (cachedGoogleSigninModule !== undefined) {
    return cachedGoogleSigninModule;
  }

  try {
    cachedGoogleSigninModule = require("@react-native-google-signin/google-signin").GoogleSignin as GoogleSigninModule;
  } catch (error) {
    console.warn("Sohba Google sign-in module is unavailable in this build.", error);
    cachedGoogleSigninModule = null;
  }

  return cachedGoogleSigninModule;
}

function getRequiredGoogleSignin() {
  const GoogleSignin = getGoogleSigninModule();
  if (!GoogleSignin) {
    throw new Error("Google sign-in is unavailable in this build right now. Email and password will still work.");
  }

  return GoogleSignin;
}

function isGoogleNativeEnvironmentSupported() {
  return Constants.appOwnership !== AppOwnership.Expo;
}

function buildFallbackProfile(input: {
  id: string;
  email: string;
  name: string;
  profileImage?: string;
  language?: LanguageOption;
  username?: string;
}): FirestoreUserProfile {
  const now = new Date().toISOString();
  const usernameSeed = input.email.split("@")[0] || input.name || "creator";

  return {
    id: input.id,
    name: input.name.trim() || "Sohba Creator",
    username: normalizeUsername(input.username || usernameSeed),
    email: input.email.trim().toLowerCase(),
    profileImage: input.profileImage?.trim() || DEFAULT_PROFILE_IMAGE,
    bio: "New creator on Sohba.",
    headline: "Creator in progress",
    website: "",
    language: input.language ?? "en",
    planType: "free",
    followers: [],
    following: [],
    reelIds: [],
    productIds: [],
    createdAt: now,
    updatedAt: now,
    role: "user",
    isBanned: false,
  };
}

function languageOrDefault(language: LanguageOption | null, email: string) {
  return language ?? "en";
}

function normalizeFirestoreProfile(raw: Partial<FirestoreUserProfile> & { id: string }): FirestoreUserProfile {
  const fallback = buildFallbackProfile({
    id: raw.id,
    email: raw.email || `${raw.username || raw.id}@pulseora.app`,
    name: raw.name || "Sohba Creator",
    profileImage: raw.profileImage,
  });

  return {
    ...fallback,
    ...raw,
    name: raw.name?.trim() || fallback.name,
    username: normalizeUsername(raw.username || fallback.username),
    email: raw.email?.trim().toLowerCase() || fallback.email,
    profileImage: repairMediaUrl(raw.profileImage?.trim()) || fallback.profileImage,
    // Older accounts were created under the app's previous name.
    bio: (raw.bio?.trim() ?? fallback.bio).replace(/^New creator on Pulseora\.?$/, "New creator on Sohba."),
    headline: raw.headline?.trim() ?? fallback.headline,
    website: normalizeWebsiteInput(raw.website ?? fallback.website),
    language: normalizeLanguage(raw.language, fallback.language),
    region: typeof raw.region === "string" && raw.region ? raw.region.toUpperCase() : undefined,
    planType: normalizePlan(raw.planType),
    followers: Array.isArray(raw.followers) ? raw.followers : [],
    following: Array.isArray(raw.following) ? raw.following : [],
    reelIds: Array.isArray(raw.reelIds) ? raw.reelIds : [],
    productIds: Array.isArray(raw.productIds) ? raw.productIds : [],
    createdAt: raw.createdAt || fallback.createdAt,
    updatedAt: raw.updatedAt || fallback.updatedAt,
    role: raw.role === "admin" ? "admin" : "user",
    isBanned: Boolean(raw.isBanned),
    bannedAt: typeof raw.bannedAt === "string" ? raw.bannedAt : undefined,
  };
}

function mapFirestoreProfileToUser(profile: FirestoreUserProfile): User {
  return {
    id: profile.id,
    name: profile.name,
    username: profile.username,
    email: profile.email,
    profileImage: repairMediaUrl(profile.profileImage),
    bio: profile.bio,
    headline: profile.headline,
    website: profile.website,
    language: profile.language,
    region: profile.region,
    planType: profile.planType,
    followers: profile.followers,
    following: profile.following,
    reelIds: profile.reelIds,
    productIds: profile.productIds,
    role: profile.role,
    isBanned: profile.isBanned,
    bannedAt: profile.bannedAt,
  };
}

function normalizeUsername(username: string) {
  return normalizeUsernameInput(username) || `creator${Date.now()}`;
}

async function assertUsernameAvailable(
  db: ReturnType<typeof getRequiredFirestore>,
  username: string,
  currentUserId?: string
) {
  const snapshot = await getDocs(query(collection(db, USERS_COLLECTION), where("username", "==", username), limit(1)));
  const existing = snapshot.docs[0];

  if (existing && existing.id !== currentUserId) {
    throw Object.assign(new Error("That username is already taken."), { code: "sohba/username-taken" });
  }
}

async function buildAvailableUsername(
  db: ReturnType<typeof getRequiredFirestore>,
  seed: string,
  currentUserId?: string
) {
  const sanitizedSeed = normalizeUsername(seed)
    .replace(/[^a-z0-9._]/g, "")
    .replace(/^[._]+|[._]+$/g, "")
    .replace(/[._]{2,}/g, "_");
  const base = (sanitizedSeed || `creator${Date.now()}`).slice(0, 20);
  let attempt = base;
  let suffix = 0;

  while (true) {
    const snapshot = await getDocs(query(collection(db, USERS_COLLECTION), where("username", "==", attempt), limit(1)));
    const existing = snapshot.docs[0];
    if (!existing || existing.id === currentUserId) {
      return attempt;
    }

    suffix += 1;
    const suffixLabel = String(suffix);
    const stemLength = Math.max(3, 20 - suffixLabel.length);
    attempt = `${base.slice(0, stemLength)}${suffixLabel}`;
  }
}

function normalizeLanguage(language: LanguageOption | undefined, fallback: LanguageOption): LanguageOption {
  if (isLanguageOption(language)) {
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
