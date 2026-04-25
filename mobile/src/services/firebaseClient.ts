import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import * as FirebaseAuth from "firebase/auth";
import { getFirestore } from "firebase/firestore";
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

export function getFirebaseClientFirestore() {
  const app = getFirebaseClientApp();
  return app ? getFirestore(app) : undefined;
}
