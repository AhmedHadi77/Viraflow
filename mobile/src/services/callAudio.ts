/**
 * Sends call sound to the right place on Android (earpiece for voice calls, loudspeaker for video calls),
 * keeps the screen awake during the call and plays the ringtone for incoming calls.
 * Uses react-native-incall-manager; the web app version (callAudio.web.ts) does nothing.
 */
type InCallManagerModule = {
  start: (options?: { media?: "audio" | "video"; auto?: boolean; ringback?: string }) => void;
  stop: (options?: { busytone?: string }) => void;
  setForceSpeakerphoneOn: (flag: boolean | null) => void;
  setSpeakerphoneOn: (flag: boolean) => void;
  setKeepScreenOn: (flag: boolean) => void;
  startRingtone: (ringtone?: string, vibratePattern?: number[], iosCategory?: string, seconds?: number) => void;
  stopRingtone: () => void;
};

let cached: InCallManagerModule | null | undefined;

function manager(): InCallManagerModule | null {
  if (cached !== undefined) {
    return cached;
  }
  try {
    const loaded = require("react-native-incall-manager");
    cached = (loaded?.default ?? loaded) as InCallManagerModule;
  } catch {
    cached = null;
  }
  return cached;
}

function safely(action: (m: InCallManagerModule) => void) {
  const m = manager();
  if (!m) {
    return;
  }
  try {
    action(m);
  } catch {
    // Audio routing is best effort; the call itself keeps working.
  }
}

export function startCallAudio(type: "audio" | "video") {
  safely((m) => {
    m.start({ media: type, auto: true });
    m.setKeepScreenOn(true);
    m.setForceSpeakerphoneOn(type === "video");
  });
}

export function setCallSpeaker(on: boolean) {
  safely((m) => m.setForceSpeakerphoneOn(on));
}

export function stopCallAudio() {
  safely((m) => {
    m.stopRingtone();
    m.setForceSpeakerphoneOn(null);
    m.setKeepScreenOn(false);
    m.stop();
  });
}

export function startIncomingRing() {
  safely((m) => m.startRingtone("_DEFAULT_", undefined, undefined, 45));
}

export function stopIncomingRing() {
  safely((m) => m.stopRingtone());
}
