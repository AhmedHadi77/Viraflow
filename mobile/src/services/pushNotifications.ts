import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { collection, doc, getDocs, limit, query, setDoc, where } from "firebase/firestore";
import { getFirebaseClientFirestore, isFirebaseClientConfigured } from "./firebaseClient";
import { buildNotificationNavigationData } from "./notificationRouting";
import { AppNotification, PushNotificationsStatus } from "../types/models";

const DEVICE_PUSH_TOKENS_COLLECTION = "devicePushTokens";
const EXPO_PUSH_API_URL = "https://exp.host/--/api/v2/push/send";
const ANDROID_CHANNEL_ID = "viraflow-social";

let notificationHandlerConfigured = false;

export const DEFAULT_PUSH_NOTIFICATIONS_STATUS: PushNotificationsStatus = {
  mode: "unavailable",
  permissionStatus: "undetermined",
  message: "Notifications are not connected yet.",
};

export async function registerForPushNotificationsAsync(userId: string): Promise<PushNotificationsStatus> {
  configureNotificationHandler();

  if (!isFirebaseClientConfigured()) {
    return {
      mode: "unavailable",
      permissionStatus: "undetermined",
      message: "Firebase must be configured before notifications can be registered.",
    };
  }

  if (!Device.isDevice) {
    return {
      mode: "unavailable",
      permissionStatus: "undetermined",
      message: "Push notifications need a real phone. Simulators only support limited testing.",
    };
  }

  await ensureAndroidNotificationChannel();

  const existingPermissions = await Notifications.getPermissionsAsync();
  let permissionStatus = normalizePermissionStatus(existingPermissions.status);

  if (permissionStatus !== "granted") {
    const requestedPermissions = await Notifications.requestPermissionsAsync();
    permissionStatus = normalizePermissionStatus(requestedPermissions.status);
  }

  if (permissionStatus !== "granted") {
    return {
      mode: "unavailable",
      permissionStatus,
      message: "Notification permission is turned off for ViraFlow.",
    };
  }

  const projectId = readExpoProjectId();
  if (!projectId) {
    return {
      mode: "local",
      permissionStatus,
      message: "Local notifications are ready. Add EXPO_PUBLIC_EXPO_PROJECT_ID and use a development build to enable remote push.",
    };
  }

  try {
    const pushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await saveDevicePushToken(userId, pushToken, projectId);

    return {
      mode: "remote",
      permissionStatus,
      token: pushToken,
      message: "Remote push notifications are connected on this device.",
    };
  } catch {
    return {
      mode: "local",
      permissionStatus,
      message: "Local notifications are ready in this build. Remote push will work after you run a development build with your Expo project ID.",
    };
  }
}

export async function sendPushNotificationToUser(userId: string, notification: AppNotification) {
  const db = getFirebaseClientFirestore();
  if (!db || !userId.trim()) {
    return 0;
  }

  const snapshot = await getDocs(
    query(collection(db, DEVICE_PUSH_TOKENS_COLLECTION), where("userId", "==", userId.trim()), limit(12))
  );
  const tokens = snapshot.docs
    .map((item) => readPushToken(item.data().token))
    .filter((token): token is string => Boolean(token));

  if (tokens.length === 0) {
    return 0;
  }

  const messages = tokens.map((token) => ({
    to: token,
    sound: "default",
    title: notification.title,
    body: notification.body,
    data: buildNotificationNavigationData(notification),
    channelId: ANDROID_CHANNEL_ID,
  }));

  const response = await fetch(EXPO_PUSH_API_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    throw new Error("Expo Push API could not deliver this notification.");
  }

  return tokens.length;
}

export async function scheduleLocalNotificationFromAppNotification(notification: AppNotification) {
  configureNotificationHandler();
  await ensureAndroidNotificationChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: notification.title,
      body: notification.body,
      data: buildNotificationNavigationData(notification),
      sound: "default",
    },
    trigger: null,
  });
}

function configureNotificationHandler() {
  if (notificationHandlerConfigured) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  notificationHandlerConfigured = true;
}

async function saveDevicePushToken(userId: string, token: string, projectId: string) {
  const db = getFirebaseClientFirestore();
  if (!db) {
    throw new Error("Firestore is not configured. Add the EXPO_PUBLIC_FIREBASE_* values to mobile/.env.");
  }

  const tokenRef = doc(db, DEVICE_PUSH_TOKENS_COLLECTION, normalizePushTokenId(userId, token));
  const now = new Date().toISOString();

  await setDoc(
    tokenRef,
    {
      id: tokenRef.id,
      userId: userId.trim(),
      token: token.trim(),
      platform: Platform.OS,
      projectId,
      executionEnvironment: String(Constants.executionEnvironment ?? ""),
      updatedAt: now,
      createdAt: now,
    },
    { merge: true }
  );
}

async function ensureAndroidNotificationChannel() {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: "ViraFlow social activity",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 120, 250],
    lightColor: "#36E0A1",
    sound: "default",
  });
}

function readExpoProjectId() {
  return (
    getPublicEnv("EXPO_PUBLIC_EXPO_PROJECT_ID") ||
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId ||
    ""
  );
}

function getPublicEnv(key: string) {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[key] ?? "";
}

function normalizePushTokenId(userId: string, token: string) {
  return `${userId.trim().toLowerCase()}-${token.trim().toLowerCase()}`
    .replace(/[^a-z0-9_-]/g, "-")
    .slice(0, 150);
}

function normalizePermissionStatus(value: string): PushNotificationsStatus["permissionStatus"] {
  if (value === "granted" || value === "denied") {
    return value;
  }

  return "undetermined";
}

function readPushToken(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
