// Neutral, brand-colored fallbacks used only when a real record is missing media.
// Avatars are generated from the person's own name (initials), never stock photos of strangers.

const AVATAR_BACKGROUND = "0B2233";
const AVATAR_FOREGROUND = "36E0A1";

export function buildInitialsAvatarUrl(name?: string | null) {
  const initials =
    (name ?? "")
      .trim()
      .split(/\s+/)
      .map((part) => part.replace(/^[^A-Za-z0-9\u00C0-\u024F\u0600-\u06FF]+/, ""))
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "P";

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${AVATAR_BACKGROUND}&color=${AVATAR_FOREGROUND}&size=256&bold=true&format=png`;
}

export const DEFAULT_PROFILE_IMAGE = buildInitialsAvatarUrl("Sohba");

export const MEDIA_UNAVAILABLE_IMAGE =
  "https://placehold.co/900x900/0B2233/36E0A1/png?text=Sohba&font=roboto";
