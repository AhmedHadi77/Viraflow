const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: "./mobile/.env" });

const mobileConfig = require("./mobile/app.json");
const googleServicesFilePath = "./google-services.json";
const hasGoogleServicesFile = fs.existsSync(path.join(__dirname, "google-services.json"));
const buildProfile = process.env.EAS_BUILD_PROFILE || "";
const isDevelopmentBuild = buildProfile === "development";

const publicEnvDefaults = {
  EXPO_PUBLIC_API_BASE_URL: "https://viraflow-srrs.onrender.com/api",
  EXPO_PUBLIC_EXPO_PROJECT_ID: "5b092319-feb6-4192-ad07-212af0d60885",
  EXPO_PUBLIC_FIREBASE_API_KEY: "AIzaSyAljVqvu5c2cq9m9uTBuvQZ1oYFFjkI5B8",
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: "viraflow-ad4b2.firebaseapp.com",
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: "viraflow-ad4b2",
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: "viraflow-ad4b2.firebasestorage.app",
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "560785384791",
  EXPO_PUBLIC_FIREBASE_APP_ID: "1:560785384791:web:19dedd53ee0b575cae4a12",
};

const publicEnv = Object.fromEntries(
  Object.entries(publicEnvDefaults).map(([key, value]) => [key, process.env[key] || value])
);

const projectId = publicEnv.EXPO_PUBLIC_EXPO_PROJECT_ID || undefined;

module.exports = {
  ...mobileConfig.expo,
  owner: "hadi77",
  android: {
    ...(mobileConfig.expo.android || {}),
    ...(hasGoogleServicesFile ? { googleServicesFile: googleServicesFilePath } : {}),
  },
  extra: {
    ...(mobileConfig.expo.extra || {}),
    publicEnv,
    buildFlags: {
      androidGoogleServicesConfigured: hasGoogleServicesFile,
    },
    eas: {
      ...((mobileConfig.expo.extra && mobileConfig.expo.extra.eas) || {}),
      ...(projectId ? { projectId } : {}),
    },
  },
  plugins: [
    "expo-font",
    "expo-asset",
    "expo-audio",
    "expo-video",
    ...(isDevelopmentBuild
      ? [
          [
            "expo-dev-client",
            {
              launchMode: "launcher",
            },
          ],
        ]
      : []),
    ...(hasGoogleServicesFile
      ? [
          [
            "expo-notifications",
            {
              defaultChannel: "pulseora-social",
              color: "#36E0A1",
            },
          ],
        ]
      : []),
  ],
};
