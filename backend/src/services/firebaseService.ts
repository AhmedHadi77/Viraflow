import admin from "firebase-admin";
import { env } from "../config/env";

function getPrivateKey() {
  return env.firebasePrivateKey.replace(/\\n/g, "\n");
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

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.firebaseProjectId,
      clientEmail: env.firebaseClientEmail,
      privateKey: getPrivateKey(),
    }),
    storageBucket: env.firebaseStorageBucket || undefined,
  });
}

export function getFirebaseAuth() {
  const app = getFirebaseAdminApp();
  return app ? admin.auth(app) : undefined;
}

export function getFirestore() {
  const app = getFirebaseAdminApp();
  return app ? admin.firestore(app) : undefined;
}

export async function getUserIdFromFirebaseToken(token: string | undefined) {
  if (!token) {
    return undefined;
  }

  const auth = getFirebaseAuth();
  if (!auth) {
    return undefined;
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    return decoded.uid;
  } catch {
    return undefined;
  }
}
