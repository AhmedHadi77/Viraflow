import type { firestore as FirestoreNamespace } from "firebase-admin";
import admin from "firebase-admin";
import { env } from "../config/env";
import { getFirebaseAuth, getFirestore } from "./firebaseService";

type Firestore = FirestoreNamespace.Firestore;
type Query = FirestoreNamespace.Query;

const EXPO_PUSH_API_URL = "https://exp.host/--/api/v2/push/send";
const ANDROID_CHANNEL_ID = "pulseora-social";
const SERIES_DAYS = 14;

export class AdminError extends Error {
  constructor(
    message: string,
    public statusCode = 400
  ) {
    super(message);
    this.name = "AdminError";
  }
}

export interface AdminActor {
  id: string;
  email?: string;
  isOwner: boolean;
  isAdmin: boolean;
}

function requireDb(): Firestore {
  const db = getFirestore();
  if (!db) {
    throw new AdminError("Firebase Admin is not configured on the server, so admin tools are unavailable.", 503);
  }
  return db;
}

function ownerEmails() {
  return env.ownerEmails;
}

/**
 * Works out whether the signed-in user is the owner (email listed in OWNER_EMAILS) or an admin.
 * The owner is always kept as an admin in Firestore so the app's own admin checks work too.
 */
export async function resolveAdminActor(user: { id: string; email?: string }): Promise<AdminActor> {
  const db = requireDb();
  const ref = db.collection("users").doc(user.id);
  const snapshot = await ref.get();
  const role = snapshot.get("role");
  const email = (user.email ?? snapshot.get("email") ?? "").toString().trim().toLowerCase();
  const isOwner = Boolean(email) && ownerEmails().includes(email);

  if (isOwner && role !== "admin" && snapshot.exists) {
    await ref.set({ role: "admin", updatedAt: new Date().toISOString() }, { merge: true });
  }

  return { id: user.id, email, isOwner, isAdmin: isOwner || role === "admin" };
}

/** With no OWNER_EMAILS configured, every admin may manage admins (otherwise nobody could). */
export function canManageRoles(actor: AdminActor) {
  return actor.isOwner || (ownerEmails().length === 0 && actor.isAdmin);
}

async function countOf(query: Query) {
  try {
    const snapshot = await query.count().get();
    return snapshot.data().count;
  } catch {
    return 0;
  }
}

function dayKey(value: unknown) {
  const date = new Date(typeof value === "string" || typeof value === "number" ? value : NaN);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : null;
}

async function dailySeries(db: Firestore, collectionName: string, since: string, days: string[]) {
  const counts = new Map(days.map((day) => [day, 0]));
  try {
    const snapshot = await db
      .collection(collectionName)
      .where("createdAt", ">=", since)
      .select("createdAt")
      .limit(20000)
      .get();
    snapshot.docs.forEach((item) => {
      const key = dayKey(item.get("createdAt"));
      if (key && counts.has(key)) {
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    });
  } catch {
    // Missing collection or index: leave zeros.
  }
  return days.map((day) => counts.get(day) ?? 0);
}

export async function getAdminOverview() {
  const db = requireDb();
  const now = Date.now();
  const days = Array.from({ length: SERIES_DAYS }, (_, index) =>
    new Date(now - (SERIES_DAYS - 1 - index) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const since = `${days[0]}T00:00:00.000Z`;
  const last24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    users,
    admins,
    banned,
    newUsers7d,
    posts,
    reels,
    stories,
    products,
    communities,
    directThreads,
    directMessages,
    directMessages24h,
    marketplaceThreads,
    marketplaceMessages,
    orders,
    calls,
    calls7d,
    videoCalls,
    answeredCalls,
    reportsOpen,
    reportsTotal,
    comments,
    postComments,
    pushDevices,
  ] = await Promise.all([
    countOf(db.collection("users")),
    countOf(db.collection("users").where("role", "==", "admin")),
    countOf(db.collection("users").where("isBanned", "==", true)),
    countOf(db.collection("users").where("createdAt", ">=", last7d)),
    countOf(db.collection("posts")),
    countOf(db.collection("reels")),
    countOf(db.collection("stories")),
    countOf(db.collection("products")),
    countOf(db.collection("communities")),
    countOf(db.collection("directThreads")),
    countOf(db.collection("directMessages")),
    countOf(db.collection("directMessages").where("createdAt", ">=", last24h)),
    countOf(db.collection("marketplaceThreads")),
    countOf(db.collection("marketplaceMessages")),
    countOf(db.collection("marketplaceOrders")),
    countOf(db.collection("calls")),
    countOf(db.collection("calls").where("createdAt", ">=", last7d)),
    countOf(db.collection("calls").where("type", "==", "video")),
    countOf(db.collection("calls").where("status", "==", "ended")),
    countOf(db.collection("reports").where("status", "==", "open")),
    countOf(db.collection("reports")),
    countOf(db.collection("comments")),
    countOf(db.collection("postComments")),
    countOf(db.collection("devicePushTokens")),
  ]);

  const [signupSeries, postSeries, reelSeries, messageSeries, callSeries, reportSeries] = await Promise.all([
    dailySeries(db, "users", since, days),
    dailySeries(db, "posts", since, days),
    dailySeries(db, "reels", since, days),
    dailySeries(db, "directMessages", since, days),
    dailySeries(db, "calls", since, days),
    dailySeries(db, "reports", since, days),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      users,
      admins,
      banned,
      newUsers7d,
      posts,
      reels,
      stories,
      products,
      communities,
      chats: directThreads + marketplaceThreads,
      directThreads,
      marketplaceThreads,
      messages: directMessages + marketplaceMessages,
      messages24h: directMessages24h,
      orders,
      calls,
      calls7d,
      videoCalls,
      voiceCalls: Math.max(0, calls - videoCalls),
      completedCalls: answeredCalls,
      reportsOpen,
      reportsTotal,
      comments: comments + postComments,
      pushDevices,
    },
    series: {
      days,
      signups: signupSeries,
      posts: postSeries.map((value, index) => value + reelSeries[index]),
      messages: messageSeries,
      calls: callSeries,
      reports: reportSeries,
    },
  };
}

export async function listRecentCalls(limit = 50) {
  const db = requireDb();
  const snapshot = await db.collection("calls").orderBy("createdAt", "desc").limit(Math.min(200, limit)).get();
  return snapshot.docs.map((item) => {
    const data = item.data();
    return {
      id: item.id,
      callerId: String(data.callerId ?? ""),
      calleeId: String(data.calleeId ?? ""),
      type: data.type === "video" ? "video" : "audio",
      status: String(data.status ?? "ended"),
      createdAt: String(data.createdAt ?? ""),
      durationSeconds: typeof data.durationSeconds === "number" ? data.durationSeconds : undefined,
    };
  });
}

export async function listReports(limit = 200) {
  const db = requireDb();
  const snapshot = await db.collection("reports").orderBy("createdAt", "desc").limit(Math.min(500, limit)).get();
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function setReportStatus(reportId: string, status: "open" | "reviewed" | "resolved") {
  const db = requireDb();
  await db.collection("reports").doc(reportId).set({ status, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function setUserRole(actor: AdminActor, userId: string, role: "admin" | "user") {
  if (!canManageRoles(actor)) {
    throw new AdminError("Only the app owner can choose admins.", 403);
  }
  if (userId === actor.id && role !== "admin") {
    throw new AdminError("You can't remove your own admin access.");
  }
  const db = requireDb();
  const ref = db.collection("users").doc(userId);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new AdminError("User not found.", 404);
  }
  const email = String(snapshot.get("email") ?? "").toLowerCase();
  if (role !== "admin" && ownerEmails().includes(email)) {
    throw new AdminError("The owner account always stays an admin.");
  }
  await ref.set({ role, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function setUserBanned(actor: AdminActor, userId: string, banned: boolean) {
  if (userId === actor.id) {
    throw new AdminError("You can't ban your own account.");
  }
  const db = requireDb();
  const ref = db.collection("users").doc(userId);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new AdminError("User not found.", 404);
  }
  await assertCanActOn(actor, snapshot);
  await ref.set(
    { isBanned: banned, bannedAt: banned ? new Date().toISOString() : null, updatedAt: new Date().toISOString() },
    { merge: true }
  );
  // Banned users are signed out on every device.
  if (banned) {
    await getFirebaseAuth()?.revokeRefreshTokens(userId).catch(() => undefined);
  }
}

async function assertCanActOn(actor: AdminActor, target: FirestoreNamespace.DocumentSnapshot) {
  const email = String(target.get("email") ?? "").toLowerCase();
  if (ownerEmails().includes(email)) {
    throw new AdminError("The owner account can't be changed by admins.", 403);
  }
  if (target.get("role") === "admin" && !actor.isOwner && ownerEmails().length > 0) {
    throw new AdminError("Only the owner can ban or delete another admin.", 403);
  }
}

async function deleteMatching(db: Firestore, query: Query) {
  let removed = 0;
  // Page through in chunks so very active accounts don't hit request limits.
  for (;;) {
    const snapshot = await query.limit(300).get();
    if (snapshot.empty) {
      return removed;
    }
    const batch = db.batch();
    snapshot.docs.forEach((item) => batch.delete(item.ref));
    await batch.commit();
    removed += snapshot.size;
    if (snapshot.size < 300) {
      return removed;
    }
  }
}

async function removeFromArrays(db: Firestore, userId: string, field: "followers" | "following") {
  const snapshot = await db.collection("users").where(field, "array-contains", userId).limit(5000).get();
  for (let index = 0; index < snapshot.docs.length; index += 400) {
    const batch = db.batch();
    snapshot.docs.slice(index, index + 400).forEach((item) =>
      batch.update(item.ref, { [field]: admin.firestore.FieldValue.arrayRemove(userId) })
    );
    await batch.commit();
  }
}

/** Permanently deletes an account: sign-in, profile, and everything the user posted or sent. */
export async function deleteUserAccount(actor: AdminActor, userId: string) {
  if (userId === actor.id) {
    throw new AdminError("You can't delete your own account from the dashboard.");
  }
  const db = requireDb();
  const userRef = db.collection("users").doc(userId);
  const snapshot = await userRef.get();
  if (snapshot.exists) {
    await assertCanActOn(actor, snapshot);
  }

  const byUser = (name: string, field = "userId") => db.collection(name).where(field, "==", userId);
  const byParticipant = (name: string) => db.collection(name).where("participantIds", "array-contains", userId);

  const removed: Record<string, number> = {};
  const jobs: Array<[string, Query]> = [
    ["posts", byUser("posts")],
    ["reels", byUser("reels")],
    ["stories", byUser("stories")],
    ["products", byUser("products")],
    ["comments", byUser("comments")],
    ["postComments", byUser("postComments")],
    ["savedPosts", byUser("savedPosts")],
    ["notifications", byUser("notifications")],
    ["notificationsSent", byUser("notifications", "actorId")],
    ["devicePushTokens", byUser("devicePushTokens")],
    ["reelBoosts", byUser("reelBoosts")],
    ["subscriptions", byUser("subscriptions")],
    ["communities", byUser("communities", "ownerId")],
    ["communityPosts", byUser("communityPosts", "authorId")],
    ["directMessages", byParticipant("directMessages")],
    ["directThreads", byParticipant("directThreads")],
    ["marketplaceMessages", byParticipant("marketplaceMessages")],
    ["marketplaceThreads", byParticipant("marketplaceThreads")],
    ["marketplaceOrders", byParticipant("marketplaceOrders")],
    ["calls", byParticipant("calls")],
    ["reportsFiled", byUser("reports", "reporterId")],
  ];
  for (const [label, query] of jobs) {
    try {
      removed[label] = await deleteMatching(db, query);
    } catch {
      removed[label] = 0;
    }
  }

  await removeFromArrays(db, userId, "followers").catch(() => undefined);
  await removeFromArrays(db, userId, "following").catch(() => undefined);
  await userRef.delete().catch(() => undefined);

  const auth = getFirebaseAuth();
  if (auth) {
    try {
      await auth.deleteUser(userId);
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code !== "auth/user-not-found") {
        throw new AdminError("The profile was removed but the sign-in account could not be deleted. Try again.", 500);
      }
    }
  }

  return removed;
}

/** Sends an announcement to every account: an in-app notification plus a push to each phone. */
export async function broadcastToAllUsers(actor: AdminActor, input: { title: string; body: string }) {
  const db = requireDb();
  const title = input.title.trim().slice(0, 120);
  const body = input.body.trim().slice(0, 240);
  if (!title || !body) {
    throw new AdminError("Add a title and a message.");
  }

  const createdAt = new Date().toISOString();
  const broadcastId = `broadcast-${Date.now()}`;
  const usersSnapshot = await db.collection("users").select("isBanned").get();
  const recipients = usersSnapshot.docs.filter((item) => item.get("isBanned") !== true).map((item) => item.id);

  for (let index = 0; index < recipients.length; index += 400) {
    const batch = db.batch();
    recipients.slice(index, index + 400).forEach((userId) => {
      const ref = db.collection("notifications").doc(`${broadcastId}-${userId}`);
      batch.set(ref, {
        id: ref.id,
        userId,
        type: "system",
        title,
        body,
        actorId: actor.id,
        actorName: "Sohba",
        createdAt,
      });
    });
    await batch.commit();
  }

  const tokenSnapshot = await db.collection("devicePushTokens").get();
  const recipientSet = new Set(recipients);
  const tokens = [
    ...new Set(
      tokenSnapshot.docs
        .filter((item) => recipientSet.has(String(item.get("userId") ?? "")))
        .map((item) => String(item.get("token") ?? ""))
        .filter((token) => /^(Exponent|Expo)PushToken\[.+\]$/.test(token))
    ),
  ];

  let pushed = 0;
  for (let index = 0; index < tokens.length; index += 100) {
    const messages = tokens.slice(index, index + 100).map((to) => ({
      to,
      sound: "default",
      title,
      body,
      data: { type: "system" },
      channelId: ANDROID_CHANNEL_ID,
    }));
    try {
      const response = await fetch(EXPO_PUSH_API_URL, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(messages),
      });
      if (response.ok) {
        pushed += messages.length;
      }
    } catch {
      // Keep going: in-app notifications are already saved.
    }
  }

  await db.collection("adminBroadcasts").doc(broadcastId).set({
    title,
    body,
    sentBy: actor.id,
    recipients: recipients.length,
    pushed,
    createdAt,
  });

  return { recipients: recipients.length, pushed };
}

export async function listBroadcasts(limit = 20) {
  const db = requireDb();
  const snapshot = await db.collection("adminBroadcasts").orderBy("createdAt", "desc").limit(limit).get();
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}
