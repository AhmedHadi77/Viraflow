import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import * as FirebaseAuth from "firebase/auth";
import { Firestore, getFirestore, initializeFirestore, terminate } from "firebase/firestore";
import { getPublicEnv } from "./publicEnv";
import { getCopy } from "../data/copy";
import type { LanguageOption } from "../types/models";

const { getAuth, initializeAuth } = FirebaseAuth;
const getReactNativePersistence = (
  FirebaseAuth as typeof FirebaseAuth & {
    getReactNativePersistence?: (storage: typeof AsyncStorage) => unknown;
  }
).getReactNativePersistence;

const firebaseConfig = {
  apiKey: getPublicEnv("EXPO_PUBLIC_FIREBASE_API_KEY"),
  authDomain: getPublicEnv("EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  projectId: getPublicEnv("EXPO_PUBLIC_FIREBASE_PROJECT_ID"),
  storageBucket: getPublicEnv("EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getPublicEnv("EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getPublicEnv("EXPO_PUBLIC_FIREBASE_APP_ID"),
};

export function isFirebaseClientConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}

export function getFirebaseClientApp() {
  if (!isFirebaseClientConfigured()) {
    return undefined;
  }

  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseClientAuth() {
  const app = getFirebaseClientApp();
  if (!app) {
    return undefined;
  }

  try {
    if (!getReactNativePersistence) {
      return getAuth(app);
    }

    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage) as never,
    });
  } catch {
    return getAuth(app);
  }
}

let firestoreInstance: Firestore | undefined;

export function getFirebaseClientFirestore() {
  if (firestoreInstance) {
    return firestoreInstance;
  }

  const app = getFirebaseClientApp();
  if (!app) {
    return undefined;
  }

  try {
    // Optional profile fields (for example bannedAt) can be undefined; drop them instead of failing the write.
    // Long polling instead of a streaming connection: React Native's networking often breaks Firestore's
    // streaming channel on mobile data, which shows up as "the client is offline" or internal SDK errors.
    firestoreInstance = initializeFirestore(app, { ignoreUndefinedProperties: true, experimentalForceLongPolling: true });
  } catch {
    firestoreInstance = getFirestore(app);
  }

  return firestoreInstance;
}

// ---- Recovery from Firestore's internal errors -------------------------------------------------
// The Firestore web SDK can hit an "INTERNAL ASSERTION FAILED" state on mobile networks. After that the
// instance is unusable and every call on it (even stopping a listener) throws, which used to crash the
// app. We now swallow those errors, throw the broken instance away and let the app listen again.

const resetListeners = new Set<() => void>();
let resetScheduled = false;

export function isFirestoreInternalError(error: unknown) {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return message.includes("INTERNAL ASSERTION FAILED") || message.includes("AsyncQueue is already failed");
}

/** Runs when the Firestore connection was rebuilt, so screens can start their listeners again. */
export function onFirestoreReset(listener: () => void) {
  resetListeners.add(listener);
  return () => {
    resetListeners.delete(listener);
  };
}

export function resetFirebaseClientFirestore() {
  if (resetScheduled) {
    return;
  }
  resetScheduled = true;
  const broken = firestoreInstance;
  firestoreInstance = undefined;
  setTimeout(() => {
    void (async () => {
      if (broken) {
        try {
          await terminate(broken);
        } catch {
          // Already broken; nothing else to release.
        }
      }
      resetScheduled = false;
      resetListeners.forEach((listener) => {
        try {
          listener();
        } catch {
          // A screen failed to restart its listener; the next app start will retry.
        }
      });
    })();
  }, 300);
}

/** Error handler for onSnapshot: rebuilds Firestore when it reports an internal failure. */
export function handleFirestoreListenError(error: unknown) {
  if (isFirestoreInternalError(error)) {
    resetFirebaseClientFirestore();
    return;
  }
  console.warn("Sohba live update stopped:", (error as { code?: string } | null)?.code ?? "", error instanceof Error ? error.message : error);
}

/** Combines listener stop-functions into one that never throws. */
export function combineUnsubscribers(unsubscribers: Array<() => void>) {
  return () => {
    unsubscribers.forEach((unsubscribe) => {
      try {
        unsubscribe();
      } catch (error) {
        handleFirestoreListenError(error);
      }
    });
  };
}

/** True when Firestore could not reach the server (no signal, server busy or connection still starting). */
export function isFirestoreOfflineError(error: unknown) {
  const code = (error as { code?: string } | null)?.code;
  const message = error instanceof Error ? error.message : "";
  return (
    code === "unavailable" ||
    code === "deadline-exceeded" ||
    message.includes("client is offline") ||
    message.includes("Could not reach Cloud Firestore")
  );
}

/** Runs a Firestore action and tries again a couple of times if the connection was not ready yet. */
export async function withFirestoreRetry<T>(action: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await action();
    } catch (error) {
      lastError = error;
      if (!isFirestoreOfflineError(error) || attempt === attempts - 1) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
    }
  }
  throw lastError;
}

// ---- Friendly error messages -----------------------------------------------------------------------
let errorLanguage: LanguageOption | null = null;

/** The app's language, so database errors can be explained in it. Set by AppProvider. */
export function setFirebaseErrorLanguage(language: LanguageOption | null) {
  errorLanguage = language;
}

/** A clear, translated explanation for common database errors, or undefined if there is none. */
export function friendlyFirebaseError(error: unknown) {
  const copy = getCopy(errorLanguage);
  if (isFirestoreOfflineError(error)) {
    return copy.netOffline;
  }
  const code = (error as { code?: string } | null)?.code;
  if (code === "permission-denied") {
    return copy.errNoPermission;
  }
  if (isFirestoreInternalError(error)) {
    resetFirebaseClientFirestore();
    return copy.netOffline;
  }
  return undefined;
}
