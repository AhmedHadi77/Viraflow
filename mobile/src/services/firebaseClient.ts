import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import * as FirebaseAuth from "firebase/auth";
import { Firestore, getFirestore, initializeFirestore, terminate } from "firebase/firestore";
import { getPublicEnv } from "./publicEnv";

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
    firestoreInstance = initializeFirestore(app, { ignoreUndefinedProperties: true });
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
  }
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
