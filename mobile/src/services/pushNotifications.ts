import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { doc, setDoc } from "firebase/firestore";
import { getFirebaseClientFirestore, isFirebaseClientConfigured } from "./firebaseClient";
import { buildNotificationNavigationData } from "./notificationRouting";
import { getPublicEnv } from "./publicEnv";
import { AppNotification, PushNotificationsStatus } from "../types/models";

const DEVICE_PUSH_TOKENS_COLLECTION = "devicePushTokens";
const ANDROID_CHANNEL_ID = "pulseora-social";

let notificationHandlerConfigured = false;

export const DEFAULT_PUSH_NOTIFICATIONS_STATUS: PushNotificationsStatus = {
  mode: "unavailable",
  permissionStatus: "undetermined",
  message: "Push notifications are not connected yet.",
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
