import Constants from "expo-constants";

type PublicEnvRecord = Record<string, string | undefined>;

function readManifestPublicEnv(): PublicEnvRecord {
  const constants = Constants as typeof Constants & {
    manifest?: { extra?: Record<string, unknown> };
    manifest2?: { extra?: Record<string, unknown> };
  };

  const extra =
    constants.expoConfig?.extra ??
    constants.manifest2?.extra ??
    constants.manifest?.extra ??
    {};

  const publicEnv = extra.publicEnv;
  return publicEnv && typeof publicEnv === "object" ? (publicEnv as PublicEnvRecord) : {};
}

const manifestPublicEnv = readManifestPublicEnv();

export function getPublicEnv(key: string) {
  const processEnv = (globalThis as { process?: { env?: PublicEnvRecord } }).process?.env;
  return processEnv?.[key] ?? manifestPublicEnv[key] ?? "";
}

export function getPublicApiBaseUrl() {
  return getPublicEnv("EXPO_PUBLIC_API_BASE_URL").replace(/\/$/, "");
}
