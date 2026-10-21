import AsyncStorage from "@react-native-async-storage/async-storage";
import { reloadAppAsync } from "expo";
import { I18nManager, Platform } from "react-native";
import { getLanguageInfo } from "../data/copy";
import { LanguageOption } from "../types/models";

const RELOAD_GUARD_KEY = "pulseora.rtlReloadFor";

export function isRtlLanguage(language: LanguageOption | null | undefined) {
  return getLanguageInfo(language).rtl;
}

/** Mirrors an icon (chevrons, arrows) when the layout runs right-to-left. */
export const rtlFlipStyle = I18nManager.isRTL ? { transform: [{ scaleX: -1 }] } : undefined;

/**
 * Makes the native layout direction match the language. React Native only applies a direction change
 * after a reload, so when it changes we reload the app once. A guard key stops a reload loop if the
 * device refuses the change.
 */
export async function applyLayoutDirection(language: LanguageOption | null | undefined) {
  const wantRtl = isRtlLanguage(language);
  if (Platform.OS === "web") {
    // In the browser the page direction is set on the document; no reload is needed.
    if (typeof document !== "undefined") {
      document.documentElement.dir = wantRtl ? "rtl" : "ltr";
      if (language) {
        document.documentElement.lang = language;
      }
    }
    return false;
  }
  // allowRTL(false) for left-to-right languages stops a phone set to Arabic from mirroring an English UI.
  I18nManager.allowRTL(wantRtl);
  I18nManager.swapLeftAndRightInRTL(true);

  if (I18nManager.isRTL === wantRtl) {
    await AsyncStorage.removeItem(RELOAD_GUARD_KEY).catch(() => undefined);
    return false;
  }

  const target = wantRtl ? "rtl" : "ltr";
  const lastAttempt = await AsyncStorage.getItem(RELOAD_GUARD_KEY).catch(() => null);
  I18nManager.forceRTL(wantRtl);
  if (lastAttempt === target) {
    // We already reloaded for this direction and it did not stick; don't loop.
    return false;
  }

  await AsyncStorage.setItem(RELOAD_GUARD_KEY, target).catch(() => undefined);
  try {
    await reloadAppAsync("Layout direction changed");
    return true;
  } catch {
    return false;
  }
}
