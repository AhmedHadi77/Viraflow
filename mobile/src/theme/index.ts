import type { ImageStyle, TextStyle, ViewStyle } from "react-native";

export type ThemeMode = "dark" | "light";

export const darkPalette = {
  // Sohba "Daylight" kit (Oct 2026): the app is light by default; this is its dark companion.
  background: "#0b0d12",
  backgroundSoft: "#0f1218",
  backgroundDeep: "#07080c",
  surface: "#151922",
  surfaceMuted: "#181c26",
  surfaceRaised: "#1e2330",
  card: "#151922",
  cardAlt: "#1e2330",
  primary: "#1f5bff",
  primaryDeep: "#1446d6",
  accent: "#ff5c7a",
  accentSoft: "#7aa2ff",
  text: "#f2f4f7",
  textSoft: "#c8ccd4",
  muted: "#a0a6b2",
  mutedSoft: "#7d8492",
  border: "#232835",
  borderStrong: "#333a4a",
  input: "#1e2330",
  danger: "#ff5c5c",
  success: "#22c58b",
  shadow: "rgba(0,0,0,0.38)",
  overlay: "rgba(4,6,10,0.5)",
  glass: "rgba(255,255,255,0.06)",
};

export type Palette = typeof darkPalette;

export const lightPalette: Palette = {
  // Daylight: clean white, cobalt for actions, rose-red for likes and activity.
  background: "#ffffff",
  backgroundSoft: "#f6f7f9",
  backgroundDeep: "#ffffff",
  surface: "#f6f7f9",
  surfaceMuted: "#f3f4f6",
  surfaceRaised: "#eceef2",
  card: "#f6f7f9",
  cardAlt: "#eef0f4",
  primary: "#1f5bff",
  primaryDeep: "#1446d6",
  accent: "#e5294f",
  accentSoft: "#1446d6",
  text: "#0d1117",
  textSoft: "#3b4250",
  muted: "#5b6270",
  mutedSoft: "#6b7280",
  border: "#eceef2",
  borderStrong: "#dadde3",
  input: "#f3f4f6",
  danger: "#d92d20",
  success: "#12a26b",
  shadow: "rgba(13,17,23,0.08)",
  overlay: "rgba(13,17,23,0.40)",
  glass: "rgba(13,17,23,0.04)",
};

// `palette` is mutated in place when the theme changes, so code that reads palette.x while
// rendering always gets the active theme. Screens that must always stay dark (full-screen video)
// import `darkPalette` instead.
export const palette: Palette = { ...lightPalette };

let currentMode: ThemeMode = "light";

export function getThemeMode() {
  return currentMode;
}

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

export const radii = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
};

/* Typography: Manrope throughout; heavier weights carry the titles. */
export const fonts = {
  regular: "Manrope_400Regular",
  medium: "Manrope_500Medium",
  semibold: "Manrope_600SemiBold",
  bold: "Manrope_700Bold",
  display: "Manrope_800ExtraBold",
  displayHeavy: "Manrope_800ExtraBold",
};

let customFontsEnabled = true;

/** Turns the custom fonts off (used if they fail to load, so text never disappears). */
export function setCustomFontsEnabled(enabled: boolean) {
  customFontsEnabled = enabled;
}

/** Picks the font file for a text style from its size and weight. */
export function fontFamilyFor(fontSize: number | undefined, fontWeight: string | number | undefined) {
  const weight = Number(fontWeight ?? 400) || 400;
  if ((fontSize ?? 0) >= 20 && weight >= 700) {
    return (fontSize ?? 0) >= 28 && weight >= 800 ? fonts.displayHeavy : fonts.display;
  }
  if (weight >= 700) return fonts.bold;
  if (weight >= 600) return fonts.semibold;
  if (weight >= 500) return fonts.medium;
  return fonts.regular;
}

function applyFonts(style: Record<string, unknown>) {
  // Sentence case everywhere: small all-caps labels read as shouting, so they become quiet labels.
  if (style.textTransform === "uppercase" && typeof style.fontSize === "number" && style.fontSize <= 13) {
    delete style.textTransform;
    style.letterSpacing = 0;
    style.fontSize = Math.max(12, style.fontSize as number);
    if (style.fontWeight === "800" || style.fontWeight === "900") {
      style.fontWeight = "600";
    }
    // Orange is for activity from other people, not for labels.
    if (typeof style.color === "string" && /^(#e5294f|#ff5c7a|#ff8aa0|#7aa2ff|#1446d6)$/i.test(style.color)) {
      style.color = darkPalette.muted;
    }
  }
  if (!customFontsEnabled || style.fontFamily !== undefined) {
    return;
  }
  if (style.fontSize === undefined && style.fontWeight === undefined) {
    return;
  }
  style.fontFamily = fontFamilyFor(style.fontSize as number | undefined, style.fontWeight as string | undefined);
  // The font file already carries the weight; a weight on top makes Android fall back to the system font.
  delete style.fontWeight;
}

/** StyleSheet.create replacement for sheets that are not themed: adds the Sohba fonts. */
export function sheet<T extends NamedStyles<T> | NamedStyles<any>>(input: T & NamedStyles<any>): T {
  Object.keys(input).forEach((key) => applyFonts((input as Record<string, Record<string, unknown>>)[key]));
  return input;
}

export const shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 8,
  },
  floating: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.32,
    shadowRadius: 26,
    elevation: 12,
  },
};

/* ------------------------------------------------------------------------------------------------
 * Themed style sheets
 *
 * Every screen creates its styles with createThemedStyles(). The original (dark) values are kept,
 * and when the light theme is active each colour is converted: exact palette colours map to their
 * light counterpart, other dark neutral surfaces become light, light text becomes dark text, and
 * brand colours / translucent scrims are left alone.
 * ---------------------------------------------------------------------------------------------- */

type StyleRecord = Record<string, Record<string, unknown>>;

interface RegisteredSheet {
  target: StyleRecord;
  base: StyleRecord;
  keepDark: true | Set<string> | null;
}

const registry: RegisteredSheet[] = [];

const COLOR_PROPS = new Set([
  "color",
  "backgroundColor",
  "borderColor",
  "borderTopColor",
  "borderBottomColor",
  "borderLeftColor",
  "borderRightColor",
  "borderStartColor",
  "borderEndColor",
  "tintColor",
  "textDecorationColor",
]);

const TEXT_PALETTE_KEYS = new Set<keyof Palette>(["text", "textSoft", "muted", "mutedSoft"]);

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

export function createThemedStyles<T extends NamedStyles<T> | NamedStyles<any>>(
  input: T & NamedStyles<any>,
  options?: { keepDark?: true | Array<keyof T> }
): T {
  const styles = input as unknown as StyleRecord;
  const base: StyleRecord = {};
  Object.keys(styles).forEach((key) => {
    applyFonts(styles[key]);
    const copy: Record<string, unknown> = { ...styles[key] };
    if (currentMode === "light") {
      // Screens loaded while light mode is active read light palette values; store the dark
      // originals so switching back to dark mode works.
      Object.keys(copy).forEach((prop) => {
        const value = copy[prop];
        if (typeof value === "string" && COLOR_PROPS.has(prop)) {
          copy[prop] = lightToDark(value, prop);
        }
      });
    }
    base[key] = copy;
  });

  const keepDark = options?.keepDark === true ? true : options?.keepDark ? new Set(options.keepDark.map(String)) : null;
  const entry: RegisteredSheet = { target: styles, base, keepDark };
  registry.push(entry);
  applySheet(entry);
  return input;
}

export function applyThemeMode(mode: ThemeMode) {
  currentMode = mode;
  Object.assign(palette, mode === "light" ? lightPalette : darkPalette);
  registry.forEach(applySheet);
}

export function themeColor(value: string, prop: string = "backgroundColor") {
  if (currentMode === "dark") {
    return value;
  }

  return convertColor(value, prop);
}

function applySheet(entry: RegisteredSheet) {
  Object.keys(entry.base).forEach((key) => {
    const baseStyle = entry.base[key];
    const targetStyle = entry.target[key];
    const keep = entry.keepDark === true || (entry.keepDark instanceof Set && entry.keepDark.has(key));

    Object.keys(baseStyle).forEach((prop) => {
      const value = baseStyle[prop];
      if (typeof value !== "string" || !COLOR_PROPS.has(prop)) {
        return;
      }

      targetStyle[prop] = currentMode === "light" && !keep ? convertColor(value, prop) : value;
    });
  });
}

const darkToLightExact = new Map<string, { key: keyof Palette; light: string }>();
(Object.keys(darkPalette) as Array<keyof Palette>).forEach((key) => {
  darkToLightExact.set(darkPalette[key].toLowerCase(), { key, light: lightPalette[key] });
});

const REVERSE_PRIORITY: Array<keyof Palette> = [
  "surface",
  "background",
  "card",
  "backgroundSoft",
  "surfaceMuted",
  "surfaceRaised",
  "cardAlt",
  "backgroundDeep",
  "input",
  "text",
  "textSoft",
  "muted",
  "mutedSoft",
  "primary",
  "primaryDeep",
  "accent",
  "accentSoft",
  "border",
  "borderStrong",
  "danger",
  "success",
  "shadow",
  "overlay",
  "glass",
];
const lightToDarkText = new Map<string, string>();
const lightToDarkSurface = new Map<string, string>();
REVERSE_PRIORITY.forEach((key) => {
  const light = lightPalette[key].toLowerCase();
  if (!lightToDarkSurface.has(light)) {
    lightToDarkSurface.set(light, darkPalette[key]);
  }
});
(["text", "textSoft", "muted", "mutedSoft", "primary", "primaryDeep", "accent", "accentSoft", "danger", "success"] as Array<keyof Palette>).forEach((key) => {
  lightToDarkText.set(lightPalette[key].toLowerCase(), darkPalette[key]);
});

function lightToDark(value: string, prop: string) {
  const normalized = value.trim().toLowerCase();
  const isTextProp = prop === "color" || prop === "tintColor" || prop === "textDecorationColor";
  return (isTextProp ? lightToDarkText.get(normalized) : lightToDarkSurface.get(normalized)) ?? value;
}

function convertColor(value: string, prop: string) {
  const normalized = value.trim().toLowerCase();
  const exact = darkToLightExact.get(normalized);
  const isTextProp = prop === "color" || prop === "tintColor" || prop === "textDecorationColor";

  if (exact) {
    // Text colour used as a *background* is an inverted pill (selected chip): on the light theme it
    // becomes a near-black pill, and its label (the background colour) becomes white.
    if (!isTextProp && TEXT_PALETTE_KEYS.has(exact.key)) {
      return exact.key === "text" ? lightPalette.text : exact.light;
    }

    return exact.light;
  }

  // Pure white text is only used on photos, video and coloured badges/buttons, so it stays white.
  if (isTextProp && (normalized === "#fff" || normalized === "#ffffff")) {
    return value;
  }

  const rgba = parseColor(normalized);
  if (!rgba) {
    return value;
  }

  const [r, g, b, a] = rgba;
  const { lightness, saturation } = toHsl(r, g, b);
  const neutral = saturation < 0.28 || lightness < 0.12 || lightness > 0.92;

  if (!neutral) {
    return value;
  }

  if (isTextProp) {
    if (lightness > 0.55) {
      const target = Math.max(0.08, Math.min(0.42, 1 - lightness));
      return formatRgba(shadeNeutral(target), a);
    }
    return value;
  }

  // Background / border colours.
  if (lightness > 0.85 && a < 0.6) {
    // White glass / hairline borders on dark -> dark glass / hairlines on light.
    return formatRgba([15, 23, 32], Math.min(0.22, a * 1.1));
  }

  if (lightness < 0.35 && a >= 0.85) {
    const target = Math.min(1, 1 - lightness * 0.55);
    return formatRgba(shadeNeutral(target), a);
  }

  return value;
}

function shadeNeutral(lightness: number): [number, number, number] {
  // Slightly cool neutral matching the brand surfaces.
  const base = Math.round(lightness * 255);
  return [clamp(base - 6), clamp(base - 2), clamp(base + 4)];
}

function clamp(value: number) {
  return Math.max(0, Math.min(255, value));
}

function formatRgba([r, g, b]: [number, number, number], alpha: number) {
  if (alpha >= 1) {
    return `#${[r, g, b].map((part) => part.toString(16).padStart(2, "0")).join("")}`;
  }
  return `rgba(${r},${g},${b},${Number(alpha.toFixed(3))})`;
}

function parseColor(value: string): [number, number, number, number] | null {
  if (value.startsWith("#")) {
    const hex = value.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      const parts = hex.split("").map((char) => parseInt(char + char, 16));
      return [parts[0], parts[1], parts[2], hex.length === 4 ? parts[3] / 255 : 1];
    }
    if (hex.length === 6 || hex.length === 8) {
      const parts = [0, 2, 4, 6].map((index) => parseInt(hex.slice(index, index + 2), 16));
      return [parts[0], parts[1], parts[2], hex.length === 8 ? parts[3] / 255 : 1];
    }
    return null;
  }

  const match = value.match(/^rgba?\(([^)]+)\)$/);
  if (!match) {
    return null;
  }

  const parts = match[1].split(",").map((part) => parseFloat(part.trim()));
  if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }

  return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
}

function toHsl(r: number, g: number, b: number) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  return { lightness, saturation };
}

// For screens that are always dark (full-screen video and stories).
export function createDarkStyles<T extends NamedStyles<T> | NamedStyles<any>>(styles: T & NamedStyles<any>): T {
  return createThemedStyles(styles, { keepDark: true });
}
