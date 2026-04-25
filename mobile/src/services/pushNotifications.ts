import { Platform } from "react-native";
import { doc, setDoc } from "firebase/firestore";
import { getFirebaseClientFirestore, isFirebaseClientConfigured } from "./firebaseClient";
import { buildNotificationNavigationData } from "./notificationRouting";
import { getPublicEnv } from "./publicEnv";
import { AppNotification, PushNotificationsStatus } from "../types/models";

const DEVICE_PUSH_TOKENS_COLLECTION = "devicePushTokens";
const ANDROID_CHANNEL_ID = "pulseora-social";

let notificationHandlerConfigured = false;

function getExpoConstants() {
  try {
    return require("expo-constants").default as typeof import("expo-constants").default;
  } catch {
    return null;
  }
}

function getExpoDevice() {
  try {
    return require("expo-device") as typeof import("expo-device");
  } catch {
    return null;
  }
}

function getExpoNotifications() {
  try {
    return require("expo-notifications") as typeof import("expo-notifications");
  } catch {
    return null;
  }
}

export const DEFAULT_PUSH_NOTIFICATIONS_STATUS: PushNotificationsStatus = {
  mode: "unavailable",
  permissionStatus: "undetermined",
  message: "Push notifications are not connected yet.",
};

export async function registerForPushNotificationsAsync(userId: string): Promise<PushNotificationsStatus> {
  const Device = getExpoDevice();
  const Notifications = getExpoNotifications();
  configureNotificationHandler();

  if (!Notifications) {
    return {
      mode: "local",
      permissionStatus: "undetermined",
      message: "Notifications are unavailable in this build, but the rest of Pulseora will keep working.",
    };
  }

  if (!isFirebaseClientConfigured()) {
    return {
      mode: "unavailable",
      permissionStatus: "undetermined",
      message: "Firebase must be configured before notifications can be registered.",
    };
  }

  if (!Device?.isDevice) {
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
      message: "Notification permission is turned off for Pulseora.",
    };
  }

  const projectId = readExpoProjectId();
  if (!projectId) {
    return {
      mode: "local",
      permissionStatus,
      message: "Local notifications are ready. Add EXPO_PUBLIC_EXPO_PROJECT_ID to enable remote push.",
    };
  }

  if (Platform.OS === "android" && !hasAndroidGoogleServicesConfig()) {
    return {
      mode: "local",
      permissionStatus,
      message: "Local notifications are ready. Add google-services.json to the project root and rebuild Android to enable remote push.",
    };
  }

  return {
    ...(await registerRemotePush(userId, projectId, permissionStatus)),
  };
}

export async function scheduleLocalNotificationFromAppNotification(notification: AppNotification) {
  const Notifications = getExpoNotifications();
  if (!Notifications) {
    return;
  }

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

function readExpoProjectId() {
  return getPublicEnv("EXPO_PUBLIC_EXPO_PROJECT_ID") || "";
}

function hasAndroidGoogleServicesConfig() {
  const Constants = getExpoConstants();
  if (!Constants) {
    return false;
  }

  const constants = Constants as typeof Constants & {
    manifest?: { extra?: Record<string, unknown> };
    manifest2?: { extra?: Record<string, unknown> };
  };

  const extra =
    constants.expoConfig?.extra ??
    constants.manifest2?.extra ??
    constants.manifest?.extra ??
    {};

  const buildFlags = extra.buildFlags;
  if (!buildFlags || typeof buildFlags !== "object") {
    return false;
  }

  return Boolean((buildFlags as Record<string, unknown>).androidGoogleServicesConfigured);
}

async function registerRemotePush(
  userId: string,
  projectId: string,
  permissionStatus: PushNotificationsStatus["permissionStatus"]
): Promise<PushNotificationsStatus> {
  const Notifications = getExpoNotifications();
  if (!Notifications) {
    return {
      mode: "local",
      permissionStatus,
      message: "Remote push is unavailable in this build. The app will keep working without it.",
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
  } catch (error) {
    return {
      mode: "local",
      permissionStatus,
      message: buildPushSetupErrorMessage(error),
    };
  }
}

function configureNotificationHandler() {
  if (notificationHandlerConfigured) {
    return;
  }

  const Notifications = getExpoNotifications();
  if (!Notifications) {
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
  const Constants = getExpoConstants();
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
      executionEnvironment: String(Constants?.executionEnvironment ?? ""),
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

  const Notifications = getExpoNotifications();
  if (!Notifications) {
    return;
  }

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: "Pulseora social activity",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 120, 250],
    lightColor: "#36E0A1",
    sound: "default",
  });
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

function buildPushSetupErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.toLowerCase().includes("default firebase app")) {
    return "Remote push setup still needs google-services.json added to the project root and a rebuilt Android app.";
  }

  return "Local notifications are ready. Remote push needs google-services.json plus a rebuilt Android app.";
}
