import {
  createReelBoost,
  getActiveBoostForReel,
  getReelById,
  getSubscriptionForUser,
  getUserById,
  setSubscription,
} from "../data/mockDb";
import { getFirestore } from "./firebaseService";
import { PlanType, Reel, ReelBoostCampaign, ReelBoostPlanId, Subscription, User } from "../types/models";

const USERS_COLLECTION = "users";
const REELS_COLLECTION = "reels";
const SUBSCRIPTIONS_COLLECTION = "subscriptions";
const REEL_BOOSTS_COLLECTION = "reelBoosts";
const NOTIFICATIONS_COLLECTION = "notifications";

type PaidPlanType = Exclude<PlanType, "free">;

const boostPlans: Record<
  ReelBoostPlanId,
  {
    id: ReelBoostPlanId;
    title: string;
    budgetUsd: number;
    estimatedViews: number;
    estimatedReach: number;
    durationDays: number;
  }
> = {
  starter: {
    id: "starter",
    title: "Starter Push",
    budgetUsd: 5,
    estimatedViews: 1200,
    estimatedReach: 5000,
    durationDays: 2,
  },
  growth: {
    id: "growth",
    title: "Growth Burst",
    budgetUsd: 15,
    estimatedViews: 4800,
    estimatedReach: 18000,
    durationDays: 5,
  },
  viral: {
    id: "viral",
    title: "Viral Blast",
    budgetUsd: 35,
    estimatedViews: 14000,
    estimatedReach: 50000,
    durationDays: 7,
  },
};

export async function getBillingUserById(userId: string): Promise<User | undefined> {
  const firestore = getFirestore();
  if (firestore) {
    const snapshot = await firestore.collection(USERS_COLLECTION).doc(userId).get();
    if (snapshot.exists) {
      return normalizeUserDoc(userId, snapshot.data() ?? {});
    }
  }

  return getUserById(userId);
}

export async function getBillingReelById(reelId: string): Promise<Reel | undefined> {
  const firestore = getFirestore();
  if (firestore) {
    const snapshot = await firestore.collection(REELS_COLLECTION).doc(reelId).get();
    if (snapshot.exists) {
      return normalizeReelDoc(reelId, snapshot.data() ?? {});
    }
  }

  return getReelById(reelId);
}

export async function hasActiveBillingBoostForReel(reelId: string) {
  const firestore = getFirestore();
  if (firestore) {
    const snapshot = await firestore.collection(REEL_BOOSTS_COLLECTION).where("reelId", "==", reelId).limit(50).get();
    return snapshot.docs
      .map((item) => normalizeBoostDoc(item.id, item.data() ?? {}))
      .some((boost) => boost.status === "active" && new Date(boost.endsAt).getTime() > Date.now());
  }

  return Boolean(getActiveBoostForReel(reelId));
}

export async function getSubscriptionSnapshotForUser(userId: string): Promise<Subscription | null> {
  const firestore = getFirestore();
  if (firestore) {
    const snapshot = await firestore.collection(SUBSCRIPTIONS_COLLECTION).doc(userId).get();
    if (snapshot.exists) {
      return normalizeSubscriptionDoc(userId, snapshot.data() ?? {});
    }
  }

  return getSubscriptionForUser(userId) ?? null;
}

export async function activateSubscriptionFromStripe(input: {
  userId: string;
  planType: PaidPlanType;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  checkoutSessionId?: string;
}) {
  const firestore = getFirestore();
  if (!firestore) {
    return setSubscription(input.userId, input.planType);
  }

  const now = new Date();
  const startedAt = now.toISOString();
  const endsAt = new Date(now.getTime() + resolvePlanDurationDays(input.planType) * 24 * 60 * 60 * 1000).toISOString();
  const subscriptionRef = firestore.collection(SUBSCRIPTIONS_COLLECTION).doc(input.userId);
  const subscriptionSnapshot = await subscriptionRef.get();
  const existing = subscriptionSnapshot.exists ? normalizeSubscriptionDoc(input.userId, subscriptionSnapshot.data() ?? {}) : null;
  const subscription: Subscription & Record<string, unknown> = {
    id: input.userId,
    userId: input.userId,
    planType: input.planType,
    status: "active",
    stripeCustomerId: input.stripeCustomerId ?? existing?.stripeCustomerId ?? "",
    startedAt,
    endsAt,
    autoRenew: true,
    updatedAt: startedAt,
    stripeSubscriptionId: input.stripeSubscriptionId ?? (subscriptionSnapshot.data()?.stripeSubscriptionId as string | undefined),
    stripePriceId: input.stripePriceId ?? (subscriptionSnapshot.data()?.stripePriceId as string | undefined),
    checkoutSessionId: input.checkoutSessionId ?? (subscriptionSnapshot.data()?.checkoutSessionId as string | undefined),
  };

  const batch = firestore.batch();
  batch.set(subscriptionRef, subscription, { merge: true });
  batch.set(
    firestore.collection(USERS_COLLECTION).doc(input.userId),
    {
      planType: input.planType,
      updatedAt: startedAt,
    },
    { merge: true }
  );
  batch.set(
    firestore.collection(NOTIFICATIONS_COLLECTION).doc(buildDeterministicId(`subscription-${input.userId}-${input.planType}`)),
    {
      id: buildDeterministicId(`subscription-${input.userId}-${input.planType}`),
      userId: input.userId,
      type: "system",
      title: `${capitalize(input.planType)} plan active`,
      body: `Premium access is live until ${endsAt}.`,
      createdAt: startedAt,
    },
    { merge: true }
  );
  await batch.commit();

  return normalizeSubscriptionDoc(input.userId, subscription);
}

export async function cancelSubscriptionFromStripe(input: {
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
}) {
  const firestore = getFirestore();
  if (!firestore) {
    return null;
  }

  let snapshot =
    input.stripeSubscriptionId
      ? (await firestore
          .collection(SUBSCRIPTIONS_COLLECTION)
          .where("stripeSubscriptionId", "==", input.stripeSubscriptionId)
          .limit(1)
          .get()).docs[0]
      : undefined;

  if (!snapshot && input.stripeCustomerId) {
    snapshot = (
      await firestore.collection(SUBSCRIPTIONS_COLLECTION).where("stripeCustomerId", "==", input.stripeCustomerId).limit(1).get()
    ).docs[0];
  }

  if (!snapshot) {
    return null;
  }

  const current = normalizeSubscriptionDoc(snapshot.id, snapshot.data() ?? {});
  const endedAt = new Date().toISOString();
  const batch = firestore.batch();

  batch.set(
    snapshot.ref,
    {
      status: "inactive",
      autoRenew: false,
      endsAt: current.endsAt ?? endedAt,
      updatedAt: endedAt,
    },
    { merge: true }
  );
  batch.set(
    firestore.collection(USERS_COLLECTION).doc(current.userId),
    {
      planType: "free",
      updatedAt: endedAt,
    },
    { merge: true }
  );
  batch.set(
    firestore.collection(NOTIFICATIONS_COLLECTION).doc(buildDeterministicId(`subscription-cancel-${current.userId}`)),
    {
      id: buildDeterministicId(`subscription-cancel-${current.userId}`),
      userId: current.userId,
      type: "system",
      title: "Subscription ended",
      body: "Premium renewal has stopped on your ViraFlow account.",
      createdAt: endedAt,
    },
    { merge: true }
  );
  await batch.commit();

  return {
    ...current,
    status: "inactive" as const,
  };
}

export async function activateReelBoostFromStripe(input: {
  userId: string;
  reelId: string;
  planId: ReelBoostPlanId;
  paymentIntentId?: string;
  checkoutSessionId?: string;
}) {
  const reel = await getBillingReelById(input.reelId);
  if (!reel) {
    throw new Error("Reel not found.");
  }

  if (reel.userId !== input.userId) {
    throw new Error("You can only boost your own reels.");
  }

  const firestore = getFirestore();
  const plan = boostPlans[input.planId];
  if (!plan) {
    throw new Error("Boost plan not found.");
  }

  if (!firestore) {
    const result = createReelBoost(
      input.userId,
      input.reelId,
      input.planId,
      (await getBillingUserById(input.userId))?.headline || "Short-form viewers who engage with creator-led content."
    );
    if (!result) {
      throw new Error("Boost plan not found.");
    }

    return result;
  }

  const boostId = buildDeterministicId(
    input.checkoutSessionId || input.paymentIntentId || `${input.userId}-${input.reelId}-${input.planId}`
  );
  const boostRef = firestore.collection(REEL_BOOSTS_COLLECTION).doc(boostId);
  const existingBoostSnapshot = await boostRef.get();
  if (existingBoostSnapshot.exists) {
    const existingBoost = normalizeBoostDoc(boostId, existingBoostSnapshot.data() ?? {});
    return {
      boost: existingBoost,
      reel,
    };
  }

  if (await hasActiveBillingBoostForReel(input.reelId)) {
    throw new Error("This reel already has an active boost running.");
  }

  const user = await getBillingUserById(input.userId);
  const now = new Date();
  const startedAt = now.toISOString();
  const endsAt = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000).toISOString();
  const boost: ReelBoostCampaign & Record<string, unknown> = {
    id: boostId,
    reelId: input.reelId,
    userId: input.userId,
    planId: input.planId,
    planTitle: plan.title,
    amountUsd: plan.budgetUsd,
    estimatedViews: plan.estimatedViews,
    estimatedReach: plan.estimatedReach,
    status: "active",
    startedAt,
    endsAt,
    targetAudience: user?.headline || "Short-form viewers who engage with creator-led content.",
    note: "Your ad campaign is live and pushing this reel to more high-fit viewers now.",
    stripeCheckoutSessionId: input.checkoutSessionId,
    stripePaymentIntentId: input.paymentIntentId,
  };
  const nextReel: Reel & Record<string, unknown> = {
    ...reel,
    viewCount: reel.viewCount + plan.estimatedViews,
    reachCount: reel.reachCount + plan.estimatedReach,
  };
  const batch = firestore.batch();

  batch.set(boostRef, boost, { merge: true });
  batch.set(
    firestore.collection(REELS_COLLECTION).doc(reel.id),
    {
      viewCount: nextReel.viewCount,
      reachCount: nextReel.reachCount,
      updatedAt: startedAt,
    },
    { merge: true }
  );
  batch.set(
    firestore.collection(NOTIFICATIONS_COLLECTION).doc(buildDeterministicId(`boost-${boostId}`)),
    {
      id: buildDeterministicId(`boost-${boostId}`),
      userId: input.userId,
      type: "boost",
      title: `${plan.title} boost is live`,
      body: `${plan.estimatedViews.toLocaleString()} extra views and ${plan.estimatedReach.toLocaleString()} extra reach are now running for this reel.`,
      entityType: "reel",
      entityId: input.reelId,
      createdAt: startedAt,
    },
    { merge: true }
  );
  await batch.commit();

  return {
    boost: normalizeBoostDoc(boostId, boost),
    reel: normalizeReelDoc(reel.id, nextReel),
  };
}

function normalizeUserDoc(id: string, data: Record<string, unknown>): User {
  const username = readString(data.username, id).replace(/\s+/g, "").toLowerCase();

  return {
    id,
    name: readString(data.name, "ViraFlow Creator"),
    username,
    email: readString(data.email, `${username}@viraflow.app`),
    passwordHash: readString(data.passwordHash, ""),
    profileImage: readString(
      data.profileImage,
      "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=400&q=80"
    ),
    bio: readString(data.bio, "New creator on ViraFlow."),
    headline: readString(data.headline, "Creator in progress"),
    language: normalizeLanguage(readString(data.language, "en")),
    createdAt: readString(data.createdAt, new Date().toISOString()),
  };
}

function normalizeReelDoc(id: string, data: Record<string, unknown>): Reel {
  return {
    id,
    userId: readString(data.userId, ""),
    videoUrl: readString(data.videoUrl, ""),
    caption: readString(data.caption, "New ViraFlow reel"),
    thumbnailUrl: readString(
      data.thumbnailUrl,
      "https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?auto=format&fit=crop&w=1000&q=80"
    ),
    likedBy: readStringArray(data.likedBy),
    repostCount: readNumber(data.repostCount, 0),
    viewCount: readNumber(data.viewCount, 0),
    reachCount: readNumber(data.reachCount, 0),
    createdAt: readString(data.createdAt, new Date().toISOString()),
  };
}

function normalizeSubscriptionDoc(id: string, data: Record<string, unknown>): Subscription {
  return {
    id,
    userId: readString(data.userId, id),
    planType: normalizePlanType(readString(data.planType, "free")),
    status: normalizeSubscriptionStatus(readString(data.status, "inactive")),
    stripeCustomerId: readString(data.stripeCustomerId, ""),
    startedAt: readString(data.startedAt, new Date().toISOString()),
    endsAt: readString(data.endsAt, new Date().toISOString()),
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
    status: normalizeBoostStatus(readString(data.status, "active"), readString(data.endsAt, new Date().toISOString())),
    startedAt: readString(data.startedAt, new Date().toISOString()),
    endsAt: readString(data.endsAt, new Date().toISOString()),
    targetAudience: readString(data.targetAudience, "Creator-led short-form viewers"),
    note: readString(data.note, "Your reel is being amplified."),
  };
}

function resolvePlanDurationDays(planType: PaidPlanType) {
  if (planType === "weekly") {
    return 7;
  }

  if (planType === "monthly") {
    return 30;
  }

  return 365;
}

function buildDeterministicId(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 120);
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeLanguage(value: string): User["language"] {
  if (value === "ar" || value === "fr" || value === "es") {
    return value;
  }

  return "en";
}

function normalizePlanType(value: string): Subscription["planType"] {
  if (value === "weekly" || value === "monthly" || value === "yearly") {
    return value;
  }

  return "free";
}

function normalizeSubscriptionStatus(value: string): Subscription["status"] {
  if (value === "active" || value === "trial") {
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

function normalizeBoostStatus(value: string, endsAt: string): ReelBoostCampaign["status"] {
  if (value === "completed") {
    return value;
  }

  return new Date(endsAt).getTime() <= Date.now() ? "completed" : "active";
}
