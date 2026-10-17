import { getPublicEnv } from "./publicEnv";
import { LanguageOption, RegisterPayload, User } from "../types/models";
import { normalizeUsernameInput } from "../utils/profileValidation";
import { DEFAULT_PROFILE_IMAGE } from "../data/defaultMedia";

const SUPABASE_URL = getPublicEnv("EXPO_PUBLIC_SUPABASE_URL").replace(/\/$/, "");
const SUPABASE_ANON_KEY = getPublicEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY");

interface SupabaseAuthResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  user?: SupabaseUser;
}

interface SupabaseUser {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
    full_name?: string;
    username?: string;
    avatar_url?: string;
    picture?: string;
  };
}

export interface SupabaseProfileSession {
  token: string;
  refreshToken?: string;
  expiresAt?: number;
  user: User;
}

export function isSupabaseAuthConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export async function registerWithSupabaseProfile(
  payload: RegisterPayload,
  language: LanguageOption | null
): Promise<SupabaseProfileSession> {
  const username = normalizeUsernameInput(payload.username);
  const response = await supabaseRequest<SupabaseAuthResponse>("/auth/v1/signup", {
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
    data: {
      name: payload.name.trim(),
      username,
      language: language ?? "en",
    },
  });

  return buildSupabaseProfileSession(response, {
    name: payload.name,
    username,
    email: payload.email,
    language,
  });
}

export async function loginWithSupabaseProfile(email: string, password: string): Promise<SupabaseProfileSession> {
  const response = await supabaseRequest<SupabaseAuthResponse>("/auth/v1/token?grant_type=password", {
    email: email.trim().toLowerCase(),
    password,
  });

  return buildSupabaseProfileSession(response, {
    email,
    language: "en",
  });
}

export async function refreshSupabaseProfileSession(refreshToken: string): Promise<Omit<SupabaseProfileSession, "user"> | null> {
  if (!refreshToken.trim() || !isSupabaseAuthConfigured()) {
    return null;
  }

  const response = await supabaseRequest<SupabaseAuthResponse>("/auth/v1/token?grant_type=refresh_token", {
    refresh_token: refreshToken,
  });

  if (!response.access_token) {
    return null;
  }

  return {
    token: response.access_token,
    refreshToken: response.refresh_token ?? refreshToken,
    expiresAt: resolveExpiresAt(response),
  };
}

export async function logoutFromSupabaseProfile(token: string | undefined) {
  if (!token || !isSupabaseAuthConfigured()) {
    return;
  }

  await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
    method: "POST",
    headers: buildSupabaseHeaders(token),
  }).catch(() => undefined);
}

export function getSupabaseProfileErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Supabase account action failed. Please try again.";
}

async function supabaseRequest<T>(path: string, body: unknown): Promise<T> {
  if (!isSupabaseAuthConfigured()) {
    throw new Error("Supabase Auth is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.");
  }

  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method: "POST",
    headers: buildSupabaseHeaders(),
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as T & {
    error_description?: string;
    error?: string;
    msg?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error_description ?? payload.msg ?? payload.error ?? `Supabase request failed with ${response.status}.`);
  }

  return payload;
}

function buildSupabaseHeaders(token?: string) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token ?? SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  };
}

function buildSupabaseProfileSession(
  response: SupabaseAuthResponse,
  fallback: {
    name?: string;
    username?: string;
    email: string;
    language: LanguageOption | null;
  }
): SupabaseProfileSession {
  if (!response.access_token || !response.user?.id) {
    throw new Error("Supabase sign-up requires email confirmation before the app can start a session.");
  }

  return {
    token: response.access_token,
    refreshToken: response.refresh_token,
    expiresAt: resolveExpiresAt(response),
    user: mapSupabaseUserToMobile(response.user, fallback),
  };
}

function mapSupabaseUserToMobile(
  user: SupabaseUser,
  fallback: {
    name?: string;
    username?: string;
    email: string;
    language: LanguageOption | null;
  }
): User {
  const email = user.email ?? fallback.email.trim().toLowerCase();
  const metadata = user.user_metadata ?? {};
  const usernameSeed = metadata.username ?? fallback.username ?? email.split("@")[0] ?? user.id;

  return {
    id: user.id,
    name: metadata.name ?? metadata.full_name ?? fallback.name?.trim() ?? "Sohba Creator",
    username: normalizeUsernameInput(usernameSeed) || `creator${Date.now()}`,
    email,
    profileImage: metadata.avatar_url ?? metadata.picture ?? DEFAULT_PROFILE_IMAGE,
    bio: "New creator on Sohba.",
    headline: "Creator in progress",
    website: "",
    language: fallback.language ?? "en",
    planType: "free",
    followers: [],
    following: [],
    reelIds: [],
    productIds: [],
  };
}

function resolveExpiresAt(response: SupabaseAuthResponse) {
  return response.expires_at ?? (response.expires_in ? Math.floor(Date.now() / 1000) + response.expires_in : undefined);
}
