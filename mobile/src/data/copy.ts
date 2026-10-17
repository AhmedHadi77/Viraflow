import { LanguageOption } from "../types/models";
import en, { CopyStrings } from "./locales/en";
import ar from "./locales/ar";
import de from "./locales/de";
import es from "./locales/es";
import fr from "./locales/fr";
import hi from "./locales/hi";
import id from "./locales/id";
import ja from "./locales/ja";
import ms from "./locales/ms";
import pt from "./locales/pt";
import ru from "./locales/ru";
import tr from "./locales/tr";
import ur from "./locales/ur";
import zh from "./locales/zh";

export type LanguageInfo = {
  code: LanguageOption;
  nativeName: string;
  englishName: string;
  rtl: boolean;
};

/** Every language the app ships with, in the order shown on the language pickers. */
export const supportedLanguages: LanguageInfo[] = [
  { code: "en", nativeName: "English", englishName: "English", rtl: false },
  { code: "ar", nativeName: "العربية", englishName: "Arabic", rtl: true },
  { code: "fr", nativeName: "Français", englishName: "French", rtl: false },
  { code: "es", nativeName: "Español", englishName: "Spanish", rtl: false },
  { code: "pt", nativeName: "Português", englishName: "Portuguese", rtl: false },
  { code: "de", nativeName: "Deutsch", englishName: "German", rtl: false },
  { code: "tr", nativeName: "Türkçe", englishName: "Turkish", rtl: false },
  { code: "ru", nativeName: "Русский", englishName: "Russian", rtl: false },
  { code: "hi", nativeName: "हिन्दी", englishName: "Hindi", rtl: false },
  { code: "ur", nativeName: "اردو", englishName: "Urdu", rtl: true },
  { code: "ms", nativeName: "Bahasa Melayu", englishName: "Malay", rtl: false },
  { code: "id", nativeName: "Bahasa Indonesia", englishName: "Indonesian", rtl: false },
  { code: "zh", nativeName: "中文（简体）", englishName: "Chinese (Simplified)", rtl: false },
  { code: "ja", nativeName: "日本語", englishName: "Japanese", rtl: false },
];

export const supportedLanguageCodes = supportedLanguages.map((item) => item.code);

export function isLanguageOption(value: unknown): value is LanguageOption {
  return typeof value === "string" && (supportedLanguageCodes as string[]).includes(value);
}

export function getLanguageInfo(language: LanguageOption | null | undefined) {
  return supportedLanguages.find((item) => item.code === language) ?? supportedLanguages[0];
}

const overrides: Record<LanguageOption, Partial<CopyStrings>> = {
  en: {},
  ar,
  fr,
  es,
  pt,
  de,
  tr,
  ru,
  hi,
  ur,
  ms,
  id,
  zh,
  ja,
};

// Missing keys fall back to English so a new string never shows up blank.
const translations = Object.fromEntries(
  (Object.keys(overrides) as LanguageOption[]).map((code) => [code, { ...en, ...overrides[code] }])
) as Record<LanguageOption, CopyStrings>;

export type CopyKey = keyof CopyStrings;

export function getCopy(language: LanguageOption | null) {
  return translations[language ?? "en"] ?? translations.en;
}
