import { LanguageOption } from "../types/models";

export interface RegionInfo {
  /** ISO 3166-1 alpha-2 code. */
  code: string;
  name: string;
  /** ISO 4217 currency code used for new listings in this region. */
  currency: string;
  flag: string;
}

/** Countries the app formats prices, dates and local feeds for. Sorted by name for the picker. */
export const regions: RegionInfo[] = [
  { code: "DZ", name: "Algeria", currency: "DZD", flag: "🇩🇿" },
  { code: "AR", name: "Argentina", currency: "ARS", flag: "🇦🇷" },
  { code: "AU", name: "Australia", currency: "AUD", flag: "🇦🇺" },
  { code: "AT", name: "Austria", currency: "EUR", flag: "🇦🇹" },
  { code: "BH", name: "Bahrain", currency: "BHD", flag: "🇧🇭" },
  { code: "BD", name: "Bangladesh", currency: "BDT", flag: "🇧🇩" },
  { code: "BE", name: "Belgium", currency: "EUR", flag: "🇧🇪" },
  { code: "BR", name: "Brazil", currency: "BRL", flag: "🇧🇷" },
  { code: "BN", name: "Brunei", currency: "BND", flag: "🇧🇳" },
  { code: "CA", name: "Canada", currency: "CAD", flag: "🇨🇦" },
  { code: "CL", name: "Chile", currency: "CLP", flag: "🇨🇱" },
  { code: "CN", name: "China", currency: "CNY", flag: "🇨🇳" },
  { code: "CO", name: "Colombia", currency: "COP", flag: "🇨🇴" },
  { code: "EG", name: "Egypt", currency: "EGP", flag: "🇪🇬" },
  { code: "FR", name: "France", currency: "EUR", flag: "🇫🇷" },
  { code: "DE", name: "Germany", currency: "EUR", flag: "🇩🇪" },
  { code: "HK", name: "Hong Kong", currency: "HKD", flag: "🇭🇰" },
  { code: "IN", name: "India", currency: "INR", flag: "🇮🇳" },
  { code: "ID", name: "Indonesia", currency: "IDR", flag: "🇮🇩" },
  { code: "IQ", name: "Iraq", currency: "IQD", flag: "🇮🇶" },
  { code: "IE", name: "Ireland", currency: "EUR", flag: "🇮🇪" },
  { code: "IT", name: "Italy", currency: "EUR", flag: "🇮🇹" },
  { code: "JP", name: "Japan", currency: "JPY", flag: "🇯🇵" },
  { code: "JO", name: "Jordan", currency: "JOD", flag: "🇯🇴" },
  { code: "KE", name: "Kenya", currency: "KES", flag: "🇰🇪" },
  { code: "KW", name: "Kuwait", currency: "KWD", flag: "🇰🇼" },
  { code: "LB", name: "Lebanon", currency: "LBP", flag: "🇱🇧" },
  { code: "LY", name: "Libya", currency: "LYD", flag: "🇱🇾" },
  { code: "MY", name: "Malaysia", currency: "MYR", flag: "🇲🇾" },
  { code: "MX", name: "Mexico", currency: "MXN", flag: "🇲🇽" },
  { code: "MA", name: "Morocco", currency: "MAD", flag: "🇲🇦" },
  { code: "NL", name: "Netherlands", currency: "EUR", flag: "🇳🇱" },
  { code: "NZ", name: "New Zealand", currency: "NZD", flag: "🇳🇿" },
  { code: "NG", name: "Nigeria", currency: "NGN", flag: "🇳🇬" },
  { code: "OM", name: "Oman", currency: "OMR", flag: "🇴🇲" },
  { code: "PK", name: "Pakistan", currency: "PKR", flag: "🇵🇰" },
  { code: "PS", name: "Palestine", currency: "ILS", flag: "🇵🇸" },
  { code: "PE", name: "Peru", currency: "PEN", flag: "🇵🇪" },
  { code: "PH", name: "Philippines", currency: "PHP", flag: "🇵🇭" },
  { code: "PL", name: "Poland", currency: "PLN", flag: "🇵🇱" },
  { code: "PT", name: "Portugal", currency: "EUR", flag: "🇵🇹" },
  { code: "QA", name: "Qatar", currency: "QAR", flag: "🇶🇦" },
  { code: "RU", name: "Russia", currency: "RUB", flag: "🇷🇺" },
  { code: "SA", name: "Saudi Arabia", currency: "SAR", flag: "🇸🇦" },
  { code: "SG", name: "Singapore", currency: "SGD", flag: "🇸🇬" },
  { code: "ZA", name: "South Africa", currency: "ZAR", flag: "🇿🇦" },
  { code: "KR", name: "South Korea", currency: "KRW", flag: "🇰🇷" },
  { code: "ES", name: "Spain", currency: "EUR", flag: "🇪🇸" },
  { code: "SD", name: "Sudan", currency: "SDG", flag: "🇸🇩" },
  { code: "SE", name: "Sweden", currency: "SEK", flag: "🇸🇪" },
  { code: "CH", name: "Switzerland", currency: "CHF", flag: "🇨🇭" },
  { code: "SY", name: "Syria", currency: "SYP", flag: "🇸🇾" },
  { code: "TW", name: "Taiwan", currency: "TWD", flag: "🇹🇼" },
  { code: "TH", name: "Thailand", currency: "THB", flag: "🇹🇭" },
  { code: "TN", name: "Tunisia", currency: "TND", flag: "🇹🇳" },
  { code: "TR", name: "Türkiye", currency: "TRY", flag: "🇹🇷" },
  { code: "AE", name: "United Arab Emirates", currency: "AED", flag: "🇦🇪" },
  { code: "GB", name: "United Kingdom", currency: "GBP", flag: "🇬🇧" },
  { code: "US", name: "United States", currency: "USD", flag: "🇺🇸" },
  { code: "VN", name: "Vietnam", currency: "VND", flag: "🇻🇳" },
  { code: "YE", name: "Yemen", currency: "YER", flag: "🇾🇪" },
];

const regionByCode = new Map(regions.map((region) => [region.code, region]));

export const DEFAULT_REGION_CODE = "US";
export const LEGACY_LISTING_CURRENCY = "USD";

export function getRegion(code: string | null | undefined): RegionInfo {
  return regionByCode.get((code ?? "").toUpperCase()) ?? regionByCode.get(DEFAULT_REGION_CODE)!;
}

export function isKnownRegion(code: unknown): code is string {
  return typeof code === "string" && regionByCode.has(code.toUpperCase());
}

/** Best guess of the phone's country, used until the user picks a region. */
export function detectDeviceRegion(): string {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? "";
    const match = locale.match(/[-_]([A-Za-z]{2})(?:$|[-_])/);
    if (match && isKnownRegion(match[1])) {
      return match[1].toUpperCase();
    }
  } catch {
    // Intl not available: fall through to the default.
  }
  return DEFAULT_REGION_CODE;
}

const languageTags: Record<LanguageOption, string> = {
  en: "en",
  ar: "ar",
  fr: "fr",
  es: "es",
  pt: "pt",
  de: "de",
  tr: "tr",
  ru: "ru",
  hi: "hi",
  ur: "ur",
  ms: "ms",
  id: "id",
  zh: "zh-Hans",
  ja: "ja",
};

/** BCP-47 tag combining the app language and region, e.g. "ms-MY" or "ar-SA". */
export function buildLocaleTag(language: LanguageOption | null | undefined, regionCode: string | null | undefined) {
  const base = languageTags[language ?? "en"] ?? "en";
  const region = getRegion(regionCode).code;
  return `${base}-${region}`;
}

function safeNumberFormat(locale: string, options: Intl.NumberFormatOptions) {
  try {
    return new Intl.NumberFormat(locale, options);
  } catch {
    try {
      return new Intl.NumberFormat("en-US", options);
    } catch {
      return null;
    }
  }
}

/** Formats a listing price in its own currency, using the viewer's language/region for separators. */
export function formatPrice(amount: number, currency: string | null | undefined, locale: string) {
  const code = (currency || LEGACY_LISTING_CURRENCY).toUpperCase();
  const value = Number.isFinite(amount) ? amount : 0;
  const formatter = safeNumberFormat(locale, {
    style: "currency",
    currency: code,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  });
  if (formatter) {
    try {
      return formatter.format(value);
    } catch {
      // Unknown currency for this engine: fall back below.
    }
  }
  return `${code} ${value.toLocaleString()}`;
}

export function formatNumber(value: number, locale: string, options?: Intl.NumberFormatOptions) {
  const formatter = safeNumberFormat(locale, options ?? {});
  return formatter ? formatter.format(value) : String(value);
}

/** The currency symbol on its own (e.g. "RM" for MYR), used as a prefix in price inputs. */
export function getCurrencySymbol(currency: string, locale: string) {
  const formatter = safeNumberFormat(locale, { style: "currency", currency, currencyDisplay: "narrowSymbol" });
  try {
    const part = formatter?.formatToParts(0).find((item) => item.type === "currency");
    if (part?.value) {
      return part.value;
    }
  } catch {
    // ignore
  }
  return currency;
}
