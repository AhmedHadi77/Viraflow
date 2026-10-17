import { env } from "../config/env";

interface SupabaseUserResponse {
  id?: string;
  email?: string;
  user_metadata?: {
    name?: string;
    full_name?: string;
    avatar_url?: string;
    picture?: string;
    username?: string;
  };
}

export interface VerifiedSupabaseUser {
  id: string;
  email?: string;
  name?: string;
  picture?: string;
  username?: string;
}

export function isSupabaseConfigured() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

export async function verifySupabaseUserToken(token: string | undefined): Promise<VerifiedSupabaseUser | undefined> {
  if (!token || !isSupabaseConfigured()) {
    return undefined;
  }

  try {
    const response = await fetch(`${env.supabaseUrl.replace(/\/$/, "")}/auth/v1/user`, {
      headers: {
        apikey: env.supabaseAnonKey,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return undefined;
    }

    const payload = (await response.json()) as SupabaseUserResponse;
    if (!payload.id) {
      return undefined;
    }

    return {
      id: payload.id,
      email: payload.email,
      name: payload.user_metadata?.name ?? payload.user_metadata?.full_name,
      picture: payload.user_metadata?.avatar_url ?? payload.user_metadata?.picture,
      username: payload.user_metadata?.username,
    };
  } catch {
    return undefined;
  }
}
