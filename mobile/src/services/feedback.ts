import { Platform, Vibration } from "react-native";

type FeedbackKind = "selection" | "confirm" | "open";

const FEEDBACK_DURATION: Record<FeedbackKind, number> = {
  selection: 8,
  confirm: 12,
  open: 10,
};

export function triggerFeedback(kind: FeedbackKind = "selection") {
  if (Platform.OS !== "android") {
    return;
  }

  try {
    Vibration.vibrate(FEEDBACK_DURATION[kind]);
  } catch {
    // Some Android builds do not expose vibration reliably.
  }
}
