import { createExternalUser, findUserByUsername, getUserById } from "../data/mockDb";
import { User } from "../types/models";

export interface AuthenticatedUserIdentity {
  id: string;
  email?: string;
  name?: string;
  picture?: string;
  username?: string;
}

export function getOrCreateAuthenticatedUser(identity: AuthenticatedUserIdentity): User {
  const existing = getUserById(identity.id);
  if (existing) {
    return existing;
  }

  return createExternalUser({
    id: identity.id,
    name: identity.name ?? "Sohba Creator",
    username: buildAvailableUsername(identity.username ?? identity.email ?? identity.name ?? identity.id, identity.id),
    email: identity.email ?? `${identity.id}@pulseora.app`,
    profileImage: identity.picture,
    language: "en",
  });
}

function buildAvailableUsername(seed: string, userId: string) {
  const base =
    seed
      .split("@")[0]
      .trim()
      .replace(/\s+/g, "")
      .replace(/^@+/, "")
      .toLowerCase()
      .replace(/[^a-z0-9._]/g, "")
      .replace(/^[._]+|[._]+$/g, "")
      .replace(/[._]{2,}/g, "_")
      .slice(0, 20) || `creator${Date.now()}`;

  let candidate = base;
  let suffix = 0;

  while (true) {
    const existing = findUserByUsername(candidate);
    if (!existing || existing.id === userId) {
      return candidate;
    }

    suffix += 1;
    const suffixLabel = String(suffix);
    candidate = `${base.slice(0, Math.max(3, 20 - suffixLabel.length))}${suffixLabel}`;
  }
}
