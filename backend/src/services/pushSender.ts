import admin from "firebase-admin";
import type { Firestore } from "firebase-admin/firestore";
import { getFirebaseAdminApp } from "./firebaseService";

const EXPO_PUSH_API_URL = "https://exp.host/--/api/v2/push/send";
export const ACTIVITY_CHANNEL_ID = "pulseora-social";
export const CALLS_CHANNEL_ID = "sohba-calls";
const DEVICE_PUSH_TOKENS_COLLECTION = "devicePushTokens";

export interface PushTarget {
  /** Firestore document id of the stored token, so dead tokens can be cleaned up. */
  docId: string;
  token: string;
  provider: "fcm" | "expo";
}

export interface PushPayload {
  title: string;
  body?: string;
  data: Record<string, string | undefined>;
  /** Calls ring on their own high-priority channel and expire quickly. */
  urgent?: boolean;
}

export function readPushTargets(docs: Array<{ id: string; data: () => Record<string, unknown> }>): PushTarget[] {
  const seen = new Set<string>();
  const targets: PushTarget[] = [];
  for (const item of docs) {
    const data = item.data();
    const token = typeof data.token === "string" ? data.token.trim() : "";
    if (!token || seen.has(token)) {
      continue;
    }
    seen.add(token);
    const isExpo = /^(Exponent|Expo)PushToken\[.+\]$/.test(token);
    targets.push({ docId: item.id, token, provider: data.provider === "fcm" || !isExpo ? "fcm" : "expo" });
  }
  return targets;
}

/**
 * Sends a notification to phones. Android tokens from Firebase Cloud Messaging are sent directly with
 * the Firebase Admin SDK (no third-party service involved); older Expo tokens still go through Expo.
 * Returns how many phones accepted the message.
 */
export async function sendPush(db: Firestore, targets: PushTarget[], payload: PushPayload) {
  if (targets.length === 0) {
    return 0;
  }
  const data = Object.fromEntries(
    Object.entries(payload.data).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1] !== "")
  );
  const channelId = payload.urgent ? CALLS_CHANNEL_ID : ACTIVITY_CHANNEL_ID;
  let delivered = 0;
  const deadDocIds: string[] = [];

  const fcmTargets = targets.filter((target) => target.provider === "fcm");
  const app = getFirebaseAdminApp();
  if (fcmTargets.length > 0 && app) {
    for (let index = 0; index < fcmTargets.length; index += 500) {
      const batch = fcmTargets.slice(index, index + 500);
      try {
        const response = await admin.messaging(app).sendEachForMulticast({
          tokens: batch.map((target) => target.token),
          notification: { title: payload.title, ...(payload.body ? { body: payload.body } : {}) },
          data,
          android: {
            priority: "high",
            ttl: payload.urgent ? 45_000 : 24 * 60 * 60 * 1000,
            notification: {
              channelId,
              sound: "default",
              defaultVibrateTimings: true,
              ...(payload.urgent ? { visibility: "public" as const, priority: "max" as const } : {}),
            },
          },
        });
        response.responses.forEach((result, position) => {
          if (result.success) {
            delivered += 1;
            return;
          }
          const code = result.error?.code ?? "";
          if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") {
            deadDocIds.push(batch[position].docId);
          }
        });
      } catch (error) {
        console.error("FCM push failed.", error);
      }
    }
  }

  const expoTargets = targets.filter((target) => target.provider === "expo");
  for (let index = 0; index < expoTargets.length; index += 100) {
    const batch = expoTargets.slice(index, index + 100);
    try {
      const response = await fetch(EXPO_PUSH_API_URL, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(
          batch.map((target) => ({
            to: target.token,
            sound: "default",
            title: payload.title,
            ...(payload.body ? { body: payload.body } : {}),
            data,
            channelId,
            priority: "high",
            ...(payload.urgent ? { ttl: 45 } : {}),
          }))
        ),
      });
      if (!response.ok) {
        continue;
      }
      const result = (await response.json()) as { data?: Array<{ status?: string; details?: { error?: string } }> };
      (result.data ?? []).forEach((ticket, position) => {
        if (ticket.status === "ok") {
          delivered += 1;
        } else if (ticket.details?.error === "DeviceNotRegistered") {
          deadDocIds.push(batch[position].docId);
        }
      });
    } catch (error) {
      console.error("Expo push failed.", error);
    }
  }

  if (deadDocIds.length > 0) {
    await Promise.allSettled(deadDocIds.map((docId) => db.collection(DEVICE_PUSH_TOKENS_COLLECTION).doc(docId).delete()));
  }

  return delivered;
}
