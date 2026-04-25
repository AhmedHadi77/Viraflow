import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getPublicEnv } from "./publicEnv";

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
  return app ? getAuth(app) : undefined;
}

export function getFirebaseClientFirestore() {
  const app = getFirebaseClientApp();
  return app ? getFirestore(app) : undefined;
}
