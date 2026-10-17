import { buildLocaleTag } from "../data/regions";
import { LanguageOption } from "../types/models";

// Kept in sync with the user's region by AppProvider so every date picks up the regional format
// (e.g. day/month order) without each screen having to pass the region through.
let activeRegion: string | null = null;
let activeLanguage: LanguageOption | null = null;

export function setActiveFormattingLocale(language: LanguageOption | null, region: string | null) {
  activeLanguage = language;
  activeRegion = region;
}

function activeLocale() {
  return buildLocaleTag(activeLanguage, activeRegion);
}

function safeDate(value: string | number | Date) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function withLocaleFallback(format: (locale?: string) => string) {
  try {
    return format(activeLocale());
  } catch {
    return format(undefined);
  }
}

/** Date in the user's language + region format, e.g. 17/10/2026 for en-MY. */
export function formatDate(value: string | number | Date, options?: Intl.DateTimeFormatOptions) {
  const date = safeDate(value);
  return date ? withLocaleFallback((locale) => date.toLocaleDateString(locale, options)) : "";
}

export function formatTime(value: string | number | Date) {
  const date = safeDate(value);
  return date ? withLocaleFallback((locale) => date.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })) : "";
}

export function formatDateTime(value: string | number | Date) {
  const date = safeDate(value);
  return date
    ? withLocaleFallback((locale) =>
        date.toLocaleString(locale, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
      )
    : "";
}

export function getLanguageLocale(language: LanguageOption | null | undefined) {
  return buildLocaleTag(language ?? activeLanguage, activeRegion);
}

export function formatRelativeTime(
  value: string | number | Date,
  language: LanguageOption | null | undefined,
  options?: {
    style?: "long" | "short" | "narrow";
    numeric?: "always" | "auto";
    fallbackToDateAfterDays?: number;
  }
) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    return "";
  }

  const locale = getLanguageLocale(language);
  const style = options?.style ?? "short";
  const numeric = options?.numeric ?? "auto";
  const fallbackToDateAfterDays = options?.fallbackToDateAfterDays ?? 7;
  const diffSeconds = Math.round((timestamp - Date.now()) / 1000);
  const absoluteSeconds = Math.abs(diffSeconds);

  if (absoluteSeconds >= fallbackToDateAfterDays * 24 * 60 * 60) {
    return new Date(timestamp).toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  if (absoluteSeconds < 60) {
    return formatRelativeValue(diffSeconds, "second", locale, { numeric, style });
  }

  const diffMinutes = Math.round(diffSeconds / 60);
  if (Math.abs(diffMinutes) < 60) {
    return formatRelativeValue(diffMinutes, "minute", locale, { numeric, style });
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatRelativeValue(diffHours, "hour", locale, { numeric, style });
  }

  const diffDays = Math.round(diffHours / 24);
  return formatRelativeValue(diffDays, "day", locale, { numeric, style });
}

function formatRelativeValue(
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  locale: string,
  options: { numeric: "always" | "auto"; style: "long" | "short" | "narrow" }
) {
  const formatterConstructor = Intl.RelativeTimeFormat;
  if (typeof formatterConstructor === "function") {
    return new formatterConstructor(locale, options).format(value, unit);
  }

  return formatRelativeTimeFallback(value, unit, options);
}

function formatRelativeTimeFallback(
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  options: { numeric: "always" | "auto"; style: "long" | "short" | "narrow" }
) {
  if (options.numeric === "auto") {
    if (value === 0) {
      return "now";
    }

    if (value === -1 && unit === "day") {
      return "yesterday";
    }

    if (value === 1 && unit === "day") {
      return "tomorrow";
    }
  }

  const absoluteValue = Math.abs(value);
  const unitLabel = getRelativeFallbackUnitLabel(unit, absoluteValue, options.style);
  if (value < 0) {
    return `${absoluteValue}${options.style === "narrow" ? "" : " "}${unitLabel} ago`;
  }

  return `in ${absoluteValue}${options.style === "narrow" ? "" : " "}${unitLabel}`;
}

function getRelativeFallbackUnitLabel(unit: Intl.RelativeTimeFormatUnit, value: number, style: "long" | "short" | "narrow") {
  if (style !== "long") {
    const shortLabels: Record<Intl.RelativeTimeFormatUnit, string> = {
      second: "s",
      seconds: "s",
      minute: "m",
      minutes: "m",
      hour: "h",
      hours: "h",
      day: "d",
      days: "d",
      week: "w",
      weeks: "w",
      month: "mo",
      months: "mo",
      quarter: "q",
      quarters: "q",
      year: "y",
      years: "y",
    };
    return shortLabels[unit] ?? unit;
  }

  const normalizedUnit = unit.endsWith("s") ? unit.slice(0, -1) : unit;
  return value === 1 ? normalizedUnit : `${normalizedUnit}s`;
}

export function formatLocaleDate(
  value: string | number | Date,
  language: LanguageOption | null | undefined,
  options?: Intl.DateTimeFormatOptions
) {
  return new Date(value).toLocaleDateString(getLanguageLocale(language), options);
}

export function formatLocaleDateTime(
  value: string | number | Date,
  language: LanguageOption | null | undefined,
  options?: Intl.DateTimeFormatOptions
) {
  return new Date(value).toLocaleString(getLanguageLocale(language), options);
}
