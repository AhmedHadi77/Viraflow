import { useEffect } from "react";
import { navigationRef } from "../navigation/navigationRef";
import { useAppState } from "../providers/AppProvider";
import { getCallState, presentIncomingCall, subscribeToIncomingCalls } from "../services/calls";

/** Rings this phone when someone calls while the app is open, and opens the call screen. */
export function CallCoordinator() {
  const { currentUser } = useAppState();
  const userId = currentUser?.id;

  useEffect(() => {
    if (!userId) {
      return;
    }
    return subscribeToIncomingCalls(userId, (call) => {
      const before = getCallState();
      presentIncomingCall(call);
      // presentIncomingCall declines automatically when we are already on another call.
      if (getCallState().callId === call.id && before.callId !== call.id && navigationRef.isReady()) {
        navigationRef.navigate("Call", { callId: call.id });
      }
    });
  }, [userId]);

  return null;
}
