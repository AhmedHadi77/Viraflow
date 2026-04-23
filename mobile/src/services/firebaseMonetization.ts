import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { getFirebaseClientFirestore, isFirebaseClientConfigured } from "./firebaseClient";
import {
  AppSubscription,
  AppSubscriptionStatus,
  PlanType,
  Reel,
  ReelBoostCampaign,
  ReelBoostPlan,
  User,
} from "../types/models";

const SUBSCRIPTIONS_COLLECTION = "subscriptions";
const REEL_BOOSTS_COLLECTION = "reelBoosts";
const REELS_COLLECTION = "reels";
const USERS_COLLECTION = "users";

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
      () => undefined
    ),
    onSnapshot(
      query(collection(db, REEL_BOOSTS_COLLECTION), where("userId", "==", userId), limit(160)),
      (snapshot) => {
        input.onBoosts(sortBoosts(snapshot.docs.map((item) => normalizeBoostDoc(item.id, item.data()))));
      },
      () => undefined
    ),
  ];

  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
}

export async function activateFirebaseSubscription(currentUser: User, planType: PlanType) {
  if (planType === "free") {
    throw new Error("Select a premium plan before activating a subscription.");
  }

  const db = getRequiredFirestore();
  const now = new Date();
  const startedAt = now.toISOString();
  const endsAt = new Date(now.getTime() + resolvePlanDurationDays(planType) * 24 * 60 * 60 * 1000).toISOString();
  const subscriptionRef = doc(db, SUBSCRIPTIONS_COLLECTION, currentUser.id);
  const userRef = doc(db, USERS_COLLECTION, currentUser.id);
  const subscription: AppSubscription = {
    id: subscriptionRef.id,
    userId: currentUser.id,
    planType,
    status: "active",
    startedAt,
    endsAt,
    autoRenew: true,
  };

  const batch = writeBatch(db);
  batch.set(subscriptionRef, subscription, { merge: true });
  batch.set(
    userRef,
    {
      planType,
      updatedAt: startedAt,
    },
    { merge: true }
  );
  await batch.commit();

  return {
    subscription,
    user: {
      ...currentUser,
      planType,
    },
  };
}

export async function createFirebaseReelBoost(currentUser: User, reel: Reel, plan: ReelBoostPlan) {
  if (reel.userId !== currentUser.id) {
    throw new Error("You can only boost reels from your own profile.");
  }

  const db = getRequiredFirestore();
  const existingBoostSnapshot = await getDocs(
    query(collection(db, REEL_BOOSTS_COLLECTION), where("reelId", "==", reel.id), limit(40))
  );
  const hasActiveBoost = existingBoostSnapshot.docs
    .map((item) => normalizeBoostDoc(item.id, item.data()))
    .some((item) => item.status === "active");

  if (hasActiveBoost) {
    throw new Error("This reel already has an active boost running.");
  }

  const boostRef = doc(collection(db, REEL_BOOSTS_COLLECTION));
  const now = new Date();
  const endsAt = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
  const boost: ReelBoostCampaign = {
    id: boostRef.id,
    reelId: reel.id,
    userId: currentUser.id,
    planId: plan.id,
    planTitle: plan.title,
    amountUsd: plan.budgetUsd,
    estimatedViews: plan.estimatedViews,
    estimatedReach: plan.estimatedReach,
    status: "active",
    startedAt: now.toISOString(),
    endsAt: endsAt.toISOString(),
    targetAudience: currentUser.headline || "Short-form viewers who engage with creator-led content.",
    note: "Your ad campaign is live and pushing this reel to more high-fit viewers now.",
  };
  const nextReel: Reel = {
    ...reel,
    viewCount: reel.viewCount + plan.estimatedViews,
    reachCount: reel.reachCount + plan.estimatedReach,
  };
  const batch = writeBatch(db);

  batch.set(boostRef, boost);
  batch.set(
    doc(db, REELS_COLLECTION, reel.id),
    {
      viewCount: nextReel.viewCount,
      reachCount: nextReel.reachCount,
    },
    { merge: true }
  );
  await batch.commit();

  return {
    boost,
    reel: nextReel,
  };
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

function resolvePlanDurationDays(planType: PlanType) {
  if (planType === "weekly") {
    return 7;
  }

  if (planType === "monthly") {
    return 30;
  }

  if (planType === "yearly") {
    return 365;
  }

  return 0;
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
