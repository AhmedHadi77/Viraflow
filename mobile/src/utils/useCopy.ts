import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";

/** The app text in the user's chosen language. */
export function useCopy() {
  const { language } = useAppState();
  return getCopy(language);
}
