const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: "./mobile/.env" });

const mobileConfig = require("./mobile/app.json");
const rootGoogleServicesFilePath = "./google-services.json";
const androidGoogleServicesFilePath = "./android/app/google-services.json";
const buildProfile = process.env.EAS_BUILD_PROFILE || "";
const isDevelopmentBuild = buildProfile === "development";
const googleServicesCandidates = [
  {
    configPath: path.join(__dirname, "google-services.json"),
    appConfigPath: rootGoogleServicesFilePath,
  },
  {
    configPath: path.join(__dirname, "android", "app", "google-services.json"),
    appConfigPath: androidGoogleServicesFilePath,
  },
];

const readGoogleServicesConfig = () => {
  for (const candidate of googleServicesCandidates) {
    if (!fs.existsSync(candidate.configPath)) {
      continue;
    }

    const contents = fs.readFileSync(candidate.configPath, "utf8").trim();
    if (!contents) {
      continue;
    }

    try {
      return {
        config: JSON.parse(contents),
        appConfigPath: candidate.appConfigPath,
      };
    } catch {
      continue;
    }
  }

  return null;
};
const googleServicesSource = readGoogleServicesConfig();
const googleServicesConfig = googleServicesSource?.config ?? null;
const googleServicesFilePath = googleServicesSource?.appConfigPath;
const hasGoogleServicesFile = Boolean(googleServicesConfig);
const googleServicesClient =
  googleServicesConfig?.client?.find(
    (client) => client?.client_info?.android_client_info?.package_name === mobileConfig.expo.android?.package
  ) ?? null;
const googleWebClientIdFromServices =
  googleServicesClient?.oauth_client?.find((client) => client?.client_type === 3)?.client_id ?? "";
const googleAndroidClientIdFromServices =
  googleServicesClient?.oauth_client?.find((client) => client?.client_type === 1)?.client_id ?? "";

const publicEnvDefaults = {
  EXPO_PUBLIC_API_BASE_URL: "https://viraflow-srrs.onrender.com/api",
  EXPO_PUBLIC_EXPO_PROJECT_ID: "5b092319-feb6-4192-ad07-212af0d60885",
  EXPO_PUBLIC_FIREBASE_API_KEY: "AIzaSyAljVqvu5c2cq9m9uTBuvQZ1oYFFjkI5B8",
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: "viraflow-ad4b2.firebaseapp.com",
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: "viraflow-ad4b2",
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: "viraflow-ad4b2.firebasestorage.app",
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "560785384791",
  EXPO_PUBLIC_FIREBASE_APP_ID: "1:560785384791:web:19dedd53ee0b575cae4a12",
  EXPO_PUBLIC_SUPABASE_URL: "",
  EXPO_PUBLIC_SUPABASE_ANON_KEY: "",
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID:
    googleWebClientIdFromServices || "560785384791-o7a534ss8l5q3kq619ikv3sn95havitm.apps.googleusercontent.com",
  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: googleAndroidClientIdFromServices,
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
    ...(hasGoogleServicesFile && googleServicesFilePath ? { googleServicesFile: googleServicesFilePath } : {}),
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
    "@react-native-google-signin/google-signin",
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
