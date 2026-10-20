import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import {
  combineUnsubscribers,
  getFirebaseClientFirestore,
  handleFirestoreListenError,
  isFirebaseClientConfigured,
} from "./firebaseClient";
import {
  AppSubscription,
  AppSubscriptionStatus,
  PlanType,
  ReelBoostCampaign,
} from "../types/models";

const SUBSCRIPTIONS_COLLECTION = "subscriptions";
const REEL_BOOSTS_COLLECTION = "reelBoosts";

export function isFirebaseMonetizationConfigured() {
  return isFirebaseClientConfigured();
}

export async function fetchFirebaseMonetizationSnapshot(userId: string) {
  const db = getRequiredFirestore();
  const [subscriptionSnapshot, boostsSnapshot] = await Promise.all([
    getDoc(doc(db, SUBSCRIPTIONS_COLLECTION, userId)),
    getDocs(query(collection(db, REEL_BOOSTS_COLLECTION), where("userId", "==", userId), limit(160))),
  ]);

  return {
    subscription: subscriptionSnapshot.exists()
      ? normalizeSubscriptionDoc(subscriptionSnapshot.id, subscriptionSnapshot.data())
      : null,
    boosts: sortBoosts(boostsSnapshot.docs.map((item) => normalizeBoostDoc(item.id, item.data()))),
  };
}

export function subscribeToFirebaseMonetization(
  userId: string,
  input: {
    onSubscription: (subscription: AppSubscription | null) => void;
    onBoosts: (boosts: ReelBoostCampaign[]) => void;
  }
) {
  const db = getFirebaseClientFirestore();
  if (!db) {
    return () => undefined;
  }

  const unsubscribers = [
    onSnapshot(
      doc(db, SUBSCRIPTIONS_COLLECTION, userId),
      (snapshot) => {
        input.onSubscription(snapshot.exists() ? normalizeSubscriptionDoc(snapshot.id, snapshot.data()) : null);
      },
      handleFirestoreListenError
    ),
    onSnapshot(
      query(collection(db, REEL_BOOSTS_COLLECTION), where("userId", "==", userId), limit(160)),
      (snapshot) => {
        input.onBoosts(sortBoosts(snapshot.docs.map((item) => normalizeBoostDoc(item.id, item.data()))));
      },
      handleFirestoreListenError
    ),
  ];

  return combineUnsubscribers(unsubscribers);
}

export function getFirebaseMonetizationErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Subscription or boost data could not be saved. Please try again.";
}

function getRequiredFirestore() {
  const db = getFirebaseClientFirestore();
  if (!db) {
    throw new Error("Firestore is not configured. Add the EXPO_PUBLIC_FIREBASE_* values to mobile/.env.");
  }

  return db;
}

function normalizeSubscriptionDoc(id: string, data: Record<string, unknown>): AppSubscription {
  return {
    id,
    userId: readString(data.userId, ""),
    planType: normalizePlanType(readString(data.planType, "free")),
    status: normalizeSubscriptionStatus(readString(data.status, "inactive")),
    startedAt: readString(data.startedAt, new Date().toISOString()),
    endsAt: readOptionalString(data.endsAt),
    autoRenew: typeof data.autoRenew === "boolean" ? data.autoRenew : true,
  };
}

function normalizeBoostDoc(id: string, data: Record<string, unknown>): ReelBoostCampaign {
  return {
    id,
    reelId: readString(data.reelId, ""),
    userId: readString(data.userId, ""),
    planId: normalizeBoostPlanId(readString(data.planId, "starter")),
    planTitle: readString(data.planTitle, "Boost"),
    amountUsd: readNumber(data.amountUsd, 0),
    estimatedViews: readNumber(data.estimatedViews, 0),
    estimatedReach: readNumber(data.estimatedReach, 0),
    status: normalizeBoostStatus(readString(data.status, "active"), readOptionalString(data.endsAt)),
    startedAt: readString(data.startedAt, new Date().toISOString()),
    endsAt: readString(data.endsAt, new Date().toISOString()),
    targetAudience: readString(data.targetAudience, "Creator-led short-form viewers"),
    note: readString(data.note, "Your reel is being amplified."),
  };
}

function sortBoosts(boosts: ReelBoostCampaign[]) {
  return [...boosts].sort((left, right) => right.startedAt.localeCompare(left.startedAt));
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizePlanType(value: string): PlanType {
  if (value === "weekly" || value === "monthly" || value === "yearly") {
    return value;
  }

  return "free";
}

function normalizeSubscriptionStatus(value: string): AppSubscriptionStatus {
  if (value === "active" || value === "canceled" || value === "expired") {
    return value;
  }

  return "inactive";
}

function normalizeBoostPlanId(value: string): ReelBoostCampaign["planId"] {
  if (value === "growth" || value === "viral") {
    return value;
  }

  return "starter";
}

function normalizeBoostStatus(value: string, endsAt?: string) {
  if (value === "completed") {
    return value;
  }

  if (endsAt && new Date(endsAt).getTime() < Date.now()) {
    return "completed";
  }

  return "active";
}
